#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const repoRoot = '/workspaces/MetrAIyux-0S';
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const onboardingPath = '/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html';
const inboxPath = '/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/contractor-packet-inbox.html';
const routexGatePath = '/SkyeRouteX/workforce-command-v0.4.0/public/gate-readiness.html';
const runStamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const artifactDir = path.join(repoRoot, 'test-artifacts', `contractor-onboarding-live-browser-${runStamp}`);
const rawLeakValues = ['111000025', '7770009999', 'TIN-PROOF-000000000'];
let sharedSession = null;

loadDotEnv(path.join(repoRoot, '.env'));
const adminCode = firstEnv([
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'FREE99_GATE_CODE',
  'FREE99_GATE_PASSWORD',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'ADMIN_CODE',
  'ADMIN_PASSWORD',
  'FS27_ADMIN_PASSWORD',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'SKYGATE_ADMIN_PASSWORD',
  'SKYGATEFS13_ADMIN_PASSWORD'
]);

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

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

function firstEnv(keys) {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim();
    if (value) return value;
  }
  return '';
}

function entry(name) {
  return { name, ok: false, actions: [], statuses: [], consoleErrors: [], failedRequests: [], httpErrors: [], screenshots: [], scrollStops: [] };
}

function okStatus(target, name, ok, state = {}) {
  target.statuses.push({ name, ok: Boolean(ok), state });
}

function observe(page, target, allowedHttpErrors = []) {
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
    if (allowedHttpErrors.some((item) => url.includes(item.urlIncludes) && response.status() === item.status)) return;
    if (['favicon.ico', 'fonts.googleapis.com', 'fonts.gstatic.com'].some((fragment) => url.includes(fragment))) return;
    target.httpErrors.push({ url, status: response.status(), method: response.request().method(), resourceType: response.request().resourceType() });
  });
}

function finalize(target) {
  target.materialConsoleErrors = target.consoleErrors.filter((message) => !/Failed to load resource/i.test(message));
  target.ok = !target.materialConsoleErrors.length &&
    !target.failedRequests.length &&
    !target.httpErrors.length &&
    target.statuses.every((item) => item.ok);
}

async function screenshot(page, target, name) {
  const file = path.join(artifactDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  target.screenshots.push(file);
}

async function inspectViewport(page) {
  return page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const elements = Array.from(document.body?.querySelectorAll('*') || []);
    const visibleElements = elements.filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.03 && rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.right > 0 && rect.top < viewport.height && rect.left < viewport.width;
    });
    const text = String(document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const brokenImages = Array.from(document.images || []).filter((image) => !image.complete || image.naturalWidth <= 0).map((image) => image.currentSrc || image.src || '');
    const noHorizontalOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth <= 2;
    return {
      scrollY: Math.round(window.scrollY || 0),
      viewport,
      visibleTextChars: text.length,
      visibleElementCount: visibleElements.length,
      visibleMediaCount: visibleElements.filter((element) => ['IMG', 'SVG', 'VIDEO', 'CANVAS'].includes(element.tagName)).length,
      brokenImages,
      noHorizontalOverflow,
      sample: text.slice(0, 180),
      nonblank: text.length >= 30 || visibleElements.length >= 8
    };
  });
}

async function scrollReceipt(page, target, label) {
  const metrics = await page.evaluate(() => {
    const height = Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0);
    const viewportHeight = window.innerHeight || 800;
    const maxY = Math.max(0, height - viewportHeight);
    return { height, viewportHeight, stops: [...new Set([0, Math.round(maxY * 0.33), Math.round(maxY * 0.66), maxY])].sort((a, b) => a - b) };
  });
  for (let index = 0; index < metrics.stops.length; index += 1) {
    const y = metrics.stops[index];
    await page.mouse.wheel(0, y);
    await page.evaluate((nextY) => window.scrollTo({ top: nextY, behavior: 'instant' }), y);
    await page.waitForTimeout(250);
    const visible = await inspectViewport(page);
    const file = path.join(artifactDir, `${label}-scroll-${String(index + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: file, fullPage: false });
    target.scrollStops.push({ label, index: index + 1, targetY: y, screenshot: file, ...visible });
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
}

async function getSharedToken(page) {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || localStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || '{}';
    try { return JSON.parse(raw); } catch { return {}; }
  });
}

async function loginOwner(page, target, returnPath) {
  assert.ok(adminCode, 'Owner admin code env var is required for live contractor browser proof.');
  const normalizedReturnPath = returnPath.replace(/\.html$/i, '');
  const loginUrl = new URL('/admin/login.html', baseUrl);
  loginUrl.searchParams.set('return', returnPath);
  const response = await page.goto(loginUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
  okStatus(target, 'owner_login_page_loaded', Boolean(response?.ok()), { status: response?.status() || 0, url: page.url() });
  await page.fill('input[name="code"]', adminCode);
  target.actions.push('typed owner admin code into shared 0S gate');
  const loginResponsePromise = page.waitForResponse((res) => res.url().includes('/api/owner/admin-login') && res.request().method() === 'POST', { timeout: 30000 });
  await page.click('#unlock-button');
  const loginResponse = await loginResponsePromise;
  const loginData = await loginResponse.json().catch(() => ({}));
  const ownerToken = loginData.token || '';
  const gateToken = loginData.gateToken || loginData.gateBearerToken || ownerToken;
  okStatus(target, 'owner_admin_login_api_accepted', loginResponse.ok(), {
    status: loginResponse.status(),
    returned_gate_bearer: Boolean(loginData.gateToken || loginData.gateBearerToken),
    returned_owner_token: Boolean(ownerToken)
  });
  if (gateToken || ownerToken) {
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 8;
    await page.context().addCookies([
      ...['skye_gate_session', 'skygate_session', 'skyegate_session', 'metraiyux_gate_session'].map((name) => ({
        name,
        value: gateToken || ownerToken,
        url: baseUrl,
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
        expires
      })),
      ...['metraiyux_admin_session', 'admin_session'].map((name) => ({
        name,
        value: ownerToken || gateToken,
        url: baseUrl,
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
        expires
      }))
    ]);
    await page.evaluate((session) => {
      sessionStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(session));
      localStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(session));
    }, { token: gateToken || ownerToken, source: 'owner-admin-login-api' });
  }
  await page.waitForURL((url) => url.pathname.replace(/\.html$/i, '') === normalizedReturnPath, { timeout: 30000 }).catch(async () => {
    if (new URL(page.url()).pathname.replace(/\.html$/i, '') === normalizedReturnPath) return;
    await page.goto(`${baseUrl}${normalizedReturnPath}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  });
  sharedSession = await getSharedToken(page);
  okStatus(target, 'shared_fs27_gate_session_persisted', Boolean(sharedSession?.token), { source: sharedSession?.source || '' });
}

async function browserFetchJson(page, route, init = {}) {
  return page.evaluate(async ({ route, init }) => {
    const raw = sessionStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || localStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || '{}';
    let token = '';
    try { token = JSON.parse(raw).token || ''; } catch {}
    const headers = { ...(init.headers || {}) };
    if (token) {
      headers.authorization = `Bearer ${token}`;
      headers['x-skye-gate-session'] = token;
    }
    const response = await fetch(route, { credentials: 'include', ...init, headers });
    const text = await response.text();
    let data = {};
    try { data = JSON.parse(text || '{}'); } catch {}
    return { ok: response.ok, status: response.status, text, data };
  }, { route, init });
}

async function fillContractorForm(page, target) {
  const suffix = `${runStamp}-${Date.now()}`;
  const legalName = `Live Proof Contractor ${suffix}`;
  const email = `contractor-live-proof-${suffix}@example.com`;
  const w9File = path.join(artifactDir, 'live-proof-w9.pdf');
  const agreementFile = path.join(artifactDir, 'live-proof-agreement.pdf');
  fs.writeFileSync(w9File, `%PDF-1.4\nLIVE PROOF W9 PLACEHOLDER\nTIN-PROOF-000000000\nNO REAL TAX DATA\n`);
  fs.writeFileSync(agreementFile, `Live proof contractor agreement placeholder ${suffix}\n`);

  const fields = {
    legal_name: legalName,
    preferred_name: 'Live Proof',
    email,
    phone: '555-0199',
    entity_name: `${legalName} LLC`,
    state_residence: 'Arizona',
    address_line_1: '100 Cloudflare Proof Way',
    city_state_zip: 'Phoenix, AZ 85004',
    start_date: '2026-05-23',
    approved_by: '0S live browser proof',
    typed_signature: legalName,
    signature_date: '2026-05-23',
    tax_note: 'Automated live browser proof packet. No real contractor payout.',
    payment_display_name: legalName,
    bank_name: 'Proof Bank',
    bank_routing: '111000025',
    bank_account: '7770009999',
    stripe_account: `${email}.stripe`,
    backup_payment_method: 'Hold until owner approval'
  };
  for (const [name, value] of Object.entries(fields)) {
    await page.fill(`[name="${name}"]`, value);
  }
  await page.selectOption('[name="role_lane"]', { label: 'Referral Partner' });
  await page.selectOption('[name="commission_plan"]', { label: 'Standard AE - 15-20% setup/build + 10% recurring' }).catch(async () => {
    await page.selectOption('[name="commission_plan"]', { index: 0 });
  });
  await page.selectOption('[name="w9_matches"]', { label: 'Not reviewed yet' });
  await page.selectOption('[name="payment_method"]', { label: 'Bank / ACH' });
  await page.selectOption('[name="bank_account_type"]', { label: 'Checking' });
  for (const name of ['accept_ic_agreement', 'accept_commission_plan', 'accept_confidentiality', 'accept_no_guarantees']) {
    await page.check(`[name="${name}"]`);
  }
  await page.setInputFiles('[name="w9_file"]', w9File);
  await page.setInputFiles('[name="signed_agreement_file"]', agreementFile);
  target.actions.push('filled contractor packet with fake identity, W-9 placeholder, agreement, and payout profile');
  return { suffix, legalName, email };
}

async function desktopFlow(browser, report) {
  const target = entry('desktop-contractor-packet-owner-flow');
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  observe(page, target);
  try {
    const unauth = await page.goto(`${baseUrl}${onboardingPath}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(500);
    okStatus(target, 'unauthenticated_onboarding_redirects_to_owner_login', page.url().includes('/admin/login.html') && page.url().includes('return='), { url: page.url(), status: unauth?.status() || 0 });
    await screenshot(page, target, 'desktop-unauth-gate-login');

    await loginOwner(page, target, onboardingPath);
    await page.getByText(/AE Contractor Onboarding|Independent contractor packet/i).first().waitFor({ timeout: 15000 });
    await scrollReceipt(page, target, 'desktop-onboarding');
    const formData = await fillContractorForm(page, target);
    const submitResponsePromise = page.waitForResponse((res) => res.url().includes('/api/marketing-made-easy/ae-vendor-onboarding/submit') && res.request().method() === 'POST', { timeout: 45000 });
    await page.click('button[type="submit"]');
    const submitResponse = await submitResponsePromise;
    const submitData = await submitResponse.json().catch(() => ({}));
    okStatus(target, 'contractor_packet_submit_saved_to_cloudflare', submitResponse.status() === 201 && submitData.ok === true, {
      status: submitResponse.status(),
      receiptId: submitData.receiptId || '',
      storageProvider: submitData.storage?.provider || '',
      ownerResendNotification: submitData.adminNotification || null,
      externalTransferCreated: submitData.payoutLedger?.externalTransferCreated
    });
    okStatus(target, 'submit_response_did_not_expose_raw_payment_values', !rawLeakValues.some((value) => JSON.stringify(submitData).includes(value)), {});
    const receiptId = submitData.receiptId;
    assert.ok(receiptId, 'Live submit did not return a receipt id.');
    await page.getByText(/Packet saved to the Cloudflare encrypted packet store/i).first().waitFor({ timeout: 15000 });
    await screenshot(page, target, 'desktop-onboarding-submit-success');

    await loginOwner(page, target, inboxPath);
    await page.locator('main').getByText(/Packets Waiting For Review|review W-9 status/i).first().waitFor({ timeout: 15000 });
    await page.click('[data-refresh]');
    await page.locator(`[data-open-packet="${receiptId}"]`).waitFor({ timeout: 30000 });
    await screenshot(page, target, 'desktop-packet-inbox-loaded');
    await page.click(`[data-open-packet="${receiptId}"]`);
    await page.getByText(/External transfer created: no/i).first().waitFor({ timeout: 15000 });
    await page.getByText(/W-9 uploaded yes/i).first().waitFor({ timeout: 15000 });
    await screenshot(page, target, 'desktop-packet-detail-before-approval');

    const detailBefore = await browserFetchJson(page, `/api/marketing-made-easy/ae-vendor-onboarding/packets/${encodeURIComponent(receiptId)}`);
    okStatus(target, 'owner_can_read_packet_detail_without_plain_sensitive_values', detailBefore.ok && !rawLeakValues.some((value) => detailBefore.text.includes(value)), {
      status: detailBefore.status,
      adminNotification: detailBefore.data.packet?.adminNotification || null,
      encryptedFileCount: detailBefore.data.packet?.storage?.fileCount || 0
    });

    const approveResponsePromise = page.waitForResponse((res) => res.url().includes(`/api/marketing-made-easy/ae-vendor-onboarding/packets/${receiptId}/approve`) && res.request().method() === 'POST', { timeout: 45000 });
    await page.click('[data-approve]');
    const approveResponse = await approveResponsePromise;
    const approveData = await approveResponse.json().catch(() => ({}));
    okStatus(target, 'owner_approval_marks_profile_ready_without_external_transfer', approveResponse.ok() && approveData.payoutLedger?.externalTransferCreated === false, {
      status: approveResponse.status(),
      payoutStatus: approveData.payoutLedger?.status || '',
      paymentProfileStatus: approveData.packet?.paymentProfile?.status || ''
    });
    await page.getByText(/External transfer created: no/i).first().waitFor({ timeout: 15000 });
    await screenshot(page, target, 'desktop-packet-detail-after-approval');
    await scrollReceipt(page, target, 'desktop-inbox');

    const list = await browserFetchJson(page, '/api/marketing-made-easy/ae-vendor-onboarding/packets?limit=50');
    okStatus(target, 'owner_packet_list_contains_live_receipt', list.ok && (list.data.packets || []).some((packet) => packet.id === receiptId), { status: list.status, count: list.data.packets?.length || 0 });

    await page.goto(`${baseUrl}${routexGatePath}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.getByText(/RouteX Gate Status|Payment readiness|Dashboard Links/i).first().waitFor({ timeout: 15000 });
    const routexBody = await page.locator('body').innerText({ timeout: 5000 });
    okStatus(target, 'routex_dashboard_surfaces_contractor_packet_links', /Contractor Packet|Packet Inbox|Owner packet inbox/i.test(routexBody), {});
    await scrollReceipt(page, target, 'desktop-routex-gate-readiness');

    target.livePacket = { receiptId, legalName: formData.legalName, email: formData.email };
  } finally {
    finalize(target);
    report.entries.push(target);
    await context.close();
  }
}

async function mobileFlow(browser, report) {
  const target = entry('mobile-contractor-packet-navigation');
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    ignoreHTTPSErrors: true
  });
  if (sharedSession?.token) {
    await context.addInitScript((session) => {
      sessionStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(session));
      localStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(session));
    }, sharedSession);
  }
  const page = await context.newPage();
  observe(page, target);
  try {
    await page.goto(`${baseUrl}${onboardingPath}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (page.url().includes('/admin/login.html')) await loginOwner(page, target, onboardingPath);
    await page.getByText(/AE Contractor Onboarding|Independent contractor packet/i).first().waitFor({ timeout: 15000 });
    const noOverflowOnboarding = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 2);
    okStatus(target, 'mobile_onboarding_loads_without_horizontal_overflow', noOverflowOnboarding, { url: page.url() });
    await page.click('[data-nav-toggle]').catch(() => {});
    target.actions.push('opened mobile navigation on contractor onboarding');
    await screenshot(page, target, 'mobile-onboarding-nav-open');
    await scrollReceipt(page, target, 'mobile-onboarding');

    await page.goto(`${baseUrl}${inboxPath}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.locator('main').getByText(/Packets Waiting For Review|review W-9 status/i).first().waitFor({ timeout: 15000 });
    await page.click('[data-refresh]');
    await page.getByText(/Loaded \d+ contractor packet record/i).first().waitFor({ timeout: 30000 }).catch(() => {});
    const noOverflowInbox = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 2);
    okStatus(target, 'mobile_inbox_loads_without_horizontal_overflow', noOverflowInbox, { url: page.url() });
    await screenshot(page, target, 'mobile-packet-inbox');
    await scrollReceipt(page, target, 'mobile-inbox');
  } finally {
    finalize(target);
    report.entries.push(target);
    await context.close();
  }
}

relaunchWithXvfbWhenNeeded();
fs.mkdirSync(artifactDir, { recursive: true });

const report = {
  ok: false,
  schema: 'metraiyux-0s.contractor-onboarding-live-browser-proof.v1',
  generated_at: new Date().toISOString(),
  baseUrl,
  artifactDir,
  runStamp,
  entries: [],
  policy: {
    headed_browser: true,
    desktop_and_mobile: true,
    shared_auth_lane: 'FS27/SkyGate/Free99',
    no_raw_sensitive_email_or_json: true,
    payout_boundary: 'approval marks payout profile provider-ready only; no external transfer is created'
  }
};

const browser = await chromium.launch({ headless: false, args: ['--disable-dev-shm-usage'] });
try {
  await desktopFlow(browser, report);
  await mobileFlow(browser, report);
} finally {
  await browser.close();
}

report.ok = report.entries.every((item) => item.ok) &&
  report.entries.every((item) => item.scrollStops.every((stop) => stop.nonblank && stop.noHorizontalOverflow && stop.brokenImages.length === 0));
fs.writeFileSync(path.join(artifactDir, 'live-browser-report.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(repoRoot, 'test-artifacts', 'contractor-onboarding-live-browser-latest.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  ok: report.ok,
  generated_at: report.generated_at,
  artifactDir,
  entries: report.entries.map((item) => ({
    name: item.name,
    ok: item.ok,
    statuses: item.statuses,
    screenshots: item.screenshots.length,
    scrollStops: item.scrollStops.length,
    consoleErrors: item.materialConsoleErrors?.length || 0,
    failedRequests: item.failedRequests.length,
    httpErrors: item.httpErrors.length,
    livePacket: item.livePacket || null
  }))
}, null, 2));

assert.equal(report.ok, true, `Live browser contractor proof failed. See ${path.join(artifactDir, 'live-browser-report.json')}`);
