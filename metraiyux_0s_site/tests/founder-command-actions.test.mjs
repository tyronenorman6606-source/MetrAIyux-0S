import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const siteWorker = (await import('../cloudflare/worker.js')).default;

const OWNER_CODE = 'owner-code';
const AUTH_HEADERS = {
  authorization: `Bearer ${OWNER_CODE}`,
  'x-admin-token': OWNER_CODE,
  'x-free99-admin-code': OWNER_CODE
};

function ctx() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) {
      pending.push(Promise.resolve(promise).catch(() => null));
    }
  };
}

function req(pathname, { method = 'GET', headers = {}, body } = {}) {
  return new Request(`https://metraiyux.example${pathname}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

function kvStub() {
  const store = new Map();
  return {
    store,
    async put(key, value) {
      store.set(key, value);
    },
    async get(key, options = {}) {
      const value = store.get(key) || null;
      return options.type === 'json' && value ? JSON.parse(value) : value;
    },
    async list({ prefix = '' } = {}) {
      return { keys: [...store.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })) };
    }
  };
}

function skygateBinding() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/admin/login') {
        return Response.json({
          ok: true,
          token: 'fs27-test-owner-token',
          user: { email: 'owner@example.com', role: 'owner' }
        });
      }
      if (['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'].includes(url.pathname)) {
        return Response.json({
          active: true,
          role: 'owner',
          scope: 'admin.read admin.write keys.write gateway.invoke 0s.owner',
          email: 'owner@example.com',
          username: 'owner@example.com',
          sub: 'owner-test',
          customer_id: 'test-owner'
        });
      }
      return Response.json({ ok: false, error: 'unexpected_skygate_path', path: url.pathname }, { status: 404 });
    }
  };
}

function env() {
  return {
    FREE99_ADMIN_CODE: OWNER_CODE,
    OWNER_ADMIN_SESSION_SECRET: 'test-owner-session-secret',
    SKYGATEFS27_WORKER: skygateBinding(),
    SITE_EVENTS_KV: kvStub()
  };
}

async function jsonFetch(e, c, pathname, init = {}) {
  const response = await siteWorker.fetch(req(pathname, init), e, c);
  return { response, body: await response.json().catch(() => ({})) };
}

test('Founder Command action catalog is owner gated and valuation aligned', async () => {
  const e = env();
  const c = ctx();
  const blocked = await jsonFetch(e, c, '/api/founder-command/actions/catalog');
  assert.equal(blocked.response.status, 401);

  const { response, body } = await jsonFetch(e, c, '/api/founder-command/actions/catalog', { headers: AUTH_HEADERS });
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.schema, 'metraiyux.founder-command.actions.v1');
  assert.ok(body.auth_mode.includes('FS27/SkyGate/Free99'));
  assert.ok(body.actions.some((action) => action.id === 'music.brain-daemon.run-now'));
  assert.ok(body.actions.some((action) => action.id === 'client.enrollment.prepare' && action.queue_only));
  assert.ok(body.actions.some((action) => action.id === 'nexus.proof.ad-hire-enrollment-claim' && action.idempotency_required));
  assert.ok(body.actions.every((action) => action.auth_mode.includes('FS27/SkyGate/Free99')));
  assert.ok(body.boundaries.some((line) => line.includes('No app-specific Founder')));
});

test('Founder Command action planning requires confirmation for live automation', async () => {
  const e = env();
  const c = ctx();
  const { response, body } = await jsonFetch(e, c, '/api/founder-command/actions/plan', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      action_id: 'music.brain-daemon.run-now',
      params: { force: true, reason: 'test run' }
    }
  });

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.action.id, 'music.brain-daemon.run-now');
  assert.equal(body.approval.required, true);
  assert.equal(body.approval.satisfied, false);
  assert.equal(body.idempotency.required, true);
  assert.equal(body.execution.target, '/api/skymusicnexus/music-brain-daemon');
});

test('Founder Command action execution writes Command Bridge receipts', async () => {
  const e = env();
  const c = ctx();
  const { response, body } = await jsonFetch(e, c, '/api/founder-command/actions/execute', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      action_id: 'command-bridge.event.record',
      params: {
        source_app: 'founder-command',
        source_surface: 'actions-test',
        event_type: 'founder_command.test_event',
        summary: 'Founder action test event',
        amount_cents: 1234
      }
    }
  });

  assert.equal(response.status, 201);
  assert.equal(body.ok, true);
  assert.equal(body.receipt.schema, 'metraiyux.founder-command.action-receipt.v1');
  assert.equal(body.receipt.raw_private_payload_stored, false);
  assert.equal(body.result.event.summary, 'Founder action test event');

  const ledger = await jsonFetch(e, c, '/api/0s-command-bridge/events', { headers: AUTH_HEADERS });
  assert.equal(ledger.response.status, 200);
  assert.ok(ledger.body.events.some((event) => event.event_type === 'founder_command.test_event'));
});

test('Founder Command queue-only client enrollment records an owner task', async () => {
  const e = env();
  const c = ctx();
  const { response, body } = await jsonFetch(e, c, '/api/founder-command/actions/execute', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      action_id: 'client.enrollment.prepare',
      confirm: true,
      params: {
        client_id: 'test-client',
        display_name: 'Test Client',
        owner_email: 'owner@example.com',
        priority: 'owner-review'
      }
    }
  });

  assert.equal(response.status, 202);
  assert.equal(body.ok, true);
  assert.equal(body.receipt.status, 'queued_for_owner_runner');
  assert.equal(body.receipt.params.client_id, 'test-client');
  assert.equal(body.result.queue_only, true);
});
