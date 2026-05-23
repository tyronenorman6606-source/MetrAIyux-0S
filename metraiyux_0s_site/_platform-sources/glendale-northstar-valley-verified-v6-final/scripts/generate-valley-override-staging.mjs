import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(projectRoot, "NORTHSTAR_VALLEY_CLIENT_MANIFEST_2026-05-19.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

const outRoot = path.join(projectRoot, "valley-verified-override-staging");
const sharedRoot = path.join(outRoot, "_shared");
const clientsSource = path.join(projectRoot, "assets", "data", "clients.json");
const stylesSource = path.join(projectRoot, "assets", "styles.css");
const uiSource = path.join(projectRoot, "assets", "ui.js");

function rewriteLanding(html, client) {
  return html
    .replaceAll("../../assets/styles.css", "../../_shared/styles.css")
    .replaceAll("../../assets/ui.js", "../../_shared/ui.js")
    .replaceAll("href=\"blog.html\"", "href=\"./guide/\"")
    .replaceAll("href=\"../../index.html\"", "href=\"/valley-verified/\"")
    .replaceAll(
      `href="../../northstar/index.html?workspace=${client.slug}"`,
      `href="/northstar/index.html?workspace=${client.slug}"`
    )
    .replace(
      /<meta name="robots" content="noindex,nofollow">/i,
      '<meta name="robots" content="index,follow">'
    )
    .replace(/Valley Verified Client/gi, "Valley Verified Featured Client")
    .replace(/NorthStar Office &amp; Accounting/g, "MetrAIyux 0S / NorthStar SignInPro")
    .replace(/NorthStar Office & Accounting/g, "MetrAIyux 0S / NorthStar SignInPro");
}

function rewriteGuide(html, client) {
  return html
    .replaceAll("../../assets/styles.css", "../../_shared/styles.css")
    .replaceAll("../../assets/ui.js", "../../_shared/ui.js")
    .replaceAll("href=\"index.html\"", "href=\"../\"")
    .replaceAll("href=\"../../index.html\"", "href=\"/valley-verified/\"")
    .replaceAll(
      `href="../../northstar/index.html?workspace=${client.slug}"`,
      `href="/northstar/index.html?workspace=${client.slug}"`
    )
    .replace(
      /<meta name="robots" content="noindex,nofollow">/i,
      '<meta name="robots" content="index,follow">'
    )
    .replace(/Valley Verified Client/gi, "Valley Verified Featured Client")
    .replace(/NorthStar Office &amp; Accounting/g, "MetrAIyux 0S / NorthStar SignInPro")
    .replace(/NorthStar Office & Accounting/g, "MetrAIyux 0S / NorthStar SignInPro");
}

await fs.rm(outRoot, { recursive: true, force: true });
await fs.mkdir(sharedRoot, { recursive: true });
await fs.copyFile(stylesSource, path.join(sharedRoot, "styles.css"));
await fs.copyFile(uiSource, path.join(sharedRoot, "ui.js"));
await fs.copyFile(clientsSource, path.join(sharedRoot, "clients.json"));

const staged = [];
for (const client of manifest.clients) {
  const sourceLanding = path.join(projectRoot, client.landing_source);
  const sourceGuide = path.join(projectRoot, client.guide_source);
  const businessDir = path.join(outRoot, "business", client.slug);
  const guideDir = path.join(businessDir, "guide");
  await fs.mkdir(guideDir, { recursive: true });

  const landingHtml = await fs.readFile(sourceLanding, "utf8");
  const guideHtml = await fs.readFile(sourceGuide, "utf8");

  await fs.writeFile(path.join(businessDir, "index.html"), rewriteLanding(landingHtml, client), "utf8");
  await fs.writeFile(path.join(guideDir, "index.html"), rewriteGuide(guideHtml, client), "utf8");

  staged.push({
    slug: client.slug,
    landing: path.relative(projectRoot, path.join(businessDir, "index.html")),
    guide: path.relative(projectRoot, path.join(guideDir, "index.html"))
  });
}

const receipt = {
  generated_at: new Date().toISOString(),
  output_root: path.relative(projectRoot, outRoot),
  shared_assets: [
    "_shared/styles.css",
    "_shared/ui.js",
    "_shared/clients.json"
  ],
  staged_clients: staged
};
await fs.writeFile(
  path.join(outRoot, "STAGING_RECEIPT.json"),
  JSON.stringify(receipt, null, 2) + "\n",
  "utf8"
);

console.log(path.join(outRoot, "STAGING_RECEIPT.json"));
console.log(`staged_clients=${staged.length}`);
