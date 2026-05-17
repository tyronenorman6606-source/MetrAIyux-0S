import { createServer } from "node:http";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const SITE_ROOT = path.resolve(path.dirname(__filename), "..");
const REPO_ROOT = path.resolve(SITE_ROOT, "..");
const ARTIFACT_DIR = path.resolve(REPO_ROOT, "test-artifacts", "skyemusicnexus-exchange-video");
const PUBLIC_PROOF_DIR = path.resolve(SITE_ROOT, "assets", "proof");
const VIDEO_NAME = "skyemusicnexus-exchange-e2e.webm";
const POSTER_NAME = "skyemusicnexus-exchange-e2e-poster.png";
const GATE_TOKEN = "skyemusic-video-gate-session";

const TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webm", "video/webm"],
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

async function seedGate(context) {
  await context.addInitScript((token) => {
    const session = {
      token,
      source: "skyemusicnexus-video-proof",
      client: "MetrAIyux 0S Exchange Video Proof",
      status: "free99_gate_session",
      issued_at: new Date().toISOString(),
    };
    sessionStorage.setItem("SKYE_MUSIC_NEXUS_GATE_SESSION", JSON.stringify(session));
    sessionStorage.setItem("skye_music_nexus_session", token);
    localStorage.setItem("saas_client_session", JSON.stringify({
      token,
      workspace_id: "skyemusicnexus-video-proof",
      client: "MetrAIyux 0S Exchange Video Proof",
      email: "music-video@metraiyux.local",
      status: "active",
    }));
  }, GATE_TOKEN);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  await mkdir(PUBLIC_PROOF_DIR, { recursive: true });
  const { server, baseUrl } = await startStaticServer(SITE_ROOT);
  const browser = await chromium.launch({ headless: true });
  let videoAssetPath = "";
  const pageErrors = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: ARTIFACT_DIR, size: { width: 1280, height: 720 } },
    });
    await seedGate(context);
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(`${baseUrl}/SkyeMusicNexus/public/index.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !document.querySelector("#skyeMusicGate"));
    await page.getByRole("button", { name: /Content Requests/i }).click();
    await page.getByRole("button", { name: /Community Relay/i }).click();
    await page.getByRole("button", { name: /Achievement Orbit/i }).click();
    await page.locator("#creatorExchange").scrollIntoViewIfNeeded();
    await page.locator('input[name="artistId"]').first().fill("video-proof-artist");
    await page.locator('input[name="title"]').first().fill("Video proof release content");
    await page.locator('textarea[name="brief"]').first().fill("Record the gated artist exchange, content request surface, inbox, community, and progression path.");
    await page.screenshot({ path: path.join(PUBLIC_PROOF_DIR, POSTER_NAME), fullPage: false });

    await page.goto(`${baseUrl}/SkyeMusicNexus/public/admin.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !document.querySelector("#skyeMusicGate"));
    await page.locator(".exchange-command").scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    const video = page.video();
    await page.close();
    const rawVideo = await video.path();
    videoAssetPath = path.join(PUBLIC_PROOF_DIR, VIDEO_NAME);
    await copyFile(rawVideo, videoAssetPath);
    await context.close();

    const playback = await browser.newPage({ viewport: { width: 900, height: 600 } });
    await playback.setContent(`<video id="proofVideo" src="${baseUrl}/assets/proof/${VIDEO_NAME}" muted autoplay loop playsinline controls style="width:720px;max-width:100%"></video>`, {
      waitUntil: "domcontentloaded",
      timeout: 5000,
    });
    await playback.waitForFunction(async () => {
      const videoEl = document.getElementById("proofVideo");
      if (!videoEl) return false;
      await videoEl.play().catch(() => {});
      return videoEl.readyState >= 2 && videoEl.currentTime >= 0 && !videoEl.paused && videoEl.getBoundingClientRect().width > 0;
    });
    const playbackState = await playback.evaluate(() => {
      const videoEl = document.getElementById("proofVideo");
      return {
        readyState: videoEl.readyState,
        currentTime: videoEl.currentTime,
        paused: videoEl.paused,
        visibleWidth: videoEl.getBoundingClientRect().width,
      };
    });
    await playback.close();

    assert(pageErrors.length === 0, `Browser page errors:\n${pageErrors.join("\n")}`);
    const report = {
      ok: true,
      app: "SkyeMusicNexus",
      checkedAt: new Date().toISOString(),
      video: `assets/proof/${VIDEO_NAME}`,
      poster: `assets/proof/${POSTER_NAME}`,
      playbackState,
      claims: [
        "seeded gate session unlocks the artist exchange",
        "artist stage shows content request, inbox, community, and achievement surfaces",
        "operator stage shows the exchange console",
      ],
    };
    await writeFile(path.join(ARTIFACT_DIR, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
