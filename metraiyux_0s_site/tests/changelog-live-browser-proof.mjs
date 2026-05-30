#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const repoRoot = fs.existsSync('/workspaces/MetrAIyux-0S') ? '/workspaces/MetrAIyux-0S' : process.cwd();
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const deploymentVersion = process.env.PROOF_DEPLOYMENT_VERSION || 'unknown';
const expectText = process.env.PROOF_EXPECT_TEXT || 'SkyeMusicNexus now has living artist stores';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'changelog-live-browser', stamp);
const reportPath = path.join(artifactDir, 'receipt.json');

const secretKeys = [
  'FREE99_ADMIN_CODE', 'FREE99_GATE_CODE', 'OWNER_ADMIN_CODE', 'ADMIN_CODE',
  'FS27_ADMIN_CODE', 'FS27_ADMIN_PASSWORD', 'SKYGATEFS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_PASSWORD', 'FREE99_ADMIN_PASSWORD', 'OWNER_ADMIN_PASSWORD',
  'METRAIYUX_ADMIN_TOKEN', 'ADMIN_TOKEN'
];

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== 'linux' || process.env.LIVE_BROWSER_XVFB_ACTIVE === '1') return;
  if (process.env.DISPLAY && process.env.FORCE_LIVE_BROWSER_XVFB !== '1') return;
  if (spawnSync('which', ['xvfb-run'], { encoding: 'utf8' }).status !== 0) return;
  const child = spawnSync('xvfb-run', ['-a', process.execPath, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, LIVE_BROWSER_XVFB_ACTIVE: '1', DISPLAY: undefined, WAYLAND_DISPLAY: undefined }
  });
  process.exit(child.status ?? 1);
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function unquote(value) {
  let clean = String(value || '').trim().replace(/^export\s+/, '').trim();
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) clean = clean.slice(1, -1).trim();
  return clean;
}

function envFromText(text, key) {
  let found = '';
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    if (normalized.startsWith(`${key}=`)) found = unquote(normalized.slice(key.length + 1));
    if (normalized.startsWith(`${key}:`)) found = unquote(normalized.slice(key.length + 1));
  }
  return found;
}

function allSecrets(keys) {
  const texts = [
    readText(path.join(repoRoot, '.env')),
    readText(path.join(repoRoot, 'ADMIN_REFERENCE.md')),
    readText(path.join(repoRoot, 'metraiyux_0s_site', 'skyegate', 'source', 'SkyeGateFS27', '.env'))
  ];
  const values = [];
  for (const key of keys) {
    if (process.env[key]) values.push(unquote(process.env[key]));
    for (const text of texts) {
      const value = envFromText(text, key);
      if (value) values.push(value);
    }
  }
  return [...new Set(values.filter(Boolean))];
}

const localSecrets = allSecrets(secretKeys);

function cleanToken(value) {
  return String(value || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
}

function redact(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value || {});
  for (const secret of localSecrets) if (secret) text = text.split(secret).join('[redacted]');
  return text.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, '$1[redacted]');
}

function urlFor(route) {
  return new URL(route, baseUrl).toString();
}

function gateHeaders(token) {
  const clean = cleanToken(token);
  return {
    authorization: `Bearer ${clean}`,
    'x-free99-gate-session': clean,
    'x-skye-gate-session': clean,
    'x-skygate-session': clean
  };
}

async function resolveOwnerGate() {
  for (const code of localSecrets) {
    const response = await fetch(urlFor('/api/owner/admin-login'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code })
    }).catch(() => null);
    if (!response) continue;
    const data = await response.json().catch(() => ({}));
    const token = cleanToken(data.gateToken || data.gateBearerToken || data.token);
    if (response.ok && token) return { token, source: data.gateToken || data.gateBearerToken ? 'fs27-admin-login' : 'owner-admin-login' };
  }
  throw new Error('No local owner/admin candidate unlocked the shared 0S gate.');
}

async function installSession(context, token) {
  const session = { token, source: 'fs27-owner-gate', platform_id: 'metraiyux-0s', issued_at: new Date().toISOString() };
  await context.addInitScript((sessionValue) => {
    for (const key of ['FREE99_PLATFORM_GATE_SESSION', 'METRAIYUX_GATE_SESSION', 'SKYE_MUSIC_NEXUS_GATE_SESSION']) {
      sessionStorage.setItem(key, JSON.stringify(sessionValue));
      localStorage.setItem(key, JSON.stringify(sessionValue));
    }
  }, session);
}

function observe(page, entry) {
  page.on('console', message => {
    if (message.type() === 'error') entry.consoleErrors.push(redact(message.text()).slice(0, 1000));
  });
  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText || 'request failed';
    if (!failure.includes('ERR_ABORTED')) entry.failedRequests.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), failure });
  });
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().includes('favicon.ico')) {
      entry.httpErrors.push({ url: response.url(), status: response.status(), method: response.request().method(), resourceType: response.request().resourceType() });
    }
  });
}

async function visibleMetrics(page) {
  return page.evaluate(() => {
    const nodes = [
      document.body,
      ...document.body.querySelectorAll('main, section, article, h1, h2, h3, p, a, button, img, canvas, video, svg, li, span, code, strong, time')
    ].slice(0, 1400);
    const visible = nodes.filter(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.top < innerHeight && style.visibility !== 'hidden' && style.display !== 'none';
    });
    const text = visible.slice(0, 180).map(node => node.textContent || node.alt || '').join(' ').replace(/\s+/g, ' ').trim();
    const contentNodes = visible.filter(node => !['BODY', 'MAIN', 'SECTION'].includes(node.tagName));
    const media = visible.filter(node => ['IMG', 'CANVAS', 'VIDEO', 'SVG'].includes(node.tagName));
    return {
      scrollY: Math.round(window.scrollY),
      visibleElementCount: visible.length,
      visibleContentElementCount: contentNodes.length,
      visibleTextLength: text.length,
      visibleMediaCount: media.length,
      sampleText: text.slice(0, 200),
      horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth
    };
  });
}

async function screenshot(page, entry, label) {
  const file = path.join(artifactDir, `${entry.viewportLabel}-${label}.png`);
  await page.screenshot({ path: file, fullPage: false, animations: 'disabled', timeout: 90000 });
  entry.screenshots.push({ label, path: file, bytes: fs.statSync(file).size });
  return file;
}

async function scrollProof(page, entry) {
  const maxY = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
  const stops = maxY < 8 ? [0] : [0, Math.round(maxY * 0.33), Math.round(maxY * 0.66), maxY];
  for (const [index, y] of stops.entries()) {
    await page.evaluate(nextY => scrollTo(0, nextY), y);
    await page.waitForTimeout(350);
    const metrics = await visibleMetrics(page);
    const shot = await screenshot(page, entry, `scroll-${String(index + 1).padStart(2, '0')}`);
    const screenshotBytes = fs.statSync(shot).size;
    const ok = metrics.visibleContentElementCount >= 3 && (metrics.visibleTextLength >= 20 || metrics.visibleMediaCount >= 1) && screenshotBytes > 10000;
    entry.scrollStops.push({ ...metrics, screenshotBytes, ok, screenshot: shot });
    if (!ok) throw new Error(`changelog visually blank at scrollY ${metrics.scrollY}`);
  }
}

async function runViewport(browser, owner, viewport, viewportLabel) {
  const entry = { viewportLabel, viewport, ok: false, checks: [], actions: [], screenshots: [], scrollStops: [], consoleErrors: [], failedRequests: [], httpErrors: [], failures: [] };
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, deviceScaleFactor: 1, ignoreHTTPSErrors: true, extraHTTPHeaders: gateHeaders(owner.token) });
  await installSession(context, owner.token);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(90000);
  observe(page, entry);
  try {
    const response = await page.goto(urlFor('/changelog/'), { waitUntil: 'commit', timeout: 90000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const text = await page.locator('body').innerText({ timeout: 30000 });
    entry.checks.push({ name: 'changelog route status 200', ok: response?.status() === 200, status: response?.status() || 0, url: page.url() });
    entry.checks.push({ name: `changelog contains ${expectText}`, ok: text.includes(expectText) });
    entry.checks.push({ name: 'did not redirect to admin login', ok: !page.url().includes('/admin/login') });
    const featureAtlas = page.getByRole('link', { name: /Feature Atlas/i }).first();
    if (await featureAtlas.count().catch(() => 0)) {
      await featureAtlas.click({ timeout: 5000 }).catch(() => {});
      entry.actions.push('clicked Feature Atlas link');
      await page.goBack({ waitUntil: 'commit', timeout: 30000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
      await page.goto(urlFor('/changelog/'), { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
    const proofRoutes = page.getByRole('link', { name: /Open Proof Routes/i }).first();
    if (await proofRoutes.count().catch(() => 0)) {
      await proofRoutes.click({ timeout: 5000 }).catch(() => {});
      entry.actions.push('clicked Open Proof Routes link');
      await page.goBack({ waitUntil: 'commit', timeout: 30000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
      await page.goto(urlFor('/changelog/'), { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
    await scrollProof(page, entry);
  } catch (error) {
    entry.failures.push(redact(error?.stack || error?.message || error).split('\n').slice(0, 8).join('\n'));
  } finally {
    entry.materialConsoleErrors = entry.consoleErrors.filter(message => !/Failed to load resource/i.test(message));
    if (entry.materialConsoleErrors.length) entry.failures.push(`console errors ${entry.materialConsoleErrors.slice(0, 3).join(' | ')}`);
    if (entry.failedRequests.length) entry.failures.push(`failed requests ${entry.failedRequests.slice(0, 3).map(item => item.url).join(', ')}`);
    if (entry.httpErrors.length) entry.failures.push(`HTTP errors ${entry.httpErrors.slice(0, 3).map(item => `${item.status} ${item.url}`).join(', ')}`);
    entry.ok = entry.failures.length === 0 && entry.checks.every(check => check.ok) && entry.scrollStops.every(stop => stop.ok);
    await context.close();
  }
  return entry;
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  fs.mkdirSync(artifactDir, { recursive: true });
  const owner = await resolveOwnerGate();
  const browser = await chromium.launch({ headless: false, timeout: 300000, args: ['--disable-gpu', '--disable-software-rasterizer', '--ozone-platform=x11'] });
  const results = [];
  try {
    results.push(await runViewport(browser, owner, { width: 1440, height: 980 }, 'desktop'));
    results.push(await runViewport(browser, owner, { width: 390, height: 844 }, 'mobile'));
  } finally {
    await browser.close().catch(() => {});
  }
  const report = {
    ok: results.every(result => result.ok),
    mode: 'headed-live-browser',
    headless: false,
    generatedAt: new Date().toISOString(),
    baseUrl,
    deploymentVersion,
    expectText,
    artifactDir,
    results,
    failures: results.flatMap(result => result.failures)
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: report.ok,
    reportPath,
    deploymentVersion,
    summary: results.map(result => ({ viewport: result.viewportLabel, checks: result.checks.length, actions: result.actions.length, screenshots: result.screenshots.length, scrollStops: result.scrollStops.length })),
    failures: report.failures
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch(error => {
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = { ok: false, mode: 'headed-live-browser', headless: false, generatedAt: new Date().toISOString(), baseUrl, deploymentVersion, expectText, artifactDir, failures: [redact(error?.stack || error?.message || error)] };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, reportPath, error: redact(error?.message || error) }, null, 2));
  process.exit(1);
});
