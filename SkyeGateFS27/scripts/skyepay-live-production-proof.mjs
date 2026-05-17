import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, request as playwrightRequest } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "..");
const artifactDir = path.join(repoRoot, "test-artifacts", "skyepay-live-production");
const videoDir = path.join(artifactDir, "videos");
fs.mkdirSync(videoDir, { recursive: true });

const origin = (process.env.SKYPAY_LIVE_ORIGIN || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev").replace(/\/$/, "");
const appUrl = `${origin}/skyepay.html?client=metraiyux-0s&offer=metraiyux-starter-command`;

function redactUrl(value) {
  return String(value || "").replace(/cs_(live|test)_[^/?#]+/g, "cs_$1_[redacted]");
}

function writeProofReel({ videoPath, posterPath }) {
  if (!videoPath || !posterPath) return null;
  const reelPath = path.join(artifactDir, "skyepay-live-production-proof-reel.html");
  const videoSrc = `videos/${path.basename(videoPath)}`;
  const posterSrc = path.basename(posterPath);
  fs.writeFileSync(reelPath, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SkyePay Live Production Proof</title>
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
    <h1>SkyePay Live Production Proof</h1>
    <p>Recorded path: deployed SkyePay app, live form submit, Stripe Checkout cs_live handoff, production status read.</p>
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

async function noHorizontalOverflow(page) {
  return page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 2
  }));
}

async function main() {
  const report = {
    ok: false,
    origin,
    generatedAt: new Date().toISOString(),
    checks: {},
    screenshots: {},
    video: null
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: videoDir, size: { width: 1440, height: 1000 } }
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("#skypayForm", { timeout: 15000 });
  const appShot = path.join(artifactDir, "live-skyepay-app.png");
  await page.screenshot({ path: appShot, fullPage: true });
  report.screenshots.app = appShot;
  report.checks.appLoaded = {
    ok: await page.locator("#checkoutBtn").isVisible(),
    title: await page.title(),
    overflow: await noHorizontalOverflow(page)
  };

  const storeContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const storePage = await storeContext.newPage();
  await storePage.goto(`${origin}/skyepay-store.html?client=metraiyux-0s`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await storePage.waitForSelector(".store-card", { timeout: 15000 });
  const storeShot = path.join(artifactDir, "live-skyepay-store.png");
  await storePage.screenshot({ path: storeShot, fullPage: true });
  report.screenshots.store = storeShot;
  report.checks.store = {
    ok: await storePage.locator("#storeCheckoutBtn").isVisible(),
    offerCount: await storePage.locator(".store-card").count(),
    hasVaultOffer: await storePage.locator("text=SkyeVault").first().isVisible(),
    zeroUpfrontShown: await storePage.locator("text=$0 today").first().isVisible(),
    overflow: await noHorizontalOverflow(storePage)
  };
  await storeContext.close();

  const offersResponse = await fetch(`${origin}/skyepay/offers?client=metraiyux-0s`);
  const offersJson = await offersResponse.json().catch(() => null);
  report.checks.repoStripeCatalog = {
    ok: offersResponse.ok &&
      (offersJson?.offers?.length || 0) >= 60 &&
      (offersJson?.repo_stripe_catalog?.imported_checkout_offers || 0) >= 50,
    status: offersResponse.status,
    offerCount: offersJson?.offers?.length || 0,
    importedCheckoutOffers: offersJson?.repo_stripe_catalog?.imported_checkout_offers || 0,
    source: offersJson?.repo_stripe_catalog?.source || null
  };

  await page.fill('input[name="customer_name"]', "SkyePay Live Browser Proof");
  await page.fill('input[name="customer_email"]', "skyepay-live-browser-proof@example.com");
  await page.fill('input[name="company_name"]', "SkyePay Live Browser Proof");

  const checkoutResponsePromise = page.waitForResponse((response) => (
    (response.url().includes("/skyepay/checkout") || response.url().includes("/.netlify/functions/skyepay-checkout")) &&
    response.request().method() === "POST"
  ), { timeout: 30000 });

  await page.click("#checkoutBtn");
  const checkoutResponse = await checkoutResponsePromise;
  const checkoutStatus = checkoutResponse.status();
  const checkoutJson = await checkoutResponse.json().catch(() => null);
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const stripeShot = path.join(artifactDir, "live-stripe-checkout.png");
  await page.screenshot({ path: stripeShot, fullPage: true });
  report.screenshots.stripeCheckout = stripeShot;

  const stripeUrl = page.url();
  const sessionFromStripeUrl = decodeURIComponent(stripeUrl.match(/\/pay\/(cs_(?:live|test)_[^#?/]+)/)?.[1] || "");
  const checkoutSessionId = checkoutJson?.id || sessionFromStripeUrl;
  const checkoutUrl = checkoutJson?.url || stripeUrl;
  report.checks.checkoutCreated = {
    ok: checkoutStatus === 200 &&
      /^cs_live_/.test(checkoutSessionId) &&
      /^https:\/\/checkout\.stripe\.com\//.test(checkoutUrl) &&
      /checkout\.stripe\.com/.test(stripeUrl),
    status: checkoutStatus,
    responseJsonCaptured: checkoutJson?.ok === true,
    sessionPrefix: String(checkoutSessionId || "").slice(0, 7),
    approvalStatus: checkoutJson?.approval_status || null,
    stripeHost: checkoutUrl ? new URL(checkoutUrl).host : null,
    browserUrl: redactUrl(stripeUrl)
  };

  const api = await playwrightRequest.newContext();
  try {
    const statusResponse = await api.get(`${origin}/skyepay/status?session_id=${encodeURIComponent(checkoutSessionId || "")}`, { timeout: 30000 });
    const statusJson = await statusResponse.json().catch(() => null);
    report.checks.productionStatus = {
      ok: statusResponse.ok() &&
        statusJson?.ok === true &&
        ["checkout_created", "paid_pending_owner_approval"].includes(statusJson?.order?.approval_status),
      status: statusResponse.status(),
      approvalStatus: statusJson?.order?.approval_status || null,
      paymentStatus: statusJson?.order?.payment_status || null,
      provisioningStatus: statusJson?.order?.provisioning_status || null
    };
  } finally {
    await api.dispose();
  }

  const video = page.video();
  await page.close();
  await context.close();
  report.video = video ? await video.path().catch(() => null) : null;
  report.proofReel = writeProofReel({ videoPath: report.video, posterPath: appShot });
  report.checks.videoPlayback = await verifyProofReel(browser, report.proofReel);

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobilePage.waitForSelector("#skypayForm", { timeout: 15000 });
  const mobileShot = path.join(artifactDir, "live-skyepay-mobile.png");
  await mobilePage.screenshot({ path: mobileShot, fullPage: true });
  report.screenshots.mobile = mobileShot;
  report.checks.mobile = {
    ok: await mobilePage.locator("#checkoutBtn").isVisible(),
    overflow: await noHorizontalOverflow(mobilePage)
  };
  await mobile.close();
  await browser.close();

  report.ok = report.checks.appLoaded.ok &&
    !report.checks.appLoaded.overflow.overflow &&
    report.checks.store.ok &&
    report.checks.store.offerCount >= 60 &&
    report.checks.store.hasVaultOffer &&
    report.checks.store.zeroUpfrontShown &&
    !report.checks.store.overflow.overflow &&
    report.checks.repoStripeCatalog.ok &&
    report.checks.checkoutCreated.ok &&
    report.checks.productionStatus.ok &&
    report.checks.videoPlayback.ok &&
    report.checks.mobile.ok &&
    !report.checks.mobile.overflow.overflow &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0;
  report.consoleErrors = consoleErrors;
  report.pageErrors = pageErrors;

  const reportPath = path.join(artifactDir, "skyepay-live-production-proof.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: report.ok,
    reportPath,
    screenshots: report.screenshots,
    video: report.video,
    checkout: report.checks.checkoutCreated,
    status: report.checks.productionStatus
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
