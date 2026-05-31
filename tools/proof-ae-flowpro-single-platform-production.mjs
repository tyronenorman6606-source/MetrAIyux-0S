#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = fs.existsSync('/workspaces/MetrAIyux-0S') ? '/workspaces/MetrAIyux-0S' : process.cwd();
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const appPath = '/Marketing-Made-Easy/AE-FlowPro/';
const removedAppPath = '/Marketing-Made-Easy/AE-FlowPro/app.html';
const deploymentVersion = process.env.PROOF_DEPLOYMENT_VERSION || 'de2ba575-9ff5-442b-9a50-8484cbfc470e';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'live-browser-verifier', `${stamp}-ae-flowpro-single-platform`);
const reportPath = path.join(artifactDir, 'live-browser-verification-report.json');

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

function redact(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value || {});
  return text
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, '$1[redacted]')
    .replace(/(code=)[^&\s)]+/gi, '$1[redacted]');
}

function urlFor(route) {
  return new URL(route, baseUrl).toString();
}

function cleanToken(value) {
  return String(value || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
}

function gateHeaders(token) {
  const clean = cleanToken(token);
  return clean ? {
    authorization: `Bearer ${clean}`,
    'x-free99-gate-session': clean,
    'x-skye-gate-session': clean,
    'x-skygate-session': clean
  } : {};
}

function sharedSession(token, source = 'owner-admin-login') {
  return {
    token: cleanToken(token),
    source,
    platform_id: 'metraiyux-0s',
    usage_lane: 'fs27-owner-gate',
    client: 'MetrAIyux 0S',
    issued_at: new Date().toISOString()
  };
}

function addCheck(entry, name, ok, state = {}) {
  entry.checks.push({ name, ok: Boolean(ok), state });
  if (!ok) entry.failures.push(`${entry.viewportLabel || 'api'}: ${name}`);
}

function freshEntry(viewportLabel, viewport = null) {
  return {
    viewportLabel,
    viewport,
    url: '',
    actions: [],
    routeOrTabStates: [],
    statuses: [],
    checks: [],
    stateChangeAssertions: [],
    downloads: [],
    scrollStops: [],
    screenshots: [],
    visualNonblankMetrics: [],
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    httpErrors: [],
    allowedHttpErrors: [],
    failures: []
  };
}

function observe(page, entry) {
  page.on('console', (message) => {
    if (message.type() === 'error') entry.consoleErrors.push(redact(message.text()).slice(0, 1200));
  });
  page.on('pageerror', (error) => {
    entry.pageErrors.push(redact(error.message || String(error)).slice(0, 1200));
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || 'request failed';
    if (failure.includes('ERR_ABORTED')) return;
    entry.failedRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      failure
    });
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const responseUrl = response.url();
    const allowedRuntimeProbe = responseUrl.includes('/Marketing-Made-Easy/AE-FlowPro/api/runtime/status') && [401, 404].includes(response.status());
    const allowedFavicon = responseUrl.includes('/favicon.ico');
    if (allowedRuntimeProbe || allowedFavicon) {
      entry.allowedHttpErrors.push({
        url: responseUrl,
        status: response.status(),
        reason: allowedRuntimeProbe ? 'AE local runtime probe is optional on the static production origin' : 'favicon probe'
      });
      return;
    }
    entry.httpErrors.push({
      url: responseUrl,
      status: response.status(),
      method: response.request().method(),
      resourceType: response.request().resourceType()
    });
  });
}

function analyzePngViewport(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    return { supported: false, reason: 'not-png' };
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const start = offset + 8;
    const end = start + length;
    if (end > buffer.length) break;
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(start);
      height = buffer.readUInt32BE(start + 4);
      bitDepth = buffer[start + 8];
      colorType = buffer[start + 9];
    } else if (type === 'IDAT') {
      idatChunks.push(buffer.subarray(start, end));
    } else if (type === 'IEND') {
      break;
    }
    offset = end + 4;
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!width || !height || bitDepth !== 8 || !channels || !idatChunks.length) {
    return { supported: false, width, height, bitDepth, colorType, reason: 'unsupported-png-layout' };
  }
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const rowBytes = width * channels;
  let readOffset = 0;
  let previous = Buffer.alloc(rowBytes);
  let current = Buffer.alloc(rowBytes);
  const sampleStepX = Math.max(1, Math.floor(width / 80));
  const sampleStepY = Math.max(1, Math.floor(height / 60));
  const colors = new Set();
  let sampleCount = 0;
  let lumaTotal = 0;
  let lumaSqTotal = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[readOffset++];
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = inflated[readOffset++];
      const left = x >= channels ? current[x - channels] : 0;
      const up = previous[x] || 0;
      const upLeft = x >= channels ? previous[x - channels] : 0;
      let value = raw;
      if (filter === 1) value = (raw + left) & 255;
      else if (filter === 2) value = (raw + up) & 255;
      else if (filter === 3) value = (raw + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value = (raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
      }
      current[x] = value;
    }
    if (y % sampleStepY === 0) {
      for (let x = 0; x < width; x += sampleStepX) {
        const i = x * channels;
        const r = current[i];
        const g = current[i + 1];
        const b = current[i + 2];
        colors.add(`${r},${g},${b}`);
        const luma = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
        lumaTotal += luma;
        lumaSqTotal += luma * luma;
        sampleCount += 1;
      }
    }
    const swap = previous;
    previous = current;
    current = swap;
  }
  const mean = sampleCount ? lumaTotal / sampleCount : 0;
  const variance = sampleCount ? Math.max(0, (lumaSqTotal / sampleCount) - (mean * mean)) : 0;
  return { supported: true, width, height, sampleCount, uniqueSampleColors: colors.size, meanLuma: mean, lumaVariance: variance };
}

async function visualMetrics(page) {
  return page.evaluate(() => {
    const visible = [];
    const viewport = { width: innerWidth, height: innerHeight, scrollY, documentHeight: document.documentElement.scrollHeight };
    for (const element of [...document.body.querySelectorAll('*')]) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= innerHeight || rect.left >= innerWidth) continue;
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0) continue;
      visible.push(element);
    }
    const visibleText = visible.map((element) => element.innerText || '').join(' ').replace(/\s+/g, ' ').trim();
    const visibleImages = [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    });
    return {
      viewport,
      visibleElementCount: visible.length,
      visibleTextChars: visibleText.length,
      visibleTextSample: visibleText.slice(0, 220),
      canvasCount: [...document.querySelectorAll('canvas')].filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      }).length,
      svgCount: [...document.querySelectorAll('svg')].filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      }).length,
      visibleImageCount: visibleImages.length,
      brokenVisibleImages: visibleImages.filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src).slice(0, 10),
      activeTab: document.querySelector('.tab.active')?.getAttribute('data-tab') || '',
      platformCommandCount: document.querySelectorAll('.platformCommand').length,
      inputCount: document.querySelectorAll('input, select, textarea').length,
      appHtmlLinks: [...document.querySelectorAll('a[href], button')].filter((node) => String(node.getAttribute('href') || '').includes('app.html')).length,
      importedAppText: document.body.innerText.includes('Imported App') || document.body.innerText.includes('Open Imported App')
    };
  });
}

async function screenshotStop(page, entry, label) {
  await page.waitForTimeout(250);
  const file = path.join(artifactDir, `${entry.viewportLabel}-${label}.png`);
  const buffer = await page.screenshot({ path: file, fullPage: false, animations: 'disabled', timeout: 90000 });
  const stat = fs.statSync(file);
  const metrics = await visualMetrics(page);
  const pixel = analyzePngViewport(buffer);
  const stop = { label, path: file, bytes: stat.size, metrics, pixel };
  entry.screenshots.push({ label, path: file, bytes: stat.size });
  entry.visualNonblankMetrics.push(stop);
  entry.scrollStops.push({ label, scrollY: metrics.viewport.scrollY, documentHeight: metrics.viewport.documentHeight, path: file });
  addCheck(entry, `viewport_nonblank_${label}`, metrics.visibleTextChars >= 30 || metrics.canvasCount > 0 || metrics.visibleElementCount >= 6, {
    visibleTextChars: metrics.visibleTextChars,
    visibleElementCount: metrics.visibleElementCount,
    canvasCount: metrics.canvasCount,
    uniqueSampleColors: pixel.uniqueSampleColors,
    lumaVariance: pixel.lumaVariance
  });
  addCheck(entry, `viewport_no_broken_media_${label}`, metrics.brokenVisibleImages.length === 0, { brokenVisibleImages: metrics.brokenVisibleImages });
}

async function scrollFullPage(page, entry, labelPrefix) {
  const stops = await page.evaluate(() => {
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    return [...new Set([0, Math.round(max * 0.34), Math.round(max * 0.67), max])];
  });
  for (let index = 0; index < stops.length; index += 1) {
    await page.mouse.wheel(0, stops[index] - await page.evaluate(() => scrollY));
    await page.waitForTimeout(350);
    await screenshotStop(page, entry, `${labelPrefix}-scroll-${index}`);
  }
}

async function resolveOwnerGate() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: baseUrl });
  const token = cleanToken(auth.token);
  if (!auth.ok || !token) throw new Error('No shared 0S gate session was available.');
  return { token, source: auth.credential?.source || 'shared-gate' };
}

async function installSharedSession(context, token, source) {
  const session = sharedSession(token, source);
  await context.addInitScript((shared) => {
    for (const key of ['FREE99_PLATFORM_GATE_SESSION', 'METRAIYUX_GATE_SESSION', 'SKYE_GATE_SESSION']) {
      sessionStorage.setItem(key, JSON.stringify(shared));
      localStorage.setItem(key, JSON.stringify(shared));
    }
  }, session);
}

async function click(page, entry, selector, label) {
  await page.waitForSelector(selector, { state: 'attached', timeout: 90000 });
  const locator = page.locator(selector).first();
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  try {
    await locator.click({ timeout: 15000 });
  } catch {
    await page.evaluate((targetSelector) => {
      const node = document.querySelector(targetSelector);
      if (!node) throw new Error(`Missing selector ${targetSelector}`);
      node.click();
    }, selector);
  }
  entry.actions.push(label);
  await page.waitForTimeout(250);
}

async function fill(page, entry, selector, value, label) {
  const locator = page.locator(selector).first();
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.fill(value, { timeout: 10000 });
  entry.actions.push(label);
  await page.waitForTimeout(100);
}

async function selectOption(page, entry, selector, value, label) {
  await page.locator(selector).selectOption(value, { timeout: 10000 });
  entry.actions.push(label);
  await page.waitForTimeout(100);
}

async function checkState(page, entry, name, fn) {
  const state = await page.evaluate(fn);
  addCheck(entry, name, Boolean(state.ok), state);
  entry.stateChangeAssertions.push({ name, ok: Boolean(state.ok), state });
}

async function saveDownload(page, entry, selector, label) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.locator(selector).first().click({ timeout: 10000 })
  ]);
  const suggested = download.suggestedFilename();
  const file = path.join(artifactDir, `${entry.viewportLabel}-${Date.now()}-${suggested.replace(/[^a-zA-Z0-9_.-]+/g, '-')}`);
  await download.saveAs(file);
  const stat = fs.statSync(file);
  entry.downloads.push({ label, suggestedFilename: suggested, path: file, bytes: stat.size });
  entry.actions.push(label);
  addCheck(entry, `${label}_downloaded`, stat.size > 20, { suggestedFilename: suggested, bytes: stat.size });
}

async function openCanonicalRoot(page, entry) {
  let lastState = {};
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await page.goto(urlFor(appPath), { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    const state = await page.evaluate(() => ({
      url: location.href,
      path: location.pathname,
      title: document.title,
      marker: document.body?.dataset?.platformHardening || '',
      commandCount: document.querySelectorAll('.platformCommand').length,
      bodySample: document.body?.innerText?.slice(0, 500) || ''
    })).catch((error) => ({ error: error.message }));
    lastState = { attempt, status: response?.status() || 0, ok: Boolean(response?.ok()), ...state };
    entry.statuses.push({ name: `canonical_root_open_attempt_${attempt}`, status: response?.status() || 0, ok: state.marker === 'single-canonical-real-platform', state });
    if (state.marker === 'single-canonical-real-platform') {
      entry.actions.push(`opened canonical AE FlowPro root with shared 0S gate session on attempt ${attempt}`);
      return lastState;
    }
    await page.waitForTimeout(1200);
  }
  throw new Error(`Canonical AE FlowPro marker did not render: ${JSON.stringify(lastState)}`);
}

async function exerciseViewport(browser, owner, viewportLabel, viewport) {
  const context = await browser.newContext({
    viewport,
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
    extraHTTPHeaders: gateHeaders(owner.token)
  });
  await installSharedSession(context, owner.token, owner.source);
  const page = await context.newPage();
  const entry = freshEntry(viewportLabel, viewport);
  observe(page, entry);
  await openCanonicalRoot(page, entry);
  entry.url = page.url();
  await screenshotStop(page, entry, 'initial-root');

  await checkState(page, entry, 'root_is_real_platform_not_imported_shell', () => {
    const body = document.body.innerText;
    return {
      ok: location.pathname.endsWith('/Marketing-Made-Easy/AE-FlowPro/')
        && document.body.dataset.platformHardening === 'single-canonical-real-platform'
        && document.querySelectorAll('.platformCommand').length === 6
        && document.querySelectorAll('input, select, textarea').length >= 35
        && !body.includes('Imported App')
        && !body.includes('Open Imported App')
        && !document.querySelector('[href="./app.html"], [href="/Marketing-Made-Easy/AE-FlowPro/app.html"]'),
      path: location.pathname,
      marker: document.body.dataset.platformHardening,
      commandCount: document.querySelectorAll('.platformCommand').length,
      formControlCount: document.querySelectorAll('input, select, textarea').length,
      importedText: body.includes('Imported App') || body.includes('Open Imported App')
    };
  });

  for (const command of ['lead-flow', 'offer-queue', 'follow-up-rail', 'ae-proof', 'runtime-lane', 'activation-pack']) {
    await click(page, entry, `[data-platform-command="${command}"]`, `clicked platform command ${command}`);
    await checkState(page, entry, `platform_command_${command}_changed_state`, (expectedCommand) => {
      const raw = localStorage.getItem('p1-platform-state:ae-flowpro') || '{}';
      let parsed = {};
      try { parsed = JSON.parse(raw); } catch {}
      return {
        ok: parsed.canonicalEntry === 'index.html' && parsed.events?.[0]?.action === expectedCommand,
        activeTab: document.querySelector('.tab.active')?.getAttribute('data-tab') || '',
        latestAction: parsed.events?.[0]?.action || '',
        status: document.querySelector('#platformCommandStatus')?.textContent || ''
      };
    }, command);
  }

  await click(page, entry, '[data-platform-command="lead-flow"]', 'returned to intake');
  await fill(page, entry, '#aeName', `Proof ${viewportLabel} AE`, 'filled AE name');
  await fill(page, entry, '#route', `${viewportLabel} Phoenix route`, 'filled territory');
  await fill(page, entry, '#bizName', `Canonical ${viewportLabel} Studio`, 'filled business name');
  await fill(page, entry, '#contactName', 'Jordan Owner', 'filled contact');
  await fill(page, entry, '#bizEmail', `canonical-${viewportLabel}@example.com`, 'filled business email');
  await fill(page, entry, '#bizPhone', '602-555-0199', 'filled phone');
  await fill(page, entry, '#service1', 'Lead Sprint', 'filled wanted service');
  await fill(page, entry, '#serviceArea', 'Phoenix / Tempe', 'filled service area');
  await page.locator('details').nth(5).evaluate((node) => { node.open = true; }).catch(() => {});
  await fill(page, entry, '#industry', 'Creative services', 'filled industry');
  await fill(page, entry, '#sourceDirectory', '0S live proof', 'filled source directory');
  await fill(page, entry, '#estimatedSetupValue', '1800', 'filled setup value');
  await fill(page, entry, '#estimatedMonthlyValue', '650', 'filled monthly value');
  await fill(page, entry, '#nextAction', 'Send proof page and schedule handoff', 'filled next action');
  await fill(page, entry, '#notes', 'Live proof record for canonical AE FlowPro root surface.', 'filled notes');
  await selectOption(page, entry, '#permission', 'yes', 'selected permission yes');
  await click(page, entry, '#intakeForm button[type="submit"]', 'saved visit');
  await checkState(page, entry, 'visit_saved_into_real_crm_state', (expected) => {
    const text = document.querySelector('#visitsList')?.innerText || '';
    const raw = localStorage.getItem('ae_flow_v1_state') || '{}';
    let parsed = {};
    try { parsed = JSON.parse(raw); } catch {}
    return {
      ok: text.includes(expected) && Array.isArray(parsed.visits) && parsed.visits.some((visit) => visit.business_name === expected),
      visibleVisitText: text.slice(0, 240),
      visits: parsed.visits?.length || 0
    };
  }, `Canonical ${viewportLabel} Studio`);
  await click(page, entry, '#convertToAccountBtn', 'converted current visit into account');
  await click(page, entry, '[data-tab="accounts"]', 'opened accounts tab');
  await checkState(page, entry, 'account_created_and_visible', (expected) => {
    const text = document.querySelector('#accountsList')?.innerText || '';
    const raw = localStorage.getItem('ae_flow_v1_state') || '{}';
    let parsed = {};
    try { parsed = JSON.parse(raw); } catch {}
    return {
      ok: text.includes(expected) && Array.isArray(parsed.accounts) && parsed.accounts.some((account) => account.business_name === expected),
      accounts: parsed.accounts?.length || 0,
      visibleAccountText: text.slice(0, 240)
    };
  }, `Canonical ${viewportLabel} Studio`);

  await click(page, entry, '[data-tab="deals"]', 'opened deals tab');
  await fill(page, entry, '#dealName', `${viewportLabel} Lead Sprint Package`, 'filled deal name');
  await selectOption(page, entry, '#dealStage', 'Proposal Sent', 'selected deal stage');
  await fill(page, entry, '#itemName', 'Conversion landing page', 'filled package item');
  await fill(page, entry, '#itemSetup', '1800', 'filled item setup');
  await fill(page, entry, '#itemMonthly', '650', 'filled item monthly');
  await click(page, entry, '#addItemBtn', 'added package item');
  await click(page, entry, '#saveDealBtn', 'saved deal');
  await checkState(page, entry, 'deal_saved_and_visible', (expected) => {
    const text = document.querySelector('#dealsList')?.innerText || '';
    const raw = localStorage.getItem('ae_flow_v1_state') || '{}';
    let parsed = {};
    try { parsed = JSON.parse(raw); } catch {}
    return {
      ok: text.includes(expected) && Array.isArray(parsed.deals) && parsed.deals.some((deal) => deal.name === expected),
      deals: parsed.deals?.length || 0,
      visibleDealText: text.slice(0, 240)
    };
  }, `${viewportLabel} Lead Sprint Package`);

  await click(page, entry, '[data-tab="analytics"]', 'opened analytics tab');
  await checkState(page, entry, 'analytics_reflects_crm_workflow', () => {
    const body = document.body.innerText;
    return {
      ok: body.includes('Field Analytics Command Deck') && body.includes('Canonical') && body.includes('Lead Sprint'),
      sample: body.slice(0, 500)
    };
  });

  await click(page, entry, '[data-tab="settings"]', 'opened settings tab');
  await saveDownload(page, entry, '#exportTodayCsvBtn', 'exported today csv');
  await saveDownload(page, entry, '#backupBtn2', 'exported backup json');
  await click(page, entry, '#refreshRuntimeLaneBtn', 'refreshed runtime lane control');
  await checkState(page, entry, 'runtime_control_is_integrated_without_static_mode_copy', () => {
    const text = document.body.innerText;
    return {
      ok: document.querySelector('#runtimeLaneStatus')
        && !text.includes('Static mode is active')
        && !text.includes('Optional Node API is offline until you run npm start'),
      runtimeStatus: document.querySelector('#runtimeLaneStatus')?.textContent || '',
      hasStaticModeCopy: text.includes('Static mode is active')
    };
  });

  await scrollFullPage(page, entry, 'full-page');
  await context.close();
  return entry;
}

async function unauthAndRemovedChecks(owner, report) {
  const unauth = await fetch(urlFor(appPath), { redirect: 'manual', headers: { accept: 'text/html' } });
  const removed = await fetch(urlFor(removedAppPath), {
    redirect: 'manual',
    headers: { ...gateHeaders(owner.token), accept: 'text/html' }
  });
  const root = await fetch(urlFor(appPath), {
    redirect: 'manual',
    headers: { ...gateHeaders(owner.token), accept: 'text/html' }
  });
  const rootHtml = await root.text();
  report.httpChecks.push({
    name: 'unauth_root_requires_shared_gate',
    status: unauth.status,
    ok: [302, 401].includes(unauth.status),
    location: unauth.headers.get('location') || '',
    gateHeader: unauth.headers.get('x-0s-gate') || ''
  });
  report.httpChecks.push({
    name: 'authenticated_root_serves_real_platform',
    status: root.status,
    ok: root.status === 200
      && rootHtml.includes('data-platform-hardening="single-canonical-real-platform"')
      && rootHtml.includes('intakeForm')
      && !rootHtml.includes('Open Imported App')
      && !rootHtml.includes('href="./app.html"')
  });
  report.httpChecks.push({
    name: 'authenticated_app_html_is_not_second_platform',
    status: removed.status,
    ok: removed.status === 404 || removed.status === 410,
    contentType: removed.headers.get('content-type') || ''
  });
}

function finalize(report) {
  const failures = [
    ...report.failures,
    ...report.httpChecks.filter((check) => !check.ok).map((check) => `http: ${check.name}`),
    ...report.entries.flatMap((entry) => entry.failures),
    ...report.entries.flatMap((entry) => entry.consoleErrors.map((error) => `${entry.viewportLabel}: console error ${error}`)),
    ...report.entries.flatMap((entry) => entry.pageErrors.map((error) => `${entry.viewportLabel}: page error ${error}`)),
    ...report.entries.flatMap((entry) => entry.failedRequests.map((failure) => `${entry.viewportLabel}: failed request ${failure.url} ${failure.failure}`)),
    ...report.entries.flatMap((entry) => entry.httpErrors.map((failure) => `${entry.viewportLabel}: http ${failure.status} ${failure.url}`))
  ];
  if (report.entries.length !== 2) failures.push(`expected desktop and mobile browser entries, found ${report.entries.length}`);
  for (const entry of report.entries) {
    if (entry.actions.length < 24) failures.push(`${entry.viewportLabel}: fewer than 24 human-style actions`);
    if (entry.stateChangeAssertions.filter((item) => item.ok).length < 8) failures.push(`${entry.viewportLabel}: fewer than 8 state-change assertions`);
    if (entry.downloads.length < 2) failures.push(`${entry.viewportLabel}: export/download controls not fully exercised`);
  }
  report.ok = failures.length === 0;
  report.failures = failures;
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report.ok;
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    mode: 'headed-live-browser',
    headless: false,
    baseUrl,
    appPath,
    removedAppPath,
    deploymentVersion,
    artifactDir,
    reportPath,
    urls: [urlFor(appPath), urlFor(removedAppPath)],
    httpChecks: [],
    entries: [],
    failures: []
  };

  let browser;
  try {
    const owner = await resolveOwnerGate();
    await unauthAndRemovedChecks(owner, report);
    browser = await chromium.launch({ headless: false, timeout: 120000, args: ['--disable-dev-shm-usage', '--disable-gpu'] });
    report.entries.push(await exerciseViewport(browser, owner, 'desktop', { width: 1440, height: 980 }));
    report.entries.push(await exerciseViewport(browser, owner, 'mobile', { width: 390, height: 844, isMobile: true }));
  } catch (error) {
    report.failures.push(redact(error.stack || error.message || String(error)));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  const ok = finalize(report);
  console.log(JSON.stringify({
    ok,
    reportPath,
    failures: report.failures.slice(0, 20),
    desktopActions: report.entries.find((entry) => entry.viewportLabel === 'desktop')?.actions.length || 0,
    mobileActions: report.entries.find((entry) => entry.viewportLabel === 'mobile')?.actions.length || 0
  }, null, 2));
  process.exit(ok ? 0 : 1);
}

await main();
