#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site', 'SkyeMusicNexus');
const catalogPath = path.join(nexusRoot, 'public', 'data', 'playlists.json');
const achievementsPath = path.join(nexusRoot, 'public', 'achievements.html');
const discoverPath = path.join(nexusRoot, 'public', 'discover.html');
const playerPath = path.join(nexusRoot, 'public', 'nexus-player.js');
const playerCssPath = path.join(nexusRoot, 'public', 'nexus-player.css');
const workerPath = path.join(repoRoot, 'metraiyux_0s_site', 'cloudflare', 'worker.js');
const receiptPath = path.join(repoRoot, 'test-artifacts', 'reflection-and-collective-drops', 'skyemusicnexus-achievements-proof-latest.json');

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

async function call(env, method, route, body = null) {
  const response = await worker.fetch(new Request(`https://achievements-proof.test${route}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  }), env, { waitUntil() {} });
  const payload = await response.json().catch(async () => ({ text: await response.text() }));
  return { status: response.status, ok: response.ok, payload };
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const track = catalog.tracks.find((item) => /vox/i.test(item.artistName || '')) || catalog.tracks[0];
assert(track?.trackId, 'proof needs a catalog track');

const achievementsHtml = fs.readFileSync(achievementsPath, 'utf8');
const discoverHtml = fs.readFileSync(discoverPath, 'utf8');
const playerJs = fs.readFileSync(playerPath, 'utf8');
const playerCss = fs.readFileSync(playerCssPath, 'utf8');
const workerJs = fs.readFileSync(workerPath, 'utf8');

for (const snippet of ['Achievement Wall', 'Stream milestones', 'music-drops?action=achievement-wall', 'award-map', 'skymusicnexus:achievement-award']) {
  assert(achievementsHtml.includes(snippet), `achievement wall missing ${snippet}`);
}
for (const snippet of ['Live Nexus Trending', 'rebuildLiveCharts', 'trackRankScore', 'mergeLocalStreamEvent', 'music-drops?action=traffic-summary']) {
  assert(discoverHtml.includes(snippet), `discover live chart missing ${snippet}`);
}
for (const snippet of ['skymusicnexus.seenAwards.v1', 'showAchievement', 'emitAchievementAwards', 'skymusicnexus:achievement-award']) {
  assert(playerJs.includes(snippet), `player achievement feedback missing ${snippet}`);
}
for (const snippet of ['.skye-nexus-achievement-toast', 'skye-nexus-award-confetti']) {
  assert(playerCss.includes(snippet), `player achievement css missing ${snippet}`);
}
for (const snippet of ['gamify:{meters:[], merits:[], events:[], giveaways:[], entries:[], achievements:[]}', 'MUSIC_STREAM_MILESTONES', 'musicAwardStreamMilestones', 'achievement-wall']) {
  assert(workerJs.includes(snippet), `worker achievement persistence missing ${snippet}`);
}

const env = { SITE_EVENTS_KV: memoryKv() };
let milestoneResponse = null;
for (let index = 0; index < 100; index += 1) {
  milestoneResponse = await call(env, 'POST', '/api/skymusicnexus/music-drops', {
    action:'track-public-event',
    eventType:'qualified_stream',
    listenerId:`proof_listener_${index}`,
    sessionId:`proof_session_${Math.floor(index / 10)}`,
    listenerKind:index % 5 === 0 ? 'local_brain_artist' : 'human_listener',
    sourceType:index % 5 === 0 ? 'artist_brain_autopilot' : 'nexus_radio',
    trackId:track.trackId,
    productId:track.productId,
    artistId:track.artistId,
    artistSlug:track.artistSlug,
    artistName:track.artistName,
    title:track.title,
    genre:track.genre,
    listenSeconds:42,
    durationSeconds:90,
    progressPct:60,
    queueId:'achievement-proof',
  });
  assert(milestoneResponse.ok, `stream proof event ${index + 1} rejected: ${milestoneResponse.status}`);
}

const awards = milestoneResponse.payload.awards || [];
assert(awards.some((award) => award.scope === 'artist' && award.milestone === 100), '100 stream artist award was not issued');
assert(awards.some((award) => award.scope === 'track' && award.milestone === 100), '100 stream track award was not issued');
assert(milestoneResponse.payload.achievementWall?.total >= 2, 'achievement wall did not include issued awards');

const duplicateCheck = await call(env, 'POST', '/api/skymusicnexus/music-drops', {
  action:'track-public-event',
  eventType:'qualified_stream',
  listenerId:'proof_listener_duplicate',
  sessionId:'proof_session_duplicate',
  listenerKind:'human_listener',
  sourceType:'nexus_radio',
  trackId:track.trackId,
  productId:track.productId,
  artistId:track.artistId,
  artistSlug:track.artistSlug,
  artistName:track.artistName,
  title:track.title,
  genre:track.genre,
  listenSeconds:45,
  durationSeconds:90,
  progressPct:62,
  queueId:'achievement-proof',
});
assert(duplicateCheck.ok, `duplicate proof stream rejected: ${duplicateCheck.status}`);
assert((duplicateCheck.payload.awards || []).length === 0, 'stream milestone awards should not duplicate after the threshold');

const wall = await call(env, 'GET', '/api/skymusicnexus/music-drops?action=achievement-wall');
assert(wall.ok, `public achievement wall rejected: ${wall.status}`);
assert(wall.payload.achievementWall?.achievements?.length >= 2, 'public wall missing persisted achievements');
assert(wall.payload.achievementWall.artistProgress.some((artist) => artist.nexusStreams >= 100), 'artist progress did not reflect stream count');

const summary = await call(env, 'GET', '/api/skymusicnexus/music-drops?action=traffic-summary');
assert(summary.ok, `public traffic summary rejected: ${summary.status}`);
assert(summary.payload.achievementWall?.total >= 2, 'traffic summary does not carry achievement wall');

const receipt = {
  ok:true,
  checkedAt:new Date().toISOString(),
  trackId:track.trackId,
  artistName:track.artistName,
  awarded:awards.map((award) => ({scope:award.scope, milestone:award.milestone, badgeLabel:award.badgeLabel})),
  wallTotal:wall.payload.achievementWall.total,
  trafficSummary:summary.payload.trafficSummary,
};
fs.mkdirSync(path.dirname(receiptPath), { recursive:true });
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
