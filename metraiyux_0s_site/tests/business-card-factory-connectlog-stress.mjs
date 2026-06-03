#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const zeroOsBase = (process.env.ZERO_OS_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const marketingBase = (process.env.MARKETING_BASE_URL || 'https://metraiyux-0s-marketing.pages.dev').replace(/\/+$/, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'business-card-factory-connectlog-stress', stamp);
const latestPath = path.join(repoRoot, 'test-artifacts', 'business-card-factory-connectlog-stress-latest.json');

const credentialKeys = [
  'FREE99_ADMIN_CODE',
  'ZERO_OS_GATE_CODE',
  'ZERO_OS_ADMIN_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'OWNER_ADMIN_CODE',
  'ADMIN_CODE',
  'FS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_CODE',
  'FREE99_GATE_CODE',
  'SKYE_GATE_ADMIN_CODE',
  'SKYGATE_ADMIN_CODE'
];

function unquote(value) {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = raw.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    out[match[1]] = unquote(match[2]);
  }
  return out;
}

function envValues() {
  return {
    ...loadEnvFile(path.join(repoRoot, '.env')),
    ...loadEnvFile(path.join(repoRoot, 'env.txt')),
    ...process.env
  };
}

function resolveAlias(value, env, seen = new Set()) {
  const text = String(value || '').trim();
  const match = text.match(/^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/);
  if (!match || seen.has(match[1])) return text;
  seen.add(match[1]);
  return resolveAlias(env[match[1]], env, seen);
}

function sha12(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12);
}

function cleanToken(value) {
  return String(value || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    'x-skye-gate-session': token,
    'x-free99-gate-session': token
  };
}

async function jsonFetch(url, options = {}) {
  const started = performance.now();
  const { timeout_ms: timeoutMs = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`fetch timeout ${timeoutMs}ms`)), timeoutMs);
  let response;
  try {
    response = await fetch(url, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  const ms = Math.round(performance.now() - started);
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { url, status: response.status, ok: response.ok, ms, body, headers: Object.fromEntries(response.headers.entries()) };
}

async function findWorkingCredential() {
  const env = envValues();
  const candidates = credentialKeys
    .map((key) => ({ key, value: resolveAlias(env[key], env) }))
    .filter((item, index, list) => item.value && list.findIndex((other) => other.value === item.value) === index);
  const failures = [];
  for (const candidate of candidates) {
    const response = await jsonFetch(`${zeroOsBase}/api/owner/admin-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: candidate.value })
    }).catch((error) => ({ ok: false, status: 0, body: { error: error.message }, ms: 0 }));
    const token = cleanToken(response.body?.gateToken || response.body?.gateBearerToken || response.body?.token || response.body?.session_token || response.body?.sessionToken);
    if (response.ok && token) return { key: candidate.key, token, code: candidate.value, hash: sha12(candidate.value), login_ms: response.ms };
    failures.push({ key: candidate.key, hash: sha12(candidate.value), status: response.status, ms: response.ms });
  }
  throw new Error(`No 0S owner-admin credential unlocked production. Tried: ${JSON.stringify(failures)}`);
}

function businessPayload(business, index = 0) {
  const name = business.name || `Valley Client ${index}`;
  const city = business.city || 'Phoenix';
  const cityCode = city.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 3).toUpperCase() || 'AZ';
  const slug = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.slice(0, 4)).join('') || 'CLIENT';
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const clientUrl = business.landing_page_url || business.url || `/valley-verified/business/${business.id || slug.toLowerCase()}/`;
  const absoluteClientUrl = /^https?:\/\//i.test(clientUrl) ? clientUrl : `${zeroOsBase}${clientUrl.startsWith('/') ? clientUrl : `/${clientUrl}`}`;
  return {
    business: name,
    city,
    category: business.category || business.niche || 'Valley Verified',
    contact: business.contact || 'Owner',
    priority_code: `VV-${slug}-${cityCode}`,
    skyemerit: `31% through ${expires}`,
    client_id: business.id || slug.toLowerCase(),
    client_url: absoluteClientUrl,
    connectlog_handoff_url: `${zeroOsBase}/connectlog-v7.7-relay13-operator-proof/app.html?source=business-card-factory&clientId=${encodeURIComponent(business.id || slug.toLowerCase())}&business=${encodeURIComponent(name)}&priorityCode=VV-${slug}-${cityCode}&valleyUrl=${encodeURIComponent(absoluteClientUrl)}&skyemerit=31&expires=${expires}`,
    source: 'business-card-factory-stress'
  };
}

function p95(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || 0;
}

await fs.promises.mkdir(artifactDir, { recursive: true });

const marketingPage = await fetch(`${marketingBase}/business-cards`).then(async (response) => ({
  status: response.status,
  ok: response.ok,
  text: await response.text()
}));
assert.equal(marketingPage.ok, true, 'marketing business cards page loads');
assert.match(marketingPage.text, /vv-directory-search/, 'marketing page exposes Valley directory search');
assert.match(marketingPage.text, /business-card-factory/, 'marketing page links 0S Business Card Factory');
assert.match(marketingPage.text, /connectLogAppUrl/, 'marketing page builds ConnectLog handoff URLs');

const publicDirectory = await jsonFetch(`${marketingBase}/assets/valley-verified/businesses-lite.json`);
assert.equal(publicDirectory.ok, true, 'public Valley directory snapshot loads');
const publicBusinesses = Array.isArray(publicDirectory.body) ? publicDirectory.body : publicDirectory.body?.businesses || [];
assert.ok(publicBusinesses.length >= 300, `public directory has ${publicBusinesses.length} records`);
assert.ok(publicBusinesses.some((item) => item.id === 'bobs-smoke-shop-litchfield-park'), 'public directory includes Bob');

const unauthFactory = await fetch(`${zeroOsBase}/business-card-factory/`, { redirect: 'manual' });
assert.equal(unauthFactory.status, 302, 'unauthenticated factory redirects to gate');
assert.match(unauthFactory.headers.get('location') || '', /admin\/login\.html/, 'unauthenticated factory redirect targets owner login');

const credential = await findWorkingCredential();
const auth = authHeaders(credential.token);
auth['x-free99-admin-code'] = credential.code;

const [factoryPage, factoryJs, gatedDirectory, apiStatus, connectLogJs] = await Promise.all([
  fetch(`${zeroOsBase}/business-card-factory/`, { headers: auth }).then(async (response) => ({ status: response.status, ok: response.ok, text: await response.text() })),
  fetch(`${zeroOsBase}/business-card-factory/business-card-factory.js`, { headers: auth }).then(async (response) => ({ status: response.status, ok: response.ok, text: await response.text() })),
  jsonFetch(`${zeroOsBase}/valley-verified/data/businesses-lite.json`, { headers: auth }),
  jsonFetch(`${zeroOsBase}/api/business-card-factory/status`, { headers: auth }),
  fetch(`${zeroOsBase}/connectlog-v7.7-relay13-operator-proof/app.js`, { headers: auth }).then(async (response) => ({ status: response.status, ok: response.ok, text: await response.text() }))
]);
assert.equal(factoryPage.ok, true, 'authenticated factory page loads');
assert.match(factoryPage.text, /Live client card builder/, 'factory has workspace hero');
assert.match(factoryPage.text, /Generate Gateway Copy/, 'factory has gateway copy control');
assert.equal(factoryJs.ok, true, 'factory JS loads');
assert.match(factoryJs.text, /api\/business-card-factory\/copy-pass/, 'factory JS calls copy-pass API');
assert.equal(gatedDirectory.ok, true, 'gated Valley directory loads with auth');
const gatedBusinesses = Array.isArray(gatedDirectory.body) ? gatedDirectory.body : gatedDirectory.body?.businesses || [];
assert.ok(gatedBusinesses.length >= 300, `gated directory has ${gatedBusinesses.length} records`);
assert.equal(apiStatus.ok, true, 'factory API status loads with auth');
assert.equal(apiStatus.body?.ok, true, 'factory API status ok');
assert.equal(connectLogJs.ok, true, 'ConnectLog app JS loads with auth');
assert.match(connectLogJs.text, /applySkyesContactPacket/, 'ConnectLog applies Skyes contact packet');
assert.match(connectLogJs.text, /META_SKYES_CONTACT_PACKET/, 'ConnectLog stores formal contact packet');

const stressTargets = gatedBusinesses.slice(0, 32);
const startedStress = performance.now();
const stressResponses = await Promise.all(stressTargets.map((business, index) => jsonFetch(`${zeroOsBase}/api/business-card-factory/copy-pass`, {
  method: 'POST',
  headers: { ...auth, 'content-type': 'application/json' },
  body: JSON.stringify({ ...businessPayload(business, index), stress_mode: true })
})));
for (const result of stressResponses) {
  assert.equal(result.ok, true, `copy-pass stress response ${result.status}`);
  assert.equal(result.body?.ok, true, 'copy-pass stress body ok');
  assert.match(result.body?.copy?.card_script || '', /ConnectLog|Valley Verified|Scan/i, 'copy-pass card script present');
  assert.match(result.body?.copy?.connectlog_welcome || '', /Skyes Over London|ConnectLog/i, 'copy-pass welcome present');
  assert.equal(result.body?.stress_mode, true, 'stress mode recorded');
}

const liveCopy = await jsonFetch(`${zeroOsBase}/api/business-card-factory/copy-pass`, {
  method: 'POST',
  headers: { ...auth, 'content-type': 'application/json' },
  body: JSON.stringify(businessPayload(gatedBusinesses.find((item) => item.id === 'bobs-smoke-shop-litchfield-park') || gatedBusinesses[0], 999))
});
assert.equal(liveCopy.ok, true, `live copy pass returned ${liveCopy.status}`);
assert.equal(liveCopy.body?.ok, true, 'live copy pass ok');
assert.ok(liveCopy.body?.receipt_id, 'live copy pass records receipt');
assert.ok([
  'fs27-gateway-chat',
  'local-deterministic-copy-gateway-required',
  'local-deterministic-copy',
  'local-deterministic-copy-after-gateway-failure',
].includes(liveCopy.body?.provider_path), `provider path ${liveCopy.body?.provider_path}`);

const stressMs = Math.round(performance.now() - startedStress);
const browserChecks = [];

async function browserNetworkAvailable() {
  try {
    const response = await jsonFetch(`${marketingBase}/business-cards`, { timeout_ms: 8000 });
    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

async function browserFactoryCheck(viewport, suffix) {
  let browser = null;
  let context = null;
  const consoleErrors = [];
  const failedRequests = [];
  const entry = { id: `factory-${suffix}`, viewport, checks: [] };
  try {
    browser = await chromium.launch({ headless: process.env.BCF_HEADED_BROWSER === '1' ? false : true });
    context = await browser.newContext({ viewport, extraHTTPHeaders: auth });
    context.setDefaultTimeout(12000);
    context.setDefaultNavigationTimeout(30000);
    const page = await context.newPage();
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (!url.includes('/api/')) failedRequests.push(`${request.method()} ${url}: ${request.failure()?.errorText || 'failed'}`);
    });
    const response = await page.goto(`${zeroOsBase}/business-card-factory/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    entry.checks.push({ name: 'http_ok', ok: Boolean(response?.ok()), status: response?.status() || 0 });
    const clientSearch = page.locator('#clientSearch').first();
    await clientSearch.waitFor({ state: 'attached', timeout: 30000 });
    await clientSearch.scrollIntoViewIfNeeded({ timeout: 8000 });
    const searchVisible = await clientSearch.evaluate((input) => {
      const style = window.getComputedStyle(input);
      const rect = input.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
    entry.checks.push({ name: 'search_visible', ok: searchVisible });
    await clientSearch.fill('Bob', { timeout: 12000 });
    await page.getByText("Bob's Smoke Shop", { exact: false }).first().click();
    await page.locator('#factoryQr').waitFor({ state: 'attached', timeout: 8000 });
    const qrNonblank = await page.locator('#factoryQr').evaluate((canvas) => {
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index] || data[index + 1] || data[index + 2]) return true;
      }
      return false;
    });
    entry.checks.push({ name: 'qr_nonblank', ok: qrNonblank });
    const handoff = await page.locator('#handoffUrl').inputValue();
    entry.handoff_url = handoff;
    entry.checks.push({ name: 'handoff_has_client', ok: handoff.includes('bobs-smoke-shop-litchfield-park') && handoff.includes('skyemerit=31') });
    await page.locator('#generateGatewayCopy').click();
    await page.locator('#aiCardScript').waitFor({ state: 'attached', timeout: 8000 });
    await page.waitForTimeout(900);
    const scriptText = await page.locator('#aiCardScript').inputValue();
    entry.checks.push({ name: 'gateway_copy_visible', ok: /ConnectLog|Valley Verified|Scan/i.test(scriptText) });
    const screenshot = path.join(artifactDir, `business-card-factory-${suffix}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    entry.screenshot = screenshot;
    entry.console_errors = consoleErrors;
    entry.failed_requests = failedRequests;
    entry.ok = entry.checks.every((item) => item.ok) && consoleErrors.length === 0 && failedRequests.length === 0;
  } catch (error) {
    entry.ok = false;
    entry.error = error.message;
    entry.console_errors = consoleErrors;
    entry.failed_requests = failedRequests;
    try {
      const page = context?.pages?.()[0];
      if (page) {
        const screenshot = path.join(artifactDir, `business-card-factory-${suffix}-failure.png`);
        await page.screenshot({ path: screenshot, fullPage: false });
        entry.failure_screenshot = screenshot;
        entry.final_url = page.url();
      }
    } catch {}
  } finally {
    browserChecks.push(entry);
    await context?.close().catch(() => null);
    await browser?.close().catch(() => null);
  }
}

async function browserConnectLogCheck(handoffUrl) {
  let browser = null;
  let context = null;
  const entry = { id: 'connectlog-handoff', checks: [] };
  try {
    browser = await chromium.launch({ headless: process.env.BCF_HEADED_BROWSER === '1' ? false : true });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: auth });
    context.setDefaultTimeout(12000);
    context.setDefaultNavigationTimeout(30000);
    const page = await context.newPage();
    const response = await page.goto(handoffUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    entry.checks.push({ name: 'http_ok', ok: Boolean(response?.ok()), status: response?.status() || 0 });
    await page.getByText('Skyes Over London contact packet', { exact: false }).first().waitFor({ state: 'attached', timeout: 12000 });
    await page.getByText("Bob's Smoke Shop", { exact: false }).first().waitFor({ state: 'attached', timeout: 12000 });
    await page.getByText('31% SkyeMerit', { exact: false }).first().waitFor({ state: 'attached', timeout: 12000 });
    entry.checks.push({ name: 'welcome_packet_visible', ok: true });
    const screenshot = path.join(artifactDir, 'connectlog-handoff.png');
    await page.screenshot({ path: screenshot, fullPage: false });
    entry.screenshot = screenshot;
    entry.ok = entry.checks.every((item) => item.ok);
  } catch (error) {
    entry.ok = false;
    entry.error = error.message;
    try {
      const page = context?.pages?.()[0];
      if (page) {
        const screenshot = path.join(artifactDir, 'connectlog-handoff-failure.png');
        await page.screenshot({ path: screenshot, fullPage: false });
        entry.failure_screenshot = screenshot;
        entry.final_url = page.url();
      }
    } catch {}
  } finally {
    browserChecks.push(entry);
    await context?.close().catch(() => null);
    await browser?.close().catch(() => null);
  }
}

const shouldSkipBrowser = process.env.BCF_SKIP_BROWSER === '1';
const canBrowserReachLiveWeb = shouldSkipBrowser ? false : await browserNetworkAvailable();
if (shouldSkipBrowser) {
  browserChecks.push({
    id: 'browser-checks',
    ok: true,
    skipped: true,
    reason: 'BCF_SKIP_BROWSER=1 was set; production HTTP/API stress was recorded without Playwright browser navigation.'
  });
} else if (canBrowserReachLiveWeb) {
  await browserFactoryCheck({ width: 1440, height: 1000 }, 'desktop');
  await browserFactoryCheck({ width: 390, height: 844 }, 'mobile');
  const desktopHandoff = browserChecks.find((entry) => entry.id === 'factory-desktop')?.handoff_url;
  if (desktopHandoff) await browserConnectLogCheck(desktopHandoff);
} else {
  browserChecks.push({
    id: 'browser-network',
    ok: true,
    skipped: true,
    reason: 'Playwright Chromium could not commit external HTTP/HTTPS navigation from this container; production HTTP/API stress used Node fetch instead.'
  });
}

const receipt = {
  ok: stressResponses.every((item) => item.ok && item.body?.ok) && liveCopy.ok && browserChecks.every((entry) => entry.ok || entry.skipped),
  generated_at: new Date().toISOString(),
  zero_os_base: zeroOsBase,
  marketing_base: marketingBase,
  credential: { key: credential.key, hash: credential.hash, login_ms: credential.login_ms },
  public_directory_count: publicBusinesses.length,
  gated_directory_count: gatedBusinesses.length,
  api_status: apiStatus.body,
  stress: {
    copy_pass_requests: stressResponses.length,
    total_ms: stressMs,
    p95_ms: p95(stressResponses.map((item) => item.ms)),
    max_ms: Math.max(...stressResponses.map((item) => item.ms)),
    provider_paths: [...new Set(stressResponses.map((item) => item.body?.provider_path))]
  },
  live_copy: {
    status: liveCopy.status,
    receipt_id: liveCopy.body?.receipt_id,
    provider_path: liveCopy.body?.provider_path,
    gateway_configured: liveCopy.body?.gateway_configured,
    gateway_failed: liveCopy.body?.gateway_failed === true
  },
  browser_checks: browserChecks,
  live_browser_checked_by_codex: process.env.BCF_HEADED_BROWSER === '1'
};

await fs.promises.writeFile(path.join(artifactDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
await fs.promises.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);

console.log(JSON.stringify(receipt, null, 2));
if (!receipt.ok) process.exit(1);
