import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import siteWorker from '../cloudflare/worker.js';
import saasWorker from '../cloudflare-saas-provisioning-worker/src/index.js';

const OWNER_CODE = 'owner-code';
const PROXY_SECRET = 'shared-proxy-secret-for-tests';
const GATE_HEADERS = {
  accept: 'text/html',
  'x-free99-admin-code': OWNER_CODE,
  'x-free99-gate-session': OWNER_CODE,
  'x-skye-gate-session': OWNER_CODE
};

function ctx() {
  return { waitUntil() {} };
}

function req(pathname, headers = { accept: 'text/html' }) {
  return new Request(`https://metraiyux.example${pathname}`, { headers });
}

function apiReq(pathname, { method = 'GET', headers = {}, body } = {}) {
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

function env(overrides = {}) {
  const saasCalls = overrides.saasCalls || [];
  return {
    FREE99_ADMIN_CODE: OWNER_CODE,
    ZERO_OS_INTERNAL_PROXY_SECRET: PROXY_SECRET,
    SAAS_WORKER: {
      async fetch(request) {
        const url = new URL(request.url);
        const text = request.method === 'GET' ? '' : await request.text();
        saasCalls.push({
          method: request.method,
          path: url.pathname,
          sharedGate: request.headers.get('x-0s-shared-gate') || '',
          proxySecret: request.headers.get('x-0s-internal-proxy-secret') || '',
          body: text
        });
        return Response.json({ ok: true, path: url.pathname });
      }
    },
    ASSETS: {
      async fetch(request) {
        const url = new URL(request.url);
        return new Response(`asset:${url.pathname}`, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      }
    },
    ...overrides
  };
}

const LEVEL_ROUTES = [
  '/ascension/index.html',
  '/branch-expansion/index.html',
  '/services/expansion-innovation-lab.html',
  '/government/index.html',
  '/services/government-enterprise-readiness.html',
  '/saas/index.html',
  '/saas/signup.html',
  '/saas/customer-dashboard.html'
];

const LIVE_OPERATOR_ROUTES = [
  '/live/skye-content-forge-publisher.html',
  '/live/skye-content-forge-publisher',
  '/live/connectlog-relay13-operator-proof.html',
  '/live/connectlog-relay13-operator-proof',
  '/live/company-knowledge-layer-proof.html',
  '/live/skye-media-center-operator-proof.html',
  '/live/relay13-chat-hub.html',
  '/live/marketing-made-easy-growth-suite.html',
  '/live/houseoperations-skyebox-operator-proof.html',
  '/live/skyeroutex-workforce-command.html',
  '/live/skyeprofitconsole-profit-console.html',
  '/live/skye-split-engine-operator-proof.html'
];

const SAAS_API_ROUTES = [
  { path: '/api/saas/customer-visuals?workspace_id=bob-smoke-shop-preview-001' },
  { path: '/api/saas/skymail/status?workspace_id=ws_1' },
  { path: '/api/saas/key-card?workspace_id=ws_1' },
  { path: '/api/saas/workspace-stack?workspace_id=ws_1' },
  { path: '/api/saas/client-preview?client=bobs-smoke-shop' },
  { path: '/api/saas/workspaces', method: 'POST', body: { company_name: 'Gate Test Co' } },
  { path: '/api/saas/billing/checkout-session', method: 'POST', body: { plan_id: 'starter-command' } },
  { path: '/api/saas/customer-command', method: 'POST', body: { workspace_id: 'ws_1', command: 'status' } },
  { path: '/api/saas/client-workspace/claim', method: 'POST', body: { client_id: 'bobs-smoke-shop', workspace_id: 'bob-smoke-shop-preview-001' } }
];

test('0S core level pages redirect unauthenticated visitors to the shared owner gate', async () => {
  for (const path of LEVEL_ROUTES) {
    const res = await siteWorker.fetch(req(path), env(), ctx());
    assert.equal(res.status, 302, path);
    assert.equal(res.headers.get('x-0s-gate'), 'fs27-required', path);
    assert.match(res.headers.get('location') || '', /\/admin\/login\.html\?return=/, path);
  }
});

test('0S core level pages render after the shared FS27/Free99 gate is presented', async () => {
  for (const path of LEVEL_ROUTES) {
    const res = await siteWorker.fetch(req(path, GATE_HEADERS), env(), ctx());
    assert.equal(res.status, 200, path);
    assert.match(await res.text(), /^asset:/, path);
  }
});

test('0S live operator proof surfaces are gated even when requested without .html', async () => {
  for (const path of LIVE_OPERATOR_ROUTES) {
    const res = await siteWorker.fetch(req(path), env(), ctx());
    assert.equal(res.status, 302, path);
    assert.equal(res.headers.get('x-0s-gate'), 'fs27-required', path);
    assert.match(res.headers.get('location') || '', /\/admin\/login\.html\?return=/, path);
  }
});

test('0S live operator proof surfaces render through the shared gate', async () => {
  for (const path of LIVE_OPERATOR_ROUTES) {
    const res = await siteWorker.fetch(req(path, GATE_HEADERS), env(), ctx());
    assert.equal(res.status, 200, path);
    assert.match(await res.text(), /^asset:/, path);
  }
});

test('0S SaaS API mount rejects unauthenticated reads and mutations before proxying', async () => {
  const saasCalls = [];
  const e = env({ saasCalls });
  for (const route of SAAS_API_ROUTES) {
    const res = await siteWorker.fetch(apiReq(route.path, route), e, ctx());
    assert.equal(res.status, 401, route.path);
    assert.equal(res.headers.get('x-0s-gate'), 'fs27-required', route.path);
  }
  assert.equal(saasCalls.length, 0);
});

test('0S SaaS API mount forwards only after shared gate/operator auth and stamps internal proxy proof', async () => {
  const saasCalls = [];
  const e = env({ saasCalls });
  const headers = { ...GATE_HEADERS, accept: 'application/json' };
  for (const route of SAAS_API_ROUTES) {
    const res = await siteWorker.fetch(apiReq(route.path, { ...route, headers }), e, ctx());
    assert.equal(res.status, 200, route.path);
  }
  assert.equal(saasCalls.length, SAAS_API_ROUTES.length);
  for (const call of saasCalls) {
    assert.equal(call.sharedGate, 'operator', call.path);
    assert.equal(call.proxySecret, PROXY_SECRET, call.path);
  }
});

test('SaaS worker direct preview/admin fallbacks fail closed without internal shared-gate proof', async () => {
  const checks = [
    ['/api/saas/customer-visuals?workspace_id=bob-smoke-shop-preview-001', 'GET', null, 401],
    ['/api/saas/action-event', 'POST', { action: 'click' }, 401],
    ['/api/saas/client-login', 'POST', { client_id: 'bobs-smoke-shop' }, 410],
    ['/api/saas/client-preview?client=bobs-smoke-shop', 'GET', null, 401],
    ['/api/saas/workspaces', 'POST', { company_name: 'Gate Test Co' }, 401],
    ['/api/saas/billing/checkout-session', 'POST', { plan_id: 'starter-command' }, 401],
    ['/api/saas/billing/webhook', 'POST', { type: 'checkout.session.completed' }, 503],
    ['/api/saas/customer-command', 'POST', { workspace_id: 'ws_1', command: 'status' }, 401],
    ['/api/saas/ledger', 'GET', null, 401]
  ];
  for (const [path, method, body, status] of checks) {
    const res = await saasWorker.fetch(apiReq(path, { method, body }), {}, ctx());
    assert.equal(res.status, status, path);
  }
});

test('NorthStar mounted password and operator-token lanes are disabled by the shared gate', async () => {
  const unauth = await siteWorker.fetch(apiReq('/api/northstar/auth-login', {
    method: 'POST',
    body: { workspaceSlug: 'demo', email: 'owner@example.com', password: 'password' }
  }), env(), ctx());
  assert.equal(unauth.status, 401);
  assert.equal(unauth.headers.get('x-0s-gate'), 'fs27-required');

  const authed = await siteWorker.fetch(apiReq('/api/northstar/auth-login', {
    method: 'POST',
    headers: { ...GATE_HEADERS, accept: 'application/json' },
    body: { workspaceSlug: 'demo', email: 'owner@example.com', password: 'password' }
  }), env(), ctx());
  assert.equal(authed.status, 410);
  assert.equal((await authed.json()).error, 'northstar_password_login_disabled_by_shared_gate');

  const appJs = await readFile(new URL('../northstar/assets/app.js', import.meta.url), 'utf8');
  const workspaceClient = await readFile(new URL('../northstar/assets/workspace-client.js', import.meta.url), 'utf8');
  assert.doesNotMatch(appJs, /OPERATOR_PROVISION_TOKEN/);
  assert.doesNotMatch(appJs, /Temporary Password/);
  assert.doesNotMatch(appJs, /oneTimePassword/);
  assert.doesNotMatch(workspaceClient, /api\('\/auth-login'/);
  assert.doesNotMatch(workspaceClient, /operatorToken/);
  assert.doesNotMatch(workspaceClient, /params\.get\('local'\) === '1' \|\|/);
});
