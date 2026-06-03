import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { loadLocalEnv } from "./_local-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "..");
loadLocalEnv({ root, repoRoot });
const artifactDir = path.join(repoRoot, "test-artifacts", "skyepay-proof");
const videoDir = path.join(artifactDir, "videos");
fs.mkdirSync(videoDir, { recursive: true });

const functionRoutes = {
  "/skyepay/offers": "skyepay-offers.js",
  "/skyepay/checkout": "skyepay-checkout.js",
  "/skyepay/status": "skyepay-status.js",
  "/.netlify/functions/skyepay-offers": "skyepay-offers.js",
  "/.netlify/functions/skyepay-checkout": "skyepay-checkout.js",
  "/.netlify/functions/skyepay-status": "skyepay-status.js"
};

const assetAliases = {
  "/pay": "/skyepay.html",
  "/store": "/skyepay-store.html",
  "/gateway/skyepay": "/skyepay.html",
  "/skyepay/store": "/skyepay-store.html",
  "/skyepay/api": "/skyepay-api.html",
  "/skyepay/api.json": "/skyepay-api.json"
};

function contentType(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js") || file.endsWith(".mjs")) return "application/javascript; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

async function bodyFromNode(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function handleFunction(req, res, pathname) {
  const file = functionRoutes[pathname];
  const mod = await import(pathToFileURL(path.join(root, "netlify", "functions", file)).href);
  const body = await bodyFromNode(req);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(","));
    else if (value != null) headers.set(key, value);
  }
  const request = new Request(`http://127.0.0.1:${server.address().port}${req.url}`, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method || "GET") ? undefined : body
  });
  const response = await mod.default(request, {});
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  const out = Buffer.from(await response.arrayBuffer());
  res.end(out);
}

let server;
function startServer() {
  server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
      if (functionRoutes[url.pathname]) return await handleFunction(req, res, url.pathname);
      const normalizedPath = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
      const assetPath = assetAliases[normalizedPath] || url.pathname;
      let filePath = path.join(root, decodeURIComponent(assetPath));
      if (assetPath === "/") filePath = path.join(root, "skyepay.html");
      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        return res.end("Forbidden");
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        return res.end("Not found");
      }
      res.writeHead(200, { "content-type": contentType(filePath) });
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end(error?.stack || String(error));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

async function checkNoHorizontalOverflow(page) {
  return page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  }));
}

function writeProofReel({ videoPath, posterPath }) {
  if (!videoPath) return null;
  const reelPath = path.join(artifactDir, "skyepay-proof-reel.html");
  const videoSrc = `videos/${path.basename(videoPath)}`;
  const posterSrc = path.basename(posterPath);
  fs.writeFileSync(reelPath, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SkyePay Browser Proof Reel</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #05070b; color: #f8fafc; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    main { width: min(1100px, 100%); }
    h1 { margin: 0 0 12px; font-size: clamp(28px, 5vw, 56px); letter-spacing: 0; }
    p { margin: 0 0 18px; color: rgba(255,255,255,.72); line-height: 1.5; }
    video { width: 100%; max-height: 78vh; display: block; background: #000; border: 1px solid rgba(39,242,255,.32); box-shadow: 0 24px 80px rgba(0,0,0,.48); }
  </style>
</head>
<body>
  <main>
    <h1>SkyePay Browser Action Proof</h1>
    <p>Recorded path: open the RouteX owner-approved SkyePay lane, fill checkout, submit dry-run checkout, and return to the FS27 preview-recorded state.</p>
    <video id="proofVideo" src="${videoSrc}" poster="${posterSrc}" controls autoplay muted playsinline preload="auto"></video>
  </main>
</body>
</html>
`);
  return reelPath;
}

async function verifyProofReel(browser, reelPath) {
  if (!reelPath) return { ok: false, reason: "missing reel" };
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await context.newPage();
  try {
    await page.goto(pathToFileURL(reelPath).href, { waitUntil: "domcontentloaded" });
    const playback = await page.evaluate(async () => {
      const video = document.querySelector("#proofVideo");
      if (!video) return { ok: false, reason: "missing video" };
      await video.play().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 900));
      const rect = video.getBoundingClientRect();
      return {
        readyState: video.readyState,
        currentTime: video.currentTime,
        paused: video.paused,
        visible: rect.width > 200 && rect.height > 120 && rect.bottom > 0 && rect.right > 0,
        controls: video.controls,
        autoplay: video.autoplay,
        muted: video.muted,
        playsInline: video.playsInline,
        poster: video.getAttribute("poster") || ""
      };
    });
    return {
      ...playback,
      ok: playback.readyState >= 2 &&
        playback.currentTime > 0 &&
        playback.paused === false &&
        playback.visible === true &&
        playback.controls === true &&
        playback.autoplay === true &&
        playback.muted === true &&
        playback.playsInline === true &&
        Boolean(playback.poster)
    };
  } finally {
    await context.close().catch(() => {});
  }
}

async function readJsonUrl(url) {
  const response = await fetch(url);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { ok: response.ok, status: response.status, text, json };
}

async function verifyApiContract(origin, browser) {
  const [docs, manifest, openapi, sdk] = await Promise.all([
    fetch(`${origin}/skyepay/api`),
    readJsonUrl(`${origin}/skyepay/api.json`),
    readJsonUrl(`${origin}/openapi/skyepay.openapi.json`),
    fetch(`${origin}/assets/skyepay-client.js`)
  ]);
  const docsText = await docs.text();
  const sdkText = await sdk.text();

  const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await context.newPage();
  try {
    await page.goto(`${origin}/skyepay/api`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.SkyePayClient === "function");
    const sdkResult = await page.evaluate(async () => {
      const client = new window.SkyePayClient({ client: "metraiyux-0s" });
      const offers = await client.offers();
      const checkout = await client.checkout({
        client_slug: "metraiyux-0s",
        offer_id: "metraiyux-routex-workforce-command",
        customer_name: "SkyePay API Proof",
        customer_email: "proof@example.com",
        company_name: "MetrAIyux 0S",
        dry_run: true
      });
      const statusResponse = await fetch(`/skyepay/status?demo_session=${encodeURIComponent(checkout.id)}&offer=metraiyux-routex-workforce-command`);
      const status = await statusResponse.json();
      return {
        offersOk: offers.ok === true && offers.offers.length >= 60,
        registryOk: offers.catalog_integrity?.imported_checkout_offers >= 50,
        checkoutOk: checkout.ok === true && typeof checkout.url === "string",
        routexOfferOk: offers.offers.some((offer) => (
          offer.id === "metraiyux-routex-workforce-command" &&
          offer.owner_approval_required === true &&
          offer.setup_cents === 650000 &&
          offer.recurring_cents === 149700
        )),
        statusOk: status.ok === true &&
          status.order?.approval_status === "demo_pending_owner_approval" &&
          status.order?.provisioning_status === "waiting_for_owner_approval",
        client: offers.client?.client_slug || offers.client?.slug || null,
        offerCount: offers.offers.length,
        repoImported: offers.catalog_integrity?.imported_checkout_offers || 0,
        checkoutId: checkout.id || null
      };
    });
    return {
      ok: docs.ok &&
        /SkyePay API/i.test(docsText) &&
        manifest.ok &&
        manifest.json?.id === "skyepay-api" &&
        openapi.ok &&
        openapi.json?.openapi === "3.1.0" &&
        sdk.ok &&
        /SkyePayClient/.test(sdkText) &&
        sdkResult.offersOk &&
        sdkResult.registryOk &&
        sdkResult.routexOfferOk &&
        sdkResult.checkoutOk &&
        sdkResult.statusOk,
      docs: { status: docs.status, bytes: docsText.length },
      manifest: { status: manifest.status, id: manifest.json?.id || null },
      openapi: { status: openapi.status, title: openapi.json?.info?.title || null },
      sdk: { status: sdk.status, bytes: sdkText.length },
      sdkResult
    };
  } finally {
    await context.close().catch(() => {});
  }
}

async function main() {
  process.env.SKYPAY_ALLOW_PUBLIC_DRY_RUN = "true";
  if (!process.env.NETLIFY_DATABASE_URL && !process.env.DATABASE_URL) {
    process.env.SKYGATE_SKIP_SCHEMA_BOOTSTRAP = "true";
  }
  const origin = await startServer();
  process.env.SKYPAY_PUBLIC_ORIGIN = origin;
  const browser = await chromium.launch({ headless: true });
  const report = {
    generatedAt: new Date().toISOString(),
    origin,
    checks: {},
    screenshots: {},
    video: null
  };

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: videoDir, size: { width: 1440, height: 1000 } }
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
  const consoleLines = [];
  page.on("console", (msg) => consoleLines.push(`${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => consoleLines.push(`pageerror: ${err.message}`));
  await page.goto(`${origin}/skyepay.html?client=metraiyux-0s&offer=metraiyux-routex-workforce-command&dry_run=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  try {
    await page.locator("#skypayForm").waitFor({ state: "visible", timeout: 60000 });
  } catch (error) {
    const debug = await page.evaluate(() => ({
      href: location.href,
      title: document.title,
      readyState: document.readyState,
      formExists: Boolean(document.querySelector("#skypayForm")),
      bodyText: document.body?.innerText?.slice(0, 1200) || ""
    })).catch(() => ({}));
    console.error(JSON.stringify({ initialFormDebug: debug, consoleLines }, null, 2));
    throw error;
  }
  report.checks.desktopInitial = {
    title: await page.title(),
    heroVisible: await page.locator("text=SkyePay").first().isVisible(),
    checkoutVisible: await page.locator("#checkoutBtn").isVisible(),
    overflow: await checkNoHorizontalOverflow(page)
  };
  await page.fill('input[name="customer_name"]', "Bob");
  await page.fill('input[name="customer_email"]', "bob@example.com");
  await page.fill('input[name="company_name"]', "Bob's Smoke Shop");
  await page.click("#checkoutBtn");
  await page.waitForFunction(() => location.href.includes("status=success"), null, { timeout: 30000 });
  try {
    await page.locator("#statusPanel").waitFor({ state: "visible", timeout: 15000 });
  } catch (error) {
    const debug = await page.evaluate(() => ({
      href: location.href,
      panelHidden: document.querySelector("#statusPanel")?.hidden,
      panelText: document.querySelector("#statusPanel")?.innerText,
      bodyText: document.body.innerText.slice(0, 1200)
    }));
    console.error(JSON.stringify({ statusPanelDebug: debug, consoleLines }, null, 2));
    throw error;
  }
  await page.waitForFunction(() => /pending owner approval/i.test(document.querySelector("#statusPanel")?.innerText || ""), null, { timeout: 20000 });
  const statusText = await page.locator("#statusPanel").innerText();
  report.checks.checkoutDryRun = {
    actionPath: [
      "goto skyepay.html?client=metraiyux-0s&offer=metraiyux-routex-workforce-command&dry_run=1",
      "fill customer_name",
      "fill customer_email",
      "fill company_name",
      "click #checkoutBtn",
      "route returns with status=success",
      "assert pending owner approval"
    ],
    returnedToSkyePay: page.url().includes("status=success"),
    pendingApprovalShown: /pending owner approval/i.test(statusText),
    statusText
  };
  const desktopShot = path.join(artifactDir, "skyepay-desktop.png");
  await page.screenshot({ path: desktopShot, fullPage: true, timeout: 60000 });
  report.screenshots.desktop = desktopShot;
  const video = page.video();
  await page.close();
  await context.close();
  report.video = video ? await video.path() : null;
  report.proofReel = writeProofReel({ videoPath: report.video, posterPath: desktopShot });

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobile = await mobileContext.newPage();
  mobile.setDefaultNavigationTimeout(90000);
  await mobile.goto(`${origin}/skyepay.html?client=bobs-smoke-shop&dry_run=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await mobile.waitForSelector("#skypayForm");
  const mobileShot = path.join(artifactDir, "skyepay-mobile.png");
  await mobile.screenshot({ path: mobileShot, fullPage: true, timeout: 60000 });
  report.screenshots.mobile = mobileShot;
  report.checks.mobile = {
    checkoutVisible: await mobile.locator("#checkoutBtn").isVisible(),
    overflow: await checkNoHorizontalOverflow(mobile)
  };
  await mobileContext.close();

  const storeContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const storePage = await storeContext.newPage();
  storePage.setDefaultNavigationTimeout(90000);
  await storePage.goto(`${origin}/skyepay-store.html?client=metraiyux-0s&dry_run=1`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await storePage.waitForSelector(".store-card");
  const storeShot = path.join(artifactDir, "skyepay-store-desktop.png");
  await storePage.screenshot({ path: storeShot, fullPage: true, timeout: 60000 });
  report.screenshots.store = storeShot;
  report.checks.store = {
    checkoutVisible: await storePage.locator("#storeCheckoutBtn").isVisible(),
    offerCount: await storePage.locator(".store-card").count(),
    hasVaultOffer: await storePage.locator("text=SkyeVault").first().isVisible(),
    zeroUpfrontShown: await storePage.locator("text=$0 today").first().isVisible(),
    overflow: await checkNoHorizontalOverflow(storePage)
  };
  await storeContext.close();

  report.checks.apiContract = await verifyApiContract(origin, browser);
  report.checks.videoPlayback = await verifyProofReel(browser, report.proofReel);
  await browser.close();
  server.close();

  const ok = report.checks.desktopInitial.checkoutVisible &&
    !report.checks.desktopInitial.overflow.overflow &&
    report.checks.checkoutDryRun.returnedToSkyePay &&
    report.checks.checkoutDryRun.pendingApprovalShown &&
    report.checks.mobile.checkoutVisible &&
    !report.checks.mobile.overflow.overflow &&
    report.checks.store.checkoutVisible &&
    report.checks.store.offerCount >= 60 &&
    report.checks.store.hasVaultOffer &&
    report.checks.store.zeroUpfrontShown &&
    !report.checks.store.overflow.overflow &&
    report.checks.apiContract.ok &&
    report.checks.videoPlayback.ok;

  report.ok = ok;
  const reportPath = path.join(artifactDir, "skyepay-browser-proof.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok, reportPath, screenshots: report.screenshots, video: report.video }, null, 2));
  if (!ok) process.exit(1);
}

main().catch(async (error) => {
  try { server?.close(); } catch {}
  console.error(error);
  process.exit(1);
});
