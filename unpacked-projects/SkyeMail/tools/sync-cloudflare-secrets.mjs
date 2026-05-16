import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skymailRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(skymailRoot, "../..");
const apply = process.argv.includes("--apply");

const wanted = [
  "NEON_DATABASE_URL",
  "DATABASE_URL",
  "JWT_SECRET",
  "SKYGATEFS27_ORIGIN",
  "SKYGATE_EVENT_MIRROR_SECRET",
  "SKYMAIL_SERVICE_TOKEN",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "NOTIFY_FROM_EMAIL",
  "INBOUND_DOMAIN",
  "SKYMAIL_PRIMARY_DOMAIN",
  "SKYMAIL_ALLOWED_DOMAINS",
  "STALWART_BASE_URL",
  "STALWART_MANAGEMENT_API_KEY",
  "SKYMAIL_IMAP_HOST",
  "SKYMAIL_SMTP_HOST",
  "SKYMAIL_JMAP_URL",
  "CITADEL_BACKUP_URL",
  "CITADEL_BACKUP_TOKEN",
  "CITADEL_DATABASE_URL",
  "CITADEL_BACKUP_DATABASE_URL",
  "RESEND_FROM_EMAIL",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_MODEL",
  "ANTHROPIC_MODEL",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
];

const secretOnly = new Set([
  "NEON_DATABASE_URL",
  "DATABASE_URL",
  "JWT_SECRET",
  "SKYGATEFS27_ORIGIN",
  "SKYGATE_EVENT_MIRROR_SECRET",
  "SKYMAIL_SERVICE_TOKEN",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "STALWART_BASE_URL",
  "STALWART_MANAGEMENT_API_KEY",
  "CITADEL_BACKUP_URL",
  "CITADEL_BACKUP_TOKEN",
  "CITADEL_DATABASE_URL",
  "CITADEL_BACKUP_DATABASE_URL",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_MODEL",
  "ANTHROPIC_MODEL",
  "NOTIFY_FROM_EMAIL",
  "INBOUND_DOMAIN",
  "SKYMAIL_PRIMARY_DOMAIN",
  "SKYMAIL_ALLOWED_DOMAINS",
  "SKYMAIL_IMAP_HOST",
  "SKYMAIL_SMTP_HOST",
  "SKYMAIL_JMAP_URL",
]);

const envFiles = [
  path.join(skymailRoot, ".env.template"),
  path.join(repoRoot, ".env"),
  path.join(skymailRoot, ".env"),
].filter((file) => fs.existsSync(file));

function parseEnvFile(file) {
  const out = {};
  const text = fs.readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim().replace(/^export\s+/, "");
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (isRealValue(key, value)) out[key] = value;
  }
  return out;
}

function isRealValue(key, value) {
  const clean = String(value || "").trim();
  if (!clean) return false;
  if (clean.includes("...")) return false;
  if (clean.includes("$(") || clean.includes("${")) return false;
  if (/yourdomain\.com/i.test(clean)) return false;
  if (/^(your_|YOUR_|changeme|CHANGE_ME|replace_me|REPLACE_ME)/.test(clean)) return false;
  if (/(^|_)DATABASE_URL$/.test(key) && !/^postgres(ql)?:\/\//.test(clean)) return false;
  return true;
}

const merged = {};
for (const file of envFiles) {
  for (const [key, value] of Object.entries(parseEnvFile(file))) {
    if (value) merged[key] = value;
  }
}
Object.assign(merged, Object.fromEntries(Object.entries(process.env).filter(([key]) => wanted.includes(key))));

const resendFrom = merged.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "";
const resendDomain = String(resendFrom).match(/@([^>\s'"]+)/)?.[1]?.toLowerCase();
if (resendDomain) {
  merged.NOTIFY_FROM_EMAIL ||= resendFrom.replace(/^['"]|['"]$/g, "");
  merged.INBOUND_DOMAIN ||= resendDomain;
  merged.SKYMAIL_PRIMARY_DOMAIN ||= resendDomain;
  merged.SKYMAIL_ALLOWED_DOMAINS ||= resendDomain;
}

const present = wanted.filter((key) => merged[key]);
const required = [
  ["NEON_DATABASE_URL", "DATABASE_URL"],
  "JWT_SECRET",
  "SKYGATEFS27_ORIGIN",
  "SKYGATE_EVENT_MIRROR_SECRET",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
];
const missingRequired = required
  .filter((item) => Array.isArray(item) ? !item.some((key) => merged[key]) : !merged[item])
  .map((item) => Array.isArray(item) ? item.join(" or ") : item);

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  env_files_checked: envFiles,
  present,
  missing_required: missingRequired,
}, null, 2));

if (!apply) {
  console.log("Dry run only. Use npm run cloudflare:secrets:push to write present secrets to Cloudflare.");
  process.exit(missingRequired.length ? 1 : 0);
}

const bulk = {};
for (const key of present.filter((item) => secretOnly.has(item))) {
  bulk[key] = merged[key];
}

const child = spawn("npx", ["wrangler", "secret", "bulk"], {
  cwd: skymailRoot,
  env: { ...process.env, ...merged },
  stdio: ["pipe", "pipe", "pipe"],
});

child.stdin.end(JSON.stringify(bulk));
let stderr = "";
let stdout = "";
child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });

const heartbeat = setInterval(() => {
  console.log("wrangler secret bulk still running...");
}, 5000);

const code = await new Promise((resolve) => {
  child.on("close", resolve);
});

clearInterval(heartbeat);

if (code !== 0) {
  process.stderr.write(stderr || stdout || "Bulk secret push failed.\n");
  process.exit(code || 1);
}

for (const key of Object.keys(bulk)) {
  console.log(`${key}=PUSHED`);
}
