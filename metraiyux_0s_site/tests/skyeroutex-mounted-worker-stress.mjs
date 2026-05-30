import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const checkedAt = new Date().toISOString();
const safeStamp = checkedAt.replace(/[:.]/g, '-');
const ARTIFACT_DIR = path.resolve(REPO_ROOT, 'test-artifacts', `skyeroutex-mounted-worker-stress-${safeStamp}`);
const CANONICAL_PROOF_DIR = path.resolve(REPO_ROOT, 'metraiyux_0s_site', 'SkyeRouteX', 'workforce-command-v0.4.0', 'proof');

function memoryKv() {
  const store = new Map();
  return {
    async get(key, opts = {}) {
      const value = store.get(key);
      if (value == null) return null;
      return opts.type === 'json' ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, String(value));
    }
  };
}

function fakeGateWorker() {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || '');
      const [role = 'contractor', email = `${role}@stress.local`] = token.split(':');
      const normalizedRole = role === 'house' ? 'house_command' : role;
      return Response.json({
        active: true,
        email,
        sub: `gate-${normalizedRole}-${email}`,
        role: normalizedRole,
        routex_role: normalizedRole,
        phone: '+15550000002',
        sms_opt_in: true,
        scope: ['admin', 'house_command'].includes(normalizedRole) ? 'admin.read admin.write' : ''
      });
    }
  };
}

function createProviderFetchRecorder() {
  const calls = [];
  const counters = new Map();
  const nextId = (prefix) => {
    const count = (counters.get(prefix) || 0) + 1;
    counters.set(prefix, count);
    return `${prefix}_${String(count).padStart(4, '0')}`;
  };
  const record = async (url, init = {}) => {
    const target = new URL(url);
    const body = init.body instanceof Uint8Array
      ? `[${init.body.byteLength} bytes]`
      : String(init.body || '').slice(0, 500);
    const entry = {
      at: new Date().toISOString(),
      method: init.method || 'GET',
      url: `${target.origin}${target.pathname}`,
      search: target.search,
      body
    };
    calls.push(entry);

    if (target.hostname !== 'provider-stress.local') {
      return Response.json({ ok: false, error: 'unexpected_provider_host', host: target.hostname }, { status: 599 });
    }
    if (target.pathname.includes('/v1/payment_intents')) {
      return Response.json({ id: nextId('pi_stress'), object: 'payment_intent', status: 'requires_capture' }, { status: 201 });
    }
    if (target.pathname.includes('/Messages.json')) {
      return Response.json({ sid: nextId('SMstress'), status: 'queued' }, { status: 201 });
    }
    if (target.pathname.includes('/geocoding/v5/mapbox.places/')) {
      return Response.json({ features: [{ center: [-112.074, 33.448] }] });
    }
    if (target.pathname.includes('/directions/v5/mapbox/')) {
      return Response.json({ routes: [{ distance: 12872, duration: 1544 }] });
    }
    if (target.pathname.includes('/api/v1/hr/applications/invite/') || target.pathname.includes('/api/v1/pm/applications/invite/')) {
      return Response.json({ id: nextId('certn_application'), applicant_id: nextId('certn_applicant'), status: 'invited' }, { status: 201 });
    }
    if (target.pathname.includes('/background-webhook')) {
      return Response.json({ id: nextId('background_webhook'), status: 'queued' }, { status: 202 });
    }
    if (target.pathname.startsWith('/r2/') && (init.method || 'GET').toUpperCase() === 'PUT') {
      return new Response('', { status: 200 });
    }
    return Response.json({ ok: false, error: 'unhandled_provider_path', path: target.pathname }, { status: 599 });
  };

  return { calls, fetch: record };
}

function providerSummary(calls) {
  const summary = {
    stripe_payment_intents: 0,
    twilio_messages: 0,
    mapbox_geocodes: 0,
    mapbox_directions: 0,
    r2_puts: 0,
    certn_invites: 0,
    background_webhooks: 0,
    unexpected: 0
  };
  for (const call of calls) {
    if (call.url.includes('/v1/payment_intents')) summary.stripe_payment_intents += 1;
    else if (call.url.includes('/Messages.json')) summary.twilio_messages += 1;
    else if (call.url.includes('/geocoding/v5/mapbox.places/')) summary.mapbox_geocodes += 1;
    else if (call.url.includes('/directions/v5/mapbox/')) summary.mapbox_directions += 1;
    else if (call.url.includes('/r2/')) summary.r2_puts += 1;
    else if (call.url.includes('/applications/invite/')) summary.certn_invites += 1;
    else if (call.url.includes('/background-webhook')) summary.background_webhooks += 1;
    else summary.unexpected += 1;
  }
  return summary;
}

function makeEnv(complianceMode) {
  const compliance = complianceMode === 'background-webhook'
    ? {
      IDENTITY_COMPLIANCE_PROVIDER: 'background-webhook',
      BACKGROUND_CHECK_WEBHOOK_ENDPOINT: 'https://provider-stress.local/background-webhook',
      BACKGROUND_CHECK_WEBHOOK_SIGNING_SECRET: 'stress-background-secret'
    }
    : {
      IDENTITY_COMPLIANCE_PROVIDER: 'certn',
      CERTN_API_KEY: 'stress-certn-token',
      CERTN_OWNER_ID: '00000000-0000-4000-8000-000000000000',
      CERTN_API_BASE: 'https://provider-stress.local/certn',
      CERTN_INDUSTRY: 'hr',
      CERTN_REQUEST_FLAG: 'request_softcheck'
    };

  return {
    SKYEROUTEX_KV: memoryKv(),
    SKYGATEFS27_WORKER: fakeGateWorker(),
    ROUTEX_PROVIDER_STRICT: '1',
    PAYMENT_PROVIDER: 'stripe',
    STRIPE_SECRET_KEY: 'sk_test_stress',
    STRIPE_API_BASE: 'https://provider-stress.local/stripe',
    NOTIFICATION_PROVIDER: 'twilio',
    TWILIO_ACCOUNT_SID: 'ACstress000000000000000000000000000000',
    TWILIO_AUTH_TOKEN: 'stress-twilio-token',
    TWILIO_FROM_NUMBER: '+15550000001',
    TWILIO_API_BASE: 'https://provider-stress.local/twilio',
    ROUTE_INTELLIGENCE_PROVIDER: 'mapbox',
    MAPBOX_ACCESS_TOKEN: 'stress-mapbox-token',
    MAPBOX_API_BASE: 'https://provider-stress.local/mapbox',
    STORAGE_DRIVER: 'r2',
    STORAGE_ENDPOINT: 'https://provider-stress.local/r2',
    STORAGE_BUCKET: 'skyeroutex-stress',
    STORAGE_ACCESS_KEY_ID: 'stress-access-key',
    STORAGE_SECRET_ACCESS_KEY: 'stress-secret-key',
    STORAGE_REGION: 'auto',
    STORAGE_PREFIX: `stress-${complianceMode}`,
    ...compliance
  };
}

async function call(env, method, route, { body, token, expectOk = true, actions } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await worker.fetch(new Request(`https://skyeroutex-mounted-worker-stress.test${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  }), env, { waitUntil() {} });
  const payload = await response.json().catch(async () => ({ text: await response.text() }));
  actions?.push({ method, route, status: response.status, ok: response.ok });
  if (expectOk && !response.ok) {
    throw new Error(`${method} ${route} returned ${response.status}: ${JSON.stringify(payload)}`);
  }
  return { status: response.status, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function routeStops(index) {
  if (index % 2 === 0) {
    return [
      { label: 'Pickup', address: '100 North 1st Street, Phoenix, AZ', coordinates: [-112.074, 33.448], proof_required: true },
      { label: 'Dropoff', address: '400 East Van Buren Street, Phoenix, AZ', coordinates: [-112.068, 33.451], proof_required: true }
    ];
  }
  return [
    { label: 'Pickup', address: 'Phoenix Convention Center, Phoenix, AZ', proof_required: true },
    { label: 'Dropoff', address: 'Footprint Center, Phoenix, AZ', proof_required: true }
  ];
}

async function runScenario({ complianceMode, iterations, providerCalls }) {
  const env = makeEnv(complianceMode);
  const actions = [];
  const startProviderCall = providerCalls.length;
  const admin = 'admin:routex-admin@stress.local';
  const house = 'house:routex-house@stress.local';

  const disabled = await call(env, 'POST', '/api/routex/auth/signup', {
    token: admin,
    expectOk: false,
    actions,
    body: { email: 'local-auth@stress.local', password: 'Password1234', role: 'provider' }
  });
  assert(disabled.status === 410 && disabled.payload.sharedAuth === true, 'shared gate mode must remove app-local signup');

  const market = (await call(env, 'POST', '/api/routex/markets', {
    token: admin,
    actions,
    body: { city: 'Phoenix', state: 'Arizona', status: 'open' }
  })).payload.market;

  const workflowReceipts = [];
  for (let index = 0; index < iterations; index += 1) {
    const provider = `provider:routex-provider-${complianceMode}-${index}@stress.local`;
    const contractor = `contractor:routex-worker-${complianceMode}-${index}@stress.local`;
    const jobResponse = await call(env, 'POST', '/api/routex/jobs', {
      token: provider,
      actions,
      body: {
        market_id: market.id,
        title: `Mounted stress route ${complianceMode} ${index}`,
        category: index % 2 === 0 ? 'field' : 'delivery',
        description: 'Full mounted Worker execution path with route, payment, notification, proof, export, and compliance dispatch.',
        location: 'Phoenix, Arizona',
        starts_at: new Date(Date.now() + (index + 1) * 3600000).toISOString(),
        pay_type: 'fixed',
        pay_amount_cents: 3500 + index * 125,
        slots: 1,
        acceptance_mode: 'single',
        route_required: true,
        route_mode: 'field_route',
        route_stops: routeStops(index)
      }
    });
    const { job, route, payment } = jobResponse.payload;
    assert(route?.provider_route_status === 'dispatched', 'Mapbox route provider did not dispatch during job creation');
    assert(payment?.provider_dispatch_status === 'dispatched', 'Stripe payment provider did not dispatch during job creation');

    await call(env, 'POST', `/api/routex/jobs/${job.id}/apply`, {
      token: contractor,
      actions,
      body: { note: 'Ready for the mounted stress route.' }
    });
    const applicants = (await call(env, 'GET', `/api/routex/jobs/${job.id}/applicants`, { token: provider, actions })).payload.applicants;
    assert(applicants.length === 1, 'provider applicant pool did not load after contractor applied');
    const contractorId = applicants[0].contractor_id;

    await call(env, 'POST', '/api/routex/provider/roster', {
      token: provider,
      actions,
      body: { contractor_id: contractorId }
    });
    await call(env, 'POST', `/api/routex/autonomous/recommend/${job.id}`, { token: provider, actions, body: {} });
    const accepted = (await call(env, 'POST', `/api/routex/jobs/${job.id}/accept-applicant`, {
      token: provider,
      actions,
      body: { application_id: applicants[0].id }
    })).payload;
    assert(accepted.assignment?.id, 'provider accept did not create an assignment');
    assert(accepted.assignment.status === 'offered', 'assignment was not offered after provider accept');

    const assignmentId = accepted.assignment.id;
    for (const step of ['confirm', 'on-the-way', 'check-in']) {
      await call(env, 'POST', `/api/routex/assignments/${assignmentId}/${step}`, { token: contractor, actions, body: {} });
    }

    const routes = (await call(env, 'GET', '/api/routex/route-jobs', { token: contractor, actions })).payload.routes;
    const activeRoute = routes.find(item => item.job_id === job.id);
    assert(activeRoute?.stops?.length >= 2, 'contractor route view did not include route stops');
    for (const stop of activeRoute.stops) {
      await call(env, 'POST', `/api/routex/route-jobs/${activeRoute.id}/complete-stop`, {
        token: contractor,
        actions,
        body: { stop_id: stop.id, proof_note: `Completed ${stop.label}` }
      });
    }

    await call(env, 'POST', `/api/routex/assignments/${assignmentId}/check-out`, { token: contractor, actions, body: {} });
    const proofPayload = Buffer.from(`proof media ${complianceMode} ${index}`).toString('base64');
    const proof = (await call(env, 'POST', `/api/routex/assignments/${assignmentId}/proof`, {
      token: contractor,
      actions,
      body: { proof_type: 'site_photo_text', body: 'Route completed with stop proof and media artifact.', media_base64: proofPayload, media_mime: 'text/plain', media_ext: 'txt' }
    })).payload;
    assert(proof.media?.external_storage_status === 'stored', 'proof media did not store through object storage');

    const approved = (await call(env, 'POST', `/api/routex/assignments/${assignmentId}/approve`, { token: provider, actions, body: {} })).payload;
    assert(approved.payment?.provider_dispatch_status === 'dispatched', 'provider approval did not dispatch payment provider');

    await call(env, 'POST', '/api/routex/ratings', {
      token: provider,
      actions,
      body: { job_id: job.id, to_user_id: contractorId, score: 5, note: 'Stress test completion rating.' }
    });
    await call(env, 'POST', `/api/routex/house-command/workflow-board/job/${job.id}`, {
      token: house,
      actions,
      body: { status: 'completed', owner: 'RouteX stress agent', checkpoint: 'full path executed', next_action: 'proof archived' }
    });
    const packet = (await call(env, 'GET', `/api/routex/jobs/${job.id}/export-packet`, { token: provider, actions })).payload;
    assert(packet.export?.external_storage_status === 'stored', 'job packet export did not store through object storage');

    if (index === 0) {
      const dispute = (await call(env, 'POST', `/api/routex/assignments/${assignmentId}/dispute`, {
        token: contractor,
        actions,
        body: { type: 'quality_review', body: 'Stress path dispute opened for resolution test.' }
      })).payload.dispute;
      await call(env, 'POST', '/api/routex/house-command/resolve-dispute', {
        token: house,
        actions,
        body: { dispute_id: dispute.id, resolution: 'Resolved during mounted Worker stress test.', payment_status: 'payout_eligible', payment_reason: 'Operator resolution approved payout.' }
      });
    }

    if (index === 1) {
      const ledger = (await call(env, 'GET', '/api/routex/payments/ledger', { token: house, actions })).payload.payments;
      const paymentToFreeze = ledger.find(item => item.job_id === job.id);
      await call(env, 'POST', '/api/routex/house-command/freeze-payment', {
        token: house,
        actions,
        body: { payment_id: paymentToFreeze.id, reason: 'Stress freeze check.' }
      });
    }

    workflowReceipts.push({ job_id: job.id, route_job_id: activeRoute.id, assignment_id: assignmentId, contractor_id: contractorId });
  }

  const manualSubject = workflowReceipts[0].contractor_id;
  const manualCompliance = (await call(env, 'POST', '/api/routex/compliance/manual-checks', {
    token: house,
    actions,
    body: {
      user_id: manualSubject,
      status: 'clear',
      checks: ['consent', 'identity', 'county_record'],
      subject_authorization_recorded: true,
      standalone_disclosure_recorded: true,
      proof_reference: `${complianceMode}-manual-proof`,
      proof_body: `Manual compliance proof for ${complianceMode}.`,
      media_mime: 'text/plain',
      media_ext: 'txt'
    }
  })).payload;
  assert(manualCompliance.proof_media?.external_storage_status === 'stored', 'manual compliance proof did not store through object storage');

  const marketReport = (await call(env, 'GET', '/api/routex/house-command/market-report?city=Phoenix&state=Arizona', { token: house, actions })).payload;
  assert(marketReport.export?.external_storage_status === 'stored', 'market report export did not store through object storage');

  const board = (await call(env, 'GET', '/api/routex/house-command/workflow-board', { token: house, actions })).payload;
  const timeline = (await call(env, 'GET', '/api/routex/house-command/workflow-timeline', { token: house, actions })).payload;
  const ledger = (await call(env, 'GET', '/api/routex/payments/ledger', { token: house, actions })).payload;
  const storage = (await call(env, 'GET', '/api/routex/storage/status', { token: house, actions })).payload;
  const storageIntegrity = (await call(env, 'GET', '/api/routex/storage/integrity', { token: house, actions })).payload;
  const integrations = (await call(env, 'GET', '/api/routex/integrations/status', { token: house, actions })).payload;
  const gateDashboard = (await call(env, 'GET', '/api/routex/gate-dashboard', { token: house, actions })).payload;
  const outbox = (await call(env, 'GET', '/api/routex/integrations/outbox', { token: house, actions })).payload.outbox;

  const externalKinds = new Set(['payment_provider', 'notification_provider', 'route_intelligence', 'proof_storage', 'identity_compliance']);
  const externalRows = outbox.filter(row => externalKinds.has(row.provider_kind) && !String(row.driver || '').startsWith('0s-'));
  const failedExternal = externalRows.filter(row => row.status !== 'dispatched');
  assert(failedExternal.length === 0, `external provider rows failed or stayed pending: ${JSON.stringify(failedExternal.slice(0, 5))}`);
  assert(storage.storage.external_object_storage_configured === true, 'storage status did not report object storage configured');
  assert(storage.storage.proof_media_external_count >= iterations + 1, 'not all proof media rows landed in object storage');
  assert(storage.storage.export_packet_external_count >= iterations + 1, 'not all export packets landed in object storage');
  assert(storageIntegrity.storage_integrity.ok === true, 'storage integrity endpoint failed');
  assert(board.summary.total >= iterations * 2, 'workflow board did not include jobs, routes, and assignments');
  assert(timeline.summary.total >= iterations, 'workflow timeline did not record operator updates');
  assert(ledger.payments.length >= iterations * 2, 'payment ledger did not accumulate job and assignment rows');

  const statuses = Object.fromEntries(integrations.integrations.map(item => [item.name, item]));
  assert(statuses.payment_provider?.status === 'connected', 'payment provider did not report connected');
  assert(statuses.notification_provider?.status === 'connected', 'notification provider did not report connected');
  assert(statuses.route_intelligence?.status === 'connected', 'route intelligence did not report connected');
  assert(statuses.proof_storage?.status === 'connected', 'proof storage did not report connected');
  assert(statuses.identity_compliance?.status === 'connected', 'identity compliance provider did not report connected');
  assert(gateDashboard.auth_contract?.routex_local_passwords_allowed === false, 'gate dashboard did not enforce shared auth contract');
  assert(gateDashboard.feature_readiness?.some(item => item.id === 'sms_notifications' && /recipient/i.test(item.if_missing || '')), 'gate dashboard did not expose SMS recipient onboarding requirement');
  assert(gateDashboard.links?.some(item => String(item.href || '').includes('/apps/skyeroutex/')), 'gate dashboard did not link the FS27 RouteX gate folder');

  const scenarioCalls = providerCalls.slice(startProviderCall);
  const summary = providerSummary(scenarioCalls);
  assert(summary.stripe_payment_intents >= iterations * 4, 'Stripe path did not fire across job, assignment, proof, approval, dispute/freeze states');
  assert(summary.twilio_messages >= iterations * 2, 'Twilio path did not fire for applicant and assignment notifications');
  assert(summary.mapbox_directions >= iterations, 'Mapbox directions path did not fire for every route-required job');
  assert(summary.r2_puts >= iterations + 2, 'R2/object-storage path did not fire for proofs and exports');
  if (complianceMode === 'certn') assert(summary.certn_invites >= iterations + 1, 'Certn path did not fire for assignment and manual compliance');
  if (complianceMode === 'background-webhook') assert(summary.background_webhooks >= iterations + 1, 'background webhook path did not fire for assignment and manual compliance');

  return {
    complianceMode,
    iterations,
    apiActions: actions.length,
    workflows: workflowReceipts.length,
    providerSummary: summary,
    integrationStatuses: integrations.integrations,
    counts: integrations.counts,
    gateDashboard: {
      counts: gateDashboard.counts,
      feature_readiness: gateDashboard.feature_readiness?.map(item => ({ id: item.id, status: item.status }))
    },
    workflowBoard: board.summary,
    workflowTimeline: timeline.summary,
    storage: storage.storage,
    payments: ledger.payments.length,
    outboxRows: outbox.length,
    externalRows: externalRows.length,
    failedExternalRows: failedExternal.length,
    disabledLocalSignupStatus: disabled.status
  };
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  await mkdir(CANONICAL_PROOF_DIR, { recursive: true });
  const recorder = createProviderFetchRecorder();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = recorder.fetch;
  try {
    const scenarios = [
      await runScenario({ complianceMode: 'certn', iterations: 5, providerCalls: recorder.calls }),
      await runScenario({ complianceMode: 'background-webhook', iterations: 2, providerCalls: recorder.calls })
    ];
    const report = {
      ok: true,
      checkedAt,
      artifactDir: ARTIFACT_DIR,
      mountedSurface: '/api/routex',
      authMode: 'shared FS27/SkyGate/Free99 bearer through requireGateAuth',
      stressType: 'mounted Worker full path execution with provider fetch mocks',
      scenarios,
      providerCalls: providerSummary(recorder.calls),
      providerCallCount: recorder.calls.length,
      providerCallUrls: recorder.calls.map(call => ({ method: call.method, url: call.url, search: call.search })),
      assertions: [
        'app-local signup is disabled when shared gate is present',
        'market, job, route, application, roster, assignment, contractor progress, route stops, proof media, approval, dispute, freeze, rating, workflow board, exports, manual compliance, storage, integrations, and outbox paths executed',
        'Stripe-compatible payment path fired and returned provider ids',
        'Twilio-compatible notification path fired and returned message ids',
        'RouteX gate dashboard exposed shared auth contract, feature dependencies, and FS27 app folder link',
        'Mapbox-compatible directions/geocode path fired and enriched route jobs',
        'R2/S3-compatible object storage path fired for proof media and exports',
        'Certn background invite path fired',
        'generic signed background-check webhook path fired as the cheaper/flexible alternative lane',
        'external provider outbox rows finished dispatched with no failed external rows'
      ]
    };
    const reportJson = JSON.stringify(report, null, 2);
    await writeFile(path.join(ARTIFACT_DIR, 'report.json'), reportJson);
    await writeFile(path.join(CANONICAL_PROOF_DIR, `skyeroutex-mounted-worker-stress-${safeStamp}.json`), reportJson);
    await writeFile(path.join(CANONICAL_PROOF_DIR, 'skyeroutex-mounted-worker-stress-latest.json'), reportJson);
    console.log(reportJson);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
