#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const BASE_URL = String(process.env.FOUNDER_COMMAND_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const OUT_DIR = path.resolve('test-artifacts/founder-command-skynet-backend');
const LATEST = path.join(OUT_DIR, 'founder-command-skynet-backend-live-http-latest.json');
const FETCH_TIMEOUT_MS = Number(process.env.FOUNDER_COMMAND_PROOF_FETCH_TIMEOUT_MS || 20000);
const STRESS_REQUESTS = Number(process.env.FOUNDER_COMMAND_SKYENET_BACKEND_STRESS_REQUESTS || 20);
const CREDENTIAL_KEYS = [
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'SKYGATE_ADMIN_PASSWORD',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'FS27_ADMIN_PASSWORD'
];

const assetChecks = [
  {
    label: 'Founder Command SkyeNet backend owner entry',
    path: '/founder-command/?view=skyenet',
    expect: [
      'SkyeNet Backend',
      'skyenetBackendForm',
      'Functions Managed',
      'Sovereign Runtime Reserve',
      'approved managed functions'
    ]
  },
  {
    label: 'Founder Command SkyeNet backend HTML',
    path: '/skyenet/founder-command/index.html',
    expect: [
      'SkyeNet Backend',
      'skyenetBackendForm',
      'Functions Managed',
      'Sovereign Runtime Reserve',
      'Review',
      'Package',
      'Sign',
      'Manage',
      'approved managed functions'
    ]
  },
  {
    label: 'Founder Command app logic',
    path: '/skyenet/founder-command/app.js',
    expect: [
      'skyeNetBackendRunbookText',
      'tools/skyenet-functions-convert.mjs',
      'tools/skyenet-functions-runtime.mjs',
      '--require-signature',
      'npm run 0s:skyenet:functions-proof',
      'Source transfer receipt works'
    ]
  },
  {
    label: 'Founder Command styles',
    path: '/skyenet/founder-command/omega-command.css',
    expect: ['.skyenet-plan-grid', '.output-box']
  },
  {
    label: 'Founder Command PWA service worker',
    path: '/skyenet/founder-command/service-worker.js',
    expect: ['founder-command-pwa-v5', 'CORE_ASSETS']
  }
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

async function fetchText(url, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text().catch(() => '');
    return {
      status: response.status,
      ok: response.ok,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      contentType: response.headers.get('content-type') || '',
      location: response.headers.get('location') || '',
      text
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      contentType: '',
      location: '',
      text: '',
      error: error?.name === 'AbortError' ? `request timed out after ${FETCH_TIMEOUT_MS}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, init = {}) {
  const result = await fetchText(url, init);
  let body = null;
  try { body = JSON.parse(result.text); } catch {}
  return { ...result, body };
}

function hasAll(text, needles) {
  const haystack = String(text || '').toLowerCase();
  return needles.every((needle) => haystack.includes(String(needle).toLowerCase()));
}

function percentile(sorted, pct) {
  return sorted[Math.max(0, Math.ceil(sorted.length * pct) - 1)] || 0;
}

async function main() {
  const credential = await liveCredential();
  const receipt = {
    schema: 'founder-command.skynet-backend.live-http-proof.v1',
    ok: false,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualBrowserVerification: true,
    credentialSource: credential.key || 'missing',
    unauthenticatedGate: null,
    login: null,
    checks: [],
    stress: null,
    links: {
      founder_command: `${BASE_URL}/skyenet/founder-command/index.html`,
      founder_command_view: `${BASE_URL}/founder-command/?view=skyenet`,
      skynet_console: 'https://skyenet.graylondonskyes.workers.dev/console',
      skynet_publish_guide: 'https://skyenet.graylondonskyes.workers.dev/publish/'
    }
  };

  const unauth = await fetchText(`${BASE_URL}/skyenet/founder-command/index.html`, {
    redirect: 'manual',
    headers: { accept: 'text/html' }
  });
  receipt.unauthenticatedGate = {
    status: unauth.status,
    ok: unauth.status >= 300 && unauth.status < 400 && unauth.location.includes('/admin/login.html'),
    location: unauth.location,
    elapsedMs: unauth.elapsedMs
  };

  if (!credential.value) {
    receipt.error = 'No owner credential found in process env, .env, or env.txt.';
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(JSON.stringify({ ok: false, receipt: LATEST, error: receipt.error }, null, 2));
    process.exitCode = 1;
    return;
  }

  const login = await fetchJson(`${BASE_URL}/api/founder-command/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ code: credential.value })
  });
  const token = login.body?.gateBearerToken || login.body?.gateToken || login.body?.token || '';
  receipt.login = {
    status: login.status,
    ok: Boolean(login.ok && token),
    tokenReceived: Boolean(token),
    elapsedMs: login.elapsedMs
  };

  if (!token) {
    receipt.error = login.body?.error || 'Live owner login did not return a bearer.';
  } else {
    const headers = {
      accept: '*/*',
      authorization: `Bearer ${token}`,
      'x-admin-token': token,
      'x-free99-gate-session': token,
      'x-skye-gate-session': token
    };

    for (const check of assetChecks) {
      const result = await fetchText(`${BASE_URL}${check.path}`, { headers });
      receipt.checks.push({
        label: check.label,
        path: check.path,
        status: result.status,
        ok: result.status === 200 && hasAll(result.text, check.expect),
        elapsedMs: result.elapsedMs,
        contentType: result.contentType,
        expectedText: check.expect,
        textSample: result.text.slice(0, 220),
        error: result.error || undefined
      });
    }

    const samples = [];
    for (let i = 0; i < STRESS_REQUESTS; i += 1) {
      const check = assetChecks[i % assetChecks.length];
      samples.push(await fetchText(`${BASE_URL}${check.path}`, { headers }));
    }
    const durations = samples.map((sample) => sample.elapsedMs).sort((a, b) => a - b);
    receipt.stress = {
      requests: samples.length,
      ok: samples.every((sample) => sample.status === 200 && sample.ok),
      p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
      maxMs: Number(Math.max(...durations).toFixed(2))
    };
  }

  receipt.ok = Boolean(
    receipt.unauthenticatedGate?.ok
    && receipt.login?.ok
    && receipt.checks.every((check) => check.ok)
    && receipt.stress?.ok
  );

  await fs.mkdir(OUT_DIR, { recursive: true });
  const stamped = path.join(OUT_DIR, `founder-command-skynet-backend-live-http-${receipt.generatedAt.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    latest: LATEST,
    stamped,
    failed: [
      receipt.unauthenticatedGate?.ok ? null : 'unauthenticated gate',
      receipt.login?.ok ? null : 'login',
      ...receipt.checks.filter((check) => !check.ok).map((check) => check.label),
      receipt.stress?.ok ? null : 'stress'
    ].filter(Boolean),
    links: receipt.links
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
