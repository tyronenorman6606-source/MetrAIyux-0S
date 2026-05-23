#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const repoRoot = "/workspaces/MetrAIyux-0S";
const origin = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const deployTag = process.env.DENTAL_SWEEP_TAG || Date.now().toString(36);

const clients = [
  {
    name: "Arizona Biltmore Dentistry",
    appSlug: "arizona-biltmore-dentistry",
    valleySlug: "arizona-biltmore-dentistry-phoenix-85016-d406e26"
  },
  {
    name: "Dental Depot Orthodontics",
    appSlug: "dental-depot-orthodontics-phoenix",
    valleySlug: "dental-depot-orthodontics-phoenix-85053-c0fa26f"
  },
  {
    name: "General Dentistry 4 Kids",
    appSlug: "general-dentistry-4-kids-phoenix",
    valleySlug: "general-dentistry-4-kids-phoenix-85032-237e895"
  }
];

const appRoutes = [
  "",
  "services.html",
  "appointments.html",
  "intake.html",
  "new-patients.html",
  "patient-center.html",
  "insurance.html",
  "financial.html",
  "team.html",
  "office.html",
  "workspace.html",
  "proof.html",
  "faq.html",
  "scan.html",
  "flyer.html",
  "preview.html",
  "workspace-preview.html",
  "workspace-preview/"
];

const viewports = [
  { label: "desktop", width: 1440, height: 1000 },
  { label: "mobile", width: 390, height: 844 }
];

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

function routeUrl(client, route) {
  const base = `${origin}/client-app-factory/client-apps/${client.appSlug}/`;
  return `${base}${route}?deploy=${encodeURIComponent(deployTag)}`;
}

function valleyUrl(client) {
  return `${origin}/valley-verified/business/${client.valleySlug}/?deploy=${encodeURIComponent(deployTag)}`;
}

async function visible(page, selector) {
  const locators = page.locator(selector);
  const count = await locators.count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    const locator = locators.nth(index);
    if (await locator.isVisible().catch(() => false)) return locator;
  }
  return null;
}

async function humanClick(page, selector, actions, label, options = {}) {
  const locator = await visible(page, selector);
  if (!locator) return false;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox().catch(() => null);
  if (box) {
    await page.mouse.move(box.x + Math.max(4, box.width * 0.35), box.y + Math.max(4, box.height * 0.5), { steps: 14 });
  }
  await locator.click({ timeout: 5000, ...options });
  actions.push(label);
  await page.waitForLoadState("networkidle", { timeout: 9000 }).catch(() => {});
  await page.waitForTimeout(350);
  return true;
}

async function fillIfPresent(page, selector, value, actions, label) {
  const locator = await visible(page, selector);
  if (!locator) return false;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.fill(value, { timeout: 4000 });
  actions.push(label);
  await page.waitForTimeout(180);
  return true;
}

async function closeMobileMenuIfOpen(page, actions) {
  const menu = await visible(page, "[data-menu-toggle]");
  if (!menu) return;
  const expanded = await menu.getAttribute("aria-expanded").catch(() => "false");
  if (expanded === "true") {
    await humanClick(page, "[data-menu-toggle]", actions, "closed mobile menu before primary CTA");
  }
}

async function exerciseAppRoute(page, route, actions) {
  await page.mouse.move(120, 160, { steps: 16 });
  actions.push("moved mouse into live page");

  const menu = await visible(page, "[data-menu-toggle]");
  if (menu) {
    await humanClick(page, "[data-menu-toggle]", actions, "opened mobile menu");
    await humanClick(page, "[data-menu-toggle]", actions, "closed mobile menu");
  }

  if (route === "appointments.html" || route === "intake.html") {
    await fillIfPresent(page, 'input[name="name"]', "Live Browser Proof", actions, "typed patient routing name");
    await fillIfPresent(page, 'input[name="contact"]', "proof@example.com", actions, "typed patient routing contact");
    await fillIfPresent(page, "textarea", "Headed production browser proof note.", actions, "typed routing note");
    await humanClick(page, 'button:has-text("Save"), button:has-text("Request"), button:has-text("Submit"), .btn.primary', actions, "clicked form action").catch(() => {});
  }

  if (route === "proof.html") {
    await fillIfPresent(page, 'input[name="subject"]', "Live production proof", actions, "typed owner proof subject");
    await fillIfPresent(page, "textarea", "Headed browser proof note.", actions, "typed owner proof note");
    await humanClick(page, 'button:has-text("Save proof note")', actions, "saved proof note").catch(() => {});
  }

  if (route === "scan.html") {
    await humanClick(page, "[data-copy-link]", actions, "clicked copy app link").catch(() => {});
  }

  if (route === "preview.html" || route === "workspace-preview.html" || route === "workspace-preview/") {
    const linkCount = await page.locator('a:has-text("Open SignInPro workspace")').count().catch(() => 0);
    if (linkCount > 0) actions.push("confirmed SignInPro workspace CTA");
  }
}

async function exerciseValleyPost(page, client, actions) {
  await page.mouse.move(110, 150, { steps: 16 });
  actions.push("moved mouse into Valley post");
  const menu = await visible(page, "[data-menu-toggle]");
  if (menu) {
    await humanClick(page, "[data-menu-toggle]", actions, "opened mobile menu");
    await closeMobileMenuIfOpen(page, actions);
  }
  await humanClick(page, 'a:has-text("Open full app")', actions, "clicked Open full app");
  const finalUrl = page.url();
  if (!finalUrl.includes(`/client-app-factory/client-apps/${client.appSlug}/`)) {
    throw new Error(`Open full app landed on ${finalUrl}`);
  }
  actions.push("Open full app landed on client app");
}

async function inspectPage(page, client, target) {
  const bodyText = await page.locator("body").innerText({ timeout: 7000 }).catch(() => "");
  const title = await page.title().catch(() => "");
  const imageCount = await page.locator("img").count().catch(() => 0);
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
  const failures = [];

  if (!bodyText.includes(client.name)) failures.push("missing client name");
  if (imageCount !== 0) failures.push(`unexpected img elements: ${imageCount}`);
  if (overflow > 1) failures.push(`horizontal overflow ${overflow}`);

  if (target.kind === "app") {
    if (!bodyText.includes("No generated logos/photos")) failures.push("missing no-generated-media policy");
    if (!title.includes(client.name)) failures.push("title missing client name");
  } else {
    if (!bodyText.includes("Full app built first")) failures.push("missing Valley app-backed headline");
    if (!bodyText.includes("Open full app")) failures.push("missing Open full app CTA");
  }

  return { bodyTextSample: bodyText.slice(0, 500), title, imageCount, horizontalOverflowPx: overflow, failures };
}

async function checkTarget(browser, client, target, viewport, artifactDir) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.label === "mobile",
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.startsWith("data:") || url.includes("favicon")) return;
    failedRequests.push({
      url,
      method: request.method(),
      failure: request.failure()?.errorText || "request failed"
    });
  });

  const actions = [];
  let response;
  let error = "";
  let inspection = {};
  try {
    response = await page.goto(target.url, { waitUntil: "networkidle", timeout: 45000 });
    if (target.kind === "app") {
      await exerciseAppRoute(page, target.route, actions);
      inspection = await inspectPage(page, client, target);
    } else {
      inspection = await inspectPage(page, client, target);
      await exerciseValleyPost(page, client, actions);
    }
  } catch (caught) {
    error = caught?.message || String(caught);
  }

  const screenshot = path.join(artifactDir, `${viewport.label}-${slug(target.id)}.png`);
  await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});
  const status = response?.status() || 0;
  const failures = [
    ...(status >= 200 && status < 400 ? [] : [`HTTP ${status}`]),
    ...(error ? [error] : []),
    ...(inspection.failures || []),
    ...consoleErrors.map((item) => `console error: ${item}`),
    ...failedRequests.map((item) => `request failed: ${item.method} ${item.url} ${item.failure}`)
  ];
  await context.close();
  return {
    id: target.id,
    kind: target.kind,
    route: target.route || "",
    url: target.url,
    viewport: viewport.label,
    status,
    actions,
    consoleErrors,
    failedRequests,
    screenshot,
    ...inspection,
    ok: failures.length === 0,
    failures
  };
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const artifactDir = path.join(repoRoot, "test-artifacts/dental-client-apps-live-headed-route-sweep", stamp);
  fs.mkdirSync(artifactDir, { recursive: true });

  const targets = clients.flatMap((client) => [
    ...appRoutes.map((route) => ({
      kind: "app",
      id: `${client.appSlug}-${route || "index"}`,
      route,
      url: routeUrl(client, route)
    })),
    {
      kind: "valley",
      id: `${client.valleySlug}-valley`,
      url: valleyUrl(client)
    }
  ]);

  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    mode: "headed-live-browser",
    headless: false,
    deployTag,
    origin,
    artifactDir,
    targetCount: targets.length,
    viewportCount: viewports.length,
    checks: [],
    failures: []
  };

  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-dev-shm-usage"]
    });
    for (const viewport of viewports) {
      for (const client of clients) {
        for (const target of targets.filter((item) => item.id.startsWith(client.appSlug) || item.id.startsWith(client.valleySlug))) {
          const check = await checkTarget(browser, client, target, viewport, artifactDir);
          report.checks.push(check);
          if (!check.ok) report.failures.push({
            id: check.id,
            viewport: check.viewport,
            url: check.url,
            failures: check.failures
          });
          console.log(`${check.ok ? "OK" : "FAIL"} ${check.viewport} ${check.id}`);
        }
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  report.ok = report.failures.length === 0;
  const reportPath = path.join(repoRoot, "test-artifacts/dental-client-apps-live-headed-route-sweep.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(artifactDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, checks: report.checks.length, failures: report.failures, reportPath, artifactDir }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
