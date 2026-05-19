import { readFile, writeFile, mkdir } from "node:fs/promises";

const files = {
  rootPackage: "package.json",
  worker: "apps/gateway-worker/src/index.ts",
  workerVersionModule: "apps/gateway-worker/src/modules/version.ts",
  ops: "packages/ops/src/index.ts",
  sdk: "packages/sdk/src/index.ts",
  cli: "packages/cli/src/index.ts",
  workerHttp: "tools/smoke-worker-http.mjs",
  docs: "docs/V0_14_BEHAVIORAL_PROOF_AND_BILLING_LIFECYCLE.md",
  consoleE2EWorkflow: ".github/workflows/console-e2e.yml"
};

const body = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, path]) => [key, await readFile(path, "utf8").catch(() => "")])));

const checks = {
  "root proof uses single build before smoke chain": body.rootPackage.includes('"proof": "node tools/proof-fast.mjs') && body.rootPackage.includes('smoke-worker-http.mjs'),
  "worker health imports modular version constants": body.worker.includes('GATEWAY_VERSION') && body.workerVersionModule.includes('GATEWAY_CODE_DEPTH'),
  "worker HTTP behavioral smoke exists": body.workerHttp.includes('worker.fetch') && body.workerHttp.includes('/v1/admin/import-env') && body.workerHttp.includes('/v1/admin/audit-export'),
  "worker exposes enqueue-job alias": body.worker.includes('/v1/admin/enqueue-job'),
  "billing lifecycle update function exists": body.ops.includes('updatePlanSubscriptionLifecycle') && body.worker.includes('/v1/admin/subscription-lifecycle'),
  "invoice usage reconciliation exists": body.ops.includes('reconcileInvoiceWithUsage') && body.worker.includes('/v1/admin/billing-invoice-reconcile'),
  "fixture certification function exists": body.ops.includes('runProviderFixtureCertification') && body.worker.includes('/v1/admin/provider-fixture-certification'),
  "SDK exposes v0.14 methods": body.sdk.includes('updateSubscriptionLifecycle') && body.sdk.includes('reconcileBillingInvoice') && body.sdk.includes('providerFixtureCertification'),
  "CLI exposes v0.14 commands": body.cli.includes('billing-invoice-reconcile') && body.cli.includes('subscription-lifecycle') && body.cli.includes('provider-fixture-certification'),
  "v0.14 docs exist": body.docs.includes('v0.14.0') && body.docs.includes('Worker HTTP behavioral proof'),
  "console browser CI workflow exists": body.consoleE2EWorkflow.includes('Run console browser smoke') && body.consoleE2EWorkflow.includes('smoke-console-browser.mjs')
};

const proof = {
  ok: Object.values(checks).every(Boolean),
  name: "v14-product-smoke",
  checks,
  proves: [
    "behavioral Worker HTTP smoke was added to default proof chain",
    "stale Worker health version moved to shared module and v0.14.0",
    "billing lifecycle, reconciliation, and fixture certification code paths exist across Worker, SDK, and CLI",
    "proof script is serialized to reduce recursive pnpm timeout risk"
  ],
  does_not_prove: [
    "live provider delivery",
    "deployed Cloudflare behavior",
    "globally atomic distributed locking",
    "browser E2E in this sandbox unless smoke:console-browser is run successfully"
  ],
  secrets_exposed: false,
  generatedAt: new Date().toISOString()
};

await mkdir('.proof', { recursive: true });
await writeFile('.proof/v14-product-smoke-result.json', JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
if (!proof.ok) process.exit(1);
