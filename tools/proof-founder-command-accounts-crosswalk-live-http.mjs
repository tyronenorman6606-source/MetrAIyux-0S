import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const BASE_URL = process.env.FOUNDER_COMMAND_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const OUT_DIR = path.resolve('test-artifacts/founder-command-accounts-crosswalk');
const LATEST = path.join(OUT_DIR, 'founder-command-accounts-crosswalk-live-http-latest.json');
const SKYEMAIL_SMOKE_LATEST = path.resolve('test-artifacts/skyemail-human-production-smoke-latest.json');
const FETCH_TIMEOUT_MS = Number(process.env.FOUNDER_COMMAND_PROOF_FETCH_TIMEOUT_MS || 60000);
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

async function readJsonFile(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function main() {
  const gateAuth = await resolveZeroOsGateAuth({ zeroOsBase: BASE_URL });
  const latestSkyEmailSmoke = await readJsonFile(SKYEMAIL_SMOKE_LATEST, {});
  const expectedMailboxCount = Number(latestSkyEmailSmoke?.provisioned_mailboxes?.length || 0);
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    lane: 'founder-command-accounts-crosswalk-live-http',
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    credentialSource: gateAuth.credential?.key || gateAuth.credential?.source || 'missing',
    expectedSkyEmailMailboxCountFromLatestSmoke: expectedMailboxCount,
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
	    const bob = await fetchJson(`${BASE_URL}/api/founder-command/accounts/founder-client:bobs-smoke-shop-litchfield-park`, { headers });
	    const sources = await fetchJson(`${BASE_URL}/api/founder-command/crosswalk/sources`, { headers });
	    const skyemail = await fetchJson(`${BASE_URL}/api/founder-command/skyemail?include_inventory=1`, { headers });
	    const mailboxBackfillPlan = await fetchJson(`${BASE_URL}/api/founder-command/skyemail/mailboxes/backfill?limit=500`, { headers });
	    const mailboxBackfill = await fetchJson(`${BASE_URL}/api/founder-command/skyemail/mailboxes/backfill`, {
	      method: 'POST',
	      headers: { ...headers, 'content-type': 'application/json' },
	      body: JSON.stringify({ confirm: true, limit: 500 })
	    });
	    const accounts = await fetchJson(`${BASE_URL}/api/founder-command/accounts?limit=1000`, { headers });
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
      skyemailStatus: skyemail.status,
      skyemailInventoryOk: Boolean(skyemail.body?.inventory?.ok),
      skyemailInventoryMailboxes: Number(skyemail.body?.inventory?.count || skyemail.body?.inventory?.mailboxes?.length || 0),
      skyemailInventoryTotal: Number(skyemail.body?.inventory?.counts?.total || 0),
      skyemailInventoryActive: Number(skyemail.body?.inventory?.counts?.active || 0),
      skyemailInventoryZoho: Number(skyemail.body?.inventory?.counts?.zoho || 0),
	      skyemailInventoryCredentialPolicy: skyemail.body?.inventory?.credential_policy || skyemail.body?.credential_policy || '',
	      mailboxBackfillPlanStatus: mailboxBackfillPlan.status,
	      mailboxBackfillPlanDryRun: Boolean(mailboxBackfillPlan.body?.dry_run),
	      mailboxBackfillStatus: mailboxBackfill.status,
	      mailboxBackfillPersistedAccounts: Number(mailboxBackfill.body?.persisted_accounts || 0),
	      mailboxBackfillPersistedLinks: Number(mailboxBackfill.body?.persisted_identity_links || 0),
	      mailboxBackfillProviderMissing: Number(mailboxBackfill.body?.custody?.provider_missing || 0),
	      accountSkyEmailProviderMailboxes: Number(accounts.body?.counts?.skyemail_provider_mailboxes || 0),
	      accountSkyEmailProviderRepresented: Number(accounts.body?.counts?.skyemail_provider_represented || 0),
	      accountSkyEmailProviderMissing: Number(accounts.body?.counts?.skyemail_provider_missing || 0),
	      workSystemSkyEmailMailboxes: Number(workSystem.body?.metrics?.skyemail_mailboxes || 0),
	      workSystemSkyEmailActiveMailboxes: Number(workSystem.body?.metrics?.skyemail_active_mailboxes || 0),
	      workSystemSkyEmailProviderRepresented: Number(workSystem.body?.metrics?.skyemail_provider_represented || 0),
	      workSystemSkyEmailProviderMissing: Number(workSystem.body?.metrics?.skyemail_provider_missing || 0),
	      workSystemSkyEmailInventoryOk: Boolean(workSystem.body?.communications?.skyemail?.inventory?.ok),
	      workSystemSkyEmailCustodyMissing: Number(workSystem.body?.communications?.skyemail?.custody?.provider_missing || 0),
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
    && receipt.smoke?.skyemailStatus === 200
    && receipt.smoke?.skyemailInventoryOk
	    && receipt.smoke?.skyemailInventoryTotal >= Math.max(1, expectedMailboxCount)
	    && receipt.smoke?.mailboxBackfillPlanStatus === 200
	    && receipt.smoke?.mailboxBackfillPlanDryRun
	    && [201, 207].includes(receipt.smoke?.mailboxBackfillStatus)
	    && receipt.smoke?.mailboxBackfillProviderMissing === 0
	    && receipt.smoke?.accountSkyEmailProviderMailboxes >= Math.max(1, expectedMailboxCount)
	    && receipt.smoke?.accountSkyEmailProviderRepresented >= Math.max(1, expectedMailboxCount)
	    && receipt.smoke?.accountSkyEmailProviderMissing === 0
	    && receipt.smoke?.workSystemSkyEmailInventoryOk
	    && receipt.smoke?.workSystemSkyEmailMailboxes >= Math.max(1, expectedMailboxCount)
	    && receipt.smoke?.workSystemSkyEmailProviderRepresented >= Math.max(1, expectedMailboxCount)
	    && receipt.smoke?.workSystemSkyEmailProviderMissing === 0
	    && receipt.smoke?.workSystemSkyEmailCustodyMissing === 0
    && /raw provider passwords|never returns provider passwords|does not store or return raw mailbox passwords/i.test(receipt.smoke?.skyemailInventoryCredentialPolicy || '')
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
