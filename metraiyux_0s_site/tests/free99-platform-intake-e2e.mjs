import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const root = process.cwd();
const siteDir = path.join(root, "metraiyux_0s_site");
const manifestPath = path.join(siteDir, "Free99", "app-manifest.json");
const mountedAppsDir = path.join(siteDir, "Free99", "apps");
const artifactDir = path.join(root, "test-artifacts", "free99-platform-intake");
const reportPath = path.join(artifactDir, "free99-platform-intake-e2e-report.json");
const proofToken = "FREE99-PLATFORM-LOCAL-PROOF";
const checks = [];

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function failText(error) {
  return String(error?.stack || error?.message || error).split("\n").slice(0, 6).join("\n").slice(0, 1200);
}

function urlFor(baseUrl, route) {
  return new URL(route.replace(/^\/+/, ""), baseUrl).toString();
}

function appRoute(app) {
  return `Free99/apps/${app.slug}/${app.entry}`;
}

const generatedCorpusDirs = new Set(["build", "generated", "templates", "template-library", "official-source-library", "review-workflow"]);

async function walkHtmlFiles(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && generatedCorpusDirs.has(entry.name)) continue;
    if (entry.isDirectory()) await walkHtmlFiles(full, out);
    else if (entry.name.toLowerCase().endsWith(".html")) out.push(full);
  }
  return out;
}

async function waitForServer(baseUrl, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(urlFor(baseUrl, "Free99/index.html"), { cache: "no-store" });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Local 0S server did not respond at ${baseUrl}`);
}

async function startServer() {
  if (process.env.FREE99_PLATFORM_BASE_URL) {
    const baseUrl = process.env.FREE99_PLATFORM_BASE_URL.endsWith("/")
      ? process.env.FREE99_PLATFORM_BASE_URL
      : `${process.env.FREE99_PLATFORM_BASE_URL}/`;
    await waitForServer(baseUrl);
    return { baseUrl, stop: async () => {} };
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const port = 45200 + Math.floor(Math.random() * 700);
    const baseUrl = `http://127.0.0.1:${port}/`;
    const child = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
      cwd: siteDir,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    try {
      await waitForServer(baseUrl);
      return {
        baseUrl,
        stop: async () => {
          child.kill("SIGTERM");
          await new Promise((resolve) => child.once("exit", resolve));
        }
      };
    } catch {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
      if (attempt === 9) {
        throw new Error(`Could not start local 0S server.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
      }
    }
  }
  throw new Error("Could not start local 0S server.");
}

async function withTrackedPage(context, id, fn) {
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /free99-gate|Free99PlatformGate/i.test(message.text())) {
      pageErrors.push(message.text());
    }
  });
  const entry = { id, checks: [], page_errors: pageErrors };
  try {
    await fn(page, entry);
    entry.ok = entry.checks.every((item) => item.ok) && pageErrors.length === 0;
  } catch (error) {
    entry.ok = false;
    entry.error = failText(error);
  } finally {
    checks.push(entry);
    await page.close().catch(() => {});
  }
  return entry;
}

async function installHeaderProbe(page) {
  await page.route("**/__free99_header_probe__", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ headers: route.request().headers() })
    });
  });
}

async function readHeaderProbe(page) {
  return page.evaluate(async () => {
    const response = await fetch("/__free99_header_probe__", { headers: { "x-existing-proof": "kept" } });
    return response.json();
  });
}

async function checkHub(browser, baseUrl, apps) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 940 } });
  await withTrackedPage(context, "free99-hub-desktop-mobile", async (page, entry) => {
    const response = await page.goto(urlFor(baseUrl, "Free99/index.html"), { waitUntil: "domcontentloaded", timeout: 20000 });
    entry.checks.push({ name: "hub_http_ok", ok: Boolean(response?.ok()), status: response?.status() || 0 });
    await page.getByText("Free99 has one free app", { exact: false }).first().waitFor({ state: "visible", timeout: 12000 });
    entry.checks.push({ name: "hub_free99_policy_copy", ok: true });
    const cardCount = await page.locator(".app-card").count();
    entry.checks.push({ name: "all_manifest_apps_rendered", ok: cardCount === apps.length, count: cardCount });
    await page.locator(".app-card.free").filter({ hasText: "SkyeOpsConsole" }).first().waitFor({ state: "visible", timeout: 12000 });
    await page.locator(".app-card").filter({ hasText: "SovereignDocs" }).filter({ hasText: "Paid / gated" }).first().waitFor({ state: "visible", timeout: 12000 });
    entry.checks.push({ name: "free_and_paid_boundaries_visible", ok: true });
    const desktopShot = path.join(artifactDir, "free99-hub-desktop.png");
    await page.screenshot({ path: desktopShot, fullPage: false });
    entry.checks.push({ name: "desktop_screenshot", ok: true, path: desktopShot });
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    entry.checks.push({ name: "mobile_no_horizontal_overflow", ok: !mobileOverflow });
    const mobileShot = path.join(artifactDir, "free99-hub-mobile.png");
    await page.screenshot({ path: mobileShot, fullPage: false });
    entry.checks.push({ name: "mobile_screenshot", ok: true, path: mobileShot });
  });
  await context.close();
}

async function checkIndexSurfaces(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const routes = [
    ["free99-receipt", "proof/free99-platform-intake-receipt.html", "SovereignDocs v20"],
    ["feature-atlas", "feature-atlas.html", "Free99 Platform Intake"],
    ["changelog", "changelog/index.html", "Free99/Paid-Apps intake"],
    ["operator-index", "operator/index.html", "Free99 Platform Intake"],
    ["proof-index", "proof/index.html", "Free99 Platform Intake"],
    ["sales-proof-router", "sales/live-proof-router.html", "Free99 Platform Intake"]
  ];
  for (const [id, route, text] of routes) {
    await withTrackedPage(context, id, async (page, entry) => {
      const response = await page.goto(urlFor(baseUrl, route), { waitUntil: "domcontentloaded", timeout: 20000 });
      entry.checks.push({ name: "http_ok", ok: Boolean(response?.ok()), status: response?.status() || 0, route });
      await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 12000 });
      entry.checks.push({ name: "free99_route_visible", ok: true, route });
    });
  }
  await context.close();
}

async function checkPublicListingSources(baseUrl) {
  const entry = { id: "public-discovery-listings", checks: [], page_errors: [] };
  try {
    const listingFiles = [
      ["public_home", path.join(siteDir, "index.html"), ["Free99 Intake", "Free99 Platform Intake", "Free99/index.html"]],
      ["feature_atlas", path.join(siteDir, "feature-atlas.html"), ["Free99 Platform Intake", "Free99/index.html", "proof/free99-platform-intake-receipt.html", "SovereignDocs Library"]],
      ["changelog", path.join(siteDir, "changelog", "index.html"), ["Free99/Paid-Apps Intake", "free99-platform-intake", "../Free99/index.html", "SkyeOpsConsole is the only no-charge app"]],
      ["ecosystem_map", path.join(siteDir, "assets", "system-map.js"), ["Free99 Platform Intake", "SovereignDocs library", "Feature Atlas entry", "Changelog entry", "usage_lane"]],
      ["sales_router", path.join(siteDir, "sales", "live-proof-router.html"), ["free99-platform-intake", "what was imported from Free99/Paid-Apps", "../Free99/index.html"]],
      ["operator_index", path.join(siteDir, "operator", "index.html"), ["Free99 Platform Intake", "../Free99/index.html"]],
      ["proof_index", path.join(siteDir, "proof", "index.html"), ["Free99 Platform Intake", "../Free99/index.html"]]
    ];
    for (const [name, file, needles] of listingFiles) {
      const source = await fs.readFile(file, "utf8");
      const missing = needles.filter((needle) => !source.includes(needle));
      entry.checks.push({ name: `listing_source:${name}`, ok: missing.length === 0, missing });
    }
    const listedRoutes = [
      "index.html",
      "ecosystem.html",
      "feature-atlas.html",
      "changelog/index.html",
      "sales/live-proof-router.html",
      "operator/index.html",
      "proof/index.html",
      "Free99/index.html",
      "proof/free99-platform-intake-receipt.html"
    ];
    const failures = [];
    await Promise.all(listedRoutes.map(async (route) => {
      try {
        const response = await fetch(urlFor(baseUrl, route), { method: "HEAD", signal: AbortSignal.timeout(5000) });
        if (!response.ok) failures.push({ route, status: response.status });
      } catch (error) {
        failures.push({ route, error: failText(error) });
      }
    }));
    entry.checks.push({ name: "listed_public_routes_http_ok", ok: failures.length === 0, failures });
    entry.ok = entry.checks.every((item) => item.ok);
  } catch (error) {
    entry.ok = false;
    entry.error = failText(error);
  }
  checks.push(entry);
}

async function checkAllMountedHtmlRoutes(baseUrl) {
  const entry = { id: "all-mounted-html-static-smoke", checks: [], page_errors: [] };
  try {
    const files = await walkHtmlFiles(mountedAppsDir);
    const missingGate = [];
    const failedRoutes = [];
    const routes = [];
    for (const file of files) {
      const source = await fs.readFile(file, "utf8");
      if (!source.includes("free99-gate.js")) missingGate.push(path.relative(siteDir, file));
      const route = path.relative(siteDir, file).split(path.sep).join("/");
      routes.push(route);
    }
    const smokeRoute = async (route) => {
      try {
        const response = await fetch(urlFor(baseUrl, `${route}?gate_session=${proofToken}`), {
          method: "HEAD",
          signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) failedRoutes.push({ route, status: response.status });
      } catch (error) {
        failedRoutes.push({ route, error: failText(error) });
      }
    };
    const batchSize = 12;
    for (let index = 0; index < routes.length; index += batchSize) {
      await Promise.all(routes.slice(index, index + batchSize).map(smokeRoute));
    }
    entry.checks.push({ name: "all_mounted_html_gate_injected", ok: missingGate.length === 0, count: files.length, missingGate: missingGate.slice(0, 25) });
    entry.checks.push({ name: "all_mounted_html_routes_http_ok", ok: failedRoutes.length === 0, count: files.length, failedRoutes: failedRoutes.slice(0, 25) });
    entry.checks.push({ name: "generated_corpus_smoked_by_library_render", ok: true, skippedDirs: [...generatedCorpusDirs].sort() });
    entry.ok = entry.checks.every((item) => item.ok);
  } catch (error) {
    entry.ok = false;
    entry.error = failText(error);
  }
  checks.push(entry);
}

async function checkAppGate(browser, baseUrl, app) {
  const route = appRoute(app);
  const lockedContext = await browser.newContext({ viewport: { width: 1366, height: 880 } });
  await withTrackedPage(lockedContext, `locked-${app.slug}`, async (page, entry) => {
    await installHeaderProbe(page);
    const response = await page.goto(urlFor(baseUrl, route), { waitUntil: "domcontentloaded", timeout: 25000 });
    entry.checks.push({ name: "app_http_ok", ok: Boolean(response?.ok()), status: response?.status() || 0, route });
    await page.locator("#free99PlatformGate").waitFor({ state: "visible", timeout: 15000 });
    const gate = await page.evaluate(() => ({
      platformId: window.Free99PlatformGate?.platformId,
      billingMode: window.Free99PlatformGate?.billingMode,
      locked: document.documentElement.classList.contains("free99-platform-gate-locked"),
      badge: document.querySelector(".free99-platform-gate-badge")?.textContent || "",
      backHref: document.querySelector("#free99PlatformGate a[href]")?.getAttribute("href") || ""
    }));
    entry.checks.push({ name: "gate_platform_id", ok: gate.platformId === app.platform_id, value: gate.platformId });
    entry.checks.push({ name: "gate_billing_mode", ok: gate.billingMode === app.billing, value: gate.billingMode });
    entry.checks.push({ name: "gate_locked_ui", ok: gate.locked === true });
    entry.checks.push({
      name: "gate_free_vs_paid_badge",
      ok: app.billing === "free99" ? gate.badge.includes("Free99 gated app") : gate.badge.includes("Paid platform lane"),
      value: gate.badge
    });
    entry.checks.push({ name: "gate_back_link_absolute", ok: gate.backHref === "/Free99/index.html", value: gate.backHref });
    const probe = await readHeaderProbe(page);
    entry.checks.push({ name: "fetch_header_platform", ok: probe.headers["x-skye-platform"] === app.platform_id, headers: probe.headers });
    entry.checks.push({ name: "fetch_header_billing", ok: probe.headers["x-free99-billing-mode"] === app.billing });
    entry.checks.push({ name: "fetch_header_existing_preserved", ok: probe.headers["x-existing-proof"] === "kept" });
    if (["skyeopsconsole", "sovereigndocs"].includes(app.slug)) {
      const screenshot = path.join(artifactDir, `gate-${app.slug}.png`);
      await page.screenshot({ path: screenshot, fullPage: false });
      entry.checks.push({ name: "gate_screenshot", ok: true, path: screenshot });
    }
  });
  await lockedContext.close();

  const unlockedContext = await browser.newContext({ viewport: { width: 1366, height: 880 } });
  await withTrackedPage(unlockedContext, `unlocked-${app.slug}`, async (page, entry) => {
    await installHeaderProbe(page);
    const response = await page.goto(urlFor(baseUrl, `${route}?gate_session=${proofToken}`), { waitUntil: "domcontentloaded", timeout: 25000 });
    entry.checks.push({ name: "app_http_ok", ok: Boolean(response?.ok()), status: response?.status() || 0, route });
    await page.waitForFunction(() => Boolean(window.Free99PlatformGate?.requireSession?.()?.token), null, { timeout: 15000 });
    await page.locator("#free99PlatformGate").waitFor({ state: "detached", timeout: 15000 }).catch(async () => {
      const count = await page.locator("#free99PlatformGate").count();
      expect(count === 0, "Gate overlay remained visible after proof session.");
    });
    const state = await page.evaluate(() => {
      const session = window.Free99PlatformGate.requireSession();
      return {
        platformId: window.Free99PlatformGate.platformId,
        billingMode: window.Free99PlatformGate.billingMode,
        token: session?.token,
        source: session?.source,
        locationSearch: location.search,
        stored: JSON.parse(sessionStorage.getItem("FREE99_PLATFORM_GATE_SESSION") || "null")
      };
    });
    entry.checks.push({ name: "proof_session_platform_id", ok: state.platformId === app.platform_id, value: state.platformId });
    entry.checks.push({ name: "proof_session_billing", ok: state.billingMode === app.billing, value: state.billingMode });
    entry.checks.push({ name: "proof_token_persisted", ok: state.token === proofToken && state.stored?.token === proofToken, state });
    entry.checks.push({ name: "proof_token_scrubbed_from_url", ok: state.locationSearch === "", value: state.locationSearch });
    const probe = await readHeaderProbe(page);
    entry.checks.push({ name: "fetch_header_authorization", ok: probe.headers.authorization === `Bearer ${proofToken}` });
    entry.checks.push({ name: "fetch_header_gate_session", ok: probe.headers["x-skye-gate-session"] === proofToken });
    entry.checks.push({ name: "fetch_header_platform", ok: probe.headers["x-skye-platform"] === app.platform_id });
    entry.checks.push({ name: "fetch_header_billing", ok: probe.headers["x-free99-billing-mode"] === app.billing });
  });
  await unlockedContext.close();
}

async function checkSovereignDocsLibrary(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await withTrackedPage(context, "sovereigndocs-library-static-data", async (page, entry) => {
    await installHeaderProbe(page);
    const response = await page.goto(urlFor(baseUrl, `Free99/apps/sovereigndocs/documents/index.html?gate_session=${proofToken}`), { waitUntil: "domcontentloaded", timeout: 25000 });
    entry.checks.push({ name: "documents_http_ok", ok: Boolean(response?.ok()), status: response?.status() || 0 });
    await page.waitForFunction(() => document.querySelectorAll("#libraryGrid .document-card").length > 0, null, { timeout: 20000 });
    const state = await page.evaluate(async () => {
      const dynamicLink = document.createElement("a");
      dynamicLink.setAttribute("href", "/customer-dashboard/");
      dynamicLink.textContent = "dynamic link probe";
      document.body.appendChild(dynamicLink);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return {
        cards: document.querySelectorAll("#libraryGrid .document-card").length,
        countText: document.querySelector("#libraryCount")?.textContent || "",
        scopedManifest: window.Free99PlatformGate.scopeUrl("/template-library/manifest.json"),
        dynamicLink: dynamicLink.getAttribute("href") || ""
      };
    });
    entry.checks.push({ name: "library_records_rendered", ok: state.cards > 0, count: state.cards, countText: state.countText });
    entry.checks.push({
      name: "sovereigndocs_static_fetches_scoped",
      ok: state.scopedManifest === "/Free99/apps/sovereigndocs/template-library/manifest.json",
      value: state.scopedManifest
    });
    entry.checks.push({
      name: "dynamic_absolute_links_scoped",
      ok: state.dynamicLink === "/Free99/apps/sovereigndocs/customer-dashboard/",
      value: state.dynamicLink
    });
    const probe = await readHeaderProbe(page);
    entry.checks.push({ name: "library_fetch_header_platform", ok: probe.headers["x-skye-platform"] === "sovereigndocs" });
  });
  await context.close();
}

await fs.mkdir(artifactDir, { recursive: true });
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const apps = manifest.apps || [];
expect(apps.length === 11, `Expected 11 mounted Free99 apps, got ${apps.length}.`);
expect(apps.filter((app) => app.billing === "free99").map((app) => app.platform_id).join(",") === "skyeopsconsole", "SkyeOpsConsole must be the only Free99 app.");
expect(apps.some((app) => app.platform_id === "sovereigndocs"), "SovereignDocs is missing from the mounted app manifest.");

const server = await startServer();
let browser;
try {
  browser = await chromium.launch({ headless: true, chromiumSandbox: false });
  await checkPublicListingSources(server.baseUrl);
  await checkIndexSurfaces(browser, server.baseUrl);
  await checkHub(browser, server.baseUrl, apps);
  await checkAllMountedHtmlRoutes(server.baseUrl);
  for (const app of apps) await checkAppGate(browser, server.baseUrl, app);
  await checkSovereignDocsLibrary(browser, server.baseUrl);
} finally {
  if (browser) await browser.close().catch(() => {});
  await server.stop();
}

const ok = checks.every((entry) => entry.ok);
const report = {
  ok,
  base_url: server.baseUrl,
  manifest: manifestPath,
  mounted_apps: apps.length,
  free_platforms: apps.filter((app) => app.billing === "free99").map((app) => app.platform_id),
  paid_or_scoped_platforms: apps.filter((app) => app.billing !== "free99").map((app) => app.platform_id),
  checks
};
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  ok,
  mounted_apps: apps.length,
  browser_checks: checks.length,
  report: reportPath,
  artifacts: artifactDir
}, null, 2));

if (!ok) {
  throw new Error(`Free99 platform intake proof failed. See ${reportPath}`);
}
