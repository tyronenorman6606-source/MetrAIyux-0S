import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.CONNECTLOG_RELAY13_BASE_URL || 'http://127.0.0.1:4173/';
const root = path.resolve(process.cwd());
const siteAssetDir = path.join(root, 'metraiyux_0s_site', 'assets', 'proof');
const artifactDir = path.join(root, 'test-artifacts', 'connectlog-relay13-video');
const rawVideoDir = path.join(artifactDir, 'raw');
const videoPath = path.join(siteAssetDir, 'connectlog-relay13-e2e.webm');
const posterPath = path.join(siteAssetDir, 'connectlog-relay13-e2e-poster.png');
const reportPath = path.join(root, 'test-artifacts', 'connectlog-relay13-video-report.json');

await fs.mkdir(siteAssetDir, { recursive: true });
await fs.mkdir(rawVideoDir, { recursive: true });

const viewport = { width: 1440, height: 1000 };
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport,
  recordVideo: { dir: rawVideoDir, size: viewport }
});
const page = await context.newPage();
const video = page.video();
const checks = [];

async function recordCheck(name, action) {
  const startedAt = new Date().toISOString();
  try {
    await action();
    checks.push({ name, ok: true, started_at: startedAt, finished_at: new Date().toISOString() });
  } catch (error) {
    checks.push({ name, ok: false, error: error.message, started_at: startedAt, finished_at: new Date().toISOString() });
    throw error;
  }
}

try {
  await recordCheck('home_to_expansion_hub', async () => {
    await page.goto(new URL('index.html', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    await page.locator('a[href="live/connectlog-relay13-operator-proof.html"]').first().click();
    await page.getByText('Live Worker boundary', { exact: false }).first().waitFor({ state: 'visible' });
  });

  await recordCheck('expansion_to_connectlog_relay_panel', async () => {
    await page.locator('a[href="../connectlog-v7.7-relay13-operator-proof/app.html#relay13"]').first().click();
    await page.locator('#relayBridgeHealthBtn').waitFor({ state: 'visible' });
    await page.locator('#relayRunActivationProofBtn').waitFor({ state: 'visible' });
    await page.screenshot({ path: posterPath, fullPage: false });
  });

  await recordCheck('expansion_to_relay13_preview', async () => {
    await page.goto(new URL('live/connectlog-relay13-operator-proof.html', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    await page.locator('a[href="https://relay13-core.graylondonskyes.workers.dev/"]').first().click();
    await page.getByText('Launch Relay13 Console', { exact: false }).first().waitFor({ state: 'visible' });
  });

  await recordCheck('relay13_preview_to_console', async () => {
    await page.locator('a[href="admin/"]').first().click();
    await page.locator('#adminToken').waitFor({ state: 'visible' });
    await page.locator('#bootstrap').waitFor({ state: 'visible' });
  });
} finally {
  await context.close();
}

if (!video) throw new Error('Playwright did not create a video handle.');
await video.saveAs(videoPath);
await browser.close();

const stat = await fs.stat(videoPath);
const report = {
  ok: checks.every((entry) => entry.ok) && stat.size > 0,
  base_url: baseUrl,
  generated_at: new Date().toISOString(),
  video: videoPath,
  poster: posterPath,
  bytes: stat.size,
  checks
};

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
