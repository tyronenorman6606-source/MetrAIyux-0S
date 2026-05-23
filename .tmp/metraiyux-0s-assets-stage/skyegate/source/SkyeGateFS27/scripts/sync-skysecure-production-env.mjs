#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./_local-env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "..");

loadLocalEnv({ root, repoRoot });

function parseEnvLast(file) {
  const out = {};
  try {
    const text = fs.readFileSync(file, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      out[match[1]] = value;
    }
  } catch {
    // Optional; loadLocalEnv already populated process.env.
  }
  return out;
}

const rootEnvLast = parseEnvLast(path.join(repoRoot, ".env"));
if (rootEnvLast.CLOUDFLARE_ACCOUNT_ID) process.env.CLOUDFLARE_ACCOUNT_ID = rootEnvLast.CLOUDFLARE_ACCOUNT_ID;
if (rootEnvLast.CLOUDFLARE_API_TOKEN) process.env.CLOUDFLARE_API_TOKEN = rootEnvLast.CLOUDFLARE_API_TOKEN;

const workerName = process.env.SKYGATE_FS27_WORKER_NAME || "skyegatefs27-citadeldb";
const secret = process.env.SKYESECURE_WRITE_SECRET || process.env.FS27_SKYESECURE_WRITE_SECRET || "";
const missing = [];
if (!secret) missing.push("SKYESECURE_WRITE_SECRET");
if (!process.env.CLOUDFLARE_API_TOKEN) missing.push("CLOUDFLARE_API_TOKEN");
if (!process.env.CLOUDFLARE_ACCOUNT_ID) missing.push("CLOUDFLARE_ACCOUNT_ID");

if (missing.length) {
  console.error(JSON.stringify({
    ok: false,
    error: "Missing required environment values for SkySecure production sync.",
    missing
  }, null, 2));
  process.exit(1);
}

const result = spawnSync("npx", ["wrangler", "secret", "put", "SKYESECURE_WRITE_SECRET", "--name", workerName], {
  cwd: root,
  input: secret,
  encoding: "utf8",
  env: {
    ...process.env,
    NO_COLOR: "1",
    WRANGLER_SEND_METRICS: "false",
    CI: "1"
  },
  maxBuffer: 1024 * 1024
});

if (result.status !== 0) {
  console.error(JSON.stringify({
    ok: false,
    worker: workerName,
    error: "wrangler secret put failed",
    stderr: String(result.stderr || "").replace(/[A-Za-z0-9_=-]{20,}/g, "[redacted]").slice(0, 2000)
  }, null, 2));
  process.exit(result.status || 1);
}

console.log(JSON.stringify({
  ok: true,
  worker: workerName,
  synced: ["SKYESECURE_WRITE_SECRET"],
  source: "root .env via loadLocalEnv",
  secret_value_printed: false
}, null, 2));
