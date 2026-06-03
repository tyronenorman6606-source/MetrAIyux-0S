#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skymailRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(skymailRoot, "../../..");
const baseUrl = process.env.SKYEMAIL_LIVE_BASE || "https://skyemail-platform.graylondonskyes.workers.dev";
const zeroOsBase = process.env.ZERO_OS_LIVE_BASE || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== "linux") return;
  if (process.env.DISPLAY || process.env.LIVE_BROWSER_XVFB_ACTIVE === "1") return;
  const probe = spawnSync("which", ["xvfb-run"], { encoding: "utf8" });
  if (probe.status !== 0) return;
  const child = spawnSync("xvfb-run", ["-a", process.execPath, ...process.argv.slice(1)], {
    stdio: "inherit",
    env: { ...process.env, LIVE_BROWSER_XVFB_ACTIVE: "1" },
  });
  process.exit(child.status ?? 1);
}

relaunchWithXvfbWhenNeeded();

function parseEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim().replace(/^export\s+/, "");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

const localEnv = {
  ...parseEnv(path.join(repoRoot, ".env")),
  ...parseEnv(path.join(skymailRoot, ".env")),
  ...process.env,
};

const secretValues = Object.entries(localEnv)
  .filter(([key, value]) => /(TOKEN|SECRET|PASSWORD|CODE|KEY|DATABASE|CLIENT)/i.test(key) && String(value || "").length > 5)
  .map(([, value]) => String(value));

function redact(value) {
  let text = typeof value === "string" ? value : JSON.stringify(value || {});
  for (const secret of secretValues) text = text.split(secret).join("[redacted]");
  return text.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]");
}

function cleanToken(value) {
  return String(value || "").replace(/^Bearer\s+/i, "").trim();
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function slug(value) {
  return String(value || "proof").toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "proof";
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function assertBrowserProofPreflight() {
  const ownerAllowed = process.env.SKYEMAIL_OWNER_BROWSER_PROOF === "1" || process.env.OWNER_BROWSER_PROOF_REENABLED === "1";
  if (!ownerAllowed) {
    throw new Error("Browser proof is disabled by repo policy unless SKYEMAIL_OWNER_BROWSER_PROOF=1 or OWNER_BROWSER_PROOF_REENABLED=1 is set for the current task.");
  }
  const smokePath = path.join(repoRoot, "test-artifacts/skyemail-human-production-smoke-latest.json");
  const stressPath = path.join(repoRoot, "test-artifacts/skyemail-live-production-stress-latest.json");
  const smoke = readJson(smokePath, {});
  const stress = readJson(stressPath, {});
  if (smoke.ok !== true) throw new Error(`Browser proof preflight failed: latest human smoke is not ok at ${smokePath}`);
  if (stress.ok !== true) throw new Error(`Browser proof preflight failed: latest production stress is not ok at ${stressPath}`);
  return {
    smoke: { path: smokePath, generated_at: smoke.generated_at || smoke.completed_at || "", selected_mailbox: smoke.selected_mailbox || "", passed_checks: smoke.checks?.filter?.((item) => item.ok).length || 0 },
    stress: { path: stressPath, generated_at: stress.generated_at || "", selected_mailbox: stress.selected_mailbox || "", requests: stress.stress?.total_requests || 0 }
  };
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { response, data };
}

async function resolveSkyeMailSession() {
  const provided = cleanToken(localEnv.SKYEMAIL_PROOF_TOKEN || localEnv.SKYEMAIL_SESSION_TOKEN || "");
  if (provided) return { token: provided, ownerSource: "provided-skymail-token", user: null };

  const codes = [
    "FREE99_ADMIN_CODE",
    "OWNER_ADMIN_CODE",
    "METRAIYUX_OWNER_ADMIN_CODE",
    "FREE99_OWNER_CODE",
    "FS27_ADMIN_CODE",
    "ADMIN_CODE",
    "FREE99_GATE_CODE",
  ].map((key) => localEnv[key]).filter(Boolean);

  let ownerToken = "";
  let ownerSource = "";
  for (const code of codes) {
    const { response, data } = await jsonFetch(`${zeroOsBase}/api/owner/admin-login`, {
      method: "POST",
      body: JSON.stringify({ code }),
    }).catch(() => ({ response: null, data: {} }));
    const token = cleanToken(data.gateToken || data.gateBearerToken || data.token);
    if (response?.ok && token) {
      ownerToken = token;
      ownerSource = data.gateToken || data.gateBearerToken ? "owner-admin-fs27-gate-token" : "owner-admin-token";
      break;
    }
  }
  if (!ownerToken) throw new Error("Could not resolve a shared owner gate token from local env.");

  const imported = await jsonFetch(`${baseUrl}/auth-fs27-session`, {
    method: "POST",
    headers: { authorization: `Bearer ${ownerToken}` },
    body: "{}",
  });
  if (!imported.response.ok || !imported.data.token) {
    throw new Error(`SkyeMail auth-fs27-session failed (${imported.response.status}).`);
  }
  return {
    token: imported.data.token,
    ownerToken,
    ownerSource,
    user: imported.data.user ? { email: imported.data.user.email || null, handle: imported.data.user.handle || null } : null,
  };
}

function analyzePng(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return { supported: false };
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const chunks = [];
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const start = offset + 8;
    const end = start + length;
    if (end > buffer.length) break;
    if (type === "IHDR") {
      width = buffer.readUInt32BE(start);
      height = buffer.readUInt32BE(start + 4);
      bitDepth = buffer[start + 8];
      colorType = buffer[start + 9];
    } else if (type === "IDAT") chunks.push(buffer.subarray(start, end));
    else if (type === "IEND") break;
    offset = end + 4;
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!width || !height || bitDepth !== 8 || !channels || !chunks.length) return { supported: false, width, height, bitDepth, colorType };
  const data = inflateSync(Buffer.concat(chunks));
  const rowBytes = width * channels;
  const previous = Buffer.alloc(rowBytes);
  const current = Buffer.alloc(rowBytes);
  const colors = new Set();
  let read = 0;
  let sampleCount = 0;
  let sum = 0;
  let sumSq = 0;
  const stepX = Math.max(1, Math.floor(width / 80));
  const stepY = Math.max(1, Math.floor(height / 80));
  function paeth(left, up, upLeft) {
    const p = left + up - upLeft;
    const pa = Math.abs(p - left);
    const pb = Math.abs(p - up);
    const pc = Math.abs(p - upLeft);
    if (pa <= pb && pa <= pc) return left;
    return pb <= pc ? up : upLeft;
  }
  for (let y = 0; y < height; y += 1) {
    const filter = data[read++];
    const scanline = data.subarray(read, read + rowBytes);
    read += rowBytes;
    for (let i = 0; i < rowBytes; i += 1) {
      const raw = scanline[i];
      const left = i >= channels ? current[i - channels] : 0;
      const up = previous[i] || 0;
      const upLeft = i >= channels ? previous[i - channels] : 0;
      let value = raw;
      if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) value = raw + paeth(left, up, upLeft);
      current[i] = value & 255;
    }
    if (y % stepY === 0) {
      for (let x = 0; x < width; x += stepX) {
        const pixel = x * channels;
        const red = current[pixel];
        const green = current[pixel + 1];
        const blue = current[pixel + 2];
        const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        colors.add(`${red >> 5}-${green >> 5}-${blue >> 5}`);
        sum += luminance;
        sumSq += luminance * luminance;
        sampleCount += 1;
      }
    }
    previous.set(current);
  }
  const mean = sampleCount ? sum / sampleCount : 0;
  const variance = sampleCount ? Math.max(0, sumSq / sampleCount - mean * mean) : 0;
  return {
    supported: true,
    width,
    height,
    sampleCount,
    luminanceMean: Number(mean.toFixed(2)),
    luminanceVariance: Number(variance.toFixed(2)),
    coarseColorCount: colors.size,
    blankishPixels: variance < 8 && colors.size <= 4,
  };
}

function attachWatchers(page, entry) {
  page.on("console", (message) => {
    if (message.type() === "error") entry.consoleErrors.push(redact(message.text()).slice(0, 1200));
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "request failed";
    if (!failure.includes("ERR_ABORTED")) entry.failedRequests.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), failure });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      entry.failedResponses.push({ url: response.url(), status, method: response.request().method(), resourceType: response.request().resourceType() });
    }
  });
}

async function viewportMetrics(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity || 1) < 0.04) return false;
      return Array.from(el.getClientRects()).some((rect) => rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth && rect.width * rect.height > 8);
    };
    let visibleTextChars = 0;
    const textSamples = [];
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = String(walker.currentNode.nodeValue || "").replace(/\s+/g, " ").trim();
      const parent = walker.currentNode.parentElement;
      if (!text || !parent || !visible(parent)) continue;
      visibleTextChars += text.length;
      if (textSamples.length < 6) textSamples.push(text.slice(0, 120));
    }
    const elements = Array.from(document.querySelectorAll("a,button,input,textarea,select,img,video,canvas,svg,section,article,main,aside"));
    const visibleElements = elements.filter(visible);
    const media = [];
    const brokenMedia = [];
    for (const el of visibleElements) {
      const tag = el.tagName.toLowerCase();
      const style = getComputedStyle(el);
      if (style.backgroundImage && style.backgroundImage !== "none") media.push({ tag, kind: "background-image" });
      if (tag === "img") {
        if (el.complete && el.naturalWidth > 0) media.push({ tag, kind: "image", width: el.naturalWidth, height: el.naturalHeight });
        else brokenMedia.push({ tag, kind: "image", src: el.currentSrc || el.src || "" });
      }
      if (tag === "video") {
        if (el.readyState >= 1 || el.poster || el.currentSrc || el.src) media.push({ tag, kind: "video", readyState: el.readyState, poster: Boolean(el.poster) });
        else brokenMedia.push({ tag, kind: "video", src: el.currentSrc || el.src || "" });
      }
      if (tag === "canvas") media.push({ tag, kind: "canvas", width: el.width || 0, height: el.height || 0 });
      if (tag === "svg") media.push({ tag, kind: "svg" });
    }
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
    const overflowX = Math.max(0, scrollWidth - innerWidth);
    const backgroundPartial = Boolean(document.querySelector("[data-skyemail-background-partial]"));
    const bodyText = document.body?.innerText || "";
    return {
      url: location.href,
      title: document.title,
      scrollY: Math.round(scrollY),
      viewport: { width: innerWidth, height: innerHeight },
      visibleTextChars,
      textSamples,
      visibleElementCount: visibleElements.length,
      mediaCount: media.length,
      media: media.slice(0, 14),
      brokenMedia,
      overflowX,
      backgroundPartial,
      bodyHasAccessDenied: /Access Denied/i.test(bodyText),
      bodyHasMailboxLoadFailed: /Mailbox load failed/i.test(bodyText),
      bodyHasRouteNotImplemented: /route not implemented|not implemented/i.test(bodyText),
    };
  });
}

async function scrollProof(page, artifactDir, label, entry) {
  const plan = await page.evaluate(() => {
    const height = Math.max(document.body?.scrollHeight || 0, document.documentElement.scrollHeight || 0);
    const maxY = Math.max(0, height - innerHeight);
    const sections = Array.from(document.querySelectorAll("header,main,section,article,aside,footer,[id]"))
      .map((el) => Math.max(0, Math.min(maxY, Math.round(el.getBoundingClientRect().top + scrollY))))
      .filter((value) => Number.isFinite(value));
    if (maxY < 80) return { height, maxY, stops: [0] };
    const rawStops = [...new Set([0, Math.round(maxY * 0.33), Math.round(maxY * 0.66), maxY, ...sections])].sort((a, b) => a - b);
    const maxStops = Math.max(1, Math.min(8, Number(window.__SKYEMAIL_PROOF_MAX_SCROLL_STOPS || 6)));
    if (maxStops === 1) return { height, maxY, stops: [0] };
    if (rawStops.length <= maxStops) return { height, maxY, stops: rawStops };
    const selected = new Set([rawStops[0], rawStops[rawStops.length - 1]]);
    for (let index = 1; index < maxStops - 1; index += 1) {
      selected.add(rawStops[Math.round((index / Math.max(1, maxStops - 1)) * (rawStops.length - 1))]);
    }
    return { height, maxY, stops: [...selected].sort((a, b) => a - b) };
  });
  const seenScrollY = new Set();
  for (let index = 0; index < plan.stops.length; index += 1) {
    const target = plan.stops[index];
    await page.mouse.wheel(0, target - await page.evaluate(() => scrollY).catch(() => 0));
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), target);
    await page.waitForTimeout(260);
    const metrics = await viewportMetrics(page);
    if (seenScrollY.has(metrics.scrollY)) {
      entry.actions.push(`skipped duplicate visual stop ${label} y${metrics.scrollY}`);
      continue;
    }
    seenScrollY.add(metrics.scrollY);
    const screenshot = path.join(artifactDir, `${label}-scroll-${String(index + 1).padStart(2, "0")}-y${metrics.scrollY}.png`);
    await page.screenshot({
      path: screenshot,
      type: "png",
      fullPage: false,
      animations: "disabled",
      caret: "hide",
      scale: "css",
      timeout: Number(process.env.LIVE_BROWSER_SCREENSHOT_TIMEOUT_MS || 20000),
    });
    const buffer = fs.readFileSync(screenshot);
    const pixels = analyzePng(buffer);
    const blankish = (metrics.visibleTextChars < 30 && metrics.mediaCount < 1 && metrics.visibleElementCount < 6) || pixels.blankishPixels;
    const stop = { index: index + 1, targetY: target, screenshot, metrics, pixels, blankish };
    entry.scrollStops.push(stop);
    if (blankish) entry.failures.push(`blank visual stop ${label} #${index + 1}`);
    if (metrics.brokenMedia.length) entry.failures.push(`broken visible media ${label} #${index + 1}`);
    if (metrics.overflowX > 8) entry.failures.push(`horizontal overflow ${label} ${metrics.overflowX}px`);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })).catch(() => {});
}

async function safeClick(page, selector, entry, label, options = {}) {
  const { waitForNetwork = true, postClickWaitMs = 350, ...clickOptions } = options;
  const locator = page.locator(selector).first();
  if (!(await locator.isVisible().catch(() => false))) return false;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.click({ timeout: 6000, ...clickOptions }).catch((error) => {
    entry.failures.push(`${label} click failed: ${redact(error.message)}`);
  });
  entry.actions.push(label);
  if (waitForNetwork) await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(postClickWaitMs);
  return true;
}

async function safeFill(page, selector, value, entry, label) {
  const locator = page.locator(selector).first();
  if (!(await locator.isVisible().catch(() => false))) return false;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  let filled = false;
  let firstError = null;
  await locator.fill(value, { timeout: 5000 })
    .then(() => { filled = true; })
    .catch((error) => { firstError = error; });
  if (!filled) {
    const existing = await locator.inputValue({ timeout: 1000 }).catch(() => "");
    if (String(existing || "").trim()) {
      entry.actions.push(`${label} already populated`);
      await page.waitForTimeout(120);
      return true;
    }
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await locator.click({ timeout: 3000 }).catch(() => {});
    await page.keyboard.press(`${modifier}+A`).catch(() => {});
    await page.keyboard.type(value, { delay: 5 }).catch(() => {});
    const typed = await locator.inputValue({ timeout: 1000 }).catch(() => "");
    if (String(typed || "").trim()) filled = true;
  }
  if (!filled) {
    entry.failures.push(`${label} fill failed: ${redact(firstError?.message || "field did not accept text")}`);
    return false;
  }
  entry.actions.push(label);
  await page.waitForTimeout(180);
  return true;
}

async function openPage(page, url, entry) {
  let response = null;
  try {
    response = await page.goto(url, { waitUntil: "commit", timeout: 15000 });
    await page.waitForFunction(() => Boolean(document.body && document.body.innerText && document.body.innerText.trim().length > 20), null, { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
  } catch (error) {
    entry.actions.push(`commit timeout fallback for ${url}: ${redact(error.message).split("\n")[0]}`);
    response = await page.goto(url, { waitUntil: "commit", timeout: 20000 });
    await page.waitForFunction(() => Boolean(document.body && document.body.innerText && document.body.innerText.trim().length > 20), null, { timeout: 12000 }).catch(() => {});
  }
  await page.waitForLoadState("networkidle", { timeout: 3500 }).catch(() => {});
  await page.waitForTimeout(700);
  entry.status = response?.status() || 0;
  entry.finalUrl = page.url();
  entry.title = await page.title().catch(() => "");
  entry.actions.push(`opened ${url}`);
  if (!response?.ok()) entry.failures.push(`navigation status ${entry.status}`);
}

async function runPublicPage(browser, artifactDir, viewport, route) {
  const label = `${slug(route || "root")}-${viewport.width}x${viewport.height}`;
  const entry = { kind: "public-page", route, viewport, actions: [], scrollStops: [], consoleErrors: [], failedRequests: [], failedResponses: [], failures: [] };
  let context = null;
  try {
    context = await browser.newContext({ viewport, ignoreHTTPSErrors: true, isMobile: viewport.width < 700 });
    await context.addInitScript((maxStops) => { window.__SKYEMAIL_PROOF_MAX_SCROLL_STOPS = maxStops; }, Number(process.env.LIVE_BROWSER_SKYEMAIL_MAX_SCROLL_STOPS || 6));
    const page = await context.newPage();
    attachWatchers(page, entry);
    const originalUrl = `${baseUrl}${route}`;
    await openPage(page, originalUrl, entry);
    const body = await page.evaluate(() => document.body?.innerText || "").catch(() => "");
    if (!/SkyeMail|SkyEmail/i.test(body)) entry.failures.push("SkyeMail brand text not visible");
    await scrollProof(page, artifactDir, label, entry);
    const pricingRect = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll("a")).find((item) => {
        const href = item.getAttribute("href") || "";
        return href === "/pricing" || href === "pricing.html" || /pricing/i.test(item.textContent || "");
      });
      if (!link) return null;
      link.scrollIntoView({ block: "center", inline: "center" });
      const rect = link.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }).catch(() => null);
    if (pricingRect) {
      await page.mouse.click(pricingRect.x, pricingRect.y);
      entry.actions.push("clicked pricing/navigation link");
      await page.waitForURL(/\/pricing\/?$/, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700);
    }
  } catch (error) {
    entry.failures.push(redact(error.stack || error.message));
  } finally {
    await context?.close().catch(() => {});
  }
  return entry;
}

async function installSession(context, session) {
  await context.addInitScript(({ token, user }) => {
    const value = { token, source: "skyemail-client-live-browser-proof", platform_id: "skyemail", usage_lane: "mail", user, issued_at: new Date().toISOString() };
    for (const store of [localStorage, sessionStorage]) {
      store.setItem("SMV_SKYEMAIL_SESSION", JSON.stringify(value));
      store.setItem("SMV_AUTH_TOKEN", token);
      store.setItem("free99_gate_session", token);
      store.setItem("skye_gate_session", token);
      store.setItem("SKYGATEFS27_GATE_SESSION", token);
      store.setItem("adminBrainToken", token);
    }
  }, { token: session.token, user: session.user || null });
}

async function runAuthWorkspace(browser, artifactDir, viewport, session) {
  const label = `workspace-${viewport.width}x${viewport.height}`;
  const entry = { kind: "authenticated-workspace", viewport, actions: [], assertions: [], downloads: [], scrollStops: [], consoleErrors: [], failedRequests: [], failedResponses: [], failures: [] };
  let context = null;
  try {
    context = await browser.newContext({ viewport, ignoreHTTPSErrors: true, isMobile: viewport.width < 700, acceptDownloads: true });
    await context.addInitScript((maxStops) => { window.__SKYEMAIL_PROOF_MAX_SCROLL_STOPS = maxStops; }, Number(process.env.LIVE_BROWSER_SKYEMAIL_MAX_SCROLL_STOPS || 6));
    await installSession(context, session);
    const page = await context.newPage();
    attachWatchers(page, entry);
    await openPage(page, `${baseUrl}/dashboard`, entry);
    await page.waitForSelector("#mailList", { timeout: 25000 });
    await page.waitForFunction(() => !/Loading mailbox/i.test(document.querySelector("#mailList")?.innerText || ""), null, { timeout: 25000 }).catch(() => {});
    let dash = await viewportMetrics(page);
    entry.assertions.push({ name: "dashboard_loaded_without_access_denied", ok: !dash.bodyHasAccessDenied && !dash.bodyHasMailboxLoadFailed, state: { accessDenied: dash.bodyHasAccessDenied, mailboxLoadFailed: dash.bodyHasMailboxLoadFailed } });
    await safeClick(page, "#refreshBtn", entry, "clicked dashboard refresh");
    const firstSubject = await page.locator(".mail-subject").first().innerText({ timeout: 6000 }).catch(() => "");
    if (firstSubject) {
      await safeFill(page, "#q", firstSubject.split(/\s+/).find(Boolean) || firstSubject.slice(0, 12), entry, "typed inbox search from visible subject");
      await safeClick(page, "#applyBtn", entry, "clicked inbox search apply");
      await safeClick(page, "#clearBtn", entry, "clicked inbox search clear");
    }
    const star = page.locator("[data-single-star]").first();
    if (!(await star.isVisible().catch(() => false))) {
      await safeClick(page, "#proofLoopBtn", entry, "clicked send and receive proof loop to create a visible inbox message");
      await page.waitForFunction(() => document.querySelector("[data-single-star]"), null, { timeout: 20000 }).catch(() => {});
    }
    if (await star.isVisible().catch(() => false)) {
      const before = await star.getAttribute("data-on");
      await star.click();
      entry.actions.push("clicked first message star toggle");
      await page.waitForFunction((previous) => {
        const control = document.querySelector("[data-single-star]");
        return control && control.getAttribute("data-on") !== previous;
      }, before, { timeout: 8000 }).catch(() => {});
      const after = await page.locator("[data-single-star]").first().getAttribute("data-on").catch(() => "");
      entry.assertions.push({ name: "star_toggle_changed_state", ok: before !== after, state: { before, after } });
      await page.locator("[data-single-star]").first().click().catch(() => {});
      entry.actions.push("restored first message star state");
      await page.waitForTimeout(1200);
    } else {
      entry.failures.push("no visible message star control");
    }
    const check = page.locator("[data-mail-check]").first();
    if (await check.isVisible().catch(() => false)) {
      await check.check();
      entry.actions.push("selected first mailbox message");
      await page.selectOption("#handoffTargets", ["SkyeProofx"]).catch(() => {});
      entry.actions.push("selected SkyeProofx handoff target");
      await safeFill(page, "#handoffLabel", `Client proof packet ${new Date().toISOString()}`, entry, "filled handoff packet label");
      await safeFill(page, "#handoffNotes", "Live headed browser proof: packet archive, review, execution, and dispatch controls are wired in production.", entry, "filled handoff packet notes");
      await safeClick(page, "#archivePacketBtn", entry, "clicked archive mail handoff packet");
      await page.waitForFunction(() => /Archived mail handoff packet/i.test(document.querySelector("#statusText")?.innerText || ""), null, { timeout: 12000 }).catch(() => {});
      await safeFill(page, "#reviewOwner", "proof@solenterprises.org", entry, "filled review owner");
      await safeFill(page, "#reviewCheckpoint", "Client proof review ready", entry, "filled review checkpoint");
      await safeFill(page, "#reviewNotes", "Review board verified in production browser.", entry, "filled review notes");
      await page.selectOption("#reviewStatus", "ready").catch(() => {});
      entry.actions.push("selected review ready status");
      await safeClick(page, "#saveReviewBtn", entry, "clicked save latest packet review");
      await safeFill(page, "#executionOwner", "ops@solenterprises.org", entry, "filled execution owner");
      await safeFill(page, "#executionNextAction", "Route packet into client proof lane", entry, "filled execution next action");
      await safeClick(page, "#queueExecutionBtn", entry, "clicked queue latest packet execution");
      await safeFill(page, "#dispatchOwner", "dispatch@solenterprises.org", entry, "filled dispatch owner");
      await safeFill(page, "#dispatchChannel", "client_browser_proof", entry, "filled dispatch channel");
      await safeClick(page, "#queueDispatchBtn", entry, "clicked queue latest packet dispatch");
      const downloadPromise = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
      await safeClick(page, "#exportPacketBtn", entry, "clicked export latest packet JSON");
      const download = await downloadPromise;
      if (download) {
        const target = path.join(artifactDir, `${label}-exported-packet.json`);
        await download.saveAs(target);
        entry.downloads.push(target);
      }
    }
    await scrollProof(page, artifactDir, `${label}-dashboard`, entry);

    await openPage(page, `${baseUrl}/compose`, entry);
    await page.waitForSelector("#to", { timeout: 16000 });
    await safeFill(page, "#to", "proof-no-send@solenterprises.org", entry, "filled compose recipient without sending");
    await safeFill(page, "#subject", `SkyeMail client browser proof ${new Date().toISOString()}`, entry, "filled compose subject without sending");
    await safeFill(page, "#text", "This proof fills compose fields and attachment controls without sending client mail.", entry, "filled compose body without sending");
    await safeClick(page, "#signatureBtn", entry, "clicked insert signature");
    const proofFile = path.join(artifactDir, "skyemail-proof-attachment.txt");
    fs.writeFileSync(proofFile, "SkyeMail live browser proof attachment fixture.\n");
    await page.setInputFiles("#attachInput", proofFile).catch((error) => entry.failures.push(`attachment fixture failed: ${redact(error.message)}`));
    entry.actions.push("queued compose attachment without sending");
    await scrollProof(page, artifactDir, `${label}-compose`, entry);

    for (const route of ["/sent", "/drafts", "/contacts", "/settings", "/monitoring"]) {
      await openPage(page, `${baseUrl}${route}`, entry);
      await page.waitForTimeout(900);
      if (route === "/contacts") {
        await safeFill(page, "#contactSearch", "proof", entry, "typed contacts search");
        await safeClick(page, "#applySearchBtn", entry, "clicked contacts search apply");
        await safeClick(page, "#clearSearchBtn", entry, "clicked contacts search clear");
      } else if (route === "/settings") {
        await safeFill(page, "#aliasLocalPart", `proof-${Date.now().toString(36).slice(-5)}`, entry, "filled alias local part without creating alias");
        await safeFill(page, "#aliasDisplayName", "Browser Proof Alias", entry, "filled alias display without creating alias");
      } else if (route === "/monitoring") {
        await safeClick(page, "#refreshMonitoringBtn", entry, "clicked monitoring refresh");
      }
      const metrics = await viewportMetrics(page);
      entry.assertions.push({ name: `${route}_no_route_not_implemented`, ok: !metrics.bodyHasRouteNotImplemented, state: { routeNotImplemented: metrics.bodyHasRouteNotImplemented } });
      await scrollProof(page, artifactDir, `${label}${route.replace(/[^a-z0-9]+/gi, "-")}`, entry);
    }
  } catch (error) {
    entry.failures.push(redact(error.stack || error.message));
  } finally {
    await context?.close().catch(() => {});
  }
  return entry;
}

async function launchProofBrowser() {
  return await chromium.launch({
    headless: false,
    slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 25),
    args: process.platform === "linux" ? [
      "--ozone-platform=x11",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-proxy-server",
      "--disable-features=NetworkServiceSandbox",
    ] : [],
  });
}

async function ensureBrowser(browser) {
  if (browser?.isConnected?.()) return browser;
  await browser?.close?.().catch(() => {});
  return await launchProofBrowser();
}

function timeoutFailureEntry(kind, viewport, detail = {}) {
  return {
    kind,
    viewport,
    ...detail,
    actions: [],
    assertions: [],
    downloads: [],
    scrollStops: [],
    consoleErrors: [],
    failedRequests: [],
    failedResponses: [],
    failures: [],
  };
}

async function main() {
  const proofStamp = stamp();
  const artifactDir = path.join(repoRoot, "test-artifacts/live-browser-verifier", `${proofStamp}-skyemail-client-production-proof`);
  fs.mkdirSync(artifactDir, { recursive: true });

  const report = {
    ok: false,
    generated_at: new Date().toISOString(),
    mode: "headed-live-browser",
    headless: false,
    production_url: baseUrl,
    zero_os_base: zeroOsBase,
    artifact_dir: artifactDir,
    viewports: [{ width: 1440, height: 980 }, { width: 390, height: 844 }],
    public_routes: ["/", "/marketing", "/pricing", "/login", "/signup", "/live-proof", "/mcp-proof", "/changelog"],
    authenticated_routes: ["/dashboard", "/compose", "/sent", "/drafts", "/contacts", "/settings", "/monitoring"],
    checks: [],
    failures: [],
  };

  let browser;
  try {
    report.preflight = assertBrowserProofPreflight();
    const session = await resolveSkyeMailSession();
    report.session = { owner_source: session.ownerSource, user: session.user, token_present: true };
    browser = await launchProofBrowser();
    async function runTimed(label, ms, fallback, fn) {
      let timer;
      try {
        console.error(`[skyemail-browser-proof] ${label}`);
        return await Promise.race([
          fn(),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
          }),
        ]);
      } catch (error) {
        fallback.failures.push(redact(error.stack || error.message));
        await browser?.close?.().catch(() => {});
        browser = null;
        return fallback;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    for (const viewport of report.viewports) {
      for (const route of report.public_routes) {
        browser = await ensureBrowser(browser);
        report.checks.push(await runTimed(
          `public ${route} ${viewport.width}x${viewport.height}`,
          Number(process.env.LIVE_BROWSER_PUBLIC_TIMEOUT_MS || 90000),
          timeoutFailureEntry("public-page", viewport, { route }),
          () => runPublicPage(browser, artifactDir, viewport, route)
        ));
      }
      browser = await ensureBrowser(browser);
      report.checks.push(await runTimed(
        `workspace ${viewport.width}x${viewport.height}`,
        Number(process.env.LIVE_BROWSER_WORKSPACE_TIMEOUT_MS || 360000),
        timeoutFailureEntry("authenticated-workspace", viewport),
        () => runAuthWorkspace(browser, artifactDir, viewport, session)
      ));
    }
  } catch (error) {
    report.failures.push(redact(error.stack || error.message));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  for (const check of report.checks) {
    if (check.consoleErrors?.length) report.failures.push(`${check.kind} ${check.route || "workspace"} ${check.viewport.width}x${check.viewport.height} console errors: ${check.consoleErrors.join(" | ")}`);
    if (check.failedRequests?.length) report.failures.push(`${check.kind} ${check.route || "workspace"} ${check.viewport.width}x${check.viewport.height} failed requests: ${check.failedRequests.map((item) => `${item.method} ${item.url} ${item.failure}`).join(" | ")}`);
    const failedResponses = (check.failedResponses || []).filter((item) => !/\/api\/owner\/admin-login/.test(item.url));
    if (failedResponses.length) report.failures.push(`${check.kind} ${check.route || "workspace"} ${check.viewport.width}x${check.viewport.height} failed responses: ${failedResponses.map((item) => `${item.status} ${item.url}`).join(" | ")}`);
    for (const assertion of check.assertions || []) if (!assertion.ok) report.failures.push(`${check.kind} ${check.viewport.width}x${check.viewport.height} assertion failed: ${assertion.name}`);
    for (const failure of check.failures || []) report.failures.push(`${check.kind} ${check.route || "workspace"} ${check.viewport.width}x${check.viewport.height}: ${failure}`);
  }
  report.human_action_count = report.checks.reduce((sum, check) => sum + (check.actions?.length || 0), 0);
  report.screenshot_count = report.checks.reduce((sum, check) => sum + (check.scrollStops?.length || 0), 0);
  report.download_count = report.checks.reduce((sum, check) => sum + (check.downloads?.length || 0), 0);
  report.ok = report.failures.length === 0;

  const reportPath = path.join(artifactDir, "skyemail-client-live-browser-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, report: reportPath, checks: report.checks.length, actions: report.human_action_count, screenshots: report.screenshot_count, failures: report.failures.slice(0, 12) }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(redact(error.stack || error.message));
  process.exit(1);
});
