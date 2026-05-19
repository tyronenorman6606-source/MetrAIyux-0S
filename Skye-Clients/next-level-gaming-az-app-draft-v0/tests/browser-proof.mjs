#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:4188";
const artifactDir = path.resolve(process.cwd(), "../../test-artifacts/next-level-gaming-az-app");
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const checks = {};

async function wire(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push({ label, type: "console", text: message.text() });
  });
  page.on("pageerror", (error) => errors.push({ label, type: "pageerror", text: error.message }));
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
}

async function visibleText(page, selector) {
  return page.locator(selector).first().isVisible().catch(() => false);
}

async function canvasHasPixels(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("[data-living-background]");
    if (!canvas) return false;
    const context = canvas.getContext("2d");
    if (!context || canvas.width < 4 || canvas.height < 4) return false;
    const stepX = Math.max(1, Math.floor(canvas.width / 8));
    const stepY = Math.max(1, Math.floor(canvas.height / 8));
    for (let y = 0; y < canvas.height; y += stepY) {
      for (let x = 0; x < canvas.width; x += stepX) {
        const pixel = context.getImageData(x, y, 1, 1).data;
        if (pixel[0] || pixel[1] || pixel[2] || pixel[3]) return true;
      }
    }
    return false;
  });
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await wire(desktop, "desktop");
await desktop.goto(`${baseUrl}/index.html`, { waitUntil: "networkidle" });
await desktop.waitForFunction(() => window.NextLevelGamingApp && document.querySelectorAll(".event-card").length >= 4, null, { timeout: 15000 });
await desktop.screenshot({ path: path.join(artifactDir, "desktop-home.png"), fullPage: true });
checks.desktopNoOverflow = await noHorizontalOverflow(desktop);
checks.desktopTitleVisible = await visibleText(desktop, "#app-title");
checks.desktopCtaVisible = await visibleText(desktop, ".btn.primary");
checks.desktopRuntime = await desktop.evaluate(() => window.NextLevelGamingApp.runtime);
checks.desktopCanvasNonblank = await canvasHasPixels(desktop);
await desktop.click('[data-day-filter="Friday"]');
checks.fridayFilterShowsLorcana = await desktop.locator(".event-card", { hasText: "Lorcana" }).first().isVisible();
checks.fridayFilterHidesOnePiece = await desktop.locator(".event-card", { hasText: "One Piece" }).count().then((count) => count === 0);

await desktop.goto(`${baseUrl}/quote.html`, { waitUntil: "networkidle" });
await desktop.fill('input[name="name"]', "Preview Tester");
await desktop.fill('input[name="email"]', "tester@example.com");
await desktop.fill('input[name="phone"]', "623-248-7458");
await desktop.selectOption('select[name="game"]', "Lorcana");
await desktop.selectOption('select[name="requestType"]', "Learn-to-play event");
await desktop.fill('input[name="dateWindow"]', "Friday evening");
await desktop.fill('input[name="players"]', "12");
await desktop.fill('input[name="support"]', "Beginner table and promo notes");
await desktop.fill('textarea[name="details"]', "Testing the event request workflow from browser proof.");
await desktop.click('button[type="submit"]');
checks.requestResultVisible = await desktop.locator("[data-form-result]", { hasText: "Request saved locally" }).isVisible();
checks.mailtoVisible = await desktop.locator("[data-mailto-result]").isVisible();
checks.localLedgerSaved = await desktop.evaluate(() => JSON.parse(localStorage.getItem("nextLevelGaming.eventRequests") || "[]").length > 0);
await desktop.screenshot({ path: path.join(artifactDir, "desktop-request.png"), fullPage: true });

await desktop.goto(`${baseUrl}/preview.html`, { waitUntil: "networkidle" });
await desktop.fill('input[name="code"]', "NLG-7DAY");
await desktop.click('button[type="submit"]');
checks.previewUnlocked = await desktop.locator("[data-preview-room]").isVisible();

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
await wire(mobile, "mobile");
await mobile.goto(`${baseUrl}/index.html`, { waitUntil: "networkidle" });
await mobile.waitForFunction(() => window.NextLevelGamingApp && document.querySelectorAll(".event-card").length >= 4, null, { timeout: 15000 });
await mobile.click(".nav-toggle");
checks.mobileMenuOpens = await mobile.locator("#primary-nav").isVisible();
checks.mobileNoOverflow = await noHorizontalOverflow(mobile);
checks.mobileTitleVisible = await visibleText(mobile, "#app-title");
checks.mobileCtaVisible = await visibleText(mobile, ".btn.primary");
await mobile.screenshot({ path: path.join(artifactDir, "mobile-home.png"), fullPage: true });

await browser.close();

const report = {
  ok: Object.values(checks).every(Boolean) && errors.length === 0,
  baseUrl,
  checks,
  errors,
  artifacts: [
    "desktop-home.png",
    "desktop-request.png",
    "mobile-home.png"
  ],
  checkedAt: new Date().toISOString()
};

await writeFile(path.join(artifactDir, "browser-proof.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
