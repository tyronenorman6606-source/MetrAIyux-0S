#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = '/workspaces/MetrAIyux-0S';
const baseUrl = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'company-knowledge-production');
const liveVerifierRoot = path.join(repoRoot, 'test-artifacts', 'live-browser-verifier');
const publicBrowserProofPath = path.join(repoRoot, 'metraiyux_0s_site', 'proof', 'live-company-knowledge-browser-latest.json');

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

async function resolveSharedGateToken() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: baseUrl });
  const token = String(auth.token || '').replace(/^Bearer\s+/i, '').trim();
  if (!auth.ok || !token) throw new Error('Could not obtain shared 0S gate bearer.');
  return token;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function nonBlankMetrics(snapshot = {}) {
  return {
    textChars: snapshot.textChars || 0,
    visibleElements: snapshot.visibleElements || 0,
    images: snapshot.images || 0,
    svgs: snapshot.svgs || 0,
    canvases: snapshot.canvases || 0,
    videos: snapshot.videos || 0,
    backgroundImages: snapshot.backgroundImages || 0,
    viewportLooksAlive: snapshot.textChars >= 30 || snapshot.visibleElements >= 6 || snapshot.images > 0 || snapshot.svgs > 0 || snapshot.canvases > 0 || snapshot.backgroundImages > 0
  };
}

async function viewportSnapshot(page) {
  return page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight, scrollY: window.scrollY, scrollHeight: document.documentElement.scrollHeight };
    const all = [...document.querySelectorAll('body *')];
    const visible = all.filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= window.innerHeight && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) > 0.01;
    });
    const text = visible.map((element) => element.innerText || element.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
    const backgrounds = visible.filter((element) => {
      const image = window.getComputedStyle(element).backgroundImage || '';
      return image && image !== 'none';
    });
    const brokenImages = [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= window.innerHeight && (!image.complete || image.naturalWidth === 0);
    }).map((image) => image.currentSrc || image.src || image.alt || 'image');
    const overlayCandidates = visible.filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const hiddenBackground = element.getAttribute('aria-hidden') === 'true'
        || style.pointerEvents === 'none'
        || element.classList.contains('living-background')
        || element.classList.contains('skyesol-living-field')
        || element.classList.contains('neon-motion-chrome');
      if (hiddenBackground) return false;
      return ['fixed', 'sticky'].includes(style.position) && rect.width * rect.height > window.innerWidth * window.innerHeight * 0.72;
    }).map((element) => element.tagName.toLowerCase());
    return {
      ...viewport,
      textChars: text.length,
      textPreview: text.slice(0, 240),
      visibleElements: visible.length,
      images: visible.filter((element) => element.tagName === 'IMG').length,
      svgs: visible.filter((element) => element.tagName === 'svg').length,
      canvases: visible.filter((element) => element.tagName === 'CANVAS').length,
      videos: visible.filter((element) => element.tagName === 'VIDEO').length,
      backgroundImages: backgrounds.length,
      brokenImages,
      largeStickyOverlays: overlayCandidates
    };
  });
}

async function screenshotStop(page, dir, label, receipt) {
  const file = path.join(dir, `${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const snapshot = await viewportSnapshot(page);
  const metrics = nonBlankMetrics(snapshot);
  const stop = { label, path: file, snapshot, metrics };
  receipt.scrollStops.push(stop);
  if (!metrics.viewportLooksAlive) receipt.failures.push(`${label}: viewport looked blank or visually dead`);
  if (snapshot.brokenImages?.length) receipt.failures.push(`${label}: broken visible images ${snapshot.brokenImages.join(', ')}`);
  if (snapshot.largeStickyOverlays?.length) receipt.failures.push(`${label}: large sticky overlay present`);
  return stop;
}

async function humanScroll(page, dir, labelPrefix, receipt) {
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const stops = [0, Math.round(scrollHeight * 0.25), Math.round(scrollHeight * 0.5), Math.round(scrollHeight * 0.75), Math.max(0, scrollHeight - viewportHeight)];
  let index = 0;
  for (const stop of [...new Set(stops)]) {
    await page.mouse.wheel(0, Math.max(0, stop - await page.evaluate(() => window.scrollY)));
    await page.waitForTimeout(450);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), stop);
    await page.waitForTimeout(250);
    await screenshotStop(page, dir, `${labelPrefix}-scroll-${index}`, receipt);
    index += 1;
  }
}

async function clickVisible(page, selector, receipt, label) {
  const locator = page.locator(selector).first();
  if (!(await locator.count().catch(() => 0))) return false;
  if (!(await locator.isVisible().catch(() => false))) return false;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.click({ timeout: 6000 });
  receipt.actions.push(label);
  await page.waitForTimeout(450);
  return true;
}

async function fill(page, selector, value, receipt, label) {
  const locator = page.locator(selector).first();
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.fill(value, { timeout: 8000 });
  receipt.actions.push(label);
  await page.waitForTimeout(150);
}

async function select(page, selector, value, receipt, label) {
  const locator = page.locator(selector).first();
  await locator.selectOption(value, { timeout: 8000 });
  receipt.actions.push(label);
  await page.waitForTimeout(150);
}

async function assertText(page, text, receipt, label) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 12000 });
  receipt.stateAssertions.push(label || `visible:${text}`);
}

async function assertStatus(page, pattern, receipt, label) {
  await page.waitForFunction((source) => {
    const text = document.querySelector('#knowledgeStatus')?.textContent || '';
    return new RegExp(source, 'i').test(text);
  }, pattern.source, { timeout: 12000 });
  const text = await page.locator('#knowledgeStatus').innerText().catch(() => '');
  receipt.stateAssertions.push(`${label}: ${text.slice(0, 120)}`);
}

async function installGateSession(context, token) {
  const url = new URL(baseUrl);
  await context.addCookies([
    { name: 'skye_gate_session', value: token, domain: url.hostname, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    { name: 'skygate_session', value: token, domain: url.hostname, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }
  ]);
}

function publicBrowserReceipt(receipt, receiptPath) {
  const failedNetwork = receipt.network.filter((entry) => entry.status >= 500 || (entry.status === 404 && !/favicon\.ico/i.test(entry.url)));
  const consoleErrors = receipt.console.filter((entry) => entry.type === 'error' || entry.type === 'pageerror');
  return {
    ok: receipt.ok,
    generatedAt: receipt.generatedAt,
    productionUrl: receipt.productionUrl,
    version: receipt.version,
    mode: receipt.mode,
    headless: receipt.headless,
    viewports: receipt.viewports,
    urlCount: receipt.urls.length,
    actions: receipt.actions.length,
    stateAssertions: receipt.stateAssertions.length,
    scrollStops: receipt.scrollStops.length,
    consoleErrors: consoleErrors.length,
    failedNetworkRequests: failedNetwork.length,
    checkedUrls: receipt.urls,
    failures: receipt.failures,
    artifact: {
      localReceipt: receiptPath,
      publicJsonPath: '/proof/live-company-knowledge-browser-latest.json'
    },
    boundary: 'Public receipt omits gate tokens, cookies, form secrets, and private knowledge content.'
  };
}

async function runViewport(browser, viewport, token, artifactDir, receipt) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 500 ? 2 : 1, isMobile: viewport.width < 500, acceptDownloads: true });
  await installGateSession(context, token);
  const page = await context.newPage();
  const viewportLabel = viewport.width < 500 ? 'mobile' : 'desktop';
  const responses = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) receipt.console.push({ viewport: viewportLabel, type: message.type(), text: message.text() });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) responses.push({ url: response.url(), status: response.status() });
  });
  page.on('pageerror', (error) => receipt.console.push({ viewport: viewportLabel, type: 'pageerror', text: error.message }));

  const publicUrl = `${baseUrl}/live/company-knowledge-layer-proof.html`;
  const publicResponse = await page.goto(publicUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  receipt.urls.push({ viewport: viewportLabel, url: publicUrl, status: publicResponse?.status() || 0 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await assertText(page, 'Company Knowledge Layer Production Proof', receipt, `${viewportLabel}: public proof page title visible`);
  await assertText(page, 'Stress Receipt JSON', receipt, `${viewportLabel}: public stress json action visible`);
  await screenshotStop(page, artifactDir, `${viewportLabel}-public-proof-top`, receipt);
  await humanScroll(page, artifactDir, `${viewportLabel}-public-proof`, receipt);
  await clickVisible(page, 'a[href="../proof/live-company-knowledge-stress-latest.json"]', receipt, `${viewportLabel}: opened public stress receipt json`);
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
  receipt.urls.push({ viewport: viewportLabel, url: page.url(), status: 200 });
  await assertText(page, 'requestSummary', receipt, `${viewportLabel}: stress receipt json rendered`);
  await screenshotStop(page, artifactDir, `${viewportLabel}-stress-json`, receipt);
  await page.goto(publicUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await clickVisible(page, 'a[href="../admin/company-knowledge.html"]', receipt, `${viewportLabel}: clicked owner console from public proof`);
  const adminUrl = `${baseUrl}/admin/company-knowledge.html`;
  if (!page.url().includes('/admin/company-knowledge.html')) {
    await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }
  const response = await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  receipt.urls.push({ viewport: viewportLabel, url: adminUrl, status: response?.status() || 0 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await assertText(page, 'Company Knowledge Layer', receipt, `${viewportLabel}: admin page title visible`);
  await assertStatus(page, /Storage|Loaded|Waiting/, receipt, `${viewportLabel}: admin status visible`);
  await screenshotStop(page, artifactDir, `${viewportLabel}-admin-top`, receipt);
  await clickVisible(page, '#loadKnowledgeBases', receipt, `${viewportLabel}: loaded bases from admin top`);
  await assertStatus(page, /Loaded .*knowledge base|Storage/, receipt, `${viewportLabel}: admin bases loaded`);

  await clickVisible(page, 'a[href="../saas/company-knowledge.html"], a[href="/saas/company-knowledge.html"]', receipt, `${viewportLabel}: clicked tenant view navigation`);
  if (!page.url().includes('/saas/company-knowledge.html')) {
    await page.goto(`${baseUrl}/saas/company-knowledge.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  receipt.urls.push({ viewport: viewportLabel, url: page.url(), status: 200 });
  await assertText(page, 'Company Knowledge Base', receipt, `${viewportLabel}: tenant page title visible`);
  await assertStatus(page, /Storage|Loaded|Waiting/, receipt, `${viewportLabel}: tenant status visible`);
  await clickVisible(page, '#loadKnowledgeBases', receipt, `${viewportLabel}: tenant loaded bases`);
  await assertStatus(page, /Loaded|Storage|Waiting/, receipt, `${viewportLabel}: tenant bases action returned state`);
  await screenshotStop(page, artifactDir, `${viewportLabel}-tenant-top`, receipt);

  await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await select(page, '#knowledgeBaseScope', 'platform', receipt, `${viewportLabel}: selected platform scope`);
  await fill(page, '#knowledgeBaseName', `MetrAIyux 0S Company Knowledge ${viewportLabel}`, receipt, `${viewportLabel}: edited base name`);
  await fill(page, '#knowledgeBaseDescription', `Live headed browser proof base update from ${viewportLabel}.`, receipt, `${viewportLabel}: edited base description`);
  await clickVisible(page, '#knowledgeBaseForm button[type="submit"]', receipt, `${viewportLabel}: saved knowledge base`);
  await assertText(page, 'Loaded 1 knowledge base', receipt, `${viewportLabel}: base save refreshed the base table`);
  await clickVisible(page, '[data-select-base="metraiyux-0s"]', receipt, `${viewportLabel}: selected platform base row`);
  await assertStatus(page, /Loaded .*item/, receipt, `${viewportLabel}: selected base loaded items`);

  const itemToken = `browser-proof-${viewportLabel}-${Date.now()}`;
  const itemTitle = `Live browser knowledge ${viewportLabel} ${itemToken}`;
  await select(page, '#knowledgeSourceKind', 'skyevault_receipt', receipt, `${viewportLabel}: previewed vault source option`);
  await fill(page, '#knowledgeVaultReceiptId', `browser-proof-${viewportLabel}`, receipt, `${viewportLabel}: edited vault receipt reference`);
  await select(page, '#knowledgeSourceKind', 'drive_backup', receipt, `${viewportLabel}: previewed drive source option`);
  await fill(page, '#knowledgeDriveFileId', `drive-proof-${viewportLabel}`, receipt, `${viewportLabel}: edited drive backup reference`);
  await select(page, '#knowledgeSourceKind', 'manual_drop', receipt, `${viewportLabel}: returned to manual source`);
  await fill(page, '#knowledgeVaultReceiptId', '', receipt, `${viewportLabel}: cleared vault receipt reference`);
  await fill(page, '#knowledgeDriveFileId', '', receipt, `${viewportLabel}: cleared drive backup reference`);
  await fill(page, '#knowledgeItemTitle', itemTitle, receipt, `${viewportLabel}: entered item title`);
  await fill(page, '#knowledgeItemContent', `Live browser proof content from ${viewportLabel}. Unique proof token ${itemToken}. This verifies the production company knowledge UI can save knowledge through the shared gate into Cloudflare storage.`, receipt, `${viewportLabel}: entered item content`);
  await fill(page, '#knowledgeItemTags', `browser-proof, ${viewportLabel}, r2`, receipt, `${viewportLabel}: entered tags`);
  await select(page, '#knowledgeSourceKind', 'manual_drop', receipt, `${viewportLabel}: selected manual source`);
  await clickVisible(page, '#knowledgeItemForm button[type="submit"]', receipt, `${viewportLabel}: saved item`);
  await assertText(page, itemTitle, receipt, `${viewportLabel}: saved item rendered`);
  await assertStatus(page, /Loaded .*knowledge base|Loaded .*item|Saved/, receipt, `${viewportLabel}: item save returned state`);

  await fill(page, '#knowledgeQuery', `${itemToken} shared gate Cloudflare storage browser proof`, receipt, `${viewportLabel}: entered search query`);
  await clickVisible(page, '#knowledgeSearchForm button[type="submit"]', receipt, `${viewportLabel}: built context`);
  await assertText(page, 'Context Pack', receipt, `${viewportLabel}: context section visible`);
  await assertText(page, itemToken, receipt, `${viewportLabel}: context hit content visible`);
  await screenshotStop(page, artifactDir, `${viewportLabel}-context-built`, receipt);

  await clickVisible(page, '#loadKnowledgeBases', receipt, `${viewportLabel}: loaded bases`);
  await assertStatus(page, /Loaded .*knowledge base/, receipt, `${viewportLabel}: explicit bases reload returned state`);
  await clickVisible(page, '#loadKnowledgeItems', receipt, `${viewportLabel}: loaded items`);
  await assertStatus(page, /Loaded .*item/, receipt, `${viewportLabel}: explicit items reload returned state`);
  await clickVisible(page, '#exportKnowledgeContext', receipt, `${viewportLabel}: exported context json`);

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await fill(page, '#knowledgeQuery', `production proof cycle ${cycle} ${viewportLabel}`, receipt, `${viewportLabel}: cycle ${cycle} edited query`);
    await clickVisible(page, '#knowledgeSearchForm button[type="submit"]', receipt, `${viewportLabel}: cycle ${cycle} built context`);
    await assertText(page, 'Context Pack', receipt, `${viewportLabel}: cycle ${cycle} context still visible`);
    await screenshotStop(page, artifactDir, `${viewportLabel}-cycle-${cycle}`, receipt);
  }

  await humanScroll(page, artifactDir, viewportLabel, receipt);
  receipt.network.push(...responses.filter((entry) => !/favicon\.ico/i.test(entry.url)));
  await context.close();
}

async function main() {
  const token = await resolveSharedGateToken();
  const id = stamp();
  const artifactDir = path.join(artifactRoot, id);
  fs.mkdirSync(artifactDir, { recursive: true });
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    productionUrl: baseUrl,
    version: 'company-knowledge-production-headed-browser-v1',
    mode: 'headed-live-browser',
    headless: false,
    viewports: [{ width: 1440, height: 980 }, { width: 390, height: 844 }],
    urls: [],
    actions: [],
    stateAssertions: [],
    scrollStops: [],
    console: [],
    network: [],
    failures: [],
    artifactDir
  };

  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  try {
    for (const viewport of receipt.viewports) {
      await runViewport(browser, viewport, token, artifactDir, receipt);
    }
  } finally {
    await browser.close();
  }

  const failedNetwork = receipt.network.filter((entry) => entry.status >= 500 || (entry.status === 404 && !/favicon\.ico/i.test(entry.url)));
  if (failedNetwork.length) receipt.failures.push(`failed network requests: ${JSON.stringify(failedNetwork.slice(0, 8))}`);
  const consoleErrors = receipt.console.filter((entry) => entry.type === 'error' || entry.type === 'pageerror');
  if (consoleErrors.length) receipt.failures.push(`console/page errors: ${JSON.stringify(consoleErrors.slice(0, 8))}`);
  if (receipt.actions.length < 48) receipt.failures.push(`insufficient human-style actions: ${receipt.actions.length}`);
  if (receipt.stateAssertions.length < 16) receipt.failures.push(`insufficient state assertions: ${receipt.stateAssertions.length}`);
  if (receipt.scrollStops.length < 12) receipt.failures.push(`insufficient scroll stops: ${receipt.scrollStops.length}`);
  receipt.ok = receipt.failures.length === 0;

  const receiptPath = path.join(artifactDir, 'receipt.json');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.writeFileSync(path.join(artifactRoot, 'latest.json'), JSON.stringify(receipt, null, 2));
  fs.mkdirSync(liveVerifierRoot, { recursive: true });
  const liveVerifierPath = path.join(liveVerifierRoot, `company-knowledge-production-${id}.json`);
  fs.writeFileSync(liveVerifierPath, JSON.stringify(receipt, null, 2));
  fs.mkdirSync(path.dirname(publicBrowserProofPath), { recursive: true });
  fs.writeFileSync(publicBrowserProofPath, JSON.stringify(publicBrowserReceipt(receipt, receiptPath), null, 2));
  console.log(JSON.stringify({
    ok: receipt.ok,
    receiptPath,
    liveVerifierPath,
    publicBrowserProofPath,
    actions: receipt.actions.length,
    stateAssertions: receipt.stateAssertions.length,
    scrollStops: receipt.scrollStops.length,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
