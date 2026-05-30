#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const scriptPath = fileURLToPath(import.meta.url);
const autosyncDir = path.join(repoRoot, '.skyevault-out', 'autosync');
const htmlOut = path.join(autosyncDir, 'FULL_17GB_REPO_DOWNLOAD.html');
const privateJsonOut = path.join(autosyncDir, 'FULL_17GB_REPO_DOWNLOAD.json');
const publicStateOut = path.join(autosyncDir, 'owner-download-launcher.json');
const pidFile = path.join(autosyncDir, 'download-launcher.pid');
const logFile = path.join(autosyncDir, 'download-launcher.log');
const argv = process.argv.slice(2);
const command = argv.find((arg) => !arg.startsWith('--')) || 'start';

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(name);
  if (index >= 0 && argv[index + 1] && !argv[index + 1].startsWith('--')) return argv[index + 1];
  return fallback;
}

function hasFlag(name) {
  return argv.includes(name);
}

function writeJson(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode });
  try { fs.chmodSync(file, mode); } catch {}
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function readPid() {
  try {
    const raw = fs.readFileSync(pidFile, 'utf8').trim();
    if (!raw) return null;
    if (raw.startsWith('{')) return JSON.parse(raw);
    return { pid: Number(raw), startedAt: '', legacyPidFile: true };
  } catch {
    return null;
  }
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

function latestFullReceipt() {
  const override = argValue('--receipt', '');
  if (override) return { receiptId: override, source: 'arg' };
  const latest = readJson(path.join(autosyncDir, 'latest-full-repo-success.json'), null);
  const summaries = latest?.fullRun?.childSummaries || [];
  const artifact = summaries.find((item) => item.receiptId && Number(item.artifactBytes || 0) > 0)
    || summaries.find((item) => item.receiptId);
  return {
    receiptId: artifact?.receiptId || '',
    fileName: artifact?.fileName || '',
    bytes: artifact?.artifactBytes || null,
    sha256: artifact?.artifactSha256 || '',
    source: 'latest-full-repo-success'
  };
}

function localUrl(port = 17687) {
  return `http://127.0.0.1:${port}/FULL_17GB_REPO_DOWNLOAD.html`;
}

async function headStatus(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

function safeDownloadSummary() {
  const receipt = readJson(privateJsonOut, null);
  const downloads = Array.isArray(receipt?.downloads) ? receipt.downloads : [];
  return {
    mintedAt: receipt?.createdAt || '',
    expiresInSeconds: receipt?.expiresInSeconds || null,
    downloads: downloads.map((item) => ({
      label: item.label || '',
      receiptId: item.receiptId || '',
      ok: Boolean(item.ok),
      status: item.status || null,
      fileName: item.fileName || item.requestedFileName || '',
      fileSize: item.fileSize || null,
      expiresAt: item.expiresAt || '',
      hasDownloadUrl: Boolean(item.downloadUrl)
    }))
  };
}

function mintLatestDownload(envFile, receiptId) {
  const args = [
    path.join(repoRoot, 'tools', 'skyevault-mint-receipt-downloads.mjs'),
    `--env-file=${envFile}`,
    `--receipt=${receiptId}`,
    `--html-out=${htmlOut}`,
    `--out=${privateJsonOut}`,
    '--quiet'
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Could not mint SkyeVault download link.').trim());
  }
  return JSON.parse(result.stdout || '{}');
}

function startDetachedServer(port) {
  const existing = readPid();
  if (pidAlive(Number(existing?.pid || 0))) return { running: true, pid: Number(existing.pid), reused: true };
  fs.mkdirSync(autosyncDir, { recursive: true });
  const out = fs.openSync(logFile, 'a');
  const child = spawn(process.execPath, [scriptPath, 'serve', `--port=${port}`], {
    cwd: repoRoot,
    detached: true,
    stdio: ['ignore', out, out]
  });
  child.unref();
  fs.closeSync(out);
  const record = {
    pid: child.pid,
    startedAt: new Date().toISOString(),
    command: `node ${path.relative(repoRoot, scriptPath)} serve --port=${port}`,
    port,
    url: localUrl(port),
    directory: path.relative(repoRoot, autosyncDir),
    logFile: path.relative(repoRoot, logFile)
  };
  writeJson(pidFile, record);
  return { running: true, pid: child.pid, reused: false };
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.txt') || file.endsWith('.log')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function serve(port) {
  fs.mkdirSync(autosyncDir, { recursive: true });
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
    let decoded = '/';
    try {
      decoded = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Bad request');
      return;
    }
    if (decoded === '/') decoded = '/FULL_17GB_REPO_DOWNLOAD.html';
    const target = path.resolve(autosyncDir, `.${decoded}`);
    const root = `${path.resolve(autosyncDir)}${path.sep}`;
    if (target !== path.resolve(autosyncDir) && !target.startsWith(root)) {
      response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }
    fs.stat(target, (statError, stat) => {
      if (statError || !stat.isFile()) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }
      response.writeHead(200, {
        'content-type': contentType(target),
        'content-length': stat.size,
        'cache-control': 'no-store'
      });
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      fs.createReadStream(target).pipe(response);
    });
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`SkyeVault owner download launcher listening at ${localUrl(port)}`);
  });
}

async function status(port = 17687) {
  const pidRecord = readPid();
  const running = pidAlive(Number(pidRecord?.pid || 0));
  const receipt = latestFullReceipt();
  const download = safeDownloadSummary();
  const url = localUrl(port);
  const http = running ? await headStatus(url) : { ok: false, status: 0 };
  const state = {
    ok: running && http.ok,
    schema: 'skyevault.owner-download-launcher-status.v1',
    checkedAt: new Date().toISOString(),
    running,
    pid: running ? Number(pidRecord.pid) : null,
    port,
    url,
    htmlOut: path.relative(repoRoot, htmlOut),
    privateReceipt: path.relative(repoRoot, privateJsonOut),
    publicState: path.relative(repoRoot, publicStateOut),
    latestFullReceipt: receipt,
    signedDownload: download,
    http
  };
  writeJson(publicStateOut, state);
  return state;
}

async function start() {
  const port = Number(argValue('--port', '17687')) || 17687;
  const envFile = argValue('--env-file', '.env') || '.env';
  const receipt = latestFullReceipt();
  if (!receipt.receiptId) throw new Error('No latest full-repo receipt was found.');
  let mint = null;
  if (!hasFlag('--no-mint')) mint = mintLatestDownload(envFile, receipt.receiptId);
  const server = startDetachedServer(port);
  await new Promise((resolve) => setTimeout(resolve, 250));
  const state = await status(port);
  state.started = server;
  state.mint = mint ? {
    ok: Boolean(mint.ok),
    createdAt: mint.createdAt || '',
    expiresInSeconds: mint.expiresInSeconds || null,
    downloads: mint.downloads || []
  } : null;
  writeJson(publicStateOut, state);
  return state;
}

async function stop() {
  const pidRecord = readPid();
  const pid = Number(pidRecord?.pid || 0);
  const wasRunning = pidAlive(pid);
  if (wasRunning) process.kill(pid, 'SIGTERM');
  const state = {
    ok: true,
    stoppedAt: new Date().toISOString(),
    pid: wasRunning ? pid : null,
    wasRunning
  };
  writeJson(publicStateOut, state);
  return state;
}

if (command === 'serve') {
  serve(Number(argValue('--port', '17687')) || 17687);
} else if (command === 'start') {
  start().then((state) => console.log(JSON.stringify(state, null, 2))).catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
} else if (command === 'status') {
  status(Number(argValue('--port', '17687')) || 17687).then((state) => console.log(JSON.stringify(state, null, 2))).catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
} else if (command === 'stop') {
  stop().then((state) => console.log(JSON.stringify(state, null, 2))).catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
} else {
  console.error(`Unknown owner download launcher command: ${command}`);
  process.exit(1);
}
