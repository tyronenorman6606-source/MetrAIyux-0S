import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  DurableAsyncJobQueue,
  DurableOutboundWebhookHub,
  MemoryOpsStore,
  ProviderPackRegistry,
  buildBillingUsageRecords,
  computeRetryDelayMs,
  sanitizeOutboundHeaders,
  summarizeBillingUsage
} from "../packages/ops/dist/index.js";
import { createProofId } from "../packages/core/dist/index.js";

const proofDir = new URL("../.proof/", import.meta.url);
await mkdir(proofDir, { recursive: true });

const store = new MemoryOpsStore();
const projectId = "proj_v10_smoke";

const retryDelay = computeRetryDelayMs(2, { strategy: "exponential", baseDelayMs: 1000, maxDelayMs: 10_000 });
if (retryDelay !== 2000) throw new Error(`Unexpected retry delay: ${retryDelay}`);

const queue = new DurableAsyncJobQueue(store);
const job = await queue.enqueue({
  projectId,
  envelope: { capability: "email.send", input: { to: "fail@example.com", subject: "Dead letter proof" }, dryRun: true },
  maxAttempts: 2,
  retryPolicy: { strategy: "fixed", baseDelayMs: 1, maxDelayMs: 1 }
});
const failedOnce = await queue.executeNext(projectId, async (record) => ({ ok: false, capability: record.envelope.capability, proofId: createProofId("proof_v10_fail"), error: { code: "fixture_fail", message: "first failure" }, secrets_exposed: false }));
if (!failedOnce || failedOnce.status !== "queued" || !failedOnce.nextAttemptAt) throw new Error("Durable job did not reschedule after first failure.");
await new Promise((resolve) => setTimeout(resolve, 5));
const deadJob = await queue.executeNext(projectId, async (record) => ({ ok: false, capability: record.envelope.capability, proofId: createProofId("proof_v10_fail"), error: { code: "fixture_fail", message: "second failure" }, secrets_exposed: false }));
if (!deadJob || deadJob.status !== "dead_lettered") throw new Error("Durable job did not dead-letter after max attempts.");
const deadLetters = await queue.listDeadLetters(projectId);
if (deadLetters.length !== 1 || deadLetters[0].jobId !== job.id) throw new Error("Job dead-letter record missing.");
const retried = await queue.retryDeadLetter(projectId, job.id);
if (!retried || retried.status !== "queued" || retried.attempts !== 0) throw new Error("Dead-letter job retry did not reset state.");

const headers = sanitizeOutboundHeaders({ Authorization: "Bearer should-not-pass", "X-Customer": "ok" });
if (headers.Authorization || headers.authorization || headers["X-Customer"] !== "ok") throw new Error("Outbound header sanitizer failed.");

const hub = new DurableOutboundWebhookHub(store);
const sub = await hub.subscribe({ projectId, url: "https://hooks.example.test/skyeapi", events: ["workflow.completed"], maxAttempts: 2, headers: { "X-Customer": "true", Authorization: "Bearer blocked" } });
if (sub.headers?.Authorization || sub.maxAttempts !== 2) throw new Error("Durable outbound subscription did not sanitize headers or store max attempts.");
const updated = await hub.updateSubscription({ projectId, subscriptionId: sub.id, events: ["*"], enabled: true, description: "updated in smoke" });
if (!updated || updated.events[0] !== "*" || updated.description !== "updated in smoke") throw new Error("Outbound subscription update failed.");
const queuedDeliveries = await hub.enqueueEvent(projectId, "workflow.completed", { runId: "run_v10" });
if (queuedDeliveries.length !== 1) throw new Error("Outbound delivery was not queued.");
await hub.processQueued(projectId, async () => new Response("fail", { status: 503 }));
const outboundDead = await hub.processQueued(projectId, async () => new Response("fail", { status: 503 }), {}, new Date(Date.now() + 60_000));
if (outboundDead[0]?.status !== "dead_lettered") throw new Error("Outbound delivery did not dead-letter.");
const outboundDeadLetters = await hub.listDeadLetters(projectId);
if (outboundDeadLetters.length !== 1) throw new Error("Outbound dead-letter record missing.");
const deleted = await hub.deleteSubscription(projectId, sub.id);
if (!deleted) throw new Error("Outbound subscription deletion failed.");

const registry = new ProviderPackRegistry(store);
const pack = {
  version: "skyeapi.provider-pack.v1",
  provider: "mailgun-custom",
  label: "Mailgun Custom",
  category: "email",
  capabilities: ["email.send"],
  requiredSecrets: ["MAILGUN_API_KEY"],
  optionalSecrets: [],
  secrets_exposed: false
};
const published = await registry.publish({ pack, versionTag: "0.1.0" });
if (published.status !== "certified" || !published.checksum) throw new Error("Provider pack registry publish failed.");
const installed = await registry.install(projectId, published.id, true);
if (!installed || installed.provider !== "mailgun-custom") throw new Error("Provider pack install receipt missing.");
const installations = await registry.installations(projectId);
if (installations.length !== 1) throw new Error("Provider pack installations list failed.");

const billingRecords = buildBillingUsageRecords([
  { projectId, capability: "email.send", ok: true, count: 10, window: "2026-05-10" },
  { projectId, capability: "sms.send", ok: true, count: 2, window: "2026-05-10" }
]);
const billingSummary = summarizeBillingUsage(billingRecords);
if (billingSummary.totalEstimatedCents <= 0 || billingSummary.byCapability.length !== 2) throw new Error("Billing usage summary failed.");

const workerSource = await readFile(new URL("../apps/gateway-worker/src/index.ts", import.meta.url), "utf8");
for (const needle of [
  "/v1/admin/dead-letter-jobs",
  "/v1/admin/retry-dead-letter-job",
  "/v1/admin/update-outbound-subscription",
  "/v1/admin/delete-outbound-subscription",
  "/v1/admin/dead-letter-outbound",
  "/v1/admin/provider-pack-registry",
  "/v1/admin/install-provider-pack",
  "/v1/admin/billing-usage"
]) {
  if (!workerSource.includes(needle)) throw new Error(`Missing v0.10 Worker route: ${needle}`);
}

const consoleHtml = await readFile(new URL("../apps/console/index.html", import.meta.url), "utf8");
for (const needle of ["load-dead-letter-jobs", "update-outbound-subscription", "load-dead-letter-outbound", "publish-provider-pack", "load-billing-usage"]) {
  if (!consoleHtml.includes(needle)) throw new Error(`Missing v0.10 console control: ${needle}`);
}

const result = {
  ok: true,
  version: "0.10.0",
  checks: [
    "durable_job_retry_backoff",
    "job_dead_letter_queue",
    "dead_letter_retry_reset",
    "outbound_subscription_update_delete",
    "outbound_delivery_retry_dead_letter",
    "provider_pack_registry_publish_install",
    "billing_usage_records",
    "hosted_v010_routes_present",
    "console_v010_controls_present"
  ],
  artifacts: {
    jobId: job.id,
    deadLetterJobCount: deadLetters.length,
    outboundDeadLetterCount: outboundDeadLetters.length,
    providerPackRegistryId: published.id,
    providerPackInstallId: installed.id,
    totalEstimatedCents: billingSummary.totalEstimatedCents
  },
  secrets_exposed: false
};
await writeFile(new URL("v10-product-smoke-result.json", proofDir), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
