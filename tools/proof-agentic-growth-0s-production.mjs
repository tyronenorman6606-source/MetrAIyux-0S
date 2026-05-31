#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = '/workspaces/MetrAIyux-0S';
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const appPath = '/agentic-growth-layer/';
const artifactDir = path.join(repoRoot, 'test-artifacts', 'agentic-growth-layer', '0s-live-proof');
const deploymentVersion = process.env.PROOF_DEPLOYMENT_VERSION || '9f3a7f26-685f-4be1-a4b8-11f823f4926b';
let adminGateToken = '';

async function resolveAdminGateToken() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: baseUrl });
  const token = String(auth.token || '').replace(/^Bearer\s+/i, '').trim();
  if (!auth.ok || !token) throw new Error('No shared 0S gate session was available.');
  return token;
}

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== 'linux') return;
  if (process.env.DISPLAY || process.env.LIVE_BROWSER_XVFB_ACTIVE === '1') return;
  const probe = spawnSync('which', ['xvfb-run'], {encoding: 'utf8'});
  if (probe.status !== 0) return;
  const child = spawnSync('xvfb-run', ['-a', process.execPath, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: {...process.env, LIVE_BROWSER_XVFB_ACTIVE: '1'}
  });
  process.exit(child.status ?? 1);
}

function urlFor(route) {
  return new URL(route, baseUrl).toString();
}

function cleanFailure(error) {
  return String(error?.stack || error?.message || error)
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, '$1[redacted]')
    .replace(/(code=)[^&\s)]+/gi, '$1[redacted]')
    .split('\n')
    .slice(0, 10)
    .join('\n');
}

function gateHeaders(token) {
  const clean = String(token || '').replace(/^Bearer\s+/i, '').trim();
  return clean ? {
    Authorization: `Bearer ${clean}`,
    'x-free99-gate-session': clean,
    'x-skye-gate-session': clean
  } : {};
}

async function installSharedGateSession(context, token) {
  const clean = String(token || '').replace(/^Bearer\s+/i, '').trim();
  if (!clean) return;
  const host = new URL(baseUrl).hostname;
  await context.addCookies([
    { name: 'skye_gate_session', value: clean, domain: host, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    { name: 'skygate_session', value: clean, domain: host, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }
  ]);
  await context.addInitScript((shared) => {
    for (const key of ['FREE99_PLATFORM_GATE_SESSION', 'METRAIYUX_GATE_SESSION', 'SKYE_GATE_SESSION']) {
      sessionStorage.setItem(key, JSON.stringify(shared));
      localStorage.setItem(key, JSON.stringify(shared));
    }
  }, {
    token: clean,
    source: 'zero-os-gate-auth',
    platform_id: 'metraiyux-0s',
    usage_lane: 'fs27-owner-gate',
    issued_at: new Date().toISOString()
  });
}

async function checkUnauth(route, accept = 'text/html') {
  const response = await fetch(urlFor(route), {redirect: 'manual', headers: {accept}});
  const location = response.headers.get('location') || '';
  return {
    route,
    status: response.status,
    gateHeader: response.headers.get('x-0s-gate') || '',
    locationPath: location ? new URL(location, baseUrl).pathname : '',
    hasReturn: location.includes('return='),
    ok: route.startsWith('/api/')
      ? response.status === 401 && response.headers.get('x-0s-gate') === 'fs27-required'
      : response.status === 302 && location.includes('/admin/login.html') && location.includes('return=')
  };
}

async function loginOwner(page, entry) {
  const responseAfterLogin = await page.goto(urlFor(appPath), {waitUntil: 'domcontentloaded', timeout: 45000});
  entry.statuses.push({name: 'returned_to_agentic_surface', ok: Boolean(responseAfterLogin?.ok()), status: responseAfterLogin?.status() || 0});
  entry.actions.push('opened Agentic Growth 0S surface with shared gate session');
}

async function visibleMetrics(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText || '';
    const elements = [...document.querySelectorAll('body *')];
    const visibleElements = elements.filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    }).length;
    const images = [...document.images].map(img => ({
      src: img.currentSrc || img.src || '',
      complete: img.complete,
      width: img.naturalWidth || 0,
      height: img.naturalHeight || 0
    }));
    const brokenImages = images.filter(img => img.src && (!img.complete || img.width < 1 || img.height < 1)).length;
    const maxRight = Math.max(document.documentElement.scrollWidth || 0, document.body?.scrollWidth || 0);
    return {
      viewport: {width: innerWidth, height: innerHeight},
      textLength: text.trim().length,
      visibleElements,
      imageCount: images.length,
      brokenImages,
      horizontalOverflowPx: Math.max(0, maxRight - document.documentElement.clientWidth),
      path: location.pathname
    };
  });
}

async function screenshot(page, entry, name) {
  const file = path.join(artifactDir, `${entry.label}-${name}.png`);
  await page.screenshot({path: file, fullPage: false});
  entry.screenshots.push(file);
  return file;
}

async function scrollProof(page, entry) {
  const scrollHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0));
  const viewportHeight = page.viewportSize()?.height || 800;
  const stops = [];
  for (let y = 0; y < scrollHeight; y += Math.max(260, Math.floor(viewportHeight * 0.72))) stops.push(y);
  if (!stops.includes(scrollHeight - viewportHeight)) stops.push(Math.max(0, scrollHeight - viewportHeight));
  const uniqueStops = [...new Set(stops)].slice(0, 18);
  for (const y of uniqueStops) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(180);
    const metrics = await visibleMetrics(page);
    const shot = await screenshot(page, entry, `scroll-${String(y).padStart(5, '0')}`);
    const ok = metrics.textLength > 80 && metrics.visibleElements > 6 && metrics.brokenImages === 0 && metrics.horizontalOverflowPx <= 2;
    entry.scrollStops.push({y, ok, metrics, screenshot: shot});
    if (!ok) throw new Error(`Visual scroll proof failed at ${y}: ${JSON.stringify(metrics)}`);
  }
}

async function observe(page, entry) {
  page.on('console', (message) => {
    if (message.type() === 'error') entry.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    entry.failedRequests.push({url: request.url(), method: request.method(), failure: request.failure()?.errorText || 'request failed'});
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      entry.httpErrors.push({url: response.url(), status, method: response.request().method(), resourceType: response.request().resourceType()});
    }
  });
}

async function exercise(page, entry) {
  await page.waitForSelector('text=Agentic Growth Layer', {timeout: 30000});
  await screenshot(page, entry, 'loaded');
  await page.click('#schemaBtn');
  await page.waitForFunction(() => document.querySelector('#summary')?.textContent?.includes('Schema loaded'), null, {timeout: 20000});
  entry.actions.push('opened gated API schema');
  await page.click('#runCycle');
  await page.waitForFunction(() => /prioritized changes generated/.test(document.querySelector('#summary')?.textContent || ''), null, {timeout: 30000});
  entry.actions.push('ran no-domain-capable growth cycle');
  await page.click('#buildPatch');
  await page.waitForFunction(() => (document.querySelector('#patchOut')?.textContent || '').includes('patch-manifest.json'), null, {timeout: 30000});
  entry.actions.push('built reviewable static patch manifest');
  await page.click('#refreshLedger');
  await page.waitForFunction(() => (document.querySelector('#ledgerList')?.textContent || '').includes('agl_0s_cycle'), null, {timeout: 30000});
  entry.actions.push('refreshed 0S proof ledger');
  await page.click('#runFallback');
  await page.waitForFunction(() => /No-domain agentic SEO starter|no-domain/i.test(document.querySelector('#summary')?.textContent || ''), null, {timeout: 30000});
  entry.actions.push('generated no-domain fallback brief');
  const state = await page.evaluate(() => ({
    title: document.title,
    receipt: document.querySelector('#receiptTitle')?.textContent || '',
    summary: document.querySelector('#summary')?.textContent || '',
    serviceItems: document.querySelectorAll('#serviceQueue li').length,
    faqItems: document.querySelectorAll('#faqQueue li').length,
    linkItems: document.querySelectorAll('#linkQueue li').length,
    patchHasManifest: (document.querySelector('#patchOut')?.textContent || '').includes('patch-manifest.json'),
    ledgerItems: document.querySelectorAll('#ledgerList .ledger-item').length,
    authText: document.querySelector('#authState')?.textContent || '',
    engineText: document.querySelector('#engineState')?.textContent || '',
    appSpecificGateKeys: Object.keys(sessionStorage).filter(key => /^AGENTIC|AGL|AGENTIC_GROWTH_API_KEY|FREE99_PLATFORM_GATE_SESSION_/.test(key))
  }));
  entry.statuses.push({
    name: 'agentic_growth_workspace_state',
    ok: state.serviceItems > 0 && state.faqItems > 0 && state.linkItems > 0 && state.patchHasManifest && state.ledgerItems > 0 && state.appSpecificGateKeys.length === 0,
    state
  });
}

async function runViewport(browser, viewport, label, storageState = null) {
  const context = await browser.newContext({
    viewport,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: gateHeaders(adminGateToken),
    ...(storageState ? {storageState} : {})
  });
  await installSharedGateSession(context, adminGateToken);
  const page = await context.newPage();
  const entry = {
    label,
    viewport,
    actions: [],
    statuses: [],
    screenshots: [],
    scrollStops: [],
    consoleErrors: [],
    failedRequests: [],
    httpErrors: []
  };
  await observe(page, entry);
  if (storageState) {
    const response = await page.goto(urlFor(appPath), {waitUntil: 'domcontentloaded', timeout: 45000});
    entry.statuses.push({name: 'reused_shared_gate_session', ok: Boolean(response?.ok()), status: response?.status() || 0});
    entry.actions.push('reused authenticated shared 0S gate session');
  } else {
    await loginOwner(page, entry);
  }
  await exercise(page, entry);
  await scrollProof(page, entry);
  entry.finalMetrics = await visibleMetrics(page);
  const nextStorageState = await context.storageState();
  await context.close();
  return {entry, storageState: nextStorageState};
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  fs.mkdirSync(artifactDir, {recursive: true});
  const receipt = {
    ok: false,
    product: 'Agentic Growth Layer',
    surface: `${baseUrl}${appPath}`,
    deploymentVersion,
    generatedAt: new Date().toISOString(),
    unauth: [],
    entries: [],
    failures: []
  };
  try {
    receipt.unauth.push(await checkUnauth(appPath, 'text/html'));
    receipt.unauth.push(await checkUnauth('/api/agentic-growth/health', 'application/json'));
    if (!receipt.unauth.every(item => item.ok)) throw new Error(`Unauth gate checks failed: ${JSON.stringify(receipt.unauth)}`);
    adminGateToken = await resolveAdminGateToken();

    const browser = await chromium.launch({headless: false, slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 70)});
    try {
      const desktop = await runViewport(browser, {width: 1440, height: 960}, 'desktop');
      receipt.entries.push(desktop.entry);
      const mobile = await runViewport(browser, {width: 390, height: 844}, 'mobile', desktop.storageState);
      receipt.entries.push(mobile.entry);
    } finally {
      await browser.close();
    }

    const materialHttpErrors = receipt.entries.flatMap(entry => entry.httpErrors).filter(item => {
      if (item.url.includes('/api/owner/admin-login')) return false;
      return item.status >= 400;
    });
    receipt.ok = receipt.entries.every(entry =>
      entry.statuses.every(status => status.ok !== false)
      && entry.scrollStops.every(stop => stop.ok)
      && entry.consoleErrors.length === 0
      && entry.failedRequests.length === 0
    ) && materialHttpErrors.length === 0;
    receipt.materialHttpErrors = materialHttpErrors;
    if (!receipt.ok) throw new Error('Live browser proof found failures.');
  } catch (error) {
    receipt.failures.push(cleanFailure(error));
  }
  receipt.completedAt = new Date().toISOString();
  const receiptPath = path.join(artifactDir, 'receipt.json');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: receiptPath,
    entries: receipt.entries.map(entry => ({
      label: entry.label,
      actions: entry.actions.length,
      scrollStops: entry.scrollStops.length,
      consoleErrors: entry.consoleErrors.length,
      failedRequests: entry.failedRequests.length,
      httpErrors: entry.httpErrors.length
    })),
    failures: receipt.failures
  }, null, 2));
  process.exit(receipt.ok ? 0 : 1);
}

main();
