#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const ROOT_ENV = path.join(ROOT, ".env");
const VAULT_ENV = path.join(ROOT, "SkyeVault-Drop", ".env");
const LOCAL_SKYESECURE_ENV = path.join(ROOT, ".skyevault-out", "skysecure-fs27-write-secret.env");
const LIVE_PROOF_REPORT = path.join(ROOT, "test-artifacts", "skye-secure-live-production-proof", "live-production-proof-report.json");

function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  const text = fs.readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    let value = raw.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function quote(value) {
  const raw = String(value ?? "");
  return `"${raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function isBlank(value) {
  const raw = String(value ?? "").trim();
  return !raw || raw === "''" || raw === '""';
}

function choose(...values) {
  return values.find((value) => !isBlank(value)) || "";
}

function generatedSecret() {
  return crypto.randomBytes(32).toString("hex");
}

const rootEnv = parseEnv(ROOT_ENV);
const vaultEnv = parseEnv(VAULT_ENV);
const localSkySecureEnv = parseEnv(LOCAL_SKYESECURE_ENV);
const proof = readJson(LIVE_PROOF_REPORT);

const skysecureWriteSecret = choose(
  rootEnv.SKYESECURE_WRITE_SECRET,
  rootEnv.FS27_SKYESECURE_WRITE_SECRET,
  localSkySecureEnv.SKYESECURE_WRITE_SECRET,
  localSkySecureEnv.FS27_SKYESECURE_WRITE_SECRET
) || generatedSecret();
const liveProofPassphrase = choose(rootEnv.SKYESECURE_LIVE_PROOF_PASSPHRASE) || generatedSecret();
const portalKey = choose(rootEnv.SKYEVAULT_PORTAL_KEY, rootEnv.CLIENT_PORTAL_KEY, vaultEnv.CLIENT_PORTAL_KEY);
const fs27Base = choose(
  rootEnv.FS27_LIVE_BASE,
  rootEnv.SKYGATEFS27_ORIGIN,
  rootEnv.SKYGATEFS27_WORKER_ORIGIN,
  rootEnv.SKYEGATE_FS27_URL,
  "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev"
);
const osBase = choose(
  rootEnv.METRAIYUX_0S_LIVE_BASE,
  rootEnv.METRAIYUX_0S_FULL_SYSTEM_URL,
  "https://metraiyux-0s-full-system.graylondonskyes.workers.dev"
);
const vaultUrl = choose(rootEnv.SKYEVAULT_DROP_URL, vaultEnv.URL, "https://skyevault-drop.graylondonskyes.workers.dev");

const desired = {
  SKYESECURE_WRITE_SECRET: skysecureWriteSecret,
  FS27_SKYESECURE_WRITE_SECRET: skysecureWriteSecret,
  SKYESECURE_LIVE_PROOF_PASSPHRASE: liveProofPassphrase,
  FS27_LIVE_BASE: fs27Base,
  METRAIYUX_0S_LIVE_BASE: osBase,
  SKYEVAULT_DROP_URL: vaultUrl,
  SKYEVAULT_PORTAL_KEY: portalKey,
  CLIENT_PORTAL_KEY: portalKey,
  SKYEVAULT_RETURN_DOWNLOAD_LINK: "0",
  SKYESECURE_FS27_HEALTH_URL: `${fs27Base}/skysecure/health`,
  SKYESECURE_FS27_PROOF_URL: `${fs27Base}/skysecure/proof`,
  SKYESECURE_0S_PROOF_URL: `${osBase}/proof-vault/skye-secure-fs27-vault-proof.html`,
  SKYESECURE_0S_PACK_CONSOLE_URL: `${osBase}/skye-secure-secret-packs/app.html`,
  SKYESECURE_0S_PLATFORM_CONSOLE_URL: `${osBase}/skye-secure-platform/index.html`,
  SKYESECURE_LIVE_PROOF_REPORT: "test-artifacts/skye-secure-live-production-proof/live-production-proof-report.json",
  SKYESECURE_LIVE_PROOF_PACK: "test-artifacts/skye-secure-live-production-proof/live-proof.skyesecrets",
  SKYESECURE_LAST_LIVE_PROOF_AT: proof.generatedAt || "",
  SKYESECURE_LAST_PACK_ID: proof.pack?.packId || "",
  SKYESECURE_LAST_PACK_SHA256: proof.pack?.packSha256 || "",
  SKYESECURE_LAST_VAULT_RECEIPT_ID: proof.vaultReceipt?.receiptId || "",
  SKYESECURE_LAST_VAULT_SESSION_ID: proof.vaultReceipt?.sessionId || "",
  SKYESECURE_LAST_VAULT_DESTINATION: proof.vaultReceipt?.destination || "",
  SKYESECURE_LAST_FS27_COUNTS: proof.counts ? JSON.stringify(proof.counts) : "",
  SKYGATE_FS27_SKYESECURE_LAST_VERSION_ID: "72ced023-345a-4a26-88fc-f48afa0f7d2e",
  METRAIYUX_0S_SKYESECURE_LAST_VERSION_ID: "b60c9821-a030-4ebd-8ce5-f7b2c78acb7f"
};

const existing = parseEnv(ROOT_ENV);
const lines = [];
for (const [key, value] of Object.entries(desired)) {
  if (isBlank(value)) continue;
  if (!isBlank(existing[key])) continue;
  lines.push(`${key}=${quote(value)}`);
}

if (!lines.length) {
  console.log(JSON.stringify({ ok: true, appended: 0, keys: [] }, null, 2));
  process.exit(0);
}

const block = [
  "",
  `# SkySecure FS27 -> SkyeVault production secret/proof lane appended ${new Date().toISOString()}`,
  "# Appended only; do not move plaintext secrets into Git. These values feed local proof/deploy scripts.",
  ...lines,
  ""
].join("\n");

fs.appendFileSync(ROOT_ENV, block, { mode: 0o600 });

const secretKeys = new Set([
  "SKYESECURE_WRITE_SECRET",
  "FS27_SKYESECURE_WRITE_SECRET",
  "SKYESECURE_LIVE_PROOF_PASSPHRASE",
  "SKYEVAULT_PORTAL_KEY",
  "CLIENT_PORTAL_KEY"
]);

console.log(JSON.stringify({
  ok: true,
  appended: lines.length,
  keys: lines.map((line) => line.split("=")[0]),
  secret_keys_appended: lines.map((line) => line.split("=")[0]).filter((key) => secretKeys.has(key)).length
}, null, 2));
