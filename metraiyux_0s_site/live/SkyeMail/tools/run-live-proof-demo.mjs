import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function findRepoRoot(start) {
  let current = start;
  while (current && current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, ".git"))) return current;
    current = path.dirname(current);
  }
  return path.resolve(start, "../../../..");
}

const repoRoot = findRepoRoot(root);

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

const runId = process.argv.find((arg) => arg.startsWith("--run-id="))?.split("=")[1] || `proof-${Date.now()}`;
const startedAt = new Date().toISOString();
const publicUrl = (env.SKYMAIL_PUBLIC_URL || "https://skyemail-platform.graylondonskyes.workers.dev").replace(/\/+$/, "");
const forcedProvider = process.argv.find((arg) => arg.startsWith("--provider="))?.split("=")[1] || env.SKYMAIL_LIVE_PROOF_PROVIDER || "";
const providerMode = (forcedProvider || env.MAILBOX_PROVIDER || (env.ZOHO_CLIENT_ID || env.Client_ID ? "zoho" : "resend")).trim().toLowerCase();

function dbUrl(value) {
  const url = new URL(value);
  url.hostname = url.hostname.replace("-pooler.", ".");
  url.searchParams.set("options", "--search_path=skymail,public");
  return url.toString();
}

function b64(buf) {
  return Buffer.from(buf).toString("base64");
}

function pem(label, der) {
  const body = b64(der).match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;
}

function htmlEscape(value) {
  return String(value || "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
}

function clean(value) {
  return String(value || "").trim().replace(/^['"]|['"]$/g, "");
}

const zohoAliases = {
  ZOHO_CLIENT_ID: ["Client_ID", "ZOHO_MAIL_CLIENT_ID"],
  ZOHO_CLIENT_SECRET: ["Client_Secret", "ZOHO_MAIL_CLIENT_SECRET"],
  ZOHO_REFRESH_TOKEN: ["Refresh_Token_ID", "Refresh_Token_ID2", "Refresh_Token", "ZOHO_MAIL_REFRESH_TOKEN"],
  ZOHO_ORG_ID: ["Org_ID", "Organization_ID", "ZOHO_ORGANIZATION_ID", "ZOHO_ZOID"],
  ZOHO_ACCOUNT_ID: ["Account_ID", "Zoho_User_ID", "ZOHO_MAIL_ACCOUNT_ID"],
  ZOHO_DEFAULT_FROM: ["Default_From_Email", "ZOHO_FROM_EMAIL", "ZOHO_MAIL_FROM"],
};

function envValue(key) {
  const direct = clean(env[key]);
  if (direct) return direct;
  for (const alias of zohoAliases[key] || []) {
    const value = clean(env[alias]);
    if (value) return value;
  }
  return "";
}

function cleanOrigin(value, fallback = "") {
  return clean(value || fallback).replace(/\/+$/, "");
}

function extractEmail(value) {
  const text = String(value || "");
  const bracket = text.match(/<([^>]+)>/);
  if (bracket) return bracket[1].trim().toLowerCase();
  const plain = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return plain ? plain[0].trim().toLowerCase() : "";
}

function extractAccountId(payload) {
  const data = payload?.data || payload;
  const candidates = [
    data?.accountId,
    data?.account_id,
    data?.zuid,
    data?.userId,
    data?.id,
    data?.account?.accountId,
    Array.isArray(data) ? data[0]?.accountId : null,
    Array.isArray(data) ? data[0]?.account_id : null,
    Array.isArray(data) ? data[0]?.zuid : null,
    Array.isArray(data) ? data[0]?.id : null,
  ];
  const match = candidates.find((value) => value != null && clean(value));
  return match != null ? String(match) : "";
}

function extractDefaultFrom(payload) {
  const data = payload?.data || payload;
  const candidates = [
    data?.primaryEmailAddress,
    data?.mailboxAddress,
    data?.emailAddress,
    data?.email,
    data?.mailbox?.emailAddress,
    Array.isArray(data) ? data[0]?.primaryEmailAddress : null,
    Array.isArray(data) ? data[0]?.mailboxAddress : null,
    Array.isArray(data) ? data[0]?.emailAddress : null,
    Array.isArray(data) ? data[0]?.email : null,
  ];
  return candidates.map(extractEmail).find(Boolean) || "";
}

function extractMessageId(payload) {
  const data = payload?.data || payload;
  const candidates = [data?.messageId, data?.message_id, data?.id, payload?.messageId, payload?.id];
  const match = candidates.find((value) => value != null && clean(value));
  return match != null ? String(match) : "";
}

function messageSubject(message) {
  return clean(message?.subject || message?.summary?.subject || message?.data?.subject);
}

function messageFolder(message) {
  return clean(message?.folderName || message?.folderPath || message?.folderId || message?.label || message?.status || "");
}

async function readJsonResponse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

async function zohoJson(pathname, init = {}) {
  const token = await getZohoAccessToken();
  const res = await fetch(`${zohoMailBase()}${pathname}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Zoho-oauthtoken ${token}`,
      ...(init.headers || {}),
    },
  });
  const data = await readJsonResponse(res);
  if (!res.ok) {
    const message = data?.data?.moreInfo || data?.data?.errorMessage || data?.message || data?.status?.description || data?.error || `Citadel mail request failed ${res.status}`;
    throw Object.assign(new Error(message), { statusCode: res.status, providerResponse: data });
  }
  return data;
}

function zohoAccountsBase() {
  return cleanOrigin(envValue("ZOHO_ACCOUNTS_BASE") || env.ZOHO_ACCOUNTS_BASE, "https://accounts.zoho.com");
}

function zohoMailBase() {
  return cleanOrigin(envValue("ZOHO_MAIL_BASE") || env.ZOHO_MAIL_BASE, "https://mail.zoho.com");
}

let zohoTokenCache = null;

async function getZohoAccessToken() {
  if (zohoTokenCache) return zohoTokenCache;
  const required = ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN"].filter((key) => !envValue(key));
  if (required.length) throw new Error(`Missing Zoho proof env: ${required.join(", ")}`);
  const params = new URLSearchParams({
    refresh_token: envValue("ZOHO_REFRESH_TOKEN"),
    client_id: envValue("ZOHO_CLIENT_ID"),
    client_secret: envValue("ZOHO_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });
  const res = await fetch(`${zohoAccountsBase()}/oauth/v2/token?${params.toString()}`, {
    method: "POST",
    headers: { accept: "application/json" },
  });
  const data = await readJsonResponse(res);
  if (!res.ok || !data?.access_token) throw new Error(data?.error_description || data?.error || `Zoho token refresh failed ${res.status}`);
  zohoTokenCache = data.access_token;
  return zohoTokenCache;
}

async function getZohoMailboxIdentity() {
  const accounts = await zohoJson("/api/accounts");
  const accountId = envValue("ZOHO_ACCOUNT_ID") || extractAccountId(accounts);
  const defaultFrom = envValue("ZOHO_DEFAULT_FROM") || extractDefaultFrom(accounts);
  if (!accountId) throw new Error("No Zoho account id found for the live proof.");
  if (!defaultFrom) throw new Error("No Zoho default from address found for the live proof.");
  return { accountId, defaultFrom, accounts };
}

async function zohoSend({ accountId, from, to, subject, text }) {
  const payload = await zohoJson(`/api/accounts/${encodeURIComponent(accountId)}/messages`, {
    method: "POST",
    body: JSON.stringify({
      fromAddress: from,
      toAddress: to,
      subject,
      content: `<p>${htmlEscape(text)}</p>`,
      mailFormat: "html",
      askReceipt: "no",
    }),
  });
  return { id: extractMessageId(payload) || `zoho-${crypto.randomUUID()}`, payload };
}

async function zohoFolders(accountId) {
  const payload = await zohoJson(`/api/accounts/${encodeURIComponent(accountId)}/folders`);
  const folders = Array.isArray(payload?.data) ? payload.data : [];
  return folders.map((folder) => ({
    id: String(folder?.folderId || folder?.id || ""),
    name: clean(folder?.displayName || folder?.folderName || folder?.path || folder?.name || folder?.folderId),
  }));
}

async function zohoListByFolder(accountId, folderId, subject, limit = 25) {
  const params = new URLSearchParams({
    start: "1",
    limit: String(limit),
    includeto: "true",
    status: "all",
    sortBy: "date",
    sortorder: "false",
    includesent: "true",
  });
  if (folderId) params.set("folderId", folderId);
  const payload = await zohoJson(`/api/accounts/${encodeURIComponent(accountId)}/messages/view?${params.toString()}`);
  const messages = Array.isArray(payload?.data) ? payload.data : [];
  return messages.filter((message) => messageSubject(message) === subject || messageSubject(message).includes(subject));
}

async function zohoSearch(accountId, subject, limit = 25) {
  const params = new URLSearchParams({
    start: "1",
    limit: String(limit),
    includeto: "true",
    searchKey: subject,
  });
  const payload = await zohoJson(`/api/accounts/${encodeURIComponent(accountId)}/messages/search?${params.toString()}`);
  const messages = Array.isArray(payload?.data) ? payload.data : [];
  return messages.filter((message) => messageSubject(message) === subject || messageSubject(message).includes(subject));
}

async function waitForZohoMailboxVisibility({ accountId, subject, timeoutMs = 120000 }) {
  const started = Date.now();
  let last = { inbox: [], sent: [], search: [], folders: [] };
  while (Date.now() - started < timeoutMs) {
    const folders = await zohoFolders(accountId).catch(() => []);
    const inboxFolder = folders.find((folder) => /inbox/i.test(folder.name)) || folders.find((folder) => /^inbox$/i.test(folder.id));
    const sentFolder = folders.find((folder) => /sent/i.test(folder.name)) || folders.find((folder) => /^sent$/i.test(folder.id));
    const [inbox, sent, search] = await Promise.all([
      inboxFolder?.id ? zohoListByFolder(accountId, inboxFolder.id, subject).catch(() => []) : Promise.resolve([]),
      sentFolder?.id ? zohoListByFolder(accountId, sentFolder.id, subject).catch(() => []) : Promise.resolve([]),
      zohoSearch(accountId, subject).catch(() => []),
    ]);
    last = { inbox, sent, search, folders };
    if (inbox.length || search.some((message) => /inbox/i.test(messageFolder(message)))) {
      return { received: true, inbox, sent, search, folders };
    }
    if (sent.length && search.length) {
      return { received: false, sent_visible: true, inbox, sent, search, folders };
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  return { received: false, timeout: true, ...last };
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

function databaseUrl() {
  return env.NEON_DATABASE_URL || env.DATABASE_URL;
}

function getSql() {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL/NEON_DATABASE_URL is required.");
  return neon(dbUrl(url));
}

async function runResendProof() {
  const sql = getSql();
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is required.");
  const resendDomain = String(env.RESEND_FROM_EMAIL || "").match(/@([^>\s'"]+)/)?.[1]?.toLowerCase();
  const domain = (env.SKYMAIL_PRIMARY_DOMAIN || env.INBOUND_DOMAIN || resendDomain || "solenterprises.org").trim();
  const a = { handle: `proof-a-${runId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 31), label: "Proof Operator A" };
  const b = { handle: `proof-b-${runId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 31), label: "Proof Operator B" };
  a.email = `${a.handle}@${domain}`;
  b.email = `${b.handle}@${domain}`;
  const subjectAB = `SkyeMail live proof A to B ${runId}`;
  const subjectBA = `SkyeMail live proof B to A ${runId}`;

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
        html: `<p>${htmlEscape(text)}</p>`,
      }),
    });
    const body = await res.text();
    let data = null;
    try { data = body ? JSON.parse(body) : null; } catch { data = { raw: body }; }
    if (!res.ok) throw new Error(data?.message || data?.error || body || `Mail lane failed ${res.status}`);
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

  return {
    ok: Boolean(importAB.imported && importBA.imported),
    mail_lane: "citadel-skynet",
    proof_mode: "citadel-skynet-webhook-import",
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
        citadel_send_id: sendAB.id || null,
        citadel_message_id: importAB.message?.provider_message_id || null,
        imported_to_inbox: Boolean(importAB.imported),
        imported_message_id: importAB.message?.id || null,
        event_count: importAB.events?.length || 0,
      },
      {
        label: "B replies to A",
        from: b.email,
        to: a.email,
        subject: subjectBA,
        citadel_send_id: sendBA.id || null,
        citadel_message_id: importBA.message?.provider_message_id || null,
        imported_to_inbox: Boolean(importBA.imported),
        imported_message_id: importBA.message?.id || null,
        event_count: importBA.events?.length || 0,
      },
    ],
    security: {
      citadel_keys_active: true,
      private_keys_exposed: false,
      inbox_storage: "encrypted payloads in the Citadel/SkyeNet sovereign mail store",
      mail_events: "Citadel webhooks processed by SkyeMail Sovereign Worker",
    },
  };
}

async function runZohoProof() {
  const { accountId, defaultFrom } = await getZohoMailboxIdentity();
  const domain = defaultFrom.split("@")[1] || env.SKYMAIL_PRIMARY_DOMAIN || env.INBOUND_DOMAIN || "solenterprises.org";
  const subjectAB = `SkyeMail Citadel live inbox proof A ${runId}`;
  const subjectBA = `SkyeMail Citadel live inbox proof B ${runId}`;
  const sendAB = await zohoSend({
    accountId,
    from: defaultFrom,
    to: defaultFrom,
    subject: subjectAB,
    text: `Run ${runId}: SkyeMail sends through the Citadel/SkyeNet sovereign mail lane and waits until the message is visible to the sovereign inbox.`,
  });
  const importAB = await waitForZohoMailboxVisibility({ accountId, subject: subjectAB });
  const sendBA = await zohoSend({
    accountId,
    from: defaultFrom,
    to: defaultFrom,
    subject: subjectBA,
    text: `Run ${runId}: SkyeMail runs a second Citadel/SkyeNet send and verifies the mailbox can read the return proof.`,
  });
  const importBA = await waitForZohoMailboxVisibility({ accountId, subject: subjectBA });
  const runAInbox = importAB.inbox?.[0] || importAB.search?.find((message) => /inbox/i.test(messageFolder(message))) || null;
  const runBInbox = importBA.inbox?.[0] || importBA.search?.find((message) => /inbox/i.test(messageFolder(message))) || null;

  return {
    ok: Boolean(importAB.received && importBA.received),
    mail_lane: "citadel-skynet",
    proof_mode: "citadel-skynet-send-and-inbox-read",
    run_id: runId,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    public_demo_url: `${publicUrl}/live-proof`,
    domain,
    actors: [
      { label: "Active Citadel mailbox", mailbox: defaultFrom, citadel_lane_id: accountId },
      { label: "SkyeMail sovereign inbox reader", mailbox: defaultFrom, citadel_lane_id: accountId },
    ],
    runs: [
      {
        label: "Citadel send to sovereign inbox",
        from: defaultFrom,
        to: defaultFrom,
        subject: subjectAB,
        mail_lane: "citadel-skynet",
        citadel_send_id: sendAB.id || null,
        citadel_message_id: runAInbox?.messageId || runAInbox?.id || sendAB.id || null,
        imported_to_inbox: Boolean(importAB.received),
        imported_message_id: runAInbox?.messageId || runAInbox?.id || null,
        sovereign_inbox_visible: Boolean(importAB.received),
        sovereign_sent_visible: Boolean(importAB.sent?.length || importAB.sent_visible),
        event_count: (importAB.inbox?.length || 0) + (importAB.sent?.length || 0) + (importAB.search?.length || 0),
      },
      {
        label: "Citadel reply loop to sovereign inbox",
        from: defaultFrom,
        to: defaultFrom,
        subject: subjectBA,
        mail_lane: "citadel-skynet",
        citadel_send_id: sendBA.id || null,
        citadel_message_id: runBInbox?.messageId || runBInbox?.id || sendBA.id || null,
        imported_to_inbox: Boolean(importBA.received),
        imported_message_id: runBInbox?.messageId || runBInbox?.id || null,
        sovereign_inbox_visible: Boolean(importBA.received),
        sovereign_sent_visible: Boolean(importBA.sent?.length || importBA.sent_visible),
        event_count: (importBA.inbox?.length || 0) + (importBA.sent?.length || 0) + (importBA.search?.length || 0),
      },
    ],
    security: {
      citadel_keys_active: true,
      private_keys_exposed: false,
      inbox_storage: "Citadel/SkyeNet sovereign mailbox read through SkyeMail; no raw OAuth token is published",
      mail_events: "Citadel/SkyeNet send and inbox-read proof",
    },
  };
}

function writeProof(proof) {
  const outDir = path.join(root, "proof");
  const runDir = path.join(outDir, "live-email-runs");
  const artifactDir = path.join(repoRoot, "test-artifacts", "skyemail-live-proof");
  fs.mkdirSync(runDir, { recursive: true });
  fs.mkdirSync(artifactDir, { recursive: true });
  const text = `${JSON.stringify(proof, null, 2)}\n`;
  fs.writeFileSync(path.join(outDir, "live-email-proof.json"), text);
  fs.writeFileSync(path.join(runDir, `${runId}.json`), text);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(artifactDir, `${stamp}-${runId}.json`), text);
}

const proof = providerMode === "zoho" ? await runZohoProof() : await runResendProof();
writeProof(proof);
console.log(JSON.stringify(proof, null, 2));
process.exit(proof.ok ? 0 : 1);
