import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createMemoryWorkspaceStore, validateWorkspaceSnapshot } from './shared-workspace-store.mjs';
import { materializeSeeds } from './seed-etl-worker.mjs';
import { planBuildExecution, executeBuildPlan } from './build-executor.mjs';
import { runIssuePatchLoop } from './task-runner.mjs';
import { validateProviderPack } from './provider-lifecycle.mjs';

function hash(value) { return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex'); }
async function exists(filePath) { try { await fs.access(filePath); return true; } catch { return false; } }
async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }

async function scanPublicClaims(rootDir) {
  const websitePath = path.join(rootDir, 'index.html');
  const appPath = path.join(rootDir, 'app.html');
  const readmePath = path.join(rootDir, 'README.md');
  const website = await fs.readFile(websitePath, 'utf8').catch(() => '');
  const app = await fs.readFile(appPath, 'utf8').catch(() => '');
  const readme = await fs.readFile(readmePath, 'utf8').catch(() => '');
  const claimText = `${website}\n${app}\n${readme}`;
  const forbidden = [
    { pattern: /fully\s+production\s+ready/i, label: 'fully production ready' },
    { pattern: /enterprise[-\s]grade\s+complete/i, label: 'enterprise-grade complete' },
    { pattern: /only\s+live\s+provider\s+vars\s+missing/i, label: 'only live provider vars missing' },
    { pattern: /100%\s+complete/i, label: '100% complete' },
  ];
  const violations = forbidden.filter(item => item.pattern.test(claimText)).map(item => item.label);
  return { ok: violations.length === 0, violations, scanned: ['index.html', 'app.html', 'README.md'].filter(Boolean) };
}

async function scanGatewayPolicy(rootDir) {
  const files = ['index.html', 'app.html', 'src/client/workspace-api-client.js'];
  const executableDirectProviderRe = /(fetch|axios|endpoint|baseURL|url)\s*[:(=]\s*['\"]https:\/\/(api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|api\.mistral\.ai|api\.groq\.com)/i;
  const findings = [];
  for (const file of files) {
    const full = path.join(rootDir, file);
    const text = await fs.readFile(full, 'utf8').catch(() => '');
    const lines = text.split(/\n/);
    lines.forEach((line, index) => {
      if (executableDirectProviderRe.test(line)) findings.push({ file, line: index + 1, message: 'executable direct provider endpoint present outside gateway adapter' });
    });
  }
  return { ok: findings.length === 0, findings };
}

async function verifyWorkspaceConcurrency() {
  const store = createMemoryWorkspaceStore({ maxVersions: 5 });
  const identity = { tenantId: 'closure-tenant', userId: 'closure-operator', roles: ['owner'] };
  const snapshotA = { id: 'closure', name: 'Closure', files: [{ path: 'index.html', text: '<h1>A</h1>' }] };
  const snapshotB = { id: 'closure', name: 'Closure', files: [{ path: 'index.html', text: '<h1>B</h1>' }, { path: 'README.md', text: '# B' }] };
  const first = await store.saveWorkspace({ identity, workspaceId: 'closure', snapshot: snapshotA });
  let conflict = false;
  try { await store.saveWorkspace({ identity, workspaceId: 'closure', snapshot: snapshotB, expectedLatestVersionId: 'stale-version' }); }
  catch (error) { conflict = error.code === 'WORKSPACE_VERSION_CONFLICT'; }
  const second = await store.saveWorkspace({ identity, workspaceId: 'closure', snapshot: snapshotB, expectedLatestVersionId: first.latestVersionId });
  const versions = await store.listWorkspaceVersions({ identity, workspaceId: 'closure' });
  return { ok: conflict && versions.length === 2 && second.diff.summary.changed === 1, conflict, versions: versions.length, latestVersionId: second.latestVersionId };
}

async function verifySeedAndBuild(rootDir) {
  const etl = await materializeSeeds({ rootDir, outDir: 'generated/platform-data', chunkSize: 200 });
  const plan = await planBuildExecution({ rootDir });
  const build = await executeBuildPlan({ rootDir, plan, stages: ['test'], dryRun: true, receiptsDir: 'generated/build-receipts' });
  return {
    ok: etl.businessDirectory.length >= 1 && build.status === 'planned',
    seed: { businesses: etl.businessDirectory.length, issues: etl.validation.issues.length, chunks: etl.chunks.length, outDir: etl.outDir },
    build: { status: build.status, receiptPath: build.receiptPath, stages: build.stages.map(stage => ({ stage: stage.stage, status: stage.status })) },
  };
}

async function verifyTaskLoop(rootDir) {
  const run = await runIssuePatchLoop({
    rootDir,
    issues: [
      { id: 'closure-readme', title: 'README documentation proof', category: 'documentation', action: 'Create README if missing' },
      { id: 'closure-provider', title: 'Provider gateway policy ledger', category: 'provider', action: 'Write gateway policy' },
    ],
    files: { 'package.json': JSON.stringify({ name: 'closure-fixture', scripts: {} }, null, 2) },
    outDir: 'generated/task-receipts',
    artifactDir: 'generated/task-artifacts',
    materialize: true,
  });
  return { ok: run.run.status === 'completed' && !!run.run.artifactDir, status: run.run.status, receipts: run.run.receipts.length, artifactDir: run.run.artifactDir, finalFileCount: run.run.finalFileCount };
}

async function verifyProviderPacks(rootDir) {
  const packsDir = path.join(rootDir, 'platform-seed', 'provider-packs');
  const entries = (await fs.readdir(packsDir).catch(() => [])).filter(file => file.endsWith('.json'));
  const results = [];
  for (const file of entries) {
    const pack = JSON.parse(await fs.readFile(path.join(packsDir, file), 'utf8'));
    const validation = validateProviderPack(pack);
    results.push({ file, id: pack.id || null, ok: validation.ok, issues: validation.issues });
  }
  return { ok: results.every(result => result.ok), results };
}

export async function runPlatformClosure({ rootDir = process.cwd(), outDir = 'generated/closure-receipts' } = {}) {
  const startedAt = new Date().toISOString();
  const checks = {};
  checks.snapshotValidator = validateWorkspaceSnapshot({ files: [{ path: 'src/app.js', text: 'console.log(1)' }] });
  checks.workspaceConcurrency = await verifyWorkspaceConcurrency();
  checks.seedAndBuild = await verifySeedAndBuild(rootDir);
  checks.taskLoop = await verifyTaskLoop(rootDir);
  checks.providerPacks = await verifyProviderPacks(rootDir);
  checks.gatewayPolicy = await scanGatewayPolicy(rootDir);
  checks.publicClaims = await scanPublicClaims(rootDir);
  checks.requiredFiles = {
    ok: (await Promise.all(['index.html', 'app.html', 'assets/skaixu-mark.svg', 'site.webmanifest', 'src/client/platform-client.js', 'tools/playwright-browser-proof.mjs', 'netlify/functions/platform-workspaces.mjs', 'netlify/functions/platform-seed-etl.mjs'].map(async file => [file, await exists(path.join(rootDir, file))]))).every(([, ok]) => ok),
  };
  const failed = Object.entries(checks).filter(([, check]) => check && check.ok === false).map(([name]) => name);
  const receipt = {
    id: `closure_${Date.now().toString(36)}_${hash(checks).slice(0, 8)}`,
    type: 'SKAI_PLATFORM_CLOSURE_RECEIPT',
    startedAt,
    finishedAt: new Date().toISOString(),
    status: failed.length ? 'needs-work' : 'passed',
    failed,
    checks,
  };
  receipt.receiptHash = hash(receipt);
  const outputRoot = path.isAbsolute(outDir) ? outDir : path.join(rootDir, outDir);
  await ensureDir(outputRoot);
  const receiptPath = path.join(outputRoot, `${receipt.id}.json`);
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  return { ...receipt, receiptPath: path.relative(rootDir, receiptPath).replaceAll(path.sep, '/') };
}
