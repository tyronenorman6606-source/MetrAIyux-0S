#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = '/workspaces/MetrAIyux-0S';
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const drivePath = '/Free99/apps/skyevaultpro/drive/index.html';
const docxPath = '/Marketing-Made-Easy/SkyeDocxMax/editor.html';
const changelogPath = '/changelog';
const deploymentVersion = process.env.PROOF_DEPLOYMENT_VERSION || '';
let adminGateToken = '';

async function resolveAdminGateToken() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: baseUrl });
  const token = String(auth.token || '').replace(/^Bearer\s+/i, '').trim();
  if (!auth.ok || !token) throw new Error('Shared 0S gate session was unavailable.');
  return token;
}

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

function urlFor(route) {
  return `${baseUrl}${route.startsWith('/') ? route : `/${route}`}`;
}

function cleanFailure(error) {
  return String(error?.stack || error?.message || error).split('\n').slice(0, 8).join('\n');
}

function observe(page, entry) {
  page.on('console', (message) => {
    if (message.type() === 'error') entry.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    entry.failedRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      failure: request.failure()?.errorText || 'request failed'
    });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      entry.httpErrors.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
        resourceType: response.request().resourceType()
      });
    }
  });
}

async function waitForPath(page, pathname, timeout = 30000) {
  await page.waitForFunction((target) => {
    const clean = (value) => String(value || '')
      .replace(/\/index\.html$/, '')
      .replace(/\.html$/, '')
      .replace(/\/+$/, '') || '/';
    return location.pathname === target || clean(location.pathname) === clean(target);
  }, pathname, { timeout });
}

async function pathMatches(page, pathname) {
  return page.evaluate((target) => {
    const clean = (value) => String(value || '')
      .replace(/\/index\.html$/, '')
      .replace(/\.html$/, '')
      .replace(/\/+$/, '') || '/';
    return location.pathname === target || clean(location.pathname) === clean(target);
  }, pathname).catch(() => false);
}

async function loginOwner(page, returnPath, entry) {
  if (!adminGateToken) throw new Error('Shared gate session is required for live proof.');
  const clean = String(adminGateToken || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
  await page.context().setExtraHTTPHeaders({
    Authorization: `Bearer ${clean}`,
    'x-free99-gate-session': clean,
    'x-skye-gate-session': clean
  });
  const host = new URL(baseUrl).hostname;
  await page.context().addCookies(['skye_gate_session', 'skygate_session'].map((name) => ({
    name,
    value: clean,
    domain: host,
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax'
  })));
  await page.addInitScript((shared) => {
    for (const key of ['FREE99_PLATFORM_GATE_SESSION', 'METRAIYUX_GATE_SESSION', 'SKYE_GATE_SESSION']) {
      sessionStorage.setItem(key, JSON.stringify(shared));
      localStorage.setItem(key, JSON.stringify(shared));
    }
  }, {
    token: clean,
    source: 'zero-os-gate-auth',
    platform_id: 'metraiyux-0s',
    usage_lane: 'fs27-owner-gate',
    issued_at: new Date().toISOString()
  });
  const response = await page.goto(urlFor(returnPath), { waitUntil: 'domcontentloaded', timeout: 45000 });
  entry.statuses.push({ name: 'shared_gate_surface_opened', status: response?.status() || 0, ok: Boolean(response?.ok()) });
  entry.actions.push('filled owner code and exchanged shared owner-admin session');
  await waitForPath(page, returnPath);
  entry.actions.push(`shared gate redirected to ${returnPath}`);
}

async function screenshot(page, artifactDir, entry, name) {
  const file = path.join(artifactDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  entry.screenshots.push(file);
}

async function unauthGateCheck(browser, artifactDir, report) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const entry = freshEntry('unauth-drive-gate');
  observe(page, entry);
  const response = await page.goto(urlFor(drivePath), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  const state = await page.evaluate(() => ({
    path: location.pathname,
    search: location.search,
    body: document.body.innerText.slice(0, 1000)
  }));
  entry.statuses.push({
    name: 'unauth_redirects_to_shared_owner_login',
    status: response?.status() || 0,
    ok: state.path === '/admin/login.html' && state.search.includes('return='),
    state
  });
  const suiteEventsResponse = await context.request.get(urlFor('/api/suite-events?ws_id=skyevaultpro-proof'));
  entry.statuses.push({
    name: 'unauth_suite_events_requires_shared_gate',
    status: suiteEventsResponse.status(),
    ok: suiteEventsResponse.status() === 401 && suiteEventsResponse.headers()['x-0s-gate'] === 'fs27-required',
    state: {
      status: suiteEventsResponse.status(),
      gateHeader: suiteEventsResponse.headers()['x-0s-gate'] || ''
    }
  });
  await screenshot(page, artifactDir, entry, 'unauth-drive-gate');
  await context.close();
  report.entries.push(entry);
}

async function exerciseDesktop(browser, artifactDir, report) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 920 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const entry = freshEntry('desktop-vault-docxmax-bridge');
  observe(page, entry);
  await loginOwner(page, drivePath, entry);
  await page.getByText('SkyeVault Pro', { exact: false }).first().waitFor({ state: 'visible', timeout: 25000 });
  await screenshot(page, artifactDir, entry, 'desktop-vault-open');

  const gateState = await page.evaluate(() => ({
    path: location.pathname,
    platformId: window.Free99PlatformGate?.platformId || '',
    authOwner: window.Free99PlatformGate?.authOwner || '',
    overlay: Boolean(document.querySelector('#free99PlatformGate')),
    localProof: Boolean(document.querySelector('#free99PlatformLocalProof')),
    appSpecificKeys: Object.keys(sessionStorage).filter((key) => /^FREE99_PLATFORM_GATE_SESSION_/.test(key))
  }));
  entry.statuses.push({
    name: 'skyevaultpro_uses_worker_gate_no_app_auth',
    ok: gateState.platformId === 'skyevaultpro'
      && gateState.authOwner === 'main-worker-enforceZeroOsGate'
      && !gateState.overlay
      && !gateState.localProof
      && gateState.appSpecificKeys.length === 0,
    state: gateState
  });

  await page.evaluate(() => document.querySelector('#open-settings-button')?.click());
  await page.getByText('$4.99/mo', { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
  const backupState = await page.evaluate(() => ({
    backupText: document.querySelector('#hosted-status')?.textContent || '',
    backupDisabled: document.querySelector('#backup-cloud-button')?.disabled,
    restoreDisabled: document.querySelector('#restore-cloud-button')?.disabled,
    backupAddonActive: window.SkyeHosted?.backupAddonActive?.() || false
  }));
  entry.statuses.push({
    name: 'hosted_backup_is_paid_and_disabled_by_default',
    ok: backupState.backupText.includes('local-first') && backupState.backupDisabled && backupState.restoreDisabled && !backupState.backupAddonActive,
    state: backupState
  });
  const suiteEventId = `skyevaultpro_proof_${Date.now()}`;
  const suiteState = await page.evaluate(async ({ eventId }) => {
    const post = await fetch('/api/suite-events?ws_id=skyevaultpro-proof&app_id=skyevaultpro', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: eventId,
        workspace_id: 'skyevaultpro-proof',
        app_id: 'skyevaultpro',
        source_app: 'skyevaultpro',
        target_app: 'skyedocxmax',
        type: 'proof.skyevaultpro.docxmax_bridge',
        status: 'recorded',
        detail: 'Headed proof event for SkyeVault Pro to SkyeDocxMax app-to-app wiring.'
      })
    });
    const postBody = await post.json().catch(() => null);
    const get = await fetch('/api/suite-events?ws_id=skyevaultpro-proof&app_id=skyevaultpro');
    const getBody = await get.json().catch(() => null);
    return {
      postStatus: post.status,
      postOk: post.ok,
      stored: Boolean(postBody?.stored),
      eventId: postBody?.event?.id || '',
      getStatus: get.status,
      getOk: get.ok,
      readBack: Boolean(getBody?.items?.some((item) => item.id === eventId)),
      readBackCount: getBody?.items?.length || 0
    };
  }, { eventId: suiteEventId });
  entry.statuses.push({
    name: 'suite_events_post_and_readback_behind_shared_gate',
    ok: suiteState.postOk && suiteState.stored && suiteState.eventId === suiteEventId && suiteState.getOk && suiteState.readBack,
    state: suiteState
  });
  await screenshot(page, artifactDir, entry, 'desktop-vault-settings-backup-addon');
  await page.evaluate(() => {
    const modal = document.querySelector('#settings-modal');
    modal?.classList.add('hidden');
    modal?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  });

  const createdDocId = await page.evaluate(async () => {
    const item = await window.SkyePersonalVault.createBlankDoc({ title: 'Bridge Proof Doc', folderPath: '' });
    return item.id;
  });
  entry.actions.push(`created new vault document from SkyeVault Pro local vault: ${createdDocId}`);
  const docxUrl = new URL(docxPath, baseUrl);
  docxUrl.searchParams.set('source', 'skyevaultpro');
  docxUrl.searchParams.set('returnTo', drivePath);
  docxUrl.searchParams.set('vaultDocId', createdDocId);
  await page.goto(docxUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitForPath(page, docxPath);
  await page.getByRole('button', { name: /Push to Vault/i }).waitFor({ state: 'visible', timeout: 30000 });
  await page.getByRole('button', { name: /Open Vault/i }).waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('.ql-editor').click();
  await page.keyboard.insertText('Live proof text written through the current SkyeDocxMax bridge.');
  await page.getByRole('button', { name: /Push to Vault/i }).click();
  entry.actions.push('pushed SkyeDocxMax edit back into SkyeVault Pro');
  await page.waitForTimeout(900);
  const bridgeState = await page.evaluate(() => ({
    path: location.pathname,
    title: document.title,
    hasBridge: Boolean(window.__SKYEDOCX_SKYEVAULT_BRIDGE__?.active),
    vaultDocId: window.__SKYEDOCX_SKYEVAULT_BRIDGE__?.vaultDocId || '',
    returnTo: window.__SKYEDOCX_SKYEVAULT_BRIDGE__?.returnTo || '',
    oldBundledDocx: location.pathname.includes('/skyevaultpro/apps/docx/')
  }));
  entry.statuses.push({
    name: 'current_skyedocxmax_bridge_loaded_vault_doc',
    ok: bridgeState.hasBridge && bridgeState.vaultDocId && !bridgeState.oldBundledDocx,
    state: bridgeState
  });
  await screenshot(page, artifactDir, entry, 'desktop-docxmax-bridge-push');

  await page.getByRole('button', { name: /Open Vault/i }).click();
  await waitForPath(page, drivePath);
  await page.waitForTimeout(700);
  const stored = await page.evaluate(async () => {
    const items = await window.SkyePersonalVault.listAllItems();
    const doc = items.find((item) => String(item.name || '').includes('Bridge Proof Doc'));
    return doc ? {
      name: doc.name,
      extension: doc.extension,
      editable: doc.editable,
      previewText: doc.previewText || '',
      htmlContent: doc.htmlContent || ''
    } : null;
  });
  entry.statuses.push({
    name: 'docxmax_commit_persisted_in_local_vault',
    ok: Boolean(stored?.name && stored?.previewText?.includes('Live proof text')),
    state: stored
  });
  await screenshot(page, artifactDir, entry, 'desktop-vault-after-docxmax-return');

  const legacyResponse = await page.goto(urlFor('/Free99/apps/skyevaultpro/apps/docx/index.html?legacyProof=1'), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitForPath(page, docxPath);
  const legacyRedirectState = await page.evaluate(() => ({
    path: location.pathname,
    search: location.search,
    oldBundledDocx: location.pathname.includes('/skyevaultpro/apps/docx/'),
    bridgeRegistered: Boolean(window.__SKYEDOCX_SKYEVAULT_BRIDGE__),
    source: new URLSearchParams(location.search).get('source') || ''
  }));
  entry.statuses.push({
    name: 'legacy_docx_route_redirects_to_current_skyedocxmax',
    ok: legacyResponse?.ok()
      && (legacyRedirectState.path === docxPath || legacyRedirectState.path === docxPath.replace(/\.html$/, ''))
      && legacyRedirectState.source === 'skyevaultpro'
      && !legacyRedirectState.oldBundledDocx
      && legacyRedirectState.bridgeRegistered,
    state: {
      responseStatus: legacyResponse?.status() || 0,
      ...legacyRedirectState
    }
  });
  await context.close();
  report.entries.push(entry);
}

async function exerciseMobile(browser, artifactDir, report) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  const entry = freshEntry('mobile-vault-docxmax-link');
  observe(page, entry);
  await loginOwner(page, drivePath, entry);
  await page.getByText('SkyeVault Pro', { exact: false }).first().waitFor({ state: 'visible', timeout: 25000 });
  await screenshot(page, artifactDir, entry, 'mobile-vault-open');
  const mobileDocxHref = await page.evaluate(() => [...document.querySelectorAll('a')]
    .find((link) => link.textContent.trim() === 'SkyeDocx')?.getAttribute('href') || '');
  entry.statuses.push({
    name: 'mobile_skydocx_link_points_cross_app',
    ok: mobileDocxHref.startsWith('/Marketing-Made-Easy/SkyeDocxMax/editor.html'),
    state: { mobileDocxHref }
  });
  await page.goto(new URL(mobileDocxHref, baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitForPath(page, docxPath);
  const state = await page.evaluate(() => ({
    path: location.pathname,
    search: location.search,
    oldBundledDocx: location.pathname.includes('/skyevaultpro/apps/docx/'),
    bridgeRegistered: Boolean(window.__SKYEDOCX_SKYEVAULT_BRIDGE__),
    bridgeActive: Boolean(window.__SKYEDOCX_SKYEVAULT_BRIDGE__?.active)
  }));
  entry.statuses.push({
    name: 'mobile_quick_link_uses_current_skyedocxmax',
    ok: (state.path === docxPath || state.path === docxPath.replace(/\.html$/, '')) && !state.oldBundledDocx && state.bridgeRegistered && !state.bridgeActive,
    state
  });
  await screenshot(page, artifactDir, entry, 'mobile-current-docxmax-link');
  await context.close();
  report.entries.push(entry);
}

async function exerciseChangelog(browser, artifactDir, report, viewport, name) {
  const context = await browser.newContext({
    viewport,
    isMobile: viewport.width < 700,
    deviceScaleFactor: viewport.width < 700 ? 2 : 1,
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  const entry = freshEntry(name);
  observe(page, entry);
  await loginOwner(page, changelogPath, entry);
  await page.getByText('SkyeVault Pro now talks to the current SkyeDocxMax', { exact: false }).first().waitFor({ state: 'visible', timeout: 25000 });
  await page.mouse.wheel(0, Math.floor(viewport.height * 0.55));
  entry.actions.push('scrolled gated changelog release timeline');
  const state = await page.evaluate(() => ({
    path: location.pathname,
    body: document.body.innerText,
    title: document.title
  }));
  entry.statuses.push({
    name: 'gated_changelog_entry_visible',
    ok: state.path === changelogPath
      && state.body.includes('SkyeVault Pro now talks to the current SkyeDocxMax')
      && state.body.includes('$4.99/mo')
      && state.body.includes('No per-app auth'),
    state: {
      path: state.path,
      title: state.title,
      hasBridgeCopy: state.body.includes('SkyeVault Pro now talks to the current SkyeDocxMax'),
      hasBackupPrice: state.body.includes('$4.99/mo'),
      hasNoPerAppAuthCopy: state.body.includes('No per-app auth')
    }
  });
  await screenshot(page, artifactDir, entry, name);
  await context.close();
  report.entries.push(entry);
}

function freshEntry(name) {
  return {
    name,
    actions: [],
    statuses: [],
    consoleErrors: [],
    failedRequests: [],
    httpErrors: [],
    screenshots: []
  };
}

function materialErrors(entry) {
  const ignoredUrl = /favicon|\.map$|fonts\.gstatic\.com|fonts\.googleapis\.com/i;
  return {
    consoleErrors: entry.consoleErrors.filter((item) => !/netlifyIdentity|ResizeObserver|Failed to load resource: the server responded with a status of 404/i.test(item)),
    failedRequests: entry.failedRequests.filter((item) => !ignoredUrl.test(item.url)),
    httpErrors: entry.httpErrors.filter((item) => !ignoredUrl.test(item.url))
  };
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyevaultpro-docxmax-live', stamp);
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = {
    ok: false,
    baseUrl,
    drivePath,
    docxPath,
    changelogPath,
    deploymentVersion,
    artifactDir,
    startedAt: new Date().toISOString(),
    entries: []
  };

  adminGateToken = await resolveAdminGateToken();
  const browser = await chromium.launch({ headless: false });
  try {
    await unauthGateCheck(browser, artifactDir, report);
    await exerciseDesktop(browser, artifactDir, report);
    await exerciseMobile(browser, artifactDir, report);
    await exerciseChangelog(browser, artifactDir, report, { width: 1440, height: 980 }, 'desktop-gated-changelog-entry');
    await exerciseChangelog(browser, artifactDir, report, { width: 390, height: 844 }, 'mobile-gated-changelog-entry');
  } finally {
    await browser.close();
  }

  const failures = [];
  for (const entry of report.entries) {
    for (const status of entry.statuses) {
      if (!status.ok) failures.push(`${entry.name}:${status.name}`);
    }
    const material = materialErrors(entry);
    if (material.consoleErrors.length) failures.push(`${entry.name}:console-errors`);
    if (material.failedRequests.length) failures.push(`${entry.name}:failed-requests`);
    if (material.httpErrors.length) failures.push(`${entry.name}:http-errors`);
    entry.materialErrors = material;
  }
  report.ok = failures.length === 0;
  report.failures = failures;
  report.finishedAt = new Date().toISOString();
  const reportPath = path.join(artifactDir, 'live-browser-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(repoRoot, 'test-artifacts', 'skyevaultpro-docxmax-live', 'latest-live-browser-report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify({ ok: report.ok, reportPath, failures }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(cleanFailure(error));
  process.exit(1);
});
