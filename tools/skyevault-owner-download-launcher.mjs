#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const scriptPath = fileURLToPath(import.meta.url);
const autosyncDir = path.join(repoRoot, '.skyevault-out', 'autosync');
const htmlOut = path.join(autosyncDir, 'CURRENT_REPO_BACKUP.html');
const legacyHtmlOut = path.join(autosyncDir, 'FULL_17GB_REPO_DOWNLOAD.html');
const privateJsonOut = path.join(autosyncDir, 'CURRENT_REPO_BACKUP.json');
const legacyPrivateJsonOut = path.join(autosyncDir, 'FULL_17GB_REPO_DOWNLOAD.json');
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

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function localUrl(port = 17687) {
  return `http://127.0.0.1:${port}/CURRENT_REPO_BACKUP.html`;
}

function legacyLocalUrl(port = 17687) {
  return `http://127.0.0.1:${port}/FULL_17GB_REPO_DOWNLOAD.html`;
}

function currentRepoState(envFile = '.env') {
  const result = spawnSync(process.execPath, [
    path.join(repoRoot, 'tools', 'skyevault-autosync.mjs'),
    'state',
    `--env-file=${envFile}`
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16
  });
  if (result.status !== 0) {
    return {
      ok: false,
      status: result.status,
      error: (result.stderr || result.stdout || 'current repo state scan failed').trim().slice(-2000)
    };
  }
  try {
    const parsed = JSON.parse(result.stdout || '{}');
    return { ok: Boolean(parsed.ok), state: parsed.state || null };
  } catch (error) {
    return { ok: false, error: `current repo state JSON parse failed: ${error.message}` };
  }
}

function livingMirrorStatus(envFile = '.env') {
  const result = spawnSync(process.execPath, [
    path.join(repoRoot, 'tools', 'skyevault-living-repo-mirror.mjs'),
    'status',
    `--env-file=${envFile}`
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 12
  });
  try {
    const parsed = JSON.parse(result.stdout || '{}');
    return { ok: result.status === 0 && Boolean(parsed.ok), status: result.status, ...parsed };
  } catch {
    return { ok: false, status: result.status, error: (result.stderr || result.stdout || 'living mirror status unavailable').trim().slice(-2000) };
  }
}

function latestPrimarySuccess() {
  return readJson(path.join(autosyncDir, 'latest-primary-success.json'), null);
}

function ownerMasterKeyMaterial(mirrorRoot = '') {
  const fromEnv = String(process.env.SKYEVAULT_LIVING_MIRROR_MASTER_KEY || '').trim();
  if (fromEnv) {
    const keyBase64 = /^[0-9a-f]{64}$/i.test(fromEnv) ? Buffer.from(fromEnv, 'hex').toString('base64') : fromEnv;
    return { source: 'env:SKYEVAULT_LIVING_MIRROR_MASTER_KEY', keyBase64 };
  }
  const keyPath = path.join(mirrorRoot || path.join(repoRoot, '.skyevault-out', 'living-mirror', 'metraiyux-0s-owner', 'MetrAIyux-0S'), 'private', 'owner-master-key.json');
  const key = readJson(keyPath, null);
  if (!key?.keyBase64) throw new Error(`Owner restore key is missing: ${keyPath}`);
  return { source: rel(keyPath), keyBase64: key.keyBase64 };
}

function currentRestoreKit(state, envFile = '.env') {
  if (!state.mirrorState?.current) throw new Error(state.mirrorState?.staleReason || 'living mirror is not current yet');
  const mirror = state.mirrorState.mirror || {};
  const ownerKey = ownerMasterKeyMaterial(mirror.mirrorRoot || '');
  return {
    ok: true,
    schema: 'skyevault.mutable-current-restore-kit.v1',
    createdAt: new Date().toISOString(),
    model: 'mutable-living-current-mirror',
    ownerContract: 'daemon updates the current mirror directly; this kit points at the already-current restore source, not a rebuilt tar export',
    envFile,
    workspaceId: 'metraiyux-0s-owner',
    repoId: 'MetrAIyux-0S',
    digest: mirror.digest || '',
    currentAsOf: mirror.generatedAt || state.mirrorState.currentAsOf || '',
    entryCount: mirror.entryCount || 0,
    fileCount: mirror.fileCount || 0,
    totalBytes: mirror.totalBytes || 0,
    remote: mirror.remote || null,
    privateManifestKey: mirror.remote?.privateManifestKey || '',
    publicManifestKey: mirror.remote?.manifestKey || '',
    latestReceipt: mirror.latestReceipt || null,
    ownerUnlock: {
      algorithm: 'aes-256-gcm',
      masterKeySource: ownerKey.source,
      masterKeyBase64: ownerKey.keyBase64,
      warning: 'Private owner restore material. Do not commit, print, or share.'
    },
    restoreCommand: 'npm run vault:mirror:restore -- --env-file=.env --kit-file=/path/to/CURRENT_REPO_BACKUP.json --out=/path/to/repaired-repo --force'
  };
}

function writeCurrentRestoreKit(state, envFile = '.env') {
  const kit = currentRestoreKit(state, envFile);
  writeJson(privateJsonOut, kit);
  writeJson(legacyPrivateJsonOut, {
    ok: false,
    replacedBy: rel(privateJsonOut),
    reason: 'Legacy immutable full artifact retired. Use the mutable current restore kit.'
  });
  return {
    ok: true,
    schema: 'skyevault.mutable-current-restore-kit.public.v1',
    createdAt: kit.createdAt,
    model: kit.model,
    digest: kit.digest,
    currentAsOf: kit.currentAsOf,
    fileCount: kit.fileCount,
    totalBytes: kit.totalBytes,
    privateKitPath: rel(privateJsonOut),
    restoreCommand: kit.restoreCommand
  };
}

function mirrorState(envFile = '.env') {
  const repo = currentRepoState(envFile);
  const mirror = livingMirrorStatus(envFile);
  const primary = latestPrimarySuccess();
  const currentDigest = repo.state?.digest || '';
  const primaryDigest = primary?.state?.digest || '';
  const plannedModes = Array.isArray(primary?.plannedModes) ? primary.plannedModes : [];
  const fullCurrentIndexReady = Boolean(mirror.manifest?.fullCurrentIndexReady);
  const current = Boolean(mirror.ok && fullCurrentIndexReady);
  let staleReason = '';
  if (!mirror.ok) staleReason = mirror.error || 'living mirror has not been seeded yet';
  else if (!fullCurrentIndexReady) staleReason = 'living mirror is not a full current index yet; the seeding scan must finish first';
  return {
    ok: Boolean(mirror.ok),
    current,
    staleReason,
    currentAsOf: mirror.manifest?.generatedAt || '',
    recoveryWindowSeconds: Number(process.env.SKYEVAULT_AUTOSYNC_INTERVAL_SECONDS || 600),
    repo: repo.ok ? {
      digest: currentDigest,
      branch: repo.state?.branch || '',
      shortHead: repo.state?.shortHead || '',
      dirty: Boolean(repo.state?.dirty),
      statusCounts: repo.state?.statusCounts || null,
      changedFileFingerprintCount: repo.state?.changedFileFingerprintCount || 0
    } : {
      ok: false,
      error: repo.error || 'repo state unavailable'
    },
    primary: primary ? {
      recordedAt: primary.recordedAt || '',
      digest: primaryDigest,
      plannedModes,
      receiptPath: rel(path.join(autosyncDir, 'latest-primary-success.json'))
    } : null,
    mirror: mirror.ok ? {
      digest: mirror.manifest?.digest || '',
      generatedAt: mirror.manifest?.generatedAt || '',
      mode: mirror.manifest?.mode || '',
      fullCurrentIndexReady,
      adoptedBasePresent: Boolean(mirror.manifest?.adoptedBasePresent),
      entryCount: mirror.manifest?.entryCount || 0,
      fileCount: mirror.manifest?.fileCount || 0,
      totalBytes: mirror.manifest?.totalBytes || 0,
      remote: mirror.manifest?.remote || null,
      latestReceipt: mirror.latestReceipt || null,
      mirrorRoot: mirror.mirrorRoot || ''
    } : {
      ok: false,
      error: mirror.error || 'mirror unavailable'
    }
  };
}

function handoffCurrentMirror(envFile = '.env', port = 17687) {
  const state = statusSnapshot(port, envFile);
  const kit = writeCurrentRestoreKit(state, envFile);
  state.restoreKit = kit;
  writeHtmlFiles(state);
  writeJson(publicStateOut, state);
  return { ok: true, kit, state };
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

function htmlEscape(value) {
  return String(value ?? '').replace(/[<>&"]/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;'
  }[char]));
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit ? 2 : 0)} ${units[unit]}`;
}

function renderHtml(state) {
  const mirror = state.mirrorState?.mirror || {};
  const restoreKit = state.restoreKit || null;
  const ready = Boolean(state.mirrorState?.current);
  const title = ready ? 'Mutable current repo backup is ready' : 'Current repo backup is seeding';
  const statusText = ready ? 'READY' : 'SEEDING';
  const restoreCommand = restoreKit?.restoreCommand || 'Download CURRENT_REPO_BACKUP.json first.';
  const downloadButton = '<a class="button primary" href="/CURRENT_REPO_BACKUP.json" download="CURRENT_REPO_BACKUP.json">Download current restore kit</a>';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SkyeVault Current Repo Backup</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #eff7ff; background: #07110f; }
    main { max-width: 920px; margin: 0 auto; padding: 40px 20px; }
    h1 { margin: 0 0 12px; font-size: clamp(28px, 5vw, 48px); line-height: 1.05; letter-spacing: 0; }
    p { line-height: 1.6; color: #b9c9c4; }
    .status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border: 1px solid #46645c; border-radius: 6px; color: #d9f5ec; background: #10231f; font-weight: 800; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 24px 0; }
    .cell { border: 1px solid #223d36; border-radius: 8px; padding: 14px; background: #0b1815; }
    .label { display: block; color: #84a39a; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .value { display: block; margin-top: 6px; font-size: 16px; overflow-wrap: anywhere; }
    .button { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 14px; border-radius: 6px; border: 1px solid #d6b95f; color: #f7e6a0; text-decoration: none; font-weight: 800; margin: 6px 8px 6px 0; }
    .primary { background: #f0ca62; color: #08110f; }
    code { background: #10231f; border: 1px solid #223d36; border-radius: 5px; padding: 2px 5px; }
  </style>
</head>
<body>
  <main>
    <span class="status">${htmlEscape(statusText)}</span>
    <h1>${htmlEscape(title)}</h1>
    <p>This page is tied to the mutable living current mirror. The old immutable full-artifact/export lane is retired.</p>
    ${ready ? `<p>The daemon has a full current index as of ${htmlEscape(state.mirrorState?.currentAsOf || 'the latest completed mirror')}. The restore kit points at the current cloud mirror immediately; it does not mint or rebuild a tar export.</p>` : `<p>${htmlEscape(state.mirrorState?.staleReason || 'The full-current mirror seed has not completed yet.')}</p>`}
    <p>
      ${ready ? downloadButton : '<a class="button primary" href="/status.json">Check current mirror status</a>'}
      <a class="button" href="/status.json">Status JSON</a>
    </p>
    <div class="grid">
      <div class="cell"><span class="label">Mirror mode</span><span class="value">${htmlEscape(mirror.mode || 'none')}</span></div>
      <div class="cell"><span class="label">Files</span><span class="value">${htmlEscape(mirror.fileCount ?? 0)}</span></div>
      <div class="cell"><span class="label">Bytes indexed</span><span class="value">${htmlEscape(formatBytes(mirror.totalBytes || 0))}</span></div>
      <div class="cell"><span class="label">Generated</span><span class="value">${htmlEscape(mirror.generatedAt || 'not yet')}</span></div>
      <div class="cell"><span class="label">Recovery window</span><span class="value">${htmlEscape(state.mirrorState?.recoveryWindowSeconds || 600)} seconds</span></div>
      <div class="cell"><span class="label">Mirror digest</span><span class="value"><code>${htmlEscape(String(mirror.digest || '').slice(0, 24) || 'none')}</code></span></div>
      <div class="cell"><span class="label">Restore kit</span><span class="value">${htmlEscape(restoreKit?.createdAt || 'not written')}</span></div>
      <div class="cell"><span class="label">Restore command</span><span class="value"><code>${htmlEscape(restoreCommand)}</code></span></div>
    </div>
  </main>
</body>
</html>
`;
}

function writeHtmlFiles(state) {
  fs.mkdirSync(autosyncDir, { recursive: true });
  fs.writeFileSync(htmlOut, renderHtml(state), { mode: 0o600 });
  fs.writeFileSync(legacyHtmlOut, `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/CURRENT_REPO_BACKUP.html"><title>Moved</title></head>
<body><p>The stale full artifact page has moved to <a href="/CURRENT_REPO_BACKUP.html">CURRENT_REPO_BACKUP.html</a>.</p></body>
</html>
`, { mode: 0o600 });
}

function startDetachedServer(port, envFile) {
  const existing = readPid();
  if (pidAlive(Number(existing?.pid || 0))) return { running: true, pid: Number(existing.pid), reused: true };
  fs.mkdirSync(autosyncDir, { recursive: true });
  const out = fs.openSync(logFile, 'a');
  const child = spawn(process.execPath, [scriptPath, 'serve', `--port=${port}`, `--env-file=${envFile}`], {
    cwd: repoRoot,
    detached: true,
    stdio: ['ignore', out, out]
  });
  child.unref();
  fs.closeSync(out);
  const record = {
    pid: child.pid,
    startedAt: new Date().toISOString(),
    command: `node ${path.relative(repoRoot, scriptPath)} serve --port=${port} --env-file=${envFile}`,
    port,
    url: localUrl(port),
    legacyUrl: legacyLocalUrl(port),
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

function writeErrorResponse(response, error, status = 409, html = false) {
  if (html) {
    const body = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SkyeVault Backup Not Ready</title></head>
<body><main>
<h1>SkyeVault current backup is not ready</h1>
<p>${htmlEscape(error.message || error)}</p>
<p>Use <code>npm run vault:source:status -- --env-file=.env</code> to watch the full-current mirror seed.</p>
</main></body>
</html>
`;
    response.writeHead(status, {
      'content-type': 'text/html; charset=utf-8',
      'content-length': Buffer.byteLength(body),
      'cache-control': 'no-store'
    });
    response.end(body);
    return;
  }
  const body = `${JSON.stringify({ ok: false, error: error.message || String(error) }, null, 2)}\n`;
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store'
  });
  response.end(body);
}

function sendJson(response, payload, status = 200) {
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store'
  });
  response.end(body);
}

function serveFile(response, file, method = 'GET') {
  fs.stat(file, (statError, stat) => {
    if (statError || !stat.isFile()) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'content-type': contentType(file),
      'content-length': stat.size,
      'cache-control': 'no-store'
    });
    if (method === 'HEAD') {
      response.end();
      return;
    }
    fs.createReadStream(file).pipe(response);
  });
}

function serve(port, envFile = '.env') {
  fs.mkdirSync(autosyncDir, { recursive: true });
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
    let decoded = '/';
    try {
      decoded = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Bad request');
      return;
    }
    if (decoded === '/' || decoded === '/FULL_17GB_REPO_DOWNLOAD.html') {
      response.writeHead(303, { location: '/CURRENT_REPO_BACKUP.html', 'cache-control': 'no-store' });
      response.end();
      return;
    }
    if (decoded === '/status.json') {
      sendJson(response, await status(port, envFile));
      return;
    }
    if (decoded === '/refresh' || decoded === '/refresh.json' || decoded === '/export' || decoded === '/export.json') {
      try {
        const payload = handoffCurrentMirror(envFile, port);
        payload.deprecatedExportEndpoint = decoded.includes('export');
        if (decoded.endsWith('.json') || (request.headers.accept || '').includes('application/json')) {
          sendJson(response, payload);
          return;
        }
        response.writeHead(303, { location: '/CURRENT_REPO_BACKUP.html', 'cache-control': 'no-store' });
        response.end();
        return;
      } catch (error) {
        writeErrorResponse(response, error, 409, !decoded.endsWith('.json'));
        return;
      }
    }
    if (decoded === '/CURRENT_REPO_BACKUP.json') {
      try {
        statusSnapshot(port, envFile);
        serveFile(response, privateJsonOut, request.method);
      } catch (error) {
        writeErrorResponse(response, error, 409, false);
      }
      return;
    }
    if (decoded === '/CURRENT_REPO_BACKUP.html') {
      const state = statusSnapshot(port, envFile);
      writeHtmlFiles(state);
      serveFile(response, htmlOut, request.method);
      return;
    }
    const target = path.resolve(autosyncDir, `.${decoded}`);
    const root = `${path.resolve(autosyncDir)}${path.sep}`;
    if (target !== path.resolve(autosyncDir) && !target.startsWith(root)) {
      response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }
    serveFile(response, target, request.method);
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`SkyeVault owner current backup launcher listening at ${localUrl(port)}`);
  });
}

function statusSnapshot(port = 17687, envFile = '.env') {
  const pidRecord = readPid();
  const running = pidAlive(Number(pidRecord?.pid || 0));
  const state = {
    ok: true,
    schema: 'skyevault.owner-current-backup-launcher-status.v1',
    checkedAt: new Date().toISOString(),
    running,
    pid: running ? Number(pidRecord.pid) : null,
    port,
    url: localUrl(port),
    legacyUrl: legacyLocalUrl(port),
    htmlOut: rel(htmlOut),
    privateReceipt: rel(privateJsonOut),
    publicState: rel(publicStateOut),
    model: 'mutable living current mirror; no owner-facing delta packs; no tar export mint on download',
    mirrorState: mirrorState(envFile)
  };
  if (state.mirrorState.current) {
    state.restoreKit = writeCurrentRestoreKit(state, envFile);
  } else {
    writeJson(privateJsonOut, {
      ok: false,
      schema: 'skyevault.mutable-current-restore-kit.v1',
      error: state.mirrorState.staleReason || 'living mirror is not current yet'
    });
  }
  writeHtmlFiles(state);
  writeJson(publicStateOut, state);
  return state;
}

async function status(port = 17687, envFile = '.env') {
  const snapshot = statusSnapshot(port, envFile);
  snapshot.http = snapshot.running ? await headStatus(snapshot.url) : { ok: false, status: 0 };
  writeJson(publicStateOut, snapshot);
  return snapshot;
}

async function start() {
  const port = Number(argValue('--port', '17687')) || 17687;
  const envFile = argValue('--env-file', '.env') || '.env';
  const server = startDetachedServer(port, envFile);
  await new Promise((resolve) => setTimeout(resolve, 250));
  const state = await status(port, envFile);
  state.started = server;
  writeJson(publicStateOut, state);
  return state;
}

async function stop() {
  const pidRecord = readPid();
  const pid = Number(pidRecord?.pid || 0);
  const wasRunning = pidAlive(pid);
  if (wasRunning) process.kill(pid, 'SIGTERM');
  try { fs.unlinkSync(pidFile); } catch {}
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
  serve(Number(argValue('--port', '17687')) || 17687, argValue('--env-file', '.env') || '.env');
} else if (command === 'start') {
  start().then((state) => console.log(JSON.stringify(state, null, 2))).catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
} else if (command === 'status') {
  status(Number(argValue('--port', '17687')) || 17687, argValue('--env-file', '.env') || '.env').then((state) => console.log(JSON.stringify(state, null, 2))).catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
} else if (command === 'stop') {
  stop().then((state) => console.log(JSON.stringify(state, null, 2))).catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
} else if (command === 'export') {
  Promise.resolve(handoffCurrentMirror(argValue('--env-file', '.env') || '.env', Number(argValue('--port', '17687')) || 17687)).then((payload) => {
    payload.deprecatedCommand = 'export now returns the mutable current restore kit; it does not mint a tar artifact';
    console.log(JSON.stringify(payload, null, 2));
  }).catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
} else if (command === 'handoff') {
  Promise.resolve(handoffCurrentMirror(argValue('--env-file', '.env') || '.env', Number(argValue('--port', '17687')) || 17687)).then((payload) => {
    console.log(JSON.stringify(payload, null, 2));
  }).catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
} else {
  console.error(`Unknown owner download launcher command: ${command}`);
  process.exit(1);
}
