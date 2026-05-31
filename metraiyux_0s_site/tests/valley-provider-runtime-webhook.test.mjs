import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import worker from '../cloudflare/worker.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

class MemoryKV {
  constructor() { this.map = new Map(); }
  async get(key, options = {}) {
    const value = this.map.has(key) ? this.map.get(key) : null;
    if (value == null) return null;
    return options?.type === 'json' ? JSON.parse(value) : value;
  }
  async put(key, value) { this.map.set(key, String(value)); }
  async list({ prefix = '', limit = 1000 } = {}) {
    return { keys: [...this.map.keys()].filter((key) => key.startsWith(prefix)).slice(0, limit).map((name) => ({ name })) };
  }
}

function ctx() {
  const waits = [];
  return {
    waitUntil(promise) { waits.push(Promise.resolve(promise)); },
    async flush() { return Promise.allSettled(waits); }
  };
}

test('Valley publish webhook dispatch runs through the shared provider runtime', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input?.url || input || '');
    if (url === 'https://calendar.valley.test/feed.json') {
      return Response.json({
        version: 'test-calendar-v1',
        counts: { scheduled: 1 },
        all: [{
          slug: 'runtime-webhook-proof',
          title: 'Runtime webhook proof',
          status: 'scheduled',
          publish_at: '2026-05-01',
          category: 'proof'
        }]
      });
    }
    throw new Error(`unexpected direct fetch: ${url}`);
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const kv = new MemoryKV();
  const e = {
    SITE_EVENTS_KV: kv,
    SITE_TASK_QUEUE: { async send() {} },
    VALLEY_CONTENT_CALENDAR_URL: 'https://calendar.valley.test/feed.json',
    VALLEY_PUBLISH_WEBHOOK_URL: 'https://webhook.valley.test/publish',
    ZERO_OS_PROVIDER_SANDBOX: '1',
    SKYGATEFS27_WORKER: {
      async fetch(request) {
        const url = new URL(request.url);
        if (['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'].includes(url.pathname)) {
          return Response.json({
            ok: true,
            active: true,
            email: 'owner@valley.test',
            role: 'owner',
            scope: 'admin.read admin.write 0s.owner',
            scopes: ['admin.read', 'admin.write', '0s.owner']
          });
        }
        if (url.pathname === '/platform/events') return Response.json({ ok: true, accepted: true, persisted: true });
        return Response.json({ ok: true });
      }
    },
    ASSETS: { async fetch() { return new Response('not found', { status: 404 }); } }
  };
  const c = ctx();
  const response = await worker.fetch(new Request('https://metraiyux.example/api/valley/content-schedule/tick?execute=1', {
    method: 'POST',
    headers: {
      authorization: 'Bearer owner-token',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ now: '2026-05-29T00:00:00.000Z' })
  }), e, c);
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.equal(payload.ok, true);
  assert.equal(payload.webhook_dispatch_queued, true);
  await c.flush();

  const webhookKey = [...kv.map.keys()].find((key) => key.endsWith(':webhook'));
  assert.ok(webhookKey, 'provider-runtime webhook receipt should be persisted');
  const webhook = JSON.parse(kv.map.get(webhookKey));
  assert.equal(webhook.provider_runtime.ok, true);
  assert.equal(webhook.provider_runtime.provider_runtime_status, 'executed_sandbox');
  assert.equal(webhook.provider_runtime.provider_call_made, false);
});
