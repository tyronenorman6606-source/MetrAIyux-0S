import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const pages = [
  "ai",
  "compose",
  "contacts",
  "dashboard",
  "drafts",
  "founder",
  "keys",
  "login",
  "message",
  "monitoring",
  "onboarding",
  "security",
  "send",
  "sent",
  "settings",
  "signup",
  "spam",
  "tech-stack",
  "thread",
  "trash",
];

function copyHtmlPage(src, dest, { rootRelativeAssets = false } = {}) {
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

for (const page of pages) {
  const source = path.join(root, `${page}.html`);
  if (!fs.existsSync(source)) continue;
  const dir = path.join(root, page);
  fs.mkdirSync(dir, { recursive: true });
  copyHtmlPage(source, path.join(dir, "index.html"), { rootRelativeAssets: true });
}

console.log(`Built ${pages.length} Cloudflare extensionless route indexes.`);
