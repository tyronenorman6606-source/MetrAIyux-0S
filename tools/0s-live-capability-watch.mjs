#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const packagePath = path.join(repoRoot, 'package.json');
const artifactRoot = path.join(repoRoot, 'test-artifacts', '0s-live-capability-watch');
const skyerrorsPublicPath = path.join(repoRoot, 'metraiyux_0s_site', 'skyerrors', 'live-capability-watch.json');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const receiptPath = path.join(artifactRoot, stamp, 'receipt.json');
const latestPath = path.join(artifactRoot, '0s-live-capability-watch-latest.json');
const defaultBaseUrl = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const defaultTimeoutMs = 180000;
const healthWatchSchema = 'metraiyux.0s.health-watch-rollup.v1';

const HEALTH_RECEIPT_SOURCES = [
  {
    id: 'operating-proof-matrix',
    label: '0S operating proof matrix',
    path: 'test-artifacts/0s-operating-proof-matrix/0s-operating-proof-matrix-latest.json',
    proves: 'mounted route gate checks and behavior matrix'
  },
  {
    id: 'truth-ledger',
    label: '0S truth ledger',
    path: 'test-artifacts/0s-truth-ledger/0s-truth-ledger-latest.json',
    proves: 'computed workflow truth and external boundary inventory'
  },
  {
    id: 'operating-depth-closeout',
    label: '0S operating depth closeout',
    path: 'test-artifacts/0s-operating-depth-closeout/0s-operating-depth-closeout-live-http-latest.json',
    proves: 'cross-lane closeout and Command Bridge readback'
  },
  {
    id: 'provider-runtime-smoke',
    label: '0S provider runtime smoke',
    path: 'test-artifacts/0s-provider-runtime/0s-provider-runtime-smoke-latest.json',
    proves: 'shared provider runtime sandbox receipt behavior'
  },
  {
    id: 'provider-runtime-stress',
    label: '0S provider runtime stress',
    path: 'test-artifacts/0s-provider-runtime/0s-provider-runtime-stress-latest.json',
    proves: 'provider runtime stress and retry-safe behavior'
  },
  {
    id: 'content-engine-provider-dispatch',
    label: 'Content Engine provider dispatch',
    path: 'test-artifacts/content-engine-provider-dispatch/content-engine-provider-dispatch-live-http-latest.json',
    proves: 'approval-gated dispatch with provider boundary receipts'
  },
  {
    id: 'valuation-deck-alignment',
    label: 'Valuation deck alignment',
    path: 'test-artifacts/valuation-deck-alignment/valuation-deck-alignment-latest.json',
    proves: 'public claims aligned to truth ledger and operating matrix'
  },
  {
    id: 'production-closure',
    label: '0S production closure',
    path: 'test-artifacts/0s-production-closure/0s-production-closure-latest.json',
    proves: 'live gate, truth ledger, SkyErrors watch, and deploy readiness'
  }
];

const args = process.argv.slice(2);
const argMap = new Map();
const argSet = new Set();
for (const arg of args) {
  if (arg.startsWith('--') && arg.includes('=')) {
    const [key, ...rest] = arg.slice(2).split('=');
    argMap.set(key, rest.join('='));
  } else if (arg.startsWith('--')) {
    argSet.add(arg.slice(2));
  }
}

const profile = argMap.get('profile') || process.env.ZERO_OS_CAPABILITY_WATCH_PROFILE || 'core';
const timeoutMs = Number(argMap.get('timeout-ms') || process.env.ZERO_OS_CAPABILITY_WATCH_TIMEOUT_MS || defaultTimeoutMs);
const maxOutputChars = Number(argMap.get('max-output') || 5000);
const watchMode = argSet.has('watch');
const listOnly = argSet.has('list') || profile === 'scan';
const includeBrowserDisabled = argSet.has('include-browser-disabled');
const pushSkyErrors = argSet.has('push-skyerrors') || process.env.SKYERRORS_WATCH_PUSH === '1';
const intervalMs = Number(argMap.get('interval-ms') || process.env.ZERO_OS_CAPABILITY_WATCH_INTERVAL_MS || 60000);
const baseUrl = String(process.env.ZERO_OS_LIVE_BASE || defaultBaseUrl).replace(/\/+$/, '');
const onlyScripts = (argMap.get('only') || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const CAPABILITY_TARGETS = [
  {
    id: 'repo-health',
    system: 'repo-health',
    label: 'Repo Health',
    script: 'repo:health',
    profiles: ['core', 'full'],
    evidence_level: 'static_health',
    live_action_observed: false,
    claim: 'The workspace can inspect git health, dirty state, risky tracked files, and vault script presence.',
    observation: 'Runs the existing repo health checker against the current checkout.',
    boundary: 'Local repo health only; does not prove production route behavior.'
  },
  {
    id: 'skyerrors-helper-k4i',
    system: 'skyerrors',
    label: 'SkyErrors + Helper K4i',
    script: '0s:helper-k4i:proof',
    profiles: ['core', 'full'],
    evidence_level: 'local_worker_api',
    live_action_observed: true,
    claim: 'SkyErrors captures gated events and Helper K4i records health scans into KV/CitadelDB-compatible stores.',
    observation: 'Runs Worker route tests that login through the shared gate, post SkyErrors events, scan Helper K4i health, and read receipts back.',
    boundary: 'Uses in-memory test bindings, not production Cloudflare storage unless live API proof is selected.'
  },
  {
    id: 'provider-runtime-closure',
    system: 'provider-runtime',
    label: '0S Provider Runtime Closure',
    script: '0s:provider-runtime:smoke',
    profiles: ['core', 'full'],
    evidence_level: 'provider_runtime_sandbox',
    live_action_observed: true,
    claim: 'The whole-0S provider runtime can execute its shared provider action catalog through sandbox receipts without app-local provider auth lanes.',
    observation: 'Runs the provider-runtime smoke suite across Twilio, Resend, Stripe, PayPal, UPS, catalog, DNS, AI, calendar, SkyeNet, Relay13, SkyeMail, storage, and commerce-http actions.',
    boundary: 'Provider spend remains owner-approved; smoke uses sandbox/live-gated provider receipts and does not force real sends, calls, payouts, or external publishing.'
  },
  {
    id: 'core-level-gate-map',
    system: 'core-levels',
    label: '0S Core Gate Map',
    script: '0s:core-level-gate-map',
    profiles: ['core', 'full'],
    evidence_level: 'local_worker_api',
    live_action_observed: true,
    claim: 'Named 0S core surfaces remain behind the shared 0S gate.',
    observation: 'Runs the core-level gate-map test suite against Worker routing logic.',
    boundary: 'Local Worker proof; production route proof lives in the operating matrix.'
  },
  {
    id: 'relay13-connectlog',
    system: 'relay13-connectlog',
    label: 'Relay13 + ConnectLog',
    script: '0s:connectlog-relay13:proof',
    profiles: ['core', 'full'],
    evidence_level: 'local_behavior',
    live_action_observed: true,
    claim: 'Relay13 and ConnectLog can run their shared operator proof without app-specific founder keys.',
    observation: 'Runs ConnectLog tests and Relay13 smoke through existing package scripts.',
    boundary: 'Local package proof; production API proof is separate.'
  },
  {
    id: 'skyemail-offboarding',
    system: 'skyemail',
    label: 'SkyeMail',
    script: '0s:skyemail:offboarding-proof',
    profiles: ['core', 'full'],
    evidence_level: 'local_behavior',
    live_action_observed: true,
    claim: 'SkyeMail founder offboarding and inbox separation behavior is executable.',
    observation: 'Runs the existing SkyeMail offboarding proof test.',
    boundary: 'Local test proof; no external mailbox provider is called.'
  },
  {
    id: 'skyemusicnexus-smoke',
    system: 'skyemusicnexus',
    label: 'SkyeMusicNexus Smoke',
    script: '0s:skyemusicnexus:smoke',
    profiles: ['core', 'full'],
    evidence_level: 'smoke',
    live_action_observed: true,
    claim: 'SkyeMusicNexus can execute its local smoke proof.',
    observation: 'Runs the existing SkyeMusicNexus smoke suite.',
    boundary: 'Smoke proof only; deeper asset, SkyPay, workforce, and claims checks are separate targets.'
  },
  {
    id: 'skyerunners-status',
    system: 'skyerunners',
    label: 'SkyeRunners Status',
    script: 'skyerunners:status',
    profiles: ['core', 'full'],
    evidence_level: 'local_status',
    live_action_observed: true,
    claim: 'SkyeRunners can read its local queue, ledger, and command catalog state.',
    observation: 'Runs the existing SkyeRunners status command.',
    boundary: 'Status read only; does not launch browser proof.'
  },
  {
    id: 'vault-autosync-status',
    system: 'skyevault',
    label: 'SkyeVault Autosync Status',
    script: 'vault:autosync:status',
    profiles: ['core', 'full'],
    evidence_level: 'local_status',
    live_action_observed: true,
    claim: 'SkyeVault autosync can report local watch/receipt state.',
    observation: 'Runs the existing autosync status command.',
    boundary: 'Status read only; no upload is performed.'
  },
  {
    id: 'operating-proof-matrix',
    system: '0s-operating-matrix',
    label: '0S Operating Proof Matrix',
    script: '0s:operating-proof-matrix',
    profiles: ['live', 'full'],
    evidence_level: 'live_http',
    live_action_observed: true,
    claim: 'Mounted 0S apps can prove gate behavior and behavior-lane receipt status against the live Worker origin.',
    observation: 'Runs the existing operating proof matrix against ZERO_OS_LIVE_BASE and shared owner credentials when available.',
    boundary: 'Owner credential dependent; yellow gaps are preserved instead of hidden.'
  },
  {
    id: 'skyemusicnexus-asset-live',
    system: 'skyemusicnexus',
    label: 'SkyeMusicNexus Asset Gate Live',
    script: '0s:skyemusicnexus:asset-gate:live',
    profiles: ['live', 'full'],
    evidence_level: 'live_http',
    live_action_observed: true,
    claim: 'SkyeMusicNexus asset download gate can be exercised through live HTTP.',
    observation: 'Runs the existing live HTTP asset-gate proof.',
    boundary: 'Owner credential/live route dependent.'
  },
  {
    id: 'founder-identity-spine-live',
    system: 'founder-command',
    label: 'Founder Command Identity Spine',
    script: '0s:founder-command:identity-spine',
    profiles: ['live', 'full'],
    evidence_level: 'live_http',
    live_action_observed: true,
    claim: 'Founder Command identity spine can be proved through live HTTP.',
    observation: 'Runs the existing live HTTP identity-spine proof.',
    boundary: 'Owner credential/live route dependent.'
  },
  {
    id: 'founder-batch-backfill-live',
    system: 'founder-command',
    label: 'Founder Command Batch Backfill',
    script: '0s:founder-command:batch-backfill',
    profiles: ['full'],
    evidence_level: 'live_http',
    live_action_observed: true,
    claim: 'Founder Command batch backfill can execute and return receipts through live HTTP.',
    observation: 'Runs the existing live HTTP batch-backfill proof.',
    boundary: 'Owner credential/live route dependent; may write safe Founder Command proof records.'
  },
  {
    id: 'ae-flow-founder-crm-live',
    system: 'ae-flow-founder-crm',
    label: 'AE Flow Founder CRM',
    script: '0s:ae-flow-founder-crm',
    profiles: ['live', 'full'],
    evidence_level: 'live_http',
    live_action_observed: true,
    claim: 'AE flow can create/read CRM proof records through live HTTP.',
    observation: 'Runs the existing AE flow live HTTP proof.',
    boundary: 'Owner credential/live route dependent; may write safe proof records.'
  },
  {
    id: 'founder-company-enrollment-live',
    system: 'founder-company-enrollment',
    label: 'Founder Company Enrollment',
    script: '0s:founder-company-enrollment',
    profiles: ['live', 'full'],
    evidence_level: 'live_http',
    live_action_observed: true,
    claim: 'Founder company enrollment can execute through live HTTP and return receipt evidence.',
    observation: 'Runs the existing founder company enrollment live HTTP proof.',
    boundary: 'Owner credential/live route dependent; may write safe proof records.'
  },
  {
    id: 'citadeldb-live-d1-sync',
    system: 'citadeldb',
    label: 'CitadelDB Live D1 Sync',
    script: 'citadeldb:live-d1-sync-proof',
    profiles: ['live', 'full'],
    evidence_level: 'live_api',
    live_action_observed: true,
    claim: 'CitadelDB live D1 sync can be exercised and read back.',
    observation: 'Runs the existing live D1 sync proof.',
    boundary: 'Owner credential/live D1 binding dependent.'
  },
  {
    id: 'skyenet-public-guide-live',
    system: 'skyenet',
    label: 'SkyeNet Public Guide',
    script: 'skyenet:public-guide:proof',
    profiles: ['live', 'full'],
    evidence_level: 'live_http',
    live_action_observed: true,
    claim: 'SkyeNet public guide and source custody lanes can be checked through live HTTP.',
    observation: 'Runs the existing SkyeNet public guide live HTTP proof.',
    boundary: 'Read-only live HTTP proof.'
  },
  {
    id: 'content-engine-provider-dispatch-live',
    system: 'content-engine',
    label: 'Content Engine Provider Dispatch',
    script: '0s:content-engine:provider-dispatch',
    profiles: ['live', 'full'],
    evidence_level: 'live_http',
    live_action_observed: true,
    claim: 'Content Engine can create a campaign package, approve dispatch, store local-brain context, queue connector events, and preserve the external provider boundary.',
    observation: 'Runs the live HTTP Content Engine proof through shared operator auth and reads the generated run, dispatch events, local-brain chunk, and stress receipt back.',
    boundary: 'Provider publishing remains provider_call_made:false until owner-approved connector credentials and rollback receipts are attached.'
  }
];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function shortText(value = '', max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function unquote(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
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

async function mergedEnv() {
  const envFiles = [
    process.env.ROOT_ENV_FILE,
    process.env.METRAIYUX_ROOT_ENV,
    '.env',
    'env.txt'
  ].filter(Boolean);
  const merged = { ...process.env };
  for (const file of envFiles) Object.assign(merged, await readEnvFile(path.resolve(repoRoot, file)));
  return merged;
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function tail(value, max = maxOutputChars) {
  const text = String(value || '');
  return text.length <= max ? text : text.slice(text.length - max);
}

function cleanLine(value) {
  return String(value || '').replace(/\r/g, '').trimEnd();
}

function emit(event) {
  const payload = { at: new Date().toISOString(), ...event };
  if (event.type === 'check.output') {
    console.log(`[watch:${event.id}:${event.stream}] ${event.line}`);
    return;
  }
  console.log(`[watch:${event.type}] ${event.message || JSON.stringify(payload)}`);
}

function classifyScript(name, command) {
  const text = `${name} ${command}`;
  if (/browser-proof-disabled\.mjs/.test(command)) return 'browser_disabled';
  if (/\b(sync-worker-secrets|direct-upload|deploy-pages|skyenet-deploy|repo-push|full-repo-push|push|upload|rotate|secret|billing)\b/i.test(text)) return 'mutation_or_provider_gated';
  if (/\b(live-http|live-api|prod-proof|production-proof|live-d1|citadeldb-live|live-production)\b/i.test(text)) return 'live_http_or_api';
  if (/\b(skyepay|resend|twilio|stripe|cloudflare|provider)\b/i.test(text) && !/\bproof|smoke|test|audit\b/i.test(text)) return 'provider_gated';
  if (/\bsmoke\b/i.test(text)) return 'smoke';
  if (/\b(audit|health|map|guard|status)\b/i.test(text)) return 'static_or_status';
  if (/\b(node --test|node .*tests\/|npm test| run test)\b/i.test(command)) return 'local_behavior';
  return 'script';
}

function referencedScripts(command) {
  const refs = [];
  let inSubdir = false;
  for (const part of String(command || '').split(/&&|\|\|/)) {
    const trimmed = part.trim();
    if (/^cd\s+/.test(trimmed)) {
      inSubdir = true;
      continue;
    }
    if (inSubdir) continue;
    const match = trimmed.match(/^npm\s+run\s+([A-Za-z0-9_.:-]+)/);
    if (match) refs.push(match[1]);
  }
  return refs;
}

function buildCatalog(scripts) {
  const relevantPattern = /skyerrors|helper|health|watch|proof|smoke|matrix|relay13|connectlog|skyemail|skyemusic|signin|ascension|expansion|government|saas|core|gate|live|runner|vault:autosync|delta|agent:status/i;
  const relevant = Object.entries(scripts)
    .filter(([name, command]) => relevantPattern.test(`${name} ${command}`))
    .map(([name, command]) => ({
      name,
      command,
      classification: classifyScript(name, command),
      references: referencedScripts(command)
    }));
  const missing_references = [];
  for (const [name, command] of Object.entries(scripts)) {
    for (const reference of referencedScripts(command)) {
      if (!scripts[reference]) missing_references.push({ script: name, missing: reference, command });
    }
  }
  const browser_disabled = relevant.filter((item) => item.classification === 'browser_disabled').map((item) => item.name);
  const live_http_or_api = relevant.filter((item) => item.classification === 'live_http_or_api').map((item) => item.name);
  const mutation_or_provider_gated = relevant.filter((item) => /gated/.test(item.classification)).map((item) => item.name);
  return {
    script_count: Object.keys(scripts).length,
    relevant_count: relevant.length,
    relevant_scripts: relevant,
    missing_references,
    browser_disabled,
    live_http_or_api,
    mutation_or_provider_gated
  };
}

function selectedTargets(scripts) {
  const requested = onlyScripts.length
    ? CAPABILITY_TARGETS.filter((target) => onlyScripts.includes(target.script) || onlyScripts.includes(target.id) || onlyScripts.includes(target.system))
    : CAPABILITY_TARGETS.filter((target) => target.profiles.includes(profile));
  return requested.map((target) => {
    const command = scripts[target.script] || '';
    const classification = command ? classifyScript(target.script, command) : 'missing';
    const browserDisabled = classification === 'browser_disabled';
    const shouldSkip = browserDisabled && !includeBrowserDisabled;
    return {
      ...target,
      command,
      classification,
      exists: Boolean(command),
      shouldSkip
    };
  });
}

function receiptPathHints(output) {
  const text = String(output || '');
  const hints = new Set();
  for (const match of text.matchAll(/\b(?:test-artifacts|metraiyux_0s_site|ops)\/[A-Za-z0-9_./:-]+\.json\b/g)) {
    hints.add(match[0].replace(/[),.;]+$/, ''));
  }
  return [...hints].slice(0, 20);
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

function arrayCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

function compactReceiptSummary(data = {}) {
  const route = data.route_matrix || {};
  const behavior = data.behavior_matrix || {};
  const summary = data.summary || {};
  const stress = data.stress || {};
  return {
    summary,
    route_failures: Number(route.failures || 0),
    gate_failures: Number(route.gate_failures || 0),
    authenticated_failures: Number(route.authenticated_failures || 0),
    behavior_green: Number(behavior.green || 0),
    behavior_yellow: Number(behavior.yellow || 0),
    behavior_red: Number(behavior.red || 0),
    p0_not_green: Array.isArray(behavior.p0_not_green) ? behavior.p0_not_green.map((item) => item?.id || item).filter(Boolean).slice(0, 12) : [],
    warnings: Array.isArray(data.warnings) ? data.warnings.map((item) => shortText(item, 300)).slice(0, 8) : [],
    failures: Array.isArray(data.failures) ? data.failures.map((item) => shortText(item, 300)).slice(0, 8) : [],
    checks: arrayCount(data.checks),
    stress_ok: typeof stress.ok === 'boolean' ? stress.ok : null,
    stress_requests: Number(stress.requests || 0),
    live_provider_send_attempted: data.live_provider_send_attempted === true,
    provider_call_made: data.provider_call_made === true
  };
}

function summarizeSourceReceipt(source) {
  const absolute = path.resolve(repoRoot, source.path);
  const data = readJson(absolute);
  const summary = data ? compactReceiptSummary(data) : {};
  const status = !data
    ? 'missing'
    : data.ok === true
    ? 'ok'
    : 'attention';
  return {
    id: source.id,
    label: source.label,
    path: source.path,
    exists: Boolean(data),
    ok: data?.ok === true,
    status,
    schema: shortText(data?.schema || '', 160),
    generated_at: data ? generatedAt(data) : '',
    no_browser_proof_run: data?.no_browser_proof_run === true,
    owner_manual_live_check: data?.owner_manual_live_check === true,
    proves: source.proves,
    summary
  };
}

function externalBoundaryRollup(truth = {}) {
  const workflows = Array.isArray(truth.workflows) ? truth.workflows : [];
  return workflows
    .filter((item) => Array.isArray(item.external_boundaries) && item.external_boundaries.length)
    .map((item) => ({
      id: shortText(item.id || '', 120),
      priority: shortText(item.priority || '', 20),
      surface: shortText(item.surface || '', 220),
      receipt_path: shortText(item.receipt_path || item.receipt?.path || '', 400),
      receipt_ok: item.receipt_ok === true || item.receipt?.ok === true,
      computed_truth: shortText(item.computed_truth || item.current_truth || '', 80),
      boundaries: item.external_boundaries.map((boundary) => shortText(boundary, 420)).filter(Boolean).slice(0, 6),
      next_step: shortText(item.next_step || item.next_build_step || '', 420)
    }))
    .filter((item) => item.id && item.boundaries.length)
    .slice(0, 40);
}

function buildHealthWatchRollup() {
  const recentReceipts = HEALTH_RECEIPT_SOURCES.map(summarizeSourceReceipt);
  const truthSource = HEALTH_RECEIPT_SOURCES.find((source) => source.id === 'truth-ledger');
  const truth = truthSource ? readJson(path.resolve(repoRoot, truthSource.path)) : {};
  const externalBoundaries = externalBoundaryRollup(truth || {});
  const failedReceipts = recentReceipts.filter((item) => item.exists && !item.ok);
  const missingReceipts = recentReceipts.filter((item) => !item.exists);
  const providerSmoke = recentReceipts.find((item) => item.id === 'provider-runtime-smoke');
  const productionClosure = recentReceipts.find((item) => item.id === 'production-closure');
  const operatingMatrix = recentReceipts.find((item) => item.id === 'operating-proof-matrix');
  return {
    schema: healthWatchSchema,
    generated_at: new Date().toISOString(),
    source: 'tools/0s-live-capability-watch.mjs',
    recent_receipts: recentReceipts,
    external_boundaries: externalBoundaries,
    summary: {
      total_receipts: recentReceipts.length,
      ok_receipts: recentReceipts.filter((item) => item.ok).length,
      failed_receipts: failedReceipts.length,
      missing_receipts: missingReceipts.length,
      external_boundary_workflows: externalBoundaries.length,
      route_failures: operatingMatrix?.summary?.route_failures || 0,
      behavior_red: operatingMatrix?.summary?.behavior_red || 0,
      production_closure_ok: productionClosure?.ok === true,
      provider_runtime_smoke_ok: providerSmoke?.ok === true,
      live_provider_send_attempted: providerSmoke?.summary?.live_provider_send_attempted === true,
      no_browser_proof_run: true,
      owner_manual_live_check: true
    },
    failed_receipts: failedReceipts.map((item) => ({
      id: item.id,
      path: item.path,
      generated_at: item.generated_at,
      failures: item.summary.failures || [],
      warnings: item.summary.warnings || []
    })),
    missing_receipts: missingReceipts.map((item) => ({ id: item.id, path: item.path })),
    consumption: {
      skyerrors_health_api: '/api/skyerrors/health',
      skyerrors_watch_api: '/api/skyerrors/watch',
      production_closure_check: 'tools/0s-production-closure-live-http.mjs',
      public_surface: 'metraiyux_0s_site/skyerrors/live-capability-watch.json'
    },
    boundary_rule: 'External provider, customer-impacting, destructive, browser, billing, deployment, legal/government, payout/refund, and credential actions remain boundaries unless an owner-approved non-browser receipt explicitly proves execution.'
  };
}

function operatingMatrixWarning() {
  const latest = readJson(path.join(repoRoot, 'test-artifacts', '0s-operating-proof-matrix', '0s-operating-proof-matrix-latest.json'));
  const route = latest?.route_matrix || latest?.route || {};
  const behavior = latest?.behavior_matrix || latest?.behavior || {};
  const routeFailures = Number(route.failures || 0);
  const red = Number(behavior.red || 0);
  if (!latest || routeFailures > 0 || red > 0) return null;
  const p0 = Array.isArray(behavior.p0_not_green) ? behavior.p0_not_green : [];
  return {
    reason: 'operating_matrix_yellow_gaps',
    route_failures: routeFailures,
    behavior_green: Number(behavior.green || 0),
    behavior_yellow: Number(behavior.yellow || 0),
    behavior_red: red,
    p0_not_green: p0.map((item) => typeof item === 'string' ? item : item?.id).filter(Boolean),
    next_targets: Array.isArray(latest.next_targets) ? latest.next_targets.slice(0, 5) : []
  };
}

async function runTarget(target, inheritedEnv) {
  const startedAt = new Date().toISOString();
  if (!target.exists) {
    emit({ type: 'check.blocked', id: target.id, message: `${target.id} blocked: package script ${target.script} is missing` });
    return {
      ...target,
      status: 'blocked',
      ok: false,
      exit_code: null,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: 0,
      stdout_tail: '',
      stderr_tail: '',
      receipt_hints: [],
      failure_reason: 'missing_package_script'
    };
  }
  if (target.shouldSkip) {
    emit({ type: 'check.skipped', id: target.id, message: `${target.id} skipped: browser proof is disabled by owner policy` });
    return {
      ...target,
      status: 'skipped',
      ok: true,
      exit_code: null,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: 0,
      stdout_tail: '',
      stderr_tail: '',
      receipt_hints: [],
      failure_reason: 'browser_proof_disabled'
    };
  }

  emit({ type: 'check.start', id: target.id, message: `starting ${target.id} via npm run ${target.script}` });
  const started = performance.now();
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let outputEvents = 0;

  const child = spawn('npm', ['run', target.script], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...inheritedEnv,
      FORCE_COLOR: '0',
      NO_COLOR: '1'
    },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const killChild = (signal) => {
    try {
      if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal);
      else child.kill(signal);
    } catch {}
  };

  const timer = setTimeout(() => {
    timedOut = true;
    killChild('SIGTERM');
    setTimeout(() => {
      killChild('SIGKILL');
    }, 3000).unref();
  }, Math.max(1000, timeoutMs));

  const onData = (stream, chunk) => {
    const text = chunk.toString('utf8');
    if (stream === 'stdout') stdout += text;
    else stderr += text;
    for (const raw of text.split(/\n/)) {
      const line = cleanLine(raw);
      if (!line) continue;
      outputEvents += 1;
      emit({ type: 'check.output', id: target.id, stream, line: line.slice(0, 800) });
    }
  };

  child.stdout.on('data', (chunk) => onData('stdout', chunk));
  child.stderr.on('data', (chunk) => onData('stderr', chunk));

  const exitCode = await new Promise((resolve) => {
    child.on('close', (code, signal) => resolve(code ?? (signal ? 128 : 1)));
    child.on('error', () => resolve(1));
  });
  clearTimeout(timer);

  const finishedAt = new Date().toISOString();
  const durationMs = Number((performance.now() - started).toFixed(2));
  const commandOk = !timedOut && exitCode === 0;
  const combined = `${stdout}\n${stderr}`;
  const warning = !commandOk && target.id === 'operating-proof-matrix' ? operatingMatrixWarning() : null;
  const status = commandOk ? 'pass' : warning ? 'warn' : 'fail';
  const ok = commandOk || Boolean(warning);
  emit({
    type: status === 'pass' ? 'check.pass' : status === 'warn' ? 'check.warn' : 'check.fail',
    id: target.id,
    message: `${target.id} ${status === 'pass' ? 'passed' : status === 'warn' ? 'completed with warnings' : 'failed'} in ${Math.round(durationMs)}ms`
  });
  return {
    ...target,
    status,
    ok,
    exit_code: exitCode,
    timed_out: timedOut,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: durationMs,
    output_events: outputEvents,
    real_time_observed: outputEvents > 0,
    stdout_tail: tail(stdout),
    stderr_tail: tail(stderr),
    receipt_hints: receiptPathHints(combined),
    warning,
    failure_reason: status === 'fail' ? (timedOut ? 'timeout' : 'nonzero_exit') : warning?.reason || ''
  };
}

function summarizeRuns(runs) {
  const counts = {
    total: runs.length,
    pass: runs.filter((run) => run.status === 'pass').length,
    warn: runs.filter((run) => run.status === 'warn').length,
    fail: runs.filter((run) => run.status === 'fail').length,
    skipped: runs.filter((run) => run.status === 'skipped').length,
    blocked: runs.filter((run) => run.status === 'blocked').length,
    live_http_or_api: runs.filter((run) => run.evidence_level === 'live_http' || run.evidence_level === 'live_api').length,
    local_behavior: runs.filter((run) => /local|smoke/.test(run.evidence_level)).length
  };
  return {
    ...counts,
    real_action_observed: runs.filter((run) => run.live_action_observed && (run.status === 'pass' || run.status === 'warn')).length,
    failed_ids: runs.filter((run) => run.status === 'fail' || run.status === 'blocked').map((run) => run.id),
    warning_ids: runs.filter((run) => run.status === 'warn').map((run) => run.id)
  };
}

function publicReceipt(receipt) {
  return {
    ok: receipt.ok,
    schema: receipt.schema,
    generated_at: receipt.generated_at,
    profile: receipt.profile,
    base_url: receipt.base_url,
    no_browser_proof_run: receipt.no_browser_proof_run,
    owner_manual_live_check: receipt.owner_manual_live_check,
    summary: receipt.summary,
    health_watch: receipt.health_watch,
    policy: receipt.policy,
    skyerrors_push: receipt.skyerrors_push,
    catalog: {
      script_count: receipt.catalog.script_count,
      relevant_count: receipt.catalog.relevant_count,
      missing_references: receipt.catalog.missing_references,
      browser_disabled_count: receipt.catalog.browser_disabled.length,
      live_http_or_api_count: receipt.catalog.live_http_or_api.length,
      mutation_or_provider_gated_count: receipt.catalog.mutation_or_provider_gated.length
    },
    checks: receipt.checks.map((run) => ({
      id: run.id,
      system: run.system,
      label: run.label,
      script: run.script,
      status: run.status,
      ok: run.ok,
      evidence_level: run.evidence_level,
      classification: run.classification,
      live_action_observed: run.live_action_observed,
      real_time_observed: run.real_time_observed,
      duration_ms: run.duration_ms,
      started_at: run.started_at,
      finished_at: run.finished_at,
      claim: run.claim,
      observation: run.observation,
      boundary: run.boundary,
      receipt_hints: run.receipt_hints,
      warning: run.warning || null,
      failure_reason: run.failure_reason || ''
    }))
  };
}

async function ownerBearer(env) {
  const direct = env.ZERO_OS_GATE_SESSION || env.ZERO_OS_GATE_BEARER || env.MCP_GATE_SESSION || env.SKYENET_AUTH || '';
  if (direct) return { token: direct, source: 'shared_gate_bearer_env' };
  const code = env.FREE99_ADMIN_CODE || env.OWNER_ADMIN_CODE || env.SKYGATE_ADMIN_PASSWORD || env.FS27_ADMIN_PASSWORD || '';
  if (!code) return { token: '', source: 'missing' };
  const response = await fetch(`${baseUrl}/api/owner/admin-login`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ code })
  }).catch((error) => ({ error }));
  if (response.error) return { token: '', source: 'login_failed', error: response.error.message || String(response.error) };
  const body = await response.json().catch(() => ({}));
  const token = body.gateBearerToken || body.gateToken || body.token || '';
  return { token, source: token ? 'owner_admin_code_login' : 'login_no_token' };
}

async function pushSummaryToSkyErrors(receipt, env) {
  if (!pushSkyErrors) return { attempted: false, ok: false, skipped: true, reason: 'push_not_requested' };
  const bearer = await ownerBearer(env);
  if (!bearer.token) return { attempted: true, ok: false, skipped: true, source: bearer.source, reason: bearer.error || 'missing_shared_gate_bearer' };
  const failed = receipt.checks.filter((run) => run.status === 'fail' || run.status === 'blocked');
  const warned = receipt.checks.filter((run) => run.status === 'warn');
  const response = await fetch(`${baseUrl}/api/helper-k4i/capability-watch`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${bearer.token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      id: `capability_watch_${stamp}`,
      capability_id: '0s-live-capability-watch',
      surface: 'SkyErrors',
      target_route: '/api/helper-k4i/capability-watch',
      source: '0s-local-non-browser-runner',
      proof_kind: 'mixed_non_browser',
      ok: receipt.ok,
      status: failed.length ? 'error' : warned.length ? 'warning' : 'ok',
      no_browser_proof_run: true,
      owner_manual_live_check: true,
      provider_spend_gated: true,
      destructive_actions_gated: true,
      summary: receipt.summary,
      receipt_paths: [rel(receiptPath), rel(latestPath), rel(skyerrorsPublicPath)],
      recent_receipts: receipt.health_watch.recent_receipts,
      external_boundaries: receipt.health_watch.external_boundaries,
      health_watch: {
        schema: receipt.health_watch.schema,
        generated_at: receipt.health_watch.generated_at,
        summary: receipt.health_watch.summary,
        failed_receipts: receipt.health_watch.failed_receipts,
        missing_receipts: receipt.health_watch.missing_receipts,
        consumption: receipt.health_watch.consumption,
        boundary_rule: receipt.health_watch.boundary_rule
      },
      checks: receipt.checks.map((run) => ({
        id: run.id,
        label: run.label,
        ok: run.ok,
        status: run.status,
        severity: run.status === 'fail' || run.status === 'blocked' ? 'error' : run.status === 'skipped' || run.status === 'warn' ? 'warn' : 'ok',
        proof_kind: run.evidence_level,
        duration_ms: run.duration_ms,
        live_action_observed: run.live_action_observed,
        real_time_observed: run.real_time_observed,
        detail: run.warning?.reason || run.observation || run.failure_reason || '',
        boundary: run.boundary || ''
      }))
    })
  }).catch((error) => ({ error }));
  if (response.error) return { attempted: true, ok: false, skipped: false, source: bearer.source, error: response.error.message || String(response.error) };
  const body = await response.json().catch(() => ({}));
  return {
    attempted: true,
    ok: response.ok,
    skipped: false,
    status: response.status,
    source: bearer.source,
    receipt_id: body.receipt?.id || '',
    stored: body.stored || null,
    error: response.ok ? '' : (body.error || body.message || response.statusText || 'capability_watch_push_failed')
  };
}

async function writeReceipt(receipt) {
  await fsp.mkdir(path.dirname(receiptPath), { recursive: true });
  await fsp.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fsp.mkdir(artifactRoot, { recursive: true });
  await fsp.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fsp.mkdir(path.dirname(skyerrorsPublicPath), { recursive: true });
  await fsp.writeFile(skyerrorsPublicPath, `${JSON.stringify(publicReceipt(receipt), null, 2)}\n`);
}

async function runOnce() {
  const pkg = readJson(packagePath) || {};
  const scripts = pkg.scripts || {};
  const catalog = buildCatalog(scripts);
  const targets = selectedTargets(scripts);
  const env = await mergedEnv();

  emit({ type: 'scan.complete', message: `cataloged ${catalog.relevant_count} relevant scripts; profile=${profile}; selected=${targets.length}` });

  const checks = [];
  if (!listOnly) {
    for (const target of targets) checks.push(await runTarget(target, env));
  }

  const receipt = {
    ok: listOnly ? catalog.missing_references.length === 0 : checks.every((run) => run.ok),
    schema: 'metraiyux.0s.live-capability-watch.receipt.v1',
    generated_at: new Date().toISOString(),
    profile,
    base_url: baseUrl,
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    command: `node tools/0s-live-capability-watch.mjs ${args.join(' ')}`.trim(),
    artifact: {
      receipt: rel(receiptPath),
      latest: rel(latestPath),
      skyerrors_surface_mirror: rel(skyerrorsPublicPath)
    },
    policy: {
      shared_gate_only: true,
      no_new_auth_lane: true,
      browser_proof_disabled: true,
      provider_spend_and_destructive_actions_gated: true,
      evidence_rule: 'A check is marked live_action_observed only when an existing non-browser command actually executed and returned output; browser-disabled and provider-gated lanes are reported as boundaries, not proof.'
    },
    catalog,
    selected_targets: targets.map((target) => ({
      id: target.id,
      system: target.system,
      script: target.script,
      exists: target.exists,
      classification: target.classification,
      evidence_level: target.evidence_level
    })),
    checks,
    health_watch: buildHealthWatchRollup(),
    summary: summarizeRuns(checks),
    skyerrors_push: { attempted: false, skipped: true, reason: 'pending' }
  };

  receipt.skyerrors_push = await pushSummaryToSkyErrors(receipt, env);
  await writeReceipt(receipt);

  emit({ type: receipt.ok ? 'run.pass' : 'run.fail', message: `wrote ${rel(receiptPath)} and ${rel(skyerrorsPublicPath)}` });
  console.log(JSON.stringify({
    ok: receipt.ok,
    profile: receipt.profile,
    receipt: receipt.artifact.receipt,
    latest: receipt.artifact.latest,
    skyerrors_surface_mirror: receipt.artifact.skyerrors_surface_mirror,
    summary: receipt.summary,
    missing_references: receipt.catalog.missing_references,
    skyerrors_push: receipt.skyerrors_push
  }, null, 2));
  return receipt;
}

async function main() {
  if (watchMode) {
    while (true) {
      await runOnce();
      emit({ type: 'watch.sleep', message: `sleeping ${intervalMs}ms before next pass` });
      await new Promise((resolve) => setTimeout(resolve, Math.max(1000, intervalMs)));
    }
  }
  const receipt = await runOnce();
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
