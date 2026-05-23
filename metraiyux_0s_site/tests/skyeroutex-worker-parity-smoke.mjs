import worker from '../cloudflare/worker.js';

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
      const [role = 'contractor', email = `${role}@example.com`] = token.split(':');
      return Response.json({
        active: true,
        email,
        sub: `gate-${role}`,
        role,
        routex_role: role,
        scope: role === 'admin' ? 'admin.read admin.write' : ''
      });
    }
  };
}

async function call(env, method, path, {body, session, token, expectOk = true} = {}) {
  const headers = {'content-type': 'application/json'};
  if (session) headers['x-skye-session'] = session;
  if (token) headers.authorization = `Bearer ${token}`;
  if (env.FREE99_ADMIN_CODE) headers['x-free99-admin-code'] = env.FREE99_ADMIN_CODE;
  const res = await worker.fetch(new Request(`https://skyeroutex-smoke.test${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  }), env, {waitUntil() {}});
  const payload = await res.json().catch(async () => ({text: await res.text()}));
  if (expectOk && !res.ok) {
    throw new Error(`${method} ${path} returned ${res.status}: ${JSON.stringify(payload)}`);
  }
  return {status: res.status, payload};
}

async function runLocalSessionProof() {
  const env = {SKYEROUTEX_KV: memoryKv(), FREE99_ADMIN_CODE: 'local-smoke-admin'};
  await call(env, 'POST', '/api/routex/auth/signup', {body: {email: 'admin@example.com', password: 'Admin12345', name: 'Admin', role: 'admin'}});
  await call(env, 'POST', '/api/routex/auth/signup', {body: {email: 'provider@example.com', password: 'Provider12345', name: 'Provider', role: 'provider', company_name: 'Provider Co'}});
  await call(env, 'POST', '/api/routex/auth/signup', {body: {email: 'worker@example.com', password: 'Worker12345', name: 'Worker', role: 'contractor', city: 'Phoenix', state: 'Arizona', skills: ['field']}});

  const admin = (await call(env, 'POST', '/api/routex/auth/login', {body: {email: 'admin@example.com', password: 'Admin12345'}})).payload.session;
  const provider = (await call(env, 'POST', '/api/routex/auth/login', {body: {email: 'provider@example.com', password: 'Provider12345'}})).payload.session;
  const contractor = (await call(env, 'POST', '/api/routex/auth/login', {body: {email: 'worker@example.com', password: 'Worker12345'}})).payload.session;

  const market = (await call(env, 'POST', '/api/routex/markets', {session: admin, body: {city: 'Phoenix', state: 'Arizona'}})).payload.market;
  const job = (await call(env, 'POST', '/api/routex/jobs', {session: provider, body: {
    market_id: market.id,
    title: 'Route job',
    category: 'field',
    description: 'Route work',
    location: 'Phoenix',
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    pay_type: 'fixed',
    pay_amount_cents: 2500,
    slots: 1,
    acceptance_mode: 'single',
    route_required: true
  }})).payload.job;

  await call(env, 'POST', `/api/routex/jobs/${job.id}/apply`, {session: contractor, body: {note: 'ready'}});
  const applicants = (await call(env, 'GET', `/api/routex/jobs/${job.id}/applicants`, {session: provider})).payload.applicants;
  await call(env, 'POST', '/api/routex/provider/roster', {session: provider, body: {contractor_id: applicants[0].contractor_id}});
  const accepted = (await call(env, 'POST', `/api/routex/jobs/${job.id}/accept-applicant`, {session: provider, body: {application_id: applicants[0].id}})).payload;
  await call(env, 'POST', `/api/routex/assignments/${accepted.assignment.id}/confirm`, {session: contractor});
  await call(env, 'POST', `/api/routex/assignments/${accepted.assignment.id}/proof`, {session: contractor, body: {proof_type: 'text', body: 'done'}});
  await call(env, 'POST', `/api/routex/assignments/${accepted.assignment.id}/approve`, {session: provider});
  await call(env, 'POST', `/api/routex/house-command/workflow-board/job/${job.id}`, {session: admin, body: {status: 'active', owner: 'Admin', checkpoint: 'checked', next_action: 'close'}});

  const board = (await call(env, 'GET', '/api/routex/house-command/workflow-board', {session: admin})).payload;
  const paymentLedger = (await call(env, 'GET', '/api/routex/payments/ledger', {session: admin})).payload;
  const integrations = (await call(env, 'GET', '/api/routex/integrations/status', {session: admin})).payload;
  const compliance = (await call(env, 'GET', '/api/routex/compliance/checks', {session: admin})).payload;
  const packet = (await call(env, 'GET', `/api/routex/jobs/${job.id}/export-packet`, {session: admin})).payload;
  const report = (await call(env, 'GET', '/api/routex/house-command/market-report?city=Phoenix&state=Arizona', {session: admin})).payload;

  return {
    mode: 'local-session-fallback',
    job: job.id,
    assignment: accepted.assignment.id,
    boardItems: board.summary.total,
    paymentRows: paymentLedger.payments.length,
    integrations: integrations.integrations.length,
    complianceRows: compliance.compliance_checks.length,
    packetProofRows: packet.packet.proof_items.length,
    reportJobs: report.report.totals.jobs
  };
}

async function runSharedGateProof() {
  const env = {SKYEROUTEX_KV: memoryKv(), SKYGATEFS27_WORKER: fakeGateWorker()};
  const disabled = await call(env, 'POST', '/api/routex/auth/signup', {
    token: 'admin:admin@example.com',
    body: {email: 'x@example.com', password: 'Password123', name: 'X', role: 'provider'},
    expectOk: false
  });
  if (disabled.status !== 503 || disabled.payload.sharedAuth !== true) {
    throw new Error(`Expected app-local signup to be disabled in shared-gate mode, got ${disabled.status}: ${JSON.stringify(disabled.payload)}`);
  }

  const market = (await call(env, 'POST', '/api/routex/markets', {token: 'admin:admin@example.com', body: {city: 'Phoenix', state: 'Arizona'}})).payload.market;
  const job = (await call(env, 'POST', '/api/routex/jobs', {token: 'provider:provider@example.com', body: {
    market_id: market.id,
    title: 'Shared gate route job',
    category: 'field',
    description: 'Route work',
    location: 'Phoenix',
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    pay_type: 'fixed',
    pay_amount_cents: 2500,
    slots: 1,
    acceptance_mode: 'single',
    route_required: true
  }})).payload.job;
  await call(env, 'POST', `/api/routex/jobs/${job.id}/apply`, {token: 'contractor:worker@example.com', body: {note: 'shared gate worker'}});
  const applicants = (await call(env, 'GET', `/api/routex/jobs/${job.id}/applicants`, {token: 'provider:provider@example.com'})).payload.applicants;
  await call(env, 'POST', '/api/routex/house-command/assign', {token: 'admin:admin@example.com', body: {job_id: job.id, contractor_id: applicants[0].contractor_id}});
  const board = (await call(env, 'GET', '/api/routex/house-command/workflow-board', {token: 'admin:admin@example.com'})).payload;
  const paymentLedger = (await call(env, 'GET', '/api/routex/payments/ledger', {token: 'admin:admin@example.com'})).payload;

  return {
    mode: 'shared-fs27-skygate',
    appLocalSignupStatus: disabled.status,
    job: job.id,
    applicants: applicants.length,
    boardItems: board.summary.total,
    paymentRows: paymentLedger.payments.length
  };
}

const local = await runLocalSessionProof();
const shared = await runSharedGateProof();
console.log(JSON.stringify({
  ok: true,
  checkedAt: new Date().toISOString(),
  proofs: [local, shared]
}, null, 2));
