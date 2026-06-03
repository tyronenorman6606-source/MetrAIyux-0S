#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'skyevault-agent-live-browser');
const latestPath = path.join(artifactRoot, 'latest.json');
const fs27 = process.env.FS27_LIVE_BASE || 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev';
const zeroOs = process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const drop = process.env.SKYEVAULT_DROP_LIVE_BASE || 'https://skyevault-drop.graylondonskyes.workers.dev';
const devooderator = process.env.DEVOODERURL || 'https://devooderator.pages.dev';
const offer = process.env.SKYEVAULT_AGENT_PROOF_OFFER || 'skyevault-pro-access';

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== 'linux') return;
  if (process.env.DISPLAY || process.env.SKYEVAULT_BROWSER_XVFB_ACTIVE === '1') return;
  const probe = spawnSync('which', ['xvfb-run'], { encoding: 'utf8' });
  if (probe.status !== 0) return;
  const child = spawnSync('xvfb-run', ['-a', process.execPath, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, SKYEVAULT_BROWSER_XVFB_ACTIVE: '1' }
  });
  process.exit(child.status ?? 1);
}

relaunchWithXvfbWhenNeeded();

function slug(value) {
  return String(value || 'proof')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 88) || 'proof';
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function ownerHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    'x-skye-gate-session': token,
    'x-free99-gate-session': token
  };
}

function parseJson(text) {
  try { return JSON.parse(String(text || '')); } catch { return null; }
}

function checkoutSessionFromStripeUrl(value = '') {
  try {
    const url = new URL(value);
    if (!url.hostname.includes('checkout.stripe.com')) return '';
    return url.pathname.split('/').filter(Boolean).find((part) => part.startsWith('cs_')) || '';
  } catch {
    return '';
  }
}

function isExternalBrowserNoiseUrl(value = '') {
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'checkout.stripe.com'
      || hostname.endsWith('.stripe.com')
      || hostname === 'stripe.com'
      || hostname.endsWith('.stripecdn.com')
      || hostname === 'stripecdn.com'
      || hostname.endsWith('.klarna.com')
      || hostname === 'klarna.com'
      || hostname.endsWith('.hcaptcha.com')
      || hostname === 'hcaptcha.com';
  } catch {
    const text = String(value || '');
    return text.includes('checkout.stripe.com')
      || text.includes('stripe.com')
      || text.includes('stripecdn.com')
      || text.includes('klarna.com')
      || text.includes('hcaptcha.com');
  }
}

function checkoutReturnUrl(checkoutBody = {}) {
  const sessionId = String(checkoutBody.id || '').trim();
  const raw = String(checkoutBody.delivery_success_url || `${zeroOs}/skye-vault-os/agent/?offer=${offer}`).trim();
  const url = new URL(raw, zeroOs);
  const existing = String(url.searchParams.get('session_id') || '');
  if (sessionId && (!existing || existing.includes('CHECKOUT_SESSION_ID') || existing.includes('{'))) {
    url.searchParams.set('session_id', sessionId);
  }
  if (!url.searchParams.get('offer')) url.searchParams.set('offer', String(checkoutBody.offer_id || offer));
  return url.toString();
}

function agentPackageUrlFromHref(href = '') {
  try {
    return new URL(href || '../../downloads/skyevault-agent/releases/latest/skyevault-agent-latest.tar.gz', `${zeroOs}/skye-vault-os/agent/`).toString();
  } catch {
    return `${zeroOs}/downloads/skyevault-agent/releases/latest/skyevault-agent-latest.tar.gz`;
  }
}

function logProgress(message) {
  console.error(`[skyevault-browser-proof] ${message}`);
}

function secretLikeLeak(text) {
  const body = String(text || '');
  const patterns = [
    /sk_live_[A-Za-z0-9_]+/,
    /rk_live_[A-Za-z0-9_]+/,
    /Bearer\s+[A-Za-z0-9_.-]{24,}/i,
    /SKYEVAULT_PORTAL_KEY\s*=\s*["'](?!<|&lt;|\$\{|workspace|customer-)[A-Za-z0-9_.:/+=-]{16,}["']/i,
    /SKYEVAULT_GATE_BEARER\s*=\s*["'](?!<|&lt;|\$\{|shared|customer-)[A-Za-z0-9_.:/+=-]{16,}["']/i
  ];
  const hit = patterns.find((pattern) => pattern.test(body));
  return hit ? String(hit) : '';
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  return { response, text, body };
}

function check(receipt, name, ok, details = {}) {
  const row = { name, ok: Boolean(ok), ...details };
  receipt.checks.push(row);
  if (!row.ok) receipt.failures.push(row);
  return row;
}

async function clickLocatorIfVisible(page, locator, actions, label, options = {}) {
  if (!(await locator.isVisible({ timeout: options.timeout || 2500 }).catch(() => false))) return false;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(120);
  const box = await locator.boundingBox().catch(() => null);
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 60 });
  } else {
    await locator.click({ timeout: options.timeout || 3500, force: true, noWaitAfter: true });
  }
  actions.push(label);
  await page.waitForTimeout(options.afterMs || 250);
  return true;
}

async function clickIfVisible(page, selector, actions, label, options = {}) {
  return clickLocatorIfVisible(page, page.locator(selector).first(), actions, label, options);
}

async function fillIfVisible(page, selector, value, actions, label) {
  const locator = page.locator(selector).first();
  if (!(await locator.isVisible({ timeout: 2500 }).catch(() => false))) return false;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.fill(value, { timeout: 3500 });
  actions.push(label);
  await page.waitForTimeout(120);
  return true;
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const textNodes = [];
    let visibleTextChars = 0;
    function visible(el) {
      if (!el) return false;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.03 && rect.width > 1 && rect.height > 1 && rect.bottom > 0 && rect.right > 0 && rect.left < viewport.width && rect.top < viewport.height;
    }
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = String(node.nodeValue || '').replace(/\s+/g, ' ').trim();
      if (!text || !visible(node.parentElement)) continue;
      visibleTextChars += text.length;
      if (textNodes.length < 8) textNodes.push(text.slice(0, 120));
    }
    const elements = Array.from(document.querySelectorAll('a,button,input,textarea,select,h1,h2,h3,p,li,img,video,canvas,svg,code'));
    let meaningfulVisibleElementCount = 0;
    const brokenMedia = [];
    for (const el of elements) {
      if (!visible(el)) continue;
      meaningfulVisibleElementCount += 1;
      const tag = el.tagName.toLowerCase();
      if (tag === 'img') {
        if (!el.complete || !el.naturalWidth || !el.naturalHeight) {
          brokenMedia.push({ tag, src: el.currentSrc || el.src || '', reason: 'image did not load' });
        }
      } else if (tag === 'video') {
        if (el.readyState < 2 && !el.poster && !el.currentSrc && !el.src) {
          brokenMedia.push({ tag, src: el.currentSrc || el.src || '', reason: 'video not ready' });
        }
      } else if (tag === 'canvas') {
        if (!el.width || !el.height) brokenMedia.push({ tag, reason: 'zero-size canvas' });
      }
    }
    const horizontalOverflowPx = Math.max(
      0,
      Math.max(document.documentElement.scrollWidth || 0, document.body?.scrollWidth || 0) - window.innerWidth
    );
    return {
      scrollY: Math.round(window.scrollY || 0),
      viewport,
      visibleTextChars,
      textSamples: textNodes,
      meaningfulVisibleElementCount,
      brokenMedia,
      horizontalOverflowPx,
      blankish: visibleTextChars < 30 && meaningfulVisibleElementCount < 4
    };
  });
}

async function scrollAudit(page, artifactDir, label, viewport, actions) {
  let plan = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      plan = await page.evaluate(() => {
        const height = Math.max(document.documentElement.scrollHeight || 0, document.body?.scrollHeight || 0);
        const viewportHeight = window.innerHeight || 800;
        const maxY = Math.max(0, height - viewportHeight);
        const anchors = Array.from(document.querySelectorAll('header,main,footer,section,article,[id]'))
          .map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY))
          .filter((y) => Number.isFinite(y) && y >= 0 && y <= maxY);
        const increments = [];
        const step = Math.max(320, Math.floor(viewportHeight * 0.72));
        for (let y = 0; y <= maxY; y += step) increments.push(y);
        return { height, viewportHeight, maxY, candidates: [0, maxY, ...anchors, ...increments] };
      });
      break;
    } catch (error) {
      if (attempt === 2 || !String(error.message || '').includes('Execution context was destroyed')) throw error;
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }
  const stops = [...new Set(plan.candidates.map((value) => Math.max(0, Math.min(plan.maxY, Number(value) || 0))))].sort((a, b) => a - b);
  const maxStops = Number(process.env.SKYEVAULT_BROWSER_MAX_SCROLL_STOPS || 8);
  const selected = stops.length > maxStops
    ? [stops[0], ...Array.from({ length: Math.max(0, maxStops - 2) }, (_, index) => stops[Math.round((index / Math.max(1, maxStops - 3)) * (stops.length - 1))]), stops.at(-1)]
    : stops;
  const results = [];
  for (let index = 0; index < selected.length; index += 1) {
    const y = selected[index];
    const currentY = await page.evaluate(() => window.scrollY).catch(() => 0);
    const delta = y - currentY;
    await page.mouse.wheel(0, delta);
    await page.evaluate((target) => window.scrollTo({ top: target, behavior: 'instant' }), y);
    await page.waitForTimeout(180);
    const metrics = await pageMetrics(page);
    const screenshot = path.join(artifactDir, `${label}-${viewport.width}x${viewport.height}-scroll-${String(index + 1).padStart(2, '0')}.png`);
    let screenshotCapture = { method: 'playwright' };
    try {
      await page.screenshot({ path: screenshot, fullPage: false, animations: 'disabled', timeout: 12000 });
    } catch (error) {
      const client = await page.context().newCDPSession(page);
      try {
        const shot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
        fs.writeFileSync(screenshot, Buffer.from(shot.data, 'base64'));
        screenshotCapture = { method: 'cdp-fallback', playwrightError: error.message };
      } finally {
        await client.detach().catch(() => {});
      }
    }
    results.push({ index: index + 1, targetY: y, screenshot: rel(screenshot), screenshotCapture, ...metrics });
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })).catch(() => {});
  actions.push(`human full-page scroll audit ${selected.length} stops`);
  return {
    documentHeight: plan.height,
    viewportHeight: plan.viewportHeight,
    maxY: plan.maxY,
    stopCount: results.length,
    stops: results,
    blankStops: results.filter((row) => row.blankish),
    brokenVisibleMediaStops: results.filter((row) => row.brokenMedia.length > 0),
    overflowStops: results.filter((row) => row.horizontalOverflowPx > 2)
  };
}

async function newPage(context, label) {
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(45000);
  const telemetry = { label, consoleErrors: [], externalConsoleErrors: [], pageErrors: [], failedRequests: [], responses: [] };
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const row = { text: message.text(), location: message.location() };
    if (isExternalBrowserNoiseUrl(row.location?.url || '') || isExternalBrowserNoiseUrl(row.text)) {
      telemetry.externalConsoleErrors.push(row);
    } else {
      telemetry.consoleErrors.push(row);
    }
  });
  page.on('pageerror', (error) => telemetry.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (isExternalBrowserNoiseUrl(url)) return;
    telemetry.failedRequests.push({
      url,
      method: request.method(),
      failure: request.failure()?.errorText || 'request failed'
    });
  });
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !isExternalBrowserNoiseUrl(url)) {
      telemetry.responses.push({ url, status, method: response.request().method() });
    }
  });
  return { page, telemetry };
}

async function runBuyerFlow(browser, receipt, viewport, artifactDir) {
  logProgress(`buyer flow ${viewport.width}x${viewport.height}`);
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 700,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
    reducedMotion: 'reduce'
  });
  const { page, telemetry } = await newPage(context, `buyer-${viewport.width}`);
  const actions = [];
  let checkoutBody = null;
  let checkoutOpened = false;
  const url = `${fs27}/skyevault-agent.html`;
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    await page.locator('[data-offer-id="skyevault-pro-access"]').first().waitFor({ timeout: 15000 });
    actions.push('opened buyer page');
    await clickIfVisible(page, 'nav a[href="#proof"]', actions, 'clicked Proof nav');
    await clickIfVisible(page, 'nav a:has-text("Buy")', actions, 'clicked Buy nav');
    const laneCards = await page.locator('.agent-lane-card').count().catch(() => 0);
    for (let index = 0; index < Math.min(3, laneCards); index += 1) {
      await clickLocatorIfVisible(page, page.locator('.agent-lane-card').nth(index), actions, `selected SkyeVault lane card ${index + 1}`, { afterMs: 160 });
    }
    await fillIfVisible(page, 'input[name="customer_name"]', `Live Browser Buyer ${viewport.width}`, actions, 'typed buyer name');
    await fillIfVisible(page, 'input[name="customer_email"]', `skyevault-browser+${Date.now()}-${viewport.width}@example.com`, actions, 'typed buyer email');
    await fillIfVisible(page, 'input[name="company_name"]', `SkyeVault Browser Proof ${viewport.width}`, actions, 'typed buyer company');
    const invalidWithoutLegal = await page.locator('#agentCheckoutForm').evaluate((form) => !form.checkValidity()).catch(() => false);
    actions.push('checked legal acceptance blocks checkout before acceptance');
    await page.locator('input[name="legal_acceptance"]').check({ force: true });
    actions.push('accepted legal terms checkbox');
    const checkoutResponsePromise = page.waitForResponse((res) => res.url().includes('/skyepay/checkout') && res.request().method() === 'POST', { timeout: 25000 });
    await clickLocatorIfVisible(page, page.locator('#checkoutButton'), actions, 'clicked Open secure checkout');
    const checkoutResponse = await checkoutResponsePromise;
    checkoutBody = parseJson(await checkoutResponse.text().catch(() => ''));
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 }).catch(() => {});
    const stripeSessionFromUrl = checkoutSessionFromStripeUrl(page.url());
    if (!checkoutBody && stripeSessionFromUrl) {
      checkoutBody = {
        ok: true,
        id: stripeSessionFromUrl,
        url: page.url(),
        delivery_success_url: `${zeroOs}/skye-vault-os/agent/?offer=${offer}&session_id=${encodeURIComponent(stripeSessionFromUrl)}`
      };
    }
    checkoutOpened = Boolean((checkoutBody?.url && new URL(checkoutBody.url).host.includes('stripe.com')) || page.url().includes('checkout.stripe.com'));
    if (page.url().includes('checkout.stripe.com')) {
      actions.push('browser reached Stripe Checkout without completing payment');
      const stripeShot = path.join(artifactDir, `buyer-${viewport.width}x${viewport.height}-stripe-checkout.png`);
      await page.screenshot({ path: stripeShot, fullPage: false }).catch(() => {});
    }
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
    const visual = await scrollAudit(page, artifactDir, `buyer-${viewport.width}`, viewport, actions);
    const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    const leak = secretLikeLeak(bodyText);
    const row = {
      url,
      viewport,
      status: response?.status() || 0,
      ok: Boolean(response?.ok())
        && bodyText.includes('SkyeVault Agent')
        && bodyText.includes('Starter, Pro, Command, and Auto-Install')
        && bodyText.includes('SKYEVAULT_AGENT_AUTO_INSTALL')
        && bodyText.includes('Open secure checkout')
        && invalidWithoutLegal
        && checkoutOpened
        && checkoutBody?.ok === true
        && String(checkoutBody?.id || '').startsWith('cs_')
        && String(checkoutBody?.delivery_success_url || '').includes('/skye-vault-os/agent/')
        && !leak
        && visual.blankStops.length === 0
        && visual.brokenVisibleMediaStops.length === 0
        && visual.overflowStops.length === 0
        && telemetry.consoleErrors.length === 0
        && telemetry.pageErrors.length === 0
        && telemetry.failedRequests.length === 0
        && telemetry.responses.length === 0,
      checkoutSession: checkoutBody?.id ? `${checkoutBody.id.slice(0, 10)}...${checkoutBody.id.slice(-4)}` : '',
      deliverySuccessUrl: checkoutBody?.delivery_success_url || '',
      checkoutHost: checkoutBody?.url ? new URL(checkoutBody.url).host : '',
      invalidWithoutLegal,
      actions,
      actionCount: actions.length,
      visual,
      telemetry,
      leak
    };
    receipt.browserChecks.push(row);
    return { row, checkoutBody };
  } finally {
    await context.close().catch(() => {});
  }
}

async function runStoreFlow(browser, receipt, viewport, artifactDir) {
  logProgress(`store flow ${viewport.width}x${viewport.height}`);
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 700,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
    reducedMotion: 'reduce'
  });
  const { page, telemetry } = await newPage(context, `store-${viewport.width}`);
  const actions = [];
  let checkoutBody = null;
  const url = `${fs27}/skyepay-store?client=metraiyux-0s&offer=${offer}`;
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.locator(`[data-offer-id="${offer}"]`).first().waitFor({ timeout: 18000 });
    actions.push('opened SkyePay store with SkyeVault offer selected');
    await clickIfVisible(page, 'nav a[href="#vault"]', actions, 'clicked Vault nav');
    await clickIfVisible(page, `[data-offer-id="${offer}"]`, actions, 'clicked SkyeVault Pro offer card', { force: true });
    await fillIfVisible(page, 'input[name="customer_name"]', `Live Browser Store ${viewport.width}`, actions, 'typed store buyer name');
    await fillIfVisible(page, 'input[name="customer_email"]', `skyevault-store-browser+${Date.now()}-${viewport.width}@example.com`, actions, 'typed store buyer email');
    await fillIfVisible(page, 'input[name="company_name"]', `SkyeVault Store Proof ${viewport.width}`, actions, 'typed store company');
    const invalidWithoutLegal = await page.locator('#storeCheckoutForm').evaluate((form) => !form.checkValidity()).catch(() => false);
    actions.push('checked store legal acceptance blocks checkout before acceptance');
    await page.locator('input[name="legal_acceptance"]').check({ force: true });
    actions.push('accepted store legal terms checkbox');
    const checkoutResponsePromise = page.waitForResponse((res) => res.url().includes('/skyepay/checkout') && res.request().method() === 'POST', { timeout: 25000 });
    await clickLocatorIfVisible(page, page.locator('#storeCheckoutBtn'), actions, 'clicked store Open secure checkout');
    const checkoutResponse = await checkoutResponsePromise;
    checkoutBody = parseJson(await checkoutResponse.text().catch(() => ''));
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 }).catch(() => {});
    const stripeSessionFromUrl = checkoutSessionFromStripeUrl(page.url());
    if (!checkoutBody && stripeSessionFromUrl) {
      checkoutBody = {
        ok: true,
        id: stripeSessionFromUrl,
        url: page.url(),
        delivery_success_url: `${zeroOs}/skye-vault-os/agent/?offer=${offer}&session_id=${encodeURIComponent(stripeSessionFromUrl)}`
      };
    }
    const checkoutOpened = Boolean((checkoutBody?.url && new URL(checkoutBody.url).host.includes('stripe.com')) || page.url().includes('checkout.stripe.com'));
    if (page.url().includes('checkout.stripe.com')) {
      actions.push('store browser reached Stripe Checkout without completing payment');
      const stripeShot = path.join(artifactDir, `store-${viewport.width}x${viewport.height}-stripe-checkout.png`);
      await page.screenshot({ path: stripeShot, fullPage: false }).catch(() => {});
    }
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
    const visual = await scrollAudit(page, artifactDir, `store-${viewport.width}`, viewport, actions);
    const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    const row = {
      url,
      viewport,
      status: response?.status() || 0,
      ok: Boolean(response?.ok())
        && bodyText.includes('SkyePay Store')
        && bodyText.includes('SkyeVault Pro Access')
        && bodyText.includes('25GB vault')
        && invalidWithoutLegal
        && checkoutOpened
        && checkoutBody?.ok === true
        && String(checkoutBody?.id || '').startsWith('cs_')
        && visual.blankStops.length === 0
        && visual.brokenVisibleMediaStops.length === 0
        && visual.overflowStops.length === 0
        && telemetry.consoleErrors.length === 0
        && telemetry.pageErrors.length === 0
        && telemetry.failedRequests.length === 0
        && telemetry.responses.length === 0,
      checkoutSession: checkoutBody?.id ? `${checkoutBody.id.slice(0, 10)}...${checkoutBody.id.slice(-4)}` : '',
      checkoutHost: checkoutBody?.url ? new URL(checkoutBody.url).host : '',
      invalidWithoutLegal,
      actions,
      actionCount: actions.length,
      visual,
      telemetry
    };
    receipt.browserChecks.push(row);
    return { row, checkoutBody };
  } finally {
    await context.close().catch(() => {});
  }
}

async function runPendingInstallFlow(browser, receipt, viewport, artifactDir, checkoutBody) {
  logProgress(`pending install flow ${viewport.width}x${viewport.height}`);
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 700,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
    reducedMotion: 'reduce'
  });
  const { page, telemetry } = await newPage(context, `pending-install-${viewport.width}`);
  const actions = [];
  const sessionId = checkoutBody?.id || '';
  const url = checkoutReturnUrl(checkoutBody);
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.locator('#entitlementStatus').waitFor({ timeout: 15000 });
    actions.push('opened install center from checkout return');
    await clickIfVisible(page, 'nav a:has-text("Owner Login")', actions, 'clicked Owner Login nav');
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    actions.push('returned to pending install center');
    const afterBackText = await page.locator('body').innerText({ timeout: 2000 }).catch(() => '');
    if (!afterBackText.includes('SkyeVault Agent Install Center')) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      actions.push('reloaded pending install center after browser history returned a blank page');
    }
    const downloadHref = await page.locator('#downloadButton').getAttribute('href').catch(() => '');
    await clickLocatorIfVisible(page, page.locator('#downloadButton'), actions, 'clicked locked Download Agent button without leaving install page');
    const lockedClickStayedOnPage = page.url().includes('/skye-vault-os/agent/');
    const downloadUrl = agentPackageUrlFromHref(downloadHref);
    const packageResponse = await context.request.get(downloadUrl, { failOnStatusCode: false });
    const packageStatus = packageResponse.status();
    actions.push('proved locked package route still returns 402 to unpaid session');
    const visual = await scrollAudit(page, artifactDir, `pending-install-${viewport.width}`, viewport, actions);
    const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    const deliveryHidden = await page.locator('#deliveryPanel').evaluate((el) => el.hidden).catch(() => false);
    const expectedLockConsole = telemetry.consoleErrors.length > 0
      && telemetry.consoleErrors.every((item) => String(item.location?.url || '').includes('/downloads/skyevault-agent/releases/latest/skyevault-agent-latest.tar.gz') && item.text.includes('402'));
    const expectedLockResponses = telemetry.responses.length > 0
      && telemetry.responses.every((item) => item.url.includes('/downloads/skyevault-agent/releases/latest/skyevault-agent-latest.tar.gz') && item.status === 402);
    const expectedAdminLoginAbort = telemetry.failedRequests.length > 0
      && telemetry.failedRequests.every((item) => item.url.includes('/admin/login.html') && item.failure === 'net::ERR_ABORTED');
    const row = {
      url,
      viewport,
      status: response?.status() || 0,
      ok: Boolean(response?.ok())
        && bodyText.includes('SkyeVault Agent Install Center')
        && bodyText.includes('Install page is open; package download unlocks after payment and provisioning finish.')
        && bodyText.includes('Workspace portal key appears here after provisioning.')
        && bodyText.includes('Download unlocks after provisioning')
        && lockedClickStayedOnPage
        && packageStatus === 402
        && deliveryHidden
        && !secretLikeLeak(bodyText)
        && visual.blankStops.length === 0
        && visual.brokenVisibleMediaStops.length === 0
        && visual.overflowStops.length === 0
        && (telemetry.consoleErrors.length === 0 || expectedLockConsole)
        && telemetry.pageErrors.length === 0
        && (telemetry.failedRequests.length === 0 || expectedAdminLoginAbort)
        && (telemetry.responses.length === 0 || expectedLockResponses),
      session: sessionId ? `${sessionId.slice(0, 10)}...${sessionId.slice(-4)}` : '',
      packageStatus,
      downloadHref,
      lockedClickStayedOnPage,
      deliveryHidden,
      expectedAdminLoginAbort,
      actions,
      actionCount: actions.length,
      visual,
      telemetry
    };
    receipt.browserChecks.push(row);
    return row;
  } finally {
    await context.close().catch(() => {});
  }
}

async function runOwnerDownloadFlow(browser, receipt, viewport, artifactDir, ownerToken, expectedManifest) {
  logProgress(`owner download flow ${viewport.width}x${viewport.height}`);
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 700,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
    reducedMotion: 'reduce',
    acceptDownloads: true,
    extraHTTPHeaders: ownerHeaders(ownerToken)
  });
  const { page, telemetry } = await newPage(context, `owner-install-${viewport.width}`);
  const actions = [];
  const url = `${zeroOs}/skye-vault-os/agent/`;
  let downloadProof = { ok: false };
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.locator('#releaseVersion').waitFor({ timeout: 15000 });
    actions.push('opened owner/shared-gate install center');
    const versionText = await page.locator('#releaseVersion').innerText().catch(() => '');
    const bytesText = await page.locator('#releaseBytes').innerText().catch(() => '');
    const shaText = await page.locator('#releaseSha').innerText().catch(() => '');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
    await clickLocatorIfVisible(page, page.locator('#downloadButton'), actions, 'clicked authenticated Download Agent button');
    const download = await downloadPromise;
    if (download) {
      const tempPath = await download.path();
      const suggestedFilename = download.suggestedFilename();
      const digest = tempPath ? sha256File(tempPath) : '';
      const size = tempPath ? fs.statSync(tempPath).size : 0;
      const expectedSha = expectedManifest?.release?.latestSha256 || expectedManifest?.release?.sha256 || '';
      const expectedBytes = Number(expectedManifest?.release?.bytes || 0);
      downloadProof = {
        ok: suggestedFilename.includes('skyevault-agent') && digest === expectedSha && size === expectedBytes,
        suggestedFilename,
        sha256: digest,
        bytes: size,
        expectedSha,
        expectedBytes
      };
    }
    const visual = await scrollAudit(page, artifactDir, `owner-install-${viewport.width}`, viewport, actions);
    const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    const expectedDownloadAbort = telemetry.failedRequests.length > 0
      && telemetry.failedRequests.every((item) => item.url.includes('/downloads/skyevault-agent/releases/latest/skyevault-agent-latest.tar.gz') && item.failure === 'net::ERR_ABORTED');
    const row = {
      url,
      viewport,
      status: response?.status() || 0,
      ok: Boolean(response?.ok())
        && bodyText.includes('SkyeVault Agent Install Center')
        && versionText.includes(expectedManifest?.package?.version || '')
        && bytesText !== 'Unknown'
        && shaText.includes(String(expectedManifest?.release?.sha256 || '').slice(0, 18))
        && downloadProof.ok
        && visual.blankStops.length === 0
        && visual.brokenVisibleMediaStops.length === 0
        && visual.overflowStops.length === 0
        && telemetry.consoleErrors.length === 0
        && telemetry.pageErrors.length === 0
        && (telemetry.failedRequests.length === 0 || (downloadProof.ok && expectedDownloadAbort))
        && telemetry.responses.length === 0,
      versionText,
      bytesText,
      shaText,
      downloadProof,
      actions,
      actionCount: actions.length,
      visual,
      telemetry
    };
    receipt.browserChecks.push(row);
    return row;
  } finally {
    await context.close().catch(() => {});
  }
}

async function runContentSurface(browser, receipt, viewport, artifactDir, label, url, requiredText, options = {}) {
  logProgress(`${label} content flow ${viewport.width}x${viewport.height}`);
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 700,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
    reducedMotion: 'reduce'
  });
  const { page, telemetry } = await newPage(context, `${label}-${viewport.width}`);
  const actions = [];
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    const canonicalUrl = page.url().split('#')[0];
    actions.push(`opened ${label}`);
    await clickIfVisible(page, 'a[href="#client-vault"]', actions, `clicked ${label} client vault anchor`);
    const clickedProductLink = await clickIfVisible(page, options.productLinkSelector || 'a[href*="skyevault-agent"]', actions, `clicked ${label} SkyeVault link`, { afterMs: 900 });
    if (clickedProductLink) {
      await page.waitForLoadState('domcontentloaded', { timeout: 6000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
      await page.goto(canonicalUrl, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      actions.push(`returned to ${label}`);
    } else if (!page.url().split('#')[0].startsWith(canonicalUrl)) {
      await page.goto(canonicalUrl, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      actions.push(`returned to ${label}`);
    }
    const visual = await scrollAudit(page, artifactDir, `${label}-${viewport.width}`, viewport, actions);
    const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    const expectedReturnAbort = telemetry.failedRequests.length > 0
      && telemetry.failedRequests.every((item) => item.failure === 'net::ERR_ABORTED' && /skyevault-agent|skye-vault-os\/agent/.test(item.url));
    const row = {
      url,
      viewport,
      status: response?.status() || 0,
      ok: Boolean(response?.ok())
        && requiredText.every((text) => bodyText.includes(text))
        && visual.blankStops.length === 0
        && visual.brokenVisibleMediaStops.length === 0
        && visual.overflowStops.length === 0
        && telemetry.consoleErrors.length === 0
        && telemetry.pageErrors.length === 0
        && (telemetry.failedRequests.length === 0 || expectedReturnAbort)
        && telemetry.responses.length === 0,
      actions,
      actionCount: actions.length,
      expectedReturnAbort,
      visual,
      telemetry
    };
    receipt.browserChecks.push(row);
    return row;
  } finally {
    await context.close().catch(() => {});
  }
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactDir = path.join(artifactRoot, stamp);
  fs.mkdirSync(artifactDir, { recursive: true });

  const receipt = {
    ok: false,
    schema: 'skyevault.agent-live-browser-proof.v1',
    generatedAt: new Date().toISOString(),
    mode: 'headed-live-browser',
    headless: false,
    xvfb: process.env.SKYEVAULT_BROWSER_XVFB_ACTIVE === '1',
    policyOverride: 'Owner explicitly re-enabled browser proof for this task.',
    surfaces: {
      buyer: `${fs27}/skyevault-agent.html`,
      store: `${fs27}/skyepay-store?client=metraiyux-0s&offer=${offer}`,
      installCenter: `${zeroOs}/skye-vault-os/agent/`,
      package: `${zeroOs}/downloads/skyevault-agent/releases/latest/skyevault-agent-latest.tar.gz`,
      drop: `${drop}/#client-vault`,
      blog: `${devooderator}/blog/2026-05-31-skyevault-agent-platform-lane`
    },
    checks: [],
    browserChecks: [],
    failures: []
  };

  const ownerAuth = await resolveZeroOsGateAuth({ zeroOsBase: zeroOs });
  check(receipt, 'Shared owner gate credential is available for browser package download proof', ownerAuth.ok && Boolean(ownerAuth.token), {
    credentialKey: ownerAuth.credential?.key || '',
    credentialSource: ownerAuth.credential?.source || '',
    status: ownerAuth.response?.status || 0
  });

  let expectedManifest = null;
  if (ownerAuth.ok && ownerAuth.token) {
    const manifestFetch = await fetchJson(`${zeroOs}/downloads/skyevault-agent/latest.json`, {
      headers: { ...ownerHeaders(ownerAuth.token), accept: 'application/json' }
    });
    expectedManifest = manifestFetch.body;
    check(receipt, 'Owner release manifest is readable before browser download proof',
      manifestFetch.response.status === 200
        && /^0\.2\.\d+$/.test(String(expectedManifest?.package?.version || ''))
        && /^[a-f0-9]{64}$/.test(String(expectedManifest?.release?.sha256 || ''))
        && Number(expectedManifest?.release?.bytes || 0) > 0, {
      status: manifestFetch.response.status,
      version: expectedManifest?.package?.version || '',
      bytes: expectedManifest?.release?.bytes || 0,
      sha256: expectedManifest?.release?.sha256 || ''
    });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      slowMo: Number(process.env.SKYEVAULT_BROWSER_SLOWMO || 80),
      args: process.platform === 'linux' ? ['--ozone-platform=x11', '--disable-dev-shm-usage', '--disable-gpu'] : []
    });
  } catch (error) {
    check(receipt, 'Headed Chromium launched', false, { error: error.message });
    const stamped = path.join(artifactRoot, `${receipt.generatedAt.replace(/[:.]/g, '-')}.json`);
    writeJson(stamped, receipt);
    writeJson(latestPath, { ...receipt, receiptPath: rel(stamped), artifactDir: rel(artifactDir) });
    console.error(JSON.stringify({ ok: false, receiptPath: rel(stamped), failures: receipt.failures }, null, 2));
    process.exit(1);
  }

  check(receipt, 'Headed Chromium launched', true, { xvfb: receipt.xvfb });

  const viewports = [
    { width: 1440, height: 980 },
    { width: 390, height: 844 }
  ];
  const checkoutBodies = [];

  try {
    async function recordFlow(name, fn) {
      try {
        return await fn();
      } catch (error) {
        const row = {
          name,
          ok: false,
          error: error?.stack || error?.message || String(error)
        };
        receipt.browserChecks.push(row);
        receipt.failures.push(row);
        logProgress(`${name} failed: ${error?.message || String(error)}`);
        return null;
      }
    }

    for (const viewport of viewports) {
      const buyer = await recordFlow(`buyer-${viewport.width}x${viewport.height}`, () => runBuyerFlow(browser, receipt, viewport, artifactDir));
      if (buyer?.checkoutBody?.id) checkoutBodies.push(buyer.checkoutBody);
      const store = await recordFlow(`store-${viewport.width}x${viewport.height}`, () => runStoreFlow(browser, receipt, viewport, artifactDir));
      if (store?.checkoutBody?.id) checkoutBodies.push(store.checkoutBody);
    }

    const pendingCheckout = checkoutBodies[0];
    for (const viewport of viewports) {
      await recordFlow(`pending-install-${viewport.width}x${viewport.height}`, () => runPendingInstallFlow(browser, receipt, viewport, artifactDir, pendingCheckout));
      if (ownerAuth.ok && ownerAuth.token) await recordFlow(`owner-download-${viewport.width}x${viewport.height}`, () => runOwnerDownloadFlow(browser, receipt, viewport, artifactDir, ownerAuth.token, expectedManifest));
      await recordFlow(`drop-${viewport.width}x${viewport.height}`, () => runContentSurface(browser, receipt, viewport, artifactDir, 'drop', `${drop}/#client-vault`, ['SkyeVault']));
      await recordFlow(`blog-${viewport.width}x${viewport.height}`, () => runContentSurface(browser, receipt, viewport, artifactDir, 'blog', `${devooderator}/blog/2026-05-31-skyevault-agent-platform-lane`, ['SkyeVault Agent', '156 concurrent live stress reads', 'test-artifacts/skyevault-agent-sales-readiness/latest.json'], {
        productLinkSelector: 'a[href^="https://"][href*="skyevault-agent"], a[href^="https://"][href*="skye-vault-os/agent"]'
      }));
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const failedBrowserChecks = receipt.browserChecks.filter((row) => !row.ok);
  check(receipt, 'All headed browser flows passed desktop and mobile with clean visual, console, network, checkout, install, and download evidence',
    failedBrowserChecks.length === 0 && receipt.browserChecks.length === 12, {
      browserCheckCount: receipt.browserChecks.length,
      failedBrowserChecks: failedBrowserChecks.map((row) => ({
        url: row.url,
        viewport: row.viewport,
        status: row.status,
        actionCount: row.actionCount,
        consoleErrors: row.telemetry?.consoleErrors || [],
        pageErrors: row.telemetry?.pageErrors || [],
        failedRequests: row.telemetry?.failedRequests || [],
        responseErrors: row.telemetry?.responses || [],
        visualFailures: {
          blankStops: row.visual?.blankStops?.length || 0,
          brokenVisibleMediaStops: row.visual?.brokenVisibleMediaStops?.length || 0,
          overflowStops: row.visual?.overflowStops?.length || 0
        }
      }))
    });

  receipt.summary = {
    checks: receipt.checks.length,
    browserChecks: receipt.browserChecks.length,
    failures: receipt.failures.length,
    checkoutSessionsCreated: checkoutBodies.length,
    screenshots: fs.readdirSync(artifactDir).filter((file) => file.endsWith('.png')).length
  };
  receipt.ok = receipt.failures.length === 0;

  const stamped = path.join(artifactRoot, `${receipt.generatedAt.replace(/[:.]/g, '-')}.json`);
  writeJson(stamped, receipt);
  writeJson(latestPath, { ...receipt, receiptPath: rel(stamped), artifactDir: rel(artifactDir) });
  console.log(JSON.stringify({ ok: receipt.ok, receiptPath: rel(stamped), artifactDir: rel(artifactDir), summary: receipt.summary }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
