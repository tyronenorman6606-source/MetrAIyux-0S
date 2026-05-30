#!/usr/bin/env node
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'metraiyux_0s_site', 'data', '0s-closure-workflows.json');
const artifactRoot = path.join(repoRoot, 'test-artifacts', '0s-closure-cycle');
const latestPath = path.join(artifactRoot, '0s-closure-cycle-latest.json');
const args = new Set(process.argv.slice(2));
const runLive = args.has('--run');
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map((item) => item.trim()).filter(Boolean)) : null;
const timeoutArg = process.argv.find((arg) => arg.startsWith('--timeout-ms='));
const timeoutMs = Math.max(15_000, Math.min(15 * 60_000, Number(timeoutArg?.split('=')[1] || 180_000) || 180_000));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const cyclePath = path.join(artifactRoot, stamp, 'receipt.json');

function normalizeDate(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function readJsonIfExists(file) {
  if (!file || !fssync.existsSync(file)) return null;
  try {
    return JSON.parse(fssync.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function workflowPriorityRank(priority = '') {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[priority] ?? 9;
}

function receiptSummary(workflow) {
  const receiptPath = workflow.receipt_path ? path.resolve(repoRoot, workflow.receipt_path) : '';
  const receipt = readJsonIfExists(receiptPath);
  const exists = Boolean(receipt);
  const ok = exists ? Boolean(receipt.ok) : false;
  const generatedAt = normalizeDate(receipt?.generatedAt || receipt?.generated_at || receipt?.generated_at_utc || receipt?.timestamp);
  const failures = Array.isArray(receipt?.failures) ? receipt.failures : [];
  const warnings = Array.isArray(receipt?.warnings) ? receipt.warnings : [];
  return {
    path: workflow.receipt_path || '',
    exists,
    ok,
    generated_at: generatedAt,
    failures,
    warnings
  };
}

function classify(workflow, receipt) {
  const gaps = Array.isArray(workflow.open_gaps) ? workflow.open_gaps.filter(Boolean) : [];
  if (workflow.current_truth === 'green' && gaps.length === 0 && (!workflow.receipt_path || receipt.ok)) return 'green';
  if (workflow.current_truth === 'not_started') return 'red';
  if (workflow.current_truth === 'green' && workflow.receipt_path && !receipt.ok) return 'yellow';
  if (gaps.length > 0) return 'yellow';
  if (receipt.exists && receipt.ok) return 'yellow';
  return 'red';
}

function shellRun(command, ms) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, {
      cwd: repoRoot,
      shell: true,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, ms);
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 12000) stdout = stdout.slice(-12000);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 12000) stderr = stderr.slice(-12000);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        command,
        code,
        signal,
        ok: code === 0,
        elapsed_ms: Date.now() - started,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timed_out: signal === 'SIGTERM' && Date.now() - started >= ms
      });
    });
  });
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const selected = manifest.workflows
    .filter((workflow) => !only || only.has(workflow.id))
    .sort((a, b) => workflowPriorityRank(a.priority) - workflowPriorityRank(b.priority) || a.id.localeCompare(b.id));

  const results = [];
  for (const workflow of selected) {
    const before = receiptSummary(workflow);
    let run = null;
    if (runLive && workflow.fresh_eligible && workflow.proof_command) {
      run = await shellRun(workflow.proof_command, timeoutMs);
    }
    const after = receiptSummary(workflow);
    const receipt = run ? after : before;
    results.push({
      id: workflow.id,
      priority: workflow.priority,
      surface: workflow.surface,
      current_truth: workflow.current_truth,
      closure_state: classify(workflow, receipt),
      owner_url: workflow.owner_url || '',
      proof_command: workflow.proof_command || '',
      run,
      receipt,
      required_steps: workflow.required_steps || [],
      green_evidence: workflow.green_evidence || [],
      open_gaps: workflow.open_gaps || []
    });
  }

  const counts = results.reduce((out, row) => {
    out[row.closure_state] = (out[row.closure_state] || 0) + 1;
    out[row.priority] = (out[row.priority] || 0) + 1;
    return out;
  }, {});
  const p0Open = results.filter((row) => row.priority === 'P0' && row.closure_state !== 'green');
  const nextTargets = results
    .filter((row) => row.closure_state !== 'green')
    .sort((a, b) => workflowPriorityRank(a.priority) - workflowPriorityRank(b.priority) || b.open_gaps.length - a.open_gaps.length)
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      priority: row.priority,
      state: row.closure_state,
      first_gap: row.open_gaps[0] || 'No green receipt yet.',
      proof_command: row.proof_command
    }));

  const receipt = {
    ok: p0Open.length === 0,
    schema: 'metraiyux.0s.closure-cycle.receipt.v1',
    generated_at: new Date().toISOString(),
    mode: runLive ? 'run-live-eligible-proofs' : 'scan-existing-receipts',
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    manifest: path.relative(repoRoot, manifestPath),
    counts,
    p0_open: p0Open.map((row) => ({
      id: row.id,
      state: row.closure_state,
      gaps: row.open_gaps
    })),
    next_targets: nextTargets,
    workflows: results
  };

  await fs.mkdir(path.dirname(cyclePath), { recursive: true });
  await fs.writeFile(cyclePath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(artifactRoot, { recursive: true });
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    mode: receipt.mode,
    receipt: path.relative(repoRoot, cyclePath),
    latest: path.relative(repoRoot, latestPath),
    counts,
    p0_open: receipt.p0_open,
    next_targets: receipt.next_targets
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
