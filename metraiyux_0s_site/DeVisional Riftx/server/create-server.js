const http = require('http');
const path = require('path');
const fs = require('fs');
const { extractGateCredentialFromHeaders, verifyGateRequest, buildGateHeaders } = require('../platform/server-auth');
const { resolvePaymentProvider, stripeCredentialReadiness, probeStripeEnvironment, createPaymentSession, retrieveStripeCheckoutSession, reconcileStripePaymentSession, verifyStripeWebhook, finalizePayment, paymentSummary } = require('../platform/payment-gateways');
const { createSubmissionJob, submitJob, previewSubmissionContract, validateSubmissionConfig, querySubmissionStatus, cancelSubmissionJob, createVendorWorkflow } = require('../platform/submission-adapters');
const { loadRuntimeState, saveRuntimeState, appendAuditEvent, recordPortalRun, recordLiveProof, hasProcessedWebhookEvent, hasCompletedPaymentSession, createSubmissionJobRecord, upsertSubmissionJob, getSubmissionJob, markSubmissionJobDispatched, markSubmissionJobStatus, markSubmissionJobCancelled, markSubmissionJobPortalPlanned, markSubmissionJobPortalLivePlanned, markSubmissionJobPortalRun, markSubmissionJobPortalLiveRun, resolveJournalPath } = require('../platform/runtime-state');
const { buildPortalPlan, runPortalAutomation } = require('../platform/portal-automation');
const { createVendorPortalProfile, validateVendorPortalProfile, portalTargetSummary } = require('../platform/vendor-portal-profiles');
const { generateSkyeDocxPackage } = require('../platform/publishing');
const { summarizeCommerceState } = require('../platform/commerce');
const { canonicalize } = require('../platform/export-import');

function writeCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, authorization, x-admin-token, x-free99-admin-code, x-free99-gate-session, x-skye-gate-session, x-skygate-session, x-skye-gate-token, stripe-signature');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
}
function json(res, code, value) { writeCors(res); res.writeHead(code, { 'content-type': 'application/json' }); res.end(`${JSON.stringify(value, null, 2)}\n`); }
function readBody(req) { return new Promise((resolve, reject) => { const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))); req.on('error', reject); }); }
function parseJsonBody(raw) { try { return JSON.parse(raw || '{}'); } catch { return {}; } }
function routePath(req) { return String(req.url || '').split('?')[0]; }
function pathParts(req) { return routePath(req).split('/').filter(Boolean); }

function readFixturePackage(config) {
  const fixture = JSON.parse(fs.readFileSync(path.join(config.root, 'fixtures', 'publishing', 'skydocx-workspace.json'), 'utf8'));
  return generateSkyeDocxPackage(fixture, { runId: 'server-runtime' });
}
function readRetailerManifest(config) { const fp = path.join(config.root, 'artifacts', 'retailer-packages', 'manifest.json'); try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return { ok: false, jobs: [] }; } }
function resolvePackagePath(config, value) {
  if (!value) return null;
  if (path.isAbsolute(value) && fs.existsSync(value)) return value;
  const basename = path.basename(value);
  const matches = [];
  const base = path.join(config.root, 'artifacts', 'retailer-packages');
  if (fs.existsSync(base)) {
    for (const folder of fs.readdirSync(base)) {
      const sub = path.join(base, folder);
      if (!fs.statSync(sub).isDirectory()) continue;
      for (const file of fs.readdirSync(sub)) if (file === basename) matches.push(path.join(sub, file));
    }
  }
  return matches[0] || null;
}
function summarizePackageManifest(config) {
  const manifest = readRetailerManifest(config);
  return canonicalize({ ok: !!manifest.ok, jobs: (manifest.jobs || []).map((job) => ({ slug: job.slug, mode: job.mode, packages: (job.packages || []).map((pkg) => ({ channel: pkg.channel, lane: pkg.lane, path: resolvePackagePath(config, pkg.path), filename: path.basename(pkg.path || '') })) })) });
}

function createConfig(env = process.env) {
  const root = path.resolve(__dirname, '..');
  const runtimeMode = env.SKYE_RUNTIME_MODE || 'development';
  const fs27Endpoint = env.DEVISIONAL_RIFTX_FS27_ENDPOINT || '/api/devisional-riftx/submissions';
  return {
    root,
    runtimeMode,
    authOwner: 'FS27/SkyGate/Free99 shared gate',
    operator: env.SKYE_OPERATOR || 'Skyes Over London',
    org: env.SKYE_ORG || 'SOLEnterprises',
    paymentProvider: 'skypay',
    skyPayUrl: env.SKYEPAY_CHECKOUT_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/saas/skyepay.html',
    skyPayApiBase: env.SKYEPAY_API_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev',
    runtimeStatePath: env.SKYE_RUNTIME_STATE_PATH || path.join(root, 'artifacts', 'runtime', 'server-state.json'),
    portalAutomationEnabled: true,
    portalArtifactDir: env.SKYE_PORTAL_ARTIFACT_DIR || path.join(root, 'artifacts', 'portal-automation'),
    liveProofArtifactDir: env.SKYE_LIVE_PROOF_ARTIFACT_DIR || path.join(root, 'artifacts', 'live-proof'),
    fs27Endpoint,
    portalProfiles: {
      apple_books: createVendorPortalProfile('apple_books', env, 'fs27://apple-books-owner-approval'),
      kobo: createVendorPortalProfile('kobo', env, 'fs27://kobo-owner-approval'),
      kdp_ebook: createVendorPortalProfile('kdp_ebook', env, 'fs27://kdp-ebook-owner-approval'),
      kdp_print_prep: createVendorPortalProfile('kdp_print_prep', env, 'fs27://kdp-print-owner-approval')
    },
    submissionEndpoints: {
      apple_books: fs27Endpoint,
      kobo: fs27Endpoint,
      kdp_ebook: fs27Endpoint,
      kdp_print_prep: fs27Endpoint
    },
    submissionDeliveryModes: {
      apple_books: 'fs27-ledger',
      kobo: 'fs27-ledger',
      kdp_ebook: 'fs27-ledger',
      kdp_print_prep: 'fs27-ledger'
    },
    submissionAuth: { default: { scheme: 'fs27-gate-session' } }
  };
}

function collectProductionReadiness(config) {
  const blockers = [];
  try { resolvePaymentProvider({ provider: config.paymentProvider, skyPayUrl: config.skyPayUrl, apiBase: config.skyPayApiBase }); } catch (error) { blockers.push(`payment-provider:${error.message}`); }
  for (const channel of Object.keys(config.submissionEndpoints)) {
    try {
      validateSubmissionConfig({ channel, package_path: __filename, package_name: 'probe.zip', package_sha256: 'probe', package_bytes: 1, title: 'Probe', slug: 'probe', metadata: {} }, { endpoint: config.submissionEndpoints[channel], auth: config.submissionAuth, deliveryModes: config.submissionDeliveryModes });
    } catch (error) { blockers.push(`${channel}:${error.message}`); }
    const portalValidation = validateVendorPortalProfile(config.portalProfiles[channel]);
    if (!portalValidation.ok) blockers.push(`${channel}:portal-profile:${portalValidation.issues.join(',')}`);
  }
  return canonicalize({
    schema: 'skye.production.readiness',
    version: '4.0.0',
    runtime_mode: config.runtimeMode,
    auth_owner: config.authOwner,
    payment_provider: config.paymentProvider,
    payment_api_base: config.skyPayApiBase,
    journal_path: resolveJournalPath(config.runtimeStatePath),
    ok: blockers.length === 0,
    blockers
  });
}

async function requireAuth(req, env) {
  const verification = await verifyGateRequest(req, env);
  return verification.ok ? verification : { ...verification, ok: false };
}
function authResponse(res, verification) { return json(res, verification.status || 401, verification); }
function saveState(config, state) { return saveRuntimeState(config.runtimeStatePath, state); }
function summarizeRuntime(state, config) {
  return {
    schema: 'skye.runtime.summary',
    version: '4.0.0',
    auth: { owner: config.authOwner, refresh_tokens: 0, revoked_jtis: 0, operator_logins: state.auth.operator_logins.length },
    payments: { pending_sessions: state.payments.pending_sessions.length, completed_orders: state.payments.completed_orders.length, webhook_events: state.payments.webhook_events.length, reconciliations: (state.payments.reconciliations || []).length, probes: (state.payments.probes || []).length },
    commerce: summarizeCommerceState(state.commerce),
    submissions: state.submissions.length,
    submission_jobs: state.submission_jobs.length,
    portal_runs: state.portal_runs.length,
    live_proofs: (state.live_proofs || []).length,
    audit: state.audit.length,
    journal_path: resolveJournalPath(config.runtimeStatePath)
  };
}

function findPackagedArtifact(config, slug, channel, mode = null) {
  const manifest = summarizePackageManifest(config);
  for (const job of manifest.jobs || []) {
    if (mode && job.mode !== mode) continue;
    if (job.slug !== slug) continue;
    const found = (job.packages || []).find((pkg) => pkg.channel === channel);
    if (found && found.path) return { ...found, slug: job.slug, mode: job.mode };
  }
  return null;
}
function buildSubmissionConfig(config, channel, gateSession = '') { return { endpoint: config.submissionEndpoints[channel], auth: config.submissionAuth, gateSession, deliveryModes: config.submissionDeliveryModes }; }
function buildWorkflowPreview(config, job, gateSession = '') { return createVendorWorkflow(job, buildSubmissionConfig(config, job.channel, gateSession)); }
function createSubmissionJobFromBody(config, channel, body) {
  const pkgPath = body.package_path || resolvePackagePath(config, body.package_filename || '') || (() => {
    if (body.slug) {
      const found = findPackagedArtifact(config, body.slug, channel, body.mode || null);
      return found ? found.path : null;
    }
    return null;
  })();
  if (!pkgPath) throw new Error('package-path-unresolved');
  return createSubmissionJob({ channel, package_path: pkgPath, title: body.title || body.slug || path.basename(pkgPath), slug: body.slug || path.basename(pkgPath, path.extname(pkgPath)), metadata: body.metadata || {} });
}
function enqueueSubmissionJob(config, state, job, gateSession = '') {
  const preview = previewSubmissionContract(job, buildSubmissionConfig(config, job.channel, gateSession));
  const workflow = buildWorkflowPreview(config, job, gateSession);
  const record = createSubmissionJobRecord(job, { ...preview, workflow });
  state = upsertSubmissionJob(state, record);
  state = appendAuditEvent(state, { type: 'submission-job-created', job_id: job.job_id, channel: job.channel, slug: job.slug, fs27_tracked: true });
  return { state, record, preview };
}
async function dispatchSubmissionJob(config, state, jobId, gateSession = '') {
  const record = getSubmissionJob(state, jobId);
  if (!record) throw new Error('submission-job-not-found');
  if (record.status === 'submitted' || record.status === 'completed') return { state, record, idempotent: true, receipt: null };
  if (record.status === 'cancelled') throw new Error('submission-job-cancelled');
  const job = createSubmissionJob({ channel: record.channel, package_path: record.package_path, title: record.title, slug: record.slug, metadata: record.metadata || {} });
  job.job_id = record.job_id;
  const receipt = await submitJob(job, buildSubmissionConfig(config, record.channel, gateSession));
  const updated = markSubmissionJobDispatched(record, receipt);
  state = upsertSubmissionJob(state, updated);
  state.submissions.push(receipt);
  state = appendAuditEvent(state, { type: 'submission-job-dispatched', job_id: jobId, channel: record.channel, slug: record.slug, fs27_tracked: true });
  return { state, record: updated, idempotent: false, receipt };
}
async function syncSubmissionJobStatus(config, state, jobId, gateSession = '') {
  const record = getSubmissionJob(state, jobId);
  if (!record) throw new Error('submission-job-not-found');
  const job = createSubmissionJob({ channel: record.channel, package_path: record.package_path, title: record.title, slug: record.slug, metadata: record.metadata || {} });
  job.job_id = record.job_id;
  const receipt = await querySubmissionStatus(job, buildSubmissionConfig(config, record.channel, gateSession), record.remote_reference);
  const updated = markSubmissionJobStatus(record, receipt);
  state = upsertSubmissionJob(state, updated);
  state = appendAuditEvent(state, { type: 'submission-job-status', job_id: jobId, channel: record.channel, remote_status: receipt.remote_status, fs27_tracked: true });
  return { state, record: updated, receipt };
}
async function cancelSubmissionRecord(config, state, jobId, gateSession = '') {
  const record = getSubmissionJob(state, jobId);
  if (!record) throw new Error('submission-job-not-found');
  const job = createSubmissionJob({ channel: record.channel, package_path: record.package_path, title: record.title, slug: record.slug, metadata: record.metadata || {} });
  job.job_id = record.job_id;
  const receipt = await cancelSubmissionJob(job, buildSubmissionConfig(config, record.channel, gateSession), record.remote_reference);
  const updated = markSubmissionJobCancelled(record, receipt);
  state = upsertSubmissionJob(state, updated);
  state = appendAuditEvent(state, { type: 'submission-job-cancel', job_id: jobId, channel: record.channel, fs27_tracked: true });
  return { state, record: updated, receipt };
}
function planPortalRun(config, state, jobId, options = {}) {
  const record = getSubmissionJob(state, jobId);
  if (!record) throw new Error('submission-job-not-found');
  const job = createSubmissionJob({ channel: record.channel, package_path: record.package_path, title: record.title, slug: record.slug, metadata: record.metadata || {} });
  job.job_id = record.job_id;
  const plan = buildPortalPlan(job, { endpoint: config.submissionEndpoints[record.channel], profile: config.portalProfiles[record.channel], env: process.env, liveProof: options.liveProof === true });
  const updated = options.liveProof === true ? markSubmissionJobPortalLivePlanned(record, plan) : markSubmissionJobPortalPlanned(record, plan);
  state = upsertSubmissionJob(state, updated);
  state = appendAuditEvent(state, { type: 'submission-job-portal-plan', mode: options.liveProof === true ? 'live' : 'standard', job_id: jobId, channel: record.channel, steps: plan.steps.length, fs27_tracked: true });
  return { state, record: updated, plan };
}
async function executePortalRun(config, state, jobId, options = {}) {
  const record = getSubmissionJob(state, jobId);
  if (!record) throw new Error('submission-job-not-found');
  const plan = (options.liveProof === true ? record.portal_live_plan : record.portal_plan) || buildPortalPlan({ channel: record.channel, package_path: record.package_path, title: record.title, slug: record.slug, metadata: record.metadata || {} }, { endpoint: config.submissionEndpoints[record.channel], profile: config.portalProfiles[record.channel], env: process.env, liveProof: options.liveProof === true });
  const outputDir = options.liveProof === true ? path.join(config.liveProofArtifactDir, record.job_id) : path.join(config.portalArtifactDir, record.job_id);
  const receipt = await runPortalAutomation(plan, { outputDir });
  const updated = options.liveProof === true ? markSubmissionJobPortalLiveRun(record, receipt) : markSubmissionJobPortalRun(record, receipt);
  state = upsertSubmissionJob(state, updated);
  state = recordPortalRun(state, { job_id: jobId, channel: record.channel, mode: options.liveProof === true ? 'live' : 'standard', receipt });
  if (options.liveProof === true) state = recordLiveProof(state, { type: 'fs27-portal-run', job_id: jobId, channel: record.channel, target_origin: receipt.target_origin || '', proof_mode: receipt.proof_mode, remote_reference: receipt.remote_reference || null, remote_status: receipt.remote_status || null, ok: receipt.ok === true });
  state = appendAuditEvent(state, { type: 'submission-job-portal-run', mode: options.liveProof === true ? 'live' : 'standard', job_id: jobId, channel: record.channel, ok: receipt.ok === true, fs27_tracked: true });
  return { state, record: updated, receipt, plan };
}

function createServer(env = process.env) {
  const config = createConfig(env);
  const readiness = collectProductionReadiness(config);
  if (config.runtimeMode === 'production' && !readiness.ok) throw new Error(`Production config invalid: ${readiness.blockers.join(', ')}`);
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
      const pathname = routePath(req);
      if (pathname === '/api/health' && req.method === 'GET') {
        const state = loadRuntimeState(config.runtimeStatePath);
        return json(res, 200, { ok: true, auth_provider: 'fs27-skygate', payment_provider: config.paymentProvider, submission_channels: Object.keys(config.submissionEndpoints), runtime: summarizeRuntime(state, config), readiness });
      }
      if (pathname === '/api/runtime/readiness' && req.method === 'GET') return json(res, readiness.ok ? 200 : 409, readiness);

      if (pathname === '/api/auth/login' && req.method === 'POST') {
        let state = loadRuntimeState(config.runtimeStatePath);
        const body = parseJsonBody(await readBody(req));
        const token = extractGateCredentialFromHeaders(req.headers) || body.gate_session || body.access_token || body.token || '';
        const verification = await verifyGateRequest({ headers: buildGateHeaders(token, req.headers) }, env);
        if (!verification.ok) return authResponse(res, verification);
        const identity = verification.identity || {};
        state.auth.operator_logins.push({ operator: body.operator || identity.email || identity.id || config.operator, at: new Date().toISOString(), via: verification.via });
        state = appendAuditEvent(state, { type: 'fs27-auth-login', operator: body.operator || identity.email || identity.id || config.operator, via: verification.via });
        saveState(config, state);
        return json(res, 200, { ok: true, token_type: 'Bearer', access_token: token, refresh_token: null, expires_in: 14400, auth_owner: config.authOwner, identity });
      }

      if (pathname === '/api/auth/verify' && req.method === 'GET') {
        const verification = await requireAuth(req, env);
        return json(res, verification.ok ? 200 : 401, verification);
      }
      if (pathname === '/api/auth/refresh' && req.method === 'POST') {
        const verification = await requireAuth(req, env);
        if (!verification.ok) return authResponse(res, verification);
        const token = extractGateCredentialFromHeaders(req.headers);
        return json(res, 200, { ok: true, token_type: 'Bearer', access_token: token, refresh_token: null, expires_in: 14400, auth_owner: config.authOwner, note: 'FS27 owns refresh; copied app reuses the active gate session.' });
      }
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        let state = loadRuntimeState(config.runtimeStatePath);
        const verification = await requireAuth(req, env);
        if (!verification.ok) return authResponse(res, verification);
        state = appendAuditEvent(state, { type: 'fs27-auth-logout', actor: verification.identity?.email || verification.identity?.id || 'fs27-user' });
        saveState(config, state);
        return json(res, 200, { ok: true, auth_owner: config.authOwner });
      }

      const authlessWebhook = pathname === '/api/payments/webhook/skypay' || pathname === '/api/payments/webhook/stripe';
      let auth = null;
      if (!authlessWebhook && pathname.startsWith('/api/')) {
        auth = await requireAuth(req, env);
        if (!auth.ok) return authResponse(res, auth);
      }
      const gateSession = extractGateCredentialFromHeaders(req.headers);

      if (pathname === '/api/runtime/summary' && req.method === 'GET') {
        const state = loadRuntimeState(config.runtimeStatePath);
        return json(res, 200, { ok: true, runtime: summarizeRuntime(state, config) });
      }
      if (pathname === '/api/runtime/commerce' && req.method === 'GET') {
        const state = loadRuntimeState(config.runtimeStatePath);
        return json(res, 200, { ok: true, commerce: state.commerce, summary: summarizeCommerceState(state.commerce) });
      }
      if ((pathname === '/api/payments/stripe/probe' || pathname === '/api/payments/skypay/probe') && req.method === 'GET') {
        const probe = await probeStripeEnvironment({ provider: 'skypay', apiBase: config.skyPayApiBase, skyPayUrl: config.skyPayUrl });
        return json(res, 200, { ok: true, probe });
      }
      if ((pathname === '/api/payments/stripe/probe/readiness' || pathname === '/api/payments/skypay/readiness') && req.method === 'GET') {
        return json(res, 200, { ok: true, readiness: stripeCredentialReadiness({ provider: 'skypay', apiBase: config.skyPayApiBase }) });
      }
      if ((pathname === '/api/payments/stripe/probe/run' || pathname === '/api/payments/skypay/probe/run') && req.method === 'POST') {
        let state = loadRuntimeState(config.runtimeStatePath);
        const probe = await probeStripeEnvironment({ provider: 'skypay', apiBase: config.skyPayApiBase, skyPayUrl: config.skyPayUrl });
        state.payments.probes.push({ at: new Date().toISOString(), probe });
        state = recordLiveProof(state, { type: 'skypay-probe', provider: probe.provider, provider_mode: probe.provider_mode, api_base: probe.api_base, livemode: false });
        state = appendAuditEvent(state, { type: 'skypay-probe-run', provider_mode: probe.provider_mode });
        saveState(config, state);
        return json(res, 200, { ok: true, probe, readiness: stripeCredentialReadiness({ provider: 'skypay' }), runtime: summarizeRuntime(state, config) });
      }
      if (pathname === '/api/submissions/live-readiness' && req.method === 'GET') {
        const channels = Object.fromEntries(Object.keys(config.portalProfiles).map((channel) => {
          const profile = config.portalProfiles[channel];
          const validation = validateVendorPortalProfile(profile);
          return [channel, { ok: validation.ok, summary: portalTargetSummary(channel, profile), validation }];
        }));
        return json(res, 200, { ok: true, readiness: { schema: 'skye.portal.live.readiness', version: '4.0.0', ok: true, channels } });
      }
      if (pathname === '/api/submissions/targets/validate' && req.method === 'GET') {
        const targets = Object.fromEntries(Object.keys(config.portalProfiles).map((channel) => {
          const profile = config.portalProfiles[channel];
          const validation = validateVendorPortalProfile(profile);
          return [channel, { ok: validation.ok, summary: portalTargetSummary(channel, profile), validation }];
        }));
        return json(res, 200, { ok: true, targets });
      }

      if (pathname === '/api/payments/checkout/session' && req.method === 'POST') {
        let state = loadRuntimeState(config.runtimeStatePath);
        const body = parseJsonBody(await readBody(req));
        const session = await createPaymentSession({
          title: body.title || 'Sovereign Author Publishing OS',
          amount_usd: Number(body.amount_usd || 49),
          customer_email: body.customer_email || 'buyer@example.com',
          success_url: body.success_url || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skypay/success',
          cancel_url: body.cancel_url || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skypay/cancel',
          metadata: body.metadata || {}
        }, { provider: 'skypay', apiBase: config.skyPayApiBase, skyPayUrl: config.skyPayUrl });
        state.payments.pending_sessions.push(session);
        state = appendAuditEvent(state, { type: 'skypay-session-created', provider: session.provider, session_id: session.session_id, actor: auth?.identity?.email || null });
        saveState(config, state);
        return json(res, 200, { ok: true, session, payment_summary: paymentSummary(session) });
      }
      if (pathname.startsWith('/api/payments/checkout/session/') && req.method === 'GET') {
        const sessionId = pathname.split('/').pop();
        const details = await retrieveStripeCheckoutSession(sessionId, { provider: 'skypay', apiBase: config.skyPayApiBase });
        return json(res, 200, { ok: true, session: details, payment_summary: paymentSummary(details) });
      }
      if (pathname.startsWith('/api/payments/reconcile/') && req.method === 'POST') {
        let state = loadRuntimeState(config.runtimeStatePath);
        const sessionId = pathname.split('/').pop();
        const body = parseJsonBody(await readBody(req));
        const authorPackage = readFixturePackage(config);
        const result = await reconcileStripePaymentSession(sessionId, { provider: 'skypay', apiBase: config.skyPayApiBase }, authorPackage, state.commerce, { ownerApproved: body.owner_approved === true, skyPayConfirmed: body.skypay_confirmed === true, customer_email: body.customer_email });
        state.commerce = result.commerce;
        state.payments.reconciliations.push({ session_id: sessionId, at: new Date().toISOString(), finalized: result.finalized, payment_status: result.status.payment_status, status: result.status.status });
        state = appendAuditEvent(state, { type: 'skypay-payment-reconcile', session_id: sessionId, finalized: result.finalized, payment_status: result.status.payment_status });
        saveState(config, state);
        return json(res, result.finalized ? 200 : 409, { ok: result.finalized, result, summary: summarizeCommerceState(state.commerce) });
      }
      if (pathname === '/api/payments/checkout/complete-mock' && req.method === 'POST') {
        let state = loadRuntimeState(config.runtimeStatePath);
        const body = parseJsonBody(await readBody(req));
        const pending = state.payments.pending_sessions.find((item) => item.session_id === body.session_id) || null;
        if (!pending && hasCompletedPaymentSession(state, body.session_id)) return json(res, 200, { ok: true, session: { session_id: body.session_id }, commerce: state.commerce, summary: summarizeCommerceState(state.commerce), idempotent: true });
        if (!pending) return json(res, 404, { ok: false, error: 'missing-session' });
        const authorPackage = readFixturePackage(config);
        const event = { id: `evt_${pending.session_id}`, type: 'skypay.checkout.ledger_proof', data: { object: { id: pending.session_id } } };
        const buyer = { name: body.customer_name || 'SkyPay Ledger Buyer', email: pending.customer_email || body.customer_email || 'buyer@example.com' };
        state.commerce = finalizePayment(event, authorPackage, buyer, state.commerce, { sessionId: pending.session_id });
        state.payments.completed_orders.push({ event_id: event.id, session_id: pending.session_id, provider: pending.provider, status: 'ledger_proof_only_requires_skypay_confirmation', at: new Date().toISOString() });
        state.payments.pending_sessions = state.payments.pending_sessions.filter((item) => item.session_id !== pending.session_id);
        state = appendAuditEvent(state, { type: 'skypay-ledger-proof-complete', session_id: pending.session_id, note: 'Local entitlement proof only; external money movement remains SkyPay-owned.' });
        saveState(config, state);
        return json(res, 200, { ok: true, session: pending, commerce: state.commerce, summary: summarizeCommerceState(state.commerce), money_movement_boundary: 'SkyPay confirmation required outside this copied app.' });
      }
      if (authlessWebhook && req.method === 'POST') {
        const rawBody = await readBody(req);
        const verification = verifyStripeWebhook(rawBody, req.headers['stripe-signature'], env.SKYEPAY_WEBHOOK_SECRET || '');
        if (!verification.ok) return json(res, 400, verification);
        let state = loadRuntimeState(config.runtimeStatePath);
        if (hasProcessedWebhookEvent(state, verification.event.id)) return json(res, 200, { ok: true, verification, summary: summarizeCommerceState(state.commerce), idempotent: true });
        const authorPackage = readFixturePackage(config);
        const buyerEmail = verification.event?.data?.object?.customer_details?.email || verification.event?.data?.object?.customer_email || 'buyer@example.com';
        state.payments.webhook_events.push({ event_id: verification.event.id, type: verification.event.type, at: new Date().toISOString(), provider: 'skypay' });
        state.payments.completed_orders.push({ event_id: verification.event.id, session_id: verification.event?.data?.object?.id || null, provider: 'skypay', at: new Date().toISOString() });
        state.commerce = finalizePayment(verification.event, authorPackage, { name: 'SkyPay Buyer', email: buyerEmail }, state.commerce);
        state = appendAuditEvent(state, { type: 'skypay-webhook', event_id: verification.event.id });
        saveState(config, state);
        return json(res, 200, { ok: true, verification, summary: summarizeCommerceState(state.commerce) });
      }

      if (pathname === '/api/submissions/receipts' && req.method === 'GET') {
        const state = loadRuntimeState(config.runtimeStatePath); return json(res, 200, { ok: true, count: state.submissions.length, submissions: state.submissions });
      }
      if (pathname === '/api/submissions/jobs' && req.method === 'GET') {
        const state = loadRuntimeState(config.runtimeStatePath); return json(res, 200, { ok: true, count: state.submission_jobs.length, jobs: state.submission_jobs });
      }
      if (pathname === '/api/submissions/jobs' && req.method === 'POST') {
        let state = loadRuntimeState(config.runtimeStatePath); const body = parseJsonBody(await readBody(req));
        const job = createSubmissionJobFromBody(config, body.channel, body); const queued = enqueueSubmissionJob(config, state, job, gateSession); state = queued.state; saveState(config, state); return json(res, 200, { ok: true, job: queued.record, preview: queued.preview, runtime: summarizeRuntime(state, config) });
      }
      if (pathname.startsWith('/api/submissions/contracts/') && pathname.endsWith('/portal-profile') && req.method === 'GET') {
        const channel = pathname.split('/').filter(Boolean)[3];
        const profile = config.portalProfiles[channel];
        const validation = validateVendorPortalProfile(profile);
        return json(res, validation.ok ? 200 : 409, { ok: validation.ok, profile, validation });
      }
      if (pathname.startsWith('/api/submissions/contracts/') && pathname.endsWith('/workflow') && req.method === 'POST') {
        const channel = pathname.split('/').filter(Boolean)[3];
        const body = parseJsonBody(await readBody(req));
        const job = createSubmissionJobFromBody(config, channel, body);
        const workflow = buildWorkflowPreview(config, job, gateSession);
        return json(res, 200, { ok: true, workflow });
      }
      if (pathname.startsWith('/api/submissions/contracts/') && req.method === 'POST') {
        const channel = pathname.split('/').pop(); const body = parseJsonBody(await readBody(req)); const job = createSubmissionJobFromBody(config, channel, body); const preview = previewSubmissionContract(job, buildSubmissionConfig(config, channel, gateSession)); return json(res, 200, { ok: true, preview });
      }
      if (pathname === '/api/submissions/from-package' && req.method === 'POST') {
        let state = loadRuntimeState(config.runtimeStatePath); const body = parseJsonBody(await readBody(req)); const found = findPackagedArtifact(config, body.slug, body.channel, body.mode || null); if (!found) return json(res, 404, { ok: false, error: 'package-not-found' });
        const job = createSubmissionJob({ channel: body.channel, package_path: found.path, title: body.title || body.slug, slug: body.slug, metadata: body.metadata || {} }); const queued = enqueueSubmissionJob(config, state, job, gateSession); state = queued.state; saveState(config, state); return json(res, 200, { ok: true, job: queued.record, preview: queued.preview, resolved_package: found, runtime: summarizeRuntime(state, config) });
      }
      const parts = pathParts(req);
      if (parts[0] === 'api' && parts[1] === 'submissions' && parts[2] === 'jobs' && parts[3]) {
        const jobId = parts[3];
        if (req.method === 'GET' && parts.length === 4) {
          const state = loadRuntimeState(config.runtimeStatePath); const record = getSubmissionJob(state, jobId); if (!record) return json(res, 404, { ok: false, error: 'submission-job-not-found' }); return json(res, 200, { ok: true, job: record });
        }
        if (req.method === 'POST' && parts[4] === 'dispatch') {
          let state = loadRuntimeState(config.runtimeStatePath); const result = await dispatchSubmissionJob(config, state, jobId, gateSession); state = result.state; saveState(config, state); return json(res, 200, { ok: true, idempotent: result.idempotent === true, job: result.record, receipt: result.receipt, runtime: summarizeRuntime(state, config) });
        }
        if (req.method === 'POST' && parts[4] === 'status-sync') {
          let state = loadRuntimeState(config.runtimeStatePath); const result = await syncSubmissionJobStatus(config, state, jobId, gateSession); state = result.state; saveState(config, state); return json(res, 200, { ok: true, job: result.record, status_receipt: result.receipt, runtime: summarizeRuntime(state, config) });
        }
        if (req.method === 'POST' && parts[4] === 'cancel') {
          let state = loadRuntimeState(config.runtimeStatePath); const result = await cancelSubmissionRecord(config, state, jobId, gateSession); state = result.state; saveState(config, state); return json(res, 200, { ok: true, job: result.record, cancel_receipt: result.receipt, runtime: summarizeRuntime(state, config) });
        }
        if (req.method === 'POST' && parts[4] === 'portal-plan') {
          let state = loadRuntimeState(config.runtimeStatePath); const result = planPortalRun(config, state, jobId); state = result.state; saveState(config, state); return json(res, 200, { ok: true, job: result.record, plan: result.plan, runtime: summarizeRuntime(state, config) });
        }
        if (req.method === 'POST' && parts[4] === 'portal-run') {
          let state = loadRuntimeState(config.runtimeStatePath); const result = await executePortalRun(config, state, jobId); state = result.state; saveState(config, state); return json(res, 200, { ok: true, job: result.record, receipt: result.receipt, plan: result.plan, runtime: summarizeRuntime(state, config) });
        }
        if (req.method === 'POST' && parts[4] === 'portal-live-plan') {
          let state = loadRuntimeState(config.runtimeStatePath); const result = planPortalRun(config, state, jobId, { liveProof: true }); state = result.state; saveState(config, state); return json(res, 200, { ok: true, job: result.record, plan: result.plan, runtime: summarizeRuntime(state, config) });
        }
        if (req.method === 'POST' && parts[4] === 'portal-live-run') {
          let state = loadRuntimeState(config.runtimeStatePath); const result = await executePortalRun(config, state, jobId, { liveProof: true }); state = result.state; saveState(config, state); return json(res, 200, { ok: true, job: result.record, receipt: result.receipt, plan: result.plan, runtime: summarizeRuntime(state, config) });
        }
      }
      if (pathname.startsWith('/api/submissions/') && req.method === 'POST') {
        let state = loadRuntimeState(config.runtimeStatePath); const channel = pathname.split('/').pop(); const body = parseJsonBody(await readBody(req)); const job = createSubmissionJobFromBody(config, channel, body); const result = enqueueSubmissionJob(config, state, job, gateSession); state = result.state; saveState(config, state); return json(res, 200, { ok: true, job: result.record, preview: result.preview, runtime: summarizeRuntime(state, config) });
      }
      return json(res, 404, { ok: false, error: 'not-found' });
    } catch (error) {
      return json(res, 500, { ok: false, error: error.message });
    }
  });
  return { config, readiness, server };
}

module.exports = { createConfig, collectProductionReadiness, summarizePackageManifest, createServer };
