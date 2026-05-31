import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const BASE_URL = process.env.FOUNDER_COMMAND_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const OUT_DIR = path.resolve('test-artifacts/founder-command-accounts-crosswalk');
const LATEST = path.join(OUT_DIR, 'founder-command-accounts-crosswalk-live-http-latest.json');
const FETCH_TIMEOUT_MS = Number(process.env.FOUNDER_COMMAND_PROOF_FETCH_TIMEOUT_MS || 20000);
const STRESS_REQUESTS = Number(process.env.FOUNDER_COMMAND_ACCOUNTS_CROSSWALK_STRESS_REQUESTS || 24);

async function fetchJson(url, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const elapsedMs = performance.now() - started;
    const body = await response.json().catch(() => ({}));
    return { status: response.status, ok: response.ok && body.ok !== false, elapsedMs, body };
  } catch (error) {
    const elapsedMs = performance.now() - started;
    return {
      status: 0,
      ok: false,
      elapsedMs,
      body: {
        ok: false,
        error: error?.name === 'AbortError' ? `request timed out after ${FETCH_TIMEOUT_MS}ms` : error?.message || String(error)
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

function percentile(sorted, pct) {
  return sorted[Math.max(0, Math.ceil(sorted.length * pct) - 1)] || 0;
}

function sharedGateHeaders(token, extra = {}) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    ...extra
  };
}

async function main() {
  const gateAuth = await resolveZeroOsGateAuth({ zeroOsBase: BASE_URL });
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    lane: 'founder-command-accounts-crosswalk-live-http',
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    credentialSource: gateAuth.credential?.key || gateAuth.credential?.source || 'missing',
    login: null,
    smoke: null,
    stress: null
  };
  receipt.login = {
    status: gateAuth.response?.status || 0,
    ok: Boolean(gateAuth.ok && gateAuth.token),
    tokenReceived: Boolean(gateAuth.token),
    via: gateAuth.response?.via || gateAuth.credential?.source || '',
    elapsedMs: Number(Number(gateAuth.response?.elapsedMs || 0).toFixed(2))
  };
  if (!gateAuth.token) {
    receipt.error = gateAuth.response?.body?.error || gateAuth.response?.error || 'Shared FS27/SkyGate helper did not return a bearer.';
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(JSON.stringify({ ok: false, receipt: LATEST, error: receipt.error }, null, 2));
    process.exitCode = 1;
    return;
  }

  const token = gateAuth.token;
  if (!token) {
    receipt.error = 'Shared FS27/SkyGate helper did not return a bearer.';
  } else {
    const headers = sharedGateHeaders(token);
    const accounts = await fetchJson(`${BASE_URL}/api/founder-command/accounts?limit=1000`, { headers });
    const bob = await fetchJson(`${BASE_URL}/api/founder-command/accounts/founder-client:bobs-smoke-shop-litchfield-park`, { headers });
    const sources = await fetchJson(`${BASE_URL}/api/founder-command/crosswalk/sources`, { headers });
    const workSystem = await fetchJson(`${BASE_URL}/api/founder-command/work-system`, { headers });
    const upsert = await fetchJson(`${BASE_URL}/api/founder-command/accounts/upsert`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        client_account_id: 'founder-client:live-crosswalk-proof',
        display_name: 'Live Crosswalk Proof',
        client_id: 'live-crosswalk-proof',
        valley_business_id: 'live-crosswalk-proof-valley',
        skyemail: 'live.crosswalk.proof@skyemail.solenterprises.org',
        paperwork: { status: 'live-http-owner-reviewed' }
      })
    });
    const operation = await fetchJson(`${BASE_URL}/api/founder-command/accounts/founder-client:live-crosswalk-proof/operations`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        lane: 'sales-crm',
        priority: 'normal',
        next_action: 'Live HTTP proof operation: attach owner-reviewed setup packet.'
      })
    });
    const backfillPlan = await fetchJson(`${BASE_URL}/api/founder-command/accounts/backfill`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ limit: 10 })
    });
    receipt.smoke = {
      accountsStatus: accounts.status,
      accounts: accounts.body?.counts?.accounts || 0,
      returned: accounts.body?.counts?.returned || 0,
      aeWorkOrders: accounts.body?.counts?.ae_work_orders || 0,
      skyemailReady: accounts.body?.counts?.skyemail_ready || 0,
      bobStatus: bob.status,
      bobName: bob.body?.account?.display_name || '',
      bobSkyEmail: bob.body?.account?.ids?.skyemail || '',
      sourcesStatus: sources.status,
      sourceBusinesses: sources.body?.source_counts?.businesses || 0,
      durableAccounts: sources.body?.durable_counts?.accounts || 0,
      workSystemStatus: workSystem.status,
      workSystemClients: workSystem.body?.metrics?.client_accounts || 0,
      workSystemCrosswalkAccounts: workSystem.body?.account_crosswalk?.counts?.accounts || 0,
      upsertStatus: upsert.status,
      operationStatus: operation.status,
      backfillPlanStatus: backfillPlan.status,
      backfillDryRun: Boolean(backfillPlan.body?.dry_run),
      backfillWouldWrite: backfillPlan.body?.would_backfill || 0
    };

    const samples = [];
    for (let i = 0; i < STRESS_REQUESTS; i += 1) {
      const route = i % 3 === 0
        ? '/api/founder-command/accounts?limit=25'
        : (i % 3 === 1 ? '/api/founder-command/crosswalk/sources' : '/api/founder-command/accounts/founder-client:bobs-smoke-shop-litchfield-park');
      samples.push(await fetchJson(`${BASE_URL}${route}`, { headers }));
    }
    const durations = samples.map((item) => item.elapsedMs).sort((a, b) => a - b);
    receipt.stress = {
      requests: samples.length,
      ok: samples.every((item) => item.status === 200 && item.body?.ok),
      p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
      maxMs: Number(Math.max(...durations).toFixed(2))
    };
  }

  receipt.ok = Boolean(
    receipt.login?.ok
    && receipt.smoke?.accountsStatus === 200
    && receipt.smoke?.accounts >= 300
    && receipt.smoke?.aeWorkOrders >= 300
    && receipt.smoke?.skyemailReady >= 300
    && receipt.smoke?.bobStatus === 200
    && receipt.smoke?.bobName === "Bob's Smoke Shop"
    && receipt.smoke?.sourceBusinesses >= 300
    && receipt.smoke?.workSystemClients >= 300
    && receipt.smoke?.upsertStatus === 201
    && receipt.smoke?.operationStatus === 201
    && receipt.smoke?.backfillDryRun
    && receipt.stress?.ok
  );
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ ok: receipt.ok, receipt: LATEST, smoke: receipt.smoke, stress: receipt.stress }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
