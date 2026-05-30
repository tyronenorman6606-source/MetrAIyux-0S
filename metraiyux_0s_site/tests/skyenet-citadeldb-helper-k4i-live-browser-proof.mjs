#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const zeroOsBase = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const marketingBase = (process.env.MARKETING_PROOF_BASE_URL || 'https://metraiyux-0s-marketing.pages.dev').replace(/\/+$/, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(repoRoot, 'test-artifacts', 'live-browser-verifier', `${stamp}-skyenet-citadeldb-helper-k4i`);
const receiptPath = path.join(outDir, 'live-browser-verification-report.json');

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== 'linux') return;
  if (process.env.DISPLAY || process.env.LIVE_BROWSER_XVFB_ACTIVE === '1') return;
  const probe = spawnSync('which', ['xvfb-run'], { encoding: 'utf8' });
  if (probe.status !== 0) return;
  const child = spawnSync('xvfb-run', ['-a', process.execPath, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, LIVE_BROWSER_XVFB_ACTIVE: '1' }
  });
  process.exit(child.status ?? 1);
}

relaunchWithXvfbWhenNeeded();

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
    if (match) out[match[1]] = unquote(match[2]);
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

async function findWorkingCredential() {
  const env = envValues();
  const candidates = credentialKeys
    .map((key) => ({ key, value: resolveAlias(env[key], env) }))
    .filter((item, index, list) => item.value && list.findIndex((other) => other.value === item.value) === index);

  const failures = [];
  for (const candidate of candidates) {
    const response = await fetch(`${zeroOsBase}/api/owner/admin-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: candidate.value })
    }).catch((error) => ({ ok: false, status: 0, error }));
    const data = response.json ? await response.json().catch(() => ({})) : {};
    const token = cleanToken(data.gateToken || data.gateBearerToken || data.token || data.session_token || data.sessionToken);
    if (response.ok && token) return { key: candidate.key, token, hash: sha12(candidate.value) };
    failures.push({ key: candidate.key, hash: sha12(candidate.value), status: response.status || 0 });
  }
  throw new Error(`No 0S owner-admin credential unlocked production. Tried: ${JSON.stringify(failures)}`);
}

function slug(value) {
  return String(value || 'proof')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'proof';
}

async function clickFirst(page, selectors, actions, label) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (!(await locator.isVisible().catch(() => false))) continue;
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ timeout: 5000 }).catch(() => null);
    actions.push(label);
    if (!page.isClosed()) await page.waitForTimeout(400);
    return true;
  }
  return false;
}

async function fillFirst(page, selectors, value, actions, label) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (!(await locator.isVisible().catch(() => false))) continue;
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.fill(value, { timeout: 5000 }).catch(() => null);
    actions.push(label);
    await page.waitForTimeout(250);
    return true;
  }
  return false;
}

async function scrollProof(page, target, viewport, artifactDir) {
  const height = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)).catch(() => viewport.height);
  const stops = [...new Set([0, Math.floor(height * 0.25), Math.floor(height * 0.5), Math.floor(height * 0.75), Math.max(0, height - viewport.height)])];
  const out = [];
  for (let index = 0; index < stops.length; index += 1) {
    const y = stops[index];
    await page.evaluate((nextY) => window.scrollTo(0, nextY), y).catch(() => {});
    await page.waitForTimeout(450);
    const screenshot = path.join(artifactDir, `${slug(target.id)}-${viewport.width}x${viewport.height}-scroll-${index}.png`);
    await page.screenshot({ path: screenshot });
    const metrics = await page.evaluate(() => ({
      textChars: document.body.innerText.length,
      visibleElements: [...document.querySelectorAll('body *')].filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      }).length,
      imageCount: document.images.length,
      links: document.querySelectorAll('a[href]').length
    }));
    out.push({
      y,
      screenshot: path.relative(repoRoot, screenshot),
      screenshotBytes: fs.statSync(screenshot).size,
      nonblank: metrics.textChars > 80 && metrics.visibleElements > 5,
      metrics
    });
  }
  return out;
}

async function verifyTarget(target, viewport, token) {
  const artifactDir = path.join(outDir, `${slug(target.id)}-${viewport.width}x${viewport.height}`);
  fs.mkdirSync(artifactDir, { recursive: true });
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--ozone-platform=x11',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 700,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: target.gated ? {
      authorization: `Bearer ${token}`,
      'x-skye-gate-session': token,
      'x-free99-gate-session': token
    } : {}
  });
  if (target.gated) {
    await context.addInitScript((sessionToken) => {
      localStorage.setItem('metraiyux_0s_gate_session', sessionToken);
      localStorage.setItem('skye_gate_session', sessionToken);
      sessionStorage.setItem('metraiyux_0s_gate_session', sessionToken);
    }, token);
  }
  const fulfilledUrls = [];
  await context.route('**/*', async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const productionHost = /(?:pages\.dev|workers\.dev)$/i.test(requestUrl.hostname);
    if (!productionHost) return route.continue().catch(() => null);
    try {
      const headers = { ...request.headers() };
      if (target.gated) {
        headers.authorization = `Bearer ${token}`;
        headers['x-skye-gate-session'] = token;
        headers['x-free99-gate-session'] = token;
      }
      const method = request.method();
      const response = await fetch(request.url(), {
        method,
        headers,
        body: ['GET', 'HEAD'].includes(method) ? undefined : request.postDataBuffer()
      });
      const body = Buffer.from(await response.arrayBuffer());
      const responseHeaders = {};
      for (const [key, value] of response.headers.entries()) responseHeaders[key] = value;
      fulfilledUrls.push({ url: request.url(), status: response.status });
      return route.fulfill({
        status: response.status,
        headers: responseHeaders,
        body
      });
    } catch (error) {
      return route.abort('failed').catch(() => null);
    }
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || 'request failed'
    });
  });

  const actions = [];
  const response = await page.goto(target.url, { waitUntil: 'commit', timeout: 45000 });
  await page.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(900);
  const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const missing = target.expect.filter((value) => !bodyText.includes(value));

  if (target.id === 'marketing-skynet') {
    await clickFirst(page, ['a[href="proof.html"]', 'nav a[href="capabilities.html"]', 'nav a[href="index.html"]'], actions, 'clicked public SkyeNet internal navigation');
    if (!page.isClosed() && !page.url().includes('/skyenet')) {
      await page.goto(target.url, { waitUntil: 'commit', timeout: 45000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(() => {});
      actions.push('returned to SkyeNet page after CTA/navigation');
    }
    if (page.isClosed()) throw new Error('Public SkyeNet page closed during navigation action.');
  } else if (target.id === 'gated-skynet-console') {
    await clickFirst(page, ['#refreshButton', 'button:has-text("Refresh")'], actions, 'clicked SkyeNet refresh');
    await fillFirst(page, ['#projectId'], `proof-${Date.now()}`, actions, 'edited SkyeNet project id');
    await fillFirst(page, ['#mountPath'], '/skyenet/browser-proof', actions, 'edited SkyeNet mount path');
  } else if (target.id === 'gated-citadeldb') {
    await clickFirst(page, ['#refreshBtn', 'button:has-text("Refresh Status")'], actions, 'clicked CitadelDB refresh');
    await fillFirst(page, ['#exportClientId'], 'empire-pallets', actions, 'edited Citadel export client id');
  }

  const scrollStops = await scrollProof(page, target, viewport, artifactDir);
  const fullScreenshot = path.join(artifactDir, `${slug(target.id)}-${viewport.width}x${viewport.height}-full.png`);
  await page.screenshot({ path: fullScreenshot, fullPage: true });
  const finalUrl = page.url();
  await context.close().catch(() => {});
  await browser.close().catch(() => {});

  return {
    target: target.id,
    url: target.url,
    finalUrl,
    viewport,
    status: response?.status() || 0,
    okStatus: Boolean(response?.ok()),
    expectedText: target.expect,
    missingText: missing,
    actions,
    scrollStops,
    fullScreenshot: path.relative(repoRoot, fullScreenshot),
    consoleErrors,
    failedRequests: failedRequests.filter((item) => !/favicon\.ico/i.test(item.url)).slice(0, 20),
    productionNetworkMode: 'playwright-route-fulfilled-by-node-fetch',
    fulfilledProductionRequests: fulfilledUrls.slice(0, 40),
    passed: Boolean(response?.ok()) && missing.length === 0 && scrollStops.every((stop) => stop.nonblank)
  };
}

fs.mkdirSync(outDir, { recursive: true });
const credential = await findWorkingCredential();
const targets = [
  {
    id: 'marketing-skynet',
    url: `${marketingBase}/skyenet.html`,
    expect: ['SkyeNet.', 'Users can drop a build', 'SkyeNet URLs'],
    gated: false
  },
  {
    id: 'gated-skynet-console',
    url: `${zeroOsBase}/skyenet/index.html`,
    expect: ['SkyeNet Deploy', 'Build Drop', 'Mounted Drops'],
    gated: true
  },
  {
    id: 'gated-citadeldb',
    url: `${zeroOsBase}/citadeldb/`,
    expect: ['CitadelDB Operations', 'Developer Access', 'Helper K4i status'],
    gated: true
  }
];
const viewports = [
  { width: 1440, height: 980 },
  { width: 390, height: 844 }
];

const results = [];
for (const target of targets) {
  for (const viewport of viewports) {
    results.push(await verifyTarget(target, viewport, credential.token));
  }
}

const receipt = {
  ok: results.every((result) => result.passed),
  generated_at: new Date().toISOString(),
  proof_type: 'headed-live-browser',
  credential: { key: credential.key, hash: credential.hash },
  targets: results,
  summary: {
    targetCount: targets.length,
    viewportCount: viewports.length,
    failures: results.filter((result) => !result.passed).map((result) => ({
      target: result.target,
      viewport: result.viewport,
      status: result.status,
      missingText: result.missingText,
      failedRequests: result.failedRequests.length,
      consoleErrors: result.consoleErrors.length
    }))
  }
};
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({
  ok: receipt.ok,
  receipt: path.relative(repoRoot, receiptPath),
  targets: results.length,
  failures: receipt.summary.failures
}, null, 2));
process.exit(receipt.ok ? 0 : 1);
