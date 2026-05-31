import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const BASE_URL = (process.env.SKYEROUTEX_OPERATOR_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const OUT_DIR = path.resolve('test-artifacts');
const TARGET_PATH = '/SkyeRouteX/workforce-command-v0.4.0/index.html';
const ENTRY_PATH = `/api/skyeroutex/operator-entry?return=${encodeURIComponent(TARGET_PATH)}`;
const FETCH_TIMEOUT_MS = Number(process.env.SKYEROUTEX_OPERATOR_FETCH_TIMEOUT_MS || 30000);
const ANON_ITERATIONS = Number(process.env.SKYEROUTEX_OPERATOR_ANON_ITERATIONS || 30);
const AUTH_ITERATIONS = Number(process.env.SKYEROUTEX_OPERATOR_AUTH_ITERATIONS || 10);

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function gateHeaders() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: BASE_URL });
  const token = auth.token;
  if (!token) return null;
  return {
    accept: 'text/html,*/*',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token
  };
}

async function fetchEntry(init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}${ENTRY_PATH}`, {
      redirect: 'manual',
      signal: controller.signal,
      ...init,
      headers: {
        accept: 'text/html,*/*',
        ...(init.headers || {})
      }
    });
    await response.arrayBuffer();
    return {
      status: response.status,
      location: response.headers.get('location') || '',
      gate: response.headers.get('x-0s-gate') || '',
      operatorEntry: response.headers.get('x-skyeroutex-operator-entry') || '',
      elapsedMs: Number((performance.now() - started).toFixed(2))
    };
  } catch (error) {
    return {
      status: 0,
      location: '',
      gate: '',
      operatorEntry: '',
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      error: error?.name === 'AbortError' ? `request timed out after ${FETCH_TIMEOUT_MS}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function locationPath(location) {
  try {
    return new URL(location, BASE_URL).pathname;
  } catch (error) {
    return '';
  }
}

function returnParam(location) {
  try {
    return new URL(location, BASE_URL).searchParams.get('return') || '';
  } catch (error) {
    return '';
  }
}

function anonymousOk(result) {
  return result.status === 302
    && locationPath(result.location) === '/admin/login.html'
    && returnParam(result.location) === TARGET_PATH
    && result.operatorEntry === 'shared-gate-login';
}

function authedOk(result) {
  return result.status === 302
    && locationPath(result.location) === TARGET_PATH
    && result.operatorEntry === 'shared-gate-session';
}

async function main() {
  const generatedAt = new Date().toISOString();
  const receiptPath = path.join(OUT_DIR, `skyeroutex-operator-entry-live-http-${nowStamp()}.json`);
  const latestPath = path.join(OUT_DIR, 'skyeroutex-operator-entry-live-http-latest.json');
  const auth = await gateHeaders();

  const anonymous = [];
  for (let i = 0; i < ANON_ITERATIONS; i += 1) {
    anonymous.push(await fetchEntry());
  }

  const authed = [];
  if (auth) {
    for (let i = 0; i < AUTH_ITERATIONS; i += 1) {
      authed.push(await fetchEntry({ headers: auth }));
    }
  }

  const wrongMethod = await fetchEntry({ method: 'POST' });
  const receipt = {
    ok: anonymous.every(anonymousOk)
      && (!auth || authed.every(authedOk))
      && wrongMethod.status === 405,
    generatedAt,
    lane: 'skyeroutex-operator-entry-live-http',
    baseUrl: BASE_URL,
    entryPath: ENTRY_PATH,
    targetPath: TARGET_PATH,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    authCredentialProvided: Boolean(auth),
    checks: {
      anonymous: {
        iterations: ANON_ITERATIONS,
        ok: anonymous.every(anonymousOk),
        failures: anonymous.filter((result) => !anonymousOk(result)),
        averageElapsedMs: Number((anonymous.reduce((sum, result) => sum + result.elapsedMs, 0) / Math.max(1, anonymous.length)).toFixed(2))
      },
      authed: {
        iterations: auth ? AUTH_ITERATIONS : 0,
        ok: auth ? authed.every(authedOk) : null,
        skipped: !auth,
        failures: authed.filter((result) => !authedOk(result)),
        averageElapsedMs: authed.length ? Number((authed.reduce((sum, result) => sum + result.elapsedMs, 0) / authed.length).toFixed(2)) : 0
      },
      wrongMethod: {
        status: wrongMethod.status,
        ok: wrongMethod.status === 405,
        operatorEntry: wrongMethod.operatorEntry
      }
    }
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: receiptPath,
    latest: latestPath,
    anonymous: receipt.checks.anonymous,
    authed: {
      iterations: receipt.checks.authed.iterations,
      ok: receipt.checks.authed.ok,
      skipped: receipt.checks.authed.skipped,
      failures: receipt.checks.authed.failures.length
    },
    wrongMethod: receipt.checks.wrongMethod
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
