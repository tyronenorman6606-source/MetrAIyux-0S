#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const repoRoot = "/workspaces/MetrAIyux-0S";
const url = process.env.BUSINESS_CARDS_URL || "https://metraiyux-0s-marketing.pages.dev/business-cards.html";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(repoRoot, "test-artifacts/live-browser-verifier", `${stamp}-business-cards-v2-production-focused`);
const reportPath = path.join(artifactDir, "live-browser-verification-report.json");

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== "linux") return;
  if (process.env.DISPLAY || process.env.LIVE_BROWSER_XVFB_ACTIVE === "1") return;
  const probe = spawnSync("which", ["xvfb-run"], { encoding: "utf8" });
  if (probe.status !== 0) return;
  const child = spawnSync("xvfb-run", ["-a", process.execPath, ...process.argv.slice(1)], {
    stdio: "inherit",
    env: { ...process.env, LIVE_BROWSER_XVFB_ACTIVE: "1" }
  });
  process.exit(child.status ?? 1);
}

relaunchWithXvfbWhenNeeded();
fs.mkdirSync(artifactDir, { recursive: true });

function screenshotName(viewportLabel, label) {
  return path.join(artifactDir, `${viewportLabel}-${label}.png`);
}

async function scrollStops(page, viewportLabel, actions) {
  const maxY = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  const stops = [...new Set([0, Math.round(maxY * 0.25), Math.round(maxY * 0.5), Math.round(maxY * 0.75), maxY])];
  const results = [];
  for (const [index, y] of stops.entries()) {
    await page.mouse.wheel(0, y - (await page.evaluate(() => window.scrollY)));
    await page.waitForTimeout(250);
    const metrics = await page.evaluate(() => {
      const visible = [...document.body.querySelectorAll("*")].filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.top < innerHeight && style.visibility !== "hidden" && style.display !== "none";
      });
      const text = visible.map((node) => node.innerText || node.alt || node.getAttribute("aria-label") || "").join(" ").replace(/\s+/g, " ").trim();
      const media = visible.filter((node) => ["IMG", "CANVAS", "VIDEO", "SVG"].includes(node.tagName));
      return {
        scrollY: Math.round(window.scrollY),
        visibleElementCount: visible.length,
        visibleTextLength: text.length,
        visibleMediaCount: media.length,
        sampleText: text.slice(0, 160)
      };
    });
    const screenshot = screenshotName(viewportLabel, `scroll-${String(index + 1).padStart(2, "0")}`);
    await page.screenshot({ path: screenshot, fullPage: false });
    actions.push(`scrolled ${viewportLabel} stop ${index + 1}`);
    results.push({ ...metrics, screenshot });
  }
  await page.evaluate(() => scrollTo(0, 0));
  return results;
}

async function runViewport(browser, viewport, viewportLabel) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleMessages = [];
  const failedRequests = [];
  const actions = [];
  const failures = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || "request failed" });
  });
  await page.addInitScript(() => {
    window.__printCalls = [];
    window.print = () => {
      window.__printCalls.push({ at: Date.now(), active: document.querySelector(".print-active")?.id || "" });
    };
  });

  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  actions.push(`opened ${url}`);
  const title = await page.title();
  const bodyText = await page.locator("body").innerText();
  if (!response?.ok()) failures.push(`HTTP status ${response?.status()}`);
  for (const text of ["Business Cards", "Print-Ready Business Cards", "SKYE VAULT OS", "MERSER"]) {
    if (!bodyText.includes(text)) failures.push(`Missing text: ${text}`);
  }
  if (!/Business Cards/.test(title)) failures.push(`Unexpected title: ${title}`);

  const layout = await page.evaluate(() => {
    const firstWrap = document.querySelector(".bc-display");
    const firstCard = document.querySelector(".bc");
    const wrapRect = firstWrap?.getBoundingClientRect();
    const cardStyle = firstCard ? getComputedStyle(firstCard).transform : "";
    return {
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      cardDisplayWidth: Math.round(wrapRect?.width || 0),
      cardDisplayHeight: Math.round(wrapRect?.height || 0),
      cardTransform: cardStyle,
      cardCount: document.querySelectorAll(".bc").length,
      qrCanvasCount: document.querySelectorAll(".bc canvas").length
    };
  });
  if (layout.overflow > 2) failures.push(`Horizontal overflow: ${layout.overflow}`);
  if (layout.cardCount < 15) failures.push(`Expected at least 15 cards, saw ${layout.cardCount}`);
  if (layout.qrCanvasCount < 15) failures.push(`Expected at least 15 QR canvases, saw ${layout.qrCanvasCount}`);
  if (viewport.width >= 700 && layout.cardDisplayWidth < 590) failures.push(`Desktop card preview too small: ${layout.cardDisplayWidth}`);
  if (viewport.width < 700 && layout.cardDisplayWidth > viewport.width) failures.push(`Mobile card preview wider than viewport: ${layout.cardDisplayWidth}`);

  await page.locator("#vv-biz").fill("Fade Masters PHX");
  actions.push("edited Valley card business name");
  await page.locator("#vv-city").fill("Phoenix");
  actions.push("edited Valley card city");
  await page.locator("#vv-cat").fill("Paint & Body");
  actions.push("edited Valley card category");
  await page.waitForTimeout(700);
  const valleyState = await page.evaluate(() => ({
    business: document.querySelector("#vv-biz-display")?.textContent || "",
    city: document.querySelector("#vv-city-display")?.textContent || ""
  }));
  if (!valleyState.business.includes("FADE MASTERS PHX")) failures.push("Valley card business name did not update.");
  if (!valleyState.city.includes("Phoenix") || !valleyState.city.includes("Paint & Body")) failures.push("Valley card city/category did not update.");
  actions.push("verified Valley card live text update");

  for (const id of ["card-personal-gold", "card-personal-cyan", "card-vv", "card-0s"]) {
    const button = page.locator(`button[onclick="printCard('${id}')"]`).first();
    await button.scrollIntoViewIfNeeded();
    await button.click();
    actions.push(`clicked print for ${id}`);
    await page.waitForTimeout(150);
  }
  const printCalls = await page.evaluate(() => window.__printCalls || []);
  if (printCalls.length < 4) failures.push(`Expected 4 print calls, saw ${printCalls.length}`);

  const qrStats = await page.evaluate(() => [...document.querySelectorAll(".bc canvas")].slice(0, 8).map((canvas) => {
    const ctx = canvas.getContext("2d");
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let darkish = 0;
    let nonTransparent = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 0) nonTransparent += 1;
      if (pixels[i] + pixels[i + 1] + pixels[i + 2] < 360 && pixels[i + 3] > 0) darkish += 1;
    }
    return { width: canvas.width, height: canvas.height, darkish, nonTransparent };
  }));
  if (qrStats.some((item) => item.width !== 56 || item.height !== 56 || item.darkish < 50)) {
    failures.push(`QR canvases did not render expected pixels: ${JSON.stringify(qrStats.slice(0, 3))}`);
  }
  actions.push("inspected QR canvas pixels");

  const media = await page.evaluate(() => ({
    brokenImages: [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
    visibleCanvasCount: [...document.querySelectorAll("canvas")].filter((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).length
  }));
  if (media.brokenImages.length) failures.push(`Broken images: ${media.brokenImages.join(", ")}`);

  const scrollProof = await scrollStops(page, viewportLabel, actions);
  if (scrollProof.some((stop) => stop.visibleElementCount < 3 || (stop.visibleTextLength < 20 && stop.visibleMediaCount < 1))) {
    failures.push("One or more scroll stops looked visually blank.");
  }
  const fullPageScreenshot = screenshotName(viewportLabel, "full-page");
  await page.screenshot({ path: fullPageScreenshot, fullPage: true });
  await context.close();

  const hardConsoleErrors = consoleMessages.filter((item) => item.type === "error");
  if (hardConsoleErrors.length) failures.push(`Console errors: ${JSON.stringify(hardConsoleErrors.slice(0, 3))}`);
  if (failedRequests.length) failures.push(`Failed requests: ${failedRequests.map((item) => item.url).join(", ")}`);
  if (actions.length < 12) failures.push(`Not enough human-style actions: ${actions.length}`);

  return {
    viewport,
    viewportLabel,
    ok: failures.length === 0,
    failures,
    actions,
    layout,
    valleyState,
    printCalls,
    qrStats,
    media,
    scrollProof,
    fullPageScreenshot,
    consoleMessages,
    failedRequests
  };
}

const browser = await chromium.launch({ headless: false });
const results = [];
try {
  results.push(await runViewport(browser, { width: 1440, height: 980 }, "desktop"));
  results.push(await runViewport(browser, { width: 390, height: 844 }, "mobile"));
} finally {
  await browser.close();
}

const report = {
  ok: results.every((item) => item.ok),
  url,
  generatedAt: new Date().toISOString(),
  artifactDir,
  results
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: report.ok, reportPath, failures: results.flatMap((item) => item.failures) }, null, 2));
if (!report.ok) process.exit(1);
