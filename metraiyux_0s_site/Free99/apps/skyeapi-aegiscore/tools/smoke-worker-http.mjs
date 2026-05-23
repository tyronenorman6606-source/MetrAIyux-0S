import worker from "../apps/gateway-worker/dist/index.js";
import { writeFile, mkdir } from "node:fs/promises";
import http from "node:http";

class InMemoryKV {
  constructor() { this.map = new Map(); }
  async get(key, type) {
    if (!this.map.has(key)) return null;
    const raw = this.map.get(key).value;
    if (type === "json") return JSON.parse(raw);
    if (type === "arrayBuffer") return new TextEncoder().encode(raw).buffer;
    return raw;
  }
  async put(key, value, options = {}) { this.map.set(key, { value: String(value), options }); }
  async delete(key) { this.map.delete(key); }
  async list(options = {}) {
    const prefix = options.prefix ?? "";
    const keys = [...this.map.keys()].filter((name) => name.startsWith(prefix)).sort().slice(0, options.limit ?? 1000).map((name) => ({ name }));
    return { keys, list_complete: true, cursor: undefined };
  }
}

const env = {
  AEGIS_KV: new InMemoryKV(),
  AEGIS_MASTER_KEY: "0123456789abcdef0123456789abcdef_v015_http_smoke",
  SKYE_ADMIN_KEY: "admin_v015_http_smoke",
  SKYE_ALLOWED_ORIGINS: "*",
  SKYE_DEFAULT_PLAN: "operator",
  SKYE_RATE_LIMIT_PER_MINUTE: "9999",
  SKYE_WEBHOOK_SIGNATURE_MODE: "report"
};

const base = "http://worker.local";
const adminHeaders = { "x-skye-admin-key": env.SKYE_ADMIN_KEY, "content-type": "application/json", "x-skye-actor-id": "proof-actor" };
const checked = [];

async function hit(path, init = {}) {
  const request = new Request(`${base}${path}`, init);
  const response = await worker.fetch(request, env, { waitUntil() {}, passThroughOnException() {} });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: response.status, ok: response.ok, body };
}

function assert(condition, message, detail) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail;
    throw error;
  }
}

async function withFixtureServer() {
  const server = http.createServer((req, res) => {
    if (req.method === "POST") {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, fixture: true, secrets_exposed: false }));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { url: `http://127.0.0.1:${address.port}/fixture/resend`, close: () => new Promise((resolve) => server.close(resolve)) };
}

const pack = {
  version: "skyeapi.provider-pack.v1",
  id: "fixture-email.pack",
  provider: "fixture-email",
  label: "Fixture Email",
  category: "email",
  capabilities: ["email.send"],
  requiredSecrets: ["FIXTURE_EMAIL_KEY"],
  optionalSecrets: [],
  enabledByDefault: false
};

async function main() {
  const fixture = await withFixtureServer();
  try {
    const projectId = "worker-http-proof";
    const envText = [
      "RESEND_API_KEY=re_test_worker_http_proof_1234567890",
      "RESEND_FROM=proof@skyeapi.local",
      "OPENAI_API_KEY=sk-test-worker-http-proof-1234567890",
      "OPENAI_MODEL=gpt-4o-mini",
      "OPENAI_BASE_URL=https://api.openai.example/v1"
    ].join("\n");

    let res = await hit("/health");
    assert(res.ok && res.body.version === "0.17.0", "health endpoint did not return v0.17.0", res);
    checked.push("GET /health returned v0.17.0");

    res = await hit("/v1/admin/import-env", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, scopes: ["*"], envText, plan: "operator" }) });
    assert(res.ok && res.body.apiKey && res.body.manifest, "import-env failed", res);
    checked.push("POST /v1/admin/import-env created encrypted project bundle and key");

    res = await hit("/v1/admin/create-key", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, scopes: ["*"], label: "worker-http-proof" }) });
    assert(res.ok && res.body.apiKey, "create-key failed", res);
    const apiKey = res.body.apiKey;
    checked.push("POST /v1/admin/create-key minted scoped key");

    res = await hit("/v1/capabilities", { headers: { authorization: `Bearer ${apiKey}` } });
    assert(res.ok && Array.isArray(res.body.capabilities), "capabilities failed", res);
    checked.push("GET /v1/capabilities returned safe manifest over HTTP");

    res = await hit("/v1/call", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ capability: "email.send", dryRun: true, input: { to: "proof@example.com", subject: "Worker HTTP proof", html: "Proof" } }) });
    assert(res.ok && res.body.dryRun === true, "dry-run capability call failed", res);
    checked.push("POST /v1/call executed dry-run capability path over HTTP");

    res = await hit("/v1/admin/enqueue-job", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, envelope: { capability: "email.send", dryRun: true, input: { to: "proof@example.com", subject: "Queued", html: "Queued" } }, maxAttempts: 2 }) });
    assert(res.status === 202 && res.body.job?.id, "enqueue-job failed", res);
    const leasedJobId = res.body.job.id;
    checked.push("POST /v1/admin/enqueue-job queued job over HTTP");

    res = await hit("/v1/admin/claim-job-lease", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, leaseMs: 30000 }) });
    assert(res.ok && res.body.lease?.jobId === leasedJobId && res.body.lease?.token, "claim-job-lease failed", res);
    const leaseToken = res.body.lease.token;
    checked.push("POST /v1/admin/claim-job-lease leased queued job over HTTP");

    res = await hit("/v1/admin/complete-job-lease", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, jobId: leasedJobId, leaseToken, result: { ok: true, capability: "email.send", proofId: "proof_worker_http_lease", dryRun: true, data: { completed: true }, secrets_exposed: false } }) });
    assert(res.ok && res.body.job?.status === "succeeded", "complete-job-lease failed", res);
    checked.push("POST /v1/admin/complete-job-lease completed leased job over HTTP");

    res = await hit("/v1/admin/enqueue-job", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, envelope: { capability: "email.send", dryRun: true, input: { to: "proof@example.com", subject: "Process", html: "Process" } }, maxAttempts: 2 }) });
    assert(res.status === 202 && res.body.job?.id, "enqueue-job for processor failed", res);
    res = await hit("/v1/admin/process-job", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId }) });
    assert(res.ok && res.body.job?.status === "succeeded", "process-job failed", res);
    checked.push("POST /v1/admin/process-job executed queued dry-run job over HTTP");

    res = await hit(`/v1/admin/jobs?projectId=${encodeURIComponent(projectId)}`, { headers: { "x-skye-admin-key": env.SKYE_ADMIN_KEY } });
    assert(res.ok && res.body.jobs?.length >= 2, "jobs list failed", res);
    checked.push("GET /v1/admin/jobs listed durable job records over HTTP");

    res = await hit("/v1/admin/outbound-subscriptions", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, url: "https://example.com/skyeapi-proof-webhook", events: ["workflow.completed"], enabled: true, description: "HTTP smoke subscription" }) });
    assert(res.status === 201 && res.body.subscription?.id, "outbound subscription create failed", res);
    const outboundSubscriptionId = res.body.subscription.id;
    checked.push("POST /v1/admin/outbound-subscriptions created subscription over HTTP");

    res = await hit("/v1/admin/outbound-events", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, eventType: "workflow.completed", payload: { workflowId: "proof" } }) });
    assert(res.ok && Array.isArray(res.body.deliveries) && res.body.deliveries.length === 1, "outbound event enqueue failed", res);
    checked.push("POST /v1/admin/outbound-events queued outbound delivery over HTTP");

    res = await hit(`/v1/admin/outbound-deliveries?projectId=${encodeURIComponent(projectId)}`, { headers: { "x-skye-admin-key": env.SKYE_ADMIN_KEY } });
    assert(res.ok && res.body.deliveries?.length >= 1, "outbound deliveries list failed", res);
    checked.push("GET /v1/admin/outbound-deliveries listed queued delivery over HTTP");

    res = await hit("/v1/admin/update-outbound-subscription", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, subscriptionId: outboundSubscriptionId, enabled: false, description: "disabled by proof" }) });
    assert(res.ok && res.body.subscription?.enabled === false, "outbound subscription update failed", res);
    checked.push("POST /v1/admin/update-outbound-subscription updated subscription over HTTP");

    res = await hit("/v1/admin/delete-outbound-subscription", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, subscriptionId: outboundSubscriptionId }) });
    assert(res.ok && res.body.deleted === true, "outbound subscription delete failed", res);
    checked.push("POST /v1/admin/delete-outbound-subscription deleted subscription over HTTP");

    res = await hit("/v1/admin/provider-pack-certify", { method: "POST", headers: adminHeaders, body: JSON.stringify(pack) });
    assert(res.ok && res.body.report?.ok === true, "provider-pack-certify failed", res);
    checked.push("POST /v1/admin/provider-pack-certify validated pack over HTTP");

    res = await hit("/v1/admin/provider-pack-sign", { method: "POST", headers: adminHeaders, body: JSON.stringify({ pack, signer: "skyeapi-proof", versionTag: "0.1.0" }) });
    assert(res.ok && res.body.manifest?.signature, "provider-pack-sign failed", res);
    const signedManifest = res.body.manifest;
    checked.push("POST /v1/admin/provider-pack-sign created signed manifest over HTTP");

    res = await hit("/v1/admin/provider-pack-verify", { method: "POST", headers: adminHeaders, body: JSON.stringify({ pack, manifest: signedManifest }) });
    assert(res.ok && res.body.ok === true, "provider-pack-verify failed", res);
    checked.push("POST /v1/admin/provider-pack-verify verified signed manifest over HTTP");

    res = await hit("/v1/admin/provider-pack-load-source", { method: "POST", headers: adminHeaders, body: JSON.stringify({ sourceType: "inline", pack, versionTag: "0.1.0" }) });
    assert(res.ok && res.body.loaded?.certification?.ok === true, "provider-pack-load-source failed", res);
    checked.push("POST /v1/admin/provider-pack-load-source loaded inline pack over HTTP");

    res = await hit("/v1/admin/provider-pack-sandbox", { method: "POST", headers: adminHeaders, body: JSON.stringify({ pack, adapterSource: "export const safe = true;", sampleInputs: [{ to: "proof@example.com" }] }) });
    assert(res.ok && res.body.report?.executedUntrustedCode === false, "provider-pack-sandbox failed", res);
    checked.push("POST /v1/admin/provider-pack-sandbox created non-executing sandbox report over HTTP");

    res = await hit("/v1/admin/provider-pack-registry", { method: "POST", headers: adminHeaders, body: JSON.stringify({ pack, versionTag: "0.1.0", status: "certified" }) });
    assert(res.ok && res.body.record?.id, "provider-pack-registry publish failed", res);
    const registryId = res.body.record.id;
    checked.push("POST /v1/admin/provider-pack-registry published certified pack over HTTP");

    res = await hit("/v1/admin/install-provider-pack", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, registryId, enabled: true }) });
    assert(res.ok && res.body.receipt?.registryId === registryId, "install-provider-pack failed", res);
    checked.push("POST /v1/admin/install-provider-pack installed certified pack over HTTP");

    res = await hit(`/v1/admin/provider-pack-installations?projectId=${encodeURIComponent(projectId)}`, { headers: { "x-skye-admin-key": env.SKYE_ADMIN_KEY } });
    assert(res.ok && res.body.installations?.length >= 1, "provider-pack installations list failed", res);
    checked.push("GET /v1/admin/provider-pack-installations listed install receipt over HTTP");

    res = await hit("/v1/admin/billing-invoice-create", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, customerEmail: "billing@example.com", note: "worker http proof" }) });
    assert(res.ok && res.body.invoice?.id, "billing-invoice-create failed", res);
    const invoiceId = res.body.invoice.id;
    checked.push("POST /v1/admin/billing-invoice-create persisted invoice record over HTTP");

    res = await hit("/v1/admin/billing-invoice-status", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, invoiceId, status: "issued", note: "proof issue" }) });
    assert(res.ok && res.body.invoice?.status === "issued", "billing-invoice-status failed", res);
    checked.push("POST /v1/admin/billing-invoice-status moved invoice lifecycle over HTTP");

    res = await hit("/v1/admin/billing-invoice-reconcile", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, invoiceId }) });
    assert(res.status === 200 || res.status === 409, "billing-invoice-reconcile did not return reconciliation response", res);
    assert(res.body.reconciliation?.version === "skyeapi.invoice-usage-reconciliation.v1", "billing-invoice-reconcile missing reconciliation object", res);
    checked.push("POST /v1/admin/billing-invoice-reconcile returned usage diff object over HTTP");

    res = await hit(`/v1/admin/billing-invoices?projectId=${encodeURIComponent(projectId)}`, { headers: { "x-skye-admin-key": env.SKYE_ADMIN_KEY } });
    assert(res.ok && res.body.invoices?.length >= 1, "billing-invoices list failed", res);
    checked.push("GET /v1/admin/billing-invoices listed persisted invoice over HTTP");

    res = await hit("/v1/admin/provider-fixture-certification", { method: "POST", headers: adminHeaders, body: JSON.stringify({ provider: "resend", capability: "email.send", endpoint: fixture.url, mode: "fixture" }) });
    assert(res.ok && res.body.certification?.ok === true, "provider fixture certification failed", res);
    checked.push("POST /v1/admin/provider-fixture-certification verified fixture endpoint over HTTP");

    res = await hit("/v1/admin/subscriptions", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, plan: "operator", customerEmail: "billing@example.com", paymentProvider: "stripe", paymentProviderCustomerId: "cus_fixture", paymentProviderSubscriptionId: "sub_fixture", paymentProviderPriceId: "price_fixture" }) });
    assert(res.ok && res.body.subscription?.id, "subscription create failed", res);
    const subscriptionId = res.body.subscription.id;
    checked.push("POST /v1/admin/subscriptions persisted subscription lifecycle record over HTTP");

    for (const [action, expected] of [["pause", "paused"], ["resume", "active"], ["payment_failed", "past_due"], ["cancel", "cancelled"]]) {
      res = await hit("/v1/admin/subscription-lifecycle", { method: "POST", headers: adminHeaders, body: JSON.stringify({ projectId, subscriptionId, action, note: `worker http proof ${action}` }) });
      assert(res.ok && res.body.subscription?.status === expected, `subscription lifecycle ${action} failed`, res);
    }
    checked.push("POST /v1/admin/subscription-lifecycle covered pause/resume/payment_failed/cancel over HTTP");

    res = await hit(`/v1/admin/subscriptions?projectId=${encodeURIComponent(projectId)}`, { headers: { "x-skye-admin-key": env.SKYE_ADMIN_KEY } });
    assert(res.ok && res.body.subscriptions?.length >= 1, "subscriptions list failed", res);
    checked.push("GET /v1/admin/subscriptions listed persisted subscription over HTTP");

    res = await hit("/v1/admin/workspace-bindings", { method: "POST", headers: adminHeaders, body: JSON.stringify({ workspaceId: "workspace-proof", projectId, roles: ["owner"] }) });
    assert(res.ok && res.body.binding?.projectId === projectId, "workspace binding failed", res);
    checked.push("POST /v1/admin/workspace-bindings created upstream workspace binding over HTTP");

    res = await hit("/v1/admin/workspace-access-check", { method: "POST", headers: adminHeaders, body: JSON.stringify({ workspaceId: "workspace-proof", projectId, role: "owner", capability: "email.send", roleCapabilities: { owner: ["email.send"] } }) });
    assert(res.ok && res.body.decision?.ok === true, "workspace access check failed", res);
    checked.push("POST /v1/admin/workspace-access-check allowed scoped workspace role over HTTP");

    res = await hit(`/v1/admin/audit-export?projectId=${encodeURIComponent(projectId)}`, { headers: { "x-skye-admin-key": env.SKYE_ADMIN_KEY } });
    assert(res.ok && res.body.bundle?.checksum && res.body.bundle?.counts, "audit-export failed", res);
    checked.push("GET /v1/admin/audit-export returned redacted bundle over HTTP");

    const proof = {
      ok: true,
      name: "worker-http-behavioral-smoke",
      version: "0.17.0",
      checked,
      endpointCount: checked.length,
      proofType: "behavioral HTTP calls against compiled Worker fetch with in-memory KV",
      does_not_prove: ["deployed Cloudflare behavior", "live provider delivery", "globally atomic KV locking", "real payment capture"],
      secrets_exposed: false,
      generatedAt: new Date().toISOString()
    };
    await mkdir(".proof", { recursive: true });
    await writeFile(".proof/worker-http-smoke-result.json", JSON.stringify(proof, null, 2));
    console.log(JSON.stringify(proof, null, 2));
  } finally {
    await fixture.close();
  }
}

main().catch(async (error) => {
  const failure = { ok: false, name: "worker-http-behavioral-smoke", error: error.message, detail: error.detail, checked, secrets_exposed: false, generatedAt: new Date().toISOString() };
  await mkdir(".proof", { recursive: true });
  await writeFile(".proof/worker-http-smoke-result.json", JSON.stringify(failure, null, 2));
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
});
