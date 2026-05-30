#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'test-artifacts/live-browser-verifier', `${stamp}-webgrowthoperator-service-skyepay-live`);
const receiptPath = path.join(artifactDir, 'receipt.json');
fs.mkdirSync(artifactDir, { recursive: true });

const zeroOs = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const skyepayHost = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev';

const servicePages = [
  { slug: 'website-builds', title: 'Website Builds', expectedButtons: 3 },
  { slug: 'managed-hosting-care', title: 'Managed Hosting + Care', expectedButtons: 3, clickCheckout: 'media-over-london-host-care' },
  { slug: 'content-engine', title: 'Content Engine', expectedButtons: 3 },
  { slug: 'paid-traffic', title: 'Paid Traffic Management', expectedButtons: 4 },
  { slug: 'google-business-profile', title: 'Google Business Profile Ops', expectedButtons: 3 },
  { slug: 'review-engine', title: 'Review Engine', expectedButtons: 3 },
  { slug: 'missed-call-recovery', title: 'Missed-Call + Lead Recovery', expectedButtons: 2 },
  { slug: 'crm-follow-up', title: 'CRM + Follow-Up Automation', expectedButtons: 2 },
  { slug: 'lead-dashboard-reporting', title: 'Lead Dashboard + Reporting', expectedButtons: 2 },
  { slug: 'revenue-ops', title: 'Revenue Ops Retainers', expectedButtons: 4 }
];

const serviceBasePath = '/Marketing-Made-Easy/WebGrowthOperator/services';
const viewports = [
  { name: 'desktop', width: 1440, height: 980 },
  { name: 'mobile', width: 390, height: 844 }
];

const ownerKeys = [
  'FREE99_ADMIN_CODE', 'FREE99_ADMIN_PASSWORD', 'FREE99_GATE_CODE', 'FREE99_GATE_PASSWORD',
  'FREE99_OWNER_CODE', 'FREE99_OWNER_PASSWORD', 'FREE99_PASSWORD', 'ZERO_OS_GATE_CODE',
  'ZERO_OS_ADMIN_CODE', 'METRAIYUX_OWNER_ADMIN_CODE', 'FREE99_DEMON_CODE', 'FREE99_DEMON_KEY',
  'DEMON_ADMIN_CODE', 'DEMON_GATE_CODE', 'DEMON_KEY', 'OWNER_ADMIN_CODE', 'OWNER_ADMIN_PASSWORD',
  'ADMIN_CODE', 'ADMIN_PASSWORD', 'FS27_ADMIN_CODE', 'FS27_ADMIN_PASSWORD', 'FS27_OWNER_CODE',
  'FS27_OWNER_PASSWORD', 'SKYE_GATE_ADMIN_CODE', 'SKYE_GATE_ADMIN_PASSWORD', 'SKYGATE_ADMIN_CODE',
  'SKYGATE_ADMIN_PASSWORD', 'SKYGATEFS27_ADMIN_CODE', 'SKYGATEFS27_ADMIN_PASSWORD',
  'SKYGATEFS13_ADMIN_PASSWORD', 'QA_ADMIN_PASSWORD', 'PHC_BOOTSTRAP_ADMIN_CODE',
  'SITE_OPERATOR_ADMIN_TOKEN', 'METRAIYUX_ADMIN_TOKEN', 'ADMIN_TOKEN',
  'SKYGATEFS13_WORKER_ADMIN_TOKEN', 'MCP_HTTP_BEARER_TOKEN', 'ZERO_OS_GATE_CREDENTIAL_ENV'
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

function unquote(value) {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function readEnv() {
  const env = {};
  const source = {};
  for (const file of ['.env', 'env.txt']) {
    const full = path.join(repoRoot, file);
    if (!fs.existsSync(full)) continue;
    fs.readFileSync(full, 'utf8').split(/\r?\n/).forEach((raw, index) => {
      const match = raw.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) return;
      env[match[1]] = unquote(match[2]);
      source[match[1]] = `${file}:${match[1]}:${index + 1}`;
    });
  }
  return { env, source };
}

function resolveEnv(env, value, seen = new Set()) {
  const text = String(value || '').trim();
  const alias = text.match(/^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/);
  if (alias && !seen.has(alias[1])) {
    seen.add(alias[1]);
    return resolveEnv(env, env[alias[1]], seen);
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(text) && env[text] && !seen.has(text)) {
    seen.add(text);
    return resolveEnv(env, env[text], seen);
  }
  return text;
}

function sha12(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12);
}

function gateHeaders(token) {
  const clean = String(token || '').replace(/^Bearer\s+/i, '').trim();
  return {
    authorization: `Bearer ${clean}`,
    'x-admin-token': clean,
    'x-free99-gate-session': clean,
    'x-skye-gate-session': clean
  };
}

async function ownerSession() {
  const { env, source } = readEnv();
  const candidates = [];
  for (const key of ownerKeys) {
    if (!(key in env)) continue;
    const value = resolveEnv(env, env[key]);
    if (!value || value.startsWith('${')) continue;
    if (!candidates.some((candidate) => candidate.value === value)) {
      candidates.push({ value, source: source[key] || key });
    }
  }

  const failures = [];
  for (const candidate of candidates) {
    const response = await fetch(`${zeroOs}/api/owner/admin-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: candidate.value })
    });
    const data = await response.json().catch(() => ({}));
    const token = data.gateToken || data.gateBearerToken || data.token;
    if (response.ok && token) {
      return {
        token,
        source: candidate.source,
        candidateHash: sha12(candidate.value),
        status: response.status
      };
    }
    failures.push({ source: candidate.source, candidateHash: sha12(candidate.value), status: response.status, error: data.error || '' });
  }
  throw new Error(`Owner login failed: ${JSON.stringify(failures.slice(0, 8))}`);
}

async function installSession(context, token) {
  const clean = String(token || '').replace(/^Bearer\s+/i, '').trim();
  const session = { token: clean, source: 'owner-admin-login', platform_id: 'metraiyux-0s', issued_at: new Date().toISOString() };
  await context.addInitScript((sessionValue) => {
    for (const key of ['FREE99_PLATFORM_GATE_SESSION', 'METRAIYUX_GATE_SESSION', 'SKYE_MUSIC_NEXUS_GATE_SESSION']) {
      sessionStorage.setItem(key, JSON.stringify(sessionValue));
      localStorage.setItem(key, JSON.stringify(sessionValue));
    }
  }, session);
}

function observe(page, entry) {
  page.on('console', (message) => {
    if (message.type() === 'error') entry.consoleErrors.push(message.text().slice(0, 1000));
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || 'request failed';
    if (!failure.includes('ERR_ABORTED')) {
      entry.failedRequests.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), failure });
    }
  });
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && !url.includes('favicon.ico') && !url.includes('fonts.gstatic.com')) {
      entry.httpErrors.push({ url, status: response.status(), method: response.request().method(), resourceType: response.request().resourceType() });
    }
  });
}

async function visibleMetrics(page) {
  return page.evaluate(() => {
    const vh = innerHeight;
    const nodes = [document.body, ...document.body.querySelectorAll('main, section, h1, h2, h3, p, a, button, img, canvas, video, svg, li, td, th')].slice(0, 1800);
    const visible = nodes.filter((node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.top < vh && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) > 0.03;
    });
    const sampleText = visible.slice(0, 160).map((node) => node.textContent || node.alt || '').join(' ').replace(/\s+/g, ' ').trim();
    const contentNodes = visible.filter((node) => !['BODY', 'MAIN', 'SECTION'].includes(node.tagName));
    const media = visible.filter((node) => ['IMG', 'SVG', 'CANVAS', 'VIDEO'].includes(node.tagName)).length;
    const buttons = visible.filter((node) => ['A', 'BUTTON'].includes(node.tagName)).length;
    return {
      scrollY: Math.round(scrollY),
      viewport: { width: innerWidth, height: innerHeight },
      documentHeight: Math.round(document.documentElement.scrollHeight),
      visibleNodes: visible.length,
      contentNodes: contentNodes.length,
      media,
      buttons,
      textLength: sampleText.length,
      sampleText: sampleText.slice(0, 240),
      nonblank: contentNodes.length >= 4 && sampleText.length >= 60
    };
  });
}

async function scrollProof(page, entry, prefix) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = page.viewportSize()?.height || 900;
  const stops = new Set([0, Math.max(0, Math.floor(height * 0.25)), Math.max(0, Math.floor(height * 0.5)), Math.max(0, Math.floor(height * 0.75)), Math.max(0, height - viewportHeight)]);
  for (const y of stops) {
    await page.evaluate((target) => scrollTo(0, target), y);
    await page.waitForTimeout(350);
    const metrics = await visibleMetrics(page);
    const screenshot = path.join(artifactDir, `${prefix}-scroll-${String(entry.scrollStops.length).padStart(2, '0')}.png`);
    await page.screenshot({ path: screenshot, fullPage: false, animations: 'disabled', timeout: 60000 });
    entry.scrollStops.push({ y, screenshot, metrics });
    if (!metrics.nonblank) throw new Error(`${prefix} visually blank at scroll ${y}`);
  }
}

async function assertServicePage(page, config, entry) {
  const url = `${zeroOs}${serviceBasePath}/${config.slug}`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  entry.routes.push({ id: config.slug, url, status: response?.status() || null });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.getByRole('heading', { name: config.title, exact: false }).first().waitFor({ timeout: 10000 });
  await page.getByText('SkyePay backed').first().waitFor({ timeout: 10000 });
  const buttons = page.locator('td.skyepay-cell a[href*="skyepay.html"][href*="media-over-london-"]');
  const count = await buttons.count();
  entry.skyePayButtons.push({ slug: config.slug, count, expected: config.expectedButtons });
  if (count !== config.expectedButtons) throw new Error(`${config.slug} expected ${config.expectedButtons} SkyePay buttons, got ${count}`);
  await scrollProof(page, entry, config.slug);
}

async function clickManagedCheckout(page, entry) {
  const link = page.locator('a[href*="offer=media-over-london-host-care"]').first();
  await link.scrollIntoViewIfNeeded();
  const href = await link.getAttribute('href');
  const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
  await link.click();
  let checkoutPage = await popupPromise;
  if (!checkoutPage) checkoutPage = page;
  await checkoutPage.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await checkoutPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const title = await checkoutPage.title().catch(() => '');
  const text = await checkoutPage.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const screenshot = path.join(artifactDir, 'managed-hosting-host-care-skyepay-click.png');
  await checkoutPage.screenshot({ path: screenshot, fullPage: false, animations: 'disabled', timeout: 60000 });
  entry.actions.push({
    type: 'click',
    label: 'Managed Hosting Host + Care SkyePay',
    href,
    finalUrl: checkoutPage.url(),
    title,
    screenshot,
    containsSkyePay: /SkyePay/i.test(text),
    containsOffer: /Host \+ Care|Host Care|Managed Hosting/i.test(text)
  });
  if (!/SkyePay/i.test(text)) throw new Error('SkyePay checkout click did not land on SkyePay content.');
  if (checkoutPage !== page) await checkoutPage.close();
}

async function httpSmoke(token) {
  const headers = gateHeaders(token);
  const unauth = await fetch(`${zeroOs}${serviceBasePath}/managed-hosting-care`, { redirect: 'manual' });
  const auth = await fetch(`${zeroOs}${serviceBasePath}/managed-hosting-care`, { headers });
  const authText = await auth.text();
  const offers = [];
  for (const pageConfig of servicePages) {
    const html = await fetch(`${zeroOs}${serviceBasePath}/${pageConfig.slug}`, { headers }).then((res) => res.text());
    for (const match of html.matchAll(/https:\/\/skyegatefs27-citadeldb\.graylondonskyes\.workers\.dev\/skyepay\.html\?client=metraiyux-0s&amp;offer=([^"]+)/g)) {
      offers.push(match[1]);
    }
  }
  const uniqueOffers = [...new Set(offers)];
  const checkoutStatuses = [];
  for (const offer of uniqueOffers) {
    const url = `${skyepayHost}/skyepay.html?client=metraiyux-0s&offer=${offer}`;
    const response = await fetch(url);
    const body = await response.text();
    checkoutStatuses.push({ offer, url, status: response.status, ok: response.ok && /SkyePay/i.test(body) });
  }
  return {
    unauth: { status: unauth.status, location: unauth.headers.get('location') },
    auth: { status: auth.status, hasManagedPage: /Managed Hosting \+ Care/.test(authText), hasSkyePay: /SkyePay backed/.test(authText) },
    uniqueOfferCount: uniqueOffers.length,
    checkoutStatuses,
    ok: unauth.status === 302 && auth.ok && /SkyePay backed/.test(authText) && uniqueOffers.length === 29 && checkoutStatuses.every((item) => item.ok)
  };
}

relaunchWithXvfbWhenNeeded();

const receipt = {
  ok: false,
  generatedAt: new Date().toISOString(),
  deploymentVersion: '4436c80c-ee51-40de-9520-bf10b7408c94',
  zeroOs,
  serviceBasePath,
  artifactDir,
  receiptPath,
  ownerSession: null,
  httpSmoke: null,
  viewports: [],
  failures: []
};

let browser;
try {
  const session = await ownerSession();
  receipt.ownerSession = { source: session.source, candidateHash: session.candidateHash, status: session.status };
  receipt.httpSmoke = await httpSmoke(session.token);
  if (!receipt.httpSmoke.ok) throw new Error(`HTTP smoke failed: ${JSON.stringify(receipt.httpSmoke)}`);

  browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true, reducedMotion: 'reduce' });
    await installSession(context, session.token);
    await context.setExtraHTTPHeaders(gateHeaders(session.token));
    const page = await context.newPage();
    const entry = { viewport, routes: [], skyePayButtons: [], actions: [], scrollStops: [], consoleErrors: [], failedRequests: [], httpErrors: [] };
    observe(page, entry);

    if (viewport.name === 'mobile') {
      const managedUrl = `${zeroOs}${serviceBasePath}/managed-hosting-care`;
      await page.goto(managedUrl, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /menu/i }).click();
      await page.getByRole('link', { name: 'Pricing' }).click();
      await page.waitForURL(/pricing/);
      entry.actions.push({ type: 'mobile-nav', label: 'Menu -> Pricing', finalUrl: page.url() });
    }

    for (const config of servicePages) {
      await assertServicePage(page, config, entry);
      if (config.clickCheckout && viewport.name === 'desktop') await clickManagedCheckout(page, entry);
    }

    entry.consoleErrorCount = entry.consoleErrors.length;
    entry.failedRequestCount = entry.failedRequests.length;
    entry.httpErrorCount = entry.httpErrors.length;
    receipt.viewports.push(entry);
    await context.close();
  }

  const failures = [];
  for (const entry of receipt.viewports) {
    if (entry.consoleErrors.length) failures.push(`${entry.viewport.name}: console errors ${entry.consoleErrors.length}`);
    if (entry.failedRequests.length) failures.push(`${entry.viewport.name}: failed requests ${entry.failedRequests.length}`);
    const materialHttp = entry.httpErrors.filter((error) => !/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(error.url));
    if (materialHttp.length) failures.push(`${entry.viewport.name}: HTTP errors ${materialHttp.length}`);
  }
  receipt.failures = failures;
  receipt.ok = failures.length === 0;
} catch (error) {
  receipt.ok = false;
  receipt.failures.push(error?.stack || error?.message || String(error));
} finally {
  if (browser) await browser.close().catch(() => {});
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receiptPath,
    httpSmoke: receipt.httpSmoke && {
      ok: receipt.httpSmoke.ok,
      unauthStatus: receipt.httpSmoke.unauth.status,
      authStatus: receipt.httpSmoke.auth.status,
      uniqueOfferCount: receipt.httpSmoke.uniqueOfferCount,
      checkoutOk: receipt.httpSmoke.checkoutStatuses.filter((item) => item.ok).length
    },
    viewports: receipt.viewports.map((entry) => ({
      viewport: entry.viewport.name,
      routes: entry.routes.length,
      scrollStops: entry.scrollStops.length,
      consoleErrors: entry.consoleErrors.length,
      failedRequests: entry.failedRequests.length,
      httpErrors: entry.httpErrors.length
    })),
    failures: receipt.failures
  }, null, 2));
  process.exit(receipt.ok ? 0 : 1);
}
