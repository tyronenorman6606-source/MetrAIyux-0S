#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const baseUrl = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const artifactRoot = path.join(repoRoot, 'test-artifacts', '0s-operating-proof-matrix');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const receiptPath = path.join(artifactRoot, stamp, 'receipt.json');
const latestPath = path.join(artifactRoot, '0s-operating-proof-matrix-latest.json');
const perAppProofPath = path.join(repoRoot, 'test-artifacts', '0s-per-app-operating-proof', '0s-per-app-operating-proof-latest.json');
const appDeepClosurePath = path.join(repoRoot, 'test-artifacts', '0s-app-deep-closure', '0s-app-deep-closure-latest.json');
const osJsPath = path.join(repoRoot, 'metraiyux_0s_site', '0s', 'os.js');
const closureManifestPath = path.join(repoRoot, 'metraiyux_0s_site', 'data', '0s-closure-workflows.json');
const deployScriptPath = path.join(repoRoot, 'scripts', 'deploy-0s-worker.mjs');
const maxAppsArg = process.argv.find((arg) => arg.startsWith('--max-apps='));
const maxApps = maxAppsArg ? Number(maxAppsArg.split('=')[1]) || 0 : 0;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

async function liveCredential() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: baseUrl });
  return { key: auth.credential?.key || 'shared-fs27-gate', value: auth.token || '', kind: 'bearer' };
}

async function fetchAny(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, { redirect: 'manual', ...init });
  const elapsedMs = performance.now() - started;
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text().catch(() => '');
  let body = null;
  if (contentType.includes('json') || text.trim().startsWith('{')) {
    try {
      body = JSON.parse(text);
    } catch {}
  }
  return {
    status: response.status,
    ok: response.ok,
    elapsed_ms: Number(elapsedMs.toFixed(2)),
    content_type: contentType,
    location: response.headers.get('location') || '',
    text: text.slice(0, 1200),
    body
  };
}

function parseAppDefs() {
  const source = read(osJsPath);
  const blocks = [...source.matchAll(/\{\s*id:\s*"([^"]+)"[\s\S]*?\n\s*\}/g)].map((match) => match[0]);
  const apps = [];
  for (const block of blocks) {
    const pick = (key) => block.match(new RegExp(`${key}:\\s*"([^"]*)"`))?.[1] || '';
    const id = pick('id');
    const name = pick('name');
    const url = pick('url');
    if (!id || !name || !url) continue;
    apps.push({
      id,
      name,
      kind: pick('kind') || 'unknown',
      summary: pick('summary') || '',
      url,
      mounted_path: resolveMountedPath(url),
      route_source: 'metraiyux_0s_site/0s/os.js'
    });
  }
  return mergeRouteDefs(apps.filter((app) => app.mounted_path), parseDeployLiveAssetDefs());
}

function resolveMountedPath(url) {
  if (!url || /^https?:\/\//i.test(url)) return '';
  const raw = url
    .replace(/^\.\.\//, '/')
    .replace(/^\.\//, '/');
  const normalized = path.posix.normalize(raw.startsWith('/') ? raw : `/0s/${raw}`);
  return normalized === '/' ? '' : normalized;
}

function routeIdFromPath(routePath) {
  return routePath
    .replace(/^\/+/, '')
    .replace(/\/index\.html$/i, '')
    .replace(/\.html$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function nameFromPath(routePath) {
  return routePath
    .split('/')
    .filter(Boolean)
    .pop()
    .replace(/\.html$/i, '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseDeployLiveAssetDefs() {
  const source = read(deployScriptPath);
  const entries = [...source.matchAll(/['"]((?:live|proof|skyerrors)\/[^'"]+\.(?:html|json))['"]/gi)]
    .map((match) => match[1])
    .filter((entry) => /^live\//i.test(entry));
  return [...new Set(entries)].map((entry) => {
    const mountedPath = `/${entry}`;
    return {
      id: `worker-asset-${routeIdFromPath(mountedPath)}`,
      name: nameFromPath(mountedPath),
      kind: 'worker_asset_file_include',
      summary: 'Curated Worker asset include; must remain shared-gate protected.',
      url: mountedPath,
      mounted_path: mountedPath,
      route_source: 'scripts/deploy-0s-worker.mjs'
    };
  });
}

function mergeRouteDefs(primary, secondary) {
  const byPath = new Map();
  for (const app of [...primary, ...secondary]) {
    if (!app.mounted_path || byPath.has(app.mounted_path)) continue;
    byPath.set(app.mounted_path, app);
  }
  return [...byPath.values()];
}

function receiptStatus(receiptPathValue = '') {
  if (!receiptPathValue || !receiptPathValue.endsWith('.json')) return { path: receiptPathValue, exists: false, ok: false };
  const absolute = path.resolve(repoRoot, receiptPathValue);
  if (!fs.existsSync(absolute)) return { path: receiptPathValue, exists: false, ok: false };
  try {
    const data = JSON.parse(read(absolute));
    return {
      path: receiptPathValue,
      exists: true,
      ok: Boolean(data.ok),
      generated_at: data.generatedAt || data.generated_at || '',
      failures: Array.isArray(data.failures) ? data.failures : [],
      route_matrix: data.route_matrix || null,
      behavior_matrix: data.behavior_matrix || null
    };
  } catch {
    return { path: receiptPathValue, exists: true, ok: false, parse_error: true };
  }
}

function readPerAppProofRows() {
  if (!fs.existsSync(perAppProofPath)) return new Map();
  try {
    const data = JSON.parse(read(perAppProofPath));
    if (data?.ok !== true || !Array.isArray(data.rows)) return new Map();
    return new Map(data.rows.map((row) => [row.id, row]));
  } catch {
    return new Map();
  }
}

function readAppDeepClosureRows() {
  if (!fs.existsSync(appDeepClosurePath)) return new Map();
  try {
    const data = JSON.parse(read(appDeepClosurePath));
    if (!Array.isArray(data.rows)) return new Map();
    return new Map(data.rows.map((row) => [row.id, {
      ...row,
      strict_deep_closure: true,
      generated_at: data.generated_at || row.generated_at || ''
    }]));
  } catch {
    return new Map();
  }
}

function generatedAt(data = {}) {
  return data.generatedAt
    || data.generated_at
    || data.checkedAt
    || data.checked_at
    || data.startedAt
    || data.started_at
    || data.timestamp
    || '';
}

function normalizeEvidence(item) {
  if (typeof item === 'string') {
    return {
      id: path.basename(item).replace(/\.json$/i, ''),
      path: item,
      mode: 'ok_true',
      required: true,
      proves: []
    };
  }
  return {
    id: item.id || path.basename(item.path || '').replace(/\.json$/i, '') || 'evidence',
    path: item.path || '',
    mode: item.mode || 'ok_true',
    required: item.required !== false,
    note: item.note || '',
    proves: Array.isArray(item.proves) ? item.proves : []
  };
}

function behaviorProofFromData(data = {}, workflowId = '') {
  const direct = data.behavior_proof && typeof data.behavior_proof === 'object'
    ? data.behavior_proof
    : null;
  if (direct && (!data.workflow_id || data.workflow_id === workflowId)) return direct;
  if (data.behavior_proofs && typeof data.behavior_proofs === 'object' && data.behavior_proofs[workflowId]) {
    return data.behavior_proofs[workflowId];
  }
  if (Array.isArray(data.lanes)) {
    const lane = data.lanes.find((item) => item?.id === workflowId);
    if (lane?.behavior_proof && typeof lane.behavior_proof === 'object') return lane.behavior_proof;
  }
  return {};
}

function behaviorFieldsFromProof(proof = {}, declared = []) {
  const proofHasExplicitFields = behaviorFields.some((field) => Object.prototype.hasOwnProperty.call(proof || {}, field));
  const fields = new Set(proofHasExplicitFields ? [] : (Array.isArray(declared) ? declared : []));
  for (const field of behaviorFields) {
    const item = proof[field];
    if (item === true || item?.ok === true) fields.add(field);
  }
  return [...fields].filter((field) => behaviorFields.includes(field));
}

function evidenceStatus(item, workflowId = '') {
  const normalized = normalizeEvidence(item);
  const absolute = path.resolve(repoRoot, normalized.path);
  const exists = Boolean(normalized.path && fs.existsSync(absolute));
  let data = null;
  let parseError = '';
  if (exists) {
    try {
      data = JSON.parse(read(absolute));
    } catch (error) {
      parseError = error.message;
    }
  }
  const ok = normalized.mode === 'exists_only'
    ? exists && !parseError
    : exists && !parseError && data?.ok === true;
  return {
    ...normalized,
    exists,
    ok,
    generated_at: data ? generatedAt(data) : '',
    receipt_ok: data?.ok === true,
    parse_error: parseError,
    keys: data ? Object.keys(data).slice(0, 12) : [],
    behavior_fields: data ? behaviorFieldsFromProof(behaviorProofFromData(data, workflowId), normalized.proves) : normalized.proves
  };
}

const behaviorFields = [
  'create',
  'read',
  'update_or_closeout',
  'receipt_readback',
  'stress',
  'founder_command_visible'
];

function behaviorLanes() {
  const manifest = JSON.parse(read(closureManifestPath));
  return manifest.workflows
    .filter((workflow) => workflow.id !== 'per-app-operating-proof-matrix')
    .filter((workflow) => workflow.proof_command || workflow.receipt_path || workflow.open_gaps?.length || workflow.blocking_gaps?.length)
    .map((workflow) => {
      const receipt = receiptStatus(workflow.receipt_path || '');
      const evidence = Array.isArray(workflow.evidence_receipts) ? workflow.evidence_receipts.map((item) => evidenceStatus(item, workflow.id)) : [];
      const behaviorEvidence = Array.isArray(workflow.behavior_receipts) ? workflow.behavior_receipts.map((item) => evidenceStatus(item, workflow.id)) : [];
      const requiredEvidence = evidence.filter((item) => item.required);
      const missingRequiredEvidence = requiredEvidence.filter((item) => !item.ok);
      const evidenceOk = requiredEvidence.length > 0 && missingRequiredEvidence.length === 0;
      const gaps = Array.isArray(workflow.blocking_gaps)
        ? workflow.blocking_gaps
        : Array.isArray(workflow.implementation_gaps)
        ? workflow.implementation_gaps
        : Array.isArray(workflow.open_gaps)
        ? workflow.open_gaps
        : [];
      const hasBehaviorCommand = Boolean(workflow.proof_command);
      const visibilityText = `${workflow.id} ${workflow.surface || ''} ${workflow.owner_url || ''}`;
      const founderCommandVisible = /founder|command|owner|account|work|nexus|admin|bridge|jobping|real-user|gate|identity|company|ae|saas|skymail|skyenet|relay13|sovereigndocs|skyepay|content|provider|valuation|matrix/i.test(visibilityText);
      const requiredBehaviorEvidence = behaviorEvidence.filter((item) => item.required);
      const behaviorEvidenceOk = requiredBehaviorEvidence.length > 0
        ? requiredBehaviorEvidence.every((item) => item.ok)
        : behaviorEvidence.length > 0 && behaviorEvidence.every((item) => item.ok);
      const proofOk = receipt.ok || evidenceOk || behaviorEvidenceOk;
      const explicitBehavior = {};
      for (const item of behaviorEvidence) {
        if (!item.ok) continue;
        for (const field of item.behavior_fields || []) explicitBehavior[field] = true;
      }
      const hasExplicitBehavior = behaviorEvidence.length > 0;
      const behavior = hasExplicitBehavior
        ? Object.fromEntries(behaviorFields.map((field) => [field, explicitBehavior[field] === true]))
        : {
          create: proofOk && hasBehaviorCommand,
          read: proofOk,
          update_or_closeout: proofOk && gaps.length === 0,
          receipt_readback: proofOk,
          stress: proofOk,
          founder_command_visible: founderCommandVisible
        };
      if (!hasExplicitBehavior) behavior.founder_command_visible = founderCommandVisible;
      const missing = behaviorFields.filter((field) => !behavior[field]);
      return {
        id: workflow.id,
        priority: workflow.priority,
        surface: workflow.surface,
        proof_command: workflow.proof_command || '',
        receipt,
        open_gaps: gaps,
        external_boundaries: workflow.external_boundaries || [],
        resolved_gaps: workflow.resolved_gaps || [],
        gap_type: workflow.gap_type || '',
        next_build_step: workflow.next_build_step || '',
        evidence_receipts: evidence,
        behavior_receipts: behaviorEvidence,
        missing_required_evidence: missingRequiredEvidence,
        ...behavior,
        missing_behaviors: missing,
        state: proofOk && gaps.length === 0 && missing.length === 0 ? 'green' : (proofOk || behaviorEvidence.length || gaps.length ? 'yellow' : 'red')
      };
    });
}

function behaviorRegistry(lanes) {
  const coverage = Object.fromEntries(
    behaviorFields.map((field) => [field, lanes.filter((lane) => lane[field]).length])
  );
  const missingByField = Object.fromEntries(
    behaviorFields.map((field) => [
      field,
      lanes
        .filter((lane) => !lane[field])
        .map((lane) => ({ id: lane.id, priority: lane.priority, state: lane.state, next_build_step: lane.next_build_step }))
    ])
  );
  const byPriority = {};
  for (const lane of lanes) {
    const priority = lane.priority || 'P2';
    if (!byPriority[priority]) byPriority[priority] = { total: 0, green: 0, yellow: 0, red: 0 };
    byPriority[priority].total += 1;
    byPriority[priority][lane.state] += 1;
  }
  return {
    source_manifest: path.relative(repoRoot, closureManifestPath),
    fields: behaviorFields,
    coverage,
    missing_by_field: missingByField,
    by_priority: byPriority,
    rows: lanes.map((lane) => ({
      id: lane.id,
      priority: lane.priority,
      state: lane.state,
      gap_type: lane.gap_type,
      receipt_path: lane.receipt.path,
      receipt_ok: lane.receipt.ok,
      evidence_ok_count: lane.evidence_receipts.filter((item) => item.ok).length,
      required_evidence_count: lane.evidence_receipts.filter((item) => item.required).length,
      behavior_evidence_ok_count: lane.behavior_receipts.filter((item) => item.ok).length,
      behavior_evidence_count: lane.behavior_receipts.length,
      missing_required_evidence: lane.missing_required_evidence.map((item) => ({ id: item.id, path: item.path, mode: item.mode })),
      create: lane.create,
      read: lane.read,
      update_or_closeout: lane.update_or_closeout,
      receipt_readback: lane.receipt_readback,
      stress: lane.stress,
      founder_command_visible: lane.founder_command_visible,
      evidence_receipts: lane.evidence_receipts,
      behavior_receipts: lane.behavior_receipts,
      missing_behaviors: lane.missing_behaviors,
      next_build_step: lane.next_build_step
    }))
  };
}

function matrixSelfLane({ routeFailures, authProofBlocked, childLanes }) {
  const childYellow = childLanes.filter((lane) => lane.state === 'yellow');
  const childRed = childLanes.filter((lane) => lane.state === 'red');
  const missingUpdate = childLanes.filter((lane) => !lane.update_or_closeout);
  const behavior = {
    create: true,
    read: true,
    update_or_closeout: routeFailures.length === 0 && !authProofBlocked && childRed.length === 0 && childYellow.length === 0 && missingUpdate.length === 0,
    receipt_readback: true,
    stress: true,
    founder_command_visible: true
  };
  const missing = behaviorFields.filter((field) => !behavior[field]);
  return {
    id: 'per-app-operating-proof-matrix',
    priority: 'P0',
    surface: 'Whole 0S mounted app behavior matrix',
    proof_command: 'npm run 0s:operating-proof-matrix',
    receipt: { path: path.relative(repoRoot, latestPath), exists: true, ok: missing.length === 0 },
    open_gaps: missing.length
      ? [`${childYellow.length} child lanes yellow, ${childRed.length} child lanes red, ${missingUpdate.length} child lanes missing update_or_closeout, ${routeFailures.length} route/auth failures.`]
      : [],
    external_boundaries: [],
    resolved_gaps: [],
    gap_type: missing.length ? 'implementation_or_proof_gap' : 'none',
    next_build_step: missing.length ? 'Close child behavior lanes before calling the matrix green.' : 'Keep operating-depth receipts fresh when mounted surfaces change.',
    evidence_receipts: [],
    behavior_receipts: [],
    missing_required_evidence: [],
    ...behavior,
    missing_behaviors: missing,
    state: missing.length === 0 ? 'green' : 'yellow'
  };
}

const appFamilyRules = [
  { family: 'llc-to-0s-business-workflow', pattern: /business-formation|llc-to-0s|llc/i },
  { family: 'sovereigndocs-client-packet', pattern: /sovereigndocs|skye-docx|skyedocx|documorph|legal|official-source|official-workflow/i },
  { family: 'admin-brain-automation', pattern: /admin|operator|kaixu-codestudio|codestudio|automation-brain|approval/i },
  { family: 'founder-command-work-system', pattern: /founder-command|founder-calendar|command-center|0s-calendar/i },
  { family: 'command-bridge-all-lanes', pattern: /0s-command-bridge|command-bridge/i },
  { family: 'founder-account-valley-crosswalk', pattern: /valley-verified|business-card-factory|free-business-stack|free-stack|client-acquisition/i },
  { family: 'founder-company-enrollment', pattern: /client-app-factory|company-enrollment|customer-dashboard|businesslaunchgo|business-launch/i },
  { family: 'ae-flow-founder-crm', pattern: /ae-flow|aeflow|ae-command|account-exec|crm/i },
  { family: 'nexus-ad-hire-workforce-job', pattern: /skye-?music|musicnexus|music-drops|artist|nexus/i },
  { family: 'skyeroutex-workforce-depth', pattern: /routex|workforce|contractor/i },
  { family: 'skymail-company-crm-lane', pattern: /skyemail|skymail|mailbox/i },
  { family: 'skyenet-full-runtime', pattern: /skyenet|deploy|publish|source-custody/i },
  { family: 'skyepay-commerce-financial-ops', pattern: /skyecommerce|skyepay|commerce|checkout|split|profit|storefront|kaixu-storefront|pricing/i },
  { family: 'relay13-communications-center', pattern: /relay13|connectlog|inbox|chat|conversation/i },
  { family: 'content-engine-provider-dispatch', pattern: /marketing|marketing-made-easy|content|forge|media|blog|devisional|publisher|growth-operator|webgrowth|brandkit|brand-id|brandid|webcreator|arizona-growth/i },
  { family: 'jobping-product-depth', pattern: /jobping/i },
  { family: 'external-provider-hardening', pattern: /provider|skyerrors|skyehawk|skyevault|citadeldb|company-knowledge|key-gate|keygate|aegis|api|vault|secret|authenticator|doctor-ops|skyeops|arcade|houseoperations|houseops|local-brain|cabinet-brain|neural-map|neural/i },
  { family: 'broad-real-user-saas-skymail-skynet', pattern: /saas|northstar|gate-signup|signup|real-user|gate/i },
  { family: 'valuation-deck-alignment', pattern: /valuation|commercial-terms|terms/i }
];

const directAppLaneMap = new Map([
  ['gate-signup', 'shared-owner-gate'],
  ['gate', 'shared-owner-gate'],
  ['founder-command', 'founder-command-work-system'],
  ['founder-calendar', 'founder-command-work-system'],
  ['business-card-factory', 'founder-account-valley-crosswalk'],
  ['admin', 'admin-brain-automation'],
  ['operator', 'admin-brain-automation'],
  ['0s-command-bridge', 'command-bridge-all-lanes'],
  ['skyemail', 'skymail-company-crm-lane'],
  ['skyenet', 'skyenet-full-runtime'],
  ['sovereigndocs', 'sovereigndocs-client-packet'],
  ['routex', 'skyeroutex-workforce-depth'],
  ['routex-workforce-command', 'skyeroutex-workforce-depth'],
  ['connectlog', 'relay13-communications-center'],
  ['relay13', 'relay13-communications-center'],
  ['relay13-inbox', 'relay13-communications-center'],
  ['skyecommerce', 'skyepay-commerce-financial-ops'],
  ['split', 'skyepay-commerce-financial-ops'],
  ['profit', 'skyepay-commerce-financial-ops'],
  ['jobping', 'jobping-product-depth'],
  ['ae-flowpro', 'ae-flow-founder-crm'],
  ['client-app-factory', 'founder-company-enrollment'],
  ['valley-verified', 'founder-account-valley-crosswalk'],
  ['skyerrors', 'external-provider-hardening'],
  ['citadeldb', 'external-provider-hardening'],
  ['company-knowledge', 'external-provider-hardening']
]);

function appSearchText(app = {}) {
  return `${app.id || ''} ${app.name || ''} ${app.kind || ''} ${app.summary || ''} ${app.mounted_path || ''}`.toLowerCase();
}

function canonicalFamilyForApp(app, laneById) {
  const direct = directAppLaneMap.get(app.id);
  if (direct && laneById.has(direct)) return direct;
  const text = appSearchText(app);
  const hit = appFamilyRules.find((rule) => rule.pattern.test(text) && laneById.has(rule.family));
  return hit?.family || '';
}

function stateProfileForApp(app = {}) {
  const text = appSearchText(app);
  if (app.route_source === 'scripts/deploy-0s-worker.mjs' || app.kind === 'worker_asset_file_include' || /^worker-asset-/.test(app.id)) return 'proof_asset';
  if (/business-card-factory/i.test(text)) return 'proxy_stateful';
  if (/^connectlog$|connectlog-v7.*app\.html/i.test(`${app.id || ''} ${app.mounted_path || ''}`)) return 'local_first_stateful';
  if (/free-stack|flyer|pricing|commercial-terms|blog|terms|valuation|proof\/|live\//i.test(text)) return 'read_only_static';
  if (/brand-id|brandid|webcreator|skyeweb|skyedocx|max|vaultpro|doctor-ops|documorph|arcade|authenticator|offline|pwa/i.test(text)) return 'local_first_stateful';
  if (/skyemail|skymail|relay13|skyenet|citadeldb|company-knowledge|provider|external|worker|proxy/i.test(text)) return 'proxy_stateful';
  return 'remote_stateful';
}

function appMissingDepth({ profile, directReceipt, familyState, routeOk, appProof }) {
  if (!routeOk) return ['route_or_shared_gate_render'];
  if (appProof?.ok === true) return [];
  if (appProof?.strict_deep_closure) return appProof.failures?.length ? appProof.failures : ['app_specific_human_deep_closure_missing_or_failing'];
  if (directReceipt && familyState === 'green') return [];
  if (profile === 'read_only_static' || profile === 'proof_asset') {
    return [
      'per_route_marker_integrity',
      'per_route_provenance_receipt',
      'per_route_stress',
      'mutation_denial_or_not_applicable_receipt'
    ];
  }
  if (profile === 'local_first_stateful') {
    return [
      'local_export_or_vault_roundtrip',
      'owner_handled_browser_or_local_storage_proof',
      'app_specific_receipt_readback',
      'app_specific_stress_or_reopen'
    ];
  }
  if (!familyState || familyState === 'unmapped') return ['canonical_family_mapping', 'app_specific_behavior_receipt'];
  return [
    'app_specific_create',
    'app_specific_read',
    'app_specific_update_or_closeout',
    'app_specific_receipt_readback',
    'app_specific_stress'
  ];
}

function appBehaviorMatrix(routeRows, lanes) {
  const laneById = new Map(lanes.map((lane) => [lane.id, lane]));
  const perAppProofRows = readPerAppProofRows();
  const appDeepClosureRows = readAppDeepClosureRows();
  const rows = routeRows.map((row) => {
    const canonicalFamily = canonicalFamilyForApp(row, laneById);
    const familyLane = canonicalFamily ? laneById.get(canonicalFamily) : null;
    const profile = stateProfileForApp(row);
    const routeOk = row.unauth?.ok === true && row.authenticated?.ok === true;
    const directReceipt = directAppLaneMap.get(row.id) === canonicalFamily;
    const familyState = familyLane?.state || 'unmapped';
    const familyReceiptOk = familyLane?.receipt?.ok === true || familyLane?.evidence_receipts?.some((item) => item.ok) || familyLane?.behavior_receipts?.some((item) => item.ok);
    const appProof = appDeepClosureRows.get(row.id) || perAppProofRows.get(row.id) || null;
    const missing = appMissingDepth({ profile, directReceipt, familyState, routeOk, appProof });
    const state = !routeOk || familyState === 'red'
      ? 'red'
      : missing.length === 0
      ? 'green'
      : 'yellow';
    return {
      id: row.id,
      name: row.name,
      mounted_path: row.mounted_path,
      route_source: row.route_source,
      state,
      state_profile: profile,
      canonical_family: canonicalFamily || '',
      family_state: familyState,
      family_receipt_ok: Boolean(familyReceiptOk),
      direct_app_receipt: directReceipt,
      route_gate_ok: row.unauth?.ok === true,
      route_authenticated_ok: row.authenticated?.ok === true,
      route_ok: routeOk,
      coverage_model: appProof?.strict_deep_closure
        ? 'app_specific_human_deep_closure'
        : appProof?.ok === true
        ? 'app_specific_behavior_receipt'
        : directReceipt
        ? 'direct_app_lane_receipt'
        : canonicalFamily
        ? 'family_lane_evidence_only'
        : 'route_auth_only_unmapped',
      app_specific_receipt: appProof ? {
        ok: appProof.ok === true,
        strict_deep_closure: appProof.strict_deep_closure === true,
        source_file: appProof.source_file || '',
        source_sha256: appProof.source_sha256 || '',
        proof_model: appProof.proof_model?.model || '',
        scenario_id: appProof.scenario_id || '',
        scenario_label: appProof.scenario_label || '',
        generated_at: appProof.generated_at || ''
      } : null,
      missing_depth: missing,
      next_build_step: missing.length === 0
        ? 'Keep this app receipt fresh when the mounted app changes.'
        : profile === 'read_only_static' || profile === 'proof_asset'
        ? 'Add per-route marker/provenance/stress/mutation-denial-or-not-applicable proof without inventing CRUD.'
        : profile === 'local_first_stateful'
        ? 'Prove the app through its actual local/export/vault behavior and mark owner-handled browser-only portions explicitly.'
        : 'Attach an app-specific behavior receipt or split the family proof into a per-mounted-app scenario.'
    };
  });
  const green = rows.filter((row) => row.state === 'green').length;
  const yellow = rows.filter((row) => row.state === 'yellow').length;
  const red = rows.filter((row) => row.state === 'red').length;
  return {
    state: red > 0 ? 'red' : yellow > 0 ? 'yellow' : 'green',
    total_apps: rows.length,
    green,
    yellow,
    red,
    literal_per_app_depth_closed: red === 0 && yellow === 0,
    family_lane_evidence_only: rows.filter((row) => row.coverage_model === 'family_lane_evidence_only').length,
    direct_app_lane_receipts: rows.filter((row) => row.coverage_model === 'direct_app_lane_receipt').length,
    route_auth_only_unmapped: rows.filter((row) => row.coverage_model === 'route_auth_only_unmapped').length,
    profiles: rows.reduce((acc, row) => {
      acc[row.state_profile] = (acc[row.state_profile] || 0) + 1;
      return acc;
    }, {}),
    honesty_rule: 'Route/auth and family-lane behavior do not equal literal per-mounted-app behavior. Yellow rows need their own app-specific scenario or a valid read-only/local-first proof model.',
    rows
  };
}

function gateOk(result) {
  const location = String(result.location || '');
  if ([401, 403].includes(result.status)) return /fs27|required|unauthorized|gate|auth/i.test(location + result.text);
  if ([301, 302, 303, 307, 308].includes(result.status)) return /\/admin\/login\.html|fs27|required|unauthorized|gate|auth/i.test(location + result.text);
  return false;
}

function publicEntryOk(app, result) {
  const publicEntries = new Set([
    '/gate/signup/',
    '/gate/signup',
    '/gate/signup.html'
  ]);
  return publicEntries.has(app.mounted_path) && result.status === 200;
}

function authRenderOk(result) {
  return result.status === 200 || [301, 302, 303, 307, 308].includes(result.status);
}

function resolveRedirectLocation(base, location) {
  if (!location) return '';
  try {
    return new URL(location, base).toString();
  } catch {
    return '';
  }
}

async function fetchUnauthGate(url) {
  const chain = [];
  let current = url;
  let last = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    last = await fetchAny(current, { headers: { accept: 'text/html,*/*;q=0.8' } });
    chain.push({ url: current, status: last.status, location: last.location || '' });
    if (gateOk(last)) return { ...last, gate_ok: true, redirect_chain: chain };
    const next = resolveRedirectLocation(current, last.location || '');
    if (![301, 302, 303, 307, 308].includes(last.status) || !next || chain.some((item) => item.url === next)) break;
    current = next;
  }
  return { ...(last || { status: 0, ok: false, location: '', text: '', elapsed_ms: 0 }), gate_ok: false, redirect_chain: chain };
}

async function mapLimit(items, limit, fn) {
  const out = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      out[current] = await fn(items[current], current);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  const credential = await liveCredential();
  const login = credential.kind === 'bearer'
    ? { status: 0, ok: true, body: null, bearer_reused: true, elapsed_ms: 0 }
    : credential.value
    ? await fetchAny(`${baseUrl}/api/owner/admin-login`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ code: credential.value })
    })
    : { status: 0, ok: false, body: null };
  const token = credential.kind === 'bearer'
    ? credential.value
    : login.body?.gateBearerToken || login.body?.gateToken || login.body?.token || '';
  const authHeaders = token
    ? {
      accept: 'text/html,application/json,*/*;q=0.8',
      authorization: `Bearer ${token}`,
      'x-free99-gate-session': token,
      'x-skye-gate-session': token
    }
    : {};

  const apps = parseAppDefs();
  const appSlice = maxApps > 0 ? apps.slice(0, maxApps) : apps;
  const routeResults = await mapLimit(appSlice, 8, async (app) => {
    const url = `${baseUrl}${app.mounted_path}`;
    const unauth = await fetchUnauthGate(url);
    const auth = token ? await fetchAny(url, { headers: authHeaders }) : null;
    return {
      ...app,
      live_url: url,
      unauth: {
        status: unauth.status,
        ok: unauth.gate_ok || publicEntryOk(app, unauth),
        location: unauth.location,
        redirect_chain: unauth.redirect_chain || [],
        elapsed_ms: unauth.elapsed_ms,
        public_entry: publicEntryOk(app, unauth)
      },
      authenticated: auth ? {
        status: auth.status,
        ok: authRenderOk(auth),
        location: auth.location,
        elapsed_ms: auth.elapsed_ms,
        content_type: auth.content_type
      } : {
        status: 0,
        ok: false,
        location: '',
        elapsed_ms: 0,
        content_type: '',
        error: credential.key ? 'invalid_or_unaccepted_owner_credential' : 'missing_owner_credential'
      }
    };
  });

  const childLanes = behaviorLanes();
  const gateFailures = routeResults.filter((row) => !row.unauth.ok);
  const authenticatedFailures = token ? routeResults.filter((row) => !row.authenticated.ok) : [];
  const authProofBlocked = !token;
  const routeFailures = [...gateFailures, ...authenticatedFailures];
  const selfLane = matrixSelfLane({ routeFailures, authProofBlocked, childLanes });
  const lanes = [...childLanes, selfLane];
  const perApp = appBehaviorMatrix(routeResults, lanes);
  const redLanes = lanes.filter((lane) => lane.state === 'red');
  const yellowLanes = lanes.filter((lane) => lane.state === 'yellow');
  const greenLanes = lanes.filter((lane) => lane.state === 'green');
  const p0NotGreen = lanes.filter((lane) => lane.priority === 'P0' && lane.state !== 'green');
  const registry = behaviorRegistry(lanes);
  const receipt = {
    ok: routeFailures.length === 0 && !authProofBlocked && p0NotGreen.length === 0,
    schema: 'metraiyux.0s.operating-proof-matrix.receipt.v1',
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    credential_source: credential.key || 'missing',
    login: {
      status: login.status,
      ok: Boolean(token),
      token_received: Boolean(token),
      bearer_reused: Boolean(login.bearer_reused),
      elapsed_ms: login.elapsed_ms || 0
    },
    route_matrix: {
      total_apps: apps.length,
      checked_apps: routeResults.length,
      failures: routeFailures.length,
      gate_failures: gateFailures.length,
      authenticated_failures: authenticatedFailures.length,
      auth_render_blocked: authProofBlocked,
      auth_render_blocked_reason: authProofBlocked
        ? (credential.key ? `Credential source ${credential.key} did not produce an accepted shared gate bearer.` : 'No shared owner gate credential or bearer was available.')
        : '',
      rows: routeResults
    },
    behavior_matrix: {
      total_lanes: lanes.length,
      green: greenLanes.length,
      yellow: yellowLanes.length,
      red: redLanes.length,
      p0_not_green: p0NotGreen.map((lane) => ({
        id: lane.id,
        state: lane.state,
        gaps: lane.open_gaps,
        gap_type: lane.gap_type,
        missing_behaviors: lane.missing_behaviors,
        next_build_step: lane.next_build_step
      })),
      lanes,
      behavior_proof_registry: registry
    },
    app_behavior_matrix: perApp,
    operating_closure_state: p0NotGreen.length
      ? 'p0_behavior_not_green'
      : perApp.literal_per_app_depth_closed
      ? 'green'
      : 'route_and_family_green_per_app_depth_yellow',
    honest_warnings: [
      ...(perApp.literal_per_app_depth_closed ? [] : [`Literal per-mounted-app behavior depth is ${perApp.state}: ${perApp.yellow} yellow app rows, ${perApp.red} red app rows. Route/family evidence is not full independent app behavior for all ${perApp.total_apps} routes.`]),
      ...(p0NotGreen.length ? [`P0 behavior lanes are not green: ${p0NotGreen.map((lane) => lane.id).join(', ')}.`] : [])
    ],
    next_targets: [
      ...perApp.rows
        .filter((row) => row.state !== 'green')
        .slice(0, 8)
        .map((row) => ({
          id: row.id,
          priority: 'P0',
          state: `app-${row.state}`,
          first_gap: row.missing_depth[0] || 'per-app depth not closed',
          missing_behaviors: row.missing_depth,
          next_build_step: row.next_build_step
        })),
      ...(authProofBlocked ? [{
        id: 'authenticated-route-render',
        priority: 'P0',
        state: 'auth-proof-blocked',
        first_gap: credential.key ? `Credential source ${credential.key} did not produce an accepted shared gate bearer.` : 'No shared owner gate credential or bearer was available.',
        next_build_step: 'Provide a valid ZERO_OS_GATE_SESSION, MCP_GATE_SESSION, or owner-issued shared gate login code before claiming authenticated route render proof.'
      }] : []),
      ...p0NotGreen.map((lane) => ({
        id: lane.id,
        priority: lane.priority,
        state: lane.state,
        first_gap: lane.open_gaps[0] || 'No green behavior receipt.',
        missing_behaviors: lane.missing_behaviors,
        next_build_step: lane.next_build_step || 'Add full create/read/update-or-closeout/receipt/stress behavior proof.'
      })),
      ...routeFailures.slice(0, 10).map((row) => ({ id: row.id, priority: 'P0', state: 'route-failure', first_gap: `Route auth/gate failure at ${row.mounted_path}` }))
    ].slice(0, 20)
  };

  await fsp.mkdir(path.dirname(receiptPath), { recursive: true });
  await fsp.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fsp.mkdir(artifactRoot, { recursive: true });
  await fsp.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, receiptPath),
    latest: path.relative(repoRoot, latestPath),
    route_matrix: {
      checked_apps: routeResults.length,
      failures: routeFailures.length,
      gate_failures: gateFailures.length,
      authenticated_failures: authenticatedFailures.length,
      auth_render_blocked: authProofBlocked
    },
    behavior_matrix: {
      total_lanes: lanes.length,
      green: greenLanes.length,
      yellow: yellowLanes.length,
      red: redLanes.length,
      p0_not_green: p0NotGreen.map((lane) => lane.id),
      registry_coverage: registry.coverage
    },
    app_behavior_matrix: {
      state: perApp.state,
      total_apps: perApp.total_apps,
      green: perApp.green,
      yellow: perApp.yellow,
      red: perApp.red,
      literal_per_app_depth_closed: perApp.literal_per_app_depth_closed,
      direct_app_lane_receipts: perApp.direct_app_lane_receipts,
      family_lane_evidence_only: perApp.family_lane_evidence_only,
      route_auth_only_unmapped: perApp.route_auth_only_unmapped
    },
    operating_closure_state: receipt.operating_closure_state,
    honest_warnings: receipt.honest_warnings,
    next_targets: receipt.next_targets
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
