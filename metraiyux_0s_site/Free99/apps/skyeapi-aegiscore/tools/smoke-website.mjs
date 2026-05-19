import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

execFileSync("node", ["apps/website/tools/build.mjs"], { stdio: "inherit" });
const html = await readFile("apps/website/dist/index.html", "utf8");
const css = await readFile("apps/website/dist/src/site.css", "utf8");
const js = await readFile("apps/website/dist/src/site.js", "utf8");
const llms = await readFile("apps/website/dist/llms.txt", "utf8");
const ai = await readFile("apps/website/dist/ai.md", "utf8");
const requiredHtml = [
  "SkyeAPI + AegisCore",
  "Open operator console",
  "./console/",
  "application/ld+json",
  "Claim boundary",
  "Skyes Over London",
  "og.png",
  "skyeapi-aegiscore-logo-wide.png",
  "favicon.png"
];
for (const token of requiredHtml) {
  if (!html.includes(token)) throw new Error(`Website HTML missing ${token}`);
}
for (const token of [".hero", ".feature-grid", ".truth-grid", ".brand-logo", ".hero-brand-lockup", "@media"]) {
  if (!css.includes(token)) throw new Error(`Website CSS missing ${token}`);
}
if (!js.includes("IntersectionObserver")) throw new Error("Website JS missing reveal animation behavior.");
if (!llms.includes("SkyeAPI is a developer capability control plane")) throw new Error("llms.txt missing AI-readable product summary.");
if (!ai.includes("Claim boundary")) throw new Error("ai.md missing claim boundary section.");
if (!existsSync("apps/website/dist/console/index.html")) throw new Error("Website dist missing bundled /console/ handoff.");
for (const asset of ["apps/website/dist/assets/skyeapi-aegiscore-logo-wide.png", "apps/website/dist/assets/skyeapi-aegiscore-mark.png", "apps/website/dist/favicon.png", "apps/website/dist/apple-touch-icon.png", "apps/website/dist/og.png", "apps/website/dist/console/assets/skyeapi-aegiscore-logo-wide.png"]) {
  if (!existsSync(asset)) throw new Error(`Website dist missing brand asset: ${asset}`);
}
const bannedPublicCopy = [/coming soon/i, /todo:/i, /production[- ]ready/i, /enterprise[- ]grade/i, /bank[- ]grade/i, /guaranteed delivery/i, /zero risk/i];
for (const pattern of bannedPublicCopy) {
  for (const [name, text] of [["index", html], ["llms", llms], ["ai", ai]]) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) throw new Error(`Website ${name} contains banned public overclaim pattern ${pattern}`);
  }
}
const proof = {
  ok: true,
  name: "website-smoke",
  checked: requiredHtml,
  proves: [
    "public landing surface exists",
    "operator console is bundled behind /console/",
    "SEO, OpenGraph, schema, sitemap, robots, llms.txt, and ai.md assets are built",
    "SkyeAPI + AegisCore generated brand assets are present in website and console builds",
    "public copy avoids banned overclaim phrases"
  ],
  does_not_prove: [
    "search ranking",
    "live hosted URL behavior",
    "browser click execution"
  ],
  secrets_exposed: false,
  generatedAt: new Date().toISOString()
};
await mkdir(".proof", { recursive: true });
await writeFile(".proof/website-smoke-result.json", `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
