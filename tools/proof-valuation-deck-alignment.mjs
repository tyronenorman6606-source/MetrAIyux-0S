#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(repoRoot, 'test-artifacts', 'valuation-deck-alignment');
const stampedPath = path.join(outDir, stamp, 'receipt.json');
const latestPath = path.join(outDir, 'valuation-deck-alignment-latest.json');

const sources = {
  truth_ledger: 'test-artifacts/0s-truth-ledger/0s-truth-ledger-latest.json',
  public_truth_ledger: 'metraiyux_0s_site/proof/0s-truth-ledger.json',
  operating_matrix: 'test-artifacts/0s-operating-proof-matrix/0s-operating-proof-matrix-latest.json',
  live_capability_watch: 'test-artifacts/0s-live-capability-watch/0s-live-capability-watch-latest.json',
  worker_deploy: 'test-artifacts/0s-worker-deploy/founder-command-full-worker-deploy-latest.json',
  valuation_source: 'metraiyux_0s_site/data/valuation-source-of-truth.json',
  operating_proof_map: 'metraiyux_0s_site/docs/FOUNDER_COMMAND_0S_OPERATING_PROOF_MAP_2026-05-27.md'
};

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
  } catch {
    return null;
  }
}

function readText(relativePath) {
  try {
    return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  } catch {
    return '';
  }
}

function stat(relativePath) {
  try {
    const file = path.join(repoRoot, relativePath);
    const item = fs.statSync(file);
    return { path: relativePath, exists: true, bytes: item.size, mtime: item.mtime.toISOString() };
  } catch {
    return { path: relativePath, exists: false, bytes: 0, mtime: '' };
  }
}

function generatedAt(data = {}) {
  return data.generated_at || data.generatedAt || data.checked_at || data.checkedAt || '';
}

async function main() {
  const sourceStats = Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, stat(value)]));
  const truth = readJson(sources.truth_ledger);
  const publicTruth = readJson(sources.public_truth_ledger);
  const matrix = readJson(sources.operating_matrix);
  const watch = readJson(sources.live_capability_watch);
  const deploy = readJson(sources.worker_deploy);
  const valuation = readJson(sources.valuation_source);
  const proofMap = readText(sources.operating_proof_map);
  const requiredReadable = [
    'truth_ledger',
    'public_truth_ledger',
    'operating_matrix',
    'live_capability_watch',
    'valuation_source',
    'operating_proof_map'
  ];
  const missing = requiredReadable.filter((key) => !sourceStats[key].exists);
  const currentSummary = truth?.summary || {};
  const matrixSummary = matrix?.behavior_matrix || {};
  const watchSummary = watch?.summary || {};
  const valuationText = JSON.stringify(valuation || {});
  const knownTruthNumbersPresent = [
    String(currentSummary.total ?? ''),
    String(currentSummary.built ?? ''),
    String(currentSummary.partial ?? '')
  ].filter(Boolean).every((value) => valuationText.includes(value) || proofMap.includes(value));
  const ledgerFreshness = {
    truth_ledger_generated_at: generatedAt(truth),
    public_truth_ledger_generated_at: generatedAt(publicTruth),
    operating_matrix_generated_at: generatedAt(matrix),
    live_capability_watch_generated_at: generatedAt(watch),
    worker_deploy_generated_at: generatedAt(deploy)
  };
  const staleSignals = [
    !knownTruthNumbersPresent ? 'valuation_source_or_proof_map_does_not_include_current_truth_ledger_counts' : '',
    matrixSummary.red > 0 ? 'operating_matrix_has_red_lanes' : '',
    (currentSummary.p0_not_built || []).length ? 'p0_repair_queue_still_open' : '',
    !deploy ? 'latest_worker_deploy_receipt_not_found_or_not_json' : ''
  ].filter(Boolean);

  const aligned = staleSignals.length === 0;
  const receipt = {
    ok: missing.length === 0 && aligned,
    schema: 'metraiyux.0s.valuation-deck-alignment.v1',
    generated_at: new Date().toISOString(),
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    aligned,
    open_update_required: staleSignals.length > 0,
    source_files: sourceStats,
    ledger_freshness: ledgerFreshness,
    current_truth_summary: currentSummary,
    operating_matrix_summary: {
      route_failures: matrix?.route_matrix?.failures ?? null,
      behavior_green: matrixSummary.green ?? null,
      behavior_yellow: matrixSummary.yellow ?? null,
      behavior_red: matrixSummary.red ?? null
    },
    live_capability_watch_summary: watchSummary,
    stale_signals: staleSignals,
    next_build_step: 'Regenerate valuation/deck public claims from the latest truth ledger, operating matrix, Worker deploy receipt, and live capability watch before using them as investor/customer proof.',
    failures: missing.map((key) => `${key} missing: ${sources[key]}`)
  };

  await fsp.mkdir(path.dirname(stampedPath), { recursive: true });
  await fsp.writeFile(stampedPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fsp.mkdir(outDir, { recursive: true });
  await fsp.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    aligned: receipt.aligned,
    open_update_required: receipt.open_update_required,
    receipt: path.relative(repoRoot, stampedPath).split(path.sep).join('/'),
    latest: path.relative(repoRoot, latestPath).split(path.sep).join('/'),
    stale_signals: receipt.stale_signals,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
