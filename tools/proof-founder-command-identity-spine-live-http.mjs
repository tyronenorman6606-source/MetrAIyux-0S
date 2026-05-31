#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const BASE_URL = process.env.FOUNDER_COMMAND_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const OUT_DIR = path.resolve('test-artifacts/founder-command-identity-spine');
const LATEST = path.join(OUT_DIR, 'founder-command-identity-spine-live-http-latest.json');
const FETCH_TIMEOUT_MS = Number(process.env.FOUNDER_COMMAND_PROOF_FETCH_TIMEOUT_MS || 20000);
const STRESS_REQUESTS = Number(process.env.FOUNDER_COMMAND_IDENTITY_SPINE_STRESS_REQUESTS || 18);
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

function safeId(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'identity-spine-proof';
}

async function writeReceipt(receipt) {
  const stamp = receipt.generatedAt.replace(/[:.]/g, '-');
  const stamped = path.join(OUT_DIR, stamp, 'receipt.json');
  await fs.mkdir(path.dirname(stamped), { recursive: true });
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(LATEST, `${JSON.stringify({ ...receipt, stampedReceipt: path.relative(process.cwd(), stamped) }, null, 2)}\n`);
  return { stamped, latest: LATEST };
}

async function main() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: BASE_URL });
  const token = auth.token || '';
  const generatedAt = new Date().toISOString();
  const proofSlug = `identity-spine-${safeId(generatedAt)}-${Math.random().toString(36).slice(2, 8)}`;
  const clientAccountId = `founder-client:${proofSlug}`;
  const sourceIds = {
    saas: `saas_customer_${proofSlug}`,
    skymail: `${proofSlug}@skyemail.solenterprises.org`,
    routex: `routex_user_${proofSlug}`,
    skyepay: `skyepay_merchant_${proofSlug}`,
    skynet: `skynet_workspace_${proofSlug}`,
    musicnexus: `artist_${proofSlug}`,
    sovereigndocs: `case_${proofSlug}`,
    skyecommerce: `merchant_${proofSlug}`,
    relay13: `thread_${proofSlug}`,
    client_app_factory: `client_app_${proofSlug}`,
    jobping: `jobping_worker_${proofSlug}`
  };
  const receipt = {
    ok: false,
    generatedAt,
    lane: 'founder-command-identity-spine-live-http',
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    credentialSource: auth.credential?.key || auth.credential?.source || 'missing',
    proofClientAccountId: clientAccountId,
    login: null,
    unauth: null,
    smoke: null,
    links: [],
    resolves: [],
    stress: null,
    failures: []
  };
  receipt.login = {
    status: Number(auth.response?.status || 0) || 0,
    ok: Boolean(auth.ok && token),
    tokenReceived: Boolean(token),
    via: auth.response?.via || auth.credential?.source || ''
  };
  if (!token) {
    receipt.failures.push(auth.response?.body?.error || auth.response?.error || 'No shared FS27/SkyGate bearer or owner gate exchange credential found.');
    const paths = await writeReceipt(receipt);
    console.log(JSON.stringify({ ok: false, receipt: path.relative(process.cwd(), paths.latest), failures: receipt.failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (token) {
    const headers = {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      'x-free99-gate-session': token,
      'x-skye-gate-session': token
    };
    receipt.unauth = await fetchJson(`${BASE_URL}/api/founder-command/identity/resolve?valley_business_id=bobs-smoke-shop-litchfield-park`, {
      headers: { accept: 'application/json' }
    });

    const bob = await fetchJson(`${BASE_URL}/api/founder-command/identity/resolve?valley_business_id=bobs-smoke-shop-litchfield-park`, { headers });
    const bobBackfill = await fetchJson(`${BASE_URL}/api/founder-command/identity/backfill`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ target: 'bobs-smoke-shop-litchfield-park', confirm: true })
    });
    const bobSourceResolve = await fetchJson(`${BASE_URL}/api/founder-command/identity/resolve?source_system=valley-verified&source_id=bobs-smoke-shop-litchfield-park`, { headers });
    const create = await fetchJson(`${BASE_URL}/api/founder-command/identity/resolve`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        create_if_missing: true,
        confirm: true,
        client_account_id: clientAccountId,
        display_name: 'Identity Spine Live Proof LLC',
        client_id: proofSlug,
        workspace_id: `${proofSlug}-owner-workspace`,
        valley_business_id: `${proofSlug}-valley`,
        skyemail: sourceIds.skymail,
        profile: {
          email: `owner+${proofSlug}@example.com`,
          city: 'Phoenix',
          state: 'AZ'
        },
        source_systems: ['founder-command-live-proof']
      })
    });

    const systems = [
      ['saas', sourceIds.saas, 'customers'],
      ['skymail', sourceIds.skymail, 'mailboxes'],
      ['routex', sourceIds.routex, 'workforce_users'],
      ['skyepay', sourceIds.skyepay, 'merchants'],
      ['skynet', sourceIds.skynet, 'workspaces'],
      ['musicnexus', sourceIds.musicnexus, 'artists'],
      ['sovereigndocs', sourceIds.sovereigndocs, 'cases'],
      ['skyecommerce', sourceIds.skyecommerce, 'merchants'],
      ['relay13', sourceIds.relay13, 'threads'],
      ['client_app_factory', sourceIds.client_app_factory, 'client_apps'],
      ['jobping', sourceIds.jobping, 'workers']
    ];
    for (const [system, sourceId, table] of systems) {
      const link = await fetchJson(`${BASE_URL}/api/founder-command/identity/link`, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({
          client_account_id: clientAccountId,
          source_system: system,
          source_table: table,
          source_id: sourceId,
          source_email: sourceId.includes('@') ? sourceId : `owner+${proofSlug}@example.com`,
          link_type: 'live-http-owner-crosswalk',
          metadata: { proof_slug: proofSlug }
        })
      });
      receipt.links.push({
        system,
        status: link.status,
        ok: Boolean(link.ok && link.body?.link?.client_account_id === clientAccountId),
        linkId: link.body?.link?.id || '',
        elapsedMs: Number(link.elapsedMs.toFixed(2))
      });
      const resolved = await fetchJson(`${BASE_URL}/api/founder-command/identity/resolve?source_system=${encodeURIComponent(system)}&source_id=${encodeURIComponent(sourceId)}`, { headers });
      receipt.resolves.push({
        system,
        status: resolved.status,
        ok: Boolean(resolved.ok && resolved.body?.account?.client_account_id === clientAccountId && resolved.body?.resolution?.match_type === 'identity_link'),
        matchType: resolved.body?.resolution?.match_type || '',
        linkCount: resolved.body?.identity_links?.length || 0,
        elapsedMs: Number(resolved.elapsedMs.toFixed(2))
      });
    }

    const byEmail = await fetchJson(`${BASE_URL}/api/founder-command/identity/resolve?email=${encodeURIComponent(`owner+${proofSlug}@example.com`)}`, { headers });
    const sources = await fetchJson(`${BASE_URL}/api/founder-command/crosswalk/sources`, { headers });
    const workSystem = await fetchJson(`${BASE_URL}/api/founder-command/work-system`, { headers });
    receipt.smoke = {
      bobStatus: bob.status,
      bobOk: Boolean(bob.ok && bob.body?.account?.display_name === "Bob's Smoke Shop"),
      bobClientAccountId: bob.body?.account?.client_account_id || '',
      bobBackfillStatus: bobBackfill.status,
      bobBackfillOk: Boolean(bobBackfill.ok && bobBackfill.body?.persisted_accounts === 1 && bobBackfill.body?.persisted_identity_links >= 4),
      bobSourceResolveStatus: bobSourceResolve.status,
      bobSourceResolveOk: Boolean(bobSourceResolve.ok && bobSourceResolve.body?.account?.client_account_id === 'founder-client:bobs-smoke-shop-litchfield-park' && bobSourceResolve.body?.resolution?.match_type === 'identity_link'),
      createStatus: create.status,
      createOk: Boolean(create.ok && create.body?.created && create.body?.account?.client_account_id === clientAccountId),
      emailResolveStatus: byEmail.status,
      emailResolveOk: Boolean(byEmail.ok && byEmail.body?.account?.client_account_id === clientAccountId),
      durableAccounts: sources.body?.durable_counts?.accounts || 0,
      durableIdentityLinks: sources.body?.durable_counts?.identity_links || 0,
      workSystemStatus: workSystem.status,
      workSystemIdentityLinks: workSystem.body?.metrics?.account_identity_links || 0,
      routes: {
        resolve: bob.body?.routes?.resolve || '',
        link: bob.body?.routes?.link || ''
      }
    };

    const samples = [];
    for (let i = 0; i < STRESS_REQUESTS; i += 1) {
      const [system, sourceId] = systems[i % systems.length];
      const route = i % 3 === 0
        ? '/api/founder-command/identity/resolve?valley_business_id=bobs-smoke-shop-litchfield-park'
        : `/api/founder-command/identity/resolve?source_system=${encodeURIComponent(system)}&source_id=${encodeURIComponent(sourceId)}`;
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

  if (receipt.unauth?.status && ![401, 403].includes(receipt.unauth.status)) receipt.failures.push(`Unauth identity resolve returned ${receipt.unauth.status}, expected 401/403.`);
  if (!receipt.smoke?.bobOk) receipt.failures.push('Bob Valley Verified identity resolve did not pass.');
  if (!receipt.smoke?.bobBackfillOk) receipt.failures.push('Bob targeted identity backfill did not persist.');
  if (!receipt.smoke?.bobSourceResolveOk) receipt.failures.push('Bob source-system identity resolve did not return a durable identity link.');
  if (!receipt.smoke?.createOk) receipt.failures.push('Owner-confirmed identity create did not pass.');
  if (!receipt.smoke?.emailResolveOk) receipt.failures.push('Profile email resolve did not return the proof account.');
  if (!receipt.links.every((item) => item.ok)) receipt.failures.push('One or more source-system identity links failed.');
  if (!receipt.resolves.every((item) => item.ok)) receipt.failures.push('One or more source-system resolves failed.');
  if (!receipt.stress?.ok) receipt.failures.push('Authenticated identity resolve stress did not pass.');

  receipt.ok = receipt.failures.length === 0
    && receipt.login?.ok
    && receipt.smoke?.bobOk
    && receipt.smoke?.bobBackfillOk
    && receipt.smoke?.bobSourceResolveOk
    && receipt.smoke?.createOk
    && receipt.smoke?.emailResolveOk
    && receipt.links.length === 11
    && receipt.resolves.length === 11
    && receipt.stress?.ok;

  const paths = await writeReceipt(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(process.cwd(), paths.latest),
    stamped: path.relative(process.cwd(), paths.stamped),
    smoke: receipt.smoke,
    links: receipt.links,
    resolves: receipt.resolves,
    stress: receipt.stress,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
