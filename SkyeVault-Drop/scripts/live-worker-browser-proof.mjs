#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'https://skyevault-drop.graylondonskyes.workers.dev';
const adminToken = process.env.ADMIN_TOKEN || '';
const portalKey = process.env.CLIENT_PORTAL_KEY || '';
const artifactRoot = path.resolve(process.cwd(), '..', 'test-artifacts', 'skyevault');
const videoDir = path.join(artifactRoot, 'videos');
const reportPath = path.join(artifactRoot, 'live-worker-browser-proof.json');

if (!adminToken) throw new Error('ADMIN_TOKEN is required for live browser proof.');
if (!portalKey) throw new Error('CLIENT_PORTAL_KEY is required for live browser proof.');

const playwright = await import('playwright');
await fs.mkdir(videoDir, { recursive: true });

const browser = await playwright.chromium.launch({ headless: process.env.HEADLESS !== 'false' });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: videoDir, size: { width: 1440, height: 1000 } }
});
const page = await context.newPage();
const checks = [];

async function check(label, fn) {
  try {
    const detail = await fn();
    checks.push({ label, ok: true, detail });
  } catch (error) {
    checks.push({ label, ok: false, error: error.message });
  }
}

await check('public portal and proof reel render', async () => {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(artifactRoot, 'live-worker-desktop.png'), fullPage: true });
  const body = await page.textContent('body');
  if (!/SkyeVault-Drop|Open my vault|Drop files into the vault/i.test(body || '')) {
    throw new Error('Public vault text did not render.');
  }
  const video = page.locator('.surface-reel').first();
  await video.waitFor({ state: 'visible', timeout: 8000 });
  const playback = await video.evaluate((node) => new Promise((resolve) => {
    const done = () => resolve({
      visible: Boolean(node.offsetWidth && node.offsetHeight),
      readyState: node.readyState,
      currentTime: node.currentTime,
      paused: node.paused
    });
    node.play().catch(() => null).finally(() => setTimeout(done, 900));
  }));
  if (!playback.visible || playback.readyState < 2 || playback.currentTime <= 0 || playback.paused) {
    throw new Error(`Proof reel did not play: ${JSON.stringify(playback)}`);
  }
  return playback;
});

await check('mobile viewport has no horizontal scroll', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(artifactRoot, 'live-worker-mobile.png'), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`Mobile horizontal overflow: ${overflow}px`);
  return { overflow };
});

await check('operator session opens admin vault browser', async () => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const login = await page.request.post(`${baseUrl}/api/operator-session`, { data: { token: adminToken } });
  if (!login.ok()) throw new Error(`operator-session returned ${login.status()}: ${await login.text()}`);
  await page.goto(`${baseUrl}/admin.html`, { waitUntil: 'networkidle' });
  await page.locator('#ledgerPanel').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('#vaultSearch').waitFor({ state: 'visible', timeout: 10000 });
  const body = await page.textContent('body');
  if (!/Vault file browser|Search vault files|Download file/i.test(body || '')) {
    throw new Error('Admin vault browser controls were not visible.');
  }
  return { adminLoaded: true };
});

let firstEntry = null;
await check('admin ledger API exposes vault files', async () => {
  const response = await page.request.get(`${baseUrl}/api/admin-config?ledger=true&sessions=true&events=true`, {
    headers: { 'x-admin-token': adminToken }
  });
  if (!response.ok()) throw new Error(`admin-config returned ${response.status()}: ${await response.text()}`);
  const data = await response.json();
  const entries = data.ledger?.entries || [];
  if (!entries.length) throw new Error('No uploaded vault files are present in the loaded ledger.');
  firstEntry = entries.find((entry) => entry.clientEmail && entry.id) || entries[0];
  return { count: entries.length, firstFile: firstEntry.fileName || firstEntry.driveFile?.name || 'vault object' };
});

await check('admin can create a download link for a vault file', async () => {
  if (!firstEntry?.id) throw new Error('No receipt ID available for admin download proof.');
  const response = await page.request.post(`${baseUrl}/api/admin-vault-download`, {
    headers: { 'x-admin-token': adminToken },
    data: { receiptId: firstEntry.id }
  });
  if (!response.ok()) throw new Error(`admin-vault-download returned ${response.status()}: ${await response.text()}`);
  const data = await response.json();
  if (!data.downloadUrl) throw new Error('admin-vault-download did not return a signed URL.');
  return { receiptId: firstEntry.id, fileName: data.item?.fileName || firstEntry.fileName || '' };
});

await check('client can list their own vault files', async () => {
  if (!firstEntry?.clientEmail) throw new Error('No client email available for client vault proof.');
  const response = await page.request.post(`${baseUrl}/api/client-vault`, {
    data: {
      action: 'list',
      clientEmail: firstEntry.clientEmail,
      portalKey
    }
  });
  if (!response.ok()) throw new Error(`client-vault returned ${response.status()}: ${await response.text()}`);
  const data = await response.json();
  if (!data.count) throw new Error('Client vault list returned no files for the proof email.');
  return { count: data.count };
});

const video = page.video();
await context.close();
await browser.close();

const videoPath = video ? await video.path().catch(() => '') : '';
const report = {
  ok: checks.every((item) => item.ok),
  baseUrl,
  generatedAt: new Date().toISOString(),
  videoPath,
  checks
};
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: report.ok, reportPath, videoPath, checks }, null, 2));
if (!report.ok) process.exit(1);
