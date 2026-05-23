import { readFile } from "node:fs/promises";
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../src/site.css", import.meta.url), "utf8");
const js = await readFile(new URL("../src/site.js", import.meta.url), "utf8");
for (const token of ["SkyeAPI + AegisCore", "./console/", "application/ld+json", "Claim boundary"]) {
  if (!html.includes(token)) throw new Error(`Website source missing ${token}`);
}
if (!css.includes(".hero") || !css.includes(".feature-grid")) throw new Error("Website CSS missing core layout rules.");
if (!js.includes("IntersectionObserver")) throw new Error("Website JS missing reveal behavior.");
console.log(JSON.stringify({ ok: true, app: "skyeapi-website-source", secrets_exposed: false }, null, 2));
