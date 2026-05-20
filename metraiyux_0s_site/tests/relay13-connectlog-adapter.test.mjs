import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import siteWorker from '../cloudflare/worker.js';

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

function assetsStub(status = 200) {
  return {
    async fetch(request) {
      return new Response(`asset:${new URL(request.url).pathname}`, { status });
    }
  };
}

function relayBinding(calls) {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const body = request.method === 'GET' ? '' : await request.text();
      calls.push({
        method: request.method,
        path: url.pathname,
        search: url.search,
        apiKey: request.headers.get('x-relay13-api-key') || '',
        authorization: request.headers.get('authorization') || '',
        body
      });

      if (url.pathname === '/api/v1/connectlog/health') {
        return Response.json({ ok: true, bridge: 'connectlog', features: ['card_registry', 'system_guardrails'] });
      }
      if (url.pathname === '/api/v1/connectlog/cards' && request.method === 'POST') {
        return Response.json({ ok: true, card: { id: 'card_record_1', card_label: '0S proof card' } }, { status: 201 });
      }
      if (url.pathname === '/api/v1/connectlog/scan' && request.method === 'POST') {
        return Response.json({ ok: true, bridge: 'connectlog', conversation_id: 'conv_0s_relay', visitor_token: 'visitor_token', connectlog_card_record_id: 'card_record_1' }, { status: 201 });
      }
      if (url.pathname === '/api/v1/conversations/conv_0s_relay/messages' && request.method === 'GET') {
        return Response.json({ ok: true, messages: [{ id: 'msg_1', body: 'hello from Relay13' }] });
      }
      if (url.pathname === '/api/v1/conversations/conv_0s_relay/messages' && request.method === 'POST') {
        return Response.json({ ok: true, message: { id: 'msg_2', sender_role: 'operator' } }, { status: 201 });
      }
      if (url.pathname === '/api/admin/workspaces') {
        return Response.json({ ok: true, workspaces: [{ id: 'ws_0s', slug: 'connectlog-main', name: 'ConnectLog Main' }] });
      }
      if (url.pathname === '/api/admin/widget-configs/publish' && request.method === 'POST') {
        return Response.json({ ok: true, config: { workspace_id: 'ws_0s', brand_name: 'ConnectLog' } });
      }
      if (url.pathname === '/api/admin/guardrails' && request.method === 'POST') {
        return Response.json({ ok: true, guardrails: { ai_mode: 'draft_only', allow_web_search: false, allow_ai_auto_reply: false } });
      }
      if (url.pathname === '/api/v1/guardrails/proof') {
        return Response.json({ ok: true, feature: 'system_guardrails', guardrails: { ai_mode: 'draft_only', allow_web_search: false } });
      }
      if (url.pathname === '/api/ws/conv_0s_relay') {
        return Response.json({ ok: true, websocket_path: url.pathname });
      }
      return Response.json({ ok: false, error: 'unexpected_relay_path', path: url.pathname }, { status: 404 });
    }
  };
}

function env(overrides = {}) {
  return {
    ASSETS: assetsStub(),
    RELAY13_WORKER: relayBinding(overrides.calls || []),
    ...overrides
  };
}

test('RELAY-01 points ConnectLog and Relay13 console source to the 0S Relay13 API base', async () => {
  const apiBases = await readFile(new URL('../assets/js/metraiyux-api-bases.js', import.meta.url), 'utf8');
  const appHtml = await readFile(new URL('../connectlog-v7.7-relay13-operator-proof/app.html', import.meta.url), 'utf8');
  const appJs = await readFile(new URL('../connectlog-v7.7-relay13-operator-proof/app.js', import.meta.url), 'utf8');
  const adminHtml = await readFile(new URL('../relay13-core-v1.7-connectlog-operator-proof/public/admin/index.html', import.meta.url), 'utf8');
  const adminJs = await readFile(new URL('../relay13-core-v1.7-connectlog-operator-proof/public/admin/app.js', import.meta.url), 'utf8');

  assert.match(apiBases, /relay13:\s*'\/api\/relay13'/);
  assert.match(appHtml, /metraiyux-api-bases\.js\?v=relay13-api-base[\s\S]+app\.js/);
  assert.match(appJs, /function defaultRelayApiBase/);
  assert.match(appJs, /origin:\s*defaultRelayApiBase\(\)/);
  assert.match(appJs, /raw\.startsWith\('\/'\)/);
  assert.doesNotMatch(appJs, /origin:\s*'https:\/\/relay13-core\.graylondonskyes\.workers\.dev'/);
  assert.match(adminHtml, /metraiyux-api-bases\.js\?v=relay13-api-base[\s\S]+app\.js/);
  assert.match(adminJs, /function relayApiPath/);
  assert.match(adminJs, /window\.MetrAIyuxApi\.path\('relay13', path\)/);
});

test('RELAY-03 forwards ConnectLog card, conversation, inbox, widget, and guardrail routes through /api/relay13', async () => {
  const calls = [];
  const e = env({ calls });
  const headers = { 'x-relay13-api-key': 'relay_test_key', authorization: 'Bearer admin-token' };

  const health = await siteWorker.fetch(req('/api/relay13/api/v1/connectlog/health'), e, ctx());
  assert.equal(health.status, 200);
  assert.equal((await health.json()).bridge, 'connectlog');

  const card = await siteWorker.fetch(req('/api/relay13/api/v1/connectlog/cards', {
    method: 'POST',
    headers,
    body: { workspace_id: 'ws_0s', connectlog_bridge: true, connectlog_card_id: 'card_0s', connectlog_card_label: '0S proof card' }
  }), e, ctx());
  assert.equal(card.status, 201);

  const scan = await siteWorker.fetch(req('/api/relay13/api/v1/connectlog/scan', {
    method: 'POST',
    headers,
    body: { workspace_id: 'ws_0s', connectlog_bridge: true, connectlog_card_id: 'card_0s', body: 'start owned conversation' }
  }), e, ctx());
  assert.equal(scan.status, 201);
  assert.equal((await scan.json()).conversation_id, 'conv_0s_relay');

  const inbox = await siteWorker.fetch(req('/api/relay13/api/v1/conversations/conv_0s_relay/messages?workspace_id=ws_0s', { headers }), e, ctx());
  assert.equal(inbox.status, 200);

  const reply = await siteWorker.fetch(req('/api/relay13/api/v1/conversations/conv_0s_relay/messages', {
    method: 'POST',
    headers,
    body: { workspace_id: 'ws_0s', sender_role: 'operator', body: 'operator reply' }
  }), e, ctx());
  assert.equal(reply.status, 201);

  const workspaces = await siteWorker.fetch(req('/api/relay13/api/admin/workspaces', { headers }), e, ctx());
  assert.equal(workspaces.status, 200);

  const widget = await siteWorker.fetch(req('/api/relay13/api/admin/widget-configs/publish', {
    method: 'POST',
    headers,
    body: { workspace_id: 'ws_0s', brand_name: 'ConnectLog', welcome_text: 'Send us a message.' }
  }), e, ctx());
  assert.equal(widget.status, 200);

  const guardrails = await siteWorker.fetch(req('/api/relay13/api/admin/guardrails', {
    method: 'POST',
    headers,
    body: { workspace_id: 'ws_0s', ai_mode: 'draft_only', allow_ai_auto_reply: false, allow_web_search: false }
  }), e, ctx());
  assert.equal(guardrails.status, 200);

  const guardrailProof = await siteWorker.fetch(req('/api/relay13/api/v1/guardrails/proof?workspace_id=ws_0s', { headers }), e, ctx());
  assert.equal(guardrailProof.status, 200);
  assert.equal((await guardrailProof.json()).feature, 'system_guardrails');

  const websocketPath = await siteWorker.fetch(req('/api/relay13/api/ws/conv_0s_relay?workspace_id=ws_0s'), e, ctx());
  assert.equal(websocketPath.status, 200);

  assert.deepEqual(calls.map((call) => `${call.method} ${call.path}`), [
    'GET /api/v1/connectlog/health',
    'POST /api/v1/connectlog/cards',
    'POST /api/v1/connectlog/scan',
    'GET /api/v1/conversations/conv_0s_relay/messages',
    'POST /api/v1/conversations/conv_0s_relay/messages',
    'GET /api/admin/workspaces',
    'POST /api/admin/widget-configs/publish',
    'POST /api/admin/guardrails',
    'GET /api/v1/guardrails/proof',
    'GET /api/ws/conv_0s_relay'
  ]);
  assert.equal(calls[1].apiKey, 'relay_test_key');
  assert.equal(calls[5].authorization, 'Bearer admin-token');
});

test('RELAY-02 blocks Relay13 implementation source while public previews remain reachable', async () => {
  const blocked = [
    '/relay13-core-v1.7-connectlog-operator-proof/src/index.js',
    '/relay13-core-v1.7-connectlog-operator-proof/scripts/guardrails-proof.mjs',
    '/relay13-core-v1.7-connectlog-operator-proof/migrations/0001_core.sql',
    '/relay13-core-v1.7-connectlog-operator-proof/.env.example',
    '/relay13-core-v1.7-connectlog-operator-proof/.gitignore',
    '/relay13-core-v1.7-connectlog-operator-proof/package.json',
    '/relay13-core-v1.7-connectlog-operator-proof/wrangler.toml',
    '/relay13-core-v1.7-connectlog-operator-proof/MCP_TOOLING_RECEIPT.json'
  ];

  for (const path of blocked) {
    const res = await siteWorker.fetch(req(path), env({ RELAY13_WORKER: undefined }), ctx());
    assert.equal(res.status, 404, path);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow', path);
  }

  const publicPages = [
    '/connectlog-v7.7-relay13-operator-proof/app.html',
    '/connectlog-v7.7-relay13-operator-proof/relay13-inbox.html',
    '/relay13-core-v1.7-connectlog-operator-proof/public/index.html',
    '/relay13-core-v1.7-connectlog-operator-proof/public/admin/index.html'
  ];

  for (const path of publicPages) {
    const res = await siteWorker.fetch(req(path), env({ RELAY13_WORKER: undefined }), ctx());
    assert.equal(res.status, 200, path);
  }
});
