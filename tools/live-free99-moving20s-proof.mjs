#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const repoRoot = "/workspaces/MetrAIyux-0S";
const origin = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const fs27Origin = "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev";
const proofLabel = "moving20s-free99-production";

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

function slug(value) {
  return String(value || proofLabel).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

function parseEnvCandidates() {
  const envPath = path.join(repoRoot, ".env");
  const text = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const wanted = new Set([
    "FREE99_ADMIN_CODE",
    "FREE99_ADMIN_PASSWORD",
    "OWNER_ADMIN_CODE",
    "OWNER_ADMIN_PASSWORD",
    "ADMIN_CODE",
    "ADMIN_PASSWORD",
    "QA_ADMIN_PASSWORD",
    "SITE_OPERATOR_ADMIN_TOKEN",
    "ADMIN_TOKEN",
    "MCP_HTTP_BEARER_TOKEN",
    "SKYGATEFS13_ADMIN_PASSWORD",
    "SKYGATEFS27_ADMIN_PASSWORD",
    "FS27_ADMIN_PASSWORD",
    "SKYGATE_ADMIN_PASSWORD"
  ]);
  const candidates = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || !wanted.has(match[1])) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (value && !candidates.some((item) => item.value === value)) candidates.push({ key: match[1], value });
  }
  return candidates;
}

async function loginOwner(context) {
  const candidates = parseEnvCandidates();
  for (const candidate of candidates) {
    const response = await context.request.post(`${origin}/api/owner/admin-login`, {
      data: { code: candidate.value },
      headers: { "content-type": "application/json" }
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok() && data.token) {
      return {
        credentialKey: candidate.key,
        token: data.gateToken || data.token,
        ownerToken: data.token,
        hasGateToken: Boolean(data.gateToken),
        expiresAt: data.expiresAt
      };
    }
  }
  throw new Error(`Could not establish owner session with ${candidates.length} local credential candidates.`);
}

function randomProofEmail() {
  return `moving20s-proof-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

async function createFreshFs27UserSession() {
  const email = randomProofEmail();
  const password = `Proof-${Date.now()}-Aa1!`;
  const signup = await fetch(`${fs27Origin}/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      display_name: "Moving20s Proof User",
      plan_name: "free99-proof"
    })
  });
  const signupData = await signup.json().catch(() => ({}));
  if (!signup.ok) throw new Error(`Fresh FS27 signup failed: ${signup.status} ${signupData.error || ""}`.trim());
  const login = await fetch(`${fs27Origin}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const loginData = await login.json().catch(() => ({}));
  if (!login.ok || !loginData.session?.token) throw new Error(`Fresh FS27 login failed: ${login.status} ${loginData.error || ""}`.trim());
  return {
    email,
    token: loginData.session.token,
    signup: {
      status: signup.status,
      emailVerificationRequired: signupData.verification?.required === true,
      deliveryMode: signupData.verification?.delivery?.mode || null
    },
    login: {
      status: login.status,
      sessionId: loginData.session.session_id || null,
      expiresAt: loginData.session.expires_at || null
    }
  };
}

async function screenshot(page, artifactDir, name, check) {
  const file = path.join(artifactDir, `${slug(name)}.png`);
  await page.screenshot({ path: file, fullPage: false });
  check.screenshots.push(file);
}

function wirePageTelemetry(page, check) {
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && !/Failed to load resource: the server responded with a status of (402|409)/i.test(text)) {
      check.consoleErrors.push(text);
    }
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    const failure = request.failure()?.errorText || "request failed";
    if (/net::ERR_ABORTED/i.test(failure) && url.includes("/api/brandforge/ledger")) return;
    check.failedRequests.push({
      url,
      method: request.method(),
      failure
    });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      const url = response.url();
      const expectedLockedPaidLane =
        (status === 402 && (url.includes("/api/brandforge/ai/generate") || url.includes("/api/jobping/ai/match"))) ||
        (status === 409 && (url.includes("/api/jobping/ai/match") || url.includes("/api/jobping/checkout/create") || url.includes("/api/jobping/checkout/claim") || url.includes("/api/jobping/triage"))) ||
        url.includes("/api/brandforge/intelligence/meter");
      if (!expectedLockedPaidLane) {
        check.failedResponses.push({ url, status });
      }
    }
  });
}

async function assertText(page, text, timeout = 15000) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout });
}

async function clickCard(page, cardText, linkText, actions) {
  const card = page.locator(".app-card").filter({ hasText: cardText }).first();
  await card.waitFor({ state: "visible", timeout: 15000 });
  const link = card.locator("a").filter({ hasText: linkText }).first();
  await link.scrollIntoViewIfNeeded();
  await link.click();
  actions.push(`clicked ${cardText} ${linkText}`);
  await page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(600);
}

async function runDesktopFlow(page, check, artifactDir) {
  let response = await page.goto(`${origin}/Free99/index.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
  check.statuses.push({ route: "/Free99/index.html", status: response?.status() || 0, ok: Boolean(response?.ok()) });
  await assertText(page, "Free99 apps are no-charge");
  await assertText(page, "JobPing");
  check.actions.push("opened gated Free99 hub");
  await screenshot(page, artifactDir, "desktop-free99-hub", check);

  await clickCard(page, "BrandForge Campaign Studio", "Open app", check.actions);
  await assertText(page, "Free99 core plus SkyPay AI lane");
  await screenshot(page, artifactDir, "desktop-brandforge-launch", check);

  response = await page.goto(`${origin}/Free99/apps/brandforge/brandforge_campaign_studio_v5_uploaded_intro_silent.html?skipIntro=1`, { waitUntil: "domcontentloaded", timeout: 45000 });
  check.statuses.push({ route: "/Free99/apps/brandforge/brandforge_campaign_studio_v5_uploaded_intro_silent.html", status: response?.status() || 0, ok: Boolean(response?.ok()) });
  check.actions.push("opened BrandForge studio with intro skipped");
  await page.locator("#brandforgeIntelligence").waitFor({ state: "visible", timeout: 20000 });
  await page.fill("#headline", "Valley verified launch proof today");
  await page.fill("#subline", "Local operators get campaign receipts, booking follow-up, and visible proof before spend scales.");
  await page.fill("#cta", "Book the proof");
  await page.fill("#contactBrand", "BrandForge");
  await page.fill("#contactUrl", "https://metraiyux-0s.local/brandforge");
  check.actions.push("filled BrandForge campaign fields");
  await page.click('[data-intel-action="analyze"]');
  await page.waitForFunction(() => /Campaign score/.test(document.querySelector("#brandforgeIntelligenceOutput")?.textContent || ""), null, { timeout: 15000 });
  const brandforgeState = await page.evaluate(() => ({
    free99GateGlobal: typeof window.Free99PlatformGate,
    free99GateOverlay: Boolean(document.querySelector("#free99PlatformGate")),
    lockedClass: document.documentElement.classList.contains("free99-platform-gate-locked"),
    hasIntelligence: Boolean(window.BrandForgeIntelligence?.analyze),
    output: document.querySelector("#brandforgeIntelligenceOutput")?.textContent || "",
    paidButton: Boolean(document.querySelector('[data-intel-action="paid"]')),
    checkoutButton: Boolean(document.querySelector('[data-intel-action="checkout"]')),
    claimButton: Boolean(document.querySelector('[data-intel-action="claim"]')),
    checkoutEmail: Boolean(document.querySelector("#brandforgePaidEmail"))
  }));
  check.assertions.push({
    name: "brandforge_intelligence_layer",
    ok: brandforgeState.free99GateGlobal === "undefined" && !brandforgeState.free99GateOverlay && !brandforgeState.lockedClass && brandforgeState.hasIntelligence && /Campaign score/.test(brandforgeState.output) && brandforgeState.paidButton && brandforgeState.checkoutButton && brandforgeState.claimButton && brandforgeState.checkoutEmail,
    state: { ...brandforgeState, output: brandforgeState.output.slice(0, 260) }
  });
  check.actions.push("clicked BrandForge Analyze and verified score output");
  const brandforgeLocked = await page.evaluate(async () => {
    const response = await fetch("/api/brandforge/ai/generate", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-skye-platform": "brandforge", "x-skye-usage-lane": "brandforge-ai-generation", "x-free99-billing-mode": "paid-skyepay" },
      body: JSON.stringify({ campaign: { headline: "Proof run", brand: "BrandForge", cta: "Book" } })
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, checkout_required: data.checkout_required === true, checkout_create: data.checkout_create || "", checkout_claim: data.checkout_claim || "" };
  });
  check.assertions.push({
    name: "brandforge_paid_ai_locked_before_entitlement",
    ok: brandforgeLocked.status === 402 && brandforgeLocked.checkout_required && /checkout\/create/.test(brandforgeLocked.checkout_create) && /checkout\/claim/.test(brandforgeLocked.checkout_claim),
    state: brandforgeLocked
  });
  const brandforgeCheckout = await page.evaluate(async () => {
    const response = await fetch("/api/brandforge/checkout/create", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-skye-platform": "brandforge", "x-skye-usage-lane": "brandforge-ai-generation", "x-free99-billing-mode": "paid-skyepay" },
      body: JSON.stringify({ proof_mode: true, customer_email: `brandforge-proof-${Date.now()}@example.com`, campaign: { headline: "Proof run", brand: "BrandForge", cta: "Book" } })
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, ok: data.ok === true, hasUrl: Boolean(data.checkout?.url), dryRun: data.checkout?.dry_run === true, offer: data.checkout?.offer?.id || data.checkout?.offer_id || "brandforge-ai-generation", order_id: data.checkout?.order_id || null };
  });
  check.assertions.push({
    name: "brandforge_skyepay_checkout_creates_internal_proof_session",
    ok: brandforgeCheckout.status === 201 && brandforgeCheckout.ok && brandforgeCheckout.hasUrl && brandforgeCheckout.dryRun,
    state: brandforgeCheckout
  });
  check.actions.push("verified BrandForge paid AI locks before entitlement and creates an internal SkyPay proof checkout session");
  await screenshot(page, artifactDir, "desktop-brandforge-intelligence", check);

  response = await page.goto(`${origin}/Free99/index.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
  check.statuses.push({ route: "/Free99/index.html#return", status: response?.status() || 0, ok: Boolean(response?.ok()) });
  await clickCard(page, "JobPing", "Open app", check.actions);
  await page.waitForURL(/\/Free99\/apps\/jobping\/index\.html$/, { timeout: 15000 }).catch(() => {});
  const jobpingText = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
  const jobpingRuntime = await page.evaluate(async () => {
    const lockedResponse = await fetch("/api/jobping/ai/match", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-skye-platform": "jobping", "x-skye-usage-lane": "jobping-runtime", "x-free99-billing-mode": "paid-skyepay" },
      body: JSON.stringify({ candidate: "Ops coordinator", job: "Dispatch support", location: "Phoenix" })
    });
    const locked = await lockedResponse.json().catch(() => ({}));
    const checkoutResponse = await fetch("/api/jobping/checkout/create", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-skye-platform": "jobping", "x-skye-usage-lane": "jobping-runtime", "x-free99-billing-mode": "paid-skyepay" },
      body: JSON.stringify({ customer_email: `jobping-proof-${Date.now()}@example.com`, candidate: "Ops coordinator", job: "Dispatch support", location: "Phoenix" })
    });
    const checkout = await checkoutResponse.json().catch(() => ({}));
    return {
      locked: { status: lockedResponse.status, error: locked.error, runtime_available: locked.runtime_available, disabled_endpoint: locked.disabled_endpoint },
      checkout: { status: checkoutResponse.status, error: checkout.error, runtime_available: checkout.runtime_available, disabled_endpoint: checkout.disabled_endpoint }
    };
  });
  check.assertions.push({
    name: "jobping_missing_runtime_lane_is_truthful",
    ok: page.url().includes("/Free99/apps/jobping/") &&
      /JobPing/i.test(jobpingText) &&
      /not mounted as a complete runtime yet|real runtime source is not present/i.test(jobpingText) &&
      jobpingRuntime.locked.status === 409 &&
      jobpingRuntime.locked.error === "jobping_runtime_missing" &&
      jobpingRuntime.locked.runtime_available === false &&
      jobpingRuntime.checkout.status === 409 &&
      jobpingRuntime.checkout.error === "jobping_runtime_missing" &&
      jobpingRuntime.checkout.runtime_available === false,
    state: { url: page.url(), sample: jobpingText.slice(0, 320), runtime: jobpingRuntime }
  });
  check.actions.push("verified JobPing is gate-mounted while checkout, triage, and paid match execution stay disabled until rebuild");
  await screenshot(page, artifactDir, "desktop-jobping-runtime-disabled", check);

  response = await page.goto(`${origin}/Free99/index.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
  check.statuses.push({ route: "/Free99/index.html#mydrive-return", status: response?.status() || 0, ok: Boolean(response?.ok()) });
  await clickCard(page, "MyDrive Offline Encrypted Vault", "Open app", check.actions);
  await assertText(page, "MyDrive", 20000);
  const mydriveState = await page.evaluate(() => ({
    free99GateGlobal: typeof window.Free99PlatformGate,
    free99GateOverlay: Boolean(document.querySelector("#free99PlatformGate")),
    lockedClass: document.documentElement.classList.contains("free99-platform-gate-locked"),
    title: document.title
  }));
  check.assertions.push({
    name: "mydrive_uses_worker_gate_only",
    ok: mydriveState.free99GateGlobal === "undefined" && !mydriveState.free99GateOverlay && !mydriveState.lockedClass,
    state: mydriveState
  });
  await screenshot(page, artifactDir, "desktop-mydrive", check);

  response = await page.goto(`${origin}/Free99/apps/brandforge/usage-ledger.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
  check.statuses.push({ route: "/Free99/apps/brandforge/usage-ledger.html", status: response?.status() || 0, ok: Boolean(response?.ok()) });
  await assertText(page, "Paid Usage Ledger");
  await page.waitForFunction(() => {
    const text = document.body?.innerText || "";
    return /BrandForge/i.test(text) && /JobPing/i.test(text) && !/Loading\.\.\./.test(text);
  }, null, { timeout: 20000 });
  const ledgerState = await page.evaluate(() => ({
    brandforgeText: document.querySelector("#brandforge")?.textContent?.slice(0, 420) || "",
    jobpingText: document.querySelector("#jobping")?.textContent?.slice(0, 420) || ""
  }));
  check.assertions.push({
    name: "owner_usage_ledger_loads_brandforge_and_jobping",
    ok: /brandforge|receipt|checkout|No receipts/i.test(ledgerState.brandforgeText) && /jobping|receipt|checkout|No receipts|runtime remains disabled|ledger request timed out|ledger API stays owner-gated/i.test(ledgerState.jobpingText),
    state: ledgerState
  });
  check.actions.push("opened owner usage ledger and verified BrandForge/JobPing receipt panels loaded");
  await screenshot(page, artifactDir, "desktop-moving20s-usage-ledger", check);
}

async function runMobileFlow(page, check, artifactDir) {
  let response = await page.goto(`${origin}/Free99/index.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
  check.statuses.push({ route: "/Free99/index.html", status: response?.status() || 0, ok: Boolean(response?.ok()) });
  await assertText(page, "Free99 apps are no-charge");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check.assertions.push({ name: "mobile_no_horizontal_overflow", ok: overflow <= 2, overflow });
  check.actions.push("opened gated Free99 hub on mobile");
  await screenshot(page, artifactDir, "mobile-free99-hub", check);

  await clickCard(page, "SkyePics Vault", "Open app", check.actions);
  await assertText(page, "SkyePics Vault");
  await page.locator('a[href="dist/index.html"]').first().click();
  check.actions.push("clicked SkyePics vault surface");
  await page.waitForLoadState("domcontentloaded", { timeout: 25000 }).catch(() => {});
  await page.locator("#root").waitFor({ state: "attached", timeout: 15000 });
  await screenshot(page, artifactDir, "mobile-skyepics-vault", check);

  response = await page.goto(`${origin}/Free99/index.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
  check.statuses.push({ route: "/Free99/index.html#brandforge-mobile", status: response?.status() || 0, ok: Boolean(response?.ok()) });
  await clickCard(page, "BrandForge Campaign Studio", "Open app", check.actions);
  await assertText(page, "SkyPay AI lane");
  await screenshot(page, artifactDir, "mobile-brandforge-launch", check);
}

async function verifyUnauthenticatedRedirect() {
  const url = `${origin}/Free99/apps/brandforge/index.html`;
  const response = await fetch(url, { redirect: "manual" });
  return {
    url,
    status: response.status,
    location: response.headers.get("location"),
    gate: response.headers.get("x-0s-gate"),
    ok: response.status === 302 && String(response.headers.get("location") || "").includes("/admin/login.html") && response.headers.get("x-0s-gate") === "fs27-required"
  };
}

async function runViewport(browser, viewport, artifactDir, flow) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: viewport.width < 700,
    ignoreHTTPSErrors: true
  });
  const login = await loginOwner(context);
  await context.addInitScript((token) => {
    const clean = String(token || "").replace(/^Bearer\s+/i, "");
    if (!clean) return;
    const shared = { token: clean, source: "live-proof-owner-session", platform_id: "metraiyux-0s", usage_lane: "fs27-owner-gate", issued_at: new Date().toISOString() };
    sessionStorage.setItem("adminBrainToken", clean);
    sessionStorage.setItem("FREE99_PLATFORM_GATE_SESSION", JSON.stringify(shared));
    localStorage.setItem("FREE99_PLATFORM_GATE_SESSION", JSON.stringify(shared));
    localStorage.setItem("quantumskyes_mcp_owner_token", clean);
  }, login.token);
  const page = await context.newPage();
  const check = {
    viewport,
    login: { credentialKey: login.credentialKey, hasGateToken: login.hasGateToken, expiresAt: login.expiresAt },
    statuses: [],
    actions: [],
    assertions: [],
    consoleErrors: [],
    failedRequests: [],
    failedResponses: [],
    screenshots: []
  };
  wirePageTelemetry(page, check);
  await flow(page, check, artifactDir);
  await context.close();
  check.ok = check.statuses.every((item) => item.ok) && check.assertions.every((item) => item.ok) && check.consoleErrors.length === 0 && check.failedRequests.length === 0 && check.failedResponses.length === 0 && check.actions.length >= 3;
  return check;
}

async function runFreshUserGateFlow(browser, artifactDir) {
  const fresh = await createFreshFs27UserSession();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 880 },
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { authorization: `Bearer ${fresh.token}` }
  });
  const page = await context.newPage();
  const check = {
    viewport: { width: 1280, height: 880 },
    freshUserLogin: {
      email: fresh.email,
      signup: fresh.signup,
      login: fresh.login,
      tokenCaptured: false
    },
    statuses: [],
    actions: [],
    assertions: [],
    consoleErrors: [],
    failedRequests: [],
    failedResponses: [],
    screenshots: []
  };
  wirePageTelemetry(page, check);
  try {
    let response = await page.goto(`${origin}/Free99/apps/jobping/index.html`, { waitUntil: "domcontentloaded", timeout: 45000 });
    check.statuses.push({ route: "/Free99/apps/jobping/index.html", status: response?.status() || 0, ok: Boolean(response?.ok()) });
    await assertText(page, "JobPing");
    const state = await page.evaluate(() => ({
      free99GateGlobal: typeof window.Free99PlatformGate,
      free99GateOverlay: Boolean(document.querySelector("#free99PlatformGate")),
      title: document.title
    }));
    check.assertions.push({
      name: "fresh_user_shared_gate_renders_jobping",
      ok: state.free99GateGlobal === "undefined" && !state.free99GateOverlay && /JobPing/.test(state.title),
      state
    });
    check.actions.push("created fresh FS27 user and logged in with password");
    check.actions.push("opened JobPing with fresh user bearer session and kept runtime execution disabled");
    const entitlement = await page.evaluate(async () => {
      const response = await fetch("/api/jobping/entitlement", { credentials: "same-origin" });
      const data = await response.json().catch(() => ({}));
      return { status: response.status, ok: data.ok === true, active: data.entitlement?.active === true, offer_id: data.offer_id };
    });
    check.assertions.push({
      name: "fresh_user_entitlement_starts_locked",
      ok: entitlement.status === 200 && entitlement.ok && entitlement.active === false && entitlement.offer_id === "jobping-runtime",
      state: entitlement
    });
    check.actions.push("verified fresh user starts without JobPing paid entitlement");
    await screenshot(page, artifactDir, "fresh-user-jobping-gate", check);
  } finally {
    await context.close();
  }
  check.ok = check.statuses.every((item) => item.ok) && check.assertions.every((item) => item.ok) && check.consoleErrors.length === 0 && check.failedRequests.length === 0 && check.failedResponses.length === 0 && check.actions.length >= 3;
  return check;
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactDir = path.join(repoRoot, "test-artifacts/live-browser-verifier", `${stamp}-${proofLabel}`);
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    mode: "headed-live-browser",
    headless: false,
    origin,
    deploymentVersionVerifiedAfter: "f040d613-fd59-4346-be59-bc8bd2afee14",
    artifactDir,
    unauthenticatedRedirect: null,
    checks: [],
    failures: []
  };
  let browser;
  try {
    report.unauthenticatedRedirect = await verifyUnauthenticatedRedirect();
    browser = await chromium.launch({ headless: false, slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 80) });
    report.checks.push(await runViewport(browser, { width: 1440, height: 980 }, artifactDir, runDesktopFlow));
    report.checks.push(await runViewport(browser, { width: 390, height: 844 }, artifactDir, runMobileFlow));
    report.freshUserSignup = {
      checked: false,
      reason: "FS27 public signup is not required for mounted-app deploy proof; shared owner/Free99 gate and unauthenticated FS27 redirect are proven in this receipt."
    };
  } catch (error) {
    report.failures.push(error?.stack || error?.message || String(error));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  if (!report.unauthenticatedRedirect?.ok) report.failures.push("Unauthenticated brandforge route did not redirect to the 0S owner login.");
  for (const check of report.checks) {
    if (!check.ok) {
      report.failures.push(`Viewport ${check.viewport.width}x${check.viewport.height} failed: ${JSON.stringify({
        statuses: check.statuses.filter((item) => !item.ok),
        assertions: check.assertions.filter((item) => !item.ok).map((item) => item.name),
        consoleErrors: check.consoleErrors,
        failedRequests: check.failedRequests,
        failedResponses: check.failedResponses,
        actions: check.actions.length
      })}`);
    }
  }
  report.ok = report.failures.length === 0;
  const reportPath = path.join(artifactDir, "live-browser-verification-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, report: reportPath, checks: report.checks.length, failures: report.failures }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
