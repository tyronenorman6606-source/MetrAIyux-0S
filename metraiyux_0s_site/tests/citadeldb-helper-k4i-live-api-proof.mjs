#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const zeroOsBase = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(repoRoot, 'test-artifacts', 'citadeldb-helper-k4i-live-api', stamp);
const latestPath = path.join(repoRoot, 'test-artifacts', 'citadeldb-helper-k4i-live-api-latest.json');

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

async function html(pathname, token) {
  const response = await fetch(`${zeroOsBase}${pathname}`, { headers: authHeaders(token) });
  const text = await response.text();
  return { response, text };
}

await fs.promises.mkdir(outDir, { recursive: true });
const credential = await findWorkingCredential();
const recordId = `dev_live_${Date.now()}`;

const connection = await api('/api/citadel/dev/connection', credential.token);
assert.equal(connection.response.status, 200, `connection returned ${connection.response.status}`);
assert.equal(connection.body.mode, 'skynet-citadeldb-http-database-url');
assert.equal(connection.body.databaseUrl, `${zeroOsBase}/api/citadel/dev`);

const write = await api('/api/citadel/dev/rows', credential.token, {
  method: 'POST',
  body: JSON.stringify({
    appId: 'citadeldb-dev-live-proof',
    table: 'profiles',
    recordId,
    payload: { id: recordId, source: 'live-dev-api-proof', createdAt: new Date().toISOString() }
  })
});
assert.equal(write.response.status, 201, `dev row write returned ${write.response.status}`);
assert.equal(write.body.event?.status, 'mirrored_to_citadel');

const query = await api('/api/citadel/dev/query', credential.token, {
  method: 'POST',
  body: JSON.stringify({ appId: 'citadeldb-dev-live-proof', table: 'profiles', recordId, limit: 5 })
});
assert.equal(query.response.status, 200, `dev row query returned ${query.response.status}`);
assert.ok((query.body.rows || []).some((row) => row.recordId === recordId));

const safeSql = await api('/api/citadel/dev/sql', credential.token, {
  method: 'POST',
  body: JSON.stringify({ sql: 'select * from citadel_rows', appId: 'citadeldb-dev-live-proof', table: 'profiles', recordId, limit: 5 })
});
assert.equal(safeSql.response.status, 200, `safe SQL returned ${safeSql.response.status}`);
assert.ok((safeSql.body.rows || []).some((row) => row.recordId === recordId));

const helperStatus = await api('/api/helper-k4i/status', credential.token);
assert.equal(helperStatus.response.status, 200, `helper status returned ${helperStatus.response.status}`);
assert.equal(helperStatus.body.persona?.name, 'Helper K4i');

const deployAuthority = await api('/api/helper-k4i/deploy-authority?project=devooderator&worker=metraiyux-0s-full-system', credential.token);
assert.equal(deployAuthority.response.status, 200, `deploy authority returned ${deployAuthority.response.status}`);
assert.equal(deployAuthority.body.deploymentAgent?.name, 'SkyeNet Deployment Agent');
assert.equal(deployAuthority.body.authority?.capabilities?.secretRotationPlan, true);
assert.equal(JSON.stringify(deployAuthority.body).includes(credential.token), false, 'deploy authority must not leak gate token');

const deployAssist = await api('/api/helper-k4i/deploy-assist', credential.token, {
  method: 'POST',
  body: JSON.stringify({
    action: 'live_api_deploy_assist_proof',
    project: 'devooderator',
    worker: 'metraiyux-0s-full-system',
    smokeReceipt: 'test-artifacts/deployment-agent/2026-05-24T03-04-40-761Z-smoke-devooderator.json',
    stressReceipt: 'test-artifacts/deployment-agent/2026-05-24T03-04-50-875Z-stress-devooderator.json'
  })
});
assert.ok([201, 207].includes(deployAssist.response.status), `deploy assist returned ${deployAssist.response.status}`);
assert.equal(deployAssist.body.receipt?.type, 'skyenet_deployment_agent.assist');
assert.equal(deployAssist.body.receipt?.authority?.agent?.id, 'skyenet-deployment-agent');
assert.equal(JSON.stringify(deployAssist.body).includes(credential.token), false, 'deploy assist must not leak gate token');

const secretPlan = await api('/api/helper-k4i/secret-rotation-plan', credential.token, {
  method: 'POST',
  body: JSON.stringify({
    project: 'devooderator',
    worker: 'metraiyux-0s-full-system',
    reason: 'production live API proof after deployment-agent release'
  })
});
assert.equal(secretPlan.response.status, 201, `secret rotation plan returned ${secretPlan.response.status}`);
assert.equal(secretPlan.body.plan?.schema, 'skyenet-secret-rotation-plan-v1');
assert.equal(JSON.stringify(secretPlan.body).includes(credential.token), false, 'secret rotation plan must not leak gate token');

const helperScan = await api('/api/helper-k4i/scan', credential.token, {
  method: 'POST',
  body: JSON.stringify({ mode: 'live_api_proof', notify: false })
});
assert.ok([200, 207].includes(helperScan.response.status), `helper scan returned ${helperScan.response.status}`);
assert.equal(helperScan.body.scan?.service, 'helper-k4i');
assert.equal(helperScan.body.stored?.citadel, true);

const patchPlan = await api('/api/helper-k4i/patch-plan', credential.token, {
  method: 'POST',
  body: JSON.stringify({
    title: 'Live proof patch handoff',
    issue: 'Live API proof verified Helper K4i can prepare vault patch plans.'
  })
});
assert.equal(patchPlan.response.status, 201, `patch plan returned ${patchPlan.response.status}`);
assert.equal(patchPlan.body.plan?.status, 'planned_for_vault_handoff');

const routeManifest = await api('/api/0s/route-manifest', credential.token);
assert.equal(routeManifest.response.status, 200, `route manifest returned ${routeManifest.response.status}`);
const appIds = (routeManifest.body.apps || []).map((app) => app.id);
assert.ok(appIds.includes('citadeldb'));
assert.ok(appIds.includes('helperK4i'));
assert.ok(appIds.includes('skyenetDeploymentAgent'));

const changelog = await html('/changelog', credential.token);
assert.equal(changelog.response.status, 200, `changelog returned ${changelog.response.status}`);
assert.match(changelog.text, /helper-k4i-skynet-deployment-agent-live/);
assert.match(changelog.text, /Helper K4i now has a live SkyeNet deployment agent/);

const skynetStatus = await api('/api/skyenet/status', credential.token);
assert.equal(skynetStatus.response.status, 200, `SkyeNet status returned ${skynetStatus.response.status}`);
assert.equal(skynetStatus.body.skynet?.url_model?.public_product_name, 'SkyeNet');

const receipt = {
  ok: true,
  generated_at: new Date().toISOString(),
  zero_os_base: zeroOsBase,
  credential: { key: credential.key, hash: credential.hash },
  citadeldb: {
    database_url: connection.body.databaseUrl,
    record_id: recordId,
    row_write_status: write.body.event?.status,
    query_count: query.body.count,
    safe_sql_count: safeSql.body.count
  },
  helper_k4i: {
    status: helperStatus.body.persona?.name,
    deploy_authority_status: deployAuthority.body.authority?.status,
    deploy_assist_receipt_id: deployAssist.body.receipt?.id,
    secret_rotation_plan_id: secretPlan.body.plan?.id,
    deployment_agent: deployAuthority.body.deploymentAgent?.name,
    scan_id: helperScan.body.scan?.id,
    scan_status: helperScan.body.scan?.status,
    stored: helperScan.body.stored,
    patch_plan_id: patchPlan.body.plan?.id
  },
  skynet: {
    url_model: skynetStatus.body.skynet?.url_model,
    route_manifest_has_citadeldb: appIds.includes('citadeldb'),
    route_manifest_has_helper_k4i: appIds.includes('helperK4i'),
    route_manifest_has_deployment_agent: appIds.includes('skyenetDeploymentAgent'),
    changelog_has_deployment_agent_entry: /helper-k4i-skynet-deployment-agent-live/.test(changelog.text)
  }
};

const receiptPath = path.join(outDir, 'receipt.json');
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  record_id: recordId,
  deployment_agent: deployAuthority.body.authority?.status,
  helper_scan_id: helperScan.body.scan?.id,
  patch_plan_id: patchPlan.body.plan?.id,
  receipt: path.relative(repoRoot, receiptPath),
  latest: path.relative(repoRoot, latestPath)
}, null, 2));
