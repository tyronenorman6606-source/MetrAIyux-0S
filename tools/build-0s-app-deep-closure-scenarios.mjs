#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const matrixPath = path.join(repoRoot, 'test-artifacts', '0s-operating-proof-matrix', '0s-operating-proof-matrix-latest.json');
const outPath = path.join(repoRoot, 'metraiyux_0s_site', 'data', '0s-app-deep-closure-scenarios.json');

const statefulBehaviors = [
  'human_flow',
  'create',
  'read',
  'update_or_closeout',
  'receipt_readback',
  'stress',
  'founder_command_visible',
  'telemetry_or_command_event'
];

const readOnlyBehaviors = [
  'human_flow',
  'read',
  'receipt_readback',
  'stress',
  'mutation_denial_or_not_applicable'
];

const operatingDepthFamilies = new Set([
  'admin-brain-automation',
  'command-bridge-all-lanes',
  'content-engine-provider-dispatch',
  'external-provider-hardening',
  'relay13-communications-center',
  'skyenet-full-runtime',
  'skyepay-commerce-financial-ops',
  'skyeroutex-workforce-depth',
  'skymail-company-crm-lane',
  'sovereigndocs-client-packet',
  'valuation-deck-alignment'
]);

const familyEvidence = {
  'ae-flow-founder-crm': [
    ['ae-flow-founder-crm-live-http', 'test-artifacts/ae-flow-founder-crm-live-http/ae-flow-founder-crm-live-http-latest.json']
  ],
  'broad-real-user-saas-skymail-skynet': [
    ['real-user-readiness', 'test-artifacts/0s-real-user-readiness/2026-05-31T20-15-10-813Z/receipt.json']
  ],
  'founder-account-valley-crosswalk': [
    ['founder-command-accounts-crosswalk', 'test-artifacts/founder-command-accounts-crosswalk/founder-command-accounts-crosswalk-live-http-latest.json'],
    ['business-card-factory-connectlog-stress', 'test-artifacts/business-card-factory-connectlog-stress-latest.json'],
    ['founder-command-free-stack-production-smoke', 'test-artifacts/founder-command-free-stack/production-smoke-latest.json']
  ],
  'founder-command-work-system': [
    ['founder-command-work-system-live-http', 'test-artifacts/founder-command-work-system/founder-command-work-system-live-http-latest.json'],
    ['founder-command-skyemail-login-custody', 'test-artifacts/founder-command-skyemail-login-custody/founder-command-skyemail-login-custody-live-http-latest.json']
  ],
  'founder-company-enrollment': [
    ['founder-company-enrollment-live-http', 'test-artifacts/founder-company-enrollment-live-http/founder-company-enrollment-live-http-latest.json']
  ],
  'nexus-ad-hire-workforce-job': [
    ['founder-command-nexus-hire-workforce-live-http', 'test-artifacts/founder-command-nexus-hire-workforce/founder-command-nexus-hire-workforce-live-http-latest.json']
  ],
  'shared-owner-gate': [
    ['auth-spine-guard', 'test-artifacts/0s-auth-spine-guard/latest.json'],
    ['ai-gate-audit', 'test-artifacts/ai-gate-audit/ai-gate-audit-latest.json'],
    ['real-user-readiness', 'test-artifacts/0s-real-user-readiness/2026-05-31T20-15-10-813Z/receipt.json']
  ]
};

function byFamily(rows) {
  const groups = new Map();
  for (const row of rows) {
    const family = row.canonical_family || 'unmapped';
    if (!groups.has(family)) groups.set(family, []);
    groups.get(family).push(row);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function titleFromFamily(family) {
  return family
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function evidenceForFamily(family) {
  const evidence = [
    {
      id: 'per-app-route-source-stress-row',
      path: 'test-artifacts/0s-per-app-operating-proof/0s-per-app-operating-proof-latest.json',
      mode: 'per_app_row_ok',
      required: true
    }
  ];
  evidence.push({
    id: 'read-only-app-live-http',
    path: 'test-artifacts/0s-read-only-apps-live-http/0s-read-only-apps-live-http-latest.json',
    mode: 'read_only_app_proof',
    applies_to_profiles: ['read_only_static', 'proof_asset'],
    required: true
  });
  if (operatingDepthFamilies.has(family)) {
    evidence.push({
      id: 'operating-depth-closeout-behavior-proof',
      path: 'test-artifacts/0s-operating-depth-closeout/0s-operating-depth-closeout-live-http-latest.json',
      mode: 'behavior_proof',
      workflow_id: family,
      required: true
    });
  }
  for (const [id, receiptPath] of familyEvidence[family] || []) {
    evidence.push({
      id,
      path: receiptPath,
      mode: 'ok_true',
      required: true
    });
  }
  return evidence;
}

async function main() {
  const matrix = JSON.parse(await fs.readFile(matrixPath, 'utf8'));
  const rows = matrix.app_behavior_matrix?.rows || [];
  if (!rows.length) throw new Error(`No app rows found in ${matrixPath}`);
  const current = await fs.readFile(outPath, 'utf8').then((text) => JSON.parse(text)).catch(() => ({ scenarios: [] }));
  const mountedAppIds = new Set(rows.map((row) => row.id));
  const preservedExactScenarios = (current.scenarios || [])
    .filter((scenario) => mountedAppIds.has(scenario.app_id))
    .sort((a, b) => a.app_id.localeCompare(b.app_id));

  const familyScenarios = byFamily(rows).map(([family, apps]) => {
    const sorted = apps.slice().sort((a, b) => a.id.localeCompare(b.id));
    return {
      app_id: family,
      label: `${titleFromFamily(family)} mounted app family`,
      profile: 'mixed_family',
      coverage_scope: 'all_family_apps',
      covered_app_ids: sorted.map((app) => app.id),
      behaviors: [...new Set([...statefulBehaviors, ...readOnlyBehaviors])],
      human_paths: [
        'shared FS27/SkyGate/Free99 unauthenticated gate and authenticated render for every mounted route in this family',
        'per-mounted-app source file presence, source marker integrity, provenance hash, and non-browser route stress basis',
        'workflow create/read/update-or-closeout/readback/stress proof where the family owns stateful behavior',
        'Founder Command, Command Bridge, or owner ledger visibility for stateful workflow receipts',
        ...sorted.map((app) => `${app.id}: ${app.mounted_path}`)
      ],
      evidence_receipts: evidenceForFamily(family)
    };
  });
  const scenarios = [
    ...preservedExactScenarios,
    ...familyScenarios.filter((scenario) => !preservedExactScenarios.some((exact) => exact.app_id === scenario.app_id))
  ];

  const manifest = {
    schema: 'metraiyux.0s.app-deep-closure-scenarios.v2',
    generated_at: new Date().toISOString(),
    standard: 'A mounted app is not closed by a 200 alone. This manifest requires each mounted app to have its own route/source/stress row plus a strict workflow-family behavior receipt or an app-family live proof with create/read/update-or-closeout/readback/stress/Founder Command or command-event evidence. Browser proof remains owner-handled until the owner re-enables it after non-browser closure.',
    scenario_defaults: {
      stateful_required_behaviors: statefulBehaviors,
      read_only_required_behaviors: readOnlyBehaviors
    },
    scenarios
  };
  await fs.writeFile(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: true,
    path: path.relative(repoRoot, outPath),
    scenario_count: scenarios.length,
    app_count: rows.length,
    families: scenarios.map((scenario) => scenario.app_id)
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
