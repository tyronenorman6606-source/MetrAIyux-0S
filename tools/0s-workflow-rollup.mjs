#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const manifestPath = path.join(repoRoot, 'metraiyux_0s_site', 'data', '0s-closure-workflows.json');
const artifactRoot = path.join(repoRoot, 'test-artifacts', '0s-workflow-rollups');

function argValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : '';
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
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
      required: true
    };
  }
  return {
    id: item.id || path.basename(item.path || '').replace(/\.json$/i, '') || 'evidence',
    path: item.path || '',
    mode: item.mode || 'ok_true',
    required: item.required !== false,
    note: item.note || ''
  };
}

function evidenceStatus(item) {
  const normalized = normalizeEvidence(item);
  const absolute = path.resolve(repoRoot, normalized.path);
  const exists = Boolean(normalized.path && fs.existsSync(absolute));
  let data = null;
  let parseError = '';
  if (exists) {
    try {
      data = JSON.parse(fs.readFileSync(absolute, 'utf8'));
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
    keys: data ? Object.keys(data).slice(0, 12) : []
  };
}

function outputPaths(workflowId, workflow) {
  const dated = path.join(artifactRoot, workflowId, stamp, 'receipt.json');
  const latest = workflow.rollup_receipt_path
    ? path.resolve(repoRoot, workflow.rollup_receipt_path)
    : path.join(artifactRoot, workflowId, `${workflowId}-latest.json`);
  return { dated, latest };
}

function closureState(ok, workflow) {
  const gaps = Array.isArray(workflow.open_gaps) ? workflow.open_gaps : [];
  if (!ok) return 'blocked_by_evidence';
  return gaps.length ? 'partial' : 'built';
}

async function writeJson(file, value) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const workflowId = argValue('workflow') || process.argv[2] || '';
  if (!workflowId) throw new Error('Usage: node tools/0s-workflow-rollup.mjs --workflow=<workflow-id>');
  const manifest = readJson(manifestPath);
  if (!manifest?.workflows) throw new Error(`Missing closure workflow manifest at ${rel(manifestPath)}`);
  const workflow = manifest.workflows.find((item) => item.id === workflowId);
  if (!workflow) throw new Error(`Workflow ${workflowId} is not declared in ${rel(manifestPath)}`);

  const evidence = Array.isArray(workflow.evidence_receipts) ? workflow.evidence_receipts.map(evidenceStatus) : [];
  const required = evidence.filter((item) => item.required);
  const missingRequired = required.filter((item) => !item.ok);
  const ok = evidence.length > 0 && missingRequired.length === 0;
  const state = closureState(ok, workflow);
  const { dated, latest } = outputPaths(workflowId, workflow);
  const receipt = {
    ok,
    schema: 'metraiyux.0s.workflow-rollup.v1',
    generated_at: new Date().toISOString(),
    workflow_id: workflowId,
    surface: workflow.surface || workflowId,
    priority: workflow.priority || 'P2',
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    closure_state: state,
    source_manifest: rel(manifestPath),
    proof_command: workflow.proof_command || '',
    receipt_path: rel(latest),
    required_evidence_count: required.length,
    evidence_count: evidence.length,
    evidence_ok_count: evidence.filter((item) => item.ok).length,
    missing_required_evidence: missingRequired.map((item) => ({
      id: item.id,
      path: item.path,
      mode: item.mode,
      exists: item.exists,
      parse_error: item.parse_error || ''
    })),
    open_gaps: workflow.open_gaps || [],
    gap_type: workflow.gap_type || '',
    next_build_step: workflow.next_build_step || '',
    evidence
  };

  await writeJson(dated, receipt);
  await writeJson(latest, receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    workflow_id: workflowId,
    closure_state: state,
    receipt: rel(dated),
    latest: rel(latest),
    evidence_ok_count: receipt.evidence_ok_count,
    evidence_count: receipt.evidence_count,
    open_gaps: receipt.open_gaps.length,
    missing_required_evidence: receipt.missing_required_evidence
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
