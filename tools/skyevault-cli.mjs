import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const command = rawArgs[0] || 'status';
const configPath = process.env.SKYEVAULT_CLI_CONFIG || path.join(os.homedir(), '.skyevault', 'config.json');

function argValue(name) {
  const prefix = `${name}=`;
  return rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

function git(args, options = {}) {
  const output = execFileSync('git', args, { cwd: options.cwd || process.cwd(), encoding: 'utf8', stdio: options.stdio || 'pipe', env: { ...process.env, ...(options.env || {}) } });
  return output == null ? '' : String(output).trim();
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return { schema: 'skyevault.cli-config.v1', accounts: [] };
  }
}

function writeConfig(config) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  try { fs.chmodSync(configPath, 0o600); } catch {}
}

function account() {
  const config = readConfig();
  const name = argValue('--account') || config.defaultAccount || config.accounts?.[0]?.name || 'default';
  const item = (config.accounts || []).find((entry) => entry.name === name);
  if (!item) throw new Error(`SkyeVault account not found: ${name}`);
  return item;
}

function authedUrl(account, repoName = '') {
  const base = new URL(account.remoteUrl);
  const workspace = argValue('--workspace') || account.workspaceId;
  const repo = argValue('--repo') || repoName;
  base.pathname = `/${workspace}/${repo.replace(/\.git$/, '')}.git`;
  return base.toString();
}

function helperConfig() {
  return `!node ${path.join(root, 'tools', 'skyevault-git-credential-helper.mjs')}`;
}

async function api(account, apiPath, options = {}) {
  const url = new URL(apiPath, account.remoteUrl).toString();
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${account.token}`,
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text || '{}'); } catch { data = { ok: false, error: text }; }
  if (!response.ok || data.ok === false) throw new Error(data.error || response.statusText);
  return data;
}

let result = null;

if (command === 'login') {
  const remoteUrl = argValue('--remote-url') || process.env.SKYEVAULT_REMOTE_URL;
  const token = argValue('--token') || process.env.SKYEVAULT_TOKEN;
  const workspaceId = argValue('--workspace') || process.env.SKYEVAULT_WORKSPACE_ID;
  const name = argValue('--name') || 'default';
  if (!remoteUrl || !token || !workspaceId) throw new Error('login requires --remote-url, --token, and --workspace.');
  const config = readConfig();
  const accountRecord = { name, remoteUrl: remoteUrl.replace(/\/$/, ''), token, workspaceId, updatedAt: new Date().toISOString() };
  config.accounts = [...(config.accounts || []).filter((entry) => entry.name !== name), accountRecord];
  config.defaultAccount = name;
  writeConfig(config);
  result = { ok: true, configPath, account: { name, remoteUrl: accountRecord.remoteUrl, workspaceId } };
} else if (command === 'remote-add') {
  const current = account();
  const name = argValue('--name') || 'vault';
  const repo = argValue('--repo') || path.basename(process.cwd());
  const url = authedUrl(current, repo);
  try { git(['remote', 'remove', name], { stdio: 'ignore' }); } catch {}
  git(['remote', 'add', name, url]);
  git(['config', `credential.${new URL(current.remoteUrl).origin}.helper`, helperConfig()]);
  result = { ok: true, remote: name, url, credentialHelper: helperConfig() };
} else if (command === 'clone') {
  const current = account();
  const repo = rawArgs[1] || argValue('--repo');
  const target = rawArgs[2] || argValue('--target') || repo;
  if (!repo) throw new Error('clone requires a repo name.');
  git(['-c', `credential.helper=${helperConfig()}`, 'clone', authedUrl(current, repo), target], { stdio: 'inherit' });
  result = { ok: true, repo, target };
} else if (command === 'status') {
  const current = account();
  const [repos, quota, snapshots, policy] = await Promise.all([
    api(current, '/__skyevault/repos'),
    api(current, '/__skyevault/quota'),
    api(current, '/__skyevault/snapshots'),
    api(current, '/__skyevault/policy')
  ]);
  result = { ok: true, workspaceId: current.workspaceId, repos: repos.repos, quota: quota.workspaces, snapshots: snapshots.snapshots, policy: policy.policy };
} else if (command === 'snapshot') {
  result = await api(account(), '/__skyevault/snapshots', { method: 'POST', body: '{}' });
} else if (command === 'policy') {
  result = await api(account(), '/__skyevault/policy');
} else if (command === 'quota') {
  result = await api(account(), '/__skyevault/quota');
} else if (command === 'diff') {
  const left = argValue('--left') || rawArgs[1];
  const right = argValue('--right') || rawArgs[2];
  if (!left || !right) throw new Error('diff requires --left and --right archive paths.');
  const output = execFileSync(process.execPath, [path.join(root, 'tools', 'skyevault-vault-diff.mjs'), `--left=${left}`, `--right=${right}`], { cwd: process.cwd(), encoding: 'utf8' });
  result = JSON.parse(output);
} else {
  throw new Error(`Unknown skyevault command: ${command}`);
}

console.log(JSON.stringify(result, null, 2));
