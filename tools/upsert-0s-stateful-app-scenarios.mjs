#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'metraiyux_0s_site', 'data', '0s-app-deep-closure-scenarios.json');
const proofPath = path.join(repoRoot, 'test-artifacts', '0s-stateful-apps-live-http', '0s-stateful-apps-live-http-latest.json');
const proofRel = path.relative(repoRoot, proofPath).replace(/\\/g, '/');

const behaviors = [
  'human_flow',
  'create',
  'read',
  'update_or_closeout',
  'receipt_readback',
  'stress',
  'founder_command_visible',
  'telemetry_or_command_event'
];

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function scenarioFromProof(proof) {
  return {
    app_id: proof.app_id,
    label: `${proof.name || proof.app_id} exact mounted stateful proof`,
    profile: 'stateful',
    behaviors,
    human_paths: [
      `authenticated mounted route render and stress: ${proof.mounted_path}`,
      `per-app source/provenance row: ${proof.checks?.per_app_route_source_stress?.source_file || '0s per-app proof row'}`,
      `runtime behavior receipt family: ${proof.canonical_family}`,
      `Command Bridge write/readback entity: ${proof.created_id || proof.telemetry_id || proof.app_id}`,
      `proof basis: ${proof.proof_basis || 'mounted stateful app proof'}`
    ],
    evidence_receipts: [
      {
        id: 'per-app-route-source-stress-row',
        path: 'test-artifacts/0s-per-app-operating-proof/0s-per-app-operating-proof-latest.json',
        mode: 'per_app_row_ok',
        required: true
      },
      {
        id: 'stateful-mounted-app-live-http',
        path: proofRel,
        mode: 'stateful_app_proof',
        required: true
      }
    ]
  };
}

async function main() {
  const [manifest, receipt] = await Promise.all([
    readJson(manifestPath, { scenarios: [] }),
    readJson(proofPath)
  ]);
  if (!receipt?.stateful_app_proofs || receipt.ok !== true) {
    throw new Error(`Run node tools/proof-0s-stateful-apps-live-http.mjs successfully before updating ${path.relative(repoRoot, manifestPath)}`);
  }

  const generated = Object.values(receipt.stateful_app_proofs)
    .filter((proof) => proof?.ok === true && proof.app_id)
    .map(scenarioFromProof)
    .sort((a, b) => a.app_id.localeCompare(b.app_id));
  const generatedIds = new Set(generated.map((scenario) => scenario.app_id));
  const existing = Array.isArray(manifest.scenarios) ? manifest.scenarios : [];
  const kept = existing.filter((scenario) => !generatedIds.has(scenario.app_id));
  const next = {
    ...manifest,
    generated_at: new Date().toISOString(),
    scenarios: [...kept, ...generated].sort((a, b) => a.app_id.localeCompare(b.app_id))
  };
  await fs.writeFile(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: true,
    manifest: path.relative(repoRoot, manifestPath),
    upserted: generated.length,
    scenario_count: next.scenarios.length,
    app_ids: [...generatedIds].sort()
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
