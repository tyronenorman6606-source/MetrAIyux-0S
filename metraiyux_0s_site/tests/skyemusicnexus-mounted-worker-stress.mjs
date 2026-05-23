import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const checkedAt = new Date().toISOString();
const safeStamp = checkedAt.replace(/[:.]/g, '-');
const ARTIFACT_DIR = path.resolve(REPO_ROOT, 'test-artifacts', `skyemusicnexus-mounted-worker-stress-${safeStamp}`);
const CANONICAL_PROOF_DIR = path.resolve(REPO_ROOT, 'metraiyux_0s_site', 'SkyeMusicNexus', 'proof');
const ITERATIONS = Number(process.env.SKYE_MUSIC_NEXUS_STRESS_ITERATIONS || 12);
const CONCURRENCY = Number(process.env.SKYE_MUSIC_NEXUS_STRESS_CONCURRENCY || 1);
const READ_STRESS_REQUESTS = Number(process.env.SKYE_MUSIC_NEXUS_READ_STRESS_REQUESTS || 72);
const ADMIN_CODE = 'music-stress-admin';

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
      const [role = 'artist', email = `${role}@music-stress.local`] = token.split(':');
      const admin = role === 'admin' || email.includes('owner');
      return Response.json({
        active: true,
        email,
        username: email,
        sub: `music-stress-${role}-${email}`,
        role: admin ? 'admin' : role,
        scope: admin ? 'admin.read admin.write music.write' : 'music.read music.write',
        artistId: `artist_${email.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
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

async function call(method, route, { body, token, admin = false, expectOk = true, actions, parse = 'auto' } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (admin) headers['x-free99-admin-code'] = ADMIN_CODE;
  const response = await worker.fetch(new Request(`https://skyemusicnexus-mounted-worker-stress.test${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }), env, { waitUntil() {} });
  const contentType = response.headers.get('content-type') || '';
  const payload = parse === 'text' || !contentType.includes('json')
    ? await response.text()
    : await response.json().catch(async () => ({ text: await response.text() }));
  actions?.push({ method, route, status: response.status, ok: response.ok });
  if (expectOk && !response.ok) {
    throw new Error(`${method} ${route} returned ${response.status}: ${JSON.stringify(payload).slice(0, 800)}`);
  }
  return { status: response.status, ok: response.ok, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runIteration(index) {
  const actions = [];
  const suffix = String(index).padStart(2, '0');
  const token = `artist:music-stress-${suffix}@example.com`;
  const artistId = `artist_stress_${suffix}`;
  const releaseId = `rel_stress_${suffix}`;

  const artist = (await call('POST', '/api/skymusicnexus/music-artists', {
    token,
    actions,
    body: {
      action: 'register',
      id: artistId,
      name: `Stress Artist ${suffix}`,
      email: `music-stress-${suffix}@example.com`,
      genre: ['proof-pop', 'release-ops'],
      bio: 'Controlled stress proof artist.',
    },
  })).payload.artist;
  assert(artist?.id === artistId, `artist register mismatch for ${suffix}`);

  const asset = (await call('POST', '/api/skymusicnexus/music-assets', {
    token,
    actions,
    body: {
      action: 'upload',
      artistId,
      title: `Stress Preview ${suffix}`,
      fileName: `stress-preview-${suffix}.mp3`,
      contentType: 'audio/mpeg',
      bytes: 2048 + index,
      dataBase64: Buffer.from(`stress-audio-${suffix}`).toString('base64'),
    },
  })).payload.asset;
  assert(asset?.id, `asset upload missing id for ${suffix}`);

  await call('GET', `/api/skymusicnexus/music-assets?action=stream&id=${encodeURIComponent(asset.id)}`, {
    token,
    actions,
    parse: 'text',
  });

  await call('POST', '/api/skymusicnexus/music-studio', {
    token,
    actions,
    body: {
      action: 'saveProject',
      project: {
        id: `studio_stress_${suffix}`,
        artistId,
        releaseId,
        title: `Stress Session ${suffix}`,
        tempoKey: '92 BPM / A minor',
        sourceEngines: ['SkyeMusicNexus Native DAW'],
      },
    },
  });

  await call('POST', '/api/skymusicnexus/music-studio', {
    token,
    actions,
    body: {
      action: 'queueExport',
      project: { id: `studio_stress_${suffix}`, artistId, releaseId },
      exportTargets: ['mp3-preview', 'release-manifest'],
      releaseForgeLine: { artistId, releaseId, assetId: asset.id },
    },
  });

  const release = (await call('POST', '/api/skymusicnexus/music-releases', {
    token,
    actions,
    body: {
      action: 'submit',
      id: releaseId,
      artistId,
      title: `Stress Single ${suffix}`,
      type: 'single',
      tracks: [{
        title: `Stress Preview ${suffix}`,
        assetId: asset.id,
        previewUrl: `/api/skymusicnexus/music-assets?action=stream&id=${encodeURIComponent(asset.id)}`,
        contentType: 'audio/mpeg',
        bytes: asset.bytes,
      }],
      rights: { ownershipAttested: true, previewUseAuthorized: true },
    },
  })).payload.release;
  assert(release?.id === releaseId, `release submit mismatch for ${suffix}`);

  await call('POST', '/api/skymusicnexus/music-releases', {
    token,
    actions,
    body: { action: 'playback-stream', id: releaseId, trackIndex: 0, listenSeconds: 18 + index },
  });

  await call('POST', '/api/skymusicnexus/music-releases', {
    token,
    actions,
    body: { action: 'update-rights', id: releaseId, ownershipAttested: true, previewUseAuthorized: true, distributionAuthorized: index % 2 === 0 },
  });

  const drop = (await call('POST', '/api/skymusicnexus/music-drops', {
    token,
    actions,
    body: {
      action: 'create-drop',
      artistId,
      artistName: `Stress Artist ${suffix}`,
      releaseId,
      title: `Stress Drop ${suffix}`,
      tierPolicy: 'free99-lite',
      rightsStatus: 'preview-ready',
      tracks: release.tracks,
    },
  })).payload.drop;
  await call('POST', '/api/skymusicnexus/music-drops', {
    token,
    actions,
    body: { action: 'submit-drop', dropId: drop.dropId },
  });

  const contentRequest = (await call('POST', '/api/skymusicnexus/music-exchange', {
    token,
    actions,
    body: {
      action: 'request-content',
      artistId,
      releaseId,
      requestType: 'cover-art',
      title: `Stress visual packet ${suffix}`,
      brief: 'Controlled stress request for cover, caption, and rollout proof.',
    },
  })).payload.request;
  await call('POST', '/api/skymusicnexus/music-exchange', {
    token,
    actions,
    body: { action: 'send-message', threadId: contentRequest.threadId, artistId, body: 'Stress proof inbox reply.' },
  });
  await call('POST', '/api/skymusicnexus/music-exchange', {
    token,
    actions,
    body: { action: 'publish-community', artistId, linkedReleaseId: releaseId, body: `Stress release signal ${suffix}` },
  });
  await call('POST', '/api/skymusicnexus/music-exchange', {
    token,
    actions,
    body: { action: 'build-release-campaign', artistId, releaseId, releaseTitle: release.title, mood: 'proof-focused', platforms: 'feed, pixelfed, mastodon' },
  });

  const feedPost = (await call('POST', '/api/skymusicnexus/music-social', {
    token,
    actions,
    body: {
      action: 'create-feed-post',
      artistId,
      releaseId,
      caption: `Stress post ${suffix}`,
      hashtags: 'stress,proof,musicnexus',
      visibility: 'local-feed',
    },
  })).payload.post;
  await call('POST', '/api/skymusicnexus/music-social', {
    token,
    actions,
    body: { action: 'feed-action', targetId: feedPost.id, feedAction: 'like', artistId },
  });
  await call('POST', '/api/skymusicnexus/music-social', {
    token,
    actions,
    body: { action: 'queue-post', artistId, releaseId, caption: `Provider queue stress ${suffix}` },
  });

  const hub = (await call('GET', '/api/skymusicnexus/hub', { token, actions })).payload;
  assert(hub.gateSessionRequired === true, `hub did not preserve gate boundary for ${suffix}`);
  return {
    index,
    artistId,
    releaseId,
    assetId: asset.id,
    dropId: drop.dropId,
    actions: actions.length,
  };
}

const setupActions = [];
const manifest = await call('GET', '/api/skymusicnexus/routes/manifest', {
  token: 'admin:music-owner@example.com',
  admin: true,
  actions: setupActions,
});
assert(manifest.payload.functions.includes('music-assets'), 'manifest missing music-assets');
const unauthorizedHub = await call('GET', '/api/skymusicnexus/hub', { expectOk: false, actions: setupActions });
assert(unauthorizedHub.status === 401, `unauthorized hub should be 401, got ${unauthorizedHub.status}`);
const unauthorizedWrite = await call('POST', '/api/skymusicnexus/music-artists', {
  expectOk: false,
  actions: setupActions,
  body: { action: 'register', id: 'blocked_artist' },
});
assert(unauthorizedWrite.status === 401, `unauthorized write should be 401, got ${unauthorizedWrite.status}`);

const results = [];
let next = 0;
const workers = Array.from({ length: Math.max(1, CONCURRENCY) }, async () => {
  while (next < ITERATIONS) {
    const current = next;
    next += 1;
    results.push(await runIteration(current));
  }
});
await Promise.all(workers);

const readStressRoutes = [
  '/api/skymusicnexus/hub',
  '/api/skymusicnexus/music-assets?action=list',
  '/api/skymusicnexus/music-releases?action=list',
  '/api/skymusicnexus/music-releases?action=rights-audit',
  '/api/skymusicnexus/music-exchange?action=hub',
  '/api/skymusicnexus/music-social?action=hub',
  '/api/skymusicnexus/music-analytics',
];
const readStress = await Promise.all(Array.from({ length: READ_STRESS_REQUESTS }, async (_, index) => {
  const route = readStressRoutes[index % readStressRoutes.length];
  const result = await call('GET', route, { token: `artist:read-stress-${index}@example.com` });
  return { route, status: result.status, ok: result.ok };
}));
assert(readStress.every((item) => item.ok), 'read stress returned a failed response');

const adminHub = (await call('GET', '/api/skymusicnexus/hub', { token: 'admin:music-owner@example.com', admin: true })).payload;
const analytics = (await call('GET', '/api/skymusicnexus/music-analytics', { token: 'admin:music-owner@example.com', admin: true })).payload;
assert(results.length === ITERATIONS, `expected ${ITERATIONS} stress results, got ${results.length}`);
assert(analytics.totalReleases >= 1, 'analytics did not retain any stress release records');
assert(adminHub.storage_mode === 'kv', 'mounted Worker did not use KV storage mode in stress env');

const report = {
  ok: true,
  app: 'SkyeMusicNexus',
  mode: 'mounted Worker controlled stress',
  checkedAt,
  iterations: ITERATIONS,
  mutationConcurrency: CONCURRENCY,
  readStressRequests: READ_STRESS_REQUESTS,
  setupActions,
  totalWorkflowActions: results.reduce((sum, item) => sum + item.actions, 0),
  readStress: {
    requests: readStress.length,
    failures: readStress.filter((item) => !item.ok).length,
    routes: readStressRoutes,
  },
  retained: {
    artists: adminHub.analytics.totalArtists,
    releases: adminHub.analytics.totalReleases,
    assets: adminHub.analytics.assets,
    drops: adminHub.analytics.drops,
    feedItems: adminHub.analytics.feedItems,
    streams: adminHub.analytics.totalStreams,
  },
  assertions: [
    'routes manifest stays gate-owned and accurate',
    'hub rejects unauthenticated access',
    'writes reject unauthenticated access',
    'shared FS27/SkyGate token path unlocks music API routes',
    'artist registration, upload, stream, studio save, export queue, release submit, rights update, drop submit, exchange, feed, and social queue survive repeated serialized mutation stress',
    'hub, assets, releases, rights, exchange, social, and analytics routes survive concurrent authenticated read stress',
    'Worker stores stress state in shared KV lane without app-specific passwords',
  ],
  results,
};

await mkdir(ARTIFACT_DIR, { recursive: true });
await mkdir(CANONICAL_PROOF_DIR, { recursive: true });
const reportJson = `${JSON.stringify(report, null, 2)}\n`;
await writeFile(path.join(ARTIFACT_DIR, 'report.json'), reportJson);
await writeFile(path.join(CANONICAL_PROOF_DIR, `skyemusicnexus-mounted-worker-stress-${safeStamp}.json`), reportJson);
await writeFile(path.join(CANONICAL_PROOF_DIR, 'skyemusicnexus-mounted-worker-stress-latest.json'), reportJson);
console.log(JSON.stringify(report, null, 2));
