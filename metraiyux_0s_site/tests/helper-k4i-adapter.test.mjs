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
  all(query) {
    if (/FROM citadel_mirror_events/i.test(query)) {
      return [...this.events.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    }
    if (/FROM citadel_rows/i.test(query)) {
      return [...this.rows.values()].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    }
    if (/FROM citadel_catchup_jobs/i.test(query)) {
      return [...this.jobs.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    }
    return [];
  }
}

class MemorySkyGate {
  constructor() {
    this.token = 'fs27-helper-k4i-test-token';
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/admin/login') {
      return Response.json({
        ok: true,
        active: true,
        token: this.token,
        email: 'owner@metraiyux.local',
        role: 'owner',
        scope: 'admin.read admin.write keys.write gateway.invoke 0s.owner',
        workspace: 'metraiyux-0s',
        exp: Math.floor(Date.now() / 1000) + 3600
      });
    }
    if (['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'].includes(url.pathname)) {
      const body = await request.json().catch(() => ({}));
      const active = body.token === this.token;
      return Response.json({
        ok: active,
        active,
        email: 'owner@metraiyux.local',
        role: active ? 'owner' : '',
        scope: active ? 'admin.read admin.write keys.write gateway.invoke 0s.owner' : '',
        workspace: 'metraiyux-0s',
        exp: Math.floor(Date.now() / 1000) + 3600
      }, { status: active ? 200 : 401 });
    }
    return new Response('not found', { status: 404 });
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
  return {
    SITE_EVENTS_KV: new MemoryKV(),
    CITADELDB: new MemoryD1(),
    CITADELDB_D1_NAME: 'metraiyux-citadeldb',
    OWNER_ADMIN_CODE: 'owner-test-code',
    OWNER_ADMIN_SESSION_SECRET: 'owner-session-secret-for-helper-k4i-tests',
    SKYGATEFS27_WORKER: new MemorySkyGate(),
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
  return data.token;
}

test('HELPER-K4I-01 keeps Helper K4i behind the shared 0S gate', async () => {
  const e = env();
  const blocked = await worker.fetch(req('/api/helper-k4i/status'), e, ctx());
  assert.equal(blocked.status, 401);

  const token = await ownerToken(e);
  const response = await worker.fetch(req('/api/helper-k4i/status', {
    headers: { authorization: `Bearer ${token}` }
  }), e, ctx());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.persona.name, 'Helper K4i');
  assert.equal(body.gateOwned, true);
  assert.equal(body.storage.citadelDatabase, true);
  assert.equal(body.routes.deployAuthority, '/api/helper-k4i/deploy-authority');
});

test('HELPER-K4I-02 runs proof health scans and records SkyErrors in CitadelDB', async () => {
  const e = env();
  const token = await ownerToken(e);
  const headers = { authorization: `Bearer ${token}` };

  const response = await worker.fetch(req('/api/helper-k4i/scan', {
    method: 'POST',
    headers,
    body: { mode: 'unit_proof', notify: true }
  }), e, ctx());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.scan.service, 'helper-k4i');
  assert.equal(body.scan.status, 'warn');
  assert.equal(body.scan.counts.warnings, 1);
  assert.equal(body.notification.skipped, true);
  assert.equal(body.stored.kv, true);
  assert.equal(body.stored.citadel, true);
  assert.equal(e.CITADELDB.rows.size, 1);
  assert.equal([...e.CITADELDB.rows.values()][0].table_name, 'skyerrors');

  const skyerrors = await worker.fetch(req('/api/helper-k4i/skyerrors', { headers }), e, ctx());
  assert.equal(skyerrors.status, 200);
  const skyBody = await skyerrors.json();
  assert.equal(skyBody.count, 1);
  assert.equal(skyBody.skyerrors[0].id, body.scan.id);
});

test('HELPER-K4I-03 creates vault patch plans without Worker-side code mutation', async () => {
  const e = env();
  const token = await ownerToken(e);
  const headers = { authorization: `Bearer ${token}` };

  const response = await worker.fetch(req('/api/helper-k4i/patch-plan', {
    method: 'POST',
    headers,
    body: {
      title: 'Patch CitadelDB developer query smoke',
      issue: 'Structured query smoke found a bad filter.'
    }
  }), e, ctx());
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.plan.status, 'planned_for_vault_handoff');
  assert.ok(body.plan.vaultHandoff.commands.includes('npm run 0s:helper-k4i:proof'));
  assert.equal(body.stored.kv, true);
  assert.equal(body.stored.citadel, true);
  assert.equal([...e.CITADELDB.rows.values()][0].table_name, 'patch_plans');
});

test('HELPER-K4I-04 captures SkyErrors SDK events through the shared gate', async () => {
  const e = env();
  const blocked = await worker.fetch(req('/api/skyerrors/events', {
    method: 'POST',
    body: { message: 'blocked capture' }
  }), e, ctx());
  assert.equal(blocked.status, 401);

  const token = await ownerToken(e);
  const headers = { authorization: `Bearer ${token}` };
  const response = await worker.fetch(req('/api/skyerrors/events', {
    method: 'POST',
    headers,
    body: {
      service: 'unit-customer-app',
      environment: 'test',
      message: 'checkout failed',
      exception: { name: 'CheckoutError', message: 'checkout failed', stack: 'stack line' },
      tags: { surface: 'checkout' },
      contexts: { workspace_id: 'unit-workspace' }
    }
  }), e, ctx());
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.event.type, 'skyerrors.capture');
  assert.equal(body.event.service, 'unit-customer-app');
  assert.equal(body.stored.kv, true);
  assert.equal(body.stored.citadel, true);
  assert.equal([...e.CITADELDB.rows.values()][0].table_name, 'skyerrors');

  const listed = await worker.fetch(req('/api/skyerrors/events', { headers }), e, ctx());
  assert.equal(listed.status, 200);
  const listBody = await listed.json();
  assert.equal(listBody.service, 'skyerrors');
  assert.equal(listBody.count, 1);
  assert.equal(listBody.events[0].id, body.event.id);
});

test('HELPER-K4I-05 provides deployment authority and secret rotation planning without leaking secrets', async () => {
  const e = env();
  const token = await ownerToken(e);
  const headers = { authorization: `Bearer ${token}` };

  const authorityResponse = await worker.fetch(req('/api/helper-k4i/deploy-authority?project=devooderator&worker=metraiyux-0s-full-system', { headers }), e, ctx());
  assert.equal(authorityResponse.status, 200);
  const authorityBody = await authorityResponse.json();
  assert.equal(authorityBody.ok, true);
  assert.equal(authorityBody.deploymentAgent.id, 'skyenet-deployment-agent');
  assert.equal(authorityBody.authority.configured.deployToken, false);
  assert.equal(authorityBody.authority.probes.pagesProject.skipped, true);
  assert.equal(JSON.stringify(authorityBody).includes('owner-test-code'), false);

  const assistResponse = await worker.fetch(req('/api/helper-k4i/deploy-assist', {
    method: 'POST',
    headers,
    body: { project: 'devooderator', action: 'production_deploy_assist' }
  }), e, ctx());
  assert.equal(assistResponse.status, 201);
  const assistBody = await assistResponse.json();
  assert.equal(assistBody.ok, true);
  assert.equal(assistBody.receipt.type, 'skyenet_deployment_agent.assist');
  assert.equal(assistBody.receipt.authority.capabilities.skynetProxy, true);
  assert.equal(assistBody.stored.kv, true);
  assert.equal(assistBody.stored.citadel, true);

  const rotationResponse = await worker.fetch(req('/api/helper-k4i/secret-rotation-plan', {
    method: 'POST',
    headers,
    body: { project: 'devooderator' }
  }), e, ctx());
  assert.equal(rotationResponse.status, 201);
  const rotationBody = await rotationResponse.json();
  assert.equal(rotationBody.ok, true);
  assert.equal(rotationBody.plan.type, 'skyenet_deployment_agent.secret_rotation_plan');
  assert.equal(rotationBody.plan.status, 'owner_action_required');
  assert.ok(rotationBody.plan.localCommands.some((command) => command.includes('deployment-agent.mjs diagnose')));
  assert.equal(JSON.stringify(rotationBody).includes('owner-test-code'), false);
});

test('HELPER-K4I-06 stores capability watch receipts through shared SkyErrors lane', async () => {
  const e = env();
  const blocked = await worker.fetch(req('/api/helper-k4i/capability-watch', {
    method: 'POST',
    body: {
      capability_id: 'blocked-watch',
      checks: [{ id: 'blocked', ok: false }]
    }
  }), e, ctx());
  assert.equal(blocked.status, 401);

  const token = await ownerToken(e);
  const headers = { authorization: `Bearer ${token}` };
  const response = await worker.fetch(req('/api/helper-k4i/capability-watch', {
    method: 'POST',
    headers,
    body: {
      capability_id: 'skyerrors-unit-watch',
      surface: 'SkyErrors',
      target_route: '/api/skyerrors/events',
      proof_kind: 'local_worker_api',
      summary: { pass: 1, fail: 0 },
      receipt_paths: ['test-artifacts/0s-live-capability-watch/latest.json'],
      recent_receipts: [{
        id: 'truth-ledger',
        label: '0S truth ledger',
        path: 'test-artifacts/0s-truth-ledger/0s-truth-ledger-latest.json',
        exists: true,
        ok: true,
        status: 'ok',
        schema: 'metraiyux.0s.truth-ledger.v1',
        generated_at: '2026-05-29T00:00:00.000Z',
        no_browser_proof_run: true,
        owner_manual_live_check: true,
        proves: 'computed workflow truth and external boundary inventory',
        summary: { external_boundaries: 1 }
      }],
      external_boundaries: [{
        id: 'provider-runtime-closure',
        priority: 'P1',
        surface: '0S provider runtime',
        receipt_path: 'test-artifacts/0s-provider-runtime/0s-provider-runtime-smoke-latest.json',
        receipt_ok: true,
        computed_truth: 'built',
        boundaries: ['Customer-impacting provider sends remain owner-approved and gated.'],
        next_step: 'Attach owner-approved live provider receipt before claiming live send execution.'
      }],
      health_watch: {
        schema: 'metraiyux.0s.health-watch-rollup.v1',
        generated_at: '2026-05-29T00:00:00.000Z',
        summary: {
          total_receipts: 1,
          ok_receipts: 1,
          failed_receipts: 0,
          missing_receipts: 0,
          external_boundary_workflows: 1,
          no_browser_proof_run: true
        },
        consumption: {
          skyerrors_health_api: '/api/skyerrors/health',
          production_closure_check: 'tools/0s-production-closure-live-http.mjs'
        },
        boundary_rule: 'Provider, browser, destructive, billing, and credential actions stay gated until receipted.'
      },
      checks: [{
        id: 'skyerrors-capture-readback',
        label: 'Capture and read back SkyErrors event',
        ok: true,
        status: 'pass',
        severity: 'ok',
        proof_kind: 'local_worker_api',
        duration_ms: 12,
        live_action_observed: true,
        real_time_observed: true,
        detail: 'Shared-gate Worker route posted and read back a receipt.',
        boundary: 'Unit proof uses memory KV/D1 bindings.'
      }]
    }
  }), e, ctx());
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.receipt.type, 'helper_k4i.capability_watch');
  assert.equal(body.receipt.schema, 'helper-k4i.capability-watch-receipt.v1');
  assert.equal(body.receipt.capability_id, 'skyerrors-unit-watch');
  assert.equal(body.receipt.counts.live_action_observed, 1);
  assert.equal(body.receipt.counts.recent_receipts, 1);
  assert.equal(body.receipt.counts.external_boundaries, 1);
  assert.equal(body.receipt.recent_receipts[0].id, 'truth-ledger');
  assert.equal(body.receipt.external_boundaries[0].id, 'provider-runtime-closure');
  assert.equal(body.receipt.health_watch.summary.external_boundary_workflows, 1);
  assert.equal(body.stored.kv, true);
  assert.equal(body.stored.citadel, true);
  assert.equal([...e.CITADELDB.rows.values()][0].table_name, 'capability_watch_receipts');

  const listed = await worker.fetch(req('/api/skyerrors/watch', { headers }), e, ctx());
  assert.equal(listed.status, 200);
  const listBody = await listed.json();
  assert.equal(listBody.service, 'skyerrors');
  assert.equal(listBody.count, 1);
  assert.equal(listBody.receipts[0].id, body.receipt.id);
  assert.equal(listBody.capabilityWatchHealth.recent_receipts[0].id, 'truth-ledger');
  assert.equal(listBody.capabilityWatchHealth.external_boundaries[0].id, 'provider-runtime-closure');

  const health = await worker.fetch(req('/api/skyerrors/health', { headers }), e, ctx());
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.equal(healthBody.ok, true);
  assert.equal(healthBody.service, 'skyerrors');
  assert.equal(healthBody.routes.skyerrorsWatch, '/api/skyerrors/watch');
  assert.equal(healthBody.capabilityWatchHealth.latest_id, body.receipt.id);
  assert.equal(healthBody.capabilityWatchHealth.health_watch.summary.external_boundary_workflows, 1);
});
