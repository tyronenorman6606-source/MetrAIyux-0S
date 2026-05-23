import test from 'node:test';
import assert from 'node:assert/strict';
import siteWorker from '../cloudflare/worker.js';
import { runAgenticGrowthScheduleTick } from '../cloudflare/agentic-growth-adapter.mjs';

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

class MemoryQueue {
  constructor() { this.messages = []; }
  async send(message) { this.messages.push(message); }
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
        active: body.token === 'fs27-keygate-token',
        sub: 'key-gate-test',
        email: 'keygate@example.invalid',
        role: 'operator',
        scope: 'gateway.invoke admin.read',
        customer_id: 'workspace-keygate-test'
      });
    }
  };
}

function env(overrides = {}) {
  return {
    SITE_EVENTS_KV: new MemoryKV(),
    SITE_TASK_QUEUE: new MemoryQueue(),
    KEY_GATE_13_MASTER_KEY: 'test-key-gate-13-master-key-material',
    KEY_GATE_13_FINGERPRINT_PEPPER: 'test-key-gate-13-fingerprint-pepper',
    SKYGATEFS27_WORKER: gateWorker(),
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === '/key-gate-13th/' || path === '/key-gate-13th/index.html') {
          return new Response('<!doctype html><title>Key Gate 13th</title><main>Key Gate 13th</main>', {
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

async function createSecret(e, overrides = {}) {
  return call(e, '/api/key-gate-13th/v1/secrets', {
    method: 'POST',
    token: 'fs27-keygate-token',
    body: {
      workspace_id: 'workspace-keygate-test',
      vendorKey: 'semrush',
      label: 'SEMrush test key',
      secret: 'semrush_super_secret_key',
      allowedApps: ['agentic-growth-layer', 'key-gate-13th'],
      scopes: ['agentic-growth:semrush'],
      ...overrides
    }
  });
}

test('Key Gate 13th surface redirects unauthenticated visitors to the shared 0S gate', async () => {
  const response = await siteWorker.fetch(req('/key-gate-13th/', {accept: 'text/html'}), env(), ctx());
  assert.equal(response.status, 302);
  assert.match(response.headers.get('location') || '', /\/admin\/login\.html\?return=%2Fkey-gate-13th%2F/);
  assert.equal(response.headers.get('x-0s-gate'), 'fs27-required');
});

test('Key Gate 13th API rejects ungated calls', async () => {
  const denied = await call(env(), '/api/key-gate-13th/v1/secrets', {method: 'POST', body: {vendorKey: 'semrush', secret: 'blocked'}});
  assert.equal(denied.response.status, 401);
  assert.equal(denied.response.headers.get('x-0s-gate'), 'fs27-required');
});

test('Key Gate 13th mounts in route manifest and renders after FS27 auth', async () => {
  const e = env();
  const manifest = await call(e, '/api/0s/route-manifest', {token: 'fs27-keygate-token'});
  assert.equal(manifest.response.status, 200);
  assert.equal(manifest.body.api_bases.keyGate13th, '/api/key-gate-13th');
  assert.equal(manifest.body.api_bases.key_gate_13th, '/api/key-gate-13th');
  assert.equal(manifest.body.apps.some(app => app.id === 'keyGate13th' && app.health === '/api/key-gate-13th/health'), true);

  const surface = await siteWorker.fetch(req('/key-gate-13th/', {token: 'fs27-keygate-token', accept: 'text/html'}), e, ctx());
  assert.equal(surface.status, 200);
  assert.match(await surface.text(), /Key Gate 13th/);
});

test('Key Gate 13th encrypts provider keys and never returns raw material', async () => {
  const e = env();
  const created = await createSecret(e);
  assert.equal(created.response.status, 201);
  assert.equal(created.body.ok, true);
  assert.equal(created.body.secret.vendor_key, 'semrush');
  assert.equal(created.body.secret.last4, '_key');
  assert.equal(JSON.stringify(created.body).includes('semrush_super_secret_key'), false);
  assert.equal(Boolean(created.body.secret.encrypted), false);

  const stored = [...e.SITE_EVENTS_KV.map.values()].join('\n');
  assert.equal(stored.includes('semrush_super_secret_key'), false);
  assert.match(stored, /ciphertext/);

  const listed = await call(e, '/api/key-gate-13th/v1/secrets?workspace_id=workspace-keygate-test', {token: 'fs27-keygate-token'});
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.items.length, 1);
  assert.equal(JSON.stringify(listed.body).includes('semrush_super_secret_key'), false);
});

test('Key Gate 13th tests, rotates, revokes, and audits a credential', async () => {
  const e = env();
  const created = await createSecret(e);
  const id = created.body.secret.id;

  const tested = await call(e, `/api/key-gate-13th/v1/secrets/${id}/test`, {
    method: 'POST',
    token: 'fs27-keygate-token',
    body: {live: false}
  });
  assert.equal(tested.response.status, 200);
  assert.equal(tested.body.test.status, 'offline-validated');
  assert.equal(tested.body.secret.test_status, 'passed');

  const rotated = await call(e, `/api/key-gate-13th/v1/secrets/${id}/rotate`, {
    method: 'POST',
    token: 'fs27-keygate-token',
    body: {workspace_id: 'workspace-keygate-test', vendorKey: 'semrush', secret: 'semrush_rotated_secret_key', label: 'rotated'}
  });
  assert.equal(rotated.response.status, 200);
  assert.equal(rotated.body.secret.version, 2);
  assert.equal(JSON.stringify(rotated.body).includes('semrush_rotated_secret_key'), false);

  const revoked = await call(e, `/api/key-gate-13th/v1/secrets/${id}/revoke`, {
    method: 'POST',
    token: 'fs27-keygate-token',
    body: {reason: 'test'}
  });
  assert.equal(revoked.response.status, 200);
  assert.equal(revoked.body.secret.status, 'revoked');

  const audit = await call(e, '/api/key-gate-13th/v1/audit?workspace_id=workspace-keygate-test', {token: 'fs27-keygate-token'});
  assert.equal(audit.response.status, 200);
  assert.equal(audit.body.items.some(item => item.type === 'key_gate_13th.secret.revoked'), true);
  assert.equal(JSON.stringify(audit.body).includes('semrush_rotated_secret_key'), false);
});

test('Agentic Growth source pulls use Key Gate refs and reject raw browser credentials', async () => {
  const e = env();
  const created = await createSecret(e);
  const secretRef = {
    id: created.body.secret.id,
    workspace_id: 'workspace-keygate-test',
    vendor_key: 'semrush'
  };

  const rawRejected = await call(e, '/api/agentic-growth/v1/cycles/pull', {
    method: 'POST',
    token: 'fs27-keygate-token',
    body: {
      sourceConfig: {semrush: {apiKey: 'raw_browser_key', domain: 'example.test'}}
    }
  });
  assert.equal(rawRejected.response.status, 400);
  assert.equal(rawRejected.body.error, 'raw_provider_credentials_rejected');

  const priorFetch = globalThis.fetch;
  const providerCalls = [];
  globalThis.fetch = async (url) => {
    providerCalls.push(String(url));
    return new Response('Ph;Po;Nq;Cp;Ur;Tr\nagentic website;8;210;0.2;https://example.test/;12\n', {
      status: 200,
      headers: {'content-type': 'text/plain'}
    });
  };
  try {
    const pulled = await call(e, '/api/agentic-growth/v1/cycles/pull', {
      method: 'POST',
      token: 'fs27-keygate-token',
      body: {
        workspace_id: 'workspace-keygate-test',
        business: {name: 'Key Gate Agentic Co', industry: 'agentic websites', domain: 'example.test', services: ['agentic websites'], locations: ['Phoenix AZ']},
        market: {seedKeywords: ['agentic website phoenix']},
        sourceConfig: {semrush: {credentialRef: secretRef, domain: 'example.test'}}
      }
    });
    assert.equal(pulled.response.status, 200);
    assert.equal(pulled.body.ok, true);
    assert.equal(pulled.body.sourcePullReceipt.receipts.some(item => item.broker === 'key-gate-13th' && item.ok === true), true);
    assert.equal(providerCalls.some(url => url.includes('semrush_super_secret_key')), true);
    assert.equal(JSON.stringify(pulled.body).includes('semrush_super_secret_key'), false);
  } finally {
    globalThis.fetch = priorFetch;
  }
});

test('Agentic Growth projects bind credential refs and scheduled tick queues due monitors', async () => {
  const e = env();
  const created = await createSecret(e);
  const project = await call(e, '/api/agentic-growth/v1/projects', {
    method: 'POST',
    token: 'fs27-keygate-token',
    body: {
      workspace_id: 'workspace-keygate-test',
      name: 'Key Gate Bound Monitor',
      domain: 'example.test',
      credentials: {
        semrush: {credentialRef: {id: created.body.secret.id, workspace_id: 'workspace-keygate-test', vendor_key: 'semrush'}}
      },
      schedule: {enabled: true, cadence: 'daily'}
    }
  });
  assert.equal(project.response.status, 200);
  assert.equal(project.body.project.credentials.semrush.id, created.body.secret.id);

  const c = ctx();
  await runAgenticGrowthScheduleTick(e, c, {source: 'test', execute: true, now: new Date().toISOString()});
  await Promise.all(c.waits);
  assert.equal(e.SITE_TASK_QUEUE.messages.some(message => message.type === 'agentic_growth.scheduled_cycle'), true);
});

test('Key Gate 13th handles concurrent create/list/test operations without leaking secrets', async () => {
  const e = env();
  const creates = await Promise.all(Array.from({length: 36}, (_, index) => createSecret(e, {
    label: `stress-${index}`,
    secret: `stress_secret_${index}_material`,
    vendorKey: index % 2 ? 'cloudflare' : 'semrush',
    allowedApps: ['agentic-growth-layer', 'key-gate-13th']
  })));
  assert.equal(creates.every(item => item.response.status === 201), true);
  const listed = await call(e, '/api/key-gate-13th/v1/secrets?workspace_id=workspace-keygate-test', {token: 'fs27-keygate-token'});
  assert.equal(listed.body.items.length, 36);

  const tests = await Promise.all(listed.body.items.slice(0, 12).map(item => call(e, `/api/key-gate-13th/v1/secrets/${item.id}/test`, {
    method: 'POST',
    token: 'fs27-keygate-token',
    body: {live: false}
  })));
  assert.equal(tests.every(item => item.response.status === 200), true);
  assert.equal([...e.SITE_EVENTS_KV.map.values()].join('\n').includes('stress_secret_'), false);
});
