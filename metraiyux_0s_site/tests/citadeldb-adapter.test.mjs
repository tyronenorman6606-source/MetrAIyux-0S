import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import worker from '../cloudflare/worker.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

class MemoryKV {
  constructor() {
    this.map = new Map();
  }
  async get(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  async put(key, value) {
    this.map.set(key, String(value));
  }
}

class MemoryD1 {
  constructor() {
    this.events = new Map();
    this.rows = new Map();
    this.jobs = new Map();
  }
  async exec() {
    return { success: true };
  }
  prepare(sql) {
    const db = this;
    const query = String(sql).replace(/\s+/g, ' ').trim();
    return {
      args: [],
      bind(...args) {
        this.args = args;
        return this;
      },
      async run() {
        return db.run(query, this.args);
      },
      async all() {
        return { results: db.all(query, this.args) };
      }
    };
  }
  run(query, args) {
    if (/INSERT OR REPLACE INTO citadel_mirror_events/i.test(query)) {
      this.events.set(args[0], {
        id: args[0],
        payload_json: args[1],
        status: args[2],
        source: args[3],
        app_id: args[4],
        workspace_id: args[5],
        table_name: args[6],
        record_id: args[7],
        operation: args[8],
        primary_ok: args[9],
        neon_ok: args[10],
        citadel_ok: args[11],
        checksum: args[12],
        created_at: args[13],
        mirrored_at: args[14]
      });
      return { success: true };
    }
    if (/INSERT INTO citadel_rows/i.test(query)) {
      this.rows.set(args[0], {
        id: args[0],
        app_id: args[1],
        workspace_id: args[2],
        table_name: args[3],
        record_id: args[4],
        operation: args[5],
        source: args[6],
        checksum: args[7],
        payload_ref: args[8],
        payload_json: args[9],
        event_id: args[10],
        created_at: args[11],
        updated_at: args[12]
      });
      return { success: true };
    }
    if (/INSERT OR REPLACE INTO citadel_catchup_jobs/i.test(query)) {
      this.jobs.set(args[0], {
        id: args[0],
        payload_json: args[1],
        status: args[2],
        mode: args[3],
        app_id: args[4],
        table_name: args[5],
        dry_run: args[6],
        created_at: args[7]
      });
      return { success: true };
    }
    return { success: true };
  }
  all(query, args = []) {
    if (/FROM citadel_mirror_events/i.test(query)) {
      return this.filterRows([...this.events.values()], query, args)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    }
    if (/FROM citadel_rows/i.test(query)) {
      return this.filterRows([...this.rows.values()], query, args)
        .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    }
    if (/FROM citadel_catchup_jobs/i.test(query)) {
      return [...this.jobs.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    }
    return [];
  }
  filterRows(rows, query, args = []) {
    let index = 0;
    let filtered = rows;
    if (/app_id = \?/i.test(query)) {
      const value = args[index++];
      filtered = filtered.filter((row) => row.app_id === value);
    }
    if (/workspace_id = \?/i.test(query)) {
      const value = args[index++];
      filtered = filtered.filter((row) => row.workspace_id === value);
    }
    if (/table_name = \?/i.test(query)) {
      const value = args[index++];
      filtered = filtered.filter((row) => row.table_name === value);
    }
    if (/record_id = \?/i.test(query)) {
      const value = args[index++];
      filtered = filtered.filter((row) => row.record_id === value);
    }
    const limit = Number(args[args.length - 1] || filtered.length);
    return filtered.slice(0, Number.isFinite(limit) ? limit : filtered.length);
  }
}

function ctx() {
  return { waitUntil() {} };
}

function req(path, { method = 'GET', headers = {}, body } = {}) {
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

function env(overrides = {}) {
  const gateToken = 'fs27-test-gate-token';
  const gateClaims = {
    ok: true,
    active: true,
    token: gateToken,
    sub: 'fs27-test-owner',
    email: 'owner@example.test',
    username: 'owner@example.test',
    role: 'owner',
    scope: 'admin.read admin.write keys.write gateway.invoke mcp.invoke 0s.owner',
    scopes: ['admin.read', 'admin.write', 'keys.write', 'gateway.invoke', 'mcp.invoke', '0s.owner'],
    workspace: 'metraiyux-0s'
  };
  return {
    SITE_EVENTS_KV: new MemoryKV(),
    CITADELDB: new MemoryD1(),
    CITADELDB_D1_NAME: 'metraiyux-citadeldb',
    OWNER_ADMIN_CODE: 'owner-test-code',
    OWNER_ADMIN_SESSION_SECRET: 'owner-session-secret-for-citadel-tests',
    NEON_DATABASE_URL: 'redacted-neon-present',
    SKYGATEFS27_ORIGIN: 'https://skyegate.example',
    SKYGATEFS27_WORKER: {
      async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/admin/login') {
          const body = await request.json().catch(() => ({}));
          if (body.password !== 'owner-test-code') {
            return new Response(JSON.stringify({ ok: false, error: 'invalid_test_gate_password' }), {
              status: 401,
              headers: { 'content-type': 'application/json' }
            });
          }
          return new Response(JSON.stringify(gateClaims), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        if (['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'].includes(url.pathname)) {
          const body = await request.json().catch(() => ({}));
          const active = body.token === gateToken;
          return new Response(JSON.stringify(active ? gateClaims : { active: false }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ ok: false, error: 'test_skygate_route_not_found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' }
        });
      }
    },
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`, { status: 200 });
      }
    },
    ...overrides
  };
}

async function ownerToken(e) {
  const res = await worker.fetch(req('/api/owner/admin-login', {
    method: 'POST',
    body: { code: 'owner-test-code' }
  }), e, ctx());
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.ok(data.token);
  return data.token;
}

test('CITADEL-01 exposes health only through the shared 0S gate', async () => {
  const e = env();
  const health = await worker.fetch(req('/api/citadel/health'), e, ctx());
  assert.equal(health.status, 401);

  const token = await ownerToken(e);
  const headers = { authorization: `Bearer ${token}` };
  const gatedHealth = await worker.fetch(req('/api/citadel/health', { headers }), e, ctx());
  assert.equal(gatedHealth.status, 200);
  const body = await gatedHealth.json();
  assert.equal(body.ok, true);
  assert.equal(body.mountedInZeroOs, true);
  assert.equal(body.gateOwned, true);
  assert.equal(body.storage.primary, 'cloudflare_d1');
  assert.equal(body.storage.citadelDatabase, true);
  assert.equal(body.productionSafety.localDockerCanNotAffectProductionUnlessExplicitlyConfigured, true);
  assert.equal(body.productionSafety.productionUsesCloudflareCitadelDatabase, true);

  const status = await worker.fetch(req('/api/citadel/status'), e, ctx());
  assert.equal(status.status, 401);
});

test('CITADEL-02 records Neon-only writes and queues Citadel catch-up under Gate auth', async () => {
  const e = env();
  const token = await ownerToken(e);
  const headers = { authorization: `Bearer ${token}` };

  const receipt = await worker.fetch(req('/api/citadel/dual-write-receipt', {
    method: 'POST',
    headers,
    body: {
      source: 'neon',
      appId: 'client-app-factory',
      table: 'tenant_leads',
      recordId: 'lead_123',
      operation: 'insert'
    }
  }), e, ctx());
  assert.equal(receipt.status, 201);
  const receiptBody = await receipt.json();
  assert.equal(receiptBody.ok, true);
  assert.equal(receiptBody.event.status, 'needs_citadel_catchup');
  assert.equal(receiptBody.catchupRequired, true);

  const queue = await worker.fetch(req('/api/citadel/catchup-queue', { headers }), e, ctx());
  assert.equal(queue.status, 200);
  const queueBody = await queue.json();
  assert.equal(queueBody.count, 1);
  assert.equal(queueBody.queue[0].recordId, 'lead_123');

  const status = await worker.fetch(req('/api/citadel/status', { headers }), e, ctx());
  assert.equal(status.status, 200);
  const statusBody = await status.json();
  assert.equal(statusBody.catchupRequired, true);
  assert.equal(statusBody.counts.needsCitadelCatchup, 1);
});

test('CITADEL-02B exposes the CitadelDB Edge versus Postgres runtime matrix behind Gate auth', async () => {
  const e = env();
  const token = await ownerToken(e);
  const headers = { authorization: `Bearer ${token}` };

  const unauthenticated = await worker.fetch(req('/api/citadel/runtime-matrix'), e, ctx());
  assert.equal(unauthenticated.status, 401);

  const response = await worker.fetch(req('/api/citadel/runtime-matrix', { headers }), e, ctx());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.publicProduct, 'CitadelDB');
  assert.equal(body.edgeNative.feasible, true);
  assert.equal(body.edgeNative.privateServerRequired, false);
  assert.equal(body.edgeNative.currentDatabase, 'CitadelDB Cloudflare D1');
  assert.equal(body.postgresEngine.privateServerRequiredForOwnedEngine, false);
  assert.equal(body.configured.edgeLedgerStorage, true);
  assert.equal(body.configured.cloudflareCitadelDatabase, true);
});

test('CITADEL-02C mirrors payload-backed writes into CitadelDB D1 without catch-up', async () => {
  const e = env();
  const token = await ownerToken(e);
  const headers = { authorization: `Bearer ${token}` };

  const response = await worker.fetch(req('/api/citadel/dual-write-receipt', {
    method: 'POST',
    headers,
    body: {
      source: 'tenant_backbone',
      appId: 'client-app-factory',
      workspaceId: 'workspace_1',
      table: 'tenant_leads',
      recordId: 'lead_synced_1',
      operation: 'insert',
      payload: { id: 'lead_synced_1', email: 'lead@example.test', service: 'SkyeNet' }
    }
  }), e, ctx());
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.event.status, 'mirrored_to_citadel');
  assert.equal(body.event.citadel.ok, true);
  assert.equal(body.event.citadel.storage, 'cloudflare_d1');
  assert.equal(body.rowMirror.ok, true);
  assert.equal(body.rowMirror.payloadStored, true);
  assert.equal(body.catchupRequired, false);
  assert.equal(e.CITADELDB.rows.size, 1);

  const status = await worker.fetch(req('/api/citadel/status', { headers }), e, ctx());
  const statusBody = await status.json();
  assert.equal(statusBody.counts.citadelWrites, 1);
  assert.equal(statusBody.counts.needsCitadelCatchup, 0);
});

test('CITADEL-03 creates dry-run catch-up jobs and marks events mirrored after transfer', async () => {
  const e = env();
  const token = await ownerToken(e);
  const headers = { authorization: `Bearer ${token}` };

  const receipt = await worker.fetch(req('/api/citadel/dual-write-receipt', {
    method: 'POST',
    headers,
    body: {
      source: 'neon',
      appId: 'skyemail',
      table: 'messages',
      recordId: 'msg_456'
    }
  }), e, ctx());
  const receiptBody = await receipt.json();
  const eventId = receiptBody.event.id;

  const job = await worker.fetch(req('/api/citadel/catchup/request', {
    method: 'POST',
    headers,
    body: { appId: 'skyemail', table: 'messages', dryRun: true, limit: 250 }
  }), e, ctx());
  assert.equal(job.status, 201);
  const jobBody = await job.json();
  assert.equal(jobBody.job.status, 'queued');
  assert.equal(jobBody.job.dryRun, true);
  assert.equal(jobBody.job.mode, 'neon_to_citadel');

  const mark = await worker.fetch(req('/api/citadel/catchup/mark', {
    method: 'POST',
    headers,
    body: { id: eventId, citadelReceiptId: 'citadel_receipt_1' }
  }), e, ctx());
  assert.equal(mark.status, 200);
  const markBody = await mark.json();
  assert.equal(markBody.count, 1);
  assert.equal(markBody.updated[0].status, 'mirrored_to_citadel');
  assert.equal(markBody.updated[0].citadel.ok, true);

  const queue = await worker.fetch(req('/api/citadel/catchup-queue', { headers }), e, ctx());
  const queueBody = await queue.json();
  assert.equal(queueBody.count, 0);
});

test('CITADEL-04 exposes a gated developer database URL without leaking the bearer token', async () => {
  const e = env();
  const unauthenticated = await worker.fetch(req('/api/citadel/dev/connection'), e, ctx());
  assert.equal(unauthenticated.status, 401);

  const token = await ownerToken(e);
  const headers = { authorization: `Bearer ${token}` };
  const response = await worker.fetch(req('/api/citadel/dev/connection', { headers }), e, ctx());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, 'citadeldb');
  assert.equal(body.mode, 'skynet-citadeldb-http-database-url');
  assert.equal(body.databaseUrl, 'https://metraiyux.example/api/citadel/dev');
  assert.match(body.bash.insert, /CITADELDB_DATABASE_URL/);
  assert.match(body.bash.query, /CITADELDB_AUTH/);
  assert.doesNotMatch(JSON.stringify(body), new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(body.scope.operator, true);
});

test('CITADEL-05 lets a 0S account write and query CitadelDB rows through the dev URL lane', async () => {
  const e = env();
  const token = await ownerToken(e);
  const headers = { authorization: `Bearer ${token}` };

  const write = await worker.fetch(req('/api/citadel/dev/rows', {
    method: 'POST',
    headers,
    body: {
      appId: 'dev-portal',
      table: 'profiles',
      recordId: 'profile_1',
      payload: { id: 'profile_1', email: 'builder@example.test', plan: 'free99' }
    }
  }), e, ctx());
  assert.equal(write.status, 201);
  const writeBody = await write.json();
  assert.equal(writeBody.ok, true);
  assert.equal(writeBody.event.status, 'mirrored_to_citadel');
  assert.equal(writeBody.rowMirror.ok, true);
  assert.equal(writeBody.rowMirror.payloadStored, true);

  const query = await worker.fetch(req('/api/citadel/dev/query', {
    method: 'POST',
    headers,
    body: { appId: 'dev-portal', table: 'profiles', limit: 10 }
  }), e, ctx());
  assert.equal(query.status, 200);
  const queryBody = await query.json();
  assert.equal(queryBody.ok, true);
  assert.equal(queryBody.count, 1);
  assert.equal(queryBody.rows[0].recordId, 'profile_1');
  assert.deepEqual(queryBody.rows[0].payload, { id: 'profile_1', email: 'builder@example.test', plan: 'free99' });
});

test('CITADEL-06 supports safe SELECT compatibility and rejects mutation SQL', async () => {
  const e = env();
  const token = await ownerToken(e);
  const headers = { authorization: `Bearer ${token}` };

  await worker.fetch(req('/api/citadel/dev/rows', {
    method: 'POST',
    headers,
    body: {
      appId: 'sql-dev',
      table: 'events',
      recordId: 'evt_1',
      payload: { id: 'evt_1', status: 'ok' }
    }
  }), e, ctx());

  const rejected = await worker.fetch(req('/api/citadel/dev/sql', {
    method: 'POST',
    headers,
    body: { sql: 'delete from citadel_rows', appId: 'sql-dev' }
  }), e, ctx());
  assert.equal(rejected.status, 400);
  const rejectedBody = await rejected.json();
  assert.equal(rejectedBody.error, 'citadeldb_safe_select_only');

  const selected = await worker.fetch(req('/api/citadel/dev/sql', {
    method: 'POST',
    headers,
    body: { sql: 'select * from citadel_rows', appId: 'sql-dev', table: 'events', limit: 5 }
  }), e, ctx());
  assert.equal(selected.status, 200);
  const selectedBody = await selected.json();
  assert.equal(selectedBody.ok, true);
  assert.equal(selectedBody.sqlCompatibility, 'safe_select_adapter');
  assert.equal(selectedBody.count, 1);
  assert.equal(selectedBody.rows[0].payload.status, 'ok');
});
