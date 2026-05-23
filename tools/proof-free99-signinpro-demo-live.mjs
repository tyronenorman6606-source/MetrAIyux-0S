#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const repoRoot = '/workspaces/MetrAIyux-0S';
const artifactDir = path.join(repoRoot, 'test-artifacts/free99-signinpro-closure');
const previousProofPath = path.join(artifactDir, 'production-demo-code-proof.json');
const reportPath = path.join(artifactDir, 'live-headed-browser-proof.json');
const origin = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const demoUrl = `${origin}/Free99/demo.html?return=/northstar/index.html`;

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function codePreview(value) {
  const text = String(value || '');
  if (!text) return '';
  return text.length <= 8 ? `${text.slice(0, 2)}...${text.slice(-2)}` : `${text.slice(0, 4)}...${text.slice(-4)}`;
}

function visibleTextSample(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

async function ownerLogin() {
  const env = parseEnvFile(path.join(repoRoot, '.env'));
  const candidates = [
    env.FREE99_ADMIN_CODE,
    env.FREE99_GATE_CODE,
    env.OWNER_ADMIN_CODE,
    env.ADMIN_PASSWORD,
    env.SKYGATEFS13_ADMIN_PASSWORD
  ].filter(Boolean);
  for (const credential of candidates) {
    const response = await fetch(`${origin}/api/owner/admin-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: credential })
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.token) return String(data.token);
  }
  throw new Error('Could not obtain owner token from local .env credential candidates.');
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText || '';
    const rects = [...document.querySelectorAll('body *')]
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 1 && rect.height > 1);
    const visibleElements = rects.filter((rect) => rect.bottom >= 0 && rect.right >= 0 && rect.top <= innerHeight && rect.left <= innerWidth).length;
    const media = [...document.querySelectorAll('img,video,canvas,svg')].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        visible: rect.width > 1 && rect.height > 1 && rect.bottom >= 0 && rect.right >= 0 && rect.top <= innerHeight && rect.left <= innerWidth,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        complete: element.tagName === 'IMG' ? element.complete && element.naturalWidth > 0 : true
      };
    });
    return {
      url: location.href,
      title: document.title,
      textChars: text.trim().length,
      visibleElements,
      sample: text.replace(/\s+/g, ' ').trim().slice(0, 240),
      media
    };
  });
}

async function screenshotStop(page, label, viewportName, index) {
  const metrics = await pageMetrics(page);
  const screenshot = path.join(artifactDir, `${viewportName}-${String(index).padStart(2, '0')}-${label}.png`);
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.screenshot({ path: screenshot, fullPage: false, animations: 'disabled', timeout: 20000 });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(750);
    }
  }
  if (lastError) {
    await page.locator('body').screenshot({ path: screenshot, animations: 'disabled', timeout: 20000 });
  }
  const stat = fs.statSync(screenshot);
  return {
    label,
    screenshot,
    screenshotBytes: stat.size,
    nonblank: stat.size > 6000 && metrics.textChars > 0 && metrics.visibleElements > 0,
    metrics
  };
}

async function runDemoViewport(browser, viewportName, contextOptions, demoCode) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push({ text: message.text(), location: message.location() });
  });
  page.on('pageerror', (error) => consoleErrors.push({ text: error.message, location: null }));
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || '' }));
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
  });

  const stops = [];
  const actions = [];
  await page.goto(demoUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(900);
  stops.push(await screenshotStop(page, 'demo-top', viewportName, 1));
  await page.mouse.move(80, 140, { steps: 10 });
  actions.push('moved mouse through demo page');
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(300);
  stops.push(await screenshotStop(page, 'demo-scrolled', viewportName, 2));
  await page.mouse.wheel(0, -420);
  await page.waitForTimeout(300);

  const unique = Date.now().toString(36);
  await page.locator('input[name="business_name"]').fill(`0S Live Closure ${viewportName} ${unique}`);
  actions.push('typed business name');
  await page.locator('input[name="name"]').fill('Live Closure Proof');
  actions.push('typed contact name');
  await page.locator('input[name="email"]').fill(`closure-${viewportName}-${unique}@example.com`);
  actions.push('typed business email');
  await page.locator('input[name="phone"]').fill('+16025550211');
  actions.push('typed phone');
  await page.locator('input[name="code"]').fill(demoCode);
  actions.push('typed current demo code');
  await page.locator('input[name="sms_opt_in"]').check();
  actions.push('checked signup storage consent');
  await page.locator('button[type="submit"]').click();
  actions.push('submitted demo signup');
  await page.waitForURL(/\/northstar\/(?:index\.html)?|\/northstar\/?/, { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2400);
  stops.push(await screenshotStop(page, 'northstar-after-demo', viewportName, 3));
  const northstarMetrics = await pageMetrics(page);

  await context.close();
  const materialConsoleErrors = consoleErrors.filter((entry) => {
    if (!/failed to load resource/i.test(entry.text || '')) return true;
    const url = entry.location?.url || '';
    return Boolean(url) && !/favicon/i.test(url);
  });
  const materialBadResponses = badResponses.filter((entry) => !/favicon/i.test(entry.url));
  const materialFailedRequests = failedRequests.filter((item) => !/favicon/i.test(item.url));
  return {
    viewport: viewportName,
    actions,
    finalUrl: northstarMetrics.url,
    reachedNorthstar: /\/northstar\/?/.test(new URL(northstarMetrics.url).pathname),
    visualStops: stops,
    consoleErrors,
    materialConsoleErrors,
    badResponses,
    failedRequests,
    ok: /\/northstar\/?/.test(new URL(northstarMetrics.url).pathname)
      && stops.every((stop) => stop.nonblank)
      && materialConsoleErrors.length === 0
      && materialBadResponses.length === 0
      && materialFailedRequests.length === 0
  };
}

async function runOwnerViewport(browser, ownerToken) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 980 },
    extraHTTPHeaders: {
      authorization: `Bearer ${ownerToken}`,
      'x-skye-gate-session': ownerToken,
      'x-free99-gate-session': ownerToken
    }
  });
  await context.addInitScript((token) => {
    const record = JSON.stringify({ token, source: 'owner-live-proof' });
    localStorage.setItem('METRAIYUX_GATE_SESSION', record);
    localStorage.setItem('FREE99_PLATFORM_GATE_SESSION', record);
  }, ownerToken);
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push({ text: message.text(), location: message.location() });
  });
  page.on('pageerror', (error) => consoleErrors.push({ text: error.message, location: null }));
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || '' }));
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
  });
  await page.goto(`${origin}/admin/free99-demo-code.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  const text = await page.locator('body').innerText().catch(() => '');
  const statusText = visibleTextSample(text);
  const screenshot = path.join(artifactDir, 'owner-demo-code-page.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  await context.close();
  const materialConsoleErrors = consoleErrors.filter((entry) => {
    if (!/failed to load resource/i.test(entry.text || '')) return true;
    const url = entry.location?.url || '';
    return Boolean(url) && !/favicon/i.test(url);
  });
  const materialBadResponses = badResponses.filter((entry) => !/favicon/i.test(entry.url));
  const materialFailedRequests = failedRequests.filter((item) => !/favicon/i.test(item.url));
  return {
    viewport: 'owner-desktop',
    screenshot,
    screenshotBytes: fs.statSync(screenshot).size,
    statusText,
    loadedRotationUi: /Rotate the Free99 demo code/i.test(text),
    showsActiveCode: /Demo code is active|Preview|Hours left/i.test(text),
    showsSignupTable: /Recent businesses/i.test(text),
    consoleErrors,
    materialConsoleErrors,
    badResponses,
    failedRequests,
    ok: /Rotate the Free99 demo code/i.test(text)
      && /Recent businesses/i.test(text)
      && materialConsoleErrors.length === 0
      && materialBadResponses.length === 0
      && materialFailedRequests.length === 0
  };
}

fs.mkdirSync(artifactDir, { recursive: true });
const previousProof = JSON.parse(fs.readFileSync(previousProofPath, 'utf8'));
const demoCode = previousProof.current_demo_code_local_handoff_only;
if (!demoCode) throw new Error(`Missing current demo code in ${previousProofPath}`);

const report = {
  generatedAt: new Date().toISOString(),
  headed: true,
  xvfb: process.env.LIVE_BROWSER_XVFB_ACTIVE === '1' || Boolean(process.env.DISPLAY),
  origin,
  demoUrl,
  codePreview: codePreview(demoCode),
  browser: 'chromium',
  runs: [],
  failures: []
};

const browser = await chromium.launch({
  headless: false,
  chromiumSandbox: false,
  args: ['--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox']
});
try {
  report.runs.push(await runDemoViewport(browser, 'desktop-1440x980', { viewport: { width: 1440, height: 980 } }, demoCode));
  report.runs.push(await runDemoViewport(browser, 'mobile-390x844', { ...devices['iPhone 12'], viewport: { width: 390, height: 844 } }, demoCode));
  const ownerToken = await ownerLogin();
  report.runs.push(await runOwnerViewport(browser, ownerToken));
} finally {
  await browser.close().catch(() => {});
}

for (const run of report.runs) {
  if (!run.ok) report.failures.push(`${run.viewport} failed proof checks`);
}
report.ok = report.failures.length === 0;
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  ok: report.ok,
  report: reportPath,
  codePreview: report.codePreview,
  runs: report.runs.map((run) => ({ viewport: run.viewport, ok: run.ok, finalUrl: run.finalUrl || null }))
}, null, 2));
process.exit(report.ok ? 0 : 1);
