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
  "send",
  "sent",
  "settings",
  "signup",
  "spam",
  "thread",
  "trash",
];

for (const page of pages) {
  const source = path.join(root, `${page}.html`);
  if (!fs.existsSync(source)) continue;
  const dir = path.join(root, page);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(source, path.join(dir, "index.html"));
}

console.log(`Built ${pages.length} Cloudflare extensionless route indexes.`);
