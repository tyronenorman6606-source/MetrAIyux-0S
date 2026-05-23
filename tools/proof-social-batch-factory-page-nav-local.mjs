#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const repoRoot = "/workspaces/MetrAIyux-0S";
const targetUrl = process.env.PROOF_URL || process.argv[2] || "http://127.0.0.1:4179/social-batch-factory/";

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

function clean(value) {
  return String(value || "").replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, "$1[redacted]");
}

function status(entry, name, ok, detail = {}) {
  entry.statuses.push({ name, ok: Boolean(ok), detail });
}

function attachWatchers(page, entry) {
  page.on("console", (message) => {
    if (message.type() === "error") entry.consoleErrors.push(clean(message.text()));
  });
  page.on("pageerror", (error) => entry.consoleErrors.push(clean(error.stack || error.message)));
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!url.startsWith("data:") && !url.startsWith("blob:")) entry.failedRequests.push({ url, failure: clean(request.failure()?.errorText || "") });
  });
  page.on("response", (response) => {
    const url = response.url();
    if (response.status() >= 400 && !url.startsWith("data:") && !url.startsWith("blob:")) entry.httpErrors.push({ url, status: response.status() });
  });
}

async function screenshot(page, entry, artifactDir, name) {
  const file = path.join(artifactDir, `${entry.label}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  entry.screenshots.push(file);
  return file;
}

async function visualMetrics(page) {
  return page.evaluate(() => {
    const active = document.querySelector(".appPage.active");
    const rect = active?.getBoundingClientRect();
    const visibleText = (active?.innerText || document.body.innerText || "").trim();
    const visibleElements = [...document.querySelectorAll("body *")].filter((el) => {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return box.width > 1 && box.height > 1 && box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth && style.visibility !== "hidden" && style.display !== "none";
    }).length;
    return {
      activePage: active?.dataset.page || "",
      activeWidth: Math.round(rect?.width || 0),
      activeHeight: Math.round(rect?.height || 0),
      textLength: visibleText.length,
      visibleElements,
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      brokenImages: [...document.images].filter((img) => img.complete && img.naturalWidth === 0).length
    };
  });
}

async function canvasProof(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("#mainCanvas");
    if (!canvas) return { present: false, width: 0, height: 0, paintedPixels: 0 };
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { present: true, width: canvas.width, height: canvas.height, paintedPixels: 0 };
    const width = Math.max(1, Math.min(canvas.width, 360));
    const height = Math.max(1, Math.min(canvas.height, 360));
    const data = ctx.getImageData(0, 0, width, height).data;
    let paintedPixels = 0;
    for (let index = 0; index < data.length; index += 4 * 29) {
      if (data[index + 3] > 0 && data[index] + data[index + 1] + data[index + 2] > 12) paintedPixels += 1;
    }
    return { present: true, width: canvas.width, height: canvas.height, paintedPixels };
  });
}

async function openLane(page, entry, lane) {
  await page.locator(`.pageBtn[data-page="${lane}"]`).click();
  entry.actions.push(`opened ${lane} page`);
  await page.waitForFunction((target) => document.querySelector(".appPage.active")?.dataset.page === target, lane, { timeout: 10000 });
  const metrics = await visualMetrics(page);
  status(entry, `lane_${lane}_visible`, metrics.activePage === lane && metrics.textLength > 20 && metrics.visibleElements > 8, metrics);
}

async function fill(page, entry, selector, value) {
  await page.locator(selector).fill(String(value));
  entry.actions.push(`filled ${selector}`);
}

async function setRange(page, entry, selector, value) {
  await page.locator(selector).fill(String(value));
  await page.locator(selector).dispatchEvent("input");
  await page.locator(selector).dispatchEvent("change");
  entry.actions.push(`set ${selector} to ${value}`);
}

async function runViewport(browser, artifactDir, viewport, label) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  const entry = { label, viewport, ok: false, actions: [], statuses: [], screenshots: [], consoleErrors: [], failedRequests: [], httpErrors: [], failures: [] };
  attachWatchers(page, entry);
  try {
    const planCatalog = {
      "free99-core": { id: "free99-core", name: "Free99 Core", ai_enabled: false, included_generations: 0, price_label: "Free", label: "all local tools, no AI" },
      "social-batch-ai-burst": { id: "social-batch-ai-burst", name: "AI Burst", ai_enabled: true, included_generations: 75, price_label: "SkyPay", label: "75 gated generations/month" },
      "social-batch-ai-studio": { id: "social-batch-ai-studio", name: "AI Studio", ai_enabled: true, included_generations: 350, price_label: "SkyPay", label: "350 gated generations/month" },
      "social-batch-ai-unlimited": { id: "social-batch-ai-unlimited", name: "AI Unlimited", ai_enabled: true, included_generations: null, unlimited: true, price_label: "SkyPay", label: "unlimited gated generations" }
    };
    await page.route("**/favicon.ico", (route) => route.fulfill({ status: 204, body: "" }));
    await page.route("**/api/social-batch-factory/plans**", (route) => {
      const url = new URL(route.request().url());
      const planId = url.searchParams.get("plan_id") || "free99-core";
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, plans: Object.values(planCatalog), plan: planCatalog[planId] || planCatalog["free99-core"] }) });
    });
    await page.route("**/api/social-batch-factory/entitlement**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, entitlement: { active: false }, usage: { monthly_count: 0, remaining: 75, unlimited: false } }) }));
    const url = new URL(targetUrl);
    url.searchParams.set("skipIntro", "1");
    url.searchParams.set("page", "setup");
    await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 45000 });
    entry.actions.push("opened local app with intro bypass");
    await page.waitForTimeout(450);
    const introVisible = await page.locator("#introGate").evaluate((el) => !el.classList.contains("hidden") && getComputedStyle(el).visibility !== "hidden").catch(() => false);
    if (introVisible) {
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.querySelector("#introGate")?.classList.contains("hidden"), null, { timeout: 3000 }).catch(async () => {
        await page.evaluate(() => {
          const gate = document.querySelector("#introGate");
          if (gate) {
            gate.classList.add("hidden");
            gate.setAttribute("aria-hidden", "true");
          }
        });
      });
      entry.actions.push("dismissed intro for page-nav proof");
    }
    await page.waitForSelector(".pageBtn[data-page='setup']", { timeout: 30000 });
    await page.waitForFunction(() => document.querySelectorAll(".pageBtn").length >= 6 && document.querySelectorAll(".aiPlanCard").length >= 4, null, { timeout: 30000 });
    await page.waitForFunction(() => document.querySelector("#mainCanvas")?.width > 100, null, { timeout: 30000 });
    status(entry, "app_shell_ready", true, await visualMetrics(page));

    for (const lane of ["setup", "ai", "kits", "batch", "editor", "proof"]) {
      await openLane(page, entry, lane);
      await screenshot(page, entry, artifactDir, `${lane}-initial`);
    }

    await openLane(page, entry, "setup");
    await fill(page, entry, "#brandName", `Paged Proof ${label}`);
    await fill(page, entry, "#campaignName", `Multi Page Workbench ${label}`);
    await fill(page, entry, "#idea", "A creator can move through setup, AI plan control, brand kits, batch review, creative editing, and proof without one overloaded screen.");
    await fill(page, entry, "#offer", "Turn one campaign into a paged production workflow.");
    await fill(page, entry, "#cta", "Build The Batch");
    await page.locator("#generateBtn").click();
    entry.actions.push("generated batch from setup");
    await page.waitForFunction(() => document.querySelector(".appPage.active")?.dataset.page === "batch" && document.querySelectorAll("#gallery .card").length > 8, null, { timeout: 30000 });
    status(entry, "generate_moves_to_batch", true, await visualMetrics(page));
    await screenshot(page, entry, artifactDir, "batch-after-generate");

    await page.locator("#filters .chip").nth(1).click();
    entry.actions.push("clicked first real batch filter");
    await page.waitForTimeout(250);
    await page.locator("#gallery .card").first().click();
    entry.actions.push("opened first creative from batch");
    await page.waitForFunction(() => document.querySelector(".appPage.active")?.dataset.page === "editor", null, { timeout: 10000 });
    await setRange(page, entry, "#logoScale", "104");
    await setRange(page, entry, "#imageFocus", "62");
    await page.locator("#safeBtn").click();
    entry.actions.push("toggled safe zone");
    await page.locator("#shuffleBtn").click();
    entry.actions.push("remixed selected creative");
    const canvas = await canvasProof(page);
    status(entry, "editor_canvas_painted", canvas.present && canvas.paintedPixels > 10, canvas);
    await screenshot(page, entry, artifactDir, "editor-after-human-actions");

    await openLane(page, entry, "kits");
    await setRange(page, entry, "#brightness", "116");
    await setRange(page, entry, "#contrast", "123");
    await setRange(page, entry, "#saturation", "132");
    await page.locator("#themeSwatches .swatch").nth(2).click();
    entry.actions.push("selected a theme swatch");
    await screenshot(page, entry, artifactDir, "kits-adjusted");

    await openLane(page, entry, "ai");
    await page.locator('.aiPlanCard[data-plan="social-batch-ai-burst"]').click();
    entry.actions.push("selected AI Burst plan");
    const aiState = await page.evaluate(() => ({
      selected: document.querySelector("#aiPlan")?.value || "",
      checkoutDisabled: document.querySelector("#aiCheckoutBtn")?.disabled || false,
      providerKeyInputs: [...document.querySelectorAll("input, textarea")].filter((el) => /provider|api.?key|openai|anthropic/i.test(`${el.id} ${el.name} ${el.placeholder}`)).length
    }));
    status(entry, "ai_paid_plan_controls_without_provider_keys", aiState.selected === "social-batch-ai-burst" && !aiState.checkoutDisabled && aiState.providerKeyInputs === 0, aiState);
    await screenshot(page, entry, artifactDir, "ai-paid-plan");

    await openLane(page, entry, "proof");
    await page.locator("#auditBtn").click();
    entry.actions.push("refreshed audit on proof page");
    await page.waitForFunction(() => (document.querySelector("#auditList")?.textContent || "").trim().length > 40, null, { timeout: 10000 });
    const proofState = await page.evaluate(() => ({
      auditItems: document.querySelectorAll("#auditList .auditItem").length,
      captionLength: (document.querySelector("#captionPreview")?.textContent || "").trim().length,
      copyItems: document.querySelectorAll("#copyDeck .copyItem").length
    }));
    status(entry, "proof_page_populated", proofState.auditItems > 0 && proofState.captionLength > 40 && proofState.copyItems >= 8, proofState);
    await screenshot(page, entry, artifactDir, "proof-populated");

    const finalMetrics = await visualMetrics(page);
    status(entry, "final_visual_nonblank", finalMetrics.textLength > 100 && finalMetrics.visibleElements > 15 && finalMetrics.horizontalOverflowPx < 8 && finalMetrics.brokenImages === 0, finalMetrics);
  } catch (error) {
    entry.failures.push(clean(error.stack || error.message));
  } finally {
    const failedStatuses = entry.statuses.filter((item) => !item.ok);
    if (failedStatuses.length) entry.failures.push(`failed statuses: ${JSON.stringify(failedStatuses)}`);
    if (entry.consoleErrors.length) entry.failures.push(`console errors: ${JSON.stringify(entry.consoleErrors)}`);
    if (entry.failedRequests.length) entry.failures.push(`failed requests: ${JSON.stringify(entry.failedRequests)}`);
    if (entry.httpErrors.length) entry.failures.push(`http errors: ${JSON.stringify(entry.httpErrors)}`);
    if (entry.actions.length < 24) entry.failures.push(`not enough human-style actions: ${entry.actions.length}`);
    entry.ok = entry.failures.length === 0;
    await context.close().catch(() => {});
  }
  return entry;
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactDir = path.join(repoRoot, "test-artifacts", "social-batch-factory-page-nav-local", stamp);
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = { ok: false, checkedAt: new Date().toISOString(), mode: "headed-local-page-nav-proof", headless: false, targetUrl, artifactDir, checks: [], failures: [] };
  let browser;
  try {
    browser = await chromium.launch({ headless: false, slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 50), chromiumSandbox: false, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
    report.checks.push(await runViewport(browser, artifactDir, { width: 1440, height: 980 }, "desktop"));
    report.checks.push(await runViewport(browser, artifactDir, { width: 390, height: 844 }, "mobile"));
  } catch (error) {
    report.failures.push(clean(error.stack || error.message));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  for (const check of report.checks) if (!check.ok) report.failures.push(`${check.label} failed: ${JSON.stringify(check.failures)}`);
  report.ok = report.failures.length === 0;
  const reportPath = path.join(artifactDir, "page-nav-local-proof.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(repoRoot, "test-artifacts", "social-batch-factory-page-nav-local", "latest-page-nav-local-proof.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, report: reportPath, checks: report.checks.map((check) => ({ label: check.label, ok: check.ok, actions: check.actions.length, screenshots: check.screenshots.length, failures: check.failures })) }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(clean(error.stack || error.message));
  process.exit(1);
});
