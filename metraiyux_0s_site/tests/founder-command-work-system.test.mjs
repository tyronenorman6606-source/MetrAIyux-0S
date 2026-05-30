import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const siteWorker = (await import('../cloudflare/worker.js')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
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

test('Founder Command work-system endpoint is owner gated and spans clients plus lanes', async () => {
  const e = env();
  const c = ctx();

  const blocked = await siteWorker.fetch(req('/api/founder-command/work-system'), e, c);
  assert.equal(blocked.status, 401);

  const res = await siteWorker.fetch(req('/api/founder-command/work-system', { headers: AUTH_HEADERS }), e, c);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.schema, 'metraiyux.founder-command.work-system.v1');
  assert.equal(body.founder_account.legal_entity, 'Skyes Over London LC');
  assert.equal(body.founder_account.app_local_passwords_allowed, false);
  assert.ok(body.founder_account.auth_mode.includes('FS27/SkyGate/Free99'));

  const clientNames = body.client_accounts.map((client) => client.display_name);
  assert.ok(clientNames.includes("Bob's Smoke Shop"));
  assert.ok(clientNames.includes('Fade Masters PHX'));
  assert.ok(body.client_accounts.every((client) => client.sovereign_owner_account_id === 'founder-gray-skyes-skyes-over-london-lc'));
  assert.ok(body.client_accounts.every((client) => client.auth_boundary.includes('shared FS27/SkyGate/Free99')));

  const laneNames = body.operating_lanes.map((lane) => lane.name);
  for (const expected of ['AE FlowPro', 'SkyeRouteX Workforce', 'SovereignDocs', 'SkyeMusicNexus', 'SkyPay', 'SkyeMail', 'SkyeNet']) {
    assert.ok(laneNames.includes(expected), `missing lane ${expected}`);
  }
  const expansionNames = body.expansion_lanes.map((lane) => lane.name);
  for (const expected of ['Ascension', 'APEX', 'Crown', 'NEXUS OS', 'Quantum Ops', 'Sentinel']) {
    assert.ok(expansionNames.includes(expected), `missing expansion ${expected}`);
  }
  assert.equal(body.ae_command.contractor_packets.route, '/api/founder-command/contractor-packets');
  assert.equal(body.legal_skyes.route, '/api/sovereigndocs/dispute-committee/work-queues');
  assert.equal(body.legal_skyes.ae_role.hourly_rate_cents, 3100);
  assert.equal(body.metrics.legal_skyes_dispute_cases_open >= 0, true);
  assert.ok(body.action_queues.some((item) => item.id === 'legal-arbitration'));
  assert.ok(body.boundaries.some((line) => line.includes('existing Founder Command')));
});

test('Founder Command operations UI is wired to the work-system endpoint', async () => {
  const html = await fs.readFile(path.join(siteRoot, 'founder-command/index.html'), 'utf8');
  const js = await fs.readFile(path.join(siteRoot, 'founder-command/app.js'), 'utf8');

  assert.match(html, /data-view="operations"/);
  assert.match(html, /companyOpsClientGrid/);
  assert.match(html, /refreshCompanyOpsBtn/);
  assert.match(js, /\/api\/founder-command\/work-system/);
  assert.match(js, /renderCompanyOps/);
});

test('Founder Command work-system handles authenticated local stress', async () => {
  const e = env();
  const c = ctx();
  const requests = Array.from({ length: 75 }, () => (
    siteWorker.fetch(req('/api/founder-command/work-system', { headers: AUTH_HEADERS }), e, c)
  ));
  const responses = await Promise.all(requests);
  assert.equal(responses.every((res) => res.status === 200), true);
  const bodies = await Promise.all(responses.map((res) => res.json()));
  assert.equal(bodies.every((body) => body.ok && body.metrics.client_accounts >= 10), true);
});
