import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const out = path.join(root, "cf-assets");

const pages = [
  "ai",
  "compose",
  "contacts",
  "dashboard",
  "drafts",
  "founder",
  "keys",
  "login",
  "live-proof",
  "marketing",
  "mcp-proof",
  "message",
  "monitoring",
  "onboarding",
  "send",
  "sent",
  "settings",
  "signup",
  "spam",
  "thread",
  "trash",
];

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isFile()) copyFile(from, to);
  }
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

copyFile(path.join(root, "index.html"), path.join(out, "index.html"));
for (const page of pages) {
  const source = path.join(root, `${page}.html`);
  if (!fs.existsSync(source)) continue;
  copyFile(source, path.join(out, `${page}.html`));
  copyFile(source, path.join(out, page, "index.html"));
}

copyDir(path.join(root, "assets"), path.join(out, "assets"));
copyDir(path.join(root, "proof"), path.join(out, "proof"));
copyDir(path.join(root, "suite"), path.join(out, "suite"));
copyDir(path.join(root, "dist"), path.join(out, "dist"));

console.log(`Built Cloudflare assets in ${path.relative(root, out)}.`);
