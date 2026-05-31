import test from 'node:test';
import assert from 'node:assert/strict';
import siteWorker from '../cloudflare/worker.js';
import adminWorker from '../cloudflare-admin-automation-worker/src/worker.js';
import crownWorker from '../cloudflare-crown-operator/src/worker.js';
import nexusWorker from '../cloudflare-worker-nexus/src/worker.js';
import sentinelWorker from '../cloudflare-sentinel-operator/sentinel-worker.js';
import saasWorker from '../cloudflare-saas-provisioning-worker/src/index.js';
import siteOperatorWorker from '../cloudflare-worker-site-operator/site-operator-worker.js';
import omegaWorker from '../cloudflare-security-gateway-worker/src/worker.js';
import kaixuWorker from '../cloudflare-kaixu-brain/kaixu-worker.js';

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

class MemoryQueue {
  constructor() { this.messages = []; }
  async send(body) { this.messages.push(body); }
}

function ctx() {
  const waits = [];
  return {waits, waitUntil(promise) { waits.push(Promise.resolve(promise)); }};
}

function assetsStub() {
  return {
    async fetch(request) {
      return new Response(`asset:${new URL(request.url).pathname}`, {status:200});
    }
  };
}

function siteEnv(overrides = {}) {
  return {
    ASSETS: assetsStub(),
    SITE_EVENTS_KV: new MemoryKV(),
    SITE_TASK_QUEUE: new MemoryQueue(),
    ...overrides
  };
}

function skygateWorkerMock(claimOverrides = {}) {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || '').trim();
      if (!token) {
        return Response.json({active:false, ok:false, error:'Missing Authorization bearer token.'}, {status:401});
      }
      return Response.json({
        active:true,
        ok:true,
        sub:'fs27-owner-test',
        email:'owner@example.com',
        username:'owner@example.com',
        role:'owner',
        scope:'admin.read admin.write keys.write gateway.invoke',
        scopes:['admin.read', 'admin.write', 'keys.write', 'gateway.invoke'],
        ...claimOverrides
      });
    }
  };
}

function siteEnvWithFs27(overrides = {}, claimOverrides = {}) {
  return siteEnv({
    SKYGATEFS27_WORKER: skygateWorkerMock(claimOverrides),
    ...overrides
  });
}

function saasEnv(overrides = {}) {
  return {
    SAAS_KV: new MemoryKV(),
    ...overrides
  };
}

function installFetchMock() {
  const prior = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({url:String(url), init, body:init.body ? String(init.body) : ''});
    return new Response(JSON.stringify({ok:true, id:'mock_provider'}), {
      status:200,
      headers:{'content-type':'application/json'}
    });
  };
  return {calls, restore(){ globalThis.fetch = prior; }};
}

function req(path, {method = 'GET', token = '', headers = {}, body} = {}) {
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers:{
      ...(body ? {'content-type':'application/json'} : {}),
      ...(token ? {authorization:`Bearer ${token}`} : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

test('SEC-01 blocks nested implementation source paths before static asset serving', async () => {
  const blocked = [
    '/Free99/apps/sovereigndocs/server/routes/index.mjs',
    '/SkyeMusicNexus/netlify/functions/music-drops.js',
    '/SkyeMediaCenter/netlify/functions/media-assets.js',
    '/SkyeRouteX/workforce-command-v0.4.0/src/server.js',
    '/Marketing-Made-Easy/SkyeWebCreatorMax/runtime/local-runtime.mjs',
    '/Marketing-Made-Easy/BrandID-Offline-PWA/runtime/data/ops-journal.json',
    '/Marketing-Made-Easy/BusinessLaunchGo/netlify/functions/neon-health.js',
    '/Marketing-Made-Easy/arizona-growth-index/netlify.toml',
    '/relay13-core-v1.7-connectlog-operator-proof/src/index.js',
    '/relay13-core-v1.7-connectlog-operator-proof/scripts/guardrails-proof.mjs',
    '/relay13-core-v1.7-connectlog-operator-proof/migrations/0001_core.sql',
    '/relay13-core-v1.7-connectlog-operator-proof/.gitignore',
    '/HouseOperations/src/houseops-mcp-runtime.js',
    '/HouseOperations/src/styles.css',
    '/Free99/apps/documorph/package.json',
    '/SkyeProfitConsole/smoke/skyeprofitconsole-p1-smoke.mjs',
    '/SkyeMediaCenter/scripts/deploy.mjs'
  ];

  for (const path of blocked) {
    const res = await siteWorker.fetch(req(path), siteEnv(), ctx());
    assert.equal(res.status, 404, path);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow', path);
  }
});

test('SEC-02 preserves explicit public proof/static allowlist paths', async () => {
  const allowed = [
    '/cloudflare/index.html',
    '/proof/public-browser-proof.json',
    '/favicon.ico'
  ];

  for (const path of allowed) {
    const res = await siteWorker.fetch(req(path), siteEnv(), ctx());
    assert.equal(res.status, 200, path);
  }

  const liveAppProof = await siteWorker.fetch(req('/live/skye-media-center-operator-proof.html'), siteEnv(), ctx());
  assert.equal(liveAppProof.status, 302);
  assert.match(liveAppProof.headers.get('location') || '', /\/admin\/login\.html\?return=/);
});

test('SEC-03 preserves SkyeMail mounted handoff without exposing implementation source', async () => {
  const handoff = await siteWorker.fetch(req('/live/SkyeMail/session-handoff.html?next=dashboard.html&from=test'), siteEnv(), ctx());
  assert.equal(handoff.status, 200);
  assert.equal(handoff.headers.get('x-0s-skyemail-handoff'), 'free99-session');
  assert.match(await handoff.text(), /data-skyemail-session-handoff="true"/);

  const mountedInbox = await siteWorker.fetch(
    req('/live/SkyeMail/dashboard.html', { token:'fs27-owner-token' }),
    siteEnvWithFs27(),
    ctx()
  );
  assert.equal(mountedInbox.status, 302);
  assert.match(mountedInbox.headers.get('location') || '', /^https:\/\/skyemail-platform\.graylondonskyes\.workers\.dev\/dashboard\.html/i);

  const legacyAdminToken = await siteWorker.fetch(
    req('/live/SkyeMail/dashboard.html', { headers: { 'x-admin-token': 'test-admin' } }),
    siteEnv({ ADMIN_TOKEN: 'test-admin' }),
    ctx()
  );
  assert.equal(legacyAdminToken.status, 302);
  assert.match(legacyAdminToken.headers.get('location') || '', /\/admin\/login\.html\?return=/);

  const blockedSource = await siteWorker.fetch(
    req('/live/SkyeMail/netlify/functions/mailbox-provider.js', { headers: { 'x-admin-token': 'test-admin' } }),
    siteEnv({ ADMIN_TOKEN: 'test-admin' }),
    ctx()
  );
  assert.equal(blockedSource.status, 404);
  assert.match(await blockedSource.text(), /Private implementation source is not public/i);
});

test('SEC-04 requires operator auth for site-operator mutation routes', async () => {
  const mutationPaths = [
    '/api/site-operator/route',
    '/api/site-operator/event',
    '/api/site-operator/task'
  ];

  for (const path of mutationPaths) {
    const res = await siteWorker.fetch(req(path, {method:'POST', body:{message:'audit smoke'}}), siteEnv(), ctx());
    assert.equal(res.status, 401, path);
  }

  const e = siteEnvWithFs27();
  const authed = await siteWorker.fetch(
    req('/api/site-operator/task', {method:'POST', token:'fs27-owner-token', body:{title:'authorized smoke'}}),
    e,
    ctx()
  );
  assert.equal(authed.status, 200);
  const data = await authed.json();
  assert.equal(data.ok, true);
  assert.equal(data.task.title, 'authorized smoke');
});

test('SEC-04 rejects legacy admin/free99 codes when FS27 is not configured', async () => {
  const res = await siteWorker.fetch(
    req('/api/site-operator/task', {method:'POST', token:'legacy-admin-code', body:{title:'legacy should fail'}}),
    siteEnv({ADMIN_TOKEN:'legacy-admin-code'}),
    ctx()
  );
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.equal(data.code, 'fs27_required');
  assert.equal(data.local_shared_gate_code, 'disabled');
});

test('SEC-04 gates the site-operator ledger behind FS27 operator auth', async () => {
  const kv = new MemoryKV();
  await kv.put('evt_1', JSON.stringify({id:'evt_1', type:'test'}));

  const blocked = await siteWorker.fetch(req('/api/site-operator/ledger'), siteEnv({SITE_EVENTS_KV:kv}), ctx());
  assert.equal(blocked.status, 401);

  const allowed = await siteWorker.fetch(
    req('/api/site-operator/ledger', {token:'fs27-owner-token'}),
    siteEnvWithFs27({SITE_EVENTS_KV:kv}),
    ctx()
  );
  assert.equal(allowed.status, 200);
  const data = await allowed.json();
  assert.equal(data.ok, true);
  assert.equal(data.events.length, 1);
  assert.equal(data.events[0].id, 'evt_1');
});

test('SEC-04 gates site-operator ledger trailing slash and prefix paths', async () => {
  for (const path of ['/api/site-operator/ledger/', '/api/site-operator/ledger/export']) {
    const kv = new MemoryKV();
    await kv.put('evt_nested', JSON.stringify({id:'evt_nested', type:'test'}));

    const blocked = await siteWorker.fetch(req(path), siteEnv({SITE_EVENTS_KV:kv}), ctx());
    assert.equal(blocked.status, 401, path);

    const allowed = await siteWorker.fetch(
      req(path, {token:'fs27-owner-token'}),
      siteEnvWithFs27({SITE_EVENTS_KV:kv}),
      ctx()
    );
    assert.equal(allowed.status, 200, path);
    const data = await allowed.json();
    assert.equal(data.ok, true, path);
    assert.equal(data.events.some((item) => item.id === 'evt_nested'), true, path);
  }
});

test('SEC-05 blocks unauthenticated crown/nexus/sentinel/omega proxy mutations at the 0S edge', async () => {
  const protectedPaths = [
    ['/api/crown/task', 'CROWN_WORKER'],
    ['/api/nexus/task', 'NEXUS_WORKER'],
    ['/api/sentinel/task', 'SENTINEL_WORKER'],
    ['/api/omega/task', 'OMEGA_WORKER']
  ];

  for (const [path, binding] of protectedPaths) {
    let reached = false;
    const e = siteEnv({
      [binding]: {
        async fetch() {
          reached = true;
          return Response.json({ok:true, reached:true});
        }
      }
    });
    const res = await siteWorker.fetch(req(path, {method:'POST', body:{title:'blocked'}}), e, ctx());
    assert.equal(res.status, 401, path);
    assert.equal(reached, false, `${binding} should not receive unauthenticated mutation`);
  }
});

test('SEC-05 blocks broad public GET/HEAD proxy bypasses before helper workers', async () => {
  const protectedReads = [
    ['/api/admin/status', 'ADMIN_WORKER'],
    ['/api/crown/status', 'CROWN_WORKER'],
    ['/api/nexus/status', 'NEXUS_WORKER'],
    ['/api/sentinel/status', 'SENTINEL_WORKER'],
    ['/api/omega/status', 'OMEGA_WORKER']
  ];

  for (const method of ['GET', 'HEAD']) {
    for (const [path, binding] of protectedReads) {
      let reached = false;
      const e = siteEnv({
        [binding]: {
          async fetch() {
            reached = true;
            return Response.json({ok:true, reached:true});
          }
        }
      });
      const res = await siteWorker.fetch(req(path, {method}), e, ctx());
      assert.equal(res.status, 401, `${method} ${path}`);
      assert.equal(reached, false, `${binding} should not receive unauthenticated ${method} ${path}`);
    }
  }
});

test('SEC-05 gates protected proxy reads and allows FS27-authenticated proxy mutations', async () => {
  const calls = [];
  const e = siteEnvWithFs27({
    CROWN_WORKER: {
      async fetch(request) {
        calls.push({method:request.method, path:new URL(request.url).pathname});
        return Response.json({ok:true, proxied:true});
      }
    }
  });

  const blockedRead = await siteWorker.fetch(req('/api/crown/status'), e, ctx());
  assert.equal(blockedRead.status, 401);
  assert.deepEqual(calls, []);

  const read = await siteWorker.fetch(req('/api/crown/status', {token:'fs27-owner-token'}), e, ctx());
  assert.equal(read.status, 200);

  const write = await siteWorker.fetch(
    req('/api/crown/task', {method:'POST', token:'fs27-owner-token', body:{title:'allowed'}}),
    e,
    ctx()
  );
  assert.equal(write.status, 200);
  assert.deepEqual(calls, [
    {method:'GET', path:'/api/crown/status'},
    {method:'POST', path:'/api/crown/task'}
  ]);
});

test('SEC-05 strips raw admin password/code headers from Worker forwarding', async () => {
  const fs27Calls = [];
  const fs27Binding = {
    async fetch(request) {
      const url = new URL(request.url);
      fs27Calls.push({path:url.pathname, headers:request.headers});
      if (url.pathname === '/auth-introspect') {
        const body = await request.json().catch(() => ({}));
        return Response.json({
          active:Boolean(body.token),
          ok:Boolean(body.token),
          sub:'fs27-owner-test',
          email:'owner@example.com',
          role:'owner',
          scope:'admin.read admin.write gateway.invoke'
        });
      }
      return Response.json({ok:true, forwarded:true});
    }
  };

  const skynet = await siteWorker.fetch(
    req('/api/skyenet/status', {
      token:'fs27-owner-token',
      headers:{
        'x-admin-password':'raw-password',
        'x-admin-token':'raw-admin-token',
        'x-free99-admin-code':'raw-free99-code'
      }
    }),
    siteEnv({SKYGATEFS27_WORKER:fs27Binding}),
    ctx()
  );
  assert.equal(skynet.status, 200);
  const skynetForward = fs27Calls.find((call) => call.path === '/deploy/status');
  assert.ok(skynetForward);
  assert.equal(skynetForward.headers.has('x-admin-password'), false);
  assert.equal(skynetForward.headers.has('x-admin-token'), false);
  assert.equal(skynetForward.headers.has('x-free99-admin-code'), false);
  assert.equal(skynetForward.headers.get('authorization'), 'Bearer fs27-owner-token');

  let proxiedHeaders = null;
  const proxy = await siteWorker.fetch(
    req('/api/crown/status', {
      token:'fs27-owner-token',
      headers:{
        'x-admin-password':'raw-password',
        'x-admin-token':'raw-admin-token',
        'x-free99-admin-code':'raw-free99-code'
      }
    }),
    siteEnvWithFs27({
      CROWN_WORKER: {
        async fetch(request) {
          proxiedHeaders = request.headers;
          return Response.json({ok:true, proxied:true});
        }
      }
    }),
    ctx()
  );
  assert.equal(proxy.status, 200);
  assert.ok(proxiedHeaders);
  assert.equal(proxiedHeaders.has('x-admin-password'), false);
  assert.equal(proxiedHeaders.has('x-admin-token'), false);
  assert.equal(proxiedHeaders.has('x-free99-admin-code'), false);
  assert.equal(proxiedHeaders.get('x-skye-gate-session'), 'fs27-owner-token');
});

test('SEC-05 Relay13 proxy does not stamp gate reads as operator admin upstream', async () => {
  const calls = [];
  const relay13Binding = {
    async fetch(request) {
      calls.push({
        method: request.method,
        path: new URL(request.url).pathname,
        headers: request.headers
      });
      return Response.json({ ok: true, relay13: true });
    }
  };
  const e = siteEnvWithFs27({
    RELAY13_WORKER: relay13Binding,
    ZERO_OS_INTERNAL_PROXY_SECRET: 'internal-proxy-secret',
    RELAY13_API_KEY: 'r13_founder_service_key'
  });

  const read = await siteWorker.fetch(req('/api/relay13/v1/conversations?workspace_id=ws_demo', {
    token: 'fs27-owner-token',
    headers: { 'x-relay13-api-key': 'r13_scoped_read_key' }
  }), e, ctx());
  assert.equal(read.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].path, '/api/v1/conversations');
  assert.equal(calls[0].headers.get('x-relay13-api-key'), 'r13_scoped_read_key');
  assert.equal(calls[0].headers.has('x-0s-shared-gate'), false);
  assert.equal(calls[0].headers.has('x-0s-internal-proxy-secret'), false);
  assert.equal(calls[0].headers.get('authorization'), 'Bearer fs27-owner-token');

  const write = await siteWorker.fetch(req('/api/relay13/v1/conversations', {
    method: 'POST',
    token: 'fs27-owner-token',
    body: { workspace_id: 'ws_demo' }
  }), e, ctx());
  assert.equal(write.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].headers.get('x-0s-shared-gate'), 'operator');
  assert.equal(calls[1].headers.get('x-0s-internal-proxy-secret'), 'internal-proxy-secret');
  assert.equal(calls[1].headers.get('x-relay13-api-key'), 'r13_founder_service_key');
});

test('SEC-05 private SkyeNet surfaces fail closed instead of falling through to assets', async () => {
  let assetReached = false;
  const e = siteEnv({
    ASSETS: {
      async fetch(request) {
        assetReached = true;
        return new Response(`asset:${new URL(request.url).pathname}`, {status:200});
      }
    }
  });
  const html = await siteWorker.fetch(
    req('/skyenet/founder-command/', {headers:{accept:'text/html'}}),
    e,
    ctx()
  );
  assert.equal(html.status, 302);
  assert.match(html.headers.get('location') || '', /\/admin\/login\.html\?return=/);
  assert.equal(assetReached, false);

  const legacy = await siteWorker.fetch(
    req('/skyenet/founder-command/site-data.json', {
      headers:{
        accept:'application/json',
        authorization:'Bearer legacy-admin-code',
        'x-admin-token':'legacy-admin-code'
      }
    }),
    siteEnv({ADMIN_TOKEN:'legacy-admin-code'}),
    ctx()
  );
  assert.equal(legacy.status, 503);
  const body = await legacy.json();
  assert.equal(body.code, 'fs27_required');
  assert.equal(body.local_shared_gate_code, 'disabled');
});

test('SEC-05 confirms admin worker mutations reject missing auth', async () => {
  const adminEnv = {ADMIN_TOKEN:'admin-token', SKYGATEFS27_WORKER:skygateWorkerMock()};
  const protectedAdminMutations = [
    '/api/admin/brain/chat',
    '/api/admin/task',
    '/api/admin/connectors/event',
    '/api/admin/secrets/rotate'
  ];

  for (const path of protectedAdminMutations) {
    const res = await adminWorker.fetch(req(path, {method:'POST', body:{title:'blocked'}}), adminEnv, ctx());
    assert.equal(res.status, 401, path);
  }
});

test('SEC-05 direct admin worker fails closed when only legacy admin token is configured', async () => {
  const res = await adminWorker.fetch(
    req('/api/admin/task', {method:'POST', token:'legacy-admin-code', body:{title:'legacy should fail'}}),
    {ADMIN_TOKEN:'legacy-admin-code'},
    ctx()
  );
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.equal(data.code, 'fs27_required');
});

test('SEC-06 gives public site-operator requests an intake lane without opening operator tasks', async () => {
  const e = siteEnv();
  const intake = await siteWorker.fetch(
    req('/api/site-operator/intake', {method:'POST', body:{message:'public buyer asks for routing help', email:'buyer@example.com'}}),
    e,
    ctx()
  );
  assert.equal(intake.status, 200);
  const data = await intake.json();
  assert.equal(data.ok, true);
  assert.equal(data.intake.status, 'intake_pending_review');
  assert.equal(data.intake.public_intake, true);

  const task = await siteWorker.fetch(
    req('/api/site-operator/task', {method:'POST', body:{title:'should not be public'}}),
    e,
    ctx()
  );
  assert.equal(task.status, 401);
});

test('SEC-06 allows proxy public intake while keeping proxy operator tasks locked', async () => {
  const calls = [];
  const e = siteEnv({
    CROWN_WORKER: {
      async fetch(request) {
        calls.push({method:request.method, path:new URL(request.url).pathname});
        return Response.json({ok:true, intake:{status:'intake_pending_review'}});
      }
    }
  });

  const intake = await siteWorker.fetch(req('/api/crown/intake', {method:'POST', body:{message:'public intake'}}), e, ctx());
  assert.equal(intake.status, 200);

  const task = await siteWorker.fetch(req('/api/crown/task', {method:'POST', body:{title:'blocked task'}}), e, ctx());
  assert.equal(task.status, 401);
  assert.deepEqual(calls, [{method:'POST', path:'/api/crown/intake'}]);
});

test('SEC-06 direct crown/nexus/sentinel workers split intake from operator mutation', async () => {
  const workers = [
    {name:'crown', worker:crownWorker, base:'/api/crown', env:{SKYGATEFS27_WORKER:skygateWorkerMock(), ADMIN_TOKEN:'admin-token'}},
    {name:'nexus', worker:nexusWorker, base:'/api/nexus', env:{SKYGATEFS27_WORKER:skygateWorkerMock(), ADMIN_TOKEN:'admin-token'}},
    {name:'sentinel', worker:sentinelWorker, base:'/api/sentinel', env:{SKYGATEFS27_WORKER:skygateWorkerMock(), ADMIN_TOKEN:'admin-token'}}
  ];

  for (const item of workers) {
    const status = await item.worker.fetch(req(`${item.base}/status`), item.env, ctx());
    assert.equal(status.status, 200, `${item.name} public status`);

    const intake = await item.worker.fetch(req(`${item.base}/intake`, {method:'POST', body:{message:`${item.name} public intake`}}), item.env, ctx());
    assert.equal(intake.status, 200, `${item.name} intake`);
    const data = await intake.json();
    assert.equal(data.intake.status, 'intake_pending_review', `${item.name} intake status`);

    const blocked = await item.worker.fetch(req(`${item.base}/task`, {method:'POST', body:{title:'blocked'}}), item.env, ctx());
    assert.equal(blocked.status, 401, `${item.name} unauth task`);

    const legacyOnly = await item.worker.fetch(req(`${item.base}/task`, {method:'POST', token:'admin-token', body:{title:'legacy blocked'}}), {ADMIN_TOKEN:'admin-token'}, ctx());
    assert.equal(legacyOnly.status, 503, `${item.name} legacy token without FS27`);
    assert.equal((await legacyOnly.json()).code, 'fs27_required', `${item.name} legacy token fs27 code`);

    const ledgerBlocked = await item.worker.fetch(req(`${item.base}/ledger`), item.env, ctx());
    assert.equal(ledgerBlocked.status, 401, `${item.name} unauth ledger`);

    const allowed = await item.worker.fetch(req(`${item.base}/task`, {method:'POST', token:'fs27-owner-token', body:{title:'allowed'}}), item.env, ctx());
    assert.equal(allowed.status, 200, `${item.name} auth task`);
  }
});

test('SEC-06 direct site-operator helper gates ledgers and mutations through FS27 while keeping intake public', async () => {
  const publicIntake = await siteOperatorWorker.fetch(
    req('/api/site-operator/intake', {method:'POST', body:{message:'public buyer route'}}),
    {SITE_OPERATOR_KV:new MemoryKV()},
    ctx()
  );
  assert.equal(publicIntake.status, 200);
  assert.equal((await publicIntake.json()).ok, true);

  const blockedLedger = await siteOperatorWorker.fetch(
    req('/api/site-operator/ledger'),
    {SITE_OPERATOR_KV:new MemoryKV()},
    ctx()
  );
  assert.equal(blockedLedger.status, 401);

  const legacyCode = await siteOperatorWorker.fetch(
    req('/api/site-operator/task', {method:'POST', token:'legacy-admin-code', body:{title:'legacy direct task'}}),
    {SITE_OPERATOR_KV:new MemoryKV(), ADMIN_TOKEN:'legacy-admin-code'},
    ctx()
  );
  assert.equal(legacyCode.status, 503);
  assert.equal((await legacyCode.json()).code, 'fs27_required');

  const allowed = await siteOperatorWorker.fetch(
    req('/api/site-operator/task', {method:'POST', token:'fs27-owner-token', body:{title:'fs27 direct task'}}),
    {SITE_OPERATOR_KV:new MemoryKV(), SKYGATEFS27_WORKER:skygateWorkerMock()},
    ctx()
  );
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).task.title, 'fs27 direct task');
});

test('SEC-06 direct omega and kAIxu workers require FS27 instead of open or local key auth', async () => {
  const omegaScan = await omegaWorker.fetch(
    req('/api/omega/scan', {method:'POST', body:{command:'scan privileged command'}}),
    {},
    ctx()
  );
  assert.equal(omegaScan.status, 401);

  const omegaCustomer = await omegaWorker.fetch(
    req('/api/omega/customer-command', {method:'POST', body:{command:'customer command'}}),
    {},
    ctx()
  );
  assert.equal(omegaCustomer.status, 401);

  const omegaAllowed = await omegaWorker.fetch(
    req('/api/omega/scan', {method:'POST', token:'fs27-owner-token', body:{command:'scan privileged command'}}),
    {SKYGATEFS27_WORKER:skygateWorkerMock()},
    ctx()
  );
  assert.equal(omegaAllowed.status, 200);
  assert.equal((await omegaAllowed.json()).ok, true);

  const kaixuBlocked = await kaixuWorker.fetch(
    req('/chat', {method:'POST', body:{messages:[{role:'user', content:'hi'}]}}),
    {},
    ctx()
  );
  assert.equal(kaixuBlocked.status, 503);
  const kaixuBody = await kaixuBlocked.json();
  assert.equal(kaixuBody.code, 'fs27_required');

  const kaixuDisabledAuthBlocked = await kaixuWorker.fetch(
    req('/chat', {method:'POST', body:{messages:[{role:'user', content:'hi'}]}}),
    {KAIXU_AUTH_REQUIRED:'false'},
    ctx()
  );
  assert.equal(kaixuDisabledAuthBlocked.status, 503);
});

test('SEC-06 keeps RouteX local login/signup disabled behind the shared gate', async () => {
  const e = siteEnvWithFs27({ROUTEX_KV:new MemoryKV()});
  const signup = await siteWorker.fetch(
    req('/api/routex/auth/signup', {
      method:'POST',
      token:'fs27-owner-token',
      body:{email:'driver@example.com', password:'LocalPassword123!', role:'contractor'}
    }),
    e,
    ctx()
  );
  assert.equal(signup.status, 410);
  const signupBody = await signup.json();
  assert.equal(signupBody.productionGate, true);
  assert.equal(signupBody.sharedAuth, true);
  assert.match(signupBody.error, /app-local signup has been removed/i);

  const login = await siteWorker.fetch(
    req('/api/skyeroutex/auth/login', {
      method:'POST',
      token:'fs27-owner-token',
      body:{email:'driver@example.com', password:'LocalPassword123!'}
    }),
    e,
    ctx()
  );
  assert.equal(login.status, 410);
  const loginBody = await login.json();
  assert.equal(loginBody.productionGate, true);
  assert.equal(loginBody.sharedAuth, true);
  assert.match(loginBody.error, /app-local login has been removed/i);
});

test('SEC-06 keeps SkyeCommerce mounted customer password/session behind the shared FS27 gate', async () => {
  const payload = {slug:'demo-store', email:'buyer@example.com', password:'LocalPassword123!'};
  const localCookieLogin = await siteWorker.fetch(
    req('/SkyeCommerce/api/customers/login', {
      method:'POST',
      headers:{cookie:'skye_customer_session=local-customer-session'},
      body:payload
    }),
    siteEnv(),
    ctx()
  );
  assert.equal(localCookieLogin.status, 401);
  assert.equal(localCookieLogin.headers.has('set-cookie'), false);
  assert.match(await localCookieLogin.text(), /0S gate protected surface \/SkyeCommerce\/api\/customers\/login/);

  const legacyAdminTokenLogin = await siteWorker.fetch(
    req('/SkyeCommerce/api/customers/login', {
      method:'POST',
      headers:{
        cookie:'skye_customer_session=local-customer-session',
        authorization:'Bearer legacy-admin-code',
        'x-admin-token':'legacy-admin-code'
      },
      body:payload
    }),
    siteEnv({ADMIN_TOKEN:'legacy-admin-code'}),
    ctx()
  );
  assert.equal(legacyAdminTokenLogin.status, 503);
  assert.equal(legacyAdminTokenLogin.headers.has('set-cookie'), false);
  const legacyBody = await legacyAdminTokenLogin.json();
  assert.equal(legacyBody.code, 'fs27_required');
  assert.equal(legacyBody.local_shared_gate_code, 'disabled');
});

test('SEC-06 rejects SkyeMusicNexus ADMIN_TOKEN without FS27 gate authority', async () => {
  const res = await siteWorker.fetch(
    req('/api/skymusicnexus/music-assets?action=list', {
      headers:{
        authorization:'Bearer legacy-music-admin',
        'x-admin-token':'legacy-music-admin'
      }
    }),
    siteEnv({SKYMUSICNEXUS_KV:new MemoryKV(), ADMIN_TOKEN:'legacy-music-admin'}),
    ctx()
  );
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.code, 'fs27_required');
  assert.equal(body.local_shared_gate_code, 'disabled');
});

test('SEC-07 rate-limits public SaaS signup by source IP', async () => {
  const e = saasEnv({SAAS_SIGNUP_RATE_LIMIT:'2'});
  const headers = {'cf-connecting-ip':'198.51.100.42'};
  const first = await saasWorker.fetch(req('/api/saas/signup', {method:'POST', headers, body:{full_name:'A One', email:'one@realbusiness.com', company_name:'Real Business'}}), e, ctx());
  const second = await saasWorker.fetch(req('/api/saas/signup', {method:'POST', headers, body:{full_name:'A Two', email:'two@realbusiness.com', company_name:'Real Business'}}), e, ctx());
  const third = await saasWorker.fetch(req('/api/saas/signup', {method:'POST', headers, body:{full_name:'A Three', email:'three@realbusiness.com', company_name:'Real Business'}}), e, ctx());

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(third.status, 429);
  const data = await third.json();
  assert.equal(data.error, 'signup_rate_limited');
  assert.equal(data.provider_delivery_suppressed, true);
});

test('SEC-08 blocks invalid/test signup emails before provider delivery', async () => {
  const mock = installFetchMock();
  try {
    const e = saasEnv({
      RESEND_API_KEY:'re_test',
      RESEND_FROM_EMAIL:'MetrAIyux Test <noreply@metraiyux.example>'
    });
    const res = await saasWorker.fetch(
      req('/api/saas/signup', {method:'POST', body:{full_name:'Audit Bot', email:'audit@example.invalid', company_name:'Audit Co'}}),
      e,
      ctx()
    );
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.provider_delivery_suppressed, true);
    assert.equal(mock.calls.length, 0);
  } finally {
    mock.restore();
  }
});

test('SEC-08 permits valid signup delivery and stores it as pending intake', async () => {
  const mock = installFetchMock();
  try {
    const e = saasEnv({
      RESEND_API_KEY:'re_test',
      RESEND_FROM_EMAIL:'MetrAIyux Test <noreply@metraiyux.com>'
    });
    const res = await saasWorker.fetch(
      req('/api/saas/signup', {method:'POST', headers:{'cf-connecting-ip':'203.0.113.7'}, body:{full_name:'Valid Buyer', email:'Buyer@realbusiness.com', company_name:'Real Business'}}),
      e,
      ctx()
    );
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.status, 'intake_pending_review');
    assert.equal(data.skyemerit.email, 'buyer@realbusiness.com');
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.calls[0].url, 'https://api.resend.com/emails');
  } finally {
    mock.restore();
  }
});
