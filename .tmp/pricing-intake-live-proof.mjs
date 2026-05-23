import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const base = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const deployVersion = '7e1c2873-ba27-4425-909c-1b4456e9a2a2';
const startedAt = new Date();
const stamp = startedAt.toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve('test-artifacts/live-browser-verifier', `pricing-intake-live-${stamp}`);
fs.mkdirSync(outDir, { recursive: true });

function loadEnv() {
  const env = { ...process.env };
  const text = fs.readFileSync('.env', 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

const env = loadEnv();
const gateCode = [
  'SKYGATEFS13_ADMIN_PASSWORD',
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'ZERO_OS_FREE99_ADMIN_CODE',
  'ZERO_OS_OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'ADMIN_PASSWORD'
].map((key) => env[key]).find(Boolean);
if (!gateCode) throw new Error('No shared gate code found in .env.');

function canonicalUrl(text) {
  return String(text || '')
    .replace(/\.html(?=($|[?#]))/g, '')
    .replace(/\/index(?=($|[?#]))/g, '/');
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function pngMetrics(buffer) {
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    return { ok: false, reason: 'not-png', bytes: buffer.length };
  }
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idats = [];
  while (pos < buffer.length) {
    const length = buffer.readUInt32BE(pos);
    pos += 4;
    const type = buffer.subarray(pos, pos + 4).toString('ascii');
    pos += 4;
    const data = buffer.subarray(pos, pos + length);
    pos += length + 4;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idats.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 0 ? 1 : 0;
  if (bitDepth !== 8 || !width || !height || !channels || !idats.length) {
    return { ok: false, reason: 'unsupported-png', width, height, bitDepth, colorType, bytes: buffer.length };
  }
  const rowLen = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const xStep = Math.max(1, Math.floor(width / 80));
  const yStep = Math.max(1, Math.floor(height / 60));
  const unique = new Set();
  let source = 0;
  let prev = Buffer.alloc(rowLen);
  let sum = 0;
  let sumSq = 0;
  let samples = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[source++];
    const cur = Buffer.alloc(rowLen);
    for (let x = 0; x < rowLen; x += 1) {
      const left = x >= channels ? cur[x - channels] : 0;
      const up = prev[x] || 0;
      const upLeft = x >= channels ? prev[x - channels] : 0;
      const byte = raw[source++];
      let value = byte;
      if (filter === 1) value = (byte + left) & 255;
      if (filter === 2) value = (byte + up) & 255;
      if (filter === 3) value = (byte + Math.floor((left + up) / 2)) & 255;
      if (filter === 4) value = (byte + paeth(left, up, upLeft)) & 255;
      cur[x] = value;
    }
    if (y % yStep === 0) {
      for (let x = 0; x < width; x += xStep) {
        const i = x * channels;
        let r;
        let g;
        let b;
        let a = 255;
        if (colorType === 6) {
          r = cur[i]; g = cur[i + 1]; b = cur[i + 2]; a = cur[i + 3];
        } else if (colorType === 2) {
          r = cur[i]; g = cur[i + 1]; b = cur[i + 2];
        } else if (colorType === 4) {
          r = g = b = cur[i]; a = cur[i + 1];
        } else {
          r = g = b = cur[i];
        }
        if (a < 10) continue;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sum += lum;
        sumSq += lum * lum;
        samples += 1;
        unique.add(`${r >> 4}-${g >> 4}-${b >> 4}-${a >> 6}`);
      }
    }
    prev = cur;
  }
  const mean = samples ? sum / samples : 0;
  const variance = samples ? Math.max(0, sumSq / samples - mean * mean) : 0;
  return {
    ok: true,
    width,
    height,
    bytes: buffer.length,
    samples,
    uniqueColors: unique.size,
    mean: Number(mean.toFixed(2)),
    variance: Number(variance.toFixed(2))
  };
}

async function waitSettled(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => {});
  await page.locator('body').waitFor({ state: 'visible', timeout: 15000 });
}

async function visibleViewportStats(page) {
  return await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let visibleTextChars = 0;
    let visibleMedia = 0;
    let visibleLinks = 0;
    const seen = new Set();
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.bottom < 0 || rect.right < 0 || rect.top > vh || rect.left > vw) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0) continue;
      const tag = el.tagName.toLowerCase();
      if (['img', 'video', 'canvas', 'svg'].includes(tag)) visibleMedia += 1;
      if (tag === 'a') visibleLinks += 1;
      const text = (el.innerText || '').trim();
      if (text && !seen.has(text)) {
        seen.add(text);
        visibleTextChars += text.length;
      }
    }
    return {
      scrollY: Math.round(window.scrollY),
      viewport: { width: vw, height: vh },
      documentHeight: Math.round(document.documentElement.scrollHeight),
      visibleTextChars,
      visibleMedia,
      visibleLinks,
      title: document.title,
      url: location.href
    };
  });
}

async function auditScrollStops(page, routeKey, viewportName) {
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
  });
  const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const maxY = Math.max(0, docHeight - viewportHeight);
  const stops = [];
  for (const [index, fraction] of [0, 0.25, 0.5, 0.75, 1].entries()) {
    const y = Math.round(maxY * fraction);
    await page.evaluate((value) => window.scrollTo({ top: value, left: 0, behavior: 'instant' }), y);
    await page.waitForTimeout(1200);
    const screenshotPath = path.join(outDir, `${viewportName}-${routeKey}-scroll-${index}.png`);
    const shot = await page.screenshot({ path: screenshotPath, fullPage: false });
    const visual = pngMetrics(shot);
    const viewportStats = await visibleViewportStats(page);
    const blank = !visual.ok || visual.uniqueColors < 8 || visual.variance < 2 || viewportStats.visibleTextChars < 20;
    stops.push({ fraction, screenshotPath, visual, viewportStats, blank });
  }
  return stops;
}

async function clickLinkAndReturn(page, run, name, selectorOrText, expectedPath) {
  const original = page.url();
  const link = typeof selectorOrText === 'string' && selectorOrText.startsWith('css=')
    ? page.locator(selectorOrText.slice(4)).first()
    : page.getByRole('link', { name: selectorOrText }).first();
  if (await link.count() === 0) throw new Error(`${run.key}: missing link for ${name}`);
  await link.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
  const popupPromise = page.waitForEvent('popup', { timeout: 2000 }).catch(() => null);
  await link.click({ timeout: 10000 });
  const popup = await popupPromise;
  if (popup) {
    await popup.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
    const popupUrl = popup.url();
    await popup.close().catch(() => {});
    if (expectedPath && !canonicalUrl(popupUrl).includes(canonicalUrl(expectedPath))) {
      throw new Error(`${run.key}: ${name} opened ${popupUrl}, expected ${expectedPath}`);
    }
    run.actions.push(`${name}: popup ${popupUrl}`);
    return;
  }
  await waitSettled(page);
  const next = page.url();
  if (expectedPath && !canonicalUrl(next).includes(canonicalUrl(expectedPath))) {
    throw new Error(`${run.key}: ${name} landed on ${next}, expected ${expectedPath}`);
  }
  run.actions.push(`${name}: ${next}`);
  await page.goto(original, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await waitSettled(page);
}

async function fillVisibleInputs(page, run) {
  const inputs = page.locator('input:visible');
  const count = Math.min(await inputs.count(), 6);
  const values = ['Proof Co', 'Browser Operator', 'proof@example.com', '555-0100', 'production-pricing-proof', 'MetrAIyux 0S'];
  for (let i = 0; i < count; i += 1) {
    const input = inputs.nth(i);
    const type = (await input.getAttribute('type').catch(() => '') || '').toLowerCase();
    if (['hidden', 'submit', 'button', 'checkbox', 'radio', 'file'].includes(type)) continue;
    await input.fill(values[i] || `proof-${i}`, { timeout: 5000 }).catch(() => {});
  }
  if (await page.locator('textarea:visible').count()) {
    await page.locator('textarea:visible').first().fill('Live headed browser proof for pricing and intake routing.', { timeout: 5000 }).catch(() => {});
  }
  if (await page.locator('select:visible').count()) {
    await page.locator('select:visible').first().selectOption({ index: 1 }).catch(() => {});
  }
  run.actions.push(`filled ${count} visible inputs plus textarea/select where present`);
}

async function performRouteActions(page, run) {
  if (run.key === 'pricing-router') {
    const body = await page.locator('body').innerText({ timeout: 10000 });
    for (const required of ['Free99', 'SkyePay', 'Starter Command', 'Enterprise / Managed Gate']) {
      if (!body.includes(required)) throw new Error(`${run.key}: missing required pricing text ${required}`);
    }
    const skyepayLinks = await page.locator('a[href*="skyepay"]').count();
    if (skyepayLinks < 3) throw new Error(`${run.key}: expected SkyePay links, found ${skyepayLinks}`);
    run.actions.push(`verified ${skyepayLinks} SkyePay handoff links without editing SkyePay`);
    await clickLinkAndReturn(page, run, 'Start Signup', /Start Signup/i, '/saas/signup');
    await clickLinkAndReturn(page, run, 'Compare SaaS Plans', /Compare SaaS Plans/i, '/saas/pricing');
  }
  if (run.key === 'saas-hub') {
    await clickLinkAndReturn(page, run, 'Pricing Router', /Pricing Router/i, '/sales/pricing-offer-router');
    await clickLinkAndReturn(page, run, 'Free99 Hub', /Free99 Hub/i, '/Free99/index');
  }
  if (run.key === 'saas-signup') {
    await fillVisibleInputs(page, run);
    const routerLinks = await page.locator('a[href*="pricing-offer-router"]').count();
    if (!routerLinks) throw new Error(`${run.key}: missing pricing router link`);
    await clickLinkAndReturn(page, run, 'Pricing Router href', 'css=a[href*="pricing-offer-router"]', '/sales/pricing-offer-router');
  }
  if (run.key === 'free99-intake') {
    const body = await page.locator('body').innerText({ timeout: 10000 });
    for (const required of ['Free99 apps are no-charge, not ungated', 'never includes free AI/model calls', 'white-label resale']) {
      if (!body.includes(required)) throw new Error(`${run.key}: missing Free99 boundary text ${required}`);
    }
    await clickLinkAndReturn(page, run, 'Pricing boundary', /Pricing boundary/i, '/sales/pricing-offer-router');
  }
  if (run.key === 'client-intake') {
    await page.locator('#clientName').fill('Proof Client LLC');
    await page.locator('#contactName').fill('Live Browser');
    await page.locator('#email').fill('proof@example.com');
    await page.locator('#situation').fill('Testing pricing router and intake loop on production.');
    await page.getByRole('button', { name: /Save Intake/i }).click();
    await page.waitForTimeout(300);
    const saved = await page.locator('#intakeOut').innerText().catch(() => '');
    if (!saved.includes('Saved locally')) throw new Error(`${run.key}: intake save did not confirm`);
    run.actions.push('filled and saved client intake locally');
    await clickLinkAndReturn(page, run, 'Open Pricing Router', /Open Pricing Router/i, '/sales/pricing-offer-router');
  }
}

async function loginSharedGate(context, viewportName) {
  const page = await context.newPage();
  await page.goto(`${base}/admin/login.html?return=${encodeURIComponent('/sales/pricing-offer-router.html')}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('input[name="code"]').fill(gateCode);
  await page.getByRole('button', { name: /Unlock/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/admin/login'), { timeout: 20000 });
  await waitSettled(page);
  const finalUrl = page.url();
  await page.screenshot({ path: path.join(outDir, `${viewportName}-shared-gate-login-return.png`), fullPage: false });
  await page.close();
  if (!canonicalUrl(finalUrl).includes('/sales/pricing-offer-router')) {
    throw new Error(`${viewportName}: shared gate login returned to ${finalUrl}`);
  }
}

const viewports = [
  { name: 'desktop', options: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
  { name: 'mobile', options: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }
];
const routes = [
  { key: 'pricing-router', path: '/sales/pricing-offer-router.html', expect: 'Free99 opens the door' },
  { key: 'saas-hub', path: '/saas/index.html', expect: 'Customer Self-Serve Company Setup Portal' },
  { key: 'saas-signup', path: '/saas/signup.html', expect: 'Start a customer workspace' },
  { key: 'free99-intake', path: '/Free99/index.html', expect: 'Free99 apps are no-charge' },
  { key: 'client-intake', path: '/clients/intake.html', expect: 'Client Intake' }
];

const receipt = {
  ok: false,
  base,
  deployVersion,
  startedAt: startedAt.toISOString(),
  finishedAt: null,
  gateRedirects: [],
  runs: [],
  consoleErrors: [],
  failedRequests: [],
  failures: [],
  receiptPath: null
};

const browser = await chromium.launch({ headless: false });
try {
  const gateContext = await browser.newContext({ viewport: { width: 1200, height: 760 } });
  const gatePage = await gateContext.newPage();
  await gatePage.goto(`${base}/sales/pricing-offer-router.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitSettled(gatePage);
  receipt.gateRedirects.push({
    requested: `${base}/sales/pricing-offer-router.html`,
    finalUrl: gatePage.url(),
    passed: gatePage.url().includes('/admin/login') && gatePage.url().includes('return=')
  });
  await gatePage.screenshot({ path: path.join(outDir, 'unauthenticated-pricing-router-redirect.png'), fullPage: false });
  await gateContext.close();

  for (const viewport of viewports) {
    const context = await browser.newContext(viewport.options);
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') receipt.consoleErrors.push({ viewport: viewport.name, text: msg.text(), url: page.url() });
    });
    page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) receipt.failedRequests.push({ viewport: viewport.name, status, url: response.url(), pageUrl: page.url() });
    });
    page.on('requestfailed', (request) => {
      receipt.failedRequests.push({
        viewport: viewport.name,
        status: 'requestfailed',
        url: request.url(),
        pageUrl: page.url(),
        failure: request.failure()?.errorText || ''
      });
    });
    await loginSharedGate(context, viewport.name);

    for (const route of routes) {
      const run = { viewport: viewport.name, key: route.key, path: route.path, url: `${base}${route.path}`, actions: [], scrollStops: [], passed: false };
      try {
        await page.goto(run.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitSettled(page);
        if (page.url().includes('/admin/login')) throw new Error(`${route.key}: redirected to login after shared gate auth`);
        const body = await page.locator('body').innerText({ timeout: 10000 });
        if (!body.includes(route.expect)) throw new Error(`${route.key}: missing expected text ${route.expect}`);
        run.actions.push(`loaded ${page.url()} and found ${route.expect}`);
        await performRouteActions(page, run);
        await page.goto(run.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitSettled(page);
        run.scrollStops = await auditScrollStops(page, route.key, viewport.name);
        const blanks = run.scrollStops.filter((stop) => stop.blank);
        if (blanks.length) throw new Error(`${route.key}: ${viewport.name} blank/dead stops ${blanks.map((b) => b.fraction).join(', ')}`);
        run.passed = true;
      } catch (error) {
        run.error = error.message || String(error);
        receipt.failures.push({ viewport: viewport.name, route: route.key, error: run.error });
      }
      receipt.runs.push(run);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

for (const redirect of receipt.gateRedirects) {
  if (!redirect.passed) receipt.failures.push({ route: 'gate-redirect', error: `Unauthenticated route did not redirect to login: ${redirect.finalUrl}` });
}
if (receipt.consoleErrors.length) receipt.failures.push({ route: 'console', error: `${receipt.consoleErrors.length} console errors captured` });
if (receipt.failedRequests.length) receipt.failures.push({ route: 'network', error: `${receipt.failedRequests.length} failed network requests captured` });
receipt.finishedAt = new Date().toISOString();
receipt.ok = receipt.failures.length === 0 && receipt.runs.every((run) => run.passed);
receipt.receiptPath = path.join(outDir, 'live-headed-browser-pricing-intake-receipt.json');
fs.writeFileSync(receipt.receiptPath, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({
  ok: receipt.ok,
  deployVersion: receipt.deployVersion,
  receiptPath: receipt.receiptPath,
  runs: receipt.runs.length,
  screenshots: receipt.runs.reduce((sum, run) => sum + run.scrollStops.length, 0) + receipt.gateRedirects.length + viewports.length,
  consoleErrors: receipt.consoleErrors.length,
  failedRequests: receipt.failedRequests.length,
  failures: receipt.failures
}, null, 2));
if (!receipt.ok) process.exit(1);
