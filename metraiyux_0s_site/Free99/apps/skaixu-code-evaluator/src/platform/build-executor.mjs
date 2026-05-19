import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildFrameworkAdapterManifest, loadProjectFileMap } from './framework-adapters.mjs';

const DEFAULT_TIMEOUT_MS = 120_000;
const SAFE_COMMAND_RE = /^(npm|pnpm|yarn|node|npx)\b/;
const BLOCKED_COMMAND_RE = /\b(rm\s+-rf|sudo|curl\b|wget\b|ssh\b|scp\b|ftp\b|deploy\b|wrangler\s+deploy|netlify\s+deploy)\b/i;
const LOG_LIMIT = 80_000;

function hash(value) { return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex'); }
function truncate(text, limit = LOG_LIMIT) {
  const value = String(text || '');
  return value.length > limit ? `${value.slice(0, limit)}\n...[truncated ${value.length - limit} chars]` : value;
}

function splitCommand(command) {
  const parts = String(command || '').match(/(?:"[^"]*"|'[^']*'|\S+)/g) || [];
  return parts.map(part => part.replace(/^['"]|['"]$/g, ''));
}

export function validateBuildCommand(command) {
  const text = String(command || '').trim();
  const issues = [];
  if (!text) issues.push('command is empty');
  if (!SAFE_COMMAND_RE.test(text)) issues.push('command must start with npm, pnpm, yarn, node, or npx');
  if (BLOCKED_COMMAND_RE.test(text)) issues.push('deployment/destructive/network shell commands are blocked');
  if (/[;&|`$<>]/.test(text)) issues.push('shell metacharacters are blocked; use a single command');
  return { ok: issues.length === 0, issues, command: text, commandHash: hash(text) };
}

export async function planBuildExecution({ rootDir = process.cwd(), files = null } = {}) {
  const fileMap = files || await loadProjectFileMap(rootDir);
  const manifest = buildFrameworkAdapterManifest(fileMap);
  const commands = [];
  for (const [stage, command] of Object.entries(manifest.commands || {})) {
    if (!command) continue;
    const validation = validateBuildCommand(command);
    commands.push({ stage, command, commandHash: validation.commandHash, runnable: validation.ok, issues: validation.issues });
  }
  return {
    generatedAt: new Date().toISOString(),
    rootDir,
    primaryFramework: manifest.primaryFramework,
    commandCount: commands.length,
    commands,
    manifest,
  };
}

export async function executeBuildPlan({ rootDir = process.cwd(), plan = null, stages = ['test'], timeoutMs = DEFAULT_TIMEOUT_MS, dryRun = false, receiptsDir = 'generated/build-receipts' } = {}) {
  const executionPlan = plan || await planBuildExecution({ rootDir });
  const requestedStages = Array.isArray(stages) && stages.length ? stages.map(String) : ['test'];
  const selected = executionPlan.commands.filter(item => requestedStages.includes(item.stage));
  const receipt = {
    id: `build_${Date.now().toString(36)}_${hash({ rootDir, requestedStages, dryRun }).slice(0, 8)}`,
    type: 'SKAI_BUILD_EXECUTION_RECEIPT',
    startedAt: new Date().toISOString(),
    rootDir,
    dryRun,
    requestedStages,
    primaryFramework: executionPlan.primaryFramework,
    planHash: hash(executionPlan),
    stages: [],
    status: 'running',
    issues: [],
  };

  if (!selected.length) {
    receipt.status = 'blocked';
    receipt.issues.push(`No build commands matched requested stages: ${requestedStages.join(', ')}`);
  }

  for (const item of selected) {
    const stageReceipt = {
      stage: item.stage,
      command: item.command,
      commandHash: item.commandHash || hash(item.command),
      startedAt: new Date().toISOString(),
      status: 'pending',
      stdout: '',
      stderr: '',
      exitCode: null,
      issues: item.issues || [],
    };
    if (!item.runnable) {
      stageReceipt.status = 'blocked';
      stageReceipt.finishedAt = new Date().toISOString();
      receipt.stages.push(stageReceipt);
      continue;
    }
    if (dryRun) {
      stageReceipt.status = 'planned';
      stageReceipt.exitCode = 0;
      stageReceipt.finishedAt = new Date().toISOString();
      receipt.stages.push(stageReceipt);
      continue;
    }
    const [cmd, ...args] = splitCommand(item.command);
    await new Promise(resolve => {
      const child = spawn(cmd, args, { cwd: rootDir, env: process.env, shell: false });
      const timer = setTimeout(() => { stageReceipt.status = 'timeout'; child.kill('SIGTERM'); }, timeoutMs);
      child.stdout.on('data', chunk => { stageReceipt.stdout = truncate(stageReceipt.stdout + chunk.toString()); });
      child.stderr.on('data', chunk => { stageReceipt.stderr = truncate(stageReceipt.stderr + chunk.toString()); });
      child.on('close', code => {
        clearTimeout(timer);
        stageReceipt.exitCode = code;
        stageReceipt.finishedAt = new Date().toISOString();
        if (stageReceipt.status !== 'timeout') stageReceipt.status = code === 0 ? 'passed' : 'failed';
        receipt.stages.push(stageReceipt);
        resolve();
      });
      child.on('error', error => {
        clearTimeout(timer);
        stageReceipt.status = 'failed';
        stageReceipt.stderr = truncate(`${stageReceipt.stderr}\n${error.message}`);
        stageReceipt.finishedAt = new Date().toISOString();
        receipt.stages.push(stageReceipt);
        resolve();
      });
    });
  }
  receipt.finishedAt = new Date().toISOString();
  if (receipt.status !== 'blocked') {
    receipt.status = receipt.stages.every(stage => ['passed', 'planned'].includes(stage.status)) ? (dryRun ? 'planned' : 'passed') : 'needs-work';
  }
  receipt.receiptHash = hash({ ...receipt, stdout: undefined, stderr: undefined });
  const outDir = path.isAbsolute(receiptsDir) ? receiptsDir : path.join(rootDir, receiptsDir);
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${receipt.id}.json`);
  await fs.writeFile(outPath, `${JSON.stringify(receipt, null, 2)}\n`);
  return { ...receipt, receiptPath: path.relative(rootDir, outPath).replaceAll(path.sep, '/') };
}
