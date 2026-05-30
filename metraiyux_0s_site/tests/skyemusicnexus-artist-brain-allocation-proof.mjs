import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const checkedAt = new Date().toISOString();
const safeStamp = checkedAt.replace(/[:.]/g, '-');
const ARTIFACT_DIR = path.resolve(REPO_ROOT, 'test-artifacts', `skyemusicnexus-artist-brain-allocation-${safeStamp}`);
const CANONICAL_PROOF_DIR = path.resolve(REPO_ROOT, 'metraiyux_0s_site', 'SkyeMusicNexus', 'proof');
const ADMIN_CODE = 'music-brain-allocation-admin';

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

function fakeGateWorker() {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || '');
      const [role = 'artist', email = `${role}@brain-allocation.local`] = token.split(':');
      return Response.json({
        active: true,
        email,
        username: email,
        sub: `music-brain-allocation-${role}-${email}`,
        role,
        scope: role === 'admin' ? 'admin.read admin.write music.write' : 'music.read music.write',
        isAdmin: role === 'admin',
      });
    },
  };
}

const env = {
  SITE_EVENTS_KV: memoryKv(),
  SKYGATEFS27_WORKER: fakeGateWorker(),
  FREE99_ADMIN_CODE: ADMIN_CODE,
  SKYGATE_SOURCE_APP: 'metraiyux-0s',
};

async function call(method, route, { body, token = 'artist:allocation@example.com', admin = false, expectOk = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (admin) headers['x-free99-admin-code'] = ADMIN_CODE;
  const response = await worker.fetch(new Request(`https://brain-allocation.test${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }), env, { waitUntil() {} });
  const payload = await response.json().catch(async () => ({ text: await response.text() }));
  if (expectOk && !response.ok) throw new Error(`${method} ${route} returned ${response.status}: ${JSON.stringify(payload).slice(0, 900)}`);
  return { status: response.status, ok: response.ok, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const artist = (await call('POST', '/api/skymusicnexus/music-artists', {
  body: { action: 'register', id: 'artist_weighted_001', name: 'Weighted Brain Artist', email: 'weighted-brain@example.com', genre: ['proof rap'], bio: 'Artist brain allocation proof lane.' },
})).payload.artist;

await call('POST', '/api/skymusicnexus/music-releases', {
  body: {
    action: 'submit',
    id: 'rel_weighted_home_001',
    artistId: artist.id,
    title: 'Weighted Home Signal',
    type: 'single',
    tracks: [{ title: 'Weighted Home Signal', previewUrl: '/proof/weighted-home.mp3', duration: 128 }],
    rights: { ownershipAttested: true, previewUseAuthorized: true },
  },
});

for (let index = 0; index < 3; index += 1) {
  const peer = (await call('POST', '/api/skymusicnexus/music-artists', {
    token: `artist:peer-${index}@example.com`,
    body: { action: 'register', id: `artist_weighted_peer_${index}`, name: `Weighted Peer ${index + 1}`, email: `weighted-peer-${index}@example.com`, genre: ['club proof'], bio: 'Peer target for system discovery listens.' },
  })).payload.artist;
  const release = (await call('POST', '/api/skymusicnexus/music-releases', {
    token: `artist:peer-${index}@example.com`,
    body: {
      action: 'submit',
      id: `rel_weighted_peer_${index}`,
      artistId: peer.id,
      title: `Weighted Peer Song ${index + 1}`,
      type: 'single',
      tracks: [{ title: `Weighted Peer Song ${index + 1}`, previewUrl: `/proof/weighted-peer-${index}.mp3`, duration: 110 + index * 7 }],
      rights: { ownershipAttested: true, previewUseAuthorized: true },
    },
  })).payload.release;
  await call('POST', '/api/skymusicnexus/music-social', {
    token: `artist:peer-${index}@example.com`,
    body: { action: 'create-feed-post', id: `feed_weighted_peer_${index}`, artistId: peer.id, releaseId: release.id, caption: `Weighted Peer Song ${index + 1} wants feedback on hook, story, and launch page.`, hashtags: ['musicnexus'] },
  });
}

const seeded = (await call('POST', '/api/skymusicnexus/music-brain', {
  body: { action: 'seed-artist-brain', artistId: artist.id, artistName: artist.name, objectives: 'listen through network releases, create song drafts, post useful feed updates, route Relay13 check-ins' },
})).payload;

assert(seeded.profile?.activityMix?.listen === 70, 'brain profile missing 70 percent listen mix');

const cycle = (await call('POST', '/api/skymusicnexus/music-brain', {
  body: { action: 'run-local-cycle', artistId: artist.id, goal: '70 listen / 10 create / 20 social local proof cycle', limit: 10, execute: true },
})).payload;

const typeCounts = cycle.actions.reduce((map, action) => {
  map[action.type] = (map[action.type] || 0) + 1;
  return map;
}, {});
const socialCount = Number(typeCounts.feed_post || 0) + Number(typeCounts.engage_post || 0) + Number(typeCounts.relay13_message || 0);

assert(cycle.cycle.weightedMix === true, 'cycle did not run weighted mix');
assert(typeCounts.listen_release === 7, `expected 7 listen actions, got ${typeCounts.listen_release || 0}`);
assert(typeCounts.create_song_draft === 1, `expected 1 create song draft action, got ${typeCounts.create_song_draft || 0}`);
assert(socialCount === 2, `expected 2 social actions, got ${socialCount}`);
assert(cycle.receipts.filter((receipt) => receipt.kind === 'listen_release').every((receipt) => receipt.metricLane === 'nexusStreams' && receipt.nexusMetricEligible === true && receipt.publicMetricEligible === true && receipt.payoutEligible === false), 'listen receipts must increment the unified Nexus stream count only');
assert(cycle.receipts.some((receipt) => receipt.kind === 'create_song_draft' && receipt.publicReady === false), 'cycle did not queue a non-public song draft package');

const brainHub = (await call('GET', `/api/skymusicnexus/music-brain?action=hub&artistId=${encodeURIComponent(artist.id)}`)).payload;
assert(brainHub.summary.systemListens >= 7, `expected at least 7 system listens, got ${brainHub.summary.systemListens}`);
assert(brainHub.summary.songDrafts >= 1, 'song draft did not persist to brain hub');

const targetedCycle = (await call('POST', '/api/skymusicnexus/music-brain', {
  body: { action: 'run-local-cycle', artistId: artist.id, goal: 'operator-directed local-brain listen target proof', limit: 10, execute: true, targetArtistId: 'artist_weighted_peer_0' },
})).payload;
const targetedListenReceipts = targetedCycle.receipts.filter((receipt) => receipt.kind === 'listen_release');
assert(targetedListenReceipts.length >= 7, 'targeted cycle did not preserve the listen-heavy mix');
assert(targetedListenReceipts.every((receipt) => receipt.targetArtistId === 'artist_weighted_peer_0'), 'operator targetArtistId did not constrain local-brain listens');

const peerRelease = (await call('GET', '/api/skymusicnexus/music-releases?action=get&id=rel_weighted_peer_0')).payload.release;
assert(Number(peerRelease.analytics?.nexusStreams || 0) >= 1, 'peer release missing unified Nexus stream telemetry from artist brains');
assert(!('streams' in (peerRelease.analytics || {})), 'peer release still exposes a separate streams counter');
assert(!('systemListens' in (peerRelease.analytics || {})), 'peer release still exposes separate system listen stream telemetry');
assert(!('localBrainStreams' in (peerRelease.analytics || {})), 'peer release still exposes separate local brain stream telemetry');

const traffic = (await call('GET', '/api/skymusicnexus/music-drops?action=traffic-summary', { token: null })).payload;
assert(traffic.trafficSummary.nexusStreams >= 7, `expected unified Nexus streams in public summary, got ${traffic.trafficSummary.nexusStreams}`);
assert(!('qualifiedStreams' in traffic.trafficSummary), 'public traffic summary still exposes duplicate qualified stream telemetry');
assert(!('localBrainStreams' in traffic.trafficSummary), 'public traffic summary still exposes separate local brain stream telemetry');
assert(!('humanStreams' in traffic.trafficSummary), 'public traffic summary still exposes separate human stream telemetry');
assert(!('radioStreams' in traffic.trafficSummary), 'public traffic summary still exposes separate radio stream telemetry');

const responseText = JSON.stringify({ cycle, brainHub, peerRelease }).toLowerCase();
assert(!responseText.includes('running up streams'), 'private operator language leaked into API payloads');
assert(!responseText.includes('organic streams'), 'organic stream claim leaked into API payloads');

const report = {
  ok: true,
  checkedAt,
  artistId: artist.id,
  cycleId: cycle.cycle.cycleId,
  targetedCycleId: targetedCycle.cycle.cycleId,
  typeCounts,
  socialCount,
  systemListens: brainHub.summary.systemListens,
  songDrafts: brainHub.summary.songDrafts,
  peerNexusStreams: peerRelease.analytics.nexusStreams,
  trafficSummary: traffic.trafficSummary,
};

await mkdir(ARTIFACT_DIR, { recursive: true });
await mkdir(CANONICAL_PROOF_DIR, { recursive: true });
const reportJson = `${JSON.stringify(report, null, 2)}\n`;
const reportPath = path.join(ARTIFACT_DIR, 'receipt.json');
const latestPath = path.join(CANONICAL_PROOF_DIR, 'skyemusicnexus-artist-brain-allocation-latest.json');
await writeFile(reportPath, reportJson);
await writeFile(latestPath, reportJson);
console.log(JSON.stringify({ ok: true, report: reportPath, latest: latestPath, typeCounts, systemListens: report.systemListens }, null, 2));
