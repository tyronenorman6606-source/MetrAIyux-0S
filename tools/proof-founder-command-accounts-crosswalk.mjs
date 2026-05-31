import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { webcrypto } from 'node:crypto';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const siteWorker = (await import('../metraiyux_0s_site/cloudflare/worker.js')).default;

const OWNER_CODE = 'owner-code';
const SITE_ROOT = path.resolve('metraiyux_0s_site');
const OUT_DIR = path.resolve('test-artifacts/founder-command-accounts-crosswalk');
const LATEST = path.join(OUT_DIR, 'founder-command-accounts-crosswalk-smoke-stress-latest.json');

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

function workerFetchImpl(e, c) {
  return async (url, init = {}) => {
    const target = new URL(url, 'https://metraiyux.example');
    return siteWorker.fetch(new Request(`https://metraiyux.example${target.pathname}${target.search}`, init), e, c);
  };
}

function sharedGateHeaders(token) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token
  };
}

function kvStub() {
  const store = new Map();
  return {
    async put(key, value) {
      store.set(key, value);
    },
    async get(key, options = {}) {
      const value = store.get(key) || null;
      return options.type === 'json' && value ? JSON.parse(value) : value;
    },
    async list({ prefix = '' } = {}) {
      return { keys: [...store.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })) };
    }
  };
}

function assetsBinding() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const clean = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      try {
        const body = await fs.readFile(path.join(SITE_ROOT, clean));
        return new Response(body, { headers: { 'content-type': clean.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8' } });
      } catch {
        return new Response('not found', { status: 404 });
      }
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
    ASSETS: assetsBinding()
  };
}

async function fetchJson(e, c, pathname, init = {}) {
  const started = performance.now();
  const response = await siteWorker.fetch(req(pathname, init), e, c);
  const elapsedMs = performance.now() - started;
  const body = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok && body.ok !== false, elapsedMs, body };
}

function percentile(sorted, pct) {
  return sorted[Math.max(0, Math.ceil(sorted.length * pct) - 1)] || 0;
}

async function main() {
  const e = env();
  const c = ctx();
  const blocked = await fetchJson(e, c, '/api/founder-command/accounts?limit=5');
  const gateAuth = await resolveZeroOsGateAuth({
    zeroOsBase: 'https://metraiyux.example',
    env: e,
    fetchImpl: workerFetchImpl(e, c)
  });
  if (!gateAuth.token) throw new Error(gateAuth.response?.body?.error || gateAuth.response?.error || 'Shared FS27/SkyGate helper did not return a bearer.');
  const authHeaders = sharedGateHeaders(gateAuth.token);
  const accounts = await fetchJson(e, c, '/api/founder-command/accounts?limit=1000', { headers: authHeaders });
  const bob = await fetchJson(e, c, '/api/founder-command/accounts/founder-client:bobs-smoke-shop-litchfield-park', { headers: authHeaders });
  const sources = await fetchJson(e, c, '/api/founder-command/crosswalk/sources', { headers: authHeaders });
  const upsert = await fetchJson(e, c, '/api/founder-command/accounts/upsert', {
    method: 'POST',
    headers: authHeaders,
    body: {
      client_account_id: 'founder-client:proof-company',
      display_name: 'Proof Company',
      client_id: 'proof-company',
      valley_business_id: 'proof-company-valley',
      skyemail: 'proof.company@skyemail.solenterprises.org',
      paperwork: { status: 'owner-reviewed' }
    }
  });
  const op = await fetchJson(e, c, '/api/founder-command/accounts/founder-client:proof-company/operations', {
    method: 'POST',
    headers: authHeaders,
    body: {
      lane: 'sales-crm',
      priority: 'high',
      next_action: 'Attach offer, SkyEmail handoff, docs packet, workforce route, and billing review.'
    }
  });
  const backfillPlan = await fetchJson(e, c, '/api/founder-command/accounts/backfill', {
    method: 'POST',
    headers: authHeaders,
    body: { limit: 25 }
  });
  const samples = [];
  for (let i = 0; i < 80; i += 1) {
    const route = i % 3 === 0
      ? '/api/founder-command/accounts?limit=25'
      : (i % 3 === 1 ? '/api/founder-command/crosswalk/sources' : '/api/founder-command/accounts/founder-client:bobs-smoke-shop-litchfield-park');
    samples.push(await fetchJson(e, c, route, { headers: authHeaders }));
  }
  const durations = samples.map((item) => item.elapsedMs).sort((a, b) => a - b);
  const receipt = {
    ok: blocked.status === 401
      && accounts.status === 200
      && accounts.body?.counts?.accounts === 339
      && accounts.body?.counts?.ae_work_orders === 339
      && accounts.body?.counts?.skyemail_ready === 339
      && bob.status === 200
      && bob.body?.account?.display_name === "Bob's Smoke Shop"
      && sources.status === 200
      && sources.body?.source_counts?.businesses === 339
      && upsert.status === 201
      && op.status === 201
      && backfillPlan.body?.dry_run === true
      && samples.every((item) => item.status === 200 && item.body?.ok),
    generatedAt: new Date().toISOString(),
    lane: 'founder-command-accounts-crosswalk',
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    smoke: {
      unauthenticatedStatus: blocked.status,
      accountStatus: accounts.status,
      accounts: accounts.body?.counts?.accounts || 0,
      aeWorkOrders: accounts.body?.counts?.ae_work_orders || 0,
      skyemailReady: accounts.body?.counts?.skyemail_ready || 0,
      bobStatus: bob.status,
      bobSkyEmail: bob.body?.account?.ids?.skyemail || '',
      sourceBusinesses: sources.body?.source_counts?.businesses || 0,
      upsertStatus: upsert.status,
      operationStatus: op.status,
      backfillWouldWrite: backfillPlan.body?.would_backfill || 0
    },
    stress: {
      requests: samples.length,
      ok: samples.every((item) => item.status === 200 && item.body?.ok),
      p95_ms: Number(percentile(durations, 0.95).toFixed(2)),
      max_ms: Number(Math.max(...durations).toFixed(2))
    }
  };
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ ok: receipt.ok, receipt: LATEST, smoke: receipt.smoke, stress: receipt.stress }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
