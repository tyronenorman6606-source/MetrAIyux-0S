#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { inflateSync } from "zlib";
import { chromium } from "playwright";

const repoRoot = fs.existsSync("/workspaces/MetrAIyux-0S") ? "/workspaces/MetrAIyux-0S" : process.cwd();
const policyPath = path.join(repoRoot, ".agents/live-browser-verifier/browser-proof-policy.toml");

function policyNumber(key, fallback) {
  try {
    const text = fs.readFileSync(policyPath, "utf8");
    const match = text.match(new RegExp(`^${key}\\s*=\\s*(\\d+)`, "m"));
    return match ? Number(match[1]) : fallback;
  } catch {
    return fallback;
  }
}

const browserPolicy = {
  minimumActionsPerViewport: policyNumber("minimum_actions_per_viewport", 12),
  minimumTotalActionsPerViewport: policyNumber("minimum_total_actions_per_viewport", 24),
  minimumCyclesPerViewport: policyNumber("minimum_cycles_per_viewport", 3),
  minimumFormEditsPerViewport: policyNumber("minimum_form_edits_per_viewport", 3),
  minimumStateChangeAssertionsPerViewport: policyNumber("minimum_state_change_assertions_per_viewport", 8)
};
const navigationTimeoutMs = Number(process.env.LIVE_BROWSER_GOTO_TIMEOUT_MS || 45000);

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

function parseArgs(argv) {
  const args = { urls: [], expects: [], out: "", label: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--url") args.urls.push(argv[++i]);
    else if (item === "--expect") args.expects.push(argv[++i]);
    else if (item === "--out") args.out = argv[++i];
    else if (item === "--label") args.label = argv[++i];
    else if (item === "--help" || item === "-h") args.help = true;
  }
  return args;
}

function usage() {
  return `Usage:
  npm run proof:live-browser -- --url <production-url> --expect "Visible text"

This verifier intentionally launches Chromium with headless:false. If it cannot
open a headed browser, the proof fails instead of silently substituting a
headless screenshot. It also performs a desktop/mobile full-page visual scroll
audit; text-only smoke checks do not count as proof.`;
}

function slug(value) {
  return String(value || "live-browser-proof")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "live-browser-proof";
}

function comparableUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch {
    return String(value || "").replace(/#.*$/, "").replace(/\/$/, "");
  }
}

async function visibleLocator(page, selector) {
  const count = await page.locator(selector).count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    const locator = page.locator(selector).nth(index);
    if (await locator.isVisible().catch(() => false)) return locator;
  }
  return null;
}

async function clickIfVisible(page, selector, actions, label) {
  const locator = await visibleLocator(page, selector);
  if (!locator) return false;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox().catch(() => null);
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
  const beforeUrl = page.url();
  let clicked = false;
  try {
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 80 });
    } else {
      await locator.click({ timeout: 3500 });
    }
    clicked = true;
  } catch (error) {
    if (page.url() !== beforeUrl) {
      clicked = true;
    }
  }
  if (!clicked) return false;
  actions.push(label);
  const postClickIdleMs = Number(process.env.LIVE_BROWSER_POST_CLICK_NETWORK_IDLE_MS || 1500);
  await page.waitForLoadState("networkidle", { timeout: postClickIdleMs }).catch(() => {});
  await page.waitForTimeout(250);
  return true;
}

async function typeIfVisible(page, selector, value, actions, label) {
  const locator = await visibleLocator(page, selector);
  if (!locator) return false;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.fill(value, { timeout: 3500 });
  actions.push(label);
  await page.waitForTimeout(250);
  return true;
}

async function setValueIfVisible(page, selector, value, actions, label) {
  const locator = await visibleLocator(page, selector);
  if (!locator) return false;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.evaluate((element, nextValue) => {
    element.value = nextValue;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value).catch(() => {});
  actions.push(label);
  await page.waitForTimeout(250);
  return true;
}

async function assertVisibleState(page, selector, actions, label) {
  const locator = await visibleLocator(page, selector);
  if (!locator) return false;
  const text = await locator.innerText({ timeout: 2500 }).catch(() => "");
  actions.push(`${label}${text ? `: ${text.replace(/\s+/g, " ").trim().slice(0, 90)}` : ""}`);
  await page.waitForTimeout(120);
  return true;
}

function uniqueSortedNumbers(values, maxValue) {
  return [...new Set(values
    .map((value) => Math.max(0, Math.min(maxValue, Math.round(Number(value) || 0))))
    .filter((value) => Number.isFinite(value)))]
    .sort((a, b) => a - b);
}

function paethPredictor(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

function analyzePngViewport(buffer) {
  const signature = "89504e470d0a1a0a";
  if (!Buffer.isBuffer(buffer) || buffer.subarray(0, 8).toString("hex") !== signature) {
    return { supported: false, reason: "not a PNG buffer" };
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd > buffer.length) break;

    if (type === "IHDR") {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      bitDepth = buffer[dataStart + 8];
      colorType = buffer[dataStart + 9];
    } else if (type === "IDAT") {
      idatChunks.push(buffer.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!width || !height || bitDepth !== 8 || !channels || idatChunks.length === 0) {
    return { supported: false, width, height, bitDepth, colorType, reason: "unsupported PNG layout" };
  }

  const inflated = inflateSync(Buffer.concat(idatChunks));
  const bytesPerPixel = channels;
  const rowBytes = width * channels;
  let readOffset = 0;
  let previous = Buffer.alloc(rowBytes);
  let current = Buffer.alloc(rowBytes);
  const stepX = Math.max(1, Math.floor(width / 80));
  const stepY = Math.max(1, Math.floor(height / 80));
  const coarseColors = new Set();
  let sampleCount = 0;
  let sum = 0;
  let sumSq = 0;
  let transparentSamples = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[readOffset];
    readOffset += 1;
    const scanline = inflated.subarray(readOffset, readOffset + rowBytes);
    readOffset += rowBytes;

    for (let i = 0; i < rowBytes; i += 1) {
      const raw = scanline[i];
      const left = i >= bytesPerPixel ? current[i - bytesPerPixel] : 0;
      const up = previous[i] || 0;
      const upLeft = i >= bytesPerPixel ? previous[i - bytesPerPixel] : 0;
      let value = raw;
      if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) value = raw + paethPredictor(left, up, upLeft);
      current[i] = value & 255;
    }

    if (y % stepY === 0) {
      for (let x = 0; x < width; x += stepX) {
        const pixel = x * channels;
        const red = current[pixel];
        const green = current[pixel + 1];
        const blue = current[pixel + 2];
        const alpha = channels === 4 ? current[pixel + 3] : 255;
        if (alpha < 10) transparentSamples += 1;
        const luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
        sum += luminance;
        sumSq += luminance * luminance;
        sampleCount += 1;
        coarseColors.add(`${red >> 5}-${green >> 5}-${blue >> 5}-${alpha >> 6}`);
      }
    }

    const swap = previous;
    previous = current;
    current = swap;
  }

  const mean = sampleCount ? sum / sampleCount : 0;
  const variance = sampleCount ? Math.max(0, (sumSq / sampleCount) - (mean * mean)) : 0;
  const blankishPixels = sampleCount > 0 && variance < 8 && coarseColors.size <= 4;

  return {
    supported: true,
    width,
    height,
    sampleCount,
    luminanceMean: Number(mean.toFixed(2)),
    luminanceVariance: Number(variance.toFixed(2)),
    coarseColorCount: coarseColors.size,
    transparentSampleRatio: Number((transparentSamples / Math.max(1, sampleCount)).toFixed(4)),
    blankishPixels
  };
}

async function scrollToLikeHuman(page, targetY) {
  const startY = await page.evaluate(() => window.scrollY).catch(() => 0);
  const delta = targetY - startY;
  if (Math.abs(delta) > 10) {
    const steps = Math.max(1, Math.min(8, Math.ceil(Math.abs(delta) / 520)));
    for (let step = 0; step < steps; step += 1) {
      await page.mouse.wheel(0, delta / steps);
      await page.waitForTimeout(80);
    }
  }
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), targetY);
  await page.waitForTimeout(280);
}

async function getScrollStops(page) {
  const metrics = await page.evaluate(() => {
    const height = Math.max(
      document.body?.scrollHeight || 0,
      document.documentElement?.scrollHeight || 0,
      document.body?.offsetHeight || 0,
      document.documentElement?.offsetHeight || 0
    );
    const viewportHeight = window.innerHeight || 800;
    const maxY = Math.max(0, height - viewportHeight);
    const sections = Array.from(document.querySelectorAll("main, header, footer, section, article, [id]"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return Math.round(rect.top + window.scrollY);
      })
      .filter((value) => Number.isFinite(value) && value >= 0 && value <= maxY);
    const step = Math.max(Math.floor(viewportHeight * 0.65), Math.ceil(Math.max(1, height) / 70));
    const increments = [];
    for (let y = 0; y <= maxY; y += step) increments.push(y);
    increments.push(0, maxY);
    return { height, viewportHeight, maxY, candidates: [...sections, ...increments] };
  });

  return {
    documentHeight: metrics.height,
    viewportHeight: metrics.viewportHeight,
    maxY: metrics.maxY,
    stops: (() => {
      const stops = uniqueSortedNumbers(metrics.candidates, metrics.maxY);
      const maxStops = Math.max(8, Number(process.env.LIVE_BROWSER_MAX_SCROLL_STOPS || 36));
      if (stops.length <= maxStops) return stops;
      const selected = new Set([stops[0], stops[stops.length - 1]]);
      for (let index = 0; index < maxStops - 2; index += 1) {
        selected.add(stops[Math.round((index / Math.max(1, maxStops - 3)) * (stops.length - 1))]);
      }
      return [...selected].sort((a, b) => a - b);
    })()
  };
}

async function inspectViewport(page) {
  return page.evaluate(() => {
    const viewport = {
      width: window.innerWidth || 0,
      height: window.innerHeight || 0
    };
    const viewportArea = Math.max(1, viewport.width * viewport.height);

    function styleVisible(element) {
      if (!element || !(element instanceof Element)) return false;
      const style = window.getComputedStyle(element);
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) > 0.03;
    }

    function visibleArea(rect) {
      const left = Math.max(0, rect.left);
      const top = Math.max(0, rect.top);
      const right = Math.min(viewport.width, rect.right);
      const bottom = Math.min(viewport.height, rect.bottom);
      return Math.max(0, right - left) * Math.max(0, bottom - top);
    }

    function hasVisibleRect(element) {
      if (!styleVisible(element)) return false;
      return Array.from(element.getClientRects()).some((rect) => visibleArea(rect) > 4);
    }

    const textSamples = [];
    let visibleTextChars = 0;
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = String(node.nodeValue || "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const parent = node.parentElement;
      if (!parent || !hasVisibleRect(parent)) continue;
      visibleTextChars += text.length;
      if (textSamples.length < 6) textSamples.push(text.slice(0, 110));
    }

    const visibleElements = [];
    const meaningfulTags = new Set(["a", "button", "input", "textarea", "select", "h1", "h2", "h3", "h4", "p", "li", "table", "img", "video", "canvas", "svg", "iframe"]);
    let meaningfulVisibleElementCount = 0;
    const visibleMedia = [];
    const brokenMedia = [];
    const overlayIssues = [];
    let visibleBackgroundMedia = 0;

    const elements = Array.from(document.body?.querySelectorAll("*") || []);
    for (const element of elements) {
      if (!hasVisibleRect(element)) continue;
      const rect = element.getBoundingClientRect();
      const area = visibleArea(rect);
      if (area <= 4) continue;
      const style = window.getComputedStyle(element);
      const tag = element.tagName.toLowerCase();
      visibleElements.push(tag);
      if (meaningfulTags.has(tag)) meaningfulVisibleElementCount += 1;

      if (style.backgroundImage && style.backgroundImage !== "none") {
        visibleBackgroundMedia += 1;
        visibleMedia.push({ tag, kind: "background-image" });
      }

      if (tag === "img") {
        const image = element;
        if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
          visibleMedia.push({ tag, kind: "image", width: image.naturalWidth, height: image.naturalHeight });
        } else {
          brokenMedia.push({ tag, kind: "image", src: image.currentSrc || image.src || "", reason: "not loaded" });
        }
      } else if (tag === "video") {
        const video = element;
        if (video.readyState >= 2 || video.poster || video.currentSrc || video.src) {
          visibleMedia.push({ tag, kind: "video", readyState: video.readyState, poster: Boolean(video.poster) });
        } else {
          brokenMedia.push({ tag, kind: "video", src: video.currentSrc || video.src || "", reason: "not ready" });
        }
      } else if (tag === "canvas") {
        const canvas = element;
        if (canvas.width > 0 && canvas.height > 0) {
          visibleMedia.push({ tag, kind: "canvas", width: canvas.width, height: canvas.height });
        } else {
          brokenMedia.push({ tag, kind: "canvas", reason: "zero intrinsic size" });
        }
      } else if (tag === "svg") {
        visibleMedia.push({ tag, kind: "svg" });
      } else if (tag === "iframe") {
        visibleMedia.push({ tag, kind: "iframe", src: element.getAttribute("src") || "" });
      }

      const position = style.position;
      const isPassiveBackground =
        style.pointerEvents === "none" ||
        Number(style.zIndex || 0) < 0 ||
        element.getAttribute("aria-hidden") === "true";
      if (!isPassiveBackground && (position === "fixed" || position === "sticky") && area / viewportArea > 0.72 && visibleTextChars < 80) {
        overlayIssues.push({
          tag,
          id: element.id || "",
          className: String(element.className || "").slice(0, 120),
          position,
          areaRatio: Number((area / viewportArea).toFixed(3))
        });
      }
    }

    const centerElement = document.elementFromPoint(Math.floor(viewport.width / 2), Math.floor(viewport.height / 2));
    const centerSurface = centerElement?.closest("section, article, main, header, footer, [id]") || centerElement;
    const centerSurfaceLabel = centerSurface ? {
      tag: centerSurface.tagName.toLowerCase(),
      id: centerSurface.id || "",
      className: String(centerSurface.className || "").slice(0, 120),
      text: String(centerSurface.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160)
    } : null;

    const uniqueVisibleTags = [...new Set(visibleElements)];
    const hasRealContent =
      visibleTextChars >= 30 ||
      visibleMedia.length > 0 ||
      visibleBackgroundMedia > 0 ||
      meaningfulVisibleElementCount >= 4;

    return {
      scrollY: Math.round(window.scrollY || 0),
      viewport,
      visibleTextChars,
      textSamples,
      visibleElementCount: visibleElements.length,
      meaningfulVisibleElementCount,
      uniqueVisibleTags,
      visibleMediaCount: visibleMedia.length,
      visibleMedia: visibleMedia.slice(0, 12),
      visibleBackgroundMedia,
      brokenMedia,
      overlayIssues,
      centerSurface: centerSurfaceLabel,
      hasRealContent,
      blankish: !hasRealContent
    };
  });
}

async function collectVisualScrollProof(page, url, viewport, artifactDir) {
  const scrollPlan = await getScrollStops(page);
  const stopResults = [];
  const urlSlug = slug(url);

  for (let index = 0; index < scrollPlan.stops.length; index += 1) {
    const targetY = scrollPlan.stops[index];
    await scrollToLikeHuman(page, targetY);
    const metrics = await inspectViewport(page);
    const screenshot = path.join(
      artifactDir,
      `${urlSlug}-${viewport.width}x${viewport.height}-scroll-${String(index + 1).padStart(2, "0")}-y${metrics.scrollY}.png`
    );
    const screenshotBuffer = await page.screenshot({ path: screenshot, fullPage: false });
    const screenshotPixelMetrics = analyzePngViewport(screenshotBuffer);
    stopResults.push({
      index: index + 1,
      targetY,
      screenshot,
      ...metrics,
      screenshotPixelMetrics,
      blankish: metrics.blankish || Boolean(screenshotPixelMetrics.blankishPixels)
    });
  }

  await scrollToLikeHuman(page, 0);

  const blankStops = stopResults.filter((stop) => stop.blankish);
  const brokenVisibleMediaStops = stopResults.filter((stop) => stop.brokenMedia.length > 0);
  const overlayStops = stopResults.filter((stop) => stop.overlayIssues.length > 0);

  return {
    required: true,
    method: "headed-browser-human-wheel-scroll",
    documentHeight: scrollPlan.documentHeight,
    viewportHeight: scrollPlan.viewportHeight,
    maxY: scrollPlan.maxY,
    stopCount: stopResults.length,
    stops: stopResults,
    blankStops,
    brokenVisibleMediaStops,
    overlayStops
  };
}

async function exercisePage(page) {
  const actions = [];
  await page.mouse.move(120, 140, { steps: 18 });
  actions.push("moved mouse into page");

  const merserWorldSelectors = [
    ['button:has-text("Focus core")', "clicked Merser focus core"],
    ['button:has-text("Inspect room")', "clicked Merser inspect room"],
    ['button:has-text("360 orbit")', "clicked Merser 360 orbit"],
    ['button:has-text("Free orbit")', "clicked Merser free orbit"],
    ['button:has-text("Focus")', "clicked Merser focus camera"],
    ['button:has-text("Zoom in")', "clicked Merser zoom in"],
    ['button:has-text("Zoom out")', "clicked Merser zoom out"],
    ['button:has-text("Inspect")', "clicked Merser inspect dock"],
    ['button:has-text("Enter chamber")', "clicked Merser enter chamber"],
    ['button:has-text("Pause")', "clicked Merser pause motion reel"],
    ['button:has-text("Resume")', "clicked Merser resume motion reel"],
    ['a:has-text("Scroll path")', "clicked Merser scroll path"],
    ['a:has-text("Source packs")', "clicked Merser source packs"],
    ['.source-room-switcher button', "clicked Merser source room switcher"],
    ['.minimap-dot', "clicked Merser minimap room dot"]
  ];

  for (let cycle = 1; cycle <= browserPolicy.minimumCyclesPerViewport; cycle += 1) {
    for (const [selector, label] of merserWorldSelectors) {
      if (actions.length >= browserPolicy.minimumTotalActionsPerViewport) break;
      await clickIfVisible(page, selector, actions, `cycle ${cycle} ${label}`);
    }
    if (actions.length >= browserPolicy.minimumTotalActionsPerViewport) break;
  }

  await clickIfVisible(page, '[data-menu-toggle]', actions, "clicked menu toggle");
  await clickIfVisible(page, 'button:has-text("Menu")', actions, "clicked Menu button");
  const clickedServices = await clickIfVisible(page, 'a:has-text("Services")', actions, "clicked Services navigation");
  if (clickedServices) await page.goBack({ waitUntil: "networkidle", timeout: 8000 }).catch(() => {});

  const clickedOpenApp = await clickIfVisible(page, 'a:has-text("Open full app")', actions, "clicked Open full app");
  if (clickedOpenApp) await page.goBack({ waitUntil: "networkidle", timeout: 8000 }).catch(() => {});
  await clickIfVisible(page, 'a:has-text("Start intake")', actions, "clicked intake CTA");

  await typeIfVisible(page, 'input[name="name"]', "Live Browser Proof", actions, "typed proof name");
  await typeIfVisible(page, 'input[name="contact"]', "proof@example.com", actions, "typed proof contact");
  await typeIfVisible(page, "textarea", "Headed live browser proof interaction.", actions, "typed proof note");

  if (await visibleLocator(page, '[data-key="Enter"]')) {
    for (const key of ["1", "3", "7", "9", "Enter"]) {
      await clickIfVisible(page, `[data-key="${key}"]`, actions, `clicked keypad ${key}`);
    }
    await page.waitForTimeout(700);
  }

  if (actions.length < 2) {
    await clickIfVisible(page, "nav a[href]", actions, "clicked first navigation link");
    await page.goBack({ waitUntil: "networkidle", timeout: 8000 }).catch(() => {});
  }

  if (actions.length < 2) {
    await clickIfVisible(page, "button.primary:not([disabled])", actions, "clicked primary dashboard button");
  }

  if (actions.length < 2) {
    await clickIfVisible(page, "main button:not([disabled])", actions, "clicked dashboard button");
  }

  if (actions.length < 2) {
    await clickIfVisible(page, "a[href]", actions, "clicked first visible link");
    await page.goBack({ waitUntil: "networkidle", timeout: 8000 }).catch(() => {});
  }

  if (actions.length < 2) {
    const viewport = page.viewportSize() || { width: 390, height: 844 };
    await page.mouse.wheel(0, Math.floor(viewport.height * 0.8));
    actions.push("scrolled page");
    await page.waitForTimeout(500);
  }

  if (actions.length < 3) {
    const clickedVisibleCta =
      await clickIfVisible(page, 'a:has-text("Build worlds")', actions, "clicked Build worlds CTA") ||
      await clickIfVisible(page, 'a:has-text("Use the MCP")', actions, "clicked Use the MCP CTA") ||
      await clickIfVisible(page, 'a[href="#worlds"]', actions, "clicked worlds anchor") ||
      await clickIfVisible(page, 'a[href="#remote"]', actions, "clicked remote anchor");
    if (clickedVisibleCta) await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  }

  const tabLikeSelectors = [
    '[role="tab"]',
    '[data-tab]',
    'button:has-text("Portfolio")',
    'button:has-text("Work")',
    'button:has-text("Proof")',
    'button:has-text("Apps")',
    'button:has-text("SkyeKnowlogy")',
    'a[href="#portfolio"]',
    'a[href="#proof"]',
    'a[href="#skyeknowlogy"]'
  ];
  for (const selector of tabLikeSelectors) {
    if (actions.length >= 6) break;
    await clickIfVisible(page, selector, actions, `clicked ${selector}`);
  }

  const appStressSelectors = [
    ["#generateBtn", "clicked Social Batch Generate Batch"],
    ["#auditBtn", "clicked Social Batch Audit"],
    ['#filters .chip:has-text("Instagram")', "clicked Instagram filter"],
    ['#filters .chip:has-text("Ads")', "clicked Ads filter"],
    ['#filters .chip:has-text("All")', "clicked All filter"],
    ["#safeBtn", "toggled Safe Zone"],
    ["#shuffleBtn", "clicked Remix Copy"],
    ["#duplicateBtn", "clicked Duplicate Variant"],
    ["#regenSelectedBtn", "clicked Re-render"],
    ['.aiPlanCard[data-plan="social-batch-ai-burst"]', "selected AI Burst plan"],
    ["#aiRefreshBtn", "clicked AI Refresh Meter"],
    ["#aiClaimBtn", "clicked AI Claim disabled/pending state"],
    ['.aiPlanCard[data-plan="social-batch-ai-studio"]', "selected AI Studio plan"],
    ['.aiPlanCard[data-plan="free99-core"]', "returned to Free99 Core plan"]
  ];

  for (let cycle = 1; cycle <= browserPolicy.minimumCyclesPerViewport; cycle += 1) {
    await typeIfVisible(page, "#brandName", `Live Browser Proof ${cycle}`, actions, `cycle ${cycle} edited brand name`);
    await typeIfVisible(page, "#campaignName", `Verifier Stress Cycle ${cycle}`, actions, `cycle ${cycle} edited campaign name`);
    await typeIfVisible(page, "#idea", `Cycle ${cycle} proves the app can be used like a real operator would use it, including plan state, filters, canvas updates, and export-adjacent controls.`, actions, `cycle ${cycle} edited campaign idea`);
    await setValueIfVisible(page, "#logoScale", String(74 + cycle * 8), actions, `cycle ${cycle} adjusted logo scale`);
    await setValueIfVisible(page, "#imageFocus", String(35 + cycle * 10), actions, `cycle ${cycle} adjusted image focus`);
    await typeIfVisible(page, "#aiEmail", `proof+cycle${cycle}@example.com`, actions, `cycle ${cycle} typed AI checkout email`);
    await typeIfVisible(page, "#aiSessionId", `cs_policy_unpaid_cycle_${cycle}`, actions, `cycle ${cycle} typed returned checkout session placeholder`);

    for (const [selector, label] of appStressSelectors) {
      if (actions.length >= browserPolicy.minimumTotalActionsPerViewport) break;
      await clickIfVisible(page, selector, actions, `cycle ${cycle} ${label}`);
    }

    await assertVisibleState(page, "#aiPlanBadge", actions, `cycle ${cycle} saw AI plan badge`);
    await assertVisibleState(page, "#aiStatus", actions, `cycle ${cycle} saw AI status`);
    await assertVisibleState(page, "#aiMeterCount", actions, `cycle ${cycle} saw AI meter`);
    await assertVisibleState(page, "#batchCount", actions, `cycle ${cycle} saw batch count`);
    await assertVisibleState(page, "#selectedMeta", actions, `cycle ${cycle} saw selected creative dimensions`);

    const viewport = page.viewportSize() || { width: 390, height: 844 };
    await page.mouse.wheel(0, Math.floor(viewport.height * 0.55));
    actions.push(`cycle ${cycle} human wheel scroll`);
    await page.waitForTimeout(350);
    await page.mouse.wheel(0, -Math.floor(viewport.height * 0.35));
    actions.push(`cycle ${cycle} human wheel scroll back`);
    await page.waitForTimeout(250);
  }

  return actions;
}

async function verifyUrl(browser, url, expects, viewport, artifactDir) {
  const context = await browser.newContext({
    viewport,
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
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || "request failed"
    });
  });

  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: navigationTimeoutMs });
  await page.waitForLoadState("networkidle", { timeout: 9000 }).catch(() => {});
  await page.waitForTimeout(900);
  await page
    .waitForFunction(() => document.querySelectorAll("main button, main a[href], [role='button']").length >= 4, null, {
      timeout: 12000
    })
    .catch(() => {});
  const initialBodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  const initialTitle = await page.title().catch(() => "");
  const actions = await exercisePage(page);
  const urlAfterActions = page.url();
  if (comparableUrl(urlAfterActions) !== comparableUrl(url)) {
    actions.push(`returned to proof URL after navigation: ${urlAfterActions}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: navigationTimeoutMs });
    await page.waitForLoadState("networkidle", { timeout: 9000 }).catch(() => {});
  }
  await page.waitForTimeout(700);

  const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  const title = await page.title().catch(() => "");
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
  const combinedText = `${initialBodyText}\n${bodyText}`;
  const missingText = expects.filter((text) => !combinedText.includes(text));
  const imageCount = await page.locator("img").count().catch(() => 0);
  const visualScrollProof = await collectVisualScrollProof(page, url, viewport, artifactDir);
  const screenshot = path.join(artifactDir, `${slug(url)}-${viewport.width}x${viewport.height}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  await context.close();

  return {
    url,
    viewport,
    status: response?.status() || 0,
    okStatus: Boolean(response?.ok()),
    initialTitle,
    title,
    urlAfterActions,
    finalUrl: page.url(),
    actions,
    humanActionCount: actions.filter((action) => !action.startsWith("returned to proof URL")).length,
    consoleErrors,
    failedRequests,
    missingText,
    horizontalOverflowPx: overflow,
    imageCount,
    visualScrollProof,
    screenshot
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.urls.length === 0) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactDir = args.out
    ? path.resolve(args.out)
    : path.join(repoRoot, "test-artifacts/live-browser-verifier", `${stamp}-${slug(args.label || args.urls[0])}`);
  fs.mkdirSync(artifactDir, { recursive: true });

  let browser;
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    mode: "headed-live-browser",
    headless: false,
    browserPolicy,
    navigationTimeoutMs,
    urls: args.urls,
    expects: args.expects,
    artifactDir,
    checks: [],
    failures: []
  };

  try {
    browser = await chromium.launch({
      headless: false,
      slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 120),
      args: process.platform === "linux" ? [
        "--ozone-platform=x11",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-features=VizDisplayCompositor"
      ] : []
    });
  } catch (error) {
    report.failures.push(`Could not launch headed Chromium: ${error.message}`);
    const reportPath = path.join(artifactDir, "live-browser-verification-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.error(JSON.stringify({ ok: false, report: reportPath, failures: report.failures }, null, 2));
    process.exit(1);
  }

  const viewports = [
    { width: 1440, height: 980 },
    { width: 390, height: 844 }
  ];

  for (const url of args.urls) {
    for (const viewport of viewports) {
      let check;
      try {
        check = await verifyUrl(browser, url, args.expects, viewport, artifactDir);
      } catch (error) {
        check = {
          url,
          viewport,
          status: 0,
          okStatus: false,
          initialTitle: "",
          title: "",
          urlAfterActions: "",
          finalUrl: "",
          actions: [],
          humanActionCount: 0,
          consoleErrors: [],
          failedRequests: [],
          missingText: args.expects,
          horizontalOverflowPx: 0,
          imageCount: 0,
          visualScrollProof: { blankStops: [], brokenVisibleMediaStops: [], overlayStops: [] },
          screenshot: "",
          error: error?.stack || error?.message || String(error)
        };
        report.failures.push(`${url} ${viewport.width}x${viewport.height} verifier error: ${error?.message || String(error)}`);
      }
      report.checks.push(check);
      if (!check.okStatus) report.failures.push(`${url} ${viewport.width}x${viewport.height} returned status ${check.status}`);
      if (check.consoleErrors.length) report.failures.push(`${url} ${viewport.width}x${viewport.height} console errors: ${check.consoleErrors.join(" | ")}`);
      if (check.failedRequests.length) report.failures.push(`${url} ${viewport.width}x${viewport.height} failed requests: ${check.failedRequests.map((item) => item.url).join(" | ")}`);
      if (check.missingText.length) report.failures.push(`${url} ${viewport.width}x${viewport.height} missing text: ${check.missingText.join(" | ")}`);
      if (check.horizontalOverflowPx > 2) report.failures.push(`${url} ${viewport.width}x${viewport.height} horizontal overflow ${check.horizontalOverflowPx}px`);
      if (check.humanActionCount < browserPolicy.minimumActionsPerViewport) report.failures.push(`${url} ${viewport.width}x${viewport.height} did not complete enough human-style actions (${check.humanActionCount}/${browserPolicy.minimumActionsPerViewport})`);
      if (check.humanActionCount < browserPolicy.minimumTotalActionsPerViewport) report.failures.push(`${url} ${viewport.width}x${viewport.height} did not complete browser stress action floor (${check.humanActionCount}/${browserPolicy.minimumTotalActionsPerViewport})`);
      if (check.visualScrollProof.blankStops.length) {
        report.failures.push(`${url} ${viewport.width}x${viewport.height} blank visual scroll stops: ${check.visualScrollProof.blankStops.map((stop) => `#${stop.index}@y=${stop.scrollY}`).join(", ")}`);
      }
      if (check.visualScrollProof.brokenVisibleMediaStops.length) {
        report.failures.push(`${url} ${viewport.width}x${viewport.height} broken visible media at stops: ${check.visualScrollProof.brokenVisibleMediaStops.map((stop) => `#${stop.index}@y=${stop.scrollY}`).join(", ")}`);
      }
      if (check.visualScrollProof.overlayStops.length) {
        report.failures.push(`${url} ${viewport.width}x${viewport.height} large sticky/fixed overlay covering content at stops: ${check.visualScrollProof.overlayStops.map((stop) => `#${stop.index}@y=${stop.scrollY}`).join(", ")}`);
      }
    }
  }

  await browser.close();
  report.ok = report.failures.length === 0;
  const reportPath = path.join(artifactDir, "live-browser-verification-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  if (!report.ok) {
    console.error(JSON.stringify({ ok: false, report: reportPath, failures: report.failures }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, report: reportPath, checks: report.checks.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
