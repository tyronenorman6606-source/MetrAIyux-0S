import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const assetsDir = path.join(root, "assets");
const tmpDir = path.join(root, "proof", "videos", ".skyemail-logo-loop");
const outputVideo = path.join(assetsDir, "skyemail-logo-loop.webm");
const outputPoster = path.join(assetsDir, "skyemail-logo-loop-poster.png");
const width = 1280;
const height = 720;
const durationMs = 8000;

function assetUrl(name) {
  const filePath = path.join(assetsDir, name);
  const ext = path.extname(name).toLowerCase();
  const mime = ext === ".svg" ? "image/svg+xml" : "image/png";
  return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });

const stageHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    html, body {
      width: ${width}px;
      height: ${height}px;
      margin: 0;
      overflow: hidden;
      background: #030605;
    }
    body {
      position: relative;
      font-family: Inter, Arial, sans-serif;
      color: #f6fff9;
      background:
        radial-gradient(circle at 50% 46%, rgba(79, 250, 204, .24), transparent 0 15%, transparent 31%),
        radial-gradient(circle at 20% 12%, rgba(67, 217, 255, .26), transparent 0 24%, transparent 42%),
        radial-gradient(circle at 84% 22%, rgba(255, 209, 102, .22), transparent 0 24%, transparent 48%),
        linear-gradient(135deg, #030605 0%, #07100e 48%, #161009 72%, #050807 100%);
    }
    body::before {
      content: "";
      position: absolute;
      inset: -20%;
      background:
        linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px),
        linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px);
      background-size: 58px 58px;
      transform: rotate(-9deg);
      opacity: .4;
      animation: gridDrift 8s linear infinite;
    }
    body::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at center, transparent 0 42%, rgba(0,0,0,.48) 78%, rgba(0,0,0,.86)),
        repeating-linear-gradient(180deg, rgba(255,255,255,.035) 0 1px, transparent 1px 7px);
      mix-blend-mode: screen;
      opacity: .72;
    }
    .stage {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      isolation: isolate;
    }
    .aura {
      position: absolute;
      width: 760px;
      height: 760px;
      border-radius: 50%;
      border: 1px solid rgba(121, 255, 226, .2);
      box-shadow:
        0 0 90px rgba(67, 217, 255, .14),
        inset 0 0 80px rgba(255, 209, 102, .08);
      animation: breathe 4s cubic-bezier(.16,1,.3,1) infinite;
    }
    .ring {
      position: absolute;
      border-radius: 50%;
      border: 2px solid transparent;
      background:
        linear-gradient(#030605, #030605) padding-box,
        conic-gradient(from 0deg, rgba(255,209,102,.05), rgba(67,217,255,.74), rgba(90,242,180,.48), rgba(255,209,102,.72), rgba(255,209,102,.05)) border-box;
      filter: drop-shadow(0 0 28px rgba(67, 217, 255, .28));
    }
    .ring.one {
      width: 550px;
      height: 550px;
      animation: spin 8s linear infinite;
    }
    .ring.two {
      width: 390px;
      height: 390px;
      opacity: .82;
      animation: spinReverse 8s linear infinite;
    }
    .core {
      position: relative;
      z-index: 5;
      width: 238px;
      height: 238px;
      display: grid;
      place-items: center;
      border-radius: 40px;
      border: 1px solid rgba(142, 255, 229, .26);
      background: linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.02));
      box-shadow:
        0 0 68px rgba(67, 217, 255, .22),
        0 0 72px rgba(255, 209, 102, .14),
        inset 0 1px 0 rgba(255,255,255,.13);
      animation: coreFloat 4s cubic-bezier(.16,1,.3,1) infinite;
    }
    .core img {
      width: 205px;
      height: 205px;
      object-fit: contain;
      filter:
        drop-shadow(0 0 28px rgba(90, 242, 180, .46))
        drop-shadow(0 0 36px rgba(255, 209, 102, .22));
    }
    .satellite {
      position: absolute;
      z-index: 4;
      width: 128px;
      height: 128px;
      display: grid;
      place-items: center;
      border-radius: 26px;
      border: 1px solid rgba(121, 255, 226, .22);
      background: rgba(0,0,0,.24);
      box-shadow: 0 0 36px rgba(67, 217, 255, .16);
    }
    .satellite img {
      width: 104px;
      height: 104px;
      object-fit: contain;
    }
    .satellite.message {
      transform-origin: 390px 0;
      animation: orbitOne 8s linear infinite;
    }
    .satellite.proof {
      transform-origin: -285px 0;
      animation: orbitTwo 8s linear infinite;
    }
    .wordmark {
      position: absolute;
      z-index: 6;
      left: 52px;
      bottom: 44px;
      display: flex;
      align-items: center;
      gap: 18px;
      letter-spacing: 0;
    }
    .wordmark img {
      width: 92px;
      height: 92px;
      object-fit: contain;
      filter: drop-shadow(0 0 32px rgba(255, 209, 102, .24));
    }
    .wordmark strong {
      display: block;
      font-size: 54px;
      line-height: .9;
      font-weight: 950;
      color: transparent;
      background: linear-gradient(90deg, #fff, #ffd166, #43d9ff, #5af2b4);
      -webkit-background-clip: text;
      background-clip: text;
    }
    .wordmark span {
      display: block;
      margin-top: 8px;
      color: rgba(244,251,247,.7);
      font-size: 17px;
      font-weight: 800;
    }
    .brand-ghost {
      position: absolute;
      right: 34px;
      top: 18px;
      width: 240px;
      height: 160px;
      object-fit: contain;
      opacity: .2;
      filter: drop-shadow(0 0 34px rgba(255, 209, 102, .3));
      animation: brandPulse 8s ease-in-out infinite;
    }
    .beam {
      position: absolute;
      width: 520px;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(67,217,255,.9), rgba(255,209,102,.7), transparent);
      box-shadow: 0 0 24px rgba(67,217,255,.48);
      animation: beamSlide 4s cubic-bezier(.16,1,.3,1) infinite;
    }
    .beam.a { top: 198px; left: -120px; transform: rotate(-12deg); }
    .beam.b { right: -110px; bottom: 184px; transform: rotate(-12deg); animation-delay: -2s; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes spinReverse { to { transform: rotate(-360deg); } }
    @keyframes gridDrift { to { transform: rotate(-9deg) translate3d(58px, 58px, 0); } }
    @keyframes breathe {
      0%, 100% { transform: scale(.985); opacity: .74; }
      50% { transform: scale(1.035); opacity: 1; }
    }
    @keyframes coreFloat {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-13px) scale(1.035); }
    }
    @keyframes orbitOne {
      from { transform: rotate(0deg) translateX(280px) rotate(0deg); }
      to { transform: rotate(360deg) translateX(280px) rotate(-360deg); }
    }
    @keyframes orbitTwo {
      from { transform: rotate(180deg) translateX(220px) rotate(-180deg); }
      to { transform: rotate(540deg) translateX(220px) rotate(-540deg); }
    }
    @keyframes brandPulse {
      0%, 100% { transform: scale(.98); opacity: .18; }
      50% { transform: scale(1.05); opacity: .32; }
    }
    @keyframes beamSlide {
      0% { opacity: 0; translate: -140px 0; }
      28%, 66% { opacity: .9; }
      100% { opacity: 0; translate: 220px 0; }
    }
  </style>
</head>
<body>
  <div class="stage">
    <div class="aura"></div>
    <div class="ring one"></div>
    <div class="ring two"></div>
    <div class="beam a"></div>
    <div class="beam b"></div>
    <div class="satellite message"><img src="${assetUrl("merser-message-sigil.svg")}" alt=""></div>
    <div class="satellite proof"><img src="${assetUrl("merser-proof-ledger.svg")}" alt=""></div>
    <div class="core"><img src="${assetUrl("merser-mail-glyph.svg")}" alt=""></div>
    <img class="brand-ghost" src="${assetUrl("skyes-over-london-deity-logo.png")}" alt="">
    <div class="wordmark"><img src="${assetUrl("metraiyux-0s-emblem-transparent.png")}" alt=""><div><strong>SkyeMail</strong><span>Citadel Database and SkyeNet transmission loop</span></div></div>
  </div>
</body>
</html>`;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width, height },
  recordVideo: { dir: tmpDir, size: { width, height } }
});
const page = await context.newPage();
await page.setContent(stageHtml, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: outputPoster });
await page.waitForTimeout(durationMs - 900);
const video = page.video();
await page.close();
await context.close();
await browser.close();

const recorded = await video.path();
fs.copyFileSync(recorded, outputVideo);
const stats = fs.statSync(outputVideo);
console.log(JSON.stringify({
  ok: true,
  outputVideo: path.relative(root, outputVideo),
  outputPoster: path.relative(root, outputPoster),
  bytes: stats.size,
  durationMs,
  size: { width, height }
}, null, 2));
