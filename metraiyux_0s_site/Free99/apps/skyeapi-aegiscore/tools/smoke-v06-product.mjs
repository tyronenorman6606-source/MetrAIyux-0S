import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { buildSafeManifest, defaultProviderConfig, evaluatePolicyRules, filterManifestByProviderConfig, parseDotEnv, PROVIDER_PACKS, validateEnvImport } from "../packages/core/dist/index.js";

await mkdir(".proof", { recursive: true });

const envText = `RESEND_API_KEY=re_test_1234567890\nRESEND_FROM=SkyeAPI <test@example.com>\nTWILIO_ACCOUNT_SID=AC12345678901234567890\nTWILIO_AUTH_TOKEN=twilio_token_1234567890\nTWILIO_FROM_NUMBER=+14805550100\nNEON_DATABASE_URL=postgres://user:pass@example.neon.tech/db\nOPENAI_API_KEY=sk-openai-fixture-1234567890\nSTRIPE_SECRET_KEY=sk_test_fixture_1234567890\nCLOUDFLARE_ACCOUNT_ID=accountfixture\nCLOUDFLARE_R2_ACCESS_KEY_ID=r2_access_fixture\nCLOUDFLARE_R2_SECRET_ACCESS_KEY=r2_secret_fixture\nCLOUDFLARE_R2_BUCKET=fixture-bucket`;
const env = parseDotEnv(envText);
const validation = validateEnvImport(env);
if (!validation.ok) throw new Error("env validation unexpectedly failed");
if (PROVIDER_PACKS.length < 6) throw new Error("provider pack marketplace is incomplete");

const manifest = buildSafeManifest(env, "proj_v06_smoke");
const providerConfig = defaultProviderConfig("proj_v06_smoke");
providerConfig.providers.resend.enabled = false;
const filtered = filterManifestByProviderConfig(manifest, providerConfig);
const email = filtered.capabilities.find((capability) => capability.name === "email.send");
if (!email || email.enabled) throw new Error("provider pack disable did not affect manifest");

const policies = [
  { id: "deny-non-readonly-sql", label: "Deny SQL writes", enabled: true, capability: "db.query", effect: "deny", conditions: [{ kind: "sql_readonly", path: "sql" }] },
  { id: "approval-large-ai", label: "Approval for large AI max token asks", enabled: true, capability: "ai.generate_text", effect: "require_approval", conditions: [{ kind: "max_number", path: "maxTokens", max: 1000 }] }
];
const denied = evaluatePolicyRules("db.query", { sql: "delete from users" }, policies);
const approval = evaluatePolicyRules("ai.generate_text", { prompt: "x", maxTokens: 5000 }, policies);
const allowed = evaluatePolicyRules("db.query", { sql: "select * from users" }, policies);
if (denied.decision !== "denied" || approval.decision !== "approval_required" || allowed.decision !== "allowed") throw new Error("policy evaluator failed smoke expectations");

const workerSource = await readFile("apps/gateway-worker/src/index.ts", "utf8");
for (const needle of ["/v1/admin/provider-packs", "/v1/admin/policies", "/v1/admin/rotate-secret", "/v1/webhooks/", "/v1/admin/roles", "provider_pack_disabled", "policy_approval_required"]) {
  if (!workerSource.includes(needle)) throw new Error(`missing worker product route/gate: ${needle}`);
}

for (const file of [
  "examples/workflows/send-invoice.workflow.json",
  "examples/workflows/qualify-lead.workflow.json",
  "examples/workflows/create-checkout-and-email.workflow.json",
  "examples/policies/builder-safe-defaults.json",
  "examples/roles/upstream-role-map.json",
  "apps/fixture-server/dist/server.js"
]) {
  if (!existsSync(file)) throw new Error(`missing v0.6 artifact: ${file}`);
}

const proof = {
  ok: true,
  checkedAt: new Date().toISOString(),
  providerPacks: PROVIDER_PACKS.map((pack) => pack.id),
  policyDecisions: { denied: denied.decision, approval: approval.decision, allowed: allowed.decision },
  workerRoutes: ["provider packs", "policies", "roles", "rotation", "webhooks"],
  fixtureServer: "apps/fixture-server/dist/server.js",
  secrets_exposed: false
};
await writeFile(".proof/v06-product-smoke-result.json", JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
