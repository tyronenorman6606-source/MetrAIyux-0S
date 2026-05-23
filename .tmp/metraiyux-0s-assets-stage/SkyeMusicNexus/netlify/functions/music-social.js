'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { requireSkyGate } = require('./_lib/skygate-auth');

const MUSIC_NEXUS_DIR =
  process.env.MUSIC_NEXUS_DATA_DIR || path.join(os.tmpdir(), 'skye-music-nexus');
const SOCIAL_FILE = 'social-spine.json';
const DEFAULT_VISIBILITY = 'unlisted';
const MAX_STATUS_CHARS = 950;

const PLATFORM_CATALOG = [
  {
    id: 'pixelfed',
    name: 'Pixelfed',
    lane: 'instagram-like-photo-feed',
    protocol: 'ActivityPub plus Mastodon-compatible REST posting',
    license: 'AGPL-3.0',
    source: 'https://github.com/pixelfed/pixelfed',
    bestFor: ['cover reveals', 'photo/video drop teasers', 'release story rail', 'federated artist profile'],
    requiredScopes: ['read', 'write:statuses', 'write:media'],
    productionBoundary: 'Connect a self-hosted or trusted Pixelfed instance token through an environment variable.',
  },
  {
    id: 'mastodon',
    name: 'Mastodon-compatible Fediverse',
    lane: 'status-feed-and-hashtag-discovery',
    protocol: 'OAuth2 + REST API + ActivityPub federation',
    license: 'AGPL-3.0 family',
    source: 'https://docs.joinmastodon.org/',
    bestFor: ['release notes', 'fan updates', 'hashtag listening', 'cross-instance social proof'],
    requiredScopes: ['read:statuses', 'write:statuses', 'write:media'],
    productionBoundary: 'Use OAuth application tokens stored in server env, never in the browser bundle.',
  },
  {
    id: 'funkwhale',
    name: 'Funkwhale',
    lane: 'federated-audio-publication',
    protocol: 'ActivityPub audio federation + Funkwhale API',
    license: 'AGPL-3.0 family',
    source: 'https://docs.funkwhale.audio/',
    bestFor: ['self-hosted listening pod', 'artist catalog federation', 'pod-to-pod music discovery'],
    requiredScopes: ['read', 'write'],
    productionBoundary: 'Use as the music-native publication pod after rights and storage gates are live.',
  },
  {
    id: 'activitypub',
    name: 'ActivityPub Actor Bridge',
    lane: 'protocol-native-federation-contract',
    protocol: 'W3C ActivityPub inbox/outbox contract',
    license: 'W3C Recommendation',
    source: 'https://www.w3.org/TR/activitypub/',
    bestFor: ['future native actor', 'inbox/outbox proof', 'federated follow graph'],
    requiredScopes: ['server-side signing material'],
    productionBoundary: 'Native server-to-server federation still needs HTTP signatures, actor documents, WebFinger, moderation, and abuse controls.',
  },
];

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

function loadArtists() {
  return loadJson('artists.json', []);
}

function loadReleases() {
  return loadJson('releases.json', []);
}

function loadSocial() {
  const social = loadJson(SOCIAL_FILE, {});
  return {
    connectors: Array.isArray(social.connectors) ? social.connectors : [],
    postQueue: Array.isArray(social.postQueue) ? social.postQueue : [],
    feedPulls: Array.isArray(social.feedPulls) ? social.feedPulls : [],
    moderation: Array.isArray(social.moderation) ? social.moderation : [],
    feedActions: Array.isArray(social.feedActions) ? social.feedActions : [],
  };
}

function saveSocial(social) {
  saveJson(SOCIAL_FILE, {
    connectors: social.connectors || [],
    postQueue: social.postQueue || [],
    feedPulls: social.feedPulls || [],
    moderation: social.moderation || [],
    feedActions: social.feedActions || [],
  });
}

function loadExchange() {
  const exchange = loadJson('exchange.json', {});
  return {
    communityPosts: Array.isArray(exchange.communityPosts) ? exchange.communityPosts : [],
    contentRequests: Array.isArray(exchange.contentRequests) ? exchange.contentRequests : [],
  };
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
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
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

function clean(value, fallback = '', limit = 1000) {
  const text = String(value == null ? fallback : value).trim();
  return text.slice(0, limit);
}

function cleanEnvKey(value) {
  const key = clean(value, '', 120).toUpperCase().replace(/[^A-Z0-9_]/g, '');
  return key;
}

function normalizeList(value, limit = 24) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  return source.map((item) => clean(item, '', 80)).filter(Boolean).slice(0, limit);
}

function normalizeHashtags(value) {
  return normalizeList(value, 12)
    .map((tag) => tag.replace(/^#/, '').replace(/[^A-Za-z0-9_]/g, ''))
    .filter(Boolean);
}

function normalizeInstanceUrl(value) {
  const raw = clean(value, '', 300).replace(/\/+$/g, '');
  if (!raw) return '';
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('instanceUrl must be HTTP or HTTPS.');
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('Production social connectors must use HTTPS.');
  }
  return url.toString().replace(/\/+$/g, '');
}

function platformFor(id) {
  const key = clean(id, 'mastodon', 60).toLowerCase();
  return PLATFORM_CATALOG.find((item) => item.id === key) || PLATFORM_CATALOG[1];
}

function publicConnector(connector) {
  const writeTokenReady = Boolean(connector.tokenEnvKey && process.env[connector.tokenEnvKey]);
  const readTokenReady = Boolean(connector.readTokenEnvKey && process.env[connector.readTokenEnvKey]);
  return {
    id: connector.id,
    platform: connector.platform,
    platformName: platformFor(connector.platform).name,
    name: connector.name,
    instanceUrl: connector.instanceUrl,
    handle: connector.handle,
    defaultVisibility: connector.defaultVisibility || DEFAULT_VISIBILITY,
    tokenEnvKey: connector.tokenEnvKey || '',
    readTokenEnvKey: connector.readTokenEnvKey || '',
    writeTokenReady,
    readTokenReady,
    tokenStatus: writeTokenReady ? 'env-token-ready' : 'env-token-required',
    capabilities: connector.capabilities || [],
    status: connector.status || (writeTokenReady ? 'ready' : 'needs-token-env'),
    createdAt: connector.createdAt,
    updatedAt: connector.updatedAt,
  };
}

function tokenFor(connector, kind = 'write') {
  const key = kind === 'read' && connector.readTokenEnvKey ? connector.readTokenEnvKey : connector.tokenEnvKey;
  return key ? clean(process.env[key], '', 4000) : '';
}

function byId(list, id) {
  return list.find((item) => item.id === id) || null;
}

function artistSummary(artistId) {
  const artists = loadArtists();
  const artist = artists.find((item) => item.id === artistId) || null;
  if (!artist) return null;
  return {
    id: artist.id,
    name: artist.name || artist.stageName || artist.email || artist.id,
    genre: artist.genre || [],
    skyeId: artist.skyeId || artist.identityId || '',
  };
}

function releaseSummary(releaseId) {
  const releases = loadReleases();
  const release = releases.find((item) => item.id === releaseId) || null;
  if (!release) return null;
  return {
    id: release.id,
    artistId: release.artistId || '',
    title: release.title || 'Untitled Release',
    status: release.status || 'draft',
    distributionTargets: release.distributionTargets || [],
  };
}

function initials(value) {
  return clean(value, 'SMN', 80)
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SM';
}

function actionStats(targetId, actions) {
  const scoped = actions.filter((item) => item.targetId === targetId || item.postId === targetId);
  return {
    likes: scoped.filter((item) => item.action === 'like').length,
    saves: scoped.filter((item) => item.action === 'save').length,
    boosts: scoped.filter((item) => item.action === 'boost').length,
    follows: scoped.filter((item) => item.action === 'follow').length,
    comments: scoped.filter((item) => item.action === 'comment').map((item) => ({
      id: item.id,
      artistId: item.artistId || '',
      body: item.body || '',
      createdAt: item.createdAt,
    })).slice(0, 6),
  };
}

function feedMediaFor(item, index = 0) {
  if (item.mediaUrl) return { kind: 'image', url: item.mediaUrl, alt: item.altText || item.caption || item.title || 'MusicNexus feed media' };
  const palette = [
    ['#6be8d6', '#f2c766'],
    ['#ff6f91', '#a884ff'],
    ['#9ee870', '#6be8d6'],
    ['#f2c766', '#ff6f91'],
  ][index % 4];
  return {
    kind: 'generated-cover',
    gradient: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
    label: initials(item.title || item.releaseTitle || item.caption || item.artistId),
  };
}

function buildFeedItems(social, { artistId = '' } = {}) {
  const artists = loadArtists();
  const releases = loadReleases();
  const exchange = loadExchange();
  const actions = social.feedActions || [];
  const artistById = new Map(artists.map((artist) => [artist.id, artist]));
  const releaseById = new Map(releases.map((release) => [release.id, release]));

  const socialPosts = social.postQueue
    .filter((post) => !artistId || post.artistId === artistId)
    .map((post, index) => {
      const artist = post.artist || artistById.get(post.artistId) || {};
      const release = post.release || releaseById.get(post.releaseId) || {};
      return {
        id: post.id,
        type: 'release-post',
        source: post.platform || 'musicnexus',
        status: post.status || 'queued',
        artistId: post.artistId || '',
        releaseId: post.releaseId || '',
        author: artist.name || post.artistId || 'MusicNexus Artist',
        handle: artist.skyeId ? `skye:${artist.skyeId}` : (post.platform || 'local-feed'),
        avatar: initials(artist.name || post.artistId || 'SM'),
        title: release.title || post.releaseTitle || 'Release signal',
        caption: post.statusText || post.caption || '',
        hashtags: post.hashtags || [],
        media: feedMediaFor(post, index),
        stats: actionStats(post.id, actions),
        createdAt: post.createdAt,
        providerUrl: post.publication && post.publication.statusUrl ? post.publication.statusUrl : '',
      };
    });

  const communityItems = exchange.communityPosts
    .filter((post) => !artistId || post.artistId === artistId)
    .map((post, index) => {
      const artist = artistById.get(post.artistId) || {};
      const release = releaseById.get(post.linkedReleaseId) || {};
      return {
        id: post.id,
        type: 'community',
        source: 'creator-exchange',
        status: post.status || 'open',
        artistId: post.artistId || '',
        releaseId: post.linkedReleaseId || '',
        author: artist.name || post.artistId || 'Creator Exchange',
        handle: post.category || 'community',
        avatar: initials(artist.name || post.artistId || 'CE'),
        title: release.title || post.category || 'Community signal',
        caption: post.body || '',
        hashtags: [post.category].filter(Boolean),
        media: feedMediaFor({ title: post.category, caption: post.body }, index + 7),
        stats: actionStats(post.id, actions),
        createdAt: post.createdAt,
      };
    });

  const releaseItems = releases
    .filter((release) => !artistId || release.artistId === artistId)
    .slice(0, 12)
    .map((release, index) => {
      const artist = artistById.get(release.artistId) || {};
      return {
        id: `release_${release.id}`,
        type: 'release',
        source: 'release-forge',
        status: release.status || 'draft',
        artistId: release.artistId || '',
        releaseId: release.id,
        author: artist.name || release.artistId || 'Release Forge',
        handle: release.rights && release.rights.status ? release.rights.status : 'rights-watch',
        avatar: initials(artist.name || release.artistId || 'RF'),
        title: release.title || 'Untitled Release',
        caption: `Release capsule: ${release.type || 'single'} / ${release.status || 'draft'} / ${Array.isArray(release.distributionTargets) ? release.distributionTargets.join(', ') : 'distribution pending'}`,
        hashtags: ['release', release.type || 'single'],
        media: feedMediaFor({ title: release.title }, index + 13),
        stats: {
          ...actionStats(`release_${release.id}`, actions),
          plays: Number(release.analytics && (release.analytics.plays || release.analytics.streams) || 0),
        },
        createdAt: release.updatedAt || release.createdAt,
      };
    });

  const federatedItems = social.feedPulls.flatMap((pull) => (pull.statuses || []).map((status, index) => ({
    id: `fed_${pull.id}_${status.id || index}`,
    type: 'fediverse',
    source: pull.platform || 'fediverse',
    status: status.visibility || 'public',
    artistId: pull.artistId || '',
    author: status.account && (status.account.displayName || status.account.acct) ? (status.account.displayName || status.account.acct) : 'Fediverse',
    handle: status.account && status.account.acct ? `@${status.account.acct}` : pull.hashtag || 'federated',
    avatar: initials(status.account && (status.account.displayName || status.account.acct) || 'FD'),
    title: pull.hashtag ? `#${pull.hashtag}` : 'Federated status',
    caption: status.contentHtml || status.url || '',
    hashtags: [pull.hashtag].filter(Boolean),
    media: status.media && status.media[0] ? { kind: 'image', url: status.media[0].url, alt: status.media[0].description || 'Federated media' } : feedMediaFor({ title: pull.hashtag || 'Fediverse' }, index + 21),
    stats: {
      ...actionStats(`fed_${pull.id}_${status.id || index}`, actions),
      boosts: Number(status.boosts || 0),
      likes: Number(status.favourites || 0),
      commentsCount: Number(status.replies || 0),
    },
    createdAt: status.createdAt || pull.createdAt,
    providerUrl: status.url || '',
  })));

  const items = [...socialPosts, ...communityItems, ...releaseItems, ...federatedItems]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return items.slice(0, 80);
}

function feedStories(feedItems) {
  const seen = new Set();
  return feedItems
    .filter((item) => {
      const key = item.artistId || item.author;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12)
    .map((item) => ({
      id: `story_${item.id}`,
      artistId: item.artistId,
      label: item.author,
      sublabel: item.type,
      avatar: item.avatar,
      releaseId: item.releaseId || '',
    }));
}

function composeStatus(payload, artist, release) {
  const caption = clean(payload.caption, '', MAX_STATUS_CHARS);
  const hashtags = normalizeHashtags(payload.hashtags);
  const tagLine = hashtags.length ? `\n\n${hashtags.map((tag) => `#${tag}`).join(' ')}` : '';
  const releaseLine = release && release.title ? `\n\nRelease: ${release.title}` : '';
  const artistLine = artist && artist.name ? `\nArtist: ${artist.name}` : '';
  return clean(`${caption}${releaseLine}${artistLine}${tagLine}`, '', MAX_STATUS_CHARS);
}

async function readProviderJson(response, fallback) {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 600) };
  }
  if (!response.ok) {
    const error = new Error(data.error || data.error_description || data.message || fallback || `Provider returned ${response.status}`);
    error.statusCode = response.status;
    error.provider = data;
    throw error;
  }
  return data;
}

async function uploadRemoteMedia(connector, post, token) {
  const mediaUrl = clean(post.mediaUrl, '', 1200);
  if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) return [];
  const source = await fetch(mediaUrl);
  if (!source.ok) throw new Error(`Media fetch failed with ${source.status}`);
  const blob = await source.blob();
  const form = new FormData();
  const name = clean(path.basename(new URL(mediaUrl).pathname), 'music-nexus-media.bin', 160) || 'music-nexus-media.bin';
  form.append('file', blob, name);
  if (post.altText) form.append('description', clean(post.altText, '', 1200));
  const response = await fetch(`${connector.instanceUrl}/api/v2/media`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  const media = await readProviderJson(response, 'Media upload failed.');
  return media && media.id ? [media.id] : [];
}

async function publishMastodonCompatible(connector, post) {
  const token = tokenFor(connector, 'write');
  if (!token) {
    return {
      ok: false,
      providerTokenRequired: true,
      tokenEnvKey: connector.tokenEnvKey || '',
      mode: 'local-proof',
      note: 'Set the connector token env var to publish through the provider API.',
    };
  }

  const mediaIds = await uploadRemoteMedia(connector, post, token);
  const params = new URLSearchParams();
  params.set('status', clean(post.statusText || post.caption, '', MAX_STATUS_CHARS));
  params.set('visibility', clean(post.visibility, connector.defaultVisibility || DEFAULT_VISIBILITY, 40));
  if (post.language) params.set('language', clean(post.language, 'en', 20));
  mediaIds.forEach((id) => params.append('media_ids[]', id));

  const response = await fetch(`${connector.instanceUrl}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/x-www-form-urlencoded',
      'idempotency-key': post.id,
    },
    body: params,
  });
  const status = await readProviderJson(response, 'Status publish failed.');
  return {
    ok: true,
    provider: connector.platform,
    statusId: status.id || '',
    statusUrl: status.url || status.uri || '',
    mediaIds,
    rawVisibility: status.visibility || '',
  };
}

async function syncMastodonCompatibleFeed(connector, payload) {
  const limit = Math.min(20, Math.max(1, Number(payload.limit || 8)));
  const hashtag = normalizeHashtags(payload.hashtag || payload.hashtags || '')[0];
  const token = tokenFor(connector, 'read');
  const url = hashtag
    ? `${connector.instanceUrl}/api/v1/timelines/tag/${encodeURIComponent(hashtag)}?limit=${limit}`
    : `${connector.instanceUrl}/api/v1/timelines/public?limit=${limit}&local=true`;
  const response = await fetch(url, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  const statuses = await readProviderJson(response, 'Feed sync failed.');
  return {
    sourceUrl: url,
    statuses: Array.isArray(statuses) ? statuses.map((status) => ({
      id: status.id || '',
      url: status.url || status.uri || '',
      account: status.account ? {
        id: status.account.id || '',
        acct: status.account.acct || status.account.username || '',
        displayName: status.account.display_name || status.account.username || '',
        avatar: status.account.avatar || '',
      } : null,
      createdAt: status.created_at || '',
      contentHtml: status.content || '',
      visibility: status.visibility || '',
      replies: status.replies_count || 0,
      boosts: status.reblogs_count || 0,
      favourites: status.favourites_count || 0,
      media: Array.isArray(status.media_attachments) ? status.media_attachments.map((item) => ({
        id: item.id || '',
        type: item.type || '',
        url: item.url || item.preview_url || '',
        description: item.description || '',
      })) : [],
    })) : [],
  };
}

function handleHub(params) {
  const artistId = clean(params.artistId, '', 120);
  const social = loadSocial();
  const posts = social.postQueue.filter((post) => !artistId || post.artistId === artistId);
  const feedItems = buildFeedItems(social, { artistId });
  return respond(200, {
    ok: true,
    gateSessionRequired: true,
    catalog: PLATFORM_CATALOG,
    connectors: social.connectors.map(publicConnector),
    postQueue: posts.slice(0, 80),
    feedItems,
    stories: feedStories(feedItems),
    feedPulls: social.feedPulls.filter((pull) => !artistId || pull.artistId === artistId).slice(0, 20),
    moderation: social.moderation.filter((item) => !artistId || item.artistId === artistId).slice(0, 20),
    summary: {
      connectors: social.connectors.length,
      readyConnectors: social.connectors.filter((connector) => Boolean(connector.tokenEnvKey && process.env[connector.tokenEnvKey])).length,
      feedItems: feedItems.length,
      queuedPosts: posts.filter((post) => post.status === 'queued').length,
      publishedPosts: posts.filter((post) => post.status === 'published').length,
      providerTokenRequired: posts.filter((post) => post.status === 'provider-token-required').length,
    },
    generatedAt: nowIso(),
  });
}

function handleCreateFeedPost(payload) {
  const artistId = clean(payload.artistId, '', 120);
  const caption = clean(payload.caption, '', MAX_STATUS_CHARS);
  if (!artistId || !caption) return respond(400, { ok: false, error: 'artistId and caption are required.' });
  const artist = artistSummary(artistId);
  const release = releaseSummary(clean(payload.releaseId, '', 120));
  const social = loadSocial();
  const post = {
    id: makeId('feed_post'),
    connectorId: 'musicnexus-local-feed',
    platform: 'musicnexus',
    artistId,
    releaseId: release ? release.id : clean(payload.releaseId, '', 120),
    caption,
    statusText: composeStatus(payload, artist, release),
    hashtags: normalizeHashtags(payload.hashtags),
    mediaUrl: clean(payload.mediaUrl, '', 1200),
    altText: clean(payload.altText, '', 1200),
    visibility: clean(payload.visibility, 'local-feed', 40),
    language: clean(payload.language, 'en', 20),
    status: 'local-published',
    moderationState: 'visible',
    artist,
    release,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  social.postQueue.unshift(post);
  saveSocial(social);
  return respond(201, { ok: true, post, feedItems: buildFeedItems(social, { artistId }) });
}

function handleSaveConnector(payload) {
  const platform = platformFor(payload.platform);
  const instanceUrl = normalizeInstanceUrl(payload.instanceUrl);
  const social = loadSocial();
  const id = clean(payload.id, '', 120) || makeId(platform.id);
  const existing = byId(social.connectors, id);
  const connector = {
    id,
    platform: platform.id,
    name: clean(payload.name, `${platform.name} Connector`, 160),
    instanceUrl,
    handle: clean(payload.handle, '', 160),
    tokenEnvKey: cleanEnvKey(payload.tokenEnvKey),
    readTokenEnvKey: cleanEnvKey(payload.readTokenEnvKey),
    defaultVisibility: clean(payload.defaultVisibility, DEFAULT_VISIBILITY, 40),
    capabilities: platform.bestFor,
    status: 'needs-token-env',
    createdAt: existing ? existing.createdAt : nowIso(),
    updatedAt: nowIso(),
  };
  connector.status = connector.tokenEnvKey && process.env[connector.tokenEnvKey] ? 'ready' : 'needs-token-env';
  const index = social.connectors.findIndex((item) => item.id === id);
  if (index >= 0) social.connectors[index] = connector;
  else social.connectors.unshift(connector);
  saveSocial(social);
  return respond(existing ? 200 : 201, {
    ok: true,
    connector: publicConnector(connector),
    secretPolicy: 'No provider token was stored. Set the named env var on the server/runtime.',
  });
}

function handleQueuePost(payload) {
  const social = loadSocial();
  const connector = byId(social.connectors, clean(payload.connectorId, '', 120));
  if (!connector) return respond(404, { ok: false, error: 'Connector not found.' });
  const artistId = clean(payload.artistId, '', 120);
  const caption = clean(payload.caption, '', MAX_STATUS_CHARS);
  if (!artistId || !caption) return respond(400, { ok: false, error: 'artistId and caption are required.' });

  const artist = artistSummary(artistId);
  const release = releaseSummary(clean(payload.releaseId, '', 120));
  const statusText = composeStatus(payload, artist, release);
  const post = {
    id: makeId('social_post'),
    connectorId: connector.id,
    platform: connector.platform,
    artistId,
    releaseId: release ? release.id : clean(payload.releaseId, '', 120),
    caption,
    statusText,
    hashtags: normalizeHashtags(payload.hashtags),
    mediaUrl: clean(payload.mediaUrl, '', 1200),
    altText: clean(payload.altText, '', 1200),
    visibility: clean(payload.visibility, connector.defaultVisibility || DEFAULT_VISIBILITY, 40),
    language: clean(payload.language, 'en', 20),
    status: 'queued',
    moderationState: 'operator-review-ready',
    activityPreview: {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Create',
      object: {
        type: postObjectType(connector.platform, payload.mediaUrl),
        attributedTo: connector.handle || artistId,
        content: statusText,
      },
    },
    artist,
    release,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  social.postQueue.unshift(post);
  saveSocial(social);
  return respond(201, { ok: true, post });
}

function postObjectType(platform, mediaUrl) {
  if (platform === 'funkwhale') return 'Audio';
  if (mediaUrl) return 'Image';
  return 'Note';
}

async function handlePublishPost(payload) {
  const social = loadSocial();
  const post = byId(social.postQueue, clean(payload.postId, '', 120));
  if (!post) return respond(404, { ok: false, error: 'Queued post not found.' });
  const connector = byId(social.connectors, post.connectorId);
  if (!connector) return respond(404, { ok: false, error: 'Connector for post not found.' });

  let publication;
  if (['pixelfed', 'mastodon'].includes(connector.platform)) {
    publication = await publishMastodonCompatible(connector, post);
  } else {
    publication = {
      ok: false,
      providerTokenRequired: true,
      mode: 'integration-contract',
      note: `${platformFor(connector.platform).name} publishing is staged as an ActivityPub/provider contract until native provider credentials and API mapping are configured.`,
    };
  }

  post.updatedAt = nowIso();
  post.publication = publication;
  if (publication.ok) {
    post.status = 'published';
    post.publishedAt = nowIso();
  } else if (publication.providerTokenRequired) {
    post.status = 'provider-token-required';
  } else {
    post.status = 'provider-error';
  }
  saveSocial(social);
  return respond(publication.ok ? 200 : 202, { ok: true, post, publication });
}

async function handleSyncFeed(payload) {
  const social = loadSocial();
  const connector = byId(social.connectors, clean(payload.connectorId, '', 120));
  if (!connector) return respond(404, { ok: false, error: 'Connector not found.' });

  let feed;
  if (['pixelfed', 'mastodon'].includes(connector.platform)) {
    feed = await syncMastodonCompatibleFeed(connector, payload);
  } else {
    feed = {
      sourceUrl: connector.instanceUrl,
      statuses: [],
      note: `${platformFor(connector.platform).name} feed sync requires its native API bridge.`,
    };
  }

  const pull = {
    id: makeId('feed_pull'),
    connectorId: connector.id,
    platform: connector.platform,
    artistId: clean(payload.artistId, '', 120),
    hashtag: normalizeHashtags(payload.hashtag || payload.hashtags || '')[0] || '',
    sourceUrl: feed.sourceUrl || connector.instanceUrl,
    statuses: feed.statuses || [],
    statusCount: (feed.statuses || []).length,
    createdAt: nowIso(),
  };
  social.feedPulls.unshift(pull);
  saveSocial(social);
  return respond(200, { ok: true, pull, statuses: pull.statuses, note: feed.note || '' });
}

function handleModeration(payload) {
  const social = loadSocial();
  const record = {
    id: makeId('mod'),
    artistId: clean(payload.artistId, '', 120),
    postId: clean(payload.postId, '', 120),
    decision: clean(payload.decision, 'needs-review', 80),
    reason: clean(payload.reason, '', 800),
    createdAt: nowIso(),
  };
  social.moderation.unshift(record);
  const post = byId(social.postQueue, record.postId);
  if (post) {
    post.moderationState = record.decision;
    post.updatedAt = nowIso();
  }
  saveSocial(social);
  return respond(201, { ok: true, moderation: record, post });
}

function handleFeedAction(payload) {
  const action = clean(payload.feedAction || payload.kind || payload.actionType, '', 40).toLowerCase();
  const allowed = new Set(['like', 'save', 'boost', 'follow', 'comment']);
  if (!allowed.has(action)) return respond(400, { ok: false, error: 'Unsupported feed action.' });
  const targetId = clean(payload.targetId || payload.postId, '', 160);
  if (!targetId) return respond(400, { ok: false, error: 'targetId is required.' });
  if (action === 'comment' && !clean(payload.body, '', 800)) return respond(400, { ok: false, error: 'Comment body is required.' });

  const social = loadSocial();
  const record = {
    id: makeId(action),
    targetId,
    postId: targetId,
    action,
    artistId: clean(payload.artistId, '', 120),
    body: clean(payload.body, '', 800),
    createdAt: nowIso(),
  };
  social.feedActions.unshift(record);
  saveSocial(social);
  return respond(201, {
    ok: true,
    action: record,
    stats: actionStats(targetId, social.feedActions),
    feedItems: buildFeedItems(social, { artistId: clean(payload.artistId, '', 120) }),
  });
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
      if (action === 'catalog') return respond(200, { ok: true, catalog: PLATFORM_CATALOG });
      if (action === 'feed') {
        const social = loadSocial();
        const feedItems = buildFeedItems(social, { artistId: clean(params.artistId, '', 120) });
        return respond(200, { ok: true, feedItems, stories: feedStories(feedItems), generatedAt: nowIso() });
      }
      return respond(400, { ok: false, error: `Unknown GET action: ${action}` });
    }

    if (method === 'POST') {
      const payload = parseBody(event);
      if (payload === null) return respond(400, { ok: false, error: 'Invalid JSON body.' });
      const action = clean(payload.action || params.action, '', 80);
      if (action === 'create-feed-post') return handleCreateFeedPost(payload);
      if (action === 'save-connector') return handleSaveConnector(payload);
      if (action === 'queue-post') return handleQueuePost(payload);
      if (action === 'publish-post') return handlePublishPost(payload);
      if (action === 'sync-feed') return handleSyncFeed(payload);
      if (action === 'moderate-post') return handleModeration(payload);
      if (action === 'feed-action') return handleFeedAction(payload);
      return respond(400, { ok: false, error: `Unknown POST action: ${action}` });
    }

    return respond(405, { ok: false, error: 'Method not allowed.' });
  } catch (err) {
    return respond(err.statusCode || 500, {
      ok: false,
      error: err.message || 'Internal server error.',
      provider: err.provider || undefined,
    });
  }
};
