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
  return repos.map((repo) => repoSummary(repo)).sort((a, b) => a.id.localeCompare(b.id));
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
    diskBytes: repoDiskBytes(repo.path)
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

async function exportRepoBundle(workspaceId, repoId) {
  const detail = repoDetail(workspaceId, repoId);
  if (!detail) throw new Error(`Repo not found: ${workspaceId}/${repoId}`);
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
    ...result
  });
  return result;
}

async function handleAdminApi(req, res, url) {
  if (url.pathname === '/__skyevault/repos' && req.method === 'GET') {
    json(res, 200, { ok: true, repos: listRepos() });
    return true;
  }

  if (url.pathname === '/__skyevault/repos' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const repo = repoFromParts(body.workspaceId || 'default', body.repoId || body.name || '');
    ensureRepo(repo.repoPath, repo.workspaceId, repo.repoId);
    json(res, 201, { ok: true, repo: repoDetail(repo.workspaceId, repo.repoId) });
    return true;
  }

  const repoRoute = url.pathname.match(/^\/__skyevault\/repos\/([^/]+)\/([^/]+)(?:\/(refs|events|neural-map|export))?$/);
  if (repoRoute) {
    const [, workspaceId, repoId, action] = repoRoute;
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
      json(res, 201, { ok: true, export: await exportRepoBundle(workspaceId, repoId) });
      return true;
    }
  }

  if (url.pathname === '/__skyevault/ledger' && req.method === 'GET') {
    const events = readJsonl(ledgerPath).slice(-500);
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
    .statgrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
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
      <div id="repos"></div>
    </aside>
    <section>
      <div class="statgrid">
        <div class="stat"><span class="muted">Repos</span><strong id="repoCount">0</strong></div>
        <div class="stat"><span class="muted">Refs</span><strong id="refCount">0</strong></div>
        <div class="stat"><span class="muted">Events</span><strong id="eventCount">0</strong></div>
        <div class="stat"><span class="muted">Exports</span><strong id="exportCount">0</strong></div>
      </div>
      <div id="detail" class="stack"></div>
    </section>
  </main>
  <script>
    const state = { repos: [], selected: null, ledger: null };
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
      const [repos, ledger] = await Promise.all([api('/__skyevault/repos'), api('/__skyevault/ledger')]);
      state.repos = repos.repos;
      state.ledger = ledger;
      $('eventCount').textContent = ledger.eventCount;
      $('exportCount').textContent = ledger.exports;
      renderRepos();
      if (!state.selected && state.repos[0]) await selectRepo(repoId(state.repos[0]));
      else if (state.selected) await selectRepo(repoId(state.selected));
      setStatus('Ready', 'ok');
    }
    async function selectRepo(id) {
      const [workspaceId, repoIdValue] = id.split('/');
      const basePath = repoApiPath(workspaceId, repoIdValue);
      const [detail, refs, events, neural] = await Promise.all([
        api(basePath),
        api(basePath + '/refs'),
        api(basePath + '/events'),
        api(basePath + '/neural-map')
      ]);
      state.selected = detail.repo;
      $('refCount').textContent = refs.refs.length;
      renderRepos();
      const cloneUrl = location.origin + '/git/' + workspaceId + '/' + repoIdValue + '.git';
      $('detail').innerHTML =
        '<div class="stat"><span class="muted">Clone URL</span><p><code>' + esc(cloneUrl) + '</code></p><button id="exportBundle">Export Bundle</button></div>' +
        '<div class="stat"><span class="muted">Head</span><p><code>' + esc(detail.repo.head ? detail.repo.head.ref + ' @ ' + short(detail.repo.head.object) : 'empty') + '</code></p></div>' +
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

  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(302, { location: '/__skyevault/ui' });
    res.end();
    return;
  }

  if (url.pathname === '/__skyevault/ui' && req.method === 'GET') {
    html(res, 200, adminConsoleHtml());
    return;
  }

  if (url.pathname.startsWith('/__skyevault/')) {
    void handleAdminApi(req, res, url)
      .then((handled) => {
        if (!handled && !res.headersSent) json(res, 404, { ok: false, error: 'Unknown SkyeVault admin endpoint.' });
      })
      .catch((error) => {
        appendLedgers({
          schema: 'skyevault.git-remote-admin-error.v1',
          event: 'git.remote-admin-error',
          recordedAt: nowIso(),
          path: url.pathname,
          error: error.message
        });
        if (!res.headersSent) json(res, 400, { ok: false, error: error.message });
      });
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
