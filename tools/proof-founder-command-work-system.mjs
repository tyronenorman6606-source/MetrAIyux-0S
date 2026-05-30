import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const siteWorker = (await import('../metraiyux_0s_site/cloudflare/worker.js')).default;

const OWNER_CODE = 'owner-code';
const AUTH_HEADERS = {
  authorization: `Bearer ${OWNER_CODE}`,
  'x-admin-token': OWNER_CODE,
  'x-free99-admin-code': OWNER_CODE
};
const OUT_DIR = path.resolve('test-artifacts/founder-command-work-system');
const LATEST = path.join(OUT_DIR, 'founder-command-work-system-smoke-stress-latest.json');

function ctx() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) {
      pending.push(Promise.resolve(promise).catch(() => null));
    }
  };
}

function req(pathname, { headers = {} } = {}) {
  return new Request(`https://metraiyux.example${pathname}`, {
    headers: { accept: 'application/json', ...headers }
  });
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
    SITE_EVENTS_KV: kvStub()
  };
}

async function fetchJson(e, c, pathname, headers = AUTH_HEADERS) {
  const started = performance.now();
  const response = await siteWorker.fetch(req(pathname, { headers }), e, c);
  const elapsedMs = performance.now() - started;
  const body = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok && body.ok !== false, elapsedMs, body };
}

async function main() {
  const e = env();
  const c = ctx();
  const blocked = await fetchJson(e, c, '/api/founder-command/work-system', {});
  const smoke = await fetchJson(e, c, '/api/founder-command/work-system');
  const samples = [];
  for (let i = 0; i < 100; i += 1) {
    samples.push(await fetchJson(e, c, '/api/founder-command/work-system'));
  }
  const durations = samples.map((item) => item.elapsedMs).sort((a, b) => a - b);
  const p95 = durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)] || 0;
  const html = await fs.readFile(path.resolve('metraiyux_0s_site/founder-command/index.html'), 'utf8');
  const js = await fs.readFile(path.resolve('metraiyux_0s_site/founder-command/app.js'), 'utf8');
  const receipt = {
    ok: blocked.status === 401
      && smoke.status === 200
      && smoke.body?.founder_account?.legal_entity === 'Skyes Over London LC'
      && samples.every((item) => item.status === 200 && item.body?.ok)
      && html.includes('data-view="operations"')
      && js.includes('/api/founder-command/work-system'),
    generatedAt: new Date().toISOString(),
    lane: 'founder-command-work-system',
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    gate: {
      unauthenticated_status: blocked.status,
      authenticated_status: smoke.status,
      auth_mode: smoke.body?.founder_account?.auth_mode || ''
    },
    smoke: {
      status: smoke.status,
      client_accounts: smoke.body?.metrics?.client_accounts || 0,
      operating_lanes: smoke.body?.metrics?.operating_lanes || 0,
      expansion_lanes: smoke.body?.metrics?.expansion_lanes || 0
    },
    stress: {
      requests: samples.length,
      ok: samples.every((item) => item.status === 200 && item.body?.ok),
      p95_ms: Number(p95.toFixed(2)),
      max_ms: Number(Math.max(...durations).toFixed(2))
    },
    uiMarkers: {
      operationsView: html.includes('data-view="operations"'),
      clientGrid: html.includes('companyOpsClientGrid'),
      endpointFetch: js.includes('/api/founder-command/work-system')
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
