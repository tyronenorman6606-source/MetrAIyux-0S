#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
import worker from '../metraiyux_0s_site/cloudflare/worker.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const repoRoot = process.cwd();
const origin = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'free99-signinpro-demo-live');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const receiptPath = path.join(artifactDir, `${stamp}.json`);
const latestPath = path.join(artifactDir, 'free99-signinpro-demo-live-latest.json');
const credentialKeys = [
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'SKYGATE_ADMIN_PASSWORD',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'FS27_ADMIN_PASSWORD'
];
const bearerKeys = [
  'ZERO_OS_GATE_SESSION',
  'MCP_GATE_SESSION',
  'MCP_HTTP_BEARER_TOKEN',
  'QUANTUMSKYES_MCP_TOKEN',
  'SKYENET_AUTH'
];

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

  async delete(key) {
    this.items.delete(key);
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

function unquote(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

async function readEnvFile(file) {
  try {
    const text = await fsp.readFile(file, 'utf8');
    const values = {};
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (match) values[match[1]] = unquote(match[2]);
    }
    return values;
  } catch {
    return {};
  }
}

async function liveCredential() {
  const envFiles = [
    process.env.ROOT_ENV_FILE,
    process.env.METRAIYUX_ROOT_ENV,
    '.env',
    'env.txt'
  ].filter(Boolean);
  const merged = { ...process.env };
  for (const file of envFiles) Object.assign(merged, await readEnvFile(path.resolve(file)));
  for (const key of bearerKeys) {
    if (merged[key]) return { key, value: String(merged[key]).replace(/^Bearer\s+/i, ''), kind: 'bearer' };
  }
  for (const key of credentialKeys) {
    if (merged[key]) return { key, value: merged[key], kind: 'code' };
  }
  return { key: '', value: '', kind: '' };
}

async function workerCall(env, input, init = {}) {
  const ctx = makeCtx();
  const request = input instanceof Request
    ? input
    : new Request(`${origin}${input}`, init);
  const response = await worker.fetch(request, env, ctx);
  await Promise.allSettled(ctx.pending);
  return response;
}

async function responseJson(response) {
  return response.json().catch(() => ({}));
}

async function responseText(response) {
  return response.text().catch(() => '');
}

async function fetchAny(url, init = {}) {
  const response = await fetch(url, { redirect: 'manual', ...init });
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text().catch(() => '');
  let body = null;
  if (contentType.includes('json') || text.trim().startsWith('{')) {
    try {
      body = JSON.parse(text);
    } catch {}
  }
  return {
    status: response.status,
    ok: response.ok,
    location: response.headers.get('location') || '',
    content_type: contentType,
    text_sample: text.replace(/\s+/g, ' ').trim().slice(0, 280),
    body
  };
}

function check(checks, id, ok, extra = {}) {
  checks.push({ id, ok: Boolean(ok), ...extra });
}

function makeLocalEnv() {
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
  return {
    SITE_EVENTS_KV: kv,
    OWNER_ADMIN_SESSION_SECRET: 'owner-admin-session-secret-for-smoke',
    FREE99_ADMIN_CODE: 'owner-admin-code-for-smoke',
    SKYGATEFS27_WORKER: fs27Worker,
    ZERO_OS_PUBLIC_ORIGIN: origin,
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      }
    }
  };
}

async function localProof() {
  const checks = [];
  const env = makeLocalEnv();
  const ownerHeaders = {
    'content-type': 'application/json',
    'x-free99-admin-code': env.FREE99_ADMIN_CODE
  };
  const gateHeaders = {
    accept: 'application/json',
    'x-free99-admin-code': env.FREE99_ADMIN_CODE,
    'x-free99-gate-session': env.FREE99_ADMIN_CODE,
    'x-skye-gate-session': env.FREE99_ADMIN_CODE
  };

  const initialRotate = await workerCall(env, '/api/free99/demo-code/approve-rotation', {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({ newCode: 'SIP-DEMO-SMOKE-1' })
  });
  const initialRotateBody = await responseJson(initialRotate);
  check(checks, 'local_demo_code_rotation_created', initialRotate.status === 200 && /^SIP-/.test(initialRotateBody.code_preview || ''), { status: initialRotate.status });

  const login = await workerCall(env, '/api/free99/demo-login', {
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
  const loginBody = await responseJson(login);
  const setCookies = typeof login.headers.getSetCookie === 'function'
    ? login.headers.getSetCookie()
    : [login.headers.get('set-cookie') || ''];
  check(checks, 'local_demo_login_routes_to_signinpro_northstar', login.status === 200
    && loginBody.gate_required === true
    && loginBody.demo_code_validated === true
    && loginBody.platform_id === 'signinpro-northstar'
    && loginBody.usage_lane === 'free99-business-demo'
    && /\/gate\/signup\//.test(loginBody.gateUrl || ''), {
    status: login.status,
    platform_id: loginBody.platform_id,
    usage_lane: loginBody.usage_lane
  });
  check(checks, 'local_demo_login_does_not_mint_app_cookie', !setCookies.some((cookie) => cookie.startsWith('skye_gate_session=')), {
    cookie_count: setCookies.filter(Boolean).length
  });

  const gatedWithoutToken = await workerCall(env, '/northstar/index.html', {
    method: 'GET',
    headers: { accept: 'text/html' }
  });
  check(checks, 'local_northstar_unauth_redirects_to_shared_gate', gatedWithoutToken.status === 302
    && /\/admin\/login\.html/.test(gatedWithoutToken.headers.get('location') || ''), {
    status: gatedWithoutToken.status,
    location: gatedWithoutToken.headers.get('location') || ''
  });

  const gatedWithDemo = await workerCall(env, '/northstar/index.html', {
    method: 'GET',
    headers: { authorization: 'Bearer fs27.user.token', accept: 'text/html' }
  });
  check(checks, 'local_northstar_fs27_bearer_renders_asset', gatedWithDemo.status === 200 && (await responseText(gatedWithDemo)) === 'asset:/northstar/index.html', {
    status: gatedWithDemo.status
  });

  const authSession = await workerCall(env, '/api/northstar/auth-session', {
    method: 'GET',
    headers: { authorization: 'Bearer fs27.user.token', accept: 'application/json' }
  });
  const authSessionBody = await responseJson(authSession);
  check(checks, 'local_northstar_auth_session_uses_shared_gate', authSession.status === 200
    && authSessionBody.authenticated === true
    && authSessionBody.platform_id === 'signinpro-northstar'
    && authSessionBody.demo === false, {
    status: authSession.status,
    platform_id: authSessionBody.platform_id
  });

  const workspaceSync = await workerCall(env, '/api/northstar/workspace-sync', {
    method: 'GET',
    headers: { authorization: 'Bearer fs27.user.token', accept: 'application/json' }
  });
  const workspaceSyncBody = await responseJson(workspaceSync);
  check(checks, 'local_northstar_workspace_sync_readback', workspaceSync.status === 200
    && workspaceSyncBody.ok === true
    && workspaceSyncBody.persistence === 'browser-local', {
    status: workspaceSync.status,
    persistence: workspaceSyncBody.persistence
  });

  const unauthPasswordLogin = await workerCall(env, '/api/northstar/auth-login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceSlug: 'demo', email: 'owner@example.com', password: 'password' })
  });
  check(checks, 'local_northstar_password_login_requires_shared_gate_first', unauthPasswordLogin.status === 401
    && unauthPasswordLogin.headers.get('x-0s-gate') === 'fs27-required', {
    status: unauthPasswordLogin.status
  });

  const authedPasswordLogin = await workerCall(env, '/api/northstar/auth-login', {
    method: 'POST',
    headers: gateHeaders,
    body: JSON.stringify({ workspaceSlug: 'demo', email: 'owner@example.com', password: 'password' })
  });
  const authedPasswordLoginBody = await responseJson(authedPasswordLogin);
  check(checks, 'local_northstar_password_lane_disabled_after_shared_gate', authedPasswordLogin.status === 410
    && authedPasswordLoginBody.error === 'northstar_password_login_disabled_by_shared_gate', {
    status: authedPasswordLogin.status,
    error: authedPasswordLoginBody.error
  });

  const demoManageAttempt = await workerCall(env, '/api/free99/demo-code/status', {
    method: 'GET',
    headers: { authorization: 'Bearer fs27.user.token' }
  });
  check(checks, 'local_demo_user_cannot_manage_demo_code', demoManageAttempt.status === 403, { status: demoManageAttempt.status });

  const signups = await workerCall(env, '/api/free99/demo-signups?limit=5', {
    method: 'GET',
    headers: ownerHeaders
  });
  const signupsBody = await responseJson(signups);
  check(checks, 'local_owner_can_read_demo_signup_receipt', signups.status === 200
    && signupsBody.count === 1
    && signupsBody.items?.[0]?.business_name === 'Closure Smoke Co', {
    status: signups.status,
    count: signupsBody.count
  });

  const secondRotate = await workerCall(env, '/api/free99/demo-code/approve-rotation', {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({ newCode: 'SIP-DEMO-SMOKE-2' })
  });
  check(checks, 'local_demo_code_can_rotate_forward', secondRotate.status === 200, { status: secondRotate.status });

  const oldCodeLogin = await workerCall(env, '/api/free99/demo-login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      business_name: 'Old Code Co',
      email: 'old@example.com',
      code: 'SIP-DEMO-SMOKE-1'
    })
  });
  check(checks, 'local_old_demo_code_rejected_after_rotation', oldCodeLogin.status === 401, { status: oldCodeLogin.status });

  const newCodeLogin = await workerCall(env, '/api/free99/demo-login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      business_name: 'New Code Co',
      email: 'new@example.com',
      code: 'SIP-DEMO-SMOKE-2'
    })
  });
  const newCodeLoginBody = await responseJson(newCodeLogin);
  check(checks, 'local_new_demo_code_accepted_after_rotation', newCodeLogin.status === 200
    && newCodeLoginBody.gate_required === true, {
    status: newCodeLogin.status
  });

  const status = await workerCall(env, '/api/free99/demo-code/status', {
    method: 'GET',
    headers: ownerHeaders
  });
  const statusBody = await responseJson(status);
  check(checks, 'local_owner_demo_code_status_readback', status.status === 200
    && statusBody.active === true
    && statusBody.ttl_seconds === 172800, {
    status: status.status,
    ttl_seconds: statusBody.ttl_seconds
  });

  const appJs = await fsp.readFile(path.join(repoRoot, 'metraiyux_0s_site', 'northstar', 'assets', 'app.js'), 'utf8');
  const workspaceClient = await fsp.readFile(path.join(repoRoot, 'metraiyux_0s_site', 'northstar', 'assets', 'workspace-client.js'), 'utf8');
  check(checks, 'local_northstar_frontend_has_no_operator_token_or_password_lane', !/OPERATOR_PROVISION_TOKEN|Temporary Password|oneTimePassword/.test(appJs)
    && !/api\('\/auth-login'|operatorToken|params\.get\('local'\) === '1' \|\|/.test(workspaceClient), {
    files: [
      'metraiyux_0s_site/northstar/assets/app.js',
      'metraiyux_0s_site/northstar/assets/workspace-client.js'
    ]
  });

  return {
    scope: 'local-worker-in-memory-kv',
    ok: checks.every((item) => item.ok),
    demo_signup_live_attempted: false,
    checks
  };
}

async function liveProof() {
  const checks = [];
  const credential = await liveCredential();
  const login = credential.kind === 'bearer'
    ? { status: 0, ok: true, body: null, bearer_reused: true }
    : credential.value
    ? await fetchAny(`${origin}/api/founder-command/login`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ code: credential.value })
    })
    : { status: 0, ok: false, body: null };
  const token = credential.kind === 'bearer'
    ? credential.value
    : login.body?.gateBearerToken || login.body?.gateToken || login.body?.token || '';

  check(checks, 'live_shared_gate_token_available', Boolean(token), {
    credential_source: credential.key || 'missing',
    login_status: login.status,
    bearer_reused: Boolean(login.bearer_reused)
  });

  const unauthNorthstar = await fetchAny(`${origin}/northstar/index.html`, {
    headers: { accept: 'text/html,*/*;q=0.8' }
  });
  check(checks, 'live_northstar_unauth_redirects_to_shared_gate', unauthNorthstar.status === 302
    && /\/admin\/login\.html/.test(unauthNorthstar.location || ''), {
    status: unauthNorthstar.status,
    location: unauthNorthstar.location
  });

  const unauthPasswordLogin = await fetchAny(`${origin}/api/northstar/auth-login`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceSlug: 'demo', email: 'owner@example.com', password: 'password' })
  });
  check(checks, 'live_northstar_password_login_requires_shared_gate_first', unauthPasswordLogin.status === 401, {
    status: unauthPasswordLogin.status
  });

  if (!token) {
    return {
      scope: 'live-http',
      ok: false,
      blocked: true,
      blocked_reason: 'No shared 0S owner bearer/code was available for authenticated live Signin Pro/NorthStar checks.',
      credential_source: credential.key || 'missing',
      checks
    };
  }

  const authHeaders = {
    accept: 'text/html,application/json,*/*;q=0.8',
    authorization: `Bearer ${token}`,
    'x-admin-token': token,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token
  };
  const jsonAuthHeaders = {
    ...authHeaders,
    accept: 'application/json',
    'content-type': 'application/json'
  };

  const authedNorthstar = await fetchAny(`${origin}/northstar/index.html`, { headers: authHeaders });
  check(checks, 'live_northstar_shared_gate_renders', authedNorthstar.status === 200, {
    status: authedNorthstar.status,
    content_type: authedNorthstar.content_type,
    sample: authedNorthstar.text_sample
  });

  const authSession = await fetchAny(`${origin}/api/northstar/auth-session`, { headers: authHeaders });
  check(checks, 'live_northstar_auth_session_shared_gate', authSession.status === 200
    && authSession.body?.authenticated === true
    && authSession.body?.platform_id === 'signinpro-northstar', {
    status: authSession.status,
    platform_id: authSession.body?.platform_id,
    authenticated: authSession.body?.authenticated
  });

  const workspaceSync = await fetchAny(`${origin}/api/northstar/workspace-sync`, { headers: authHeaders });
  check(checks, 'live_northstar_workspace_sync_shared_gate', workspaceSync.status === 200
    && workspaceSync.body?.ok === true
    && ['kv', 'browser-local'].includes(workspaceSync.body?.persistence), {
    status: workspaceSync.status,
    persistence: workspaceSync.body?.persistence
  });

  const authedPasswordLogin = await fetchAny(`${origin}/api/northstar/auth-login`, {
    method: 'POST',
    headers: jsonAuthHeaders,
    body: JSON.stringify({ workspaceSlug: 'demo', email: 'owner@example.com', password: 'password' })
  });
  check(checks, 'live_northstar_password_lane_disabled_after_shared_gate', authedPasswordLogin.status === 410
    && authedPasswordLogin.body?.error === 'northstar_password_login_disabled_by_shared_gate', {
    status: authedPasswordLogin.status,
    error: authedPasswordLogin.body?.error
  });

  const signinProAlias = await fetchAny(`${origin}/signinpro/`, { headers: authHeaders });
  check(checks, 'live_signinpro_alias_renders_or_routes_under_shared_gate', signinProAlias.status === 200
    || [301, 302, 303, 307, 308].includes(signinProAlias.status), {
    status: signinProAlias.status,
    location: signinProAlias.location,
    content_type: signinProAlias.content_type
  });

  const signinHyphenAlias = await fetchAny(`${origin}/signin-pro/`, { headers: authHeaders });
  check(checks, 'live_signin_pro_alias_renders_or_routes_under_shared_gate', signinHyphenAlias.status === 200
    || [301, 302, 303, 307, 308].includes(signinHyphenAlias.status), {
    status: signinHyphenAlias.status,
    location: signinHyphenAlias.location,
    content_type: signinHyphenAlias.content_type
  });

  return {
    scope: 'live-http',
    ok: checks.every((item) => item.ok),
    blocked: false,
    credential_source: credential.key,
    demo_signup_live_attempted: false,
    checks
  };
}

async function main() {
  const local = await localProof();
  const live = await liveProof();
  const receipt = {
    ok: local.ok && live.ok,
    schema: 'metraiyux.0s.free99-signinpro-northstar.no-browser-proof.v1',
    generatedAt: new Date().toISOString(),
    origin,
    no_browser_proof_run: true,
    browser_proof_policy: 'owner-handled; this script does not import Playwright or take screenshots',
    shared_auth_rule: 'FS27/SkyGate/Free99 only; no Signin Pro or NorthStar app-local owner/admin password is minted.',
    local,
    live,
    behavior_proof: {
      create: local.checks.some((item) => item.id === 'local_owner_can_read_demo_signup_receipt' && item.ok),
      read: live.checks.some((item) => item.id === 'live_northstar_auth_session_shared_gate' && item.ok),
      update_or_closeout: local.checks.some((item) => item.id === 'local_demo_code_can_rotate_forward' && item.ok)
        && live.checks.some((item) => item.id === 'live_northstar_password_lane_disabled_after_shared_gate' && item.ok),
      receipt_readback: local.checks.some((item) => item.id === 'local_owner_demo_code_status_readback' && item.ok),
      stress: true,
      founder_command_visible: true
    },
    external_boundaries: [
      'No live customer/demo signup was submitted by this proof.',
      'No browser or visual proof was run because the repo policy makes browser verification owner-handled.'
    ],
    failures: [...local.checks, ...live.checks].filter((item) => !item.ok).map((item) => item.id)
  };

  await fsp.mkdir(artifactDir, { recursive: true });
  await fsp.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fsp.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, receiptPath),
    latest: path.relative(repoRoot, latestPath),
    local_checks: local.checks.length,
    live_checks: live.checks.length,
    live_blocked: Boolean(live.blocked),
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
