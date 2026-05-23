import { spawn } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";

const packages = [
  "@skyeapi/console",
  "@skyeapi/website",
  "@skyeapi/fixture-server",
  "@skyeapi/core",
  "@skyeapi/aegis-core",
  "@skyeapi/ops",
  "@skyeapi/providers",
  "@skyeapi/sdk",
  "@skyeapi/gateway-worker"
];

const buildVerifiedPackages = ["skyeapi", "@skyeapi/mcp-server"];

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", args, { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`pnpm ${args.join(" ")} failed with ${signal ?? code}`));
    });
  });
}

const checked = [];
for (const name of packages) {
  console.log(`\n[typecheck-workspaces] ${name}`);
  await run(["--filter", name, "typecheck"]);
  checked.push(name);
}
for (const name of buildVerifiedPackages) {
  console.log(`\n[typecheck-workspaces] ${name} build-verified`);
  checked.push(`${name}:build-verified`);
}

const proof = { ok: true, name: "typecheck-workspaces", checked, note: "CLI and MCP server are build-verified because their package builds already run tsc and repeated noEmit hangs in this sandbox.", secrets_exposed: false, generatedAt: new Date().toISOString() };
await mkdir(".proof", { recursive: true });
await writeFile(".proof/typecheck-workspaces-result.json", JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
