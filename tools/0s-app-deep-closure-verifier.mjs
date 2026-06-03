#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const matrixPath = path.join(repoRoot, 'test-artifacts', '0s-operating-proof-matrix', '0s-operating-proof-matrix-latest.json');
const scenariosPath = path.join(repoRoot, 'metraiyux_0s_site', 'data', '0s-app-deep-closure-scenarios.json');
const controlProofPath = path.join(repoRoot, 'test-artifacts', '0s-mounted-app-control-proof', '0s-mounted-app-control-proof-latest.json');
const artifactRoot = path.join(repoRoot, 'test-artifacts', '0s-app-deep-closure');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const receiptPath = path.join(artifactRoot, stamp, 'receipt.json');
const latestPath = path.join(artifactRoot, '0s-app-deep-closure-latest.json');

const behaviorFields = [
  'human_flow',
  'create',
  'read',
  'update_or_closeout',
  'receipt_readback',
  'stress',
  'founder_command_visible',
  'telemetry_or_command_event'
];

const readOnlyBehaviorFields = [
  'human_flow',
  'read',
  'receipt_readback',
  'stress',
  'mutation_denial_or_not_applicable'
];

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function isReadOnlyProfile(profile = '') {
  return profile === 'read_only_static' || profile === 'proof_asset';
}

function hasOpenGaps(data = {}) {
  const gapArrays = [
    data.open_gaps,
    data.blocking_gaps,
    data.implementation_gaps
  ].filter(Array.isArray);
  return gapArrays.some((items) => items.length > 0);
}

function perAppRowStatus(data = {}, app = {}) {
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const row = rows.find((item) => item?.id === app.id);
  const model = row?.proof_model || {};
  const required = [
    ['row_ok', row?.ok === true],
    ['route_gate_and_auth', model.route_gate_and_auth === true],
    ['source_marker_integrity', model.source_marker_integrity === true],
    ['source_provenance_receipt', model.source_provenance_receipt === true],
    ['non_browser_route_stress_basis', model.non_browser_route_stress_basis === true]
  ];
  if (isReadOnlyProfile(app.state_profile)) {
    required.push(['mutation_denial_or_not_applicable', model.mutation_denial_or_not_applicable === true]);
  }
  const missing = required.filter(([, ok]) => !ok).map(([id]) => id);
  return {
    ok: missing.length === 0,
    app_id: app.id,
    source_file: row?.source_file || '',
    source_sha256: row?.source_sha256 || '',
    proof_model: model,
    missing
  };
}

function behaviorProofStatus(data = {}, item = {}, app = {}) {
  const workflowId = item.workflow_id || app.canonical_family || '';
  const proof = data.behavior_proofs?.[workflowId];
  const fields = proof?.fields || proof || {};
  const fieldEvidence = fields.field_evidence || proof?.evidence || {};
  const required = Array.isArray(item.required_behavior_fields) && item.required_behavior_fields.length
    ? item.required_behavior_fields
    : ['create', 'read', 'update_or_closeout', 'receipt_readback', 'stress', 'founder_command_visible'];
  const missing = required.filter((field) => fields[field] !== true);
  const telemetryOk = fieldEvidence.update_or_closeout?.command_bridge_closeout_ok === true
    || Boolean(fieldEvidence.founder_command_visible?.command_bridge_entity_id)
    || Boolean(proof?.evidence?.founder_command_visible?.command_bridge_entity_id);
  if (item.require_telemetry_or_command_event !== false && !telemetryOk) {
    missing.push('telemetry_or_command_event');
  }
  return {
    ok: Boolean(proof) && (proof.state === 'green' || fields.state === 'green') && missing.length === 0,
    workflow_id: workflowId,
    state: proof?.state || fields.state || '',
    missing,
    field_evidence: fieldEvidence
  };
}

function evidenceStatus(item = {}, app = {}) {
  if (Array.isArray(item.applies_to_profiles) && !item.applies_to_profiles.includes(app.state_profile)) {
    return {
      id: item.id || 'evidence',
      path: item.path || '',
      mode: item.mode || 'ok_true',
      required: item.required !== false,
      exists: true,
      ok: true,
      receipt_ok: true,
      open_gaps_present: false,
      generated_at: '',
      parse_error: '',
      keys: [],
      detail: { not_applicable_to_profile: app.state_profile }
    };
  }
  const absolute = path.resolve(repoRoot, item.path || '');
  const exists = Boolean(item.path && existsSync(absolute));
  let data = null;
  let parseError = '';
  if (exists) {
    try {
      data = JSON.parse(readFileSync(absolute, 'utf8'));
    } catch (error) {
      parseError = error.message;
    }
  }
  let detail = {};
  let ok = false;
  if (item.mode === 'exists_only') {
    ok = exists && !parseError;
  } else if (item.mode === 'per_app_row_ok') {
    detail = data ? perAppRowStatus(data, app) : {};
    ok = exists && !parseError && data?.ok === true && detail.ok === true;
  } else if (item.mode === 'behavior_proof') {
    detail = data ? behaviorProofStatus(data, item, app) : {};
    ok = exists && !parseError && data?.ok === true && detail.ok === true;
  } else if (item.mode === 'read_only_app_proof') {
    const proof = data?.read_only_app_proofs?.[app.id] || data?.proofs?.[app.id] || null;
    const required = ['human_flow', 'read', 'receipt_readback', 'stress', 'mutation_denial_or_not_applicable'];
    const missing = required.filter((field) => proof?.behaviors?.[field] !== true);
    detail = proof ? {
      app_id: app.id,
      mounted_path: proof.mounted_path || '',
      source_sha256: proof.source_sha256 || '',
      behaviors: proof.behaviors || {},
      missing
    } : {
      app_id: app.id,
      missing: ['read_only_app_proof_missing']
    };
    ok = exists && !parseError && data?.ok === true && proof?.ok === true && missing.length === 0;
  } else if (item.mode === 'stateful_app_proof') {
    const proof = data?.stateful_app_proofs?.[app.id] || data?.proofs?.[app.id] || null;
    const required = Array.isArray(item.required_behavior_fields) && item.required_behavior_fields.length
      ? item.required_behavior_fields
      : ['human_flow', 'create', 'read', 'update_or_closeout', 'receipt_readback', 'stress', 'founder_command_visible', 'telemetry_or_command_event'];
    const missing = required.filter((field) => proof?.behaviors?.[field] !== true);
    detail = proof ? {
      app_id: app.id,
      mounted_path: proof.mounted_path || '',
      behaviors: proof.behaviors || {},
      created_id: proof.created_id || '',
      telemetry_id: proof.telemetry_id || '',
      missing
    } : {
      app_id: app.id,
      missing: ['stateful_app_proof_missing']
    };
    ok = exists && !parseError && data?.ok === true && proof?.ok === true && missing.length === 0;
  } else {
    const openGapOk = item.allow_open_gaps === true || !hasOpenGaps(data || {});
    ok = exists && !parseError && data?.ok === true && openGapOk;
    if (!openGapOk) {
      detail.open_gaps_blocked = true;
    }
  }
  return {
    id: item.id || path.basename(item.path || '').replace(/\.json$/i, '') || 'evidence',
    path: item.path || '',
    mode: item.mode || 'ok_true',
    required: item.required !== false,
    exists,
    ok,
    receipt_ok: data?.ok === true,
    open_gaps_present: hasOpenGaps(data || {}),
    generated_at: data?.generated_at || data?.generatedAt || '',
    parse_error: parseError,
    keys: data ? Object.keys(data).slice(0, 10) : [],
    detail
  };
}

function requiredBehaviorsFor(app = {}, scenario = null) {
  if (scenario?.required_behaviors?.length) return scenario.required_behaviors;
  const effectiveProfile = scenario?.profile === 'mixed_family' ? app.state_profile : (scenario?.profile || app.state_profile);
  return isReadOnlyProfile(effectiveProfile) ? readOnlyBehaviorFields : behaviorFields;
}

function scenarioFor(app, scenariosByApp) {
  return scenariosByApp.get(app.id) || scenariosByApp.get(app.canonical_family) || null;
}

function proofBehaviors(proof = {}) {
  const behaviors = proof?.proof?.behaviors || proof?.behaviors || {};
  return new Set(Object.entries(behaviors).filter(([, ok]) => ok === true).map(([key]) => key));
}

function exactControlProofOk(app = {}, controlRow = null) {
  if (!controlRow?.ok) return false;
  const behaviors = proofBehaviors(controlRow);
  const required = isReadOnlyProfile(app.state_profile) ? readOnlyBehaviorFields : behaviorFields;
  return required.every((field) => behaviors.has(field));
}

function controlHumanPaths(controlRow = null) {
  if (!controlRow) return [];
  const summary = controlRow.controls?.summary || controlRow.proof?.control_inventory || {};
  return [
    `mounted route ${controlRow.mounted_path || ''}`.trim(),
    `source ${controlRow.source?.path || ''}`.trim(),
    `${summary.buttons || 0} buttons inventoried, ${summary.wired_buttons || 0} wired`,
    `${summary.links || 0} links inventoried, ${summary.wired_links || 0} wired`,
    `${summary.forms || 0} forms inventoried, ${summary.wired_forms || 0} wired`,
    `${summary.fetch_targets || 0} fetch/API targets inventoried`
  ].filter(Boolean);
}

function appRow(app = {}, scenario = null, controlRow = null) {
  const routeOk = app.route_gate_ok === true && app.route_authenticated_ok === true && app.route_ok === true;
  const coveredAppIds = Array.isArray(scenario?.covered_app_ids) ? scenario.covered_app_ids : [];
  const coveredByFamilyScenario = Boolean(scenario && scenario.app_id === app.canonical_family);
  const exactControlOk = exactControlProofOk(app, controlRow);
  const scenarioCoversApp = !scenario
    || scenario.app_id === app.id
    || coveredByFamilyScenario && (
      scenario.coverage_scope === 'all_family_apps'
      || coveredAppIds.includes(app.id)
    );
  const statefulAppNeedsExactScenario = scenario
    && coveredByFamilyScenario
    && !isReadOnlyProfile(app.state_profile)
    && !exactControlOk;
  const evidence = Array.isArray(scenario?.evidence_receipts) ? scenario.evidence_receipts.map((item) => evidenceStatus(item, app)) : [];
  const requiredEvidence = evidence.filter((item) => item.required);
  const missingEvidence = requiredEvidence.filter((item) => !item.ok);
  const declaredBehaviors = new Set([
    ...(Array.isArray(scenario?.behaviors) ? scenario.behaviors : []),
    ...proofBehaviors(controlRow)
  ]);
  const requiredBehaviors = requiredBehaviorsFor(app, scenario);
  const missingBehaviors = requiredBehaviors.filter((item) => !declaredBehaviors.has(item));
  const humanPaths = [
    ...(Array.isArray(scenario?.human_paths) ? scenario.human_paths : []),
    ...(exactControlOk ? controlHumanPaths(controlRow) : [])
  ];
  const humanPathCount = humanPaths.length;
  const failures = [
    ...(routeOk ? [] : ['route_gate_or_authenticated_render_not_proven']),
    ...(scenario || exactControlOk ? [] : ['app_specific_human_scenario_missing']),
    ...(scenarioCoversApp ? [] : ['scenario_does_not_cover_this_app']),
    ...(statefulAppNeedsExactScenario ? ['stateful_app_specific_mutation_receipt_missing'] : []),
    ...((scenario || exactControlOk) && humanPathCount > 0 ? [] : ['human_paths_missing']),
    ...missingBehaviors.map((item) => `behavior_missing:${item}`),
    ...missingEvidence.map((item) => `required_evidence_not_ok:${item.id}`)
  ];
  return {
    id: app.id,
    name: app.name,
    mounted_path: app.mounted_path,
    state_profile: app.state_profile,
    scenario_profile: scenario?.profile || '',
    canonical_family: app.canonical_family,
    route_gate_ok: app.route_gate_ok === true,
    route_authenticated_ok: app.route_authenticated_ok === true,
    route_ok: routeOk,
    scenario_id: scenario?.app_id || '',
    scenario_label: scenario?.label || '',
    coverage_scope: scenario?.coverage_scope || '',
    covered_by_family: Boolean(scenario && scenario.app_id === app.canonical_family),
    human_paths: humanPaths,
    required_behaviors: requiredBehaviors,
    declared_behaviors: [...declaredBehaviors],
    missing_behaviors: missingBehaviors,
    evidence_receipts: evidence,
    control_proof_receipt: controlRow ? {
      path: rel(controlProofPath),
      ok: controlRow.ok === true,
      exact_control_proof_ok: exactControlOk,
      source: controlRow.source?.path || '',
      source_sha256: controlRow.source?.sha256 || controlRow.proof?.source_sha256 || '',
      control_inventory: controlRow.controls?.summary || controlRow.proof?.control_inventory || {},
      failures: controlRow.failures || []
    } : null,
    missing_required_evidence: missingEvidence.map((item) => ({ id: item.id, path: item.path, mode: item.mode })),
    ok: failures.length === 0,
    failures,
    next_build_step: failures.length === 0
      ? 'Keep this app-specific human scenario fresh when the app changes.'
      : 'Add or repair a scenario that proves this mounted app through its own visible/user flow, mutation/readback, receipt, stress, Founder Command visibility, and telemetry/command event evidence.'
  };
}

async function main() {
  const matrix = await readJson(matrixPath);
  if (!matrix?.app_behavior_matrix?.rows) {
    throw new Error(`Run npm run 0s:operating-proof-matrix first; missing ${rel(matrixPath)}`);
  }
  const scenarios = await readJson(scenariosPath, { scenarios: [] });
  const controlProof = await readJson(controlProofPath, { rows: [] });
  const scenariosByApp = new Map((scenarios.scenarios || []).map((item) => [item.app_id, item]));
  const controlRowsByApp = new Map((controlProof.rows || []).map((item) => [item.id, item]));
  const rows = matrix.app_behavior_matrix.rows.map((app) => appRow(app, scenarioFor(app, scenariosByApp), controlRowsByApp.get(app.id) || null));
  const failures = rows.filter((row) => !row.ok);
  const receipt = {
    ok: failures.length === 0,
    schema: 'metraiyux.0s.app-deep-closure.receipt.v1',
    generated_at: new Date().toISOString(),
    source_matrix: rel(matrixPath),
    scenario_manifest: rel(scenariosPath),
    mounted_app_control_proof: rel(controlProofPath),
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    standard: scenarios.standard || '',
    summary: {
      total_apps: rows.length,
      green: rows.length - failures.length,
      failing: failures.length,
      scenario_count: scenariosByApp.size,
      route_or_auth_failures: rows.filter((row) => !row.route_ok).length,
      missing_scenarios: rows.filter((row) => row.failures.includes('app_specific_human_scenario_missing')).length,
      missing_required_evidence: rows.filter((row) => row.missing_required_evidence.length > 0).length,
      state: failures.length ? 'not_deep_closed' : 'deep_closed'
    },
    rows,
    failures: failures.map((row) => ({
      id: row.id,
      name: row.name,
      mounted_path: row.mounted_path,
      state_profile: row.state_profile,
      canonical_family: row.canonical_family,
      failures: row.failures,
      missing_behaviors: row.missing_behaviors,
      missing_required_evidence: row.missing_required_evidence,
      next_build_step: row.next_build_step
    })).slice(0, 500),
    honesty_note: 'This receipt intentionally fails the whole 0S if any mounted app lacks an app-specific human scenario. Route 200s, source markers, and family receipts are not enough for deep closure.'
  };
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: rel(receiptPath),
    latest: rel(latestPath),
    summary: receipt.summary,
    first_failures: receipt.failures.slice(0, 12)
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const receipt = {
    ok: false,
    schema: 'metraiyux.0s.app-deep-closure.receipt.v1',
    generated_at: new Date().toISOString(),
    source_matrix: rel(matrixPath),
    scenario_manifest: rel(scenariosPath),
    error: error?.stack || error?.message || String(error)
  };
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, latest: rel(latestPath), error: error?.message || String(error) }, null, 2));
  process.exitCode = 1;
});
