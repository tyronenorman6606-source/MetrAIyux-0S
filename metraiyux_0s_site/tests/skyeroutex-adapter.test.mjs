import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import siteWorker from '../cloudflare/worker.js';

class MemoryKV {
  constructor() { this.map = new Map(); }
  async put(key, value) { this.map.set(key, String(value)); }
  async get(key, options) {
    const value = this.map.get(key);
    if (value == null) return null;
    return options?.type === 'json' ? JSON.parse(value) : value;
  }
  async list({limit = 1000} = {}) {
    return {keys:[...this.map.keys()].slice(0, limit).map(name => ({name}))};
  }
}

function ctx() {
  return {waitUntil() {}};
}

function env(overrides = {}) {
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset fallthrough:${new URL(request.url).pathname}`, {status:404});
      }
    },
    ...overrides
  };
}

function req(path, {method = 'GET', body, session} = {}) {
  const headers = body ? {'content-type':'application/json'} : {};
  if (session) headers['x-skye-session'] = session;
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

async function call(e, path, options = {}) {
  const response = await siteWorker.fetch(req(path, options), e, ctx());
  const body = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : await response.text();
  return {response, body};
}

async function signupAndLogin(e, user) {
  const signup = await call(e, '/api/routex/auth/signup', {
    method:'POST',
    body:user
  });
  assert.equal(signup.response.status, 201, `${user.email} signup`);

  const login = await call(e, '/api/routex/auth/login', {
    method:'POST',
    body:{email:user.email, password:user.password}
  });
  assert.equal(login.response.status, 200, `${user.email} login`);
  return {id:signup.body.id, session:login.body.session, user:login.body.user};
}

test('ROUTEX-01 maps SkyeRouteX workforce API under /api/routex with compatibility alias', async () => {
  const e = env({ROUTEX_KV:new MemoryKV()});

  const health = await call(e, '/api/routex/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.app_id, 'skyeroutex');
  assert.equal(health.body.base, '/api/routex');
  assert.equal(health.body.mounted, true);
  assert.equal(health.body.status, 'LIVE/PARTIAL');
  assert.equal(health.body.storage_mode, 'kv');
  assert.equal(health.body.aliases.includes('/api/skyeroutex'), true);

  const aliasHealth = await call(e, '/api/skyeroutex/health');
  assert.equal(aliasHealth.response.status, 200);
  assert.equal(aliasHealth.body.base, '/api/routex');

  const manifest = await call(e, '/api/routex/routes/manifest');
  assert.equal(manifest.response.status, 200);
  assert.equal(manifest.body.base, '/api/routex');
  assert.equal(manifest.body.route_families.includes('assignments'), true);
  assert.equal(manifest.body.route_families.includes('ratings'), true);
});

test('ROUTEX-02 moves root workforce APIs under /api/routex', async () => {
  const legacyPaths = [
    '/api/auth/signup',
    '/api/jobs',
    '/api/assignments',
    '/api/markets',
    '/api/ratings'
  ];

  for (const path of legacyPaths) {
    const result = await call(env(), path);
    assert.equal(result.response.status, 409, path);
    assert.equal(result.body.error, 'api_root_collision', path);
    assert.equal(result.body.app_id, 'skyeroutex', path);
    assert.equal(result.body.namespaced_base, '/api/routex', path);
    assert.equal(result.body.namespaced_path, path.replace('/api', '/api/routex'), path);
  }

  const bridge = await readFile(new URL('../assets/js/metraiyux-api-bases.js', import.meta.url), 'utf8');
  assert.match(bridge, /routex:\s*'\/api\/routex'/);
  assert.match(bridge, /skyeroutex:\s*'\/api\/routex'/);

  const appHtml = await readFile(new URL('../SkyeRouteX/workforce-command-v0.4.0/public/index.html', import.meta.url), 'utf8');
  assert.match(appHtml, /metraiyux-api-bases\.js/);
  assert.match(appHtml, /MetrAIyuxApi\.path\('routex'\)/);
});

test('ROUTEX-03 blocks SkyeRouteX implementation source publicly', async () => {
  for (const path of [
    '/SkyeRouteX/workforce-command-v0.4.0/src/server.js',
    '/SkyeRouteX/workforce-command-v0.4.0/src/adapters/workforce-db.js'
  ]) {
    const response = await siteWorker.fetch(req(path), env(), ctx());
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow', path);
    assert.match(await response.text(), /Private implementation source is not public/i, path);
  }
});

test('ROUTEX-04 proves provider signup, contractor board, assignment, route stop, proof, payment, and export', async () => {
  const e = env({ROUTEX_KV:new MemoryKV()});
  const house = await signupAndLogin(e, {
    email:'house-command@routex.local',
    password:'HouseRoute123!',
    name:'House Command',
    role:'house_command',
    city:'Phoenix',
    state:'Arizona'
  });
  const provider = await signupAndLogin(e, {
    email:'provider@routex.local',
    password:'Provider123!',
    name:'Phoenix Provider',
    role:'provider',
    company_name:'Phoenix Provider Group',
    city:'Phoenix',
    state:'Arizona'
  });
  const contractor = await signupAndLogin(e, {
    email:'contractor@routex.local',
    password:'Contractor123!',
    name:'Phoenix Contractor',
    role:'contractor',
    city:'Phoenix',
    state:'Arizona',
    skills:['event', 'route']
  });

  const market = await call(e, '/api/routex/markets', {
    method:'POST',
    session:house.session,
    body:{city:'Phoenix', state:'Arizona', status:'open'}
  });
  assert.equal(market.response.status, 201);
  const marketId = market.body.market.id;

  const job = await call(e, '/api/routex/jobs', {
    method:'POST',
    session:provider.session,
    body:{
      market_id:marketId,
      title:'RouteX proof route lane',
      category:'event',
      description:'Proves one-person acceptance, route, media proof, payment, and export.',
      location:'Phoenix Yard',
      starts_at:'2026-06-01T12:00:00.000Z',
      pay_type:'fixed',
      pay_amount_cents:12000,
      slots:1,
      acceptance_mode:'single',
      proof_required:true,
      route_required:true,
      route_mode:'field_route',
      vehicle_type:'car_or_van',
      pickup_location:'Phoenix Yard',
      dropoff_location:'Mesa Completion Site',
      route_stops:[
        {label:'Pickup', address:'Phoenix Yard', proof_required:true},
        {label:'Complete', address:'Mesa Completion Site', proof_required:true}
      ]
    }
  });
  assert.equal(job.response.status, 201);
  const jobId = job.body.job.id;

  const board = await call(e, '/api/routex/jobs?city=Phoenix&state=Arizona', {session:contractor.session});
  assert.equal(board.response.status, 200);
  assert.equal(board.body.jobs.some(item => item.id === jobId), true);

  const application = await call(e, `/api/routex/jobs/${jobId}/apply`, {
    method:'POST',
    session:contractor.session,
    body:{note:'Ready with route proof.'}
  });
  assert.equal(application.response.status, 201);
  const applicationId = application.body.application.id;

  const applicants = await call(e, `/api/routex/jobs/${jobId}/applicants`, {session:provider.session});
  assert.equal(applicants.response.status, 200);
  assert.equal(applicants.body.applicants.some(item => item.id === applicationId), true);

  const accepted = await call(e, `/api/routex/jobs/${jobId}/accept-applicant`, {
    method:'POST',
    session:provider.session,
    body:{application_id:applicationId}
  });
  assert.equal(accepted.response.status, 201);
  const assignmentId = accepted.body.assignment.id;

  for (const action of ['confirm', 'on-the-way', 'check-in', 'check-out']) {
    const step = await call(e, `/api/routex/assignments/${assignmentId}/${action}`, {
      method:'POST',
      session:contractor.session,
      body:{}
    });
    assert.equal(step.response.status, 200, action);
  }

  const routes = await call(e, '/api/routex/route-jobs', {session:contractor.session});
  assert.equal(routes.response.status, 200);
  assert.equal(routes.body.routes.length, 1);
  const route = routes.body.routes[0];
  const stopId = route.stops[0].id;

  const stop = await call(e, `/api/routex/route-jobs/${route.id}/complete-stop`, {
    method:'POST',
    session:contractor.session,
    body:{stop_id:stopId, proof_note:'Pickup stop completed.'}
  });
  assert.equal(stop.response.status, 200);
  assert.equal(stop.body.stop.status, 'completed');

  const proof = await call(e, `/api/routex/assignments/${assignmentId}/proof`, {
    method:'POST',
    session:contractor.session,
    body:{
      proof_type:'text_with_media',
      body:'Media-backed proof note.',
      media_base64:Buffer.from('RouteX proof media').toString('base64'),
      media_ext:'txt',
      media_mime:'text/plain'
    }
  });
  assert.equal(proof.response.status, 201);
  assert.ok(proof.body.media.storage_path.includes('kv://skyeroutex/proof-media/'));
  assert.equal(proof.body.payment.status, 'approval_pending');

  const approved = await call(e, `/api/routex/assignments/${assignmentId}/approve`, {
    method:'POST',
    session:provider.session,
    body:{}
  });
  assert.equal(approved.response.status, 200);
  assert.equal(approved.body.assignment.status, 'completed');
  assert.equal(approved.body.payment.status, 'payout_eligible');

  const rating = await call(e, '/api/routex/ratings', {
    method:'POST',
    session:provider.session,
    body:{job_id:jobId, to_user_id:contractor.id, score:5, note:'Reliable field work.'}
  });
  assert.equal(rating.response.status, 201);

  const payments = await call(e, '/api/routex/payments/ledger', {session:provider.session});
  assert.equal(payments.response.status, 200);
  assert.equal(payments.body.payments.some(item => item.assignment_id === assignmentId && item.status === 'payout_eligible'), true);

  const packet = await call(e, `/api/routex/jobs/${jobId}/export-packet`, {session:provider.session});
  assert.equal(packet.response.status, 200);
  assert.equal(packet.body.packet.proof_media.length, 1);
  assert.equal(packet.body.packet.payments.some(item => item.status === 'payout_eligible'), true);
  assert.equal(packet.body.packet.ratings.length, 1);
  assert.match(packet.body.export.sha256, /^[a-f0-9]{64}$/);

  const assignments = await call(e, '/api/routex/assignments', {session:contractor.session});
  assert.equal(assignments.response.status, 200);
  assert.equal(assignments.body.assignments[0].status, 'completed');
});
