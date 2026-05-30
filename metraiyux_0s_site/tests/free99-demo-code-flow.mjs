import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import worker from '../cloudflare/worker.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

class MemoryKv {
  constructor() {
    this.items = new Map();
  }

  async get(key, options = {}) {
    const raw = this.items.get(key) ?? null;
    if (raw == null) return null;
    if (options.type === 'json') return JSON.parse(raw);
    return raw;
  }

  async put(key, value) {
    this.items.set(key, String(value));
  }

  async list(options = {}) {
    const prefix = options.prefix || '';
    const limit = options.limit || 1000;
    return {
      keys: [...this.items.keys()]
        .filter((name) => name.startsWith(prefix))
        .slice(0, limit)
        .map((name) => ({ name }))
    };
  }
}

function makeCtx() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) {
      pending.push(Promise.resolve(promise));
    }
  };
}

async function call(env, input, init = {}) {
  const ctx = makeCtx();
  const request = input instanceof Request
    ? input
    : new Request(`https://metraiyux-0s-full-system.graylondonskyes.workers.dev${input}`, init);
  const response = await worker.fetch(request, env, ctx);
  await Promise.allSettled(ctx.pending);
  return response;
}

async function json(response) {
  return response.json();
}

const kv = new MemoryKv();
const fs27Worker = {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/admin/login') {
      return Response.json({ ok: true, token: 'fs27.admin.token' });
    }
    if (['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'].includes(url.pathname)) {
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || '').replace(/^Bearer\s+/i, '');
      if (token === 'fs27.admin.token') {
        return Response.json({ active: true, ok: true, sub: 'owner', email: 'owner@example.com', role: 'owner', scope: 'admin.read admin.write' });
      }
      if (token === 'fs27.user.token') {
        return Response.json({ active: true, ok: true, sub: 'client', email: 'client@example.com', role: 'user', scope: '0s.gate.read' });
      }
      return Response.json({ active: false, ok: false, error: 'inactive' }, { status: 401 });
    }
    return Response.json({ ok: false, error: 'not found' }, { status: 404 });
  }
};
const env = {
  SITE_EVENTS_KV: kv,
  OWNER_ADMIN_SESSION_SECRET: 'owner-admin-session-secret-for-smoke',
  FREE99_ADMIN_CODE: 'owner-admin-code-for-smoke',
  SKYGATEFS27_WORKER: fs27Worker,
  ZERO_OS_PUBLIC_ORIGIN: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev',
  ASSETS: {
    fetch: async (request) => new Response(`asset:${new URL(request.url).pathname}`, {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    })
  }
};

const ownerHeaders = {
  'content-type': 'application/json',
  'x-free99-admin-code': env.FREE99_ADMIN_CODE
};

const initialRotate = await call(env, '/api/free99/demo-code/approve-rotation', {
  method: 'POST',
  headers: ownerHeaders,
  body: JSON.stringify({ newCode: 'SIP-DEMO-SMOKE-1' })
});
assert.equal(initialRotate.status, 200);
assert.match((await json(initialRotate)).code_preview, /^SIP-/);

const login = await call(env, '/api/free99/demo-login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    business_name: 'Closure Smoke Co',
    name: 'Gate Tester',
    email: 'smoke@example.com',
    phone: '+16025551212',
    sms_opt_in: true,
    code: 'SIP-DEMO-SMOKE-1',
    returnTo: '/northstar/index.html'
  })
});
assert.equal(login.status, 200);
const loginBody = await json(login);
assert.equal(loginBody.gate_required, true);
assert.equal(loginBody.demo_code_validated, true);
assert.equal(loginBody.platform_id, 'signinpro-northstar');
assert.equal(loginBody.usage_lane, 'free99-business-demo');
const setCookies = typeof login.headers.getSetCookie === 'function'
  ? login.headers.getSetCookie()
  : [login.headers.get('set-cookie') || ''];
assert.ok(!setCookies.some((cookie) => cookie.startsWith('skye_gate_session=')));
assert.match(loginBody.gateUrl, /\/gate\/signup\//);

const gatedWithoutToken = await call(env, '/northstar/index.html', {
  method: 'GET',
  headers: { accept: 'text/html' }
});
assert.equal(gatedWithoutToken.status, 302);
assert.match(gatedWithoutToken.headers.get('location') || '', /\/admin\/login\.html/);

const gatedWithDemo = await call(env, '/northstar/index.html', {
  method: 'GET',
  headers: { authorization: 'Bearer fs27.user.token', accept: 'text/html' }
});
assert.equal(gatedWithDemo.status, 200);
assert.equal(await gatedWithDemo.text(), 'asset:/northstar/index.html');

const northstarAuthSession = await call(env, '/api/northstar/auth-session', {
  method: 'GET',
  headers: { authorization: 'Bearer fs27.user.token', accept: 'application/json' }
});
assert.equal(northstarAuthSession.status, 200);
const northstarAuthSessionBody = await json(northstarAuthSession);
assert.equal(northstarAuthSessionBody.authenticated, true);
assert.equal(northstarAuthSessionBody.demo, false);
assert.equal(northstarAuthSessionBody.platform_id, 'signinpro-northstar');

const northstarWorkspaceSync = await call(env, '/api/northstar/workspace-sync', {
  method: 'GET',
  headers: { authorization: 'Bearer fs27.user.token', accept: 'application/json' }
});
assert.equal(northstarWorkspaceSync.status, 200);
const northstarWorkspaceSyncBody = await json(northstarWorkspaceSync);
assert.equal(northstarWorkspaceSyncBody.ok, true);
assert.equal(northstarWorkspaceSyncBody.persistence, 'browser-local');

const demoManageAttempt = await call(env, '/api/free99/demo-code/status', {
  method: 'GET',
  headers: { authorization: 'Bearer fs27.user.token' }
});
assert.equal(demoManageAttempt.status, 403);

const signups = await call(env, '/api/free99/demo-signups?limit=5', {
  method: 'GET',
  headers: ownerHeaders
});
assert.equal(signups.status, 200);
const signupBody = await json(signups);
assert.equal(signupBody.count, 1);
assert.equal(signupBody.items[0].business_name, 'Closure Smoke Co');

const secondRotate = await call(env, '/api/free99/demo-code/approve-rotation', {
  method: 'POST',
  headers: ownerHeaders,
  body: JSON.stringify({ newCode: 'SIP-DEMO-SMOKE-2' })
});
assert.equal(secondRotate.status, 200);

const oldCodeLogin = await call(env, '/api/free99/demo-login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    business_name: 'Old Code Co',
    email: 'old@example.com',
    code: 'SIP-DEMO-SMOKE-1'
  })
});
assert.equal(oldCodeLogin.status, 401);

const newCodeLogin = await call(env, '/api/free99/demo-login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    business_name: 'New Code Co',
    email: 'new@example.com',
    code: 'SIP-DEMO-SMOKE-2'
  })
});
assert.equal(newCodeLogin.status, 200);
const newCodeLoginBody = await json(newCodeLogin);
assert.equal(newCodeLoginBody.gate_required, true);

const status = await call(env, '/api/free99/demo-code/status', {
  method: 'GET',
  headers: ownerHeaders
});
assert.equal(status.status, 200);
const statusBody = await json(status);
assert.equal(statusBody.active, true);
assert.equal(statusBody.ttl_seconds, 172800);
assert.ok(statusBody.seconds_remaining <= 172800);

console.log(JSON.stringify({
  ok: true,
  platform_id: loginBody.platform_id,
  usage_lane: loginBody.usage_lane,
  signup_count_after_first_login: signupBody.count,
  old_code_rejected: true,
  new_code_accepted: true,
  northstar_auth_session_demo: northstarAuthSessionBody.demo,
  northstar_workspace_sync: northstarWorkspaceSyncBody.persistence,
  demo_management_blocked_status: demoManageAttempt.status,
  unauthenticated_gate_status: gatedWithoutToken.status,
  authenticated_demo_gate_status: gatedWithDemo.status
}, null, 2));
