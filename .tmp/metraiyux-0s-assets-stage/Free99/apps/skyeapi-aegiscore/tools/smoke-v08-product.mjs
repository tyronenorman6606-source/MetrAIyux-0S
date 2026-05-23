import { mkdir, writeFile } from "node:fs/promises";
import { DEFAULT_ADAPTERS } from "../packages/providers/dist/index.js";
import {
  AsyncJobQueue,
  MemoryOpsStore,
  OutboundWebhookHub,
  createJobFingerprint,
  createProviderPackScaffold,
  detectUsageAnomalies,
  runAdapterConformance,
  runDeveloperDoctor,
  summarizeCapabilityRisk
} from "../packages/ops/dist/index.js";
import { buildSafeManifest } from "../packages/core/dist/index.js";

const proofDir = new URL("../.proof/", import.meta.url);
await mkdir(proofDir, { recursive: true });

const conformance = await runAdapterConformance(DEFAULT_ADAPTERS);
if (!conformance.ok) throw new Error(`Adapter conformance failed: ${JSON.stringify(conformance.findings)}`);

const scaffold = createProviderPackScaffold({
  provider: "mailgun-custom",
  label: "Mailgun Custom Pack",
  category: "email",
  capabilities: ["email.send"],
  requiredSecrets: ["MAILGUN_API_KEY", "MAILGUN_DOMAIN"]
});
if (!scaffold.ok || !scaffold.files["provider-packs/mailgun-custom/pack.json"] || !scaffold.files["provider-packs/mailgun-custom/adapter.ts"]) {
  throw new Error("Provider pack scaffold did not produce required files.");
}

const store = new MemoryOpsStore();
const queue = new AsyncJobQueue(store);
const job = await queue.enqueue({
  projectId: "proj_v08",
  envelope: { capability: "email.send", input: { to: "client@example.com", subject: "Dry", body: "Run" }, dryRun: true },
  actor: { id: "actor_1", role: "developer" }
});
const fingerprint = await createJobFingerprint(job);
if (!fingerprint.startsWith("fp_emailsend_")) throw new Error("Job fingerprint was not capability-bound.");
const completed = await queue.executeNext("proj_v08", async (claimed) => ({
  ok: true,
  capability: claimed.envelope.capability,
  provider: "resend",
  proofId: "proof_fixture_async_job",
  data: { accepted: true, fixture: true },
  secrets_exposed: false
}));
if (!completed || completed.status !== "succeeded" || completed.result?.ok !== true) throw new Error("Async job did not complete successfully.");

const hub = new OutboundWebhookHub(store);
await hub.subscribe({ projectId: "proj_v08", url: "https://hooks.example.test/skyeapi", events: ["capability.called"], secretRef: "OUTBOUND_SIGNING_SECRET" });
const deliveries = await hub.enqueueEvent("proj_v08", "capability.called", { capability: "email.send", proofId: "proof_fixture_event" });
if (deliveries.length !== 1 || deliveries[0].status !== "queued") throw new Error("Outbound delivery was not queued.");
const processed = await hub.processQueued("proj_v08", async (_url, init) => {
  const headers = init?.headers ?? {};
  const signature = headers["x-skyeapi-signature"] ?? headers.get?.("x-skyeapi-signature");
  if (!String(signature).startsWith("sha256=")) return new Response("missing signature", { status: 400 });
  return new Response(JSON.stringify({ ok: true }), { status: 202, headers: { "content-type": "application/json" } });
}, { OUTBOUND_SIGNING_SECRET: "fixture-signing-secret-not-real" });
if (processed.length !== 1 || processed[0].status !== "delivered" || processed[0].responseStatus !== 202) throw new Error("Outbound delivery did not process with signature.");

const anomalies = detectUsageAnomalies([
  { projectId: "proj_v08", capability: "sms.send", ok: false, count: 8, window: "2026-05-10T20:00" },
  { projectId: "proj_v08", capability: "sms.send", ok: true, count: 2, window: "2026-05-10T20:00" },
  { projectId: "proj_v08", capability: "ai.generate_text", ok: true, count: 1500, window: "2026-05-10T20:00" }
], { maxFailureRate: 0.25, maxCapabilityCalls: 1000 });
if (!anomalies.some((finding) => finding.code === "high_failure_rate") || !anomalies.some((finding) => finding.code === "call_volume_spike")) throw new Error("Anomaly detector missed expected findings.");

const manifest = buildSafeManifest({ RESEND_API_KEY: "rs_fixture_value_not_real" }, "proj_v08");
const doctor = runDeveloperDoctor({ manifest, packageScripts: { proof: "pnpm proof", "truth-gate": "node tools/truth-gate.mjs" }, policies: [] });
if (!doctor.ok) throw new Error(`Developer doctor returned hard failure: ${JSON.stringify(doctor.findings)}`);
const risk = summarizeCapabilityRisk("db.query");
if (!risk.shouldAudit || risk.provider !== "neon") throw new Error("Capability risk summary was incorrect.");

const result = {
  ok: true,
  version: "0.8.0",
  checks: {
    adapterConformance: conformance.ok,
    adapterCount: conformance.adapterCount,
    providerPackScaffold: scaffold.ok,
    asyncJobStatus: completed.status,
    outboundDeliveriesQueued: deliveries.length,
    outboundDeliveriesProcessed: processed.length,
    anomalies: anomalies.map((finding) => finding.code),
    doctorOk: doctor.ok,
    riskSummary: risk
  },
  secrets_exposed: false
};
await writeFile(new URL("v08-product-smoke-result.json", proofDir), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
