import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import worker from '../cloudflare/worker.js';

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
        return Response.json({ active: true, ok: true, sub: 'client', email: 'dev.tester@example.com', role: 'user', scope: '0s.gate.read', marketing_key: 'skdevpbk' });
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
  ASSETS: {
    fetch: async (request) => new Response(`asset:${new URL(request.url).pathname}`, {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    })
  }
};

const unauthenticatedPlaybook = await call(env, '/devs-playbook/', {
  method: 'GET',
  headers: { accept: 'text/html' }
});
assert.equal(unauthenticatedPlaybook.status, 302);
assert.match(unauthenticatedPlaybook.headers.get('location') || '', /\/devs-playbook\/login\.html/);

const signup = await call(env, '/api/marketing-keys/signup', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    email: 'Dev.Tester@example.com',
    name: 'Dev Tester',
    company: 'Playbook Co',
    marketing_key: 'skdevpbk',
    returnTo: '/devs-playbook/'
  })
});
assert.equal(signup.status, 200);
const signupBody = await json(signup);
assert.equal(signupBody.ok, true);
assert.equal(signupBody.gate_required, true);
assert.equal(signupBody.table, 'marketing_keys');
assert.equal(signupBody.marketing_key, 'skdevpbk');
assert.equal(signupBody.gate_user.email, 'dev.tester@example.com');
assert.match(signupBody.gate_user.id, /-skdevpbk$/);
assert.match(signupBody.gateUrl, /\/gate\/signup\//);

const meWithoutGate = await call(env, '/api/marketing-keys/me', {
  method: 'GET'
});
assert.equal(meWithoutGate.status, 401);
const gateCookieHeader = 'skye_gate_session=fs27.user.token';

const me = await call(env, '/api/marketing-keys/me', {
  method: 'GET',
  headers: { cookie: gateCookieHeader }
});
assert.equal(me.status, 200);
const meBody = await json(me);
assert.equal(meBody.authenticated, true);
assert.equal(meBody.tracking_tag, 'skdevpbk');
assert.equal(meBody.gate_user.id, 'client');

const authenticatedPlaybook = await call(env, '/devs-playbook/', {
  method: 'GET',
  headers: { cookie: gateCookieHeader, accept: 'text/html' }
});
assert.equal(authenticatedPlaybook.status, 200);
assert.equal(await authenticatedPlaybook.text(), 'asset:/devs-playbook/index.html');

const broaderZeroOsGate = await call(env, '/northstar/index.html', {
  method: 'GET',
  headers: { cookie: gateCookieHeader, accept: 'text/html' }
});
assert.equal(broaderZeroOsGate.status, 200);
assert.equal(await broaderZeroOsGate.text(), 'asset:/northstar/index.html');

const ownerHeaders = {
  'content-type': 'application/json',
  'x-free99-admin-code': env.FREE99_ADMIN_CODE
};
const signups = await call(env, '/api/marketing-keys/signups?key=skdevpbk', {
  method: 'GET',
  headers: ownerHeaders
});
assert.equal(signups.status, 200);
const signupsBody = await json(signups);
assert.equal(signupsBody.table, 'marketing_keys');
assert.equal(signupsBody.count, 1);
assert.equal(signupsBody.counts.skdevpbk, 1);

const logout = await call(env, '/api/marketing-keys/logout', {
  method: 'POST',
  headers: { cookie: gateCookieHeader }
});
assert.equal(logout.status, 200);
const logoutBody = await json(logout);
assert.equal(logoutBody.shared_gate_auth, true);

const outDir = path.join(process.cwd(), 'test-artifacts', 'marketing-keys-dev-playbook');
fs.mkdirSync(outDir, { recursive: true });
const report = {
  ok: true,
  marketing_key: signupBody.marketing_key,
  tracking_tag: signupBody.tracking_tag,
  gate_user_id: signupBody.gate_user.id,
  unauthenticated_playbook_status: unauthenticatedPlaybook.status,
  authenticated_playbook_status: authenticatedPlaybook.status,
  broader_zero_os_attempt_status: broaderZeroOsGate.status,
  me_without_gate_status: meWithoutGate.status,
  owner_signup_count: signupsBody.count,
  proof_level: 'local_deep_smoke_only_live_deploy_and_headed_browser_proof_required'
};
fs.writeFileSync(path.join(outDir, 'smoke-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
