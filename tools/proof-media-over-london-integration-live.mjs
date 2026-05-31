#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const generatedAt = new Date().toISOString();
const artifactDir = path.join(
  repoRoot,
  'test-artifacts/live-browser-verifier',
  `media-over-london-integration-${generatedAt.replace(/[:.]/g, '-')}`
);
fs.mkdirSync(artifactDir, { recursive: true });

const receiptPath = path.join(artifactDir, 'receipt.json');
const domains = {
  zeroOs: 'metraiyux-0s-full-system.graylondonskyes.workers.dev',
  marketing: 'metraiyux-0s-marketing.pages.dev',
  skyepay: 'skyegatefs27-citadeldb.graylondonskyes.workers.dev'
};

const pages = [
  {
    id: 'wgo-pricing',
    url: `https://${domains.zeroOs}/Marketing-Made-Easy/WebGrowthOperator/pricing`,
    auth: true,
    expect: ['Media Over London is the source of truth', 'Launch Page', 'Lead Dashboard', 'Embedded Growth Operator'],
    kind: 'wgo'
  },
  {
    id: 'media-over-london',
    url: `https://${domains.marketing}/media-over-london.html#web-growth-catalog`,
    expect: ['WebGrowthOperator catalog', 'Launch Page', 'Lead Dashboard', 'Embedded Growth Operator'],
    kind: 'media'
  },
  {
    id: 'skyepay-embedded-growth-operator',
    url: `https://${domains.skyepay}/skyepay?client=metraiyux-0s&offer=media-over-london-embedded-growth-operator`,
    expect: ['SkyePay', 'Embedded Growth Operator'],
    kind: 'skyepay'
  }
];

const viewports = [
  { name: 'desktop', width: 1440, height: 980 },
  { name: 'mobile', width: 390, height: 844 }
];

function unquote(value) {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function sha12(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12);
}

function readEnv() {
  const env = {};
  const source = {};
  const files = ['.env', 'env.txt', '/workspaces/MetrAIyux-0S/.env', '/workspaces/MetrAIyux-0S/env.txt']
    .map((file) => path.resolve(repoRoot, file))
    .filter((file) => fs.existsSync(file));
  for (const file of files) {
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((raw, index) => {
      const match = raw.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) return;
      env[match[1]] = unquote(match[2]);
      source[match[1]] = `${path.relative(repoRoot, file) || path.basename(file)}:${match[1]}:${index + 1}`;
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

async function ownerSession() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: `https://${domains.zeroOs}` });
  const token = String(auth.token || '').replace(/^Bearer\s+/i, '').trim();
  if (!auth.ok || !token) throw new Error('Shared 0S gate session was unavailable.');
  return {
    token,
    source: auth.credential?.source || 'shared-gate',
    tokenHash: sha12(token),
    status: auth.response?.status || 0
  };
}

async function viewportMetrics(page) {
  return page.evaluate(() => {
    const vw = innerWidth;
    const vh = innerHeight;
    const viewportArea = Math.max(1, vw * vh);
    const visibleArea = (rect) =>
      Math.max(0, Math.min(vw, rect.right) - Math.max(0, rect.left)) *
      Math.max(0, Math.min(vh, rect.bottom) - Math.max(0, rect.top));
    const visible = (element) => {
      const style = getComputedStyle(element);
      return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || 1) > 0.03 &&
        Array.from(element.getClientRects()).some((rect) => visibleArea(rect) > 4);
    };

    let visibleTextChars = 0;
    const textSamples = [];
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = String(walker.currentNode.nodeValue || '').replace(/\s+/g, ' ').trim();
      const parent = walker.currentNode.parentElement;
      if (!text || !parent || !visible(parent)) continue;
      visibleTextChars += text.length;
      if (textSamples.length < 6) textSamples.push(text.slice(0, 120));
    }

    const meaningfulTags = new Set(['a', 'button', 'input', 'textarea', 'select', 'h1', 'h2', 'h3', 'h4', 'p', 'li', 'table', 'img', 'video', 'canvas', 'svg', 'iframe']);
    let visibleElementCount = 0;
    let meaningfulVisibleElementCount = 0;
    let visibleBackgroundMedia = 0;
    const visibleMedia = [];
    const brokenMedia = [];
    const overlayIssues = [];

    for (const element of Array.from(document.body?.querySelectorAll('*') || [])) {
      if (!visible(element)) continue;
      visibleElementCount += 1;
      const tag = element.tagName.toLowerCase();
      if (meaningfulTags.has(tag)) meaningfulVisibleElementCount += 1;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const areaRatio = visibleArea(rect) / viewportArea;

      if (style.backgroundImage && style.backgroundImage !== 'none') {
        visibleBackgroundMedia += 1;
        visibleMedia.push({ tag, kind: 'background' });
      }
      if (tag === 'img') {
        if (element.complete && element.naturalWidth > 0 && element.naturalHeight > 0) {
          visibleMedia.push({ tag, kind: 'image', width: element.naturalWidth, height: element.naturalHeight });
        } else {
          brokenMedia.push({ tag, kind: 'image', src: element.currentSrc || element.src || '', reason: 'not loaded' });
        }
      } else if (tag === 'video') {
        if (element.readyState >= 2 || element.poster || element.currentSrc || element.src) {
          visibleMedia.push({ tag, kind: 'video', readyState: element.readyState });
        } else {
          brokenMedia.push({ tag, kind: 'video', src: element.currentSrc || element.src || '', reason: 'not ready' });
        }
      } else if (tag === 'canvas') {
        if (element.width > 0 && element.height > 0) visibleMedia.push({ tag, kind: 'canvas', width: element.width, height: element.height });
        else brokenMedia.push({ tag, kind: 'canvas', reason: 'zero size' });
      } else if (tag === 'svg') {
        visibleMedia.push({ tag, kind: 'svg' });
      }

      if ((style.position === 'fixed' || style.position === 'sticky') &&
        style.pointerEvents !== 'none' &&
        areaRatio > 0.72 &&
        visibleTextChars < 80) {
        overlayIssues.push({
          tag,
          id: element.id || '',
          className: String(element.className || '').slice(0, 100),
          areaRatio: Number(areaRatio.toFixed(3))
        });
      }
    }

    const hasRealContent = visibleTextChars >= 30 ||
      visibleMedia.length > 0 ||
      visibleBackgroundMedia > 0 ||
      meaningfulVisibleElementCount >= 4;

    return {
      scrollY: Math.round(scrollY),
      viewport: { width: vw, height: vh },
      visibleTextChars,
      textSamples,
      visibleElementCount,
      meaningfulVisibleElementCount,
      visibleMediaCount: visibleMedia.length,
      visibleMedia: visibleMedia.slice(0, 10),
      visibleBackgroundMedia,
      brokenMedia: brokenMedia.slice(0, 10),
      overlayIssues,
      hasRealContent,
      blankish: !hasRealContent
    };
  });
}

async function writeScreenshot(page, filePath) {
  try {
    await page.screenshot({ path: filePath, type: 'jpeg', quality: 62, timeout: 45000 });
    return { ok: true, path: filePath };
  } catch (firstError) {
    try {
      await page.locator('body').screenshot({ path: filePath, type: 'jpeg', quality: 58, timeout: 45000 });
      return { ok: true, path: filePath, fallback: 'body-locator' };
    } catch (secondError) {
      return { ok: false, path: filePath, error: `${firstError.message}; fallback: ${secondError.message}` };
    }
  }
}

async function scrollProof(page, id, viewport, actions) {
  const dimensions = await page.evaluate(() => ({
    height: Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0),
    viewportHeight: innerHeight
  }));
  const maxY = Math.max(0, dimensions.height - dimensions.viewportHeight);
  const anchors = await page.evaluate(() =>
    Array.from(document.querySelectorAll('main, header, footer, section, article, [id]'))
      .map((element) => Math.round(element.getBoundingClientRect().top + scrollY))
      .filter((value) => Number.isFinite(value) && value >= 0)
  );
  const rawStops = [
    0,
    Math.round(maxY * 0.25),
    Math.round(maxY * 0.5),
    Math.round(maxY * 0.75),
    maxY,
    ...anchors.slice(0, 2),
    ...anchors.slice(-2)
  ];
  const stops = [...new Set(rawStops.map((value) => Math.max(0, Math.min(maxY, value))))]
    .sort((a, b) => a - b);
  const selected = stops.length > 5
    ? [stops[0], stops[Math.floor(stops.length * 0.25)], stops[Math.floor(stops.length * 0.5)], stops[Math.floor(stops.length * 0.75)], stops[stops.length - 1]]
    : stops;

  const proofStops = [];
  for (const [index, y] of selected.entries()) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(250);
    const metrics = await viewportMetrics(page);
    const screenshotPath = path.join(artifactDir, `${id}-${viewport.name}-scroll-${String(index + 1).padStart(2, '0')}-y${metrics.scrollY}.jpg`);
    const screenshot = await writeScreenshot(page, screenshotPath);
    proofStops.push({ index: index + 1, targetY: y, screenshot: screenshot.path, screenshotOk: screenshot.ok, screenshotFallback: screenshot.fallback || '', screenshotError: screenshot.error || '', ...metrics });
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  actions.push(`scrolled full page from 0 to ${maxY} with ${proofStops.length} visual stops`);

  return {
    documentHeight: dimensions.height,
    viewportHeight: dimensions.viewportHeight,
    maxY,
    stopCount: proofStops.length,
    stops: proofStops,
    blankStops: proofStops.filter((stop) => stop.blankish).map((stop) => stop.index),
    brokenVisibleMediaStops: proofStops.filter((stop) => stop.brokenMedia.length).map((stop) => stop.index),
    overlayStops: proofStops.filter((stop) => stop.overlayIssues.length).map((stop) => stop.index),
    screenshotFailures: proofStops.filter((stop) => !stop.screenshotOk).map((stop) => ({ index: stop.index, error: stop.screenshotError }))
  };
}

async function clickVisible(page, selector, actions, label, popup = false) {
  const locator = page.locator(selector).first();
  if (!(await locator.count().catch(() => 0)) || !(await locator.isVisible().catch(() => false))) return null;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(80);
  const beforeUrl = page.url();
  if (popup) {
    const popupPromise = page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null);
    await locator.click({ timeout: 4000 }).catch(() => {});
    const opened = await popupPromise;
    if (!opened) {
      await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(500);
      actions.push(`${label}: clicked without new page; current=${page.url()}`);
      if (page.url() !== beforeUrl) return { sameTabUrl: page.url(), beforeUrl };
      return null;
    }
    await opened.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
    await opened.waitForTimeout(1000);
    actions.push(`${label}: opened ${opened.url()}`);
    return opened;
  }
  await locator.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(350);
  actions.push(label);
  return true;
}

async function fillVisible(page, selector, value, actions, label) {
  const locator = page.locator(selector).first();
  if (!(await locator.count().catch(() => 0)) || !(await locator.isVisible().catch(() => false))) return false;
  await locator.fill(value, { timeout: 3000 });
  actions.push(label);
  return true;
}

async function exercisePage(page, kind, actions) {
  if (kind === 'wgo') {
    await clickVisible(page, '[data-nav-toggle]', actions, 'clicked WGO nav toggle');
    const popup = await clickVisible(page, 'tbody a:has-text("SkyePay")', actions, 'clicked first WGO SkyePay link', true);
    if (popup) {
      if (popup.locator) {
        const text = await popup.locator('body').innerText({ timeout: 8000 }).catch(() => '');
        actions.push(`WGO checkout popup contains SkyePay=${/SkyePay/i.test(text)}`);
        await popup.close().catch(() => {});
      } else if (popup.sameTabUrl) {
        const text = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '');
        actions.push(`WGO same-tab checkout contains SkyePay=${/SkyePay/i.test(text)}`);
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  }
  if (kind === 'media') {
    await clickVisible(page, 'a[href="#web-growth-catalog"]', actions, 'clicked Media web growth anchor');
    await clickVisible(page, 'a[href="#pricing"]', actions, 'clicked Media pricing anchor');
    const popup = await clickVisible(page, 'a[href*="media-over-london-launch-page"]', actions, 'clicked Media launch-page SkyePay card', true);
    if (popup) {
      if (popup.locator) {
        const text = await popup.locator('body').innerText({ timeout: 8000 }).catch(() => '');
        actions.push(`Media checkout popup contains SkyePay=${/SkyePay/i.test(text)}`);
        await popup.close().catch(() => {});
      } else if (popup.sameTabUrl) {
        const text = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '');
        actions.push(`Media same-tab checkout contains SkyePay=${/SkyePay/i.test(text)}`);
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  }
  if (kind === 'skyepay') {
    await page.waitForFunction(() => document.querySelectorAll('.offer-option,.bob-trial-card').length > 0, null, { timeout: 15000 }).catch(() => {});
    await fillVisible(page, 'input[name="customer_name"]', 'Live Proof Operator', actions, 'filled checkout name');
    await fillVisible(page, 'input[name="customer_email"]', 'proof@example.com', actions, 'filled checkout email');
    await fillVisible(page, 'input[name="company_name"]', 'Media Over London Proof', actions, 'filled checkout company');
    await clickVisible(page, '.offer-option', actions, 'clicked checkout offer option');
    await page.selectOption('#skyemeritCode', 'none').then(() => actions.push('changed SkyeMerit selector')).catch(() => {});
    await clickVisible(page, 'a[href="#gate-path"]', actions, 'clicked gate path nav');
    actions.push('did not submit checkout; no payment or Stripe session created');
  }
}

const session = await ownerSession();
const browser = await chromium.launch({ headless: false });
const results = [];
const failures = [];

try {
  for (const viewport of viewports) {
    for (const target of pages) {
      const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
      if (target.auth) {
        await context.setExtraHTTPHeaders({
          Authorization: `Bearer ${session.token}`,
          'x-free99-gate-session': session.token,
          'x-skye-gate-session': session.token
        });
        await context.addCookies(['metraiyux_admin_session', 'skye_gate_session', 'skygate_session'].map((name) => ({
          name,
          value: session.token,
          domain: domains.zeroOs,
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax'
        })));
      }
      const page = await context.newPage();
      const consoleErrors = [];
      const failedRequests = [];
      const responseFailures = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push({ type: message.type(), text: message.text().slice(0, 500) });
      });
      page.on('pageerror', (error) => consoleErrors.push({ type: 'pageerror', text: error.message.slice(0, 500) }));
      page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), method: request.method(), failure: request.failure()?.errorText || '' }));
      page.on('response', (response) => {
        if (response.status() >= 400) responseFailures.push({ url: response.url(), status: response.status() });
      });

      const actions = [];
      const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1000);
      actions.push(`opened ${target.url}`);
      await page.mouse.move(120, 140, { steps: 10 });
      actions.push('moved mouse into viewport');
      await exercisePage(page, target.kind, actions);

      const body = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
      const expectations = Object.fromEntries(target.expect.map((text) => [text, body.includes(text)]));
      const scroll = await scrollProof(page, target.id, viewport, actions);
      const result = {
        id: target.id,
        url: target.url,
        viewport,
        status: response?.status() || null,
        finalUrl: page.url(),
        title: await page.title().catch(() => ''),
        authenticated: Boolean(target.auth),
        expectations,
        actions,
        routeStates: [{ label: 'final', url: page.url() }],
        scroll,
        consoleErrors,
        failedRequests,
        responseFailures
      };

      const missing = Object.entries(expectations).filter(([, ok]) => !ok).map(([text]) => text);
      if ((response?.status() || 0) >= 400) failures.push({ id: target.id, viewport: viewport.name, reason: `document status ${response?.status()}` });
      if (missing.length) failures.push({ id: target.id, viewport: viewport.name, reason: 'missing expected text', missing });
      if (scroll.blankStops.length) failures.push({ id: target.id, viewport: viewport.name, reason: 'blank viewport', stops: scroll.blankStops });
      if (scroll.brokenVisibleMediaStops.length) failures.push({ id: target.id, viewport: viewport.name, reason: 'broken visible media', stops: scroll.brokenVisibleMediaStops });
      if (scroll.overlayStops.length) failures.push({ id: target.id, viewport: viewport.name, reason: 'large overlay', stops: scroll.overlayStops });
      if (scroll.screenshotFailures.length) failures.push({ id: target.id, viewport: viewport.name, reason: 'screenshot capture failed', screenshots: scroll.screenshotFailures });
      if (consoleErrors.some((entry) => entry.type === 'pageerror')) failures.push({ id: target.id, viewport: viewport.name, reason: 'page error', errors: consoleErrors.filter((entry) => entry.type === 'pageerror') });

      results.push(result);
      await context.close();
    }
  }
} finally {
  await browser.close().catch(() => {});
}

const receipt = {
  ok: failures.length === 0,
  generatedAt,
  mode: 'headed-live-browser',
  headed: true,
  xvfbDisplay: process.env.DISPLAY || '',
  productionUrlOnly: true,
  deployments: {
    fs27WorkerVersion: 'd467e106-56bf-4087-bddf-56cef699f8e6',
    zeroOsWorkerVersion: 'c5314b7d-6bd6-43ca-9826-13c2e0a24f2e',
    marketingPagesDeploymentId: 'b2da41a1-7a53-4144-a1aa-54e1cdf5d5d0'
  },
  auth: {
    source: session.source,
    tokenHash: session.tokenHash,
    loginStatus: session.status,
    tokenStoredInReceipt: false
  },
  urls: pages.map(({ id, url, auth }) => ({ id, url, authenticated: Boolean(auth) })),
  viewports,
  paymentOrEntitlementFlow: {
    exercised: true,
    details: 'SkyePay checkout UI loaded in production, form controls and offer selection were exercised, and submit was intentionally not clicked; no real payment or Stripe session was created.'
  },
  results,
  failures
};

fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ ok: receipt.ok, receiptPath, resultCount: results.length, failures }, null, 2));
if (!receipt.ok) process.exit(1);
