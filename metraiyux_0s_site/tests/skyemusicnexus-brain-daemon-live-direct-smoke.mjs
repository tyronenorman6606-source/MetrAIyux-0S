#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const pagesBase = (process.env.MUSIC_NEXUS_PAGES_BASE || 'https://skye-music-nexus.pages.dev').replace(/\/+$/, '');
const workerBase = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const checkedAt = new Date().toISOString();
const safeStamp = checkedAt.replace(/[:.]/g, '-');
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyemusicnexus-brain-daemon-live-direct-smoke');
const receiptPath = path.join(artifactDir, `receipt-${safeStamp}.json`);
const latestPath = path.join(artifactDir, 'latest.json');

const secretKeys = [
  'MCP_GATE_SESSION',
  'QUANTUMSKYES_MCP_TOKEN',
  'FREE99_ADMIN_CODE',
  'FREE99_GATE_CODE',
  'OWNER_ADMIN_CODE',
  'ADMIN_CODE',
  'ZERO_OS_ADMIN_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'FS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_CODE',
  'SKYGATE_ADMIN_CODE',
  'SKYGATE_OWNER_CODE',
  'SKYE_GATE_ADMIN_CODE',
  'SKYE_GATE_OWNER_CODE',
];

function assert(condition, message, details = {}) {
  if (!condition) throw new Error(`${message}${Object.keys(details).length ? ` ${JSON.stringify(details).slice(0, 900)}` : ''}`);
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function unquote(value) {
  let clean = String(value || '').trim().replace(/^export\s+/, '').trim();
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) clean = clean.slice(1, -1).trim();
  return clean;
}

function parseEnvText(text) {
  const rows = {};
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|:)\s*(.*)$/);
    if (match) rows[match[1]] = unquote(match[2]);
  }
  return rows;
}

function expandCandidate(value) {
  const clean = unquote(value).replace(/^Bearer\s+/i, '').trim();
  if (!clean) return [];
  const out = [clean];
  try {
    const parsed = JSON.parse(clean);
    for (const key of ['token', 'gateToken', 'gateBearerToken', 'bearer', 'session', 'ownerToken']) {
      if (typeof parsed?.[key] === 'string') out.push(parsed[key].replace(/^Bearer\s+/i, '').trim());
    }
  } catch {}
  return out.filter(Boolean);
}

function localCandidates() {
  const merged = {
    ...parseEnvText(readText(path.join(repoRoot, '.env'))),
    ...parseEnvText(readText(path.join(repoRoot, 'env.txt'))),
    ...parseEnvText(readText(path.join(repoRoot, 'ADMIN_REFERENCE.md'))),
    ...process.env,
  };
  const seen = new Set();
  const candidates = [];
  for (const key of secretKeys) {
    for (const value of expandCandidate(merged[key])) {
      if (!seen.has(value)) {
        seen.add(value);
        candidates.push({ key, value });
      }
    }
  }
  return candidates;
}

function gateHeaders(token, extra = {}) {
  return {
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'x-skygate-session': token,
    ...extra,
  };
}

async function resolveOwnerGate(receipt) {
  for (const candidate of localCandidates()) {
    try {
      const response = await fetch(`${workerBase}/api/owner/admin-login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: candidate.value }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json().catch(() => ({}));
      const token = String(data.gateToken || data.gateBearerToken || data.token || '').replace(/^Bearer\s+/i, '').trim();
      receipt.authAttempts.push({ sourceKey: candidate.key, status: response.status, ok: response.ok && Boolean(token) });
      if (response.ok && token) return { token, sourceKey: candidate.key };
    } catch (error) {
      receipt.authAttempts.push({ sourceKey: candidate.key, ok: false, error: String(error?.message || error).slice(0, 160) });
    }
  }
  throw new Error('No local owner/admin candidate unlocked the shared 0S gate.');
}

async function fetchRecord(url, options = {}) {
  const started = Date.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(options.timeoutMs || 60000), ...options });
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  let json = null;
  if (contentType.includes('json')) {
    try { json = JSON.parse(text); } catch {}
  }
  return {
    url,
    status: response.status,
    ok: response.ok,
    ms: Date.now() - started,
    bytes: Buffer.byteLength(text),
    headers: Object.fromEntries(response.headers.entries()),
    text,
    json,
  };
}

function parseSseBlock(block) {
  const frame = { event: 'message', data: '' };
  for (const rawLine of String(block || '').split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith(':')) continue;
    const index = line.indexOf(':');
    const field = index === -1 ? line : line.slice(0, index);
    const value = index === -1 ? '' : line.slice(index + 1).replace(/^ /, '');
    if (field === 'event') frame.event = value || 'message';
    if (field === 'data') frame.data += `${value}\n`;
  }
  if (frame.data.endsWith('\n')) frame.data = frame.data.slice(0, -1);
  return frame;
}

async function fetchSseEvents(url, options = {}) {
  const started = Date.now();
  const { timeoutMs = 45000, frameCount = 1, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(url, {
    ...fetchOptions,
    headers: { accept: 'text/event-stream', ...(fetchOptions.headers || {}) },
    signal: controller.signal,
  });
  const contentType = response.headers.get('content-type') || '';
  const headers = Object.fromEntries(response.headers.entries());
  let raw = '';
  const frames = [];
  try {
    assert(response.body && typeof response.body.getReader === 'function', 'SSE response has no readable body', { status: response.status, contentType });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (frames.length < frameCount) {
      const { value, done } = await reader.read();
      if (done) break;
      raw += decoder.decode(value, { stream: true });
      let boundary = raw.indexOf('\n\n');
      while (boundary !== -1 && frames.length < frameCount) {
        const parsed = parseSseBlock(raw.slice(0, boundary));
        raw = raw.slice(boundary + 2);
        frames.push({
          event: parsed.event,
          data: parsed.data ? JSON.parse(parsed.data) : null,
        });
        boundary = raw.indexOf('\n\n');
      }
    }
    await reader.cancel().catch(() => {});
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
  const first = frames[0] || {};
  return {
    url,
    status: response.status,
    ok: response.ok,
    ms: Date.now() - started,
    contentType,
    headers,
    event: first.event || '',
    data: first.data || null,
    frames,
    raw: raw.slice(0, 1000),
  };
}

function streamCountFromStatus(status = {}) {
  return Number(status.streamImpact?.nexusStreams || status.metrics?.nexusStreams || status.artistStats?.totals?.nexusStreams || 0);
}

async function main() {
  const receipt = {
    ok: false,
    checkedAt,
    pagesBase,
    workerBase,
    deployment: {
      workerVersion: process.env.ZERO_OS_WORKER_VERSION || '',
      pagesDeployment: process.env.MUSIC_NEXUS_PAGES_DEPLOYMENT || '',
    },
    authAttempts: [],
    checks: [],
    authenticated: false,
    ownerSourceKey: '',
    browserOpened: false,
  };

  const monitor = await fetchRecord(`${pagesBase}/public/brain-monitor.html`);
  assert(monitor.status === 200, 'Pages brain monitor did not return 200', { status: monitor.status });
  receipt.checks.push({ name: 'pages-monitor', url: monitor.url, status: monitor.status, ok: true, bytes: monitor.bytes, ms: monitor.ms });

  const monitorJs = await fetchRecord(`${pagesBase}/public/brain-monitor.js`);
  assert(monitorJs.status === 200, 'Pages brain monitor JS did not return 200', { status: monitorJs.status });
  assert(monitorJs.text.includes('music-brain-daemon:run-now'), 'Pages brain monitor JS is not wired to run-now');
  assert(monitorJs.text.includes('text/event-stream') && monitorJs.text.includes('startLiveStream'), 'Pages brain monitor JS is not wired to daemon SSE events');
  receipt.checks.push({ name: 'pages-monitor-js-live-stream', url: monitorJs.url, status: monitorJs.status, ok: true, bytes: monitorJs.bytes, ms: monitorJs.ms });

  const canonicalPlayerJs = await fetchRecord(`${pagesBase}/public/nexus-player.js`);
  assert(canonicalPlayerJs.status === 200, 'Pages canonical player JS did not return 200', { status: canonicalPlayerJs.status });
  assert(canonicalPlayerJs.text.includes('track-public-event'), 'canonical player is not posting public stream telemetry');
  assert(canonicalPlayerJs.text.includes('hydrateNativeAudioElements') && canonicalPlayerJs.text.includes('trackForMusicPath'), 'canonical player is not hydrating native drop/release audio');
  receipt.checks.push({ name: 'pages-canonical-player-native-audio-hydration', url: canonicalPlayerJs.url, status: canonicalPlayerJs.status, ok: true, bytes: canonicalPlayerJs.bytes, ms: canonicalPlayerJs.ms });

  const neoPlayerJs = await fetchRecord(`${pagesBase}/public/neo-nexus.js`);
  assert(neoPlayerJs.status === 200, 'Pages neo player JS did not return 200', { status: neoPlayerJs.status });
  assert(neoPlayerJs.text.includes('PUBLIC_TELEMETRY_ENDPOINT') && neoPlayerJs.text.includes('neo_nexus_player') && neoPlayerJs.text.includes('qualified_stream'), 'neo player is not mirrored into canonical public stream telemetry');
  receipt.checks.push({ name: 'pages-neo-player-canonical-telemetry-bridge', url: neoPlayerJs.url, status: neoPlayerJs.status, ok: true, bytes: neoPlayerJs.bytes, ms: neoPlayerJs.ms });

  const unauth = await fetchRecord(`${workerBase}/api/skymusicnexus/music-brain-daemon?action=status`);
  assert(unauth.status === 401 || unauth.status === 403, 'daemon status API should require shared gate auth', { status: unauth.status, body: unauth.text.slice(0, 240) });
  receipt.checks.push({ name: 'worker-daemon-status-no-auth-blocked', url: unauth.url, status: unauth.status, ok: true, bytes: unauth.bytes, ms: unauth.ms });

  const unauthEvents = await fetchRecord(`${workerBase}/api/skymusicnexus/music-brain-daemon?action=events`);
  assert(unauthEvents.status === 401 || unauthEvents.status === 403, 'daemon events API should require shared gate auth', { status: unauthEvents.status, body: unauthEvents.text.slice(0, 240) });
  receipt.checks.push({ name: 'worker-daemon-events-no-auth-blocked', url: unauthEvents.url, status: unauthEvents.status, ok: true, bytes: unauthEvents.bytes, ms: unauthEvents.ms });

  const gate = await resolveOwnerGate(receipt);
  receipt.authenticated = true;
  receipt.ownerSourceKey = gate.sourceKey;

  const statusBefore = await fetchRecord(`${workerBase}/api/skymusicnexus/music-brain-daemon?action=status`, {
    headers: gateHeaders(gate.token),
  });
  assert(statusBefore.status === 200, 'authenticated daemon status failed before run-now', { status: statusBefore.status, body: statusBefore.text.slice(0, 500) });
  assert(statusBefore.json?.schema === 'skyemusicnexus.artist-brain-daemon.v1', 'daemon status schema missing before run-now');
  receipt.checks.push({
    name: 'worker-daemon-status-before-run',
    url: statusBefore.url,
    status: statusBefore.status,
    ok: true,
    bytes: statusBefore.bytes,
    ms: statusBefore.ms,
    currentListen: statusBefore.json.currentListen?.title || '',
    currentTrack: statusBefore.json.currentTrack?.title || '',
    recentActions: statusBefore.json.queue?.recentActions?.length || 0,
    nexusStreams: streamCountFromStatus(statusBefore.json),
  });

  const runNow = await fetchRecord(`${workerBase}/api/skymusicnexus/music-brain-daemon`, {
    method: 'POST',
    headers: gateHeaders(gate.token, { 'content-type': 'application/json' }),
    body: JSON.stringify({ action: 'run-now', force: true, maxArtists: 2, cycleSlots: 10, source: 'live-direct-smoke' }),
    timeoutMs: 90000,
  });
  assert([200, 201].includes(runNow.status), 'daemon run-now did not return a success status', { status: runNow.status, body: runNow.text.slice(0, 900) });
  assert(runNow.json?.ok === true, 'daemon run-now payload is not ok', runNow.json || {});
  assert(runNow.json?.status?.schema === 'skyemusicnexus.artist-brain-daemon.v1', 'daemon run-now missing status schema', runNow.json || {});
  assert(runNow.json?.status?.currentListen?.title, 'daemon run-now missing current listen title', runNow.json?.status?.currentListen || {});
  assert(runNow.json?.status?.currentTrack?.title, 'daemon run-now missing current track title', runNow.json?.status?.currentTrack || {});
  assert((runNow.json?.status?.queue?.recentActions || []).length > 0, 'daemon run-now missing recent action feed', runNow.json?.status?.queue || {});
  assert(runNow.json?.status?.currentListen?.metricLane === 'nexusStreams', 'daemon run-now current listen is not on unified nexusStreams lane', runNow.json?.status?.currentListen || {});
  receipt.checks.push({
    name: 'worker-daemon-run-now-current-listen',
    url: runNow.url,
    status: runNow.status,
    ok: true,
    bytes: runNow.bytes,
    ms: runNow.ms,
    currentListen: runNow.json.status.currentListen.title,
    currentTrack: runNow.json.status.currentTrack.title,
    nowListeningCount: (runNow.json.status.nowListening || []).length,
    recentActions: runNow.json.status.queue.recentActions.length,
    executedArtistCount: runNow.json.run?.executedArtistCount || runNow.json.result?.executedArtistCount || 0,
    nexusStreams: streamCountFromStatus(runNow.json.status),
  });

  const statusAfter = await fetchRecord(`${workerBase}/api/skymusicnexus/music-brain-daemon?action=status`, {
    headers: gateHeaders(gate.token),
  });
  assert(statusAfter.status === 200, 'authenticated daemon status failed after run-now', { status: statusAfter.status, body: statusAfter.text.slice(0, 500) });
  assert(statusAfter.json?.currentListen?.title, 'daemon status after run-now missing current listen');
  assert(statusAfter.json?.currentTrack?.title, 'daemon status after run-now missing current track');
  assert((statusAfter.json?.queue?.recentActions || []).length > 0, 'daemon status after run-now missing recent actions');
  assert(Date.parse(statusAfter.json?.daemon?.lastTickAt || ''), 'daemon status after run-now missing parseable lastTickAt', statusAfter.json?.daemon || {});
  assert(Date.parse(statusAfter.json?.daemon?.nextTickAt || ''), 'daemon status after run-now missing parseable nextTickAt', statusAfter.json?.daemon || {});
  receipt.checks.push({
    name: 'worker-daemon-status-after-run-current-fields',
    url: statusAfter.url,
    status: statusAfter.status,
    ok: true,
    bytes: statusAfter.bytes,
    ms: statusAfter.ms,
    currentListen: statusAfter.json.currentListen.title,
    currentTrack: statusAfter.json.currentTrack.title,
    recentActions: statusAfter.json.queue.recentActions.length,
    nexusStreams: streamCountFromStatus(statusAfter.json),
  });

  const daemonEvents = await fetchSseEvents(`${workerBase}/api/skymusicnexus/music-brain-daemon?action=events`, {
    headers: gateHeaders(gate.token),
    frameCount: 3,
    timeoutMs: 55000,
  });
  assert(daemonEvents.status === 200, 'authenticated daemon events stream did not return 200', { status: daemonEvents.status, body: daemonEvents.raw });
  assert(daemonEvents.contentType.includes('text/event-stream'), 'daemon events stream content-type is not SSE', daemonEvents);
  assert(daemonEvents.frames.length >= 3, 'daemon events stream did not emit status and repeated heartbeat frames', daemonEvents);
  assert(daemonEvents.frames[0].event === 'status', 'daemon events first frame is not status', daemonEvents.frames[0]);
  assert(daemonEvents.frames[1].event === 'heartbeat', 'daemon events second frame is not heartbeat', daemonEvents.frames[1]);
  assert(daemonEvents.frames[2].event === 'heartbeat', 'daemon events third frame is not heartbeat', daemonEvents.frames[2]);
  assert(daemonEvents.data?.schema === 'skyemusicnexus.artist-brain-daemon.v1', 'daemon events first frame missing status schema', daemonEvents.data || {});
  assert(daemonEvents.data?.currentListen?.metricLane === 'nexusStreams', 'daemon events current listen is not unified Nexus stream lane', daemonEvents.data?.currentListen || {});
  assert(daemonEvents.frames[1].data?.schema === 'skyemusicnexus.artist-brain-daemon.v1', 'daemon events heartbeat frame missing status schema', daemonEvents.frames[1].data || {});
  assert(daemonEvents.frames[1].data?.daemon?.route === '/api/skymusicnexus/music-brain-daemon', 'daemon events heartbeat frame missing route contract', daemonEvents.frames[1].data?.daemon || {});
  assert(daemonEvents.frames[2].data?.streamImpact?.nexusStreams !== undefined, 'daemon events repeated heartbeat missing stream impact', daemonEvents.frames[2].data?.streamImpact || {});
  receipt.checks.push({
    name: 'worker-daemon-events-sse-live-status',
    url: daemonEvents.url,
    status: daemonEvents.status,
    ok: true,
    bytes: Buffer.byteLength(daemonEvents.raw),
    ms: daemonEvents.ms,
    event: daemonEvents.event,
    frames: daemonEvents.frames.map((frame) => frame.event),
    contentType: daemonEvents.contentType,
    daemonHeader: daemonEvents.headers['x-skymusicnexus-daemon'] || '',
    currentListen: daemonEvents.data.currentListen?.title || '',
    currentTrack: daemonEvents.data.currentTrack?.title || '',
    recentActions: daemonEvents.data.queue?.recentActions?.length || 0,
    nexusStreams: streamCountFromStatus(daemonEvents.data),
  });

  receipt.ok = true;
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  const failure = { ok: false, checkedAt, pagesBase, workerBase, error: String(error?.stack || error), browserOpened: false };
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(failure, null, 2)}\n`);
  fs.writeFileSync(latestPath, `${JSON.stringify(failure, null, 2)}\n`);
  console.error(error.stack || error.message || error);
  process.exit(1);
});
