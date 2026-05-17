import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = path.join(root, "SkyeProfitConsole");
const artifactDir = path.resolve(root, "..", "test-artifacts", "skyeprofitconsole");
const gateToken = "FREE99-ADMIN-LOCAL";

async function startRuntime() {
  const port = 45100 + Math.floor(Math.random() * 900);
  const child = spawn(process.execPath, ["runtime/local-runtime.mjs", "--port", String(port)], {
    cwd: appRoot,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += String(chunk); });
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  const started = Date.now();
  while (Date.now() - started < 5000) {
    const line = stdout.trim().split("\n").filter(Boolean).pop();
    if (line) {
      try {
        const payload = JSON.parse(line);
        if (payload.ok) return { child, port: payload.port };
      } catch {}
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  child.kill("SIGTERM");
  throw new Error(`SkyeProfitConsole runtime did not start.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const runtime = await startRuntime();
let browser;
let context;
try {
  await fs.mkdir(artifactDir, { recursive: true });
  const base = `http://127.0.0.1:${runtime.port}`;
  const ungated = await fetch(`${base}/api/runtime/status`);
  expect(ungated.status === 401, `Ungated runtime status should be 401, got ${ungated.status}`);

  const gated = await fetch(`${base}/api/runtime/status`, { headers: { "x-skye-gate-session": gateToken } });
  expect(gated.ok, `Gated runtime status failed: ${gated.status}`);

  browser = await chromium.launch();
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: {
      dir: artifactDir,
      size: { width: 1440, height: 1000 }
    }
  });
  const page = await context.newPage();
  const workflowVideo = page.video();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(`${base}/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#skyeProfitGateTitle");
  const localAdminButton = page.locator("#skyeProfitGateLocalAdmin");
  if (await localAdminButton.count()) {
    await localAdminButton.click();
  } else {
    await page.fill("#skyeProfitGateToken", gateToken);
    await page.click("#skyeProfitGateUnlock");
  }
  await page.waitForSelector("#skyeProfitGate", { state: "detached" });
  const storedGate = await page.evaluate(() => JSON.parse(sessionStorage.getItem("SKYE_PROFIT_GATE_SESSION") || "null"));
  expect(storedGate?.token === gateToken, "Local admin gate session was not persisted.");
  await page.waitForFunction(() => document.querySelector("#metricBooked")?.textContent !== "$0");

  await page.click("#seedScenario");
  await page.click("#syncRuntime");
  await page.waitForFunction(() => document.querySelector("#runtimeStateLabel")?.textContent === "Runtime live");
  await page.fill("#packLabel", "Free99 E2E profit lane");
  await page.fill("#packOwner", "profit-ops");
  await page.fill("#packRevenue", "9900");
  await page.fill("#packCost", "2700");
  await page.click("button[type='submit']");
  await page.waitForFunction(() => document.querySelector("#proofFeed")?.textContent.includes("runtime_review_pack_archived"));
  await page.click("#generateCloseBrief");
  await page.waitForFunction(() => document.querySelector("#closeBriefCard")?.textContent.includes("Free99 E2E profit lane"));
  await page.waitForFunction(() => document.querySelector("#proofFeed")?.textContent.includes("runtime_close_brief_archived"));

  const closeBriefs = await fetch(`${base}/api/runtime/close-briefs`, { headers: { "x-skye-gate-session": gateToken } }).then((res) => res.json());
  expect(closeBriefs.close_briefs?.some((brief) => brief.label === "Free99 E2E profit lane"), "Close brief was not archived in the runtime.");

  const canvasHasPixels = await page.evaluate(() => {
    const canvas = document.querySelector("#profitFieldCanvas");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return false;
    const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 3; index < sample.length; index += 4) {
      if (sample[index] !== 0) return true;
    }
    return false;
  });
  expect(canvasHasPixels, "Profit field canvas rendered blank pixels.");

  await page.screenshot({ path: path.join(artifactDir, "skyeprofitconsole-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(artifactDir, "skyeprofitconsole-mobile.png"), fullPage: true });

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(!horizontalOverflow, "Mobile viewport has horizontal overflow.");
  expect(errors.length === 0, `Browser errors:\n${errors.join("\n")}`);

  await page.close();
  await context.close();
  context = null;

  const rawVideoPath = await workflowVideo?.path();
  expect(rawVideoPath, "Playwright did not produce a workflow recording.");
  const workflowVideoPath = path.join(artifactDir, "skyeprofitconsole-workflow.webm");
  await fs.copyFile(rawVideoPath, workflowVideoPath);

  const videoProofPath = path.join(artifactDir, "skyeprofitconsole-video-proof.html");
  await fs.writeFile(videoProofPath, `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>SkyeProfitConsole Video Proof</title>
<video id="proofVideo" src="./skyeprofitconsole-workflow.webm" poster="./skyeprofitconsole-desktop.png" controls muted playsinline autoplay style="width: min(100%, 960px); display: block;"></video>
`);
  const videoPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await videoPage.goto(pathToFileURL(videoProofPath).href);
  const playback = await videoPage.evaluate(async () => {
    const video = document.querySelector("#proofVideo");
    if (!video) return { ok: false, error: "missing_video" };
    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 700));
    const bounds = video.getBoundingClientRect();
    return {
      ok: true,
      readyState: video.readyState,
      currentTime: video.currentTime,
      paused: video.paused,
      visible: bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.right > 0
    };
  });
  await videoPage.close();
  expect(playback.ok, playback.error || "Video playback probe failed.");
  expect(playback.readyState >= 2, `Video was not ready for playback: ${playback.readyState}`);
  expect(playback.currentTime > 0, `Video did not advance currentTime: ${playback.currentTime}`);
  expect(playback.paused === false, "Video proof did not remain playing.");
  expect(playback.visible === true, "Video proof was not visible in the browser viewport.");

  console.log(JSON.stringify({
    ok: true,
    app: "SkyeProfitConsole",
    proof: {
      ungated_runtime_status: ungated.status,
      gated_runtime_status: gated.status,
      gate_overlay_verified: true,
      local_admin_gate_verified: true,
      runtime_live_verified: true,
      workflow_created: true,
      close_brief_generated: true,
      close_brief_runtime_count: closeBriefs.close_brief_board?.total,
      canvas_nonblank: canvasHasPixels,
      screenshots: [
        path.join(artifactDir, "skyeprofitconsole-desktop.png"),
        path.join(artifactDir, "skyeprofitconsole-mobile.png")
      ],
      video: workflowVideoPath,
      video_proof_page: videoProofPath,
      video_playback_verified: playback
    }
  }, null, 2));
} finally {
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close();
  runtime.child.kill("SIGTERM");
}
