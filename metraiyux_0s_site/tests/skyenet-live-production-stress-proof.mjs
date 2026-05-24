#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const zeroOsBase = (process.env.PROOF_BASE_URL || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, "");
const fs27Base = (process.env.SKYPAY_LIVE_ORIGIN || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev").replace(/\/+$/, "");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(repoRoot, "test-artifacts", "skyenet-live-production-stress", stamp);
const latestPath = path.join(repoRoot, "test-artifacts", "skyenet-live-production-stress-latest.json");
const stripeReceiptPath = path.join(repoRoot, "test-artifacts", "stripe-sync", "metraiyux-stripe-sync-receipt.json");

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

const expectedOffers = {
  "skyenet-edge-starter": ["skyenet_edge_starter_setup", "skyenet_edge_starter_monthly"],
  "skyenet-edge-growth": ["skyenet_edge_growth_setup", "skyenet_edge_growth_monthly"],
  "skyenet-functions-managed": ["skyenet_functions_managed_setup", "skyenet_functions_managed_monthly"],
  "skyenet-sovereign-runtime-reserve": ["skyenet_sovereign_runtime_setup", "skyenet_sovereign_runtime_monthly"]
};

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
    if (!match) continue;
    out[match[1]] = unquote(match[2]);
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
    const started = Date.now();
    const response = await fetch(`${zeroOsBase}/api/owner/admin-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: candidate.value })
    }).catch((error) => ({ ok: false, status: 0, error }));
    const ms = Date.now() - started;
    const data = response.json ? await response.json().catch(() => ({})) : {};
    const token = cleanToken(data.gateToken || data.gateBearerToken || data.token || data.session_token || data.sessionToken);
    if (response.ok && token) {
      return { key: candidate.key, token, hash: sha12(candidate.value), login_ms: ms };
    }
    failures.push({ key: candidate.key, hash: sha12(candidate.value), status: response.status || 0, ms });
  }
  throw new Error(`No 0S owner-admin credential unlocked production. Tried: ${JSON.stringify(failures)}`);
}

async function timedFetch(url, options = {}) {
  const started = performance.now();
  const response = await fetch(url, options);
  const ms = Math.round(performance.now() - started);
  const contentType = response.headers.get("content-type") || "";
  let body = null;
  if (contentType.includes("application/json")) {
    body = await response.json().catch(() => null);
  } else {
    body = await response.text().catch(() => "");
  }
  return { url, status: response.status, ok: response.ok, ms, body };
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    "x-skye-gate-session": token,
    "x-free99-gate-session": token
  };
}

function p95(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || 0;
}

function verifyStripeReceipt() {
  assert.ok(fs.existsSync(stripeReceiptPath), "Stripe sync receipt missing");
  const receipt = JSON.parse(fs.readFileSync(stripeReceiptPath, "utf8"));
  assert.equal(receipt.ok, true, "Stripe sync receipt ok");
  assert.equal(receipt.mode, "live", "Stripe sync must be live, not dry-run");
  const byPlan = new Map((receipt.synced || []).map((item) => [item.plan_id, item]));
  const checked = [];
  for (const [offerId, lookupKeys] of Object.entries(expectedOffers)) {
    const product = byPlan.get(offerId);
    assert.ok(product?.product_id && !String(product.product_id).startsWith("dry_run_"), `${offerId} has real Stripe product`);
    for (const lookupKey of lookupKeys) {
      const price = (product.prices || []).find((item) => item.lookup_key === lookupKey);
      assert.ok(price?.price_id && !String(price.price_id).startsWith("dry_run_"), `${lookupKey} has real Stripe price`);
      assert.equal(price.livemode, true, `${lookupKey} is live mode`);
    }
    checked.push({ offer_id: offerId, product_id: product.product_id, price_count: lookupKeys.length });
  }
  return {
    generated_at: receipt.generated_at,
    completed_at: receipt.completed_at,
    stripe_account: receipt.stripe_account,
    checked
  };
}

function verifyOffersPayload(payload) {
  assert.equal(payload?.ok, true, "SkyePay offers payload ok");
  for (const [offerId, lookupKeys] of Object.entries(expectedOffers)) {
    const offer = (payload.offers || []).find((item) => item.id === offerId);
    assert.ok(offer, `live SkyePay offer ${offerId}`);
    assert.equal(offer.family, "skyenet", `${offerId} family`);
    assert.equal(offer.owner_approval_required, true, `${offerId} owner approval`);
    assert.equal(offer.zero_upfront_trial, false, `${offerId} no trial`);
    assert.deepEqual((offer.line_items || []).map((item) => item.lookup_key), lookupKeys, `${offerId} lookup keys`);
    assert.ok((offer.line_items || []).every((item) => item.amount_cents > 0), `${offerId} positive amounts`);
    assert.equal(JSON.stringify(offer).includes("Cloudflare"), false, `${offerId} public provider split hidden`);
  }
}

await fs.promises.mkdir(artifactDir, { recursive: true });
const credential = await findWorkingCredential();
const stripeReceipt = verifyStripeReceipt();

const gatedRoutes = [
  "/api/skyenet/status",
  "/api/skyenet/routes",
  "/api/skyenet/observability",
  "/api/skyenet/cost-model",
  "/api/citadel/runtime-matrix"
];
const publicRoutes = [
  `${fs27Base}/skyepay/offers?client=metraiyux-0s`,
  `${fs27Base}/.netlify/functions/skyepay-offers?client=metraiyux-0s`,
  `${fs27Base}/skyepay.html?client=metraiyux-0s&offer=skyenet-edge-starter`,
  `${fs27Base}/skyepay-store.html?client=metraiyux-0s&offer=skyenet-edge-starter`
];

const checks = [];
for (const route of gatedRoutes) {
  checks.push(await timedFetch(`${zeroOsBase}${route}`, { headers: authHeaders(credential.token) }));
}
for (const url of publicRoutes) {
  checks.push(await timedFetch(url));
}

const offersCheck = checks.find((item) => item.url === publicRoutes[0]);
verifyOffersPayload(offersCheck.body);

const stressResults = [];
for (let round = 0; round < 8; round += 1) {
  const batch = [
    ...gatedRoutes.map((route) => timedFetch(`${zeroOsBase}${route}`, { headers: authHeaders(credential.token) })),
    timedFetch(`${fs27Base}/skyepay/offers?client=metraiyux-0s`)
  ];
  stressResults.push(...await Promise.all(batch));
}

for (const result of [...checks, ...stressResults]) {
  assert.equal(result.ok, true, `${result.url} returned ${result.status}`);
}

const allDurations = [...checks, ...stressResults].map((item) => item.ms);
const receipt = {
  ok: true,
  generated_at: new Date().toISOString(),
  zero_os_base: zeroOsBase,
  fs27_base: fs27Base,
  credential: { key: credential.key, hash: credential.hash, login_ms: credential.login_ms },
  stripe_receipt: stripeReceipt,
  expected_offers: Object.keys(expectedOffers),
  baseline_checks: checks.map((item) => ({ url: item.url, status: item.status, ms: item.ms })),
  stress: {
    total_requests: stressResults.length,
    ok_requests: stressResults.filter((item) => item.ok).length,
    p95_ms: p95(allDurations),
    max_ms: Math.max(...allDurations),
    min_ms: Math.min(...allDurations)
  },
  artifact_dir: artifactDir
};

const receiptPath = path.join(artifactDir, "receipt.json");
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  baseline_checks: receipt.baseline_checks.length,
  stress_requests: receipt.stress.total_requests,
  p95_ms: receipt.stress.p95_ms,
  receipt: path.relative(repoRoot, receiptPath),
  latest: path.relative(repoRoot, latestPath)
}, null, 2));
