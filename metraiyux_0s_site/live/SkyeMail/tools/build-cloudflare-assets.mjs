import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const out = path.join(root, "cf-assets");

const pages = [
	  "ai",
	  "brain",
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
  "pocket",
  "pricing",
  "security",
  "send",
  "sent",
  "session-handoff",
  "settings",
  "signup",
  "spam",
  "tech-stack",
  "thread",
  "trash",
  "workspace",
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

function copyOptionalProofFile(relativePath) {
  const src = path.join(root, "proof", relativePath);
  if (!fs.existsSync(src)) return;
  copyFile(src, path.join(out, "proof", relativePath));
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

copyHtmlPage(path.join(root, "index.html"), path.join(out, "index.html"));
copyHtmlPage(path.join(root, "index.html"), path.join(out, "__skyemail_root"));
for (const page of pages) {
  const source = path.join(root, `${page}.html`);
  if (!fs.existsSync(source)) continue;
  copyHtmlPage(source, path.join(out, `${page}.html`));
  copyHtmlPage(source, path.join(out, page, "index.html"), { rootRelativeAssets: true });
  if (page === "founder") copyHtmlPage(source, path.join(out, "__skyemail_founder"));
}

copyDir(path.join(root, "assets"), path.join(out, "assets"));
copyDir(path.join(root, "partials"), path.join(out, "partials"));
copyDir(path.join(root, "suite"), path.join(out, "suite"));
copyDir(path.join(root, "dist"), path.join(out, "dist"));
copyFile(path.join(root, "robots.txt"), path.join(out, "robots.txt"));
copyFile(path.join(root, "sitemap.xml"), path.join(out, "sitemap.xml"));
copyOptionalProofFile("live-email-proof.json");
copyOptionalProofFile("skymail-mcp-proof.json");
copyOptionalProofFile("videos/skymail-live-proof-browser.webm");
copyOptionalProofFile("videos/skymail-mcp-proof-browser.webm");
copyOptionalProofFile("screenshots/skymail-live-proof-video-frame.png");
copyOptionalProofFile("screenshots/mcp-proof-desktop-mcp-logo.png");

console.log(`Built Cloudflare assets in ${path.relative(root, out)}.`);
