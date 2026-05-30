import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.GRAY_ARTIST_BASE_URL || "http://127.0.0.1:5199/";
const root = path.resolve(new URL("..", import.meta.url).pathname);
const repoRoot = path.resolve(root, "..", "..");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(repoRoot, "test-artifacts", "gray-skyes-agent-universe-local", stamp);
fs.mkdirSync(artifactDir, { recursive: true });

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 }
];

function pageUrl(route = "") {
  return new URL(route, baseUrl).toString();
}

async function pause(ms = 700) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeScreenshot(page, filePath) {
  try {
    await page.screenshot({ path: filePath, fullPage: false, timeout: 15000 });
    return { ok: true, path: filePath };
  } catch (error) {
    return { ok: false, path: filePath, error: error.message };
  }
}

const receipt = {
  schema: "gray-skyes.local-proof.v1",
  generatedAt: new Date().toISOString(),
  baseUrl,
  artifactDir,
  checks: [],
  failures: []
};

const browser = await chromium.launch();

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  const requestFailures = [];
  const badResponses = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "";
    if (!failure.includes("ERR_ABORTED")) {
      requestFailures.push({ url: request.url(), failure });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      badResponses.push({ url: response.url(), status: response.status() });
    }
  });

  await page.goto(pageUrl(), { waitUntil: "commit", timeout: 30000 });
  let heroReady = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    heroReady = await page.evaluate(() => window.GRAY_SKYES_SUPABOY_PARITY_HERO?.stageCanvas === true).catch(() => false);
    if (heroReady) break;
    await pause(1000);
  }
  await pause(1200);

  const landing = await page.evaluate(() => {
    const hero = document.querySelector(".gray-supaboy-hero");
    const canvas = document.querySelector(".gray-supaboy-hero canvas");
    const cards = Array.from(document.querySelectorAll(".orbit-picture-card"));
    const dock = Array.from(document.querySelectorAll(".artist-room-dock button")).map((node) => node.textContent.trim());
    const videos = document.querySelectorAll("main video").length;
    const iframes = document.querySelectorAll("main iframe").length;
    return {
      hasHero: !!hero,
      canvas: !!canvas,
      canvasBox: canvas ? canvas.getBoundingClientRect().toJSON() : null,
      orbitCards: cards.length,
      dock,
      videos,
      iframes,
      flag: window.GRAY_SKYES_SUPABOY_PARITY_HERO || null,
      heroReady: window.GRAY_SKYES_SUPABOY_PARITY_HERO?.stageCanvas === true,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth
    };
  });

  for (const label of ["Hero", "Videos", "Release", "Live", "Vault"]) {
    const clicked = await page.evaluate((expected) => {
      const button = Array.from(document.querySelectorAll(".artist-room-dock button"))
        .find((node) => node.textContent.trim() === expected);
      button?.click();
      return !!button;
    }, label);
    if (!clicked) {
      receipt.failures.push(`${viewport.name}: missing dock button ${label}`);
      continue;
    }
    await pause(250);
    const activeLabel = await page.evaluate(() => document.querySelector(".artist-room-dock button.is-active")?.textContent?.trim() || "");
    if (activeLabel !== label) receipt.failures.push(`${viewport.name}: dock button ${label} did not activate, active=${activeLabel}`);
  }
  await page.evaluate(() => {
    const spin = Array.from(document.querySelectorAll(".gray-supaboy-hero .stage-controls button"))
      .find((node) => node.textContent.trim() === "Spin");
    spin?.click();
  });
  const spinClass = await page.locator(".orbit-picture-belt").first().getAttribute("class");

  const landingShot = path.join(artifactDir, `${viewport.name}-landing.png`);
  const landingScreenshot = await safeScreenshot(page, landingShot);

  await page.goto(pageUrl("orbit.html"), { waitUntil: "commit", timeout: 30000 });
  await page.waitForSelector(".song-orb", { timeout: 20000 });
  const orbitCount = await page.locator(".song-orb").count();
  await page.locator("#orbitNext").click();
  await pause(300);
  const orbitTitle = await page.locator("#orbitTitle").innerText();
  const orbitShot = path.join(artifactDir, `${viewport.name}-orbit.png`);
  const orbitScreenshot = await safeScreenshot(page, orbitShot);

  await page.goto(pageUrl("hero-video-universe.html"), { waitUntil: "commit", timeout: 30000 });
  await page.waitForSelector(".video-float-card", { timeout: 20000 });
  const videoCards = await page.locator(".video-float-card").count();
  await page.locator("#videoNext").click();
  await pause(300);
  const heroVideoTitle = await page.locator("#heroStageTitle").innerText();

  await page.goto(pageUrl("field-notes.html"), { waitUntil: "commit", timeout: 30000 });
  await page.waitForSelector("#postGrid .post-card", { timeout: 20000 });
  const postCards = await page.locator("#postGrid .post-card").count();
  const fieldShot = path.join(artifactDir, `${viewport.name}-field-notes.png`);
  const fieldScreenshot = await safeScreenshot(page, fieldShot);

  const viewportFailures = [];
  if (!heroReady || !landing.hasHero || !landing.canvas) viewportFailures.push("landing hero/canvas missing or runtime flag not ready");
  if (landing.orbitCards !== 5) viewportFailures.push(`expected 5 landing orbit cards, got ${landing.orbitCards}`);
  if (landing.videos !== 0 || landing.iframes !== 0) viewportFailures.push(`landing loaded videos=${landing.videos} iframes=${landing.iframes}`);
  if (landing.bodyWidth > landing.viewportWidth + 2) viewportFailures.push(`horizontal overflow ${landing.bodyWidth} > ${landing.viewportWidth}`);
  if (orbitCount !== 16) viewportFailures.push(`expected 16 song orbs, got ${orbitCount}`);
  if (videoCards !== 9) viewportFailures.push(`expected 9 hero video cards, got ${videoCards}`);
  if (postCards !== 4) viewportFailures.push(`expected 4 field note posts, got ${postCards}`);
  for (const shot of [landingScreenshot, orbitScreenshot, fieldScreenshot]) {
    if (!shot.ok) viewportFailures.push(`screenshot failed for ${path.basename(shot.path)}: ${shot.error}`);
  }
  if (consoleErrors.length) viewportFailures.push(`console errors: ${consoleErrors.join(" | ")}`);
  if (requestFailures.length) viewportFailures.push(`request failures: ${JSON.stringify(requestFailures)}`);
  if (badResponses.length) viewportFailures.push(`bad responses: ${JSON.stringify(badResponses)}`);

  receipt.checks.push({
    viewport,
    landing,
    spinClass,
    orbitCount,
    orbitTitle,
    videoCards,
    heroVideoTitle,
    postCards,
    screenshots: [landingScreenshot, orbitScreenshot, fieldScreenshot],
    consoleErrors,
    requestFailures,
    badResponses,
    failures: viewportFailures
  });
  receipt.failures.push(...viewportFailures.map((failure) => `${viewport.name}: ${failure}`));

  await context.close();
}

await browser.close();

receipt.ok = receipt.failures.length === 0;
const receiptPath = path.join(artifactDir, "receipt.json");
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ ok: receipt.ok, receiptPath, failures: receipt.failures }, null, 2));
process.exit(receipt.ok ? 0 : 1);
