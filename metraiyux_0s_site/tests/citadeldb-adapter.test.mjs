import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.js';

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
    OWNER_ADMIN_CODE: 'owner-test-code',
    OWNER_ADMIN_SESSION_SECRET: 'owner-session-secret-for-citadel-tests',
    NEON_DATABASE_URL: 'redacted-neon-present',
    SKYGATEFS27_ORIGIN: 'https://skyegate.example',
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

test('CITADEL-01 exposes safe public health without opening the operator ledger', async () => {
  const e = env();
  const health = await worker.fetch(req('/api/citadel/health'), e, ctx());
  assert.equal(health.status, 200);
  const body = await health.json();
  assert.equal(body.ok, true);
  assert.equal(body.mountedInZeroOs, true);
  assert.equal(body.gateOwned, true);
  assert.equal(body.productionSafety.localDockerCanNotAffectProductionUnlessExplicitlyConfigured, true);

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
