'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { requireSkyGate } = require('./_lib/skygate-auth');

const MUSIC_NEXUS_DIR =
  process.env.MUSIC_NEXUS_DATA_DIR || path.join(os.tmpdir(), 'skye-music-nexus');

function filePath(name) {
  return path.join(MUSIC_NEXUS_DIR, name);
}

function ensureFile(target, defaultValue) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, JSON.stringify(defaultValue, null, 2) + '\n', 'utf8');
  }
}

function loadJson(name, defaultValue) {
  const target = filePath(name);
  ensureFile(target, defaultValue);
  try {
    const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveJson(name, value) {
  const target = filePath(name);
  ensureFile(target, Array.isArray(value) ? [] : {});
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function loadExchange() {
  const exchange = loadJson('exchange.json', {});
  return {
    contentRequests: Array.isArray(exchange.contentRequests) ? exchange.contentRequests : [],
    threads: Array.isArray(exchange.threads) ? exchange.threads : [],
    communityPosts: Array.isArray(exchange.communityPosts) ? exchange.communityPosts : [],
    campaigns: Array.isArray(exchange.campaigns) ? exchange.campaigns : [],
  };
}

function saveExchange(exchange) {
  saveJson('exchange.json', {
    contentRequests: exchange.contentRequests || [],
    threads: exchange.threads || [],
    communityPosts: exchange.communityPosts || [],
    campaigns: exchange.campaigns || [],
  });
}

function loadArtists() {
  return loadJson('artists.json', []);
}

function loadReleases() {
  return loadJson('releases.json', []);
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function nowIso() {
  return new Date().toISOString();
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return null;
  }
}

function clean(value, fallback = '', limit = 1200) {
  const text = String(value == null ? fallback : value).trim();
  return text.slice(0, limit);
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => clean(item, '', 80)).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((item) => clean(item, '', 80))
    .filter(Boolean);
}

function findRelease(releases, releaseId) {
  return releases.find((release) => release.id === releaseId) || null;
}

function inferDeliverables(type) {
  const key = clean(type, 'release-content').toLowerCase();
  if (key.includes('cover') || key.includes('canvas')) return ['cover direction', 'canvas brief', 'asset proof checklist'];
  if (key.includes('short') || key.includes('clip')) return ['3 short-form hooks', 'caption set', 'shot list'];
  if (key.includes('press') || key.includes('epk')) return ['release bio', 'press angle', 'proof-safe one sheet'];
  if (key.includes('social')) return ['caption pack', 'hashtag lane', 'posting schedule'];
  if (key.includes('visual')) return ['visualizer brief', 'motion notes', 'thumbnail direction'];
  return ['release caption pack', 'creative brief', 'handoff checklist'];
}

function campaignPack({ releaseTitle, mood, platforms }) {
  const title = clean(releaseTitle, 'the release', 120) || 'the release';
  const tone = clean(mood, 'high-energy independent release', 120) || 'high-energy independent release';
  const channels = normalizeList(platforms).length ? normalizeList(platforms) : ['TikTok', 'Instagram Reels', 'YouTube Shorts'];
  return {
    captions: [
      `I built the first signal around "${title}" and I want listeners inside the world before release day.`,
      `"${title}" is not just a drop. It is the first proof point in the artist runway.`,
      `New release capsule moving through SkyeMusicNexus: "${title}" with a ${tone} pulse.`,
    ],
    shortFormHooks: [
      `The 7-second opening: show the sound, then show the release capsule.`,
      `Behind the record: one studio moment, one lyric line, one date.`,
      `Fan prompt: ask listeners where this track should land first.`,
    ],
    rolloutTasks: [
      'Lock title, date, credits, and distributor boundary.',
      `Cut one vertical teaser for ${channels[0] || 'short-form'}.`,
      'Post the community collab request and pin the best response.',
      'Queue the proof receipt after metadata review.',
      'Move the release into payout/ledger watch after first stream report.',
    ],
    assetRequests: [
      'Cover/canvas direction',
      'Caption pack',
      'Short-form clip brief',
      'Community collab prompt',
    ],
    platforms: channels,
  };
}

function relatedThreads(exchange, artistId) {
  return exchange.threads.filter((thread) => {
    if (!artistId) return true;
    return thread.artistId === artistId || thread.recipientId === artistId || thread.participants?.includes(artistId);
  });
}

function relatedRequests(exchange, artistId) {
  return exchange.contentRequests.filter((request) => !artistId || request.artistId === artistId);
}

function relatedPosts(exchange, artistId) {
  return exchange.communityPosts.filter((post) => !artistId || post.artistId === artistId || post.linkedArtistId === artistId);
}

function relatedCampaigns(exchange, artistId) {
  return exchange.campaigns.filter((campaign) => !artistId || campaign.artistId === artistId);
}

function computeProgress(artistId, exchange, artists, releases) {
  const artistRecords = artistId ? artists.filter((artist) => artist.id === artistId) : artists;
  const releaseRecords = artistId ? releases.filter((release) => release.artistId === artistId) : releases;
  const requests = relatedRequests(exchange, artistId);
  const posts = relatedPosts(exchange, artistId);
  const threads = relatedThreads(exchange, artistId);
  const campaigns = relatedCampaigns(exchange, artistId);

  const achievements = [
    {
      id: 'gate-session-lit',
      name: 'Gate Session Lit',
      points: 50,
      unlocked: true,
      detail: 'The artist lane is operating behind SkyGate.',
    },
    {
      id: 'artist-node-created',
      name: 'Artist Node Created',
      points: 100,
      unlocked: artistRecords.length > 0,
      detail: 'An artist profile exists in the SkyeMusicNexus field.',
    },
    {
      id: 'first-release-forged',
      name: 'First Release Forged',
      points: 150,
      unlocked: releaseRecords.length > 0,
      detail: 'A release capsule has been submitted.',
    },
    {
      id: 'content-request-opened',
      name: 'Content Request Opened',
      points: 120,
      unlocked: requests.length > 0,
      detail: 'The artist has asked the exchange for release content.',
    },
    {
      id: 'community-signal-posted',
      name: 'Community Signal Posted',
      points: 120,
      unlocked: posts.length > 0,
      detail: 'The artist has joined the community exchange.',
    },
    {
      id: 'inbox-thread-active',
      name: 'Inbox Thread Active',
      points: 90,
      unlocked: threads.some((thread) => Array.isArray(thread.messages) && thread.messages.length > 0),
      detail: 'A ConnectLog/Relay13-ready inbox thread has movement.',
    },
    {
      id: 'release-campaign-built',
      name: 'Release Campaign Built',
      points: 160,
      unlocked: campaigns.length > 0,
      detail: 'A release campaign pack has been generated.',
    },
    {
      id: 'launch-runway',
      name: 'Launch Runway',
      points: 220,
      unlocked: releaseRecords.length > 0 && requests.length > 0 && posts.length > 0 && campaigns.length > 0,
      detail: 'Release, content, community, and campaign tracks are all in motion.',
    },
  ];

  const points = achievements.reduce((sum, item) => sum + (item.unlocked ? item.points : 0), 0);
  const level = Math.max(1, Math.floor(points / 300) + 1);
  const nextLevelAt = level * 300;
  return {
    points,
    level,
    nextLevelAt,
    percentToNext: Math.min(100, Math.round((points / nextLevelAt) * 100)),
    achievements,
    counts: {
      artists: artistRecords.length,
      releases: releaseRecords.length,
      contentRequests: requests.length,
      communityPosts: posts.length,
      inboxThreads: threads.length,
      campaigns: campaigns.length,
    },
    missions: [
      {
        id: 'drop-day-one',
        name: 'Drop Day One',
        detail: 'Register an artist, forge one release, request content, and post one community signal.',
        complete: artistRecords.length > 0 && releaseRecords.length > 0 && requests.length > 0 && posts.length > 0,
      },
      {
        id: 'campaign-engine',
        name: 'Campaign Engine',
        detail: 'Build a release campaign pack and open an inbox thread for the handoff.',
        complete: campaigns.length > 0 && threads.length > 0,
      },
    ],
  };
}

function makeThread(exchange, payload) {
  const now = nowIso();
  const thread = {
    id: makeId('thread'),
    artistId: clean(payload.artistId, '', 120),
    recipientId: clean(payload.recipientId, 'creator-exchange', 120),
    topic: clean(payload.topic, 'Creator Exchange', 180),
    kind: clean(payload.kind, 'artist-inbox', 80),
    participants: [clean(payload.artistId, '', 120), clean(payload.recipientId, 'creator-exchange', 120)].filter(Boolean),
    relay: {
      source: 'connectlog-relay13-ready',
      status: 'local-thread-persisted',
      note: 'Thread is ready to bridge into the owned ConnectLog + Relay13 lane when live worker credentials are attached.',
    },
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  exchange.threads.unshift(thread);
  return thread;
}

function handleHub(params) {
  const artistId = clean(params.artistId, '', 120);
  const exchange = loadExchange();
  const artists = loadArtists();
  const releases = loadReleases();
  const progress = computeProgress(artistId, exchange, artists, releases);
  return respond(200, {
    ok: true,
    gateSessionRequired: true,
    artistId,
    progress,
    contentRequests: relatedRequests(exchange, artistId).slice(0, 50),
    threads: relatedThreads(exchange, artistId).slice(0, 50),
    communityPosts: relatedPosts(exchange, artistId).slice(0, 50),
    campaigns: relatedCampaigns(exchange, artistId).slice(0, 25),
    generatedAt: nowIso(),
  });
}

function handleRequestContent(payload) {
  const artistId = clean(payload.artistId, '', 120);
  const title = clean(payload.title, '', 180);
  const requestType = clean(payload.requestType, 'release-content', 120);
  if (!artistId || !title) {
    return respond(400, { ok: false, error: 'artistId and title are required' });
  }

  const exchange = loadExchange();
  const request = {
    id: makeId('content'),
    artistId,
    releaseId: clean(payload.releaseId, '', 120),
    title,
    requestType,
    brief: clean(payload.brief, '', 1600),
    budgetLane: clean(payload.budgetLane, 'Free99 Lite brief', 120),
    dueAt: clean(payload.dueAt, '', 80),
    status: 'open',
    deliverables: inferDeliverables(requestType),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const thread = makeThread(exchange, {
    artistId,
    recipientId: 'creator-exchange',
    topic: `Content request: ${title}`,
    kind: 'content-request',
  });
  thread.messages.push({
    id: makeId('msg'),
    fromArtistId: artistId,
    body: request.brief || `Request opened for ${requestType}`,
    status: 'sent',
    at: nowIso(),
  });
  request.threadId = thread.id;
  exchange.contentRequests.unshift(request);
  saveExchange(exchange);
  return respond(201, { ok: true, request, thread });
}

function handleSendMessage(payload) {
  const artistId = clean(payload.artistId, '', 120);
  const body = clean(payload.body, '', 1600);
  if (!artistId || !body) {
    return respond(400, { ok: false, error: 'artistId and body are required' });
  }

  const exchange = loadExchange();
  let thread = exchange.threads.find((item) => item.id === clean(payload.threadId, '', 120));
  if (!thread) {
    thread = makeThread(exchange, {
      artistId,
      recipientId: payload.recipientId,
      topic: payload.topic || 'Artist inbox',
      kind: payload.kind || 'artist-inbox',
    });
  }
  thread.messages = Array.isArray(thread.messages) ? thread.messages : [];
  thread.messages.push({
    id: makeId('msg'),
    fromArtistId: artistId,
    toArtistId: clean(payload.recipientId, thread.recipientId || 'creator-exchange', 120),
    body,
    status: 'sent',
    at: nowIso(),
  });
  thread.updatedAt = nowIso();
  saveExchange(exchange);
  return respond(201, { ok: true, thread, message: thread.messages[thread.messages.length - 1] });
}

function handlePublishCommunity(payload) {
  const artistId = clean(payload.artistId, '', 120);
  const body = clean(payload.body, '', 1600);
  if (!artistId || !body) {
    return respond(400, { ok: false, error: 'artistId and body are required' });
  }

  const exchange = loadExchange();
  const post = {
    id: makeId('post'),
    artistId,
    category: clean(payload.category, 'collab-request', 100),
    body,
    linkedReleaseId: clean(payload.linkedReleaseId, '', 120),
    status: 'open',
    reactions: { signal: 0, collab: 0, feedback: 0 },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  exchange.communityPosts.unshift(post);
  saveExchange(exchange);
  return respond(201, { ok: true, post });
}

function handleBuildCampaign(payload) {
  const artistId = clean(payload.artistId, '', 120);
  if (!artistId) {
    return respond(400, { ok: false, error: 'artistId is required' });
  }

  const releases = loadReleases();
  const release = findRelease(releases, clean(payload.releaseId, '', 120));
  const releaseTitle = release ? release.title : clean(payload.releaseTitle, 'Untitled Release', 180);
  const pack = campaignPack({
    releaseTitle,
    mood: payload.mood,
    platforms: payload.platforms,
  });
  const exchange = loadExchange();
  const campaign = {
    id: makeId('campaign'),
    artistId,
    releaseId: release ? release.id : clean(payload.releaseId, '', 120),
    releaseTitle,
    mood: clean(payload.mood, 'release momentum', 120),
    offerLane: clean(payload.offerLane, 'Free99 Lite brief', 120),
    status: 'drafted',
    contentPack: pack,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  exchange.campaigns.unshift(campaign);
  saveExchange(exchange);
  return respond(201, { ok: true, campaign });
}

module.exports.handler = async (event) => {
  try {
    const denied = requireSkyGate(event);
    if (denied) return denied;

    const method = (event.httpMethod || 'GET').toUpperCase();
    const params = event.queryStringParameters || {};

    if (method === 'GET') {
      const action = clean(params.action, 'hub', 80);
      if (action === 'hub') return handleHub(params);
      return respond(400, { ok: false, error: `Unknown GET action: ${action}` });
    }

    if (method === 'POST') {
      const payload = parseBody(event);
      if (payload === null) return respond(400, { ok: false, error: 'Invalid JSON body' });
      const action = clean(payload.action || params.action, '', 80);
      if (action === 'request-content') return handleRequestContent(payload);
      if (action === 'send-message') return handleSendMessage(payload);
      if (action === 'publish-community') return handlePublishCommunity(payload);
      if (action === 'build-release-campaign') return handleBuildCampaign(payload);
      return respond(400, { ok: false, error: `Unknown POST action: ${action}` });
    }

    return respond(405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    return respond(500, { ok: false, error: err.message || 'Internal server error' });
  }
};
