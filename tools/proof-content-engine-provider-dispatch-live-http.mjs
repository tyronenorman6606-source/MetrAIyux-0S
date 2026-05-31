#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const BASE_URL = String(process.env.CONTENT_ENGINE_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const OUT_DIR = path.resolve('test-artifacts/content-engine-provider-dispatch');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const STAMPED = path.join(OUT_DIR, STAMP, 'receipt.json');
const LATEST = path.join(OUT_DIR, 'content-engine-provider-dispatch-live-http-latest.json');
const CREDENTIAL_KEYS = [
  'ZERO_OS_GATE_SESSION',
  'MCP_GATE_SESSION',
  'MCP_HTTP_BEARER_TOKEN',
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
  return text.replace(/^Bearer\s+/i, '');
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

async function credentialCandidates() {
  const envFiles = [
    process.env.ROOT_ENV_FILE,
    process.env.METRAIYUX_ROOT_ENV,
    '.env',
    'env.txt'
  ].filter(Boolean);
  const merged = { ...process.env };
  for (const file of envFiles) Object.assign(merged, await readEnvFile(path.resolve(file)));
  return CREDENTIAL_KEYS
    .filter((key) => merged[key])
    .map((key) => ({ key, value: unquote(merged[key]) }))
    .filter((item) => item.value);
}

async function loginWith(candidate) {
  if (/SESSION|TOKEN|BEARER/i.test(candidate.key)) {
    const response = await fetch(`${BASE_URL}/api/admin/connectors/status`, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${candidate.value}`,
        'x-admin-token': candidate.value,
        'x-free99-gate-session': candidate.value,
        'x-skye-gate-session': candidate.value,
        'x-skygate-session': candidate.value
      }
    }).catch(() => null);
    if (response?.ok) return { token: candidate.value, sourceKey: candidate.key, mode: 'bearer' };
    return null;
  }
  for (const pathname of ['/api/owner/admin-login', '/api/owner/admin-login']) {
    const response = await fetch(`${BASE_URL}${pathname}`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ code: candidate.value })
    }).catch(() => null);
    if (!response) continue;
    const body = await response.json().catch(() => ({}));
    const token = unquote(body.gateBearerToken || body.gateToken || body.token || body.session || '');
    if (response.ok && token) return { token, sourceKey: candidate.key, mode: pathname };
  }
  return null;
}

async function resolveOwnerGate() {
  for (const candidate of await credentialCandidates()) {
    const login = await loginWith(candidate);
    if (login?.token) return login;
  }
  return null;
}

function gateHeaders(token, extra = {}) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-admin-token': token,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'x-skygate-session': token,
    ...extra
  };
}

async function fetchAny(label, pathname, init = {}) {
  const started = performance.now();
  const response = await fetch(`${BASE_URL}${pathname}`, init);
  const text = await response.text().catch(() => '');
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { text: text.slice(0, 2000) };
  }
  return {
    label,
    path: pathname,
    method: init.method || 'GET',
    status: response.status,
    ok: response.ok && body.ok !== false,
    elapsedMs: Number((performance.now() - started).toFixed(2)),
    location: response.headers.get('location') || '',
    contentType: response.headers.get('content-type') || '',
    body
  };
}

function check(label, ok, detail = {}) {
  return { label, ok: Boolean(ok), ...detail };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stress(token, runId) {
  const paths = [
    '/api/admin/connectors/status',
    '/api/admin/content-engine/runs',
    `/api/admin/content-engine/run?id=${encodeURIComponent(runId)}`,
    '/api/admin/content-engine/local-brain-feed'
  ];
  const total = Number(process.env.CONTENT_ENGINE_STRESS_TOTAL || 24);
  const concurrency = Number(process.env.CONTENT_ENGINE_STRESS_CONCURRENCY || 6);
  const durations = [];
  const failures = [];
  let cursor = 0;
  async function worker() {
    while (cursor < total) {
      const index = cursor;
      cursor += 1;
      const pathname = paths[index % paths.length];
      const result = await fetchAny('stress', pathname, { headers: gateHeaders(token) }).catch((error) => ({ ok: false, status: 0, elapsedMs: 0, path: pathname, error: error.message }));
      durations.push(result.elapsedMs || 0);
      if (!result.ok) failures.push({ path: pathname, status: result.status, error: result.error || result.body?.error || '' });
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  durations.sort((a, b) => a - b);
  const percentile = (p) => durations[Math.min(durations.length - 1, Math.floor(durations.length * p))] || 0;
  return {
    ok: failures.length === 0,
    total,
    concurrency,
    failures,
    p50Ms: Number(percentile(0.5).toFixed(2)),
    p95Ms: Number(percentile(0.95).toFixed(2)),
    maxMs: Number((durations.at(-1) || 0).toFixed(2))
  };
}

async function writeReceipt(receipt) {
  await fs.mkdir(path.dirname(STAMPED), { recursive: true });
  await fs.writeFile(STAMPED, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
}

async function main() {
  const owner = await resolveOwnerGate();
  const receipt = {
    ok: false,
    schema: 'metraiyux.0s.content-engine-provider-dispatch-live-http.v1',
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    credential_source: owner?.sourceKey || 'missing',
    credential_mode: owner?.mode || '',
    checks: [],
    stress: null,
    run: null,
    dispatch_boundary: {
      provider_call_made: false,
      reason: 'External social/email/site provider publishing remains owner-approved and connector-gated.'
    },
    failures: []
  };

  if (!owner?.token) {
    receipt.failures.push('No shared owner/gate credential was available in env, .env, or env.txt.');
    await writeReceipt(receipt);
    console.log(JSON.stringify({ ok: false, receipt: LATEST, failures: receipt.failures }, null, 2));
    process.exit(1);
  }

  const marker = `content-engine-proof-${Date.now()}`;
  const headers = gateHeaders(owner.token, { 'content-type': 'application/json' });
  const unauthApi = await fetchAny('Content Engine API blocks anonymous runs read', '/api/admin/content-engine/runs', { headers: { accept: 'application/json' } });
  receipt.checks.push(check(unauthApi.label, [401, 403].includes(unauthApi.status), { status: unauthApi.status, error: unauthApi.body?.error || '' }));

  const unauthPage = await fetch(`${BASE_URL}/admin/content-engine-lane.html`, { redirect: 'manual' });
  receipt.checks.push(check('Content Engine admin page redirects or denies anonymous access', [301, 302, 303, 307, 308, 401, 403].includes(unauthPage.status), { status: unauthPage.status, location: unauthPage.headers.get('location') || '' }));

  const page = await fetch(`${BASE_URL}/admin/content-engine-lane.html`, { headers: gateHeaders(owner.token) });
  const pageText = await page.text().catch(() => '');
  receipt.checks.push(check('Content Engine admin surface renders through shared gate', page.ok && pageText.includes('Content Engine Lane'), { status: page.status }));

  const connectorStatus = await fetchAny('Connector status reads storage and provider boundary', '/api/admin/connectors/status', { headers: gateHeaders(owner.token) });
  receipt.checks.push(check(
    connectorStatus.label,
    connectorStatus.ok && Array.isArray(connectorStatus.body?.connectors) && Boolean(connectorStatus.body?.storage_mode),
    {
      status: connectorStatus.status,
      storage_mode: connectorStatus.body?.storage_mode || '',
      configured_connectors: (connectorStatus.body?.connectors || []).filter((item) => item.configured).length,
      connector_count: connectorStatus.body?.connectors?.length || 0
    }
  ));

  const article = {
    slug: marker,
    title: `0S proof content package ${marker}`,
    subtitle: 'Live HTTP proof that the Content Engine can create, read, approve, dispatch, and read back provider-gated campaign work.',
    audience: 'Founder Command operator',
    category: '0S Proof',
    proofRule: 'External publishing must stay approval-gated and provider_call_made:false unless an owner-approved connector is configured.',
    marketingUse: 'Turn a verified 0S capability into controlled assets without unsupported external publishing.',
    operatingMove: 'Create the package, store local-brain context, queue operator-reviewed connector events, and read the receipt back.',
    directAppRoutes: [
      { title: 'Truth Ledger', route: '/proof/0s-truth-ledger.html', use: 'honest capability status' },
      { title: 'SkyErrors', route: '/skyerrors/', use: 'watch and repair evidence' }
    ]
  };
  const activate = await fetchAny('Create approval package from article', '/api/admin/content-engine/activate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ article, channels: ['linkedin', 'email', 'website_section', 'local_brain', 'repository_update'] })
  });
  const runId = activate.body?.run?.id || '';
  receipt.checks.push(check(
    activate.label,
    activate.ok && runId && activate.body?.run?.status === 'approval_package_created' && (activate.body?.assets || []).length >= 4,
    { status: activate.status, run_id: runId, asset_count: activate.body?.assets?.length || 0 }
  ));

  const runRead = runId
    ? await fetchAny('Read created approval package by id', `/api/admin/content-engine/run?id=${encodeURIComponent(runId)}`, { headers: gateHeaders(owner.token) })
    : { ok: false, status: 0, body: {} };
  receipt.checks.push(check(
    'Read created approval package by id',
    runRead.ok && runRead.body?.run?.id === runId && runRead.body?.run?.article_slug === marker,
    { status: runRead.status, run_id: runRead.body?.run?.id || '' }
  ));

  const dispatch = runId
    ? await fetchAny('Approve package and queue provider-gated dispatch events', '/api/admin/content-engine/dispatch', {
        method: 'POST',
        headers,
        body: JSON.stringify({ run_id: runId, approved: true, notes: `Live proof dispatch boundary for ${marker}.` })
      })
    : { ok: false, status: 0, body: {} };
  const dispatches = dispatch.body?.dispatches || [];
  const providerSafeDispatches = dispatches.every((item) => item.event?.provider_call_made !== true);
  const dispatchStatuses = dispatches.map((item) => item.event?.status || item.status || '').filter(Boolean);
  receipt.checks.push(check(
    'Approve package and queue provider-gated dispatch events',
    dispatch.ok
      && dispatch.body?.provider_call_made === false
      && dispatches.length >= 4
      && providerSafeDispatches
      && dispatches.some((item) => item.event?.status === 'stored_local_brain_feed')
      && dispatchStatuses.length >= 4,
    {
      status: dispatch.status,
      dispatch_count: dispatches.length,
      provider_call_made: dispatch.body?.provider_call_made === true,
      queued_events: dispatches.filter((item) => item.event?.status === 'queued_for_operator_review').length,
      local_brain_events: dispatches.filter((item) => item.event?.status === 'stored_local_brain_feed').length,
      dispatch_statuses: dispatchStatuses
    }
  ));

  await sleep(250);
  const afterDispatch = runId
    ? await fetchAny('Read dispatched run and connector events back', `/api/admin/content-engine/run?id=${encodeURIComponent(runId)}`, { headers: gateHeaders(owner.token) })
    : { ok: false, status: 0, body: {} };
  receipt.checks.push(check(
    'Read dispatched run and connector events back',
    afterDispatch.ok
      && afterDispatch.body?.run?.status === 'dispatched_for_operator_review'
      && (afterDispatch.body?.connector_events || []).length >= 4,
    {
      status: afterDispatch.status,
      run_status: afterDispatch.body?.run?.status || '',
      connector_event_count: afterDispatch.body?.connector_events?.length || 0
    }
  ));

  const localBrain = await fetchAny('Local brain feed includes generated chunk', '/api/admin/content-engine/local-brain-feed', { headers: gateHeaders(owner.token) });
  receipt.checks.push(check(
    localBrain.label,
    localBrain.ok && (localBrain.body?.chunks || []).some((chunk) => chunk.run_id === runId && chunk.article_slug === marker),
    { status: localBrain.status, chunk_count: localBrain.body?.chunks?.length || 0 }
  ));

  receipt.stress = runId ? await stress(owner.token, runId) : { ok: false, failures: [{ error: 'run_id_missing' }] };
  receipt.run = {
    id: runId,
    article_slug: marker,
    status: afterDispatch.body?.run?.status || '',
    dispatch_count: dispatches.length,
    provider_call_made: dispatch.body?.provider_call_made === true
  };
  receipt.dispatch_boundary = {
    provider_call_made: dispatch.body?.provider_call_made === true,
    reason: dispatch.body?.provider_call_made === true
      ? 'owner_approved_provider_call_recorded'
      : 'provider dispatch intentionally gated until owner-approved connector credentials and rollback receipts are attached',
    dispatch_statuses: dispatchStatuses
  };
  receipt.failures = [
    ...receipt.checks.filter((item) => !item.ok).map((item) => `${item.label} failed`),
    ...(receipt.stress?.ok ? [] : ['Content Engine stress failed'])
  ];
  receipt.ok = receipt.failures.length === 0;

  await writeReceipt(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: LATEST,
    stampedReceipt: STAMPED,
    checks: receipt.checks.length,
    stress: receipt.stress,
    run: receipt.run,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const receipt = {
    ok: false,
    schema: 'metraiyux.0s.content-engine-provider-dispatch-live-http.v1',
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    failures: [error.message],
    stack: error.stack
  };
  await writeReceipt(receipt);
  console.error(error);
  process.exitCode = 1;
});
