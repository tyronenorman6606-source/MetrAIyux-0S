import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const repo = join(root, "..", "..");
const dist = join(root, "dist");
await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "src"), { recursive: true });
await cp(join(root, "index.html"), join(dist, "index.html"));
await cp(join(root, "src"), join(dist, "src"), { recursive: true });
await cp(join(root, "public"), dist, { recursive: true });

const consoleDist = join(repo, "apps", "console", "dist");
if (existsSync(consoleDist)) await cp(consoleDist, join(dist, "console"), { recursive: true });

async function walk(dir, base = dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) files.push(...await walk(full, base));
    else files.push(full.replace(base + "/", ""));
  }
  return files;
}

const files = await walk(dist);
const index = await readFile(join(dist, "index.html"), "utf8");
if (!index.includes("Open operator console")) throw new Error("Website landing page missing console handoff copy.");
if (!index.includes("skyeapi-aegiscore-logo-wide.png")) throw new Error("Website landing page missing SkyeAPI brand logo asset reference.");
for (const asset of ["assets/skyeapi-aegiscore-logo-wide.png", "assets/skyeapi-aegiscore-mark.png", "favicon.png", "apple-touch-icon.png", "og.png"]) {
  if (!files.includes(asset)) throw new Error(`Website build missing brand asset: ${asset}`);
}
if (!files.includes("console/index.html")) throw new Error("Website build did not include console handoff at /console/.");
if (!files.includes("console/assets/skyeapi-aegiscore-logo-wide.png")) throw new Error("Website build did not include branded console assets.");
await writeFile(join(dist, "build-manifest.json"), `${JSON.stringify({ ok: true, app: "skyeapi-website", files, consoleBundled: true, secrets_exposed: false, generatedAt: new Date().toISOString() }, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, app: "skyeapi-website", dist, files: files.length, consoleBundled: true }, null, 2));
