#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const repoRoot = "/workspaces/MetrAIyux-0S";
const baseUrl = (process.env.PROOF_BASE_URL || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, "");
const still2vidPath = "/Free99/apps/still2vid-forge/index.html";
const skyeOpsPath = "/Free99/apps/skyeopsconsole/index.html";
const factoryMediaPath = "/client-app-factory/media/";
const webCreatorPath = "/Marketing-Made-Easy/SkyeWebCreatorMax/builder.html";
const free99HubPath = "/Free99/index.html";
const free99ProofPath = "/proof/free99-platform-intake-receipt.html";
const changelogPath = "/changelog/index.html";
const deploymentVersion = process.env.PROOF_DEPLOYMENT_VERSION || "24217541-2cea-484a-a6e6-230be4104f90";
const adminCode = firstEnv([
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
]);
const adminEmail = process.env.PROOF_OWNER_EMAIL || "owner-proof@metraiyux.local";
const sourceImage = path.join(repoRoot, "metraiyux_0s_site", "assets", "metraiyux-0s-emblem-transparent.png");

function firstEnv(keys) {
  for (const key of keys) {
    const value = String(process.env[key] || "").trim();
    if (value) return value;
  }
  return "";
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

function slug(value) {
  return String(value || "proof")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "proof";
}

function urlFor(route) {
  return `${baseUrl}${route.startsWith("/") ? route : `/${route}`}`;
}

function cleanFailure(error) {
  return String(error?.stack || error?.message || error).split("\n").slice(0, 8).join("\n");
}

async function waitForPath(page, pathname, timeout = 25000) {
  await page.waitForFunction((target) => location.pathname === target || location.pathname === target.replace(/\/index\.html$/, "/"), pathname, { timeout });
}

async function observePage(page, entry) {
  page.on("console", (message) => {
    if (message.type() === "error") entry.consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    entry.failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || "request failed"
    });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      entry.httpErrors.push({
        url: response.url(),
        status,
        method: response.request().method(),
        resourceType: response.request().resourceType()
      });
    }
  });
}

async function loginOwner(page, returnPath, entry) {
  const loginUrl = new URL("/admin/login.html", baseUrl);
  loginUrl.searchParams.set("return", returnPath);
  const response = await page.goto(loginUrl.toString(), { waitUntil: "domcontentloaded", timeout: 45000 });
  entry.actions.push("opened owner admin login");
  entry.statuses.push({ name: "admin_login_status", status: response?.status() || 0, ok: Boolean(response?.ok()) });
  await page.fill('input[name="code"]', adminCode);
  const emailInput = page.locator('input[name="email"]');
  if (await emailInput.count()) await emailInput.fill(adminEmail);
  entry.actions.push((await emailInput.count()) ? "filled owner admin code and email" : "filled owner admin code");
  await page.click('button[type="submit"]');
  entry.actions.push("submitted owner admin login");
  await waitForPath(page, returnPath);
  entry.actions.push(`gate redirected to ${returnPath}`);
}

async function canvasProof(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById("stageCanvas");
    if (!canvas) return { present: false, paintedPixels: 0, width: 0, height: 0 };
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { present: true, paintedPixels: 0, width: canvas.width, height: canvas.height };
    const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let paintedPixels = 0;
    for (let index = 0; index < sample.length; index += 4 * 47) {
      if (sample[index + 3] > 0 && (sample[index] + sample[index + 1] + sample[index + 2] > 4)) paintedPixels += 1;
    }
    return { present: true, paintedPixels, width: canvas.width, height: canvas.height };
  });
}

async function exerciseStill2Vid(page, entry, artifactDir, label) {
  await page.waitForSelector("#imageInput", { state: "attached", timeout: 20000 });
  await page.selectOption("#identityMode", "operator-upload");
  await page.fill("#identitySourceUrl", "/assets/metraiyux-0s-emblem-transparent.png");
  await page.fill("#identityReceipt", "Live proof uses the real MetrAIyux 0S emblem asset from the deployed 0S assets folder.");
  await page.setInputFiles("#imageInput", sourceImage);
  entry.actions.push("loaded real MetrAIyux emblem image into Still2Vid");
  await page.waitForFunction(() => document.querySelector("#sourceHint")?.textContent?.includes("Loaded"), null, { timeout: 20000 });
  await page.click("#fitBtn").catch(() => {});
  entry.actions.push("fit the image cleanly on the canvas");
  const firstPreset = page.locator(".preset").first();
  if (await firstPreset.isVisible().catch(() => false)) {
    await firstPreset.click();
    entry.actions.push("selected a motion preset");
  }
  await page.click("#playBtn");
  entry.actions.push("played the animation timeline");
  await page.waitForTimeout(1100);
  const canvas = await canvasProof(page);
  entry.statuses.push({ name: "canvas_painted", ok: canvas.present && canvas.paintedPixels > 0, canvas });
  const downloadPromise = page.waitForEvent("download", { timeout: 20000 });
  await page.click("#posterBtn");
  const download = await downloadPromise;
  const downloadPath = path.join(artifactDir, `${label}-still2vid-poster.png`);
  await download.saveAs(downloadPath);
  entry.actions.push("exported a PNG poster from the live canvas");
  entry.downloads.push(downloadPath);
  const screenshot = path.join(artifactDir, `${label}-still2vid-after-upload.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  entry.screenshots.push(screenshot);
  const state = await page.evaluate(() => ({
    gateReady: Boolean(window.Free99PlatformGate?.requireSession?.()?.token),
    platformId: window.Free99PlatformGate?.platformId || "",
    billingMode: window.Free99PlatformGate?.billingMode || "",
    authOwner: window.Free99PlatformGate?.authOwner || "",
    clientGateOverlay: Boolean(document.querySelector("#free99PlatformGate")),
    fallbackInput: Boolean(document.querySelector("#free99PlatformGateToken")),
    localProofButton: Boolean(document.querySelector("#free99PlatformLocalProof")),
    lockedClass: document.documentElement.classList.contains("free99-platform-gate-locked"),
    appSpecificKeys: Object.keys(sessionStorage).filter((key) => /^FREE99_PLATFORM_GATE_SESSION_/.test(key)),
    policyStatus: document.querySelector("#policyStatus")?.textContent || "",
    sourceHint: document.querySelector("#sourceHint")?.textContent || "",
    statusText: document.querySelector("#statusText")?.textContent || "",
    currentPath: location.pathname
  }));
  entry.statuses.push({
    name: "still2vid_worker_owned_gate_and_policy",
    ok: state.gateReady
      && state.platformId === "still2vid-forge"
      && state.authOwner === "main-worker-enforceZeroOsGate"
      && !state.clientGateOverlay
      && !state.fallbackInput
      && !state.localProofButton
      && !state.lockedClass
      && state.appSpecificKeys.length === 0
      && /Ready:/i.test(state.policyStatus),
    state
  });
}

async function exerciseFactoryAndWebCreator(page, entry, artifactDir) {
  let response = await page.goto(urlFor(factoryMediaPath), { waitUntil: "networkidle", timeout: 45000 });
  entry.statuses.push({ name: "factory_media_status", status: response?.status() || 0, ok: Boolean(response?.ok()) });
  await page.getByText("Still2Vid handoff", { exact: false }).waitFor({ state: "visible", timeout: 20000 });
  entry.actions.push("opened Client App Factory media lane");
  await page.getByRole("button", { name: /Open Still2Vid/i }).click();
  entry.actions.push("clicked Client App Factory Still2Vid handoff");
  await waitForPath(page, still2vidPath);
  await page.waitForSelector("#imageInput", { state: "attached", timeout: 20000 });
  entry.actions.push("Factory handoff landed back in Still2Vid");
  let screenshot = path.join(artifactDir, "desktop-factory-handoff-still2vid.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  entry.screenshots.push(screenshot);

  response = await page.goto(urlFor(webCreatorPath), { waitUntil: "networkidle", timeout: 45000 });
  entry.statuses.push({ name: "webcreator_status", status: response?.status() || 0, ok: Boolean(response?.ok()) });
  await page.getByRole("button", { name: /Media Forge/i }).click();
  entry.actions.push("clicked SkyeWebCreatorMax Media Forge handoff");
  await waitForPath(page, still2vidPath);
  await page.waitForSelector("#imageInput", { state: "attached", timeout: 20000 });
  entry.actions.push("WebCreator handoff landed back in Still2Vid");
  screenshot = path.join(artifactDir, "desktop-webcreator-handoff-still2vid.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  entry.screenshots.push(screenshot);
}

async function exerciseSkyeOpsGate(page, entry, artifactDir, label) {
  const response = await page.goto(urlFor(skyeOpsPath), { waitUntil: "networkidle", timeout: 45000 });
  entry.statuses.push({ name: "skyeops_status", status: response?.status() || 0, ok: Boolean(response?.ok()) });
  await page.getByText("SkyeOps Offline Console", { exact: false }).waitFor({ state: "visible", timeout: 20000 });
  entry.actions.push("opened SkyeOpsConsole inside the shared 0S gate");
  const state = await page.evaluate(() => ({
    path: location.pathname,
    localLockOverlay: Boolean(document.querySelector("#lockOverlay") || document.querySelector(".lockOverlay")),
    localUnlockInput: Boolean(document.querySelector("#unlockPin")),
    localLockAction: Boolean(document.querySelector('[data-action="lockNow"]')),
    localUnlockAction: Boolean(document.querySelector('[data-action="unlock"]')),
    localPinSetting: document.body.innerText.includes("App lock PIN"),
    gateOwnedBadge: document.body.innerText.includes("0S gate-owned"),
    stalePinHash: Boolean(JSON.parse(localStorage.getItem("skyeops_offline_singlefile_v2") || "{}")?.settings?.pin_hash)
  }));
  entry.statuses.push({
    name: "skyeops_worker_owned_gate_no_local_pin",
    ok: !state.localLockOverlay
      && !state.localUnlockInput
      && !state.localLockAction
      && !state.localUnlockAction
      && !state.localPinSetting
      && state.gateOwnedBadge
      && !state.stalePinHash,
    state
  });
  const screenshot = path.join(artifactDir, `${label}-skyeops-worker-gate.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  entry.screenshots.push(screenshot);
}

async function exercisePublicCopy(page, entry, artifactDir, label) {
  const checks = [
    {
      name: "free99_hub_copy",
      route: free99HubPath,
      text: "SkyeOpsConsole, Still2Vid Forge, MyDrive, SkyePics, and BrandForge core are no-charge lanes"
    },
    {
      name: "free99_proof_receipt_copy",
      route: free99ProofPath,
      text: "Still2Vid Forge v4"
    },
    {
      name: "changelog_free99_copy",
      route: changelogPath,
      text: "SkyeOpsConsole + Still2Vid Free99"
    }
  ];
  for (const check of checks) {
    const response = await page.goto(urlFor(check.route), { waitUntil: "domcontentloaded", timeout: 45000 });
    entry.statuses.push({ name: `${check.name}_status`, status: response?.status() || 0, ok: Boolean(response?.ok()) });
    const locator = page.getByText(check.text, { exact: false }).first();
    await locator.waitFor({ state: "visible", timeout: 20000 });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    entry.actions.push(`verified ${check.name}`);
    const screenshot = path.join(artifactDir, `${label}-${slug(check.name)}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    entry.screenshots.push(screenshot);
  }
}

async function runViewport(browser, viewport, artifactDir, withHandoffs = false) {
  const label = `${viewport.width}x${viewport.height}`;
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: viewport.width < 700,
    ignoreHTTPSErrors: true,
    acceptDownloads: true
  });
  const page = await context.newPage();
  const entry = {
    label,
    viewport,
    actions: [],
    statuses: [],
    screenshots: [],
    downloads: [],
    consoleErrors: [],
    httpErrors: [],
    failedRequests: []
  };
  await observePage(page, entry);
  await loginOwner(page, still2vidPath, entry);
  await exerciseStill2Vid(page, entry, artifactDir, label);
  await exerciseSkyeOpsGate(page, entry, artifactDir, label);
  if (withHandoffs) await exerciseFactoryAndWebCreator(page, entry, artifactDir);
  await exercisePublicCopy(page, entry, artifactDir, label);
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth).catch(() => 0);
  entry.statuses.push({ name: "horizontal_overflow", ok: overflow <= 2, value: overflow });
  await context.close();
  entry.ok = entry.consoleErrors.length === 0
    && entry.failedRequests.length === 0
    && entry.httpErrors.length === 0
    && entry.statuses.every((item) => item.ok !== false)
    && entry.actions.length >= (withHandoffs ? 10 : 6);
  return entry;
}

async function checkUnauthGate() {
  const response = await fetch(urlFor(still2vidPath), {
    method: "GET",
    redirect: "manual",
    headers: { accept: "text/html" }
  });
  return {
    status: response.status,
    location: response.headers.get("location") || "",
    gateHeader: response.headers.get("x-0s-gate") || "",
    ok: response.status === 302 && /\/admin\/login\.html/.test(response.headers.get("location") || "")
  };
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  if (!adminCode) throw new Error("Missing owner admin code env var for live gate proof.");
  if (!fs.existsSync(sourceImage)) throw new Error(`Missing proof image: ${sourceImage}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactDir = path.join(repoRoot, "test-artifacts", "live-browser-verifier", `${stamp}-still2vid-free99-production`);
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    mode: "headed-live-browser",
    headless: false,
    baseUrl,
    deploymentVersion,
    routes: {
      still2vid: urlFor(still2vidPath),
      skyeOps: urlFor(skyeOpsPath),
      factoryMedia: urlFor(factoryMediaPath),
      webCreator: urlFor(webCreatorPath),
      free99Hub: urlFor(free99HubPath),
      free99Proof: urlFor(free99ProofPath),
      changelog: urlFor(changelogPath),
      adminLogin: urlFor("/admin/login.html")
    },
    artifactDir,
    unauthGate: await checkUnauthGate(),
    checks: [],
    failures: []
  };

  let browser;
  try {
    browser = await chromium.launch({ headless: false, slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 90) });
    report.checks.push(await runViewport(browser, { width: 1440, height: 980 }, artifactDir, true));
    report.checks.push(await runViewport(browser, { width: 390, height: 844 }, artifactDir, false));
  } catch (error) {
    report.failures.push(cleanFailure(error));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  if (!report.unauthGate.ok) report.failures.push(`Unauthenticated gate check failed: ${JSON.stringify(report.unauthGate)}`);
  for (const check of report.checks) {
    if (!check.ok) {
      report.failures.push(`${check.label} failed: ${JSON.stringify({
        consoleErrors: check.consoleErrors,
        failedRequests: check.failedRequests,
        httpErrors: check.httpErrors,
        failedStatuses: check.statuses.filter((item) => item.ok === false),
        actions: check.actions
      })}`);
    }
  }
  report.ok = report.failures.length === 0;
  const reportPath = path.join(artifactDir, "live-browser-verification-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, report: reportPath, checks: report.checks.length, artifactDir }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(cleanFailure(error));
  process.exit(1);
});
