import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const base = String(process.env.SKYEMAIL_LIVE_BASE || "https://skyemail-platform.graylondonskyes.workers.dev").replace(/\/+$/, "");
const repoRoot = path.resolve("../../..");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(repoRoot, "test-artifacts", "skyemail-live-production-stress", stamp);
const latestPath = path.join(repoRoot, "test-artifacts", "skyemail-live-production-stress-latest.json");

async function timedFetch(pathname) {
  const url = pathname.startsWith("http") ? pathname : `${base}${pathname}`;
  const started = performance.now();
  const response = await fetch(url, { headers: { accept: "application/json,text/html;q=0.9,*/*;q=0.8" } });
  const ms = Math.round(performance.now() - started);
  const contentType = response.headers.get("content-type") || "";
  let body = null;
  if (contentType.includes("json")) body = await response.json().catch(() => null);
  else body = await response.text().catch(() => "");
  return { url, status: response.status, ok: response.ok, ms, contentType, body };
}

function p95(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || 0;
}

await fs.mkdir(artifactDir, { recursive: true });

const baselinePaths = [
  "/",
  "/signup",
  "/compose",
  "/dashboard",
  "/live-proof",
  "/proof/live-email-proof.json",
  "/.netlify/functions/mailbox-domains",
  "/mailbox-domains"
];

const baseline = [];
for (const pathname of baselinePaths) {
  baseline.push(await timedFetch(pathname));
}

for (const result of baseline) {
  assert.equal(result.ok, true, `${result.url} returned ${result.status}`);
}

const domains = baseline.find((item) => item.url.endsWith("/mailbox-domains"))?.body;
assert.equal(domains?.provider, "zoho", "live mailbox provider is zoho");
assert.equal(domains?.provider_configured?.zohoApiReady || domains?.zohoApiReady, true, "Zoho API ready");

const liveProof = baseline.find((item) => item.url.endsWith("/proof/live-email-proof.json"))?.body;
assert.equal(liveProof?.ok, true, "live email proof ok");

const stress = [];
for (let round = 0; round < 8; round += 1) {
  stress.push(...await Promise.all([
    timedFetch("/"),
    timedFetch("/dashboard"),
    timedFetch("/.netlify/functions/mailbox-domains"),
    timedFetch("/proof/live-email-proof.json"),
  ]));
}

for (const result of stress) {
  assert.equal(result.ok, true, `${result.url} stress returned ${result.status}`);
}

const durations = [...baseline, ...stress].map((item) => item.ms);
const receipt = {
  ok: true,
  generated_at: new Date().toISOString(),
  base,
  baseline_checks: baseline.map((item) => ({ url: item.url, status: item.status, ms: item.ms })),
  stress: {
    total_requests: stress.length,
    ok_requests: stress.filter((item) => item.ok).length,
    p95_ms: p95(durations),
    max_ms: Math.max(...durations),
    min_ms: Math.min(...durations),
  },
  provider: {
    mailbox_provider: domains?.provider || null,
    zohoApiReady: Boolean(domains?.provider_configured?.zohoApiReady || domains?.zohoApiReady),
    zohoOrgReady: Boolean(domains?.provider_configured?.zohoOrgReady || domains?.zohoOrgReady),
    zohoProvisioningReady: Boolean(domains?.provider_configured?.zohoProvisioningReady || domains?.zohoProvisioningReady),
    live_email_proof_ok: Boolean(liveProof?.ok),
  },
  artifact_dir: artifactDir,
};

await fs.writeFile(path.join(artifactDir, "receipt.json"), JSON.stringify(receipt, null, 2));
await fs.writeFile(latestPath, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
