import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const BASE_URL = process.env.FOUNDER_COMMAND_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const OUT_DIR = path.resolve('test-artifacts/founder-command-work-system');
const LATEST = path.join(OUT_DIR, 'founder-command-work-system-live-http-latest.json');
const FETCH_TIMEOUT_MS = Number(process.env.FOUNDER_COMMAND_PROOF_FETCH_TIMEOUT_MS || 20000);
const STRESS_REQUESTS = Number(process.env.FOUNDER_COMMAND_WORK_SYSTEM_STRESS_REQUESTS || 25);

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
    lane: 'founder-command-work-system-live-http',
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    credentialSource: gateAuth.credential?.key || gateAuth.credential?.source || 'missing',
    login: null,
    smoke: null,
    stress: null,
    staticHtml: null
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
    const smoke = await fetchJson(`${BASE_URL}/api/founder-command/work-system`, { headers });
    receipt.smoke = {
      status: smoke.status,
      ok: smoke.ok,
      elapsedMs: Number(smoke.elapsedMs.toFixed(2)),
      clientAccounts: smoke.body?.metrics?.client_accounts || 0,
      operatingLanes: smoke.body?.metrics?.operating_lanes || 0,
      expansionLanes: smoke.body?.metrics?.expansion_lanes || 0,
      founderEntity: smoke.body?.founder_account?.legal_entity || ''
    };

    if (smoke.status === 200 && smoke.body?.ok) {
      const samples = [];
      for (let i = 0; i < STRESS_REQUESTS; i += 1) {
        samples.push(await fetchJson(`${BASE_URL}/api/founder-command/work-system`, { headers }));
      }
      const durations = samples.map((item) => item.elapsedMs).sort((a, b) => a - b);
      const p95 = durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)] || 0;
      receipt.stress = {
        requests: samples.length,
        ok: samples.every((item) => item.status === 200 && item.body?.ok),
        p95Ms: Number(p95.toFixed(2)),
        maxMs: Number(Math.max(...durations).toFixed(2))
      };
    } else {
      receipt.stress = {
        requests: 0,
        ok: false,
        skipped: true,
        reason: smoke.body?.error || `work-system smoke returned ${smoke.status}`
      };
    }

    const htmlStarted = performance.now();
    const htmlController = new AbortController();
    const htmlTimeout = setTimeout(() => htmlController.abort(), FETCH_TIMEOUT_MS);
    let htmlResponse = null;
    let html = '';
    let htmlError = '';
    try {
      htmlResponse = await fetch(`${BASE_URL}/founder-command/?view=operations`, {
        headers: sharedGateHeaders(token, { accept: 'text/html' }),
        signal: htmlController.signal
      });
      html = await htmlResponse.text().catch(() => '');
    } catch (error) {
      htmlError = error?.name === 'AbortError' ? `request timed out after ${FETCH_TIMEOUT_MS}ms` : error?.message || String(error);
    } finally {
      clearTimeout(htmlTimeout);
    }
    receipt.staticHtml = {
      status: htmlResponse?.status || 0,
      ok: Boolean(htmlResponse?.ok),
      elapsedMs: Number((performance.now() - htmlStarted).toFixed(2)),
      operationsViewMarker: html.includes('data-view="operations"'),
      endpointMarker: html.includes('companyOpsClientGrid'),
      error: htmlError || undefined
    };
  }

  receipt.ok = Boolean(
    receipt.login?.ok
    && receipt.smoke?.status === 200
    && receipt.smoke?.clientAccounts >= 10
    && receipt.smoke?.operatingLanes >= 10
    && receipt.stress?.ok
    && receipt.staticHtml?.operationsViewMarker
    && receipt.staticHtml?.endpointMarker
  );
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ ok: receipt.ok, receipt: LATEST, smoke: receipt.smoke, stress: receipt.stress, staticHtml: receipt.staticHtml }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
