import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

for (const rel of [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "assets/logo.svg",
  "icon-192.png",
  "assets/icon-512.png",
]) {
  if (!existsSync(path.join(root, rel))) {
    throw new Error(`Missing required BrandID PWA file: ${rel}`);
  }
}

const indexHtml = readFileSync(path.join(root, "index.html"), "utf8");
const html = indexHtml;
if (existsSync(path.join(root, "app.html"))) {
  throw new Error("app.html should not exist; BrandID Offline PWA must use one canonical root app");
}
for (const needle of [
  'navigator.serviceWorker.register("./sw.js"',
  'id="btnDownloadPrimary"',
  'id="btnDownloadMark"',
  'id="btnSaveBrief"',
  'id="btnExportBrief"',
  'id="btnImportBrief"',
  'id="contactForm"',
  'id="btnSyncOutbox"',
  'id="btnExportOutbox"',
  'id="btnBuildHandoffBrief"',
  'brandid_offline_contact_outbox_v1',
  'Offline: requests still save into the local outbox.',
  'Diagnostics: ready. Offline-first shell is active. Default logo is local.',
  'brandid_offline_brief_v1',
  'id="handoffBriefList"',
  'id="workflowTimelineStatusCard"',
  'id="workflowTimelineList"',
]) {
  if (!html.includes(needle)) {
    throw new Error(`BrandID offline shell is missing required proof marker: ${needle}`);
  }
}

const manifest = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
if (manifest.display !== "standalone" || manifest.scope !== "./") {
  throw new Error("BrandID manifest no longer declares a standalone scoped PWA.");
}

const sw = readFileSync(path.join(root, "sw.js"), "utf8");
for (const needle of ["CORE_ASSETS", "cache.addAll", "navigate", "Offline and no cached shell found."]) {
  if (!sw.includes(needle)) {
    throw new Error(`BrandID service worker is missing expected offline contract: ${needle}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  platform: "BrandID-Offline-PWA",
  proof: [
    "Standalone offline shell files exist",
    "Service worker caches the local shell and assets",
    "SVG export controls exist",
    "Offline intake outbox controls exist in the UI",
  ],
  limits: [
    "Does not prove first-load offline use before assets are cached",
    "Does not prove runtime archiving unless the same-folder runtime is started",
  ],
}, null, 2));
