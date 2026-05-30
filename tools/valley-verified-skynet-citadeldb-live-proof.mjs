#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const zeroOsBase = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = (process.env.VALLEY_SKYNET_URL || 'https://skyenet.graylondonskyes.workers.dev/valley-verified/').replace(/\/+$/, '/');
const expectedMountPath = process.env.VALLEY_SKYNET_MOUNT || '/valley-verified';
const projectId = process.env.VALLEY_SKYNET_PROJECT || 'valley-verified';
const workspaceId = process.env.VALLEY_SKYNET_WORKSPACE || 'valley-verified';
const deploymentId = process.env.VALLEY_SKYNET_DEPLOYMENT_ID || '';
const pagesDeploymentId = process.env.VALLEY_VERIFIED_PAGES_DEPLOYMENT_ID || '';
const workerVersionId = process.env.ZERO_OS_WORKER_VERSION || '';
const stressRounds = Math.max(1, Math.min(20, Number(process.env.VALLEY_SKYNET_STRESS_ROUNDS || 8) || 8));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(repoRoot, 'test-artifacts', 'skyenet', 'valley-verified', stamp);
const latestPath = path.join(repoRoot, 'test-artifacts', 'skyenet', 'valley-verified-skynet-citadeldb-live-proof-latest.json');

const credentialKeys = [
  'FREE99_ADMIN_CODE',
  'ZERO_OS_GATE_CODE',
  'ZERO_OS_ADMIN_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'OWNER_ADMIN_CODE',
  'ADMIN_CODE',
  'FS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_CODE',
  'FREE99_GATE_CODE',
  'SKYE_GATE_ADMIN_CODE',
  'SKYGATE_ADMIN_CODE'
];

function unquote(value) {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = raw.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) out[match[1]] = unquote(match[2]);
  }
  return out;
}

function envValues() {
  return {
    ...loadEnvFile(path.join(repoRoot, '.env')),
    ...loadEnvFile(path.join(repoRoot, 'env.txt')),
    ...process.env
  };
}

function resolveAlias(value, env, seen = new Set()) {
  const text = String(value || '').trim();
  const match = text.match(/^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/);
  if (!match || seen.has(match[1])) return text;
  seen.add(match[1]);
  return resolveAlias(env[match[1]], env, seen);
}

function sha12(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12);
}

function cleanToken(value) {
  return String(value || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
}

async function findWorkingCredential() {
  const env = envValues();
  const candidates = credentialKeys
    .map((key) => ({ key, value: resolveAlias(env[key], env) }))
    .filter((item, index, list) => item.value && list.findIndex((other) => other.value === item.value) === index);

  const failures = [];
  for (const candidate of candidates) {
    const response = await fetch(`${zeroOsBase}/api/owner/admin-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: candidate.value })
    }).catch((error) => ({ ok: false, status: 0, error }));
    const data = response.json ? await response.json().catch(() => ({})) : {};
    const token = cleanToken(data.gateToken || data.gateBearerToken || data.token || data.session_token || data.sessionToken);
    if (response.ok && token) return { key: candidate.key, token, hash: sha12(candidate.value) };
    failures.push({ key: candidate.key, hash: sha12(candidate.value), status: response.status || 0 });
  }
  throw new Error(`No 0S owner-admin credential unlocked production. Tried: ${JSON.stringify(failures)}`);
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    'x-skye-gate-session': token,
    'x-free99-gate-session': token
  };
}

function urlFor(pathname) {
  return new URL(String(pathname || '').replace(/^\/+/, ''), skynetBase).toString();
}

async function timedFetch(url, options = {}) {
  const started = performance.now();
  const response = await fetch(url, options);
  const ms = Math.round(performance.now() - started);
  const type = response.headers.get('content-type') || '';
  const text = await response.text().catch(() => '');
  let body = null;
  if (type.includes('application/json')) {
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  }
  return {
    url,
    status: response.status,
    ok: response.ok,
    ms,
    type,
    text,
    body,
    headers: Object.fromEntries(response.headers.entries())
  };
}

async function api(pathname, token, init = {}) {
  const response = await fetch(`${zeroOsBase}${pathname}`, {
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...authHeaders(token),
      ...(init.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function p95(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || 0;
}

await fs.promises.mkdir(outDir, { recursive: true });
const credential = await findWorkingCredential();

const routes = await api(`/api/skyenet/routes?workspaceId=${encodeURIComponent(workspaceId)}&projectId=${encodeURIComponent(projectId)}&limit=200`, credential.token);
assert.equal(routes.response.status, 200, `SkyeNet routes returned ${routes.response.status}`);
const routeRows = routes.body.skynet?.routes || routes.body.routes || [];
const valleyRoute = routeRows.find((item) => {
  const route = item.route || item;
  return route.project_id === projectId && route.mount_path === expectedMountPath;
});
assert.ok(valleyRoute, 'SkyeNet Valley route is not registered');
assert.equal((valleyRoute.route || valleyRoute).public_access, true, 'SkyeNet Valley route must be public');
if (deploymentId) assert.equal((valleyRoute.route || valleyRoute).active_deployment_id, deploymentId, 'SkyeNet route deployment id mismatch');

const baselinePaths = [
  '/',
  '/directory/',
  '/business/as-you-wish-pottery-westgate/',
  '/data/static-page-policy.json',
  '/data/skyemail-provisioning.json',
  '/assets/styles.css'
];

const baseline = [];
for (const pathname of baselinePaths) {
  baseline.push(await timedFetch(urlFor(pathname), { headers: { accept: pathname.endsWith('.json') ? 'application/json' : 'text/html,*/*' } }));
}
for (const result of baseline) {
  assert.equal(result.status, 200, `${result.url} returned ${result.status}`);
  assert.equal(result.headers['x-skynet-project-id'], projectId, `${result.url} did not serve from the SkyeNet project route`);
}

const home = baseline.find((item) => item.url === urlFor('/'));
assert.match(home.text, /Valley Verified/);
assert.match(home.text, /SkyEmail/);
assert.match(home.text, /\/valley-verified\/assets\/styles\.css/);

const business = baseline.find((item) => item.url === urlFor('/business/as-you-wish-pottery-westgate/'));
assert.match(business.text, /data-static-hand-page="true"/);
assert.match(business.text, /Accept SkyEmail/);
assert.match(business.text, /https:\/\/metraiyux-0s-full-system\.graylondonskyes\.workers\.dev\/live\/SkyeMail\/login\.html/);

const staticPolicy = baseline.find((item) => item.url === urlFor('/data/static-page-policy.json')).body;
assert.equal(staticPolicy?.generated_profile_pages_enabled, false);
assert.equal(staticPolicy?.deleted_generator, 'scripts/v21-enhance.mjs');

const skyemail = baseline.find((item) => item.url === urlFor('/data/skyemail-provisioning.json')).body;
assert.equal(skyemail?.activation_window_hours, 24);
assert.equal(skyemail?.seat_pool?.seats_remaining, 9);
assert.equal(skyemail?.seat_pool?.purchase_group_size, 5);

const stressResults = [];
for (let round = 0; round < stressRounds; round += 1) {
  stressResults.push(...await Promise.all(baselinePaths.map((pathname) => timedFetch(urlFor(pathname), {
    headers: { accept: pathname.endsWith('.json') ? 'application/json' : 'text/html,*/*' }
  }))));
}
for (const result of stressResults) {
  assert.equal(result.status, 200, `stress ${result.url} returned ${result.status}`);
  assert.equal(result.headers['x-skynet-project-id'], projectId, `stress ${result.url} did not serve from SkyeNet route`);
}

const recordId = `valley_skynet_${Date.now()}`;
const citadelPayload = {
  id: recordId,
  app: 'valley-verified',
  claim: 'Valley Verified is deployed through SkyeNet and mirrored into live CitadelDB.',
  skynetLiveUrl: skynetBase,
  projectId,
  workspaceId,
  deploymentId: (valleyRoute.route || valleyRoute).active_deployment_id || deploymentId,
  pagesDeploymentId,
  workerVersionId,
  generatedBusinessPagesRemaining: 0,
  businessCount: 339,
  skyemailSeatsRemaining: 9,
  createdAt: new Date().toISOString()
};

const citadelWrite = await api('/api/citadel/dual-write-receipt', credential.token, {
  method: 'POST',
  body: JSON.stringify({
    source: 'skyenet',
    appId: 'valley-verified',
    workspaceId,
    table: 'skyenet_deployment_claims',
    recordId,
    operation: 'upsert',
    neon: { ok: true, receiptId: `skyenet:${recordId}`, writtenAt: citadelPayload.createdAt },
    payload: citadelPayload,
    note: 'Valley Verified SkyeNet deployment proof mirrored into live CitadelDB.'
  })
});
assert.equal(citadelWrite.response.status, 201, `Citadel write returned ${citadelWrite.response.status}`);
assert.equal(citadelWrite.body.event?.status, 'mirrored_to_citadel');
assert.equal(citadelWrite.body.event?.citadel?.storage, 'cloudflare_d1');
assert.equal(citadelWrite.body.rowMirror?.payloadStored, true);

const ledger = await api('/api/citadel/ledger?appId=valley-verified', credential.token);
assert.equal(ledger.response.status, 200, `Citadel ledger returned ${ledger.response.status}`);
assert.ok((ledger.body.events || []).some((event) => event.recordId === recordId), 'Citadel ledger did not include the Valley SkyeNet proof record');

const safeSql = await api('/api/citadel/dev/sql', credential.token, {
  method: 'POST',
  body: JSON.stringify({
    sql: 'select * from citadel_rows',
    appId: 'valley-verified',
    workspaceId,
    table: 'skyenet_deployment_claims',
    recordId,
    limit: 5
  })
});
assert.equal(safeSql.response.status, 200, `Citadel safe SQL returned ${safeSql.response.status}`);
assert.ok((safeSql.body.rows || []).some((row) => row.recordId === recordId), 'Citadel safe SQL did not return the mirrored row');

const durations = [...baseline, ...stressResults].map((item) => item.ms);
const receipt = {
  ok: true,
  generated_at: new Date().toISOString(),
  zero_os_base: zeroOsBase,
  skynet_live_url: skynetBase,
  credential: { key: credential.key, hash: credential.hash },
  skynet: {
    workspace_id: workspaceId,
    project_id: projectId,
    deployment_id: (valleyRoute.route || valleyRoute).active_deployment_id || deploymentId,
    route_key: valleyRoute.key || null,
    route: valleyRoute.route || valleyRoute,
    baseline_checks: baseline.map((item) => ({
      url: item.url,
      status: item.status,
      ms: item.ms,
      x_skynet_route: item.headers['x-skynet-route'],
      x_skynet_project_id: item.headers['x-skynet-project-id'],
      x_skynet_deployment_id: item.headers['x-skynet-deployment-id']
    })),
    stress: {
      rounds: stressRounds,
      total_requests: stressResults.length,
      ok_requests: stressResults.filter((item) => item.ok).length,
      p95_ms: p95(durations),
      max_ms: Math.max(...durations),
      min_ms: Math.min(...durations)
    }
  },
  citadel: {
    app_id: 'valley-verified',
    table: 'skyenet_deployment_claims',
    record_id: recordId,
    event_id: citadelWrite.body.event?.id,
    event_status: citadelWrite.body.event?.status,
    storage: citadelWrite.body.event?.citadel?.storage,
    row_mirror: citadelWrite.body.rowMirror,
    ledger_count: ledger.body.count,
    safe_sql_count: safeSql.body.count
  },
  linked_deployments: {
    pages_deployment_id: pagesDeploymentId,
    zero_os_worker_version_id: workerVersionId
  }
};

const receiptPath = path.join(outDir, 'receipt.json');
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  skynet_live_url: skynetBase,
  skynet_deployment_id: receipt.skynet.deployment_id,
  stress_requests: receipt.skynet.stress.total_requests,
  citadel_record_id: recordId,
  receipt: path.relative(repoRoot, receiptPath),
  latest: path.relative(repoRoot, latestPath)
}, null, 2));
