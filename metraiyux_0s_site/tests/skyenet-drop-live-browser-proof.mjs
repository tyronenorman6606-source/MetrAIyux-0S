#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const repoRoot = fs.existsSync('/workspaces/MetrAIyux-0S') ? '/workspaces/MetrAIyux-0S' : process.cwd();
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const deploymentVersion = process.env.PROOF_DEPLOYMENT_VERSION || 'production-latest';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyenet-drop-live-browser', stamp);
const reportPath = path.join(artifactDir, 'receipt.json');
const routePath = '/skyenet/index.html';

const secretKeys = [
  'FREE99_ADMIN_CODE', 'FREE99_GATE_CODE', 'OWNER_ADMIN_CODE', 'ADMIN_CODE',
  'FS27_ADMIN_CODE', 'FS27_ADMIN_PASSWORD', 'SKYGATEFS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_PASSWORD', 'FREE99_ADMIN_PASSWORD', 'OWNER_ADMIN_PASSWORD',
  'METRAIYUX_ADMIN_TOKEN', 'ADMIN_TOKEN'
];

const sessionKeys = [
  'adminBrainToken',
  'metraiyux_admin_session',
  'metraiyux_0s_gate_session',
  'skye_gate_session',
  'skygate_session',
  'quantumskyes_mcp_owner_token'
];

function relaunchWithXvfbWhenNeeded() {
  if (process.platform !== 'linux' || process.env.LIVE_BROWSER_XVFB_ACTIVE === '1') return;
  if (process.env.DISPLAY && process.env.FORCE_LIVE_BROWSER_XVFB !== '1') return;
  if (spawnSync('which', ['xvfb-run'], { encoding: 'utf8' }).status !== 0) return;
  const child = spawnSync('xvfb-run', ['-a', process.execPath, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, LIVE_BROWSER_XVFB_ACTIVE: '1', DISPLAY: undefined, WAYLAND_DISPLAY: undefined }
  });
  process.exit(child.status ?? 1);
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function unquote(value) {
  let clean = String(value || '').trim().replace(/^export\s+/, '').trim();
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) clean = clean.slice(1, -1).trim();
  return clean;
}

function envFromText(text, key) {
  let found = '';
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    if (normalized.startsWith(`${key}=`)) found = unquote(normalized.slice(key.length + 1));
    if (normalized.startsWith(`${key}:`)) found = unquote(normalized.slice(key.length + 1));
  }
  return found;
}

function allSecrets(keys) {
  const texts = [
    readText(path.join(repoRoot, '.env')),
    readText(path.join(repoRoot, 'ADMIN_REFERENCE.md')),
    readText(path.join(repoRoot, 'metraiyux_0s_site', 'skyegate', 'source', 'SkyeGateFS27', '.env'))
  ];
  const values = [];
  for (const key of keys) {
    if (process.env[key]) values.push(unquote(process.env[key]));
    for (const text of texts) {
      const value = envFromText(text, key);
      if (value) values.push(value);
    }
  }
  return [...new Set(values.filter(Boolean))];
}

const localSecrets = allSecrets(secretKeys);

function cleanToken(value) {
  return String(value || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
}

function redact(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value || {});
  for (const secret of localSecrets) if (secret) text = text.split(secret).join('[redacted]');
  return text.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, '$1[redacted]');
}

function urlFor(route) {
  return new URL(route, baseUrl).toString();
}

function gateHeaders(token) {
  const clean = cleanToken(token);
  return {
    authorization: `Bearer ${clean}`,
    'x-admin-token': clean,
    'x-free99-gate-session': clean,
    'x-skye-gate-session': clean,
    'x-skygate-session': clean
  };
}

async function resolveOwnerGate() {
  for (const code of localSecrets) {
    const response = await fetch(urlFor('/api/owner/admin-login'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code })
    }).catch(() => null);
    if (!response) continue;
    const data = await response.json().catch(() => ({}));
    const token = cleanToken(data.gateToken || data.gateBearerToken || data.token);
    if (response.ok && token) return { token, source: data.gateToken || data.gateBearerToken ? 'fs27-admin-login' : 'owner-admin-login' };
  }
  throw new Error('No local owner/admin candidate unlocked the shared 0S gate.');
}

async function installSession(context, owner) {
  await context.addInitScript(({ token, keys }) => {
    for (const key of keys) {
      localStorage.setItem(key, token);
      sessionStorage.setItem(key, token);
    }
  }, { token: owner.token, keys: sessionKeys });
}

function observe(page, entry) {
  page.on('console', message => {
    if (message.type() === 'error') entry.consoleErrors.push(redact(message.text()).slice(0, 1000));
  });
  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText || 'request failed';
    if (!failure.includes('ERR_ABORTED')) entry.failedRequests.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), failure });
  });
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().includes('favicon.ico')) {
      entry.httpErrors.push({ url: response.url(), status: response.status(), method: response.request().method(), resourceType: response.request().resourceType() });
    }
  });
}

async function visibleMetrics(page) {
  return page.evaluate(() => {
    const nodes = [
      document.body,
      ...document.body.querySelectorAll('main, section, article, h1, h2, h3, p, a, button, input, select, label, img, canvas, video, svg, li, span, code, strong')
    ].slice(0, 1600);
    const visible = nodes.filter(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.top < innerHeight && style.visibility !== 'hidden' && style.display !== 'none';
    });
    const text = visible.slice(0, 220).map(node => node.textContent || node.alt || '').join(' ').replace(/\s+/g, ' ').trim();
    const media = visible.filter(node => ['IMG', 'CANVAS', 'VIDEO', 'SVG'].includes(node.tagName));
    return {
      scrollY: Math.round(window.scrollY),
      visibleElementCount: visible.length,
      visibleTextLength: text.length,
      visibleMediaCount: media.length,
      sampleText: text.slice(0, 260),
      horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth
    };
  });
}

async function screenshot(page, entry, label) {
  const file = path.join(artifactDir, `${entry.viewportLabel}-${label}.png`);
  await page.screenshot({ path: file, fullPage: false, timeout: 90000 });
  entry.screenshots.push({ label, path: file, bytes: fs.statSync(file).size });
  return file;
}

async function scrollProof(page, entry) {
  const maxY = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
  const stops = maxY < 8 ? [0] : [0, Math.round(maxY * 0.28), Math.round(maxY * 0.58), Math.round(maxY * 0.86), maxY];
  for (const [index, y] of stops.entries()) {
    await page.evaluate(nextY => scrollTo(0, nextY), y);
    await page.waitForTimeout(300);
    const metrics = await visibleMetrics(page);
    const shot = await screenshot(page, entry, `scroll-${String(index + 1).padStart(2, '0')}`);
    const bytes = fs.statSync(shot).size;
    const ok = metrics.visibleElementCount >= 8 && (metrics.visibleTextLength >= 30 || metrics.visibleMediaCount >= 1) && bytes > 2000 && metrics.horizontalOverflow < 8;
    entry.scrollStops.push({ ...metrics, screenshot: shot, screenshotBytes: bytes, ok });
    if (!ok) throw new Error(`SkyeNet viewport visually blank or overflowing at scrollY ${metrics.scrollY}`);
  }
}

async function openSkyeNetConsole(page, entry, viewportLabel) {
  const targetUrl = urlFor(`${routePath}?proof=${encodeURIComponent(`${stamp}-${viewportLabel}`)}`);
  let response = null;
  entry.consoleOpenAttempts ||= [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    response = await page.goto(targetUrl, { waitUntil: 'commit', timeout: 90000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 90000 }).catch(() => {});
    const visible = await page.locator('#dropZone').waitFor({ state: 'visible', timeout: 30000 })
      .then(() => true)
      .catch(async (error) => {
        entry.consoleOpenAttempts.push({
          attempt,
          status: response?.status() || 0,
          url: page.url(),
          error: redact(error?.message || error),
          body: (await page.locator('body').innerText({ timeout: 5000 }).catch(() => '')).slice(0, 500)
        });
        return false;
      });
    if (visible) return response;
  }
  throw new Error(`SkyeNet console did not expose #dropZone after retry: ${JSON.stringify(entry.consoleOpenAttempts)}`);
}

async function publicRouteProof(browser, liveUrl, viewport, entry) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  observe(page, entry);
  try {
    const response = await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(800);
    const bodyText = await page.locator('body').innerText({ timeout: 45000 }).catch(() => '');
    const routeHeader = response?.headers()['x-skynet-route'] || '';
    entry.publicRoute = {
      url: liveUrl,
      status: response?.status() || 0,
      routeHeader,
      sampleText: bodyText.slice(0, 280),
      finalUrl: page.url()
    };
    entry.checks.push({ name: 'published route status 200', ok: response?.status() === 200, status: response?.status() || 0, liveUrl });
    entry.checks.push({ name: 'published route served uploaded index', ok: /Proof Drop/i.test(bodyText), liveUrl, sampleText: bodyText.slice(0, 140) });
    entry.checks.push({ name: 'published route came through SkyeNet runtime', ok: /r2-deployment|fallback-origin|gate-required/i.test(routeHeader), liveUrl, routeHeader });
    await screenshot(page, entry, 'published-route');
  } finally {
    await context.close();
  }
}

async function dropProofFolder(page) {
  await page.evaluate(async () => {
    const makeFile = (content, name, type, relativePath) => {
      const file = new File([content], name, { type });
      Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });
      return file;
    };
    const transfer = new DataTransfer();
    transfer.items.add(makeFile('<!doctype html><html><head><title>Proof Drop</title></head><body><main><h1>Proof Drop</h1><p>SkyeNet live folder proof.</p></main></body></html>', 'index.html', 'text/html', 'proof-site/dist/index.html'));
    transfer.items.add(makeFile('body{font-family:system-ui;background:#08111d;color:#fff}', 'style.css', 'text/css', 'proof-site/dist/assets/style.css'));
    transfer.items.add(makeFile('SHOULD_NOT_UPLOAD=true', '.env', 'text/plain', 'proof-site/.env'));
    const zone = document.querySelector('#dropZone');
    zone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
}

async function fillControl(page, selector, value) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'attached', timeout: 90000 });
  await locator.scrollIntoViewIfNeeded({ timeout: 45000 }).catch(() => {});
  await locator.evaluate((node, nextValue) => {
    node.focus();
    node.value = String(nextValue);
    node.dispatchEvent(new InputEvent('input', { bubbles: true, data: String(nextValue), inputType: 'insertText' }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function clickControl(page, selector) {
  await page.waitForFunction((target) => Boolean(document.querySelector(target)), selector, { timeout: 90000 });
  await page.evaluate((target) => {
    const node = document.querySelector(target);
    if (!node) throw new Error(`Missing clickable control: ${target}`);
    node.scrollIntoView?.({ block: 'center', inline: 'center' });
    node.click();
  }, selector);
}

async function runViewport(browser, owner, viewport, viewportLabel) {
  const entry = { viewportLabel, viewport, ok: false, checks: [], actions: [], screenshots: [], scrollStops: [], consoleErrors: [], failedRequests: [], httpErrors: [], failures: [] };
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 700, deviceScaleFactor: 1, ignoreHTTPSErrors: true, extraHTTPHeaders: gateHeaders(owner.token) });
  await installSession(context, owner);
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.setDefaultNavigationTimeout(90000);
  observe(page, entry);
  try {
    const response = await openSkyeNetConsole(page, entry, viewportLabel);
    await page.waitForTimeout(800);

    entry.checks.push({ name: 'SkyeNet route status 200', ok: response?.status() === 200, status: response?.status() || 0, url: page.url() });
    entry.checks.push({ name: 'did not redirect to admin login', ok: !page.url().includes('/admin/login'), url: page.url() });
    const initialText = await page.locator('body').innerText({ timeout: 45000 });
    entry.checks.push({ name: 'drop zone visible', ok: initialText.includes('Drop folder here') });
    entry.checks.push({ name: 'Skrucible toggle visible', ok: /Skrucible forge pass/i.test(initialText) });

    const suffix = `${viewportLabel}-${Date.now().toString(36).slice(-6)}`;
    await fillControl(page, '#workspaceId', `proof-${suffix}`);
    entry.actions.push('edited workspace id');
    await page.selectOption('#planName', 'skyenet-edge-starter');
    entry.actions.push('selected Edge Starter plan');
    await clickControl(page, '#workspaceButton');
    entry.actions.push('clicked Provision workspace');
    await page.waitForTimeout(1200);
    await clickControl(page, '#refreshButton');
    entry.actions.push('clicked Refresh dashboard');
    await page.waitForTimeout(900);
    await fillControl(page, '#projectId', `proof-${suffix}`.replace(/[^a-z0-9-]/g, '-').slice(0, 48));
    entry.actions.push('edited project id');
    await fillControl(page, '#deploymentId', `dep-${suffix}`.replace(/[^a-z0-9-]/g, '-').slice(0, 48));
    entry.actions.push('edited deployment id');
    await fillControl(page, '#routeHost', new URL(baseUrl).hostname);
    entry.actions.push('edited route host');
    await fillControl(page, '#mountPath', `/skyenet/Proof ${suffix}`);
    entry.actions.push('edited mount path with human spaces');
    await page.selectOption('#defaultAuth', 'public');
    entry.actions.push('selected public default auth');
    await clickControl(page, '#publicAccess');
    entry.actions.push('toggled public asset route on');
    await clickControl(page, '#skrucibleEnhance');
    entry.actions.push('toggled Skrucible off');
    await clickControl(page, '#skrucibleEnhance');
    entry.actions.push('toggled Skrucible on');
    await dropProofFolder(page);
    entry.actions.push('dropped parent proof folder with dist index, css, and filtered env file');
    await page.waitForFunction(() => /2 files/i.test(document.querySelector('#fileSummary')?.textContent || ''), null, { timeout: 45000 });
    await screenshot(page, entry, 'after-folder-drop');

    const state = await page.evaluate(() => ({
      fileSummary: document.querySelector('#fileSummary')?.textContent || '',
      dropStats: document.querySelector('#dropStats')?.textContent || '',
      preview: document.querySelector('#surfacePreview')?.textContent || '',
      deployLog: document.querySelector('#deployLog')?.textContent || '',
      truth: document.querySelector('#truthList')?.textContent || '',
      body: document.body.innerText
    }));
    entry.checks.push({ name: 'wrapper folder stripped and dist promoted to publishable root files', ok: /2 files/i.test(state.fileSummary) && /dist promoted/i.test(`${state.fileSummary} ${state.preview}`) && !/dist\/index\.html/i.test(state.preview), state });
    entry.checks.push({ name: 'private env file skipped', ok: /1 skipped/i.test(state.dropStats) && !/\.env/i.test(state.preview), state });
    entry.checks.push({ name: 'surface preview sees root index', ok: /root index (ready|detected)/i.test(state.preview), state });
    entry.checks.push({ name: 'Skrucible forge armed in preview', ok: /Forge pass armed/i.test(state.preview), state });
    entry.checks.push({ name: 'capability table advertises folder drop', ok: /Folder drop UX\s+Live/i.test(state.truth), state });
    entry.checks.push({ name: 'capability table advertises Skrucible pass', ok: /Skrucible forge pass\s+Live/i.test(state.truth), state });

    await clickControl(page, '#deployButton');
    entry.actions.push('clicked Publish Drop');
    await page.waitForFunction(() => /Published and routed:/i.test(document.querySelector('#deployLog')?.textContent || '') || /Failed:/i.test(document.querySelector('#deployLog')?.textContent || ''), null, { timeout: 180000 });
    const deployLog = await page.locator('#deployLog').innerText({ timeout: 45000 });
    entry.deployLog = redact(deployLog);
    entry.checks.push({ name: 'deploy log reports published route', ok: /Published and routed:/i.test(deployLog), deployLog: entry.deployLog });
    entry.checks.push({ name: 'promoted build root uploaded as root index', ok: /Promoted dist to deployment root/i.test(deployLog) && /Upload index\.html/i.test(deployLog) && !/Upload dist\/index\.html/i.test(deployLog), deployLog: entry.deployLog });
    if (/Failed:/i.test(deployLog)) throw new Error(`SkyeNet deploy failed: ${deployLog}`);
    const match = deployLog.match(/Published and routed:\s*(https?:\/\/\S+)/i);
    if (!match) throw new Error(`SkyeNet deploy did not return a live URL: ${deployLog}`);
    const directHref = await page.locator('#publishResult a.direct-live-link').getAttribute('href', { timeout: 45000 }).catch(() => '');
    entry.checks.push({ name: 'direct blue live link appears after publish', ok: directHref === match[1], directHref, expected: match[1] });
    await publicRouteProof(browser, match[1], viewport, entry);

    await scrollProof(page, entry);
  } catch (error) {
    entry.failureUrl = page.url();
    entry.failureText = (await page.locator('body').innerText({ timeout: 5000 }).catch(() => '')).slice(0, 1000);
    await screenshot(page, entry, 'failure').catch(() => {});
    entry.failures.push(redact(error?.stack || error?.message || error).split('\n').slice(0, 8).join('\n'));
  } finally {
    entry.materialConsoleErrors = entry.consoleErrors.filter(message => !/Failed to load resource/i.test(message));
    if (entry.materialConsoleErrors.length) entry.failures.push(`console errors ${entry.materialConsoleErrors.slice(0, 3).join(' | ')}`);
    if (entry.failedRequests.length) entry.failures.push(`failed requests ${entry.failedRequests.slice(0, 3).map(item => item.url).join(', ')}`);
    if (entry.httpErrors.length) entry.failures.push(`HTTP errors ${entry.httpErrors.slice(0, 3).map(item => `${item.status} ${item.url}`).join(', ')}`);
    entry.ok = entry.failures.length === 0 && entry.checks.every(check => check.ok) && entry.scrollStops.every(stop => stop.ok);
    await context.close();
  }
  return entry;
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  fs.mkdirSync(artifactDir, { recursive: true });
  const owner = await resolveOwnerGate();
  const browser = await chromium.launch({ headless: false, timeout: 300000, args: ['--disable-gpu', '--disable-software-rasterizer', '--ozone-platform=x11'] });
  const results = [];
  try {
    results.push(await runViewport(browser, owner, { width: 1440, height: 980 }, 'desktop'));
    results.push(await runViewport(browser, owner, { width: 390, height: 844 }, 'mobile'));
  } finally {
    await browser.close().catch(() => {});
  }
  const report = {
    ok: results.every(result => result.ok),
    mode: 'headed-live-browser',
    headless: false,
    generatedAt: new Date().toISOString(),
    baseUrl,
    routePath,
    deploymentVersion,
    artifactDir,
    results,
    failures: results.flatMap(result => result.failures)
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: report.ok,
    reportPath,
    deploymentVersion,
    summary: results.map(result => ({ viewport: result.viewportLabel, checks: result.checks.length, actions: result.actions.length, screenshots: result.screenshots.length, scrollStops: result.scrollStops.length })),
    failures: report.failures
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch(error => {
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = { ok: false, mode: 'headed-live-browser', headless: false, generatedAt: new Date().toISOString(), baseUrl, routePath, deploymentVersion, artifactDir, failures: [redact(error?.stack || error?.message || error)] };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, reportPath, error: redact(error?.message || error) }, null, 2));
  process.exit(1);
});
