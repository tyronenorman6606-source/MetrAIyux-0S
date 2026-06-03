#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyevault-agent-auto-install');
const latestPath = path.join(artifactDir, 'latest.json');
const secretPortalKey = 'proof_portal_secret_should_not_print';
const secretPassphrase = 'proof-passphrase-should-not-print';

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function run(name, commandArgs, options = {}) {
  const started = Date.now();
  const result = spawnSync(commandArgs[0], commandArgs.slice(1), {
    cwd: options.cwd || repoRoot,
    env: options.env || process.env,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20
  });
  return {
    name,
    ok: result.status === 0,
    status: result.status,
    durationMs: Date.now() - started,
    stdout: String(result.stdout || '').slice(-4000),
    stderr: String(result.stderr || '').slice(-4000)
  };
}

function parseJson(text) {
  return JSON.parse(String(text || '{}'));
}

function check(receipt, name, ok, details = {}) {
  const row = { name, ok: Boolean(ok), ...details };
  receipt.checks.push(row);
  if (!row.ok) receipt.blockers.push(row);
  return row;
}

function hasSecretLeak(value) {
  const text = JSON.stringify(value);
  return text.includes(secretPortalKey) || text.includes(secretPassphrase);
}

function createRepo(repo) {
  fs.mkdirSync(repo, { recursive: true });
  const steps = [
    ['git init', ['git', 'init', '-q']],
    ['git config email', ['git', 'config', 'user.email', 'proof@example.com']],
    ['git config name', ['git', 'config', 'user.name', 'SkyeVault Auto Proof']]
  ];
  for (const [name, args] of steps) {
    const step = run(name, args, { cwd: repo });
    if (!step.ok) throw new Error(`${name} failed: ${step.stderr || step.stdout}`);
  }
  fs.writeFileSync(path.join(repo, 'alpha.txt'), 'alpha baseline\n');
  fs.mkdirSync(path.join(repo, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'nested', 'beta.txt'), 'beta baseline\n');
  let step = run('git add', ['git', 'add', '.'], { cwd: repo });
  if (!step.ok) throw new Error(`git add failed: ${step.stderr || step.stdout}`);
  step = run('git commit', ['git', 'commit', '-q', '-m', 'baseline'], { cwd: repo });
  if (!step.ok) throw new Error(`git commit failed: ${step.stderr || step.stdout}`);
  fs.writeFileSync(path.join(repo, 'untracked.md'), 'untracked baseline\n');
}

function localArchivePath(manifest) {
  const latest = manifest.release?.latestArchiveUrl || '/downloads/skyevault-agent/releases/latest/skyevault-agent-latest.tar.gz';
  return path.join(repoRoot, 'metraiyux_0s_site', latest.replace(/^\/+/, ''));
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const receipt = {
  ok: false,
  schema: 'skyevault.agent.auto-install-proof.v1',
  generatedAt: new Date().toISOString(),
  checks: [],
  blockers: [],
  commands: []
};

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skyevault-agent-auto-install-proof-'));
try {
  const pack = run('package current agent release', [process.execPath, path.join(repoRoot, 'tools', 'skyevault-agent-package.mjs'), 'pack']);
  receipt.commands.push(pack);
  check(receipt, 'Release package builds before auto-install proof', pack.ok, { status: pack.status });

  const manifestPath = path.join(repoRoot, 'metraiyux_0s_site', 'downloads', 'skyevault-agent', 'latest.json');
  const manifest = readJson(manifestPath, {});
  const archivePath = localArchivePath(manifest);
  check(receipt, 'Release manifest points at a local package archive', fs.existsSync(archivePath), {
    manifest: rel(manifestPath),
    archive: rel(archivePath),
    version: manifest.package?.version || '',
    bytes: manifest.release?.bytes || 0,
    sha256: manifest.release?.sha256 || ''
  });

  const extractRoot = path.join(tempRoot, 'extract');
  fs.mkdirSync(extractRoot, { recursive: true });
  const extract = run('extract current release package', ['tar', '-xzf', archivePath, '-C', extractRoot]);
  receipt.commands.push(extract);
  const packageRoot = path.join(extractRoot, 'skyevault-agent');
  check(receipt, 'Release package extracts with install script', extract.ok && fs.existsSync(path.join(packageRoot, 'install.sh')), {
    packageRoot
  });

  const proofRepo = path.join(tempRoot, 'repo');
  createRepo(proofRepo);
  const home = path.join(tempRoot, 'home');
  const installDir = path.join(tempRoot, 'runtime');
  const configDir = path.join(tempRoot, 'config');
  const stateDir = path.join(tempRoot, 'state');
  const envFile = path.join(configDir, 'skyevault-agent.env');
  fs.mkdirSync(home, { recursive: true });
  const proofEnv = {
    ...process.env,
    HOME: home,
    SKYEVAULT_AGENT_INSTALL_DIR: installDir,
    SKYEVAULT_AGENT_CONFIG_DIR: configDir,
    SKYEVAULT_AGENT_ENV_FILE: envFile,
    SKYEVAULT_AGENT_STATE_DIR: stateDir,
    SKYEVAULT_AGENT_AUTO_INSTALL: '1',
    SKYEVAULT_AGENT_SERVICE_MODE: 'none',
    SKYEVAULT_AGENT_UPLOAD: '0',
    SKYEVAULT_AGENT_JSON: '1',
    SKYEVAULT_WORKSPACE_ID: 'auto-install-proof',
    SKYEVAULT_REPO_PATH: proofRepo,
    SKYEVAULT_DROP_URL: 'http://127.0.0.1:65535',
    SKYEVAULT_PORTAL_KEY: secretPortalKey,
    SKYEVAULT_AGENT_PASSPHRASE: secretPassphrase
  };

  const autoInstall = run('run shipped install.sh in auto-install mode', ['bash', path.join(packageRoot, 'install.sh')], {
    cwd: packageRoot,
    env: proofEnv
  });
  receipt.commands.push(autoInstall);
  const autoBody = parseJson(autoInstall.stdout);
  const autoReceiptPath = autoBody.receiptPath || path.join(stateDir, 'auto-install-receipt.json');
  const autoReceipt = readJson(autoReceiptPath, {});
  const envMode = fs.existsSync(envFile) ? (fs.statSync(envFile).mode & 0o777).toString(8) : '';
  check(receipt, 'Auto-install exits cleanly, writes config/env/receipt, and does not print secrets', autoInstall.ok
    && autoBody.ok === true
    && fs.existsSync(path.join(stateDir, 'config.json'))
    && fs.existsSync(envFile)
    && fs.existsSync(autoReceiptPath)
    && envMode === '600'
    && !hasSecretLeak({ stdout: autoInstall.stdout, stderr: autoInstall.stderr, autoReceipt }), {
    status: autoInstall.status,
    envMode,
    configPath: rel(path.join(stateDir, 'config.json')),
    autoReceiptPath: rel(autoReceiptPath),
    firstSyncKind: autoReceipt.firstSync?.kind || '',
    serviceMode: autoReceipt.service?.mode || ''
  });

  const fullReceiptPath = autoReceipt.firstSync?.receiptPath || '';
  const fullReceipt = readJson(fullReceiptPath, {});
  check(receipt, 'Auto-install creates the first mutable current mirror without upload in proof mode', fullReceipt.kind === 'current'
    && fullReceipt.fileCount >= 4
    && fullReceipt.upload?.reason === 'upload_not_requested', {
    fullReceiptPath,
    fileCount: fullReceipt.fileCount || 0,
    totalBytes: fullReceipt.totalBytes || 0,
    restoreKitPath: fullReceipt.restoreKitPath || '',
    uploadReason: fullReceipt.upload?.reason || ''
  });

  fs.writeFileSync(path.join(proofRepo, 'alpha.txt'), 'alpha changed by auto proof\n');
  fs.rmSync(path.join(proofRepo, 'nested', 'beta.txt'), { force: true });
  fs.writeFileSync(path.join(proofRepo, 'gamma.txt'), 'gamma after install\n');
  const installedCli = path.join(installDir, 'bin', 'skyevault-agent.mjs');
  const delta = run('run installed CLI mutable current sync after repo changes', [
    process.execPath,
    installedCli,
    'sync',
    '--workspace=auto-install-proof',
    `--repo=${proofRepo}`,
    '--json'
  ], { env: proofEnv });
  receipt.commands.push(delta);
  const deltaReceipt = parseJson(delta.stdout);
  check(receipt, 'Installed auto-configured CLI updates the same mutable current mirror after repo changes', delta.ok
    && deltaReceipt.kind === 'current'
    && deltaReceipt.changedFileCount === 2
    && deltaReceipt.tombstoneCount === 1, {
    deltaReceiptPath: deltaReceipt.receiptPath || '',
    model: deltaReceipt.model || '',
    changedFileCount: deltaReceipt.changedFileCount || 0,
    tombstoneCount: deltaReceipt.tombstoneCount || 0
  });

  const verify = run('verify auto-install mutable current receipt', [
    process.execPath,
    installedCli,
    'verify',
    `--receipt=${fullReceiptPath}`,
    '--json'
  ], { env: proofEnv });
  receipt.commands.push(verify);
  check(receipt, 'Installed CLI verifies the mutable current mirror receipt', verify.ok && parseJson(verify.stdout).ok === true, {
    status: verify.status
  });

  const restoreRoot = path.join(tempRoot, 'restore');
  const restore = run('restore auto-install mutable current mirror', [
    process.execPath,
    installedCli,
    'restore',
    `--receipt=${deltaReceipt.receiptPath}`,
    `--out=${restoreRoot}`,
    '--json'
  ], { env: proofEnv });
  receipt.commands.push(restore);
  const restoredOk = fs.existsSync(path.join(restoreRoot, '.git', 'HEAD'))
    && fs.readFileSync(path.join(restoreRoot, 'alpha.txt'), 'utf8') === 'alpha changed by auto proof\n'
    && fs.readFileSync(path.join(restoreRoot, 'gamma.txt'), 'utf8') === 'gamma after install\n'
    && fs.readFileSync(path.join(restoreRoot, 'untracked.md'), 'utf8') === 'untracked baseline\n'
    && !fs.existsSync(path.join(restoreRoot, 'nested', 'beta.txt'));
  check(receipt, 'Restore from mutable current mirror recovers git metadata, untracked work, edits, creates, and deletes', restore.ok && restoredOk, {
    status: restore.status,
    restoredGitMetadata: fs.existsSync(path.join(restoreRoot, '.git', 'HEAD')),
    restoredAlphaSha: fs.existsSync(path.join(restoreRoot, 'alpha.txt')) ? sha256File(path.join(restoreRoot, 'alpha.txt')) : '',
    deletedBetaMissing: !fs.existsSync(path.join(restoreRoot, 'nested', 'beta.txt'))
  });

  receipt.release = {
    version: manifest.package?.version || '',
    archive: rel(archivePath),
    bytes: manifest.release?.bytes || 0,
    sha256: manifest.release?.sha256 || ''
  };
  receipt.autoInstall = {
    envFileMode: envMode,
    autoReceiptPath: rel(autoReceiptPath),
    currentSeedReceiptPath: fullReceiptPath,
    currentUpdateReceiptPath: deltaReceipt.receiptPath || '',
    service: autoReceipt.service || {}
  };
} catch (error) {
  receipt.blockers.push({ name: 'Auto-install proof crashed', ok: false, error: error.message, stack: error.stack });
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

receipt.ok = receipt.blockers.length === 0;
const receiptPath = path.join(artifactDir, `${stamp}.json`);
writeJson(receiptPath, receipt);
writeJson(latestPath, { ...receipt, receiptPath: rel(receiptPath) });

console.log(JSON.stringify({
  ok: receipt.ok,
  receipt: rel(receiptPath),
  latest: rel(latestPath),
  checks: receipt.checks.length,
  failures: receipt.blockers.length,
  release: receipt.release
}, null, 2));

process.exit(receipt.ok ? 0 : 1);
