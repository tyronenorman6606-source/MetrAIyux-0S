#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site', 'SkyeMusicNexus');
const catalogPath = path.join(nexusRoot, 'public', 'data', 'playlists.json');
const radioPath = path.join(nexusRoot, 'public', 'radio.html');
const playerPath = path.join(nexusRoot, 'public', 'nexus-player.js');
const receiptPath = path.join(repoRoot, 'test-artifacts', 'reflection-and-collective-drops', 'skyemusicnexus-radio-tracking-proof-latest.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function memoryKv() {
  const store = new Map();
  return {
    async get(key, opts = {}) {
      const value = store.get(key);
      if (value == null) return null;
      return opts.type === 'json' ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
  };
}

async function call(method, route, body = null) {
  const response = await worker.fetch(new Request(`https://radio-tracking.test${route}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  }), { SITE_EVENTS_KV: memoryKv() }, { waitUntil() {} });
  const payload = await response.json().catch(async () => ({ text: await response.text() }));
  return { status: response.status, ok: response.ok, payload };
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const radioHtml = fs.readFileSync(radioPath, 'utf8');
const playerJs = fs.readFileSync(playerPath, 'utf8');

assert(catalog.tracks.length >= 40, 'full catalog radio needs the current library');
assert(catalog.tracks.every((track) => track.artistId), 'catalog tracks must carry artistId for artist stats');
const grayTracks = catalog.tracks.filter((track) => track.artistSlug === 'gray-skyes');
assert(grayTracks.length >= 10, 'Gray catalog should have enough drops for cover rotation proof');
assert(new Set(grayTracks.map((track) => track.coverImage)).size >= 4, 'Gray tracks are not rotating cover images');

for (const snippet of ['All-Nexus Radio', 'Start Radio', 'playRadio', 'music-drops?action=traffic-summary', 'Nexus streams']) {
  assert(radioHtml.includes(snippet), `radio.html missing ${snippet}`);
}
for (const snippet of ['playRadio', 'bindNativeAudio', 'native_audio', 'skymusicnexus.radioQueue.v1', 'skymusicnexus.telemetryOutbox.v1', "credentials: 'omit'", "text/plain;charset=UTF-8"]) {
  assert(playerJs.includes(snippet), `nexus-player missing ${snippet}`);
}

const track = catalog.tracks[0];
const event = {
  action: 'track-public-event',
  eventType: 'qualified_stream',
  listenerId: 'proof_listener_radio',
  sessionId: 'proof_session_radio',
  listenerKind: 'human_listener',
  sourceType: 'nexus_radio',
  trackId: track.trackId,
  productId: track.productId,
  artistId: track.artistId,
  artistSlug: track.artistSlug,
  artistName: track.artistName,
  title: track.title,
  genre: track.genre,
  listenSeconds: 42,
  durationSeconds: 80,
  progressPct: 53,
  queueId: 'all-nexus-radio',
};
const env = { SITE_EVENTS_KV: memoryKv() };
async function callWithEnv(method, route, body = null, headers = {}) {
  const hasBody = body !== null && body !== undefined;
  const response = await worker.fetch(new Request(`https://radio-tracking.test${route}`, {
    method,
    headers: hasBody ? { 'content-type': 'application/json', ...headers } : headers,
    body: hasBody ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  }), env, { waitUntil() {} });
  const payload = await response.json().catch(async () => ({ text: await response.text() }));
  return { status: response.status, ok: response.ok, payload };
}

const options = await callWithEnv('OPTIONS', '/api/skymusicnexus/music-drops', null, {
  origin: 'https://skye-music-nexus.pages.dev',
  'access-control-request-method': 'POST',
  'access-control-request-headers': 'content-type',
});
assert(options.ok, `public telemetry CORS preflight rejected: ${options.status}`);

const post = await callWithEnv('POST', '/api/skymusicnexus/music-drops', JSON.stringify(event), {
  origin: 'https://skye-music-nexus.pages.dev',
  'content-type': 'text/plain;charset=UTF-8',
});
assert(post.ok, `public radio telemetry rejected: ${post.status}`);
assert(post.payload.event.nexusMetricEligible === true, 'public radio event missing Nexus metric flag');
assert(post.payload.event.publicMetricEligible === true, 'human radio event should be human/public eligible');
assert(post.payload.summary.nexusStreams >= 1, 'radio summary missing Nexus stream count');
assert(!('qualifiedStreams' in post.payload.summary), 'radio summary still exposes a duplicate qualified stream count');
assert(!('radioStreams' in post.payload.summary), 'radio summary still exposes a separate radio stream count');
assert(!('humanStreams' in post.payload.summary), 'radio summary still exposes a separate human stream count');
assert(!('localBrainStreams' in post.payload.summary), 'radio summary still exposes a separate local brain stream count');

const summary = await callWithEnv('GET', '/api/skymusicnexus/music-drops?action=traffic-summary');
assert(summary.ok, 'public traffic summary should be readable without gate auth');
assert(summary.payload.trafficSummary.nexusStreams >= 1, 'public summary missing Nexus stream');
assert(!('qualifiedStreams' in summary.payload.trafficSummary), 'public summary still exposes a duplicate qualified stream count');
assert(!('radioStreams' in summary.payload.trafficSummary), 'public summary still exposes a separate radio stream count');
assert(!('humanStreams' in summary.payload.trafficSummary), 'public summary still exposes a separate human stream count');
assert(!('localBrainStreams' in summary.payload.trafficSummary), 'public summary still exposes a separate local brain stream count');

const receipt = {
  ok: true,
  checkedAt: new Date().toISOString(),
  tracks: catalog.tracks.length,
  grayCoverVariants: new Set(grayTracks.map((track) => track.coverImage)).size,
  proofTrack: track.trackId,
  postSummary: post.payload.summary,
  publicSummary: summary.payload.trafficSummary,
};
fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
