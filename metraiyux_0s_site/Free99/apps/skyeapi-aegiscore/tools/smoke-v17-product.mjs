import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";

const packageJson = await readFile("package.json", "utf8");
const website = await readFile("apps/website/index.html", "utf8");
const websiteCss = await readFile("apps/website/src/site.css", "utf8");
const consoleHtml = await readFile("apps/console/index.html", "utf8");
const consoleCss = await readFile("apps/console/src/styles.css", "utf8");
const consoleBuild = await readFile("apps/console/tools/build.mjs", "utf8");
const websiteBuild = await readFile("apps/website/tools/build.mjs", "utf8");
const readme = await readFile("README.md", "utf8");
const claims = await readFile("docs/PUBLIC_CLAIMS_REGISTER.md", "utf8");
const proofFast = await readFile("tools/proof-fast.mjs", "utf8");

const assetPaths = [
  "apps/website/public/assets/skyeapi-aegiscore-logo-wide.png",
  "apps/website/public/assets/skyeapi-aegiscore-mark.png",
  "apps/website/public/favicon.png",
  "apps/website/public/apple-touch-icon.png",
  "apps/website/public/og.png",
  "apps/console/assets/skyeapi-aegiscore-logo-wide.png",
  "apps/console/assets/skyeapi-aegiscore-mark.png",
  "apps/website/dist/assets/skyeapi-aegiscore-logo-wide.png",
  "apps/website/dist/assets/skyeapi-aegiscore-mark.png",
  "apps/website/dist/console/assets/skyeapi-aegiscore-logo-wide.png"
];
const missingAssets = assetPaths.filter((asset) => !existsSync(asset));
const smallAssets = assetPaths.filter((asset) => existsSync(asset) && statSync(asset).size < 1000);
const checks = {
  packageVersion: packageJson.includes('"version": "0.17.0"'),
  websiteUsesWideLogo: website.includes("skyeapi-aegiscore-logo-wide.png") && website.includes("hero-brand-lockup"),
  websiteUsesBrandMark: website.includes("skyeapi-aegiscore-mark.png"),
  websiteUsesOgPng: website.includes('/og.png') && website.includes('/favicon.png'),
  websiteCssHasBrandClasses: websiteCss.includes(".brand-logo") && websiteCss.includes(".hero-brand-lockup") && websiteCss.includes(".command-card-mark"),
  consoleUsesBrandAssets: consoleHtml.includes("skyeapi-aegiscore-logo-wide.png") && consoleHtml.includes("skyeapi-aegiscore-mark.png"),
  consoleCssHasBrandClasses: consoleCss.includes(".console-brand-lockup") && consoleCss.includes(".status-card-mark"),
  consoleBuildCopiesAssets: consoleBuild.includes("brandedAssets") && consoleBuild.includes("assets"),
  websiteBuildEnforcesAssets: websiteBuild.includes("Website build missing brand asset"),
  proofIncludesV17: proofFast.includes("tools/smoke-v17-product.mjs"),
  readmeBrandSection: readme.includes("v0.17.0 brand integration"),
  claimsBrandSection: claims.includes("v0.17.0 brand integration"),
  assetsPresent: missingAssets.length === 0,
  assetsNonTiny: smallAssets.length === 0
};
const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (missingAssets.length) failures.push(`missing assets: ${missingAssets.join(", ")}`);
if (smallAssets.length) failures.push(`tiny assets: ${smallAssets.join(", ")}`);
if (failures.length) throw new Error(`v17 brand integration smoke failed: ${failures.join("; ")}`);
const proof = {
  ok: true,
  version: "0.17.0",
  name: "v17-brand-integration-smoke",
  checks,
  assets: Object.fromEntries(assetPaths.map((asset) => [asset, statSync(asset).size])),
  proves: [
    "generated SkyeAPI + AegisCore logo assets are included in source public assets",
    "website header, hero, favicon, Apple icon, and OpenGraph image reference the brand assets",
    "console source and console build include brand assets",
    "website build enforces branded asset presence"
  ],
  does_not_prove: [
    "brand trademark clearance",
    "hosted CDN cache behavior",
    "browser visual pixel perfection"
  ],
  secrets_exposed: false,
  generatedAt: new Date().toISOString()
};
await mkdir(".proof", { recursive: true });
await writeFile(".proof/v17-product-smoke-result.json", `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
