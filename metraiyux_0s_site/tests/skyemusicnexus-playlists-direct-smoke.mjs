#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const workerBase = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const pagesBase = (process.env.MUSIC_NEXUS_PAGES_BASE || 'https://skye-music-nexus.pages.dev').replace(/\/+$/, '');
const receiptPath = path.join(
  repoRoot,
  'test-artifacts',
  'reflection-and-collective-drops',
  'skyemusicnexus-playlists-direct-smoke-latest.json',
);

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
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
        signal: AbortSignal.timeout(20000),
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

async function fetchText(url, options = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), ...options });
  const text = await response.text();
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), text };
}

async function fetchBytes(url, options = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), ...options });
  const bytes = (await response.arrayBuffer()).byteLength;
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), bytes };
}

function assertContains(record, expected) {
  assert(record.text.includes(expected), `${record.url} missing expected text: ${expected}`);
}

async function main() {
  const receipt = {
    ok: false,
    checkedAt: new Date().toISOString(),
    workerBase,
    pagesBase,
    authAttempts: [],
    checks: [],
  };

  const pagesDiscover = await fetchText(`${pagesBase}/public/discover.html`);
  pagesDiscover.url = `${pagesBase}/public/discover.html`;
  assert(pagesDiscover.status === 200, `Pages Discover returned ${pagesDiscover.status}`);
  assertContains(pagesDiscover, 'Charts, drops, and custom queues.');
  assertContains(pagesDiscover, 'Create Playlist');
  assertContains(pagesDiscover, 'Start All-Nexus Radio');
  receipt.checks.push({ surface: 'pages-discover', status: pagesDiscover.status, contains: ['Charts, drops, and custom queues.', 'Create Playlist', 'Start All-Nexus Radio'] });

  const pagesRadio = await fetchText(`${pagesBase}/public/radio`);
  pagesRadio.url = `${pagesBase}/public/radio`;
  assert(pagesRadio.status === 200, `Pages radio returned ${pagesRadio.status}`);
  assertContains(pagesRadio, 'All-Nexus Radio');
  assertContains(pagesRadio, 'Nexus streams');
  receipt.checks.push({ surface: 'pages-radio', status: pagesRadio.status, contains: ['All-Nexus Radio', 'Nexus streams'] });

  const pagesCatalog = await fetchText(`${pagesBase}/public/data/playlists.json`);
  pagesCatalog.url = `${pagesBase}/public/data/playlists.json`;
  assert(pagesCatalog.status === 200, `Pages catalog returned ${pagesCatalog.status}`);
  const pagesJson = JSON.parse(pagesCatalog.text);
  assert(pagesJson.schema === 'skyemusicnexus.playlists.v1', 'Pages catalog schema mismatch');
  assert(pagesJson.totals.tracks >= 7, 'Pages catalog needs playable tracks');
  assert(pagesJson.tracks.some((track) => /^Twin Signal/i.test(track.title)), 'Pages catalog missing Twin Signal');
  assert(pagesJson.tracks.some((track) => /^Proof Engine/i.test(track.title)), 'Pages catalog missing Proof Engine');
  assert(pagesJson.tracks.some((track) => /^Skyline Pact/i.test(track.title)), 'Pages catalog missing Skyline Pact');
  assert(pagesJson.tracks.some((track) => /^Neon Drift Relay/i.test(track.title)), 'Pages catalog missing Neon Drift Relay');
  assert(pagesJson.tracks.some((track) => /^Close The Mirror/i.test(track.title)), 'Pages catalog missing Close The Mirror');
  receipt.checks.push({ surface: 'pages-catalog', status: pagesCatalog.status, totals: pagesJson.totals });

  const pagesPrefixedReflection = await fetchText(`${pagesBase}/SkyeMusicNexus/artist-storefronts/gray-skyes/drops/reflection/`, {
    redirect: 'manual',
  });
  receipt.checks.push({
    surface: 'pages-prefixed-reflection-redirect',
    status: pagesPrefixedReflection.status,
    location: pagesPrefixedReflection.headers.location || '',
  });
  assert([301, 302, 303, 307, 308].includes(pagesPrefixedReflection.status), `Pages prefixed reflection expected redirect, got ${pagesPrefixedReflection.status}`);
  assert((pagesPrefixedReflection.headers.location || '').includes('/artist-storefronts/gray-skyes/drops/reflection/'), 'Pages prefixed reflection redirect target mismatch');

  const pagesStores = await fetchText(`${pagesBase}/artist-storefronts/`);
  pagesStores.url = `${pagesBase}/artist-storefronts/`;
  assert(pagesStores.status === 200, `Pages artist storefronts returned ${pagesStores.status}`);
  assertContains(pagesStores, 'artist-card-media');
  assertContains(pagesStores, 'products packaged');
  assertContains(pagesStores, 'Shop Products');
  receipt.checks.push({ surface: 'pages-artist-storefronts', status: pagesStores.status, contains: ['artist-card-media', 'products packaged', 'Shop Products'] });

  const pagesCrooked = await fetchText(`${pagesBase}/artist-storefronts/gray-skyes-collective/releases/crooked-reflection/`);
  pagesCrooked.url = `${pagesBase}/artist-storefronts/gray-skyes-collective/releases/crooked-reflection/`;
  assert(pagesCrooked.status === 200, `Pages Crooked Reflection returned ${pagesCrooked.status}`);
  for (const text of ['Crooked Reflection', 'Skyline Pact', 'Neon Drift Relay', 'Close The Mirror']) assertContains(pagesCrooked, text);
  receipt.checks.push({ surface: 'pages-crooked-reflection', status: pagesCrooked.status, contains: ['Crooked Reflection', 'Skyline Pact', 'Neon Drift Relay', 'Close The Mirror'] });

  const pagesAudioChecks = [
    '/artist-storefronts/gray-skyes/drops/skyline-pact/audio/skyline-pact.mp3',
    '/artist-storefronts/artist-full-matrix-20260523060758/drops/neon-drift-relay/audio/neon-drift-relay.mp3',
    '/artist-storefronts/gray-skyes/drops/close-the-mirror/audio/close-the-mirror.mp3',
  ];
  for (const route of pagesAudioChecks) {
    const audio = await fetchBytes(`${pagesBase}${route}`);
    assert(audio.status === 200, `Pages audio ${route} returned ${audio.status}`);
    assert((audio.headers['content-type'] || '').includes('audio'), `Pages audio ${route} missing audio content type`);
    assert(audio.bytes >= 1_000_000, `Pages audio ${route} too small: ${audio.bytes}`);
    receipt.checks.push({ surface: 'pages-audio', route, status: audio.status, contentType: audio.headers['content-type'] || '', bytes: audio.bytes });
  }

  const workerUnauth = await fetchText(`${workerBase}/SkyeMusicNexus/public/discover.html`, { redirect: 'manual' });
  receipt.checks.push({
    surface: 'worker-discover-unauth',
    status: workerUnauth.status,
    location: workerUnauth.headers.location || '',
  });
  assert([301, 302, 303, 307, 308].includes(workerUnauth.status), `Worker unauth Discover expected redirect, got ${workerUnauth.status}`);
  assert(/admin\/login\.html/.test(workerUnauth.headers.location || ''), 'Worker unauth Discover did not redirect to shared admin login');

  const gate = await resolveOwnerGate(receipt);
  receipt.auth = { sourceKey: gate.sourceKey, tokenResolved: true };

  const workerDiscover = await fetchText(`${workerBase}/SkyeMusicNexus/public/discover.html`, {
    headers: gateHeaders(gate.token),
  });
  workerDiscover.url = `${workerBase}/SkyeMusicNexus/public/discover.html`;
  assert(workerDiscover.status === 200, `Worker Discover returned ${workerDiscover.status}`);
  assertContains(workerDiscover, 'Charts, drops, and custom queues.');
  assertContains(workerDiscover, 'Create Playlist');
  assertContains(workerDiscover, 'Start All-Nexus Radio');
  receipt.checks.push({ surface: 'worker-discover-auth', status: workerDiscover.status, contains: ['Charts, drops, and custom queues.', 'Create Playlist', 'Start All-Nexus Radio'] });

  const workerCatalog = await fetchText(`${workerBase}/SkyeMusicNexus/public/data/playlists.json`, {
    headers: gateHeaders(gate.token),
  });
  workerCatalog.url = `${workerBase}/SkyeMusicNexus/public/data/playlists.json`;
  assert(workerCatalog.status === 200, `Worker catalog returned ${workerCatalog.status}`);
  const workerJson = JSON.parse(workerCatalog.text);
  assert(workerJson.schema === 'skyemusicnexus.playlists.v1', 'Worker catalog schema mismatch');
  assert(workerJson.totals.tracks >= 7, 'Worker catalog needs playable tracks');
  assert(workerJson.tracks.some((track) => /^Twin Signal/i.test(track.title)), 'Worker catalog missing Twin Signal');
  assert(workerJson.tracks.some((track) => /^Proof Engine/i.test(track.title)), 'Worker catalog missing Proof Engine');
  assert(workerJson.tracks.some((track) => /^Skyline Pact/i.test(track.title)), 'Worker catalog missing Skyline Pact');
  assert(workerJson.tracks.some((track) => /^Neon Drift Relay/i.test(track.title)), 'Worker catalog missing Neon Drift Relay');
  assert(workerJson.tracks.some((track) => /^Close The Mirror/i.test(track.title)), 'Worker catalog missing Close The Mirror');
  receipt.checks.push({ surface: 'worker-catalog-auth', status: workerCatalog.status, totals: workerJson.totals });

  const workerCrooked = await fetchText(`${workerBase}/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/crooked-reflection/`, {
    headers: gateHeaders(gate.token),
  });
  workerCrooked.url = `${workerBase}/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/crooked-reflection/`;
  assert(workerCrooked.status === 200, `Worker Crooked Reflection returned ${workerCrooked.status}`);
  for (const text of ['Crooked Reflection', 'Skyline Pact', 'Neon Drift Relay', 'Close The Mirror']) assertContains(workerCrooked, text);
  receipt.checks.push({ surface: 'worker-crooked-reflection-auth', status: workerCrooked.status, contains: ['Crooked Reflection', 'Skyline Pact', 'Neon Drift Relay', 'Close The Mirror'] });

  for (const route of pagesAudioChecks.map((route) => `/SkyeMusicNexus${route}`)) {
    const response = await fetch(`${workerBase}${route}`, { headers: gateHeaders(gate.token), signal: AbortSignal.timeout(30000) });
    if (response.status === 402) {
      const payload = await response.json().catch(() => ({}));
      assert(payload.code === 'SKYEPAY_ASSET_PURCHASE_REQUIRED', `Worker audio ${route} returned unexpected 402 payload`);
      receipt.checks.push({ surface: 'worker-audio-protected', route, status: response.status, code: payload.code });
      continue;
    }
    const bytes = (await response.arrayBuffer()).byteLength;
    const headers = Object.fromEntries(response.headers.entries());
    assert(response.status === 200, `Worker audio ${route} returned ${response.status}`);
    assert((headers['content-type'] || '').includes('audio'), `Worker audio ${route} missing audio content type`);
    assert(bytes >= 1_000_000, `Worker audio ${route} too small: ${bytes}`);
    receipt.checks.push({ surface: 'worker-audio-auth', route, status: response.status, contentType: headers['content-type'] || '', bytes });
  }

  receipt.ok = true;
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
