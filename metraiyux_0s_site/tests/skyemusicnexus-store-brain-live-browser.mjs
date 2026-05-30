#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const repoRoot = fs.existsSync('/workspaces/MetrAIyux-0S') ? '/workspaces/MetrAIyux-0S' : process.cwd();
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const deploymentVersion = process.env.PROOF_DEPLOYMENT_VERSION || 'unknown';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyemusicnexus-store-brain-live-browser', stamp);
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
  const probe = spawnSync('which', ['xvfb-run'], { encoding: 'utf8' });
  if (probe.status !== 0) return;
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

function redact(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value || {});
  for (const secret of localSecrets) if (secret) text = text.split(secret).join('[redacted]');
  return text.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, '$1[redacted]');
}

function cleanToken(value) {
  return String(value || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
}

function urlFor(route) {
  return new URL(route, baseUrl).toString();
}

function gateHeaders(token) {
  const clean = cleanToken(token);
  return clean ? {
    authorization: `Bearer ${clean}`,
    'x-free99-gate-session': clean,
    'x-skye-gate-session': clean,
    'x-skygate-session': clean
  } : {};
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
    if (response.ok && token) return { code, token, source: data.gateToken || data.gateBearerToken ? 'fs27-admin-login' : 'owner-admin-login' };
  }
  throw new Error('No local owner/admin candidate unlocked the shared 0S gate.');
}

function sharedSession(owner) {
  return { token: owner.token, source: owner.source, platform_id: 'metraiyux-0s', usage_lane: 'fs27-owner-gate', client: 'MetrAIyux 0S', issued_at: new Date().toISOString() };
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

async function installSession(context, owner) {
  await context.addInitScript((session) => {
    for (const key of ['FREE99_PLATFORM_GATE_SESSION', 'SKYE_MUSIC_NEXUS_GATE_SESSION', 'METRAIYUX_GATE_SESSION']) {
      sessionStorage.setItem(key, JSON.stringify(session));
      localStorage.setItem(key, JSON.stringify(session));
    }
    sessionStorage.setItem('skye_music_nexus_session', session.token);
  }, sharedSession(owner));
}

async function api(page, entry, method, route, body) {
  const result = await page.evaluate(async ({ method, route, body }) => {
    let raw = '{}';
    try {
      raw = sessionStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || localStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || '{}';
    } catch {}
    let token = '';
    try { token = JSON.parse(raw).token || ''; } catch {}
    const headers = { 'content-type': 'application/json' };
    if (token) {
      headers.authorization = `Bearer ${token}`;
      headers['x-free99-gate-session'] = token;
      headers['x-skye-gate-session'] = token;
      headers['x-skygate-session'] = token;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    const response = await fetch(route, { method, credentials: 'include', headers, body: body == null ? undefined : JSON.stringify(body), signal: controller.signal });
    clearTimeout(timeout);
    const text = await response.text();
    let payload = text;
    try { payload = text ? JSON.parse(text) : null; } catch {}
    return { ok: response.ok, status: response.status, payload };
  }, { method, route, body });
  entry.apiCalls.push({ method, route, status: result.status, ok: result.ok });
  entry.actions.push(`${method} ${route} -> ${result.status}`);
  if (!result.ok) throw new Error(`${method} ${route} failed ${result.status}: ${redact(result.payload).slice(0, 600)}`);
  return result.payload;
}

async function goto(page, entry, route, expectText) {
  const response = await page.goto(urlFor(route), { waitUntil: 'commit', timeout: 90000 });
  await page.waitForLoadState('domcontentloaded', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const text = await page.locator('body').innerText({ timeout: 20000 });
  const ok = text.toLowerCase().includes(expectText.toLowerCase());
  entry.checks.push({ name: `route ${route} contains ${expectText}`, ok, status: response?.status() || 0 });
  if (!ok) throw new Error(`${route} did not show expected text: ${expectText}`);
}

async function visibleMetrics(page) {
  return page.evaluate(() => {
    const candidates = [
      document.body,
      ...document.body.querySelectorAll('main, header, nav, section, article, aside, footer, h1, h2, h3, p, a, button, label, input, textarea, select, img, canvas, video, svg, [aria-label], [role]')
    ].slice(0, 600);
    const visible = candidates.filter(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.top < innerHeight && style.visibility !== 'hidden' && style.display !== 'none';
    });
    const text = visible.slice(0, 160).map(node => node.textContent || node.alt || node.getAttribute('aria-label') || '').join(' ').replace(/\s+/g, ' ').trim();
    const media = visible.filter(node => ['IMG', 'CANVAS', 'VIDEO', 'SVG'].includes(node.tagName));
    return { scrollY: Math.round(window.scrollY), visibleElementCount: visible.length, visibleTextLength: text.length, visibleMediaCount: media.length, sampleText: text.slice(0, 160), horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth };
  });
}

async function screenshot(page, entry, label) {
  const file = path.join(artifactDir, `${entry.viewportLabel}-${label}.png`);
  await page.screenshot({ path: file, fullPage: false, animations: 'disabled', timeout: 90000 });
  entry.screenshots.push({ label, path: file, bytes: fs.statSync(file).size });
  return file;
}

async function scrollProof(page, entry, label) {
  const maxY = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
  const stops = maxY < 8 ? [0] : [0, Math.round(maxY * 0.5), maxY];
  const results = [];
  for (const [index, y] of stops.entries()) {
    await page.evaluate(nextY => scrollTo(0, nextY), y);
    await page.waitForTimeout(350);
    const metrics = await visibleMetrics(page);
    const shot = await screenshot(page, entry, `${label}-scroll-${String(index + 1).padStart(2, '0')}`);
    const ok = metrics.visibleElementCount >= 3 && (metrics.visibleTextLength >= 20 || metrics.visibleMediaCount >= 1);
    results.push({ ...metrics, ok, screenshot: shot });
    if (!ok) throw new Error(`${label} visually blank at scrollY ${metrics.scrollY}`);
  }
  entry.scrollStops.push({ label, stops: results });
  await page.evaluate(() => scrollTo(0, 0));
}

async function touchForm(page, entry, selector, values, buttonText) {
  for (const [name, value] of Object.entries(values)) {
    const locator = page.locator(`${selector} [name="${name}"]`).first();
    if (await locator.count().catch(() => 0)) await locator.fill(String(value), { timeout: 5000 }).catch(() => {});
  }
  const button = page.locator(`${selector} button`, { hasText: buttonText }).first();
  if (await button.count().catch(() => 0)) {
    await button.click({ timeout: 5000 }).catch(() => {});
    entry.actions.push(`clicked ${buttonText}`);
    await page.waitForTimeout(1000);
  }
}

async function runMutations(page, entry) {
  const suffix = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const artistId = `artist_store_brain_${suffix}`;
  const targetArtistId = `artist_network_${suffix}`;
  const releaseId = `release_network_${suffix}`;

  await goto(page, entry, '/SkyeMusicNexus/public/store.html', 'Artist Store');
  await api(page, entry, 'POST', '/api/skymusicnexus/music-artists', { action: 'register', id: targetArtistId, name: `Network Artist ${suffix}`, email: `network-${suffix}@musicnexus.local` });
  await api(page, entry, 'POST', '/api/skymusicnexus/music-releases', { action: 'submit', id: releaseId, artistId: targetArtistId, title: `Network Single ${suffix}`, type: 'single', tracks: [{ title: 'Network Track', previewUrl: '/assets/proof/skyemusicnexus-exchange-e2e.webm', contentType: 'audio/mpeg', bytes: 2048 }], rights: { ownershipAttested: true, previewUseAuthorized: true } });
  const targetPost = (await api(page, entry, 'POST', '/api/skymusicnexus/music-social', { action: 'create-feed-post', artistId: targetArtistId, releaseId, caption: `Network post ${suffix}`, hashtags: 'musicnexus,proof' })).post;

  await touchForm(page, entry, '#storeProfileForm', { artistId, artistName: `Proof Artist ${suffix}`, name: `Proof Store ${suffix}` }, 'Save Store');
  const product = (await api(page, entry, 'POST', '/api/skymusicnexus/music-store', { action: 'create-product', artistId, artistName: `Proof Artist ${suffix}`, releaseId, title: `Proof Digital Access ${suffix}`, productType: 'digital', priceCents: 1300, fulfillmentType: 'digital-link', status: 'active' })).product;
  const order = (await api(page, entry, 'POST', '/api/skymusicnexus/music-store', { action: 'record-order', productId: product.productId || product.id, quantity: 1, buyerEmail: `fan-${suffix}@musicnexus.local`, feeMode: 'buyer_covered' })).order;
  await api(page, entry, 'POST', '/api/skymusicnexus/music-store', { action: 'fulfill-order', orderId: order.orderId, status: 'fulfilled', note: 'Live browser proof fulfillment.' });
  entry.checks.push({ name: 'store order has SkyePay checkout intent', ok: order.checkoutIntent?.provider === 'skypay', orderId: order.orderId });
  await scrollProof(page, entry, 'store');

  await goto(page, entry, '/SkyeMusicNexus/public/brain.html', 'Local Artist Brain');
  await touchForm(page, entry, '#artistBrainForm', { artistId, artistName: `Proof Artist ${suffix}`, objectives: 'stream network releases, post update, route fans to store' }, 'Seed Artist Brain');
  await api(page, entry, 'POST', '/api/skymusicnexus/music-brain', { action: 'add-memory', artistId, title: 'Live proof memory', text: 'This artist store and network release are available for local brain actions.', tags: 'proof,store,network' });
  const cycle = await api(page, entry, 'POST', '/api/skymusicnexus/music-brain', { action: 'run-local-cycle', artistId, limit: 6, execute: true, goal: 'listen, post, engage, route store' });
  const receiptKinds = (cycle.receipts || []).map(item => item.kind);
  entry.checks.push({ name: 'local brain streamed and engaged with network artist', ok: receiptKinds.includes('listen_release') && receiptKinds.some(kind => ['feed_post', 'engage_post'].includes(kind)), receiptKinds, targetPostId: targetPost.id });

  const activity = await api(page, entry, 'POST', '/api/skymusicnexus/music-gamify', { action: 'record-activity', artistId, artistName: `Proof Artist ${suffix}`, activityType: 'operator_award', points: 125, note: 'Live proof meter fill.' });
  const giveaway = (await api(page, entry, 'POST', '/api/skymusicnexus/music-gamify', { action: 'open-giveaway', title: `Proof Content Launch Giveaway ${suffix}`, prizeType: 'content_launch_drop_package', sponsorArtistId: artistId, entryCostPoints: 0, maxEntries: 25 })).giveaway;
  await api(page, entry, 'POST', '/api/skymusicnexus/music-gamify', { action: 'enter-giveaway', giveawayId: giveaway.giveawayId, artistId, note: 'Live proof entry.' });
  const draw = await api(page, entry, 'POST', '/api/skymusicnexus/music-gamify', { action: 'draw-giveaway', giveawayId: giveaway.giveawayId, winnerIndex: 0 });
  entry.checks.push({ name: 'SkyeMeter issued merits and giveaway awarded', ok: (activity.merits || []).length >= 1 && draw.giveaway?.status === 'awarded', meritCount: (activity.merits || []).length, giveawayStatus: draw.giveaway?.status });
  await scrollProof(page, entry, 'brain');
}

async function runViewport(browser, owner, viewport, viewportLabel, mutate) {
  const entry = { viewport, viewportLabel, ok: false, actions: [], checks: [], apiCalls: [], screenshots: [], scrollStops: [], consoleErrors: [], failedRequests: [], httpErrors: [], failures: [] };
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, deviceScaleFactor: 1, ignoreHTTPSErrors: true, extraHTTPHeaders: gateHeaders(owner.token) });
  await installSession(context, owner);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(90000);
  observe(page, entry);
  try {
    if (mutate) await runMutations(page, entry);
    else {
      await goto(page, entry, '/SkyeMusicNexus/public/store.html', 'Artist Store');
      await page.locator('a[href="./brain.html"]').first().click({ timeout: 5000 }).catch(() => {});
      entry.actions.push('clicked Store to Brain nav');
      await goto(page, entry, '/SkyeMusicNexus/public/brain.html', 'Local Artist Brain');
      await scrollProof(page, entry, 'mobile-brain');
      await goto(page, entry, '/SkyeMusicNexus/public/store.html', 'Artist Store');
      await scrollProof(page, entry, 'mobile-store');
    }
  } catch (error) {
    entry.failures.push(redact(error?.stack || error?.message || error).split('\n').slice(0, 8).join('\n'));
  } finally {
    entry.materialConsoleErrors = entry.consoleErrors.filter(message => !/Failed to load resource/i.test(message));
    if (entry.materialConsoleErrors.length) entry.failures.push(`console errors ${entry.materialConsoleErrors.slice(0, 3).join(' | ')}`);
    if (entry.failedRequests.length) entry.failures.push(`failed requests ${entry.failedRequests.slice(0, 3).map(item => item.url).join(', ')}`);
    if (entry.httpErrors.length) entry.failures.push(`HTTP errors ${entry.httpErrors.slice(0, 3).map(item => `${item.status} ${item.url}`).join(', ')}`);
    entry.ok = entry.failures.length === 0 && entry.checks.every(check => check.ok);
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
    results.push(await runViewport(browser, owner, { width: 1440, height: 980 }, 'desktop', true));
    results.push(await runViewport(browser, owner, { width: 390, height: 844 }, 'mobile', false));
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
    artifactDir,
    results,
    failures: results.flatMap(result => result.failures)
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, reportPath, deploymentVersion, summary: results.map(result => ({ viewport: result.viewportLabel, checks: result.checks.length, actions: result.actions.length, screenshots: result.screenshots.length, apiCalls: result.apiCalls.length })), failures: report.failures }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch(error => {
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = { ok: false, mode: 'headed-live-browser', headless: false, generatedAt: new Date().toISOString(), baseUrl, deploymentVersion, artifactDir, failures: [redact(error?.stack || error?.message || error)] };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, reportPath, error: redact(error?.message || error) }, null, 2));
  process.exit(1);
});
