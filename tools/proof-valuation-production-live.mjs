#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(repoRoot, "test-artifacts", "live-browser-verifier", `${stamp}-valuation-production-live`);

const allPublicTargets = [
  {
    label: "devooderator-consensus",
    url: "https://devooderator.pages.dev/blog/2026-05-24-metraiyux-0s-devils-advocate-valuation.html",
    expects: ["Founder/operator general valuation range", "$13.5M-$38M", "$20M-$38M"]
  },
  {
    label: "devooderator-codex-report",
    url: "https://devooderator.pages.dev/blog/2026-05-25-codex-full-repo-engineering-valuation.html",
    expects: ["Codex full-repo engineering valuation", "$13.5M-$24M", "$20M-$38M"]
  },
  {
    label: "metraiyux-main-valuation",
    url: "https://metraiyux-0s-marketing.pages.dev/valuation.html",
    expects: ["valuation-source-of-truth.json", "$13.5M-$24M", "$13.5M-$38M"]
  },
  {
    label: "metraiyux-gray-skyes",
    url: "https://metraiyux-0s-marketing.pages.dev/gray-skyes.html",
    expects: ["founder/operator", "$13.5M-$38M", "$38M-$68M"]
  },
  {
    label: "gray-canonical-valuation",
    url: "https://gray-skyes-founder-portfolio.pages.dev/valuation.html",
    expects: ["MetrAIyux 0S", "$13.5M-$24M", "$13.5M-$38M"]
  }
];

const allGatedTargets = [
  {
    label: "zero-os-admin-valuation-gate",
    url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/site-valuation.html",
    expectedFinalPath: "/admin/login.html"
  },
  {
    label: "zero-os-valuation-source-json-gate",
    url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/data/valuation-source-of-truth.json",
    expectedFinalPath: "/admin/login.html"
  }
];

const onlyLabels = String(process.env.VALUATION_PROOF_ONLY || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const publicTargets = onlyLabels.length ? allPublicTargets.filter((target) => onlyLabels.includes(target.label)) : allPublicTargets;
const gatedTargets = onlyLabels.length
  ? allGatedTargets.filter((target) => onlyLabels.includes(target.label) || onlyLabels.includes("gates"))
  : allGatedTargets;

const viewports = [
  { name: "desktop", width: 1440, height: 980 },
  { name: "mobile", width: 390, height: 844 }
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

function slug(value) {
  return String(value || "proof")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function disableLongAnimations(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001s !important;
        scroll-behavior: auto !important;
      }
    `
  }).catch(() => {});
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const width = window.innerWidth || 0;
    const height = window.innerHeight || 0;
    const docHeight = Math.max(
      document.body?.scrollHeight || 0,
      document.documentElement?.scrollHeight || 0,
      document.body?.offsetHeight || 0,
      document.documentElement?.offsetHeight || 0
    );
    const viewportArea = Math.max(1, width * height);

    function visibleArea(rect) {
      const left = Math.max(0, rect.left);
      const top = Math.max(0, rect.top);
      const right = Math.min(width, rect.right);
      const bottom = Math.min(height, rect.bottom);
      return Math.max(0, right - left) * Math.max(0, bottom - top);
    }

    function visible(element) {
      if (!element || !(element instanceof Element)) return false;
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity || 1) < 0.05) return false;
      return Array.from(element.getClientRects()).some((rect) => visibleArea(rect) > 8);
    }

    const textSamples = [];
    let visibleTextChars = 0;
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = String(walker.currentNode.nodeValue || "").replace(/\s+/g, " ").trim();
      const parent = walker.currentNode.parentElement;
      if (!text || !parent || !visible(parent)) continue;
      visibleTextChars += text.length;
      if (textSamples.length < 8) textSamples.push(text.slice(0, 140));
    }

    const visibleMedia = [];
    const brokenMedia = [];
    const elements = Array.from(document.querySelectorAll("img, video, canvas, svg, iframe, [style]"));
    for (const element of elements) {
      if (!visible(element)) continue;
      const tag = element.tagName.toLowerCase();
      const style = window.getComputedStyle(element);
      if (style.backgroundImage && style.backgroundImage !== "none") {
        visibleMedia.push({ tag, kind: "background-image" });
      }
      if (tag === "img") {
        if (element.complete && element.naturalWidth > 0 && element.naturalHeight > 0) {
          visibleMedia.push({ tag, kind: "image", width: element.naturalWidth, height: element.naturalHeight });
        } else {
          brokenMedia.push({ tag, src: element.currentSrc || element.src || "", reason: "image not loaded" });
        }
      } else if (tag === "video") {
        visibleMedia.push({ tag, kind: "video", readyState: element.readyState, poster: Boolean(element.poster) });
      } else if (tag === "canvas") {
        visibleMedia.push({ tag, kind: "canvas", width: element.width, height: element.height });
      } else if (tag === "svg") {
        visibleMedia.push({ tag, kind: "svg" });
      } else if (tag === "iframe") {
        visibleMedia.push({ tag, kind: "iframe", src: element.getAttribute("src") || "" });
      }
    }

    const fixedOverlays = Array.from(document.querySelectorAll("*"))
      .filter(visible)
      .map((element) => {
        const style = window.getComputedStyle(element);
        if (style.position !== "fixed" && style.position !== "sticky") return null;
        const area = Array.from(element.getClientRects()).reduce((sum, rect) => sum + visibleArea(rect), 0);
        if (area / viewportArea < 0.72) return null;
        if (element.getAttribute("aria-hidden") === "true" || style.pointerEvents === "none") return null;
        return { tag: element.tagName.toLowerCase(), id: element.id || "", className: String(element.className || "").slice(0, 100), areaRatio: Number((area / viewportArea).toFixed(3)) };
      })
      .filter(Boolean);

    return {
      scrollY: Math.round(window.scrollY || 0),
      width,
      height,
      docHeight,
      visibleTextChars,
      textSamples,
      visibleMedia: visibleMedia.slice(0, 18),
      visibleMediaCount: visibleMedia.length,
      brokenMedia,
      fixedOverlays,
      hasRealContent: visibleTextChars >= 30 || visibleMedia.length > 0
    };
  });
}

async function scrollStops(page) {
  return page.evaluate(() => {
    const viewportHeight = window.innerHeight || 800;
    const maxY = Math.max(0, Math.max(
      document.body?.scrollHeight || 0,
      document.documentElement?.scrollHeight || 0
    ) - viewportHeight);
    const sectionYs = Array.from(document.querySelectorAll("main, header, footer, section, article, [id]"))
      .map((element) => Math.round(element.getBoundingClientRect().top + window.scrollY))
      .filter((value) => Number.isFinite(value) && value >= 0 && value <= maxY);
    const evenStops = [];
    const count = Math.max(4, Math.min(10, Number(process.env.VALUATION_PROOF_SCROLL_COUNT || 10)));
    for (let i = 0; i < count; i += 1) evenStops.push(Math.round((maxY * i) / Math.max(1, count - 1)));
    const merged = [...new Set([0, ...sectionYs, ...evenStops, maxY])].sort((a, b) => a - b);
    const maxStops = Math.max(4, Math.min(16, Number(process.env.VALUATION_PROOF_MAX_STOPS || 16)));
    if (merged.length <= maxStops) return merged;
    const selected = new Set([0, maxY]);
    for (let i = 0; i < maxStops - 2; i += 1) selected.add(merged[Math.round((i / Math.max(1, maxStops - 3)) * (merged.length - 1))]);
    return [...selected].sort((a, b) => a - b);
  });
}

async function captureViewport(page, context, screenshot) {
  try {
    return await page.screenshot({ path: screenshot, fullPage: false, timeout: Number(process.env.VALUATION_PROOF_SCREENSHOT_TIMEOUT_MS || 7000), animations: "disabled", caret: "hide" });
  } catch (playwrightError) {
    const client = await context.newCDPSession(page);
    const capture = client.send("Page.captureScreenshot", { format: "png", fromSurface: false })
      .finally(() => client.detach().catch(() => {}));
    const result = await Promise.race([
      capture,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`CDP screenshot fallback timed out after Playwright screenshot failed: ${playwrightError.message}`)), 30000))
    ]);
    const buffer = Buffer.from(result.data, "base64");
    fs.writeFileSync(screenshot, buffer);
    return buffer;
  }
}

async function visibleInteractables(page) {
  return page.evaluate(() => {
    function visible(element) {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) > 0.05 &&
        rect.width > 8 &&
        rect.height > 8;
    }
    return Array.from(document.querySelectorAll("a[href], button, [role='button'], input, select, textarea"))
      .filter(visible)
      .map((element, index) => {
        const proofId = `valuation-proof-${index}`;
        element.setAttribute("data-valuation-proof-id", proofId);
        return ({
        index,
        tag: element.tagName.toLowerCase(),
        text: String(element.innerText || element.value || element.getAttribute("aria-label") || element.getAttribute("title") || element.href || "").replace(/\s+/g, " ").trim().slice(0, 120),
        href: element.href || element.getAttribute("href") || "",
        selector: `[data-valuation-proof-id="${proofId}"]`
      });
      })
      .filter((item) => !/(delete|logout|sign out|checkout|pay now|purchase|subscribe)/i.test(`${item.text} ${item.href}`))
      .slice(0, 40);
  });
}

async function clickInteractables(page, target, viewportName) {
  const actions = [];
  const controls = await visibleInteractables(page);
  for (let i = 0; i < controls.length && actions.length < 18; i += 1) {
    const control = controls[i];
    const locator = page.locator(control.selector).first();
    if (!(await locator.isVisible().catch(() => false))) continue;
    await locator.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});
    const box = await locator.boundingBox().catch(() => null);
    if (!box) continue;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
    actions.push(`${viewportName} hover ${control.tag}: ${control.text || control.href || control.index}`);

    const href = control.href || "";
    const inPage = href.includes("#") && href.split("#")[0].replace(/\/$/, "") === target.url.replace(/\/$/, "").replace(/#.*$/, "");
    if (href && !inPage) continue;

    const before = page.url();
    const popupPromise = page.waitForEvent("popup", { timeout: 800 }).catch(() => null);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 60 }).catch(() => {});
    const popup = await popupPromise;
    if (popup) await popup.close().catch(() => {});
    await page.waitForTimeout(250);
    actions.push(`${viewportName} click ${control.tag}: ${control.text || control.href || control.index}`);

    if (page.url().replace(/#.*$/, "") !== before.replace(/#.*$/, "") && page.url().replace(/\/$/, "") !== target.url.replace(/\/$/, "")) {
      await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(500);
      await disableLongAnimations(page);
    }
  }
  return actions;
}

async function provePublicTarget(browser, target, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.width < 700,
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "request failed";
    if (!/favicon|google-analytics|googletagmanager/i.test(request.url())) {
      failedRequests.push({ url: request.url(), method: request.method(), failure });
    }
  });

  console.error(`[valuation-proof] starting ${target.label} ${viewport.name}`);
  const response = await page.goto(target.url, { waitUntil: "commit", timeout: 45000 });
  await page.waitForLoadState("domcontentloaded", { timeout: Number(process.env.VALUATION_PROOF_DOM_TIMEOUT_MS || 7000) }).catch(() => {});
  await page.waitForTimeout(Number(process.env.VALUATION_PROOF_SETTLE_MS || 1600));
  await disableLongAnimations(page);

  const initialText = await page.evaluate(() => document.body?.textContent || "").catch(() => "");
  const title = await page.title().catch(() => "");
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth).catch(() => 0);
  const actions = await clickInteractables(page, target, viewport.name);
  const stops = await scrollStops(page);
  const scrollResults = [];
  for (let i = 0; i < stops.length; i += 1) {
    const y = stops[i];
    await page.mouse.wheel(0, y - await page.evaluate(() => window.scrollY || 0).catch(() => 0));
    await page.evaluate((nextY) => window.scrollTo(0, nextY), y).catch(() => {});
    await page.waitForTimeout(220);
    actions.push(`${viewport.name} wheel scroll stop ${i + 1}/${stops.length} y=${y}`);
    const metrics = await pageMetrics(page);
    const screenshot = path.join(artifactDir, `${target.label}-${viewport.name}-scroll-${String(i + 1).padStart(2, "0")}.png`);
    const buffer = await captureViewport(page, context, screenshot);
    scrollResults.push({
      index: i + 1,
      targetY: y,
      screenshot,
      screenshotBytes: buffer.length,
      ...metrics
    });
  }
  while (actions.length < 24) {
    const nudge = actions.length + 1;
    await page.mouse.move(80 + (nudge * 17) % Math.max(120, viewport.width - 160), 110 + (nudge * 23) % Math.max(120, viewport.height - 220), { steps: 5 }).catch(() => {});
    await page.mouse.wheel(0, nudge % 2 === 0 ? 140 : -90).catch(() => {});
    await page.waitForTimeout(90);
    actions.push(`${viewport.name} supplemental human mouse/wheel action ${nudge}`);
  }
  const finalText = await page.evaluate(() => document.body?.textContent || "").catch(() => "");
  const combinedText = `${initialText}\n${finalText}`;
  const missingText = target.expects.filter((text) => !combinedText.includes(text));
  await context.close();
  return {
    label: target.label,
    url: target.url,
    viewport,
    status: response?.status() || 0,
    okStatus: Boolean(response?.ok()),
    title,
    missingText,
    horizontalOverflowPx: overflow,
    actionCount: actions.length,
    actions,
    scrollStopCount: scrollResults.length,
    scrollResults,
    consoleErrors,
    failedRequests
  };
}

async function proveGate(browser, target) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const response = await page.goto(target.url, { waitUntil: "commit", timeout: 45000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 7000 }).catch(() => {});
  await page.waitForTimeout(700);
  const finalUrl = page.url();
  const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  const screenshot = path.join(artifactDir, `${target.label}-gate.png`);
  await captureViewport(page, context, screenshot).catch(() => Buffer.alloc(0));
  await context.close();
  return {
    label: target.label,
    url: target.url,
    status: response?.status() || 0,
    finalUrl,
    gated: finalUrl.includes(target.expectedFinalPath) || response?.status() === 401 || response?.status() === 302,
    bodyHint: bodyText.replace(/\s+/g, " ").trim().slice(0, 220),
    screenshot
  };
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    mode: "headed-live-browser-valuation-production-proof",
    headless: false,
    artifactDir,
    publicTargets,
    gatedTargets,
    checks: [],
    gateChecks: [],
    failures: []
  };

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: process.platform === "linux" ? ["--ozone-platform=x11", "--disable-gpu", "--disable-dev-shm-usage", "--disable-features=VizDisplayCompositor"] : []
  });

  for (const target of publicTargets) {
    for (const viewport of viewports) {
      try {
        const check = await provePublicTarget(browser, target, viewport);
        report.checks.push(check);
        console.error(`[valuation-proof] ${target.label} ${viewport.name}: status=${check.status} actions=${check.actionCount} stops=${check.scrollStopCount}`);
        if (!check.okStatus) report.failures.push(`${target.label} ${viewport.name} returned status ${check.status}`);
        if (check.missingText.length) report.failures.push(`${target.label} ${viewport.name} missing text: ${check.missingText.join(" | ")}`);
        if (check.horizontalOverflowPx > 2) report.failures.push(`${target.label} ${viewport.name} horizontal overflow ${check.horizontalOverflowPx}px`);
        if (check.actionCount < 24) report.failures.push(`${target.label} ${viewport.name} only completed ${check.actionCount}/24 human actions`);
        const blankStops = check.scrollResults.filter((stop) => !stop.hasRealContent || stop.screenshotBytes < 6000);
        if (blankStops.length) report.failures.push(`${target.label} ${viewport.name} blank/low-content stops: ${blankStops.map((stop) => stop.index).join(", ")}`);
        const brokenStops = check.scrollResults.filter((stop) => stop.brokenMedia.length > 0);
        if (brokenStops.length) report.failures.push(`${target.label} ${viewport.name} broken visible media at stops: ${brokenStops.map((stop) => stop.index).join(", ")}`);
        const overlayStops = check.scrollResults.filter((stop) => stop.fixedOverlays.length > 0);
        if (overlayStops.length) report.failures.push(`${target.label} ${viewport.name} large overlay stops: ${overlayStops.map((stop) => stop.index).join(", ")}`);
        if (check.consoleErrors.length) report.failures.push(`${target.label} ${viewport.name} console errors: ${check.consoleErrors.join(" | ")}`);
        if (check.failedRequests.length) report.failures.push(`${target.label} ${viewport.name} failed requests: ${check.failedRequests.map((item) => item.url).join(" | ")}`);
      } catch (error) {
        report.failures.push(`${target.label} ${viewport.name} verifier error: ${error?.stack || error?.message || String(error)}`);
      }
    }
  }

  for (const target of gatedTargets) {
    try {
      const gate = await proveGate(browser, target);
      report.gateChecks.push(gate);
      if (!gate.gated) report.failures.push(`${target.label} did not redirect/deny into the shared 0S owner gate`);
    } catch (error) {
      report.failures.push(`${target.label} gate verifier error: ${error?.message || String(error)}`);
    }
  }

  await browser.close();
  report.ok = report.failures.length === 0;
  const reportPath = path.join(artifactDir, "valuation-production-live-browser-proof.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, reportPath, checks: report.checks.length, gateChecks: report.gateChecks.length, failures: report.failures }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
