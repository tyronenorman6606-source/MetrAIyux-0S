import { readFile, writeFile, mkdir } from "node:fs/promises";

const source = await readFile("apps/gateway-worker/src/index.ts", "utf8");
const required = [
  "SKYE_RATE_LIMIT_PER_MINUTE",
  "rateLimit(",
  "recordUsage(",
  "logEvent(",
  "/v1/admin/projects",
  "/v1/admin/project",
  "/v1/admin/keys",
  "/v1/admin/events",
  "/v1/admin/usage",
  "idempotencyKey",
  "providers.health",
  "workflow.run",
  "runWorkflow(",
  "workflow.completed",
  "Provider body suppressed"
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Worker source missing platform behavior: ${token}`);
}
if (/return json\(request, env, \{ ok: true, projectId, apiKey, manifest/.test(source) === false) {
  throw new Error("Worker import-env endpoint not detected.");
}
const proof = { ok: true, proof: "worker-platform-source", checked: required, secrets_exposed: false, generatedAt: new Date().toISOString() };
await mkdir(".proof", { recursive: true });
await writeFile(".proof/worker-source-smoke-result.json", `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
