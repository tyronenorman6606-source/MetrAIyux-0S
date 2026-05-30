import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import worker from '../cloudflare/worker.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

class MemoryKV {
  constructor() {
    this.items = new Map();
  }

  async get(key, options = {}) {
    const stored = this.items.get(key);
    if (!stored) return null;
    if (options.type === 'json') return JSON.parse(stored.value);
    return stored.value;
  }

  async put(key, value, options = {}) {
    this.items.set(key, { value: String(value), options });
  }

  async list({ prefix = '', limit = 1000 } = {}) {
    return {
      keys: [...this.items.keys()]
        .filter((name) => name.startsWith(prefix))
        .slice(0, limit)
        .map((name) => ({ name }))
    };
  }
}

function ctx() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) {
      pending.push(Promise.resolve(promise));
    }
  };
}

function env() {
  return {
    SITE_EVENTS_KV: new MemoryKV(),
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      }
    }
  };
}

async function call(e, path, init = {}) {
  const context = ctx();
  const response = await worker.fetch(new Request(`https://metraiyux.example${path}`, init), e, context);
  await Promise.allSettled(context.pending);
  return response;
}

async function json(response) {
  return response.json();
}

async function issueToken(e, overrides = {}) {
  const response = await call(e, '/api/skyeroutex/tour-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Route Buyer',
      email: 'buyer@example.com',
      phone: '+16025551212',
      company: 'Example Dispatch Co',
      audience: 'platform',
      interest: 'Tour SkyeRouteX Workforce Command',
      message: 'Need dispatch and proof workflow.',
      ...overrides
    })
  });
  return { response, body: await json(response) };
}

test('SkyeRouteX tour token issues a 30-minute read-only token and stores only hashes', async () => {
  const e = env();
  const { response, body } = await issueToken(e);
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.scope, 'skyeroutex.tour.read');
  assert.equal(body.role, 'demo');
  assert.equal(body.workspace, 'skyeroutex-demo');
  assert.equal(body.ttl_seconds, 1800);
  assert.match(body.tourUrl, /\/skyenet\/skyeroutex-logistics\/tour\.html#token=/);
  assert.match(response.headers.get('set-cookie') || '', /skyeroutex_tour_token=/);

  const listed = await e.SITE_EVENTS_KV.list({ prefix: 'skyeroutex:tour-token:' });
  assert.equal(listed.keys.length, 1);
  const stored = await e.SITE_EVENTS_KV.get(listed.keys[0].name, { type: 'json' });
  assert.equal(stored.scope, 'skyeroutex.tour.read');
  assert.equal(stored.ttl_seconds, 1800);
  assert.equal(JSON.stringify(stored).includes(body.token), false);

  const leadKeys = await e.SITE_EVENTS_KV.list({ prefix: 'skyeroutex:tour-lead:' });
  assert.equal(leadKeys.keys.length, 1);
  const lead = await e.SITE_EVENTS_KV.get(leadKeys.keys[0].name, { type: 'json' });
  assert.equal(lead.email, 'buyer@example.com');
  assert.equal(JSON.stringify(lead).includes(body.token), false);
});

test('SkyeRouteX tour token rejects missing lead fields', async () => {
  const e = env();
  const missingName = await issueToken(e, { name: '' });
  assert.equal(missingName.response.status, 400);
  assert.equal(missingName.body.error, 'name_required');

  const missingAudience = await issueToken(e, { audience: 'owner' });
  assert.equal(missingAudience.response.status, 400);
  assert.equal(missingAudience.body.error, 'audience_required');
});

test('SkyeRouteX tour token allows read-only tour access and denies writes', async () => {
  const e = env();
  const { body } = await issueToken(e);

  const status = await call(e, '/api/skyeroutex/tour-token/status', {
    headers: { authorization: `Bearer ${body.token}` }
  });
  assert.equal(status.status, 200);
  const statusBody = await json(status);
  assert.equal(statusBody.active, true);
  assert.equal(statusBody.ttl_seconds, 1800);
  assert.ok(statusBody.seconds_remaining <= 1800);

  const readOnlyDashboard = await call(e, '/SkyeRouteX/dashboard.html', {
    headers: { authorization: `Bearer ${body.token}`, accept: 'text/html' }
  });
  assert.equal(readOnlyDashboard.status, 200);
  assert.equal(await readOnlyDashboard.text(), 'asset:/SkyeRouteX/dashboard.html');

  const readOnlyCanonicalDashboard = await call(e, '/SkyeRouteX/dashboard', {
    headers: { authorization: `Bearer ${body.token}`, accept: 'text/html' }
  });
  assert.equal(readOnlyCanonicalDashboard.status, 200);
  assert.equal(await readOnlyCanonicalDashboard.text(), 'asset:/SkyeRouteX/dashboard');

  const readOnlyCommandRoot = await call(e, '/SkyeRouteX/workforce-command-v0.4.0/', {
    headers: { authorization: `Bearer ${body.token}`, accept: 'text/html' }
  });
  assert.equal(readOnlyCommandRoot.status, 200);
  assert.equal(await readOnlyCommandRoot.text(), 'asset:/SkyeRouteX/workforce-command-v0.4.0/');

  const health = await call(e, '/api/routex/health', {
    headers: { authorization: `Bearer ${body.token}` }
  });
  assert.equal(health.status, 200);
  assert.match((await json(health)).app, /SkyeRouteX/);

  const deniedWrite = await call(e, '/api/routex/jobs', {
    method: 'POST',
    headers: { authorization: `Bearer ${body.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Should not write' })
  });
  assert.equal(deniedWrite.status, 403);
  assert.equal((await json(deniedWrite)).error, 'skyeroutex_tour_read_only');
});

test('SkyeRouteX expired tour token and anonymous private app access are blocked', async () => {
  const e = env();
  const { body } = await issueToken(e);
  const listed = await e.SITE_EVENTS_KV.list({ prefix: 'skyeroutex:tour-token:' });
  const record = await e.SITE_EVENTS_KV.get(listed.keys[0].name, { type: 'json' });
  record.expires_at = new Date(Date.now() - 1000).toISOString();
  await e.SITE_EVENTS_KV.put(listed.keys[0].name, JSON.stringify(record));

  const expired = await call(e, '/api/skyeroutex/tour-token/status', {
    headers: { authorization: `Bearer ${body.token}` }
  });
  assert.equal(expired.status, 401);
  assert.equal((await json(expired)).error, 'skyeroutex_tour_token_expired');

  const anonymous = await call(e, '/SkyeRouteX/', {
    headers: { accept: 'text/html' }
  });
  assert.equal(anonymous.status, 302);
  assert.match(anonymous.headers.get('location') || '', /\/admin\/login\.html/);
});

test('SkyeRouteX operator entry links public visitors into the shared 0S gate only', async () => {
  const target = '/SkyeRouteX/workforce-command-v0.4.0/index.html';
  const anonymous = await call(env(), `/api/skyeroutex/operator-entry?return=${encodeURIComponent(target)}`, {
    headers: { accept: 'text/html' }
  });
  assert.equal(anonymous.status, 302);
  const anonymousLocation = new URL(anonymous.headers.get('location') || 'https://missing.invalid');
  assert.equal(anonymousLocation.pathname, '/admin/login.html');
  assert.equal(anonymousLocation.searchParams.get('return'), target);
  assert.equal(anonymous.headers.get('x-skyeroutex-operator-entry'), 'shared-gate-login');

  const authedEnv = { ...env(), FREE99_ADMIN_CODE: 'test-owner-code' };
  const authed = await call(authedEnv, `/api/skyeroutex/operator-entry?return=${encodeURIComponent(target)}`, {
    headers: { 'x-free99-admin-code': 'test-owner-code', accept: 'text/html' }
  });
  assert.equal(authed.status, 302);
  assert.equal(authed.headers.get('location'), `https://metraiyux.example${target}`);
  assert.equal(authed.headers.get('x-skyeroutex-operator-entry'), 'shared-gate-session');

  const unsafeReturn = await call(authedEnv, '/api/skyeroutex/operator-entry?return=https%3A%2F%2Fevil.example%2Fsteal', {
    headers: { 'x-free99-admin-code': 'test-owner-code', accept: 'text/html' }
  });
  assert.equal(unsafeReturn.status, 302);
  assert.equal(unsafeReturn.headers.get('location'), 'https://metraiyux.example/SkyeRouteX/workforce-command-v0.4.0/index.html');

  const wrongMethod = await call(env(), '/api/skyeroutex/operator-entry', { method: 'POST' });
  assert.equal(wrongMethod.status, 405);

  const tourEnv = env();
  const { body } = await issueToken(tourEnv);
  const tourTokenCannotEnterOperatorApp = await call(tourEnv, `/api/skyeroutex/operator-entry?return=${encodeURIComponent(target)}`, {
    headers: { authorization: `Bearer ${body.token}`, accept: 'text/html' }
  });
  assert.equal(tourTokenCannotEnterOperatorApp.status, 302);
  assert.equal(new URL(tourTokenCannotEnterOperatorApp.headers.get('location') || 'https://missing.invalid').pathname, '/admin/login.html');
});
