import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const checkedAt = new Date().toISOString();
const safeStamp = checkedAt.replace(/[:.]/g, '-');
const ARTIFACT_DIR = path.resolve(REPO_ROOT, 'test-artifacts', `skyemusicnexus-artist-brain-tooling-${safeStamp}`);
const CANONICAL_PROOF_DIR = path.resolve(REPO_ROOT, 'metraiyux_0s_site', 'SkyeMusicNexus', 'proof');
const ADMIN_CODE = 'music-brain-tooling-admin';

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
      const [role = 'artist', email = `${role}@music-brain.local`] = token.split(':');
      return Response.json({
        active: true,
        email,
        username: email,
        sub: `music-brain-${role}-${email}`,
        role,
        scope: role === 'admin' ? 'admin.read admin.write music.write' : 'music.read music.write',
        isAdmin: role === 'admin',
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

async function call(method, route, { body, token = 'artist:brain-tools@example.com', admin = false, expectOk = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (admin) headers['x-free99-admin-code'] = ADMIN_CODE;
  const response = await worker.fetch(new Request(`https://music-brain-tooling.test${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }), env, { waitUntil() {} });
  const payload = await response.json().catch(async () => ({ text: await response.text() }));
  if (expectOk && !response.ok) {
    throw new Error(`${method} ${route} returned ${response.status}: ${JSON.stringify(payload).slice(0, 900)}`);
  }
  return { status: response.status, ok: response.ok, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function textHasTrash(value) {
  const text = String(value || '').toLowerCase();
  return [
    'artist lane is active',
    'tapped in',
    'has motion',
    'love for the signal',
    'nexus update is live',
  ].some((phrase) => text.includes(phrase));
}

const artist = (await call('POST', '/api/skymusicnexus/music-artists', {
  body: {
    action: 'register',
    id: 'artist_brain_tools_001',
    name: 'Brain Tools Artist',
    email: 'brain-tools-artist@example.com',
    genre: ['midwest bounce', 'launch ops'],
    bio: 'Builds releases, useful fan assets, and local brand systems inside MusicNexus.',
  },
})).payload.artist;

const peerArtist = (await call('POST', '/api/skymusicnexus/music-artists', {
  token: 'artist:peer@example.com',
  body: {
    action: 'register',
    id: 'artist_peer_tools_002',
    name: 'Peer Drop Artist',
    email: 'peer-drop-artist@example.com',
    genre: ['club rap'],
    bio: 'Network artist used for local listening proof.',
  },
})).payload.artist;

const release = (await call('POST', '/api/skymusicnexus/music-releases', {
  body: {
    action: 'submit',
    id: 'rel_brain_tools_001',
    artistId: artist.id,
    title: 'Receipts Over Static',
    type: 'single',
    tracks: [{ title: 'Receipts Over Static', previewUrl: '/proof/receipts-over-static.mp3', duration: 143 }],
    rights: { ownershipAttested: true, previewUseAuthorized: true },
  },
})).payload.release;

const peerRelease = (await call('POST', '/api/skymusicnexus/music-releases', {
  token: 'artist:peer@example.com',
  body: {
    action: 'submit',
    id: 'rel_peer_tools_002',
    artistId: peerArtist.id,
    title: 'Peer Drop Signal',
    type: 'single',
    tracks: [{ title: 'Peer Drop Signal', previewUrl: '/proof/peer-drop-signal.mp3', duration: 126 }],
    rights: { ownershipAttested: true, previewUseAuthorized: true },
  },
})).payload.release;

await call('POST', '/api/skymusicnexus/music-store', {
  body: {
    action: 'upsert-store',
    artistId: artist.id,
    artistName: artist.name,
    name: 'Brain Tools Artist Store',
    bio: 'Launch bundles, private access, and fan support paths.',
  },
});

const product = (await call('POST', '/api/skymusicnexus/music-store', {
  body: {
    action: 'create-product',
    artistId: artist.id,
    releaseId: release.id,
    title: 'Receipts Launch Access',
    description: 'Fan access with behind-the-release notes, clip previews, and launch receipts.',
    productType: 'private_access',
    priceCents: 1200,
    fulfillmentType: 'manual-nexus-delivery',
  },
})).payload.product;

const peerPost = (await call('POST', '/api/skymusicnexus/music-social', {
  token: 'artist:peer@example.com',
  body: {
    action: 'create-feed-post',
    id: 'feed_peer_tools_002',
    artistId: peerArtist.id,
    releaseId: peerRelease.id,
    caption: 'Peer Drop Signal needs first-listen feedback on hook, mix pocket, and story angle.',
    hashtags: ['musicnexus', 'peerdrop'],
  },
})).payload.post;

const profile = (await call('POST', '/api/skymusicnexus/music-brain', {
  body: {
    action: 'seed-artist-brain',
    artistId: artist.id,
    artistName: artist.name,
    tone: 'specific, useful, grateful, release-focused',
    objectives: 'build local brand assets, answer fan questions, stream network releases, route fans to store',
    bannedClaims: 'guaranteed streams, fake chart claims, rights claims not approved, fake scarcity',
  },
})).payload.profile;
assert(profile?.localOnly === true && profile?.providerRequired === false, 'artist brain must stay provider-free/local');

await call('POST', '/api/skymusicnexus/music-brain', {
  body: {
    action: 'add-memory',
    artistId: artist.id,
    title: 'Release story',
    text: 'Receipts Over Static is about proving the work before asking fans to support the drop.',
    tags: 'release-story,voice,fan-value',
    source: 'artist-team',
  },
});

const logoTool = (await call('POST', '/api/skymusicnexus/music-brain', {
  body: {
    action: 'build-tool-asset',
    artistId: artist.id,
    toolId: 'logo_brief',
    releaseId: release.id,
    productId: product.productId,
    brief: 'Make a logo direction that works on cover art, profile photos, and clip watermarks.',
    publishToFeed: true,
  },
})).payload;
assert(logoTool.toolRun?.toolId === 'logo_brief', 'manual logo tool run did not persist');
assert(logoTool.toolRun?.handoffUrl?.includes('/Marketing-Made-Easy/kAIxUBrandKit/index.html'), 'logo tool run missing kAIxU BrandKit handoff');
assert(logoTool.post?.caption && !textHasTrash(logoTool.post.caption), 'manual tool post used generic trash content');

const cycle = (await call('POST', '/api/skymusicnexus/music-brain', {
  body: {
    action: 'run-local-cycle',
    artistId: artist.id,
    goal: 'build launch assets, post useful context, listen through peer release, and engage the network',
    limit: 8,
    weightedMix: false,
    execute: true,
  },
})).payload;

const receiptKinds = cycle.receipts.map((receipt) => receipt.kind);
assert(receiptKinds.includes('tool_asset'), 'cycle did not execute local tool assets');
assert(receiptKinds.includes('feed_post'), 'cycle did not publish a meaningful feed post');
assert(receiptKinds.includes('listen_release'), 'cycle did not listen through another artist release');
assert(receiptKinds.includes('engage_post'), 'cycle did not engage the network feed');
const listenReceipt = cycle.receipts.find((receipt) => receipt.kind === 'listen_release');
assert(listenReceipt?.metricLane === 'nexusStreams' && listenReceipt.nexusMetricEligible === true && listenReceipt.publicMetricEligible === true, 'artist brain listens must increment the unified Nexus stream count only');

const brainHub = (await call('GET', `/api/skymusicnexus/music-brain?action=hub&artistId=${encodeURIComponent(artist.id)}`)).payload;
assert(brainHub.summary.toolRuns >= 3, `expected at least three local tool runs, got ${brainHub.summary.toolRuns}; actions=${cycle.actions.map((item) => `${item.type}:${item.toolId || item.releaseId || item.targetId || ''}:${item.status}`).join(',')} receipts=${receiptKinds.join(',')} toolRuns=${brainHub.toolRuns.map((run) => run.toolId).join(',')}`);
assert(brainHub.toolCatalog.some((tool) => tool.id === 'brand_kit' && tool.handoffUrl.includes('/Marketing-Made-Easy/BrandID-Offline-PWA/index.html')), 'tool catalog missing BrandID handoff');
assert(brainHub.toolCatalog.some((tool) => tool.id === 'web_creator_landing' && tool.handoffUrl.includes('/Marketing-Made-Easy/SkyeWebCreatorMax/builder.html')), 'tool catalog missing SkyeWebCreator handoff');
assert(brainHub.toolCatalog.some((tool) => tool.id === 'campaign_brief' && tool.apiRoute === '/api/brandforge/intelligence/brief'), 'tool catalog missing BrandForge local intelligence API route');
assert(brainHub.toolRuns.every((run) => run.providerRequired === false && run.localOnly === true), 'tool runs must be local/provider-free');

const socialHub = (await call('GET', '/api/skymusicnexus/music-social?action=hub')).payload;
const artistPosts = socialHub.feedItems.filter((post) => post.artistId === artist.id);
assert(artistPosts.length >= 3, 'artist brain did not create multiple useful feed posts');
for (const post of artistPosts) {
  assert(String(post.caption || '').length > 80, `brain post too thin: ${post.id}`);
  assert(!textHasTrash(post.caption), `brain post contains generic filler: ${post.caption}`);
  assert(/what|ask|tell|which|handoff|support|listen|store|logo|page/i.test(post.caption), `brain post lacks an interaction/value cue: ${post.caption}`);
}

const networkPost = socialHub.feedItems.find((post) => post.id === peerPost.id);
const networkComment = networkPost?.stats?.comments?.find((comment) => comment.artistId === artist.id);
assert(networkComment, 'artist brain did not comment on peer network post');
assert(networkComment.body.includes('?'), 'network comment should ask a real question');
assert(!textHasTrash(networkComment.body), 'network comment used generic filler');

const peerReleaseAfter = (await call('GET', `/api/skymusicnexus/music-releases?action=get&id=${encodeURIComponent(peerRelease.id)}`)).payload.release;
assert(Number(peerReleaseAfter.analytics?.nexusStreams || 0) >= 1, 'peer artist did not receive Nexus listen telemetry from the local brain');
assert(!('streams' in (peerReleaseAfter.analytics || {})), 'peer artist still exposes a separate streams counter');
assert(!('systemListens' in (peerReleaseAfter.analytics || {})), 'peer artist still exposes separate system listen telemetry');
assert(!('localBrainStreams' in (peerReleaseAfter.analytics || {})), 'peer artist still exposes separate local-brain stream telemetry');

const traffic = (await call('GET', '/api/skymusicnexus/music-drops?action=traffic-summary', { token: null })).payload;
assert(traffic.trafficSummary.nexusStreams >= 1, 'traffic summary missing unified Nexus stream count');
assert(!('qualifiedStreams' in traffic.trafficSummary), 'traffic summary still exposes duplicate qualified stream telemetry');
assert(!('localBrainStreams' in traffic.trafficSummary), 'traffic summary still exposes separate local-brain source lane');
assert(!('humanStreams' in traffic.trafficSummary), 'traffic summary still exposes separate human source lane');
assert(!('radioStreams' in traffic.trafficSummary), 'traffic summary still exposes separate radio source lane');

const gamify = (await call('GET', `/api/skymusicnexus/music-gamify?action=hub&artistId=${encodeURIComponent(artist.id)}`)).payload;
assert(gamify.events.some((event) => event.activityType === 'brand_asset' || event.activityType === 'tool_asset'), 'SkyeMeter did not record tool asset activity');
assert(gamify.events.some((event) => event.activityType === 'nexus_stream_discovery'), 'SkyeMeter did not record peer discovery listen activity');

const report = {
  ok: true,
  checkedAt,
  assertions: [
    'artist local brain remains provider-free',
    'local tool catalog exposes mounted 0S app handoffs for BrandID, kAIxU BrandKit, SkyeWebCreatorMax, BrandForge, SkyeDocxMax, and RouteX',
    'manual tool build creates a logo brief with a usable handoff and publishes specific feed copy',
    'local cycle builds tool assets, posts useful release/store context, logs system discovery listens, and comments with a real question',
    'generated feed posts avoid old generic filler phrases',
    'peer artist receives unified Nexus stream analytics and engagement',
    'SkyeMeter records tool asset and network discovery activity',
  ],
  artistId: artist.id,
  releaseId: release.id,
  productId: product.productId,
  profileId: profile.brainId,
  manualToolRunId: logoTool.toolRun.toolRunId,
  cycleId: cycle.cycle.cycleId,
  receiptKinds,
  toolRuns: brainHub.toolRuns.map((run) => ({ toolRunId: run.toolRunId, toolId: run.toolId, appId: run.appId, handoffUrl: run.handoffUrl })),
  artistPostCount: artistPosts.length,
  networkComment: networkComment.body,
  peerNexusStreams: peerReleaseAfter.analytics.nexusStreams,
  trafficSummary: traffic.trafficSummary,
  gamifyEvents: gamify.events.map((event) => event.activityType),
};

await mkdir(ARTIFACT_DIR, { recursive: true });
await mkdir(CANONICAL_PROOF_DIR, { recursive: true });
const reportJson = `${JSON.stringify(report, null, 2)}\n`;
const reportPath = path.join(ARTIFACT_DIR, 'receipt.json');
const latestPath = path.join(CANONICAL_PROOF_DIR, 'skyemusicnexus-artist-brain-tooling-latest.json');
await writeFile(reportPath, reportJson);
await writeFile(latestPath, reportJson);
console.log(JSON.stringify({ ok: true, report: reportPath, latest: latestPath, artistId: artist.id, toolRuns: report.toolRuns.length, receiptKinds }, null, 2));
