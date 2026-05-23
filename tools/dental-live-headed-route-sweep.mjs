#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = "/workspaces/MetrAIyux-0S";
const OUT = path.join(ROOT, "test-artifacts", "live-browser-verifier");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(OUT, `${stamp}-dental-live-headed-route-sweep`);
fs.mkdirSync(runDir, { recursive: true });

const siteDataFiles = [
  "Skye-Clients/arizona-biltmore-dentistry-app/site-data.json",
  "Skye-Clients/dental-depot-orthodontics-phoenix-app/site-data.json",
  "Skye-Clients/general-dentistry-4-kids-phoenix-app/site-data.json"
];

const routes = [
  "index.html",
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
  "preview.html"
];

const viewports = [
  { name: "desktop", width: 1440, height: 950 },
  { name: "mobile", width: 390, height: 844 }
];

function readSiteData(file) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
  return {
    name: data.name,
    slug: data.appSlug,
    appUrl: data.appUrl,
    valleyUrl: data.valleyUrl
  };
}

async function clickIfVisible(page, selector, label, actions) {
  const locator = page.locator(selector).first();
  if (!(await locator.count())) return false;
  if (!(await locator.isVisible().catch(() => false))) return false;
  await locator.click({ timeout: 5000 });
  actions.push(label);
  await page.waitForTimeout(250);
  return true;
}

async function typeIfVisible(page, selector, value, label, actions) {
  const locator = page.locator(selector).first();
  if (!(await locator.count())) return false;
  if (!(await locator.isVisible().catch(() => false))) return false;
  await locator.fill(value, { timeout: 5000 });
  actions.push(label);
  return true;
}

async function pageMetrics(page) {
  return await page.evaluate(() => ({
    title: document.title,
    path: location.pathname,
    href: location.href,
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyText: document.body.innerText.slice(0, 260),
    openMenuCount: document.querySelectorAll(".links.open").length
  }));
}

async function verifyTarget(browser, client, target, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const consoleEntries = [];
  const failedRequests = [];
  page.on("console", msg => {
    if (["error", "warning"].includes(msg.type())) {
      consoleEntries.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on("requestfailed", req => {
    failedRequests.push({ url: req.url(), method: req.method(), failure: req.failure()?.errorText || "failed" });
  });

  const actions = [];
  const errors = [];
  let status = 0;
  try {
    const res = await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    status = res?.status() || 0;
    actions.push(`opened ${target.url}`);
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});

    if (viewport.name === "mobile" && target.kind === "app") {
      await clickIfVisible(page, "[data-menu-toggle]", "opened mobile menu", actions);
      await clickIfVisible(page, ".links a:has-text('Services')", "clicked mobile Services nav", actions);
    }

    if (viewport.name === "desktop" && target.kind === "app") {
      await clickIfVisible(page, ".links a:has-text('Services')", "clicked desktop Services nav", actions);
    }

    if (target.route === "intake.html") {
      await typeIfVisible(page, "input[name='name']", "Live Browser Check", "typed intake name", actions);
      await typeIfVisible(page, "input[name='phone']", "555-0100", "typed intake phone", actions);
      await typeIfVisible(page, "textarea[name='note']", "Headed browser proof row", "typed intake note", actions);
      await clickIfVisible(page, "button:has-text('Save intake')", "submitted intake form", actions);
    }

    if (target.route === "proof.html") {
      await typeIfVisible(page, "textarea[name='note']", "Live browser proof checked", "typed proof note", actions);
      await clickIfVisible(page, "button:has-text('Save proof')", "submitted proof form", actions);
    }

    if (target.kind === "valley-post") {
      if (viewport.name === "mobile") {
        const openMenu = await page.locator(".links.open").count();
        if (openMenu) await clickIfVisible(page, "[data-menu-toggle]", "closed mobile menu before Valley CTA", actions);
      }
      await clickIfVisible(page, "a:has-text('Open full app')", "clicked Valley Open full app CTA", actions);
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(500);
      const href = page.url();
      if (!href.includes(`/client-app-factory/client-apps/${client.slug}/`)) {
        errors.push(`Valley CTA did not navigate to app: ${href}`);
      }
    }

    const metrics = await pageMetrics(page);
    if (status < 200 || status >= 400) errors.push(`HTTP status ${status}`);
    if (metrics.scrollWidth > metrics.innerWidth + 1) {
      errors.push(`horizontal overflow ${metrics.scrollWidth - metrics.innerWidth}`);
    }
    if (!metrics.bodyText.includes(client.name) && target.kind === "app") {
      errors.push("client name missing from app route body text");
    }
    if (target.kind === "valley-post" && !metrics.href.includes(`/client-app-factory/client-apps/${client.slug}/`)) {
      const text = await page.locator("body").innerText().catch(() => "");
      if (!text.includes("Full app built first")) errors.push("Valley page missing full-app-built proof copy");
    }

    const screenshot = path.join(runDir, `${client.slug}-${target.id}-${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await page.close();

    return {
      ok: errors.length === 0 && failedRequests.length === 0 && consoleEntries.filter(e => e.type === "error").length === 0,
      client: client.name,
      slug: client.slug,
      target,
      viewport,
      status,
      actions,
      metrics,
      consoleEntries,
      failedRequests,
      errors,
      screenshot
    };
  } catch (error) {
    const screenshot = path.join(runDir, `${client.slug}-${target.id}-${viewport.name}-error.png`);
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
    await page.close().catch(() => {});
    return {
      ok: false,
      client: client.name,
      slug: client.slug,
      target,
      viewport,
      status,
      actions,
      consoleEntries,
      failedRequests,
      errors: [error.stack || String(error)],
      screenshot
    };
  }
}

const clients = siteDataFiles.map(readSiteData);
const browser = await chromium.launch({
  headless: false,
  chromiumSandbox: false,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
});

const targets = clients.flatMap(client => [
  ...routes.map(route => ({
    id: route.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    kind: "app",
    route,
    url: new URL(route, client.appUrl).href
  })),
  {
    id: "valley-post",
    kind: "valley-post",
    route: "valley-post",
    url: client.valleyUrl
  }
].map(target => ({ client, target })));

const results = [];
for (const { client, target } of targets) {
  for (const viewport of viewports) {
    results.push(await verifyTarget(browser, client, target, viewport));
  }
}
await browser.close();

const failures = results
  .filter(result => !result.ok)
  .map(result => `${result.viewport.name} ${result.slug} ${result.target.route}: ${result.errors.concat(result.failedRequests.map(r => r.url)).join("; ")}`);

const report = {
  ok: failures.length === 0,
  generatedAt: new Date().toISOString(),
  browser: "chromium headed via Playwright",
  runDir,
  clients: clients.map(client => ({ name: client.name, slug: client.slug, appUrl: client.appUrl, valleyUrl: client.valleyUrl })),
  routeCount: routes.length,
  targetCount: targets.length,
  viewportCount: viewports.length,
  failures,
  results
};

const reportPath = path.join(runDir, "live-browser-verification-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(ROOT, "test-artifacts", "dental-client-apps-live-headed-route-sweep.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, reportPath, failures }, null, 2));
process.exit(report.ok ? 0 : 1);
