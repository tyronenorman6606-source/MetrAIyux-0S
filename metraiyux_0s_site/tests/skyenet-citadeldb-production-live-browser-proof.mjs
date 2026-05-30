#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const zeroOsBase = (process.env.PROOF_BASE_URL || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, "");
const fs27Base = (process.env.SKYPAY_LIVE_ORIGIN || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev").replace(/\/+$/, "");
const marketingBase = (process.env.METRAIYUX_MARKETING_ORIGIN || "https://metraiyux-0s-marketing.pages.dev").replace(/\/+$/, "");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const artifactDir = path.join(repoRoot, "test-artifacts", "skyenet-citadeldb-production-live-browser", stamp);
const latestPath = path.join(repoRoot, "test-artifacts", "skyenet-citadeldb-production-live-browser-latest.json");

const credentialKeys = [
  "FREE99_ADMIN_CODE",
  "ZERO_OS_GATE_CODE",
  "ZERO_OS_ADMIN_CODE",
  "METRAIYUX_OWNER_ADMIN_CODE",
  "OWNER_ADMIN_CODE",
  "ADMIN_CODE",
  "FS27_ADMIN_CODE",
  "SKYGATEFS27_ADMIN_CODE",
  "FREE99_GATE_CODE",
  "SKYE_GATE_ADMIN_CODE",
  "SKYGATE_ADMIN_CODE"
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

function unquote(value) {
  const text = String(value || "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = raw.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) out[match[1]] = unquote(match[2]);
  }
  return out;
}

function envValues() {
  return {
    ...loadEnvFile(path.join(repoRoot, ".env")),
    ...loadEnvFile(path.join(repoRoot, "env.txt")),
    ...process.env
  };
}

function resolveAlias(value, env, seen = new Set()) {
  const text = String(value || "").trim();
  const match = text.match(/^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/);
  if (!match || seen.has(match[1])) return text;
  seen.add(match[1]);
  return resolveAlias(env[match[1]], env, seen);
}

function sha12(value) {
  return createHash("sha256").update(String(value || "")).digest("hex").slice(0, 12);
}

function cleanToken(value) {
  return String(value || "").replace(/^Bearer(?:\s+|$)/i, "").trim();
}

async function findWorkingCredential() {
  const env = envValues();
  const candidates = credentialKeys
    .map((key) => ({ key, value: resolveAlias(env[key], env) }))
    .filter((item, index, list) => item.value && list.findIndex((other) => other.value === item.value) === index);

  const failures = [];
  for (const candidate of candidates) {
    const response = await fetch(`${zeroOsBase}/api/owner/admin-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: candidate.value })
    }).catch((error) => ({ ok: false, status: 0, error }));
    const data = response.json ? await response.json().catch(() => ({})) : {};
    const ownerToken = cleanToken(data.token || data.session_token || data.sessionToken);
    const gateToken = cleanToken(data.gateToken || data.gateBearerToken || ownerToken);
    if (response.ok && gateToken) {
      return { key: candidate.key, value: candidate.value, token: gateToken, ownerToken: ownerToken || gateToken, hash: sha12(candidate.value) };
    }
    failures.push({ key: candidate.key, hash: sha12(candidate.value), status: response.status || 0 });
  }
  throw new Error(`No shared 0S owner credential unlocked production. Tried: ${JSON.stringify(failures)}`);
}

function entry(name, viewport) {
  return {
    name,
    viewport,
    actions: [],
    statuses: [],
    screenshots: [],
    scrollStops: [],
    consoleErrors: [],
    failedRequests: [],
    httpErrors: []
  };
}

function okStatus(target, name, ok, state = {}) {
  target.statuses.push({ name, ok: Boolean(ok), state });
}

function observe(page, target, allowedHttpErrors = []) {
  page.on("console", (message) => {
    if (message.type() === "error") target.consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "request failed";
    if (failure.includes("ERR_ABORTED")) return;
    target.failedRequests.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), failure });
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (allowedHttpErrors.some((item) => url.includes(item.urlIncludes) && response.status() === item.status)) return;
    if (["favicon.ico", "fonts.googleapis.com", "fonts.gstatic.com"].some((fragment) => url.includes(fragment))) return;
    target.httpErrors.push({ url, status: response.status(), method: response.request().method(), resourceType: response.request().resourceType() });
  });
}

async function screenshot(page, target, name) {
  const file = path.join(artifactDir, `${name}.png`);
  await captureScreenshot(page, file);
  target.screenshots.push(file);
}

async function captureScreenshot(page, file) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.screenshot({ path: file, fullPage: false, animations: "disabled", timeout: 90000 });
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(1000 * attempt).catch(() => {});
      await page.evaluate(() => window.scrollBy(0, 1)).catch(() => {});
    }
  }
  throw lastError;
}

async function inspectViewport(page) {
  return page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const elements = Array.from(document.body?.querySelectorAll("*") || []);
    const visibleElements = elements.filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) > 0.03 &&
        rect.width > 2 &&
        rect.height > 2 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < viewport.height &&
        rect.left < viewport.width;
    });
    const text = String(document.body?.innerText || "").replace(/\s+/g, " ").trim();
    const brokenImages = Array.from(document.images || [])
      .filter((image) => !image.complete || image.naturalWidth <= 0)
      .map((image) => image.currentSrc || image.src || "");
    const horizontalOverflowPx = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const visibleMediaCount = visibleElements.filter((element) => ["IMG", "SVG", "VIDEO", "CANVAS", "IFRAME"].includes(element.tagName)).length;
    return {
      url: location.href,
      title: document.title,
      scrollY: Math.round(window.scrollY || 0),
      viewport,
      visibleTextChars: text.length,
      visibleElementCount: visibleElements.length,
      visibleMediaCount,
      brokenImages,
      horizontalOverflowPx,
      nonblank: text.length >= 30 || visibleElements.length >= 8 || visibleMediaCount >= 1,
      sample: text.slice(0, 220)
    };
  });
}

async function scrollReceipt(page, target, label) {
  const metrics = await page.evaluate(() => {
    const height = Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0);
    const viewportHeight = window.innerHeight || 800;
    const maxY = Math.max(0, height - viewportHeight);
    const anchors = Array.from(document.querySelectorAll("section, article, main, footer, [id]"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return Math.max(0, Math.min(maxY, Math.round(rect.top + window.scrollY)));
      });
    return {
      height,
      viewportHeight,
      stops: [...new Set([0, Math.round(maxY * 0.25), Math.round(maxY * 0.5), Math.round(maxY * 0.75), maxY, ...anchors])]
        .sort((a, b) => a - b)
        .slice(0, 14)
    };
  });

  for (let index = 0; index < metrics.stops.length; index += 1) {
    const y = metrics.stops[index];
    await page.evaluate((nextY) => window.scrollTo({ top: nextY, behavior: "instant" }), y);
    await page.waitForTimeout(220);
    const visible = await inspectViewport(page);
    const file = path.join(artifactDir, `${label}-scroll-${String(index + 1).padStart(2, "0")}.png`);
    await captureScreenshot(page, file);
    target.scrollStops.push({ label, index: index + 1, targetY: y, screenshot: file, ...visible });
    okStatus(target, `${label}_scroll_${index + 1}_nonblank`, visible.nonblank, { visibleTextChars: visible.visibleTextChars, visibleElementCount: visible.visibleElementCount, visibleMediaCount: visible.visibleMediaCount });
    okStatus(target, `${label}_scroll_${index + 1}_no_broken_images`, visible.brokenImages.length === 0, { brokenImages: visible.brokenImages });
    okStatus(target, `${label}_scroll_${index + 1}_no_horizontal_overflow`, visible.horizontalOverflowPx <= 2, { horizontalOverflowPx: visible.horizontalOverflowPx });
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
}

async function addGateCookies(context, credential, base) {
  const url = new URL(base);
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 8;
  const cookieNames = [
    "skye_gate_session",
    "skygate_session",
    "skyegate_session",
    "metraiyux_gate_session",
    "metraiyux_admin_session",
    "admin_session"
  ];
  await context.addCookies(cookieNames.map((name) => ({
    name,
    value: name.includes("admin") ? credential.ownerToken : credential.token,
    url: url.origin,
    secure: true,
    httpOnly: false,
    sameSite: "Lax",
    expires
  })));
}

async function persistGateStorage(page, credential) {
  await page.evaluate((session) => {
    const shared = {
      token: session.token,
      source: "owner-admin-login-live-browser-proof",
      platform_id: "metraiyux-0s",
      usage_lane: "fs27-owner-gate",
      issued_at: new Date().toISOString()
    };
    sessionStorage.setItem("FREE99_PLATFORM_GATE_SESSION", JSON.stringify(shared));
    localStorage.setItem("FREE99_PLATFORM_GATE_SESSION", JSON.stringify(shared));
    sessionStorage.setItem("adminBrainToken", session.token);
    localStorage.setItem("quantumskyes_mcp_owner_token", session.token);
    localStorage.setItem("metraiyux_0s_gate_session", session.token);
    localStorage.setItem("metraiyuxOwnerSession", session.ownerToken);
  }, { token: credential.token, ownerToken: credential.ownerToken });
}

async function loginOwner(page, target, credential, returnPath) {
  const loginUrl = new URL("/admin/login.html", zeroOsBase);
  loginUrl.searchParams.set("return", returnPath);
  const response = await page.goto(loginUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60000 });
  okStatus(target, "owner_login_page_loaded", Boolean(response?.ok()), { status: response?.status() || 0, url: page.url() });
  await page.locator('input[name="code"], input[type="password"]').first().fill(credential.value);
  target.actions.push("typed shared owner code into 0S gate");
  const loginResponsePromise = page.waitForResponse((res) => res.url().includes("/api/owner/admin-login") && res.request().method() === "POST", { timeout: 30000 }).catch(() => null);
  await page.locator("#unlock-button, button[type='submit']").first().click({ timeout: 15000 });
  const loginResponse = await loginResponsePromise;
  const loginData = loginResponse ? await loginResponse.json().catch(() => ({})) : {};
  okStatus(target, "owner_admin_login_api_accepted", Boolean(loginResponse?.ok()), {
    status: loginResponse?.status() || 0,
    returned_gate_bearer: Boolean(loginData.gateToken || loginData.gateBearerToken),
    returned_owner_token: Boolean(loginData.token)
  });
  target.actions.push("submitted shared owner login");
  await addGateCookies(page.context(), credential, zeroOsBase);
  await addGateCookies(page.context(), credential, fs27Base);
  await persistGateStorage(page, credential);
  await page.waitForURL((url) => url.pathname.replace(/\.html$/i, "") === returnPath.replace(/\.html$/i, ""), { timeout: 30000 }).catch(async () => {
    await page.goto(`${zeroOsBase}${returnPath}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  });
  await persistGateStorage(page, credential);
  okStatus(target, "returned_to_requested_gated_surface", page.url().includes(returnPath.replace(/\.html$/i, "")), { finalUrl: page.url() });
}

function finishEntry(target) {
  target.materialConsoleErrors = target.consoleErrors.filter((message) => !/Failed to load resource|favicon/i.test(message));
  target.ok = target.statuses.every((item) => item.ok) &&
    target.materialConsoleErrors.length === 0 &&
    target.failedRequests.length === 0 &&
    target.httpErrors.length === 0;
}

async function verifyGateRedirect(browser) {
  const target = entry("unauthenticated-skyenet-gate-redirect", { width: 1440, height: 980 });
  const context = await browser.newContext({ viewport: target.viewport });
  const page = await context.newPage();
  observe(page, target);
  const response = await page.goto(`${zeroOsBase}/skyenet/index.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(500);
  target.actions.push("opened SkyeNet console without any shared gate session");
  okStatus(target, "redirected_to_shared_owner_gate", page.url().includes("/admin/login"), { status: response?.status() || 0, finalUrl: page.url() });
  okStatus(target, "login_page_visible", await page.locator("text=/Free99|admin code|owner/i").first().isVisible().catch(() => false));
  await screenshot(page, target, "unauthenticated-skyenet-gate-redirect");
  await scrollReceipt(page, target, "unauthenticated-skyenet-gate-redirect");
  await context.close();
  finishEntry(target);
  return target;
}

async function verifyMarketing(browser, viewport, label) {
  const target = entry(`marketing-${label}`, viewport);
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  observe(page, target);

  await page.goto(`${marketingBase}/skyenet.html`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  okStatus(target, "skyenet_marketing_loaded", await page.locator("h1", { hasText: "SkyeNet" }).first().isVisible().catch(() => false), { url: page.url() });
  okStatus(target, "public_copy_is_skynet_branded", await page.locator("body").innerText().then((text) => /SkyeNet Edge is live|SkyeNet Functions/i.test(text)).catch(() => false));
  const routeNodes = await page.locator(".route-node").count().catch(() => 0);
  for (let index = 0; index < Math.min(routeNodes, 4); index += 1) {
    await page.locator(".route-node").nth(index).click({ timeout: 5000 }).catch(() => {});
    target.actions.push(`clicked SkyeNet visual route node ${index + 1}`);
  }
  if (viewport.width < 700) {
    await page.locator("[data-menu-button]").click({ timeout: 5000 }).catch(() => {});
    target.actions.push("opened mobile marketing navigation");
  }
  await screenshot(page, target, `marketing-skyenet-${label}`);
  await scrollReceipt(page, target, `marketing-skyenet-${label}`);

  await page.goto(`${marketingBase}/valuation.html`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  const valuationText = await page.locator("body").innerText({ timeout: 15000 }).catch(() => "");
  okStatus(target, "valuation_loaded", valuationText.includes("$2,350,000") && valuationText.includes("62 live Stripe products"));
  okStatus(target, "valuation_hides_provider_split_for_citadel", !/CitadelDB D1|Cloudflare D1|CitadelDB Cloudflare|Cloudflare-backed/i.test(valuationText));
  await page.locator("#brandName").fill("SkyeNet CitadelDB release proof").catch(() => {});
  await page.locator("#campaignName").fill("Live browser verification").catch(() => {});
  target.actions.push("edited valuation console fields");
  await screenshot(page, target, `marketing-valuation-${label}`);
  await scrollReceipt(page, target, `marketing-valuation-${label}`);

  await context.close();
  finishEntry(target);
  return target;
}

async function verifySkyePay(browser, viewport, label) {
  const target = entry(`skyepay-offer-${label}`, viewport);
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  observe(page, target, [{ urlIncludes: "checkout.stripe.com", status: 403 }]);
  const url = `${fs27Base}/skyepay.html?client=metraiyux-0s&offer=skyenet-edge-starter`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  const text = await page.locator("body").innerText({ timeout: 15000 }).catch(() => "");
  okStatus(target, "skyepay_offer_loaded", /SkyeNet|Edge Starter|Starter/i.test(text), { url: page.url() });
  okStatus(target, "skyepay_offer_has_price", /\$297|\$97|9700|29700/i.test(text));
  okStatus(target, "skyepay_public_copy_hides_provider_split", !/Cloudflare versus SkyeNet|Cloudflare-backed/i.test(text));
  const buttons = await page.locator("button, a").count().catch(() => 0);
  for (let index = 0; index < Math.min(buttons, 4); index += 1) {
    const item = page.locator("button, a").nth(index);
    if (await item.isVisible().catch(() => false)) {
      await item.hover().catch(() => {});
      target.actions.push(`hovered SkyePay control ${index + 1}`);
    }
  }
  await screenshot(page, target, `skyepay-offer-${label}`);
  await scrollReceipt(page, target, `skyepay-offer-${label}`);
  await context.close();
  finishEntry(target);
  return target;
}

async function verifySkyeNetConsole(browser, credential, viewport, label, publishDrop = false) {
  const target = entry(`skyenet-console-${label}`, viewport);
  const context = await browser.newContext({ viewport });
  await addGateCookies(context, credential, zeroOsBase);
  await addGateCookies(context, credential, fs27Base);
  const page = await context.newPage();
  observe(page, target);
  await loginOwner(page, target, credential, "/skyenet/index.html");
  await page.waitForSelector("#statusText", { timeout: 30000 });
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusText")?.textContent || "";
    return text && !/checking/i.test(text);
  }, null, { timeout: 30000 }).catch(() => {});
  const bodyText = await page.locator("body").innerText({ timeout: 15000 }).catch(() => "");
  okStatus(target, "skyenet_console_loaded_after_gate", /SkyeNet Deploy|Publish Drop|SkyeNet assets/i.test(bodyText), { url: page.url() });
  okStatus(target, "skyenet_console_uses_shared_gate_copy", /same FS27|SkyGate|Free99 owner session/i.test(bodyText));
  await page.locator("#refreshButton").click({ timeout: 10000 }).catch(() => {});
  target.actions.push("clicked SkyeNet console refresh");
  await page.waitForTimeout(1200);

  const projectId = `skyenet-browser-${runId}`;
  const deploymentId = `dep-${runId}-${label}`;
  const mountPath = `/skyenet-browser-proof-${runId}-${label}`;
  await page.locator("#projectId").fill(projectId);
  await page.locator("#deploymentId").fill(deploymentId);
  await page.locator("#routeHost").fill(new URL(fs27Base).hostname);
  await page.locator("#mountPath").fill(mountPath);
  await page.locator("#defaultAuth").selectOption("gate");
  target.actions.push("filled SkyeNet deployment form with FS27 gated route");

  if (publishDrop) {
    const dropDir = path.join(artifactDir, `drop-${label}`);
    fs.mkdirSync(dropDir, { recursive: true });
    const dropFile = path.join(dropDir, "index.html");
    fs.writeFileSync(dropFile, `<!doctype html><meta charset="utf-8"><title>SkyeNet Browser Proof</title><main><h1>SkyeNet browser proof drop ${runId}</h1><p>Published through the live SkyeNet deploy console and served from the SkyeNet asset lane.</p></main>\n`);
    await page.locator("#buildFiles").setInputFiles(dropFile);
    target.actions.push("selected a local proof build file");
    await page.locator("#deployButton").click({ timeout: 15000 });
    target.actions.push("submitted SkyeNet Publish Drop");
    await page.waitForFunction(() => {
      const log = document.querySelector("#deployLog")?.textContent || "";
      return /Published and routed|Failed:/i.test(log);
    }, null, { timeout: 90000 });
    const deployLog = await page.locator("#deployLog").innerText().catch(() => "");
    okStatus(target, "skyenet_drop_published_and_routed", /Published and routed/i.test(deployLog), { deployLog: deployLog.slice(0, 500) });

    const publishedUrl = `${fs27Base}${mountPath}/`;
    await page.goto(publishedUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1200);
    const publishedText = await page.locator("body").innerText({ timeout: 15000 }).catch(() => "");
    okStatus(target, "published_drop_rendered_from_skynet_route", publishedText.includes(`SkyeNet browser proof drop ${runId}`), { publishedUrl, sample: publishedText.slice(0, 180) });
    target.actions.push("opened the published SkyeNet route");
  }

  await page.goto(`${zeroOsBase}/skyenet/index.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await persistGateStorage(page, credential);
  await page.locator("#refreshButton").click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await screenshot(page, target, `skyenet-console-${label}`);
  await scrollReceipt(page, target, `skyenet-console-${label}`);
  await context.close();
  finishEntry(target);
  return target;
}

async function verifyCitadel(browser, credential, viewport, label) {
  const target = entry(`citadeldb-dashboard-${label}`, viewport);
  const context = await browser.newContext({ viewport });
  await addGateCookies(context, credential, zeroOsBase);
  const page = await context.newPage();
  observe(page, target);
  await loginOwner(page, target, credential, "/citadeldb/");
  await page.locator("#ownerCode").fill(credential.value);
  target.actions.push("typed shared owner code into CitadelDB dashboard login");
  const loginResponse = page.waitForResponse((res) => res.url().includes("/api/owner/admin-login") && res.request().method() === "POST", { timeout: 30000 }).catch(() => null);
  await page.locator("#loginBtn").click({ timeout: 10000 });
  await loginResponse;
  target.actions.push("unlocked CitadelDB dashboard with shared owner session");
  await page.waitForFunction(() => {
    const text = document.querySelector("#statusOut")?.textContent || "";
    return /ledgerEvents|recentEvents|counts/i.test(text);
  }, null, { timeout: 30000 });
  okStatus(target, "citadel_dashboard_loaded_and_refreshed", await page.locator("#parityState").innerText().then((text) => Boolean(text.trim())).catch(() => false));
  await page.locator("#sampleBtn").click({ timeout: 10000 });
  target.actions.push("recorded primary proof receipt from CitadelDB dashboard");
  await page.waitForFunction(() => {
    const text = document.querySelector("#loginOut")?.textContent || "";
    return /mirrored_to_citadel|eventId|status/i.test(text);
  }, null, { timeout: 30000 });
  const sampleOut = await page.locator("#loginOut").innerText().catch(() => "");
  okStatus(target, "citadel_sample_write_mirrored", /mirrored_to_citadel|eventId/i.test(sampleOut), { sampleOut: sampleOut.slice(0, 500) });
  await page.locator("#exportClientId").fill("empire-pallets");
  await page.locator("#exportBtn").click({ timeout: 10000 });
  target.actions.push("requested tenant export from CitadelDB dashboard");
  await page.waitForFunction(() => {
    const text = document.querySelector("#exportOut")?.textContent || "";
    return /empire-pallets|tenant|events|ok/i.test(text);
  }, null, { timeout: 30000 }).catch(() => {});
  okStatus(target, "citadel_export_surface_responded", await page.locator("#exportOut").innerText().then((text) => /empire-pallets|tenant|events|ok/i.test(text)).catch(() => false));
  await screenshot(page, target, `citadeldb-dashboard-${label}`);
  await scrollReceipt(page, target, `citadeldb-dashboard-${label}`);
  await context.close();
  finishEntry(target);
  return target;
}

await fs.promises.mkdir(artifactDir, { recursive: true });
const credential = await findWorkingCredential();
const browser = await chromium.launch({
  headless: false,
  slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 80),
  args: ["--disable-dev-shm-usage", "--disable-gpu", "--no-sandbox"]
});

const report = {
  ok: false,
  generated_at: new Date().toISOString(),
  mode: "headed-live-browser",
  headless: false,
  zero_os_base: zeroOsBase,
  fs27_base: fs27Base,
  marketing_base: marketingBase,
  credential: { key: credential.key, hash: credential.hash },
  artifact_dir: artifactDir,
  checks: [],
  failures: []
};

try {
  report.checks.push(await verifyGateRedirect(browser));
  for (const item of [
    { label: "desktop", viewport: { width: 1440, height: 980 } },
    { label: "mobile", viewport: { width: 390, height: 844 } }
  ]) {
    report.checks.push(await verifyMarketing(browser, item.viewport, item.label));
    report.checks.push(await verifySkyePay(browser, item.viewport, item.label));
    report.checks.push(await verifySkyeNetConsole(browser, credential, item.viewport, item.label, item.label === "desktop"));
    report.checks.push(await verifyCitadel(browser, credential, item.viewport, item.label));
  }
} finally {
  await browser.close().catch(() => {});
}

for (const check of report.checks) {
  if (!check.ok) {
    report.failures.push({
      name: check.name,
      failed_statuses: check.statuses.filter((item) => !item.ok),
      console_errors: check.materialConsoleErrors || [],
      failed_requests: check.failedRequests,
      http_errors: check.httpErrors
    });
  }
}

report.ok = report.failures.length === 0;
const receiptPath = path.join(artifactDir, "live-browser-report.json");
fs.writeFileSync(receiptPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(latestPath, `${JSON.stringify(report, null, 2)}\n`);

if (!report.ok) {
  console.error(JSON.stringify({ ok: false, receipt: path.relative(repoRoot, receiptPath), failures: report.failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  receipt: path.relative(repoRoot, receiptPath),
  latest: path.relative(repoRoot, latestPath),
  checks: report.checks.length
}, null, 2));
