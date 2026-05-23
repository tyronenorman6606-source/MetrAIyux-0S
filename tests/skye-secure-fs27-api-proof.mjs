import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "test-artifacts", "skye-secure-fs27-api-proof");
const REPORT_PATH = path.join(OUT_DIR, "fs27-api-proof-report.json");

process.env.SKYSECURE_MEMORY_STORE = "1";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "local-skysecure-proof-admin";

const originalWarn = console.warn;
console.warn = (...args) => {
  if (String(args[0] || "").startsWith("monitor emit failed:")) return;
  originalWarn(...args);
};

const { default: skysecureApi } = await import("../SkyeGateFS27/netlify/functions/skysecure-api.js");

async function call(method, route, body, headers = {}) {
  const url = `https://fs27.local${route}`;
  const req = new Request(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const res = await skysecureApi(req, { waitUntil: () => {} });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const adminHeaders = { "x-admin-password": process.env.ADMIN_PASSWORD };
const packId = `local-fs27-skyevault-skysecure-proof-${Date.now()}`;

const health = await call("GET", "/skysecure/health");
assert(health.status === 200 && health.data?.hierarchy?.chain === "FS27 -> SkyeVault -> SkySecure", "SkySecure health route failed.");

const anonymousList = await call("GET", "/skysecure/packs");
assert(anonymousList.status === 401, "SkySecure pack listing must require FS27 auth.");

const rejectedPayload = await call("POST", "/skysecure/packs", {
  pack_id: `${packId}-bad`,
  encryptedPayload: "not-allowed"
}, adminHeaders);
assert(rejectedPayload.status === 400, "SkySecure API accepted raw payload material.");

const registered = await call("POST", "/skysecure/packs", {
  pack_id: packId,
  workspace_id: "fs27-skyevault",
  repo_id: "metraiyux-0s/fs27",
  object_key: `skyevault://fs27/skye-secure/${packId}.skyesecrets`,
  object_sha256: "a".repeat(64),
  object_bytes: 8192,
  file_count: 3,
  plaintext_bytes: 4096,
  encrypted_bytes: 8192,
  public_manifest: {
    format: "SKYESEC2",
    encrypted: true,
    app: "SkySecure",
    note: "local proof metadata only"
  },
  recipients: [{ id: "dev-team", wrap: "x25519" }],
  source: { path: "test-artifacts/skye-secure-fs27-api-proof", lane: "local-proof" }
}, adminHeaders);
assert(registered.status === 201 && registered.data?.pack?.pack_id === packId, "SkySecure pack registration failed.");

const grant = await call("POST", "/skysecure/grants", {
  action: "grant",
  pack_id: packId,
  workspace_id: "fs27-skyevault",
  subject_id: "developer@example.test",
  role: "developer",
  capabilities: ["inspect", "download-ciphertext", "request-unlock"]
}, adminHeaders);
assert(grant.status === 201 && grant.data?.grant?.subject_id === "developer@example.test", "SkySecure grant creation failed.");

const event = await call("POST", "/skysecure/events", {
  pack_id: packId,
  workspace_id: "fs27-skyevault",
  action: "pack.verified",
  meta: { proof: "fs27-local-route", object_sha256: "a".repeat(64) }
}, adminHeaders);
assert(event.status === 202 && event.data?.event?.id, "SkySecure event recording failed.");

const packs = await call("GET", `/skysecure/packs?pack_id=${encodeURIComponent(packId)}`, null, adminHeaders);
assert(packs.status === 200 && packs.data?.count === 1, "SkySecure pack list did not return registered pack.");

const grants = await call("GET", `/skysecure/grants?pack_id=${encodeURIComponent(packId)}`, null, adminHeaders);
assert(grants.status === 200 && grants.data?.count === 1, "SkySecure grant list did not return registered grant.");

const events = await call("GET", `/skysecure/events?pack_id=${encodeURIComponent(packId)}`, null, adminHeaders);
assert(events.status === 200 && events.data?.count >= 3, "SkySecure event list did not include lifecycle events.");

const proof = await call("GET", "/skysecure/proof");
assert(proof.status === 200 && proof.data?.counts?.packs >= 1, "SkySecure proof route did not report counts.");

const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  hierarchy: health.data.hierarchy,
  invariant: proof.data.invariant,
  checks: {
    health: health.status,
    anonymousListRejected: anonymousList.status,
    payloadRejected: rejectedPayload.status,
    packRegistered: registered.status,
    grantCreated: grant.status,
    eventRecorded: event.status,
    packListed: packs.status,
    grantListed: grants.status,
    eventsListed: events.status,
    proof: proof.status
  },
  counts: proof.data.counts,
  packId,
  reportPath: path.relative(ROOT, REPORT_PATH)
};

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
