#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const repoRoot = "/workspaces/MetrAIyux-0S";
const baseUrl = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const appPath = "/social-batch-factory/";
const version = process.env.PROOF_DEPLOYMENT_VERSION || "4c869a2e-a205-43b4-bf7d-69e3bafa31e7";

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

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function clean(value) {
  return String(value || "")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, "$1[redacted]")
    .replace(/(code=)[^&\s)]+/gi, "$1[redacted]");
}

function localAdminCodeCandidates() {
  const text = `${read(path.join(repoRoot, "ADMIN_REFERENCE.md"))}\n${read(path.join(repoRoot, ".env"))}`;
  const values = [];
  for (const line of text.split(/\r?\n/)) {
    if (!/owner admin code|free99|admin code|owner_admin|free99_admin/i.test(line)) continue;
    for (const match of line.matchAll(/`([^`]+)`|['"]([^'"]{4,})['"]|=([^\s#]{4,})/g)) {
      const value = String(match[1] || match[2] || match[3] || "")
        .trim()
        .replace(/^export\s+/, "")
        .replace(/^['"]|['"]$/g, "");
      if (!value || value.startsWith("/") || value.startsWith("http") || value.includes("<") || value.includes("$") || value.length > 180) continue;
      values.push(value);
    }
  }
  return [...new Set(values.filter((value) => !/^[A-Z0-9_]+$/.test(value)).concat(values.filter((value) => /^[A-Z0-9_]+$/.test(value))))];
}

async function resolveValidCode() {
  for (const code of localAdminCodeCandidates()) {
    const response = await fetch(`${baseUrl}/api/owner/admin-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code })
    }).catch(() => null);
    if (!response?.ok) continue;
    const data = await response.json().catch(() => ({}));
    if (data.token || data.gateToken || data.gateBearerToken) return code;
  }
  throw new Error("No local Free99 admin code candidate unlocked the live 0S gate.");
}

function attachWatchers(page, entry) {
  page.on("console", (message) => {
    if (message.type() === "error") entry.consoleErrors.push(clean(message.text()));
  });
  page.on("pageerror", (error) => entry.consoleErrors.push(clean(error.stack || error.message)));
  page.on("requestfailed", (request) => entry.failedRequests.push({ url: new URL(request.url()).pathname, failure: clean(request.failure()?.errorText || "") }));
  page.on("response", (response) => {
    if (response.status() >= 400) entry.httpErrors.push({ url: new URL(response.url()).pathname, status: response.status(), method: response.request().method() });
  });
}

async function screenshot(page, artifactDir, entry, name) {
  const file = path.join(artifactDir, `${entry.label}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  entry.screenshots.push(file);
}

async function runViewport(browser, artifactDir, viewport, label, code) {
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const entry = { label, viewport, actions: [], screenshots: [], statuses: [], consoleErrors: [], failedRequests: [], httpErrors: [], failures: [], ok: false };
  attachWatchers(page, entry);
  try {
    await page.goto(`${baseUrl}${appPath}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    entry.actions.push("opened gated app URL while unauthenticated");
    await page.waitForURL((url) => url.pathname === "/admin/login.html" && url.search.includes("return="), { timeout: 20000 });
    entry.statuses.push({ name: "app_redirected_to_shared_login", ok: true, path: new URL(page.url()).pathname });
    await page.waitForSelector('input[name="code"]', { timeout: 20000 });
    const loginState = await page.evaluate(() => ({
      h1: document.querySelector("h1")?.textContent?.trim() || "",
      button: document.querySelector("#unlock-button")?.textContent?.trim() || "",
      codeInputs: document.querySelectorAll('input[name="code"]').length,
      emailInputs: document.querySelectorAll('input[type="email"], input[name="email"]').length,
      passwordInputs: document.querySelectorAll('input[type="password"]').length,
      returnText: document.querySelector("#return-path")?.textContent?.trim() || ""
    }));
    entry.statuses.push({ name: "free99_code_screen_visible", ok: /Free99 admin code/i.test(loginState.h1) && /Unlock This App/i.test(loginState.button), state: loginState });
    entry.statuses.push({ name: "no_email_password_app_login", ok: loginState.codeInputs === 1 && loginState.emailInputs === 0 && loginState.passwordInputs === 1, state: loginState });
    entry.statuses.push({ name: "return_path_points_to_app", ok: loginState.returnText === appPath, state: loginState });
    await screenshot(page, artifactDir, entry, "free99-login-screen");
    await page.fill('input[name="code"]', code);
    entry.actions.push("entered Free99 admin code into shared gate screen");
    await page.click("#unlock-button");
    entry.actions.push("clicked Unlock This App");
    await page.waitForURL((url) => url.pathname === appPath || url.pathname === appPath.replace(/\/$/, ""), { timeout: 30000 });
    entry.statuses.push({ name: "returned_to_app_after_code", ok: true, path: new URL(page.url()).pathname });
    await page.waitForSelector("#introGate, #mainCanvas", { timeout: 30000 });
    if (await page.locator("#introSkipBtn").isVisible().catch(() => false)) await page.click("#introSkipBtn");
    await page.waitForSelector("#mainCanvas", { timeout: 30000 });
    const appState = await page.evaluate(() => ({
      title: document.querySelector(".title")?.textContent?.trim() || document.title,
      canvas: Boolean(document.querySelector("#mainCanvas")),
      planCards: document.querySelectorAll(".aiPlanCard").length,
      gateOverlay: Boolean(document.querySelector("#free99PlatformGate"))
    }));
    entry.statuses.push({ name: "app_rendered_after_free99_code", ok: appState.canvas && appState.planCards >= 4 && !appState.gateOverlay, state: appState });
    await screenshot(page, artifactDir, entry, "app-open-after-free99-code");
  } catch (error) {
    entry.failures.push(clean(error.stack || error.message));
  } finally {
    const failedStatuses = entry.statuses.filter((status) => !status.ok);
    if (failedStatuses.length) entry.failures.push(`failed statuses: ${JSON.stringify(failedStatuses)}`);
    if (entry.consoleErrors.length) entry.failures.push(`console errors: ${JSON.stringify(entry.consoleErrors)}`);
    if (entry.failedRequests.length) entry.failures.push(`failed requests: ${JSON.stringify(entry.failedRequests)}`);
    if (entry.httpErrors.length) entry.failures.push(`http errors: ${JSON.stringify(entry.httpErrors)}`);
    entry.ok = entry.failures.length === 0;
    await context.close().catch(() => {});
  }
  return entry;
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  const code = await resolveValidCode();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactDir = path.join(repoRoot, "test-artifacts", "free99-admin-code-unlock-proof", stamp);
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = { ok: false, checkedAt: new Date().toISOString(), mode: "headed-live-browser-free99-admin-code-unlock", headless: false, baseUrl, appPath, version, artifactDir, checks: [], failures: [] };
  let browser;
  try {
    browser = await chromium.launch({ headless: false, slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 80), chromiumSandbox: false, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
    report.checks.push(await runViewport(browser, artifactDir, { width: 1366, height: 900 }, "desktop", code));
    report.checks.push(await runViewport(browser, artifactDir, { width: 390, height: 844 }, "mobile", code));
  } catch (error) {
    report.failures.push(clean(error.stack || error.message));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  for (const check of report.checks) if (!check.ok) report.failures.push(`${check.label} failed: ${JSON.stringify(check.failures)}`);
  report.ok = report.failures.length === 0;
  const reportPath = path.join(artifactDir, "free99-admin-code-unlock-proof.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(repoRoot, "test-artifacts", "free99-admin-code-unlock-proof", "latest-free99-admin-code-unlock-proof.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, report: reportPath, checks: report.checks.map((check) => ({ label: check.label, ok: check.ok, screenshots: check.screenshots.length, failures: check.failures })) }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(clean(error.stack || error.message));
  process.exit(1);
});
