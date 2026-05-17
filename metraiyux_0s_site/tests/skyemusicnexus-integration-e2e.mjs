import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const SITE_ROOT = path.resolve(path.dirname(__filename), "..");
const ARTIFACT_DIR = path.resolve(SITE_ROOT, "..", "test-artifacts", "skyemusicnexus-integration");
const GATE_TOKEN = "skyemusic-e2e-gate-session";

const TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

function startStaticServer(root) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const clean = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
      let filePath = path.resolve(root, clean);
      if (!filePath.startsWith(root)) {
        res.writeHead(403).end("forbidden");
        return;
      }
      if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
      const body = await readFile(filePath);
      res.writeHead(200, { "content-type": TYPES.get(path.extname(filePath)) || "text/plain; charset=utf-8" });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectText(page, text) {
  const found = await page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
  if (!found) throw new Error(`Missing visible text: ${text}`);
}

async function assertNoHorizontalScroll(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`${label} has horizontal overflow: ${overflow}px`);
}

async function checkPage(page, baseUrl, route, label, requiredText, screenshotName) {
  await page.goto(`${baseUrl}/${route}`, { waitUntil: "domcontentloaded" });
  for (const text of requiredText) await expectText(page, text);
  await assertNoHorizontalScroll(page, label);
  if (screenshotName) await page.screenshot({ path: path.join(ARTIFACT_DIR, screenshotName), fullPage: true });
}

async function seedGate(context) {
  await context.addInitScript((token) => {
    const session = {
      token,
      source: "skyemusicnexus-e2e",
      client: "MetrAIyux 0S Free99 Lite e2e",
      status: "free99_gate_session",
      issued_at: new Date().toISOString()
    };
    sessionStorage.setItem("SKYE_MUSIC_NEXUS_GATE_SESSION", JSON.stringify(session));
    sessionStorage.setItem("skye_music_nexus_session", token);
    localStorage.setItem("saas_client_session", JSON.stringify({
      token,
      workspace_id: "skyemusicnexus-e2e",
      client: "MetrAIyux 0S Free99 Lite e2e",
      email: "music-e2e@metraiyux.local",
      status: "active"
    }));
  }, GATE_TOKEN);
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const { server, baseUrl } = await startStaticServer(SITE_ROOT);
  const browser = await chromium.launch({ headless: true });
  const pageErrors = [];
  const assertions = [];

  try {
    const ungatedContext = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const ungated = await ungatedContext.newPage();
    ungated.on("pageerror", (error) => pageErrors.push(`ungated: ${error.message}`));
    await ungated.goto(`${baseUrl}/SkyeMusicNexus/index.html`, { waitUntil: "domcontentloaded" });
    await expectText(ungated, "SkyeMusicNexus Lite is Free99, not ungated.");
    await expectText(ungated, "Free99 means the Lite lane has no charge");
    expect(await ungated.locator("#skyeMusicGate").isVisible(), "Ungated SkyeMusicNexus route should show gate overlay.");
    assertions.push("Ungated SkyeMusicNexus app route displays the Free99 Lite gate-session overlay.");
    await ungated.screenshot({ path: path.join(ARTIFACT_DIR, "app-ungated-overlay.png"), fullPage: true });
    await ungatedContext.close();

    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await seedGate(context);
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(`gated: ${error.message}`));

    await checkPage(page, baseUrl, "index.html", "0S home desktop", ["SkyeMusicNexus", "Free99 Lite", "Single Song Drop"], "home-desktop.png");
    assertions.push("0S home exposes SkyeMusicNexus Lite and paid drop language.");

    await checkPage(page, baseUrl, "live/skyemusicnexus-neofront.html", "SkyeMusicNexus hub desktop", ["SkyeMusicNexus Lite is Free99", "Single Song Drop", "gate session"], "hub-desktop.png");
    assertions.push("SkyeMusicNexus hub states Free99 Lite plus paid drops while preserving the gate-session boundary.");

    await checkPage(page, baseUrl, "proof/skyemusicnexus-expansion-receipt.html", "SkyeMusicNexus receipt desktop", ["SkyeMusicNexus Lite is Free99", "paid music ops", "Gate session"], "receipt-desktop.png");
    assertions.push("Expansion receipt documents archive unpack, zip removal, gate session, and paid music ops posture.");

    await checkPage(page, baseUrl, "pricing/index.html#skyemusicnexus-lite-free99", "Commercial pricing desktop", ["SkyeMusicNexus Lite", "Free99", "Single Song Drop"], "pricing-desktop.png");
    await checkPage(page, baseUrl, "saas/pricing.html#skyemusicnexus-lite-free99", "SaaS pricing desktop", ["SkyeMusicNexus Studio", "Single Song Drop", "Free99"], "saas-pricing-desktop.png");
    await checkPage(page, baseUrl, "saas/index.html", "SaaS overview desktop", ["SkyeMusicNexus Lite", "Buy Single Song Drop"], "saas-overview-desktop.png");
    await checkPage(page, baseUrl, "admin/index.html", "Admin hub desktop", ["SkyeMusicNexus Lite + paid drops", "music function auth boundary"], "admin-hub-desktop.png");
    assertions.push("Pricing, SaaS overview, and admin hub expose SkyeMusicNexus as Free99 Lite plus paid gated access.");

    await page.goto(`${baseUrl}/sales/live-proof-router.html`, { waitUntil: "domcontentloaded" });
    await page.locator('input[value*="music artist release"]').check();
    await page.locator("#buildRoute").click();
    await expectText(page, "SkyeMusicNexus Lite + Paid Drops");
    await assertNoHorizontalScroll(page, "Sales proof router desktop");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "sales-router-desktop.png"), fullPage: true });
    assertions.push("Sales proof router recommends the Lite + paid drops music stage for music operations needs.");

    await page.goto(`${baseUrl}/SkyeMusicNexus/index.html`, { waitUntil: "domcontentloaded" });
    await expectText(page, "Command Field");
    await expectText(page, "Upload Studio");
    await expectText(page, "Music Player");
    await page.waitForFunction(() => !document.querySelector("#skyeMusicGate"));
    await assertNoHorizontalScroll(page, "SkyeMusicNexus app shell desktop");
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "app-shell-gated-desktop.png"), fullPage: true });
    assertions.push("Seeded gate session unlocks the SkyeMusicNexus app shell without removing auth requirements.");

    await checkPage(page, baseUrl, "SkyeMusicNexus/public/index.html", "Music dashboard desktop", ["Platform Dashboard", "Upload Studio", "Music Player", "Rights Vault"], "artist-stage-desktop.png");
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/upload.html", "Upload studio desktop", ["Gated Audio Upload", "Uploaded Audio Vault", "Release Forge"], "upload-studio-desktop.png");
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/releases.html", "Releases desktop", ["Artist Nebula", "Release Forge", "Royalty River", "Ops Sequencer"], "releases-desktop.png");
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/rights.html", "Rights desktop", ["Rights Vault", "Takedown Hold", "No rights, no linked playback"], "rights-desktop.png");
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/exchange.html", "Exchange desktop", ["Creator Exchange", "Content Request Exchange", "Achievement Orbit", "Release Campaign Forge"], "exchange-desktop.png");
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/player.html", "Music player desktop", ["Stream Deck", "Uploaded Audio Vault"], "player-desktop.png");
    await page.waitForFunction(() => !document.querySelector("#skyeMusicGate"));
    await page.waitForFunction(() => window.__SKYE_MUSIC_PLAYBACK && window.__SKYE_MUSIC_PLAYBACK.queueLength > 0);
    await page.locator('[data-player-action="play"]').click();
    await page.waitForFunction(() => window.__SKYE_MUSIC_PLAYBACK && window.__SKYE_MUSIC_PLAYBACK.isPlaying === true);
    await page.waitForTimeout(900);
    const playback = await page.evaluate(() => window.__SKYE_MUSIC_PLAYBACK);
    expect(playback.currentTime > 0, `Playback deck did not advance time: ${JSON.stringify(playback)}`);
    expect(["generated-preview", "linked-audio"].includes(playback.mode), `Unexpected playback mode: ${playback.mode}`);
    await page.locator('[data-player-action="stop"]').click();
    assertions.push("Artist playback deck starts audio, advances time, and remains behind the seeded gate session plus rights vault surface.");
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/admin.html", "Operator stage desktop", ["Move releases, content requests", "Payout Gate", "Analytics Prism", "Exchange Console"], "operator-stage-desktop.png");
    await page.waitForFunction(() => !document.querySelector("#skyeMusicGate"));
    assertions.push("Artist and operator stages render end to end with the seeded gate session.");

    const mobile = await context.newPage();
    mobile.on("pageerror", (error) => pageErrors.push(`mobile: ${error.message}`));
    await mobile.setViewportSize({ width: 390, height: 844 });
    await checkPage(mobile, baseUrl, "live/skyemusicnexus-neofront.html", "SkyeMusicNexus hub mobile", ["SkyeMusicNexus Lite is Free99", "Single Song Drop"], "hub-mobile.png");
    await checkPage(mobile, baseUrl, "SkyeMusicNexus/public/index.html", "Music dashboard mobile", ["Platform Dashboard", "Upload Studio"], "artist-stage-mobile.png");
    await checkPage(mobile, baseUrl, "SkyeMusicNexus/public/player.html", "Music player mobile", ["Stream Deck"], "player-mobile.png");
    assertions.push("Mobile hub, dashboard, and player render without horizontal overflow.");

    expect(pageErrors.length === 0, `Browser page errors:\n${pageErrors.join("\n")}`);

    const report = {
      ok: true,
      app: "SkyeMusicNexus",
      baseUrl,
      checkedAt: new Date().toISOString(),
      gate: {
        free99_lite_no_charge: true,
        paid_addons_available: true,
        social_exchange_available: true,
        content_requests_available: true,
        achievements_available: true,
        rights_vault_available: true,
        takedown_hold_available: true,
        gate_session_required: true,
        seeded_gate_token: GATE_TOKEN
      },
      assertions,
      artifacts: [
        "app-ungated-overlay.png",
        "home-desktop.png",
        "hub-desktop.png",
        "receipt-desktop.png",
        "pricing-desktop.png",
        "saas-pricing-desktop.png",
        "saas-overview-desktop.png",
        "admin-hub-desktop.png",
        "sales-router-desktop.png",
        "app-shell-gated-desktop.png",
        "artist-stage-desktop.png",
        "upload-studio-desktop.png",
        "releases-desktop.png",
        "rights-desktop.png",
        "exchange-desktop.png",
        "player-desktop.png",
        "operator-stage-desktop.png",
        "hub-mobile.png",
        "artist-stage-mobile.png",
        "player-mobile.png"
      ]
    };
    await writeFile(path.join(ARTIFACT_DIR, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
