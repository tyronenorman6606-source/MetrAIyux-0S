#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveZeroOsGateAuth } from '../../tools/lib/zero-os-gate-auth.mjs';

const baseUrl = process.env.BASE_URL || 'https://skyevault-drop.graylondonskyes.workers.dev';
const artifactRoot = path.resolve(process.cwd(), '..', 'test-artifacts', 'skyevault');
const videoDir = path.join(artifactRoot, 'videos');
const reportPath = path.join(artifactRoot, 'live-worker-browser-proof.json');

async function loadEnvFile(file) {
  const text = await fs.readFile(file, 'utf8').catch(() => '');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

await loadEnvFile(path.resolve(process.cwd(), 'env.txt'));
await loadEnvFile(path.resolve(process.cwd(), '..', 'env.txt'));

const gateAuth = await resolveZeroOsGateAuth({ envFiles: [path.resolve(process.cwd(), 'env.txt'), path.resolve(process.cwd(), '..', 'env.txt'), path.resolve(process.cwd(), '..', '.env')] }).catch(() => ({ ok: false, token: '' }));
const adminToken = gateAuth.ok ? gateAuth.token : '';
const portalKey = process.env.CLIENT_PORTAL_KEY || process.env.SKYEVAULT_PORTAL_KEY || '';

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
const consoleMessages = [];
const failedRequests = [];

page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text().slice(0, 500) });
});
page.on('requestfailed', (request) => {
  failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'request failed' });
});

async function gotoLive(targetUrl) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1200);
      return response;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(1200);
    }
  }
  throw lastError;
}

async function check(label, fn) {
  try {
    const detail = await fn();
    checks.push({ label, ok: true, detail });
  } catch (error) {
    checks.push({ label, ok: false, error: error.message });
  }
}

function screenshotName(label, index) {
  const safe = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'viewport';
  return `live-worker-${safe}-scroll-${index}.png`;
}

async function scrollAndInspect(label) {
  const maxY = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  const stops = [...new Set([0, Math.round(maxY / 2), maxY].filter((value) => Number.isFinite(value) && value >= 0))];
  const metrics = [];

  for (const [index, y] of stops.entries()) {
    await page.evaluate((nextY) => window.scrollTo(0, nextY), y);
    await page.waitForTimeout(250);
    const viewport = await page.evaluate(() => {
      const visibleElements = [...document.body.querySelectorAll('*')].filter((node) => {
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        const rect = node.getBoundingClientRect();
        return rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.top < window.innerHeight;
      });
      const visibleText = visibleElements
        .map((node) => node.innerText || node.getAttribute('aria-label') || node.getAttribute('alt') || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const visualElements = visibleElements.filter((node) => {
        const style = window.getComputedStyle(node);
        return ['IMG', 'VIDEO', 'CANVAS', 'SVG'].includes(node.tagName) || style.backgroundImage !== 'none';
      });
      return {
        y: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        visibleElementCount: visibleElements.length,
        visualElementCount: visualElements.length,
        visibleTextLength: visibleText.length,
        sampleText: visibleText.slice(0, 160)
      };
    });

    if (!viewport.visibleElementCount || (viewport.visibleTextLength < 20 && !viewport.visualElementCount)) {
      throw new Error(`${label} looked blank at scroll stop ${index}: ${JSON.stringify(viewport)}`);
    }

    const screenshotPath = path.join(artifactRoot, screenshotName(label, index));
    await page.screenshot({ path: screenshotPath, fullPage: false, timeout: 90000 });
    metrics.push({ ...viewport, screenshotPath });
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  return metrics;
}

await check('public portal and proof reel render', async () => {
  await gotoLive(baseUrl);
  await page.screenshot({ path: path.join(artifactRoot, 'live-worker-desktop.png'), fullPage: false, timeout: 90000 });
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
  const scrollStops = await scrollAndInspect('desktop-home');
  return { playback, scrollStops };
});

await check('mobile viewport has no horizontal scroll', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoLive(baseUrl);
  await page.screenshot({ path: path.join(artifactRoot, 'live-worker-mobile.png'), fullPage: false, timeout: 90000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`Mobile horizontal overflow: ${overflow}px`);
  const scrollStops = await scrollAndInspect('mobile-home');
  return { overflow, scrollStops };
});

await check('split public route pages render without mega-scroll coupling', async () => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const routes = [
    { path: '/upload.html', text: /Drop files into the vault|Start secure upload/i },
    { path: '/vault.html', text: /Open my vault|Find and download stored files/i },
    { path: '/repo.html', text: /Repo Vault Lane|Encrypted artifact plus restore kit|zip\.enc/i },
    { path: '/agent-install.html', text: /ShYT may crash|Copy this into your coding AI|sKache/i },
    { path: '/process.html', text: /Proof Route|Send production signal/i }
  ];
  const results = [];
  for (const route of routes) {
    const response = await gotoLive(`${baseUrl}${route.path}`);
    const body = await page.textContent('body');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (!response?.ok()) throw new Error(`${route.path} returned ${response?.status()}`);
    if (!route.text.test(body || '')) throw new Error(`${route.path} did not render expected route text.`);
    if (overflow > 2) throw new Error(`${route.path} horizontal overflow: ${overflow}px`);
    const scrollStops = await scrollAndInspect(`route-${route.path}`);
    results.push({ path: route.path, status: response.status(), overflow, scrollStops });
  }
  return results;
});

await check('repo restore copy explains encrypted archive unlock flow', async () => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const response = await gotoLive(`${baseUrl}/repo.html#encrypted-zip-restore`);
  const body = await page.textContent('body');
  if (!response?.ok()) throw new Error(`/repo.html returned ${response?.status()}`);
  for (const pattern of [/\.zip\.enc|\.tar\.zst\.enc/i, /control material|direct restore kit|restore material/i, /decrypted repo archive|real repo ZIP|repo archive/i]) {
    if (!pattern.test(body || '')) throw new Error(`Missing restore copy: ${pattern}`);
  }
  await page.locator('#encrypted-zip-restore').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(artifactRoot, 'live-worker-repo-restore-flow.png'), fullPage: false, timeout: 90000 });
  return { status: response.status(), hasRestoreFlow: true };
});

await check('shared gate opens admin vault browser', async () => {
  if (!adminToken) return { skipped: true, reason: 'Shared FS27/SkyGate bearer is not present; public headed proof still ran.' };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.setExtraHTTPHeaders({ authorization: `Bearer ${adminToken}`, 'x-skye-gate-session': adminToken });
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
  if (!adminToken) return { skipped: true, reason: 'Shared FS27/SkyGate bearer is not present.' };
  const response = await page.request.get(`${baseUrl}/api/admin-config?ledger=true&sessions=true&events=true`, {
    headers: { authorization: `Bearer ${adminToken}`, 'x-skye-gate-session': adminToken }
  });
  if (!response.ok()) throw new Error(`admin-config returned ${response.status()}: ${await response.text()}`);
  const data = await response.json();
  const entries = data.ledger?.entries || [];
  if (!entries.length) throw new Error('No uploaded vault files are present in the loaded ledger.');
  firstEntry = entries.find((entry) => entry.clientEmail && entry.id) || entries[0];
  return { count: entries.length, firstFile: firstEntry.fileName || firstEntry.driveFile?.name || 'vault object' };
});

await check('admin can create a download link for a vault file', async () => {
  if (!adminToken) return { skipped: true, reason: 'Shared FS27/SkyGate bearer is not present.' };
  if (!firstEntry?.id) throw new Error('No receipt ID available for admin download proof.');
  const response = await page.request.post(`${baseUrl}/api/admin-vault-download`, {
    headers: { authorization: `Bearer ${adminToken}`, 'x-skye-gate-session': adminToken },
    data: { receiptId: firstEntry.id }
  });
  if (!response.ok()) throw new Error(`admin-vault-download returned ${response.status()}: ${await response.text()}`);
  const data = await response.json();
  if (!data.downloadUrl) throw new Error('admin-vault-download did not return a signed URL.');
  return { receiptId: firstEntry.id, fileName: data.item?.fileName || firstEntry.fileName || '' };
});

await check('client can list their own vault files', async () => {
  if (!adminToken) return { skipped: true, reason: 'Shared FS27/SkyGate bearer is not present, so no client email was fetched from admin ledger.' };
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

await check('console errors and failed browser requests are clean', async () => {
  const errors = consoleMessages.filter((item) => item.type === 'error' && !/Failed to load resource: the server responded with a status of 404/i.test(item.text));
  const materialFailedRequests = failedRequests.filter((item) => !/favicon\.ico$/i.test(item.url) && !(/\/api\/public-config$/i.test(item.url) && /ERR_ABORTED/i.test(item.failure)));
  if (errors.length || materialFailedRequests.length) {
    throw new Error(JSON.stringify({ errors, failedRequests: materialFailedRequests }).slice(0, 1000));
  }
  return { consoleWarnings: consoleMessages.length, failedRequests: failedRequests.length, ignored404ConsoleErrors: consoleMessages.length - errors.length };
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
  consoleMessages,
  failedRequests,
  checks
};
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: report.ok, reportPath, videoPath, checks }, null, 2));
if (!report.ok) process.exit(1);
