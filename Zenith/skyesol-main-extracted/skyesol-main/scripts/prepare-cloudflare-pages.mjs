import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, ".deploy", "cloudflare");
const excluded = new Set([
  ".deploy",
  ".git",
  ".github",
  ".ipynb_checkpoints",
  ".netlify",
  ".venv",
  ".vscode",
  "node_modules",
  "netlify",
  "package-lock.json",
  "package.json",
  "scripts",
  "wrangler.toml",
]);

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await cp(root, outDir, {
  recursive: true,
  filter(source) {
    const relative = source.slice(root.length).replace(/^\/+/, "");
    if (!relative) return true;
    const first = relative.split("/")[0];
    return !excluded.has(first);
  },
});

console.log(`Cloudflare Pages bundle staged at ${outDir}`);
