import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const checkedAt = new Date().toISOString();
const safeStamp = checkedAt.replace(/[:.]/g, '-');
const ARTIFACT_DIR = path.resolve(REPO_ROOT, 'test-artifacts', `skyemusicnexus-artist-brain-daemon-smoke-${safeStamp}`);
const ADMIN_CODE = 'artist-brain-daemon-smoke-admin';
const ACTIVITY_MIX = { listen: 70, create: 10, social: 20 };

class MemoryKV {
  constructor() {
    this.map = new Map();
  }

  async get(key, opts = {}) {
    const value = this.map.get(key);
    if (value == null) return null;
    return opts.type === 'json' ? JSON.parse(value) : value;
  }

  async put(key, value) {
    this.map.set(key, String(value));
  }

  async list({ limit = 1000 } = {}) {
    return { keys: Array.from(this.map.keys()).slice(0, limit).map((name) => ({ name })) };
  }
}

function fakeGateWorker() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/admin/login') {
        return Response.json({
          ok: true,
          token: 'admin:music-owner@example.com',
          active: true,
          email: 'music-owner@example.com',
          username: 'music-owner@example.com',
          sub: 'artist-brain-daemon-owner',
          role: 'admin',
          scope: 'admin.read admin.write music.write gateway.invoke',
          isAdmin: true,
        });
      }
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || '');
      const [role = 'artist', email = `${role}@artist-brain-daemon.local`] = token.split(':');
      const admin = role === 'admin' || email.includes('owner');
      return Response.json({
        active: true,
        email,
        username: email,
        sub: `artist-brain-daemon-${role}-${email}`,
        role: admin ? 'admin' : role,
        scope: admin ? 'admin.read admin.write music.write' : 'music.read music.write',
        isAdmin: admin,
        artistId: `artist_${email.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
      });
    },
  };
}

const env = {
  SKYMUSICNEXUS_KV: new MemoryKV(),
  SKYGATEFS27_WORKER: fakeGateWorker(),
  ADMIN_TOKEN: ADMIN_CODE,
  FREE99_ADMIN_CODE: ADMIN_CODE,
  SKYGATE_SOURCE_APP: 'metraiyux-0s',
  MUSIC_NEXUS_BRAIN_TICK_MAX_ARTISTS: '1',
  MUSIC_NEXUS_BRAIN_TICK_SLOTS: '10',
};

function assert(condition, message, details = {}) {
  if (!condition) {
    const suffix = Object.keys(details).length ? ` ${JSON.stringify(details).slice(0, 1000)}` : '';
    throw new Error(`${message}${suffix}`);
  }
}

function sameMix(value, label) {
  assert(value?.listen === ACTIVITY_MIX.listen, `${label} listen policy is not 70`, value || {});
  assert(value?.create === ACTIVITY_MIX.create, `${label} create policy is not 10`, value || {});
  assert(value?.social === ACTIVITY_MIX.social, `${label} social policy is not 20`, value || {});
}

async function call(method, route, { body, token = 'artist:daemon@example.com', admin = false, expectOk = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (admin) {
    headers['x-admin-token'] = ADMIN_CODE;
    headers['x-free99-admin-code'] = ADMIN_CODE;
  }
  const response = await worker.fetch(new Request(`https://artist-brain-daemon-smoke.test${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }), env, { waitUntil() {} });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('json')
    ? await response.json().catch(async () => ({ text: await response.text() }))
    : await response.text();
  if (expectOk && !response.ok) {
    throw new Error(`${method} ${route} returned ${response.status}: ${JSON.stringify(payload).slice(0, 900)}`);
  }
  return { status: response.status, ok: response.ok, payload };
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

async function callFirstSse(route, { token = 'artist:daemon@example.com', admin = false, frameCount = 1 } = {}) {
  const headers = { accept: 'text/event-stream' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (admin) {
    headers['x-admin-token'] = ADMIN_CODE;
    headers['x-free99-admin-code'] = ADMIN_CODE;
  }
  const response = await worker.fetch(new Request(`https://artist-brain-daemon-smoke.test${route}`, {
    method: 'GET',
    headers,
  }), env, { waitUntil() {} });
  const contentType = response.headers.get('content-type') || '';
  assert(response.body && typeof response.body.getReader === 'function', 'SSE response has no readable body', { status: response.status, contentType });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  const frames = [];
  try {
    while (frames.length < frameCount) {
      const { value, done } = await Promise.race([
        reader.read(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SSE frame timed out')), 7000)),
      ]);
      if (done) break;
      raw += decoder.decode(value, { stream: true });
      let boundary = raw.indexOf('\n\n');
      while (boundary !== -1 && frames.length < frameCount) {
        const frame = parseSseBlock(raw.slice(0, boundary));
        raw = raw.slice(boundary + 2);
        frames.push({ event: frame.event, payload: frame.data ? JSON.parse(frame.data) : null });
        boundary = raw.indexOf('\n\n');
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const first = frames[0] || {};
  return {
    status: response.status,
    ok: response.ok,
    contentType,
    daemonHeader: response.headers.get('x-skymusicnexus-daemon') || '',
    event: first.event || '',
    payload: first.payload || null,
    frames,
    raw: raw.slice(0, 1000),
  };
}

async function runScheduledDaemon() {
  const promises = [];
  const ctx = {
    waitUntil(promise) {
      promises.push(Promise.resolve(promise));
    },
  };
  await worker.scheduled({
    cron: '*/10 * * * *',
    scheduledTime: Date.parse(checkedAt),
  }, env, ctx);
  const settled = await Promise.allSettled(promises);
  const scheduled = settled
    .filter((entry) => entry.status === 'fulfilled')
    .map((entry) => entry.value)
    .find((value) => value?.ok === true && value?.result?.localOnly === true && value?.status?.schema === 'skyemusicnexus.artist-brain-daemon.v1');
  assert(scheduled, 'scheduled daemon did not return the MusicNexus brain status shape', { settled });
  const daemon = {
    source: scheduled.source,
    cron: scheduled.cron,
    tickAt: scheduled.tickAt,
    profileCount: scheduled.result.profileCount,
    executedArtistCount: scheduled.result.executedArtistCount,
    activityMix: scheduled.result.activityMix,
    cycles: scheduled.result.cycles || [],
    status: scheduled.status,
  };
  assert(scheduled.result.localOnly === true, 'daemon status must be local-only', scheduled);
  assert(scheduled.result.providerRequired === false, 'daemon status must not require an external provider', scheduled);
  assert(Number.isFinite(Number(daemon.profileCount)), 'daemon status missing numeric profileCount', daemon);
  assert(Number.isFinite(Number(daemon.executedArtistCount)), 'daemon status missing numeric executedArtistCount', daemon);
  assert(daemon.executedArtistCount >= 1, 'daemon did not execute any artist cycles', daemon);
  assert(typeof daemon.tickAt === 'string' && !Number.isNaN(Date.parse(daemon.tickAt)), 'daemon status missing parseable tickAt', daemon);
  assert(daemon.source === 'cron' && daemon.cron === '*/10 * * * *', 'daemon status source/cron shape changed', daemon);
  sameMix(daemon.activityMix, 'daemon status');
  sameMix(daemon.status.policy?.allocation, 'daemon status policy');
  return { daemon, settledCount: settled.length };
}

function assertOnlyUnifiedStreamCounter(source, label) {
  assert(Number(source?.nexusStreams || 0) > 0, `${label} missing nonzero nexusStreams`, source || {});
  for (const duplicate of ['qualifiedStreams', 'localBrainStreams', 'systemListens', 'humanStreams', 'radioStreams', 'organicStreams']) {
    assert(!(duplicate in source), `${label} still exposes duplicate stream counter ${duplicate}`, source);
  }
}

function assertFallbackVisuals(fallback) {
  assert(fallback.schema_version === 'skye.music.nexus.visuals.v1', 'fallback visuals schema changed', fallback);
  for (const key of ['kpis', 'progress', 'bars', 'donut', 'route_health', 'flows', 'event_mix']) {
    assert(Array.isArray(fallback[key]) && fallback[key].length > 0, `fallback visuals ${key} is empty`);
  }
  const nonzeroKpis = fallback.kpis.filter((item) => Number(item.value || item.used || item.events || 0) > 0);
  const nonzeroBars = fallback.bars.filter((item) => Number(item.value || 0) > 0);
  const nonzeroRoutes = fallback.route_health.filter((item) => Number(item.events || 0) > 0);
  assert(nonzeroKpis.length > 0, 'fallback visuals have no nonzero KPI values', fallback.kpis);
  assert(nonzeroBars.length > 0, 'fallback visuals have no nonzero bar values', fallback.bars);
  assert(nonzeroRoutes.length > 0, 'fallback visuals have no nonzero route event values', fallback.route_health);
}

const suffix = Date.now().toString(36);
const artistId = `artist_daemon_${suffix}`;
const peerId = `artist_daemon_peer_${suffix}`;
const peerProductId = `prod_daemon_peer_${suffix}`;
const peerReferenceReleaseId = `rel_daemon_peer_reference_${suffix}`;
const artistReleaseId = `rel_daemon_home_${suffix}`;

const health = (await call('GET', '/api/skymusicnexus/health', {
  token: 'admin:music-owner@example.com',
  admin: true,
})).payload;
assert(health.ok === true && health.mapped_functions?.includes('music-brain'), 'MusicNexus health no longer exposes music-brain', health);

const artist = (await call('POST', '/api/skymusicnexus/music-artists', {
  body: {
    action: 'register',
    id: artistId,
    name: 'Daemon Smoke Artist',
    email: 'daemon-smoke-artist@example.com',
    genre: ['proof pop', 'ops'],
    bio: 'Local artist brain daemon verification lane.',
  },
})).payload.artist;

const peer = (await call('POST', '/api/skymusicnexus/music-artists', {
  token: 'artist:daemon-peer@example.com',
  body: {
    action: 'register',
    id: peerId,
    name: 'Daemon Peer Artist',
    email: 'daemon-peer-artist@example.com',
    genre: ['network proof'],
    bio: 'Peer artist used for daemon listen and social activity.',
  },
})).payload.artist;

await call('POST', '/api/skymusicnexus/music-releases', {
  body: {
    action: 'submit',
    id: artistReleaseId,
    artistId: artist.id,
    title: 'Daemon Cycle Home Signal',
    type: 'single',
    tracks: [{ title: 'Daemon Cycle Home Signal', previewUrl: '/proof/daemon-home.mp3', duration: 128 }],
    rights: { ownershipAttested: true, previewUseAuthorized: true },
  },
});

await call('POST', '/api/skymusicnexus/music-store', {
  token: 'artist:daemon-peer@example.com',
  body: {
    action: 'upsert-store',
    artistId: peer.id,
    artistName: peer.name,
    name: 'Daemon Peer Nexus Store',
  },
});

await call('POST', '/api/skymusicnexus/music-store', {
  token: 'artist:daemon-peer@example.com',
  body: {
    action: 'create-product',
    productId: peerProductId,
    artistId: peer.id,
    artistName: peer.name,
    releaseId: peerReferenceReleaseId,
    title: 'Daemon Peer Listen Packet',
    description: 'Product target with a release reference so the local brain can create a Nexus listen without a second public counter.',
    productType: 'digital_access',
    priceCents: 0,
    fulfillmentType: 'manual-nexus-delivery',
  },
});

await call('POST', '/api/skymusicnexus/music-social', {
  token: 'artist:daemon-peer@example.com',
  body: {
    action: 'create-feed-post',
    id: `feed_daemon_peer_${suffix}`,
    artistId: peer.id,
    artistName: peer.name,
    caption: 'Daemon peer packet needs a useful comment on launch story, listener path, and store handoff.',
    hashtags: ['musicnexus', 'daemonproof'],
  },
});

const seeded = (await call('POST', '/api/skymusicnexus/music-brain', {
  body: {
    action: 'seed-artist-brain',
    artistId: artist.id,
    artistName: artist.name,
    autopilot: true,
    objectives: 'listen through Nexus peers, create draft packages, publish useful feed context, route Relay13 alerts',
  },
})).payload;
assert(seeded.profile?.status === 'active', 'seeded brain profile missing active status', seeded.profile || {});
assert(seeded.profile?.localOnly === true && seeded.profile?.providerRequired === false, 'seeded brain profile must stay local/provider-free', seeded.profile || {});
sameMix(seeded.profile?.activityMix, 'seeded profile');
assert(/unified Nexus stream count/i.test(seeded.profile?.metricBoundary || ''), 'seeded profile missing unified Nexus stream boundary', seeded.profile || {});

const cycle = (await call('POST', '/api/skymusicnexus/music-brain', {
  body: {
    action: 'run-local-cycle',
    artistId: artist.id,
    goal: 'daemon smoke cycle: listen, social, create, and Relay13 alert ledger activity',
    limit: 30,
    execute: true,
  },
})).payload;

assert(cycle.ok === true, 'run-local-cycle did not return ok', cycle);
assert(cycle.cycle?.executed === true && cycle.cycle?.weightedMix === true, 'run-local-cycle was not an executed weighted cycle', cycle.cycle || {});
sameMix(cycle.cycle?.activityMix, 'run cycle');
const actionTypes = new Set(cycle.actions.map((action) => action.type));
const receiptKinds = new Set(cycle.receipts.map((receipt) => receipt.kind));
assert(actionTypes.has('listen_release') && receiptKinds.has('listen_release'), 'cycle missing listen activity', { actionTypes: [...actionTypes], receiptKinds: [...receiptKinds] });
assert(actionTypes.has('create_song_draft') && receiptKinds.has('create_song_draft'), 'cycle missing create activity', { actionTypes: [...actionTypes], receiptKinds: [...receiptKinds] });
assert(actionTypes.has('feed_post') && receiptKinds.has('feed_post'), 'cycle missing social feed activity', { actionTypes: [...actionTypes], receiptKinds: [...receiptKinds] });
assert(actionTypes.has('relay13_message') && receiptKinds.has('relay13_message'), 'cycle missing alert/Relay13 ledger activity', { actionTypes: [...actionTypes], receiptKinds: [...receiptKinds] });
assert(cycle.receipts.filter((receipt) => receipt.kind === 'listen_release').every((receipt) => (
  receipt.metricLane === 'nexusStreams'
  && receipt.nexusMetricEligible === true
  && receipt.payoutEligible === false
)), 'listen receipts must use only the unified Nexus stream lane', cycle.receipts);

const daemonStatus = await runScheduledDaemon();

const daemonApiStatus = (await call('GET', '/api/skymusicnexus/music-brain-daemon?action=status', {
  token: 'admin:music-owner@example.com',
  admin: true,
})).payload;
assert(daemonApiStatus.schema === 'skyemusicnexus.artist-brain-daemon.v1', 'daemon status API missing schema', daemonApiStatus);
assert(daemonApiStatus.daemon?.route === '/api/skymusicnexus/music-brain-daemon', 'daemon status API missing route contract', daemonApiStatus.daemon || {});
sameMix(daemonApiStatus.policy?.allocation, 'daemon API policy');
assert(Array.isArray(daemonApiStatus.queue?.recentActions), 'daemon status API missing recentActions alias', daemonApiStatus.queue || {});
assert(daemonApiStatus.currentListen?.metricLane === 'nexusStreams', 'daemon status API missing current unified Nexus listen', daemonApiStatus.currentListen || {});
assert(daemonApiStatus.currentTrack?.metricLane === 'nexusStreams', 'daemon status API missing current track metric lane', daemonApiStatus.currentTrack || {});

const policyUpdate = (await call('POST', '/api/skymusicnexus/music-brain-daemon', {
  token: 'admin:music-owner@example.com',
  admin: true,
  body: {
    action: 'update-policy',
    cadenceMinutes: 5,
    maxArtists: 1,
    cycleSlots: 10,
    alerts: { stalledMinutes: 5, founderCommand: true, skyemail: true },
  },
})).payload;
assert(policyUpdate.policy?.cadenceMinutes === 5, 'daemon update-policy did not persist cadence', policyUpdate.policy || {});
assert(policyUpdate.policy?.alerts?.stalledMinutes === 5, 'daemon update-policy did not persist stalled alert minutes', policyUpdate.policy || {});
sameMix(policyUpdate.policy?.allocation, 'daemon update-policy allocation');

const paused = (await call('POST', '/api/skymusicnexus/music-brain-daemon', {
  token: 'admin:music-owner@example.com',
  admin: true,
  body: { action: 'pause' },
})).payload;
assert(paused.controls?.paused === true && paused.status?.daemon?.status === 'paused', 'daemon pause did not persist controls/status', paused);

const resumed = (await call('POST', '/api/skymusicnexus/music-brain-daemon', {
  token: 'admin:music-owner@example.com',
  admin: true,
  body: { action: 'resume' },
})).payload;
assert(resumed.controls?.paused === false && resumed.status?.daemon?.status !== 'paused', 'daemon resume did not persist controls/status', resumed);

const daemonEventsUnauth = await call('GET', '/api/skymusicnexus/music-brain-daemon?action=events', {
  token: null,
  admin: false,
  expectOk: false,
});
assert(daemonEventsUnauth.status === 401 || daemonEventsUnauth.status === 403, 'daemon events API must require shared gate auth', daemonEventsUnauth.payload || {});

const daemonEvents = await callFirstSse('/api/skymusicnexus/music-brain-daemon?action=events', {
  token: 'admin:music-owner@example.com',
  admin: true,
  frameCount: 2,
});
assert(daemonEvents.status === 200, 'daemon events API did not return 200', daemonEvents);
assert(daemonEvents.contentType.includes('text/event-stream'), 'daemon events API did not return SSE content-type', daemonEvents);
assert(daemonEvents.daemonHeader === 'heartbeat-stream', 'daemon events API missing heartbeat header', daemonEvents);
assert(daemonEvents.frames.length >= 2, 'daemon events API did not emit status and heartbeat frames', daemonEvents);
assert(daemonEvents.frames[0].event === 'status', 'daemon events first frame name changed', daemonEvents.frames[0]);
assert(daemonEvents.frames[1].event === 'heartbeat', 'daemon events second frame name changed', daemonEvents.frames[1]);
assert(daemonEvents.payload?.schema === 'skyemusicnexus.artist-brain-daemon.v1', 'daemon events first frame missing daemon schema', daemonEvents.payload || {});
assert(daemonEvents.payload?.currentListen?.metricLane === 'nexusStreams', 'daemon events current listen missing unified Nexus lane', daemonEvents.payload?.currentListen || {});
assert(daemonEvents.frames[1].payload?.schema === 'skyemusicnexus.artist-brain-daemon.v1', 'daemon events heartbeat frame missing daemon schema', daemonEvents.frames[1].payload || {});
assert(daemonEvents.frames[1].payload?.streamImpact?.nexusStreams !== undefined, 'daemon events heartbeat frame missing stream impact', daemonEvents.frames[1].payload?.streamImpact || {});

const manualDaemon = (await call('POST', '/api/skymusicnexus/music-brain-daemon', {
  token: 'admin:music-owner@example.com',
  admin: true,
  body: {
    action: 'run-now',
    force: true,
    maxArtists: 1,
    cycleSlots: 10,
    source: 'daemon-smoke-api',
  },
})).payload;
assert(manualDaemon.ok === true, 'daemon run-now API failed', manualDaemon);
assert(manualDaemon.status?.schema === 'skyemusicnexus.artist-brain-daemon.v1', 'daemon run-now API missing live status', manualDaemon);
sameMix(manualDaemon.status?.policy?.allocation, 'daemon run-now API policy');
assert(manualDaemon.status?.currentListen?.title, 'daemon run-now status missing current listen title', manualDaemon.status?.currentListen || {});
assert(manualDaemon.status?.currentTrack?.title, 'daemon run-now status missing current track title', manualDaemon.status?.currentTrack || {});
assert((manualDaemon.status?.queue?.recentActions || []).length > 0, 'daemon run-now status missing recent action feed', manualDaemon.status?.queue || {});

const staleState = await env.SKYMUSICNEXUS_KV.get('skymusicnexus:v1:state', { type: 'json' });
assert(staleState?.brains?.daemon, 'daemon state missing before stalled alert proof', staleState?.brains || {});
const staleBase = Date.parse(checkedAt);
staleState.brains.daemon.lastTickAt = new Date(staleBase - 90 * 60000).toISOString();
staleState.brains.daemon.nextTickAt = new Date(staleBase - 80 * 60000).toISOString();
staleState.brains.daemon.policy = {
  ...(staleState.brains.daemon.policy || {}),
  enabled: true,
  cadenceMinutes: 5,
  alerts: { ...(staleState.brains.daemon.policy?.alerts || {}), stalledMinutes: 5, founderCommand: true, skyemail: true },
};
await env.SKYMUSICNEXUS_KV.put('skymusicnexus:v1:state', JSON.stringify(staleState));
const stalledDaemon = await runScheduledDaemon();
const stalledStatus = (await call('GET', '/api/skymusicnexus/music-brain-daemon?action=status', {
  token: 'admin:music-owner@example.com',
  admin: true,
})).payload;
const stalledAlerts = (stalledStatus.alerts || []).filter((alert) => alert.code === 'daemon_stalled');
assert(stalledAlerts.length >= 1, 'scheduled stale heartbeat did not create a daemon_stalled alert', stalledStatus.alerts || []);
assert((stalledStatus.ledger || []).some((entry) => entry.status === 'completed'), 'stalled recovery tick did not leave a completed daemon ledger entry', stalledStatus.ledger || []);

const acked = (await call('POST', '/api/skymusicnexus/music-brain-daemon', {
  token: 'admin:music-owner@example.com',
  admin: true,
  body: { action: 'ack-alerts', alertIds: stalledAlerts.map((alert) => alert.alertId || alert.id).filter(Boolean) },
})).payload;
assert((acked.alerts || []).some((alert) => alert.code === 'daemon_stalled' && alert.status === 'acked'), 'ack-alerts did not acknowledge stalled daemon alert', acked.alerts || []);

const brainHub = (await call('GET', `/api/skymusicnexus/music-brain?action=hub&artistId=${encodeURIComponent(artist.id)}`)).payload;
assert(brainHub.ok === true && brainHub.localOnly === true && brainHub.providerRequired === false, 'brain hub status shape changed', brainHub);
sameMix(brainHub.activityMix, 'brain hub');
assert(brainHub.summary?.systemListens > 0, 'brain hub missing system listens', brainHub.summary || {});
assert(brainHub.summary?.songDrafts > 0, 'brain hub missing song drafts', brainHub.summary || {});

const gamify = (await call('GET', `/api/skymusicnexus/music-gamify?action=hub&artistId=${encodeURIComponent(artist.id)}`)).payload;
const ledgerTypes = new Set((gamify.events || []).map((event) => event.activityType));
assert(ledgerTypes.has('nexus_stream_discovery'), 'activity ledger missing listen entry', { ledgerTypes: [...ledgerTypes] });
assert([...ledgerTypes].some((type) => ['feed_post', 'feed_comment', 'feed_like', 'feed_save', 'feed_boost'].includes(type)), 'activity ledger missing social entry', { ledgerTypes: [...ledgerTypes] });
assert(ledgerTypes.has('song_draft'), 'activity ledger missing create entry', { ledgerTypes: [...ledgerTypes] });
assert(ledgerTypes.has('connectlog_message'), 'activity ledger missing alert/Relay13 entry', { ledgerTypes: [...ledgerTypes] });

const traffic = (await call('GET', '/api/skymusicnexus/music-drops?action=traffic-summary', { token: null })).payload;
assert(traffic.ok === true, 'public traffic summary failed', traffic);
assertOnlyUnifiedStreamCounter(traffic.trafficSummary, 'public traffic summary');
assert(/one unified platform count/i.test(traffic.metricBoundary || ''), 'public traffic summary missing unified metric boundary', traffic);
for (const row of traffic.trafficSummary.topArtists || []) assertOnlyUnifiedStreamCounter(row, `public artist ${row.artistKey || row.artistId}`);
for (const row of traffic.trafficSummary.topTracks || []) assertOnlyUnifiedStreamCounter(row, `public track ${row.trackId}`);

const analytics = (await call('GET', '/api/skymusicnexus/music-analytics', {
  token: 'admin:music-owner@example.com',
  admin: true,
})).payload;
assertOnlyUnifiedStreamCounter(analytics.trafficSummary, 'gated analytics traffic summary');
assert(Number(analytics.nexusStreams || analytics.totalStreams || 0) >= Number(traffic.trafficSummary.nexusStreams || 0), 'analytics unified Nexus streams fell below public stream total', analytics);

const liveVisuals = (await call('GET', '/api/skymusicnexus/visuals', {
  token: 'admin:music-owner@example.com',
  admin: true,
})).payload.visuals;
assert(liveVisuals?.schema_version === 'skye.music.nexus.visuals.v1', 'live visuals schema changed', liveVisuals || {});
assert(liveVisuals.kpis.some((item) => Number(item.value || 0) > 0), 'live visuals have no nonzero KPI values', liveVisuals.kpis || []);
assert(liveVisuals.audit_events.length > 0, 'live visuals missing audit events after daemon/cycle', liveVisuals);

const fallbackPath = path.resolve(REPO_ROOT, 'metraiyux_0s_site', 'SkyeMusicNexus', 'data', 'nexus-visuals-demo.json');
const fallbackVisuals = JSON.parse(await readFile(fallbackPath, 'utf8'));
assertFallbackVisuals(fallbackVisuals);

const report = {
  ok: true,
  checkedAt,
  script: 'metraiyux_0s_site/tests/skyemusicnexus-artist-brain-daemon-smoke.mjs',
  artistId: artist.id,
  peerId: peer.id,
  daemon: {
    source: daemonStatus.daemon.source,
    cron: daemonStatus.daemon.cron,
    tickAt: daemonStatus.daemon.tickAt,
    profileCount: daemonStatus.daemon.profileCount,
    executedArtistCount: daemonStatus.daemon.executedArtistCount,
    activityMix: daemonStatus.daemon.activityMix,
    cycleCount: daemonStatus.daemon.cycles.length,
    apiRoute: daemonApiStatus.daemon.route,
    manualRunId: manualDaemon.run?.runId || '',
    stalledRecoveryTickAt: stalledDaemon.daemon.tickAt,
    stalledAlertAcked: true,
    eventStream: daemonEvents.frames.map((frame) => frame.event),
  },
  cycle: {
    cycleId: cycle.cycle.cycleId,
    actionTypes: [...actionTypes].sort(),
    receiptKinds: [...receiptKinds].sort(),
    receipts: cycle.receipts.length,
  },
  ledgerTypes: [...ledgerTypes].sort(),
  publicStreams: {
    nexusStreams: traffic.trafficSummary.nexusStreams,
    topArtists: traffic.trafficSummary.topArtists.length,
    topTracks: traffic.trafficSummary.topTracks.length,
    analyticsNexusStreams: analytics.nexusStreams || analytics.totalStreams,
  },
  visuals: {
    fallbackKpis: fallbackVisuals.kpis.length,
    fallbackRoutes: fallbackVisuals.route_health.length,
    liveKpis: liveVisuals.kpis.length,
    liveAuditEvents: liveVisuals.audit_events.length,
  },
  assertions: [
    'daemon scheduled status keeps ok/localOnly/providerRequired/profileCount/executedArtistCount/tickAt/source/cron/cycles shape',
    'artist brain policy remains 70 listen / 10 create / 20 social',
    'listen receipts use one unified public nexusStreams lane and never payout/duplicate stream counters',
    'run cycle creates listen, social, create, and Relay13 alert ledger activity',
    'fallback brain monitor visuals contain nonzero KPI/bar/route data',
    'public stream totals expose nexusStreams without duplicate human/radio/localBrain/system counters',
    'daemon events endpoint emits live SSE status frames for the operations monitor',
    'daemon pause/resume/update-policy/ack-alerts workflows persist',
    'scheduled stale heartbeat creates and recovers a daemon_stalled alert',
  ],
};

await mkdir(ARTIFACT_DIR, { recursive: true });
const reportPath = path.join(ARTIFACT_DIR, 'receipt.json');
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, report: reportPath, assertions: report.assertions }, null, 2));
