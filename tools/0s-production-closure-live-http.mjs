#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const baseUrl = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactRoot = path.join(repoRoot, 'test-artifacts', '0s-production-closure');
const receiptPath = path.join(artifactRoot, stamp, 'receipt.json');
const latestPath = path.join(artifactRoot, '0s-production-closure-latest.json');
const publicPath = path.join(repoRoot, 'metraiyux_0s_site', 'proof', '0s-production-closure.json');
const localTruthPath = path.join(repoRoot, 'metraiyux_0s_site', 'proof', '0s-truth-ledger.json');
const deployReceiptPath = path.join(repoRoot, 'test-artifacts', '0s-worker-deploy', 'founder-command-full-worker-deploy-latest.json');
const credentialKeys = [
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

const gatedChecks = [
  { path: '/proof/0s-truth-ledger.json', kind: 'json', marker: 'metraiyux.0s.truth-ledger.v1' },
  { path: '/skyerrors/live-capability-watch.json', kind: 'json', marker: 'metraiyux.0s.live-capability-watch.receipt.v1' },
  { path: '/admin/content-engine-lane.html', kind: 'html', marker: 'Content Engine Lane' },
  { path: '/agentic-growth-layer/', kind: 'html', marker: 'Agentic Growth' },
  { path: '/client-app-factory/', kind: 'html', marker: 'Client App Factory' },
  { path: '/northstar/', kind: 'html', marker: 'NorthStar' },
  { path: '/key-gate-13th/', kind: 'html', marker: 'Key Gate' },
  { path: '/blog/', kind: 'html', marker: 'Blog' },
  { path: '/live/skye-content-forge-publisher.html', kind: 'html', marker: 'Skye Content Forge' },
  { path: '/live/connectlog-relay13-operator-proof.html', kind: 'html', marker: 'ConnectLog' },
  { path: '/live/skye-media-center-operator-proof.html', kind: 'html', marker: 'SkyeMediaCenter' },
  { path: '/live/relay13-chat-hub.html', kind: 'html', marker: 'Relay13 Chat Universe' },
  { path: '/live/company-knowledge-layer-proof.html', kind: 'html', marker: 'Company Knowledge Layer' },
  { path: '/live/marketing-made-easy-growth-suite.html', kind: 'html', marker: 'Marketing Made Easy' },
  { path: '/live/houseoperations-skyebox-operator-proof.html', kind: 'html', marker: 'HouseOperations' },
  { path: '/live/skyeroutex-workforce-command.html', kind: 'html', marker: 'SkyeRouteX' },
  { path: '/live/skyeprofitconsole-profit-console.html', kind: 'html', marker: 'SkyeProfitConsole' },
  { path: '/live/skye-split-engine-operator-proof.html', kind: 'html', marker: 'Skye Split Engine' }
];

function unquote(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text.replace(/^Bearer\s+/i, '');
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readEnvFile(file) {
  try {
    const text = await fsp.readFile(file, 'utf8');
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
  for (const file of envFiles) Object.assign(merged, await readEnvFile(path.resolve(repoRoot, file)));
  return credentialKeys
    .filter((key) => merged[key])
    .map((key) => ({ key, value: unquote(merged[key]) }))
    .filter((item) => item.value);
}

function gateHeaders(token, extra = {}) {
  return {
    accept: 'application/json,text/html',
    authorization: `Bearer ${token}`,
    'x-admin-token': token,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'x-skygate-session': token,
    ...extra
  };
}

async function fetchText(pathname, init = {}) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${pathname}`, init);
  const text = await response.text().catch(() => '');
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {}
  return {
    path: pathname,
    status: response.status,
    ok: response.ok,
    location: response.headers.get('location') || '',
    content_type: response.headers.get('content-type') || '',
    elapsed_ms: Number((performance.now() - started).toFixed(2)),
    bytes: Buffer.byteLength(text),
    text,
    body
  };
}

async function resolveGateToken() {
  for (const candidate of await credentialCandidates()) {
    if (/SESSION|TOKEN|BEARER/i.test(candidate.key)) {
      const probe = await fetchText('/api/admin/connectors/status', { headers: gateHeaders(candidate.value) }).catch(() => null);
      if (probe?.ok) return { token: candidate.value, source_key: candidate.key, mode: 'bearer' };
      continue;
    }
    for (const route of ['/api/owner/admin-login', '/api/owner/admin-login']) {
      const response = await fetch(`${baseUrl}${route}`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ code: candidate.value })
      }).catch(() => null);
      if (!response) continue;
      const body = await response.json().catch(() => ({}));
      const token = unquote(body.gateBearerToken || body.gateToken || body.token || body.session || '');
      if (response.ok && token) return { token, source_key: candidate.key, mode: route };
    }
  }
  return null;
}

function redirectOk(result) {
  return [301, 302, 303, 307, 308, 401, 403].includes(result.status)
    && /\/admin\/login\.html|unauthorized|gate|auth/i.test(result.location + result.text);
}

function resolveLocation(location) {
  if (!location) return '';
  try {
    return new URL(location, baseUrl).pathname;
  } catch {
    return location;
  }
}

async function fetchUnauthGate(pathname) {
  const chain = [];
  let current = pathname;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await fetchText(current, { redirect: 'manual' });
    chain.push({ path: current, status: result.status, location: result.location || '' });
    if (redirectOk(result)) return { ...result, redirect_chain: chain };
    const next = resolveLocation(result.location || '');
    if (![301, 302, 303, 307, 308].includes(result.status) || !next || chain.some((item) => item.path === next)) {
      return { ...result, redirect_chain: chain };
    }
    current = next;
  }
  const last = chain.at(-1) || { path: pathname, status: 0, location: '' };
  return { path: last.path, status: last.status, ok: false, location: last.location, text: 'redirect chain exceeded', bytes: 0, elapsed_ms: 0, redirect_chain: chain };
}

function liveRow(check, result) {
  const bodyText = result.body ? JSON.stringify(result.body) : result.text;
  const healthWatch = result.body?.health_watch || null;
  return {
    path: check.path,
    status: result.status,
    ok: result.ok && bodyText.includes(check.marker),
    marker: check.marker,
    marker_found: bodyText.includes(check.marker),
    generated_at: result.body?.generated_at || result.body?.generatedAt || '',
    summary: result.body?.summary || null,
    health_watch: healthWatch,
    health_watch_summary: healthWatch?.summary || null,
    external_boundary_count: Number(healthWatch?.summary?.external_boundary_workflows || healthWatch?.external_boundaries?.length || 0),
    recent_receipt_count: Number(healthWatch?.summary?.total_receipts || healthWatch?.recent_receipts?.length || 0),
    bytes: result.bytes,
    elapsed_ms: result.elapsed_ms
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function writeAll(receipt) {
  await fsp.mkdir(path.dirname(receiptPath), { recursive: true });
  await fsp.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fsp.mkdir(artifactRoot, { recursive: true });
  await fsp.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fsp.mkdir(path.dirname(publicPath), { recursive: true });
  await fsp.writeFile(publicPath, `${JSON.stringify(receipt, null, 2)}\n`);
}

async function main() {
  const localTruth = readJson(localTruthPath, {});
  const deploy = readJson(deployReceiptPath, {});
  const deployAccepted = deploy.ok === true && deploy.stage_only !== true && Boolean(deploy.currentVersionId || deploy.versionId);
  const owner = await resolveGateToken();
  const receipt = {
    ok: false,
    schema: 'metraiyux.0s.production-closure-live-http.v1',
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    credential_source: owner?.source_key || 'missing',
    worker_deploy: {
      path: path.relative(repoRoot, deployReceiptPath).split(path.sep).join('/'),
      ok: deployAccepted,
      version: deploy.currentVersionId || deploy.versionId || '',
      generated_at: deploy.generatedAt || deploy.generated_at || '',
      stage_only: deploy.stage_only === true
    },
    local_truth: {
      path: path.relative(repoRoot, localTruthPath).split(path.sep).join('/'),
      ok: localTruth.ok === true,
      generated_at: localTruth.generated_at || '',
      summary: localTruth.summary || {}
    },
    unauthenticated_gate_checks: [],
    authenticated_live_checks: [],
    warnings: [],
    failures: []
  };

  for (const check of gatedChecks) {
    const result = await fetchUnauthGate(check.path).catch((error) => ({ path: check.path, status: 0, ok: false, location: '', text: error.message, bytes: 0, elapsed_ms: 0, redirect_chain: [] }));
    receipt.unauthenticated_gate_checks.push({
      path: check.path,
      status: result.status,
      ok: redirectOk(result),
      location: result.location || '',
      redirect_chain: result.redirect_chain || []
    });
  }

  if (!owner?.token) {
    receipt.failures.push('No shared owner/gate credential was available for authenticated live checks.');
  } else {
    for (const check of gatedChecks) {
      const result = await fetchText(check.path, { headers: gateHeaders(owner.token) }).catch((error) => ({ path: check.path, status: 0, ok: false, text: error.message, body: null, bytes: 0, elapsed_ms: 0 }));
      receipt.authenticated_live_checks.push(liveRow(check, result));
    }
  }

  const liveTruth = receipt.authenticated_live_checks.find((item) => item.path === '/proof/0s-truth-ledger.json');
  const liveWatch = receipt.authenticated_live_checks.find((item) => item.path === '/skyerrors/live-capability-watch.json');
  const watchHealth = liveWatch?.health_watch || null;
  const gatesOk = receipt.unauthenticated_gate_checks.every((item) => item.ok);
  const liveOk = receipt.authenticated_live_checks.length === gatedChecks.length && receipt.authenticated_live_checks.every((item) => item.ok);
  const ledgerMatchesLocal = Boolean(liveTruth?.generated_at && localTruth?.generated_at && liveTruth.generated_at === localTruth.generated_at);
  const ledgerSummaryMatchesLocal = Boolean(liveTruth?.summary && stableJson(liveTruth.summary) === stableJson(localTruth.summary || {}));
  receipt.closure_state = localTruth.ok === true ? 'green' : 'guarded_partial';
  receipt.production_ready_for_owner_manual_browser_check = gatesOk && liveOk && deployAccepted && localTruth.ok === true;
  receipt.truth_ledger_matches_local = ledgerMatchesLocal;
  receipt.truth_ledger_summary_matches_local = ledgerSummaryMatchesLocal;
  receipt.skyerrors_watch_live_generated_at = liveWatch?.generated_at || '';
  receipt.skyerrors_watch_health = {
    present: Boolean(watchHealth),
    schema: watchHealth?.schema || '',
    generated_at: watchHealth?.generated_at || '',
    summary: watchHealth?.summary || null,
    recent_receipt_count: liveWatch?.recent_receipt_count || 0,
    external_boundary_count: liveWatch?.external_boundary_count || 0,
    failed_receipts: Array.isArray(watchHealth?.failed_receipts) ? watchHealth.failed_receipts : [],
    missing_receipts: Array.isArray(watchHealth?.missing_receipts) ? watchHealth.missing_receipts : [],
    boundary_rule: watchHealth?.boundary_rule || ''
  };
  receipt.remaining_p0_not_built = localTruth.summary?.p0_not_built || [];
  receipt.remaining_p1_not_built = localTruth.summary?.p1_not_built || [];
  if (!ledgerMatchesLocal) {
    receipt.warnings.push('Live truth ledger generated_at differs from the latest local truth ledger; summary parity is the production readiness signal.');
  }
  if (liveWatch && !watchHealth) {
    receipt.warnings.push('Live SkyErrors capability watch does not include the health_watch receipt/boundary rollup; regenerate the watch and redeploy proof assets.');
  }
  if (watchHealth && Number(watchHealth.summary?.external_boundary_workflows || 0) !== Number(localTruth.summary?.external_boundaries || 0)) {
    receipt.warnings.push('Live SkyErrors health_watch external boundary count differs from the local truth ledger; regenerate/deploy the latest watch after truth-ledger changes.');
  }
  receipt.failures.push(
    ...receipt.unauthenticated_gate_checks.filter((item) => !item.ok).map((item) => `Unauth gate check failed for ${item.path}`),
    ...receipt.authenticated_live_checks.filter((item) => !item.ok).map((item) => `Authenticated live check failed for ${item.path}`),
    ...(ledgerSummaryMatchesLocal ? [] : ['Live truth ledger summary does not match local truth ledger summary; redeploy latest proof assets or regenerate the ledger.']),
    ...(deployAccepted ? [] : ['Latest Worker deploy receipt is missing, stage-only, lacks a version id, or is not ok.']),
    ...(localTruth.ok === true ? [] : ['Local truth ledger is not ok; production closure cannot be green while tracked P0/P1 truth items remain partial or failing.'])
  );
  receipt.ok = receipt.production_ready_for_owner_manual_browser_check && receipt.failures.length === 0;
  await writeAll(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    closure_state: receipt.closure_state,
    production_ready_for_owner_manual_browser_check: receipt.production_ready_for_owner_manual_browser_check,
    truth_ledger_matches_local: receipt.truth_ledger_matches_local,
    truth_ledger_summary_matches_local: receipt.truth_ledger_summary_matches_local,
    receipt: path.relative(repoRoot, receiptPath).split(path.sep).join('/'),
    latest: path.relative(repoRoot, latestPath).split(path.sep).join('/'),
    public_json: path.relative(repoRoot, publicPath).split(path.sep).join('/'),
    remaining_p0_not_built: receipt.remaining_p0_not_built,
    warnings: receipt.warnings,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
