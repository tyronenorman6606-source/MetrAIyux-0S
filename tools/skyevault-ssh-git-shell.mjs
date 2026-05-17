import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const storageRoot = process.env.SKYEVAULT_GIT_REMOTE_ROOT || path.join(os.tmpdir(), 'skyevault-git-remote');
const repoRoot = path.join(storageRoot, 'repos');
const role = String(process.env.SKYEVAULT_SSH_ROLE || 'viewer').toLowerCase();
const allowedWorkspaces = String(process.env.SKYEVAULT_SSH_WORKSPACES || '').split(/[,\s]+/).filter(Boolean);
const command = process.env.SSH_ORIGINAL_COMMAND || process.argv.slice(2).join(' ');
const roleOrder = ['viewer', 'deployer', 'admin', 'owner', 'founder'];

function roleAtLeast(actual, required) {
  return roleOrder.indexOf(actual) >= roleOrder.indexOf(required) && roleOrder.indexOf(required) !== -1;
}

function sanitizePart(value) {
  return String(value || '').trim().replace(/\.git$/, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

const match = command.match(/^(git-upload-pack|git-receive-pack)\s+'?([^']+)'?$/);
if (!match) {
  console.error('SkyeVault SSH only accepts git-upload-pack and git-receive-pack.');
  process.exit(126);
}

const service = match[1];
const repoKey = match[2].replace(/^\/+/, '').replace(/^git\//, '').replace(/^repos\//, '');
const parts = repoKey.split('/').filter(Boolean);
const repoId = sanitizePart(parts.pop());
const workspaceId = sanitizePart(parts.join('-') || 'default');
if (!workspaceId || !repoId) {
  console.error('Invalid SkyeVault repository path.');
  process.exit(126);
}

if (allowedWorkspaces.length && !allowedWorkspaces.includes(workspaceId) && !allowedWorkspaces.includes('*')) {
  console.error('Workspace denied by SkyeVault SSH scope.');
  process.exit(126);
}

if (service === 'git-receive-pack' && !roleAtLeast(role, 'deployer')) {
  console.error('SkyeVault SSH receive-pack requires deployer role.');
  process.exit(126);
}

const repoPath = path.join(repoRoot, workspaceId, `${repoId}.git`);
if (!fs.existsSync(repoPath)) {
  console.error(`SkyeVault repo not found: ${workspaceId}/${repoId}`);
  process.exit(126);
}

const child = spawn(service, [repoPath], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    SKYEVAULT_WORKSPACE_ID: workspaceId,
    SKYEVAULT_REPO_ID: repoId
  }
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code || 0);
});
