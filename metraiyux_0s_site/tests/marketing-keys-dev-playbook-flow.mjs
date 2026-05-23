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

function setCookies(response) {
  return typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie') || ''];
}

const kv = new MemoryKv();
const env = {
  SITE_EVENTS_KV: kv,
  MARKETING_KEY_SESSION_SECRET: 'marketing-key-session-secret-for-smoke',
  OWNER_ADMIN_SESSION_SECRET: 'owner-admin-session-secret-for-smoke',
  FREE99_ADMIN_CODE: 'owner-admin-code-for-smoke',
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
assert.equal(signupBody.table, 'marketing_keys');
assert.equal(signupBody.marketing_key, 'skdevpbk');
assert.equal(signupBody.gate_user.email, 'dev.tester@example.com');
assert.match(signupBody.gate_user.id, /-skdevpbk$/);

const cookie = setCookies(signup).find((item) => item.startsWith('marketing_key_session='));
assert.ok(cookie, 'marketing key cookie should be set');
const cookieHeader = cookie.split(';')[0];

const me = await call(env, '/api/marketing-keys/me', {
  method: 'GET',
  headers: { cookie: cookieHeader }
});
assert.equal(me.status, 200);
const meBody = await json(me);
assert.equal(meBody.authenticated, true);
assert.equal(meBody.tracking_tag, 'skdevpbk');
assert.match(meBody.gate_user.id, /-skdevpbk$/);

const authenticatedPlaybook = await call(env, '/devs-playbook/', {
  method: 'GET',
  headers: { cookie: cookieHeader, accept: 'text/html' }
});
assert.equal(authenticatedPlaybook.status, 200);
assert.equal(await authenticatedPlaybook.text(), 'asset:/devs-playbook/index.html');

const broaderZeroOsAttempt = await call(env, '/northstar/index.html', {
  method: 'GET',
  headers: { cookie: cookieHeader, accept: 'text/html' }
});
assert.equal(broaderZeroOsAttempt.status, 302);
assert.match(broaderZeroOsAttempt.headers.get('location') || '', /\/admin\/login\.html/);

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
  headers: { cookie: cookieHeader }
});
assert.equal(logout.status, 200);
assert.ok(setCookies(logout).some((item) => item.startsWith('marketing_key_session=;')));

const outDir = path.join(process.cwd(), 'test-artifacts', 'marketing-keys-dev-playbook');
fs.mkdirSync(outDir, { recursive: true });
const report = {
  ok: true,
  marketing_key: signupBody.marketing_key,
  tracking_tag: signupBody.tracking_tag,
  gate_user_id: signupBody.gate_user.id,
  unauthenticated_playbook_status: unauthenticatedPlaybook.status,
  authenticated_playbook_status: authenticatedPlaybook.status,
  broader_zero_os_attempt_status: broaderZeroOsAttempt.status,
  owner_signup_count: signupsBody.count,
  proof_level: 'local_deep_smoke_only_live_deploy_and_headed_browser_proof_required'
};
fs.writeFileSync(path.join(outDir, 'smoke-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
