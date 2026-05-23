#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const repoRoot = "/workspaces/MetrAIyux-0S";
const merserUrl = "https://merser.pages.dev/";
const zeroOsBase = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const marketingUrl = "https://metraiyux-0s-marketing.pages.dev/";
const devFreeSauceUrl = "https://metraiyux-0s-marketing.pages.dev/dev-free-sauce";
const npmPackageUrl = "https://www.npmjs.com/package/@skyes0verl0nd0n/merser";

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== "linux") return;
  if (process.env.DISPLAY || process.env.MERSER_PROOF_XVFB_ACTIVE === "1") return;
  const probe = spawnSync("which", ["xvfb-run"], { encoding: "utf8" });
  if (probe.status !== 0) return;
  const child = spawnSync("xvfb-run", ["-a", process.execPath, ...process.argv.slice(1)], {
    stdio: "inherit",
    env: { ...process.env, MERSER_PROOF_XVFB_ACTIVE: "1" },
  });
  process.exit(child.status ?? 1);
}

relaunchWithXvfbWhenNeeded();

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function slug(value) {
  return String(value || "proof")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function readOwnerCode() {
  const text = fs.readFileSync(path.join(repoRoot, "ADMIN_REFERENCE.md"), "utf8");
  const match = text.match(/FREE99-ADMIN-[A-Z0-9-]+/);
  if (!match) throw new Error("Could not find the shared 0S owner admin code in ADMIN_REFERENCE.md");
  return match[0];
}

async function maybeScreenshot(page, outPath) {
  await page.screenshot({ path: outPath, fullPage: false });
  return outPath;
}

async function firstVisible(page, selector) {
  const count = await page.locator(selector).count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    const locator = page.locator(selector).nth(index);
    if (await locator.isVisible().catch(() => false)) return locator;
  }
  return null;
}

async function clickVisible(page, selector, actions, label) {
  const locator = await firstVisible(page, selector);
  if (!locator) return false;
  await locator.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {});
  let clicked = true;
  await locator.click({ timeout: 1000, force: true }).catch(async () => {
    const box = await locator.boundingBox().catch(() => null);
    if (!box) {
      clicked = false;
      return;
    }
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 50 });
  });
  if (!clicked) return false;
  actions.push(label);
  process.stderr.write(`[merser-proof] ${label}\n`);
  await page.waitForTimeout(450);
  return true;
}

async function dragVisible(page, selector, actions, label) {
  const locator = await firstVisible(page, selector);
  if (!locator) return false;
  await locator.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {});
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return false;
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY, { steps: 4 });
  await page.mouse.down();
  await page.mouse.move(startX + 78, startY + 42, { steps: 10 });
  await page.mouse.up();
  actions.push(label);
  process.stderr.write(`[merser-proof] ${label}\n`);
  await page.waitForTimeout(550);
  return true;
}

async function safeRuntime(page) {
  return page.evaluate(() => {
    const runtime = window.__MCP4_RUNTIME__ || {};
    return {
      name: runtime.name,
      react: Boolean(runtime.react),
      motion: Boolean(runtime.motion),
      framerMotion: Boolean(runtime.framerMotion),
      gsap: Boolean(runtime.gsap),
      lenis: Boolean(runtime.lenis),
      three: Boolean(runtime.three),
      r3f: Boolean(runtime.r3f),
      drei: Boolean(runtime.drei),
      postprocessing: Boolean(runtime.postprocessing),
      theatre: Boolean(runtime.theatre),
      remotion: Boolean(runtime.remotion),
      livingBackground: Boolean(runtime.livingBackground),
      canvasReady: Boolean(runtime.canvasReady),
      canvasFrames: Number(runtime.canvasFrames || 0),
      cameraMoved: Boolean(runtime.cameraMoved),
      cameraMode: runtime.cameraMode || "",
      activeRoom: runtime.activeRoom || "",
      drawerOpen: runtime.drawerOpen || "",
      dragEvents: Number(runtime.dragEvents || 0),
      lastDrag: runtime.lastDrag || null,
      gateOpen: Boolean(runtime.gateOpen),
      minimapReady: Boolean(runtime.minimapReady),
      searchReady: Boolean(runtime.searchReady),
      sourcePreviewVisible: Boolean(runtime.sourcePreviewVisible),
      sourcePreviewLoaded: runtime.sourcePreviewLoaded || "",
      surfaceBrowserLoaded: runtime.surfaceBrowserLoaded || "",
      surfaceScreenshots: Boolean(runtime.surfaceScreenshots),
    };
  });
}

async function proofMerserViewport(browser, viewport, artifactDir) {
  process.stderr.write(`[merser-proof] Merser ${viewport.width}x${viewport.height}\n`);
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const ignoredAbortedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "request failed";
    const item = { url: request.url(), method: request.method(), failure };
    if (failure === "net::ERR_ABORTED") ignoredAbortedRequests.push(item);
    else failedRequests.push(item);
  });

  const response = await page.goto(merserUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForFunction(() => Boolean(window.__MCP4_RUNTIME__?.canvasReady), null, { timeout: 25000 });
  await page.waitForSelector("text=Merser by Skyes Over London", { timeout: 12000 });
  await page.waitForSelector(".minimap-dot", { timeout: 12000 });

  const actions = [];
  const initialRuntime = await safeRuntime(page);
  const canvasBox = await page.locator("canvas").first().boundingBox().catch(() => null);
  const canvasCount = await page.locator("canvas").count().catch(() => 0);
  const imageCount = await page.locator("img").count().catch(() => 0);
  const manifestHref = await page.locator('link[rel="manifest"]').first().getAttribute("href").catch(() => "");
  const logoVisible = await page.locator('img[alt*="Skyes Over London"]').first().isVisible().catch(() => false);

  await maybeScreenshot(page, path.join(artifactDir, `merser-${viewport.width}x${viewport.height}-top.png`));
  await clickVisible(page, 'button:has-text("Focus core")', actions, "clicked Focus core");
  await clickVisible(page, 'button:has-text("Inspect room")', actions, "clicked Inspect room");
  await clickVisible(page, 'button[aria-label="Close inspector"]', actions, "closed inspector");
  await clickVisible(page, 'button:has-text("360 orbit")', actions, "enabled 360 orbit");
  await clickVisible(page, 'button:has-text("Focus")', actions, "clicked Focus camera");
  await clickVisible(page, 'button:has-text("Zoom in")', actions, "clicked Zoom in");
  await clickVisible(page, 'button:has-text("Zoom out")', actions, "clicked Zoom out");
  for (const key of ["2", "7", "0", "S"]) {
    await clickVisible(page, `button[aria-label="press ${key}"]`, actions, `pressed visual gate key ${key}`);
  }
  await clickVisible(page, 'button:has-text("Open")', actions, "opened visual gate");
  await dragVisible(page, ".minimap-dot", actions, "dragged minimap room dot");
  await dragVisible(page, "canvas", actions, "dragged world canvas");
  const search = await firstVisible(page, "#room-search-input");
  if (search) {
    await search.fill("tattoo");
    actions.push("typed tattoo into room search");
    await page.waitForTimeout(350);
    await clickVisible(page, ".search-results button", actions, "selected searched room");
  }
  await clickVisible(page, ".source-room-switcher button", actions, "switched live source room");
  await page.mouse.wheel(0, Math.floor(viewport.height * 1.15));
  actions.push("scrolled into source-pack path");
  await page.waitForTimeout(500);
  await clickVisible(page, 'a:has-text("Source packs")', actions, "clicked Source packs anchor");
  await page.waitForTimeout(700);
  await maybeScreenshot(page, path.join(artifactDir, `merser-${viewport.width}x${viewport.height}-after-actions.png`));
  const finalRuntime = await safeRuntime(page);
  const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  const title = await page.title().catch(() => "");
  await context.close();

  const checks = {
    status: response?.status() || 0,
    title,
    hasMerserText: title.includes("Merser by Skyes Over London") && bodyText.includes("Merser"),
    hasCorrectTitle: title.includes("Merser by Skyes Over London"),
    hasSkyesLogo: logoVisible,
    hasManifest: manifestHref === "/manifest.webmanifest",
    canvasCount,
    canvasBox,
    imageCount,
    actions,
    actionCount: actions.length,
    initialRuntime,
    finalRuntime,
    runtimeStackActive:
      finalRuntime.react &&
      finalRuntime.motion &&
      finalRuntime.gsap &&
      finalRuntime.lenis &&
      finalRuntime.three &&
      finalRuntime.r3f &&
      finalRuntime.drei &&
      finalRuntime.postprocessing &&
      finalRuntime.theatre &&
      finalRuntime.remotion,
    dragMoved: finalRuntime.dragEvents > initialRuntime.dragEvents || Boolean(finalRuntime.lastDrag),
    sourcePreviewLoaded: Boolean(finalRuntime.sourcePreviewLoaded || finalRuntime.surfaceBrowserLoaded),
    consoleErrors,
    failedRequests,
    ignoredAbortedRequests,
  };

  return {
    viewport,
    ok:
      checks.status === 200 &&
      checks.hasMerserText &&
      checks.hasSkyesLogo &&
      checks.hasManifest &&
      checks.canvasCount > 0 &&
      Boolean(checks.canvasBox?.width && checks.canvasBox?.height) &&
      checks.actionCount >= 12 &&
      checks.runtimeStackActive &&
      checks.dragMoved &&
      checks.sourcePreviewLoaded &&
      consoleErrors.length === 0 &&
      failedRequests.length === 0,
    checks,
  };
}

async function unlockZeroOs(page, ownerCode) {
  await page.goto(`${zeroOsBase}/admin/login.html?return=%2Fskyeway.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
  const input = (await firstVisible(page, 'input[type="password"]')) || (await firstVisible(page, "input"));
  if (!input) throw new Error("Could not find 0S owner login input");
  await input.fill(ownerCode);
  await clickVisible(page, 'button:has-text("Unlock Owner Session")', [], "unlock owner session");
  await page.waitForURL(/skyeway|admin|\/$/, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function proofZeroOs(browser, viewport, artifactDir, ownerCode) {
  process.stderr.write(`[merser-proof] 0S ${viewport.width}x${viewport.height}\n`);
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, deviceScaleFactor: 1 });
  const loginResponse = await context.request.post(`${zeroOsBase}/api/owner/admin-login`, {
    data: { code: ownerCode },
  });
  const loginPayload = await loginResponse.json().catch(() => ({}));
  if (!loginResponse.ok() || !loginPayload.token) {
    await context.close();
    throw new Error(`0S owner session setup failed with status ${loginResponse.status()}`);
  }
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), method: request.method(), failure: request.failure()?.errorText || "request failed" });
  });
  const routes = [
    { name: "home", url: `${zeroOsBase}/`, expect: "Merser" },
    { name: "skyeway", url: `${zeroOsBase}/skyeway.html`, expect: "Merser by Skyes Over London" },
    { name: "changelog", url: `${zeroOsBase}/changelog/`, expect: "Merser by Skyes Over London" },
    { name: "valuation", url: `${zeroOsBase}/admin/site-valuation.html`, expect: "Merser by Skyes Over London" },
  ];
  const checks = [];
  for (const route of routes) {
    const response = await page.goto(route.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    const bodyText = await page.locator("body").innerText({ timeout: 6000 }).catch(() => "");
    await maybeScreenshot(page, path.join(artifactDir, `0s-${route.name}-${viewport.width}x${viewport.height}.png`));
    checks.push({
      ...route,
      status: response?.status() || 0,
      finalUrl: page.url(),
      found: bodyText.includes(route.expect),
      redirectedToLogin: page.url().includes("/admin/login.html"),
    });
  }
  await context.close();
  return {
    viewport,
    authSetup: {
      ok: true,
      method: "shared-owner-admin-session",
      tokenReceived: Boolean(loginPayload.token),
      gateTokenReceived: Boolean(loginPayload.gateToken || loginPayload.gateBearerToken),
    },
    ok: checks.every((check) => check.status === 200 && check.found && !check.redirectedToLogin) && consoleErrors.length === 0 && failedRequests.length === 0,
    checks,
    consoleErrors,
    failedRequests,
  };
}

async function proofMarketing(browser, viewport, artifactDir) {
  process.stderr.write(`[merser-proof] marketing ${viewport.width}x${viewport.height}\n`);
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), method: request.method(), failure: request.failure()?.errorText || "request failed" });
  });
  const response = await page.goto(marketingUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 9000 }).catch(() => {});
  const actions = [];
  await clickVisible(page, 'a:has-text("Dev Free Sauce")', actions, "clicked Dev Free Sauce marketing link");
  await page.waitForURL(/dev-free-sauce/, { timeout: 12000 }).catch(() => {});
  await page.waitForSelector("text=Merser by Skyes Over London", { timeout: 12000 });
  await clickVisible(page, 'a:has-text("Open live world")', actions, "clicked Open live world");
  await page.waitForTimeout(800);
  const pages = context.pages();
  const external = pages.find((candidate) => candidate !== page && candidate.url().includes("merser.pages.dev"));
  const bodyText = await page.locator("body").innerText({ timeout: 6000 }).catch(() => "");
  await maybeScreenshot(page, path.join(artifactDir, `marketing-${viewport.width}x${viewport.height}.png`));
  await context.close();
  return {
    viewport,
    ok:
      response?.status() === 200 &&
      bodyText.includes("Merser by Skyes Over London") &&
      bodyText.includes("@skyes0verl0nd0n/merser") &&
      bodyText.includes("1.0.1") &&
      actions.length > 0 &&
      consoleErrors.length === 0 &&
      failedRequests.length === 0,
    status: response?.status() || 0,
    hasMerserText: bodyText.includes("Merser by Skyes Over London"),
    hasPackage: bodyText.includes("@skyes0verl0nd0n/merser"),
    hasVersion: bodyText.includes("1.0.1"),
    actions,
    openedMerserTab: Boolean(external),
    consoleErrors,
    failedRequests,
  };
}

async function proofNpm(browser, artifactDir) {
  process.stderr.write("[merser-proof] npm package page\n");
  const context = await browser.newContext({ viewport: { width: 1366, height: 920 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), method: request.method(), failure: request.failure()?.errorText || "request failed" });
  });
  const response = await page.goto(npmPackageUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  const bodyText = await page.locator("body").innerText({ timeout: 12000 }).catch(() => "");
  await maybeScreenshot(page, path.join(artifactDir, "npm-package-page.png"));
  await context.close();
  return {
    ok: response?.status() === 200 && bodyText.includes("@skyes0verl0nd0n/merser") && bodyText.includes("1.0.1"),
    status: response?.status() || 0,
    hasPackage: bodyText.includes("@skyes0verl0nd0n/merser"),
    hasVersion: bodyText.includes("1.0.1"),
    consoleErrors,
    failedRequests,
  };
}

async function main() {
  const artifactRoot = path.join(repoRoot, "test-artifacts", "merser-release-proof");
  const artifactDir = path.join(artifactRoot, stamp());
  fs.mkdirSync(artifactDir, { recursive: true });
  const ownerCode = readOwnerCode();
  const browser = await chromium.launch({ headless: false, slowMo: 20 });
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    mode: "headed-live-browser",
    headless: false,
    urls: {
      merser: merserUrl,
      zeroOs: zeroOsBase,
      marketing: marketingUrl,
      devFreeSauce: devFreeSauceUrl,
      npmPackage: npmPackageUrl,
    },
    artifactDir,
    stressReceipt: "test-artifacts/merser-mcp-stress/2026-05-21T17-46-33-242Z-merser-mcp-stress-report.json",
    results: {},
  };

  try {
    const desktop = { width: 1440, height: 980 };
    const mobile = { width: 390, height: 844 };
    report.results.merser = [
      await proofMerserViewport(browser, desktop, artifactDir),
      await proofMerserViewport(browser, mobile, artifactDir),
    ];
    report.results.zeroOs = [
      await proofZeroOs(browser, desktop, artifactDir, ownerCode),
      await proofZeroOs(browser, mobile, artifactDir, ownerCode),
    ];
    report.results.marketing = [
      await proofMarketing(browser, desktop, artifactDir),
      await proofMarketing(browser, mobile, artifactDir),
    ];
    report.results.npm = [await proofNpm(browser, artifactDir)];
    report.ok = Object.values(report.results).flat().every((result) => result.ok);
  } catch (error) {
    report.error = error instanceof Error ? error.stack || error.message : String(error);
  } finally {
    await browser.close().catch(() => {});
  }

  const reportPath = path.join(artifactDir, "live-headed-browser-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.copyFileSync(reportPath, path.join(artifactRoot, "latest-live-headed-browser-report.json"));
  console.log(JSON.stringify({ ok: report.ok, report: reportPath }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
