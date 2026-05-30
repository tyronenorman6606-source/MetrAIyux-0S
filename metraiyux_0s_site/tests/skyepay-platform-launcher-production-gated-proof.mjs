import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const envPath = path.join(repoRoot, "env.txt");
const baseUrl = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const targetPath = "/saas/skyepay.html#platform-launcher";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(repoRoot, "test-artifacts", "skyepay-platform-launcher-production-gated", stamp);

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

function loadEnvValues() {
  const out = {};
  if (!existsSync(envPath)) return out;
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = raw.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    out[match[1]] = unquote(match[2]);
  }
  return out;
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

async function findWorkingCredential() {
  const env = loadEnvValues();
  const candidates = credentialKeys
    .map((key) => ({ key, value: resolveAlias(env[key], env) }))
    .filter((item, index, list) => item.value && list.findIndex((other) => other.value === item.value) === index);

  const failures = [];
  for (const candidate of candidates) {
    const response = await fetch(`${baseUrl}/api/owner/admin-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: candidate.value })
    }).catch((error) => ({ ok: false, status: 0, error }));
    if (response.ok) return { ...candidate, hash: sha12(candidate.value) };
    failures.push({ key: candidate.key, hash: sha12(candidate.value), status: response.status || 0 });
  }
  throw new Error(`No 0S owner-admin credential from env.txt unlocked production. Tried: ${JSON.stringify(failures)}`);
}

async function visibleText(page, selector) {
  return page.locator(selector).first().innerText({ timeout: 15000 }).then((text) => text.replace(/\s+/g, " ").trim());
}

async function viewportInspection(page) {
  return page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    let visibleTextChars = 0;
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = String(walker.currentNode.nodeValue || "").replace(/\s+/g, " ").trim();
      const parent = walker.currentNode.parentElement;
      if (!text || !parent) continue;
      const rect = parent.getBoundingClientRect();
      const style = getComputedStyle(parent);
      if (rect.width > 2 && rect.height > 2 && rect.bottom >= 0 && rect.top <= viewport.height && style.visibility !== "hidden" && style.display !== "none") {
        visibleTextChars += text.length;
      }
    }
    const visibleMedia = Array.from(document.querySelectorAll("img,video,canvas,svg,iframe")).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 8 && rect.height > 8 && rect.bottom >= 0 && rect.top <= viewport.height && style.visibility !== "hidden" && style.display !== "none";
    }).length;
    return {
      url: location.href,
      title: document.title,
      scrollY: Math.round(window.scrollY || 0),
      viewport,
      visibleTextChars,
      visibleMedia,
      blankish: visibleTextChars < 30 && visibleMedia < 1
    };
  });
}

async function scrollProof(page, label) {
  const plan = await page.evaluate(() => {
    const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const viewportHeight = window.innerHeight || 800;
    const maxY = Math.max(0, height - viewportHeight);
    const stops = new Set([0, maxY]);
    const step = Math.max(320, Math.floor(viewportHeight * 0.72));
    for (let y = 0; y <= maxY; y += step) stops.add(Math.round(y));
    Array.from(document.querySelectorAll("section, article, [id]")).forEach((element) => {
      const rect = element.getBoundingClientRect();
      const y = Math.max(0, Math.min(maxY, Math.round(rect.top + window.scrollY)));
      stops.add(y);
    });
    return { height, viewportHeight, maxY, stops: Array.from(stops).sort((a, b) => a - b).slice(0, 18) };
  });

  const results = [];
  for (let index = 0; index < plan.stops.length; index += 1) {
    const y = plan.stops[index];
    await page.evaluate((nextY) => window.scrollTo({ top: nextY, behavior: "instant" }), y);
    await page.waitForTimeout(180);
    const metrics = await viewportInspection(page);
    const screenshot = path.join(artifactDir, `${label}-scroll-${String(index + 1).padStart(2, "0")}-y${metrics.scrollY}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    assert.equal(metrics.blankish, false, `${label} blankish viewport at scroll ${index + 1}`);
    results.push({ ...metrics, screenshot });
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  return { ...plan, results };
}

async function loginAndVerify(browser, credential, item) {
  const context = await browser.newContext({ viewport: item.viewport });
  const page = await context.newPage();
  const consoleMessages = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() });
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || "request failed" });
  });

  const actions = [];
  const loginUrl = `${baseUrl}/admin/login.html?return=${encodeURIComponent(targetPath)}`;
  await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(async () => {
    await page.goto(loginUrl, { waitUntil: "commit", timeout: 90000 });
  });
  const codeInput = page.locator('input[name="code"], input[type="password"]').first();
  await codeInput.waitFor({ state: "visible", timeout: 60000 });
  await codeInput.fill(credential.value, { timeout: 60000 });
  actions.push("filled owner admin code into shared 0S gate");
  const loginResponse = page.waitForResponse((response) => response.url().includes("/api/owner/admin-login") && response.request().method() === "POST", { timeout: 60000 }).catch(() => null);
  await page.locator('#unlock-button, button[type="submit"]').first().click({ timeout: 15000, force: true }).catch(async () => {
    await codeInput.press("Enter", { timeout: 15000 });
  });
  await loginResponse;
  actions.push("submitted shared owner admin login");
  await page.waitForURL((url) => url.pathname === "/saas/skyepay.html", { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector("[data-platform-launcher]") && window.MetrAIyuxPlatformLauncher, null, { timeout: 30000 });
  actions.push("opened gated SkyePay platform launcher");

  await page.locator('[data-platform-id="free99"]').click();
  actions.push("clicked Free99 platform");
  assert.match(await visibleText(page, "[data-platform-detail]"), /Free99 App Stack/);
  await page.locator("#launcher-search").fill("Relay13");
  actions.push("searched Relay13");
  assert.match(await visibleText(page, "[data-platform-detail]"), /Relay13 \+ ConnectLog/);
  await page.locator('[data-launcher-demo="marketing-media"]').click();
  actions.push("clicked Marketing shortcut");
  assert.match(await visibleText(page, "[data-platform-detail]"), /Marketing \+ Media Over London/);
  await page.locator('[data-launcher-demo="skyemusicnexus"]').click();
  actions.push("clicked Music shortcut");
  assert.ok(await page.locator(".skyemerit-deal-banner", { hasText: "-$2,000" }).count() >= 4, "production sale banners visible");
  actions.push("confirmed visible -$2,000 SkyeMerit banners");
  await page.locator("#brainQuestion").fill("Which platform handles artist landing pages with SkyeMerit?");
  await page.locator("#askBrain").click();
  actions.push("asked local brain from production launcher");
  await page.waitForSelector(".brain-answer .route-pill", { timeout: 15000 });
  assert.match(await visibleText(page, ".brain-answer"), /SkyeMusicNexus|SkyeMerit|platform launcher/i);

  const primaryShot = path.join(artifactDir, `${item.label}-post-login-launcher.png`);
  await page.screenshot({ path: primaryShot, fullPage: false });
  const scroll = await scrollProof(page, item.label);
  const final = await viewportInspection(page);
  await context.close();
  return { label: item.label, viewport: item.viewport, loginUrl, finalUrl: final.url, title: final.title, actions, primaryShot, scroll, consoleMessages, failedRequests };
}

await fs.mkdir(artifactDir, { recursive: true });
const credential = await findWorkingCredential();
const browser = await chromium.launch({ headless: false });
try {
  const viewportResults = [];
  for (const item of [
    { label: "desktop", viewport: { width: 1440, height: 980 } },
    { label: "mobile", viewport: { width: 390, height: 844 } }
  ]) {
    viewportResults.push(await loginAndVerify(browser, credential, item));
  }

  const receipt = {
    ok: true,
    generated_at: new Date().toISOString(),
    proof_type: "headed-production-gated-browser-proof",
    target: `${baseUrl}${targetPath}`,
    credential: { key: credential.key, hash: credential.hash },
    viewports: viewportResults,
    artifact_dir: artifactDir,
    deployed_worker_version_seen_before_proof: "ff6aaf1b-d9fc-458a-a36a-5f3c017717e8"
  };
  const receiptPath = path.join(artifactDir, "receipt.json");
  await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
  await fs.writeFile(path.join(repoRoot, "test-artifacts", "skyepay-platform-launcher-production-gated-latest.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: true,
    target: receipt.target,
    receipt: path.relative(repoRoot, receiptPath),
    latest: "test-artifacts/skyepay-platform-launcher-production-gated-latest.json",
    credential_key: credential.key,
    credential_hash: credential.hash
  }, null, 2));
} finally {
  await browser.close().catch(() => {});
}
