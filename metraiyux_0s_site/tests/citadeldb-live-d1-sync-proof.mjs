#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const zeroOsBase = (process.env.PROOF_BASE_URL || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, "");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(repoRoot, "test-artifacts", "citadeldb-live-d1-sync", stamp);
const latestPath = path.join(repoRoot, "test-artifacts", "citadeldb-live-d1-sync-latest.json");

const credentialKeys = [
  "FREE99_ADMIN_CODE",
  "ZERO_OS_GATE_CODE",
  "ZERO_OS_ADMIN_CODE",
  "METRAIYUX_OWNER_ADMIN_CODE",
  "OWNER_ADMIN_CODE",
  "ADMIN_CODE",
  "FS27_ADMIN_CODE",
  "SKYGATEFS27_ADMIN_CODE",
  "FREE99_GATE_CODE",
  "SKYE_GATE_ADMIN_CODE",
  "SKYGATE_ADMIN_CODE"
];

function unquote(value) {
  const text = String(value || "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = raw.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) out[match[1]] = unquote(match[2]);
  }
  return out;
}

function envValues() {
  return {
    ...loadEnvFile(path.join(repoRoot, ".env")),
    ...loadEnvFile(path.join(repoRoot, "env.txt")),
    ...process.env
  };
}

function resolveAlias(value, env, seen = new Set()) {
  const text = String(value || "").trim();
  const match = text.match(/^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/);
  if (!match || seen.has(match[1])) return text;
  seen.add(match[1]);
  return resolveAlias(env[match[1]], env, seen);
}

function sha12(value) {
  return createHash("sha256").update(String(value || "")).digest("hex").slice(0, 12);
}

function cleanToken(value) {
  return String(value || "").replace(/^Bearer(?:\s+|$)/i, "").trim();
}

async function findWorkingCredential() {
  const env = envValues();
  const candidates = credentialKeys
    .map((key) => ({ key, value: resolveAlias(env[key], env) }))
    .filter((item, index, list) => item.value && list.findIndex((other) => other.value === item.value) === index);

  const failures = [];
  for (const candidate of candidates) {
    const response = await fetch(`${zeroOsBase}/api/owner/admin-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: candidate.value })
    }).catch((error) => ({ ok: false, status: 0, error }));
    const data = response.json ? await response.json().catch(() => ({})) : {};
    const token = cleanToken(data.gateToken || data.gateBearerToken || data.token || data.session_token || data.sessionToken);
    if (response.ok && token) return { key: candidate.key, token, hash: sha12(candidate.value) };
    failures.push({ key: candidate.key, hash: sha12(candidate.value), status: response.status || 0 });
  }
  throw new Error(`No 0S owner-admin credential unlocked production. Tried: ${JSON.stringify(failures)}`);
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    "x-skye-gate-session": token,
    "x-free99-gate-session": token
  };
}

function runD1Query(recordId) {
  const sql = `SELECT id, event_id, app_id, table_name, record_id FROM citadel_rows WHERE record_id = '${recordId}' LIMIT 1;`;
  const result = spawnSync(process.execPath, [
    "tools/run-root-wrangler.mjs",
    "d1",
    "execute",
    "metraiyux-citadeldb",
    "--remote",
    "--command",
    sql
  ], {
    cwd: repoRoot,
    env: { ...process.env, ROOT_ENV_FILE: "env.txt" },
    encoding: "utf8"
  });
  return {
    status: result.status ?? 0,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

await fs.promises.mkdir(outDir, { recursive: true });
const credential = await findWorkingCredential();
const recordId = `citadel_live_${Date.now()}`;
const payload = {
  id: recordId,
  source: "neon-upstream-proof",
  email: "citadeldb-live-proof@example.test",
  plan: "skyenet-edge-starter",
  createdAt: new Date().toISOString()
};

const post = await fetch(`${zeroOsBase}/api/citadel/dual-write-receipt`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    ...authHeaders(credential.token)
  },
  body: JSON.stringify({
    source: "neon",
    appId: "citadeldb-live-proof",
    workspaceId: "metraiyux-0s",
    table: "neon_dual_sync_probe",
    recordId,
    operation: "upsert",
    neon: { ok: true, receiptId: `neon-proof:${recordId}`, writtenAt: payload.createdAt },
    payload,
    note: "Production proof that Neon-source payload mirrors into CitadelDB D1."
  })
});
const postBody = await post.json().catch(() => ({}));
assert.equal(post.status, 201, `POST /api/citadel/dual-write-receipt returned ${post.status}`);
assert.equal(postBody.event?.status, "mirrored_to_citadel");
assert.equal(postBody.event?.citadel?.storage, "cloudflare_d1");
assert.equal(postBody.rowMirror?.payloadStored, true);

const ledger = await fetch(`${zeroOsBase}/api/citadel/ledger?appId=citadeldb-live-proof`, {
  headers: authHeaders(credential.token)
});
const ledgerBody = await ledger.json().catch(() => ({}));
assert.equal(ledger.status, 200, `GET /api/citadel/ledger returned ${ledger.status}`);
assert.ok((ledgerBody.events || []).some((event) => event.recordId === recordId && event.status === "mirrored_to_citadel"));

const d1 = runD1Query(recordId);
assert.equal(d1.status, 0, d1.stderr || d1.stdout);
assert.ok(d1.stdout.includes(recordId), "remote D1 query did not return the mirrored row");

const receipt = {
  ok: true,
  generated_at: new Date().toISOString(),
  zero_os_base: zeroOsBase,
  credential: { key: credential.key, hash: credential.hash },
  record_id: recordId,
  event_id: postBody.event.id,
  event_status: postBody.event.status,
  citadel_storage: postBody.event.citadel.storage,
  row_mirror: postBody.rowMirror,
  ledger_count: ledgerBody.count,
  d1_query: {
    status: d1.status,
    stdout_contains_record: d1.stdout.includes(recordId)
  }
};
const receiptPath = path.join(outDir, "receipt.json");
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  record_id: recordId,
  event_id: postBody.event.id,
  receipt: path.relative(repoRoot, receiptPath),
  latest: path.relative(repoRoot, latestPath)
}, null, 2));
