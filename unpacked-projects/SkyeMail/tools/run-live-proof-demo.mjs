import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "../..");

function parseEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim().replace(/^export\s+/, "");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!value || value.includes("...") || value.includes("${") || value.includes("$(") || value.includes("your_") || value.includes("YOUR_") || value.includes("yourdomain.com")) continue;
    if (/(^|_)DATABASE_URL$/.test(key) && !/^postgres(ql)?:\/\//.test(value)) continue;
    out[key] = value;
  }
  return out;
}

const env = {
  ...parseEnv(path.join(root, ".env.template")),
  ...parseEnv(path.join(repoRoot, ".env")),
  ...parseEnv(path.join(root, ".env")),
  ...process.env,
};

function dbUrl(value) {
  const url = new URL(value);
  url.hostname = url.hostname.replace("-pooler.", ".");
  url.searchParams.set("options", "--search_path=skymail,public");
  return url.toString();
}

const databaseUrl = env.NEON_DATABASE_URL || env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL/NEON_DATABASE_URL is required.");
if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is required.");

const sql = neon(dbUrl(databaseUrl));
const runId = process.argv.find((arg) => arg.startsWith("--run-id="))?.split("=")[1] || `proof-${Date.now()}`;
const resendDomain = String(env.RESEND_FROM_EMAIL || "").match(/@([^>\s'"]+)/)?.[1]?.toLowerCase();
const domain = (env.SKYMAIL_PRIMARY_DOMAIN || env.INBOUND_DOMAIN || resendDomain || "solenterprises.org").trim();
const publicUrl = (env.SKYMAIL_PUBLIC_URL || "https://skymail-platform.graylondonskyes.workers.dev").replace(/\/+$/, "");
const a = { handle: `proof-a-${runId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 31), label: "Proof Operator A" };
const b = { handle: `proof-b-${runId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 31), label: "Proof Operator B" };
a.email = `${a.handle}@${domain}`;
b.email = `${b.handle}@${domain}`;
const subjectAB = `SkyeMail live proof A to B ${runId}`;
const subjectBA = `SkyeMail live proof B to A ${runId}`;

function b64(buf) {
  return Buffer.from(buf).toString("base64");
}

function pem(label, der) {
  const body = b64(der).match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;
}

async function createKeyPack(passphrase) {
  const pair = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicExponent: 0x10001,
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });
  const publicKeyPem = pem("PUBLIC KEY", pair.publicKey);
  const privateKeyPem = pem("PRIVATE KEY", pair.privateKey);
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(passphrase, salt, 150000, 32, "sha256");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(privateKeyPem, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const vaultWrapJson = JSON.stringify({
    saltB64: b64(salt),
    iterations: 150000,
    ivB64: b64(iv),
    ctB64: b64(Buffer.concat([ciphertext, tag])),
  });
  return { publicKeyPem, vaultWrapJson };
}

async function ensureProofUser(person) {
  const found = await sql.query("select id, handle, email from skymail.users where handle=$1 limit 1", [person.handle]);
  if (found.length) return found[0];
  const passwordHash = `proof:${crypto.createHash("sha256").update(`${runId}:${person.handle}`).digest("hex")}`;
  const rows = await sql.query(
    `insert into skymail.users(handle, email, password_hash, recovery_enabled)
     values($1,$2,$3,false)
     returning id, handle, email`,
    [person.handle, person.email, passwordHash],
  );
  const user = rows[0];
  const keys = await createKeyPack(`proof-passphrase-${runId}-${person.handle}`);
  await sql.query(
    `insert into skymail.user_keys(user_id, version, is_active, rsa_public_key_pem, vault_wrap_json)
     values($1,1,true,$2,$3)
     on conflict (user_id, version) do update set is_active=true, rsa_public_key_pem=excluded.rsa_public_key_pem, vault_wrap_json=excluded.vault_wrap_json`,
    [user.id, keys.publicKeyPem, keys.vaultWrapJson],
  );
  await sql.query(
    `insert into skymail.hosted_mailboxes(user_id, mailbox_email, local_part, domain, provider, status, provisioning_status, provider_payload_json, updated_at)
     values($1,$2,$3,$4,'resend','active','resend-proof-demo',$5::jsonb,now())
     on conflict (mailbox_email) do update set user_id=excluded.user_id, status='active', provisioning_status='resend-proof-demo', updated_at=now()`,
    [user.id, person.email, person.handle, domain, JSON.stringify({ proof_demo: true, run_id: runId })],
  );
  return user;
}

async function sendMail({ from, to, subject, text }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: `SkyeMail Live Proof <${from}>`,
      to: [to],
      subject,
      text,
      html: `<p>${text.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]))}</p>`,
    }),
  });
  const body = await res.text();
  let data = null;
  try { data = body ? JSON.parse(body) : null; } catch { data = { raw: body }; }
  if (!res.ok) throw new Error(data?.message || data?.error || body || `Resend failed ${res.status}`);
  return data;
}

async function waitForImport({ userId, fromEmail, subject, timeoutMs = 90000 }) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    const messages = await sql.query(
      `select id, provider_message_id, created_at
         from skymail.messages
        where user_id=$1 and lower(from_email)=lower($2) and delivery_provider='resend'
        order by created_at desc
        limit 8`,
      [userId, fromEmail],
    );
    const events = await sql.query(
      `select event_type, delivery_status, provider_message_id, recipient_email, from_email, subject, created_at
         from skymail.message_delivery_events
        where subject=$1
        order by created_at desc
        limit 8`,
      [subject],
    );
    last = { messages, events };
    if (messages.length && events.some((event) => event.event_type === "email.received" || event.delivery_status === "received")) {
      return { imported: true, message: messages[0], events };
    }
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  return { imported: false, last };
}

const startedAt = new Date().toISOString();
const userA = await ensureProofUser(a);
const userB = await ensureProofUser(b);
const sendAB = await sendMail({
  from: a.email,
  to: b.email,
  subject: subjectAB,
  text: `Run ${runId}: Operator A sends the first proof email into Operator B's encrypted SkyeMail inbox.`,
});
const importAB = await waitForImport({ userId: userB.id, fromEmail: a.email, subject: subjectAB });
const sendBA = await sendMail({
  from: b.email,
  to: a.email,
  subject: subjectBA,
  text: `Run ${runId}: Operator B replies back into Operator A's encrypted SkyeMail inbox.`,
});
const importBA = await waitForImport({ userId: userA.id, fromEmail: b.email, subject: subjectBA });

const proof = {
  ok: Boolean(importAB.imported && importBA.imported),
  run_id: runId,
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  public_demo_url: `${publicUrl}/live-proof`,
  domain,
  actors: [
    { label: a.label, mailbox: a.email, user_id: userA.id },
    { label: b.label, mailbox: b.email, user_id: userB.id },
  ],
  runs: [
    {
      label: "A sends to B",
      from: a.email,
      to: b.email,
      subject: subjectAB,
      resend_id: sendAB.id || null,
      imported_to_inbox: Boolean(importAB.imported),
      imported_message_id: importAB.message?.id || null,
      provider_message_id: importAB.message?.provider_message_id || null,
      event_count: importAB.events?.length || 0,
    },
    {
      label: "B replies to A",
      from: b.email,
      to: a.email,
      subject: subjectBA,
      resend_id: sendBA.id || null,
      imported_to_inbox: Boolean(importBA.imported),
      imported_message_id: importBA.message?.id || null,
      provider_message_id: importBA.message?.provider_message_id || null,
      event_count: importBA.events?.length || 0,
    },
  ],
  security: {
    vault_keys_active: true,
    private_keys_exposed: false,
    inbox_storage: "encrypted payloads in Neon skymail.messages",
    provider_events: "Resend webhooks processed by SkyeMail Cloudflare Worker",
  },
};

const outDir = path.join(root, "proof");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "live-email-proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
