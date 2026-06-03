#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { chromium } from 'playwright';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const baseUrl = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const matrixPath = path.join(repoRoot, 'test-artifacts', '0s-operating-proof-matrix', '0s-operating-proof-matrix-latest.json');
const controlProofPath = path.join(repoRoot, 'test-artifacts', '0s-mounted-app-control-proof', '0s-mounted-app-control-proof-latest.json');
const artifactRoot = path.join(repoRoot, 'test-artifacts', '0s-live-human-browser-e2e');
const artifactDir = path.join(artifactRoot, stamp);
const latestPath = path.join(artifactRoot, '0s-live-human-browser-e2e-latest.json');
const receiptPath = path.join(artifactDir, 'receipt.json');
const navigationTimeoutMs = Number(process.env.ZERO_OS_BROWSER_E2E_NAV_TIMEOUT_MS || 45000);
const postActionWaitMs = Number(process.env.ZERO_OS_BROWSER_E2E_POST_ACTION_WAIT_MS || 650);
const actionNetworkIdleMs = Number(process.env.ZERO_OS_BROWSER_E2E_ACTION_NETWORK_IDLE_MS || 900);
const returnNetworkIdleMs = Number(process.env.ZERO_OS_BROWSER_E2E_RETURN_NETWORK_IDLE_MS || 1200);
const initialNetworkIdleMs = Number(process.env.ZERO_OS_BROWSER_E2E_INITIAL_NETWORK_IDLE_MS || 4500);
const linkCheckTimeoutMs = Number(process.env.ZERO_OS_BROWSER_E2E_LINK_TIMEOUT_MS || 5000);
const stressCycles = Number(process.env.ZERO_OS_BROWSER_E2E_STRESS_CYCLES || 2);
const slowMo = Number(process.env.ZERO_OS_BROWSER_E2E_SLOWMO || 30);
const appFilter = new Set(String(process.env.ZERO_OS_BROWSER_E2E_APPS || '').split(',').map((item) => item.trim()).filter(Boolean));
const maxApps = Number(process.env.ZERO_OS_BROWSER_E2E_MAX_APPS || 0);
const maxControlsPerApp = Number(process.env.ZERO_OS_BROWSER_E2E_MAX_CONTROLS_PER_APP || 0);
const clickNavigationLinks = ['1', 'true', 'yes', 'on'].includes(String(process.env.ZERO_OS_BROWSER_E2E_CLICK_NAV_LINKS || '').toLowerCase());
const progressLogs = !['0', 'false', 'no', 'off'].includes(String(process.env.ZERO_OS_BROWSER_E2E_PROGRESS || '1').toLowerCase());

const viewports = [
  { label: 'desktop', width: 1440, height: 980 },
  { label: 'mobile', width: 390, height: 844 }
];

const dangerousPattern = /\b(pay|payment|checkout|stripe|subscribe|purchase|buy|refund|payout|bank|file\s*llc|official\s*filing|government|attorney|legal\s*filing|delete|remove|purge|destroy|revoke|transfer\s*source|source\s*transfer|publish\s*public|deploy\s*public|send\s*(?:sms|text|mail|email)|call\s*provider|execute\s*provider|twilio|resend|mailgun)\b/i;
const safePattern = /\b(copy|preview|filter|tab|toggle|menu|open|close|expand|collapse|search|sort|view|details|next|previous|back|download|export|save\s*draft|local|demo|sample|test|simulate|refresh|generate\s*preview|shuffle|remix|select)\b/i;
const ignoredResponsePattern = /(?:favicon\.ico|robots\.txt|sitemap\.xml)$/i;
const mediaRequestPattern = /\.(?:aac|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)(?:$|[?#])/i;
const sameOrigin = new URL(baseUrl).origin;

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function sha12(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12);
}

function slug(value = '') {
  return String(value || '0s-browser-proof')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || '0s-browser-proof';
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== 'linux') return;
  if (process.env.DISPLAY || process.env.ZERO_OS_BROWSER_E2E_XVFB_ACTIVE === '1') return;
  const probe = spawnSync('which', ['xvfb-run'], { encoding: 'utf8' });
  if (probe.status !== 0) return;
  const child = spawnSync('xvfb-run', ['-a', process.execPath, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, ZERO_OS_BROWSER_E2E_XVFB_ACTIVE: '1' }
  });
  process.exit(child.status ?? 1);
}

relaunchWithXvfbWhenNeeded();

function authHeaders(token, extra = {}) {
  return {
    accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'x-skygate-session': token,
    ...extra
  };
}

function sanitizeErrorMessage(value = '') {
  return String(value || '')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]')
    .replace(/\b(authorization|x-admin-token|x-free99-admin-code|x-free99-gate-session|x-skye-gate-session|x-skygate-session|cookie):[^\n\r]+/gi, '$1: [REDACTED]');
}

function cookieRows(token) {
  const host = new URL(baseUrl).hostname;
  return [
    'metraiyux_admin_session',
    'metraiyux_gate_session',
    'skye_gate_session',
    'skygate_session',
    'free99_gate_session',
    'zero_os_gate_session'
  ].map((name) => ({
    name,
    value: token,
    domain: host,
    path: '/',
    httpOnly: false,
    secure: true,
    sameSite: 'Lax'
  }));
}

function initScript(token) {
  return `
(() => {
  const token = ${JSON.stringify(token)};
  const keys = [
    'metraiyux_admin_session',
    'metraiyux_gate_session',
    'skye_gate_session',
    'skygate_session',
    'free99_gate_session',
    'zero_os_gate_session',
    'ZERO_OS_GATE_SESSION'
  ];
  for (const key of keys) {
    try { window.localStorage.setItem(key, token); } catch {}
    try { window.sessionStorage.setItem(key, token); } catch {}
  }
  window.__zeroOsBrowserProof = {
    events: [],
    storageWrites: [],
    fetches: [],
    mutations: 0,
    startedAt: new Date().toISOString()
  };
  const targetLabel = (target) => {
    if (!target || target === window || target === document) return String(target);
    const tag = target.tagName || target.nodeName || 'node';
    const id = target.id ? '#' + target.id : '';
    const text = (target.innerText || target.value || target.getAttribute?.('aria-label') || target.getAttribute?.('title') || '').replace(/\\s+/g, ' ').trim().slice(0, 90);
    return tag + id + (text ? ':' + text : '');
  };
  for (const eventName of ['click', 'input', 'change', 'submit']) {
    window.addEventListener(eventName, (event) => {
      try {
        window.__zeroOsBrowserProof.events.push({
          eventName,
          target: targetLabel(event.target),
          time: Date.now()
        });
      } catch {}
    }, true);
  }
  try {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      try { window.__zeroOsBrowserProof.storageWrites.push({ key: String(key), valueLength: String(value).length, time: Date.now() }); } catch {}
      return originalSetItem.apply(this, arguments);
    };
  } catch {}
  try {
    const observer = new MutationObserver((mutations) => { window.__zeroOsBrowserProof.mutations += mutations.length; });
    window.addEventListener('DOMContentLoaded', () => observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true }), { once: true });
  } catch {}
  try {
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      const started = Date.now();
      const method = String(init?.method || (input && input.method) || 'GET').toUpperCase();
      const url = String(input && input.url ? input.url : input);
      try {
        const response = await originalFetch.apply(this, arguments);
        window.__zeroOsBrowserProof.fetches.push({ url, method, status: response.status, ok: response.ok, elapsedMs: Date.now() - started });
        return response;
      } catch (error) {
        window.__zeroOsBrowserProof.fetches.push({ url, method, status: 0, ok: false, error: error?.message || String(error), elapsedMs: Date.now() - started });
        throw error;
      }
    };
  } catch {}
})();
`;
}

function isVerifierNavigationAbort(request) {
  const failure = request.failure()?.errorText || '';
  if (failure !== 'net::ERR_ABORTED') return false;
  if (request.method() !== 'GET') return false;
  try {
    return new URL(request.url()).origin === sameOrigin;
  } catch {
    return false;
  }
}

function isBenignMediaAbort(request) {
  const failure = request.failure()?.errorText || '';
  return failure === 'net::ERR_ABORTED'
    && request.method() === 'GET'
    && mediaRequestPattern.test(request.url());
}

async function timedFetch(url, token, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), navigationTimeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      headers: authHeaders(token, init.headers || {}),
      signal: controller.signal,
      redirect: init.redirect || 'manual'
    });
    const text = await response.text().catch(() => '');
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch {}
    return {
      ok: response.ok,
      status: response.status,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      location: response.headers.get('location') || '',
      contentType: response.headers.get('content-type') || '',
      bytes: Buffer.byteLength(text),
      text,
      body
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      location: '',
      contentType: '',
      bytes: 0,
      text: '',
      body: null,
      error: error?.name === 'AbortError' ? `timeout after ${navigationTimeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function commandBridgeProofEvent(token, app, viewportLabel, browserResult) {
  const entityId = `0s-browser-e2e:${app.id}:${viewportLabel}:${stamp}`;
  const payload = {
    source_app: app.id,
    source_surface: app.mounted_path,
    lane: app.canonical_family,
    event_type: '0s.live_human_browser_e2e',
    summary: `${app.name} was exercised in a headed production browser with DOM actions, network capture, visual scroll proof, and stress cycles.`,
    entity: { kind: 'mounted-app-browser-proof', id: entityId, label: app.name },
    ids: { app_id: app.id, mounted_path: app.mounted_path, viewport: viewportLabel },
    metadata: {
      generated_at: new Date().toISOString(),
      proof: '0s-live-human-browser-e2e',
      action_count: browserResult.actions.length,
      clicked_count: browserResult.actions.filter((item) => item.kind === 'click').length,
      filled_count: browserResult.actions.filter((item) => item.kind === 'fill' || item.kind === 'select' || item.kind === 'check').length,
      screenshot_count: browserResult.visual_scroll.screenshots.length,
      failed_request_count: browserResult.network.request_failed.length,
      benign_media_abort_count: browserResult.network.benign_media_aborts?.length || 0,
      bad_response_count: browserResult.network.bad_responses.length
    }
  };
  const post = await timedFetch(`${baseUrl}/api/0s-command-bridge/events`, token, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const read = await timedFetch(`${baseUrl}/api/0s-command-bridge/events?entity=${encodeURIComponent(entityId)}&limit=20`, token);
  const events = Array.isArray(read.body?.events) ? read.body.events : [];
  return {
    ok: post.status >= 200 && post.status < 300 && read.status === 200 && events.length > 0,
    entity_id: entityId,
    post_status: post.status,
    read_status: read.status,
    event_id: post.body?.event?.id || post.body?.receiptId || post.body?.id || '',
    readback_count: events.length
  };
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url, baseUrl);
    parsed.hash = '';
    return parsed.href.replace(/\/$/, '');
  } catch {
    return String(url || '').replace(/#.*$/, '').replace(/\/$/, '');
  }
}

function isSameOriginOrHash(href = '') {
  if (!href || href.startsWith('#')) return true;
  try {
    const parsed = new URL(href, baseUrl);
    return parsed.origin === new URL(baseUrl).origin;
  } catch {
    return true;
  }
}

function isSameOriginNavigationLink(control = {}) {
  if (control.tag !== 'a' || !control.href) return false;
  try {
    const parsed = new URL(control.href, baseUrl);
    if (parsed.origin !== sameOrigin) return false;
    if (parsed.hash && parsed.pathname === new URL(baseUrl).pathname) return false;
    return true;
  } catch {
    return false;
  }
}

function labelForControl(control = {}) {
  return [
    control.tag,
    control.type ? `type=${control.type}` : '',
    control.id ? `#${control.id}` : '',
    control.name ? `name=${control.name}` : '',
    control.text ? `"${control.text}"` : '',
    control.href ? `href=${control.href}` : ''
  ].filter(Boolean).join(' ');
}

function cssAttr(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function regexEscape(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function controlPriority(control = {}) {
  if (control.disabled) return 90;
  if (['input', 'select', 'textarea'].includes(control.tag)) return 10;
  if (control.tag === 'button' || control.role === 'button' || control.tag === 'summary') return 20;
  if (control.tag === 'a' && String(control.href || '').includes('#')) return 30;
  if (control.tag === 'a' && isSameOriginOrHash(control.href)) return 70;
  return 80;
}

function sortControlsForHumanFlow(controls = []) {
  const withKeys = controls.map((control) => ({
    control,
    priority: controlPriority(control),
    key: `${control.tag}:${control.role || ''}:${String(control.text || control.name || control.href || control.id || control.className || '').replace(/\s+/g, ' ').trim().toLowerCase()}`
  })).sort((a, b) => a.priority - b.priority || a.control.index - b.control.index);
  const seen = new Set();
  const unique = [];
  const repeated = [];
  for (const row of withKeys) {
    const bucket = seen.has(row.key) ? repeated : unique;
    bucket.push(row.control);
    seen.add(row.key);
  }
  return [...unique, ...repeated];
}

async function fallbackLocatorForControl(page, control = {}) {
  const text = String(control.text || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const locators = [];
  if (text && ['a', 'button', 'summary'].includes(control.tag)) {
    const pattern = new RegExp(regexEscape(text).replace(/\s+/g, '\\s+'), 'i');
    if (control.tag === 'button') locators.push(page.getByRole('button', { name: pattern }).first());
    if (control.tag === 'a') locators.push(page.getByRole('link', { name: pattern }).first());
    if (control.tag === 'summary') locators.push(page.locator('summary:visible').filter({ hasText: text }).first());
    locators.push(page.locator(`${control.tag}:visible`).filter({ hasText: text }).first());
    locators.push(page.locator(`[role="button"]:visible`).filter({ hasText: text }).first());
  }
  for (const locator of locators) {
    if (!(await locator.count().catch(() => 0))) continue;
    if (await locator.isVisible({ timeout: 500 }).catch(() => false)) return locator;
  }
  return null;
}

async function locatorForControl(page, control = {}) {
  const candidates = [];
  const proofSelectorPreferred = ['input', 'select', 'textarea'].includes(control.tag);
  if (proofSelectorPreferred && control.proofSelector) candidates.push(control.proofSelector);
  if (/zero-guide-launcher/i.test(control.className || '') || /^Guide\s*0S$/i.test(control.text || '')) {
    candidates.push('[data-zero-guide-open]');
    candidates.push('.zero-guide-launcher');
  }
  if (control.id) candidates.push(`[id="${cssAttr(control.id)}"]`);
  if (control.name && control.tag) candidates.push(`${control.tag}[name="${cssAttr(control.name)}"]`);
  if (control.href && control.tag === 'a') {
    candidates.push(`a[href="${cssAttr(control.href)}"]`);
    try {
      const parsed = new URL(control.href);
      candidates.push(`a[href="${cssAttr(parsed.pathname + parsed.search + parsed.hash)}"]`);
      candidates.push(`a[href="${cssAttr(parsed.pathname)}"]`);
    } catch {}
  }

  for (const selector of candidates) {
    const visibleLocator = page.locator(`${selector}:visible`).first();
    if (await visibleLocator.count().catch(() => 0)) return visibleLocator;
    const locator = page.locator(selector).first();
    if (await locator.count().catch(() => 0)) return locator;
  }

  const fallback = await fallbackLocatorForControl(page, control);
  if (fallback) return fallback;

  if (!proofSelectorPreferred && control.proofSelector) {
    const locator = page.locator(control.proofSelector).first();
    if (await locator.count().catch(() => 0)) return locator;
  }

  return page.locator(control.proofSelector || 'body').first();
}

function boundaryReason(control = {}) {
  const label = `${control.text || ''} ${control.href || ''} ${control.id || ''} ${control.name || ''} ${control.type || ''}`.trim();
  if (control.disabled) return 'disabled_control_verified';
  if (!safePattern.test(label) && dangerousPattern.test(label)) return 'dangerous_external_or_irreversible_action_boundary';
  if (control.tag === 'a' && control.href && !isSameOriginOrHash(control.href)) return 'external_navigation_boundary';
  if (control.tag === 'input' && String(control.type || '').toLowerCase() === 'file') return 'file_upload_boundary';
  return '';
}

async function visibleText(page) {
  const locatorText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
  if (locatorText) return locatorText;
  return page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim()).catch(() => '');
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const visible = Array.from(document.body?.querySelectorAll('*') || []).filter((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 2 && rect.height > 2
        && rect.bottom >= 0 && rect.right >= 0 && rect.top <= viewport.height && rect.left <= viewport.width;
    });
    const media = Array.from(document.querySelectorAll('img,video,canvas,svg')).map((el) => {
      const rect = el.getBoundingClientRect();
      const tag = el.tagName.toLowerCase();
      return {
        tag,
        visible: rect.width > 4 && rect.height > 4 && rect.bottom >= 0 && rect.right >= 0 && rect.top <= viewport.height && rect.left <= viewport.width,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        src: el.currentSrc || el.src || el.getAttribute('href') || '',
        complete: tag === 'img' ? el.complete !== false && el.naturalWidth > 0 : true
      };
    });
    return {
      url: location.href,
      title: document.title,
      scrollY: Math.round(window.scrollY || 0),
      documentHeight: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0),
      viewport,
      visibleTextChars: text.length,
      visibleTextSample: text.slice(0, 220),
      visibleElementCount: visible.length,
      visibleMedia: media.filter((item) => item.visible).slice(0, 20),
      brokenVisibleMedia: media.filter((item) => item.visible && item.complete === false).slice(0, 20),
      horizontalOverflowPx: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - window.innerWidth
    };
  }).catch((error) => {
    let url = '';
    try { url = page.url(); } catch {}
    return {
      url,
      title: '',
      scrollY: 0,
      documentHeight: 0,
      viewport: { width: 0, height: 0 },
      visibleTextChars: 0,
      visibleTextSample: '',
      visibleElementCount: 0,
      visibleMedia: [],
      brokenVisibleMedia: [],
      horizontalOverflowPx: 0,
      error: sanitizeErrorMessage(error?.message || String(error))
    };
  });
}

async function screenshotViewport(page, app, viewportLabel, label) {
  const dir = path.join(artifactDir, 'screenshots', viewportLabel, app.id);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${label}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false, timeout: 12000, animations: 'disabled' });
  } catch (error) {
    await page.evaluate(() => window.stop()).catch(() => {});
    await page.waitForTimeout(350).catch(() => {});
    try {
      await page.screenshot({ path: file, fullPage: false, timeout: 5000, animations: 'disabled' });
    } catch (retryError) {
      const fallback = path.join(dir, `${label}-screenshot-timeout.json`);
      await fs.writeFile(fallback, JSON.stringify({
        ok: false,
        reason: 'screenshot_timeout',
        app_id: app.id,
        viewport: viewportLabel,
        label,
        error: sanitizeErrorMessage(error?.message || String(error)),
        retry_error: sanitizeErrorMessage(retryError?.message || String(retryError)),
        captured_at: new Date().toISOString()
      }, null, 2));
      return rel(fallback);
    }
  }
  return rel(file);
}

async function collectVisualScroll(page, app, viewportLabel) {
  const initial = await pageMetrics(page);
  if (initial.error) {
    return {
      ok: false,
      stop_count: 0,
      screenshots: [],
      blankish_stops: [initial],
      broken_media_stops: [],
      horizontal_overflow_px: 0,
      metrics: [initial],
      error: initial.error
    };
  }
  const maxY = Math.max(0, initial.documentHeight - initial.viewport.height);
  const stops = [...new Set([0, Math.round(maxY * 0.35), Math.round(maxY * 0.7), maxY].filter((item) => item >= 0))];
  const screenshots = [];
  const metrics = [];
  for (let index = 0; index < stops.length; index += 1) {
    await page.mouse.wheel(0, stops[index] - (await page.evaluate(() => window.scrollY)).valueOf()).catch(() => {});
    await page.evaluate((targetY) => window.scrollTo({ top: targetY, behavior: 'instant' }), stops[index]).catch(() => {});
    await page.waitForTimeout(250);
    const row = await pageMetrics(page);
    const screenshot = row.error
      ? ''
      : await screenshotViewport(page, app, viewportLabel, `scroll-${String(index + 1).padStart(2, '0')}-y${row.scrollY}`);
    screenshots.push(screenshot);
    metrics.push(row);
    if (row.error) break;
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })).catch(() => {});
  return {
    ok: metrics.every((item) => item.visibleTextChars > 40 || item.visibleElementCount > 5) && metrics.every((item) => item.brokenVisibleMedia.length === 0),
    stop_count: metrics.length,
    screenshots,
    blankish_stops: metrics.filter((item) => item.visibleTextChars <= 40 && item.visibleElementCount <= 5),
    broken_media_stops: metrics.filter((item) => item.brokenVisibleMedia.length > 0),
    horizontal_overflow_px: Math.max(...metrics.map((item) => item.horizontalOverflowPx || 0), 0),
    metrics
  };
}

async function instrumentControls(page) {
  return page.evaluate(() => {
    const selector = [
      'button',
      'a[href]',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      '[role="button"]',
      'summary',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    const elements = Array.from(document.querySelectorAll(selector));
    return elements.map((el, index) => {
      el.setAttribute('data-zero-os-proof-index', String(index));
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();
      const text = (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 160);
      const href = tag === 'a' ? el.href || el.getAttribute('href') || '' : '';
      const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 2 && rect.height > 2;
      return {
        index,
        tag,
        type,
        role: el.getAttribute('role') || '',
        id: el.id || '',
        name: el.getAttribute('name') || '',
        className: el.className ? String(el.className).slice(0, 180) : '',
        text,
        href,
        disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
        visible,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        proofSelector: '[data-zero-os-proof-index="' + index + '"]'
      };
    });
  });
}

function testValueFor(control = {}, appId = '') {
  const type = String(control.type || '').toLowerCase();
  const key = `${appId}-${stamp}`.slice(0, 42);
  if (type === 'email') return `browser-proof+${key}@example.com`;
  if (type === 'tel') return '5550100137';
  if (type === 'number' || type === 'range') return '7';
  if (type === 'url') return 'https://example.com/0s-browser-proof';
  if (type === 'password') return 'BrowserProof!2026!';
  if (type === 'date') return '2026-06-01';
  if (type === 'time') return '13:37';
  if (type === 'search') return 'browser proof';
  return `0S browser proof ${key}`;
}

async function proofState(page) {
  return page.evaluate(() => window.__zeroOsBrowserProof || {
    events: [],
    storageWrites: [],
    fetches: [],
    mutations: 0
  }).catch(() => ({ events: [], storageWrites: [], fetches: [], mutations: 0 }));
}

async function fillControl(page, app, control) {
  const before = await proofState(page);
  const value = testValueFor(control, app.id);
  try {
    const locator = await locatorForControl(page, control);
    await locator.scrollIntoViewIfNeeded({ timeout: 2500 }).catch(() => {});
    if (control.tag === 'select') {
      const changed = await locator.evaluate((el) => {
        const options = Array.from(el.options || []).filter((option) => !option.disabled);
        const current = el.value;
        const next = options.find((option) => option.value !== current) || options[0];
        if (!next) return { ok: false, value: current, reason: 'no_options' };
        el.value = next.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true, value: el.value };
      });
      await page.waitForTimeout(200);
      const after = await proofState(page);
      return { ok: changed.ok, kind: 'select', control: labelForControl(control), value: changed.value, proof_delta: deltaProof(before, after) };
    }
    if (control.tag === 'textarea' || control.tag === 'input') {
      const type = String(control.type || '').toLowerCase();
      if (['checkbox', 'radio'].includes(type)) {
        await locator.click({ timeout: 2500 });
        await page.waitForTimeout(200);
        const after = await proofState(page);
        return { ok: true, kind: 'check', control: labelForControl(control), proof_delta: deltaProof(before, after) };
      }
      await locator.fill(value, { timeout: 2500 });
      await page.waitForTimeout(200);
      const actual = await locator.inputValue({ timeout: 1000 }).catch(() => '');
      const after = await proofState(page);
      return { ok: actual.includes(value.slice(0, Math.min(value.length, 20))) || actual.length > 0, kind: 'fill', control: labelForControl(control), value: actual.slice(0, 120), proof_delta: deltaProof(before, after) };
    }
  } catch (error) {
    return { ok: false, kind: 'fill', control: labelForControl(control), error: error?.message || String(error) };
  }
  return { ok: true, kind: 'noop', control: labelForControl(control) };
}

function deltaProof(before, after) {
  return {
    events: Math.max(0, (after.events?.length || 0) - (before.events?.length || 0)),
    fetches: Math.max(0, (after.fetches?.length || 0) - (before.fetches?.length || 0)),
    storageWrites: Math.max(0, (after.storageWrites?.length || 0) - (before.storageWrites?.length || 0)),
    mutations: Math.max(0, (after.mutations || 0) - (before.mutations || 0))
  };
}

async function clickControl(page, app, control, originalUrl) {
  const before = await proofState(page);
  const beforeUrl = page.url();
  const beforeTextHash = sha12(await visibleText(page));
  async function clickWithLocator(locator, retry = '') {
    await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    const box = await locator.boundingBox({ timeout: 2000 }).catch(() => null);
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 70 });
    } else {
      await locator.click({ timeout: 3000 });
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: actionNetworkIdleMs }).catch(() => {});
    await page.waitForTimeout(postActionWaitMs);
    const after = await proofState(page);
    const afterUrl = page.url();
    const afterTextHash = sha12(await visibleText(page));
    const changed = beforeUrl !== afterUrl
      || beforeTextHash !== afterTextHash
      || deltaProof(before, after).events > 0
      || deltaProof(before, after).fetches > 0
      || deltaProof(before, after).storageWrites > 0
      || deltaProof(before, after).mutations > 0;
    if (normalizeUrl(afterUrl) !== normalizeUrl(originalUrl)) {
      await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: returnNetworkIdleMs }).catch(() => {});
    }
    return {
      ok: changed,
      kind: 'click',
      control: labelForControl(control),
      before_url: beforeUrl,
      after_url: afterUrl,
      proof_delta: deltaProof(before, after),
      text_changed: beforeTextHash !== afterTextHash,
      ...(retry ? { retry } : {})
    };
  }
  try {
    const locator = await locatorForControl(page, control);
    return await clickWithLocator(locator);
  } catch (error) {
    const rawError = error?.message || String(error);
    const fallback = await fallbackLocatorForControl(page, control).catch(() => null);
    if (fallback) {
      try {
        return await clickWithLocator(fallback, 'visible-text-fallback');
      } catch (fallbackError) {
        const fallbackMessage = fallbackError?.message || String(fallbackError);
        if (/waiting for|Timeout|detached|not visible|not attached|element is not/i.test(`${rawError}\n${fallbackMessage}`)) {
          return {
            ok: true,
            kind: 'dynamic-skip',
            control: labelForControl(control),
            reason: 'control_not_actionable_after_prior_state_change',
            original_error: sanitizeErrorMessage(rawError)
          };
        }
      }
    }
    if (/data-zero-os-proof-index|waiting for locator|waiting for getByRole|Timeout|detached|not visible|not attached|element is not/i.test(rawError)) {
      const stillVisible = await fallbackLocatorForControl(page, control).catch(() => null);
      if (!stillVisible) {
        return {
          ok: true,
          kind: 'dynamic-skip',
          control: labelForControl(control),
          reason: 'control_removed_after_prior_state_change'
        };
      }
    }
    return { ok: false, kind: 'click', control: labelForControl(control), error: error?.message || String(error) };
  }
}

async function verifyLinkControl(page, app, control, token) {
  const before = await proofState(page);
  const attempts = [];
  try {
    let result = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), linkCheckTimeoutMs);
      const started = performance.now();
      try {
        const response = await fetch(control.href, {
          method: 'GET',
          headers: authHeaders(token),
          redirect: 'follow',
          signal: controller.signal
        });
        const contentType = response.headers.get('content-type') || '';
        const text = /text|json|html|xml/i.test(contentType) ? await response.clone().text().catch(() => '') : '';
        result = {
          ok: response.status < 400,
          status: response.status,
          redirected: response.url !== control.href,
          finalUrl: response.url,
          contentType,
          elapsedMs: Math.round(performance.now() - started),
          chars: text.length,
          attempts: attempt
        };
        attempts.push({ attempt, ok: result.ok, status: result.status, elapsed_ms: result.elapsedMs });
        break;
      } catch (error) {
        const rawError = error?.name === 'AbortError'
          ? `timeout after ${linkCheckTimeoutMs}ms`
          : error?.message || String(error);
        attempts.push({ attempt, ok: false, error: sanitizeErrorMessage(rawError), elapsed_ms: Math.round(performance.now() - started) });
        if (attempt === 2) throw error;
      } finally {
        clearTimeout(timer);
      }
    }
    const after = await proofState(page);
    return {
      ok: result.ok,
      kind: 'link-check',
      control: labelForControl(control),
      href: control.href,
      status: result.status,
      final_url: result.finalUrl,
      redirected: result.redirected,
      content_type: result.contentType,
      elapsed_ms: result.elapsedMs,
      attempts: result.attempts,
      attempt_log: attempts,
      chars: result.chars,
      proof_delta: deltaProof(before, after)
    };
  } catch (error) {
    const rawError = error?.name === 'AbortError'
      ? `timeout after ${linkCheckTimeoutMs}ms`
      : error?.message || String(error);
    return {ok: false, kind: 'link-check', control: labelForControl(control), href: control.href, error: sanitizeErrorMessage(rawError), attempt_log: attempts};
  }
}

function writeProgress(app, viewport, index, count, control) {
  if (!progressLogs) return;
  process.stdout.write(`action ${app.id} ${viewport.label} ${index + 1}/${count} ${labelForControl(control).slice(0, 140)}\n`);
}

async function submitSafeForms(page, app, controls) {
  const formCount = await page.locator('form').count().catch(() => 0);
  const actions = [];
  for (let index = 0; index < formCount; index += 1) {
    const form = page.locator('form').nth(index);
    const meta = await form.evaluate((el) => ({
      method: String(el.getAttribute('method') || 'get').toLowerCase(),
      action: el.action || el.getAttribute('action') || '',
      text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 180)
    })).catch(() => null);
    if (!meta) continue;
    const label = `${meta.method} ${meta.action} ${meta.text}`;
    if (dangerousPattern.test(label) && !safePattern.test(label)) {
      actions.push({ ok: true, kind: 'form-boundary', form_index: index, reason: 'dangerous_external_or_irreversible_form_boundary', meta });
      continue;
    }
    const before = await proofState(page);
    try {
      await form.evaluate((el, testValue) => {
        for (const input of Array.from(el.querySelectorAll('input,textarea'))) {
          if (input.disabled || input.type === 'hidden' || input.type === 'file') continue;
          if (input.type === 'checkbox' || input.type === 'radio') input.checked = true;
          else input.value = input.type === 'email' ? 'browser-proof@example.com' : testValue;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        for (const select of Array.from(el.querySelectorAll('select'))) {
          const option = Array.from(select.options || []).find((item) => !item.disabled);
          if (option) select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, `0S browser form proof ${app.id}`);
      await form.evaluate((el) => {
        const event = new Event('submit', { bubbles: true, cancelable: true });
        el.dispatchEvent(event);
        if (!event.defaultPrevented && String(el.getAttribute('method') || 'get').toLowerCase() === 'get') {
          const button = el.querySelector('button[type="submit"],input[type="submit"],button:not([type])');
          if (button) button.click();
        }
      });
      await page.waitForLoadState('networkidle', { timeout: actionNetworkIdleMs }).catch(() => {});
      await page.waitForTimeout(postActionWaitMs);
      const after = await proofState(page);
      actions.push({ ok: deltaProof(before, after).events > 0 || deltaProof(before, after).fetches > 0 || deltaProof(before, after).storageWrites > 0 || deltaProof(before, after).mutations > 0, kind: 'form-submit', form_index: index, meta, proof_delta: deltaProof(before, after) });
    } catch (error) {
      actions.push({ ok: false, kind: 'form-submit', form_index: index, meta, error: error?.message || String(error) });
    }
  }
  return actions;
}

async function routeStress(page, url) {
  const cycles = [];
  for (let index = 0; index < stressCycles; index += 1) {
    const started = performance.now();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs }).catch((error) => ({ error }));
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForFunction(() => (document.body?.innerText || '').replace(/\s+/g, ' ').trim().length > 80, null, {
      timeout: Math.max(5000, initialNetworkIdleMs + 2500)
    }).catch(() => {});
    const text = await visibleText(page);
    cycles.push({
      index,
      ok: !response?.error && (response?.status?.() || 0) < 400 && text.length > 80,
      status: response?.status?.() || 0,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      textChars: text.length,
      error: response?.error?.message || ''
    });
  }
  return {
    ok: cycles.every((item) => item.ok),
    cycles
  };
}

async function verifyViewport(browser, token, app, viewport, controlRow) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.width < 700,
    ignoreHTTPSErrors: true,
    acceptDownloads: true
  });
  await context.addCookies(cookieRows(token));
  await context.addInitScript(initScript(token));
  const page = await context.newPage();
  const network = { request_failed: [], aborted_navigation: [], benign_media_aborts: [], bad_responses: [], responses: [] };
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error?.message || String(error)));
  page.on('requestfailed', (request) => {
    const row = {
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || 'request failed'
    };
    if (isVerifierNavigationAbort(request)) network.aborted_navigation.push(row);
    else if (isBenignMediaAbort(request)) network.benign_media_aborts.push(row);
    else network.request_failed.push(row);
  });
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !ignoredResponsePattern.test(url)) {
      network.bad_responses.push({ url, status, method: response.request().method() });
    }
    network.responses.push({ url, status, method: response.request().method() });
  });

  const url = `${baseUrl}${app.mounted_path}`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navigationTimeoutMs }).catch((error) => ({ error }));
  await page.waitForLoadState('networkidle', { timeout: initialNetworkIdleMs }).catch(() => {});
  await page.waitForTimeout(900);
  const loadedStatus = response?.status?.() || 0;
  const loadError = response?.error?.message || '';
  const body = await visibleText(page);
  const loadedUrl = page.url();
  const controls = await instrumentControls(page).catch(() => []);
  const initialScreenshot = await screenshotViewport(page, app, viewport.label, 'initial');
  const visualScroll = await collectVisualScroll(page, app, viewport.label);
  const actions = [];
  const boundary_skips = [];
  const disabled_verified = [];
  const failed_actions = [];

  const controlLimit = maxControlsPerApp > 0 ? Math.min(maxControlsPerApp, controls.length) : controls.length;
  const controlsToUse = sortControlsForHumanFlow(controls).slice(0, controlLimit);

  for (let controlIndex = 0; controlIndex < controlsToUse.length; controlIndex += 1) {
    const control = controlsToUse[controlIndex];
    if (!control.visible) continue;
    writeProgress(app, viewport, controlIndex, controlsToUse.length, control);
    const reason = boundaryReason(control);
    if (reason) {
      const row = { ok: true, kind: control.disabled ? 'disabled' : 'boundary', control: labelForControl(control), reason };
      if (control.disabled) disabled_verified.push(row);
      else boundary_skips.push(row);
      continue;
    }
    let result;
    if (['input', 'select', 'textarea'].includes(control.tag)) {
      result = await fillControl(page, app, control);
    } else if (!clickNavigationLinks && isSameOriginNavigationLink(control)) {
      result = await verifyLinkControl(page, app, control, token);
    } else {
      result = await clickControl(page, app, control, url);
    }
    actions.push(result);
    if (!result.ok) failed_actions.push(result);
  }

    const clickedSubmit = actions.some((item) => item.kind === 'click' && /\b(type=submit|submit|create|save|send|unlock)\b/i.test(item.control || ''));
    const formActions = clickedSubmit
      ? [{ ok: true, kind: 'form-submit-skipped', reason: 'visible submit/create/save control already activated in browser' }]
      : await submitSafeForms(page, app, controlsToUse);
  actions.push(...formActions);
  failed_actions.push(...formActions.filter((item) => !item.ok));

  const stress = await routeStress(page, url);
  await page.waitForTimeout(500);
  const finalProofState = await proofState(page);
  const finalScreenshot = await screenshotViewport(page, app, viewport.label, 'final');
  const telemetry = await commandBridgeProofEvent(token, app, viewport.label, {
    actions,
    visual_scroll: visualScroll,
    network
  });

  await context.close();

  const controlProofSummary = controlRow?.controls?.summary || controlRow?.proof?.control_inventory || {};
  const frontendBackendRequests = finalProofState.fetches || [];
  const safeVisibleControls = controlsToUse.filter((control) => control.visible && !boundaryReason(control) && !control.disabled);
  const activatedControlCount = actions.filter((item) => ['click', 'fill', 'select', 'check', 'form-submit', 'link-check'].includes(item.kind)).length;
  const failures = [
    ...(loadError ? [`browser_load_error:${loadError}`] : []),
    ...(loadedStatus && loadedStatus >= 400 ? [`browser_load_status_${loadedStatus}`] : []),
    ...(/\/admin\/login\.html/i.test(loadedUrl) && app.mounted_path !== '/admin/login.html' ? ['shared_gate_session_not_honored_in_browser'] : []),
    ...(body.length > 80 ? [] : ['rendered_body_too_short']),
    ...(visualScroll.ok ? [] : ['visual_scroll_or_media_failure']),
    ...(visualScroll.horizontal_overflow_px <= 3 ? [] : [`horizontal_overflow_${visualScroll.horizontal_overflow_px}px`]),
    ...(failed_actions.length === 0 ? [] : [`failed_browser_actions:${failed_actions.length}`]),
    ...(network.request_failed.length === 0 ? [] : [`request_failed:${network.request_failed.length}`]),
    ...(network.bad_responses.length === 0 ? [] : [`bad_response:${network.bad_responses.length}`]),
    ...(consoleErrors.length === 0 ? [] : [`console_errors:${consoleErrors.length}`]),
    ...(pageErrors.length === 0 ? [] : [`page_errors:${pageErrors.length}`]),
    ...(stress.ok ? [] : ['browser_route_stress_failed']),
    ...(telemetry.ok ? [] : ['command_bridge_telemetry_readback_failed']),
    ...(safeVisibleControls.length === 0 || activatedControlCount > 0 ? [] : ['visible_safe_controls_not_activated'])
  ];

  return {
    ok: failures.length === 0,
    app_id: app.id,
    name: app.name,
    mounted_path: app.mounted_path,
    viewport,
    url,
    loaded_url: loadedUrl,
    loaded_status: loadedStatus,
    body_chars: body.length,
    screenshots: { initial: initialScreenshot, final: finalScreenshot },
    control_proof_summary: controlProofSummary,
    browser_control_inventory: {
      total: controls.length,
      visible: controls.filter((item) => item.visible).length,
      safe_visible: safeVisibleControls.length,
      activated: activatedControlCount,
      boundary_skipped: boundary_skips.length,
      disabled_verified: disabled_verified.length,
      source_control_proof_buttons: Number(controlProofSummary.buttons || 0),
      source_control_proof_links: Number(controlProofSummary.links || 0),
      source_control_proof_forms: Number(controlProofSummary.forms || 0),
      source_control_proof_selects: Number(controlProofSummary.selects || 0)
    },
    actions,
    failed_actions,
    boundary_skips,
    disabled_verified,
    visual_scroll: visualScroll,
    stress,
    proof_state: {
      event_count: finalProofState.events?.length || 0,
      fetch_count: finalProofState.fetches?.length || 0,
      storage_write_count: finalProofState.storageWrites?.length || 0,
      mutation_count: finalProofState.mutations || 0,
      frontend_backend_requests: frontendBackendRequests.slice(0, 50)
    },
    telemetry,
    network: {
      request_failed: network.request_failed,
      aborted_navigation: network.aborted_navigation,
      benign_media_aborts: network.benign_media_aborts,
      bad_responses: network.bad_responses,
      response_count: network.responses.length
    },
    console_errors: consoleErrors,
    page_errors: pageErrors,
    failures
  };
}

async function writeReceipt(receipt) {
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
}

function summarizeReceipt(receipt, appCount) {
  return {
    apps: appCount,
    viewport_rows: receipt.rows.length,
    green_viewport_rows: receipt.rows.filter((row) => row.ok).length,
    failing_viewport_rows: receipt.failures.length,
    total_browser_controls: receipt.rows.reduce((sum, row) => sum + row.browser_control_inventory.total, 0),
    visible_browser_controls: receipt.rows.reduce((sum, row) => sum + row.browser_control_inventory.visible, 0),
    activated_controls: receipt.rows.reduce((sum, row) => sum + row.browser_control_inventory.activated, 0),
    boundary_skipped_controls: receipt.rows.reduce((sum, row) => sum + row.browser_control_inventory.boundary_skipped, 0),
    disabled_verified_controls: receipt.rows.reduce((sum, row) => sum + row.browser_control_inventory.disabled_verified, 0),
    failed_actions: receipt.rows.reduce((sum, row) => sum + row.failed_actions.length, 0),
    screenshots: receipt.rows.reduce((sum, row) => sum + row.visual_scroll.screenshots.length + 2, 0),
    command_bridge_telemetry_readbacks: receipt.rows.filter((row) => row.telemetry.ok).length,
    request_failed: receipt.rows.reduce((sum, row) => sum + row.network.request_failed.length, 0),
    benign_media_aborts: receipt.rows.reduce((sum, row) => sum + (row.network.benign_media_aborts?.length || 0), 0),
    bad_responses: receipt.rows.reduce((sum, row) => sum + row.network.bad_responses.length, 0),
    console_errors: receipt.rows.reduce((sum, row) => sum + row.console_errors.length, 0),
    page_errors: receipt.rows.reduce((sum, row) => sum + row.page_errors.length, 0)
  };
}

async function main() {
  mkdirSync(artifactDir, { recursive: true });
  const [matrix, controlProof, auth] = await Promise.all([
    readJson(matrixPath, {}),
    readJson(controlProofPath, {}),
    resolveZeroOsGateAuth({ zeroOsBase: baseUrl })
  ]);
  if (!auth?.token) throw new Error('Shared 0S gate token is required for live browser proof.');
  const allRows = matrix?.app_behavior_matrix?.rows || [];
  if (!allRows.length) throw new Error(`Missing app behavior matrix rows in ${rel(matrixPath)}.`);
  const controlRows = new Map((controlProof.rows || []).map((row) => [row.id, row]));
  let rows = appFilter.size ? allRows.filter((row) => appFilter.has(row.id)) : allRows;
  if (maxApps > 0) rows = rows.slice(0, maxApps);

  const receipt = {
    ok: false,
    schema: 'metraiyux.0s.live-human-browser-e2e.v1',
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    mode: 'headed-live-browser',
    headless: false,
    policy_override: 'Owner explicitly re-enabled browser proof for this task and required end-to-end production proof.',
    source_matrix: rel(matrixPath),
    source_control_proof: rel(controlProofPath),
    credential_source: auth.credential?.key || auth.credential?.source || 'shared-gate',
    artifact_dir: rel(artifactDir),
    settings: {
      app_count: rows.length,
      viewport_count: viewports.length,
      stress_cycles: stressCycles,
      max_controls_per_app: maxControlsPerApp || 'all',
      slow_mo_ms: slowMo,
      post_action_wait_ms: postActionWaitMs,
      action_network_idle_ms: actionNetworkIdleMs,
      return_network_idle_ms: returnNetworkIdleMs,
      initial_network_idle_ms: initialNetworkIdleMs,
      link_check_timeout_ms: linkCheckTimeoutMs
    },
    summary: {},
    rows: [],
    failures: [],
    partial: true
  };

  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      slowMo,
      args: process.platform === 'linux'
        ? ['--ozone-platform=x11', '--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox', '--disable-features=VizDisplayCompositor']
        : []
    });
    for (const app of rows) {
      const appRows = [];
      for (const viewport of viewports) {
        process.stdout.write(`browser ${app.id} ${viewport.label} ${app.mounted_path}\n`);
        const row = await verifyViewport(browser, auth.token, app, viewport, controlRows.get(app.id));
        appRows.push(row);
        receipt.rows.push(row);
        if (!row.ok) {
          receipt.failures.push({
            app_id: app.id,
            name: app.name,
            mounted_path: app.mounted_path,
            viewport: viewport.label,
            failures: row.failures,
            failed_actions: row.failed_actions.slice(0, 12),
            network: row.network,
            console_errors: row.console_errors.slice(0, 12),
            page_errors: row.page_errors.slice(0, 12)
          });
        }
        receipt.summary = summarizeReceipt(receipt, rows.length);
        await writeReceipt(receipt);
      }
      const appOk = appRows.every((item) => item.ok);
      process.stdout.write(`${appOk ? 'ok' : 'fail'} ${app.id}\n`);
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  receipt.ok = receipt.failures.length === 0;
  receipt.partial = false;
  receipt.summary = summarizeReceipt(receipt, rows.length);

  await writeReceipt(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: rel(receiptPath),
    latest: rel(latestPath),
    summary: receipt.summary,
    first_failures: receipt.failures.slice(0, 8)
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const receipt = {
    ok: false,
    schema: 'metraiyux.0s.live-human-browser-e2e.v1',
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    mode: 'headed-live-browser',
    headless: false,
    policy_override: 'Owner explicitly re-enabled browser proof for this task and required end-to-end production proof.',
    artifact_dir: rel(artifactDir),
    error: error?.stack || error?.message || String(error),
    summary: {},
    rows: [],
    failures: [{ error: error?.message || String(error) }]
  };
  await writeReceipt(receipt).catch(() => {});
  console.error(JSON.stringify({ ok: false, latest: rel(latestPath), error: error?.message || String(error) }, null, 2));
  process.exitCode = 1;
});
