#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const repoRoot = '/workspaces/MetrAIyux-0S';
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const gateDashboardUrl = (process.env.PROOF_GATE_DASHBOARD_URL || 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/apps/skyeroutex/').replace(/\/+$/, '/');
const appPath = '/SkyeRouteX/workforce-command-v0.4.0/public/';
const appUrl = `${baseUrl}${appPath}`;
let sharedOwnerSession = null;

loadDotEnv();

const adminCode = firstEnv([
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'FREE99_GATE_CODE',
  'FREE99_GATE_PASSWORD',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'ADMIN_CODE',
  'ADMIN_PASSWORD',
  'SKYGATEFS13_NETLIFY_AUTH_TOKEN',
  'SKYGATEFS13_ADMIN_PASSWORD',
  'SKYGATEFS27_ADMIN_PASSWORD'
]);

function loadDotEnv() {
  const file = path.join(repoRoot, '.env');
  if (!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (/^\$\{[A-Za-z_][A-Za-z0-9_]*(?::-[^}]*)?\}$/.test(value)) continue;
    if (process.env[match[1]] && !/^\$\{[A-Za-z_][A-Za-z0-9_]*(?::-[^}]*)?\}$/.test(process.env[match[1]])) continue;
    process.env[match[1]] = value;
  }
}

function firstEnv(keys) {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim();
    if (value) return value;
  }
  return '';
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

function cleanFailure(error) {
  return String(error?.stack || error?.message || error).split('\n').slice(0, 10).join('\n');
}

function freshEntry(name) {
  return { name, ok: false, actions: [], statuses: [], consoleErrors: [], failedRequests: [], httpErrors: [], screenshots: [] };
}

function observe(page, entry, allowedHttpErrors = []) {
  page.on('console', message => {
    if (message.type() === 'error') entry.consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText || 'request failed';
    if (failure.includes('ERR_ABORTED')) return;
    entry.failedRequests.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), failure });
  });
  page.on('response', response => {
    if (response.status() < 400) return;
    const url = response.url();
    if (allowedHttpErrors.some(item => url.includes(item.urlIncludes) && response.status() === item.status)) return;
    if (['favicon.ico', 'fonts.googleapis.com', 'fonts.gstatic.com'].some(fragment => url.includes(fragment))) return;
    entry.httpErrors.push({ url, status: response.status(), method: response.request().method(), resourceType: response.request().resourceType() });
  });
}

async function screenshot(page, artifactDir, entry, name) {
  const file = path.join(artifactDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  entry.screenshots.push(file);
}

function okStatus(entry, name, ok, state = {}) {
  entry.statuses.push({ name, ok: Boolean(ok), state });
}

async function loginOwner(page, returnPath, entry) {
  if (!adminCode) throw new Error('Owner admin code env var is required for live RouteX proof.');
  const loginUrl = new URL('/admin/login.html', baseUrl);
  loginUrl.searchParams.set('return', returnPath);
  const response = await page.goto(loginUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
  okStatus(entry, 'owner_login_page_opened', Boolean(response?.ok()), { status: response?.status() || 0 });
  await page.fill('input[name="code"]', adminCode);
  const shared = await page.evaluate(async ({ proofCode }) => {
    const response = await fetch('/api/owner/admin-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: proofCode })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `owner login failed (${response.status})`);
    const clean = String(data.gateToken || data.gateBearerToken || data.token || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
    if (clean) {
      const shared = {
        token: clean,
        source: data.gateToken || data.gateBearerToken ? 'fs27-admin-login' : 'owner-admin-login',
        platform_id: 'metraiyux-0s',
        usage_lane: 'fs27-owner-gate',
        issued_at: new Date().toISOString()
      };
      sessionStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(shared));
      localStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(shared));
      return shared;
    }
    return null;
  }, { proofCode: adminCode });
  if (shared?.token) sharedOwnerSession = shared;
  await page.goto(`${baseUrl}${returnPath}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForURL(url => url.pathname === returnPath || url.pathname === returnPath.replace(/\/index\.html$/, '/'), { timeout: 30000 });
  entry.actions.push(`unlocked shared owner session and opened ${returnPath}`);
}

function finalizeEntry(entry) {
  entry.ignoredConsoleErrors = entry.consoleErrors.filter(message => {
    if (!message.includes('Failed to load resource')) return false;
    if (entry.statuses.some(status => status.name === 'app_local_signup_disabled_under_shared_gate' && status.ok)) return true;
    return !entry.failedRequests.length && !entry.httpErrors.length;
  });
  entry.materialConsoleErrors = entry.consoleErrors.filter(message => !entry.ignoredConsoleErrors.includes(message));
  entry.ok = !entry.materialConsoleErrors.length && !entry.failedRequests.length && !entry.httpErrors.length && entry.statuses.every(item => item.ok);
}

async function api(page, entry, method, route, body, expectOk = true) {
  const result = await page.evaluate(async ({ method, route, body }) => {
    const rawSession = sessionStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || localStorage.getItem('FREE99_PLATFORM_GATE_SESSION') || '{}';
    let token = '';
    try { token = JSON.parse(rawSession).token || ''; } catch {}
    const headers = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const response = await fetch(route, {
      method,
      credentials: 'include',
      headers,
      body: body == null ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    let payload = text;
    try { payload = text ? JSON.parse(text) : null; } catch {}
    return { ok: response.ok, status: response.status, payload };
  }, { method, route, body });
  entry.actions.push(`${method} ${route} -> ${result.status}`);
  if (expectOk && !result.ok) throw new Error(`${method} ${route} failed ${result.status}: ${JSON.stringify(result.payload).slice(0, 1000)}`);
  return result.payload;
}

async function clickTextIfVisible(page, entry, text) {
  const locator = page.getByText(text, { exact: false }).first();
  if (!(await locator.isVisible().catch(() => false))) return false;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.click({ timeout: 3500 }).catch(() => {});
  entry.actions.push(`clicked visible text: ${text}`);
  await page.waitForTimeout(300);
  return true;
}

async function assertNoClientGate(page, entry, name) {
  const state = await page.evaluate(() => ({
    free99GateScriptLoaded: [...document.scripts].some(script => String(script.src || '').includes('free99-gate.js')),
    free99PlatformGateGlobal: Boolean(window.Free99PlatformGate)
  }));
  okStatus(entry, name, !state.free99GateScriptLoaded && !state.free99PlatformGateGlobal, state);
}

async function desktopProductionPath(browser, artifactDir, report) {
  const entry = freshEntry('desktop-live-production-path');
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  observe(page, entry, [
    { urlIncludes: '/api/routex/auth/signup', status: 503 },
    { urlIncludes: '/api/routex/payments/', status: 409 },
    { urlIncludes: '/order-background', status: 409 }
  ]);
  try {
    const unauth = await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(800);
    okStatus(entry, 'unauth_app_redirects_to_shared_owner_login', page.url().includes('/admin/login.html') && page.url().includes('return='), { url: page.url(), status: unauth?.status() || 0 });

    await loginOwner(page, appPath, entry);
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    await page.getByText(/SkyeRouteX|City\/state job boards|Provider Panel/i).first().waitFor({ timeout: 15000 });
    await assertNoClientGate(page, entry, 'app_uses_worker_gate_without_client_gate_script');
    await clickTextIfVisible(page, entry, 'Provider Panel');
    await clickTextIfVisible(page, entry, 'Contractor Panel');
    await clickTextIfVisible(page, entry, 'House Command');
    await screenshot(page, artifactDir, entry, 'desktop-routex-app-after-owner-login');

    const disabled = await api(page, entry, 'POST', '/api/routex/auth/signup', { email: 'should-not-create@routex.live', password: 'Password12345', role: 'provider', name: 'Blocked' }, false);
    okStatus(entry, 'app_local_signup_disabled_under_shared_gate', disabled?.sharedAuth === true || disabled?.error === 'app_local_auth_disabled_by_shared_gate', disabled);

    const manifest = await api(page, entry, 'GET', '/api/routex/manifest');
    okStatus(entry, 'manifest_reports_routex_base', manifest?.base === '/api/routex', { base: manifest?.base, version: manifest?.version });

    const me = await api(page, entry, 'GET', '/api/routex/me');
    okStatus(entry, 'owner_session_returns_admin_or_house_role', ['admin', 'house_command'].includes(me?.user?.role), { role: me?.user?.role, id: me?.user?.id });

    const suffix = Date.now();
    const liveSmsTo = firstEnv(['SKYEROUTEX_LIVE_SMS_TO', 'LIVE_SMS_TO', 'TWILIO_LIVE_TEST_TO']);
    const provider = (await api(page, entry, 'POST', '/api/routex/admin/gate-users', {
      email: `routex-provider-live-${suffix}@stress.local`,
      role: 'provider',
      name: 'RouteX Live Provider',
      company_name: 'RouteX Live Provider Co',
      city: 'Phoenix',
      state: 'Arizona'
    })).user;
    const contractor = (await api(page, entry, 'POST', '/api/routex/admin/gate-users', {
      email: `routex-contractor-live-${suffix}@stress.local`,
      role: 'contractor',
      name: 'RouteX Live Contractor',
      city: 'Phoenix',
      state: 'Arizona',
      ...(liveSmsTo ? { phone: liveSmsTo, sms_opt_in: true } : { sms_opt_in: false }),
      skills: ['field', 'route', 'delivery'],
      transportation_status: 'ready',
      reliability_score: 91
    })).user;
    okStatus(entry, 'owner_staged_gate_owned_provider_and_contractor_profiles', provider?.role === 'provider' && contractor?.role === 'contractor', { provider: provider?.id, contractor: contractor?.id });

    const market = (await api(page, entry, 'POST', '/api/routex/markets', { city: 'Phoenix', state: 'Arizona', status: 'open' })).market;
    const jobPayload = {
      provider_id: provider.id,
      market_id: market.id,
      title: `Live RouteX proof job ${suffix}`,
      category: 'field',
      description: 'Production headed browser proof job: route, payment, assignment, proof storage, export, dispute, and workflow path.',
      location: 'Phoenix, Arizona',
      starts_at: new Date(Date.now() + 3600000).toISOString(),
      pay_type: 'fixed',
      pay_amount_cents: 4200,
      slots: 1,
      acceptance_mode: 'single',
      route_required: true,
      route_mode: 'field_route',
      route_stops: [
        { label: 'Pickup', address: '100 North 1st Street, Phoenix, AZ', coordinates: [-112.074, 33.448], proof_required: true },
        { label: 'Dropoff', address: '400 East Van Buren Street, Phoenix, AZ', coordinates: [-112.068, 33.451], proof_required: true }
      ]
    };
    const created = await api(page, entry, 'POST', '/api/routex/jobs', jobPayload);
    okStatus(entry, 'live_job_creation_called_mapbox_and_stripe', created?.route?.provider_route_status === 'dispatched' && created?.payment?.provider_dispatch_status === 'dispatched', {
      routeProvider: created?.route?.route_provider,
      routeDispatch: created?.route?.provider_route_status,
      paymentDriver: created?.payment?.provider_driver,
      paymentDispatch: created?.payment?.provider_dispatch_status,
      paymentExternalStatus: created?.payment?.external_status
    });

    const assigned = await api(page, entry, 'POST', '/api/routex/house-command/assign', { job_id: created.job.id, contractor_id: contractor.id, note: 'Assigned during live headed production proof.' });
    okStatus(entry, 'house_command_assigned_staged_gate_contractor', assigned?.assignment?.contractor_id === contractor.id, { assignment: assigned?.assignment?.id });

    for (const step of ['confirm', 'on-the-way', 'check-in']) {
      await api(page, entry, 'POST', `/api/routex/assignments/${assigned.assignment.id}/${step}`, {});
    }
    const routes = (await api(page, entry, 'GET', '/api/routex/route-jobs')).routes;
    const activeRoute = routes.find(route => route.job_id === created.job.id);
    okStatus(entry, 'route_job_visible_with_stops', Boolean(activeRoute?.stops?.length >= 2), { route: activeRoute?.id, stops: activeRoute?.stops?.length || 0 });
    for (const stop of activeRoute.stops) {
      await api(page, entry, 'POST', `/api/routex/route-jobs/${activeRoute.id}/complete-stop`, { stop_id: stop.id, proof_note: `Live proof completed ${stop.label}` });
    }
    await api(page, entry, 'POST', `/api/routex/assignments/${assigned.assignment.id}/check-out`, {});

    const mediaBase64 = Buffer.from(`live production proof media ${suffix}`).toString('base64');
    const proof = await api(page, entry, 'POST', `/api/routex/assignments/${assigned.assignment.id}/proof`, {
      proof_type: 'live_headed_browser_proof',
      body: 'Production proof submitted through the mounted 0S Worker path.',
      media_base64: mediaBase64,
      media_mime: 'text/plain',
      media_ext: 'txt'
    });
    okStatus(entry, 'proof_media_stored_in_r2_and_payment_state_dispatched', proof?.media?.external_storage_status === 'stored' && proof?.payment?.provider_dispatch_status === 'dispatched', {
      mediaStatus: proof?.media?.external_storage_status,
      storageDriver: proof?.media?.storage_driver,
      paymentDispatch: proof?.payment?.provider_dispatch_status
    });

    const approved = await api(page, entry, 'POST', `/api/routex/assignments/${assigned.assignment.id}/approve`, {});
    okStatus(entry, 'provider_approval_moved_payment_to_payout_eligible', approved?.payment?.status === 'payout_eligible' && approved?.payment?.provider_dispatch_status === 'dispatched', {
      paymentStatus: approved?.payment?.status,
      dispatch: approved?.payment?.provider_dispatch_status
    });

    const stripeStatus = await api(page, entry, 'POST', `/api/routex/payments/${approved.payment.id}/provider-status`, {});
    okStatus(entry, 'stripe_live_payment_intent_receipt_retrieved', stripeStatus?.ok === true && stripeStatus?.receipt?.id === approved.payment.external_payment_intent_id && Boolean(stripeStatus?.receipt?.status), {
      payment_id: approved.payment.id,
      payment_intent_id: approved.payment.external_payment_intent_id,
      stripe_status: stripeStatus?.receipt?.status,
      livemode: stripeStatus?.receipt?.livemode,
      amount_capturable: stripeStatus?.receipt?.amount_capturable,
      amount_received: stripeStatus?.receipt?.amount_received
    });
    const stripeCapture = await api(page, entry, 'POST', `/api/routex/payments/${approved.payment.id}/capture`, {}, false);
    okStatus(entry, 'stripe_capture_path_reaches_provider_or_truthfully_blocks', (
      stripeCapture?.ok === true
      || (stripeCapture?.capture_ready === false && /not requires_capture|not capturable|requires_payment_method/i.test(`${stripeCapture?.error || ''} ${stripeCapture?.receipt?.status || ''}`))
    ), {
      ok: stripeCapture?.ok,
      capture_attempted: stripeCapture?.capture_attempted,
      capture_ready: stripeCapture?.capture_ready,
      stripe_status: stripeCapture?.receipt?.status,
      error: stripeCapture?.error
    });

    const dispute = (await api(page, entry, 'POST', `/api/routex/assignments/${assigned.assignment.id}/dispute`, { type: 'live_proof_review', body: 'Live proof dispute path opened for operator resolution.' })).dispute;
    const resolved = await api(page, entry, 'POST', '/api/routex/house-command/resolve-dispute', { dispute_id: dispute.id, resolution: 'Resolved during live headed proof.', payment_status: 'payout_eligible', payment_reason: 'Operator proof resolved.' });
    okStatus(entry, 'dispute_resolution_dispatched_payment_provider', resolved?.payment?.provider_dispatch_status === 'dispatched', { dispatch: resolved?.payment?.provider_dispatch_status });

    const ledger = (await api(page, entry, 'GET', '/api/routex/payments/ledger')).payments;
    const paymentToFreeze = ledger.find(payment => payment.job_id === created.job.id);
    const frozen = await api(page, entry, 'POST', '/api/routex/house-command/freeze-payment', { payment_id: paymentToFreeze.id, reason: 'Live proof freeze path.' });
    okStatus(entry, 'payment_freeze_dispatched_payment_provider', frozen?.payment?.status === 'held' && frozen?.payment?.provider_dispatch_status === 'dispatched', { status: frozen?.payment?.status, dispatch: frozen?.payment?.provider_dispatch_status });

    await api(page, entry, 'POST', '/api/routex/ratings', { job_id: created.job.id, to_user_id: contractor.id, score: 5, note: 'Live proof rating.' });
    await api(page, entry, 'POST', `/api/routex/house-command/workflow-board/job/${created.job.id}`, { status: 'completed', owner: 'Live proof operator', checkpoint: 'full path executed', next_action: 'archive receipt' });
    const manualCompliance = await api(page, entry, 'POST', '/api/routex/compliance/manual-checks', {
      user_id: contractor.id,
      status: 'clear',
      checks: ['consent', 'identity', 'county_record'],
      subject_authorization_recorded: true,
      standalone_disclosure_recorded: true,
      proof_reference: `live-proof-${suffix}`,
      proof_body: 'Manual compliance proof stored during production headed proof.',
      media_mime: 'text/plain',
      media_ext: 'txt'
    });
    okStatus(entry, 'manual_compliance_proof_stored_in_r2', manualCompliance?.proof_media?.external_storage_status === 'stored', { mediaStatus: manualCompliance?.proof_media?.external_storage_status, provider: manualCompliance?.compliance_check?.provider });

    const packet = await api(page, entry, 'GET', `/api/routex/jobs/${created.job.id}/export-packet`);
    const marketReport = await api(page, entry, 'GET', '/api/routex/house-command/market-report?city=Phoenix&state=Arizona');
    okStatus(entry, 'export_packet_and_market_report_stored_in_r2', packet?.export?.external_storage_status === 'stored' && marketReport?.export?.external_storage_status === 'stored', {
      packet: packet?.export?.external_storage_status,
      marketReport: marketReport?.export?.external_storage_status
    });

    const storage = await api(page, entry, 'GET', '/api/routex/storage/status');
    const integrations = await api(page, entry, 'GET', '/api/routex/integrations/status');
    const outbox = await api(page, entry, 'GET', '/api/routex/integrations/outbox');
    const backgroundReadiness = await api(page, entry, 'GET', '/api/routex/compliance/provider-readiness');
    const statuses = Object.fromEntries(integrations.integrations.map(item => [item.name, item]));
    okStatus(entry, 'live_integrations_report_connected_for_configured_providers', statuses.payment_provider?.status === 'connected' && statuses.route_intelligence?.status === 'connected' && statuses.proof_storage?.status === 'connected' && statuses.notification_provider?.status === 'connected', {
      payment: statuses.payment_provider,
      route: statuses.route_intelligence,
      storage: statuses.proof_storage,
      notification: statuses.notification_provider,
      compliance: statuses.identity_compliance
    });
    okStatus(entry, 'recipient_and_background_gaps_are_not_hidden', /gate-owned user profiles/i.test(statuses.notification_provider?.note || '') && statuses.identity_compliance?.status !== 'connected', {
      notification: statuses.notification_provider,
      compliance: statuses.identity_compliance,
      liveSmsRecipientProvided: Boolean(liveSmsTo)
    });
    okStatus(entry, 'background_provider_ordering_blocker_is_explicit', backgroundReadiness?.background_provider?.configured === false && backgroundReadiness.background_provider.accepted_options?.some(option => option.missing?.length), backgroundReadiness?.background_provider);

    const assignmentCompliance = (await api(page, entry, 'GET', '/api/routex/compliance/checks')).compliance_checks.find(item => item.assignment_id === assigned.assignment.id);
    const backgroundOrder = assignmentCompliance ? await api(page, entry, 'POST', `/api/routex/compliance/checks/${assignmentCompliance.id}/order-background`, {}, false) : null;
    okStatus(entry, 'background_ordering_refuses_to_fake_without_provider_credentials', backgroundOrder?.ok === false && backgroundOrder?.error === 'external_background_provider_not_configured', {
      compliance_check_id: assignmentCompliance?.id || null,
      response: backgroundOrder?.background_provider || backgroundOrder
    });
    okStatus(entry, 'storage_status_counts_external_objects', storage.storage.external_object_storage_configured === true && storage.storage.proof_media_external_count > 0 && storage.storage.export_packet_external_count > 0, storage.storage);

    const gateDashboard = await api(page, entry, 'GET', '/api/routex/gate-dashboard');
    const twilioNotification = (gateDashboard?.recent?.notifications || []).find(item => item.external_message_id && item.user_id === contractor.id);
    const twilioStatus = twilioNotification ? await api(page, entry, 'POST', `/api/routex/notifications/${twilioNotification.id}/provider-status`, {}) : null;
    okStatus(entry, 'twilio_live_message_provider_status_retrieved', Boolean(twilioStatus?.ok && twilioStatus?.receipt?.sid && twilioStatus?.receipt?.status), {
      notification_id: twilioNotification?.id || null,
      message_sid: twilioStatus?.receipt?.sid || null,
      carrier_status: twilioStatus?.receipt?.status || null,
      error_code: twilioStatus?.receipt?.error_code || null,
      error_message: twilioStatus?.receipt?.error_message || null
    });
    okStatus(entry, 'gate_dashboard_exposes_shared_auth_and_feature_dependencies', (
      gateDashboard?.auth_contract?.routex_local_passwords_allowed === false
      && Array.isArray(gateDashboard?.feature_readiness)
      && gateDashboard.feature_readiness.some(feature => feature.id === 'sms_notifications' && /recipient/i.test(String(feature.if_missing || '')))
      && gateDashboard.feature_readiness.some(feature => feature.id === 'background_checks' && /Checkr|Certn|background-check webhook/i.test(`${feature.if_missing || ''} ${(feature.requires || []).join(' ')}`))
      && gateDashboard.feature_readiness.some(feature => feature.id === 'gate_event_mirror' && feature.status === 'ready')
      && Number(gateDashboard?.counts?.gate_mirror_events || 0) > 0
      && Array.isArray(gateDashboard?.links)
      && gateDashboard.links.some(link => String(link.href || '').includes('/apps/skyeroutex/'))
    ), {
      authContract: gateDashboard?.auth_contract,
      gateMirrorEvents: gateDashboard?.counts?.gate_mirror_events || 0,
      links: (gateDashboard?.links || []).map(link => link.href),
      featureIds: (gateDashboard?.feature_readiness || []).map(feature => feature.id)
    });

    const relevantExternalFailures = outbox.outbox.filter(row => {
      if (!['payment_provider', 'route_intelligence', 'proof_storage'].includes(row.provider_kind)) return false;
      if (String(row.driver || '').startsWith('0s-')) return false;
      if (row.status === 'dispatched') return false;
      const payload = JSON.stringify(row.payload || {});
      return payload.includes(created.job.id) || row.entity_id === created.route.id || row.entity_id === proof.media?.proof_id || row.entity_id === packet.export?.id;
    });
    okStatus(entry, 'configured_external_outbox_rows_dispatched_for_live_job', relevantExternalFailures.length === 0, { failures: relevantExternalFailures.slice(0, 5) });

    await page.goto(`${appUrl}gate-readiness.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.getByText(/What works now|Feature Matrix|Gate Status/i).first().waitFor({ timeout: 15000 });
    await page.getByText(/Shared Auth Contract|Dashboard Links/i).first().waitFor({ timeout: 15000 });
    await assertNoClientGate(page, entry, 'readiness_uses_worker_gate_without_client_gate_script');
    await clickTextIfVisible(page, entry, 'Refresh Readiness');
    await screenshot(page, artifactDir, entry, 'desktop-routex-gate-readiness');

    await page.goto(`${baseUrl}/api/routex/integrations/status`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await screenshot(page, artifactDir, entry, 'desktop-routex-live-integrations-json');
    entry.liveWorkflow = {
      provider_id: provider.id,
      contractor_id: contractor.id,
      market_id: market.id,
      job_id: created.job.id,
      route_job_id: activeRoute.id,
      assignment_id: assigned.assignment.id,
      payment_rows_for_job: ledger.filter(payment => payment.job_id === created.job.id).length,
      stripe_payment_intent_status: stripeStatus?.receipt?.status || null,
      stripe_capture_status: stripeCapture?.ok ? 'captured' : (stripeCapture?.capture_ready === false ? 'blocked_not_capturable' : 'failed'),
      twilio_carrier_status: twilioStatus?.receipt?.status || null,
      background_provider_configured: backgroundReadiness?.background_provider?.configured === true,
      configuredProviderStatuses: {
        payment_provider: statuses.payment_provider?.status,
        route_intelligence: statuses.route_intelligence?.status,
        proof_storage: statuses.proof_storage?.status,
        notification_provider: statuses.notification_provider?.status,
        identity_compliance: statuses.identity_compliance?.status
      },
      routex_gate_folder: gateDashboard.links?.find(link => String(link.href || '').includes('/apps/skyeroutex/'))?.href || ''
    };
  } finally {
    finalizeEntry(entry);
    report.entries.push(entry);
    await context.close();
  }
}

async function mobileProductionView(browser, artifactDir, report) {
  const entry = freshEntry('mobile-live-production-view');
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: sharedOwnerSession?.token ? { authorization: `Bearer ${sharedOwnerSession.token}` } : {}
  });
  if (sharedOwnerSession?.token) {
    await context.addInitScript((session) => {
      sessionStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(session));
      localStorage.setItem('FREE99_PLATFORM_GATE_SESSION', JSON.stringify(session));
    }, sharedOwnerSession);
  }
  const page = await context.newPage();
  observe(page, entry);
  try {
    if (sharedOwnerSession?.token) {
      await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      entry.actions.push('opened mobile app with reused shared owner session bearer');
    } else {
      await loginOwner(page, appPath, entry);
    }
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    await page.getByText(/SkyeRouteX|Provider Panel|Contractor Panel/i).first().waitFor({ timeout: 15000 });
    await assertNoClientGate(page, entry, 'mobile_uses_worker_gate_without_client_gate_script');
    await clickTextIfVisible(page, entry, 'Provider Panel');
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);
    const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 2);
    const storage = await api(page, entry, 'GET', '/api/routex/storage/status');
    okStatus(entry, 'mobile_app_loads_without_horizontal_overflow', noHorizontalOverflow, { href: page.url() });
    okStatus(entry, 'mobile_owner_session_can_read_storage_status', storage?.ok === true && storage.storage?.driver, { storage: storage?.storage });
    await screenshot(page, artifactDir, entry, 'mobile-routex-app-after-owner-login');
  } finally {
    finalizeEntry(entry);
    report.entries.push(entry);
    await context.close();
  }
}

async function fs27GateDashboardView(browser, artifactDir, report) {
  const entry = freshEntry('fs27-gate-dashboard-view');
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  observe(page, entry);
  try {
    const response = await page.goto(gateDashboardUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    okStatus(entry, 'fs27_gate_folder_loads', Boolean(response?.ok()), { url: page.url(), status: response?.status() || 0 });
    await page.getByText(/SkyeRouteX auth, onboarding, and provider readiness/i).first().waitFor({ timeout: 15000 });
    await page.getByText(/No RouteX[- ]local password/i).first().waitFor({ timeout: 15000 });
    await page.fill('#owner-code', adminCode);
    await page.click('#login-btn');
    await page.waitForFunction(() => /Dashboard current/i.test(document.body.innerText), null, { timeout: 30000 });
    await page.getByText(/What works with what/i).first().waitFor({ timeout: 15000 });
    const bodyText = await page.locator('body').innerText({ timeout: 5000 });
    okStatus(entry, 'fs27_gate_dashboard_unlocks_with_shared_owner_code', /Dashboard current/i.test(bodyText), { url: page.url() });
    okStatus(entry, 'fs27_gate_dashboard_renders_feature_matrix_and_records', (
      /shared FS27\/SkyGate auth|shared owner\/admin gate/i.test(bodyText)
      && /SMS/i.test(bodyText)
      && /Background/i.test(bodyText)
      && /Gate Mirrors/i.test(bodyText)
      && /Notifications/i.test(bodyText)
    ), {
      hasGateMirrors: /Gate Mirrors/i.test(bodyText),
      hasNotifications: /Notifications/i.test(bodyText),
      hasBackground: /Background/i.test(bodyText)
    });
    await screenshot(page, artifactDir, entry, 'desktop-fs27-routex-gate-dashboard');
  } finally {
    finalizeEntry(entry);
    report.entries.push(entry);
    await context.close();
  }
}

async function main() {
  relaunchWithXvfbWhenNeeded();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactDir = path.join(repoRoot, 'test-artifacts', `skyeroutex-live-production-stress-${stamp}`);
  const canonicalProofDir = path.join(repoRoot, 'metraiyux_0s_site', 'SkyeRouteX', 'workforce-command-v0.4.0', 'proof');
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.mkdirSync(canonicalProofDir, { recursive: true });
  const report = {
    ok: false,
    generated_at: new Date().toISOString(),
    baseUrl,
    appUrl,
    gateDashboardUrl,
    proofType: 'live headed production browser plus mounted Worker path execution plus FS27 gate dashboard',
    entries: [],
    screenshots: [],
    deployment: { workerVersion: process.env.PROOF_WORKER_VERSION || '', gateWorkerVersion: process.env.PROOF_GATE_WORKER_VERSION || '' },
    knownMissingProviderCredentials: {
      SKYEROUTEX_LIVE_SMS_TO_for_real_live_sms_send: !firstEnv(['SKYEROUTEX_LIVE_SMS_TO', 'LIVE_SMS_TO', 'TWILIO_LIVE_TEST_TO']),
      CHECKR_or_CERTN_or_BACKGROUND_WEBHOOK: !firstEnv(['CHECKR_API_KEY', 'CERTN_API_KEY', 'BACKGROUND_CHECK_WEBHOOK_ENDPOINT', 'COMPLIANCE_WEBHOOK_ENDPOINT']),
      STRIPE_LIVE_PROOF_PAYMENT_METHOD_for_capture_proof: !firstEnv(['STRIPE_LIVE_PROOF_PAYMENT_METHOD', 'ROUTEX_STRIPE_PAYMENT_METHOD', 'STRIPE_CUSTOMER_ID'])
    }
  };
  const browser = await chromium.launch({ headless: false, slowMo: Number(process.env.LIVE_BROWSER_SLOWMO || 60) });
  try {
    await desktopProductionPath(browser, artifactDir, report);
    await mobileProductionView(browser, artifactDir, report);
    await fs27GateDashboardView(browser, artifactDir, report);
  } catch (error) {
    report.error = cleanFailure(error);
  } finally {
    await browser.close();
  }
  report.entries.forEach(entry => report.screenshots.push(...entry.screenshots));
  report.ok = !report.error && report.entries.length === 3 && report.entries.every(entry => entry.ok);
  const reportPath = path.join(artifactDir, 'live-headed-browser-report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  const latestPath = path.join(canonicalProofDir, 'skyeroutex-live-production-stress-latest.json');
  fs.copyFileSync(reportPath, latestPath);
  console.log(JSON.stringify({ ok: report.ok, report: reportPath, latest: latestPath, workflow: report.entries[0]?.liveWorkflow || null, knownMissingProviderCredentials: report.knownMissingProviderCredentials }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch(error => {
  console.error(cleanFailure(error));
  process.exit(1);
});
