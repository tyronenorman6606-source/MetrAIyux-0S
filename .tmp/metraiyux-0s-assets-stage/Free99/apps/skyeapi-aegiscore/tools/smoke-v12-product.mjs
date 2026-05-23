import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  MemoryOpsStore,
  ProviderPackRegistry,
  createProviderPackSourceInstallReceipt,
  createProviderPackCertificationReceipt,
  createBillingInvoiceDraft,
  exportBillingInvoiceCsv,
  exportBillingInvoiceJson,
  buildBillingUsageRecords,
  runConsoleE2EContract
} from "../packages/ops/dist/index.js";

const root = new URL("..", import.meta.url).pathname;
const proofDir = join(root, ".proof");
await mkdir(proofDir, { recursive: true });

const pack = {
  version: "skyeapi.provider-pack.v1",
  provider: "mailgun-custom",
  label: "Mailgun Custom",
  category: "email",
  capabilities: ["email.send"],
  requiredSecrets: ["MAILGUN_API_KEY"],
  optionalSecrets: [],
  dependencies: [],
  secrets_exposed: false
};

const sourceReceipt = await createProviderPackSourceInstallReceipt({ projectId: "proj_v12", pack, sourceType: "git", sourceUri: "https://example.com/mailgun-custom.git", versionTag: "0.12.0" });
if (!sourceReceipt.installable || sourceReceipt.sourceType !== "git") throw new Error("Provider-pack source install receipt failed.");

const certificationReceipt = await createProviderPackCertificationReceipt({ pack, versionTag: "0.12.0", signer: "smoke", signingSecret: "local_smoke_signing_secret_123" });
if (!certificationReceipt.certified || !certificationReceipt.signedManifest) throw new Error("Provider-pack certification receipt failed.");

const store = new MemoryOpsStore();
const registry = new ProviderPackRegistry(store);
const published = await registry.publish({ pack, versionTag: "0.12.0", status: "certified" });
const installed = await registry.install("proj_v12", published.id, true);
if (!installed || installed.provider !== "mailgun-custom") throw new Error("Provider-pack registry install failed.");

const records = buildBillingUsageRecords([{ projectId: "proj_v12", window: "2026-05-10", capability: "email.send", count: 13, failures: 0 }]);
const invoice = createBillingInvoiceDraft({ projectId: "proj_v12", records, customerEmail: "billing@example.com", window: "2026-05-10" });
const invoiceCsv = exportBillingInvoiceCsv(invoice);
const invoiceJson = exportBillingInvoiceJson(invoice);
if (!invoice.lineItems.length || !invoiceCsv.includes("invoiceId") || !invoiceJson.includes("billing-invoice-draft")) throw new Error("Billing invoice draft/export failed.");

const html = await readFile(join(root, "apps/console/index.html"), "utf8");
const script = await readFile(join(root, "apps/console/src/app.js"), "utf8");
const spec = await readFile(join(root, "apps/console/e2e/console.spec.ts"), "utf8");
const e2e = runConsoleE2EContract({
  html,
  script,
  spec,
  requiredSelectors: ["#connection-form", "#claim-job-lease", "#sign-provider-pack", "#install-pack-source", "#load-billing-invoice"],
  requiredFlows: ["installProviderPackSource", "certificationReceipt", "loadBillingInvoice", "exportBillingInvoice"]
});
if (!e2e.ok) throw new Error(`Console E2E contract failed: ${JSON.stringify(e2e.findings)}`);

const result = {
  ok: true,
  checkedAt: new Date().toISOString(),
  checks: [
    "provider pack source install receipt",
    "provider pack certification receipt with signed manifest",
    "registry publish/install receipt",
    "billing invoice draft and exports",
    "console Playwright-ready E2E contract"
  ],
  sourceReceipt,
  certificationReceipt: { ...certificationReceipt, signedManifest: certificationReceipt.signedManifest ? { ...certificationReceipt.signedManifest, signature: "[redacted-signature]" } : undefined },
  invoice,
  e2e,
  secrets_exposed: false
};
await writeFile(join(proofDir, "v12-product-smoke-result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
