#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = '/workspaces/MetrAIyux-0S';
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const adminPath = '/admin/company-knowledge.html';
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'company-knowledge-skyesol-ingest');
const screenshotRoot = path.join(artifactRoot, 'screenshots');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const receiptPath = path.join(artifactRoot, `${runId}-live-browser-proof.json`);

fs.mkdirSync(screenshotRoot, { recursive: true });

function log(message) {
  console.log(`[skyesol-proof] ${message}`);
}

function urlFor(route) {
  return new URL(route, baseUrl).toString();
}

async function fetchJson(route, options = {}) {
  const response = await fetch(urlFor(route), {
    ...options,
    signal: AbortSignal.timeout(Number(options.timeoutMs || 30000))
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && data?.ok !== false, status: response.status, data };
}

function authHeaders(token, extra = {}) {
  return {
    ...extra,
    authorization: `Bearer ${token}`,
    'x-skye-gate-session': token,
    'x-free99-gate-session': token,
    'x-skye-usage-lane': 'company-knowledge'
  };
}

async function resolveOwnerSession(receipt) {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: baseUrl });
  const token = String(auth.token || '').replace(/^Bearer\s+/i, '').trim();
  receipt.credential.attempts.push({ sourceKey: auth.credential?.source || 'shared-gate', status: auth.response?.status || 0, ok: Boolean(auth.ok && token) });
  if (!auth.ok || !token) throw new Error('Shared 0S gate session was unavailable.');
  return { token, sourceKey: auth.credential?.key || 'shared-gate', method: 'zero-os-gate-auth' };
}

function cleanFailure(error) {
  return String(error?.stack || error?.message || error)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]')
    .split('\n')
    .slice(0, 8)
    .join('\n');
}

async function viewportMetrics(page) {
  return page.evaluate(() => {
    const visible = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity || 1) === 0) continue;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.right < 0 || rect.top > innerHeight || rect.left > innerWidth) continue;
      if (rect.width < 1 || rect.height < 1) continue;
      visible.push(el);
    }
    const text = visible.map((el) => el.innerText || el.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
    const images = Array.from(document.images).filter((img) => {
      const rect = img.getBoundingClientRect();
      return rect.bottom >= 0 && rect.top <= innerHeight && rect.right >= 0 && rect.left <= innerWidth;
    });
    const samples = [];
    for (const x of [0.18, 0.5, 0.82]) {
      for (const y of [0.18, 0.5, 0.82]) {
        const el = document.elementFromPoint(Math.floor(innerWidth * x), Math.floor(innerHeight * y));
        if (!el) continue;
        samples.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          className: String(el.className || '').slice(0, 80),
          text: String(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100)
        });
      }
    }
    return {
      url: location.href,
      title: document.title,
      viewport: { width: innerWidth, height: innerHeight },
      scrollY: Math.round(scrollY),
      scrollHeight: Math.round(document.documentElement.scrollHeight),
      visibleElementCount: visible.length,
      visibleTextChars: text.length,
      tableRows: document.querySelectorAll('tbody tr').length,
      knowledgeHits: document.querySelectorAll('.knowledge-hit').length,
      loadedImages: images.filter((img) => img.complete && img.naturalWidth > 0).length,
      brokenImages: images.filter((img) => img.complete && img.naturalWidth === 0).length,
      backgroundImageElements: visible.filter((el) => getComputedStyle(el).backgroundImage !== 'none').length,
      samplePoints: samples
    };
  });
}

async function captureStop(page, entry, label, index) {
  await page.waitForTimeout(350);
  log(`${entry.viewportLabel}: capturing ${label}`);
  const screenshotPath = path.join(screenshotRoot, `${runId}-${entry.viewportLabel}-${String(index).padStart(2, '0')}-${label}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const metrics = await viewportMetrics(page);
  const screenshotBytes = fs.statSync(screenshotPath).size;
  const nonblank = screenshotBytes > 1000
    && metrics.brokenImages === 0
    && (metrics.visibleTextChars > 80 || metrics.visibleElementCount > 20 || metrics.tableRows > 0 || metrics.knowledgeHits > 0);
  entry.scrollStops.push({ label, screenshotPath, screenshotBytes, nonblank, metrics });
  entry.statuses.push({ name: `nonblank-${label}`, ok: nonblank, screenshotPath });
}

async function prepareContext(browser, token, viewport) {
  const context = await browser.newContext({
    viewport,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: authHeaders(token)
  });
  await context.addInitScript((sessionToken) => {
    const shared = {
      token: sessionToken,
      source: 'codex-skyesol-company-knowledge-live-proof',
      platform_id: 'metraiyux-0s',
      usage_lane: 'company-knowledge',
      issued_at: new Date().toISOString()
    };
    sessionStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(shared));
    localStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(shared));
    sessionStorage.setItem('METRAIYUX_GATE_SESSION', JSON.stringify(shared));
    localStorage.setItem('METRAIYUX_GATE_SESSION', JSON.stringify(shared));
    sessionStorage.setItem('SKYE_GATE_SESSION', JSON.stringify(shared));
    localStorage.setItem('SKYE_GATE_SESSION', JSON.stringify(shared));
  }, token);
  return context;
}

async function exerciseViewport(browser, token, viewportLabel, viewport) {
  const context = await prepareContext(browser, token, viewport);
  const page = await context.newPage();
  const entry = {
    viewportLabel,
    viewport,
    actions: [],
    statuses: [],
    consoleErrors: [],
    failedNetwork: [],
    scrollStops: [],
    ok: false
  };
  page.on('console', (msg) => {
    if (msg.type() === 'error') entry.consoleErrors.push({ type: msg.type(), text: msg.text().slice(0, 500) });
  });
  page.on('requestfailed', (request) => {
    entry.failedNetwork.push({ type: 'requestfailed', url: request.url(), failure: request.failure()?.errorText || '' });
  });
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !/favicon|robots\.txt|sitemap\.xml/i.test(url)) {
      entry.failedNetwork.push({ type: 'http', status, url });
    }
  });

  try {
    log(`${viewportLabel}: opening deployed company knowledge console`);
    const response = await page.goto(urlFor(adminPath), { waitUntil: 'domcontentloaded', timeout: 45000 });
    entry.statuses.push({ name: 'admin-page-loaded', ok: Boolean(response?.ok()), status: response?.status() || 0, url: page.url() });
    await page.waitForSelector('#loadKnowledgeBases', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null);

    log(`${viewportLabel}: loading bases/items`);
    await page.locator('#loadKnowledgeBases').click();
    entry.actions.push('clicked Load Bases');
    await page.waitForFunction(() => document.querySelector('#knowledgeBaseRows')?.innerText.includes('metraiyux-0s'), null, { timeout: 30000 });
    await page.locator('[data-select-base="metraiyux-0s"]').first().click().catch(async () => {
      await page.fill('#knowledgeBaseId', 'metraiyux-0s');
    });
    entry.actions.push('selected metraiyux-0s base');
    await page.locator('#loadKnowledgeItems').click();
    entry.actions.push('clicked Load Items');
    await page.waitForFunction(() => {
      const text = document.querySelector('#knowledgeItemRows')?.innerText || '';
      return text.includes('Skyes Over London Deep Scan Knowledge Pack') && text.includes('Skyes Over London LC Company Dossier');
    }, null, { timeout: 45000 });
    entry.statuses.push({ name: 'skyesol-items-visible', ok: true });

    log(`${viewportLabel}: running context query`);
    await page.fill('#knowledgeQuery', 'kAIxU Gateway13 Lane Vault SkyeFyve SkyeSuite SkyeSol company doctrine');
    await page.locator('#knowledgeSearchForm button[type="submit"]').click();
    entry.actions.push('clicked Build Context for SkyeSol query');
    await page.waitForFunction(() => {
      const status = document.querySelector('#knowledgeStatus')?.textContent || '';
      const context = document.querySelector('#knowledgeContext')?.textContent || '';
      const hits = document.querySelector('#knowledgeSearchRows')?.textContent || '';
      return /Found \d+ matching item/.test(status) || context.length > 120 || hits.length > 120;
    }, null, { timeout: 45000 }).catch(() => null);
    const contextText = await page.locator('#knowledgeContext').textContent().catch(() => '');
    const hitText = await page.locator('#knowledgeSearchRows').textContent().catch(() => '');
    const statusText = await page.locator('#knowledgeStatus').textContent().catch(() => '');
    const combinedContextText = `${contextText} ${hitText} ${statusText}`;
    entry.statuses.push({
      name: 'context-results-visible',
      ok: /Found \d+ matching item/.test(statusText)
        && /Skyes Over London|Deep Scan|Dossier|kAIxU|Gateway13|SkyeSol/i.test(combinedContextText),
      contextChars: contextText.length,
      statusText: statusText.slice(0, 240),
      hitPreview: hitText.slice(0, 400)
    });

    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const maxScroll = Math.max(0, scrollHeight - viewport.height);
    const stops = [...new Set([0, Math.floor(maxScroll * 0.33), Math.floor(maxScroll * 0.66), maxScroll])];
    for (let index = 0; index < stops.length; index += 1) {
      await page.evaluate((y) => window.scrollTo(0, y), stops[index]);
      await captureStop(page, entry, `scroll-${index}`, index);
    }

    entry.ok = entry.statuses.every((status) => status.ok !== false)
      && entry.consoleErrors.length === 0
      && entry.failedNetwork.length === 0
      && entry.scrollStops.every((stop) => stop.nonblank);
  } catch (error) {
    entry.error = cleanFailure(error);
  } finally {
    await context.close().catch(() => null);
  }
  return entry;
}

const receipt = {
  ok: false,
  runId,
  timestamp: new Date().toISOString(),
  baseUrl,
  targetUrl: urlFor(adminPath),
  browser: {
    engine: 'chromium',
    headed: true,
    xvfb: Boolean(process.env.DISPLAY),
    display: process.env.DISPLAY || ''
  },
  credential: {
    resolved: false,
    sourceKey: '',
    method: '',
    attempts: []
  },
  viewports: [],
  failures: []
};

let browser;
try {
  log('resolving shared owner session without printing secrets');
  const session = await resolveOwnerSession(receipt);
  receipt.credential.resolved = true;
  receipt.credential.sourceKey = session.sourceKey;
  receipt.credential.method = session.method;

  browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const viewportCatalog = {
    desktop: ['desktop-1440x1000', { width: 1440, height: 1000 }],
    mobile: ['mobile-390x844', { width: 390, height: 844 }]
  };
  const requestedViewport = String(process.env.PROOF_VIEWPORT || '').trim().toLowerCase();
  const selectedViewports = requestedViewport
    ? [viewportCatalog[requestedViewport]].filter(Boolean)
    : [viewportCatalog.desktop, viewportCatalog.mobile];
  if (!selectedViewports.length) throw new Error(`Unknown PROOF_VIEWPORT ${requestedViewport}`);
  for (const [viewportLabel, viewport] of selectedViewports) {
    receipt.viewports.push(await exerciseViewport(browser, session.token, viewportLabel, viewport));
  }

  receipt.failures = receipt.viewports.flatMap((entry) => [
    ...(entry.error ? [{ viewportLabel: entry.viewportLabel, type: 'exception', detail: entry.error }] : []),
    ...entry.consoleErrors.map((item) => ({ viewportLabel: entry.viewportLabel, type: 'console', detail: item })),
    ...entry.failedNetwork.map((item) => ({ viewportLabel: entry.viewportLabel, type: 'network', detail: item })),
    ...entry.scrollStops.filter((stop) => !stop.nonblank).map((stop) => ({
      viewportLabel: entry.viewportLabel,
      type: 'blank-viewport',
      detail: { label: stop.label, screenshotPath: stop.screenshotPath, metrics: stop.metrics }
    }))
  ]);
  receipt.ok = receipt.viewports.length === selectedViewports.length && receipt.viewports.every((entry) => entry.ok) && receipt.failures.length === 0;
} catch (error) {
  receipt.failures.push({ type: 'script', detail: cleanFailure(error) });
} finally {
  if (browser) await browser.close().catch(() => null);
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
}

console.log(JSON.stringify({
  ok: receipt.ok,
  receiptPath,
  targetUrl: receipt.targetUrl,
  credentialResolved: receipt.credential.resolved,
  credentialSourceKey: receipt.credential.sourceKey,
  headed: receipt.browser.headed,
  xvfbDisplay: receipt.browser.display,
  viewports: receipt.viewports.map((entry) => ({
    label: entry.viewportLabel,
    ok: entry.ok,
    actions: entry.actions.length,
    scrollStops: entry.scrollStops.length,
    consoleErrors: entry.consoleErrors.length,
    failedNetwork: entry.failedNetwork.length
  })),
  failures: receipt.failures.slice(0, 6)
}, null, 2));

if (!receipt.ok) process.exit(1);
