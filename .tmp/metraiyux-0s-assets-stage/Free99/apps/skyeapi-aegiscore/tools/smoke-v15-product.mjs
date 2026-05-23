import { mkdir, readFile, writeFile } from "node:fs/promises";

const checks = [];
function assert(condition, message, detail) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail;
    throw error;
  }
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert(packageJson.version === "0.17.0", "root package version must be 0.17.0", packageJson.version);
checks.push("root package version is 0.17.0");

const versionModule = await readFile("apps/gateway-worker/src/modules/version.ts", "utf8");
assert(versionModule.includes('GATEWAY_VERSION = "0.17.0"'), "gateway version module is stale");
assert(versionModule.includes('"gateway_modules"'), "gateway version module missing modularization marker");
checks.push("gateway version module reports 0.17.0 and gateway_modules marker");

const httpModule = await readFile("apps/gateway-worker/src/modules/http.ts", "utf8");
assert(httpModule.includes("export function json"), "http module must export json helper");
assert(httpModule.includes("x-skye-actor-id"), "http module must allow upstream actor headers");
checks.push("HTTP response/CORS helpers are split from gateway index");

const opsStoreModule = await readFile("apps/gateway-worker/src/modules/ops-store.ts", "utf8");
assert(opsStoreModule.includes("class WorkerOpsStore") && opsStoreModule.includes("findOpsJob") && opsStoreModule.includes("usageSamplesForAnomalies"), "ops-store module missing exported helpers");
checks.push("Worker ops-store helpers are split from gateway index");

const gatewayIndex = await readFile("apps/gateway-worker/src/index.ts", "utf8");
assert(gatewayIndex.includes('from "./modules/http.js"'), "gateway index must import HTTP module");
assert(gatewayIndex.includes('from "./modules/ops-store.js"'), "gateway index must import ops-store module");
assert(!gatewayIndex.includes("class WorkerOpsStore implements"), "gateway index still contains WorkerOpsStore class");
assert(!gatewayIndex.includes("function allowedOrigin(request"), "gateway index still contains HTTP helper implementation");
checks.push("gateway index uses modules instead of embedded helper classes");

const workerHttpSmoke = await readFile("tools/smoke-worker-http.mjs", "utf8");
for (const token of [
  "complete-job-lease",
  "process-job",
  "outbound-subscriptions",
  "outbound-events",
  "provider-pack-sign",
  "provider-pack-load-source",
  "provider-pack-sandbox",
  "provider-pack-registry",
  "install-provider-pack",
  "billing-invoice-status",
  "subscription-lifecycle covered pause/resume/payment_failed/cancel",
  "workspace-access-check"
]) {
  assert(workerHttpSmoke.includes(token), `worker HTTP smoke missing closure endpoint token: ${token}`);
}
checks.push("worker HTTP behavioral smoke covers expanded closure endpoints");

const proofFast = await readFile("tools/proof-fast.mjs", "utf8");
assert(proofFast.includes("apps/console/tools/build.mjs") && proofFast.includes("apps/website/tools/build.mjs"), "proof-fast must rebuild public surfaces before smoke gates");
assert(proofFast.includes("tools/smoke-v15-product.mjs"), "proof-fast missing v15 smoke gate");
const proofRegression = await readFile("tools/proof-regression.mjs", "utf8");
assert(proofRegression.includes("tools/smoke-v06-product.mjs") && proofRegression.includes("tools/smoke-v15-product.mjs"), "proof-regression must keep historical smoke coverage available");
checks.push("proof-fast rebuilds public surfaces and includes v15 gate while proof-regression keeps historical coverage available");

const readme = await readFile("README.md", "utf8");
assert(readme.includes("v0.17.0") || readme.includes("0.17.0"), "README missing 0.17.0 truth marker");
checks.push("README carries 0.17.0 truth marker");

const proof = {
  ok: true,
  name: "v15-product-smoke",
  version: "0.17.0",
  checks,
  proofType: "source and contract proof for closure hardening plus expanded behavioral smoke coverage",
  does_not_prove: ["deployed Cloudflare behavior", "live provider delivery", "real payment capture", "browser E2E in this sandbox"],
  secrets_exposed: false,
  generatedAt: new Date().toISOString()
};
await mkdir(".proof", { recursive: true });
await writeFile(".proof/v15-product-smoke-result.json", JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
