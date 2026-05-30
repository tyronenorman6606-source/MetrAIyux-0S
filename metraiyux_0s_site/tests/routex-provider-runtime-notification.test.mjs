import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import worker from '../cloudflare/worker.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

class MemoryKV {
  constructor() { this.map = new Map(); }
  async get(key, options = {}) {
    const value = this.map.get(key);
    if (value == null) return null;
    return options.type === 'json' ? JSON.parse(value) : value;
  }
  async put(key, value) { this.map.set(key, String(value)); }
  async list({ prefix = '', limit = 1000 } = {}) {
    return { keys: [...this.map.keys()].filter((name) => name.startsWith(prefix)).slice(0, limit).map((name) => ({ name })) };
  }
}

function gateWorker() {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || '');
      const [role = 'contractor', email = `${role}@routex-runtime.local`] = token.split(':');
      return Response.json({
        active: true,
        email,
        sub: `routex-runtime-${role}-${email}`,
        role,
        routex_role: role,
        isAdmin: ['admin', 'house_command'].includes(role),
        scope: role === 'admin' ? 'admin.read admin.write routex.write' : 'routex.read routex.write',
        phone: '+15555550123',
        sms_opt_in: true
      });
    }
  };
}

function env() {
  const kv = new MemoryKV();
  return {
    SKYEROUTEX_KV: kv,
    SITE_EVENTS_KV: kv,
    SKYGATEFS27_WORKER: gateWorker(),
    TWILIO_ACCOUNT_SID: 'AC00000000000000000000000000000000',
    TWILIO_AUTH_TOKEN: 'twilio-secret-not-returned',
    TWILIO_FROM_NUMBER: '+15555550100',
    SKYEROUTEX_PROVIDER_RUNTIME_SANDBOX: '1',
    ASSETS: { async fetch(request) { return new Response(`asset:${new URL(request.url).pathname}`, { status: 404 }); } }
  };
}

async function call(e, method, path, { token, body } = {}) {
  const response = await worker.fetch(new Request(`https://metraiyux.example${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  }), e, { waitUntil() {} });
  const payload = await response.json().catch(() => ({}));
  assert.equal(response.ok, true, `${method} ${path} -> ${response.status}: ${JSON.stringify(payload).slice(0, 1000)}`);
  return payload;
}

test('RouteX Twilio notifications use the shared 0S provider runtime receipts', async () => {
  const e = env();
  const adminToken = 'admin:owner@routex-runtime.local';
  const providerToken = 'provider:provider@routex-runtime.local';
  const workerToken = 'contractor:worker@routex-runtime.local';

  await call(e, 'POST', '/api/routex/ae/intake', {
    token: workerToken,
    body: {
      name: 'Runtime Worker',
      email: 'worker@routex-runtime.local',
      city: 'Phoenix',
      state: 'Arizona',
      lane: 'ops',
      skills: ['dispatch'],
      services: ['test job']
    }
  });
  const market = (await call(e, 'POST', '/api/routex/markets', {
    token: adminToken,
    body: { city: 'Phoenix', state: 'Arizona' }
  })).market;
  const job = (await call(e, 'POST', '/api/routex/jobs', {
    token: providerToken,
    body: {
      market_id: market.id,
      title: 'Runtime SMS notification job',
      category: 'content_launch_package',
      description: 'Proof that RouteX notification dispatch uses the 0S provider runtime.',
      location: 'Phoenix',
      pay_type: 'fixed',
      pay_amount_cents: 1000,
      slots: 1,
      acceptance_mode: 'single'
    }
  })).job;
  await call(e, 'POST', `/api/routex/ae/jobs/${job.id}/claim`, {
    token: workerToken,
    body: { note: 'claiming runtime proof job' }
  });

  const state = await e.SKYEROUTEX_KV.get('skyeroutex:v1:state', { type: 'json' });
  const runtimeNotifications = state.notifications.filter((row) => row.delivery_provider === '0s-provider-runtime:twilio');
  assert.ok(runtimeNotifications.length >= 1);
  assert.ok(runtimeNotifications.every((row) => row.provider_runtime_receipt_id));
  assert.ok(runtimeNotifications.every((row) => row.provider_call_made === false));
  assert.ok(runtimeNotifications.every((row) => String(row.external_message_id || '').startsWith('twilio_sandbox_')));

  const statusReceipt = await call(e, 'POST', `/api/routex/notifications/${runtimeNotifications[0].id}/provider-status`, {
    token: adminToken,
    body: {}
  });
  assert.equal(statusReceipt.ok, true);
  assert.equal(statusReceipt.receipt.status, 'delivered');
  assert.equal(statusReceipt.outbox.driver, '0s-provider-runtime:twilio');
  assert.equal(statusReceipt.notification.provider_call_made, false);
  assert.ok(statusReceipt.notification.provider_status_check_id);
  assert.ok(statusReceipt.notification.provider_runtime_receipt_id);

  const receipts = await e.SITE_EVENTS_KV.list({ prefix: '0s-provider-runtime:receipt:' });
  assert.ok(receipts.keys.length >= runtimeNotifications.length);
});
