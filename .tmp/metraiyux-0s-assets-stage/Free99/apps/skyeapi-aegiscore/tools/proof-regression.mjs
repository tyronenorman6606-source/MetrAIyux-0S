import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const steps = [
  ["node", ["tools/build-workspaces.mjs"]],
  ["node", ["tools/smoke-local.mjs"]],
  ["node", ["tools/smoke-built.mjs"]],
  ["node", ["tools/smoke-console.mjs"]],
  ["node", ["tools/smoke-worker-source.mjs"]],
  ["node", ["tools/smoke-worker-http.mjs"]],
  ["node", ["tools/smoke-platform-controls.mjs"]],
  ["node", ["tools/smoke-workflow.mjs"]],
  ["node", ["tools/smoke-v06-product.mjs"]],
  ["node", ["tools/smoke-v07-product.mjs"]],
  ["node", ["tools/smoke-v08-product.mjs"]],
  ["node", ["tools/smoke-v09-product.mjs"]],
  ["node", ["tools/smoke-v10-product.mjs"]],
  ["node", ["tools/smoke-v11-product.mjs"]],
  ["node", ["tools/smoke-v12-product.mjs"]],
  ["node", ["tools/smoke-v13-product.mjs"]],
  ["node", ["tools/smoke-v14-product.mjs"]],
  ["node", ["tools/smoke-v15-product.mjs"]],
  ["node", ["tools/no-theater-gate.mjs"]],
  ["node", ["tools/truth-gate.mjs"]]
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n[proof-regression] ${command} ${args.join(" ")}`);
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? code}`)));
  });
}

const passed = [];
for (const [command, args] of steps) {
  await run(command, args);
  passed.push(`${command} ${args.join(" ")}`);
}
const proof = { ok: true, name: "proof-regression", version: "0.17.0", passed, note: "Long-form historical regression chain; intentionally separate from default proof to avoid timeout-prone daily proof runs.", secrets_exposed: false, generatedAt: new Date().toISOString() };
await mkdir(".proof", { recursive: true });
await writeFile(".proof/proof-regression-result.json", JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
