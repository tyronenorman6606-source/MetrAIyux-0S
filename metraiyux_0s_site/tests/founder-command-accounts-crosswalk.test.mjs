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

function assetsBinding() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const clean = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const file = path.join(siteRoot, clean);
      try {
        const body = await fs.readFile(file);
        return new Response(body, {
          headers: { 'content-type': clean.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8' }
        });
      } catch {
        return new Response('not found', { status: 404 });
      }
    }
  };
}

function env() {
  return {
    FREE99_ADMIN_CODE: OWNER_CODE,
    OWNER_ADMIN_SESSION_SECRET: 'test-owner-session-secret',
    SKYGATEFS27_WORKER: skygateBinding(),
    SITE_EVENTS_KV: kvStub(),
    ASSETS: assetsBinding()
  };
}

async function jsonFetch(e, c, pathname, init = {}) {
  const response = await siteWorker.fetch(req(pathname, init), e, c);
  return { response, body: await response.json().catch(() => ({})) };
}

test('Founder Command accounts crosswalk reads all Valley Verified accounts behind owner auth', async () => {
  const e = env();
  const c = ctx();
  const blocked = await jsonFetch(e, c, '/api/founder-command/accounts?limit=5');
  assert.equal(blocked.response.status, 401);

  const { response, body } = await jsonFetch(e, c, '/api/founder-command/accounts?limit=1000', { headers: AUTH_HEADERS });
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.schema, 'metraiyux.founder-command.accounts.v1');
  assert.equal(body.source_counts.businesses, 339);
  assert.equal(body.counts.accounts, 339);
  assert.equal(body.counts.returned, 339);
  assert.equal(body.counts.ae_work_orders, 339);
  assert.equal(body.counts.skyemail_ready, 339);
  assert.ok(body.accounts.some((account) => account.display_name === "Bob's Smoke Shop"));
  assert.ok(body.accounts.every((account) => account.auth_boundary.includes('FS27/SkyGate/Free99')));
});

test('Founder Command account detail joins AE, SkyeMail, and Valley routes', async () => {
  const e = env();
  const c = ctx();
  const { response, body } = await jsonFetch(e, c, '/api/founder-command/accounts/founder-client:bobs-smoke-shop-litchfield-park', { headers: AUTH_HEADERS });
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.schema, 'metraiyux.founder-command.account-detail.v1');
  assert.equal(body.account.display_name, "Bob's Smoke Shop");
  assert.equal(body.account.ids.valley_business_id, 'bobs-smoke-shop-litchfield-park');
  assert.ok(body.account.ids.skyemail.includes('@skyemail.solenterprises.org'));
  assert.ok(body.account.paperwork.next_action);
  assert.ok(body.account.routes.valley_verified.includes('/valley-verified/business/'));
});

test('Founder Command identity spine resolves Valley clients and durable source links', async () => {
  const e = env();
  const c = ctx();
  const blocked = await jsonFetch(e, c, '/api/founder-command/identity/resolve?valley_business_id=bobs-smoke-shop-litchfield-park');
  assert.equal(blocked.response.status, 401);

  const bob = await jsonFetch(e, c, '/api/founder-command/identity/resolve?valley_business_id=bobs-smoke-shop-litchfield-park', { headers: AUTH_HEADERS });
  assert.equal(bob.response.status, 200);
  assert.equal(bob.body.ok, true);
  assert.equal(bob.body.schema, 'metraiyux.founder-command.identity-resolve.v1');
  assert.equal(bob.body.account.display_name, "Bob's Smoke Shop");
  assert.equal(bob.body.canonical_fields.client_account_id, 'founder-client:bobs-smoke-shop-litchfield-park');
  assert.equal(bob.body.auth_mode, 'shared FS27/SkyGate/Free99 owner session');

  const create = await jsonFetch(e, c, '/api/founder-command/identity/resolve', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      create_if_missing: true,
      confirm: true,
      client_account_id: 'founder-client:identity-spine-proof',
      display_name: 'Identity Spine Proof LLC',
      client_id: 'identity-spine-proof',
      workspace_id: 'identity-spine-proof-owner-workspace',
      valley_business_id: 'identity-spine-proof-valley',
      email: 'identity.spine.proof@example.com',
      skyemail: 'identity.spine.proof@skyemail.solenterprises.org'
    }
  });
  assert.equal(create.response.status, 201);
  assert.equal(create.body.ok, true);
  assert.equal(create.body.created, true);

  const link = await jsonFetch(e, c, '/api/founder-command/identity/link', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      client_account_id: 'founder-client:identity-spine-proof',
      source_system: 'skyenet',
      source_table: 'deployments',
      source_id: 'skynet_identity_spine_deploy_001',
      source_email: 'identity.spine.proof@example.com',
      link_type: 'deployment-owner'
    }
  });
  assert.equal(link.response.status, 201);
  assert.equal(link.body.ok, true);
  assert.equal(link.body.link.client_account_id, 'founder-client:identity-spine-proof');
  assert.equal(link.body.link.source_system, 'skyenet');

  const bySource = await jsonFetch(e, c, '/api/founder-command/identity/resolve?source_system=skyenet&source_id=skynet_identity_spine_deploy_001', { headers: AUTH_HEADERS });
  assert.equal(bySource.response.status, 200);
  assert.equal(bySource.body.ok, true);
  assert.equal(bySource.body.resolution.match_type, 'identity_link');
  assert.equal(bySource.body.account.client_account_id, 'founder-client:identity-spine-proof');
  assert.equal(bySource.body.identity_links.length, 1);

  const byEmail = await jsonFetch(e, c, '/api/founder-command/identity/resolve?email=identity.spine.proof@example.com', { headers: AUTH_HEADERS });
  assert.equal(byEmail.response.status, 200);
  assert.equal(byEmail.body.account.client_account_id, 'founder-client:identity-spine-proof');
});

test('Founder Command identity backfill persists imported Valley source links', async () => {
  const e = env();
  const c = ctx();
  const plan = await jsonFetch(e, c, '/api/founder-command/identity/backfill?target=bobs-smoke-shop-litchfield-park', { headers: AUTH_HEADERS });
  assert.equal(plan.response.status, 200);
  assert.equal(plan.body.ok, true);
  assert.equal(plan.body.dry_run, true);
  assert.equal(plan.body.would_backfill_accounts, 1);
  assert.ok(plan.body.would_backfill_identity_links >= 4);

  const write = await jsonFetch(e, c, '/api/founder-command/identity/backfill', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: { target: 'bobs-smoke-shop-litchfield-park', confirm: true }
  });
  assert.equal(write.response.status, 201);
  assert.equal(write.body.ok, true);
  assert.equal(write.body.persisted_accounts, 1);
  assert.ok(write.body.persisted_identity_links >= 4);
  assert.ok(write.body.persisted_identity_index_records >= write.body.persisted_identity_links);

  const bySource = await jsonFetch(e, c, '/api/founder-command/identity/resolve?source_system=valley-verified&source_id=bobs-smoke-shop-litchfield-park', { headers: AUTH_HEADERS });
  assert.equal(bySource.response.status, 200);
  assert.equal(bySource.body.ok, true);
  assert.equal(bySource.body.resolution.match_type, 'identity_link');
  assert.equal(bySource.body.account.client_account_id, 'founder-client:bobs-smoke-shop-litchfield-park');

  const sources = await jsonFetch(e, c, '/api/founder-command/crosswalk/sources', { headers: AUTH_HEADERS });
  assert.equal(sources.response.status, 200);
  assert.equal(sources.body.durable_counts.accounts, 1);
  assert.ok(sources.body.durable_counts.identity_links >= 4);
  assert.ok(sources.body.durable_counts.identity_indexes >= sources.body.durable_counts.identity_links);
});

test('Founder Command account mutations persist durable links and operations', async () => {
  const e = env();
  const c = ctx();
  const upsert = await jsonFetch(e, c, '/api/founder-command/accounts/upsert', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      client_account_id: 'founder-client:test-company',
      display_name: 'Test Company',
      client_id: 'test-company',
      valley_business_id: 'test-company-valley',
      skyemail: 'test.company@skyemail.solenterprises.org',
      paperwork: { status: 'owner-reviewed' },
      billing: { status: 'ready-for-offer' }
    }
  });
  assert.equal(upsert.response.status, 201);
  assert.equal(upsert.body.ok, true);
  assert.equal(upsert.body.account.display_name, 'Test Company');

  const link = await jsonFetch(e, c, '/api/founder-command/accounts/founder-client:test-company/link', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      system: 'skyepay',
      id_type: 'merchant-ref',
      id_value: 'skyepay_test_company'
    }
  });
  assert.equal(link.response.status, 201);
  assert.equal(link.body.ok, true);

  const op = await jsonFetch(e, c, '/api/founder-command/accounts/founder-client:test-company/operations', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      lane: 'billing',
      source_app: 'founder-command',
      priority: 'high',
      next_action: 'Send owner-approved setup packet and attach SkyePay offer.'
    }
  });
  assert.equal(op.response.status, 201);
  assert.equal(op.body.ok, true);

  const detail = await jsonFetch(e, c, '/api/founder-command/accounts/founder-client:test-company', { headers: AUTH_HEADERS });
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.counts.identity_links, 1);
  assert.equal(detail.body.counts.operations, 1);
  assert.equal(detail.body.operations[0].next_action, 'Send owner-approved setup packet and attach SkyePay offer.');
});

test('Founder Command account backfill plans and persists when confirmed', async () => {
  const e = env();
  const c = ctx();
  const dryRun = await jsonFetch(e, c, '/api/founder-command/accounts/backfill', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: { limit: 7 }
  });
  assert.equal(dryRun.response.status, 200);
  assert.equal(dryRun.body.ok, true);
  assert.equal(dryRun.body.dry_run, true);
  assert.equal(dryRun.body.would_backfill, 7);

  const write = await jsonFetch(e, c, '/api/founder-command/accounts/backfill', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: { limit: 7, confirm: true }
  });
  assert.equal(write.response.status, 201);
  assert.equal(write.body.ok, true);
  assert.equal(write.body.persisted, 7);

  const sources = await jsonFetch(e, c, '/api/founder-command/crosswalk/sources', { headers: AUTH_HEADERS });
  assert.equal(sources.response.status, 200);
  assert.equal(sources.body.source_counts.businesses, 339);
  assert.equal(sources.body.durable_counts.accounts, 7);
});
