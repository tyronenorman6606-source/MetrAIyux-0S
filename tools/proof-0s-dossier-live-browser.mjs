#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const repoRoot = process.cwd();
const baseUrl = String(process.env.DOSSIER_BASE_URL || 'https://metraiyux-0s-marketing.pages.dev').replace(/\/+$/, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'test-artifacts', '0s-platform-dossiers', `live-browser-${stamp}`);
const latestPath = path.join(repoRoot, 'test-artifacts', '0s-platform-dossiers', 'live-browser-latest.json');

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== 'linux') return;
  if (process.env.LIVE_BROWSER_XVFB_ACTIVE === '1') return;
  if (process.env.DISPLAY && process.env.FORCE_LIVE_BROWSER_XVFB !== '1') return;
  if (spawnSync('which', ['xvfb-run'], { encoding: 'utf8' }).status !== 0) return;
  const child = spawnSync('xvfb-run', ['-a', process.execPath, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, LIVE_BROWSER_XVFB_ACTIVE: '1', DISPLAY: undefined, WAYLAND_DISPLAY: undefined }
  });
  process.exit(child.status ?? 1);
}

relaunchWithXvfbWhenNeeded();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function slug(value) {
  return String(value || 'page')
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'page';
}

function entry(name, viewport) {
  return {
    name,
    viewport,
    actions: [],
    statuses: [],
    routes: [],
    screenshots: [],
    scrollStops: [],
    consoleErrors: [],
    failedRequests: [],
    httpErrors: []
  };
}

function recordStatus(target, name, ok, state = {}) {
  target.statuses.push({ name, ok: Boolean(ok), state });
}

function observe(page, target) {
  page.on('console', (message) => {
    if (message.type() === 'error') target.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || 'request failed';
    if (failure.includes('ERR_ABORTED')) return;
    target.failedRequests.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), failure });
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (['favicon.ico', 'fonts.googleapis.com', 'fonts.gstatic.com'].some((item) => url.includes(item))) return;
    target.httpErrors.push({ url, status: response.status(), method: response.request().method(), resourceType: response.request().resourceType() });
  });
}

async function inspectViewport(page) {
  return page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const elements = Array.from(document.body?.querySelectorAll('*') || []);
    const visibleElements = elements.filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || 1) > 0.03 &&
        rect.width > 2 &&
        rect.height > 2 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < viewport.height &&
        rect.left < viewport.width;
    });
    const text = String(document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const visibleMediaCount = visibleElements.filter((element) => ['IMG', 'SVG', 'VIDEO', 'CANVAS', 'IFRAME'].includes(element.tagName)).length;
    const brokenImages = Array.from(document.images || [])
      .filter((image) => !image.complete || image.naturalWidth <= 0)
      .map((image) => image.currentSrc || image.src || '');
    const horizontalOverflowPx = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    return {
      url: location.href,
      title: document.title,
      scrollY: Math.round(window.scrollY || 0),
      viewport,
      visibleTextChars: text.length,
      visibleElementCount: visibleElements.length,
      visibleMediaCount,
      brokenImages,
      horizontalOverflowPx,
      nonblank: text.length >= 80 || visibleElements.length >= 10 || visibleMediaCount > 0,
      sample: text.slice(0, 220)
    };
  });
}

async function screenshot(page, target, name) {
  const file = path.join(artifactDir, `${name}.jpg`);
  await captureViewport(page, file);
  target.screenshots.push(file);
  return file;
}

async function captureViewport(page, file) {
  const session = await page.context().newCDPSession(page);
  const shot = await session.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 72,
    fromSurface: false,
    captureBeyondViewport: false
  });
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  await session.detach().catch(() => {});
}

async function scrollProof(page, target, label) {
  const plan = await page.evaluate(() => {
    const height = Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0);
    const viewportHeight = window.innerHeight || 800;
    const maxY = Math.max(0, height - viewportHeight);
    const anchors = Array.from(document.querySelectorAll('section, article, footer, [id]'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return Math.max(0, Math.min(maxY, Math.round(rect.top + window.scrollY)));
      });
    const allStops = [...new Set([0, Math.round(maxY * .33), Math.round(maxY * .66), maxY, ...anchors])]
      .sort((a, b) => a - b);
    if (allStops.length <= 4) return allStops;
    return Array.from({ length: 4 }, (_, index) => allStops[Math.round(index * (allStops.length - 1) / 3)]);
  });

  for (let index = 0; index < plan.length; index += 1) {
    const y = plan[index];
    await page.evaluate((nextY) => window.scrollTo({ top: nextY, behavior: 'smooth' }), y);
    await page.waitForTimeout(450);
    const metrics = await inspectViewport(page);
    const file = path.join(artifactDir, `${label}-scroll-${String(index + 1).padStart(2, '0')}-y${metrics.scrollY}.jpg`);
    await captureViewport(page, file);
    target.scrollStops.push({ label, index: index + 1, screenshot: file, ...metrics });
    assert(metrics.nonblank, `${label} blank viewport at scroll stop ${index + 1}`);
    assert(metrics.brokenImages.length === 0, `${label} broken images at scroll stop ${index + 1}: ${metrics.brokenImages.join(', ')}`);
    assert(metrics.horizontalOverflowPx <= 2, `${label} horizontal overflow ${metrics.horizontalOverflowPx}px`);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(350);
}

async function clickByText(page, target, text, label) {
  const locator = page.getByText(text, { exact: false }).first();
  await locator.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' })).catch(() => {});
  await page.waitForTimeout(250);
  const before = page.url();
  const box = await locator.boundingBox().catch(() => null);
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 80 });
  } else {
    await locator.click({ timeout: 8000, force: true });
  }
  target.actions.push(label || `clicked ${text}`);
  await page.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
  await page.waitForTimeout(350);
  target.routes.push({ action: label || `clicked ${text}`, before, after: page.url() });
}

async function clickSelector(page, target, selector, label) {
  const locator = page.locator(selector).first();
  await locator.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' })).catch(() => {});
  await page.waitForTimeout(250);
  const before = page.url();
  const box = await locator.boundingBox().catch(() => null);
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 80 });
  } else {
    await locator.evaluate((element) => element.click());
  }
  target.actions.push(label || `clicked ${selector}`);
  await page.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
  await page.waitForTimeout(350);
  target.routes.push({ action: label || `clicked ${selector}`, before, after: page.url() });
}

async function assertBodyText(page, text, label = text) {
  const needle = String(text).toLowerCase();
  let lastSample = '';
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const title = await page.title().catch(() => '');
    const body = await page.locator('body').innerText({ timeout: 2500 }).catch(() => '');
    const haystack = [title, body].join('\n').toLowerCase();
    lastSample = `${title}\n${body}`.replace(/\s+/g, ' ').trim().slice(0, 360);
    if (haystack.includes(needle)) return label;
    await page.waitForTimeout(500);
  }
  throw new Error(`Missing expected text "${text}" at ${page.url()}. Sample: ${lastSample}`);
}

async function hasBodyText(page, text) {
  const needle = String(text).toLowerCase();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const title = await page.title().catch(() => '');
    const body = await page.locator('body').innerText({ timeout: 1000 }).catch(() => '');
    if ([title, body].join('\n').toLowerCase().includes(needle)) return true;
    await page.waitForTimeout(250).catch(() => {});
  }
  return false;
}

async function clickFirstCard(page, target, text) {
  const locator = page.locator('a.dossier-index-card').filter({ hasText: text }).first();
  await locator.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' }));
  await page.waitForTimeout(250);
  const before = page.url();
  const box = await locator.boundingBox().catch(() => null);
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 80 });
  } else {
    await locator.click({ timeout: 8000, force: true });
  }
  target.actions.push(`opened ${text} dossier card`);
  await page.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
  await page.waitForTimeout(350);
  target.routes.push({ action: `opened ${text} dossier card`, before, after: page.url() });
}

async function proveViewport(browser, viewport) {
  const target = entry(`0s-dossier-${viewport.width}x${viewport.height}`, viewport);
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: viewport.width < 700,
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  observe(page, target);

  const mainUrl = `${baseUrl}/0s-dossier`;
  const response = await page.goto(mainUrl, { waitUntil: 'commit', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
  await page.waitForTimeout(700);
  recordStatus(target, 'mega dossier loaded', response?.ok(), { status: response?.status(), url: page.url() });
  await page.locator('a[href="#platform-dossier-hub"]').first().waitFor({ timeout: 15000 });
  recordStatus(target, 'mega dossier text visible', await hasBodyText(page, 'The 0S exists because business tools keep leaving the hard parts between products.'), { url: page.url() });
  await screenshot(page, target, `${target.name}-mega-initial`);

  const menuButton = page.locator('[data-menu-toggle]').first();
  if (await menuButton.isVisible().catch(() => false)) {
    await menuButton.click();
    target.actions.push('opened responsive navigation menu');
    await page.waitForTimeout(250);
    await menuButton.click();
    target.actions.push('closed responsive navigation menu');
  }

  await clickSelector(page, target, 'a[href="#platform-dossier-hub"]', 'clicked hero Open Platform Hub CTA');
  recordStatus(target, 'hub anchor visible after CTA', await page.locator('#platform-dossier-hub').isVisible().catch(() => false), { url: page.url() });
  await scrollProof(page, target, `${target.name}-mega`);

  await clickFirstCard(page, target, 'SkyeMail');
  recordStatus(target, 'SkyeMail dossier text visible', await hasBodyText(page, 'SkyeMail'), { url: page.url() });
  await screenshot(page, target, `${target.name}-skyemail`);
  await page.goBack({ waitUntil: 'commit', timeout: 12000 }).catch(() => page.goto(mainUrl, { waitUntil: 'commit', timeout: 60000 }));
  target.actions.push('returned from SkyeMail dossier to Mega Dossier');
  await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});

  await page.goto(`${baseUrl}/platform-dossiers/`, { waitUntil: 'commit', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
  await page.locator('a.dossier-index-card').first().waitFor({ timeout: 15000 });
  recordStatus(target, 'hub cards visible', await page.locator('a.dossier-index-card').count().then((value) => value >= 40).catch(() => false), { url: page.url() });
  target.actions.push('opened Platform Dossier Hub route directly');
  await screenshot(page, target, `${target.name}-hub`);
  await scrollProof(page, target, `${target.name}-hub`);

  await clickFirstCard(page, target, 'SkyePay');
  recordStatus(target, 'SkyePay dossier text visible', await hasBodyText(page, 'SkyePay'), { url: page.url() });
  target.actions.push('verified SkyePay dossier loaded');
  await page.goBack({ waitUntil: 'commit', timeout: 12000 }).catch(() => page.goto(`${baseUrl}/platform-dossiers/`, { waitUntil: 'commit', timeout: 60000 }));
  await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});

  await page.goto(`${baseUrl}/skyenet`, { waitUntil: 'commit', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
  recordStatus(target, 'SkyeNet founder story visible', await hasBodyText(page, 'ghost extension from an approved extension list'), { url: page.url() });
  recordStatus(target, 'SkyeNet fair Netlify boundary visible', await hasBodyText(page, 'I am not saying Netlify is a bad company'), { url: page.url() });
  target.actions.push('opened SkyeNet dossier and verified founder story');
  await screenshot(page, target, `${target.name}-skyenet`);
  await scrollProof(page, target, `${target.name}-skyenet`);

  await clickSelector(page, target, '.cta-row a[href$="platform-dossiers/"]', 'clicked SkyeNet All Platform Dossiers CTA');
  try {
    recordStatus(target, 'hub visible after CTA fallback', await hasBodyText(page, '0S platform hub'), { url: page.url() });
  } catch {
    await page.goto(`${baseUrl}/platform-dossiers/`, { waitUntil: 'commit', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
    target.actions.push('opened Platform Dossier Hub directly after CTA fallback');
    recordStatus(target, 'hub visible after direct fallback', await hasBodyText(page, '0S platform hub'), { url: page.url() });
  }

  recordStatus(target, 'enough human-style actions', target.actions.length >= 10, { count: target.actions.length });
  recordStatus(target, 'no console errors', target.consoleErrors.length === 0, { count: target.consoleErrors.length });
  recordStatus(target, 'no failed requests', target.failedRequests.length === 0, { count: target.failedRequests.length });
  recordStatus(target, 'no http errors', target.httpErrors.length === 0, { count: target.httpErrors.length });
  await context.close();
  return target;
}

fs.mkdirSync(artifactDir, { recursive: true });

let browser;
const report = {
  ok: false,
  mode: 'headed-live-browser',
  headless: false,
  baseUrl,
  generated_at: new Date().toISOString(),
  artifactDir,
  viewports: [
    { width: 1440, height: 980 },
    { width: 390, height: 844 }
  ],
  checks: [],
  failures: []
};

try {
  browser = await chromium.launch({
    headless: false,
    slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 70),
    args: process.platform === 'linux' ? ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-features=VizDisplayCompositor', '--ozone-platform=x11'] : []
  });
  for (const viewport of report.viewports) {
    const check = await proveViewport(browser, viewport);
    report.checks.push(check);
  }
} catch (error) {
  report.failures.push(error?.stack || error?.message || String(error));
} finally {
  if (browser) await browser.close().catch(() => {});
}

for (const check of report.checks) {
  for (const status of check.statuses) {
    if (!status.ok) report.failures.push(`${check.name}: ${status.name}`);
  }
  if (check.consoleErrors.length) report.failures.push(`${check.name}: console errors ${check.consoleErrors.join(' | ')}`);
  if (check.failedRequests.length) report.failures.push(`${check.name}: failed requests ${check.failedRequests.map((item) => item.url).join(' | ')}`);
  if (check.httpErrors.length) report.failures.push(`${check.name}: http errors ${check.httpErrors.map((item) => `${item.status} ${item.url}`).join(' | ')}`);
}

report.ok = report.failures.length === 0;
const reportPath = path.join(artifactDir, 'live-browser-verification-report.json');
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(latestPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  ok: report.ok,
  report: reportPath,
  checks: report.checks.length,
  failures: report.failures
}, null, 2));

if (!report.ok) process.exit(1);
