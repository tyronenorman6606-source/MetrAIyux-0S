import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.env.ROOT_DIR || '/workspaces/MetrAIyux-0S';
const SITE_DIR = process.env.SITE_DIR || path.join(ROOT_DIR, 'metraiyux_0s_site');
const HOST = process.env.SKYE_CRAWLER_CONTROL_HOST || '127.0.0.1';
const PORT = Number(process.env.SKYE_CRAWLER_CONTROL_PORT || 4175);
const STATIC_URL = process.env.SKYE_CRAWLER_STATIC_URL || 'http://127.0.0.1:4173/';
const LIVE_URL = process.env.SKYE_CRAWLER_LIVE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/';
const REPORTS = {
  static: path.join(ROOT_DIR, 'test-artifacts/skye-crawler-report.json'),
  worker: path.join(ROOT_DIR, 'test-artifacts/skye-crawler-worker-report.json'),
  live: path.join(ROOT_DIR, 'test-artifacts/skye-crawler-live-report.json'),
};

let activeRun = null;
let lastRun = null;
let staticServer = null;
const logs = [];

function pushLog(line) {
  const text = String(line || '').trimEnd();
  if (!text) return;
  for (const item of text.split(/\r?\n/)) logs.push({ at: new Date().toISOString(), line: item });
  while (logs.length > 240) logs.shift();
}

function headers(type = 'application/json; charset=utf-8') {
  return {
    'content-type': type,
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
  };
}

function send(res, status, data) {
  res.writeHead(status, headers());
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10000) req.destroy();
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
  });
}

async function urlOk(url) {
  try {
    const res = await fetch(url, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureStaticServer() {
  if (await urlOk(STATIC_URL)) return { ok: true, alreadyRunning: true, url: STATIC_URL };
  if (staticServer) return { ok: true, alreadyRunning: false, url: STATIC_URL };
  staticServer = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], {
    cwd: SITE_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  staticServer.stdout.on('data', (data) => pushLog(`[static-server] ${data}`));
  staticServer.stderr.on('data', (data) => pushLog(`[static-server] ${data}`));
  staticServer.on('exit', (code, signal) => {
    pushLog(`[static-server] exited code=${code} signal=${signal || ''}`);
    staticServer = null;
  });
  for (let i = 0; i < 20; i += 1) {
    if (await urlOk(STATIC_URL)) return { ok: true, alreadyRunning: false, url: STATIC_URL };
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return { ok: false, error: `Static server did not answer at ${STATIC_URL}` };
}

function reportSummary(mode) {
  const file = REPORTS[mode] || REPORTS.static;
  if (!existsSync(file)) return { exists: false, path: file };
  try {
    const report = JSON.parse(readFileSync(file, 'utf8'));
    return {
      exists: true,
      path: file,
      ok: report.ok,
      checks: report.checks?.length || 0,
      failures: report.failures?.length || 0,
      warnings: report.warnings?.length || 0,
      started_at: report.started_at || null,
      finished_at: report.finished_at || null,
      checkpoint: report.last_checkpoint || null,
      artifacts: report.artifacts || [],
    };
  } catch (error) {
    return { exists: true, path: file, error: error.message };
  }
}

function status() {
  return {
    ok: true,
    bridge: 'SkyeCrawler Control',
    active: Boolean(activeRun),
    activeRun,
    lastRun,
    staticServer: Boolean(staticServer),
    reports: {
      static: reportSummary('static'),
      worker: reportSummary('worker'),
      live: reportSummary('live'),
    },
    logs: logs.slice(-80),
  };
}

async function startRun(mode) {
  const selected = ['static', 'worker', 'live'].includes(mode) ? mode : 'static';
  if (activeRun) return { ok: false, status: 409, error: 'SkyeCrawler is already running.', activeRun };

  if (selected === 'static') {
    const server = await ensureStaticServer();
    if (!server.ok) return { ok: false, status: 500, error: server.error };
  }

  const env = { ...process.env, SITE_DIR };
  if (selected === 'static') {
    env.SKIP_API = '1';
    env.BASE_URL = STATIC_URL;
    env.REPORT_PATH = REPORTS.static;
    env.ARTIFACT_DIR = path.join(ROOT_DIR, 'test-artifacts/skye-crawler');
  }
  if (selected === 'worker') {
    env.BASE_URL = process.env.SKYE_CRAWLER_WORKER_URL || 'http://127.0.0.1:4174/';
    env.REPORT_PATH = REPORTS.worker;
    env.ARTIFACT_DIR = path.join(ROOT_DIR, 'test-artifacts/skye-crawler-worker');
  }
  if (selected === 'live') {
    env.BASE_URL = LIVE_URL;
    env.REPORT_PATH = REPORTS.live;
    env.ARTIFACT_DIR = path.join(ROOT_DIR, 'test-artifacts/skye-crawler-live');
  }

  activeRun = {
    id: `skye_${Date.now()}`,
    mode: selected,
    started_at: new Date().toISOString(),
    command: `${process.execPath} tools/skye-crawler.mjs`,
    report: env.REPORT_PATH,
  };
  pushLog(`[control] starting ${activeRun.id} mode=${selected}`);

  const child = spawn(process.execPath, ['tools/skye-crawler.mjs'], {
    cwd: ROOT_DIR,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (data) => pushLog(data));
  child.stderr.on('data', (data) => pushLog(data));
  child.on('exit', (code, signal) => {
    lastRun = {
      ...activeRun,
      finished_at: new Date().toISOString(),
      exitCode: code,
      signal: signal || null,
      reportSummary: reportSummary(activeRun.mode),
    };
    pushLog(`[control] finished ${activeRun.id} code=${code} signal=${signal || ''}`);
    activeRun = null;
  });
  return { ok: true, status: 202, run: activeRun };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers());
    res.end();
    return;
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    send(res, 200, { ok: true, bridge: 'SkyeCrawler Control', status_url: `http://${HOST}:${PORT}/status` });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/status') {
    send(res, 200, status());
    return;
  }
  if (req.method === 'GET' && url.pathname === '/report') {
    const mode = url.searchParams.get('mode') || 'static';
    send(res, 200, reportSummary(mode));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/run') {
    const body = await readBody(req);
    const result = await startRun(body.mode || 'static');
    send(res, result.status || (result.ok ? 202 : 500), result);
    return;
  }
  send(res, 404, { ok: false, error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`SkyeCrawler Control listening at http://${HOST}:${PORT}`);
});

process.on('SIGINT', () => {
  if (staticServer) staticServer.kill();
  server.close(() => process.exit(0));
});
