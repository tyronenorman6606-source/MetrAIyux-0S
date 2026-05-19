import { mkdir, readFile, writeFile } from "node:fs/promises";
import { AsyncJobQueue, MemoryOpsStore, OutboundWebhookHub, certifyProviderPackDefinition, runOpsReadiness, detectUsageAnomalies } from "../packages/ops/dist/index.js";
import { createProofId } from "../packages/core/dist/index.js";

const proofDir = new URL("../.proof/", import.meta.url);
await mkdir(proofDir, { recursive: true });

const store = new MemoryOpsStore();
const queue = new AsyncJobQueue(store);
const projectId = "proj_v09_smoke";
const job = await queue.enqueue({
  projectId,
  envelope: { capability: "email.send", input: { to: "client@example.com", subject: "Smoke", body: "Queued" }, dryRun: true },
  actor: { id: "smoke", role: "owner" },
  maxAttempts: 2
});
const processedJob = await queue.executeNext(projectId, async (record) => ({ ok: true, capability: record.envelope.capability, proofId: createProofId("proof_job_smoke"), data: { dryRun: record.envelope.dryRun }, secrets_exposed: false }));
if (!job.id || processedJob?.status !== "succeeded") throw new Error("Async job queue smoke failed.");

const hub = new OutboundWebhookHub(store);
const subscription = await hub.subscribe({ projectId, url: "https://example.com/skyeapi", events: ["workflow.completed"], secretRef: "OUTBOUND_WEBHOOK_SECRET" });
const deliveries = await hub.enqueueEvent(projectId, "workflow.completed", { runId: "run_smoke" });
if (!subscription.id || deliveries.length !== 1) throw new Error("Outbound webhook hub smoke failed.");

const cert = certifyProviderPackDefinition({
  version: "skyeapi.provider-pack.v1",
  provider: "mailgun-custom",
  label: "Mailgun Custom",
  category: "email",
  capabilities: ["email.send"],
  requiredSecrets: ["MAILGUN_API_KEY", "MAILGUN_DOMAIN"],
  optionalSecrets: [],
  secrets_exposed: false
});
if (!cert.ok) throw new Error("Provider pack certification should pass for valid pack.");

const anomalies = detectUsageAnomalies([
  { projectId, capability: "email.send", ok: false, count: 9, window: "2026-05-10" },
  { projectId, capability: "email.send", ok: true, count: 1, window: "2026-05-10" }
]);
if (!anomalies.some((finding) => finding.code === "high_failure_rate")) throw new Error("Anomaly detector did not flag high failure rate.");

const readiness = runOpsReadiness({ hasJobRoutes: true, hasOutboundRoutes: true, hasDoctorRoute: true, hasAnomalyRoute: true, hasProviderPackCertification: true });
if (!readiness.ok) throw new Error("Ops readiness smoke failed.");

const workerSource = await readFile(new URL("../apps/gateway-worker/src/index.ts", import.meta.url), "utf8");
for (const needle of [
  "/v1/admin/jobs",
  "/v1/admin/process-job",
  "/v1/admin/outbound-subscriptions",
  "/v1/admin/outbound-events",
  "/v1/admin/outbound-deliveries",
  "/v1/admin/process-outbound",
  "/v1/admin/doctor",
  "/v1/admin/anomalies",
  "/v1/admin/provider-pack-certify"
]) {
  if (!workerSource.includes(needle)) throw new Error(`Missing Worker route: ${needle}`);
}

const consoleSource = await readFile(new URL("../apps/console/src/app.js", import.meta.url), "utf8");
for (const needle of ["loadJobs", "createOutboundSubscription", "loadAnomalies", "certifyProviderPack"]) {
  if (!consoleSource.includes(needle)) throw new Error(`Missing console function: ${needle}`);
}

const result = {
  ok: true,
  version: "0.9.0",
  checks: [
    "async_job_queue_executes",
    "outbound_webhook_subscription_and_delivery_queue",
    "provider_pack_certification",
    "usage_anomaly_detection",
    "ops_readiness_report",
    "hosted_worker_ops_routes_present",
    "console_ops_panels_present"
  ],
  artifacts: {
    jobId: job.id,
    processedJobStatus: processedJob.status,
    subscriptionId: subscription.id,
    deliveryCount: deliveries.length,
    certificationOk: cert.ok,
    anomalyCount: anomalies.length
  },
  secrets_exposed: false
};
await writeFile(new URL("v09-product-smoke-result.json", proofDir), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
