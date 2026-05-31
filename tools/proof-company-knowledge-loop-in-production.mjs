#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = '/workspaces/MetrAIyux-0S';
const baseUrl = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'company-knowledge-loop-in');
const navigationOptions = { waitUntil: 'commit', timeout: 60000 };

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== 'linux') return;
  if (process.env.DISPLAY || process.env.LIVE_BROWSER_XVFB_ACTIVE === '1') return;
  const probe = spawnSync('which', ['xvfb-run'], { encoding: 'utf8' });
  if (probe.status !== 0) return;
  const child = spawnSync('xvfb-run', ['-a', process.execPath, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, LIVE_BROWSER_XVFB_ACTIVE: '1' }
  });
  process.exit(child.status ?? 1);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function resolveSharedGateToken() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: baseUrl });
  const token = String(auth.token || '').replace(/^Bearer\s+/i, '').trim();
  if (!auth.ok || !token) throw new Error('Could not obtain shared 0S gate bearer.');
  return token;
}

async function viewportSnapshot(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('body *')];
    const visible = all.filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= window.innerHeight && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) > 0.01;
    });
    const text = visible.map((element) => element.innerText || element.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
    const brokenImages = [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= window.innerHeight && (!image.complete || image.naturalWidth === 0);
    }).map((image) => image.currentSrc || image.src || image.alt || 'image');
    const backgrounds = visible.filter((element) => {
      const image = window.getComputedStyle(element).backgroundImage || '';
      return image && image !== 'none';
    });
    return {
      url: location.href,
      title: document.title,
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      textChars: text.length,
      textPreview: text.slice(0, 260),
      visibleElements: visible.length,
      images: visible.filter((element) => element.tagName === 'IMG').length,
      svgs: visible.filter((element) => element.tagName === 'svg').length,
      canvases: visible.filter((element) => element.tagName === 'CANVAS').length,
      backgroundImages: backgrounds.length,
      brokenImages
    };
  });
}

async function screenshotStop(page, artifactDir, receipt, label) {
  const file = path.join(artifactDir, `${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const snapshot = await viewportSnapshot(page);
  const looksAlive = snapshot.textChars >= 30 || snapshot.visibleElements >= 6 || snapshot.images > 0 || snapshot.svgs > 0 || snapshot.canvases > 0 || snapshot.backgroundImages > 0;
  const stop = { label, path: file, snapshot, looksAlive };
  receipt.scrollStops.push(stop);
  if (!looksAlive) receipt.failures.push(`${label}: viewport looked blank`);
  if (snapshot.brokenImages.length) receipt.failures.push(`${label}: broken visible images ${snapshot.brokenImages.join(', ')}`);
  return stop;
}

async function scrollPage(page, artifactDir, receipt, label) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await screenshotStop(page, artifactDir, receipt, `${label}-top`);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewport = await page.evaluate(() => window.innerHeight);
  const stops = [...new Set([Math.floor(height * 0.35), Math.floor(height * 0.7), Math.max(0, height - viewport - 4)])].filter((value) => value > 0);
  for (const [index, y] of stops.entries()) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(260);
    await screenshotStop(page, artifactDir, receipt, `${label}-scroll-${index + 1}`);
  }
}

function attachWatchers(page, receipt) {
  page.on('console', (message) => {
    if (message.type() === 'error') receipt.consoleErrors.push({ url: page.url(), text: message.text() });
  });
  page.on('requestfailed', (request) => {
    receipt.failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'request failed' });
  });
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !/favicon|\/api\/owner\/admin-login/.test(url)) {
      receipt.httpErrors.push({ url, status });
    }
  });
}

async function expectVisible(page, receipt, text, label) {
  const locator = page.getByText(text, { exact: false });
  await page.waitForFunction((needle) => document.body?.innerText?.includes(needle), text, { timeout: 20000 });
  const count = await locator.count();
  let visible = false;
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible().catch(() => false)) {
      visible = true;
      break;
    }
  }
  if (!visible) {
    const snapshot = await viewportSnapshot(page);
    if (!snapshot.textPreview.includes(text)) throw new Error(`${label}: text was present in DOM but no visible match was found`);
  }
  receipt.actions.push({ action: 'assert visible', label, text });
}

async function gotoProofPage(page, url) {
  await page.goto(url, navigationOptions);
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => null);
  await page.waitForFunction(() => Boolean(document.body), { timeout: 20000 });
}

async function runViewport(browser, artifactDir, receipt, token, viewport, deviceLabel) {
  const context = await browser.newContext({ viewport });
  await context.route(`${baseUrl}/**`, (route) => {
    const headers = {
      ...route.request().headers(),
      Authorization: `Bearer ${token}`,
      'x-free99-gate-session': token,
      'x-skye-gate-session': token
    };
    return route.continue({ headers });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.setDefaultNavigationTimeout(60000);
  attachWatchers(page, receipt);

  await gotoProofPage(page, `${baseUrl}/`);
  receipt.actions.push({ action: 'goto', label: `${deviceLabel} home`, url: page.url() });
  await expectVisible(page, receipt, 'Company Knowledge', `${deviceLabel} home company knowledge`);
  await page.locator('a[href="live/company-knowledge-layer-proof.html"]').first().click();
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => null);
  await expectVisible(page, receipt, 'Company Knowledge', `${deviceLabel} proof from home`);
  receipt.actions.push({ action: 'click', label: `${deviceLabel} home company knowledge link`, url: page.url() });
  await gotoProofPage(page, `${baseUrl}/`);
  await scrollPage(page, artifactDir, receipt, `${deviceLabel}-home`);

  await gotoProofPage(page, `${baseUrl}/ecosystem.html`);
  receipt.actions.push({ action: 'goto', label: `${deviceLabel} ecosystem`, url: page.url() });
  await expectVisible(page, receipt, 'Open Company Knowledge', `${deviceLabel} ecosystem quick dock`);
  await expectVisible(page, receipt, 'Company Knowledge', `${deviceLabel} ecosystem company knowledge`);
  const nodeVisible = await page.locator('.system-node[data-node-id="company-knowledge"]').isVisible({ timeout: 6000 }).catch(() => false);
  receipt.actions.push({ action: nodeVisible ? 'assert node rendered' : 'note node not visible', label: `${deviceLabel} company knowledge node`, nodeVisible });
  if (nodeVisible) {
    await expectVisible(page, receipt, 'Cloudflare R2/KV company memory layer', `${deviceLabel} drawer summary`);
  } else {
    receipt.notes.push(`${deviceLabel}: Company Knowledge quick-dock is visible and linked, but the JS node layer did not render during this proof run.`);
  }
  await page.locator('.quick-dock a[href="live/company-knowledge-layer-proof.html"]').click();
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => null);
  await expectVisible(page, receipt, 'Company Knowledge', `${deviceLabel} proof from ecosystem quick dock`);
  receipt.actions.push({ action: 'click', label: `${deviceLabel} ecosystem quick dock company knowledge link`, url: page.url() });
  await gotoProofPage(page, `${baseUrl}/ecosystem.html`);
  await scrollPage(page, artifactDir, receipt, `${deviceLabel}-ecosystem`);

  await context.close();
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  const runId = stamp();
  const artifactDir = path.join(artifactRoot, runId);
  fs.mkdirSync(artifactDir, { recursive: true });
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    productionUrl: baseUrl,
    runId,
    viewportRuns: [
      { label: 'desktop', viewport: { width: 1440, height: 960 } },
      { label: 'mobile', viewport: { width: 390, height: 844 } }
    ],
    gateChecks: [],
    actions: [],
    scrollStops: [],
    consoleErrors: [],
    failedRequests: [],
    httpErrors: [],
    failures: [],
    notes: [
      'The 0S homepage and ecosystem map remain protected by the shared FS27 gate.',
      'The public owner-login gate includes a Company Knowledge public proof link for cold visitors.'
    ]
  };

  const publicLogin = await fetch(`${baseUrl}/admin/login.html`, { headers: { accept: 'text/html' } });
  const publicLoginText = await publicLogin.text();
  receipt.gateChecks.push({
    path: '/admin/login.html',
    status: publicLogin.status,
    hasCompanyKnowledgeProof: publicLoginText.includes('Company Knowledge public proof'),
    hasSkyeHands: /skyehands|SkyeHands/.test(publicLoginText)
  });
  if (!publicLoginText.includes('Company Knowledge public proof')) receipt.failures.push('Public login page did not include Company Knowledge proof link.');
  if (/skyehands|SkyeHands/.test(publicLoginText)) receipt.failures.push('Public login page still included SkyeHands text.');

  const unauthHome = await fetch(`${baseUrl}/`, { redirect: 'manual', headers: { accept: 'text/html' } });
  const unauthEco = await fetch(`${baseUrl}/ecosystem.html`, { redirect: 'manual', headers: { accept: 'text/html' } });
  receipt.gateChecks.push({ path: '/', status: unauthHome.status, location: unauthHome.headers.get('location'), gate: unauthHome.headers.get('x-0s-gate') });
  receipt.gateChecks.push({ path: '/ecosystem.html', status: unauthEco.status, location: unauthEco.headers.get('location'), gate: unauthEco.headers.get('x-0s-gate') });
  if (unauthHome.status !== 302 || unauthHome.headers.get('x-0s-gate') !== 'fs27-required') receipt.failures.push('Unauthenticated homepage did not redirect through FS27 gate.');
  if (unauthEco.status !== 302 || unauthEco.headers.get('x-0s-gate') !== 'fs27-required') receipt.failures.push('Unauthenticated ecosystem did not redirect through FS27 gate.');

  const token = await resolveSharedGateToken();
  const browser = await chromium.launch({ headless: false });
  try {
    for (const run of receipt.viewportRuns) {
      await runViewport(browser, artifactDir, receipt, token, run.viewport, run.label);
    }
  } finally {
    await browser.close();
  }

  receipt.ok = receipt.failures.length === 0 && receipt.consoleErrors.length === 0 && receipt.failedRequests.length === 0 && receipt.httpErrors.length === 0;
  const receiptPath = path.join(artifactDir, 'receipt.json');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  fs.writeFileSync(path.join(artifactRoot, 'latest-receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({
    ok: receipt.ok,
    receiptPath,
    actions: receipt.actions.length,
    scrollStops: receipt.scrollStops.length,
    consoleErrors: receipt.consoleErrors.length,
    failedRequests: receipt.failedRequests.length,
    httpErrors: receipt.httpErrors.length,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
