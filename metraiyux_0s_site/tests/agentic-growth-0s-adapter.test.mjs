import test from 'node:test';
import assert from 'node:assert/strict';
import siteWorker from '../cloudflare/worker.js';

class MemoryKV {
  constructor() { this.map = new Map(); }
  async put(key, value) { this.map.set(key, String(value)); }
  async get(key, options) {
    const value = this.map.get(key);
    if (value == null) return null;
    return options?.type === 'json' ? JSON.parse(value) : value;
  }
  async list({prefix = '', limit = 1000} = {}) {
    return {
      keys: [...this.map.keys()]
        .filter(name => !prefix || name.startsWith(prefix))
        .slice(0, limit)
        .map(name => ({name}))
    };
  }
}

function ctx() {
  const waits = [];
  return {
    waits,
    waitUntil(promise) { waits.push(Promise.resolve(promise)); }
  };
}

function gateWorker() {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      return Response.json({
        active: body.token === 'fs27-agentic-token',
        sub: 'agentic-growth-test',
        email: 'agentic-growth@example.invalid',
        role: 'operator',
        scope: 'gateway.invoke admin.read'
      });
    }
  };
}

function env(overrides = {}) {
  return {
    SITE_EVENTS_KV: new MemoryKV(),
    SKYGATEFS27_WORKER: gateWorker(),
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === '/agentic-growth-layer/' || path === '/agentic-growth-layer/index.html') {
          return new Response('<!doctype html><title>Agentic Growth Layer</title><main>Agentic Growth Layer 0S Operator</main>', {
            headers: {'content-type': 'text/html; charset=utf-8'}
          });
        }
        return new Response(`asset:${path}`, {status: 404});
      }
    },
    ...overrides
  };
}

function req(path, {method = 'GET', body, token, accept = 'application/json'} = {}) {
  const headers = {'accept': accept};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

async function call(e, path, options = {}) {
  const c = ctx();
  const response = await siteWorker.fetch(req(path, options), e, c);
  await Promise.all(c.waits);
  const type = response.headers.get('content-type') || '';
  const body = type.includes('application/json') ? await response.json() : await response.text();
  return {response, body};
}

const payload = {
  business: {
    name: 'Agentic Growth Test Co',
    industry: 'local service growth',
    services: ['roof repair', 'emergency leak repair'],
    locations: ['Phoenix AZ', 'Glendale AZ']
  },
  site: {
    previewUrl: 'https://preview.example',
    pages: [
      {url: '/', title: 'Home'},
      {url: '/proof/', title: 'Proof'}
    ]
  },
  market: {
    seedKeywords: ['roof repair phoenix', 'emergency leak repair glendale'],
    competitors: ['https://competitor.example']
  }
};

test('Agentic Growth 0S surface redirects unauthenticated visitors to the shared gate', async () => {
  const response = await siteWorker.fetch(req('/agentic-growth-layer/', {accept: 'text/html'}), env(), ctx());
  assert.equal(response.status, 302);
  assert.match(response.headers.get('location') || '', /\/admin\/login\.html\?return=%2Fagentic-growth-layer%2F/);
  assert.equal(response.headers.get('x-0s-gate'), 'fs27-required');
});

test('Agentic Growth 0S API rejects ungated calls before runtime handling', async () => {
  const denied = await call(env(), '/api/agentic-growth/v1/cycles', {method: 'POST', body: payload});
  assert.equal(denied.response.status, 401);
  assert.equal(denied.response.headers.get('x-0s-gate'), 'fs27-required');
});

test('Agentic Growth 0S API uses FS27 gate auth and writes proof receipts', async () => {
  const e = env();
  const health = await call(e, '/api/agentic-growth/health', {token: 'fs27-agentic-token'});
  assert.equal(health.response.status, 200);
  assert.equal(health.body.auth_mode, 'fs27_shared_gate_only');
  assert.equal(health.body.route_families.includes('POST /api/agentic-growth/v1/cycles'), true);

  const manifest = await call(e, '/api/0s/route-manifest', {token: 'fs27-agentic-token'});
  assert.equal(manifest.response.status, 200);
  assert.equal(manifest.body.api_bases.agenticGrowth, '/api/agentic-growth');
  assert.equal(manifest.body.api_bases.agentic_growth, '/api/agentic-growth');
  assert.equal(manifest.body.apps.some(app => app.id === 'agenticGrowth' && app.health === '/api/agentic-growth/health'), true);

  const cycle = await call(e, '/api/agentic-growth/v1/cycles', {
    method: 'POST',
    token: 'fs27-agentic-token',
    body: payload
  });
  assert.equal(cycle.response.status, 200);
  assert.equal(cycle.body.auth.mode, 'fs27-shared-gate');
  assert.equal(cycle.body.snapshot.mode, 'no-gsc-preview');
  assert.equal(cycle.body.plan.agenticLayer.auth, 'FS27/SkyGate/Free99 shared gate only');
  assert.equal(cycle.body.plan.agenticLayer.noDomainFallback, true);
  assert.ok(cycle.body.plan.prioritizedActions.length >= 5);
  assert.equal(cycle.body.storage.stored, true);

  const ledger = await call(e, '/api/agentic-growth/v1/ledger', {token: 'fs27-agentic-token'});
  assert.equal(ledger.response.status, 200);
  assert.equal(ledger.body.items.length, 1);
  assert.equal(ledger.body.items[0].type, 'agentic_growth.cycle');
});

test('Agentic Growth static operator surface renders after FS27 auth', async () => {
  const response = await siteWorker.fetch(req('/agentic-growth-layer/', {token: 'fs27-agentic-token', accept: 'text/html'}), env(), ctx());
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Agentic Growth Layer 0S Operator/);
});
