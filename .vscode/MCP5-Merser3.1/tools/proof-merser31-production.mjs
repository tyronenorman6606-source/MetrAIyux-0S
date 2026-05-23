#!/usr/bin/env node
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { MCP4_PUBLIC_BASE, MERSER_DISPLAY_NAME } from "../mcp4-core.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(rootDir, "../..");
const artifactRoot = resolve(repoRoot, "test-artifacts", "merser31-live-proof");

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function isoPath() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function fetchText(url, init = {}) {
  const started = performance.now();
  try {
    const response = await fetch(url, init);
    const body = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      durationMs: Number((performance.now() - started).toFixed(2)),
      bodySnippet: body.slice(0, 260),
      contentType: response.headers.get("content-type") || "",
    };
  } catch (error) {
    return {
      ok: false,
      status: "network-error",
      durationMs: Number((performance.now() - started).toFixed(2)),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function waitForRuntime(page) {
  await page.waitForFunction(() => {
    const runtime = window.__MERSER31_RUNTIME__ || window.__MCP4_RUNTIME__;
    const threeCanvas = document.querySelector("[data-three-world] canvas");
    const rect = threeCanvas?.getBoundingClientRect();
    return runtime?.dimensionalSurfaces && threeCanvas && rect?.width > 300 && rect?.height > 240;
  }, { timeout: 20000 });
  return page.evaluate(() => ({ ...(window.__MERSER31_RUNTIME__ || window.__MCP4_RUNTIME__ || {}) }));
}

async function canvasProbe(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("[data-three-world] canvas") || document.querySelector("canvas.world-canvas") || document.querySelector("canvas");
    if (!canvas) return { ok: false, reason: "missing canvas" };
    const rect = canvas.getBoundingClientRect();
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return { ok: true, mode: "canvas-present", width: rect.width, height: rect.height };
    const pixel = new Uint8Array(4);
    gl.readPixels(Math.max(0, Math.floor(canvas.width / 2)), Math.max(0, Math.floor(canvas.height / 2)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return {
      ok: rect.width > 300 && rect.height > 240,
      mode: "webgl-read",
      width: Number(rect.width.toFixed(1)),
      height: Number(rect.height.toFixed(1)),
      centerPixel: Array.from(pixel),
      nonBlankCenter: Array.from(pixel).some((value) => value > 0),
    };
  });
}

async function clickFirst(page, selector, label) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout: 12000 });
  await locator.click({ timeout: 12000, force: true });
  return label;
}

async function clickIfVisible(page, selector, label) {
  const locator = page.locator(selector).first();
  if (!(await locator.isVisible({ timeout: 2500 }).catch(() => false))) return null;
  await locator.click({ timeout: 12000, force: true });
  return label;
}

async function runViewport(browser, url, viewport, artifactDir) {
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  const consoleErrors = [];
  const failedRequests = [];
  const actions = [];

  page.on("console", (message) => {
    if (["error"].includes(message.type())) consoleErrors.push({ type: message.type(), text: message.text() });
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || "request failed" });
  });
  page.on("pageerror", (error) => {
    consoleErrors.push({ type: "pageerror", text: error.message });
  });

  await page.goto(url, { waitUntil: "commit", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const initialRuntime = await waitForRuntime(page);
  const initialCanvas = await canvasProbe(page);
  const initialScreenshot = join(artifactDir, `${viewport.name}-initial.png`);
  await page.screenshot({ path: initialScreenshot, fullPage: false, timeout: 90000 });

  const controlCount = await page.locator(".world-control-dock button, .world-control-dock a").count().catch(() => 0);
  actions.push(`camera controls present: ${controlCount}`);
  await page.waitForTimeout(450);

  if (viewport.width >= 800) {
    const search = page.locator("#room-search-input");
    if (await search.isVisible({ timeout: 8000 }).catch(() => false)) {
      await search.fill("med", { timeout: 15000 });
      actions.push("search med");
    } else {
      actions.push("search input not reachable");
    }
    if (await page.locator(".search-results button").first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.locator(".search-results button").first().click({ force: true, timeout: 15000 });
      actions.push("select search result");
    } else {
      actions.push("search result not visible");
    }
    await page.waitForTimeout(700);

    const dot = page.locator(".minimap-dot").nth(2);
    const box = await dot.boundingBox({ timeout: 10000 }).catch(() => null);
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 26, box.y + box.height / 2 - 18, { steps: 8 });
      await page.mouse.up();
      actions.push("drag minimap med-spa dot");
    }
  }

  await page.mouse.wheel(0, Math.round(viewport.height * 2.4));
  await page.waitForTimeout(1600);
  const scrolledRuntime = await page.evaluate(() => ({ ...(window.__MERSER31_RUNTIME__ || window.__MCP4_RUNTIME__ || {}) }));
  const scrolledScreenshot = join(artifactDir, `${viewport.name}-scrolled.png`);
  await page.screenshot({ path: scrolledScreenshot, fullPage: false, timeout: 90000 });
  actions.push("scroll into dimensional world");

  await page.locator("#source-packs").scrollIntoViewIfNeeded({ timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(800);
  const sourcePackVisible = await page.getByText("MCP endpoints", { exact: false }).first().isVisible().catch(() => false);
  const finalScreenshot = join(artifactDir, `${viewport.name}-source-packs.png`);
  await page.screenshot({ path: finalScreenshot, fullPage: false, timeout: 90000 });
  actions.push("open source-pack section");

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  await page.close();

  const scrollMoved = Number(scrolledRuntime.scrollDepth || 0) > Number(initialRuntime.scrollDepth || 0) + 0.18;
  const cameraStartedWide = Number(initialRuntime.cameraDistance || 0) >= 18;
  const cameraChanged = Math.abs(Number(scrolledRuntime.cameraDistance || 0) - Number(initialRuntime.cameraDistance || 0)) >= 1;
  const dimensionsOnline = Boolean(scrolledRuntime.dimensionalSurfaces) && Number(scrolledRuntime.dimensionSurfaceCount || 0) >= 20;

  return {
    ok:
      consoleErrors.length === 0 &&
      failedRequests.length === 0 &&
      !horizontalOverflow &&
      initialCanvas.ok &&
      cameraStartedWide &&
      scrollMoved &&
      cameraChanged &&
      dimensionsOnline &&
      sourcePackVisible,
    viewport,
    actions,
    initialRuntime: {
      cameraDistance: initialRuntime.cameraDistance,
      scrollDepth: initialRuntime.scrollDepth,
      canvasFrames: initialRuntime.canvasFrames,
      dimensionSurfaceCount: initialRuntime.dimensionSurfaceCount,
    },
    scrolledRuntime: {
      cameraDistance: scrolledRuntime.cameraDistance,
      scrollDepth: scrolledRuntime.scrollDepth,
      worldZoomStage: scrolledRuntime.worldZoomStage,
      surfaceRevealDepth: scrolledRuntime.surfaceRevealDepth,
      dimensionSurfaceCount: scrolledRuntime.dimensionSurfaceCount,
      activeDimensionRoom: scrolledRuntime.activeDimensionRoom,
      dragEvents: scrolledRuntime.dragEvents,
    },
    checks: {
      initialCanvas,
      cameraStartedWide,
      scrollMoved,
      cameraChanged,
      dimensionsOnline,
      sourcePackVisible,
      horizontalOverflow,
      consoleErrors,
      failedRequests,
    },
    screenshots: [initialScreenshot, scrolledScreenshot, finalScreenshot],
  };
}

async function main() {
  const url = String(argValue("--url", process.env.MERSER31_PROOF_URL || `${MCP4_PUBLIC_BASE}/`)).replace(/\/+$/, "/");
  const artifactDir = resolve(argValue("--output-dir", join(artifactRoot, isoPath())));
  const skipHealth = process.argv.includes("--skip-health");
  await mkdir(artifactRoot, { recursive: true });
  await mkdir(artifactDir, { recursive: true });
  const health = skipHealth ? { skipped: true, reason: "Local static preview does not mount the Pages Worker." } : await fetchText(new URL("/health", url).toString());
  const unauthMcp = skipHealth
    ? { skipped: true, reason: "Local static preview does not mount the Pages Worker." }
    : await fetchText(new URL("/mcp", url).toString(), {
      method: "POST",
      headers: { Accept: "application/json, text/event-stream", "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });

  const browser = await chromium.launch({
    headless: false,
    slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 35),
    chromiumSandbox: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  let viewports = [];
  try {
    viewports = [
      await runViewport(browser, url, { name: "desktop", width: 1440, height: 1000 }, artifactDir),
      await runViewport(browser, url, { name: "mobile", width: 390, height: 844, isMobile: true }, artifactDir),
    ];
  } finally {
    await browser.close();
  }

  const report = {
    ok: (skipHealth || health.ok) && (skipHealth || unauthMcp.status === 401) && viewports.every((result) => result.ok),
    name: MERSER_DISPLAY_NAME,
    url,
    generatedAt: new Date().toISOString(),
    browser: "chromium headed via Playwright",
    health,
    unauthenticatedMcpGate: unauthMcp,
    viewports,
    limitations: [
      "Authenticated live MCP calls require a gate-owned bearer token and are intentionally not printed by this proof.",
      "This proof verifies browser/runtime behavior and public gate posture; load stress is recorded by the stress script separately.",
    ],
  };
  const reportPath = join(artifactDir, "live-headed-browser-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await copyFile(reportPath, join(artifactRoot, "latest-live-headed-browser-report.json"));
  process.stdout.write(`${JSON.stringify({ ok: report.ok, reportPath, url }, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
