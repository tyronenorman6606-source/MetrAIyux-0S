import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const steps = [
  ["node", ["apps/console/tools/build.mjs"]],
  ["node", ["apps/website/tools/build.mjs"]],
  ["node", ["tools/smoke-local.mjs"]],
  ["node", ["tools/smoke-built.mjs"]],
  ["node", ["tools/smoke-console.mjs"]],
  ["node", ["tools/smoke-website.mjs"]],
  ["node", ["tools/smoke-worker-source.mjs"]],
  ["node", ["tools/smoke-worker-http.mjs"]],
  ["node", ["tools/smoke-v15-product.mjs"]],
  ["node", ["tools/smoke-v16-product.mjs"]],
  ["node", ["tools/smoke-v17-product.mjs"]],
  ["node", ["tools/no-theater-gate.mjs"]],
  ["node", ["tools/truth-gate.mjs"]]
];

const startedAt = Date.now();
const passed = [];
for (const [command, args] of steps) {
  console.log(`\n[proof-fast] ${command} ${args.join(" ")}`);
  execFileSync(command, args, { stdio: "inherit" });
  passed.push(`${command} ${args.join(" ")}`);
}

const proof = {
  ok: true,
  name: "proof-fast",
  version: "0.17.0",
  passed,
  elapsedMs: Date.now() - startedAt,
  note: "Default proof validates the built package, behavioral Worker smoke, website surface, source gates, and truth gates without recursively rebuilding every TypeScript workspace. Run pnpm build for a full compile pass first.",
  secrets_exposed: false,
  generatedAt: new Date().toISOString()
};
await mkdir(".proof", { recursive: true });
await writeFile(".proof/proof-fast-result.json", `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
