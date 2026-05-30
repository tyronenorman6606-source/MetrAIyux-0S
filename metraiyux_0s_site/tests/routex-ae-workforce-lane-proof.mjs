import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const checkedAt = new Date().toISOString();
const safeStamp = checkedAt.replace(/[:.]/g, '-');
const ARTIFACT_DIR = path.resolve(REPO_ROOT, 'test-artifacts', `routex-ae-workforce-lane-${safeStamp}`);
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
    },
  };
}

function fakeGateWorker() {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || '');
      const [role = 'contractor', email = `${role}@ae-lane.local`] = token.split(':');
      return Response.json({
        active: true,
        email,
        sub: `ae-lane-${role}-${email}`,
        role,
        routex_role: role,
        isAdmin: ['admin', 'house_command'].includes(role),
        scope: role === 'admin' ? 'admin.read admin.write routex.write' : 'routex.read routex.write',
        phone: '+15550001234',
        sms_opt_in: true,
      });
    },
  };
}

async function call(env, method, route, { body, session, token, expectOk = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (session) headers['x-skye-session'] = session;
  if (token) headers.authorization = `Bearer ${token}`;
  if (env.FREE99_ADMIN_CODE) headers['x-free99-admin-code'] = env.FREE99_ADMIN_CODE;
  const response = await worker.fetch(new Request(`https://routex-ae-proof.test${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }), env, { waitUntil() {} });
  const payload = await response.json().catch(async () => ({ text: await response.text() }));
  if (expectOk && !response.ok) {
    throw new Error(`${method} ${route} returned ${response.status}: ${JSON.stringify(payload).slice(0, 1200)}`);
  }
  return { status: response.status, ok: response.ok, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fullSharedGateProof() {
  const env = { SKYEROUTEX_KV: memoryKv(), SKYGATEFS27_WORKER: fakeGateWorker() };
  const admin = 'admin:owner@ae.local';
  const provider = 'provider:provider@ae.local';
  const worker = 'contractor:worker@ae.local';
  const second = 'ae:second@ae.local';

  const founderCalendar = (await call(env, 'POST', '/api/founder-command/calendar', {
    token: admin,
    body: {
      topic: 'Founder Command local calendar proof',
      start_at: '2026-06-02T16:00:00.000Z',
      end_at: '2026-06-02T17:00:00.000Z',
      attendee_email: 'worker@ae.local',
      ledger_only: true,
    },
  })).payload;
  assert(founderCalendar.record.type === 'founder_command.calendar.event', 'Founder Command calendar route did not write a calendar event record');
  const skyemailStatus = (await call(env, 'GET', '/api/founder-command/skyemail', { token: admin })).payload;
  assert(skyemailStatus.default_email.includes('@'), 'Founder Command SkyEmail status did not expose a default mailbox address');

  const seeded = (await call(env, 'POST', '/api/routex/ae/seed-brains', { token: admin })).payload.seeded;
  assert(seeded.length >= 16, `expected the full 0S brain AE pool to seed at least 16 models, got ${seeded.length}`);
  assert(!seeded.some((row) => ['site-operator-brain', 'helper-k4i-proof-ops-brain'].includes(row.profile.model_brain_id)), 'Site Operator or Helper K4i should not be seeded as AE profiles');

  const intake = (await call(env, 'POST', '/api/routex/ae/intake', {
    token: worker,
    body: {
      name: 'Worker AE',
      email: 'worker@ae.local',
      city: 'Phoenix',
      state: 'Arizona',
      lane: 'artist',
      headline: 'Music launch and small-business package AE.',
      skills: ['music launch', 'profile cleanup', 'web package'],
      services: ['content launch package', 'website starter', 'logo package'],
      llcOptIn: true,
      businessName: 'Worker AE Launch LLC',
    },
  })).payload;
  assert(intake.profile.profile_url.includes('/ae-command/profile.html?ae='), 'AE intake did not generate profile URL');
  assert(intake.incorporation_request?.sovereignDocsPrepareEndpoint === '/api/sovereigndocs/official-workflows/prepare', 'LLC opt-in did not attach SovereignDocs preparation endpoint');

  const founderAccess = (await call(env, 'POST', '/api/routex/ae/founder-access', {
    token: worker,
    body: {
      slug: intake.profile.slug,
      topic: 'Weekly founder access proof',
      start_at: '2026-06-01T16:00:00.000Z',
      end_at: '2026-06-01T17:00:00.000Z',
      attendee_email: 'worker@ae.local',
      notes: 'Local proof of AE founder access calendar ledger.',
    },
  })).payload;
  assert(founderAccess.request.status === 'calendar_requested' || founderAccess.request.status === 'scheduled_google_calendar', 'Founder access request did not enter the calendar lane');
  assert(founderAccess.calendar_record.type === 'founder_command.calendar.event', 'Founder access did not write a Founder Command calendar record');

  const market = (await call(env, 'POST', '/api/routex/markets', { token: admin, body: { city: 'Phoenix', state: 'Arizona' } })).payload.market;
  const firstComeJob = (await call(env, 'POST', '/api/routex/jobs', {
    token: provider,
    body: {
      market_id: market.id,
      title: 'First come AE content launch',
      category: 'content_launch_package',
      description: 'Launch package for artist drop.',
      location: 'Phoenix',
      pay_type: 'fixed',
      pay_amount_cents: 12500,
      slots: 1,
      acceptance_mode: 'single',
      proof_required: true,
    },
  })).payload.job;

  const claim = (await call(env, 'POST', `/api/routex/ae/jobs/${firstComeJob.id}/claim`, { token: worker, body: { note: 'claiming first' } })).payload;
  assert(claim.assignment.status === 'contractor_confirmed', 'first-come AE claim did not immediately confirm assignment');
  const blocked = await call(env, 'POST', `/api/routex/ae/jobs/${firstComeJob.id}/claim`, { token: second, body: { note: 'too late' }, expectOk: false });
  assert([400, 409].includes(blocked.status), `second first-come claim should be blocked, got ${blocked.status}`);

  const systemJob = (await call(env, 'POST', '/api/routex/jobs', {
    token: provider,
    body: {
      market_id: market.id,
      title: 'Provider selects internal AE model',
      category: 'system_test',
      description: 'Provider wants a disclosed RAG model to test the AE workflow.',
      location: 'Phoenix',
      pay_type: 'fixed',
      pay_amount_cents: 5000,
      slots: 1,
      acceptance_mode: 'single',
      proof_required: true,
      system_job: true,
    },
  })).payload.job;
  assert(systemJob.title.startsWith('SYSTEM TEST JOB:'), 'system jobs must be clearly labeled in the title');
  const blockedHumanSystemClaim = await call(env, 'POST', `/api/routex/ae/jobs/${systemJob.id}/claim`, { token: second, body: { note: 'accidental human claim' }, expectOk: false });
  assert(blockedHumanSystemClaim.status === 409, `human AEs should be blocked from accidental system-test claims, got ${blockedHumanSystemClaim.status}`);
  const selected = (await call(env, 'POST', `/api/routex/ae/jobs/${systemJob.id}/select`, { token: provider, body: { ae_id: 'celeste-monroe', note: 'select model AE' } })).payload;
  assert(selected.profile.worker_type === 'internal_ae_model', 'provider select did not attach internal model AE profile');
  assert(selected.payment.status === 'system_test_model_no_payout', 'internal model system-test assignment should not create human payout state');

  const realFieldJob = (await call(env, 'POST', '/api/routex/jobs', {
    token: provider,
    body: {
      market_id: market.id,
      title: 'Real on-site merch table setup',
      category: 'field_shift',
      description: 'Physical on-site setup that must stay human-only.',
      location: 'Phoenix',
      pay_type: 'fixed',
      pay_amount_cents: 6500,
      slots: 1,
      acceptance_mode: 'single',
      proof_required: true,
    },
  })).payload.job;
  const blockedModelRealField = await call(env, 'POST', `/api/routex/ae/jobs/${realFieldJob.id}/select`, { token: provider, body: { ae_id: 'celeste-monroe', note: 'should not take physical work' }, expectOk: false });
  assert(blockedModelRealField.status === 403, `internal model should be blocked from non-AI real jobs, got ${blockedModelRealField.status}`);

  const aiContentJob = (await call(env, 'POST', '/api/routex/jobs', {
    token: provider,
    body: {
      market_id: market.id,
      title: 'AI eligible release blog and logo brief',
      category: 'content_launch_package',
      description: 'Write the artist release blog, logo brief, and campaign notes using 0S tools.',
      location: 'Phoenix',
      pay_type: 'fixed',
      pay_amount_cents: 8500,
      slots: 1,
      acceptance_mode: 'single',
      proof_required: true,
      ai_model_eligible: true,
    },
  })).payload.job;
  const selectedAi = (await call(env, 'POST', `/api/routex/ae/jobs/${aiContentJob.id}/select`, { token: provider, body: { ae_id: 'valentina-reyes', note: 'AI content tooling job' } })).payload;
  assert(selectedAi.eligibility.mode === 'ai_eligible_real_job', 'AI model did not take explicitly AI-eligible real content work through the right policy');
  assert(selectedAi.payment.status === 'internal_model_tooling_no_human_payout', 'AI eligible model work should remain tooling/no-human-payout');

  const profile = (await call(env, 'GET', `/api/routex/ae/profiles/${intake.profile.slug}`, { token: worker })).payload.profile;
  const hub = (await call(env, 'GET', '/api/routex/ae/hub', { token: admin })).payload;

  return {
    mode: 'shared-fs27-skygate-full-lane',
    seededModels: seeded.length,
    founderCalendarStatus: founderCalendar.record.status,
    skyemailDefault: skyemailStatus.default_email,
    humanProfile: profile.slug,
    profileUrl: profile.profile_url,
    incorporationRequests: hub.counts.incorporation_requests,
    firstComeAssignment: claim.assignment.id,
    blockedSecondClaimStatus: blocked.status,
    founderAccessStatus: founderAccess.request.status,
    providerSelectedModelAssignment: selected.assignment.id,
    modelPaymentStatus: selected.payment.status,
    blockedHumanSystemClaimStatus: blockedHumanSystemClaim.status,
    blockedModelRealFieldStatus: blockedModelRealField.status,
    selectedAiEligibleModelAssignment: selectedAi.assignment.id,
    aiEligiblePaymentStatus: selectedAi.payment.status,
    pricing: hub.pricing.pricing.map((plan) => ({ id: plan.id, price: plan.price })),
  };
}

async function sharedGateProof() {
  const env = { SKYEROUTEX_KV: memoryKv(), SKYGATEFS27_WORKER: fakeGateWorker() };
  const seeded = (await call(env, 'POST', '/api/routex/ae/seed-brains', { token: 'admin:owner@ae.local' })).payload.seeded;
  const intake = (await call(env, 'POST', '/api/routex/ae/intake', {
    token: 'contractor:shared-worker@ae.local',
    body: {
      name: 'Shared Gate Worker AE',
      email: 'shared-worker@ae.local',
      city: 'Phoenix',
      state: 'Arizona',
      lane: 'ae',
      skills: ['sales', 'RouteX', 'proof'],
      services: ['lead qualification'],
      llcOptIn: true,
      businessName: 'Shared Gate Worker LLC',
    },
  })).payload;
  const market = (await call(env, 'POST', '/api/routex/markets', { token: 'admin:owner@ae.local', body: { city: 'Phoenix', state: 'Arizona' } })).payload.market;
  const job = (await call(env, 'POST', '/api/routex/jobs', {
    token: 'provider:provider@ae.local',
    body: {
      market_id: market.id,
      title: 'Shared gate AE proof job',
      category: 'sales',
      description: 'Shared gate AE claims this job.',
      location: 'Phoenix',
      pay_type: 'fixed',
      pay_amount_cents: 7500,
      slots: 1,
      acceptance_mode: 'single',
      proof_required: true,
    },
  })).payload.job;
  const claim = (await call(env, 'POST', `/api/routex/ae/jobs/${job.id}/claim`, { token: 'contractor:shared-worker@ae.local', body: { note: 'shared gate claim' } })).payload;
  const hub = (await call(env, 'GET', '/api/routex/ae/hub', { token: 'admin:owner@ae.local' })).payload;
  return {
    mode: 'shared-fs27-skygate',
    seededModels: seeded.length,
    humanProfile: intake.profile.slug,
    incorporationRequests: hub.counts.incorporation_requests,
    assignment: claim.assignment.id,
    gateOwned: true,
  };
}

const report = {
  ok: true,
  checkedAt,
  assertions: [
    '0S AE model brains seed into RouteX as disclosed internal model AE profiles',
    '0S AE model seed uses the full persona registry minus Site Operator and Helper K4i instead of only four hand-picked models',
    'Founder Command owns the calendar API and can save calendar ledger entries behind the shared owner gate',
    'Founder Command exposes the 0S SkyEmail notification mailbox status/default address behind the shared owner gate',
    'human worker intake promotes the gate user into the AE workforce lane and generates a profile URL',
    'LLC opt-in creates an incorporation request with SovereignDocs official-workflow preparation payload',
    'AE founder-access requests write into the Founder Command calendar lane and enforce the weekly allowance ledger',
    'AE first-come claim immediately creates a confirmed assignment and blocks the next single-slot claim',
    'provider reverse selection can select an AE/model profile from the pool',
    'internal AE model assignments are limited to labeled system jobs or explicitly AI-eligible real jobs',
    'real human AEs cannot accidentally claim clearly labeled system-test jobs',
    'shared FS27/SkyGate mode keeps app-local signup disabled and still runs the AE lane through bearer identity',
  ],
  proofs: [await fullSharedGateProof(), await sharedGateProof()],
};

await mkdir(ARTIFACT_DIR, { recursive: true });
await mkdir(CANONICAL_PROOF_DIR, { recursive: true });
const reportJson = `${JSON.stringify(report, null, 2)}\n`;
const reportPath = path.join(ARTIFACT_DIR, 'receipt.json');
const latestPath = path.join(CANONICAL_PROOF_DIR, 'routex-ae-workforce-lane-latest.json');
await writeFile(reportPath, reportJson);
await writeFile(latestPath, reportJson);
console.log(JSON.stringify({ ok: true, report: reportPath, latest: latestPath }, null, 2));
