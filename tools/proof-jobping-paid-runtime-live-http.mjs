import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const BASE_URL = process.env.JOBPING_LIVE_BASE_URL || process.env.FOUNDER_COMMAND_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const OUT_DIR = path.resolve('test-artifacts/jobping-paid-runtime');
const LATEST = path.join(OUT_DIR, 'jobping-paid-runtime-live-http-latest.json');

async function fetchJson(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, init);
  const elapsedMs = performance.now() - started;
  const body = await response.json().catch(() => ({}));
  return {status: response.status, ok: response.ok && body.ok !== false, elapsedMs, body};
}

async function fetchText(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, init);
  const elapsedMs = performance.now() - started;
  const text = await response.text().catch(() => '');
  return {status: response.status, ok: response.ok, elapsedMs, text};
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
  const stamp = new Date().toISOString().replace(/[^0-9A-Za-z]+/g, '-').replace(/-+$/g, '').toLowerCase();
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    lane: 'jobping-paid-runtime-live-http',
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    credentialSource: gateAuth.credential?.key || gateAuth.credential?.source || 'missing',
    login: null,
    staticHtml: null,
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
    await fs.mkdir(OUT_DIR, {recursive: true});
    await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(JSON.stringify({ok: false, receipt: LATEST, error: receipt.error}, null, 2));
    process.exitCode = 1;
    return;
  }

  const token = gateAuth.token;
  if (!token) {
    receipt.error = 'Shared FS27/SkyGate helper did not return a bearer.';
  } else {
    const headers = sharedGateHeaders(token);
    const jsonHeaders = {...headers, 'content-type': 'application/json'};
    const profile = {
      candidate: 'Live proof candidate has dispatch, logistics, admin support, CRM, and Phoenix route coordination experience.',
      job: 'Operations coordinator for urgent Phoenix dispatch coverage using CRM, route tools, and same-day client support.',
      location: 'Phoenix, AZ',
      constraints: 'Owner HTTP proof only. Confirm candidate consent before any real outreach.',
      notification_channel: 'email'
    };

    const staticHtml = await fetchText(`${BASE_URL}/Free99/apps/jobping/index.html`, {
      headers: {...headers, accept: 'text/html'}
    });
    receipt.staticHtml = {
      status: staticHtml.status,
      ok: staticHtml.ok,
      elapsedMs: Number(staticHtml.elapsedMs.toFixed(2)),
      hasRuntimeCopy: /0S shared gate|gated 0S runtime|paid match unlocks/i.test(staticHtml.text),
      hasTriageButton: /Run Triage/i.test(staticHtml.text),
      hasPaidMatchButton: /Run Paid Match/i.test(staticHtml.text)
    };

    const health = await fetchJson(`${BASE_URL}/api/jobping/health`, {headers});
    const initialEntitlement = await fetchJson(`${BASE_URL}/api/jobping/entitlement`, {headers});
    const triage = await fetchJson(`${BASE_URL}/api/jobping/triage`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(profile)
    });
    const preClaimMatch = await fetchJson(`${BASE_URL}/api/jobping/ai/match`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(profile)
    });
    const checkout = await fetchJson(`${BASE_URL}/api/jobping/checkout/create`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        customer_email: `jobping.live.${stamp}@metraiyux.local`,
        customer_name: 'JobPing Live HTTP Proof',
        company_name: 'Skyes Over London LC',
        proof_mode: true,
        idempotency_key: `jobping-live-http-${stamp}`
      })
    });
    const sessionId = checkout.body?.checkout?.id || checkout.body?.checkout?.session_id || '';
    const claim = sessionId ? await fetchJson(`${BASE_URL}/api/jobping/checkout/claim`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({session_id: sessionId})
    }) : {status: 0, ok: false, elapsedMs: 0, body: {error: 'missing_checkout_session_id'}};
    const match = await fetchJson(`${BASE_URL}/api/jobping/ai/match`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(profile)
    });
    const ledger = await fetchJson(`${BASE_URL}/api/jobping/ledger`, {headers});

    receipt.smoke = {
      healthStatus: health.status,
      healthRuntimeAvailable: health.body?.runtime_available === true,
      healthPaidRuntime: health.body?.paid_runtime === true,
      initialEntitlementStatus: initialEntitlement.status,
      initialEntitlementActive: initialEntitlement.body?.entitlement?.active === true,
      triageStatus: triage.status,
      triageScore: triage.body?.triage?.score ?? null,
      triageReceiptSchema: triage.body?.receipt?.schema || '',
      preClaimMatchStatus: preClaimMatch.status,
      preClaimCheckoutRequired: preClaimMatch.status === 402 && preClaimMatch.body?.checkout_required === true,
      preClaimAlreadyEntitled: preClaimMatch.status === 200 && preClaimMatch.body?.paid_match === true,
      checkoutStatus: checkout.status,
      checkoutSessionId: sessionId,
      checkoutPaymentStatus: checkout.body?.checkout?.payment_status || '',
      claimStatus: claim.status,
      claimEntitlementActive: claim.body?.entitlement?.active === true,
      matchStatus: match.status,
      matchPaid: match.body?.paid_match === true,
      matchScore: match.body?.result?.match_score ?? null,
      matchProviderPath: match.body?.provider_path || '',
      matchDbMetered: match.body?.db_metered === true,
      matchReceiptId: match.body?.receipt_id || '',
      ledgerStatus: ledger.status,
      ledgerTotal: ledger.body?.summary?.total ?? 0,
      ledgerPaidRuntime: ledger.body?.summary?.paid_runtime ?? 0,
      ledgerHasPaidMatch: Array.isArray(ledger.body?.events) && ledger.body.events.some((event) => event.type === 'jobping.paid_match_completed')
    };

    const samples = [];
    for (let i = 0; i < 18; i += 1) {
      const route = i % 3 === 0 ? '/api/jobping/health' : (i % 3 === 1 ? '/api/jobping/entitlement' : '/api/founder-command/actions/catalog');
      samples.push(await fetchJson(`${BASE_URL}${route}`, {headers}));
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
    && receipt.staticHtml?.status === 200
    && receipt.staticHtml?.hasRuntimeCopy
    && receipt.staticHtml?.hasTriageButton
    && receipt.staticHtml?.hasPaidMatchButton
    && receipt.smoke?.healthStatus === 200
    && receipt.smoke?.healthRuntimeAvailable
    && receipt.smoke?.healthPaidRuntime
    && receipt.smoke?.initialEntitlementStatus === 200
    && receipt.smoke?.triageStatus === 201
    && receipt.smoke?.triageReceiptSchema === 'metraiyux.jobping.runtime-receipt.v1'
    && (receipt.smoke?.preClaimCheckoutRequired || receipt.smoke?.preClaimAlreadyEntitled)
    && receipt.smoke?.checkoutStatus === 201
    && Boolean(receipt.smoke?.checkoutSessionId)
    && receipt.smoke?.claimStatus === 200
    && receipt.smoke?.claimEntitlementActive
    && receipt.smoke?.matchStatus === 200
    && receipt.smoke?.matchPaid
    && receipt.smoke?.matchProviderPath === 'fs27-gateway-chat'
    && receipt.smoke?.matchDbMetered
    && Boolean(receipt.smoke?.matchReceiptId)
    && receipt.smoke?.ledgerStatus === 200
    && receipt.smoke?.ledgerHasPaidMatch
    && receipt.stress?.ok
  );

  await fs.mkdir(OUT_DIR, {recursive: true});
  const stamped = path.join(OUT_DIR, `jobping-paid-runtime-live-http-${stamp}.json`);
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ok: receipt.ok, receipt: LATEST, stamped, staticHtml: receipt.staticHtml, smoke: receipt.smoke, stress: receipt.stress}, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
