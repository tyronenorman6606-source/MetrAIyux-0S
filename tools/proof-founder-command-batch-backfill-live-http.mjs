#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const BASE_URL = String(process.env.ZERO_OS_LIVE_BASE || process.env.FOUNDER_COMMAND_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const OUT_DIR = path.join(repoRoot, 'test-artifacts', 'founder-command-batch-backfill');
const LATEST = path.join(OUT_DIR, 'founder-command-batch-backfill-live-http-latest.json');
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
  const timeoutMs = Number(init.timeoutMs || 60000) || 60000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timer);
    const body = await response.json().catch(() => ({}));
    return { status: response.status, ok: response.ok && body?.ok !== false, elapsedMs: Number((performance.now() - started).toFixed(2)), body };
  } catch (error) {
    clearTimeout(timer);
    return {
      status: 0,
      ok: false,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      body: { ok: false, error: error?.name === 'AbortError' ? 'request_timeout' : (error?.message || String(error)) }
    };
  }
}

function headers(token, extra = {}) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-admin-token': token,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    ...extra
  };
}

function compact(call, extra = {}) {
  return {
    status: call.status,
    ok: Boolean(call.ok),
    elapsedMs: call.elapsedMs,
    error: call.body?.error || '',
    ...extra
  };
}

function percentile(sorted, pct) {
  return sorted[Math.max(0, Math.ceil(sorted.length * pct) - 1)] || 0;
}

function check(label, ok, details = {}) {
  return { label, ok: Boolean(ok), ...details };
}

async function writeReceipt(receipt) {
  const stamp = receipt.generatedAt.replace(/[:.]/g, '-');
  const stamped = path.join(OUT_DIR, stamp, 'receipt.json');
  await fs.mkdir(path.dirname(stamped), { recursive: true });
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(LATEST, `${JSON.stringify({ ...receipt, stampedReceipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  return { stamped, latest: LATEST };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const receipt = {
    ok: false,
    generatedAt,
    lane: 'founder-command-batch-backfill-live-http',
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    credentialSource: '',
    login: null,
    before: null,
    accountBackfill: null,
    identityBatches: [],
    after: null,
    readbacks: {},
    checks: [],
    stress: null,
    failures: []
  };

  const credential = await liveCredential();
  receipt.credentialSource = credential.key || 'missing';
  if (!credential.value) {
    receipt.failures.push('No owner credential found in process env, .env, or env.txt.');
    const paths = await writeReceipt(receipt);
    console.log(JSON.stringify({ ok: false, receipt: path.relative(repoRoot, paths.latest), failures: receipt.failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  const login = await fetchJson(`${BASE_URL}/api/owner/admin-login`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ code: credential.value })
  });
  const token = login.body?.gateBearerToken || login.body?.gateToken || login.body?.token || '';
  receipt.login = compact(login, { tokenReceived: Boolean(token) });
  if (!token) receipt.failures.push(login.body?.error || 'Founder Command login did not return shared gate bearer.');

  if (token) {
    const h = headers(token);
    const jsonH = headers(token, { 'content-type': 'application/json' });
    const before = await fetchJson(`${BASE_URL}/api/founder-command/crosswalk/sources`, { headers: h, timeoutMs: 60000 });
    receipt.before = compact(before, {
      sourceBusinesses: before.body?.source_counts?.businesses || 0,
      durableAccounts: before.body?.durable_counts?.accounts || 0,
      durableIdentityLinks: before.body?.durable_counts?.identity_links || 0
    });

    const sourceAccounts = Math.max(
      Number(before.body?.source_counts?.accounts || 0),
      Number(before.body?.source_counts?.businesses || 0),
      Number(before.body?.source_counts?.valley_businesses || 0)
    );
    const accountBackfill = await fetchJson(`${BASE_URL}/api/founder-command/accounts/backfill`, {
      method: 'POST',
      headers: jsonH,
      timeoutMs: 60000,
      body: JSON.stringify({ limit: 25, dry_run: true })
    });
    receipt.accountBackfill = compact(accountBackfill, {
      dryRun: Boolean(accountBackfill.body?.dry_run),
      wouldBackfill: accountBackfill.body?.would_backfill || 0,
      sourceBusinesses: accountBackfill.body?.source_counts?.businesses || 0
    });

    let offset = 0;
    const limit = Number(process.env.FOUNDER_IDENTITY_BACKFILL_BATCH || 10) || 10;
    const maxBatches = Number(process.env.FOUNDER_IDENTITY_BACKFILL_MAX_BATCHES || 80) || 80;
    for (let batch = 0; batch < maxBatches; batch += 1) {
      const result = await fetchJson(`${BASE_URL}/api/founder-command/identity/backfill`, {
        method: 'POST',
        headers: jsonH,
        timeoutMs: 60000,
        body: JSON.stringify({ offset, limit, confirm: true })
      });
      const row = compact(result, {
        offset,
        limit,
        persistedAccounts: result.body?.persisted_accounts || 0,
        persistedIdentityLinks: result.body?.persisted_identity_links || 0,
        persistedIdentityIndexRecords: result.body?.persisted_identity_index_records || 0,
        remaining: result.body?.remaining ?? null,
        nextOffset: result.body?.next_offset ?? null
      });
      receipt.identityBatches.push(row);
      if (!result.ok) break;
      if (result.body?.next_offset === null || result.body?.next_offset === undefined) break;
      offset = Number(result.body.next_offset);
    }

    const after = await fetchJson(`${BASE_URL}/api/founder-command/crosswalk/sources`, { headers: h, timeoutMs: 60000 });
    const accounts = await fetchJson(`${BASE_URL}/api/founder-command/accounts?limit=1000`, { headers: h, timeoutMs: 60000 });
    const workSystem = await fetchJson(`${BASE_URL}/api/founder-command/work-system`, { headers: h, timeoutMs: 60000 });
    const bob = await fetchJson(`${BASE_URL}/api/founder-command/identity/resolve?source_system=valley-verified&source_id=bobs-smoke-shop-litchfield-park`, { headers: h, timeoutMs: 60000 });
    receipt.after = compact(after, {
      sourceBusinesses: after.body?.source_counts?.businesses || 0,
      sourceAccounts: after.body?.source_counts?.accounts || 0,
      durableAccounts: after.body?.durable_counts?.accounts || 0,
      durableIdentityLinks: after.body?.durable_counts?.identity_links || 0,
      durableIdentityIndexes: after.body?.durable_counts?.identity_indexes || 0
    });
    receipt.readbacks = {
      accounts: compact(accounts, {
        accounts: accounts.body?.counts?.accounts || 0,
        returned: accounts.body?.counts?.returned || 0,
        aeWorkOrders: accounts.body?.counts?.ae_work_orders || 0,
        skyemailReady: accounts.body?.counts?.skyemail_ready || 0
      }),
      workSystem: compact(workSystem, {
        clientAccounts: workSystem.body?.metrics?.client_accounts || 0,
        identityLinks: workSystem.body?.metrics?.account_identity_links || 0
      }),
      bobResolve: compact(bob, {
        clientAccountId: bob.body?.account?.client_account_id || '',
        matchType: bob.body?.resolution?.match_type || '',
        linkCount: bob.body?.identity_links?.length || 0
      })
    };

    const sourceCount = Math.max(receipt.after.sourceBusinesses || 0, receipt.after.sourceAccounts || 0);
    receipt.checks.push(
      check('Source crosswalk read succeeded before writes', before.ok && sourceAccounts >= 300, { sourceAccounts }),
      check('Durable account backfill plan route is live', accountBackfill.status === 200 && accountBackfill.body?.dry_run === true && Number(accountBackfill.body?.would_backfill || 0) > 0, { wouldBackfill: accountBackfill.body?.would_backfill || 0 }),
      check('Identity batch backfill completed all source pages', receipt.identityBatches.length > 0 && receipt.identityBatches.every((item) => item.ok) && receipt.identityBatches.at(-1)?.remaining === 0, { batches: receipt.identityBatches.length, remaining: receipt.identityBatches.at(-1)?.remaining }),
      check('Durable accounts now cover source account graph', receipt.after.durableAccounts >= sourceCount && sourceCount >= 300, { durableAccounts: receipt.after.durableAccounts, sourceCount }),
      check('Durable identity links were batch-created', receipt.after.durableIdentityLinks >= sourceCount * 4, { durableIdentityLinks: receipt.after.durableIdentityLinks, minimum: sourceCount * 4 }),
      check('Founder accounts readback returns the full graph', receipt.readbacks.accounts.ok && receipt.readbacks.accounts.accounts >= sourceCount, receipt.readbacks.accounts),
      check('Work system reads back durable identity links', receipt.readbacks.workSystem.ok && receipt.readbacks.workSystem.identityLinks >= sourceCount * 4, receipt.readbacks.workSystem),
      check('Bob resolves through durable Valley identity link', receipt.readbacks.bobResolve.ok && receipt.readbacks.bobResolve.clientAccountId === 'founder-client:bobs-smoke-shop-litchfield-park' && receipt.readbacks.bobResolve.matchType === 'identity_link', receipt.readbacks.bobResolve)
    );

    const samples = [];
    const stressRoutes = [
      '/api/founder-command/accounts?limit=100',
      '/api/founder-command/crosswalk/sources',
      '/api/founder-command/identity/resolve?source_system=valley-verified&source_id=bobs-smoke-shop-litchfield-park',
      '/api/founder-command/work-system'
    ];
    for (let index = 0; index < 16; index += 1) {
      samples.push(await fetchJson(`${BASE_URL}${stressRoutes[index % stressRoutes.length]}`, { headers: h, timeoutMs: 60000 }));
    }
    const durations = samples.map((item) => item.elapsedMs).sort((a, b) => a - b);
    receipt.stress = {
      requests: samples.length,
      ok: samples.every((item) => item.status === 200 && item.ok),
      p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
      maxMs: Number(Math.max(...durations).toFixed(2))
    };
  }

  for (const item of receipt.checks) {
    if (!item.ok) receipt.failures.push(`Check failed: ${item.label}`);
  }
  if (receipt.stress && !receipt.stress.ok) receipt.failures.push('Batch backfill stress failed.');
  receipt.ok = Boolean(receipt.login?.tokenReceived && receipt.checks.length > 0 && receipt.checks.every((item) => item.ok) && receipt.stress?.ok && receipt.failures.length === 0);
  const paths = await writeReceipt(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, paths.latest),
    stampedReceipt: path.relative(repoRoot, paths.stamped),
    before: receipt.before,
    accountBackfill: receipt.accountBackfill,
    identityBatches: receipt.identityBatches.map((item) => ({
      offset: item.offset,
      status: item.status,
      ok: item.ok,
      persistedAccounts: item.persistedAccounts,
      persistedIdentityLinks: item.persistedIdentityLinks,
      remaining: item.remaining,
      elapsedMs: item.elapsedMs
    })),
    after: receipt.after,
    checks: receipt.checks.map((item) => ({ label: item.label, ok: item.ok })),
    stress: receipt.stress,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    lane: 'founder-command-batch-backfill-live-http',
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    fatal: error?.stack || error?.message || String(error)
  };
  const paths = await writeReceipt(receipt);
  console.error(JSON.stringify({ ok: false, receipt: path.relative(repoRoot, paths.latest), fatal: receipt.fatal }, null, 2));
  process.exitCode = 1;
});
