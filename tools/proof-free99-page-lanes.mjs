#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { resolveZeroOsGateAuth } from "./lib/zero-os-gate-auth.mjs";

const repoRoot = "/workspaces/MetrAIyux-0S";
const siteRoot = path.join(repoRoot, "metraiyux_0s_site");
const mode = (process.env.PROOF_TARGET || "local").toLowerCase();
const isProduction = mode === "production";
const productionBaseUrl = (process.env.PROOF_BASE_URL || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, "");
const ownerEmail = process.env.PROOF_OWNER_EMAIL || "owner-proof@metraiyux.local";
const slowMo = Number(process.env.LIVE_BROWSER_SLOWMO || 55);
const sourceImage = path.join(siteRoot, "assets", "metraiyux-0s-emblem-transparent.png");
const logoImage = path.join(siteRoot, "assets", "metraiyux-0s-logo-transparent.png");

const appRoutes = {
  still2vid: "/Free99/apps/still2vid-forge/index.html",
  brandforge: "/Free99/apps/brandforge/brandforge_campaign_studio_v5_uploaded_intro_silent.html?skipIntro=1",
  skyepics: "/Free99/apps/skyepics/dist/index.html"
};

let baseUrl = productionBaseUrl;
let adminBearerToken = "";

async function resolveLiveGateCredential() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: baseUrl });
  const token = String(auth.token || "").replace(/^Bearer(?:\s+|$)/i, "").trim();
  if (!auth.ok || !token) return { token: "" };
  return { token };
}

function cleanFailure(error) {
  return String(error?.stack || error?.message || error)
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, "$1[redacted]")
    .replace(/(code=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/(session_id=)[^&\s)]+/gi, "$1[redacted]")
    .split("\n")
    .slice(0, 10)
    .join("\n");
}

function deepRedact(value) {
  if (typeof value === "string") return cleanFailure(value);
  if (Array.isArray(value)) return value.map((item) => deepRedact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepRedact(item)]));
  }
  return value;
}

function redactUrl(raw) {
  try {
    const url = new URL(raw);
    const first = url.pathname.split("/").filter(Boolean)[0] || "";
    return { host: url.host, path: first ? `/${first}/...` : "/", hasQuery: url.searchParams.size > 0 };
  } catch {
    return { host: "", path: "", hasQuery: false };
  }
}

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

function urlFor(route) {
  return new URL(route, baseUrl).toString();
}

function slug(value) {
  return String(value || "proof")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "proof";
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2"
  }[ext] || "application/octet-stream";
}

async function startStaticServer() {
  const server = http.createServer((request, response) => {
    try {
      const parsed = new URL(request.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(parsed.pathname);
      if (pathname === "/") pathname = "/index.html";
      let file = path.normalize(path.join(siteRoot, pathname));
      if (!file.startsWith(siteRoot)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }
      response.writeHead(200, { "content-type": contentType(file), "cache-control": "no-store" });
      fs.createReadStream(file).pipe(response);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(cleanFailure(error));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server;
}

async function checkUnauthGate(route) {
  const response = await fetch(urlFor(route), { redirect: "manual" });
  const location = response.headers.get("location") || "";
  return {
    route,
    status: response.status,
    locationPath: location ? new URL(location, baseUrl).pathname : "",
    locationSearchHasReturn: location ? new URL(location, baseUrl).search.includes("return=") : false,
    gateHeader: response.headers.get("x-0s-gate") || "",
    ok: response.status === 302 && location.includes("/admin/login.html") && location.includes("return=")
  };
}

function pushStatus(entry, name, ok, state = {}) {
  entry.statuses.push({ name, ok: Boolean(ok), state });
}

async function screenshot(page, entry, artifactDir, name, fullPage = false) {
  const file = path.join(artifactDir, `${entry.label}-${slug(name)}.png`);
  await page.screenshot({ path: file, fullPage });
  entry.screenshots.push(file);
  return file;
}

async function visibleMetrics(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText || "";
    const elements = [...document.querySelectorAll("body *")];
    const visibleElements = elements.filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 1 && rect.height > 1
        && style.visibility !== "hidden"
        && style.display !== "none"
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < innerHeight
        && rect.left < innerWidth;
    }).length;
    const images = [...document.images].map((img) => ({
      src: img.currentSrc || img.src || "",
      complete: img.complete,
      width: img.naturalWidth || 0,
      height: img.naturalHeight || 0
    }));
    const brokenImages = images.filter((img) => img.src && (!img.complete || img.width < 1 || img.height < 1)).length;
    const canvases = [...document.querySelectorAll("canvas")].map((canvas) => ({ width: canvas.width, height: canvas.height }));
    const maxRight = Math.max(document.documentElement.scrollWidth || 0, document.body?.scrollWidth || 0);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      textLength: text.trim().length,
      visibleElements,
      imageCount: images.length,
      brokenImages,
      canvasCount: canvases.length,
      canvases,
      horizontalOverflowPx: Math.max(0, maxRight - document.documentElement.clientWidth),
      scrollHeight: document.documentElement.scrollHeight,
      path: location.pathname,
      title: document.title
    };
  });
}

async function canvasProof(page, selector) {
  return page.evaluate((canvasSelector) => {
    const canvas = document.querySelector(canvasSelector);
    if (!canvas) return { present: false, paintedPixels: 0, width: 0, height: 0, variedChannels: 0 };
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { present: true, paintedPixels: 0, width: canvas.width, height: canvas.height, variedChannels: 0 };
    const width = Math.max(1, Math.min(canvas.width, 420));
    const height = Math.max(1, Math.min(canvas.height, 420));
    const data = ctx.getImageData(0, 0, width, height).data;
    let paintedPixels = 0;
    const samples = new Set();
    for (let index = 0; index < data.length; index += 4 * 31) {
      const alpha = data[index + 3];
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      if (alpha > 0 && red + green + blue > 6) paintedPixels += 1;
      samples.add(`${Math.round(red / 24)}:${Math.round(green / 24)}:${Math.round(blue / 24)}:${Math.round(alpha / 24)}`);
    }
    return { present: true, paintedPixels, width: canvas.width, height: canvas.height, variedChannels: samples.size };
  }, selector);
}

async function visualStop(page, entry, artifactDir, name, options = {}) {
  const metrics = await visibleMetrics(page);
  const canvas = options.canvasSelector ? await canvasProof(page, options.canvasSelector) : null;
  const file = await screenshot(page, entry, artifactDir, name, false);
  entry.scrollStops.push({ name, screenshot: file, metrics, canvas });
  const canvasOk = options.requireCanvas ? Boolean(canvas?.present && canvas.paintedPixels > 8 && canvas.variedChannels > 2) : true;
  const ok = metrics.textLength > 40
    && metrics.visibleElements > 8
    && metrics.brokenImages === 0
    && metrics.horizontalOverflowPx < 32
    && canvasOk;
  pushStatus(entry, `visual_nonblank_${slug(name)}`, ok, { metrics, canvas });
}

async function scrollHuman(page, entry, artifactDir, name, options = {}) {
  const scrollHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0));
  const viewportHeight = entry.viewport.height;
  const stops = [...new Set([0, Math.max(0, Math.round((scrollHeight - viewportHeight) / 2)), Math.max(0, scrollHeight - viewportHeight)])];
  let index = 0;
  for (const stop of stops) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), stop);
    await page.waitForTimeout(180);
    await page.mouse.wheel(0, 280).catch(() => {});
    await page.waitForTimeout(120);
    await visualStop(page, entry, artifactDir, `${name}-scroll-${index}`, options);
    index += 1;
  }
}

function attachWatchers(page, entry) {
  page.on("console", (message) => {
    if (!isProduction && message.type() === "error" && /^Failed to load resource: the server responded with a status of 404/i.test(message.text())) {
      entry.ignoredNetwork.push({ source: "console", text: cleanFailure(message.text()) });
      return;
    }
    if (message.type() === "error") entry.consoleErrors.push(cleanFailure(message.text()));
  });
  page.on("pageerror", (error) => {
    entry.consoleErrors.push(cleanFailure(error));
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.startsWith("data:") || url.startsWith("blob:")) return;
    entry.failedRequests.push({
      url: redactUrl(url),
      method: request.method(),
      failure: cleanFailure(request.failure()?.errorText || "request failed")
    });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status < 400) return;
    const url = response.url();
    const pathname = new URL(url).pathname;
    if (url.startsWith("data:") || url.startsWith("blob:") || /\/favicon\.ico$/.test(pathname)) return;
    if (!isProduction && pathname.startsWith("/api/")) {
      entry.ignoredNetwork.push({
        url: redactUrl(url),
        status,
        method: response.request().method(),
        resourceType: response.request().resourceType()
      });
      return;
    }
    entry.httpErrors.push({
      url: redactUrl(url),
      status,
      method: response.request().method(),
      resourceType: response.request().resourceType()
    });
  });
}

async function downloadFromClick(page, entry, artifactDir, selector, label) {
  const locator = page.locator(selector).first();
  if (!(await locator.isVisible().catch(() => false))) {
    pushStatus(entry, `download_control_visible_${slug(label)}`, false, { selector });
    return null;
  }
  const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
  await locator.click();
  const download = await downloadPromise;
  const suggested = download.suggestedFilename();
  const file = path.join(artifactDir, `${entry.label}-${slug(label)}-${suggested.replace(/[^a-z0-9_.-]+/gi, "-")}`);
  await download.saveAs(file);
  const bytes = fs.existsSync(file) ? fs.statSync(file).size : 0;
  entry.downloads.push({ path: file, suggestedFilename: suggested, bytes });
  entry.actions.push(`downloaded ${label}: ${suggested}`);
  pushStatus(entry, `download_saved_${slug(label)}`, bytes > 400, { suggestedFilename: suggested, bytes });
  return file;
}

async function openStill2VidPage(page, entry, artifactDir, lane) {
  await page.locator(`button[data-page-target="${lane}"]`).click();
  entry.actions.push(`Still2Vid opened ${lane} page`);
  await page.waitForFunction((target) => document.querySelector(".app")?.dataset.activePage === target, lane, { timeout: 10000 });
  await visualStop(page, entry, artifactDir, `still2vid-${lane}`, { canvasSelector: "#stageCanvas", requireCanvas: lane === "preview" });
}

async function exerciseStill2Vid(page, entry, artifactDir) {
  const response = await page.goto(urlFor(appRoutes.still2vid), { waitUntil: "domcontentloaded", timeout: 45000 });
  pushStatus(entry, "still2vid_route_loaded", Boolean(response?.ok()), { status: response?.status() || 0, url: page.url() });
  await page.waitForSelector("#stageCanvas", { state: "attached", timeout: 25000 });
  await openStill2VidPage(page, entry, artifactDir, "source");
  await page.selectOption("#identityMode", "operator-upload");
  await page.fill("#identitySourceUrl", "/assets/metraiyux-0s-emblem-transparent.png");
  await page.fill("#identityReceipt", "Browser proof loaded the real repo MetrAIyux 0S emblem asset and verified canvas export locally in-app.");
  await page.setInputFiles("#imageInput", sourceImage);
  entry.actions.push("Still2Vid uploaded MetrAIyux emblem source image");
  await page.waitForFunction(() => /Loaded/i.test(document.querySelector("#sourceHint")?.textContent || ""), null, { timeout: 20000 });
  await openStill2VidPage(page, entry, artifactDir, "canvas");
  await page.locator("#fitBtn").click();
  entry.actions.push("Still2Vid fit image cleanly");
  await openStill2VidPage(page, entry, artifactDir, "repair");
  await page.locator("#autoFixBtn").click();
  entry.actions.push("Still2Vid ran Auto Fix");
  await page.locator("#brightness").fill("112");
  await page.locator("#brightness").dispatchEvent("input");
  await page.locator("#contrast").fill("125");
  await page.locator("#contrast").dispatchEvent("input");
  entry.actions.push("Still2Vid adjusted repair sliders");
  for (const lane of ["motion", "layer", "text", "export"]) await openStill2VidPage(page, entry, artifactDir, lane);
  await openStill2VidPage(page, entry, artifactDir, "preview");
  await page.locator("#playBtn").click();
  entry.actions.push("Still2Vid played timeline");
  await page.waitForTimeout(850);
  const canvas = await canvasProof(page, "#stageCanvas");
  pushStatus(entry, "still2vid_canvas_painted_after_upload", canvas.present && canvas.paintedPixels > 8 && canvas.variedChannels > 2, canvas);
  if (entry.label.includes("desktop")) await downloadFromClick(page, entry, artifactDir, "#posterBtn", "still2vid-poster");
  await scrollHuman(page, entry, artifactDir, "still2vid-full-page", { canvasSelector: "#stageCanvas", requireCanvas: true });
}

async function openBrandForgePage(page, entry, artifactDir, lane) {
  await page.locator(`button[data-brand-page-target="${lane}"]`).click();
  entry.actions.push(`BrandForge opened ${lane} page`);
  await page.waitForFunction((target) => document.querySelector(".main")?.dataset.activePage === target, lane, { timeout: 10000 });
  await visualStop(page, entry, artifactDir, `brandforge-${lane}`, { canvasSelector: "#canvas", requireCanvas: lane === "preview" });
}

async function exerciseBrandForge(page, entry, artifactDir) {
  const response = await page.goto(urlFor(appRoutes.brandforge), { waitUntil: "domcontentloaded", timeout: 45000 });
  pushStatus(entry, "brandforge_route_loaded", Boolean(response?.ok()), { status: response?.status() || 0, url: page.url() });
  await page.waitForSelector("#canvas", { state: "attached", timeout: 25000 });
  await page.waitForFunction(() => document.querySelector("#layoutGrid")?.children.length > 2, null, { timeout: 20000 });
  await openBrandForgePage(page, entry, artifactDir, "source");
  await page.setInputFiles("#photoInput", sourceImage);
  await page.setInputFiles("#logoInput", logoImage);
  entry.actions.push("BrandForge uploaded MetrAIyux emblem and logo assets");
  await page.waitForFunction(() => /Photo:/i.test(document.querySelector("#assetStatus")?.textContent || ""), null, { timeout: 20000 });
  await openBrandForgePage(page, entry, artifactDir, "format");
  await page.selectOption("#sizePreset", "story");
  entry.actions.push("BrandForge changed format preset");
  await openBrandForgePage(page, entry, artifactDir, "brand");
  await page.fill("#kitName", `Browser Proof Kit ${entry.label}`);
  await page.locator("#stashKitBtn").click();
  await page.locator("#restoreKitBtn").click();
  entry.actions.push("BrandForge saved and restored pinned local brand kit");
  await openBrandForgePage(page, entry, artifactDir, "content");
  await page.fill("#headline", `BROWSER PROOF PASSED ON ${entry.label.toUpperCase()}`);
  await page.fill("#cta", "OPEN THE LIVE SYSTEM");
  entry.actions.push("BrandForge edited headline and CTA");
  await openBrandForgePage(page, entry, artifactDir, "layers");
  if (await page.locator("#layerList [data-layer]").first().isVisible().catch(() => false)) {
    await page.locator("#layerList [data-layer]").first().click();
    entry.actions.push("BrandForge selected a layer");
  }
  await openBrandForgePage(page, entry, artifactDir, "repair");
  await page.locator("#autoFixBtn").click();
  await page.locator("#variantBtn").click();
  entry.actions.push("BrandForge ran photo repair and generated variants");
  await page.waitForFunction(() => document.querySelectorAll("#variantGrid .thumb").length >= 6, null, { timeout: 20000 });
  await openBrandForgePage(page, entry, artifactDir, "batch");
  if (entry.label.includes("desktop")) await downloadFromClick(page, entry, artifactDir, "#proofSheetBtn", "brandforge-proof-sheet");
  await openBrandForgePage(page, entry, artifactDir, "proof");
  await openBrandForgePage(page, entry, artifactDir, "preview");
  await page.locator('.tab[data-panel="variants"]').click();
  entry.actions.push("BrandForge clicked Variants stage tab");
  await page.waitForFunction(() => document.querySelector(".main")?.dataset.activePage === "repair", null, { timeout: 10000 });
  await openBrandForgePage(page, entry, artifactDir, "preview");
  await page.locator('.tab[data-panel="proof"]').click();
  entry.actions.push("BrandForge clicked Proof stage tab");
  await page.waitForFunction(() => document.querySelector(".main")?.dataset.activePage === "proof", null, { timeout: 10000 });
  await openBrandForgePage(page, entry, artifactDir, "preview");
  await page.locator('.tab[data-panel="design"]').click();
  entry.actions.push("BrandForge returned to Design stage tab");
  await page.waitForFunction(() => document.querySelector(".main")?.dataset.activePage === "preview", null, { timeout: 10000 });
  const canvas = await canvasProof(page, "#canvas");
  pushStatus(entry, "brandforge_canvas_painted_after_upload", canvas.present && canvas.paintedPixels > 8 && canvas.variedChannels > 2, canvas);
  if (entry.label.includes("desktop")) await downloadFromClick(page, entry, artifactDir, "#pngBtn", "brandforge-png");
  await scrollHuman(page, entry, artifactDir, "brandforge-full-page", { canvasSelector: "#canvas", requireCanvas: true });
}

async function clickVisibleText(page, entry, text, label = text) {
  const locator = page.getByRole("button", { name: text }).first();
  if (await locator.isVisible().catch(() => false)) {
    await locator.click();
    entry.actions.push(`clicked ${label}`);
    return true;
  }
  return false;
}

async function unlockSkyePics(page, entry) {
  await page.waitForSelector("#root", { timeout: 25000 });
  await page.waitForTimeout(500);
  await clickVisibleText(page, entry, /Enter SkyePics/i, "intro enter SkyePics");
  await page.waitForTimeout(700);
  await clickVisibleText(page, entry, /Enter SkyePics/i, "landing enter SkyePics");
  await page.waitForSelector(".gate-card", { timeout: 25000 });
  if (await page.getByRole("button", { name: /New Vault/i }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /New Vault/i }).click();
    entry.actions.push("SkyePics selected New Vault mode");
  }
  const password = `ProofVault99!${entry.label.replace(/[^a-z0-9]/gi, "")}`;
  const fields = page.locator(".gate-form input[type='password']");
  await fields.nth(0).fill(password);
  if (await fields.nth(1).isVisible().catch(() => false)) await fields.nth(1).fill(password);
  entry.actions.push("SkyePics entered local vault password fields");
  await page.getByRole("button", { name: /Create encrypted vault/i }).click();
  entry.actions.push("SkyePics created encrypted local vault");
  await page.waitForSelector(".app-shell", { timeout: 30000 });
  const firstRunModal = page.locator(".tutorial-modal-backdrop").first();
  if (await firstRunModal.isVisible().catch(() => false)) {
    await firstRunModal.getByRole("button", { name: /Close/i }).click();
    entry.actions.push("SkyePics closed first-run tutorial modal");
    await page.waitForSelector(".tutorial-modal-backdrop", { state: "detached", timeout: 12000 }).catch(() => {});
  }
}

async function openSkyePicsLane(page, entry, artifactDir, lane) {
  const locator = page.locator(".lane-strip button", { hasText: lane }).first();
  await locator.click();
  entry.actions.push(`SkyePics opened ${lane} lane`);
  await page.waitForFunction((label) => {
    const active = document.querySelector(".lane-strip button.active");
    return active?.textContent?.toLowerCase().includes(String(label).toLowerCase());
  }, lane, { timeout: 10000 });
  await visualStop(page, entry, artifactDir, `skyepics-${lane}`);
}

async function exerciseSkyePics(page, entry, artifactDir) {
  const response = await page.goto(urlFor(appRoutes.skyepics), { waitUntil: "domcontentloaded", timeout: 45000 });
  pushStatus(entry, "skyepics_route_loaded", Boolean(response?.ok()), { status: response?.status() || 0, url: page.url() });
  await unlockSkyePics(page, entry);
  await visualStop(page, entry, artifactDir, "skyepics-unlocked-home");
  const privacyToggle = page.locator(".header-actions input[type='checkbox']").first();
  if (await privacyToggle.isVisible().catch(() => false)) {
    await privacyToggle.check();
    await privacyToggle.uncheck();
    entry.actions.push("SkyePics toggled privacy shield");
  }
  await page.locator(".header-actions select").first().selectOption("0");
  entry.actions.push("SkyePics changed auto-lock selector");
  await page.getByRole("button", { name: /^Tutorial$/i }).click();
  await page.waitForSelector(".tutorial-modal-backdrop", { timeout: 12000 });
  const tutorialModal = page.locator(".tutorial-modal-backdrop").first();
  await tutorialModal.getByRole("button", { name: /^Next$/i }).click();
  await tutorialModal.getByRole("button", { name: /^Open /i }).click();
  entry.actions.push("SkyePics opened tutorial modal and jumped to a lane");
  for (const lane of ["Home", "Guide", "Camera", "Vault", "Scan", "Secrets", "Backup", "Security"]) {
    await openSkyePicsLane(page, entry, artifactDir, lane);
    if (lane === "Secrets") {
      const form = page.locator("form.secret-form");
      await form.locator("input").nth(0).fill(`Browser Proof ${entry.label}`);
      await form.locator("select").first().selectOption("api_key");
      await form.locator("textarea").nth(0).fill("not-a-real-secret-browser-proof-value");
      await form.locator("input").nth(1).fill("Proof Provider");
      await form.locator("input").nth(2).fill("0S proof workspace");
      await form.getByRole("button", { name: /Save encrypted record/i }).click();
      entry.actions.push("SkyePics saved encrypted proof secret record");
      await page.waitForTimeout(700);
      await visualStop(page, entry, artifactDir, "skyepics-secret-saved");
    }
    if (lane === "Backup") {
      await page.getByRole("button", { name: /Run health check/i }).click();
      entry.actions.push("SkyePics ran backup health check");
      await page.waitForTimeout(700);
      if (entry.label.includes("desktop")) await downloadFromClick(page, entry, artifactDir, "button:has-text('Export backup')", "skyepics-backup");
    }
    if (lane === "Security") {
      await page.getByRole("button", { name: /Run secret audit/i }).click();
      entry.actions.push("SkyePics ran redacted secret audit");
      await page.waitForTimeout(700);
      await visualStop(page, entry, artifactDir, "skyepics-security-audit");
    }
  }
  await scrollHuman(page, entry, artifactDir, "skyepics-full-page");
  const state = await page.evaluate(() => ({
    laneButtons: [...document.querySelectorAll(".lane-strip button")].map((button) => button.textContent?.trim()).filter(Boolean),
    bottomButtons: [...document.querySelectorAll(".bottom-nav button")].map((button) => button.textContent?.trim()).filter(Boolean),
    appShell: Boolean(document.querySelector(".app-shell")),
    gateOverlay: Boolean(document.querySelector("#free99PlatformGate")),
    activeHeading: document.querySelector(".app-header h1")?.textContent?.trim() || ""
  }));
  pushStatus(entry, "skyepics_multi_page_shell_ready", state.appShell && state.laneButtons.length >= 8 && state.bottomButtons.length >= 8 && !state.gateOverlay, state);
}

async function runViewport(browser, viewport, label, artifactDir, token) {
  const context = await browser.newContext({
    viewport,
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: isProduction ? { Authorization: `Bearer ${token}`, "x-skye-gate-session": token, "x-free99-gate-session": token } : undefined
  });
  if (isProduction && token) {
    const host = new URL(baseUrl).hostname;
    await context.addCookies(["metraiyux_admin_session", "skye_gate_session", "skygate_session"].map((name) => ({
      name,
      value: token,
      domain: host,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax"
    })));
  }
  await context.addInitScript(({ gateToken }) => {
    const shared = {
      token: gateToken,
      source: "owner-admin-login",
      platform_id: "metraiyux-0s",
      usage_lane: "fs27-owner-gate",
      billing_mode: "free99",
      issued_at: new Date().toISOString()
    };
    sessionStorage.setItem("FREE99_PLATFORM_GATE_SESSION", JSON.stringify(shared));
    localStorage.setItem("FREE99_PLATFORM_GATE_SESSION", JSON.stringify(shared));
    sessionStorage.setItem("METRAIYUX_GATE_SESSION", JSON.stringify(shared));
    localStorage.setItem("METRAIYUX_GATE_SESSION", JSON.stringify(shared));
  }, { gateToken: token || "local-proof-free99-gate-session" });
  const page = await context.newPage();
  const entry = {
    label,
    viewport,
    ok: false,
    actions: [],
    actionCount: 0,
    statuses: [],
    screenshots: [],
    downloads: [],
    scrollStops: [],
    ignoredNetwork: [],
    consoleErrors: [],
    failedRequests: [],
    httpErrors: [],
    failures: []
  };
  attachWatchers(page, entry);
  try {
    await exerciseStill2Vid(page, entry, artifactDir);
    await exerciseBrandForge(page, entry, artifactDir);
    await exerciseSkyePics(page, entry, artifactDir);
    entry.actionCount = entry.actions.length;
    if (entry.actionCount < 42) entry.failures.push(`action count below page-lane stress target: ${entry.actionCount}`);
  } catch (error) {
    entry.failures.push(cleanFailure(error));
  } finally {
    const failedStatuses = entry.statuses.filter((status) => !status.ok);
    if (failedStatuses.length) entry.failures.push(`failed statuses: ${JSON.stringify(failedStatuses)}`);
    if (entry.consoleErrors.length) entry.failures.push(`console errors: ${JSON.stringify(entry.consoleErrors)}`);
    if (entry.failedRequests.length) entry.failures.push(`failed requests: ${JSON.stringify(entry.failedRequests)}`);
    if (entry.httpErrors.length) entry.failures.push(`http errors: ${JSON.stringify(entry.httpErrors)}`);
    entry.ok = entry.failures.length === 0;
    entry.actionCount = entry.actions.length;
    await context.close().catch(() => {});
  }
  return entry;
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  let server = null;
  if (!isProduction) {
    server = await startStaticServer();
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  } else {
    const credential = await resolveLiveGateCredential();
    adminBearerToken = credential.token;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const proofRoot = path.join(repoRoot, "test-artifacts", isProduction ? "free99-page-lanes-production" : "free99-page-lanes-local");
  const artifactDir = path.join(proofRoot, stamp);
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    mode: isProduction ? "production-headed-live-browser-stress" : "local-headed-browser-stress",
    headless: false,
    browser: "chromium headed via Playwright",
    baseUrl,
    routes: Object.fromEntries(Object.entries(appRoutes).map(([key, route]) => [key, urlFor(route)])),
    adminLogin: isProduction ? urlFor("/admin/login.html") : null,
    artifactDir,
    unauthGate: [],
    checks: [],
    failures: []
  };

  if (isProduction) {
    if (!adminBearerToken) report.failures.push("Missing shared owner gate session.");
    if (!report.failures.length) {
      for (const route of Object.values(appRoutes)) report.unauthGate.push(await checkUnauthGate(route));
    }
  }

  if (!report.failures.length) {
    let browser;
    try {
      browser = await chromium.launch({
        headless: false,
        slowMo,
        chromiumSandbox: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
      });
      report.checks.push(await runViewport(browser, { width: 1440, height: 980 }, "desktop", artifactDir, adminBearerToken || "local-proof-free99-gate-session"));
      report.checks.push(await runViewport(browser, { width: 390, height: 844 }, "mobile", artifactDir, adminBearerToken || "local-proof-free99-gate-session"));
    } catch (error) {
      report.failures.push(cleanFailure(error));
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }

  for (const gate of report.unauthGate) {
    if (!gate.ok) report.failures.push(`Unauthenticated gate failed for ${gate.route}: ${JSON.stringify(gate)}`);
  }
  for (const check of report.checks) {
    if (!check.ok) {
      report.failures.push(`${check.label} failed: ${JSON.stringify({
        actionCount: check.actionCount,
        consoleErrors: check.consoleErrors,
        failedRequests: check.failedRequests,
        httpErrors: check.httpErrors,
        failures: check.failures
      })}`);
    }
  }
  report.ok = report.failures.length === 0;
  const publicReport = deepRedact(report);
  const reportName = isProduction ? "production-headed-browser-stress-proof.json" : "local-headed-browser-stress-proof.json";
  const reportPath = path.join(artifactDir, reportName);
  fs.writeFileSync(reportPath, `${JSON.stringify(publicReport, null, 2)}\n`);
  fs.writeFileSync(path.join(proofRoot, `latest-${reportName}`), `${JSON.stringify(publicReport, null, 2)}\n`);
  console.log(JSON.stringify({ ok: publicReport.ok, mode: publicReport.mode, reportPath, baseUrl, failures: publicReport.failures }, null, 2));
  if (server) await new Promise((resolve) => server.close(resolve));
  process.exit(report.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(cleanFailure(error));
  process.exit(1);
});
