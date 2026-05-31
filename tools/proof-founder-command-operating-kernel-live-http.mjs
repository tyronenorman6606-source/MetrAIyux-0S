import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const BASE_URL = process.env.FOUNDER_COMMAND_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const OUT_DIR = path.resolve('test-artifacts/founder-command-operating-kernel');
const LATEST = path.join(OUT_DIR, 'founder-command-operating-kernel-live-http-latest.json');
const FETCH_TIMEOUT_MS = Number(process.env.FOUNDER_COMMAND_PROOF_FETCH_TIMEOUT_MS || 20000);
const STRESS_REQUESTS = Number(process.env.FOUNDER_COMMAND_OPERATING_KERNEL_STRESS_REQUESTS || 30);
const CREDENTIAL_KEYS = [
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'SKYGATE_ADMIN_PASSWORD',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'FS27_ADMIN_PASSWORD'
];

function unquote(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

async function readEnvFile(file) {
  try {
    const text = await fs.readFile(file, 'utf8');
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
  for (const key of CREDENTIAL_KEYS) {
    if (merged[key]) return { key, value: merged[key] };
  }
  return { key: '', value: '' };
}

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

async function main() {
  const credential = await liveCredential();
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    lane: 'founder-command-operating-kernel-live-http',
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    credentialSource: credential.key || 'missing',
    login: null,
    smoke: null,
    stress: null,
    staticHtml: null
  };
  if (!credential.value) {
    receipt.error = 'No owner credential found in process env, .env, or env.txt.';
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(JSON.stringify({ ok: false, receipt: LATEST, error: receipt.error }, null, 2));
    process.exitCode = 1;
    return;
  }

  const login = await fetchJson(`${BASE_URL}/api/owner/admin-login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ code: credential.value })
  });
  const token = login.body?.gateBearerToken || login.body?.gateToken || login.body?.token || '';
  receipt.login = {
    status: login.status,
    ok: Boolean(login.ok && token),
    tokenReceived: Boolean(token),
    elapsedMs: Number(login.elapsedMs.toFixed(2))
  };
  if (!token) {
    receipt.error = login.body?.error || 'Live owner login did not return a bearer.';
  } else {
    const headers = {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      'x-admin-token': token,
      'x-free99-gate-session': token,
      'x-skye-gate-session': token
    };
    const catalog = await fetchJson(`${BASE_URL}/api/founder-command/actions/catalog`, { headers });
    const workSystem = await fetchJson(`${BASE_URL}/api/founder-command/work-system`, { headers });
    const plan = await fetchJson(`${BASE_URL}/api/founder-command/actions/plan`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        action_id: 'music.brain-daemon.run-now',
        params: { force: true, reason: 'live http plan only' }
      })
    });
    const record = await fetchJson(`${BASE_URL}/api/founder-command/actions/execute`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        action_id: 'command-bridge.event.record',
        params: {
          source_app: 'founder-command',
          source_surface: 'operating-kernel-live-http',
          event_type: 'founder_command.operating_kernel.live_http',
          summary: 'Founder Command operating kernel live HTTP proof event'
        }
      })
    });
    const clientPlan = await fetchJson(`${BASE_URL}/api/founder-command/actions/plan`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        action_id: 'client.enrollment.prepare',
        params: { client_id: 'live-proof-client', display_name: 'Live Proof Client' }
      })
    });
    receipt.smoke = {
      catalogStatus: catalog.status,
      actionCount: catalog.body?.counts?.actions || 0,
      executableCount: catalog.body?.counts?.executable || 0,
      queueOnlyCount: catalog.body?.counts?.queue_only || 0,
      highRiskCount: catalog.body?.counts?.high_risk || 0,
      workSystemStatus: workSystem.status,
      clientAccounts: workSystem.body?.metrics?.client_accounts || 0,
      operatingLanes: workSystem.body?.metrics?.operating_lanes || 0,
      musicPlanStatus: plan.status,
      musicPlanRequiresApproval: Boolean(plan.body?.approval?.required),
      clientPlanStatus: clientPlan.status,
      clientPlanQueueOnly: Boolean(clientPlan.body?.execution?.queue_only),
      commandBridgeRecordStatus: record.status,
      commandBridgeReceiptSafe: record.body?.receipt?.raw_private_payload_stored === false
    };

    const samples = [];
    for (let i = 0; i < STRESS_REQUESTS; i += 1) {
      const route = i % 2 === 0 ? '/api/founder-command/actions/catalog' : '/api/founder-command/work-system';
      samples.push(await fetchJson(`${BASE_URL}${route}`, { headers }));
    }
    const durations = samples.map((item) => item.elapsedMs).sort((a, b) => a - b);
    receipt.stress = {
      requests: samples.length,
      ok: samples.every((item) => item.status === 200 && item.body?.ok),
      p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
      maxMs: Number(Math.max(...durations).toFixed(2))
    };

    const htmlStarted = performance.now();
    const htmlController = new AbortController();
    const htmlTimeout = setTimeout(() => htmlController.abort(), FETCH_TIMEOUT_MS);
    let htmlResponse = null;
    let html = '';
    let htmlError = '';
    try {
      htmlResponse = await fetch(`${BASE_URL}/founder-command/?view=operations`, {
        headers: { authorization: `Bearer ${token}`, 'x-admin-token': token, accept: 'text/html' },
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
      actionSelectMarker: html.includes('founderActionSelect'),
      operatingKernelCopy: html.includes('Run the 0S from Founder Command'),
      error: htmlError || undefined
    };
  }

  receipt.ok = Boolean(
    receipt.login?.ok
    && receipt.smoke?.catalogStatus === 200
    && receipt.smoke?.actionCount >= 10
    && receipt.smoke?.workSystemStatus === 200
    && receipt.smoke?.clientAccounts >= 10
    && receipt.smoke?.musicPlanRequiresApproval
    && receipt.smoke?.clientPlanQueueOnly
    && receipt.smoke?.commandBridgeRecordStatus === 201
    && receipt.smoke?.commandBridgeReceiptSafe
    && receipt.stress?.ok
    && receipt.staticHtml?.actionSelectMarker
    && receipt.staticHtml?.operatingKernelCopy
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
