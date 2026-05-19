import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  DurableAsyncJobQueue,
  MemoryOpsStore,
  ProviderPackRegistry,
  buildBillingUsageRecords,
  claimDurableJobLease,
  completeDurableJobLease,
  createSignedProviderPackManifest,
  exportBillingUsageCsv,
  exportBillingUsageJsonl,
  runConsoleContractSmoke,
  runNoTheaterGate,
  validateProviderPackDependencies,
  verifySignedProviderPackManifest
} from "../packages/ops/dist/index.js";
import { createProofId } from "../packages/core/dist/index.js";

const proofDir = new URL("../.proof/", import.meta.url);
await mkdir(proofDir, { recursive: true });
const store = new MemoryOpsStore();
const projectId = "proj_v11_smoke";

const queue = new DurableAsyncJobQueue(store);
const job = await queue.enqueue({
  projectId,
  envelope: { capability: "email.send", input: { to: "lease@example.com", subject: "lease proof" }, dryRun: true },
  maxAttempts: 3
});
const leaseClaim = await claimDurableJobLease(store, { projectId, leaseMs: 60_000, actor: { id: "smoke", role: "admin" } });
if (!leaseClaim.ok || !leaseClaim.lease || leaseClaim.job?.id !== job.id || leaseClaim.job.status !== "running") throw new Error("Job lease claim failed.");
const secondClaim = await claimDurableJobLease(store, { projectId, leaseMs: 60_000 });
if (secondClaim.lease) throw new Error("Leased job was claimable twice.");
const completed = await completeDurableJobLease(store, { projectId, jobId: job.id, leaseToken: leaseClaim.lease.token, result: { ok: true, capability: "email.send", proofId: createProofId("proof_v11_lease"), data: { dryRun: true }, secrets_exposed: false } });
if (!completed.ok || completed.job?.status !== "succeeded") throw new Error("Job lease completion failed.");
const badComplete = await completeDurableJobLease(store, { projectId, jobId: job.id, leaseToken: "wrong", result: { ok: true, capability: "email.send", proofId: "proof_bad", secrets_exposed: false } });
if (badComplete.ok) throw new Error("Invalid lease token was accepted.");

const registry = new ProviderPackRegistry(store);
const basePack = { version: "skyeapi.provider-pack.v1", provider: "core-email", label: "Core Email", category: "email", capabilities: ["email.send"], requiredSecrets: ["CORE_EMAIL_API_KEY"], optionalSecrets: [], secrets_exposed: false };
const dependentPack = { version: "skyeapi.provider-pack.v1", provider: "mailgun-custom", label: "Mailgun Custom", category: "email", capabilities: ["email.send"], requiredSecrets: ["MAILGUN_API_KEY"], dependencies: [{ provider: "core-email", versionTag: "1.0.0" }], secrets_exposed: false };
const missingDeps = validateProviderPackDependencies(dependentPack, []);
if (missingDeps.ok) throw new Error("Missing required provider-pack dependency was not rejected.");
const publishedBase = await registry.publish({ pack: basePack, versionTag: "1.0.0" });
const depsOk = validateProviderPackDependencies(dependentPack, [publishedBase]);
if (!depsOk.ok) throw new Error("Satisfied provider-pack dependency was not accepted.");

const signingSecret = "local-signing-secret-for-smoke";
const signedManifest = await createSignedProviderPackManifest({ pack: dependentPack, versionTag: "0.2.0", signer: "v11-smoke", signingSecret });
if (!signedManifest.signature.startsWith("sha256=") || !signedManifest.checksum) throw new Error("Signed provider-pack manifest missing signature/checksum.");
const verified = await verifySignedProviderPackManifest({ pack: dependentPack, manifest: signedManifest, signingSecret });
if (!verified.ok) throw new Error("Signed provider-pack manifest did not verify.");
const tampered = await verifySignedProviderPackManifest({ pack: { ...dependentPack, label: "Tampered" }, manifest: signedManifest, signingSecret });
if (tampered.ok) throw new Error("Tampered provider pack verified successfully.");

const billingRecords = buildBillingUsageRecords([
  { projectId, capability: "email.send", ok: true, count: 4, window: "2026-05-10" },
  { projectId, capability: "ai.generate_text", ok: true, count: 2, window: "2026-05-10" }
]);
const csv = exportBillingUsageCsv(billingRecords);
const jsonl = exportBillingUsageJsonl(billingRecords);
if (!csv.includes("projectId,window,capability") || !csv.includes("email.send")) throw new Error("Billing CSV export failed.");
if (jsonl.split("\n").length !== 2 || !jsonl.includes('"secrets_exposed":false')) throw new Error("Billing JSONL export failed.");

const workerSource = await readFile(new URL("../apps/gateway-worker/src/index.ts", import.meta.url), "utf8");
for (const needle of [
  "/v1/admin/claim-job-lease",
  "/v1/admin/complete-job-lease",
  "/v1/admin/provider-pack-dependencies",
  "/v1/admin/provider-pack-sign",
  "/v1/admin/provider-pack-verify",
  "/v1/admin/billing-usage-export"
]) {
  if (!workerSource.includes(needle)) throw new Error(`Missing v0.11 Worker route: ${needle}`);
}

const consoleHtml = await readFile(new URL("../apps/console/index.html", import.meta.url), "utf8");
const consoleScript = await readFile(new URL("../apps/console/src/app.js", import.meta.url), "utf8");
const consoleContract = runConsoleContractSmoke({
  html: consoleHtml,
  script: consoleScript,
  requiredElementIds: ["claim-job-lease", "complete-job-lease", "sign-provider-pack", "verify-provider-pack", "export-billing-csv", "export-billing-jsonl"],
  requiredEndpoints: ["/v1/admin/claim-job-lease", "/v1/admin/provider-pack-sign", "/v1/admin/billing-usage-export"]
});
if (!consoleContract.ok) throw new Error(`Console contract smoke failed: ${JSON.stringify(consoleContract.findings)}`);

const docFiles = ["README.md", "PROOF_LEDGER.md", "docs/PUBLIC_CLAIMS_REGISTER.md", "apps/console/index.html"];
const noTheater = runNoTheaterGate(await Promise.all(docFiles.map(async (path) => ({ path, content: await readFile(new URL(`../${path}`, import.meta.url), "utf8") }))));
if (!noTheater.ok) throw new Error(`No-theater gate failed: ${JSON.stringify(noTheater.findings)}`);

const result = {
  ok: true,
  version: "0.11.0",
  checks: [
    "lease_claim_prevents_double_claim",
    "lease_completion_requires_token",
    "provider_pack_dependency_missing_rejected",
    "provider_pack_dependency_satisfied",
    "signed_provider_pack_manifest_verified",
    "tampered_provider_pack_rejected",
    "billing_csv_jsonl_exports",
    "hosted_v011_routes_present",
    "console_contract_smoke",
    "no_theater_gate"
  ],
  artifacts: {
    jobId: job.id,
    leaseId: leaseClaim.lease.id,
    signedProvider: signedManifest.provider,
    billingCsvBytes: csv.length,
    billingJsonlBytes: jsonl.length,
    consoleContractFindings: consoleContract.findings.length
  },
  does_not_prove: [
    "distributed KV compare-and-swap under concurrent deployed Workers",
    "live Stripe subscription collection",
    "browser/Chromium click E2E",
    "live outbound webhook delivery to customer endpoints"
  ],
  secrets_exposed: false
};
await writeFile(new URL("v11-product-smoke-result.json", proofDir), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
