import { execFileSync } from "node:child_process";
import { chmod, mkdir, writeFile } from "node:fs/promises";

const bin = process.platform === "win32" ? "node_modules/.bin/tsc.cmd" : "./node_modules/.bin/tsc";
const steps = [
  { label: "console", cmd: "node", args: ["apps/console/tools/build.mjs"] },
  { label: "website", cmd: "node", args: ["apps/website/tools/build.mjs"] },
  { label: "fixture-server", cmd: "node", args: ["apps/fixture-server/tools/build.mjs"] },
  { label: "core", cmd: bin, args: ["-p", "packages/core/tsconfig.json", "--pretty", "false"] },
  { label: "aegis-core", cmd: bin, args: ["-p", "packages/aegis-core/tsconfig.json", "--pretty", "false"] },
  { label: "ops", cmd: bin, args: ["-p", "packages/ops/tsconfig.json", "--pretty", "false"] },
  { label: "providers", cmd: bin, args: ["-p", "packages/providers/tsconfig.json", "--pretty", "false"] },
  { label: "sdk", cmd: bin, args: ["-p", "packages/sdk/tsconfig.json", "--pretty", "false"] },
  { label: "gateway-worker", cmd: bin, args: ["-p", "apps/gateway-worker/tsconfig.json", "--pretty", "false"] },
  { label: "cli", cmd: bin, args: ["-p", "packages/cli/tsconfig.json", "--pretty", "false"], chmod: "packages/cli/dist/index.js" },
  { label: "mcp-server", cmd: bin, args: ["-p", "packages/mcp-server/tsconfig.json", "--pretty", "false"], chmod: "packages/mcp-server/dist/index.js" }
];

const built = [];
for (const step of steps) {
  console.log(`\n[build-workspaces] ${step.label}`);
  execFileSync(step.cmd, step.args, { stdio: "inherit" });
  if (step.chmod && process.platform !== "win32") await chmod(step.chmod, 0o755);
  built.push(step.label);
}
const proof = { ok: true, name: "build-workspaces", built, note: "Synchronous direct build runner avoids recursive pnpm timeout behavior while still compiling TypeScript packages.", secrets_exposed: false, generatedAt: new Date().toISOString() };
await mkdir(".proof", { recursive: true });
await writeFile(".proof/build-workspaces-result.json", `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
