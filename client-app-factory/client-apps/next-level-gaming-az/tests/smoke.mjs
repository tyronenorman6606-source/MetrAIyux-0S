#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");
const required = [
  "index.html",
  "events.html",
  "shop.html",
  "quote.html",
  "scan.html",
  "preview.html",
  "offline.html",
  "manifest.webmanifest",
  "service-worker.js",
  "APP_PATH_MANIFEST.json",
  "APP_UPGRADE_PROOF.md",
  "MCP_TOOLING_RECEIPT.json",
  "assets/styles.css",
  "assets/app.js",
  "assets/icons/icon.svg",
  "assets/media/next-level-logo.png",
  "assets/media/next-level-hero.mp4",
  "assets/media/next-level-hero-poster.jpg",
  "assets/media/cyber-city-hero.jpg",
  "assets/media/shop-photo-1.jpg",
  "assets/media/shop-photo-2.jpg",
  "assets/media/shop-photo-3.jpg",
  "assets/media/tcg-banner.png",
  "assets/next-level-scan-qr.svg"
];

const missing = [];
for (const file of required) {
  try {
    await access(path.join(root, file));
  } catch {
    missing.push(file);
  }
}

const html = await readFile(path.join(root, "index.html"), "utf8");
const js = await readFile(path.join(root, "assets/app.js"), "utf8");
const css = await readFile(path.join(root, "assets/styles.css"), "utf8");
const assertions = {
  noMissingFiles: missing.length === 0,
  hasScheduleBoard: html.includes("data-schedule-board"),
  importsGsap: js.includes("import gsap from \"gsap\""),
  importsLenis: js.includes("import Lenis from \"lenis\""),
  hasLivingCanvas: js.includes("requestAnimationFrame(animate)") && html.includes("data-living-background"),
  hasNeonScrollbar: css.includes("::-webkit-scrollbar-thumb"),
  hasRequestForm: (await readFile(path.join(root, "quote.html"), "utf8")).includes("data-event-request-form"),
  hasPreviewGate: (await readFile(path.join(root, "preview.html"), "utf8")).includes("data-preview-gate"),
  hasRealIntroMedia: html.includes("data-intro-video") && html.includes("assets/media/next-level-hero.mp4"),
  hasSkyeKnowlogyBadge: html.includes("Powered by") && html.includes("SkyeKnowlogy")
};

const ok = Object.values(assertions).every(Boolean);
console.log(JSON.stringify({ ok, missing, assertions, checkedAt: new Date().toISOString() }, null, 2));
if (!ok) process.exit(1);
