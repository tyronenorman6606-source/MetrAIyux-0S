import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(repoRoot, 'test-artifacts', 'live-browser-verifier');
const baseUrl = process.env.SKYE_COMMERCE_PRODUCTION_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeCommerce/';
const loginUrl = new URL('/admin/login.html', baseUrl);
loginUrl.searchParams.set('return', '/SkyeCommerce/');

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== 'linux') return;
  if (process.env.DISPLAY || process.env.LIVE_BROWSER_XVFB_ACTIVE === '1') return;
  const probe = spawnSync('which', ['xvfb-run'], { encoding: 'utf8' });
  if (probe.status !== 0) return;
  const child = spawnSync('xvfb-run', ['-a', process.execPath, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, LIVE_BROWSER_XVFB_ACTIVE: '1', WAYLAND_DISPLAY: '', XDG_SESSION_TYPE: 'x11' }
  });
  process.exit(child.status ?? 1);
}

relaunchWithXvfbWhenNeeded();

function unquote(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

function stripBearer(value = '') {
  return unquote(value).replace(/^Bearer\s+/i, '').trim();
}

function parseEnv(file) {
  if (!fsSync.existsSync(file)) return {};
  const rows = {};
  for (const raw of fsSync.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = raw.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    rows[match[1]] = unquote(match[2]);
  }
  return rows;
}

function resolveEnvValue(rows, value, seen = new Set()) {
  const text = stripBearer(value || '');
  const alias = text.match(/^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/)?.[1];
  if (!alias || seen.has(alias)) return text;
  seen.add(alias);
  return resolveEnvValue(rows, rows[alias] || '', seen);
}

function adminCodeCandidates() {
  const rows = parseEnv(path.join(repoRoot, '.env'));
  const keys = [
    'FREE99_ADMIN_CODE',
    'FREE99_ADMIN_PASSWORD',
    'FREE99_GATE_CODE',
    'FREE99_GATE_PASSWORD',
    'FREE99_OWNER_CODE',
    'FREE99_OWNER_PASSWORD',
    'FREE99_PASSWORD',
    'ZERO_OS_ADMIN_CODE',
    'ZERO_OS_GATE_CODE',
    'METRAIYUX_OWNER_ADMIN_CODE',
    'FREE99_DEMON_CODE',
    'FREE99_DEMON_KEY',
    'DEMON_ADMIN_CODE',
    'DEMON_GATE_CODE',
    'DEMON_KEY',
    'OWNER_ADMIN_CODE',
    'OWNER_ADMIN_PASSWORD',
    'ADMIN_CODE',
    'ADMIN_PASSWORD',
    'FS27_ADMIN_CODE',
    'FS27_ADMIN_PASSWORD',
    'FS27_OWNER_CODE',
    'FS27_OWNER_PASSWORD',
    'SKYGATEFS27_ADMIN_CODE',
    'SKYGATEFS27_ADMIN_PASSWORD',
    'SKYGATEFS27_OWNER_CODE',
    'SKYGATEFS27_OWNER_PASSWORD',
    'SKYGATE_ADMIN_CODE',
    'SKYGATE_ADMIN_PASSWORD',
    'SKYGATE_OWNER_CODE',
    'SKYGATE_OWNER_PASSWORD',
    'SKYE_GATE_ADMIN_CODE',
    'SKYE_GATE_ADMIN_PASSWORD',
    'SKYE_GATE_OWNER_CODE',
    'SKYE_GATE_OWNER_PASSWORD',
    'SKYGATEFS13_ADMIN_PASSWORD',
    'QA_ADMIN_PASSWORD',
    'PHC_BOOTSTRAP_ADMIN_CODE',
    'SITE_OPERATOR_ADMIN_TOKEN',
    'METRAIYUX_ADMIN_TOKEN',
    'ADMIN_TOKEN',
    'SKYGATEFS13_WORKER_ADMIN_TOKEN',
    'MCP_HTTP_BEARER_TOKEN'
  ];
  const seen = new Set();
  const merged = { ...rows };
  for (const key of keys) {
    if (process.env[key] && !merged[key]) merged[key] = process.env[key];
  }
  return keys
    .flatMap((key) => [merged[key] || '', resolveEnvValue(merged, merged[key] || '')])
    .map(stripBearer)
    .filter((value) => value && value.length >= 4)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function visibleText(page, text, timeout = 45000) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });
}

async function captureViewport(page, filePath) {
  const session = await page.context().newCDPSession(page);
  try {
    const screenshot = await Promise.race([
      session.send('Page.captureScreenshot', { format: 'png', fromSurface: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('CDP screenshot timed out')), 20000))
    ]);
    await fs.writeFile(filePath, Buffer.from(screenshot.data, 'base64'));
  } finally {
    await session.detach().catch(() => {});
  }
  return fsSync.statSync(filePath).size;
}

async function viewportMetrics(page) {
  return page.evaluate(() => {
    const visible = [...document.querySelectorAll('body *')].filter((node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return box.width > 1 && box.height > 1 && box.bottom >= 0 && box.top <= innerHeight && style.visibility !== 'hidden' && style.display !== 'none';
    });
    const text = visible.map((node) => node.innerText || node.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
    const images = [...document.images].filter((img) => {
      const box = img.getBoundingClientRect();
      return box.width > 1 && box.height > 1 && box.bottom >= 0 && box.top <= innerHeight;
    });
    return {
      url: location.href,
      scrollY: Math.round(scrollY),
      visibleTextChars: text.length,
      visibleElementCount: visible.length,
      visibleImageCount: images.length,
      brokenVisibleImages: images.filter((img) => !img.complete || img.naturalWidth < 1).map((img) => img.currentSrc || img.src).slice(0, 10),
      bodyHeight: Math.round(document.documentElement.scrollHeight)
    };
  });
}

async function scrollAndCapture(page, receipt, label) {
  const maxScroll = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
  const stops = label.includes('ae-flowpro')
    ? [...new Set([0, maxScroll])]
    : [...new Set([0, Math.round(maxScroll * 0.35), Math.round(maxScroll * 0.7), maxScroll])];
  for (let index = 0; index < stops.length; index += 1) {
    await page.mouse.wheel(0, stops[index] - await page.evaluate(() => scrollY));
    await page.waitForTimeout(350);
    const screenshotName = `skyecommerce-${label}-${index}.png`;
    const screenshotPath = path.join(outDir, screenshotName);
    const size = await captureViewport(page, screenshotPath);
    const metrics = await viewportMetrics(page);
    metrics.screenshot = screenshotPath;
    metrics.screenshotBytes = size;
    metrics.label = label;
    receipt.scrollStops.push(metrics);
    receipt.screenshots.push(screenshotPath);
    expect(metrics.visibleTextChars >= 30 || metrics.visibleElementCount >= 6 || metrics.visibleImageCount > 0, `${label} scroll stop ${index} looked visually blank`);
    expect(metrics.brokenVisibleImages.length === 0, `${label} has broken visible image(s): ${metrics.brokenVisibleImages.join(', ')}`);
  }
}

async function clickVisible(page, selector, receipt, label) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: 45000 });
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.click({ timeout: 10000 });
  receipt.actions.push(label);
  await page.waitForTimeout(500);
}

async function clickAndWaitForUrl(page, selector, urlPattern, receipt, label) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: 45000 });
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await Promise.all([
    page.waitForURL(urlPattern, { timeout: 45000 }),
    locator.click({ timeout: 10000 })
  ]);
  await page.waitForLoadState('domcontentloaded', { timeout: 45000 }).catch(() => {});
  receipt.actions.push(label);
}

async function fillIfVisible(page, selector, value, receipt, label) {
  const locator = page.locator(selector).first();
  if (!(await locator.isVisible().catch(() => false))) return false;
  await locator.fill(value, { timeout: 10000 });
  receipt.actions.push(label);
  return true;
}

async function loginThroughGate(page, receipt) {
  const codes = adminCodeCandidates();
  expect(codes.length > 0, 'No owner admin code candidates found in root env.');
  await page.goto(loginUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await visibleText(page, 'Enter your Free99 admin code');
  for (const code of codes) {
    await page.locator('input[name="code"]').fill(code);
    receipt.actions.push('typed owner gate credential into login form');
    await page.locator('#unlock-button').click({ noWaitAfter: true });
    receipt.actions.push('submitted shared 0S gate login form');
    await page.waitForTimeout(2500);
    if (page.url().includes('/SkyeCommerce')) return true;
    const status = await page.locator('#status').innerText().catch(() => '');
    if (/accepted|opening/i.test(status)) {
      await page.waitForURL(/\/SkyeCommerce/i, { timeout: 10000 }).catch(() => {});
      if (page.url().includes('/SkyeCommerce')) return true;
    }
  }
  return false;
}

await fs.mkdir(outDir, { recursive: true });

const receipt = {
  ok: false,
  mode: 'headed-live-browser',
  headless: false,
  productionUrl: baseUrl,
  loginUrl: loginUrl.toString(),
  startedAt: new Date().toISOString(),
  viewports: [],
  actions: [],
  routeStates: [],
  stateAssertions: [],
  scrollStops: [],
  screenshots: [],
  httpErrors: [],
  consoleErrors: [],
  failedRequests: [],
  failures: []
};

const browser = await chromium.launch({
  headless: false,
  slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 80),
  args: process.platform === 'linux' ? [
    '--ozone-platform=x11',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-features=VizDisplayCompositor'
  ] : []
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') receipt.consoleErrors.push({ url: page.url(), text: message.text() });
  });
  page.on('pageerror', (error) => receipt.consoleErrors.push({ url: page.url(), text: error.message }));
  page.on('requestfailed', (request) => receipt.failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || '' }));
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) receipt.httpErrors.push({ url: response.url(), status });
  });

  const loginOk = await loginThroughGate(page, receipt);
  expect(loginOk, 'Shared 0S gate login did not reach SkyeCommerce.');
  await visibleText(page, 'SkyeCommerce Foundation');
  receipt.routeStates.push({ label: 'desktop-overview', url: page.url() });
  receipt.viewports.push({ label: 'desktop', width: 1440, height: 980 });
  await scrollAndCapture(page, receipt, 'desktop-overview');

  const authState = await page.evaluate(async () => {
    const res = await fetch('/SkyeCommerce/api/auth/me', { credentials: 'include' });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  });
  expect(authState.status === 200 && authState.body?.session?.sharedGate === true, `Mounted auth session was not shared-gate backed: ${JSON.stringify(authState)}`);
  const merchantSlug = authState.body.session.merchant?.slug || authState.body.session.merchantSlug || 'metraiyux-0s-commerce';
  receipt.stateAssertions.push({ label: 'mounted auth/me sharedGate', status: authState.status, merchantSlug });

  const blockedAuthLane = await page.evaluate(async () => {
    const res = await fetch('/SkyeCommerce/api/merchant/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brandName: 'Blocked Gate Proof', slug: 'blocked-gate-proof', email: 'blocked@example.com', password: 'blocked-password' })
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  });
  expect(blockedAuthLane.status === 409 && blockedAuthLane.body?.code === 'shared_gate_owner_auth', `Mounted owner auth lane was not blocked: ${JSON.stringify(blockedAuthLane)}`);
  receipt.stateAssertions.push({ label: 'app-specific merchant registration blocked behind shared gate', status: blockedAuthLane.status, code: blockedAuthLane.body.code });

  const retiredAeApi = await page.evaluate(async () => {
    const res = await fetch('/SkyeCommerce/api/ae/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'legacy-ae-token' })
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  });
  expect(retiredAeApi.status === 410 && retiredAeApi.body?.code === 'skyecommerce_ae_lane_retired', `SkyeCommerce AE API lane was not retired: ${JSON.stringify(retiredAeApi)}`);
  receipt.stateAssertions.push({ label: 'SkyeCommerce AE API retired', status: retiredAeApi.status, code: retiredAeApi.body.code });

  await page.goto(new URL('/SkyeCommerce/ae/', baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL(/\/Marketing-Made-Easy\/AE-FlowPro\/(?:\?source=skyecommerce-retired-ae)?$/i, { timeout: 60000 });
  await visibleText(page, 'Single canonical AE FlowPro platform');
  const aeFlowRuntimeProbe = await page.evaluate(async () => {
    const res = await fetch('./api/runtime/status', { cache: 'no-store' });
    return { status: res.status };
  });
  receipt.stateAssertions.push({
    label: 'AE-FlowPro same-folder runtime probe',
    status: aeFlowRuntimeProbe.status,
    note: aeFlowRuntimeProbe.status === 404 ? 'runtime adapter not ported into the 0S Worker yet; app falls back to browser-local mode' : 'runtime endpoint responded'
  });
  receipt.actions.push('opened retired SkyeCommerce AE route and landed on canonical 0S AE-FlowPro');
  receipt.routeStates.push({ label: 'desktop-retired-skyecommerce-ae-redirect', url: page.url() });
  await scrollAndCapture(page, receipt, 'desktop-ae-flowpro-redirect');

  await page.goto(new URL('/SkyeCommerce/', baseUrl).toString(), { waitUntil: 'commit', timeout: 60000 });
  await visibleText(page, 'SkyeCommerce Foundation');
  receipt.actions.push('returned to SkyeCommerce overview after retired AE redirect proof');

  await clickAndWaitForUrl(page, 'main a.button[href="merchant/index.html"]', /\/SkyeCommerce\/merchant(?:\/|\/index\.html)/i, receipt, 'clicked overview merchant command CTA');
  await visibleText(page, 'Merchant profile');
  await fillIfVisible(page, '#register-form input[name="brandName"]', 'Shared Gate Proof', receipt, 'edited merchant registration brand field without submitting app password lane');
  await fillIfVisible(page, '#register-form input[name="slug"]', 'shared-gate-proof', receipt, 'edited merchant registration slug field without submitting app password lane');
  await fillIfVisible(page, '#register-form input[name="email"]', 'shared-gate-proof@example.com', receipt, 'edited merchant registration email field without submitting app password lane');
  receipt.routeStates.push({ label: 'desktop-merchant', url: page.url() });
  await scrollAndCapture(page, receipt, 'desktop-merchant');

  await page.goto(new URL('/SkyeCommerce/design/', baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await visibleText(page, 'Design Studio');
  receipt.actions.push('opened design studio route');
  receipt.routeStates.push({ label: 'desktop-design', url: page.url() });
  await scrollAndCapture(page, receipt, 'desktop-design');

  await page.goto(new URL(`/SkyeCommerce/store/?slug=${encodeURIComponent(merchantSlug)}`, baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await visibleText(page, 'Storefront');
  receipt.actions.push('opened mounted storefront route for shared merchant');
  receipt.routeStates.push({ label: 'desktop-storefront', url: page.url(), merchantSlug });
  await scrollAndCapture(page, receipt, 'desktop-storefront');

  await page.setViewportSize({ width: 390, height: 844 });
  receipt.viewports.push({ label: 'mobile', width: 390, height: 844 });
  await page.goto(new URL('/SkyeCommerce/', baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await visibleText(page, 'SkyeCommerce Foundation');
  receipt.actions.push('opened overview on mobile viewport');
  receipt.routeStates.push({ label: 'mobile-overview', url: page.url() });
  await scrollAndCapture(page, receipt, 'mobile-overview');

  await page.goto(new URL('/SkyeCommerce/merchant/', baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await visibleText(page, 'Merchant Command');
  receipt.actions.push('opened merchant command on mobile viewport');
  receipt.routeStates.push({ label: 'mobile-merchant', url: page.url() });
  await scrollAndCapture(page, receipt, 'mobile-merchant');

  const materialFailures = receipt.failedRequests.filter((item) => !/favicon|analytics|cdn-cgi/.test(item.url));
  const materialHttpErrors = receipt.httpErrors.filter((item) => {
    if (item.status === 409 && /\/SkyeCommerce\/api\/merchant\/register/.test(item.url)) return false;
    if (item.status === 410 && /\/SkyeCommerce\/api\/ae\/login/.test(item.url)) return false;
    if (item.status === 404 && /\/Marketing-Made-Easy\/AE-FlowPro\/api\/runtime\/status/.test(item.url)) return false;
    return true;
  });
  const runtime404WasInspected = receipt.httpErrors.some((item) => item.status === 404 && /\/Marketing-Made-Easy\/AE-FlowPro\/api\/runtime\/status/.test(item.url));
  const materialConsoleErrors = receipt.consoleErrors.filter((item) => {
    const text = item.text || '';
    if (/status of 409/i.test(text)) return false;
    if (/status of 410/i.test(text)) return false;
    if (/status of 404/i.test(text) && runtime404WasInspected) return false;
    return true;
  });
  expect(materialFailures.length === 0, `Material network failures: ${JSON.stringify(materialFailures)}`);
  expect(materialHttpErrors.length === 0, `Material HTTP errors: ${JSON.stringify(materialHttpErrors)}`);
  expect(materialConsoleErrors.length === 0, `Console errors: ${JSON.stringify(materialConsoleErrors)}`);
  receipt.ok = true;
} catch (error) {
  receipt.failures.push(error.message || String(error));
  throw error;
} finally {
  receipt.finishedAt = new Date().toISOString();
  const receiptPath = path.join(outDir, `skyecommerce-production-live-browser-${Date.now()}.json`);
  receipt.receiptPath = receiptPath;
  await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2));
  await fs.writeFile(path.join(outDir, 'skyecommerce-production-live-browser-latest.json'), JSON.stringify(receipt, null, 2));
  await browser.close();
  console.log(JSON.stringify({ ok: receipt.ok, receiptPath, actions: receipt.actions.length, scrollStops: receipt.scrollStops.length, failures: receipt.failures }, null, 2));
}
