#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const repoRoot = "/workspaces/MetrAIyux-0S";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(repoRoot, "test-artifacts/live-browser-verifier", `${stamp}-legal-skyes-policy-routes`);
const reportPath = path.join(artifactDir, "live-browser-verification-report.json");
const legalHubUrl = "https://skyes-over-london-legal.pages.dev/legal/";
const marketplacePolicyUrl = "https://skyes-over-london-legal.pages.dev/legal/marketplace-commerce/";
const staleLegalUrl = "https://solenterprises.org/legal/";

const urls = {
  legalHub: legalHubUrl,
  marketplacePolicy: marketplacePolicyUrl,
  marketingHome: "https://metraiyux-0s-marketing.pages.dev/",
  marketingMarketplace: "https://metraiyux-0s-marketing.pages.dev/marketplace",
  marketingEcosystem: "https://metraiyux-0s-marketing.pages.dev/ecosystem",
  businessCards: "https://metraiyux-0s-marketing.pages.dev/business-cards",
  grayMarketplace: "https://gray-skyes-founder-portfolio.pages.dev/marketplace",
  grayEcosystem: "https://gray-skyes-founder-portfolio.pages.dev/ecosystem"
};

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

function safeName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function screenshotPath(viewportLabel, pageLabel, label) {
  return path.join(artifactDir, `${viewportLabel}-${safeName(pageLabel)}-${label}.png`);
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
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      scrollHeight: Math.round(document.documentElement.scrollHeight),
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
    await page.waitForTimeout(300);
    const metrics = await inspectViewport(page);
    const screenshot = screenshotPath(viewportLabel, pageLabel, `scroll-${String(index + 1).padStart(2, "0")}`);
    await page.screenshot({ path: screenshot, fullPage: false });
    actions.push(`scroll ${pageLabel} stop ${index + 1}`);
    results.push({ ...metrics, screenshot });
  }
  await page.evaluate(() => scrollTo(0, 0));
  return results;
}

async function clickPopupLink(page, linkSelector, expectedUrl, expectedText, actions, failures, actionLabel) {
  const link = page.locator(linkSelector).first();
  await link.scrollIntoViewIfNeeded({ timeout: 8000 });
  const href = await link.getAttribute("href");
  if (href !== expectedUrl) failures.push(`${actionLabel} href was ${href}, expected ${expectedUrl}`);
  const box = await link.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
  const popupPromise = page.waitForEvent("popup", { timeout: 8000 }).catch(() => null);
  await link.click({ timeout: 8000 });
  actions.push(actionLabel);
  const popup = await popupPromise;
  const targetPage = popup || page;
  await targetPage.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  const responseUrl = targetPage.url();
  if (!responseUrl.startsWith(expectedUrl)) failures.push(`${actionLabel} opened ${responseUrl}, expected ${expectedUrl}`);
  const body = await targetPage.locator("body").innerText({ timeout: 10000 }).catch(() => "");
  if (!body.includes(expectedText)) failures.push(`${actionLabel} target missing text: ${expectedText}`);
  if (popup) await popup.close();
}

async function verifyNoStaleLegalLink(page, pageLabel, failures) {
  const staleLinks = await page.evaluate((stale) => [...document.querySelectorAll("a[href]")]
    .map((anchor) => ({ text: anchor.textContent.trim(), href: anchor.href }))
    .filter((item) => item.href === stale || item.href.startsWith(stale)), staleLegalUrl);
  if (staleLinks.length) failures.push(`${pageLabel} still contains stale SOLE legal links: ${JSON.stringify(staleLinks)}`);
  const htmlHasStaleLegal = await page.evaluate((stale) => document.documentElement.outerHTML.includes(stale), staleLegalUrl);
  if (htmlHasStaleLegal) failures.push(`${pageLabel} HTML still contains ${staleLegalUrl}`);
}

async function visitPage(context, viewportLabel, pageLabel, url, expectedText, interactions = []) {
  const page = await context.newPage();
  const actions = [];
  const failures = [];
  const consoleMessages = [];
  const failedRequests = [];
  const badResponses = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || "request failed" });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) badResponses.push({ url: response.url(), status });
  });

  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  actions.push(`opened ${url}`);
  if (!response?.ok()) failures.push(`${pageLabel} HTTP status ${response?.status()}`);
  const bodyText = await page.locator("body").innerText({ timeout: 12000 });
  if (!bodyText.includes(expectedText)) failures.push(`${pageLabel} missing text: ${expectedText}`);
  await verifyNoStaleLegalLink(page, pageLabel, failures);

  for (const interaction of interactions) {
    await interaction(page, actions, failures);
  }

  const scrollProof = await scrollPage(page, viewportLabel, pageLabel, actions);
  if (scrollProof.some((stop) => stop.visibleElementCount < 5 || (stop.visibleTextLength < 20 && stop.visibleMediaCount < 1))) {
    failures.push(`${pageLabel} has a visually weak or blank scroll stop.`);
  }
  const fullPageScreenshot = screenshotPath(viewportLabel, pageLabel, "full-page");
  await page.screenshot({ path: fullPageScreenshot, fullPage: true });
  actions.push(`captured ${pageLabel} full page`);

  await page.close();

  const hardConsoleErrors = consoleMessages.filter((item) => item.type === "error");
  if (hardConsoleErrors.length) failures.push(`${pageLabel} console errors: ${JSON.stringify(hardConsoleErrors.slice(0, 3))}`);
  const criticalFailedRequests = failedRequests.filter((item) => {
    if (item.failure === "net::ERR_ABORTED" && /\.(mp4|webm)(\?|$)/.test(item.url)) return false;
    return true;
  });
  if (criticalFailedRequests.length) failures.push(`${pageLabel} failed requests: ${JSON.stringify(criticalFailedRequests.slice(0, 3))}`);
  const badCriticalResponses = badResponses.filter((item) => !item.url.endsWith("/favicon.ico"));
  if (badCriticalResponses.length) failures.push(`${pageLabel} bad responses: ${JSON.stringify(badCriticalResponses.slice(0, 3))}`);

  return {
    pageLabel,
    url,
    ok: failures.length === 0,
    failures,
    actions,
    scrollProof,
    fullPageScreenshot,
    consoleMessages,
    failedRequests,
    badResponses
  };
}

function legalCenterPopupInteraction(selector, label = "clicked Legal Center") {
  return (page, actions, failures) => clickPopupLink(page, selector, legalHubUrl, "enterprise legal center", actions, failures, label);
}

function marketplacePolicyPopupInteraction(selector, label = "clicked Marketplace Policy") {
  return (page, actions, failures) => clickPopupLink(page, selector, marketplacePolicyUrl, "Marketplace and Commerce Terms", actions, failures, label);
}

function businessCardLegalInteraction() {
  return async (page, actions, failures) => {
    const legalCard = page.locator(".bc", { hasText: "LegalSkyes" }).first();
    await legalCard.scrollIntoViewIfNeeded({ timeout: 8000 });
    const text = await legalCard.innerText({ timeout: 8000 });
    actions.push("scrolled to LegalSkyes business card");
    if (!text.includes("skyes-over-london-legal.pages.dev/legal")) {
      failures.push(`LegalSkyes card display target was wrong: ${text.slice(0, 240)}`);
    }
    const qrStats = await legalCard.locator("canvas").first().evaluate((canvas) => {
      const ctx = canvas.getContext("2d");
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let darkish = 0;
      let nonTransparent = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] > 0) nonTransparent += 1;
        if (pixels[index] + pixels[index + 1] + pixels[index + 2] < 360 && pixels[index + 3] > 0) darkish += 1;
      }
      return { width: canvas.width, height: canvas.height, darkish, nonTransparent };
    }).catch(() => null);
    actions.push("inspected LegalSkyes QR pixels");
    if (!qrStats || qrStats.darkish < 50 || qrStats.nonTransparent < 100) {
      failures.push(`LegalSkyes QR did not render expected pixels: ${JSON.stringify(qrStats)}`);
    }
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
    results.push(await visitPage(context, viewportLabel, "legal-hub", urls.legalHub, "enterprise legal center", [
      async (page, actions, failures) => {
        const canonical = await page.locator("link[rel='canonical']").getAttribute("href").catch(() => "");
        actions.push("inspected LegalSkyes canonical href");
        if (canonical !== legalHubUrl) failures.push(`Legal hub canonical was ${canonical}`);
        await page.locator("a[href='/legal/privacy/']").first().scrollIntoViewIfNeeded();
        actions.push("located privacy policy link");
      }
    ]));
    results.push(await visitPage(context, viewportLabel, "marketplace-policy", urls.marketplacePolicy, "Marketplace and Commerce Terms", [
      async (page, actions, failures) => {
        const canonical = await page.locator("link[rel='canonical']").getAttribute("href").catch(() => "");
        actions.push("inspected marketplace policy canonical href");
        if (canonical !== marketplacePolicyUrl) failures.push(`Marketplace policy canonical was ${canonical}`);
        await page.locator("a[href='/legal/']").last().scrollIntoViewIfNeeded();
        actions.push("located Legal Hub return link");
      }
    ]));
    results.push(await visitPage(context, viewportLabel, "marketing-marketplace", urls.marketingMarketplace, "ALL PRODUCTS LIVE AND DEPLOYED", [
      legalCenterPopupInteraction("article:has-text('Legal Center') a.btn-buy", "clicked marketing marketplace Legal Center"),
      marketplacePolicyPopupInteraction("article:has-text('Legal Center') a.btn-learn", "clicked marketing marketplace Marketplace Policy")
    ]));
    results.push(await visitPage(context, viewportLabel, "marketing-home", urls.marketingHome, "MetrAIyux", [
      legalCenterPopupInteraction("footer a:has-text('Legal Center')", "clicked marketing home footer Legal Center")
    ]));
    results.push(await visitPage(context, viewportLabel, "marketing-ecosystem", urls.marketingEcosystem, "Public ecosystem map", [
      legalCenterPopupInteraction("footer a:has-text('Legal Center')", "clicked marketing ecosystem footer Legal Center")
    ]));
    results.push(await visitPage(context, viewportLabel, "business-cards", urls.businessCards, "Print-Ready Business Cards", [
      businessCardLegalInteraction()
    ]));
    results.push(await visitPage(context, viewportLabel, "gray-marketplace", urls.grayMarketplace, "ALL PRODUCTS LIVE AND DEPLOYED", [
      legalCenterPopupInteraction("article:has-text('Legal Center') a.btn-buy", "clicked gray marketplace Legal Center"),
      marketplacePolicyPopupInteraction("article:has-text('Legal Center') a.btn-learn", "clicked gray marketplace Marketplace Policy")
    ]));
    results.push(await visitPage(context, viewportLabel, "gray-ecosystem", urls.grayEcosystem, "Public ecosystem map", [
      legalCenterPopupInteraction("footer a:has-text('Legal Center')", "clicked gray ecosystem footer Legal Center")
    ]));
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
  legalHubUrl,
  marketplacePolicyUrl,
  staleLegalUrl,
  viewportResults
};

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const failures = viewportResults.flatMap((viewport) => viewport.results.flatMap((result) => result.failures));
console.log(JSON.stringify({
  ok: report.ok,
  reportPath,
  artifactDir,
  checkedUrls: Object.values(urls),
  failures
}, null, 2));

if (!report.ok) process.exit(1);
