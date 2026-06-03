#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { cleanBearer, resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const command = rawArgs.find((arg) => !arg.startsWith('--')) || 'status';

function rawArgValues(name) {
  const prefix = `${name}=`;
  const out = [];
  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg.startsWith(prefix)) out.push(arg.slice(prefix.length));
    else if (arg === name && rawArgs[i + 1] && !rawArgs[i + 1].startsWith('--')) out.push(rawArgs[i + 1]);
  }
  return out.filter(Boolean);
}

function parseEnvFile(file) {
  const values = {};
  try {
    for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      values[match[1]] = value;
    }
  } catch {}
  return values;
}

function loadEnvFiles() {
  const files = [
    ...rawArgValues('--env-file'),
    path.join(repoRoot, '.env'),
    path.join(repoRoot, 'env.txt'),
    path.join(repoRoot, 'SkyeVault-Drop', '.env')
  ];
  for (const file of files) {
    const full = path.isAbsolute(file) ? file : path.resolve(repoRoot, file);
    const values = parseEnvFile(full);
    for (const [key, value] of Object.entries(values)) {
      if (process.env[key] === undefined || process.env[key] === '') process.env[key] = value;
    }
  }
}

loadEnvFiles();

const stateDir = path.join(repoRoot, '.skyevault-out', 'git-remote');
const storageRoot = resolvePath(argValue('--storage-root') || process.env.SKYEVAULT_OWNER_GIT_REMOTE_ROOT, path.join(stateDir, 'storage'));
const envFile = path.join(stateDir, 'owner-git-origin.env');
const pidFile = path.join(stateDir, 'owner-git-origin.pid.json');
const statusFile = path.join(stateDir, 'owner-git-origin-status.json');
const syncReceiptFile = path.join(stateDir, 'owner-git-origin-sync.json');
const proofFile = path.join(stateDir, 'owner-git-origin-proof.json');
const logFile = path.join(stateDir, 'owner-git-origin.log');
const remoteName = argValue('--remote') || process.env.SKYEVAULT_OWNER_GIT_REMOTE_NAME || 'skyevault';
const workspaceId = sanitizePart(argValue('--workspace') || process.env.SKYEVAULT_OWNER_WORKSPACE_ID || 'metraiyux-0s-owner', 'metraiyux-0s-owner');
const repoId = sanitizePart(argValue('--repo') || process.env.SKYEVAULT_OWNER_GIT_REPO_ID || path.basename(repoRoot), path.basename(repoRoot));
const host = argValue('--host') || process.env.SKYEVAULT_GIT_REMOTE_HOST || '127.0.0.1';
const requestedPort = Number(argValue('--port') || process.env.SKYEVAULT_GIT_REMOTE_PORT || '8787');
const maxBuffer = Math.max(64, Number(process.env.SKYEVAULT_OWNER_GIT_MAX_BUFFER_MB || '256')) * 1024 * 1024;
const ownerWorkspaceSlug = String(process.env.SKYEVAULT_OWNER_WORKSPACE_SLUG || 'metraiyux-0s').trim();
const defaultZeroOsBase = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const ownerGitGateSessionExport = 'SKYEVAULT_GATE_BEARER';

function argValue(name) {
  const prefix = `${name}=`;
  const inline = rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (inline) return inline;
  const index = rawArgs.indexOf(name);
  if (index >= 0 && rawArgs[index + 1] && !rawArgs[index + 1].startsWith('--')) return rawArgs[index + 1];
  return '';
}

function flag(name) {
  return rawArgs.includes(name);
}

function resolvePath(value, fallback = '') {
  const clean = String(value || '').trim();
  if (!clean) return fallback;
  return path.isAbsolute(clean) ? clean : path.resolve(repoRoot, clean);
}

function sanitizePart(value, fallback = 'repo') {
  return String(value || fallback)
    .trim()
    .replace(/\.git$/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || fallback;
}

function stamp() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function readEnvFile(file) {
  const out = {};
  try {
    for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      out[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {}
  return out;
}

function writeEnv(values, removeKeys = []) {
  const existing = readEnvFile(envFile);
  const merged = { ...existing };
  for (const key of removeKeys) delete merged[key];
  Object.assign(merged, values);
  fs.mkdirSync(path.dirname(envFile), { recursive: true });
  const lines = Object.entries(merged)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${String(value)}`);
  fs.writeFileSync(envFile, `${lines.join('\n')}\n`, { mode: 0o600 });
  try { fs.chmodSync(envFile, 0o600); } catch {}
  return merged;
}

function ownerToken() {
  const existing = readEnvFile(envFile);
  const token = String(process.env.SKYEVAULT_GIT_REMOTE_TOKEN || existing.SKYEVAULT_GIT_REMOTE_TOKEN || '').trim()
    || `skyevault-owner-${crypto.randomBytes(32).toString('hex')}`;
  return token;
}

function mintOwnerToken() {
  return `skyevault-owner-${crypto.randomBytes(32).toString('hex')}`;
}

function zeroOsBase() {
  return String(
    argValue('--0s-origin')
    || argValue('--zero-os-origin')
    || process.env.METRAIYUX_0S_LIVE_BASE
    || process.env.METRAIYUX_0S_FULL_SYSTEM_URL
    || process.env.METRAIYUX_0S_WORKER_URL
    || defaultZeroOsBase
  ).replace(/\/+$/, '');
}

function gateIntrospectUrl() {
  const explicit = String(argValue('--gate-introspect-url') || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const sharedZeroOsIntrospect = `${zeroOsBase()}/api/skygate/auth-introspect`;
  const configuredDirect = String(
    process.env.SKYEVAULT_GATE_INTROSPECT_URL
    || process.env.SKYEVAULT_FS27_INTROSPECT_API
    || process.env.METRAIYUX_0S_SKYGATE_FS27_INTROSPECT_ENDPOINT
    || ''
  ).trim();
  const allowDirect = process.env.SKYEVAULT_OWNER_GIT_ALLOW_DIRECT_GATE_INTROSPECT === '1';
  return (allowDirect && configuredDirect ? configuredDirect : sharedZeroOsIntrospect).replace(/\/+$/, '');
}

function useStaticTokenMode() {
  const mode = String(argValue('--auth-mode') || process.env.SKYEVAULT_OWNER_GIT_AUTH_MODE || process.env.SKYEVAULT_GIT_REMOTE_AUTH_MODE || '').toLowerCase();
  return rawArgs.includes('--static-token')
    || mode === 'static-token'
    || mode === 'local-static-token'
    || process.env.SKYEVAULT_OWNER_GIT_ALLOW_STATIC_TOKEN === '1';
}

async function obtainGateBearer() {
  const auth = await resolveZeroOsGateAuth({
    zeroOsBase: zeroOsBase(),
    env: process.env,
    envFiles: []
  });
  if (!auth.ok || !auth.token) {
    throw new Error(auth.response?.body?.error || auth.response?.error || 'Shared 0S/FS27 gate credential is required. Set ZERO_OS_GATE_SESSION/SKYEVAULT_GATE_BEARER, or set the shared owner code in .env for /api/owner/admin-login.');
  }
  return {
    token: auth.token,
    source: `${auth.credential?.source || 'shared-gate'}:${auth.credential?.key || 'unknown'}`,
    login: auth.credential?.source === 'owner-gate-exchange'
      ? { ok: auth.response?.ok === true, status: auth.response?.status || 0, via: 'zero-os-owner-admin-login' }
      : null
  };
}

async function ownerAuth() {
  if (useStaticTokenMode()) {
    return {
      mode: 'static-token',
      serverAuth: 'static-token',
      token: ownerToken(),
      source: 'explicit-emergency-static-token',
      gateIntrospectUrl: ''
    };
  }
  const bearer = await obtainGateBearer();
  return {
    mode: 'gate',
    serverAuth: 'gate-introspection',
    token: bearer.token,
    source: bearer.source,
    login: bearer.login,
    gateIntrospectUrl: gateIntrospectUrl()
  };
}

function baseUrlFor(port = requestedPort) {
  return `http://${host}:${port}`;
}

function cloneUrlFor(baseUrl) {
  return `${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(workspaceId)}/${encodeURIComponent(repoId)}.git`;
}

function repoPath() {
  return path.join(storageRoot, 'repos', workspaceId, `${repoId}.git`);
}

function authHeader(auth) {
  if (auth?.mode === 'gate') return `Authorization: Bearer ${auth.token}`;
  return `Authorization: Basic ${Buffer.from(`x-token:${auth?.token || ''}`).toString('base64')}`;
}

function gitAuthEnv(auth) {
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.extraHeader',
    GIT_CONFIG_VALUE_0: authHeader(auth)
  };
}

function redact(text, token = '') {
  let clean = String(text || '');
  if (token) clean = clean.split(token).join('***');
  clean = clean.replace(/Authorization: Basic\s+[A-Za-z0-9+/=]+/g, 'Authorization: Basic ***');
  clean = clean.replace(/Authorization: Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Authorization: Bearer ***');
  clean = clean.replace(/x-token:[^@\s]+@/g, 'x-token:***@');
  return clean;
}

function run(file, args, options = {}) {
  return execFileSync(file, args, {
    cwd: options.cwd || repoRoot,
    encoding: options.encoding || 'utf8',
    stdio: options.stdio || 'pipe',
    env: { ...process.env, ...(options.env || {}) },
    maxBuffer
  }).trim();
}

function runMaybe(file, args, options = {}, fallback = '') {
  try {
    return run(file, args, options);
  } catch {
    return fallback;
  }
}

function git(args, options = {}) {
  return run('git', args, options);
}

function gitMaybe(args, options = {}, fallback = '') {
  return runMaybe('git', args, options, fallback);
}

function spawnCaptured(file, args, options = {}) {
  const started = Date.now();
  const result = spawnSync(file, args, {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...(options.env || {}) },
    maxBuffer,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return {
    ok: result.status === 0,
    status: result.status,
    signal: result.signal || null,
    durationMs: Date.now() - started,
    stdout: redact(result.stdout || '').slice(-4000),
    stderr: redact(result.stderr || '').slice(-4000)
  };
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function portAvailable(port) {
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function health(baseUrl) {
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/health`);
    if (!response.ok) return null;
    const body = await response.json();
    return body?.service === 'skyevault-git-remote' ? body : null;
  } catch {
    return null;
  }
}

async function apiJson(baseUrl, token, pathName, init = {}) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${pathName}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.headers || {})
    }
  });
  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text || '{}'); } catch { data = { ok: false, error: text }; }
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || response.statusText);
    error.status = response.status;
    throw error;
  }
  return data;
}

function currentBranch() {
  return gitMaybe(['branch', '--show-current'], {}, 'main') || 'main';
}

function localHead() {
  return gitMaybe(['rev-parse', 'HEAD'], {}, '');
}

function repoRefs(cwd = repoRoot) {
  const output = gitMaybe(['for-each-ref', '--format=%(refname)%09%(objectname)'], { cwd }, '');
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [ref, object] = line.split('\t');
    return { ref, object };
  });
}

function objectCount(cwd = repoRoot) {
  const output = gitMaybe(['count-objects', '-v'], { cwd }, '');
  const values = Object.fromEntries(output.split(/\r?\n/).map((line) => line.split(/:\s+/)).filter((parts) => parts.length === 2));
  return Number(values.count || 0) + Number(values['in-pack'] || 0);
}

function diskBytes(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      const stat = fs.lstatSync(file);
      if (entry.isDirectory()) visit(file);
      else total += stat.size;
    }
  };
  visit(dir);
  return total;
}

function bytesHuman(value) {
  const size = Number(value || 0);
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** index).toFixed(index ? 2 : 0)} ${units[index]}`;
}

function filesystemLimit() {
  const output = runMaybe('df', ['-k', repoRoot], {}, '');
  const lines = output.split(/\r?\n/).filter(Boolean);
  const fields = lines.at(-1)?.split(/\s+/) || [];
  const totalKb = Number(fields[1] || 0);
  const usedKb = Number(fields[2] || 0);
  const availableKb = Number(fields[3] || 0);
  return {
    mount: fields[5] || '',
    totalBytes: totalKb * 1024,
    usedBytes: usedKb * 1024,
    availableBytes: availableKb * 1024,
    totalHuman: bytesHuman(totalKb * 1024),
    usedHuman: bytesHuman(usedKb * 1024),
    availableHuman: bytesHuman(availableKb * 1024)
  };
}

function storageLimits() {
  return {
    localFilesystem: filesystemLimit(),
    gitRemoteStorageRoot: storageRoot,
    r2SingleObjectCeilingTb: 5,
    defaultVaultSubmissionMaxTotalGb: 5000,
    defaultVaultMaxFileSizeGb: 5000,
    defaultVaultFilesPerSubmission: 25,
    configuredVaultStorageMb: Number(process.env.SKYEVAULT_VAULT_STORAGE_MB || process.env.SKYEVAULT_GATE_VAULT_STORAGE_MB || 0) || null,
    configuredVaultFileLimit: Number(process.env.SKYEVAULT_VAULT_FILE_LIMIT || process.env.SKYEVAULT_GATE_VAULT_FILE_LIMIT || 0) || null,
    configuredVaultWorkspaceLimit: Number(process.env.SKYEVAULT_VAULT_WORKSPACE_LIMIT || process.env.SKYEVAULT_GATE_VAULT_WORKSPACE_LIMIT || 0) || null
  };
}

function writeRuntimeEnv(baseUrl, auth) {
  const removeKeys = auth.mode === 'gate' ? ['SKYEVAULT_GIT_REMOTE_TOKEN'] : [];
  return writeEnv({
    SKYEVAULT_OWNER_GIT_AUTH_MODE: auth.mode === 'gate' ? 'gate-introspection' : 'static-token',
    SKYEVAULT_GATE_INTROSPECT_URL: auth.gateIntrospectUrl || '',
    SKYEVAULT_GIT_REMOTE_BASE_URL: baseUrl,
    SKYEVAULT_GIT_REMOTE_URL: cloneUrlFor(baseUrl),
    SKYEVAULT_GIT_REMOTE_WORKSPACE: workspaceId,
    SKYEVAULT_GIT_REMOTE_REPO: repoId,
    SKYEVAULT_OWNER_GIT_REMOTE_NAME: remoteName,
    SKYEVAULT_OWNER_GIT_REMOTE_ROOT: storageRoot
  }, removeKeys);
}

function runningRuntimeMatchesAuth(auth) {
  const runtime = readEnvFile(envFile);
  if (auth.mode === 'gate') {
    return runtime.SKYEVAULT_OWNER_GIT_AUTH_MODE === 'gate-introspection'
      && String(runtime.SKYEVAULT_GATE_INTROSPECT_URL || '') === String(auth.gateIntrospectUrl || '');
  }
  return runtime.SKYEVAULT_OWNER_GIT_AUTH_MODE === 'static-token'
    && Boolean(runtime.SKYEVAULT_GIT_REMOTE_TOKEN);
}

async function accessPayload() {
  const status = await startServer();
  const auth = await ownerAuth();
  const baseUrl = status.baseUrl;
  const cloneUrl = cloneUrlFor(baseUrl);
  const gateSessionVar = ownerGitGateSessionExport;
  if (auth.mode === 'gate') {
    return {
      ok: true,
      schema: 'skyevault.owner-git-origin-access.v1',
      checkedAt: new Date().toISOString(),
      whatThisIs: 'A local Git smart HTTP origin. Use it with git clone/fetch/pull/push; it is not a normal browser page.',
      auth: {
        mode: 'shared-gate',
        login: '/api/owner/admin-login or any active FS27/SkyGate bearer',
        gateIntrospectUrl: auth.gateIntrospectUrl ? 'configured' : null,
        source: auth.source
      },
      cloneUrl,
      commands: {
        ownerLogin: `${zeroOsBase()}/admin/login.html`,
        exportGateBearer: `export ${gateSessionVar}='<shared 0S/FS27/SkyGate bearer>'`,
        cloneWithoutPrompt: `git -c "http.extraHeader=Authorization: Bearer $${gateSessionVar}" clone ${cloneUrl} ${repoId}`,
        status: 'npm run vault:origin:status',
        proof: 'npm run vault:origin:proof'
      },
      note: 'No SkyeVault-specific founder/admin password is used in normal mode. Git receives the same shared gate bearer used by the 0S owner session.'
    };
  }
  return {
    ok: true,
    schema: 'skyevault.owner-git-origin-access.v1',
    checkedAt: new Date().toISOString(),
    whatThisIs: 'A local Git smart HTTP origin. Use it with git clone/fetch/pull/push; it is not a normal browser page.',
    browserPrompt: {
      username: 'x-token',
      passwordStoredAt: rel(envFile),
      passwordEnvVar: 'SKYEVAULT_GIT_REMOTE_TOKEN'
    },
    cloneUrl,
    commands: {
      loadPasswordEnv: `. ${rel(envFile)}`,
      printPasswordLocally: `node -e "const fs=require('fs'); const m=fs.readFileSync('${rel(envFile)}','utf8').match(/^SKYEVAULT_GIT_REMOTE_TOKEN=(.*)$/m); if(!m) process.exit(1); console.log(m[1])"`,
      cloneWithoutPrompt: `set -a; . ${rel(envFile)}; set +a; git -c "http.extraHeader=Authorization: Basic $(printf 'x-token:%s' \\"$SKYEVAULT_GIT_REMOTE_TOKEN\\" | base64 -w0)" clone ${cloneUrl} ${repoId}`,
      resetPassword: 'npm run vault:origin:reset-token'
    },
    warning: 'Emergency-local static token mode is active. This is not the normal 0S owner account lane.',
    note: 'The password is not printed by this command so it does not leak into chat, logs, or receipts.'
  };
}

async function resetToken() {
  if (!useStaticTokenMode()) {
    const started = await startServer();
    return {
      ok: Boolean(started.ok),
      schema: 'skyevault.owner-git-origin-reset-token.v1',
      resetAt: new Date().toISOString(),
      action: 'gate-managed-no-static-token',
      auth: {
        mode: 'shared-gate',
        ownerLogin: `${zeroOsBase()}/admin/login.html`,
        gateIntrospectUrl: gateIntrospectUrl() ? 'configured' : null
      },
      cloneUrl: cloneUrlFor(started.baseUrl || await activeBaseUrl()),
      note: 'Normal mode has no SkyeVault Git password to reset. Refresh or revoke the shared 0S/FS27/SkyGate owner session instead.'
    };
  }
  const oldBaseUrl = await activeBaseUrl();
  const baseUrl = oldBaseUrl || baseUrlFor(requestedPort);
  const token = mintOwnerToken();
  writeRuntimeEnv(baseUrl, { mode: 'static-token', token, gateIntrospectUrl: '' });
  stopServer();
  const started = await startServer();
  const synced = await syncOrigin();
  return {
    ok: Boolean(started.ok && synced.ok),
    schema: 'skyevault.owner-git-origin-reset-token.v1',
    resetAt: new Date().toISOString(),
    action: 'reset-token',
    username: 'x-token',
    passwordStoredAt: rel(envFile),
    cloneUrl: synced.cloneUrl || cloneUrlFor(started.baseUrl || baseUrl),
    restarted: {
      running: Boolean(started.running),
      pid: started.pid || null,
      baseUrl: started.baseUrl
    },
    synced: {
      ok: Boolean(synced.ok),
      remoteMatchesLocalHead: Boolean(synced.remoteMatchesLocalHead),
      syncReceipt: rel(syncReceiptFile)
    },
    printPasswordLocally: `node -e "const fs=require('fs'); const m=fs.readFileSync('${rel(envFile)}','utf8').match(/^SKYEVAULT_GIT_REMOTE_TOKEN=(.*)$/m); if(!m) process.exit(1); console.log(m[1])"`,
    note: 'Password was rotated and stored locally. It is intentionally not printed here.'
  };
}

function readPidRecord() {
  return readJson(pidFile, null);
}

async function activeBaseUrl() {
  const env = readEnvFile(envFile);
  const configured = String(env.SKYEVAULT_GIT_REMOTE_BASE_URL || '').trim();
  if (configured && await health(configured)) return configured;
  const record = readPidRecord();
  if (record?.baseUrl && await health(record.baseUrl)) return record.baseUrl;
  const requested = baseUrlFor(requestedPort);
  if (await health(requested)) return requested;
  return configured || record?.baseUrl || requested;
}

async function waitForReady(baseUrl, ms = 15000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const ok = await health(baseUrl);
    if (ok) return ok;
    await sleep(250);
  }
  return null;
}

async function startServer() {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(storageRoot, { recursive: true });
  const auth = await ownerAuth();
  let baseUrl = await activeBaseUrl();
  const runningHealth = await health(baseUrl);
  const record = readPidRecord();
  if (runningHealth) {
    if (runningHealth.auth !== auth.serverAuth || !runningRuntimeMatchesAuth(auth)) {
      stopServer();
    } else {
      writeRuntimeEnv(baseUrl, auth);
      const payload = await statusPayload({ skipApiErrors: true });
      payload.action = 'already-running';
      payload.pid = pidAlive(Number(record?.pid)) ? Number(record.pid) : payload.pid;
      writeJson(statusFile, payload);
      return payload;
    }
  }

  if (!runningHealth || runningHealth.auth !== auth.serverAuth) {
    baseUrl = await activeBaseUrl();
  }

  if (await health(baseUrl)) {
    writeRuntimeEnv(baseUrl, auth);
    const payload = await statusPayload({ skipApiErrors: true });
    payload.action = 'already-running';
    payload.pid = pidAlive(Number(record?.pid)) ? Number(record.pid) : payload.pid;
    writeJson(statusFile, payload);
    return payload;
  }

  let port = requestedPort;
  if (!(await portAvailable(port))) {
    if (argValue('--port')) throw new Error(`Port ${port} is not available and is not a SkyeVault Git remote.`);
    for (let candidate = requestedPort + 1; candidate <= requestedPort + 25; candidate += 1) {
      if (await portAvailable(candidate)) {
        port = candidate;
        break;
      }
    }
  }
  baseUrl = baseUrlFor(port);
  writeRuntimeEnv(baseUrl, auth);
  const log = fs.openSync(logFile, 'a', 0o600);
  fs.writeSync(log, `\n[owner-git-origin] ${new Date().toISOString()} starting ${baseUrl} storage=${storageRoot} auth=${auth.serverAuth}\n`);
  const authEnv = auth.mode === 'gate'
    ? {
      SKYEVAULT_GATE_INTROSPECT_URL: auth.gateIntrospectUrl,
      SKYEVAULT_GATE_ADMIN_ALL_WORKSPACES: process.env.SKYEVAULT_GATE_ADMIN_ALL_WORKSPACES || '1',
      SKYEVAULT_GATE_ENFORCE_WORKSPACE: process.env.SKYEVAULT_GATE_ENFORCE_WORKSPACE || '1',
      SKYEVAULT_GATE_REQUIRED_VIEW_ROLE: process.env.SKYEVAULT_GATE_REQUIRED_VIEW_ROLE || 'viewer',
      SKYEVAULT_GATE_REQUIRED_PUSH_ROLE: process.env.SKYEVAULT_GATE_REQUIRED_PUSH_ROLE || 'deployer',
      SKYEVAULT_GATE_REQUIRED_ADMIN_ROLE: process.env.SKYEVAULT_GATE_REQUIRED_ADMIN_ROLE || 'admin'
    }
    : { SKYEVAULT_GIT_REMOTE_TOKEN: auth.token };
  const child = spawn(process.execPath, [
    path.join(repoRoot, 'tools', 'skyevault-git-remote-server.mjs'),
    `--host=${host}`,
    `--port=${port}`,
    `--storage-root=${storageRoot}`
  ], {
    cwd: repoRoot,
    detached: true,
    stdio: ['ignore', log, log],
    env: {
      ...process.env,
      ...authEnv,
      SKYEVAULT_GIT_REMOTE_ROOT: storageRoot,
      SKYEVAULT_VAULT_STORAGE_MB: process.env.SKYEVAULT_VAULT_STORAGE_MB || '',
      SKYEVAULT_VAULT_FILE_LIMIT: process.env.SKYEVAULT_VAULT_FILE_LIMIT || '',
      SKYEVAULT_VAULT_WORKSPACE_LIMIT: process.env.SKYEVAULT_VAULT_WORKSPACE_LIMIT || ''
    }
  });
  child.unref();
  const ready = await waitForReady(baseUrl);
  if (!ready) throw new Error(`SkyeVault Git remote did not become ready at ${baseUrl}. See ${rel(logFile)}.`);
  writeJson(pidFile, {
    schema: 'skyevault.owner-git-origin-pid.v1',
    pid: child.pid,
    startedAt: new Date().toISOString(),
    baseUrl,
    storageRoot,
    logFile: rel(logFile),
    authMode: auth.serverAuth
  });
  const payload = await statusPayload({ skipApiErrors: true });
  payload.action = 'started';
  payload.pid = child.pid;
  writeJson(statusFile, payload);
  return payload;
}

function stopServer() {
  const record = readPidRecord();
  const pid = Number(record?.pid || 0);
  if (!pidAlive(pid)) {
    try { fs.unlinkSync(pidFile); } catch {}
    const payload = { ok: true, action: 'not-running', pid: pid || null, pidFile: rel(pidFile) };
    writeJson(statusFile, payload);
    return payload;
  }
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try { process.kill(pid, 'SIGTERM'); } catch {}
  }
  try { fs.unlinkSync(pidFile); } catch {}
  const payload = { ok: true, action: 'stopped', pid, pidFile: rel(pidFile) };
  writeJson(statusFile, payload);
  return payload;
}

function configureRemote(baseUrl) {
  const url = cloneUrlFor(baseUrl);
  if (gitMaybe(['remote', 'get-url', remoteName], {}, '')) {
    git(['remote', 'set-url', remoteName, url]);
  } else {
    git(['remote', 'add', remoteName, url]);
  }
  return { remoteName, remoteUrl: url };
}

function ensureBareRepoFromLocal(forceDirect = false) {
  const target = repoPath();
  const existed = fs.existsSync(target);
  const hasRefs = existed && repoRefs(target).length > 0;
  if (existed && hasRefs && !forceDirect) {
    return {
      ok: true,
      action: 'already-seeded',
      repoPath: target,
      refs: repoRefs(target).length,
      objectCount: objectCount(target),
      diskBytes: diskBytes(target)
    };
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!existed) {
    run('git', ['clone', '--mirror', '--no-hardlinks', repoRoot, target], { cwd: repoRoot, stdio: 'pipe' });
  } else {
    if (!gitMaybe(['remote', 'get-url', 'skyevault-source'], { cwd: target }, '')) {
      git(['remote', 'add', 'skyevault-source', repoRoot], { cwd: target });
    } else {
      git(['remote', 'set-url', 'skyevault-source', repoRoot], { cwd: target });
    }
    git(['fetch', 'skyevault-source', '+refs/heads/*:refs/heads/*', '+refs/tags/*:refs/tags/*'], { cwd: target });
  }
  const branch = currentBranch();
  if (branch && branch !== 'HEAD') {
    try { git(['symbolic-ref', 'HEAD', `refs/heads/${branch}`], { cwd: target }); } catch {}
  }
  git(['config', 'http.receivepack', 'true'], { cwd: target });
  git(['config', 'http.uploadpack', 'true'], { cwd: target });
  git(['config', 'skyevault.workspace', workspaceId], { cwd: target });
  git(['config', 'skyevault.repo', repoId], { cwd: target });
  gitMaybe(['update-server-info'], { cwd: target }, '');
  return {
    ok: true,
    action: existed ? 'direct-updated' : 'direct-seeded',
    repoPath: target,
    refs: repoRefs(target).length,
    objectCount: objectCount(target),
    diskBytes: diskBytes(target)
  };
}

function pushRefs(baseUrl, auth) {
  configureRemote(baseUrl);
  const env = gitAuthEnv(auth);
  const heads = spawnCaptured('git', ['push', remoteName, 'refs/heads/*:refs/heads/*'], { env });
  const tagNames = gitMaybe(['tag', '--list'], {}, '').split(/\r?\n/).filter(Boolean);
  const tags = tagNames.length
    ? spawnCaptured('git', ['push', remoteName, 'refs/tags/*:refs/tags/*'], { env })
    : { ok: true, skipped: true, reason: 'no-tags', status: 0, durationMs: 0, stdout: '', stderr: '' };
  return { heads, tags, tagCount: tagNames.length };
}

async function remoteRepoDetail(baseUrl, auth) {
  try {
    const detail = await apiJson(baseUrl, auth.token, `/__skyevault/repos/${encodeURIComponent(workspaceId)}/${encodeURIComponent(repoId)}`);
    return detail.repo || null;
  } catch {
    return null;
  }
}

function lsRemote(baseUrl, auth) {
  const url = cloneUrlFor(baseUrl);
  const output = gitMaybe(['ls-remote', url, 'HEAD', 'refs/heads/*', 'refs/tags/*'], { env: gitAuthEnv(auth) }, '');
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [object, ref] = line.split(/\s+/);
    return { ref, object };
  });
}

async function syncOrigin(options = {}) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const status = await startServer();
  const auth = await ownerAuth();
  const baseUrl = status.baseUrl;
  writeRuntimeEnv(baseUrl, auth);
  const seeded = ensureBareRepoFromLocal(Boolean(options.forceDirect || flag('--direct-seed') || flag('--repair')));
  const pushed = flag('--no-push') ? { skipped: true, reason: 'no-push' } : pushRefs(baseUrl, auth);
  const refs = lsRemote(baseUrl, auth);
  const detail = await remoteRepoDetail(baseUrl, auth);
  const head = localHead();
  const remoteMain = refs.find((item) => item.ref === `refs/heads/${currentBranch()}`) || refs.find((item) => item.ref === 'refs/heads/main') || refs[0] || null;
  const ok = Boolean(seeded.ok)
    && (pushed.skipped || (pushed.heads?.ok && pushed.tags?.ok))
    && refs.some((item) => item.object === head);
  const receipt = {
    ok,
    schema: 'skyevault.owner-git-origin-sync.v1',
    action: 'sync',
    startedAt,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    workspaceId,
    ownerWorkspaceSlug,
    repoId,
    baseUrl,
    cloneUrl: cloneUrlFor(baseUrl),
    remoteName,
    auth: {
      mode: auth.mode === 'gate' ? 'shared-gate' : 'emergency-static-token',
      source: auth.source,
      gateIntrospectUrl: auth.gateIntrospectUrl ? 'configured' : null,
      runtimeEnv: rel(envFile)
    },
    localHead: head,
    localBranch: currentBranch(),
    remoteHead: remoteMain,
    remoteMatchesLocalHead: refs.some((item) => item.object === head),
    seeded: {
      action: seeded.action,
      repoPath: rel(seeded.repoPath),
      refs: seeded.refs,
      objectCount: seeded.objectCount,
      diskBytes: seeded.diskBytes,
      diskHuman: bytesHuman(seeded.diskBytes)
    },
    pushed,
    remoteRepo: detail ? {
      refs: detail.refs,
      branches: detail.branches,
      tags: detail.tags,
      diskBytes: detail.diskBytes,
      objectCount: detail.objectCount,
      head: detail.head
    } : null,
    storageLimits: storageLimits()
  };
  writeJson(syncReceiptFile, receipt);
  writeJson(statusFile, await statusPayload({ skipApiErrors: true }));
  return receipt;
}

async function cloneProof() {
  const sync = flag('--no-sync') ? null : await syncOrigin();
  const auth = await ownerAuth();
  const baseUrl = (sync?.baseUrl) || await activeBaseUrl();
  const proofRoot = resolvePath(argValue('--proof-root'), path.join(os.tmpdir(), `skyevault-owner-git-origin-proof-${stamp()}`));
  const cloneDir = path.join(proofRoot, repoId);
  fs.rmSync(proofRoot, { recursive: true, force: true });
  fs.mkdirSync(proofRoot, { recursive: true });
  const clone = spawnCaptured('git', ['clone', cloneUrlFor(baseUrl), cloneDir], { cwd: proofRoot, env: gitAuthEnv(auth) });
  if (!clone.ok) {
    const receipt = {
      ok: false,
      schema: 'skyevault.owner-git-origin-proof.v1',
      provedAt: new Date().toISOString(),
      baseUrl,
      cloneUrl: cloneUrlFor(baseUrl),
      cloneDir,
      localHead: localHead(),
      clone,
      error: 'git clone from owner origin failed'
    };
    writeJson(proofFile, receipt);
    return receipt;
  }
  const clonedHead = gitMaybe(['rev-parse', 'HEAD'], { cwd: cloneDir }, '');
  const fsck = spawnCaptured('git', ['fsck', '--connectivity-only'], { cwd: cloneDir });
  const receipt = {
    ok: clonedHead === localHead() && fsck.ok,
    schema: 'skyevault.owner-git-origin-proof.v1',
    provedAt: new Date().toISOString(),
    workspaceId,
    ownerWorkspaceSlug,
    repoId,
    baseUrl,
    cloneUrl: cloneUrlFor(baseUrl),
    auth: {
      mode: auth.mode === 'gate' ? 'shared-gate' : 'emergency-static-token',
      source: auth.source,
      gateIntrospectUrl: auth.gateIntrospectUrl ? 'configured' : null,
      runtimeEnv: rel(envFile)
    },
    cloneDir,
    localHead: localHead(),
    clonedHead,
    headMatches: clonedHead === localHead(),
    localBranch: currentBranch(),
    fsck: { ok: fsck.ok, status: fsck.status, stderr: fsck.stderr },
    syncReceipt: sync ? rel(syncReceiptFile) : null,
    storageRoot: rel(storageRoot),
    storageLimits: storageLimits()
  };
  writeJson(proofFile, receipt);
  writeJson(statusFile, await statusPayload({ skipApiErrors: true }));
  return receipt;
}

async function snapshotRemote() {
  await startServer();
  const manifest = JSON.parse(run(process.execPath, [
    path.join(repoRoot, 'tools', 'skyevault-git-remote-maintenance.mjs'),
    'snapshot',
    `--storage-root=${storageRoot}`
  ]));
  const verify = JSON.parse(run(process.execPath, [
    path.join(repoRoot, 'tools', 'skyevault-git-remote-maintenance.mjs'),
    'verify',
    `--storage-root=${storageRoot}`,
    `--snapshot=${manifest.snapshotId}`
  ]));
  const receipt = {
    ok: Boolean(verify.ok),
    schema: 'skyevault.owner-git-origin-snapshot.v1',
    createdAt: new Date().toISOString(),
    storageRoot: rel(storageRoot),
    snapshotId: manifest.snapshotId,
    repoCount: manifest.repoCount,
    totalBundleBytes: manifest.totalBundleBytes,
    totalBundleHuman: manifest.totalBundleHuman,
    verify
  };
  const file = path.join(stateDir, 'owner-git-origin-snapshot.json');
  writeJson(file, receipt);
  return { ...receipt, receiptPath: rel(file) };
}

async function statusPayload(options = {}) {
  const baseUrl = await activeBaseUrl();
  const record = readPidRecord();
  const alive = pidAlive(Number(record?.pid));
  const h = await health(baseUrl);
  let repos = null;
  let remoteDetail = null;
  let refs = [];
  let auth = null;
  let authError = '';
  if (h && !options.skipApiErrors) {
    auth = await ownerAuth();
    repos = await apiJson(baseUrl, auth.token, '/__skyevault/repos');
    remoteDetail = await remoteRepoDetail(baseUrl, auth);
    refs = lsRemote(baseUrl, auth);
  } else if (h && options.skipApiErrors) {
    try {
      auth = await ownerAuth();
      repos = await apiJson(baseUrl, auth.token, '/__skyevault/repos');
      remoteDetail = await remoteRepoDetail(baseUrl, auth);
      refs = lsRemote(baseUrl, auth);
    } catch (error) {
      authError = error.message;
    }
  }
  const head = localHead();
  const remoteBranch = refs.find((item) => item.ref === `refs/heads/${currentBranch()}`) || refs.find((item) => item.ref === 'refs/heads/main') || null;
  return {
    ok: Boolean(h),
    schema: 'skyevault.owner-git-origin-status.v1',
    checkedAt: new Date().toISOString(),
    running: Boolean(h),
    pid: alive ? Number(record.pid) : null,
    baseUrl,
    cloneUrl: cloneUrlFor(baseUrl),
    workspaceId,
    ownerWorkspaceSlug,
    repoId,
    remoteName,
    auth: {
      mode: h?.auth === 'gate-introspection' ? 'shared-gate' : (h?.auth === 'static-token' ? 'emergency-static-token' : h?.auth || 'unknown'),
      gateIntrospectUrl: h?.auth === 'gate-introspection' ? 'configured' : null,
      runtimeEnv: rel(envFile),
      authError: authError || null
    },
    storageRoot: rel(storageRoot),
    repoPath: rel(repoPath()),
    logFile: rel(logFile),
    pidFile: rel(pidFile),
    statusFile: rel(statusFile),
    syncReceipt: fs.existsSync(syncReceiptFile) ? rel(syncReceiptFile) : null,
    proofReceipt: fs.existsSync(proofFile) ? rel(proofFile) : null,
    health: h ? {
      auth: h.auth,
      autoCreate: h.autoCreate,
      requiredRoles: h.requiredRoles
    } : null,
    local: {
      branch: currentBranch(),
      head,
      refs: repoRefs().length,
      objectCount: objectCount()
    },
    remote: remoteDetail ? {
      refs: remoteDetail.refs,
      branches: remoteDetail.branches,
      tags: remoteDetail.tags,
      diskBytes: remoteDetail.diskBytes,
      diskHuman: bytesHuman(remoteDetail.diskBytes),
      objectCount: remoteDetail.objectCount,
      head: remoteDetail.head,
      branchHead: remoteBranch
    } : null,
    remoteMatchesLocalHead: refs.some((item) => item.object === head),
    repos: repos ? {
      count: repos.repos?.length || 0,
      ids: (repos.repos || []).map((repo) => repo.id)
    } : null,
    storageLimits: storageLimits()
  };
}

async function main() {
  let result;
  if (['start', 'on', 'enable'].includes(command)) result = await startServer();
  else if (['stop', 'off', 'disable'].includes(command)) result = stopServer();
  else if (command === 'restart') {
    stopServer();
    result = await startServer();
  } else if (['seed', 'sync', 'push'].includes(command)) {
    result = await syncOrigin({ forceDirect: command === 'seed' });
  } else if (command === 'clone-proof' || command === 'proof') {
    result = await cloneProof();
  } else if (command === 'snapshot') {
    result = await snapshotRemote();
  } else if (['access', 'credentials', 'creds', 'login'].includes(command)) {
    result = await accessPayload();
  } else if (['reset-token', 'reset-password', 'rotate-token'].includes(command)) {
    result = await resetToken();
  } else if (command === 'status') {
    result = await statusPayload();
    writeJson(statusFile, result);
  } else {
    throw new Error(`Unknown owner Git origin command: ${command}`);
  }
  console.log(JSON.stringify(result, null, 2));
  if (result?.ok === false) process.exitCode = 1;
}

main().catch((error) => {
  console.error(redact(error.stack || error.message || String(error)));
  process.exit(1);
});
