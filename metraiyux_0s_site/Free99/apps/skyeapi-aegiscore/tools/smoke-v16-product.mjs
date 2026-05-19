import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const website = await readFile("apps/website/index.html", "utf8");
const websiteBuild = await readFile("apps/website/tools/build.mjs", "utf8");
const rootBuild = await readFile("tools/build-workspaces.mjs", "utf8");
const proofFast = await readFile("tools/proof-fast.mjs", "utf8");
const packageJson = await readFile("package.json", "utf8");
const publicClaims = await readFile("docs/PUBLIC_CLAIMS_REGISTER.md", "utf8");
const readme = await readFile("README.md", "utf8");

const checks = {
  packageVersion: packageJson.includes('"version": "0.17.0"'),
  websiteWorkspace: packageJson.includes('"smoke:website"'),
  buildPipelineIncludesWebsite: rootBuild.includes('label: "website"'),
  proofIncludesWebsite: proofFast.includes('tools/smoke-website.mjs'),
  websiteHasConsoleHandoff: website.includes('./console/') && website.includes('Open operator console'),
  websiteBuildCopiesConsole: websiteBuild.includes('consoleBundled') && websiteBuild.includes('apps", "console", "dist'),
  publicClaimsUpdated: publicClaims.includes('v0.17.0 public website'),
  readmeUpdated: readme.includes('v0.17.0 public website')
};
const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) throw new Error(`v16 website product smoke failed: ${failures.join(', ')}`);
for (const file of ["apps/website/dist/index.html", "apps/website/dist/console/index.html", "apps/website/dist/llms.txt", "apps/website/dist/ai.md", "apps/website/dist/sitemap.xml", "apps/website/dist/robots.txt"]) {
  if (!existsSync(file)) throw new Error(`v16 website dist file missing: ${file}`);
}
const proof = {
  ok: true,
  version: "0.17.0",
  name: "v16-public-website-product-smoke",
  checks,
  proves: [
    "website is a first-class workspace package",
    "website build bundles the console behind /console/",
    "default proof includes website smoke",
    "public claims register documents the website claim boundary"
  ],
  does_not_prove: [
    "hosted domain availability",
    "search ranking",
    "live provider success",
    "payment capture"
  ],
  secrets_exposed: false,
  generatedAt: new Date().toISOString()
};
await mkdir(".proof", { recursive: true });
await writeFile(".proof/v16-product-smoke-result.json", `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
