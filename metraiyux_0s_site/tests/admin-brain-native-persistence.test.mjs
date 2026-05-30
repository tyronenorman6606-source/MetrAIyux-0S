import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const siteWorker = (await import('../cloudflare/worker.js')).default;

const OWNER_CODE = 'owner-code';
const AUTH_HEADERS = {
  authorization: `Bearer ${OWNER_CODE}`,
  'x-admin-token': OWNER_CODE,
  'x-free99-admin-code': OWNER_CODE,
  'x-free99-gate-session': OWNER_CODE,
  'x-skye-gate-session': OWNER_CODE
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

async function expectJson(response, expectedStatus) {
  const text = await response.text();
  assert.equal(response.status, expectedStatus, text.slice(0, 500));
  return JSON.parse(text);
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
    async list({ prefix = '', limit = 100 } = {}) {
      const keys = [...store.keys()]
        .filter((name) => name.startsWith(prefix))
        .slice(0, limit)
        .map((name) => ({ name }));
      return { keys };
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
      if (url.pathname === '/platform/events') return Response.json({ ok: true });
      return Response.json({ ok: false, error: 'unexpected_skygate_path', path: url.pathname }, { status: 404 });
    }
  };
}

function env() {
  return {
    FREE99_ADMIN_CODE: OWNER_CODE,
    OWNER_ADMIN_SESSION_SECRET: 'test-owner-session-secret',
    SKYGATEFS27_WORKER: skygateBinding(),
    SITE_EVENTS_KV: kvStub(),
    SKYGATE_EVENT_SECRET: 'test-mirror-secret'
  };
}

test('Admin Brain native endpoints persist command, approval, and email receipts under shared gate', async () => {
  const e = env();
  const c = ctx();

  const blocked = await siteWorker.fetch(req('/api/admin/ledger'), e, c);
  assert.equal(blocked.status, 401);

  const chat = await siteWorker.fetch(req('/api/admin/brain/chat', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: { message: 'Draft a social post and send it for owner approval before publishing.' }
  }), e, c);
  const chatBody = await expectJson(chat, 200);
  assert.equal(chatBody.ok, true);
  assert.equal(chatBody.shared_gate, true);
  assert.equal(chatBody.persistence, 'site-events-kv');
  assert.equal(chatBody.receipt.approval_required, true);
  assert.match(chatBody.reply, /Owner approval is required/);

  const approval = await siteWorker.fetch(req('/api/admin/approval', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: { item_id: chatBody.receipt.id, decision: 'approved', notes: 'Approved from native persistence test.' }
  }), e, c);
  const approvalBody = await expectJson(approval, 201);
  assert.equal(approvalBody.ok, true);
  assert.equal(approvalBody.approval.item_id, chatBody.receipt.id);
  assert.equal(approvalBody.persistence, 'site-events-kv');

  const email = await siteWorker.fetch(req('/api/admin/approval-email/test', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: { message: 'Native admin approval email test.' }
  }), e, c);
  const emailBody = await expectJson(email, 200);
  assert.equal(emailBody.ok, true);
  assert.equal(emailBody.approval_email.skipped, true);
  assert.equal(emailBody.persistence, 'site-events-kv');

  const ledger = await siteWorker.fetch(req('/api/admin/ledger?limit=10', { headers: AUTH_HEADERS }), e, c);
  const ledgerBody = await expectJson(ledger, 200);
  assert.equal(ledgerBody.ok, true);
  assert.equal(ledgerBody.shared_gate, true);
  assert.ok(ledgerBody.count >= 3);

  const payloads = ledgerBody.ledger.map((row) => JSON.parse(row.payload));
  assert.ok(payloads.some((row) => row.id === chatBody.receipt.id && row.type === 'admin_brain.command'));
  assert.ok(payloads.some((row) => row.item_id === chatBody.receipt.id && row.type === 'admin_brain.approval'));
  assert.ok(payloads.some((row) => row.type === 'admin_brain.approval_email_test'));
});
