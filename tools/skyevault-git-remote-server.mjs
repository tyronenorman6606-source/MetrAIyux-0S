import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const devNoAuth = args.has('--dev-no-auth');
const autoCreate = !args.has('--no-auto-create');

function argValue(name) {
  const prefix = `${name}=`;
  return rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

function resolvePath(value, fallback) {
  const clean = String(value || '').trim();
  if (!clean) return fallback;
  return path.isAbsolute(clean) ? clean : path.resolve(root, clean);
}

function json(res, status, body) {
  const text = `${JSON.stringify(body, null, 2)}\n`;
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text)
  });
  res.end(text);
}

function httpStatus(error, fallback = 400) {
  const status = Number(error?.status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : fallback;
}

function text(res, status, body) {
  res.writeHead(status >= 400 && status <= 599 ? status : 500, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(body.endsWith('\n') ? body : `${body}\n`);
}

function html(res, status, body) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(body);
}

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: options.cwd || root, encoding: options.encoding || 'utf8', stdio: options.stdio || 'pipe' }).trim();
}

async function hashFile(file) {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function readBody(req, maxBytes = 1024 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error(`Request body too large. Limit is ${maxBytes} bytes.`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readJsonBody(req) {
  const text = await readBody(req);
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON body: ${error.message}`);
  }
}

function sanitizePart(value) {
  return String(value || '')
    .trim()
    .replace(/\.git$/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function nowIso() {
  return new Date().toISOString();
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function tokenFromRequest(req) {
  const auth = String(req.headers.authorization || '');
  if (auth.startsWith('Bearer ')) return auth.slice('Bearer '.length).trim();
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(auth.slice('Basic '.length), 'base64').toString('utf8');
      const split = decoded.indexOf(':');
      if (split === -1) return decoded;
      return decoded.slice(split + 1) || decoded.slice(0, split);
    } catch {
      return '';
    }
  }
  return '';
}

function numberFromValues(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return Math.floor(number);
  }
  return 0;
}

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

const ROLE_ORDER = ['viewer', 'deployer', 'admin', 'owner', 'founder'];

function roleAtLeast(actual, required) {
  const actualIndex = ROLE_ORDER.indexOf(String(actual || 'viewer').toLowerCase());
  const requiredIndex = ROLE_ORDER.indexOf(String(required || 'viewer').toLowerCase());
  return actualIndex !== -1 && requiredIndex !== -1 && actualIndex >= requiredIndex;
}

function authLedgerFields(auth) {
  return {
    authMode: auth.mode,
    remoteUser: auth.remoteUser,
    remoteRole: auth.role,
    customerId: auth.customerId || null,
    apiKeyId: auth.apiKeyId || null,
    gateCardId: auth.gateCardId || null
  };
}

function workspaceAliases(value) {
  const clean = sanitizePart(value);
  if (!clean) return [];
  const aliases = [clean];
  if (!clean.startsWith('customer-')) aliases.push(`customer-${clean}`);
  return aliases;
}

function workspaceClaimValues(data) {
  const gateCard = data?.gate_card || {};
  const metadata = data?.metadata || gateCard.metadata || {};
  const values = [
    data?.workspace_id,
    data?.workspaceId,
    data?.org,
    data?.customer_id,
    data?.customerId,
    gateCard.customer_id,
    gateCard.customerId,
    metadata.workspace_id,
    metadata.workspaceId,
    metadata.customer_id,
    metadata.customerId
  ];
  for (const list of [data?.workspace_ids, data?.workspaceIds, metadata.workspace_ids, metadata.workspaceIds, gateCard.workspace_ids, gateCard.workspaceIds]) {
    if (Array.isArray(list)) values.push(...list);
    else if (typeof list === 'string') values.push(...list.split(/[,\s]+/).filter(Boolean));
  }
  return values;
}

function quotaFromGate(data) {
  const gateCard = data?.gate_card || {};
  const metadata = data?.metadata || gateCard.metadata || {};
  const limits = data?.limits || data?.vault_limits || metadata.limits || {};
  return {
    storageMb: numberFromValues(
      data?.vault_storage_mb,
      data?.customer_vault_storage_mb,
      limits.vault_storage_mb,
      limits.storage_mb,
      metadata.vault_storage_mb,
      gateCard.vault_storage_mb
    ),
    fileLimit: numberFromValues(
      data?.vault_file_limit,
      data?.customer_vault_file_limit,
      limits.vault_file_limit,
      limits.file_limit,
      metadata.vault_file_limit,
      gateCard.vault_file_limit
    ),
    workspaceLimit: numberFromValues(
      data?.vault_workspace_limit,
      data?.customer_vault_workspace_limit,
      limits.vault_workspace_limit,
      limits.workspace_limit,
      metadata.vault_workspace_limit,
      gateCard.vault_workspace_limit
    )
  };
}

function quotaFromEnv(env = process.env) {
  return {
    storageMb: numberFromValues(env.SKYEVAULT_VAULT_STORAGE_MB, env.SKYEVAULT_GATE_VAULT_STORAGE_MB),
    fileLimit: numberFromValues(env.SKYEVAULT_VAULT_FILE_LIMIT, env.SKYEVAULT_GATE_VAULT_FILE_LIMIT),
    workspaceLimit: numberFromValues(env.SKYEVAULT_VAULT_WORKSPACE_LIMIT, env.SKYEVAULT_GATE_VAULT_WORKSPACE_LIMIT)
  };
}

function authContextFromGate(data) {
  const gateCard = data.gate_card || {};
  const role = String(data.role || gateCard.role || 'viewer').toLowerCase();
  const customerId = data.customer_id ?? data.customerId ?? gateCard.customer_id ?? gateCard.customerId ?? null;
  const apiKeyId = data.api_key_id ?? data.apiKeyId ?? null;
  const gateCardId = data.gate_card_id ?? gateCard.id ?? null;
  const workspaceIds = new Set();
  for (const value of workspaceClaimValues(data)) {
    for (const alias of workspaceAliases(value)) workspaceIds.add(alias);
  }
  const remoteUser = String(data.username || data.email || data.sub || apiKeyId || gateCardId || 'gate-user');
  return {
    mode: 'gate',
    active: true,
    remoteUser,
    role,
    customerId: customerId == null ? null : String(customerId),
    apiKeyId: apiKeyId == null ? null : String(apiKeyId),
    gateCardId: gateCardId == null ? null : String(gateCardId),
    workspaceIds,
    quotas: quotaFromGate(data)
  };
}

async function introspectGateToken(tokenValue) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), gateTimeoutMs);
  try {
    const response = await fetch(gateIntrospectUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: `Bearer ${tokenValue}` }),
      signal: controller.signal
    });
    const textBody = await response.text();
    let data = {};
    try {
      data = JSON.parse(textBody || '{}');
    } catch {
      throw new Error(`Gate introspection returned non-JSON ${response.status}.`);
    }
    if (!response.ok) throw new Error(data.error || `Gate introspection failed ${response.status}.`);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveAuth(req) {
  const suppliedToken = tokenFromRequest(req);
  if (devNoAuth) {
    return {
      mode: 'dev',
      active: true,
      remoteUser: 'dev-no-auth',
      role: 'founder',
      customerId: null,
      apiKeyId: null,
      gateCardId: null,
      workspaceIds: new Set(['*']),
      quotas: quotaFromEnv()
    };
  }

  if (gateIntrospectUrl) {
    if (!suppliedToken) return { mode: 'gate', active: false, reason: 'Missing bearer/basic token.' };
    const data = await introspectGateToken(suppliedToken);
    if (!data?.active) return { mode: 'gate', active: false, reason: 'Gate token is inactive.' };
    return authContextFromGate(data);
  }

  if (!timingSafeEqualString(suppliedToken, token)) {
    return { mode: 'static-token', active: false, reason: 'Invalid static remote token.' };
  }

  return {
    mode: 'static-token',
    active: true,
    remoteUser: 'token-user',
    role: 'founder',
    customerId: process.env.SKYEVAULT_CUSTOMER_ID || null,
    apiKeyId: null,
    gateCardId: null,
    workspaceIds: new Set(['*']),
    quotas: quotaFromEnv()
  };
}

function requireRole(auth, requiredRole) {
  if (!roleAtLeast(auth.role, requiredRole)) {
    const error = new Error(`Requires ${requiredRole} role; token role is ${auth.role || 'viewer'}.`);
    error.status = 403;
    throw error;
  }
}

function workspaceAllowed(auth, workspaceId) {
  if (!gateEnforceWorkspace || auth.mode !== 'gate') return true;
  if (gateAdminAllWorkspaces && roleAtLeast(auth.role, 'admin')) return true;
  const clean = sanitizePart(workspaceId);
  return auth.workspaceIds.has(clean) || auth.workspaceIds.has('*');
}

function requireWorkspace(auth, workspaceId) {
  if (workspaceAllowed(auth, workspaceId)) return;
  const error = new Error(`Workspace denied by Gate scope: ${workspaceId}`);
  error.status = 403;
  throw error;
}

function gitServiceName(req, url) {
  const queryService = url.searchParams.get('service') || '';
  if (queryService) return queryService;
  if (url.pathname.endsWith('/git-receive-pack')) return 'git-receive-pack';
  if (url.pathname.endsWith('/git-upload-pack')) return 'git-upload-pack';
  return path.basename(url.pathname);
}

function requiredGitRole(req, url) {
  return gitServiceName(req, url) === 'git-receive-pack' ? requiredPushRole : requiredViewRole;
}

function appendJsonl(file, event) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(event)}\n`);
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return { event: 'parse-error', line: index + 1, error: error.message };
      }
    });
}

function readJsonFile(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonFile(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function appendLedgers(event) {
  for (const file of [ledgerPath, workspaceLedgerPath]) {
    try {
      appendJsonl(file, event);
    } catch (error) {
      console.warn(`Could not append ledger ${file}: ${error.message}`);
    }
  }
}

function defaultPolicy() {
  return {
    schema: 'skyevault.git-remote-policy.v1',
    updatedAt: null,
    protectedRefs: String(process.env.SKYEVAULT_PROTECTED_REFS || 'refs/heads/main,refs/heads/master')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    allowDeleteRefs: process.env.SKYEVAULT_ALLOW_DELETE_REFS === '1',
    allowForcePush: process.env.SKYEVAULT_ALLOW_FORCE_PUSH === '1',
    allowProtectedTagUpdates: process.env.SKYEVAULT_ALLOW_PROTECTED_TAG_UPDATES === '1',
    protectedTags: String(process.env.SKYEVAULT_PROTECTED_TAGS || 'refs/tags/v*,refs/tags/release-*')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  };
}

function readPolicy() {
  const saved = readJsonFile(policyPath, {});
  const base = defaultPolicy();
  return {
    ...base,
    ...saved,
    protectedRefs: Array.isArray(saved.protectedRefs) ? saved.protectedRefs.map(String).filter(Boolean) : base.protectedRefs,
    protectedTags: Array.isArray(saved.protectedTags) ? saved.protectedTags.map(String).filter(Boolean) : base.protectedTags,
    allowDeleteRefs: Boolean(saved.allowDeleteRefs ?? base.allowDeleteRefs),
    allowForcePush: Boolean(saved.allowForcePush ?? base.allowForcePush),
    allowProtectedTagUpdates: Boolean(saved.allowProtectedTagUpdates ?? base.allowProtectedTagUpdates)
  };
}

function savePolicy(input, auth) {
  const current = readPolicy();
  const next = {
    schema: 'skyevault.git-remote-policy.v1',
    updatedAt: nowIso(),
    updatedBy: auth.remoteUser,
    protectedRefs: Array.isArray(input.protectedRefs) ? input.protectedRefs.map(String).filter(Boolean) : current.protectedRefs,
    protectedTags: Array.isArray(input.protectedTags) ? input.protectedTags.map(String).filter(Boolean) : current.protectedTags,
    allowDeleteRefs: Boolean(input.allowDeleteRefs ?? current.allowDeleteRefs),
    allowForcePush: Boolean(input.allowForcePush ?? current.allowForcePush),
    allowProtectedTagUpdates: Boolean(input.allowProtectedTagUpdates ?? current.allowProtectedTagUpdates)
  };
  writeJsonFile(policyPath, next);
  appendLedgers({
    schema: 'skyevault.git-remote-policy-event.v1',
    event: 'git.remote-policy-update',
    recordedAt: nowIso(),
    ...authLedgerFields(auth),
    policy: next
  });
  return next;
}

function bytesHuman(value) {
  const size = Number(value || 0);
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** index).toFixed(index ? 2 : 0)} ${units[index]}`;
}

function installHook(repoPath, workspaceId, repoId) {
  const hooksDir = path.join(repoPath, 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  const preReceiveHook = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function git(args) {
  try {
    execFileSync('git', args, { cwd: process.cwd(), stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isZero(rev) {
  return /^0+$/.test(rev);
}

function protectedMatch(ref, protectedRefs) {
  return protectedRefs.some((rule) => {
    if (!rule) return false;
    if (rule.endsWith('/*')) return ref.startsWith(rule.slice(0, -1));
    if (rule.includes('*')) {
      const escaped = rule.replace(/[|\\\\{}()[\\]^$+?.]/g, '\\\\$&').replace(/\\*/g, '.*');
      return new RegExp('^' + escaped + '$').test(ref);
    }
    return ref === rule;
  });
}

function readPolicy() {
  const file = process.env.SKYEVAULT_BRANCH_POLICY_FILE || '';
  if (!file || !fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

function diskBytes(dir) {
  if (!dir || !fs.existsSync(dir)) return 0;
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

function objectCount() {
  try {
    const output = execFileSync('git', ['count-objects', '-v'], { cwd: process.cwd(), encoding: 'utf8' });
    const values = Object.fromEntries(output.split(/\\r?\\n/).map((line) => line.split(/:\\s+/)).filter((parts) => parts.length === 2));
    return Number(values.count || 0) + Number(values['in-pack'] || 0);
  } catch {
    return 0;
  }
}

const input = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/).filter(Boolean);
const policy = readPolicy();
const protectedRefs = Array.isArray(policy.protectedRefs) ? policy.protectedRefs : String(process.env.SKYEVAULT_PROTECTED_REFS || 'refs/heads/main,refs/heads/master').split(',').map((item) => item.trim()).filter(Boolean);
const protectedTags = Array.isArray(policy.protectedTags) ? policy.protectedTags : String(process.env.SKYEVAULT_PROTECTED_TAGS || 'refs/tags/v*,refs/tags/release-*').split(',').map((item) => item.trim()).filter(Boolean);
const allowDeletes = Boolean(policy.allowDeleteRefs ?? (process.env.SKYEVAULT_ALLOW_DELETE_REFS === '1'));
const allowForce = Boolean(policy.allowForcePush ?? (process.env.SKYEVAULT_ALLOW_FORCE_PUSH === '1'));
const allowProtectedTagUpdates = Boolean(policy.allowProtectedTagUpdates ?? (process.env.SKYEVAULT_ALLOW_PROTECTED_TAG_UPDATES === '1'));
const workspaceQuotaBytes = Number(process.env.SKYEVAULT_WORKSPACE_QUOTA_BYTES || 0);
const repoObjectLimit = Number(process.env.SKYEVAULT_REPO_OBJECT_LIMIT || 0);
const workspacePath = process.env.SKYEVAULT_WORKSPACE_PATH || '';
const errors = [];

for (const line of input) {
  const [oldRev, newRev, ref] = line.split(/\\s+/);
  if (isZero(newRev) && !allowDeletes) {
    errors.push('Ref deletion denied by SkyeVault policy: ' + ref);
    continue;
  }
  if (!allowForce && protectedMatch(ref, protectedRefs) && !isZero(oldRev) && !isZero(newRev)) {
    const fastForward = git(['merge-base', '--is-ancestor', oldRev, newRev]);
    if (!fastForward) errors.push('Non-fast-forward update denied by SkyeVault policy: ' + ref);
  }
  if (!allowProtectedTagUpdates && protectedMatch(ref, protectedTags) && !isZero(oldRev) && !isZero(newRev)) {
    errors.push('Protected tag update denied by SkyeVault policy: ' + ref);
  }
}

if (workspaceQuotaBytes > 0 && diskBytes(workspacePath) > workspaceQuotaBytes) {
  errors.push('Workspace storage quota exceeded by SkyeVault policy: ' + workspacePath);
}

if (repoObjectLimit > 0 && objectCount() > repoObjectLimit) {
  errors.push('Repository object quota exceeded by SkyeVault policy: ' + repoObjectLimit);
}

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
`;
  const postReceiveHook = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function append(file, event) {
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(event) + '\\n');
}

function git(args) {
  try {
    return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function commitInfo(rev) {
  if (!rev || /^0+$/.test(rev)) return null;
  const line = git(['show', '-s', '--format=%H%x09%an%x09%ae%x09%aI%x09%s', rev]);
  const [hash, authorName, authorEmail, date, ...subject] = line.split('\\t');
  return hash ? { hash, authorName, authorEmail, date, subject: subject.join('\\t') } : null;
}

const input = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/).filter(Boolean);
const workspaceId = process.env.SKYEVAULT_WORKSPACE_ID || 'default';
const repoId = process.env.SKYEVAULT_REPO_ID || path.basename(process.cwd()).replace(/\\.git$/, '');
const remoteUser = process.env.REMOTE_USER || process.env.SKYEVAULT_REMOTE_USER || 'unknown';
const remoteRole = process.env.SKYEVAULT_GATE_ROLE || process.env.SKYEVAULT_REMOTE_ROLE || null;
const customerId = process.env.SKYEVAULT_GATE_CUSTOMER_ID || process.env.SKYEVAULT_CUSTOMER_ID || null;
const apiKeyId = process.env.SKYEVAULT_GATE_API_KEY_ID || null;
const gateCardId = process.env.SKYEVAULT_GATE_CARD_ID || null;
const ledger = process.env.SKYEVAULT_REMOTE_LEDGER || '';
const workspaceLedger = process.env.SKYEVAULT_REMOTE_WORKSPACE_LEDGER || '';
const neuralDir = process.env.SKYEVAULT_REMOTE_NEURAL_DIR || '';
const events = [];

for (const line of input) {
  const [oldRev, newRev, ref] = line.split(/\\s+/);
  const event = {
    schema: 'skyevault.git-remote-ref-event.v1',
    event: 'git.ref-update',
    recordedAt: new Date().toISOString(),
    workspaceId,
    repoId,
    remoteUser,
    remoteRole,
    customerId,
    apiKeyId,
    gateCardId,
    ref,
    oldRev,
    newRev,
    action: /^0+$/.test(oldRev) ? 'create' : /^0+$/.test(newRev) ? 'delete' : 'update',
    commit: commitInfo(newRev)
  };
  events.push(event);
  append(ledger, event);
  append(workspaceLedger, event);
}

if (neuralDir) {
  fs.mkdirSync(neuralDir, { recursive: true });
  const safeName = [workspaceId, repoId].join('__').replace(/[^A-Za-z0-9._-]+/g, '-');
  const file = path.join(neuralDir, safeName + '.json');
  let graph = { schema: 'skyevault.git-remote-neural-map.v1', workspaceId, repoId, customerId, refs: {}, events: [] };
  if (fs.existsSync(file)) {
    try { graph = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  }
  graph.updatedAt = new Date().toISOString();
  graph.customerId = customerId || graph.customerId || null;
  graph.refs = {};
  for (const refLine of git(['for-each-ref', '--format=%(refname)%09%(objectname)']).split(/\\r?\\n/).filter(Boolean)) {
    const [ref, object] = refLine.split('\\t');
    graph.refs[ref] = object;
  }
  graph.events = [...(graph.events || []), ...events].slice(-200);
  graph.nodes = [
    { id: 'workspace:' + workspaceId, type: 'workspace', label: workspaceId },
    { id: 'repo:' + repoId, type: 'repo', label: repoId }
  ];
  graph.edges = [{ from: 'workspace:' + workspaceId, to: 'repo:' + repoId, type: 'owns' }];
  for (const event of graph.events.slice(-80)) {
    if (!event.commit) continue;
    graph.nodes.push({ id: 'commit:' + event.commit.hash, type: 'commit', label: event.commit.subject || event.commit.hash.slice(0, 12), data: event.commit });
    graph.edges.push({ from: 'repo:' + repoId, to: 'commit:' + event.commit.hash, type: event.action, data: { ref: event.ref } });
  }
  fs.writeFileSync(file, JSON.stringify(graph, null, 2) + '\\n');
}
`;
  const preReceivePath = path.join(hooksDir, 'pre-receive');
  fs.writeFileSync(preReceivePath, preReceiveHook);
  fs.chmodSync(preReceivePath, 0o755);
  const postReceivePath = path.join(hooksDir, 'post-receive');
  fs.writeFileSync(postReceivePath, postReceiveHook);
  fs.chmodSync(postReceivePath, 0o755);
}

function ensureRepo(repoPath, workspaceId, repoId) {
  if (!fs.existsSync(repoPath)) {
    if (!autoCreate) throw new Error(`Repo does not exist: ${workspaceId}/${repoId}`);
    fs.mkdirSync(path.dirname(repoPath), { recursive: true });
    git(['init', '--bare', repoPath]);
  }
  git(['config', 'http.receivepack', 'true'], { cwd: repoPath });
  git(['config', 'http.uploadpack', 'true'], { cwd: repoPath });
  git(['config', 'skyevault.workspace', workspaceId], { cwd: repoPath });
  git(['config', 'skyevault.repo', repoId], { cwd: repoPath });
  installHook(repoPath, workspaceId, repoId);
}

function parseRepoPath(urlPath) {
  const clean = decodeURIComponent(urlPath).replace(/^\/+/, '');
  const match = clean.match(/^(?:(?:repos|git)\/)?(.+?\.git)(?:\/(.*))?$/);
  if (!match) return null;
  const repoKey = match[1].split('/').filter(Boolean);
  if (repoKey.some((part) => part === '..' || part.includes('\\0'))) return null;
  const rawRepo = repoKey.at(-1).replace(/\.git$/, '');
  const workspaceParts = repoKey.slice(0, -1);
  const workspaceId = sanitizePart(workspaceParts.join('-') || 'default');
  const repoId = sanitizePart(rawRepo);
  if (!workspaceId || !repoId) return null;
  const repoRelative = path.join(workspaceId, `${repoId}.git`);
  const suffix = match[2] ? `/${match[2]}` : '';
  return {
    workspaceId,
    repoId,
    repoRelative,
    repoPath: path.join(repoRoot, repoRelative),
    pathInfo: `/${repoRelative.split(path.sep).join('/')}${suffix}`
  };
}

function parseCgiHeaders(buffer) {
  const text = buffer.toString('latin1');
  let index = text.indexOf('\r\n\r\n');
  let delimiterLength = 4;
  if (index === -1) {
    index = text.indexOf('\n\n');
    delimiterLength = 2;
  }
  if (index === -1) return null;
  const raw = text.slice(0, index);
  const bodyStart = Buffer.byteLength(text.slice(0, index + delimiterLength), 'latin1');
  let status = 200;
  const headers = {};
  for (const line of raw.split(/\r?\n/).filter(Boolean)) {
    const split = line.indexOf(':');
    if (split === -1) continue;
    const name = line.slice(0, split).trim();
    const value = line.slice(split + 1).trim();
    if (/^status$/i.test(name)) {
      status = Number(value.split(/\s+/)[0]) || 200;
    } else {
      headers[name.toLowerCase()] = value;
    }
  }
  return { status, headers, bodyStart };
}

function handleGit(req, res, repo, auth) {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  requireRole(auth, requiredGitRole(req, url));
  requireWorkspace(auth, repo.workspaceId);
  if (gitServiceName(req, url) === 'git-receive-pack') enforceGitQuota(auth, repo);
  ensureRepo(repo.repoPath, repo.workspaceId, repo.repoId);
  const remoteUser = auth.remoteUser;
  const env = {
    ...process.env,
    GIT_PROJECT_ROOT: repoRoot,
    GIT_HTTP_EXPORT_ALL: '1',
    PATH_INFO: repo.pathInfo,
    QUERY_STRING: url.searchParams.toString(),
    REQUEST_METHOD: req.method,
    CONTENT_TYPE: req.headers['content-type'] || '',
    CONTENT_LENGTH: req.headers['content-length'] || '',
    REMOTE_USER: remoteUser,
    SKYEVAULT_REMOTE_USER: remoteUser,
    SKYEVAULT_REMOTE_ROLE: auth.role || '',
    SKYEVAULT_GATE_ROLE: auth.role || '',
    SKYEVAULT_GATE_CUSTOMER_ID: auth.customerId || '',
    SKYEVAULT_CUSTOMER_ID: auth.customerId || '',
    SKYEVAULT_GATE_API_KEY_ID: auth.apiKeyId || '',
    SKYEVAULT_GATE_CARD_ID: auth.gateCardId || '',
    SKYEVAULT_WORKSPACE_ID: repo.workspaceId,
    SKYEVAULT_REPO_ID: repo.repoId,
    SKYEVAULT_REMOTE_LEDGER: ledgerPath,
    SKYEVAULT_REMOTE_WORKSPACE_LEDGER: workspaceLedgerPath,
    SKYEVAULT_REMOTE_NEURAL_DIR: neuralDir,
    SKYEVAULT_BRANCH_POLICY_FILE: policyPath,
    SKYEVAULT_WORKSPACE_PATH: path.join(repoRoot, repo.workspaceId),
    SKYEVAULT_WORKSPACE_QUOTA_BYTES: auth.quotas?.storageMb ? String(auth.quotas.storageMb * 1024 * 1024) : '0',
    SKYEVAULT_REPO_OBJECT_LIMIT: auth.quotas?.fileLimit ? String(auth.quotas.fileLimit) : '0',
    SKYEVAULT_PROTECTED_REFS: process.env.SKYEVAULT_PROTECTED_REFS || 'refs/heads/main,refs/heads/master',
    SKYEVAULT_ALLOW_DELETE_REFS: process.env.SKYEVAULT_ALLOW_DELETE_REFS || '0',
    SKYEVAULT_ALLOW_FORCE_PUSH: process.env.SKYEVAULT_ALLOW_FORCE_PUSH || '0',
    HTTP_GIT_PROTOCOL: req.headers['git-protocol'] || ''
  };
  const started = Date.now();
  const child = spawn('git', ['http-backend'], { env, cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
  req.pipe(child.stdin);

  let headersSent = false;
  let pending = Buffer.alloc(0);
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    if (headersSent) {
      res.write(chunk);
      return;
    }
    pending = Buffer.concat([pending, chunk]);
    const parsed = parseCgiHeaders(pending);
    if (!parsed) return;
    headersSent = true;
    res.writeHead(parsed.status, parsed.headers);
    const rest = pending.subarray(parsed.bodyStart);
    if (rest.length) res.write(rest);
    pending = Buffer.alloc(0);
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8');
  });

  child.on('close', (code) => {
    if (!headersSent) {
      if (!res.headersSent) text(res, code === 0 ? 200 : 500, stderr || `git http-backend exited ${code}`);
    } else {
      res.end();
    }
    appendLedgers({
      schema: 'skyevault.git-remote-request.v1',
      event: 'git.remote-request',
      recordedAt: nowIso(),
      workspaceId: repo.workspaceId,
      repoId: repo.repoId,
      ...authLedgerFields(auth),
      method: req.method,
      path: url.pathname,
      service: url.searchParams.get('service') || path.basename(url.pathname),
      code,
      durationMs: Date.now() - started,
      stderr: stderr.trim().slice(0, 500)
    });
  });
}

function listRepos(auth = null) {
  if (!fs.existsSync(repoRoot)) return [];
  const repos = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name.endsWith('.git')) {
        const relative = path.relative(repoRoot, file).split(path.sep).join('/');
        const workspaceId = sanitizePart(relative.split('/').slice(0, -1).join('-') || 'default');
        const repoId = sanitizePart(entry.name.replace(/\.git$/, ''));
        if (!workspaceId || !repoId) continue;
        repos.push({
          id: `${workspaceId}/${repoId}.git`,
          workspaceId,
          repoId,
          path: file
        });
      } else if (entry.isDirectory()) {
        visit(file);
      }
    }
  };
  visit(repoRoot);
  return repos
    .filter((repo) => !auth || workspaceAllowed(auth, repo.workspaceId))
    .map((repo) => repoSummary(repo))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function refsForRepo(repoPath) {
  if (!fs.existsSync(repoPath)) return [];
  const output = git(['for-each-ref', '--format=%(refname)%09%(objectname)%09%(committerdate:iso8601)%09%(subject)'], { cwd: repoPath });
  return output.split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [ref, object, date, ...subject] = line.split('\t');
      return { ref, object, date, subject: subject.join('\t') };
    });
}

function repoDiskBytes(repoPath) {
  if (!fs.existsSync(repoPath)) return 0;
  let total = 0;
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const stat = fs.lstatSync(file);
      if (entry.isDirectory()) visit(file);
      else total += stat.size;
    }
  };
  visit(repoPath);
  return total;
}

function workspaceDiskBytes(workspaceId) {
  const workspacePath = path.join(repoRoot, sanitizePart(workspaceId));
  return repoDiskBytes(workspacePath);
}

function workspaceRepoCount(workspaceId) {
  const workspacePath = path.join(repoRoot, sanitizePart(workspaceId));
  if (!fs.existsSync(workspacePath)) return 0;
  return fs.readdirSync(workspacePath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('.git'))
    .length;
}

function repoObjectCount(repoPath) {
  if (!fs.existsSync(repoPath)) return 0;
  const output = git(['count-objects', '-v'], { cwd: repoPath });
  const values = Object.fromEntries(output.split(/\r?\n/).map((line) => line.split(/:\s+/)).filter((parts) => parts.length === 2));
  return Number(values.count || 0) + Number(values['in-pack'] || 0);
}

function workspaceRepos(workspaceId, auth = null) {
  return listRepos(auth).filter((repo) => repo.workspaceId === sanitizePart(workspaceId));
}

function quotaSummary(workspaceId, auth) {
  requireWorkspace(auth, workspaceId);
  const repos = workspaceRepos(workspaceId, auth);
  const usedBytes = workspaceDiskBytes(workspaceId);
  const repoObjects = repos.reduce((sum, repo) => sum + repoObjectCount(repo.path), 0);
  const storageLimitBytes = (auth.quotas?.storageMb || 0) * 1024 * 1024;
  return {
    schema: 'skyevault.git-remote-quota.v1',
    workspaceId: sanitizePart(workspaceId),
    repoCount: repos.length,
    usedBytes,
    usedHuman: bytesHuman(usedBytes),
    storageLimitBytes,
    storageLimitHuman: storageLimitBytes ? bytesHuman(storageLimitBytes) : null,
    storageRemainingBytes: storageLimitBytes ? Math.max(0, storageLimitBytes - usedBytes) : null,
    fileLimit: auth.quotas?.fileLimit || null,
    objectCount: repoObjects,
    objectRemaining: auth.quotas?.fileLimit ? Math.max(0, auth.quotas.fileLimit - repoObjects) : null,
    workspaceLimit: auth.quotas?.workspaceLimit || null
  };
}

function enforceGitQuota(auth, repo) {
  const quotas = auth.quotas || {};
  if (quotas.workspaceLimit && !fs.existsSync(repo.repoPath) && workspaceRepoCount(repo.workspaceId) >= quotas.workspaceLimit) {
    const error = new Error(`Workspace ${repo.workspaceId} is at its repo quota (${quotas.workspaceLimit}).`);
    error.status = 507;
    throw error;
  }
  if (quotas.storageMb) {
    const usedBytes = workspaceDiskBytes(repo.workspaceId);
    const limitBytes = quotas.storageMb * 1024 * 1024;
    if (usedBytes >= limitBytes) {
      const error = new Error(`Workspace ${repo.workspaceId} is at its vault storage quota (${quotas.storageMb} MB).`);
      error.status = 507;
      throw error;
    }
  }
  if (quotas.fileLimit && fs.existsSync(repo.repoPath)) {
    const objectCount = repoObjectCount(repo.repoPath);
    if (objectCount >= quotas.fileLimit) {
      const error = new Error(`Repo ${repo.workspaceId}/${repo.repoId} is at its vault object quota (${quotas.fileLimit}).`);
      error.status = 507;
      throw error;
    }
  }
}

async function createSnapshot(auth) {
  requireRole(auth, requiredAdminRole);
  const snapshotId = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const manifestPath = path.join(snapshotRoot, 'manifests', `${snapshotId}.json`);
  const repos = [];
  for (const repo of listRepos(auth)) {
    requireWorkspace(auth, repo.workspaceId);
    const refs = refsForRepo(repo.path);
    if (!refs.length) {
      repos.push({
        workspaceId: repo.workspaceId,
        repoId: repo.repoId,
        empty: true,
        bundlePath: null,
        bundleFile: null,
        bytes: 0,
        human: '0 B',
        sha256: null,
        refs,
        objectCount: repoObjectCount(repo.path),
        diskBytes: repoDiskBytes(repo.path),
        verify: ['Empty bare repository; no bundle generated.']
      });
      continue;
    }
    const bundleDir = path.join(snapshotRoot, 'bundles', snapshotId, repo.workspaceId, repo.repoId);
    fs.mkdirSync(bundleDir, { recursive: true });
    const bundlePath = path.join(bundleDir, `${repo.repoId}.bundle`);
    git(['bundle', 'create', bundlePath, '--all'], { cwd: repo.path });
    const verify = git(['bundle', 'verify', bundlePath], { cwd: repo.path });
    const stat = fs.statSync(bundlePath);
    const entry = {
      workspaceId: repo.workspaceId,
      repoId: repo.repoId,
      bundlePath,
      bundleFile: path.relative(snapshotRoot, bundlePath).split(path.sep).join('/'),
      bytes: stat.size,
      human: bytesHuman(stat.size),
      sha256: await hashFile(bundlePath),
      refs,
      objectCount: repoObjectCount(repo.path),
      diskBytes: repoDiskBytes(repo.path),
      verify: verify.split(/\r?\n/).filter(Boolean)
    };
    repos.push(entry);
  }
  const manifest = {
    schema: 'skyevault.git-remote-snapshot.v1',
    snapshotId,
    createdAt: nowIso(),
    createdBy: auth.remoteUser,
    repoCount: repos.length,
    totalBundleBytes: repos.reduce((sum, repo) => sum + repo.bytes, 0),
    totalBundleHuman: bytesHuman(repos.reduce((sum, repo) => sum + repo.bytes, 0)),
    policy: readPolicy(),
    repos
  };
  writeJsonFile(manifestPath, manifest);
  writeJsonFile(path.join(snapshotRoot, 'latest.json'), manifest);
  if (snapshotMirrorRoot) mirrorSnapshot(snapshotId, manifestPath, repos);
  appendLedgers({
    schema: 'skyevault.git-remote-snapshot-event.v1',
    event: 'git.remote-snapshot',
    recordedAt: nowIso(),
    ...authLedgerFields(auth),
    snapshotId,
    repoCount: repos.length,
    totalBundleBytes: manifest.totalBundleBytes
  });
  return manifest;
}

function mirrorSnapshot(snapshotId, manifestPath, repos) {
  const targetRoot = path.join(snapshotMirrorRoot, snapshotId);
  fs.mkdirSync(targetRoot, { recursive: true });
  for (const repo of repos) {
    if (!repo.bundlePath) continue;
    const target = path.join(targetRoot, repo.bundleFile);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(repo.bundlePath, target);
  }
  fs.copyFileSync(manifestPath, path.join(targetRoot, 'manifest.json'));
}

function listSnapshots(auth) {
  requireRole(auth, requiredViewRole);
  const dir = path.join(snapshotRoot, 'manifests');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJsonFile(path.join(dir, name), null))
    .filter(Boolean)
    .map((manifest) => ({
      snapshotId: manifest.snapshotId,
      createdAt: manifest.createdAt,
      repoCount: manifest.repos.filter((repo) => workspaceAllowed(auth, repo.workspaceId)).length,
      totalBundleBytes: manifest.repos
        .filter((repo) => workspaceAllowed(auth, repo.workspaceId))
        .reduce((sum, repo) => sum + Number(repo.bytes || 0), 0)
    }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function snapshotManifest(snapshotId, auth) {
  requireRole(auth, requiredViewRole);
  const safeId = sanitizePart(snapshotId);
  const manifest = readJsonFile(path.join(snapshotRoot, 'manifests', `${safeId}.json`), null);
  if (!manifest) return null;
  return {
    ...manifest,
    repos: manifest.repos.filter((repo) => workspaceAllowed(auth, repo.workspaceId))
  };
}

async function verifySnapshot(snapshotId, auth) {
  const manifest = snapshotManifest(snapshotId, auth);
  if (!manifest) throw new Error(`Snapshot not found: ${snapshotId}`);
  const checks = [];
  for (const repo of manifest.repos) {
    if (repo.empty && !repo.bundlePath) {
      checks.push({ workspaceId: repo.workspaceId, repoId: repo.repoId, empty: true, exists: true, sha256Ok: true, bundleOk: true, verify: repo.verify || [] });
      continue;
    }
    const exists = fs.existsSync(repo.bundlePath);
    const sha256 = exists ? await hashFile(repo.bundlePath) : null;
    let bundleOk = false;
    let verify = [];
    if (exists) {
      try {
        verify = git(['bundle', 'verify', repo.bundlePath], { cwd: root }).split(/\r?\n/).filter(Boolean);
        bundleOk = true;
      } catch (error) {
        verify = [error.message];
      }
    }
    checks.push({
      workspaceId: repo.workspaceId,
      repoId: repo.repoId,
      exists,
      sha256Ok: sha256 === repo.sha256,
      bundleOk,
      verify
    });
  }
  return {
    schema: 'skyevault.git-remote-snapshot-verify.v1',
    snapshotId: manifest.snapshotId,
    verifiedAt: nowIso(),
    ok: checks.every((check) => check.exists && check.sha256Ok && check.bundleOk),
    checks
  };
}

function repoEvents(workspaceId, repoId) {
  return readJsonl(ledgerPath)
    .filter((event) => event.workspaceId === workspaceId && event.repoId === repoId)
    .slice(-200);
}

function neuralMapPath(workspaceId, repoId) {
  const safeName = [workspaceId, repoId].join('__').replace(/[^A-Za-z0-9._-]+/g, '-');
  return path.join(neuralDir, `${safeName}.json`);
}

function readNeuralMap(workspaceId, repoId) {
  const file = neuralMapPath(workspaceId, repoId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function repoSummary(repo) {
  const refs = fs.existsSync(repo.path) ? refsForRepo(repo.path) : [];
  const defaultHead = refs.find((item) => item.ref === 'refs/heads/main') || refs.find((item) => item.ref === 'refs/heads/master') || refs[0] || null;
  const events = repoEvents(repo.workspaceId, repo.repoId);
  return {
    ...repo,
    cloneUrl: `/git/${repo.workspaceId}/${repo.repoId}.git`,
    refs: refs.length,
    branches: refs.filter((item) => item.ref.startsWith('refs/heads/')).length,
    tags: refs.filter((item) => item.ref.startsWith('refs/tags/')).length,
    head: defaultHead,
    lastEvent: events.at(-1) || null,
    diskBytes: repoDiskBytes(repo.path),
    objectCount: repoObjectCount(repo.path)
  };
}

function repoFromParts(workspaceId, repoId) {
  const cleanWorkspace = sanitizePart(workspaceId);
  const cleanRepo = sanitizePart(repoId);
  if (!cleanWorkspace || !cleanRepo) throw new Error('Invalid workspace or repo id.');
  return {
    workspaceId: cleanWorkspace,
    repoId: cleanRepo,
    repoRelative: path.join(cleanWorkspace, `${cleanRepo}.git`),
    repoPath: path.join(repoRoot, cleanWorkspace, `${cleanRepo}.git`)
  };
}

function repoDetail(workspaceId, repoId) {
  const repo = repoFromParts(workspaceId, repoId);
  if (!fs.existsSync(repo.repoPath)) return null;
  return repoSummary({
    id: `${repo.workspaceId}/${repo.repoId}.git`,
    workspaceId: repo.workspaceId,
    repoId: repo.repoId,
    path: repo.repoPath
  });
}

async function exportRepoBundle(workspaceId, repoId, auth) {
  const detail = repoDetail(workspaceId, repoId);
  if (!detail) throw new Error(`Repo not found: ${workspaceId}/${repoId}`);
  requireWorkspace(auth, detail.workspaceId);
  const stamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const exportDir = path.join(storageRoot, 'exports', detail.workspaceId, detail.repoId);
  fs.mkdirSync(exportDir, { recursive: true });
  const bundlePath = path.join(exportDir, `${detail.repoId}-${stamp}.bundle`);
  git(['bundle', 'create', bundlePath, '--all'], { cwd: detail.path });
  const verify = git(['bundle', 'verify', bundlePath], { cwd: detail.path });
  const stat = fs.statSync(bundlePath);
  const result = {
    schema: 'skyevault.git-remote-export.v1',
    exportedAt: nowIso(),
    workspaceId: detail.workspaceId,
    repoId: detail.repoId,
    path: bundlePath,
    fileName: path.basename(bundlePath),
    bytes: stat.size,
    sha256: await hashFile(bundlePath),
    verify: verify.split(/\r?\n/).filter(Boolean)
  };
  appendLedgers({
    schema: 'skyevault.git-remote-export.v1',
    event: 'git.remote-export',
    ...authLedgerFields(auth),
    ...result
  });
  return result;
}

async function handleAdminApi(req, res, url, auth) {
  if (url.pathname === '/__skyevault/repos' && req.method === 'GET') {
    requireRole(auth, requiredViewRole);
    json(res, 200, { ok: true, repos: listRepos(auth) });
    return true;
  }

  if (url.pathname === '/__skyevault/repos' && req.method === 'POST') {
    requireRole(auth, requiredPushRole);
    const body = await readJsonBody(req);
    const repo = repoFromParts(body.workspaceId || 'default', body.repoId || body.name || '');
    requireWorkspace(auth, repo.workspaceId);
    const workspaceLimit = auth.quotas?.workspaceLimit || 0;
    if (workspaceLimit && !fs.existsSync(repo.repoPath) && workspaceRepoCount(repo.workspaceId) >= workspaceLimit) {
      const error = new Error(`Workspace ${repo.workspaceId} is at its repo quota (${workspaceLimit}).`);
      error.status = 507;
      throw error;
    }
    ensureRepo(repo.repoPath, repo.workspaceId, repo.repoId);
    json(res, 201, { ok: true, repo: repoDetail(repo.workspaceId, repo.repoId) });
    return true;
  }

  if (url.pathname === '/__skyevault/policy' && req.method === 'GET') {
    requireRole(auth, requiredViewRole);
    json(res, 200, { ok: true, policy: readPolicy() });
    return true;
  }

  if (url.pathname === '/__skyevault/policy' && req.method === 'PUT') {
    requireRole(auth, requiredAdminRole);
    json(res, 200, { ok: true, policy: savePolicy(await readJsonBody(req), auth) });
    return true;
  }

  if (url.pathname === '/__skyevault/quota' && req.method === 'GET') {
    requireRole(auth, requiredViewRole);
    const workspaces = [...new Set(listRepos(auth).map((repo) => repo.workspaceId))]
      .sort((a, b) => a.localeCompare(b))
      .map((workspaceId) => quotaSummary(workspaceId, auth));
    json(res, 200, { ok: true, workspaces });
    return true;
  }

  const quotaRoute = url.pathname.match(/^\/__skyevault\/workspaces\/([^/]+)\/quota$/);
  if (quotaRoute && req.method === 'GET') {
    requireRole(auth, requiredViewRole);
    json(res, 200, { ok: true, quota: quotaSummary(quotaRoute[1], auth) });
    return true;
  }

  if (url.pathname === '/__skyevault/snapshots' && req.method === 'GET') {
    json(res, 200, { ok: true, snapshots: listSnapshots(auth) });
    return true;
  }

  if (url.pathname === '/__skyevault/snapshots' && req.method === 'POST') {
    json(res, 201, { ok: true, snapshot: await createSnapshot(auth) });
    return true;
  }

  const snapshotRoute = url.pathname.match(/^\/__skyevault\/snapshots\/([^/]+)(?:\/(verify))?$/);
  if (snapshotRoute) {
    const [, snapshotId, action] = snapshotRoute;
    if (!action && req.method === 'GET') {
      const manifest = snapshotManifest(snapshotId, auth);
      if (!manifest) json(res, 404, { ok: false, error: `Snapshot not found: ${snapshotId}` });
      else json(res, 200, { ok: true, snapshot: manifest });
      return true;
    }
    if (action === 'verify' && req.method === 'POST') {
      requireRole(auth, requiredAdminRole);
      json(res, 200, { ok: true, verification: await verifySnapshot(snapshotId, auth) });
      return true;
    }
  }

  const repoRoute = url.pathname.match(/^\/__skyevault\/repos\/([^/]+)\/([^/]+)(?:\/(refs|events|neural-map|export))?$/);
  if (repoRoute) {
    const [, workspaceId, repoId, action] = repoRoute;
    requireRole(auth, requiredViewRole);
    requireWorkspace(auth, workspaceId);
    const detail = repoDetail(workspaceId, repoId);
    if (!detail && action !== undefined) {
      json(res, 404, { ok: false, error: `Repo not found: ${workspaceId}/${repoId}` });
      return true;
    }
    if (!action && req.method === 'GET') {
      if (!detail) json(res, 404, { ok: false, error: `Repo not found: ${workspaceId}/${repoId}` });
      else json(res, 200, { ok: true, repo: detail });
      return true;
    }
    if (action === 'refs' && req.method === 'GET') {
      json(res, 200, { ok: true, refs: refsForRepo(detail.path) });
      return true;
    }
    if (action === 'events' && req.method === 'GET') {
      json(res, 200, { ok: true, events: repoEvents(detail.workspaceId, detail.repoId) });
      return true;
    }
    if (action === 'neural-map' && req.method === 'GET') {
      json(res, 200, { ok: true, neuralMap: readNeuralMap(detail.workspaceId, detail.repoId) });
      return true;
    }
    if (action === 'export' && req.method === 'POST') {
      json(res, 201, { ok: true, export: await exportRepoBundle(workspaceId, repoId, auth) });
      return true;
    }
  }

  if (url.pathname === '/__skyevault/ledger' && req.method === 'GET') {
    requireRole(auth, url.searchParams.get('all') === '1' ? requiredAdminRole : requiredViewRole);
    const events = readJsonl(ledgerPath)
      .filter((event) => !event.workspaceId || workspaceAllowed(auth, event.workspaceId))
      .slice(-500);
    json(res, 200, {
      ok: true,
      ledgerPath,
      workspaceLedgerPath,
      eventCount: events.length,
      refUpdates: events.filter((event) => event.event === 'git.ref-update').length,
      requests: events.filter((event) => event.event === 'git.remote-request').length,
      exports: events.filter((event) => event.event === 'git.remote-export').length,
      events
    });
    return true;
  }

  return false;
}

function adminConsoleHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SkyeVault Git Remote</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #111411;
      --panel: #191d18;
      --line: #31382f;
      --text: #eef2e8;
      --muted: #aeb8a8;
      --accent: #7ddc8a;
      --warn: #f2c66d;
      --bad: #ff8c7a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 24px;
      border-bottom: 1px solid var(--line);
      background: #151914;
    }
    h1 { margin: 0; font-size: 18px; letter-spacing: 0; }
    main { display: grid; grid-template-columns: 340px 1fr; min-height: calc(100vh - 62px); }
    aside { border-right: 1px solid var(--line); padding: 18px; overflow: auto; }
    section { padding: 18px 22px; overflow: auto; }
    label { display: block; color: var(--muted); font-size: 12px; margin-bottom: 6px; }
    input {
      width: 100%;
      background: #0f120f;
      border: 1px solid var(--line);
      color: var(--text);
      padding: 9px 10px;
      border-radius: 6px;
    }
    button {
      border: 1px solid var(--line);
      background: #20261f;
      color: var(--text);
      padding: 9px 11px;
      border-radius: 6px;
      cursor: pointer;
    }
    button.primary { border-color: #5fa969; background: #203822; }
    button:hover { border-color: var(--accent); }
    .row { display: flex; gap: 8px; align-items: end; }
    .row > * { flex: 1; }
    .stack { display: grid; gap: 12px; }
    .repo {
      width: 100%;
      text-align: left;
      margin-bottom: 8px;
      display: grid;
      gap: 4px;
    }
    .repo.active { border-color: var(--accent); }
    .muted { color: var(--muted); }
    .statgrid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
    .stat { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 12px; }
    .stat strong { display: block; font-size: 22px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border-bottom: 1px solid var(--line); padding: 9px 8px; text-align: left; vertical-align: top; }
    th { color: var(--muted); font-weight: 600; font-size: 12px; }
    code { color: var(--accent); overflow-wrap: anywhere; }
    pre {
      background: #0f120f;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      overflow: auto;
      max-height: 320px;
    }
    .status { color: var(--muted); }
    .error { color: var(--bad); }
    .ok { color: var(--accent); }
    @media (max-width: 900px) {
      main { grid-template-columns: 1fr; }
      aside { border-right: 0; border-bottom: 1px solid var(--line); }
      .statgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <header>
    <h1>SkyeVault Git Remote</h1>
    <div class="status" id="status">Loading</div>
  </header>
  <main>
    <aside class="stack">
      <form id="create" class="stack">
        <div class="row">
          <div><label for="workspace">Workspace</label><input id="workspace" value="acme" autocomplete="off"></div>
          <div><label for="repo">Repo</label><input id="repo" value="demo" autocomplete="off"></div>
        </div>
        <button class="primary" type="submit">Create Repo</button>
      </form>
      <button id="refresh" type="button">Refresh</button>
      <button id="snapshotNow" type="button">Create Snapshot</button>
      <div id="repos"></div>
    </aside>
    <section>
      <div class="statgrid">
        <div class="stat"><span class="muted">Repos</span><strong id="repoCount">0</strong></div>
        <div class="stat"><span class="muted">Refs</span><strong id="refCount">0</strong></div>
        <div class="stat"><span class="muted">Events</span><strong id="eventCount">0</strong></div>
        <div class="stat"><span class="muted">Exports</span><strong id="exportCount">0</strong></div>
        <div class="stat"><span class="muted">Snapshots</span><strong id="snapshotCount">0</strong></div>
        <div class="stat"><span class="muted">Stored</span><strong id="storedCount">0 B</strong></div>
      </div>
      <div id="detail" class="stack"></div>
    </section>
  </main>
  <script>
    const state = { repos: [], selected: null, ledger: null, snapshots: [], quota: null, policy: null };
    const $ = (id) => document.getElementById(id);
    function setStatus(text, cls = '') {
      $('status').className = cls || 'status';
      $('status').textContent = text;
    }
    async function api(path, options = {}) {
      const response = await fetch(path, { credentials: 'same-origin', ...options });
      const text = await response.text();
      let data = {};
      try { data = JSON.parse(text || '{}'); } catch { data = { ok: false, error: text }; }
      if (!response.ok || data.ok === false) throw new Error(data.error || response.statusText);
      return data;
    }
    function bytes(value) {
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = Number(value || 0);
      let index = 0;
      while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
      return (index ? size.toFixed(2) : String(size)) + ' ' + units[index];
    }
    function esc(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[char]);
    }
    function short(hash) { return hash ? hash.slice(0, 12) : ''; }
    function repoId(repo) { return repo.workspaceId + '/' + repo.repoId; }
    function repoApiPath(workspaceId, repoIdValue) {
      return '/__skyevault/repos/' + encodeURIComponent(workspaceId) + '/' + encodeURIComponent(repoIdValue);
    }
    function renderRepos() {
      $('repoCount').textContent = state.repos.length;
      $('repos').innerHTML = state.repos.map((repo) => '<button class="repo ' + (state.selected && repoId(state.selected) === repoId(repo) ? 'active' : '') + '" data-id="' + esc(repoId(repo)) + '">' +
        '<strong>' + esc(repoId(repo)) + '</strong>' +
        '<span class="muted">' + esc(repo.branches) + ' branches - ' + esc(bytes(repo.diskBytes)) + '</span>' +
        '</button>').join('');
      document.querySelectorAll('.repo').forEach((button) => {
        button.addEventListener('click', () => selectRepo(button.dataset.id));
      });
    }
    async function load() {
      setStatus('Loading');
      const [repos, ledger, snapshots, quota, policy] = await Promise.all([
        api('/__skyevault/repos'),
        api('/__skyevault/ledger'),
        api('/__skyevault/snapshots'),
        api('/__skyevault/quota'),
        api('/__skyevault/policy')
      ]);
      state.repos = repos.repos;
      state.ledger = ledger;
      state.snapshots = snapshots.snapshots;
      state.quota = quota;
      state.policy = policy.policy;
      $('eventCount').textContent = ledger.eventCount;
      $('exportCount').textContent = ledger.exports;
      $('snapshotCount').textContent = state.snapshots.length;
      $('storedCount').textContent = bytes((quota.workspaces || []).reduce((sum, item) => sum + Number(item.usedBytes || 0), 0));
      renderRepos();
      if (!state.selected && state.repos[0]) await selectRepo(repoId(state.repos[0]));
      else if (state.selected) await selectRepo(repoId(state.selected));
      setStatus('Ready', 'ok');
    }
    async function selectRepo(id) {
      const [workspaceId, repoIdValue] = id.split('/');
      const basePath = repoApiPath(workspaceId, repoIdValue);
      const [detail, refs, events, neural, quota] = await Promise.all([
        api(basePath),
        api(basePath + '/refs'),
        api(basePath + '/events'),
        api(basePath + '/neural-map'),
        api('/__skyevault/workspaces/' + encodeURIComponent(workspaceId) + '/quota')
      ]);
      state.selected = detail.repo;
      $('refCount').textContent = refs.refs.length;
      renderRepos();
      const cloneUrl = location.origin + '/git/' + workspaceId + '/' + repoIdValue + '.git';
      $('detail').innerHTML =
        '<div class="stat"><span class="muted">Clone URL</span><p><code>' + esc(cloneUrl) + '</code></p><button id="exportBundle">Export Bundle</button></div>' +
        '<div class="stat"><span class="muted">Head</span><p><code>' + esc(detail.repo.head ? detail.repo.head.ref + ' @ ' + short(detail.repo.head.object) : 'empty') + '</code></p></div>' +
        '<div class="stat"><span class="muted">Workspace Quota</span><p><strong>' + esc(quota.quota.usedHuman) + '</strong> used' + (quota.quota.storageLimitHuman ? ' of ' + esc(quota.quota.storageLimitHuman) : '') + '</p><p class="muted">' + esc(quota.quota.objectCount) + ' Git objects, ' + esc(quota.quota.repoCount) + ' repos</p></div>' +
        '<div class="stat"><span class="muted">Branch Policy</span><p>Protected refs: <code>' + esc((state.policy.protectedRefs || []).join(', ')) + '</code></p><p>Protected tags: <code>' + esc((state.policy.protectedTags || []).join(', ')) + '</code></p></div>' +
        '<div><h2>Snapshots</h2><table><thead><tr><th>Snapshot</th><th>Repos</th><th>Bytes</th></tr></thead><tbody>' +
        state.snapshots.slice(0, 8).map((snapshot) => '<tr><td><code>' + esc(snapshot.snapshotId) + '</code></td><td>' + esc(snapshot.repoCount) + '</td><td>' + esc(bytes(snapshot.totalBundleBytes)) + '</td></tr>').join('') +
        '</tbody></table></div>' +
        '<div><h2>Refs</h2><table><thead><tr><th>Ref</th><th>Object</th><th>Subject</th></tr></thead><tbody>' +
        refs.refs.map((ref) => '<tr><td><code>' + esc(ref.ref) + '</code></td><td><code>' + esc(short(ref.object)) + '</code></td><td>' + esc(ref.subject || '') + '</td></tr>').join('') +
        '</tbody></table></div>' +
        '<div><h2>Events</h2><table><thead><tr><th>Time</th><th>Event</th><th>Ref/Service</th><th>Result</th></tr></thead><tbody>' +
        events.events.slice(-20).reverse().map((event) => '<tr><td>' + esc(event.recordedAt || '') + '</td><td>' + esc(event.event) + '</td><td><code>' + esc(event.ref || event.service || '') + '</code></td><td>' + esc(event.action || event.code || '') + '</td></tr>').join('') +
        '</tbody></table></div>' +
        '<div><h2>Neural Map</h2><pre>' + esc(JSON.stringify(neural.neuralMap || {}, null, 2)) + '</pre></div>';
      $('exportBundle').addEventListener('click', async () => {
        setStatus('Exporting bundle');
        const result = await api(basePath + '/export', { method: 'POST' });
        setStatus('Bundle exported: ' + result.export.fileName, 'ok');
        await load();
      });
    }
    $('create').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await api('/__skyevault/repos', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ workspaceId: $('workspace').value, repoId: $('repo').value })
        });
        await load();
      } catch (error) { setStatus(error.message, 'error'); }
    });
    $('refresh').addEventListener('click', () => load().catch((error) => setStatus(error.message, 'error')));
    $('snapshotNow').addEventListener('click', async () => {
      try {
        setStatus('Creating snapshot');
        const result = await api('/__skyevault/snapshots', { method: 'POST' });
        setStatus('Snapshot ready: ' + result.snapshot.snapshotId, 'ok');
        await load();
      } catch (error) { setStatus(error.message, 'error'); }
    });
    load().catch((error) => setStatus(error.message, 'error'));
  </script>
</body>
</html>`;
}

const port = Number(argValue('--port') || process.env.SKYEVAULT_GIT_REMOTE_PORT || 8787);
const host = argValue('--host') || process.env.SKYEVAULT_GIT_REMOTE_HOST || '127.0.0.1';
const storageRoot = resolvePath(argValue('--storage-root') || process.env.SKYEVAULT_GIT_REMOTE_ROOT, path.join(os.tmpdir(), 'skyevault-git-remote'));
const repoRoot = path.join(storageRoot, 'repos');
const ledgerPath = path.join(storageRoot, 'remote-ledger.jsonl');
const workspaceLedgerPath = path.join(root, '.skyevault-out', 'git-remote-ledger.jsonl');
const neuralDir = path.join(storageRoot, 'neural-map');
const policyPath = path.join(storageRoot, 'config', 'branch-policy.json');
const snapshotRoot = path.join(storageRoot, 'snapshots');
const snapshotMirrorRoot = resolvePath(argValue('--snapshot-mirror-root') || process.env.SKYEVAULT_SNAPSHOT_MIRROR_ROOT, '');
const gateIntrospectUrl = String(argValue('--gate-introspect-url') || process.env.SKYEVAULT_GATE_INTROSPECT_URL || '').trim();
const requiredViewRole = String(process.env.SKYEVAULT_GATE_REQUIRED_VIEW_ROLE || 'viewer').toLowerCase();
const requiredPushRole = String(process.env.SKYEVAULT_GATE_REQUIRED_PUSH_ROLE || 'deployer').toLowerCase();
const requiredAdminRole = String(process.env.SKYEVAULT_GATE_REQUIRED_ADMIN_ROLE || 'admin').toLowerCase();
const gateTimeoutMs = Math.max(500, Number(process.env.SKYEVAULT_GATE_TIMEOUT_MS || 5000));
const gateEnforceWorkspace = envFlag('SKYEVAULT_GATE_ENFORCE_WORKSPACE', true);
const gateAdminAllWorkspaces = envFlag('SKYEVAULT_GATE_ADMIN_ALL_WORKSPACES', false);
let token = argValue('--token') || process.env.SKYEVAULT_GIT_REMOTE_TOKEN || '';
if (!token && !devNoAuth && !gateIntrospectUrl) token = crypto.randomBytes(24).toString('hex');

fs.mkdirSync(repoRoot, { recursive: true });
fs.mkdirSync(path.dirname(workspaceLedgerPath), { recursive: true });
fs.mkdirSync(neuralDir, { recursive: true });
fs.mkdirSync(path.dirname(policyPath), { recursive: true });
fs.mkdirSync(snapshotRoot, { recursive: true });
if (!fs.existsSync(policyPath)) writeJsonFile(policyPath, readPolicy());

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
  if (url.pathname === '/health') {
    json(res, 200, {
      ok: true,
      service: 'skyevault-git-remote',
      storageRoot,
      repoRoot,
      snapshotRoot,
      policyPath,
      auth: devNoAuth ? 'disabled' : gateIntrospectUrl ? 'gate-introspection' : 'static-token',
      autoCreate,
      gateEnforceWorkspace,
      requiredRoles: {
        view: requiredViewRole,
        push: requiredPushRole,
        admin: requiredAdminRole
      }
    });
    return;
  }

  let auth;
  try {
    auth = await resolveAuth(req);
  } catch (error) {
    console.warn(`Gate authentication unavailable for ${url.pathname}: ${error.message}`);
    json(res, 503, { ok: false, error: `Gate authentication unavailable: ${error.message}` });
    return;
  }

  if (!auth.active) {
    res.writeHead(401, {
      'www-authenticate': 'Basic realm="SkyeVault Git Remote"',
      'content-type': 'text/plain; charset=utf-8'
    });
    res.end(`${auth.reason || 'Unauthorized'}\n`);
    return;
  }

  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(302, { location: '/__skyevault/ui' });
    res.end();
    return;
  }

  if (url.pathname === '/__skyevault/ui' && req.method === 'GET') {
    try {
      requireRole(auth, requiredViewRole);
    } catch (error) {
      json(res, httpStatus(error, 403), { ok: false, error: error.message });
      return;
    }
    html(res, 200, adminConsoleHtml());
    return;
  }

  if (url.pathname.startsWith('/__skyevault/')) {
    void handleAdminApi(req, res, url, auth)
      .then((handled) => {
        if (!handled && !res.headersSent) json(res, 404, { ok: false, error: 'Unknown SkyeVault admin endpoint.' });
      })
      .catch((error) => {
        appendLedgers({
          schema: 'skyevault.git-remote-admin-error.v1',
          event: 'git.remote-admin-error',
          recordedAt: nowIso(),
          path: url.pathname,
          ...authLedgerFields(auth),
          error: error.message
        });
        if (!res.headersSent) json(res, httpStatus(error, 400), { ok: false, error: error.message });
      });
    return;
  }

  const repo = parseRepoPath(url.pathname);
  if (!repo) {
    text(res, 404, 'Not a Git smart HTTP repository path.');
    return;
  }

  try {
    handleGit(req, res, repo, auth);
  } catch (error) {
    appendLedgers({
      schema: 'skyevault.git-remote-request.v1',
      event: 'git.remote-error',
      recordedAt: nowIso(),
      path: url.pathname,
      ...authLedgerFields(auth),
      error: error.message
    });
    text(res, httpStatus(error, 500), error.message);
  }
});

server.listen(port, host, () => {
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  const ready = {
    ok: true,
    service: 'skyevault-git-remote',
    baseUrl: `http://${host}:${actualPort}`,
    storageRoot,
    repoRoot,
    token: devNoAuth || gateIntrospectUrl ? null : token,
    auth: devNoAuth ? 'disabled' : gateIntrospectUrl ? 'gate-introspection' : 'static-token',
    gateIntrospectUrl: gateIntrospectUrl ? 'configured' : null,
    gateEnforceWorkspace,
    autoCreate,
    ledgerPath,
    workspaceLedgerPath,
    neuralDir,
    policyPath,
    snapshotRoot,
    snapshotMirrorRoot: snapshotMirrorRoot || null
  };
  console.log(`SKYEVAULT_GIT_REMOTE_READY ${JSON.stringify(ready)}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
