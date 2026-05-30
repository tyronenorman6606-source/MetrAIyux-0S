import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import siteWorker from '../cloudflare/worker.js';

function ctx() {
  return { waitUntil() {} };
}

function env(overrides = {}) {
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset fallthrough:${new URL(request.url).pathname}`, { status: 404 });
      }
    },
    ...overrides
  };
}

function gateWorker() {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      return Response.json({
        active: body.token === 'gate-token',
        sub: 'api-route-test',
        email: 'api-route-test@example.invalid',
        role: 'admin',
        scope: 'admin.read admin.write gateway.invoke'
      });
    }
  };
}

function req(path, options = {}) {
  return new Request(`https://metraiyux.example${path}`, options);
}

function gatedReq(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('authorization', 'Bearer gate-token');
  return req(path, { ...options, headers });
}

function gatedEnv(overrides = {}) {
  return env({ SKYGATEFS27_WORKER: gateWorker(), ...overrides });
}

async function json(response) {
  return response.json();
}

test('API-01/API-05 exposes the full-system route manifest and API base decision', async () => {
  const res = await siteWorker.fetch(gatedReq('/api/0s/route-manifest'), gatedEnv(), ctx());
  assert.equal(res.status, 200);
  const data = await json(res);
  assert.equal(data.ok, true);
  assert.equal(data.routing_model.id, 'full-system-worker-adapter');
  assert.equal(data.api_bases.sovereigndocs, '/api/sovereigndocs');
  assert.equal(data.api_bases.profit, '/api/profit');
  assert.equal(data.api_bases.houseops, '/api/houseops');
  assert.equal(data.api_bases.houseoperations, '/api/houseops');
  assert.equal(data.api_bases.keyGate13th, '/api/key-gate-13th');
  assert.equal(data.api_bases.key_gate_13th, '/api/key-gate-13th');
  assert.equal(data.apps.some((app) => app.id === 'sovereigndocs' && app.health === '/api/sovereigndocs/health'), true);
  assert.equal(data.apps.some((app) => app.id === 'profit' && app.health === '/api/profit/health'), true);
  assert.equal(data.apps.some((app) => app.id === 'houseops' && app.health === '/api/houseops/health'), true);
  assert.equal(data.apps.some((app) => app.id === 'keyGate13th' && app.health === '/api/key-gate-13th/health'), true);
});

test('API-02 publishes a browser API base helper', async () => {
  const source = await readFile(new URL('../assets/js/metraiyux-api-bases.js', import.meta.url), 'utf8');
  assert.match(source, /METRAIYUX_API_BASES/);
  assert.match(source, /sovereigndocs:\s*'\/api\/sovereigndocs'/);
  assert.match(source, /profit:\s*'\/api\/profit'/);
  assert.match(source, /houseops:\s*'\/api\/houseops'/);
  assert.match(source, /keyGate13th:\s*'\/api\/key-gate-13th'/);
  assert.match(source, /window\.MetrAIyuxApi/);
});

test('API-03 maps SovereignDocs shared UI calls to the namespaced base', async () => {
  const workflow = await readFile(new URL('../Free99/apps/sovereigndocs/assets/workflow-ui.js', import.meta.url), 'utf8');
  const bridge = await readFile(new URL('../Free99/apps/sovereigndocs/skye-docx-max/app/sd-bridge.js', import.meta.url), 'utf8');
  assert.match(workflow, /function apiPath/);
  assert.match(workflow, /\/api\/sovereigndocs/);
  assert.match(bridge, /function sdApiPath/);
  assert.match(bridge, /\/api\/sovereigndocs/);
});

test('API-04 app health endpoints return mounted state instead of static 404', async () => {
  const healthPaths = [
    '/api/sovereigndocs/health',
    '/api/kaixu-codestudio/health',
    '/api/skyeroutex/health',
    '/api/skymusicnexus/health',
    '/api/profit/health',
    '/api/houseops/health',
    '/api/marketing-made-easy/health',
    '/api/relay13/health',
    '/api/media/health'
  ];

  for (const path of healthPaths) {
    const res = await siteWorker.fetch(gatedReq(path), gatedEnv(), ctx());
    assert.notEqual(res.status, 404, path);
    const data = await json(res);
    assert.equal(typeof data.mounted, 'boolean', path);
  }
});

test('API-03 legacy root app APIs return a collision diagnostic instead of falling through', async () => {
  const legacyPaths = [
    '/api/v18/workspace/dashboard',
    '/api/cases',
    '/api/platform/projects',
    '/api/jobs',
    '/api/runtime/status',
    '/api/v1/connectlog/health'
  ];

  for (const path of legacyPaths) {
    const res = await siteWorker.fetch(gatedReq(path), gatedEnv(), ctx());
    assert.equal(res.status, 409, path);
    const data = await json(res);
    assert.equal(data.error, 'api_root_collision', path);
    assert.match(data.namespaced_path, /^\/api\/[^/]+\//, path);
  }
});

test('API-01 namespaced app routes rewrite to configured service bindings', async () => {
  const calls = [];
  const res = await siteWorker.fetch(
    req('/api/sovereigndocs/v18/workspace/dashboard?role=admin', {
      headers: { authorization: 'Bearer gate-token' }
    }),
    env({
      SOVEREIGNDOCS_WORKER: {
        async fetch(request) {
          const url = new URL(request.url);
          calls.push({ path: url.pathname, search: url.search });
          return Response.json({ ok: true, path: url.pathname, search: url.search });
        }
      },
      SKYGATEFS27_WORKER: gateWorker()
    }),
    ctx()
  );
  assert.equal(res.status, 200);
  const data = await json(res);
  assert.equal(data.path, '/api/v18/workspace/dashboard');
  assert.equal(data.search, '?role=admin');
  assert.deepEqual(calls, [{ path: '/api/v18/workspace/dashboard', search: '?role=admin' }]);
});

test('API-06 representative app API probes do not produce unexpected 404s', async () => {
  const probes = [
    '/api/routes/manifest',
    '/api/sovereigndocs/v18/workspace/dashboard',
    '/api/kaixu-codestudio/platform/projects',
    '/api/skyeroutex/jobs',
    '/api/skymusicnexus/music-assets',
    '/api/profit/status',
    '/api/houseops/status',
    '/api/key-gate-13th/health',
    '/api/marketing-made-easy/runtime/status',
    '/api/relay13/v1/connectlog/health'
  ];

  for (const path of probes) {
    const res = await siteWorker.fetch(req(path), env(), ctx());
    assert.notEqual(res.status, 404, path);
  }
});
