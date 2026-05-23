import fs from "node:fs";
import path from "node:path";
import { buildSafeManifest, createInputFingerprint, evaluatePolicyRules, stableJson, summarizeManifest, workflowRunSummary } from "../packages/core/dist/index.js";

const root = process.cwd();
const proofDir = path.join(root, ".proof");
fs.mkdirSync(proofDir, { recursive: true });

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const inputA = { amount: 100, nested: { b: 2, a: 1 } };
const inputB = { nested: { a: 1, b: 2 }, amount: 100 };
const fingerprintA = createInputFingerprint("billing.create_checkout", inputA);
const fingerprintB = createInputFingerprint("billing.create_checkout", inputB);
assert(fingerprintA === fingerprintB, "Approval fingerprint must be deterministic for equivalent object input.");
assert(!fingerprintA.includes("100"), "Approval fingerprint should not leak plain input values.");

const approvalPolicy = [{
  id: "require-billing-review",
  label: "Require billing review",
  enabled: true,
  capability: "billing.create_checkout",
  effect: "require_approval",
  conditions: [{ kind: "max_number", path: "amountCents", max: 500 }],
  message: "Large checkout sessions require approval."
}];
const policyResult = evaluatePolicyRules("billing.create_checkout", { amountCents: 1500 }, approvalPolicy);
assert(policyResult.decision === "approval_required", "Policy engine should return approval_required for high-risk input.");

const workflowRecord = {
  version: "skyeapi.workflow-run.v1",
  id: "run_test",
  projectId: "proj_test",
  workflowId: "smoke-v07",
  startedAt: "2026-05-10T00:00:00.000Z",
  finishedAt: "2026-05-10T00:00:01.000Z",
  ok: false,
  dryRun: true,
  stepCount: 2,
  steps: [
    { id: "draft", capability: "ai.generate_text", ok: true, proofId: "proof_a", dryRun: true, data: { text: "redacted summary" } },
    { id: "send", capability: "email.send", ok: false, proofId: "proof_b", error: { code: "approval_required", message: "Requires approval" } }
  ],
  final: { error: "approval_required" },
  secrets_exposed: false
};
const summary = workflowRunSummary(workflowRecord);
assert(Array.isArray(summary.failedSteps) && summary.failedSteps.length === 1, "Workflow run summary should include failed step summaries.");
assert(JSON.stringify(summary).includes("approval_required"), "Workflow summary should preserve failure code.");
assert(!JSON.stringify(summary).includes("redacted summary"), "Workflow summary should not include successful step payload bodies.");

const manifest = buildSafeManifest({ RESEND_API_KEY: "re_xxxxxxxxxxxxx", RESEND_FROM: "ops@example.com" }, "proj_test");
const manifestSummary = summarizeManifest(manifest);
assert(manifestSummary.connectedProviders.includes("resend"), "Manifest summary should include connected provider names.");
assert(manifestSummary.enabledCapabilities.includes("email.send"), "Manifest summary should include enabled capabilities.");
assert(stableJson({ b: 2, a: 1 }) === stableJson({ a: 1, b: 2 }), "stableJson must be deterministic.");

const gateway = read("apps/gateway-worker/src/index.ts");
const sdk = read("packages/sdk/src/index.ts");
const cli = read("packages/cli/src/index.ts");
const consoleHtml = read("apps/console/index.html");
const consoleJs = read("apps/console/src/app.js");
const mcp = read("packages/mcp-server/src/index.ts");
const docs = read("docs/V0_7_CODE_DEPTH.md");

for (const needle of [
  "/v1/admin/approval-requests",
  "/v1/admin/approve-request",
  "/v1/admin/create-snapshot",
  "/v1/admin/restore-snapshot",
  "/v1/admin/workflow-runs",
  "verifyWebhookSignature",
  "stripe-signature",
  "x-twilio-signature",
  "unsupported_provider"
]) assert(gateway.includes(needle), `Gateway missing ${needle}`);

for (const needle of ["approvalRequests", "approveRequest", "createSnapshot", "restoreSnapshot", "workflowRuns"]) assert(sdk.includes(needle), `SDK missing ${needle}`);
for (const needle of ["hosted approvals", "hosted approve", "hosted deny", "hosted snapshot", "restore-snapshot", "workflow-runs"]) assert(cli.includes(needle), `CLI missing ${needle}`);
for (const needle of ["Approval queue", "Config snapshots", "Workflow run ledger"]) assert(consoleHtml.includes(needle), `Console HTML missing ${needle}`);
for (const needle of ["loadApprovals", "resolveApproval", "createSnapshot", "restoreSnapshot", "loadWorkflowRuns"]) assert(consoleJs.includes(needle), `Console JS missing ${needle}`);
assert(mcp.includes("skyeapi.approval.input_fingerprint"), "MCP missing approval fingerprint tool.");
assert(docs.includes("does not claim Cloudflare deployment"), "v0.7 docs must state no deployment claim.");

const proof = {
  ok: true,
  version: "0.7.0",
  checkedAt: new Date().toISOString(),
  checks: {
    deterministicApprovalFingerprint: fingerprintA,
    approvalPolicyDecision: policyResult.decision,
    workflowRunSummary: summary,
    manifestSummary,
    gatewayRoutes: true,
    webhookSignatureModes: true,
    sdkCliConsoleMcpSurfaces: true,
    noLiveProviderClaim: true
  },
  secrets_exposed: false
};

fs.writeFileSync(path.join(proofDir, "v07-product-smoke-result.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
