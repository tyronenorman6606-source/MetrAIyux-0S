import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const siteWorker = (await import('../cloudflare/worker.js')).default;

const OWNER_CODE = 'owner-code';
const RELAY_ADMIN = 'relay-admin-token-long-enough-for-tests';
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

function req(path, { method = 'GET', headers = {}, body } = {}) {
  return new Request(`https://metraiyux.example${path}`, {
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
    async list() {
      return { keys: [...store.keys()].map(name => ({ name })) };
    }
  };
}

function queueStub(items) {
  return {
    async send(item) {
      items.push(item);
    }
  };
}

function relay13Binding(calls) {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const rawBody = request.method === 'GET' ? '' : await request.text();
      const body = rawBody ? JSON.parse(rawBody) : {};
      calls.push({
        method: request.method,
        path: url.pathname,
        search: url.search,
        authorization: request.headers.get('authorization') || '',
        apiKey: request.headers.get('x-relay13-api-key') || '',
        body
      });

      const isRelayAdmin = request.headers.get('authorization') === `Bearer ${RELAY_ADMIN}`;
      if (url.pathname === '/api/v1/conversations' && request.method === 'POST' && isRelayAdmin) {
        return Response.json({ ok: false, error: 'Invalid or revoked API key' }, { status: 401 });
      }
      if (url.pathname === '/api/v1/conversations' && request.method === 'POST' && !request.headers.get('x-relay13-api-key') && !body.workspace_id) {
        return Response.json({ ok: false, error: 'Valid workspace or API key required' }, { status: 401 });
      }
      if (url.pathname === '/api/admin/workspaces' && request.method === 'GET') {
        return Response.json({ ok: true, workspaces: [{ id: 'ws_0s', slug: 'connectlog-main', name: 'ConnectLog Main' }] });
      }
      if (url.pathname === '/api/admin/workspaces' && request.method === 'POST') {
        return Response.json({
          ok: true,
          workspace: {
            id: `ws_${body.slug}`,
            slug: body.slug,
            name: body.name || body.slug
          }
        }, { status: 201 });
      }
      if (url.pathname === '/api/v1/conversations' && request.method === 'POST') {
        return Response.json({
          ok: true,
          conversation_id: 'conv_founder',
          visitor_token: 'secret-visitor-token',
          workspace_id: body.workspace_id || 'ws_0s',
          bridge: 'connectlog',
          guardrail: { decision: 'allow' }
        }, { status: 201 });
      }
      if (url.pathname === '/api/v1/conversations' && request.method === 'GET') {
        assert.equal(url.searchParams.get('workspace_id'), 'ws_0s');
        return Response.json({
          ok: true,
          conversations: [{
            id: 'conv_founder',
            workspace_id: 'ws_0s',
            subject: 'Phone command proof',
            customer_name: 'Founder Command',
            status: 'open',
            last_message_preview: 'Open a live Relay13 lane',
            updated_at: '2026-05-20T00:00:00.000Z'
          }]
        });
      }
      if (url.pathname === '/api/v1/conversations/conv_founder/messages' && request.method === 'GET') {
        return Response.json({
          ok: true,
          messages: [
            { id: 'msg_1', conversation_id: 'conv_founder', workspace_id: 'ws_0s', sender_role: 'customer', sender_name: 'Founder Command', body: 'Open a live Relay13 lane', created_at: '2026-05-20T00:00:00.000Z' }
          ]
        });
      }
      if (url.pathname === '/api/v1/conversations/conv_founder/messages' && request.method === 'POST') {
        return Response.json({
          ok: true,
          message: { id: 'msg_2', conversation_id: 'conv_founder', workspace_id: 'ws_0s', sender_role: body.sender_role, body: body.body }
        }, { status: 201 });
      }
      return Response.json({ ok: false, error: 'unexpected_relay13_path', path: url.pathname }, { status: 404 });
    }
  };
}

function env(calls = [], queueItems = []) {
  return {
    FREE99_ADMIN_CODE: OWNER_CODE,
    OWNER_ADMIN_SESSION_SECRET: 'test-owner-session-secret',
    PLATFORM_ADMIN_TOKEN: RELAY_ADMIN,
    RELAY13_WORKER: relay13Binding(calls),
    SITE_EVENTS_KV: kvStub(),
    SITE_TASK_QUEUE: queueStub(queueItems)
  };
}

test('Founder Command creates a real Relay13 conversation through the shared admin bridge', async () => {
  const calls = [];
  const queueItems = [];
  const e = env(calls, queueItems);
  const c = ctx();
  const res = await siteWorker.fetch(req('/api/founder-command/inbox/conversations', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: { workspace: 'connectlog-main', subject: 'Phone command proof', message: 'Open a live Relay13 lane' }
  }), e, c);
  const body = await res.json();
  await Promise.all(c.pending);

  assert.equal(res.status, 201);
  assert.equal(body.ok, true);
  assert.equal(body.relay13.conversation_id, 'conv_founder');
  assert.equal(body.relay13.visitor_token_present, true);
  assert.equal(body.record.provider_runtime.status, 'executed_sandbox');
  assert.ok(body.record.provider_runtime.receipt_id);
  assert.equal(body.record.provider_runtime.provider_call_made, false);
  assert.equal(body.record.provider_runtime.callback?.provider_callback_call_made, true);
  assert.equal(body.record.provider_runtime.callback?.callback_status, 'relay13_created');
  assert.equal(JSON.stringify(body).includes('secret-visitor-token'), false);
  assert.equal(JSON.stringify(body).includes(RELAY_ADMIN), false);
  assert.deepEqual(calls.map(call => `${call.method} ${call.path}`), [
    'POST /api/v1/conversations',
    'GET /api/admin/workspaces',
    'POST /api/v1/conversations'
  ]);
  assert.equal(calls[1].authorization, `Bearer ${RELAY_ADMIN}`);
  assert.equal(calls[2].authorization, '');
  assert.equal(calls[2].apiKey, '');
  assert.equal(calls[2].body.workspace_id, 'ws_0s');
  assert.equal(queueItems.length, 1);
});

test('Founder Command keeps Relay13 client inboxes separated by exact workspace id', async () => {
  const calls = [];
  const e = env(calls);
  const c = ctx();
  const res = await siteWorker.fetch(req('/api/founder-command/inbox/conversations', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: { workspace: 'client alpha', subject: 'Client Alpha support', message: 'Open a separate client inbox' }
  }), e, c);
  const body = await res.json();
  await Promise.all(c.pending);

  assert.equal(res.status, 201);
  assert.equal(body.ok, true);
  const createdWorkspace = calls.find(call => call.method === 'POST' && call.path === '/api/admin/workspaces');
  assert.equal(createdWorkspace.body.slug, 'client-alpha');
  const conversationCreate = calls.filter(call => call.method === 'POST' && call.path === '/api/v1/conversations').at(-1);
  assert.equal(conversationCreate.authorization, '');
  assert.equal(conversationCreate.apiKey, '');
  assert.equal(conversationCreate.body.workspace_id, 'ws_client-alpha');
  assert.equal(conversationCreate.body.workspace, 'client-alpha');
  assert.notEqual(conversationCreate.body.workspace_id, 'ws_0s');
});

test('Founder Command reads Relay13 inbox and sends an operator reply', async () => {
  const calls = [];
  const e = env(calls);
  const c = ctx();

  const inbox = await siteWorker.fetch(req('/api/founder-command/inbox?conversation_id=conv_founder', { headers: AUTH_HEADERS }), e, c);
  const inboxBody = await inbox.json();
  assert.equal(inbox.status, 200);
  assert.equal(inboxBody.ok, true);
  assert.equal(inboxBody.mode, 'relay13_live_admin');
  assert.equal(inboxBody.conversations[0].id, 'conv_founder');
  assert.equal(inboxBody.messages[0].id, 'msg_1');

  const reply = await siteWorker.fetch(req('/api/founder-command/inbox/messages', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: { conversation_id: 'conv_founder', workspace_id: 'ws_0s', sender_role: 'operator', message: 'Operator reply from Founder Command' }
  }), e, c);
  const replyBody = await reply.json();

  assert.equal(reply.status, 201);
  assert.equal(replyBody.ok, true);
  assert.equal(replyBody.message.id, 'msg_2');
  assert.equal(replyBody.record.provider_runtime.status, 'executed_sandbox');
  assert.ok(replyBody.record.provider_runtime.receipt_id);
  assert.equal(replyBody.record.provider_runtime.provider_call_made, false);
  assert.equal(replyBody.record.provider_runtime.callback?.provider_callback_call_made, true);
  assert.equal(replyBody.record.provider_runtime.callback?.callback_status, 'relay13_message_sent');
  assert.equal(calls.at(-1).authorization, `Bearer ${RELAY_ADMIN}`);
});

test('Founder Command chat can tell the Worker to create a Relay13 conversation', async () => {
  const calls = [];
  const e = env(calls);
  const c = ctx();
  const chat = await siteWorker.fetch(req('/api/founder-command/chat', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: { message: 'create a relay13 inbox conversation for my site from the phone command lane' }
  }), e, c);
  const body = await chat.json();
  await Promise.all(c.pending);

  assert.equal(chat.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.action.ok, true);
  assert.equal(body.action.relay13.conversation_id, 'conv_founder');
  assert.match(body.answer.text, /Relay13 conversation created by the live Worker/);
  assert.doesNotMatch(body.answer.text, /saved the receipt for operator review/);
});
