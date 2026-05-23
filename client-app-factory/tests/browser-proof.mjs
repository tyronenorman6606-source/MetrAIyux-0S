#!/usr/bin/env node
import { copyFile, mkdir, readdir, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:4199";
const searchTerm = process.argv[3] || "As You Wish Pottery";
const base = new URL(baseUrl);
const apiBase = (() => {
  const mountPath = base.pathname.replace(/\/+$/, "");
  if (!mountPath || mountPath === "/") return `${base.origin}/api`;
  return `${base.origin}/api/client-app-factory`;
})();
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const artifactDir = path.join(repoRoot, "test-artifacts/client-app-factory");
const publicProofDir = path.join(repoRoot, "client-app-factory/assets/proof");
const publicVideoPath = path.join(publicProofDir, "client-app-factory-workflow.webm");
const publicPosterPath = path.join(publicProofDir, "client-app-factory-workflow-poster.png");
const artifactVideoPath = path.join(artifactDir, "client-app-factory-workflow.webm");
const artifactPosterPath = path.join(artifactDir, "client-app-factory-workflow-poster.png");

await mkdir(artifactDir, { recursive: true });
await mkdir(publicProofDir, { recursive: true });

async function clearOldProofArtifacts(folder) {
  const entries = await readdir(folder).catch(() => []);
  await Promise.all(entries
    .filter((name) =>
      name.startsWith("page@")
      || name === "client-app-factory-workflow.webm"
      || name === "client-app-factory-workflow-poster.png"
      || name === "desktop.png"
      || name === "mobile.png"
      || name === "video-playback.png"
      || name === "browser-proof.json")
    .map((name) => rm(path.join(folder, name), { force: true })));
}

await clearOldProofArtifacts(artifactDir);

const browser = await chromium.launch({ headless: true });

const results = {
  baseUrl,
  checkedAt: new Date().toISOString(),
  pages: [],
  consoleErrors: [],
  requestFailures: [],
  assertions: {}
};

function watchPage(page) {
  page.on("console", (message) => {
    if (message.type() === "error") results.consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      results.requestFailures.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method()
      });
    }
  });
}

async function gotoApp(page, target = baseUrl) {
  await page.goto(target, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const status = document.querySelector("[data-backend-status]")?.textContent || "";
    const nav = document.querySelectorAll(".nav-pill").length;
    return nav >= 5 && /Factory API|Client imported|Running|completed|Unable/i.test(status);
  }, null, { timeout: 30000 });
}

async function waitForGeneratedRoute(page, baseHref) {
  const routeLink = page.locator(".route-row .text-link").first();
  await routeLink.waitFor({ state: "visible", timeout: 30000 });
  const href = await routeLink.getAttribute("href");
  const target = new URL(href, baseHref).toString();
  const response = await page.goto(target, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const text = (document.body?.innerText || "").trim();
    return text.length > 120 && !/Not found/i.test(text) && !/runtime unavailable/i.test(text);
  }, null, { timeout: 20000 });
  return { href: target, status: response?.status() || 0 };
}

async function visit(name, viewport, options = {}) {
  console.log(`[proof] visit:start ${name}`);
  const context = await browser.newContext({
    viewport,
    serviceWorkers: "block",
    recordVideo: options.recordVideo ? { dir: artifactDir, size: viewport } : undefined
  });
  const page = await context.newPage();
  watchPage(page);

  await gotoApp(page, `${baseUrl.replace(/\/$/, "")}/clients/`);
  await page.waitForSelector("[data-valley-results] .result-card", { timeout: 30000 });

  const screenshotPath = path.join(artifactDir, `${name}.png`);
  const publicScreenshotPath = path.join(publicProofDir, `client-app-factory-${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await copyFile(screenshotPath, publicScreenshotPath);

  const pageResults = {
    name,
    viewport,
    searchTerm,
    title: await page.title(),
    navCount: await page.locator(".nav-pill").count(),
    hasHorizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1),
    backendStatusBefore: await page.locator("[data-backend-status]").textContent()
  };

  const valleyCount = await page.locator("[data-valley-results] .result-card").count();
  pageResults.valleyItemCount = valleyCount;

  const search = page.locator("[data-valley-search]");
  await search.fill(searchTerm);
  await page.waitForTimeout(400);

  const matchedCard = page.locator("[data-valley-results] .result-card").filter({ hasText: searchTerm }).first();
  pageResults.matchedCardCount = await matchedCard.count();

  const importResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/factory/valley/import")
    && response.request().method() === "POST"
    && response.status() === 200
  , { timeout: 30000 });

  await matchedCard.getByRole("button", { name: /Import \+ Build/i }).click();
  const importResponse = await importResponsePromise;
  const importPayload = await importResponse.json();

  await page.waitForURL(/\/builder\/\?clientId=.*autorun=full/, { timeout: 30000 });
  await page.waitForFunction(() => {
    const status = document.querySelector("[data-backend-status]")?.textContent || "";
    return /Running full stage/i.test(status);
  }, null, { timeout: 20000 });

  const runResponse = await page.waitForResponse((response) =>
    response.url().includes("/factory/run")
    && response.request().method() === "POST"
    && response.status() === 200
  , { timeout: 120000 });
  const runPayload = await runResponse.json();

  await page.waitForURL(/\/proofs\/\?clientId=/, { timeout: 60000 });
  await page.waitForFunction(() => {
    const status = document.querySelector("[data-backend-status]")?.textContent || "";
    return /Full factory pipeline completed/i.test(status);
  }, null, { timeout: 20000 });

  pageResults.clientName = await page.locator("[data-client-name]").textContent();
  pageResults.backendStatusAfter = await page.locator("[data-backend-status]").textContent();
  pageResults.proofArtifactCount = await page.locator("[data-proof-grid] .artifact-card").count();
  pageResults.ledgerCountAfterRun = await page.locator("[data-proof-ledger] .ledger-event").count();
  pageResults.importPayload = {
    ok: importPayload.ok,
    clientId: importPayload.record?.clientId || null,
    clientName: importPayload.record?.displayName || null
  };
  pageResults.runPayload = {
    ok: runPayload.ok,
    clientId: runPayload.clientId,
    clientName: runPayload.record?.displayName || null,
    verifiedOk: runPayload.verified?.ok ?? null,
    ledgerCount: runPayload.ledger?.length || 0
  };

  const recordPayload = await page.evaluate(async ({ apiBaseUrl, clientId }) => {
    const response = await fetch(`${apiBaseUrl}/factory/records/${encodeURIComponent(clientId)}`, { cache: "no-store" });
    return response.json();
  }, { apiBaseUrl: apiBase, clientId: runPayload.clientId });
  const record = recordPayload.record || {};
  pageResults.recordClientId = record.clientId;
  pageResults.recordClean = JSON.stringify({
    generatedApps: record.generatedApps || [],
    enhancementReports: record.enhancementReports || [],
    verificationReports: record.verificationReports || [],
    proofArtifacts: record.proofArtifacts || [],
    scannerReports: record.scannerReports || []
  });
  pageResults.recordHasTemplateLeak = /skye-app-template/i.test(pageResults.recordClean);

  await page.goto(`${baseUrl.replace(/\/$/, "")}/auren/?clientId=${encodeURIComponent(runPayload.clientId)}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-auren-log] .auren-bubble.assistant", { timeout: 20000 });
  const assistantCountBefore = await page.locator(".auren-bubble.assistant").count();
  const latestAssistantBefore = await page.locator(".auren-bubble.assistant").last().textContent();
  await page.locator("[data-auren-form] textarea[name='message']").fill("What still needs polish for this client build?");
  await page.getByRole("button", { name: /Ask Auren/i }).click();
  await page.waitForFunction(({ countBefore, latestBefore }) => {
    const bubbles = Array.from(document.querySelectorAll(".auren-bubble.assistant"));
    const latest = (bubbles.at(-1)?.textContent || "").trim();
    return bubbles.length > countBefore || (latest.length > 40 && latest !== latestBefore);
  }, { countBefore: assistantCountBefore, latestBefore: (latestAssistantBefore || "").trim() }, { timeout: 45000 });
  pageResults.aurenAssistantCount = await page.locator(".auren-bubble.assistant").count();
  pageResults.aurenLatestReply = await page.locator(".auren-bubble.assistant").last().textContent();

  await page.goto(`${baseUrl.replace(/\/$/, "")}/generated-apps/?clientId=${encodeURIComponent(runPayload.clientId)}`, { waitUntil: "domcontentloaded" });
  const generatedRoute = await waitForGeneratedRoute(page, baseUrl);
  pageResults.firstRouteStatus = generatedRoute.status;
  pageResults.firstRouteHref = generatedRoute.href;

  await gotoApp(page, `${baseUrl.replace(/\/$/, "")}/media/?clientId=${encodeURIComponent(runPayload.clientId)}`);
  await page.locator('input[name="assetFile"]').setInputFiles({
    name: `${name}-browser-proof-asset.txt`,
    mimeType: "text/plain",
    buffer: Buffer.from(`Browser proof upload from ${name}`)
  });
  await page.locator('input[name="provenance"]').fill("playwright-browser-proof");
  await page.getByRole("button", { name: "Catalog asset" }).click();
  await page.waitForSelector(".asset-card", { timeout: 15000 });
  pageResults.assetCataloged = await page.locator(".asset-card").filter({ hasText: "playwright-browser-proof" }).count();

  if (options.recordVideo) {
    await page.goto(`${baseUrl.replace(/\/$/, "")}/proofs/?clientId=${encodeURIComponent(runPayload.clientId)}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!document.querySelector("[data-proof-video]"), null, { timeout: 20000 });
    const playback = await page.evaluate(() => {
      const node = document.querySelector("[data-proof-video]");
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        src: node.currentSrc || node.getAttribute("src") || "",
        readyState: node.readyState,
        visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
      };
    });
    if (playback?.src) {
      const assetResponse = await fetch(new URL(playback.src, baseUrl));
      playback.assetStatus = assetResponse.status;
      playback.assetContentType = assetResponse.headers.get("content-type") || "";
    }
    const playbackShot = path.join(artifactDir, "video-playback.png");
    await page.screenshot({ path: playbackShot, fullPage: true });
    await copyFile(playbackShot, publicPosterPath);
    await copyFile(playbackShot, artifactPosterPath);
    results.videoProof = {
      ...(results.videoProof || {}),
      playback
    };
  }

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
      ...(results.videoProof || {}),
      publicAsset: path.relative(repoRoot, publicVideoPath),
      artifact: path.relative(repoRoot, artifactVideoPath),
      recordedViewport: viewport,
      actionPath: `goto clients, search ${searchTerm}, import plus build, allow autorun, review proofs, ask Auren, open generated route, catalog proof asset, verify proof reel`
    };
  }
  console.log(`[proof] visit:end ${name}`);
}

await visit("desktop", { width: 1600, height: 1100 }, { recordVideo: true });
await visit("mobile", { width: 430, height: 932 });

results.assertions = {
  noConsoleErrors: results.consoleErrors.length === 0,
  noRequestFailures: results.requestFailures.length === 0,
  valleyClientsLoaded: results.pages.every((page) => (page.valleyItemCount || 0) > 0),
  matchedClientFound: results.pages.every((page) => (page.matchedCardCount || 0) > 0),
  importSucceeded: results.pages.every((page) => page.importPayload?.ok === true),
  runSucceeded: results.pages.every((page) => page.runPayload?.ok === true),
  recordClean: results.pages.every((page) => page.recordHasTemplateLeak === false),
  scannerProofPresent: results.pages.every((page) => (page.proofArtifactCount || 0) > 0),
  generatedRouteOpened: results.pages.every((page) => page.firstRouteStatus === 200),
  assetUploadSaved: results.pages.every((page) => (page.assetCataloged || 0) > 0),
  aurenResponded: results.pages.every((page) => (page.aurenAssistantCount || 0) >= 1 && (page.aurenLatestReply || "").trim().length > 40),
  videoPlaybackVerified: Boolean(
    results.videoProof?.playback
    && results.videoProof.playback.visible
    && results.videoProof.playback.assetStatus === 200
    && /^video\//i.test(results.videoProof.playback.assetContentType || "")
  ),
  noHorizontalOverflow: results.pages.every((page) => page.hasHorizontalOverflow === false)
};

await browser.close();

await writeFile(
  path.join(artifactDir, "browser-proof.json"),
  `${JSON.stringify(results, null, 2)}\n`,
  "utf8"
);

console.log(JSON.stringify(results, null, 2));

const failedAssertions = Object.entries(results.assertions)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);

if (failedAssertions.length) {
  console.error(`Client App Factory browser proof failed: ${failedAssertions.join(", ")}`);
  process.exit(1);
}
