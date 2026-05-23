import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const out = path.join(root, "cf-assets");

const pages = [
  "ai",
  "changelog",
  "compose",
  "contacts",
  "dashboard",
  "drafts",
  "founder",
  "gate-return",
  "keys",
  "login",
  "live-proof",
  "marketing",
  "mcp-proof",
  "message",
  "monitoring",
  "onboarding",
  "pricing",
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

function copyHtmlPage(src, dest, { rootRelativeAssets = false } = {}) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let html = fs.readFileSync(src, "utf8");
  if (rootRelativeAssets) {
    html = html
      .replaceAll('href="assets/', 'href="/assets/')
      .replaceAll("href='assets/", "href='/assets/")
      .replaceAll('src="assets/', 'src="/assets/')
      .replaceAll("src='assets/", "src='/assets/");
  }
  fs.writeFileSync(dest, html);
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

copyHtmlPage(path.join(root, "index.html"), path.join(out, "index.html"));
for (const page of pages) {
  const source = path.join(root, `${page}.html`);
  if (!fs.existsSync(source)) continue;
  copyHtmlPage(source, path.join(out, `${page}.html`));
  copyHtmlPage(source, path.join(out, page, "index.html"), { rootRelativeAssets: true });
}

copyDir(path.join(root, "assets"), path.join(out, "assets"));
copyDir(path.join(root, "suite"), path.join(out, "suite"));
copyDir(path.join(root, "dist"), path.join(out, "dist"));

console.log(`Built Cloudflare assets in ${path.relative(root, out)}.`);
