#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const repoRoot = "/workspaces/MetrAIyux-0S";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(repoRoot, "test-artifacts/live-browser-verifier", `${stamp}-legal-skyes-0s-terms`);
const reportPath = path.join(artifactDir, "live-browser-verification-report.json");
const legal0sUrl = "https://skyes-over-london-legal.pages.dev/legal/metraiyux-0s/";
const legalHubUrl = "https://skyes-over-london-legal.pages.dev/legal/";
const homeUrl = "https://skyes-over-london-legal.pages.dev/";
const shortUrls = [
  "https://skyes-over-london-legal.pages.dev/0s",
  "https://skyes-over-london-legal.pages.dev/metraiyux-0s"
];

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

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function screenshotPath(viewportLabel, pageLabel, label) {
  return path.join(artifactDir, `${viewportLabel}-${slug(pageLabel)}-${label}.png`);
}

async function inspectViewport(page) {
  return page.evaluate(() => {
    const visible = [...document.body.querySelectorAll("*")].filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 2
        && rect.height > 2
        && rect.bottom > 0
        && rect.top < innerHeight
        && style.visibility !== "hidden"
        && style.display !== "none"
        && Number(style.opacity || 1) > 0.01;
    });
    const media = visible.filter((node) => ["IMG", "CANVAS", "VIDEO", "SVG", "PICTURE"].includes(node.tagName));
    const text = visible
      .map((node) => node.innerText || node.alt || node.getAttribute("aria-label") || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      scrollY: Math.round(window.scrollY),
      visibleElementCount: visible.length,
      visibleTextLength: text.length,
      visibleMediaCount: media.length,
      sampleText: text.slice(0, 220)
    };
  });
}

async function scrollPage(page, viewportLabel, pageLabel, actions) {
  const maxY = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  const stops = [...new Set([0, Math.round(maxY * 0.25), Math.round(maxY * 0.5), Math.round(maxY * 0.75), maxY])];
  const results = [];
  for (const [index, y] of stops.entries()) {
    const currentY = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, y - currentY);
    await page.waitForTimeout(280);
    const metrics = await inspectViewport(page);
    const screenshot = screenshotPath(viewportLabel, pageLabel, `scroll-${String(index + 1).padStart(2, "0")}`);
    await page.screenshot({ path: screenshot, fullPage: false });
    actions.push(`scrolled ${pageLabel} stop ${index + 1}`);
    results.push({ ...metrics, screenshot });
  }
  await page.evaluate(() => scrollTo(0, 0));
  return results;
}

async function openAndCheck(context, viewportLabel, pageLabel, url, expectedTexts, extra = null) {
  const page = await context.newPage();
  const consoleMessages = [];
  const failedRequests = [];
  const failures = [];
  const actions = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || "request failed" });
  });

  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  actions.push(`opened ${url}`);
  if (!response?.ok()) failures.push(`${pageLabel} HTTP status ${response?.status()}`);

  const bodyText = await page.locator("body").innerText({ timeout: 12000 });
  for (const expected of expectedTexts) {
    if (!bodyText.includes(expected)) failures.push(`${pageLabel} missing text: ${expected}`);
  }

  if (extra) await extra(page, actions, failures);

  const scrollProof = await scrollPage(page, viewportLabel, pageLabel, actions);
  if (scrollProof.some((stop) => stop.visibleElementCount < 5 || (stop.visibleTextLength < 20 && stop.visibleMediaCount < 1))) {
    failures.push(`${pageLabel} has a visually weak or blank scroll stop.`);
  }
  const fullPageScreenshot = screenshotPath(viewportLabel, pageLabel, "full-page");
  await page.screenshot({ path: fullPageScreenshot, fullPage: true });
  actions.push(`captured ${pageLabel} full page`);

  const hardConsoleErrors = consoleMessages.filter((item) => item.type === "error");
  if (hardConsoleErrors.length) failures.push(`${pageLabel} console errors: ${JSON.stringify(hardConsoleErrors.slice(0, 3))}`);
  if (failedRequests.length) failures.push(`${pageLabel} failed requests: ${JSON.stringify(failedRequests.slice(0, 3))}`);

  await page.close();
  return {
    pageLabel,
    url,
    ok: failures.length === 0,
    failures,
    actions,
    consoleMessages,
    failedRequests,
    scrollProof,
    fullPageScreenshot
  };
}

async function runViewport(browser, viewport, viewportLabel) {
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 700,
    deviceScaleFactor: 1
  });
  const results = [];

  try {
    results.push(await openAndCheck(context, viewportLabel, "0s-terms", legal0sUrl, [
      "MetrAIyux 0S Platform Terms",
      "FS27",
      "SkyeVault",
      "This page is designed to reduce ambiguity",
      "does not guarantee that no person can file a claim"
    ], async (page, actions, failures) => {
      const canonical = await page.locator("link[rel='canonical']").getAttribute("href").catch(() => "");
      actions.push("inspected 0S canonical href");
      if (canonical !== legal0sUrl) failures.push(`0S canonical was ${canonical}`);
      await page.locator("a[href='/legal/ai-operators/']").first().scrollIntoViewIfNeeded();
      actions.push("located AI Operators related policy link");
    }));

    results.push(await openAndCheck(context, viewportLabel, "legal-hub-link", legalHubUrl, [
      "Operating-system protections",
      "MetrAIyux 0S Platform Terms"
    ], async (page, actions, failures) => {
      const link = page.locator("a[href='/legal/metraiyux-0s/']").first();
      await link.scrollIntoViewIfNeeded({ timeout: 8000 });
      await link.click({ timeout: 8000 });
      actions.push("clicked Legal Hub MetrAIyux 0S link");
      await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
      const text = await page.locator("body").innerText({ timeout: 8000 });
      if (!page.url().startsWith(legal0sUrl)) failures.push(`Legal Hub 0S link opened ${page.url()}`);
      if (!text.includes("MetrAIyux 0S Platform Terms")) failures.push("Legal Hub 0S target missing terms title");
    }));

    results.push(await openAndCheck(context, viewportLabel, "home-link", homeUrl, [
      "MetrAIyux 0S umbrella terms",
      "I built the legal front door"
    ], async (page, actions, failures) => {
      const link = page.locator("a[href='/legal/metraiyux-0s/']").first();
      await link.scrollIntoViewIfNeeded({ timeout: 8000 });
      await link.click({ timeout: 8000 });
      actions.push("clicked homepage MetrAIyux 0S route tile");
      await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
      const text = await page.locator("body").innerText({ timeout: 8000 });
      if (!page.url().startsWith(legal0sUrl)) failures.push(`Homepage 0S link opened ${page.url()}`);
      if (!text.includes("MetrAIyux 0S Platform Terms")) failures.push("Homepage 0S target missing terms title");
    }));

    for (const shortUrl of shortUrls) {
      results.push(await openAndCheck(context, viewportLabel, `short-${shortUrl}`, shortUrl, [
        "MetrAIyux 0S Platform Terms",
        "shared gate access"
      ]));
    }
  } finally {
    await context.close();
  }

  return {
    viewportLabel,
    viewport,
    ok: results.every((item) => item.ok),
    results
  };
}

const browser = await chromium.launch({ headless: false });
const viewportResults = [];
try {
  viewportResults.push(await runViewport(browser, { width: 1440, height: 980 }, "desktop"));
  viewportResults.push(await runViewport(browser, { width: 390, height: 844 }, "mobile"));
} finally {
  await browser.close();
}

const report = {
  ok: viewportResults.every((item) => item.ok),
  generatedAt: new Date().toISOString(),
  artifactDir,
  legal0sUrl,
  legalHubUrl,
  homeUrl,
  shortUrls,
  viewportResults
};

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
const failures = viewportResults.flatMap((viewport) => viewport.results.flatMap((result) => result.failures));
console.log(JSON.stringify({ ok: report.ok, reportPath, artifactDir, failures }, null, 2));
if (!report.ok) process.exit(1);
