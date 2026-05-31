import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { webcrypto } from 'node:crypto';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const siteWorker = (await import('../metraiyux_0s_site/cloudflare/worker.js')).default;

const OWNER_CODE = 'owner-code';
const OUT_DIR = path.resolve('test-artifacts/founder-command-operating-kernel');
const LATEST = path.join(OUT_DIR, 'founder-command-operating-kernel-smoke-stress-latest.json');

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
  const blocked = await fetchJson(e, c, '/api/founder-command/actions/catalog');
  const gateAuth = await resolveZeroOsGateAuth({
    zeroOsBase: 'https://metraiyux.example',
    env: e,
    fetchImpl: workerFetchImpl(e, c)
  });
  if (!gateAuth.token) throw new Error(gateAuth.response?.body?.error || gateAuth.response?.error || 'Shared FS27/SkyGate helper did not return a bearer.');
  const authHeaders = sharedGateHeaders(gateAuth.token);
  const workSystem = await fetchJson(e, c, '/api/founder-command/work-system', { headers: authHeaders });
  const catalog = await fetchJson(e, c, '/api/founder-command/actions/catalog', { headers: authHeaders });
  const plan = await fetchJson(e, c, '/api/founder-command/actions/plan', {
    method: 'POST',
    headers: authHeaders,
    body: {
      action_id: 'music.brain-daemon.run-now',
      params: { force: true, reason: 'non-browser operating-kernel proof' }
    }
  });
  const commandBridgeRecord = await fetchJson(e, c, '/api/founder-command/actions/execute', {
    method: 'POST',
    headers: authHeaders,
    body: {
      action_id: 'command-bridge.event.record',
      params: {
        source_app: 'founder-command',
        source_surface: 'operating-kernel-proof',
        event_type: 'founder_command.operating_kernel.proof',
        summary: 'Founder Command operating kernel proof event'
      }
    }
  });
  const clientEnrollment = await fetchJson(e, c, '/api/founder-command/actions/execute', {
    method: 'POST',
    headers: authHeaders,
    body: {
      action_id: 'client.enrollment.prepare',
      confirm: true,
      params: {
        client_id: 'operating-kernel-proof-client',
        display_name: 'Operating Kernel Proof Client',
        priority: 'owner-review',
        notes: 'Queue-only proof task; no external enrollment mutation.'
      }
    }
  });
  const samples = [];
  for (let i = 0; i < 120; i += 1) {
    const route = i % 2 === 0 ? '/api/founder-command/work-system' : '/api/founder-command/actions/catalog';
    samples.push(await fetchJson(e, c, route, { headers: authHeaders }));
  }
  const durations = samples.map((item) => item.elapsedMs).sort((a, b) => a - b);
  const html = await fs.readFile(path.resolve('metraiyux_0s_site/founder-command/index.html'), 'utf8');
  const js = await fs.readFile(path.resolve('metraiyux_0s_site/founder-command/app.js'), 'utf8');
  const receipt = {
    ok: blocked.status === 401
      && workSystem.status === 200
      && workSystem.body?.metrics?.client_accounts >= 10
      && catalog.status === 200
      && catalog.body?.counts?.actions >= 10
      && catalog.body?.actions?.some((action) => action.id === 'music.brain-daemon.run-now')
      && plan.status === 200
      && plan.body?.approval?.required === true
      && commandBridgeRecord.status === 201
      && commandBridgeRecord.body?.receipt?.raw_private_payload_stored === false
      && clientEnrollment.status === 202
      && clientEnrollment.body?.receipt?.status === 'queued_for_owner_runner'
      && samples.every((item) => item.status === 200 && item.body?.ok)
      && html.includes('founderActionSelect')
      && html.includes('Run the 0S from Founder Command')
      && js.includes('/api/founder-command/actions/catalog'),
    generatedAt: new Date().toISOString(),
    lane: 'founder-command-operating-kernel',
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    gate: {
      unauthenticated_catalog_status: blocked.status,
      authenticated_catalog_status: catalog.status,
      auth_mode: catalog.body?.auth_mode || ''
    },
    smoke: {
      workSystemStatus: workSystem.status,
      clientAccounts: workSystem.body?.metrics?.client_accounts || 0,
      operatingLanes: workSystem.body?.metrics?.operating_lanes || 0,
      actionCatalogStatus: catalog.status,
      actionCount: catalog.body?.counts?.actions || 0,
      executableCount: catalog.body?.counts?.executable || 0,
      queueOnlyCount: catalog.body?.counts?.queue_only || 0,
      highRiskCount: catalog.body?.counts?.high_risk || 0,
      planRequiresApproval: Boolean(plan.body?.approval?.required),
      commandBridgeActionStatus: commandBridgeRecord.status,
      clientEnrollmentStatus: clientEnrollment.status
    },
    stress: {
      requests: samples.length,
      ok: samples.every((item) => item.status === 200 && item.body?.ok),
      p95_ms: Number(percentile(durations, 0.95).toFixed(2)),
      max_ms: Number(Math.max(...durations).toFixed(2))
    },
    uiMarkers: {
      actionSelect: html.includes('founderActionSelect'),
      operatingKernelCopy: html.includes('Run the 0S from Founder Command'),
      actionCatalogFetch: js.includes('/api/founder-command/actions/catalog'),
      actionExecuteFetch: js.includes('/api/founder-command/actions/execute')
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
