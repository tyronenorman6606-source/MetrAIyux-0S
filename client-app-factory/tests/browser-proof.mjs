#!/usr/bin/env node
import { copyFile, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:4199";
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const artifactDir = path.join(repoRoot, "test-artifacts/client-app-factory");
const publicProofDir = path.join(repoRoot, "client-app-factory/assets/proof");
const publicVideoPath = path.join(publicProofDir, "client-app-factory-workflow.webm");
const publicPosterPath = path.join(publicProofDir, "client-app-factory-workflow-poster.png");
const artifactVideoPath = path.join(artifactDir, "client-app-factory-workflow.webm");
const artifactPosterPath = path.join(artifactDir, "client-app-factory-workflow-poster.png");
await mkdir(artifactDir, { recursive: true });
await mkdir(publicProofDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = {
  baseUrl,
  checkedAt: new Date().toISOString(),
  pages: [],
  consoleErrors: [],
  requests404: [],
  assertions: {}
};

function watchPage(page) {
  page.on("console", (message) => {
    if (message.type() === "error") results.consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() === 404) results.requests404.push(response.url());
  });
}

async function visit(name, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    recordVideo: options.recordVideo ? { dir: artifactDir, size: viewport } : undefined
  });
  const page = await context.newPage();
  watchPage(page);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("[data-backend-status]")?.textContent?.includes("Factory API live"), null, { timeout: 10000 });
  const screenshotPath = path.join(artifactDir, `${name}.png`);
  const publicScreenshotPath = path.join(publicProofDir, `client-app-factory-${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await copyFile(screenshotPath, publicScreenshotPath);
  const pageResults = {
    name,
    viewport,
    title: await page.title(),
    roomCount: await page.locator(".room-tab").count(),
    hasHorizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1),
    activeRoom: await page.locator(".room.active").first().getAttribute("data-room"),
    pwaManifest: Boolean(await page.locator('link[rel="manifest"]').count()),
    backendStatus: await page.locator("[data-backend-status]").textContent()
  };

  await page.getByRole("button", { name: "Source Scanner" }).click();
  await page.getByRole("button", { name: "Load Latest Scan Report" }).click();
  await page.waitForFunction(() => document.querySelector("[data-scan-output]")?.textContent?.includes('"checkedAt"'), null, { timeout: 20000 });
  pageResults.scanVisible = await page.locator("[data-scan-output]").textContent();

  await page.getByRole("button", { name: "Run Factory Pass" }).click();
  await page.waitForFunction(() => document.querySelector("[data-backend-status]")?.textContent?.includes("Factory API wrote full pass"), null, { timeout: 30000 });
  pageResults.proofActive = await page.locator('.room.active[data-room="proof"]').count();
  pageResults.ledgerCountAfterRun = await page.locator(".ledger-event").count();

  await page.getByRole("button", { name: "App Builder" }).click();
  pageResults.routeCount = await page.locator(".route-item").count();
  const firstRoute = await page.locator(".route-item a").first().getAttribute("href");
  const routeResponse = await page.goto(new URL(firstRoute, baseUrl).toString(), { waitUntil: "domcontentloaded" });
  pageResults.firstRouteStatus = routeResponse?.status() || 0;
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Client Intake" }).click();
  await page.locator('input[name="displayName"]').fill("Empire Pallets QA");
  await page.getByRole("button", { name: "Save Intake Record" }).click();
  await page.waitForFunction(() => document.querySelector("[data-backend-status]")?.textContent?.includes("Intake saved"), null, { timeout: 10000 });
  pageResults.savedClient = await page.locator("[data-client-name]").textContent();

  await page.getByRole("button", { name: "Asset Vault" }).click();
  await page.locator('input[name="assetFile"]').setInputFiles({
    name: `${name}-browser-proof-asset.txt`,
    mimeType: "text/plain",
    buffer: Buffer.from(`Browser proof upload from ${name}`)
  });
  await page.locator('input[name="provenance"]').fill("playwright-browser-proof");
  await page.getByRole("button", { name: "Catalog Asset" }).click();
  await page.waitForFunction(() => document.querySelector("[data-backend-status]")?.textContent?.includes("Asset cataloged"), null, { timeout: 10000 });
  pageResults.assetCataloged = await page.locator(".asset-item").filter({ hasText: "playwright-browser-proof" }).count();

  results.pages.push(pageResults);
  const video = page.video();
  await page.close();
  await context.close();
  if (options.recordVideo && video) {
    const tempVideoPath = await video.path();
    await copyFile(tempVideoPath, publicVideoPath);
    await copyFile(tempVideoPath, artifactVideoPath);
    if (tempVideoPath !== artifactVideoPath) {
      await unlink(tempVideoPath).catch(() => {});
    }
    results.videoProof = {
      publicAsset: path.relative(repoRoot, publicVideoPath),
      artifact: path.relative(repoRoot, artifactVideoPath),
      recordedViewport: viewport,
    actionPath: "goto factory app, open Source Scanner, load scan, run factory pass into Proof Room, open App Builder route map, open packaged Empire Pallets route, edit Client Intake, save record"
      + ", open Asset Vault, upload proof asset, catalog asset into backend storage"
    };
  }
}

await visit("desktop", { width: 1440, height: 1000 }, { recordVideo: true });
await visit("mobile", { width: 390, height: 844 });

async function verifyVideoPlayback(playbackBrowser) {
  const context = await playbackBrowser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  watchPage(page);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Proof Room" }).click();
  const video = page.locator("[data-proof-video]");
  await video.evaluate((node) => {
    node.muted = true;
    node.currentTime = 0;
    return node.play();
  });
  await page.waitForTimeout(1400);
  const playback = await video.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      src: node.currentSrc,
      readyState: node.readyState,
      currentTime: node.currentTime,
      paused: node.paused,
      visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
    };
  });
  const playbackShot = path.join(artifactDir, "video-playback.png");
  await page.screenshot({ path: playbackShot, fullPage: true });
  await copyFile(playbackShot, publicPosterPath);
  await copyFile(playbackShot, artifactPosterPath);
  await context.close();
  return playback;
}

results.videoProof = {
  ...(results.videoProof || {}),
  playback: await verifyVideoPlayback(browser).catch(async () => {
    const retryBrowser = await chromium.launch({ headless: true });
    try {
      return await verifyVideoPlayback(retryBrowser);
    } finally {
      await retryBrowser.close().catch(() => {});
    }
  })
};

results.assertions = {
  noConsoleErrors: results.consoleErrors.length === 0,
  no404s: results.requests404.length === 0,
  noHorizontalOverflow: results.pages.every((page) => !page.hasHorizontalOverflow),
  roomsPresent: results.pages.every((page) => page.roomCount >= 10),
  pwaDetected: results.pages.every((page) => page.pwaManifest),
  backendApiLive: results.pages.every((page) => page.backendStatus?.includes("Factory API live")),
  routeMapWorks: results.pages.every((page) => page.routeCount >= 5),
  packagedRouteOpens: results.pages.every((page) => page.firstRouteStatus >= 200 && page.firstRouteStatus < 400),
  formSaves: results.pages.every((page) => page.savedClient === "Empire Pallets QA"),
  assetUploadSaves: results.pages.every((page) => page.assetCataloged >= 1),
  ledgerRendersEvents: results.pages.every((page) => page.ledgerCountAfterRun >= 1),
  scannerLoaded: results.pages.every((page) => page.scanVisible?.includes('"checkedAt"') && page.scanVisible?.includes('"empireRoutes"')),
  factoryPassOpensProof: results.pages.every((page) => page.proofActive === 1),
  videoPlaybackVerified: results.videoProof.playback.readyState >= 2
    && results.videoProof.playback.currentTime > 0
    && results.videoProof.playback.paused === false
    && results.videoProof.playback.visible === true
};

await browser.close();

const failures = Object.entries(results.assertions)
  .filter(([, pass]) => !pass)
  .map(([name]) => name);

await writeFile(path.join(artifactDir, "browser-proof.json"), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));

if (failures.length) {
  console.error(`Browser proof failed: ${failures.join(", ")}`);
  process.exit(1);
}
