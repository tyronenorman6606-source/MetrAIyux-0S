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

function text(res, status, body) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(body.endsWith('\n') ? body : `${body}\n`);
}

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: options.cwd || root, encoding: options.encoding || 'utf8', stdio: options.stdio || 'pipe' }).trim();
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

function appendJsonl(file, event) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(event)}\n`);
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

function installHook(repoPath, workspaceId, repoId) {
  const hooksDir = path.join(repoPath, 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  const preReceiveHook = `#!/usr/bin/env node
const fs = require('node:fs');
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
    return ref === rule;
  });
}

const input = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/).filter(Boolean);
const protectedRefs = String(process.env.SKYEVAULT_PROTECTED_REFS || 'refs/heads/main,refs/heads/master')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const allowDeletes = process.env.SKYEVAULT_ALLOW_DELETE_REFS === '1';
const allowForce = process.env.SKYEVAULT_ALLOW_FORCE_PUSH === '1';
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
  let graph = { schema: 'skyevault.git-remote-neural-map.v1', workspaceId, repoId, refs: {}, events: [] };
  if (fs.existsSync(file)) {
    try { graph = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  }
  graph.updatedAt = new Date().toISOString();
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

function handleGit(req, res, repo, remoteUser) {
  ensureRepo(repo.repoPath, repo.workspaceId, repo.repoId);
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
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
    SKYEVAULT_WORKSPACE_ID: repo.workspaceId,
    SKYEVAULT_REPO_ID: repo.repoId,
    SKYEVAULT_REMOTE_LEDGER: ledgerPath,
    SKYEVAULT_REMOTE_WORKSPACE_LEDGER: workspaceLedgerPath,
    SKYEVAULT_REMOTE_NEURAL_DIR: neuralDir,
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
      remoteUser,
      method: req.method,
      path: url.pathname,
      service: url.searchParams.get('service') || path.basename(url.pathname),
      code,
      durationMs: Date.now() - started,
      stderr: stderr.trim().slice(0, 500)
    });
  });
}

function listRepos() {
  if (!fs.existsSync(repoRoot)) return [];
  const repos = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name.endsWith('.git')) {
        const relative = path.relative(repoRoot, file).split(path.sep).join('/');
        repos.push({
          id: relative,
          workspaceId: relative.split('/').slice(0, -1).join('/') || 'default',
          repoId: entry.name.replace(/\.git$/, ''),
          path: file
        });
      } else if (entry.isDirectory()) {
        visit(file);
      }
    }
  };
  visit(repoRoot);
  return repos.sort((a, b) => a.id.localeCompare(b.id));
}

const port = Number(argValue('--port') || process.env.SKYEVAULT_GIT_REMOTE_PORT || 8787);
const host = argValue('--host') || process.env.SKYEVAULT_GIT_REMOTE_HOST || '127.0.0.1';
const storageRoot = resolvePath(argValue('--storage-root') || process.env.SKYEVAULT_GIT_REMOTE_ROOT, path.join(os.tmpdir(), 'skyevault-git-remote'));
const repoRoot = path.join(storageRoot, 'repos');
const ledgerPath = path.join(storageRoot, 'remote-ledger.jsonl');
const workspaceLedgerPath = path.join(root, '.skyevault-out', 'git-remote-ledger.jsonl');
const neuralDir = path.join(storageRoot, 'neural-map');
let token = argValue('--token') || process.env.SKYEVAULT_GIT_REMOTE_TOKEN || '';
if (!token && !devNoAuth) token = crypto.randomBytes(24).toString('hex');

fs.mkdirSync(repoRoot, { recursive: true });
fs.mkdirSync(path.dirname(workspaceLedgerPath), { recursive: true });
fs.mkdirSync(neuralDir, { recursive: true });

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
  if (url.pathname === '/health') {
    json(res, 200, {
      ok: true,
      service: 'skyevault-git-remote',
      storageRoot,
      repoRoot,
      auth: devNoAuth ? 'disabled' : 'token',
      autoCreate
    });
    return;
  }

  const suppliedToken = tokenFromRequest(req);
  if (!devNoAuth && !timingSafeEqualString(suppliedToken, token)) {
    res.writeHead(401, {
      'www-authenticate': 'Basic realm="SkyeVault Git Remote"',
      'content-type': 'text/plain; charset=utf-8'
    });
    res.end('Unauthorized\n');
    return;
  }

  if (url.pathname === '/__skyevault/repos') {
    json(res, 200, { ok: true, repos: listRepos() });
    return;
  }

  const repo = parseRepoPath(url.pathname);
  if (!repo) {
    text(res, 404, 'Not a Git smart HTTP repository path.');
    return;
  }

  try {
    handleGit(req, res, repo, suppliedToken ? 'token-user' : 'dev-no-auth');
  } catch (error) {
    appendLedgers({
      schema: 'skyevault.git-remote-request.v1',
      event: 'git.remote-error',
      recordedAt: nowIso(),
      path: url.pathname,
      error: error.message
    });
    text(res, 500, error.message);
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
    token: devNoAuth ? null : token,
    auth: devNoAuth ? 'disabled' : 'token',
    autoCreate,
    ledgerPath,
    workspaceLedgerPath,
    neuralDir
  };
  console.log(`SKYEVAULT_GIT_REMOTE_READY ${JSON.stringify(ready)}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
