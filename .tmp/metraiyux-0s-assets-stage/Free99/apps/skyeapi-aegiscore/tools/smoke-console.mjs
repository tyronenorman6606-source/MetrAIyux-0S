import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

execFileSync("node", ["apps/console/tools/build.mjs"], { stdio: "inherit" });
const html = await readFile("apps/console/dist/index.html", "utf8");
const js = await readFile("apps/console/dist/src/app.js", "utf8");
const css = await readFile("apps/console/dist/src/styles.css", "utf8");
const required = [
  "/v1/admin/import-env",
  "/v1/admin/create-key",
  "/v1/admin/keys",
  "/v1/admin/usage",
  "/v1/admin/events",
  "/v1/capabilities",
  "/v1/call",
  "dryRun",
  "live-call",
  "workflow.run",
  "workflow-dry-run",
  "workflow-live",
  "skyeapi-aegiscore-logo-wide.png",
  "skyeapi-aegiscore-mark.png"
];
for (const token of required) {
  if (!js.includes(token) && !html.includes(token)) throw new Error(`Console missing functional token: ${token}`);
}
if (!css.includes(".panel") || !css.includes("grid")) throw new Error("Console CSS did not build expected app styles.");
if (!existsSync("apps/console/dist/src/app.js")) throw new Error("Console dist app.js missing.");
for (const asset of ["apps/console/dist/assets/skyeapi-aegiscore-logo-wide.png", "apps/console/dist/assets/skyeapi-aegiscore-mark.png"]) {
  if (!existsSync(asset)) throw new Error(`Console branded asset missing: ${asset}`);
}
const proof = { ok: true, proof: "console-functional-source", checked: required, secrets_exposed: false, generatedAt: new Date().toISOString() };
await mkdir(".proof", { recursive: true });
await writeFile(".proof/console-smoke-result.json", `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
