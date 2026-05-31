#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { resolveZeroOsGateAuth } from "./lib/zero-os-gate-auth.mjs";

const ROOT = "/workspaces/MetrAIyux-0S";
const PROD = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const clients = [
  ["Arizona Biltmore Dentistry", "arizona-biltmore-dentistry", "arizona-biltmore-dentistry-phoenix-85016-d406e26"],
  ["Dental Depot Orthodontics - Phoenix", "dental-depot-orthodontics-phoenix", "dental-depot-orthodontics-phoenix-85053-c0fa26f"],
  ["General Dentistry 4 Kids - Phoenix", "general-dentistry-4-kids-phoenix", "general-dentistry-4-kids-phoenix-85032-237e895"]
];
const onlyClient = process.argv.includes("--client") ? process.argv[process.argv.indexOf("--client") + 1] : "";
const routes = ["index.html","appointments.html","quote.html","services.html","emergency.html","intake.html","insurance.html","financial.html","patient-center.html","team.html","office.html","workspace.html","scan.html","preview.html","proof.html","faq.html","contact.html","flyer.html","offline.html"];
const viewports = [{name:"desktop",width:1440,height:950},{name:"mobile",width:390,height:844}];
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(ROOT, "test-artifacts", "live-browser-verifier", `${stamp}-ground-up-dental-apps-live`);
fs.mkdirSync(runDir, { recursive: true });

async function releaseIntro(page, actions) {
  const intro = page.locator("[data-app-intro]").first();
  if (await intro.count()) {
    const visible = await intro.isVisible().catch(() => false);
    if (visible) {
      await page.waitForTimeout(1400);
      const button = page.locator("[data-enter-intro]").first();
      if (await button.count()) {
        await button.click({ timeout: 5000 }).catch(() => {});
        actions.push("released intro");
      }
      await page.waitForFunction(() => !document.body.classList.contains("intro-active"), null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }
}

async function fillIf(page, selector, value, actions) {
  const el = page.locator(selector).first();
  if (await el.count() && await el.isVisible().catch(() => false)) {
    await el.fill(value).catch(() => {});
    actions.push(`filled ${selector}`);
  }
}

async function checkPage(client, target, viewport, authHeaders = {}) {
  const [name, slug] = client;
  let browser;
  let context;
  let page;
  const consoleEntries = [];
  const failedRequests = [];
  const actions = [];
  const errors = [];
  let status = 0;
  try {
    browser = await chromium.launch({ headless: false, chromiumSandbox: false, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
    context = await browser.newContext({ viewport, extraHTTPHeaders: authHeaders });
    page = await context.newPage();
    page.on("console", msg => {
      if (["error", "warning"].includes(msg.type())) consoleEntries.push({ type: msg.type(), text: msg.text() });
    });
    page.on("requestfailed", req => failedRequests.push({ url: req.url(), failure: req.failure()?.errorText || "failed" }));
    page.on("response", res => {
      const resStatus = res.status();
      if (resStatus >= 400) failedRequests.push({ url: res.url(), status: resStatus, failure: `HTTP ${resStatus}` });
    });
    const res = await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    status = res?.status() || 0;
    actions.push(`opened ${target.url}`);
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await releaseIntro(page, actions);
    if (viewport.name === "mobile" && target.kind !== "valley") {
      await page.locator("[data-menu-toggle]").first().click({ timeout: 3000 }).catch(() => {});
      actions.push("opened mobile menu");
    }
    if (target.route === "appointments.html" || target.route === "intake.html") {
      await fillIf(page, "input[name='name']", "Live Browser Patient", actions);
      await fillIf(page, "input[name='phone']", "555-0100", actions);
      await fillIf(page, "textarea[name='note']", "Live checked route row", actions);
      await page.locator("button:has-text('Save row')").first().click({ timeout: 5000 }).catch(() => {});
      actions.push("submitted route form");
    }
    if (target.route === "quote.html") {
      await page.locator("[data-build-route]").first().click({ timeout: 5000 }).catch(() => {});
      actions.push("built care handoff");
    }
    if (target.route === "emergency.html") {
      await page.locator("[data-triage]").first().click({ timeout: 5000 }).catch(() => {});
      actions.push("clicked urgent triage");
    }
    if (target.route === "proof.html") {
      await fillIf(page, "input[name='name']", "Owner proof", actions);
      await fillIf(page, "textarea[name='note']", "Live checked proof row", actions);
      await page.locator("button:has-text('Save row')").first().click({ timeout: 5000 }).catch(() => {});
      actions.push("submitted proof form");
    }
    if (target.kind === "valley") {
      await page.locator("a:has-text('Open full app')").first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await releaseIntro(page, actions);
      actions.push("clicked Valley Open full app");
      if (!page.url().includes(`/client-app-factory/client-apps/${slug}/`)) errors.push(`Valley CTA did not route to app: ${page.url()}`);
    }
    await page.waitForTimeout(1000);
    const metrics = await page.evaluate((expectedName) => {
      const imgs = [...document.images].map(img => ({ src: img.currentSrc || img.src, w: img.naturalWidth, h: img.naturalHeight, visible: !!(img.offsetWidth || img.offsetHeight) }));
      const videos = [...document.querySelectorAll("video[data-hero-video]")].map(video => ({
        src: video.currentSrc || video.querySelector("source")?.src || "",
        readyState: video.readyState,
        currentTime: video.currentTime,
        paused: video.paused,
        visible: !!(video.offsetWidth || video.offsetHeight)
      }));
      return {
        title: document.title,
        href: location.href,
        text: document.body.innerText.slice(0, 1200),
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth,
        imageCount: imgs.length,
        loadedImages: imgs.filter(img => img.w > 0 && img.h > 0).length,
        badImages: imgs.filter(img => img.visible && (!img.w || !img.h)).map(img => img.src),
        videoCount: videos.length,
        playableVideos: videos.filter(video => video.visible && video.readyState >= 2 && video.currentTime > 0 && !video.paused).length,
        badVideos: videos.filter(video => video.visible && (video.readyState < 2 || video.paused)).map(video => video.src),
        hasExpectedName: document.body.innerText.includes(expectedName),
        hasGsap: !!window.__DENTAL_APP_STACK__?.gsap,
        hasLenis: !!window.__DENTAL_APP_STACK__?.lenis,
        appShellVisible: getComputedStyle(document.querySelector("main")).visibility !== "hidden"
      };
    }, name);
    if (status < 200 || status >= 400) errors.push(`HTTP ${status}`);
    if (metrics.scrollWidth > metrics.innerWidth + 1) errors.push(`horizontal overflow ${metrics.scrollWidth - metrics.innerWidth}`);
    if (!metrics.hasExpectedName) errors.push("client name missing");
    if (!metrics.appShellVisible) errors.push("app shell still hidden after intro");
    if (target.kind === "app" && metrics.loadedImages < 3) errors.push(`too few loaded real images: ${metrics.loadedImages}`);
    if (target.kind === "app" && metrics.videoCount < 1) errors.push("required hero video missing");
    if (target.kind === "app" && metrics.playableVideos < 1) errors.push(`required hero video not playing: ${metrics.badVideos.join(", ")}`);
    if (target.kind === "app" && (!metrics.hasGsap || !metrics.hasLenis)) errors.push("GSAP/Lenis runtime proof missing");
    if (metrics.badImages.length) errors.push(`bad visible images: ${metrics.badImages.join(", ")}`);
    const screenshot = path.join(runDir, `${slug}-${target.route.replace(/[^a-z0-9]+/gi, "-")}-${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    await context.close();
    await browser.close();
    return { ok: errors.length === 0 && failedRequests.length === 0 && consoleEntries.filter(e => e.type === "error").length === 0, client: name, slug, target, viewport, status, actions, metrics, consoleEntries, failedRequests, errors, screenshot };
  } catch (error) {
    const screenshot = path.join(runDir, `${slug}-${target.route}-${viewport.name}-error.png`);
    if (page) await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    return { ok: false, client: name, slug, target, viewport, status, actions, consoleEntries, failedRequests, errors: [error.stack || String(error)], screenshot };
  }
}

const ownerGateAuth = await resolveZeroOsGateAuth({ zeroOsBase: PROD });
const ownerGateToken = String(ownerGateAuth.token || "").replace(/^Bearer(?:\s+|$)/i, "").trim();
const authHeaders = ownerGateToken ? {
  authorization: `Bearer ${ownerGateToken}`,
  "x-free99-gate-session": ownerGateToken,
  "x-skye-gate-session": ownerGateToken
} : {};
const results = [];
for (const c of clients.filter(client => !onlyClient || client[1] === onlyClient)) {
  const [, slug, valleySlug] = c;
  const base = `${PROD}/client-app-factory/client-apps/${slug}/`;
  const targets = routes.map(route => ({ kind: "app", route, url: new URL(route, base).href }));
  targets.push({ kind: "valley", route: "valley-post", url: `${PROD}/valley-verified/business/${valleySlug}/` });
  for (const target of targets) for (const viewport of viewports) results.push(await checkPage(c, target, viewport, authHeaders));
}
const failures = results.filter(r => !r.ok).map(r => `${r.viewport.name} ${r.slug} ${r.target.route}: ${[...r.errors, ...r.failedRequests.map(f => f.url)].join("; ")}`);
const report = { ok: failures.length === 0, generatedAt: new Date().toISOString(), browser: "chromium headed via Playwright", auth: ownerGateToken ? "shared-gate-bearer-present-secret-redacted" : "none", runDir, clients, routes, failures, results };
const reportPath = path.join(runDir, "live-browser-verification-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(ROOT, "test-artifacts", "ground-up-dental-apps-live-browser-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, reportPath, failures }, null, 2));
process.exit(report.ok ? 0 : 1);
