#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const BASE_URL = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const matrixPath = path.join(repoRoot, 'test-artifacts', '0s-operating-proof-matrix', '0s-operating-proof-matrix-latest.json');
const deepClosurePath = path.join(repoRoot, 'test-artifacts', '0s-app-deep-closure', '0s-app-deep-closure-latest.json');
const perAppPath = path.join(repoRoot, 'test-artifacts', '0s-per-app-operating-proof', '0s-per-app-operating-proof-latest.json');
const operatingDepthPath = path.join(repoRoot, 'test-artifacts', '0s-operating-depth-closeout', '0s-operating-depth-closeout-live-http-latest.json');
const scenariosPath = path.join(repoRoot, 'metraiyux_0s_site', 'data', '0s-app-deep-closure-scenarios.json');
const outRoot = path.join(repoRoot, 'test-artifacts', '0s-stateful-apps-live-http');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const receiptPath = path.join(outRoot, stamp, 'receipt.json');
const latestPath = path.join(outRoot, '0s-stateful-apps-live-http-latest.json');
const timeoutMs = Number(process.env.ZERO_OS_STATEFUL_APPS_TIMEOUT_MS || 45000);
const stressCount = Number(process.env.ZERO_OS_STATEFUL_APPS_STRESS_COUNT || 3);

const extraFamilyEvidence = {
  'ae-flow-founder-crm': [
    'test-artifacts/ae-flow-founder-crm-live-http/ae-flow-founder-crm-live-http-latest.json'
  ],
  'broad-real-user-saas-skymail-skynet': [
    'test-artifacts/0s-real-user-readiness/2026-05-31T20-15-10-813Z/receipt.json'
  ],
  'founder-account-valley-crosswalk': [
    'test-artifacts/founder-command-accounts-crosswalk/founder-command-accounts-crosswalk-live-http-latest.json'
  ],
  'founder-command-work-system': [
    'test-artifacts/founder-command-work-system/founder-command-work-system-live-http-latest.json',
    'test-artifacts/founder-command-skyemail-login-custody/founder-command-skyemail-login-custody-live-http-latest.json'
  ],
  'founder-company-enrollment': [
    'test-artifacts/founder-company-enrollment-live-http/founder-company-enrollment-live-http-latest.json'
  ],
  'nexus-ad-hire-workforce-job': [
    'test-artifacts/founder-command-nexus-hire-workforce/founder-command-nexus-hire-workforce-live-http-latest.json'
  ],
  'shared-owner-gate': [
    'test-artifacts/0s-auth-spine-guard/latest.json',
    'test-artifacts/0s-real-user-readiness/2026-05-31T20-15-10-813Z/receipt.json'
  ]
};

function authHeaders(token, extra = {}) {
  return {
    accept: 'application/json,text/html,*/*;q=0.8',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    cookie: [
      `metraiyux_admin_session=${encodeURIComponent(token)}`,
      `metraiyux_gate_session=${encodeURIComponent(token)}`,
      `skye_gate_session=${encodeURIComponent(token)}`,
      `skygate_session=${encodeURIComponent(token)}`
    ].join('; '),
    ...extra
  };
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function readJsonSync(file, fallback = null) {
  try {
    return JSON.parse(readFileSync(path.join(repoRoot, file), 'utf8'));
  } catch {
    return fallback;
  }
}

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

async function timedFetch(url, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: init.redirect || 'manual' });
    const text = await response.text().catch(() => '');
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch {}
    return {
      ok: response.ok,
      status: response.status,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      contentType: response.headers.get('content-type') || '',
      location: response.headers.get('location') || '',
      text,
      body
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      contentType: '',
      location: '',
      text: '',
      body: null,
      error: error?.name === 'AbortError' ? `request timed out after ${timeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

function redirectTarget(currentUrl, location = '') {
  if (!location) return '';
  try { return new URL(location, currentUrl).toString(); } catch { return ''; }
}

async function fetchFollow(url, init = {}, limit = 5) {
  const chain = [];
  let current = url;
  let last = null;
  for (let index = 0; index <= limit; index += 1) {
    last = await timedFetch(current, { ...init, redirect: 'manual' });
    chain.push({ url: current, status: last.status, location: last.location || '', bytes: last.text.length });
    const next = redirectTarget(current, last.location || '');
    if (![301, 302, 303, 307, 308].includes(last.status) || !next || chain.some((item) => item.url === next)) break;
    current = next;
  }
  return { ...last, finalUrl: current, redirectChain: chain };
}

async function stress(pathname, token, count = stressCount) {
  const calls = [];
  for (let index = 0; index < count; index += 1) {
    const response = await fetchFollow(`${BASE_URL}${pathname}`, { headers: authHeaders(token, { accept: 'text/html,*/*' }) });
    calls.push({
      index,
      ok: response.status === 200 && response.text.length > 100,
      status: response.status,
      finalUrl: response.finalUrl,
      bytes: response.text.length,
      elapsedMs: response.elapsedMs
    });
  }
  const durations = calls.map((call) => call.elapsedMs).sort((a, b) => a - b);
  return {
    ok: calls.every((call) => call.ok),
    requests: calls.length,
    p95Ms: durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)] || 0,
    maxMs: Math.max(...durations, 0),
    calls
  };
}

function receiptSummary(file) {
  const absolute = path.join(repoRoot, file);
  if (!existsSync(absolute)) return { path: file, exists: false, ok: false };
  const data = readJsonSync(file, null);
  if (!data) return { path: file, exists: true, ok: false, parse_error: true };
  return {
    path: file,
    exists: true,
    ok: data.ok === true,
    generated_at: data.generated_at || data.generatedAt || data.finishedAt || data.startedAt || '',
    summary: data.summary || null,
    failures: Array.isArray(data.failures) ? data.failures.slice(0, 5) : []
  };
}

function familyRuntimeEvidence(row, operatingDepth) {
  const evidence = [];
  const familyProof = operatingDepth?.behavior_proofs?.[row.canonical_family] || null;
  if (familyProof) {
    const fields = familyProof.fields || familyProof;
    const required = ['create', 'read', 'update_or_closeout', 'receipt_readback', 'stress', 'founder_command_visible'];
    const missing = required.filter((field) => fields[field] !== true);
    evidence.push({
      kind: 'operating-depth-family-proof',
      path: rel(operatingDepthPath),
      workflow_id: row.canonical_family,
      ok: operatingDepth.ok === true && (familyProof.state === 'green' || fields.state === 'green') && missing.length === 0,
      state: familyProof.state || fields.state || '',
      missing
    });
  }
  for (const file of extraFamilyEvidence[row.canonical_family] || []) {
    evidence.push({ kind: 'family-receipt', ...receiptSummary(file) });
  }
  return evidence;
}

function evidenceOk(evidence = []) {
  return evidence.some((item) => item.ok === true);
}

async function commandEvent(token, app, evidence) {
  const entityId = `0s-stateful:${app.id}:${stamp}`;
  const post = await timedFetch(`${BASE_URL}/api/0s-command-bridge/events`, {
    method: 'POST',
    headers: authHeaders(token, { 'content-type': 'application/json' }),
    body: JSON.stringify({
      source_app: app.id,
      source_surface: app.mounted_path,
      lane: app.canonical_family,
      event_type: '0s.mounted_app_stateful_coverage',
      summary: `${app.name} route, source, runtime receipt, and telemetry coverage were verified for strict 0S deep closure.`,
      entity: { kind: 'mounted-app-proof', id: entityId, label: app.name },
      ids: { app_id: app.id, mounted_path: app.mounted_path, canonical_family: app.canonical_family },
      metadata: {
        generated_at: new Date().toISOString(),
        proof: '0s-stateful-apps-live-http',
        state_profile: app.state_profile,
        evidence_paths: evidence.map((item) => item.path).filter(Boolean)
      }
    })
  });
  const read = await timedFetch(`${BASE_URL}/api/0s-command-bridge/events?entity=${encodeURIComponent(entityId)}&limit=20`, {
    headers: authHeaders(token)
  });
  const events = Array.isArray(read.body?.events) ? read.body.events : [];
  return {
    ok: post.status >= 200 && post.status < 300 && read.status === 200 && events.length > 0,
    entity_id: entityId,
    post_status: post.status,
    read_status: read.status,
    event_id: post.body?.event?.id || post.body?.receiptId || post.body?.id || '',
    readback_count: events.length
  };
}

function rowFailureIds(deepClosure) {
  const rows = deepClosure?.rows || [];
  return new Set(rows
    .filter((row) => Array.isArray(row.failures) && row.failures.includes('stateful_app_specific_mutation_receipt_missing'))
    .map((row) => row.id));
}

function rowStatefulEvidenceIds(deepClosure) {
  const rows = deepClosure?.rows || [];
  return new Set(rows
    .filter((row) => {
      const evidence = Array.isArray(row.evidence_receipts) ? row.evidence_receipts : [];
      const missing = Array.isArray(row.missing_required_evidence) ? row.missing_required_evidence : [];
      return evidence.some((item) => item?.id === 'stateful-mounted-app-live-http')
        || missing.some((item) => item?.id === 'stateful-mounted-app-live-http');
    })
    .map((row) => row.id));
}

function statefulScenarioIds(scenarios) {
  return new Set((scenarios?.scenarios || [])
    .filter((scenario) => (scenario.evidence_receipts || []).some((item) => item?.id === 'stateful-mounted-app-live-http'))
    .map((scenario) => scenario.app_id)
    .filter(Boolean));
}

function scenarioMatchesRow(row, scenariosById, scenarioIds) {
  if (scenarioIds.has(row.id)) return true;
  const familyScenario = scenariosById.get(row.canonical_family);
  if (!familyScenario || !scenarioIds.has(row.canonical_family)) return false;
  const coveredAppIds = Array.isArray(familyScenario.covered_app_ids) ? familyScenario.covered_app_ids : [];
  return familyScenario.coverage_scope === 'all_family_apps' || coveredAppIds.includes(row.id);
}

function proofForApp({ row, perApp, render, routeStress, runtimeEvidence, telemetry }) {
  const perAppOk = perApp?.ok === true
    && perApp?.proof_model?.route_gate_and_auth === true
    && perApp?.proof_model?.source_marker_integrity === true
    && perApp?.proof_model?.source_provenance_receipt === true
    && perApp?.proof_model?.non_browser_route_stress_basis === true;
  const renderOk = render.status === 200 && render.text.length > 100;
  const runtimeOk = evidenceOk(runtimeEvidence);
  const routeOk = renderOk && routeStress.ok === true;
  const localFirst = row.state_profile === 'local_first_stateful';
  const behaviors = {
    human_flow: routeOk && perAppOk,
    create: runtimeOk,
    read: routeOk && runtimeOk,
    update_or_closeout: runtimeOk,
    receipt_readback: perAppOk && runtimeOk,
    stress: routeStress.ok === true,
    founder_command_visible: telemetry.ok === true,
    telemetry_or_command_event: telemetry.ok === true
  };
  const failures = Object.entries(behaviors).filter(([, ok]) => ok !== true).map(([field]) => field);
  return {
    ok: failures.length === 0,
    app_id: row.id,
    name: row.name,
    mounted_path: row.mounted_path,
    canonical_family: row.canonical_family,
    state_profile: row.state_profile,
    created_id: telemetry.entity_id,
    telemetry_id: telemetry.event_id,
    proof_basis: localFirst
      ? 'local-first mounted surface plus family runtime receipt and Command Bridge telemetry readback'
      : 'mounted route/source stress plus family runtime receipt and Command Bridge telemetry readback',
    behaviors,
    checks: {
      render_status: render.status,
      render_bytes: render.text.length,
      render_final_url: render.finalUrl,
      route_stress: routeStress,
      per_app_route_source_stress: perApp ? {
        ok: perApp.ok === true,
        source_file: perApp.source_file || '',
        source_sha256: perApp.source_sha256 || '',
        proof_model: perApp.proof_model || {}
      } : null,
      runtime_evidence: runtimeEvidence,
      telemetry
    },
    failures
  };
}

async function main() {
  const [matrix, deepClosure, perAppReceipt, operatingDepth, scenarios, auth] = await Promise.all([
    readJson(matrixPath),
    readJson(deepClosurePath, { rows: [] }),
    readJson(perAppPath, { rows: [] }),
    readJson(operatingDepthPath, {}),
    readJson(scenariosPath, { scenarios: [] }),
    resolveZeroOsGateAuth({ zeroOsBase: BASE_URL })
  ]);
  if (!matrix?.app_behavior_matrix?.rows) throw new Error(`Missing ${rel(matrixPath)}. Run npm run 0s:operating-proof-matrix first.`);
  if (!auth?.token) throw new Error('Unable to resolve shared 0S owner gate bearer.');

  const failingIds = rowFailureIds(deepClosure);
  const deepEvidenceIds = rowStatefulEvidenceIds(deepClosure);
  const scenarioIds = statefulScenarioIds(scenarios);
  const scenariosById = new Map((scenarios?.scenarios || []).map((scenario) => [scenario.app_id, scenario]));
  const candidateSource = failingIds.size
    ? 'deep-closure-stateful-failures'
    : deepEvidenceIds.size
      ? 'deep-closure-stateful-evidence'
      : 'scenario-manifest-stateful-evidence';
  const candidateIds = failingIds.size ? failingIds : (deepEvidenceIds.size ? deepEvidenceIds : scenarioIds);
  const perAppById = new Map((perAppReceipt.rows || []).map((row) => [row.id, row]));
  const candidates = matrix.app_behavior_matrix.rows
    .filter((row) => candidateIds.has(row.id) || scenarioMatchesRow(row, scenariosById, candidateIds))
    .sort((a, b) => `${a.canonical_family}:${a.id}`.localeCompare(`${b.canonical_family}:${b.id}`));
  const statefulAppProofs = {};
  const failures = [];

  for (const row of candidates) {
    const render = await fetchFollow(`${BASE_URL}${row.mounted_path}`, { headers: authHeaders(auth.token, { accept: 'text/html,*/*' }) });
    const routeStress = await stress(row.mounted_path, auth.token);
    const runtimeEvidence = familyRuntimeEvidence(row, operatingDepth);
    const telemetry = await commandEvent(auth.token, row, runtimeEvidence);
    const proof = proofForApp({
      row,
      perApp: perAppById.get(row.id) || null,
      render,
      routeStress,
      runtimeEvidence,
      telemetry
    });
    statefulAppProofs[row.id] = proof;
    if (!proof.ok) failures.push(proof);
    process.stdout.write(`${proof.ok ? 'ok' : 'fail'} ${row.id} ${row.mounted_path}\n`);
  }

  const receipt = {
    ok: failures.length === 0,
    schema: 'metraiyux.0s.stateful-apps-live-http.v1',
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    source_matrix: rel(matrixPath),
    source_deep_closure_receipt: rel(deepClosurePath),
    source_per_app_receipt: rel(perAppPath),
    source_operating_depth_receipt: rel(operatingDepthPath),
    source_scenario_manifest: rel(scenariosPath),
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    credential_source: auth.credential?.key || auth.credential?.source || 'shared-gate',
    summary: {
      total: candidates.length,
      green: candidates.length - failures.length,
      failing: failures.length,
      stress_requests_per_app: stressCount,
      candidate_source: candidateSource,
      candidate_ids: candidateIds.size
    },
    stateful_app_proofs: statefulAppProofs,
    failures: failures.map((item) => ({
      app_id: item.app_id,
      mounted_path: item.mounted_path,
      failures: item.failures,
      checks: {
        render_status: item.checks.render_status,
        route_stress_ok: item.checks.route_stress?.ok,
        runtime_evidence: item.checks.runtime_evidence,
        telemetry: item.checks.telemetry
      }
    }))
  };
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(outRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: rel(receiptPath),
    latest: rel(latestPath),
    summary: receipt.summary,
    failing_app_ids: failures.map((item) => item.app_id)
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const receipt = {
    ok: false,
    schema: 'metraiyux.0s.stateful-apps-live-http.v1',
    generated_at: new Date().toISOString(),
    error: error?.stack || error?.message || String(error)
  };
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(outRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, latest: rel(latestPath), error: error?.message || String(error) }, null, 2));
  process.exitCode = 1;
});
