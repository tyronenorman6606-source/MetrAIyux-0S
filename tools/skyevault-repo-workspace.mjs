import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const command = rawArgs.find((arg) => !arg.startsWith('--')) || 'status';

function argValue(name) {
  const prefix = `${name}=`;
  return rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

function flag(name) {
  return rawArgs.includes(name);
}

function sanitizePart(value, fallback = 'repo') {
  return String(value || fallback)
    .trim()
    .replace(/\.git$/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || fallback;
}

function resolveDir() {
  const dir = argValue('--dir') || argValue('--worktree') || process.cwd();
  return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
}

function stamp() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function git(args, cwd, options = {}) {
  const output = execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
    env: { ...process.env, ...(options.env || {}) }
  });
  return output == null ? '' : String(output).trim();
}

function gitMaybe(args, cwd, fallback = '') {
  try {
    return git(args, cwd);
  } catch {
    return fallback;
  }
}

function hasGit(dir) {
  return fs.existsSync(path.join(dir, '.git')) || gitMaybe(['rev-parse', '--git-dir'], dir, '') !== '';
}

function workspaceConfigPath(dir) {
  return path.join(dir, '.skyevault-workspace.json');
}

function readWorkspaceConfig(dir) {
  try {
    return JSON.parse(fs.readFileSync(workspaceConfigPath(dir), 'utf8'));
  } catch {
    const remoteUrl = gitMaybe(['remote', 'get-url', 'vault'], dir, '');
    return {
      schema: 'skyevault.repo-workspace.v1',
      workspaceId: sanitizePart(argValue('--workspace') || process.env.SKYEVAULT_WORKSPACE_ID || 'default', 'default'),
      repoId: sanitizePart(argValue('--repo') || path.basename(dir), path.basename(dir)),
      remoteName: argValue('--remote') || 'vault',
      remoteUrl
    };
  }
}

function writeWorkspaceConfig(dir, config) {
  fs.writeFileSync(workspaceConfigPath(dir), `${JSON.stringify(config, null, 2)}\n`);
}

function cleanRemoteBase() {
  return String(argValue('--remote-url') || process.env.SKYEVAULT_REMOTE_URL || 'http://127.0.0.1:8787').replace(/\/+$/, '');
}

function buildRemoteUrl(config) {
  const base = cleanRemoteBase();
  return `${base}/${encodeURIComponent(config.workspaceId)}/${encodeURIComponent(config.repoId)}.git`;
}

function authGitArgs() {
  const token = String(process.env.SKYEVAULT_GIT_REMOTE_TOKEN || process.env.SKYEVAULT_TOKEN || '').trim();
  if (!token) return [];
  const header = Buffer.from(`x-token:${token}`).toString('base64');
  return ['-c', `http.extraHeader=Authorization: Basic ${header}`];
}

function ensureWorktree(dir) {
  fs.mkdirSync(dir, { recursive: true });
  if (!hasGit(dir)) git(['init'], dir, { stdio: 'inherit' });
}

function currentBranch(dir) {
  return gitMaybe(['branch', '--show-current'], dir, 'main') || 'main';
}

function writeReceipt(event) {
  const outDir = path.join(root, '.skyevault-out', 'repo-workspace');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `repo-workspace-${event.command}-${stamp()}.json`);
  fs.writeFileSync(file, `${JSON.stringify(event, null, 2)}\n`);
  return file;
}

function statusPayload(dir, config) {
  const branch = currentBranch(dir);
  return {
    schema: 'skyevault.repo-workspace-status.v1',
    checkedAt: new Date().toISOString(),
    dir,
    workspaceId: config.workspaceId,
    repoId: config.repoId,
    remoteName: config.remoteName,
    remoteUrl: gitMaybe(['remote', 'get-url', config.remoteName], dir, config.remoteUrl || ''),
    branch,
    head: gitMaybe(['rev-parse', 'HEAD'], dir, ''),
    statusShort: gitMaybe(['status', '--short', '--branch'], dir, '').split(/\r?\n/).filter(Boolean),
    diffStat: gitMaybe(['diff', '--stat'], dir, ''),
    stagedDiffStat: gitMaybe(['diff', '--cached', '--stat'], dir, '')
  };
}

function runGitWithAuth(dir, args) {
  const fullArgs = [...authGitArgs(), ...args];
  const result = spawnSync('git', fullArgs, { cwd: dir, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

const dir = resolveDir();
let result = null;

if (command === 'init') {
  ensureWorktree(dir);
  const config = {
    schema: 'skyevault.repo-workspace.v1',
    createdAt: new Date().toISOString(),
    workspaceId: sanitizePart(argValue('--workspace') || process.env.SKYEVAULT_WORKSPACE_ID || 'default', 'default'),
    repoId: sanitizePart(argValue('--repo') || path.basename(dir), path.basename(dir)),
    remoteName: argValue('--remote') || 'vault',
    remoteUrl: ''
  };
  config.remoteUrl = buildRemoteUrl(config);
  try { git(['remote', 'remove', config.remoteName], dir, { stdio: 'ignore' }); } catch {}
  git(['remote', 'add', config.remoteName, config.remoteUrl], dir);
  writeWorkspaceConfig(dir, config);
  result = { ok: true, command, dir, configPath: workspaceConfigPath(dir), config, note: 'Remote URL is stored without a token. Set SKYEVAULT_GIT_REMOTE_TOKEN when running sync/push.' };
} else if (command === 'status') {
  if (!hasGit(dir)) throw new Error(`Not a Git worktree: ${dir}`);
  result = { ok: true, command, ...statusPayload(dir, readWorkspaceConfig(dir)) };
} else if (command === 'diff') {
  if (!hasGit(dir)) throw new Error(`Not a Git worktree: ${dir}`);
  const config = readWorkspaceConfig(dir);
  const outDir = path.join(root, '.skyevault-out', 'workspace-diffs');
  fs.mkdirSync(outDir, { recursive: true });
  const patchPath = path.join(outDir, `${config.workspaceId}-${config.repoId}-${stamp()}.patch`);
  const patch = gitMaybe(['diff', '--binary'], dir, '');
  fs.writeFileSync(patchPath, patch);
  result = { ok: true, command, dir, patchPath, ...statusPayload(dir, config) };
} else if (command === 'commit') {
  if (!hasGit(dir)) throw new Error(`Not a Git worktree: ${dir}`);
  const message = argValue('--message') || argValue('-m') || `SkyeVault workspace commit ${new Date().toISOString()}`;
  git(['add', '-A'], dir, { stdio: 'inherit' });
  const stagedClean = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: dir });
  if (stagedClean.status === 0) {
    result = { ok: true, command, committed: false, message: 'No staged changes to commit.', ...statusPayload(dir, readWorkspaceConfig(dir)) };
  } else {
    git(['commit', '-m', message], dir, { stdio: 'inherit' });
    result = { ok: true, command, committed: true, commit: git(['rev-parse', 'HEAD'], dir), ...statusPayload(dir, readWorkspaceConfig(dir)) };
  }
} else if (command === 'sync' || command === 'pull') {
  if (!hasGit(dir)) throw new Error(`Not a Git worktree: ${dir}`);
  const config = readWorkspaceConfig(dir);
  runGitWithAuth(dir, ['fetch', config.remoteName, '--prune']);
  if (flag('--rebase')) runGitWithAuth(dir, ['pull', '--rebase', config.remoteName, currentBranch(dir)]);
  result = { ok: true, command, ...statusPayload(dir, config) };
} else if (command === 'push') {
  if (!hasGit(dir)) throw new Error(`Not a Git worktree: ${dir}`);
  const config = readWorkspaceConfig(dir);
  const branch = argValue('--branch') || currentBranch(dir);
  runGitWithAuth(dir, ['push', config.remoteName, branch]);
  result = { ok: true, command, pushed: { remote: config.remoteName, branch }, ...statusPayload(dir, config) };
} else if (command === 'doctor') {
  const config = hasGit(dir) ? readWorkspaceConfig(dir) : null;
  result = {
    ok: true,
    command,
    dir,
    hasGit: hasGit(dir),
    hasConfig: fs.existsSync(workspaceConfigPath(dir)),
    config,
    tokenAvailable: Boolean(process.env.SKYEVAULT_GIT_REMOTE_TOKEN || process.env.SKYEVAULT_TOKEN),
    hostname: os.hostname()
  };
} else {
  throw new Error(`Unknown SkyeVault repo workspace command: ${command}`);
}

if (result) {
  result.receiptPath = writeReceipt({ ...result, recordedAt: new Date().toISOString() });
  console.log(JSON.stringify(result, null, 2));
}
