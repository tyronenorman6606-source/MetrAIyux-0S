import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { hashFile, packPublicSummary, readSecretPack } from "../packages/skye-secure/skye-secure-core.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "test-artifacts", "skye-secure-live-production-proof");
const SOURCE_DIR = path.join(OUT_DIR, "source");
const REPORT_PATH = path.join(OUT_DIR, "live-production-proof-report.json");
const PACK_PATH = path.join(OUT_DIR, "live-proof.skyesecrets");
const FS27_BASE = (process.env.FS27_LIVE_BASE || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev").replace(/\/+$/, "");
const OS_BASE = (process.env.METRAIYUX_0S_LIVE_BASE || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, "");

function parseEnvText(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const eq = line.indexOf("=");
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) out[key] = value;
  }
  return out;
}

async function loadRootEnv() {
  const files = [
    path.join(ROOT, "SkyeVault-Drop", ".env"),
    path.join(ROOT, ".skyevault-out", "skysecure-fs27-write-secret.env"),
    path.join(ROOT, ".env")
  ];
  const merged = {};
  for (const file of files) {
    try {
      Object.assign(merged, parseEnvText(await fs.readFile(file, "utf8")));
    } catch {
      // Optional local secret file.
    }
  }
  return merged;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchJson(method, url, body, headers = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text || "{}");
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  return { status: res.status, ok: res.ok, data };
}

async function fetchText(url) {
  const res = await fetch(url);
  const text = await res.text();
  return { status: res.status, ok: res.ok, text };
}

function runNode(args, env, label) {
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    env,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed (${result.status}): ${(result.stderr || result.stdout || "").slice(0, 1500)}`);
  }
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

async function latestVaultReceipt(before) {
  const dir = path.join(ROOT, ".skyevault-out");
  const entries = await fs.readdir(dir).catch(() => []);
  const candidates = [];
  for (const name of entries) {
    if (!/^skyevault-receipt-.*\.json$/.test(name) || before.has(name)) continue;
    const file = path.join(dir, name);
    const stat = await fs.stat(file).catch(() => null);
    if (stat) candidates.push({ name, file, mtimeMs: stat.mtimeMs });
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!candidates.length) return null;
  const data = JSON.parse(await fs.readFile(candidates[0].file, "utf8"));
  return {
    path: path.relative(ROOT, candidates[0].file),
    receiptId: data.receiptId || null,
    sessionId: data.sessionId || null,
    workspaceId: data.workspaceId || null,
    destination: data.destination || null,
    fileName: data.fileName || null,
    fileSize: data.fileSize || null,
    sha256: data.sha256 || null,
    assetType: data.assetType || null,
    clientReference: data.clientReference || null,
    notificationOk: data.notificationOk ?? null
  };
}

async function main() {
  const rootEnv = await loadRootEnv();
  const env = {
    ...process.env,
    ...rootEnv,
    SKYESECURE_LIVE_PROOF_PASSPHRASE: process.env.SKYESECURE_LIVE_PROOF_PASSPHRASE || crypto.randomBytes(32).toString("hex"),
    SKYEVAULT_RETURN_DOWNLOAD_LINK: "0"
  };
  const adminPassword = env.FS27_ADMIN_PASSWORD || env.ADMIN_PASSWORD || "";
  const writeSecret = env.SKYESECURE_WRITE_SECRET || env.FS27_SKYESECURE_WRITE_SECRET || "";
  assert(adminPassword || writeSecret, "ADMIN_PASSWORD, FS27_ADMIN_PASSWORD, or SKYESECURE_WRITE_SECRET is required for live SkySecure write proof.");

  await fs.mkdir(SOURCE_DIR, { recursive: true });
  await fs.writeFile(
    path.join(SOURCE_DIR, ".env"),
    [
      "SKYESECURE_LIVE_PROOF_DUMMY_SECRET=not-a-real-secret",
      "SKYESECURE_PURPOSE=prove-fs27-skyevault-skysecure-live-flow",
      `SKYESECURE_GENERATED_AT=${new Date().toISOString()}`
    ].join("\n") + "\n",
    { mode: 0o600 }
  );

  const health = await fetchJson("GET", `${FS27_BASE}/skysecure/health`);
  assert(health.status === 200 && health.data?.hierarchy?.chain === "FS27 -> SkyeVault -> SkySecure", "Live FS27 SkySecure health failed.");

  const unauthPacks = await fetchJson("GET", `${FS27_BASE}/skysecure/packs`);
  assert(unauthPacks.status === 401, "Live FS27 SkySecure packs route must reject anonymous reads.");

  const beforeReceiptNames = new Set(await fs.readdir(path.join(ROOT, ".skyevault-out")).catch(() => []));
  runNode([
    "tools/skye-secure-packs.mjs",
    "pack",
    `--path=${path.relative(ROOT, path.join(SOURCE_DIR, ".env"))}`,
    `--out=${path.relative(ROOT, PACK_PATH)}`,
    "--passphrase-env=SKYESECURE_LIVE_PROOF_PASSPHRASE",
    "--workspace=fs27-skyevault",
    "--repo=metraiyux-0s/fs27",
    "--client=Gray London Skyes",
    "--project=FS27 SkyeVault SkySecure Live Proof",
    "--notes=Live proof pack with dummy data only; verifies encrypted handoff and metadata wiring."
  ], env, "SkySecure live pack build");

  const pack = readSecretPack(PACK_PATH);
  const summary = packPublicSummary(pack);
  const packSha256 = await hashFile(PACK_PATH);
  assert(summary.packId, "Packed SkySecure file is missing pack id.");

  runNode(["tools/skye-secure-packs.mjs", "upload", `--pack=${path.relative(ROOT, PACK_PATH)}`], env, "SkyeVault live encrypted-pack upload");
  const vaultReceipt = await latestVaultReceipt(beforeReceiptNames);
  assert(vaultReceipt?.receiptId, "SkyeVault upload did not create a live receipt.");
  assert(vaultReceipt.sha256 === packSha256, "SkyeVault receipt hash does not match SkySecure pack hash.");

  const adminHeaders = writeSecret
    ? { "x-skysecure-write-secret": writeSecret }
    : { "x-admin-password": adminPassword };
  const objectKey = `skyevault://receipt/${vaultReceipt.receiptId}/${vaultReceipt.fileName || path.basename(PACK_PATH)}`;
  const register = await fetchJson("POST", `${FS27_BASE}/skysecure/packs`, {
    pack_id: summary.packId,
    workspace_id: "fs27-skyevault",
    repo_id: "metraiyux-0s/fs27",
    object_key: objectKey,
    object_sha256: packSha256,
    object_bytes: vaultReceipt.fileSize || 0,
    file_count: summary.fileCount || 0,
    plaintext_bytes: summary.plaintextBytes || 0,
    encrypted_bytes: vaultReceipt.fileSize || 0,
    public_manifest: {
      format: summary.format,
      version: summary.version,
      wrappedRecipients: summary.recipients?.length || 0,
      vaultReceiptId: vaultReceipt.receiptId
    },
    recipients: summary.recipients || [],
    source: {
      proof: "live-production",
      vaultReceiptPath: vaultReceipt.path,
      vaultReceiptId: vaultReceipt.receiptId,
      vaultSessionId: vaultReceipt.sessionId,
      hierarchy: "FS27 -> SkyeVault -> SkySecure"
    }
  }, adminHeaders);
  assert(register.status === 201 && register.data?.pack?.pack_id === summary.packId, "Live FS27 pack registration failed.");

  const grant = await fetchJson("POST", `${FS27_BASE}/skysecure/grants`, {
    action: "grant",
    pack_id: summary.packId,
    workspace_id: "fs27-skyevault",
    subject_id: "skyerunners-health",
    subject_type: "runner",
    role: "observer",
    capabilities: ["inspect", "verify-proof"]
  }, adminHeaders);
  assert(grant.status === 201, "Live FS27 SkyeRunners observer grant failed.");

  const event = await fetchJson("POST", `${FS27_BASE}/skysecure/events`, {
    pack_id: summary.packId,
    workspace_id: "fs27-skyevault",
    action: "pack.live-proof",
    meta: {
      vaultReceiptId: vaultReceipt.receiptId,
      objectSha256: packSha256,
      proofArtifact: path.relative(ROOT, REPORT_PATH)
    }
  }, adminHeaders);
  assert(event.status === 202, "Live FS27 SkySecure event write failed.");

  const listed = await fetchJson("GET", `${FS27_BASE}/skysecure/packs?pack_id=${encodeURIComponent(summary.packId)}`, null, adminHeaders);
  assert(listed.status === 200 && listed.data?.count === 1, "Live FS27 pack lookup failed.");

  const proof = await fetchJson("GET", `${FS27_BASE}/skysecure/proof`);
  assert(proof.status === 200 && proof.data?.db?.ok, "Live FS27 SkySecure proof route failed.");

  const authIntrospect = await fetchJson("POST", `${FS27_BASE}/auth/introspect`, { token: "invalid-live-proof-token" });
  assert(authIntrospect.status === 200 && authIntrospect.data?.active === false, "FS27 auth introspect invalid-token proof failed.");

  const surfaceChecks = [
    { id: "product", url: `${OS_BASE}/skye-secure-secret-packs.html`, must: "SkyeSecure" },
    { id: "packer", url: `${OS_BASE}/skye-secure-secret-packs/app.html`, must: "SkyeSecure Console" },
    { id: "platform", url: `${OS_BASE}/skye-secure-platform/index.html`, must: "Platform Console" },
    { id: "proof-lane", url: `${OS_BASE}/proof-vault/skye-secure-fs27-vault-proof.html`, must: "SkySecure is live under SkyeVault" }
  ];
  const surfaces = [];
  for (const check of surfaceChecks) {
    const page = await fetchText(check.url);
    assert(page.status === 200 && page.text.includes(check.must), `0S live surface failed: ${check.id}`);
    surfaces.push({ id: check.id, url: check.url, status: page.status, contains: check.must });
  }

  const report = {
    ok: true,
    generatedAt: new Date().toISOString(),
    fs27Base: FS27_BASE,
    metraiyux0sBase: OS_BASE,
    hierarchy: health.data.hierarchy,
    productionVersion: "FS27 Worker live deployment verified after route wiring",
    checks: {
      fs27Health: health.status,
      fs27AnonymousPackListRejected: unauthPacks.status,
      skyeVaultEncryptedPackUploaded: true,
      fs27PackRegistered: register.status,
      fs27SkyeRunnersGrantCreated: grant.status,
      fs27EventRecorded: event.status,
      fs27PackLookup: listed.status,
      fs27Proof: proof.status,
      fs27AuthIntrospectInvalidToken: authIntrospect.status,
      live0sSurfaces: surfaces.length
    },
    counts: proof.data.counts,
    pack: {
      packId: summary.packId,
      packPath: path.relative(ROOT, PACK_PATH),
      packSha256,
      fileCount: summary.fileCount,
      plaintextBytes: summary.plaintextBytes,
      recipients: summary.recipients?.map((recipient) => ({
        recipientId: recipient.recipientId,
        type: recipient.type
      })) || []
    },
    vaultReceipt,
    fs27: {
      objectKey,
      db: proof.data.db,
      proofLane: proof.data.proof_lane,
      invariant: proof.data.invariant
    },
    surfaces,
    reportPath: path.relative(ROOT, REPORT_PATH)
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}

await main();
