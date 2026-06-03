import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolveZeroOsGateAuth } from "../../../../tools/lib/zero-os-gate-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skymailRoot = path.resolve(__dirname, "..");
const base = String(process.env.SKYEMAIL_LIVE_BASE || "https://skyemail-platform.graylondonskyes.workers.dev").replace(/\/+$/, "");
const repoRoot = path.resolve(skymailRoot, "../../..");
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || process.env.ZERO_OS_BASE_URL || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, "");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(repoRoot, "test-artifacts", "skyemail-live-production-stress", stamp);
const latestPath = path.join(repoRoot, "test-artifacts", "skyemail-live-production-stress-latest.json");
const preferredMailbox = String(process.env.SKYEMAIL_STRESS_MAILBOX || "darthom-intelligence@solenterprises.org").trim().toLowerCase();
const p95BudgetMs = Number(process.env.SKYEMAIL_STRESS_P95_BUDGET_MS || 5000);
const maxBudgetMs = Number(process.env.SKYEMAIL_STRESS_MAX_BUDGET_MS || 15000);

async function timedFetch(pathname, init = {}) {
  const url = pathname.startsWith("http") ? pathname : `${base}${pathname}`;
  const started = performance.now();
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json,text/html;q=0.9,*/*;q=0.8",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
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

function routeKey(url = "") {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search ? parsed.search.replace(/([?&](?:q|id|token|authorization)=)[^&]*/gi, "$1[redacted]") : ""}`;
  } catch {
    return String(url || "");
  }
}

function summarizeTimings(results = []) {
  const groups = new Map();
  for (const item of results) {
    const key = routeKey(item.url);
    const list = groups.get(key) || [];
    list.push(item.ms);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([route, values]) => {
    const sorted = values.slice().sort((a, b) => a - b);
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
      route,
      count: values.length,
      avg_ms: Math.round(total / values.length),
      p95_ms: p95(sorted),
      max_ms: Math.max(...values),
      min_ms: Math.min(...values),
    };
  }).sort((a, b) => b.p95_ms - a.p95_ms);
}

await fs.mkdir(artifactDir, { recursive: true });

function chooseMailbox(mailboxes = []) {
  const active = mailboxes.filter((item) => !["released", "offboarded", "disabled"].includes(String(item.status || "").toLowerCase()));
  const byEmail = new Map(active.map((item) => [String(item.mailbox_email || "").toLowerCase(), item]));
  return byEmail.get(preferredMailbox)
    || active.find((item) => String(item.provider || "").toLowerCase() === "zoho")
    || active[0]
    || null;
}

function authHeaders(token, mailbox = "") {
  return {
    authorization: `Bearer ${token}`,
    "x-skymail-mailbox-email": mailbox,
  };
}

function expectSemantic(result, check) {
  assert.equal(result.ok, true, `${result.url} returned ${result.status}`);
  if (check) check(result.body, result);
}

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
assert.equal(domains?.provider, "skyemail", "live mailbox provider must present SkyeMail publicly");
assert.equal(domains?.provider_configured?.mail_api_ready || domains?.provider_configured?.configured, true, "SkyeMail mail API ready");

const liveProof = baseline.find((item) => item.url.endsWith("/proof/live-email-proof.json"))?.body;
assert.equal(liveProof?.ok, true, "live email proof ok");

const gate = await resolveZeroOsGateAuth({ zeroOsBase, envFiles: [path.join(repoRoot, ".env"), path.join(skymailRoot, ".env")] });
assert.equal(gate.ok, true, `shared SkyeGate FS27 bearer unavailable for authenticated stress: ${gate.response?.body?.error || gate.response?.error || gate.credential?.source || "unknown"}`);
const authBind = await timedFetch("/auth-fs27-session", {
  method: "POST",
  headers: authHeaders(gate.token),
  body: JSON.stringify({ source: "skyemail-live-production-stress" }),
});
expectSemantic(authBind, (body) => {
  assert.equal(body?.ok, true, "auth bind did not return ok");
  assert.ok(Array.isArray(body?.mailboxes) && body.mailboxes.length > 0, "auth bind returned no accessible mailboxes");
});
const selectedMailbox = chooseMailbox(authBind.body?.mailboxes || []);
assert.ok(selectedMailbox?.mailbox_email, "no stress mailbox could be selected");
const selectedEmail = selectedMailbox.mailbox_email;
const boundSelected = await timedFetch("/auth-fs27-session", {
  method: "POST",
  headers: authHeaders(gate.token, selectedEmail),
  body: JSON.stringify({ mailbox_email: selectedEmail, source: "skyemail-live-production-stress" }),
});
expectSemantic(boundSelected, (body) => {
  assert.equal(body?.selected_mailbox, selectedEmail, "selected mailbox bind did not stick");
});

const authChecks = [
  ["/auth-me", (body) => assert.ok(body?.handle, "auth-me missing handle")],
  ["/mail-status", (body) => {
    assert.equal(body?.ok, true, "mail-status missing ok");
    assert.ok(body?.mailbox?.mailbox_email || body?.profile?.email || body?.auth?.email, "mail-status missing mailbox/profile identity");
  }],
  ["/mailboxes-list", (body) => {
    assert.equal(body?.ok, true, "mailboxes-list missing ok");
    assert.ok((body?.mailboxes || []).some((mailbox) => String(mailbox.mailbox_email || "").toLowerCase() === selectedEmail.toLowerCase()), "mailboxes-list missing selected mailbox");
  }],
  ["/gmail-labels", (body) => assert.ok(Array.isArray(body?.labels || body?.items), "gmail-labels missing label array")],
  [`/gmail-list?label=INBOX&max=5`, (body) => assert.ok(Array.isArray(body?.items), "gmail-list missing message items")],
  ["/mail-brain", (body) => {
    assert.equal(body?.model_mode, "fs27_metered_v1", "mail-brain not in FS27 metered mode");
    assert.equal(body?.ai?.direct_provider_fallback_enabled, false, "mail-brain direct provider fallback is enabled");
  }],
  ["/mail-os-health", (body) => assert.equal(body?.ok, true, "mail-os-health is not ok")],
  ["/mail-routing-health", (body) => {
    assert.equal(body?.ok, true, "mail-routing-health is not ok");
    assert.match(body?.endpoints?.delivery_events || "", /\/mail-routing-events$/, "mail-routing-health did not expose branded event route");
  }],
  ["/mail-routing-events?limit=5", (body) => assert.ok(Array.isArray(body?.events), "mail-routing-events missing event array")],
  ["/mail-routing-webhook-events?limit=5", (body) => assert.ok(Array.isArray(body?.items), "mail-routing-webhook-events missing items array")],
  ["/telemetry-summary?days=7&limit=20", (body) => assert.ok(Number(body?.summary?.total_events || 0) >= 0, "telemetry summary missing counts")],
];

const authenticatedBaseline = [];
for (const [pathname, check] of authChecks) {
  const result = await timedFetch(pathname, { headers: authHeaders(gate.token, selectedEmail) });
  expectSemantic(result, check);
  authenticatedBaseline.push({ url: result.url, status: result.status, ms: result.ms });
}

const stress = [];
for (let round = 0; round < 8; round += 1) {
  const authRound = authChecks.map(([pathname]) => timedFetch(pathname, { headers: authHeaders(gate.token, selectedEmail) }));
  stress.push(...await Promise.all([
    timedFetch("/"),
    timedFetch("/dashboard"),
    timedFetch("/.netlify/functions/mailbox-domains"),
    timedFetch("/proof/live-email-proof.json"),
    ...authRound,
  ]));
}

for (const result of stress) {
  assert.equal(result.ok, true, `${result.url} stress returned ${result.status}`);
}

const durations = [...baseline, ...authenticatedBaseline, ...stress].map((item) => item.ms);
const p95Ms = p95(durations);
const maxMs = Math.max(...durations);
const budgetOk = p95Ms <= p95BudgetMs && maxMs <= maxBudgetMs;
const receipt = {
  ok: budgetOk,
  generated_at: new Date().toISOString(),
  base,
  selected_mailbox: selectedEmail,
  baseline_checks: baseline.map((item) => ({ url: item.url, status: item.status, ms: item.ms })),
  authenticated_baseline_checks: authenticatedBaseline,
  stress: {
    total_requests: stress.length,
    ok_requests: stress.filter((item) => item.ok).length,
    p95_ms: p95Ms,
    max_ms: maxMs,
    min_ms: Math.min(...durations),
    p95_budget_ms: p95BudgetMs,
    max_budget_ms: maxBudgetMs,
    budget_ok: budgetOk,
  },
  route_timing_summary: summarizeTimings([...baseline, ...authenticatedBaseline, ...stress]),
  slowest_requests: [...stress, ...authenticatedBaseline, ...baseline]
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 20)
    .map((item) => ({ route: routeKey(item.url), status: item.status, ms: item.ms })),
  provider: {
    mailbox_provider: domains?.provider || null,
    mailApiReady: Boolean(domains?.provider_configured?.mail_api_ready || domains?.provider_configured?.configured),
    provisioningReady: Boolean(domains?.provider_configured?.provisioning_ready || domains?.provisioning_configured),
    live_email_proof_ok: Boolean(liveProof?.ok),
  },
  artifact_dir: artifactDir,
};

await fs.writeFile(path.join(artifactDir, "receipt.json"), JSON.stringify(receipt, null, 2));
await fs.writeFile(latestPath, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
assert.ok(p95Ms <= p95BudgetMs, `SkyeMail live production stress p95 ${p95Ms}ms exceeded ${p95BudgetMs}ms`);
assert.ok(maxMs <= maxBudgetMs, `SkyeMail live production stress max ${maxMs}ms exceeded ${maxBudgetMs}ms`);
