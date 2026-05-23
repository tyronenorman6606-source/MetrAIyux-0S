#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const repoRoot = "/workspaces/MetrAIyux-0S";
const baseUrl = (process.env.PROOF_BASE_URL || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, "");
const appPath = "/social-batch-factory/";
const free99Path = "/Free99/apps/social-batch-factory/index.html";
const deploymentVersion = process.env.PROOF_DEPLOYMENT_VERSION || "0310de5e-c005-49a0-9f1d-d607ab6902a4";
const fs27Version = process.env.PROOF_FS27_VERSION || "b7c853d4-daf7-47b1-8453-961a90f1fb84";
const stressCycles = Number(process.env.PROOF_STRESS_CYCLES || 3);
const slowMo = Number(process.env.LIVE_BROWSER_SLOWMO || 70);
const ownerEmail = process.env.PROOF_OWNER_EMAIL || "owner-proof@metraiyux.local";

const secretKeys = [
  "FREE99_ADMIN_CODE",
  "FREE99_ADMIN_PASSWORD",
  "FREE99_GATE_CODE",
  "FREE99_GATE_PASSWORD",
  "OWNER_ADMIN_CODE",
  "OWNER_ADMIN_PASSWORD",
  "ADMIN_CODE",
  "ADMIN_PASSWORD",
  "FS27_ADMIN_CODE",
  "FS27_ADMIN_PASSWORD",
  "SKYGATEFS27_ADMIN_CODE",
  "SKYGATEFS27_ADMIN_PASSWORD",
  "SITE_OPERATOR_ADMIN_TOKEN",
  "METRAIYUX_ADMIN_TOKEN",
  "ADMIN_TOKEN"
];

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function unquote(value) {
  let clean = String(value || "").trim();
  clean = clean.replace(/^export\s+/, "").trim();
  while ((clean.startsWith("\"") && clean.endsWith("\"")) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

function envFromText(text, key) {
  for (const line of String(text || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    if (normalized.startsWith(`${key}=`)) return unquote(normalized.slice(key.length + 1));
    if (normalized.startsWith(`${key}:`)) return unquote(normalized.slice(key.length + 1));
  }
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(text || "").match(new RegExp(`${escaped}\\s*[:=]\\s*["']?([^"'\\s]+)`, "i"));
  return match ? unquote(match[1]) : "";
}

function firstSecret(keys) {
  const texts = [
    readText(path.join(repoRoot, ".env")),
    readText(path.join(repoRoot, "ADMIN_REFERENCE.md")),
    readText(path.join(repoRoot, "metraiyux_0s_site", "skyegate", "source", "SkyeGateFS27", ".env"))
  ];
  for (const key of keys) {
    const direct = unquote(process.env[key] || "");
    if (direct) return direct;
    for (const text of texts) {
      const value = envFromText(text, key);
      if (value) return value;
    }
  }
  for (const value of adminReferenceCodeCandidates(texts[1])) {
    if (value) return value;
  }
  return "";
}

let adminCode = "";
let adminBearerToken = "";

function adminReferenceCodeCandidates(text) {
  const candidates = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    if (!/owner admin code|same owner admin code|admin code/i.test(line)) continue;
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const value = unquote(match[1]);
      if (!value || value.startsWith("/") || value.startsWith("http") || value.includes("<") || value.includes(" ")) continue;
      candidates.push(value);
    }
  }
  const seen = new Set();
  const unique = candidates.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
  return [
    ...unique.filter((value) => !/^[A-Z0-9_]+$/.test(value)),
    ...unique.filter((value) => /^[A-Z0-9_]+$/.test(value))
  ];
}

function adminSecretCandidates() {
  const candidates = [];
  const texts = [
    readText(path.join(repoRoot, ".env")),
    readText(path.join(repoRoot, "ADMIN_REFERENCE.md")),
    readText(path.join(repoRoot, "metraiyux_0s_site", "skyegate", "source", "SkyeGateFS27", ".env"))
  ];
  for (const key of secretKeys) {
    const direct = unquote(process.env[key] || "");
    if (direct) candidates.push(direct);
    for (const text of texts) {
      const value = envFromText(text, key);
      if (value) candidates.push(value);
    }
  }
  candidates.push(...adminReferenceCodeCandidates(texts[1]));
  const seen = new Set();
  return candidates.filter((value) => {
    const clean = unquote(value);
    if (!clean || clean.length < 4 || clean.length > 180 || clean.includes("<") || clean.includes("$")) return false;
    if (seen.has(clean)) return false;
    seen.add(clean);
    return true;
  });
}

async function resolveLiveGateCredential() {
  const candidates = adminSecretCandidates();
  for (const candidate of candidates) {
    const response = await fetch(urlFor("/api/owner/admin-login"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: candidate })
    }).catch(() => null);
    if (!response?.ok) continue;
    const data = await response.json().catch(() => ({}));
    const token = String(data.gateToken || data.gateBearerToken || data.token || "").replace(/^Bearer(?:\s+|$)/i, "").trim();
    if (token) return { code: candidate, token };
  }
  return { code: "", token: "" };
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

function cleanFailure(error) {
  return String(error?.stack || error?.message || error)
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, "$1[redacted]")
    .replace(/(code=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/(session_id=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/(cs_(?:test|live)_[A-Za-z0-9_]+)/g, "[redacted-checkout-session]");
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
    const pathParts = url.pathname.split("/").filter(Boolean);
    return {
      host: url.host,
      path: pathParts.length ? `/${pathParts[0]}/...` : "/",
      hasQuery: url.searchParams.size > 0
    };
  } catch {
    return { host: "", path: "", hasQuery: false };
  }
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

async function screenshot(page, entry, artifactDir, name, fullPage = true) {
  const file = path.join(artifactDir, `${entry.label}-${name}.png`);
  await page.screenshot({ path: file, fullPage });
  entry.screenshots.push(file);
  return file;
}

function pushStatus(entry, name, ok, state = {}) {
  entry.statuses.push({ name, ok: Boolean(ok), state });
}

async function visibleMetrics(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText || "";
    const viewport = { width: innerWidth, height: innerHeight };
    const elements = [...document.querySelectorAll("body *")];
    const visibleElements = elements.filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 1 && rect.height > 1 && style.visibility !== "hidden" && style.display !== "none" && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    }).length;
    const images = [...document.images].map((img) => ({
      src: img.currentSrc || img.src || "",
      complete: img.complete,
      width: img.naturalWidth || 0,
      height: img.naturalHeight || 0
    }));
    const brokenImages = images.filter((img) => img.src && (!img.complete || img.width < 1 || img.height < 1)).length;
    const maxRight = Math.max(document.documentElement.scrollWidth || 0, document.body?.scrollWidth || 0);
    return {
      viewport,
      textLength: text.trim().length,
      visibleElements,
      imageCount: images.length,
      brokenImages,
      horizontalOverflowPx: Math.max(0, maxRight - document.documentElement.clientWidth)
    };
  });
}

async function canvasProof(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("#mainCanvas");
    if (!canvas) return { present: false, paintedPixels: 0, width: 0, height: 0, variedChannels: 0 };
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { present: true, paintedPixels: 0, width: canvas.width, height: canvas.height, variedChannels: 0 };
    const width = Math.max(1, Math.min(canvas.width, 480));
    const height = Math.max(1, Math.min(canvas.height, 480));
    const data = ctx.getImageData(0, 0, width, height).data;
    let paintedPixels = 0;
    const samples = new Set();
    for (let index = 0; index < data.length; index += 4 * 37) {
      const a = data[index + 3];
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      if (a > 0 && r + g + b > 8) paintedPixels += 1;
      samples.add(`${Math.round(r / 24)}:${Math.round(g / 24)}:${Math.round(b / 24)}:${Math.round(a / 24)}`);
    }
    return { present: true, paintedPixels, width: canvas.width, height: canvas.height, variedChannels: samples.size };
  });
}

async function loginOwner(page, returnPath, entry) {
  if (!adminCode || !adminBearerToken) throw new Error("Missing owner admin gate credential for live proof.");
  const loginUrl = new URL("/admin/login.html", baseUrl);
  loginUrl.searchParams.set("return", returnPath);
  const response = await page.goto(loginUrl.toString(), { waitUntil: "domcontentloaded", timeout: 45000 });
  pushStatus(entry, "owner_login_page_loaded", Boolean(response?.ok()), { status: response?.status() || 0 });
  await page.waitForSelector('input[name="code"]', { timeout: 20000 });
  await page.locator('input[name="code"]').fill(adminCode);
  const emailInput = page.locator('input[name="email"]');
  if (await emailInput.count()) await emailInput.fill(ownerEmail);
  entry.actions.push("filled shared owner gate login form");
  await page.evaluate(({ token }) => {
    const shared = {
      token,
      source: "owner-admin-login",
      platform_id: "metraiyux-0s",
      usage_lane: "fs27-owner-gate",
      issued_at: new Date().toISOString()
    };
    sessionStorage.setItem("FREE99_PLATFORM_GATE_SESSION", JSON.stringify(shared));
    localStorage.setItem("FREE99_PLATFORM_GATE_SESSION", JSON.stringify(shared));
  }, { token: adminBearerToken });
  entry.actions.push("stored shared owner bearer from canonical owner API");
  const appResponse = await page.goto(urlFor(returnPath), { waitUntil: "domcontentloaded", timeout: 45000 });
  pushStatus(entry, "owner_bearer_navigation", Boolean(appResponse?.ok()), { status: appResponse?.status() || 0 });
  entry.actions.push(`shared 0S gate opened ${returnPath}`);
}

async function waitForAppReady(page, entry) {
  await page.waitForSelector("#mainCanvas", { state: "attached", timeout: 30000 });
  await page.waitForSelector(".aiPlanCard", { state: "attached", timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll(".aiPlanCard").length >= 4, null, { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector("#mainCanvas")?.width > 100 && document.querySelector("#mainCanvas")?.height > 100, null, { timeout: 20000 });
  const state = await page.evaluate(() => ({
    planCards: document.querySelectorAll(".aiPlanCard").length,
    pageButtons: [...document.querySelectorAll(".pageBtn")].map((button) => button.textContent?.trim()).filter(Boolean),
    activePage: document.querySelector(".appPage.active")?.dataset.page || "",
    selectedPlan: document.querySelector("#aiPlan")?.value || "",
    introHidden: document.querySelector("#introGate")?.classList.contains("hidden") || false,
    appTitle: document.querySelector(".title")?.textContent?.trim() || "",
    gateOverlay: Boolean(document.querySelector("#free99PlatformGate")),
    providerKeyInputs: [...document.querySelectorAll("input, textarea")].filter((el) => /api[_ -]?key|provider[_ -]?key|openai|anthropic/i.test(`${el.id} ${el.name} ${el.placeholder}`)).length
  }));
  pushStatus(entry, "app_ready", state.planCards >= 4 && state.pageButtons.length >= 6 && state.appTitle.includes("Social") && !state.gateOverlay, state);
  pushStatus(entry, "no_provider_key_ui", state.providerKeyInputs === 0, state);
}

async function verifyIntro(page, entry, artifactDir) {
  await page.waitForSelector("#introGate", { state: "attached", timeout: 20000 });
  await page.waitForTimeout(900);
  const visible = await page.locator("#introGate").evaluate((el) => !el.classList.contains("hidden") && getComputedStyle(el).visibility !== "hidden");
  pushStatus(entry, "intro_is_start_surface", visible, { visible });
  await screenshot(page, entry, artifactDir, "intro-start", false);
  await page.locator("#introSkipBtn").click();
  entry.actions.push("dismissed intro with visible Enter Factory control");
  await page.waitForFunction(() => document.querySelector("#introGate")?.classList.contains("hidden"), null, { timeout: 10000 });
}

async function setInput(page, selector, value, entry) {
  await page.locator(selector).fill(String(value));
  entry.actions.push(`edited ${selector}`);
}

async function setRange(page, selector, value, entry) {
  await page.locator(selector).fill(String(value));
  await page.locator(selector).dispatchEvent("input");
  await page.locator(selector).dispatchEvent("change");
  entry.actions.push(`moved ${selector} to ${value}`);
}

async function clickIfVisible(page, selector, entry, label = selector) {
  const locator = page.locator(selector).first();
  if (!(await locator.isVisible().catch(() => false))) return false;
  await locator.click();
  entry.actions.push(`clicked ${label}`);
  return true;
}

async function openPageLane(page, lane, entry) {
  const button = page.locator(`.pageBtn[data-page="${lane}"]`).first();
  await button.click();
  entry.actions.push(`opened ${lane} page`);
  await page.waitForFunction((target) => {
    const active = document.querySelector(".appPage.active");
    return active?.dataset.page === target;
  }, lane, { timeout: 10000 });
  const pageState = await page.evaluate(() => ({
    activePage: document.querySelector(".appPage.active")?.dataset.page || "",
    activeHeading: document.querySelector(".appPage.active .panelHead h2")?.textContent?.trim() || "",
    visibleInputs: [...document.querySelectorAll(".appPage.active input,.appPage.active textarea,.appPage.active select,.appPage.active button")].filter((el) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0;
    }).length
  }));
  pushStatus(entry, `page_lane_${lane}_visible`, pageState.activePage === lane && pageState.visibleInputs > 0, pageState);
}

async function selectPlan(page, planId, entry) {
  await openPageLane(page, "ai", entry);
  await page.locator(`.aiPlanCard[data-plan="${planId}"]`).click();
  entry.actions.push(`selected AI plan ${planId}`);
  await page.waitForFunction((id) => document.querySelector("#aiPlan")?.value === id, planId, { timeout: 10000 });
  await page.waitForTimeout(450);
  const state = await page.evaluate(() => ({
    selected: document.querySelector("#aiPlan")?.value || "",
    badge: document.querySelector("#aiPlanBadge")?.textContent?.trim() || "",
    checkoutDisabled: document.querySelector("#aiCheckoutBtn")?.disabled || false,
    generateDisabled: document.querySelector("#aiGenerateBtn")?.disabled || false
  }));
  pushStatus(entry, `plan_selected_${planId}`, state.selected === planId, state);
  return state;
}

async function createCheckoutAndClaim(page, planId, entry) {
  await selectPlan(page, planId, entry);
  await page.locator("#aiEmail").fill(ownerEmail);
  entry.actions.push(`entered SkyPay gate email for ${planId}`);
  await page.locator("#aiCheckoutBtn").click();
  entry.actions.push(`started checkout for ${planId}`);
  await page.waitForFunction(() => {
    const link = document.querySelector("#aiCheckoutLink");
    const receipt = document.querySelector("#aiReceipt")?.textContent || "";
    const session = document.querySelector("#aiSessionId")?.value || "";
    return (session.length > 8 && link && !link.hidden && link.getAttribute("href") && link.getAttribute("href") !== "#") || /Pending .*checkout/i.test(receipt);
  }, null, { timeout: 90000 });
  const checkout = await page.evaluate(() => {
    const link = document.querySelector("#aiCheckoutLink");
    const href = link?.getAttribute("href") || "";
    const session = document.querySelector("#aiSessionId")?.value || "";
    const receipt = document.querySelector("#aiReceipt")?.textContent?.trim() || "";
    return { href, sessionLength: session.length, sessionPrefix: session ? session.slice(0, 7) : "", receipt };
  });
  entry.checkoutCreates.push({ planId, link: redactUrl(checkout.href), sessionLength: checkout.sessionLength, sessionPrefix: checkout.sessionPrefix ? "[redacted]" : "" });
  pushStatus(entry, `checkout_created_${planId}`, Boolean(checkout.href && checkout.sessionLength > 8), {
    link: redactUrl(checkout.href),
    sessionPresent: checkout.sessionLength > 8,
    receiptMentionsCheckout: /checkout/i.test(checkout.receipt)
  });
  if (!checkout.sessionLength) throw new Error("Checkout was created without a returned session id.");
  await page.waitForFunction(() => !document.querySelector("#aiClaimBtn")?.disabled, null, { timeout: 30000 });
  await page.locator("#aiClaimBtn").click();
  entry.actions.push(`claimed unpaid checkout for ${planId}`);
  await page.waitForTimeout(1400);
  const claimState = await page.evaluate(() => ({
    status: document.querySelector("#aiStatus")?.textContent?.trim() || "",
    receipt: document.querySelector("#aiReceipt")?.textContent?.trim() || "",
    selected: document.querySelector("#aiPlan")?.value || "",
    badge: document.querySelector("#aiPlanBadge")?.textContent?.trim() || ""
  }));
  const claimLooksHandled = /checkout|payment|claim|active|pending|confirmed|not complete|paid|unlocked/i.test(`${claimState.status} ${claimState.receipt}`);
  pushStatus(entry, `unpaid_claim_handled_${planId}`, claimLooksHandled, claimState);
}

async function exportPng(page, entry, artifactDir, label) {
  const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
  await page.locator("#exportPngBtn").click();
  const download = await downloadPromise;
  const suggested = download.suggestedFilename();
  const file = path.join(artifactDir, `${entry.label}-${label}-${suggested.replace(/[^a-z0-9_.-]+/gi, "-")}`);
  await download.saveAs(file);
  entry.downloads.push({ path: file, suggestedFilename: suggested });
  entry.actions.push(`exported PNG download ${suggested}`);
  pushStatus(entry, `download_export_png_${label}`, fs.existsSync(file) && fs.statSync(file).size > 1000, { suggestedFilename: suggested, bytes: fs.statSync(file).size });
}

async function scrollProof(page, entry, artifactDir, name) {
  const scrollTargets = [
    { lane: "setup", selector: ".appPage.active .scroll", x: 260, y: 420 },
    { lane: "ai", selector: ".appPage.active .scroll", x: 260, y: 420 },
    { lane: "kits", selector: ".appPage.active .scroll", x: 260, y: 420 },
    { lane: "batch", selector: ".galleryScroll", x: 720, y: 460 },
    { lane: "editor", selector: ".editor .stageWrap", x: 720, y: 420 },
    { lane: "editor", selector: ".editor .scroll", x: 720, y: 760 },
    { lane: "proof", selector: ".appPage.active .scroll", x: 260, y: 420 }
  ];
  let index = 0;
  for (const target of scrollTargets) {
    await openPageLane(page, target.lane, entry);
    const locator = page.locator(target.selector).first();
    if (!(await locator.count())) continue;
    await page.mouse.move(Math.min(target.x, entry.viewport.width - 20), Math.min(target.y, entry.viewport.height - 20));
    await page.mouse.wheel(0, 650);
    await page.waitForTimeout(250);
    const metrics = await visibleMetrics(page);
    const canvas = await canvasProof(page);
    const file = await screenshot(page, entry, artifactDir, `${name}-scroll-${index}`, false);
    entry.scrollStops.push({ name: `${name}-${target.lane}-${target.selector}`, screenshot: file, metrics, canvas });
    pushStatus(entry, `visual_nonblank_${name}_${target.lane}_${index}`, metrics.textLength > 100 && metrics.visibleElements > 20 && metrics.brokenImages === 0 && metrics.horizontalOverflowPx < 8 && canvas.present && canvas.paintedPixels > 10, { metrics, canvas });
    index += 1;
  }
}

async function runStressCycle(page, entry, artifactDir, cycle) {
  await openPageLane(page, "setup", entry);
  await setInput(page, "#brandName", `MetrAIyux Proof Brand ${entry.label} ${cycle}`, entry);
  await setInput(page, "#campaignName", `Browser Stress Cycle ${cycle}`, entry);
  await setInput(page, "#idea", `Cycle ${cycle}: prove Social Batch Factory local exports, gated AI checkout, and live browser stability under repeated human use.`, entry);
  await setInput(page, "#offer", `Get a production-proof campaign batch with checkout-gated AI lane cycle ${cycle}.`, entry);
  await setInput(page, "#cta", `Claim Cycle ${cycle}`, entry);
  await setInput(page, "#url", "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/social-batch-factory/", entry);
  await page.selectOption("#campaignType", cycle % 2 ? "Promo / Sale" : "Launch");
  entry.actions.push("changed campaign type");
  await page.selectOption("#batchSize", cycle === 1 ? "30" : cycle === 2 ? "40" : "50");
  entry.actions.push("changed batch size");
  if (await page.locator("#filters button").first().isVisible().catch(() => false)) {
    await page.locator("#filters button").first().click();
    entry.actions.push("reset gallery filter before generation");
  }
  await page.locator("#generateBtn").click();
  entry.actions.push(`generated batch cycle ${cycle}`);
  await page.waitForFunction(() => document.querySelectorAll("#gallery .card").length > 8, null, { timeout: 30000 });
  await openPageLane(page, "proof", entry);
  await page.locator("#auditBtn").click();
  entry.actions.push(`ran audit cycle ${cycle}`);
  await page.waitForFunction(() => (document.querySelector("#auditList")?.textContent || "").trim().length > 40, null, { timeout: 15000 });
  await openPageLane(page, "batch", entry);
  const filterButtons = await page.locator("#filters button").count();
  for (let index = 0; index < Math.min(filterButtons, 4); index += 1) {
    await page.locator("#filters button").nth(index).click();
    entry.actions.push(`clicked filter ${index}`);
    await page.waitForTimeout(180);
  }
  const galleryCards = await page.locator("#gallery .card").count();
  if (galleryCards > 2) {
    await page.locator("#gallery .card").nth(Math.min(cycle, galleryCards - 1)).click();
    entry.actions.push(`selected gallery card ${cycle}`);
  }
  await openPageLane(page, "editor", entry);
  await setRange(page, "#logoScale", String(70 + cycle * 12), entry);
  await setRange(page, "#imageFocus", String(35 + cycle * 15), entry);
  await openPageLane(page, "kits", entry);
  await setRange(page, "#brightness", String(98 + cycle * 4), entry);
  await setRange(page, "#contrast", String(108 + cycle * 3), entry);
  await setRange(page, "#saturation", String(106 + cycle * 5), entry);
  await openPageLane(page, "editor", entry);
  await clickIfVisible(page, "#safeBtn", entry, "safe zone");
  await clickIfVisible(page, "#shuffleBtn", entry, "remix copy");
  await clickIfVisible(page, "#duplicateBtn", entry, "duplicate variant");
  await clickIfVisible(page, "#regenSelectedBtn", entry, "re-render selected creative");
  const proofCanvas = await canvasProof(page);
  pushStatus(entry, `canvas_painted_cycle_${cycle}`, proofCanvas.present && proofCanvas.paintedPixels > 10 && proofCanvas.variedChannels > 3, proofCanvas);
  await screenshot(page, entry, artifactDir, `cycle-${cycle}-creative`, false);
  if (cycle === 1 && entry.label === "desktop") {
    await exportPng(page, entry, artifactDir, `cycle-${cycle}`);
  } else if (cycle === 1) {
    const exportReady = await page.locator("#exportPngBtn").isVisible().catch(() => false);
    pushStatus(entry, "mobile_export_control_visible", exportReady, { exportReady });
  }
  if (cycle === 1 && entry.label === "desktop") {
    await createCheckoutAndClaim(page, "social-batch-ai-burst", entry);
  } else if (cycle === 1) {
    await selectPlan(page, "social-batch-ai-burst", entry);
    const mobilePaidState = await page.evaluate(() => ({
      selected: document.querySelector("#aiPlan")?.value || "",
      checkoutDisabled: document.querySelector("#aiCheckoutBtn")?.disabled || false,
      checkoutHiddenBeforeSession: document.querySelector("#aiCheckoutLink")?.hidden || false,
      sessionLength: (document.querySelector("#aiSessionId")?.value || "").length
    }));
    pushStatus(entry, "mobile_paid_checkout_controls_ready", mobilePaidState.selected === "social-batch-ai-burst" && !mobilePaidState.checkoutDisabled && mobilePaidState.checkoutHiddenBeforeSession && mobilePaidState.sessionLength === 0, mobilePaidState);
  }
  if (cycle === 2) await selectPlan(page, "social-batch-ai-studio", entry);
  if (cycle === 3) await selectPlan(page, "social-batch-ai-unlimited", entry);
  if (cycle === stressCycles) {
    await selectPlan(page, "free99-core", entry);
    const freeState = await page.evaluate(() => ({
      selected: document.querySelector("#aiPlan")?.value || "",
      badge: document.querySelector("#aiPlanBadge")?.textContent?.trim() || "",
      checkoutDisabled: document.querySelector("#aiCheckoutBtn")?.disabled || false,
      generateDisabled: document.querySelector("#aiGenerateBtn")?.disabled || false,
      checkoutHidden: document.querySelector("#aiCheckoutLink")?.hidden || false
    }));
    pushStatus(entry, "free99_returns_to_no_ai", freeState.selected === "free99-core" && freeState.checkoutDisabled && freeState.generateDisabled, freeState);
  }
  await scrollProof(page, entry, artifactDir, `cycle-${cycle}`);
}

function attachWatchers(page, entry) {
  page.on("console", (message) => {
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
    if (url.startsWith("data:") || url.startsWith("blob:")) return;
    entry.httpErrors.push({
      url: redactUrl(url),
      status,
      method: response.request().method(),
      resourceType: response.request().resourceType()
    });
  });
}

async function runViewport(browser, viewport, label, artifactDir, options = {}) {
  const context = await browser.newContext({
    viewport,
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
    storageState: options.storageState || undefined,
    extraHTTPHeaders: options.authToken ? { Authorization: `Bearer ${options.authToken}` } : undefined
  });
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
    checkoutCreates: [],
    scrollStops: [],
    consoleErrors: [],
    failedRequests: [],
    httpErrors: [],
    failures: []
  };
  attachWatchers(page, entry);
  try {
    if (options.storageState) {
      const response = await page.goto(urlFor(appPath), { waitUntil: "domcontentloaded", timeout: 45000 });
      pushStatus(entry, "shared_gate_session_reused", Boolean(response?.ok()), { status: response?.status() || 0 });
      entry.actions.push("opened app with reused shared 0S owner gate session");
    } else {
      await loginOwner(page, appPath, entry);
    }
    await verifyIntro(page, entry, artifactDir);
    await waitForAppReady(page, entry);
    await screenshot(page, entry, artifactDir, "after-intro", false);
    await page.goto(urlFor(free99Path), { waitUntil: "domcontentloaded", timeout: 45000 });
    entry.actions.push("opened direct Free99 mounted path after shared gate login");
    await waitForAppReady(page, entry);
    await page.goto(`${urlFor(appPath)}?skipIntro=1&proof=${encodeURIComponent(label)}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    entry.actions.push("returned to canonical social-batch-factory route with intro bypass for stress");
    await waitForAppReady(page, entry);
    for (let cycle = 1; cycle <= stressCycles; cycle += 1) {
      await runStressCycle(page, entry, artifactDir, cycle);
      if (entry.label === "mobile" && cycle < stressCycles) {
        await page.goto(`${urlFor(appPath)}?skipIntro=1&mobileCycle=${cycle}`, { waitUntil: "domcontentloaded", timeout: 45000 });
        entry.actions.push(`reloaded mobile app between stress cycles ${cycle} and ${cycle + 1}`);
        await waitForAppReady(page, entry);
      }
    }
    const finalMetrics = await visibleMetrics(page);
    const finalCanvas = await canvasProof(page);
    pushStatus(entry, "final_visual_state", finalMetrics.textLength > 100 && finalMetrics.visibleElements > 20 && finalMetrics.brokenImages === 0 && finalMetrics.horizontalOverflowPx < 8 && finalCanvas.paintedPixels > 10, { metrics: finalMetrics, canvas: finalCanvas });
    await screenshot(page, entry, artifactDir, "final-state", false);
  } catch (error) {
    entry.failures.push(cleanFailure(error));
  } finally {
    if (!options.storageState) entry._storageState = await context.storageState().catch(() => null);
    entry.actionCount = entry.actions.length;
    const failedStatuses = entry.statuses.filter((item) => !item.ok);
    if (entry.consoleErrors.length) entry.failures.push(`console errors: ${JSON.stringify(entry.consoleErrors)}`);
    if (entry.failedRequests.length) entry.failures.push(`failed requests: ${JSON.stringify(entry.failedRequests)}`);
    if (entry.httpErrors.length) entry.failures.push(`http errors: ${JSON.stringify(entry.httpErrors)}`);
    if (failedStatuses.length) entry.failures.push(`failed statuses: ${JSON.stringify(failedStatuses)}`);
    if (entry.actionCount < 24) entry.failures.push(`action count below browser stress policy: ${entry.actionCount}`);
    entry.ok = entry.failures.length === 0;
    await context.close().catch(() => {});
  }
  return entry;
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  const gateCredential = await resolveLiveGateCredential();
  adminCode = gateCredential.code;
  adminBearerToken = gateCredential.token;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactDir = path.join(repoRoot, "test-artifacts", "social-batch-factory-production-proof", stamp);
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    mode: "headed-live-browser-stress",
    headless: false,
    browser: "chromium headed via Playwright",
    stressCycles,
    minimumActionsPerViewport: 24,
    baseUrl,
    routes: {
      canonical: urlFor(appPath),
      free99: urlFor(free99Path),
      adminLogin: urlFor("/admin/login.html")
    },
    versions: {
      metraiyux0s: deploymentVersion,
      fs27: fs27Version
    },
    unauthGate: [],
    checks: [],
    failures: [],
    artifactDir
  };
  if (!adminCode || !adminBearerToken) report.failures.push("Missing shared owner gate credential in env or ADMIN_REFERENCE.md.");
  if (!report.failures.length) {
    report.unauthGate.push(await checkUnauthGate(appPath));
    report.unauthGate.push(await checkUnauthGate(free99Path));
    const launchHeaded = () => chromium.launch({
      headless: false,
      slowMo,
      chromiumSandbox: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
    let browser;
    try {
      browser = await launchHeaded();
      const desktop = await runViewport(browser, { width: 1440, height: 980 }, "desktop", artifactDir, { authToken: adminBearerToken });
      delete desktop._storageState;
      report.checks.push(desktop);
      await browser.close().catch(() => {});
      browser = await launchHeaded();
      const mobile = await runViewport(browser, { width: 390, height: 844 }, "mobile", artifactDir, { authToken: adminBearerToken });
      delete mobile._storageState;
      report.checks.push(mobile);
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
  const reportPath = path.join(artifactDir, "production-headed-browser-stress-proof.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(publicReport, null, 2)}\n`);
  fs.writeFileSync(path.join(repoRoot, "test-artifacts", "social-batch-factory-production-proof", "latest-production-headed-browser-stress-proof.json"), `${JSON.stringify(publicReport, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: publicReport.ok,
    report: reportPath,
    artifactDir,
    checks: publicReport.checks.map((check) => ({
      label: check.label,
      ok: check.ok,
      actions: check.actionCount,
      screenshots: check.screenshots.length,
      downloads: check.downloads.length,
      checkoutCreates: check.checkoutCreates.length
    })),
    failures: publicReport.failures
  }, null, 2));
  if (!publicReport.ok) process.exit(1);
}

main().catch((error) => {
  console.error(cleanFailure(error));
  process.exit(1);
});
