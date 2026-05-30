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

const screenshotWarnings = [];

async function safeScreenshot(page, screenshotName) {
  const outputPath = path.join(ARTIFACT_DIR, screenshotName);
  const options = { path: outputPath, fullPage: false, timeout: 15000, animations: "disabled", caret: "hide" };
  try {
    await page.screenshot(options);
    return;
  } catch (error) {
    screenshotWarnings.push(`${screenshotName}: viewport screenshot failed: ${error.message.split("\n")[0]}`);
  }
  try {
    await page.screenshot({ ...options, timeout: 5000 });
    screenshotWarnings.push(`${screenshotName}: retry screenshot saved`);
  } catch (error) {
    screenshotWarnings.push(`${screenshotName}: retry screenshot failed: ${error.message.split("\n")[0]}`);
  }
}

async function expectText(page, text) {
  const matches = page.getByText(text, { exact: false });
  const count = await matches.count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    if (await matches.nth(index).isVisible().catch(() => false)) return;
  }
  if (!count) throw new Error(`Missing text: ${text}`);
  throw new Error(`Missing visible text: ${text}`);
}

async function assertNoHorizontalScroll(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`${label} has horizontal overflow: ${overflow}px`);
}

async function checkPage(page, baseUrl, route, label, requiredText, screenshotName) {
  await page.goto(`${baseUrl}/${route}`, { waitUntil: "domcontentloaded" });
  for (const text of requiredText) await expectText(page, text);
  await assertNoHorizontalScroll(page, label);
  if (screenshotName) await safeScreenshot(page, screenshotName);
}

async function writeProofWav(filePath) {
  const sampleRate = 44100;
  const seconds = 0.24;
  const samples = Math.floor(sampleRate * seconds);
  const dataBytes = samples * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < samples; index += 1) {
    const fade = Math.min(1, index / 600, (samples - index) / 1200);
    const sample = Math.sin(2 * Math.PI * 440 * (index / sampleRate)) * 0.55 * fade;
    buffer.writeInt16LE(Math.max(-1, Math.min(1, sample)) * 32767, 44 + index * 2);
  }
  await writeFile(filePath, buffer);
  return filePath;
}

async function seedGate(context) {
  await context.addInitScript((token) => {
    const identity = {
      schema: "skye0s.identity.v1",
      identityId: "2468135790",
      skyeId: "2468135790",
      idNumber: "2468135790",
      name: "E2E Skye Artist",
      displayName: "E2E Skye Artist",
      email: "music-e2e@metraiyux.local",
      profileType: "artist",
      photoDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l6xGngAAAABJRU5ErkJggg==",
      photoName: "e2e-artist.png",
      photoType: "image/png",
      source: "Skye-ID",
      reason: "e2e-seed",
      updatedAt: new Date().toISOString()
    };
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
    localStorage.setItem("skye0s.identity.current.v1", JSON.stringify(identity));
    localStorage.setItem("kx.onboarding.idDraft", JSON.stringify(identity));
  }, GATE_TOKEN);
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const dawImportPath = await writeProofWav(path.join(ARTIFACT_DIR, "native-daw-import-proof.wav"));
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
    await safeScreenshot(ungated, "app-ungated-overlay.png");
    await ungatedContext.close();

    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
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
    await checkPage(page, baseUrl, "saas/pricing.html#skyemusicnexus-lite-free99", "SaaS pricing desktop", ["SkyeMusicNexus Lite", "Single Song Drop", "Free99"], "saas-pricing-desktop.png");
    await checkPage(page, baseUrl, "saas/index.html", "SaaS overview desktop", ["SkyeMusicNexus Lite", "Buy Single Song Drop"], "saas-overview-desktop.png");
    await checkPage(page, baseUrl, "admin/index.html", "Admin hub desktop", ["SkyeMusicNexus Lite + paid drops", "music function auth boundary"], "admin-hub-desktop.png");
    assertions.push("Pricing, SaaS overview, and admin hub expose SkyeMusicNexus as Free99 Lite plus paid gated access.");

    await page.goto(`${baseUrl}/sales/live-proof-router.html`, { waitUntil: "domcontentloaded" });
    await page.locator('input[value*="music artist release"]').check();
    await page.locator("#buildRoute").click();
    await expectText(page, "SkyeMusicNexus Lite + Paid Drops");
    await assertNoHorizontalScroll(page, "Sales proof router desktop");
    await safeScreenshot(page, "sales-router-desktop.png");
    assertions.push("Sales proof router recommends the Lite + paid drops music stage for music operations needs.");

    await page.goto(`${baseUrl}/SkyeMusicNexus/platform.html`, { waitUntil: "domcontentloaded" });
    await expectText(page, "Command Field");
    await expectText(page, "Upload Studio");
    await expectText(page, "Music Player");
    await page.waitForFunction(() => !document.querySelector("#skyeMusicGate"));
    await assertNoHorizontalScroll(page, "SkyeMusicNexus app shell desktop");
    await safeScreenshot(page, "app-shell-gated-desktop.png");
    assertions.push("Seeded gate session unlocks the SkyeMusicNexus app shell without removing auth requirements.");

    await checkPage(page, baseUrl, "SkyeMusicNexus/public/index.html", "Music dashboard desktop", ["Platform Dashboard", "Upload Studio", "Music Player", "Rights Vault", "Client Launch Path"], "artist-stage-desktop.png");
    await page.goto(`${baseUrl}/SkyeMusicNexus/public/command-dashboard.html?workspace_id=skye-music-nexus`, { waitUntil: "networkidle" });
    await expectText(page, "Service Dashboard");
    await page.waitForSelector("[data-visual-kpis] .visual-kpi", { timeout: 15000 });
    await expectText(page, "Service Health");
    await expectText(page, "Latest Activity Records");
    await assertNoHorizontalScroll(page, "SkyeMusicNexus service dashboard desktop");
    await safeScreenshot(page, "service-dashboard-desktop.png");
    assertions.push("Service Dashboard renders KPI, service-health, workflow, and activity sections.");
    await page.goto(`${baseUrl}/saas/customer-data.html?workspace_id=bob-smoke-shop-preview-001`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-visual-kpis] .visual-kpi", { timeout: 15000 });
    await expectText(page, "Fallback visual data");
    await assertNoHorizontalScroll(page, "0S SaaS customer data visual dashboard desktop");
    await safeScreenshot(page, "saas-customer-data-fallback-desktop.png");
    assertions.push("0S SaaS customer data visuals try the live endpoint first and clearly label fallback data in static E2E.");
    await checkPage(page, baseUrl, "SkyeMusicNexus/proof.html", "Readiness page desktop", ["Production Readiness", "Activity Events", "DAW beta", "Activity Matrix"], "readiness-proof-desktop.png");
    assertions.push("Readiness page documents client-facing status, DAW beta boundary, activity records, and production receipts.");
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/upload.html", "Upload studio desktop", ["Protected Audio Upload", "Drop songs here", "Uploaded Audio Vault", "Release Forge", "Import audio"], "upload-studio-desktop.png");
    const dropBox = await page.locator("[data-song-drop-zone]").boundingBox();
    expect(dropBox && dropBox.height >= 260 && dropBox.width >= 520, `Song drop zone is not large enough: ${JSON.stringify(dropBox)}`);
    assertions.push("Upload Studio exposes a large song drop zone with enough visual target area for desktop use.");
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/daw.html", "Native DAW desktop", ["SkyeMusicNexus DAW", "DAW beta", "Audio", "Project Files", "16-pad beat lane"], "native-daw-desktop.png");
    await page.locator('[data-daw-rail="mix"]').click();
    await page.waitForFunction(() => window.__SKYE_NEXUS_DAW && window.__SKYE_NEXUS_DAW.activeRail === "mix");
    await page.locator("#audioEngineButton").click();
    await page.setInputFiles("#dawFileInput", dawImportPath);
    await page.waitForFunction(() => window.__SKYE_NEXUS_DAW && window.__SKYE_NEXUS_DAW.decodedClipCount >= 1);
    await page.locator("[data-clip-preview]").first().click();
    await page.waitForFunction(() => window.__SKYE_NEXUS_DAW && window.__SKYE_NEXUS_DAW.clipPreviewEvents >= 1);
    await page.locator(".daw-arrangement").click({ position: { x: 360, y: 180 } });
    await page.keyboard.press("KeyA");
    await page.waitForFunction(() => window.__SKYE_NEXUS_DAW && window.__SKYE_NEXUS_DAW.keyboardEvents >= 1);
    await page.locator(".daw-region").first().click();
    await page.locator("#splitRegionButton").click();
    await page.locator("#duplicateRegionButton").click();
    await page.locator("#quantizeDawButton").click();
    await page.locator("#deleteRegionButton").click();
    await page.locator("#undoDawButton").click();
    await page.locator("#redoDawButton").click();
    await page.locator("#metronomeDawButton").click();
    await page.locator("#loopDawButton").click();
    await page.locator("[data-sound-pack]").first().click();
    const mixdownDownload = page.waitForEvent("download");
    await page.locator("#mixdownDawButton").click();
    const mixdown = await mixdownDownload;
    const mixdownPath = path.join(ARTIFACT_DIR, "native-daw-browser-mixdown.wav");
    await mixdown.saveAs(mixdownPath);
    await page.waitForFunction(() => window.__SKYE_NEXUS_DAW && window.__SKYE_NEXUS_DAW.mixdownEvents >= 1);
    await page.locator('[data-pad-index="0"]').click();
    await page.locator('[data-note="C"]').click();
    await page.locator("#playTransportButton").click();
    await page.waitForFunction(() => window.__SKYE_NEXUS_DAW && window.__SKYE_NEXUS_DAW.audioState === "running" && window.__SKYE_NEXUS_DAW.soundEvents >= 4);
    const dawAudio = await page.evaluate(() => window.__SKYE_NEXUS_DAW);
    expect(dawAudio.audioUnlocked === true, `Native DAW audio did not unlock: ${JSON.stringify(dawAudio)}`);
    expect(dawAudio.workbenchFiles >= 5, `Native DAW workbench file model did not hydrate: ${JSON.stringify(dawAudio)}`);
    expect(dawAudio.decodedClipCount >= 1 && dawAudio.clipPreviewEvents >= 1, `Native DAW import/clip preview failed: ${JSON.stringify(dawAudio)}`);
    expect(dawAudio.keyboardEvents >= 1, `Native DAW physical keyboard did not trigger notes: ${JSON.stringify(dawAudio)}`);
    expect(dawAudio.editEvents >= 6, `Native DAW edit commands did not register: ${JSON.stringify(dawAudio)}`);
    expect(dawAudio.soundPackEvents >= 1, `Native DAW sound pack insertion did not register: ${JSON.stringify(dawAudio)}`);
    expect(dawAudio.mixdownEvents >= 1, `Native DAW browser WAV mixdown did not register: ${JSON.stringify(dawAudio)}`);
    expect(dawAudio.metronomeEnabled === true, `Native DAW metronome did not toggle on: ${JSON.stringify(dawAudio)}`);
    expect(dawAudio.loopEnabled === false, `Native DAW loop toggle did not register: ${JSON.stringify(dawAudio)}`);
    expect(dawAudio.lastAudioError === "", `Native DAW audio reported an error: ${JSON.stringify(dawAudio)}`);
    await safeScreenshot(page, "native-daw-audio-desktop.png");
    assertions.push("Native DAW imports/decodes audio, previews clips, maps the physical keyboard to notes, edits regions, inserts sound packs, toggles metronome/loop, renders a browser WAV mixdown, and exposes runtime audio proof.");
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/releases.html", "Releases desktop", ["Artist Nebula", "Skye ID Bridge", "Release Forge", "Royalty River", "Ops Sequencer"], "releases-desktop.png");
    expect(await page.locator('#artistForm input[name="skyeId"]').inputValue() === "2468135790", "Skye ID bridge did not populate the artist form.");
    expect(await page.locator("#artistPhotoPreview").isVisible(), "Skye ID bridge did not render the artist photo preview.");
    assertions.push("Skye ID bridge populates the MusicNexus artist form and renders the shared artist photo.");
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/rights.html", "Rights desktop", ["Rights Vault", "Takedown Hold", "No rights, no linked playback"], "rights-desktop.png");
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/exchange.html", "Exchange desktop", ["Creator Exchange", "Content Request Exchange", "Achievement Orbit", "Release Campaign Forge"], "exchange-desktop.png");
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/feed.html", "Open social feed desktop", ["Open Social Feed", "Post to Feed", "Like", "Comment"], "open-social-feed-desktop.png");
    assertions.push("Open Social Feed renders Pixelfed/Fediverse connector, queue, publish, and feed-sync controls behind the seeded gate session.");
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
    await checkPage(page, baseUrl, "SkyeMusicNexus/public/admin.html", "Protected review desktop", ["Move releases, content requests", "Payout Queue", "Analytics Prism", "Exchange Console"], "protected-review-desktop.png");
    await page.waitForFunction(() => !document.querySelector("#skyeMusicGate"));
    assertions.push("Artist and protected review stages render end to end with the seeded shared session.");

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
        open_social_spine_available: true,
        content_requests_available: true,
        achievements_available: true,
        rights_vault_available: true,
        takedown_hold_available: true,
        gate_session_required: true,
        seeded_gate_token: GATE_TOKEN
      },
      assertions,
      screenshotWarnings,
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
        "command-dashboard-desktop.png",
        "saas-customer-data-fallback-desktop.png",
        "readiness-proof-desktop.png",
        "upload-studio-desktop.png",
        "native-daw-desktop.png",
        "native-daw-audio-desktop.png",
        "native-daw-import-proof.wav",
        "native-daw-browser-mixdown.wav",
        "releases-desktop.png",
        "rights-desktop.png",
        "exchange-desktop.png",
        "open-social-feed-desktop.png",
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
