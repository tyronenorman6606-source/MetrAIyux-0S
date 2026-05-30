'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { requireSkyGate } = require('./_lib/skygate-auth');

const MUSIC_NEXUS_DIR = process.env.MUSIC_NEXUS_DATA_DIR || path.join(os.tmpdir(), 'skye-music-nexus');
const BRAIN_FILE = 'artist-brains.json';

function filePath(name) {
  return path.join(MUSIC_NEXUS_DIR, name);
}

function ensureFile(target, defaultValue) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) fs.writeFileSync(target, JSON.stringify(defaultValue, null, 2) + '\n', 'utf8');
}

function loadJson(name, defaultValue) {
  const target = filePath(name);
  ensureFile(target, defaultValue);
  try {
    const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
    return parsed == null ? defaultValue : parsed;
  } catch {
    return defaultValue;
  }
}

function saveJson(name, value) {
  const target = filePath(name);
  ensureFile(target, Array.isArray(value) ? [] : {});
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function loadBrainState() {
  const state = loadJson(BRAIN_FILE, {});
  return {
    profiles: Array.isArray(state.profiles) ? state.profiles : [],
    memory: Array.isArray(state.memory) ? state.memory : [],
    actions: Array.isArray(state.actions) ? state.actions : [],
    cycles: Array.isArray(state.cycles) ? state.cycles : [],
    toolRuns: Array.isArray(state.toolRuns) ? state.toolRuns : [],
  };
}

function saveBrainState(state) {
  saveJson(BRAIN_FILE, {
    profiles: state.profiles || [],
    memory: state.memory || [],
    actions: state.actions || [],
    cycles: state.cycles || [],
    toolRuns: state.toolRuns || [],
  });
}

function loadSocial() {
  const social = loadJson('social-spine.json', {});
  return {
    connectors: Array.isArray(social.connectors) ? social.connectors : [],
    postQueue: Array.isArray(social.postQueue) ? social.postQueue : [],
    feedPulls: Array.isArray(social.feedPulls) ? social.feedPulls : [],
    moderation: Array.isArray(social.moderation) ? social.moderation : [],
    feedActions: Array.isArray(social.feedActions) ? social.feedActions : [],
  };
}

function saveSocial(social) {
  saveJson('social-spine.json', {
    connectors: social.connectors || [],
    postQueue: social.postQueue || [],
    feedPulls: social.feedPulls || [],
    moderation: social.moderation || [],
    feedActions: social.feedActions || [],
  });
}

function loadGamify() {
  const gamify = loadJson('gamify-spine.json', {});
  return {
    meters: Array.isArray(gamify.meters) ? gamify.meters : [],
    merits: Array.isArray(gamify.merits) ? gamify.merits : [],
    events: Array.isArray(gamify.events) ? gamify.events : [],
    giveaways: Array.isArray(gamify.giveaways) ? gamify.giveaways : [],
    entries: Array.isArray(gamify.entries) ? gamify.entries : [],
  };
}

function saveGamify(gamify) {
  saveJson('gamify-spine.json', {
    meters: gamify.meters || [],
    merits: gamify.merits || [],
    events: gamify.events || [],
    giveaways: gamify.giveaways || [],
    entries: gamify.entries || [],
  });
}

function loadCommerce() {
  const commerce = loadJson('commerce-spine.json', {});
  return {
    stores: Array.isArray(commerce.stores) ? commerce.stores : [],
    products: Array.isArray(commerce.products) ? commerce.products : [],
    orders: Array.isArray(commerce.orders) ? commerce.orders : [],
    fulfillments: Array.isArray(commerce.fulfillments) ? commerce.fulfillments : [],
  };
}

function loadArtists() {
  return loadJson('artists.json', []);
}

function loadReleases() {
  return loadJson('releases.json', []);
}

function saveReleases(releases) {
  saveJson('releases.json', Array.isArray(releases) ? releases : []);
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function clean(value, fallback = '', limit = 1000) {
  return String(value == null ? fallback : value).trim().slice(0, limit);
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

function normalizeList(value, limit = 16) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  return source.map((item) => clean(item, '', 120)).filter(Boolean).slice(0, limit);
}

function initials(value) {
  return clean(value, 'SM', 80)
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SM';
}

const SKYEMETER_THRESHOLD = 100;
function pointsFor(activityType, override) {
  const explicit = Number(override);
  if (Number.isFinite(explicit) && explicit > 0) return Math.min(500, Math.round(explicit));
  const key = clean(activityType || 'activity', 'activity', 80).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return {
    stream_other_artist: 18,
    stream_received: 4,
    feed_post: 14,
    feed_comment: 8,
    feed_like: 3,
    feed_save: 5,
    feed_boost: 7,
    engagement_received: 3,
    store_product: 20,
    store_order: 30,
    tool_asset: 22,
    brand_asset: 22,
    brain_cycle: 15,
  }[key] || 5;
}

function meterPercent(meter) {
  return Math.max(0, Math.min(100, Math.round((Number(meter.cyclePoints || 0) / SKYEMETER_THRESHOLD) * 100)));
}

function ensureMeter(gamify, artistId) {
  let meter = gamify.meters.find((item) => item.artistId === artistId);
  if (!meter) {
    meter = {
      meterId: makeId('skyemeter'),
      artistId,
      artistName: artistId,
      lifetimePoints: 0,
      cyclePoints: 0,
      level: 1,
      meritBalance: 0,
      meritCount: 0,
      nextMeritAt: SKYEMETER_THRESHOLD,
      status: 'active',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    gamify.meters.unshift(meter);
  }
  return meter;
}

function issueMerit(gamify, meter, source = {}) {
  const merit = {
    meritId: makeId('skye_merit'),
    artistId: meter.artistId,
    artistName: meter.artistName || meter.artistId,
    denomination: 1,
    reason: clean(source.reason || 'SkyeMeter filled', 'SkyeMeter filled', 220),
    sourceEventId: source.gamifyEventId || '',
    sourceType: source.activityType || 'skyemeter',
    status: 'issued',
    createdAt: nowIso(),
  };
  gamify.merits.unshift(merit);
  meter.meritBalance = Number(meter.meritBalance || 0) + merit.denomination;
  meter.meritCount = Number(meter.meritCount || 0) + 1;
  return merit;
}

function recordGamifyActivity(payload = {}) {
  const artistId = clean(payload.artistId, '', 120);
  if (!artistId) return null;
  const gamify = loadGamify();
  const activityType = clean(payload.activityType || payload.type || 'activity', 'activity', 100).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const meter = ensureMeter(gamify, artistId);
  const points = pointsFor(activityType, payload.points);
  const event = {
    gamifyEventId: makeId('skye_evt'),
    artistId,
    artistName: meter.artistName || artistId,
    activityType,
    points,
    releaseId: clean(payload.releaseId || '', '', 120),
    targetArtistId: clean(payload.targetArtistId || '', '', 120),
    postId: clean(payload.postId || payload.targetId || '', '', 120),
    source: clean(payload.source || 'music-brain', 'music-brain', 120),
    note: clean(payload.note || '', '', 500),
    createdAt: nowIso(),
  };
  event.id = event.gamifyEventId;
  meter.lifetimePoints = Number(meter.lifetimePoints || 0) + points;
  meter.cyclePoints = Number(meter.cyclePoints || 0) + points;
  meter.level = Math.max(1, Math.floor(Number(meter.lifetimePoints || 0) / 500) + 1);
  meter.updatedAt = event.createdAt;
  const merits = [];
  while (meter.cyclePoints >= SKYEMETER_THRESHOLD) {
    meter.cyclePoints -= SKYEMETER_THRESHOLD;
    merits.push(issueMerit(gamify, meter, { ...event, reason: `SkyeMeter filled by ${activityType.replace(/_/g, ' ')}` }));
  }
  event.meterPercent = meterPercent(meter);
  event.issuedMerits = merits.map((merit) => merit.meritId);
  gamify.events.unshift(event);
  gamify.events = gamify.events.slice(0, 1000);
  saveGamify(gamify);
  return { event, meter: { ...meter, percent: meterPercent(meter) }, merits };
}

function findArtist(artistId) {
  return loadArtists().find((artist) =>
    artist.id === artistId ||
    artist.artistId === artistId ||
    artist.skyeId === artistId ||
    artist.identityId === artistId
  ) || null;
}

function findProfile(state, artistId) {
  return state.profiles.find((profile) => profile.artistId === artistId || profile.brainId === artistId) || null;
}

function contextForArtist(artistId) {
  const artist = findArtist(artistId) || { id: artistId, name: artistId };
  const releases = loadReleases().filter((release) => release.artistId === artistId);
  const commerce = loadCommerce();
  const social = loadSocial();
  const brain = loadBrainState();
  return {
    artist,
    releases,
    store: commerce.stores.find((store) => store.artistId === artistId) || null,
    products: commerce.products.filter((product) => product.artistId === artistId),
    orders: commerce.orders.filter((order) => order.artistId === artistId),
    queuedPosts: social.postQueue.filter((post) => post.artistId === artistId),
    comments: social.feedActions.filter((action) => action.artistId === artistId && action.action === 'comment'),
    memory: brain.memory.filter((item) => item.artistId === artistId),
    toolRuns: brain.toolRuns.filter((item) => item.artistId === artistId),
  };
}

function latestProduct(ctx) {
  return ctx.products.find((item) => item.status === 'active') || ctx.products[0] || null;
}

function toolUrl(route, params = {}) {
  const query = Object.entries(params)
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return query ? `${route}${route.includes('?') ? '&' : '?'}${query}` : route;
}

function normalizeToolId(value) {
  const id = clean(value || 'brand_kit', 'brand_kit', 80).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const allowed = ['media_asset_pack', 'brand_kit', 'logo_brief', 'launch_offer', 'web_creator_landing', 'campaign_brief', 'press_kit', 'workforce_launch_package'];
  return allowed.includes(id) ? id : 'brand_kit';
}

function artistToolCatalog(profile = {}, ctx = {}) {
  const artistId = profile.artistId || ctx.artist?.id || '';
  const artistName = profile.artistName || ctx.artist?.name || artistId || 'MusicNexus artist';
  const release = latestRelease(ctx);
  const product = latestProduct(ctx);
  const base = {
    source: 'skymusicnexus',
    artistId,
    artistName,
    releaseId: release?.id || '',
    releaseTitle: release?.title || '',
    productId: product?.productId || product?.id || '',
  };
  return [
    { id: 'media_asset_pack', kind: 'media', label: 'SkyeMediaCenter asset pack', appId: 'skyemediacenter', appName: 'SkyeMediaCenter', route: '/SkyeMediaCenter/index.html', handoffUrl: toolUrl('/SkyeMediaCenter/index.html', base), value: 'Routes cover art, clips, visualizers, photos, and delivery files into the shared media center.', localOnly: true, providerRequired: false },
    { id: 'brand_kit', kind: 'brand', label: 'BrandID Offline PWA kit', appId: 'brandid-offline-pwa', appName: 'BrandID Offline PWA', route: '/Marketing-Made-Easy/BrandID-Offline-PWA/index.html', handoffUrl: toolUrl('/Marketing-Made-Easy/BrandID-Offline-PWA/index.html', base), value: 'Turns artist memory, releases, and store offers into a reusable offline brand kit.', localOnly: true, providerRequired: false },
    { id: 'logo_brief', kind: 'identity', label: 'kAIxUBrandKit logo brief', appId: 'kaixu-brand-kit', appName: 'kAIxUBrandKit', route: '/Marketing-Made-Easy/kAIxUBrandKit/index.html', handoffUrl: toolUrl('/Marketing-Made-Easy/kAIxUBrandKit/index.html', base), value: 'Creates a practical logo and visual identity brief the artist team can refine.', localOnly: true, providerRequired: false },
    { id: 'launch_offer', kind: 'offer', label: 'BusinessLaunchGo offer pack', appId: 'businesslaunchgo', appName: 'BusinessLaunchGo', route: '/Marketing-Made-Easy/BusinessLaunchGo/index.html', handoffUrl: toolUrl('/Marketing-Made-Easy/BusinessLaunchGo/index.html', base), value: 'Shapes the drop into a fan-facing offer with bundle copy and checkout CTA context.', localOnly: true, providerRequired: false },
    { id: 'web_creator_landing', kind: 'web', label: 'SkyeWebCreator landing plan', appId: 'skye-web-creator-max', appName: 'SkyeWebCreatorMax', route: '/Marketing-Made-Easy/SkyeWebCreatorMax/builder.html', handoffUrl: toolUrl('/Marketing-Made-Easy/SkyeWebCreatorMax/builder.html', base), value: 'Builds the launch-page skeleton from release, store, and artist memory.', localOnly: true, providerRequired: false },
    { id: 'campaign_brief', kind: 'campaign', label: 'BrandForge local campaign brief', appId: 'brandforge', appName: 'BrandForge Campaign Studio', route: '/Free99/apps/brandforge/brandforge_campaign_studio_v5_uploaded_intro_silent.html', apiRoute: '/api/brandforge/intelligence/brief', handoffUrl: toolUrl('/Free99/apps/brandforge/brandforge_campaign_studio_v5_uploaded_intro_silent.html', { ...base, skipIntro: 1 }), value: 'Uses the free local BrandForge intelligence lane before paid model generation.', localOnly: true, providerRequired: false },
    { id: 'press_kit', kind: 'docs', label: 'SkyeDocxMax press kit', appId: 'skyedocxmax', appName: 'SkyeDocxMax', route: '/Marketing-Made-Easy/SkyeDocxMax/editor.html', handoffUrl: toolUrl('/Marketing-Made-Easy/SkyeDocxMax/editor.html', base), value: 'Drafts a press kit for blogs, venues, and collabs.', localOnly: true, providerRequired: false },
    { id: 'workforce_launch_package', kind: 'workforce', label: 'RouteX launch package brief', appId: 'skyeroutex', appName: 'SkyeRouteXFlow Workforce Command', route: '/SkyeRouteX/workforce-command-v0.4.0/public/index.html', handoffUrl: toolUrl('/SkyeRouteX/workforce-command-v0.4.0/public/index.html', { ...base, sourceApp: 'skymusicnexus' }), value: 'Prepares a RouteX-ready content launch job for team approval and contractor proof.', localOnly: true, providerRequired: false },
  ];
}

function toolOutputs(toolId, profile, ctx, release = null, product = null) {
  const name = profile.artistName || ctx.artist?.name || profile.artistId || 'MusicNexus artist';
  const releaseTitle = release?.title || latestRelease(ctx)?.title || 'next release';
  const productTitle = product?.title || latestProduct(ctx)?.title || 'artist store offer';
  const shared = {
    artist: name,
    releaseTitle,
    storeOffer: productTitle,
    memorySignals: (ctx.memory || []).slice(0, 3).map((item) => item.text || item.title).filter(Boolean),
  };
  if (toolId === 'media_asset_pack') return { ...shared, outputType: 'media_asset_pack', assetNeeds: ['cover art', 'artist photo', 'vertical teaser', 'visualizer loop', 'store product image'], deliveryUse: ['drop page', 'feed story', 'artist app', 'press kit'] };
  if (toolId === 'logo_brief') return { ...shared, outputType: 'logo_brief', directions: ['avatar-safe symbol', 'cover-art corner mark', 'short-video watermark'], usageNotes: ['profile image', 'store product tag', 'merch mockup'] };
  if (toolId === 'launch_offer') return { ...shared, outputType: 'launch_offer', offerTitle: `${releaseTitle} launch bundle`, fanValue: ['early access', productTitle, 'behind-the-release notes'], checkoutCue: 'Route paid items through SkyePay intent and approved fulfillment.' };
  if (toolId === 'web_creator_landing') return { ...shared, outputType: 'web_creator_landing', sections: ['listen module', 'release story', 'artist store offer', 'fan action CTA', 'media strip'] };
  if (toolId === 'campaign_brief') return { ...shared, outputType: 'campaign_brief', postHooks: [`The first thing to catch in ${releaseTitle}.`, 'Here is the store path before the drop moves public.', 'The media and brand kit are attached before promo.'] };
  if (toolId === 'press_kit') return { ...shared, outputType: 'press_kit', oneSheetSections: ['artist bio', 'release notes', 'approved links', 'store/booking path', 'interview questions'] };
  if (toolId === 'workforce_launch_package') return { ...shared, outputType: 'workforce_launch_package', deliverables: ['short-form clips', 'landing page proof', 'feed proof', 'store CTA proof'], approvalRequired: true };
  return { ...shared, outputType: 'brand_kit', contentPillars: [`break down ${releaseTitle}`, `show the value behind ${productTitle}`, 'invite fan questions'], voiceRules: ['specific over vague', 'no fake metrics', 'point to a next action'] };
}

function toolPostCaption(profile, ctx, toolRun) {
  const name = profile.artistName || ctx.artist?.name || profile.artistId || 'MusicNexus artist';
  const releaseTitle = toolRun.releaseTitle || latestRelease(ctx)?.title || 'the next drop';
  return `${name} built a local ${toolRun.toolLabel} for ${releaseTitle}. It stays provider-free and opens a real handoff into ${toolRun.appName}: ${toolRun.handoffUrl}. Which piece should move first: media, brand, logo, offer, page, or launch clips?`;
}

function existingToolRun(state, artistId, toolId, releaseId = '', productId = '') {
  return (state.toolRuns || []).find((item) => item.artistId === artistId && item.toolId === toolId && (!releaseId || item.releaseId === releaseId) && (!productId || item.productId === productId)) || null;
}

function buildToolRun(state, profile, payload = {}) {
  const artistId = clean(payload.artistId || profile.artistId, '', 120);
  if (!artistId) return null;
  const ctx = contextForArtist(artistId);
  const toolId = normalizeToolId(payload.toolId);
  const catalog = artistToolCatalog(profile, ctx);
  const tool = catalog.find((item) => item.id === toolId) || catalog[0];
  const release = payload.releaseId ? ctx.releases.find((item) => item.id === payload.releaseId) : latestRelease(ctx);
  const product = payload.productId ? ctx.products.find((item) => (item.productId || item.id) === payload.productId) : latestProduct(ctx);
  const now = nowIso();
  const toolRunId = clean(payload.toolRunId || makeId('artist_tool_run'), '', 120);
  const toolRun = {
    toolRunId,
    id: toolRunId,
    artistId,
    brainId: profile.brainId || '',
    artistName: profile.artistName || ctx.artist.name || artistId,
    toolId: tool.id,
    toolLabel: tool.label,
    appId: tool.appId,
    appName: tool.appName,
    route: tool.route,
    apiRoute: tool.apiRoute || '',
    handoffUrl: tool.handoffUrl,
    releaseId: release?.id || clean(payload.releaseId || '', '', 120),
    releaseTitle: release?.title || clean(payload.releaseTitle || '', '', 180),
    productId: product?.productId || product?.id || clean(payload.productId || '', '', 120),
    status: 'ready_for_artist_review',
    providerRequired: false,
    localOnly: true,
    title: clean(payload.title || `${tool.label} for ${profile.artistName || artistId}`, '', 180),
    brief: clean(payload.brief || payload.body || tool.value, '', 1200),
    outputs: toolOutputs(tool.id, profile, ctx, release, product),
    createdAt: now,
    updatedAt: now,
  };
  toolRun.publishablePost = toolPostCaption(profile, ctx, toolRun);
  const index = state.toolRuns.findIndex((item) => item.toolRunId === toolRun.toolRunId);
  if (index >= 0) state.toolRuns[index] = toolRun;
  else state.toolRuns.unshift(toolRun);
  state.toolRuns = state.toolRuns.slice(0, 500);
  const memory = {
    memoryId: makeId('mem'),
    artistId,
    title: `Tool run: ${tool.label}`,
    text: `${toolRun.title}. ${toolRun.brief} Handoff: ${toolRun.handoffUrl}`,
    tags: ['tool-run', tool.id],
    source: 'artist-tool-run',
    toolRunId,
    createdAt: now,
  };
  state.memory.unshift(memory);
  state.memory = state.memory.slice(0, 500);
  recordGamifyActivity({ artistId, activityType: ['brand_kit', 'logo_brief'].includes(tool.id) ? 'brand_asset' : 'tool_asset', source: 'music-brain:tool-run', note: toolRun.title });
  return { toolRun, tool, memory };
}

function seedChunks(artistId, profile = {}) {
  const ctx = contextForArtist(artistId);
  const chunks = [];
  if (ctx.artist.name || ctx.artist.bio) {
    chunks.push({
      memoryId: makeId('mem'),
      artistId,
      title: 'Artist identity',
      text: `${ctx.artist.name || artistId}: ${ctx.artist.bio || 'Artist profile is live in MusicNexus.'}`,
      tags: ['identity', 'profile'],
      source: 'artist-record',
      createdAt: nowIso(),
    });
  }
  ctx.releases.slice(0, 5).forEach((release) => chunks.push({
    memoryId: makeId('mem'),
    artistId,
    title: `Release: ${release.title || release.id}`,
    text: `${release.title || release.id} is a ${release.type || 'release'} with status ${release.status || 'draft'} and rights ${release.rights?.status || 'needs-clearance'}.`,
    tags: ['release', release.status || 'draft'],
    source: 'release-record',
    releaseId: release.id,
    createdAt: nowIso(),
  }));
  ctx.products.slice(0, 5).forEach((product) => chunks.push({
    memoryId: makeId('mem'),
    artistId,
    title: `Store item: ${product.title}`,
    text: `${product.title} is available as ${product.productType || 'product'} for ${product.priceCents || 0} cents.`,
    tags: ['store', product.productType || 'product'],
    source: 'store-record',
    productId: product.productId || product.id,
    createdAt: nowIso(),
  }));
  if (profile.objectives && profile.objectives.length) {
    chunks.push({
      memoryId: makeId('mem'),
      artistId,
      title: 'Current objectives',
      text: profile.objectives.join(', '),
      tags: ['objective'],
      source: 'brain-profile',
      createdAt: nowIso(),
    });
  }
  return chunks;
}

function upsertProfile(state, payload) {
  const artistId = clean(payload.artistId, '', 120);
  if (!artistId) throw Object.assign(new Error('artistId is required.'), { statusCode: 400 });
  const existing = findProfile(state, artistId);
  const artist = findArtist(artistId);
  const profile = {
    brainId: existing?.brainId || makeId('artist_brain'),
    artistId,
    artistName: clean(payload.artistName || artist?.name || existing?.artistName || artistId, '', 180),
    status: clean(payload.status || existing?.status || 'active', 'active', 60),
    localOnly: true,
    providerRequired: false,
    autopilot: payload.autopilot === true || payload.autopilot === 'true',
    voice: {
      tone: clean(payload.tone || existing?.voice?.tone || 'direct, grateful, release-focused', '', 180),
      bannedClaims: normalizeList(payload.bannedClaims || existing?.voice?.bannedClaims || ['guaranteed streams', 'fake chart claims', 'rights claims not approved'], 12),
    },
    objectives: normalizeList(payload.objectives || existing?.objectives || ['post release updates', 'reply to fans', 'route fans to store', 'surface operator tasks'], 12),
    playbooks: existing?.playbooks || [
      { id: 'release-signal', trigger: 'live_or_recent_release', action: 'feed_post' },
      { id: 'store-spotlight', trigger: 'active_store_product', action: 'feed_post' },
      { id: 'fan-comment-reply', trigger: 'unanswered_comment', action: 'reply_comment' },
      { id: 'operator-task', trigger: 'missing_store_or_product', action: 'task' },
    ],
    updatedAt: nowIso(),
    createdAt: existing?.createdAt || nowIso(),
  };
  const index = state.profiles.findIndex((item) => item.brainId === profile.brainId || item.artistId === artistId);
  if (index >= 0) state.profiles[index] = profile;
  else state.profiles.unshift(profile);
  if (payload.seedMemory !== false) state.memory.unshift(...seedChunks(artistId, profile));
  state.memory = state.memory.slice(0, 500);
  return profile;
}

function latestRelease(ctx) {
  return ctx.releases
    .slice()
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))[0] || null;
}

function pickNetworkRelease(artistId) {
  return loadReleases()
    .filter((release) => release.id && release.artistId && release.artistId !== artistId)
    .filter((release) => !['blocked', 'rejected', 'takedown-review'].includes(release.status || ''))
    .sort((a, b) => {
      const liveScore = (b.status === 'live' ? 1 : 0) - (a.status === 'live' ? 1 : 0);
      if (liveScore) return liveScore;
      return String(b.publishedAt || b.updatedAt || b.createdAt || '').localeCompare(String(a.publishedAt || a.updatedAt || a.createdAt || ''));
    })[0] || null;
}

function buildCaption(profile, ctx, release) {
  const name = profile.artistName || ctx.artist.name || ctx.artist.id || 'MusicNexus artist';
  if (release) {
    const status = release.status === 'live' ? 'is live' : `is in ${release.status || 'release'} mode`;
    return `${name}: ${release.title || 'the new release'} ${status}. Tap in, save it, and watch the next drop path here in the Nexus.`;
  }
  const product = ctx.products.find((item) => item.status === 'active') || ctx.products[0];
  if (product) return `${name}: ${product.title} is open in the Nexus Store. Support the drop, grab access, or book the next move from the artist lane.`;
  return `${name}: the artist lane is active. Music, store, feed, and fan replies are moving from the Nexus.`;
}

function replyFor(profile, body) {
  const text = clean(body, '', 800).toLowerCase();
  const name = profile.artistName || 'the artist';
  if (text.includes('price') || text.includes('buy') || text.includes('shop') || text.includes('merch')) {
    return `${name} store link is in the Nexus lane. I appreciate you tapping in.`;
  }
  if (text.includes('song') || text.includes('release') || text.includes('drop')) {
    return `Appreciate you listening. The release path and next drop updates are staying live here.`;
  }
  if (text.includes('book') || text.includes('show') || text.includes('feature')) {
    return `Send the booking or collab details through the Nexus contact lane and we can route it clean.`;
  }
  return `Love for the signal. I see you, and the next update is coming through the Nexus.`;
}

function networkComment(profile, target = {}) {
  const name = profile.artistName || 'MusicNexus artist';
  const title = target.title || target.releaseTitle || 'this drop';
  return `${name} tapped in. ${title} has motion in the Nexus.`;
}

function planActions(profile, state) {
  const ctx = contextForArtist(profile.artistId);
  const plans = [];
  const release = latestRelease(ctx);
  const product = latestProduct(ctx);
  if (release) {
    plans.push({
      actionId: makeId('brain_action'),
      artistId: profile.artistId,
      brainId: profile.brainId,
      type: 'feed_post',
      status: 'planned',
      title: `Post release signal for ${release.title || release.id}`,
      caption: buildCaption(profile, ctx, release),
      releaseId: release.id || '',
      hashtags: ['musicnexus', 'newmusic', clean(release.type || 'release', 'release', 40)],
      createdAt: nowIso(),
    });
  }
  if (product) {
    plans.push({
      actionId: makeId('brain_action'),
      artistId: profile.artistId,
      brainId: profile.brainId,
      type: 'feed_post',
      status: 'planned',
      title: `Spotlight store item ${product.title}`,
      caption: buildCaption(profile, ctx, null),
      productId: product.productId || product.id,
      hashtags: ['artiststore', 'musicnexus'],
      createdAt: nowIso(),
    });
  }
  const catalog = artistToolCatalog(profile, ctx);
  const planTool = (toolId, title, body, options = {}) => {
    const normalized = normalizeToolId(toolId);
    const tool = catalog.find((item) => item.id === normalized);
    if (!tool) return;
    const releaseId = options.releaseId || release?.id || '';
    const productId = options.productId || product?.productId || product?.id || '';
    if (existingToolRun(state, profile.artistId, normalized, releaseId, productId)) return;
    plans.push({
      actionId: makeId('brain_action'),
      artistId: profile.artistId,
      brainId: profile.brainId,
      type: 'tool_asset',
      toolId: normalized,
      status: 'planned',
      title,
      body,
      releaseId,
      productId,
      handoffUrl: tool.handoffUrl,
      publishToFeed: options.publishToFeed !== false,
      createdAt: nowIso(),
    });
  };
  planTool('media_asset_pack', `Build media pack for ${profile.artistName || profile.artistId}`, 'Collect release visuals, cover art, clips, and delivery files in SkyeMediaCenter.', { releaseId: release?.id || '' });
  planTool('brand_kit', `Build BrandID kit for ${profile.artistName || profile.artistId}`, 'Create a local BrandID kit from artist memory, releases, store offers, and voice rules.', { productId: product?.productId || product?.id || '' });
  if (release) planTool('logo_brief', `Build kAIxUBrandKit brief for ${release.title || release.id}`, 'Create a logo direction for cover art, avatars, merch, and short-video watermarks.', { releaseId: release.id || '' });
  if (release || product) planTool('launch_offer', `Build BusinessLaunchGo offer for ${release?.title || product?.title || profile.artistId}`, 'Turn the release and store path into a clear fan offer and CTA.', { releaseId: release?.id || '', productId: product?.productId || product?.id || '' });
  const networkRelease = pickNetworkRelease(profile.artistId);
  if (networkRelease) {
    plans.push({
      actionId: makeId('brain_action'),
      artistId: profile.artistId,
      brainId: profile.brainId,
      type: 'listen_release',
      status: 'planned',
      title: `Stream ${networkRelease.title || networkRelease.id}`,
      releaseId: networkRelease.id,
      targetArtistId: networkRelease.artistId || '',
      listenSeconds: Math.max(24, Math.min(90, Number(networkRelease.tracks?.[0]?.duration || 45) || 45)),
      body: `Run a local Nexus listen on ${networkRelease.title || networkRelease.id}.`,
      createdAt: nowIso(),
    });
  }
  const social = loadSocial();
  const networkPost = social.postQueue.find((post) => post.id && post.artistId && post.artistId !== profile.artistId);
  if (networkPost) {
    plans.push({
      actionId: makeId('brain_action'),
      artistId: profile.artistId,
      brainId: profile.brainId,
      type: 'engage_post',
      status: 'planned',
      title: `Engage ${networkPost.title || 'network post'}`,
      targetId: networkPost.id,
      targetArtistId: networkPost.artistId || '',
      feedAction: 'comment',
      body: networkComment(profile, networkPost),
      createdAt: nowIso(),
    });
  }
  const latestComment = ctx.comments[0];
  if (latestComment) {
    plans.push({
      actionId: makeId('brain_action'),
      artistId: profile.artistId,
      brainId: profile.brainId,
      type: 'reply_comment',
      status: 'planned',
      title: 'Reply to fan comment',
      targetId: latestComment.targetId || latestComment.postId || '',
      body: replyFor(profile, latestComment.body || ''),
      createdAt: nowIso(),
    });
  }
  if (!ctx.store) {
    plans.push({
      actionId: makeId('brain_action'),
      artistId: profile.artistId,
      brainId: profile.brainId,
      type: 'task',
      status: 'planned',
      title: 'Create artist store',
      body: 'Open the Store room and create the artist store before public rollout.',
      createdAt: nowIso(),
    });
  } else if (!ctx.products.length) {
    plans.push({
      actionId: makeId('brain_action'),
      artistId: profile.artistId,
      brainId: profile.brainId,
      type: 'task',
      status: 'planned',
      title: 'Add first store product',
      body: 'Add a digital access, merch, tip, booking, or private access item.',
      createdAt: nowIso(),
    });
  }
  return plans;
}

function executeAction(action, profile, brainState = null) {
  const social = loadSocial();
  if (action.type === 'tool_asset') {
    const state = brainState || loadBrainState();
    const built = buildToolRun(state, profile, action);
    if (!built) return { ok: false, kind: 'tool_asset', error: 'tool_run_failed' };
    let post = null;
    if (action.publishToFeed !== false) {
      post = {
        id: makeId('feed_post'),
        connectorId: 'musicnexus-local-brain',
        platform: 'musicnexus',
        artistId: action.artistId,
        releaseId: built.toolRun.releaseId || '',
        productId: built.toolRun.productId || '',
        toolRunId: built.toolRun.toolRunId,
        caption: built.toolRun.publishablePost,
        statusText: built.toolRun.publishablePost,
        hashtags: ['musicnexus', 'artisttools', built.toolRun.toolId],
        visibility: 'local-feed',
        language: 'en',
        status: 'local-published',
        moderationState: 'visible',
        artist: { id: action.artistId, name: profile.artistName },
        release: built.toolRun.releaseId ? { id: built.toolRun.releaseId } : null,
        metadata: { appId: built.toolRun.appId, handoffUrl: built.toolRun.handoffUrl },
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      social.postQueue.unshift(post);
      saveSocial(social);
      recordGamifyActivity({ artistId: action.artistId, activityType: 'feed_post', releaseId: post.releaseId || '', postId: post.id, source: 'music-brain:tool-feed-post', note: built.toolRun.title });
    }
    if (!brainState) saveBrainState(state);
    return { ok: true, kind: 'tool_asset', toolRunId: built.toolRun.toolRunId, toolId: built.toolRun.toolId, appId: built.toolRun.appId, handoffUrl: built.toolRun.handoffUrl, postId: post?.id || '' };
  }
  if (action.type === 'feed_post') {
    const post = {
      id: makeId('feed_post'),
      connectorId: 'musicnexus-local-brain',
      platform: 'musicnexus',
      artistId: action.artistId,
      releaseId: action.releaseId || '',
      caption: action.caption || action.body || '',
      statusText: action.caption || action.body || '',
      hashtags: action.hashtags || [],
      mediaUrl: action.mediaUrl || '',
      visibility: 'local-feed',
      language: 'en',
      status: 'local-published',
      moderationState: 'visible',
      artist: { id: action.artistId, name: profile.artistName },
      release: action.releaseId ? { id: action.releaseId } : null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    social.postQueue.unshift(post);
    saveSocial(social);
    recordGamifyActivity({ artistId: action.artistId, activityType: 'feed_post', releaseId: action.releaseId || '', postId: post.id, source: 'music-brain:feed-post', note: action.title || 'Artist brain feed post' });
    return { ok: true, kind: 'feed_post', postId: post.id };
  }
  if (action.type === 'listen_release') {
    const releases = loadReleases();
    const release = releases.find((item) => item.id === action.releaseId);
    if (!release) return { ok: false, kind: 'listen_release', error: 'release_not_found' };
    const listenSeconds = Math.max(1, Number(action.listenSeconds || 30) || 30);
    const tracks = Array.isArray(release.tracks) ? release.tracks : [];
    const track = tracks[0] || { title: release.title || 'Track 1', plays: 0, listenSeconds: 0 };
    track.plays = Number(track.plays || 0) + 1;
    track.listenSeconds = Number(track.listenSeconds || 0) + listenSeconds;
    if (tracks.length) tracks[0] = track;
    else tracks.push(track);
    release.tracks = tracks;
    release.analytics = release.analytics || {};
    release.analytics.plays = Number(release.analytics.plays || 0) + 1;
    release.analytics.streams = Number(release.analytics.streams || 0) + 1;
    release.analytics.listenSeconds = Number(release.analytics.listenSeconds || 0) + listenSeconds;
    release.updatedAt = nowIso();
    saveReleases(releases);
    recordGamifyActivity({ artistId: action.artistId, activityType: 'stream_other_artist', releaseId: release.id, targetArtistId: release.artistId || action.targetArtistId || '', source: 'music-brain:listen-release', note: `Listened to ${release.title || release.id}` });
    if (release.artistId && release.artistId !== action.artistId) {
      recordGamifyActivity({ artistId: release.artistId, activityType: 'stream_received', releaseId: release.id, targetArtistId: action.artistId, source: 'music-brain:listen-release', note: `Local artist brain stream from ${profile.artistName || action.artistId}` });
    }
    return { ok: true, kind: 'listen_release', releaseId: release.id, targetArtistId: release.artistId || '', plays: release.analytics.plays, streams: release.analytics.streams };
  }
  if (action.type === 'engage_post') {
    const post = social.postQueue.find((item) => item.id === action.targetId) || social.postQueue[0];
    if (!post) return { ok: false, kind: 'engage_post', error: 'feed_post_not_found' };
    const feedAction = ['comment', 'like', 'save', 'boost'].includes(action.feedAction) ? action.feedAction : 'comment';
    const record = {
      id: makeId('feed_action'),
      targetId: post.id,
      postId: post.id,
      action: feedAction,
      artistId: action.artistId,
      targetArtistId: post.artistId || action.targetArtistId || '',
      body: feedAction === 'comment' ? (action.body || networkComment(profile, post)) : '',
      source: 'artist-local-brain',
      createdAt: nowIso(),
    };
    social.feedActions.unshift(record);
    saveSocial(social);
    recordGamifyActivity({ artistId: action.artistId, activityType: `feed_${feedAction}`, postId: post.id, releaseId: post.releaseId || '', targetArtistId: post.artistId || action.targetArtistId || '', source: 'music-brain:engage-post' });
    if (post.artistId && post.artistId !== action.artistId) {
      recordGamifyActivity({ artistId: post.artistId, activityType: 'engagement_received', postId: post.id, releaseId: post.releaseId || '', targetArtistId: action.artistId, source: 'music-brain:engage-post' });
    }
    return { ok: true, kind: 'engage_post', postId: post.id, feedAction };
  }
  if (action.type === 'reply_comment') {
    const record = {
      id: makeId('comment'),
      targetId: action.targetId,
      postId: action.targetId,
      action: 'comment',
      artistId: action.artistId,
      body: action.body || replyFor(profile, ''),
      createdAt: nowIso(),
      source: 'artist-local-brain',
    };
    social.feedActions.unshift(record);
    saveSocial(social);
    recordGamifyActivity({ artistId: action.artistId, activityType: 'feed_comment', postId: action.targetId || '', source: 'music-brain:reply-comment' });
    return { ok: true, kind: 'reply_comment', commentId: record.id };
  }
  return { ok: true, kind: 'task', note: action.body || action.title };
}

function handleHub(params) {
  const artistId = clean(params.artistId, '', 120);
  const state = loadBrainState();
  const profiles = state.profiles.filter((profile) => !artistId || profile.artistId === artistId);
  const memory = state.memory.filter((item) => !artistId || item.artistId === artistId);
  const actions = state.actions.filter((item) => !artistId || item.artistId === artistId);
  const cycles = state.cycles.filter((item) => !artistId || item.artistId === artistId);
  const toolRuns = state.toolRuns.filter((item) => !artistId || item.artistId === artistId);
  const profile = profiles[0] || (artistId ? findProfile(state, artistId) || { artistId, artistName: findArtist(artistId)?.name || artistId } : {});
  const toolCatalog = artistId ? artistToolCatalog(profile, contextForArtist(artistId)) : [];
  if (clean(params.action || 'hub', 'hub', 80) === 'tool-catalog') {
    return respond(200, {
      ok: true,
      providerRequired: false,
      localOnly: true,
      artistId,
      toolCatalog,
      toolRuns,
      summary: { tools: toolCatalog.length, toolRuns: toolRuns.length },
      generatedAt: nowIso(),
    });
  }
  return respond(200, {
    ok: true,
    providerRequired: false,
    localOnly: true,
    profiles,
    memory,
    actions,
    cycles,
    toolRuns,
    toolCatalog,
    summary: {
      profiles: profiles.length,
      memory: memory.length,
      actions: actions.length,
      executedActions: actions.filter((action) => action.status === 'executed').length,
      cycles: cycles.length,
      toolRuns: toolRuns.length,
    },
    generatedAt: nowIso(),
  });
}

function handleSeed(payload) {
  const state = loadBrainState();
  const profile = upsertProfile(state, payload);
  const plans = planActions(profile, state);
  state.actions.unshift(...plans);
  saveBrainState(state);
  return respond(201, { ok: true, profile, plannedActions: plans, memory: state.memory.filter((item) => item.artistId === profile.artistId).slice(0, 12) });
}

function handleAddMemory(payload) {
  const artistId = clean(payload.artistId, '', 120);
  if (!artistId) return respond(400, { ok: false, error: 'artistId is required.' });
  const state = loadBrainState();
  if (!findProfile(state, artistId)) upsertProfile(state, { artistId, seedMemory: false });
  const memory = {
    memoryId: clean(payload.memoryId || makeId('mem'), '', 120),
    artistId,
    title: clean(payload.title || 'Memory chunk', '', 160),
    text: clean(payload.text || payload.body || '', '', 3000),
    tags: normalizeList(payload.tags, 16),
    source: clean(payload.source || 'operator', '', 80),
    createdAt: nowIso(),
  };
  state.memory.unshift(memory);
  saveBrainState(state);
  return respond(201, { ok: true, memory });
}

function handlePlanPost(payload) {
  const state = loadBrainState();
  const artistId = clean(payload.artistId, '', 120);
  const profile = findProfile(state, artistId) || upsertProfile(state, { artistId, seedMemory: false });
  const ctx = contextForArtist(artistId);
  const release = clean(payload.releaseId, '', 120)
    ? ctx.releases.find((item) => item.id === payload.releaseId) || null
    : latestRelease(ctx);
  const action = {
    actionId: makeId('brain_action'),
    artistId,
    brainId: profile.brainId,
    type: 'feed_post',
    status: 'planned',
    title: clean(payload.title || 'Artist brain feed post', '', 160),
    caption: clean(payload.caption || buildCaption(profile, ctx, release), '', 950),
    releaseId: release?.id || clean(payload.releaseId, '', 120),
    hashtags: normalizeList(payload.hashtags || ['musicnexus'], 12),
    createdAt: nowIso(),
  };
  state.actions.unshift(action);
  saveBrainState(state);
  return respond(201, { ok: true, action });
}

function handleRunCycle(payload) {
  const state = loadBrainState();
  const artistId = clean(payload.artistId, '', 120);
  if (!artistId) return respond(400, { ok: false, error: 'artistId is required.' });
  const profile = findProfile(state, artistId) || upsertProfile(state, { artistId, seedMemory: true });
  const planned = planActions(profile, state).slice(0, Math.max(1, Math.min(8, Number(payload.limit || 4) || 4)));
  const execute = payload.execute === true || payload.execute === 'true';
  const receipts = [];
  for (const action of planned) {
    if (execute && action.type !== 'task') {
      action.execution = executeAction(action, profile, state);
      action.status = 'executed';
      action.executedAt = nowIso();
      receipts.push(action.execution);
    }
  }
  state.actions.unshift(...planned);
  const cycle = {
    cycleId: makeId('cycle'),
    artistId,
    brainId: profile.brainId,
    goal: clean(payload.goal || 'local artist brain cycle', '', 200),
    providerRequired: false,
    executed: execute,
    actionIds: planned.map((action) => action.actionId),
    receipts,
    createdAt: nowIso(),
  };
  state.cycles.unshift(cycle);
  saveBrainState(state);
  recordGamifyActivity({ artistId, activityType: 'brain_cycle', source: 'music-brain:run-local-cycle', note: cycle.goal, metadata: { executed: execute, actionCount: planned.length } });
  return respond(201, { ok: true, profile, cycle, actions: planned, receipts });
}

module.exports.handler = async (event) => {
  try {
    const denied = requireSkyGate(event);
    if (denied) return denied;
    const method = (event.httpMethod || 'GET').toUpperCase();
    const params = event.queryStringParameters || {};
    if (method === 'GET') {
      const action = clean(params.action || 'hub', 'hub', 80);
      if (action === 'hub' || action === 'list' || action === 'tool-catalog') return handleHub(params);
      return respond(400, { ok: false, error: `Unknown GET action: ${action}` });
    }
    if (method === 'POST' || method === 'PUT') {
      const payload = parseBody(event);
      if (payload === null) return respond(400, { ok: false, error: 'Invalid JSON body.' });
      const action = clean(payload.action || params.action, '', 80);
      if (action === 'seed-artist-brain') return handleSeed(payload);
      if (action === 'add-memory') return handleAddMemory(payload);
      if (action === 'plan-post') return handlePlanPost(payload);
      if (action === 'build-tool-asset' || action === 'run-tool' || action === 'create-tool-run') {
        const state = loadBrainState();
        const artistId = clean(payload.artistId, '', 120);
        const profile = findProfile(state, artistId) || upsertProfile(state, { artistId, seedMemory: true });
        if (!profile) return respond(400, { ok: false, error: 'artistId is required.' });
        const built = buildToolRun(state, profile, payload);
        if (!built) return respond(400, { ok: false, error: 'tool_run_failed' });
        let post = null;
        if (payload.publishToFeed === true || payload.publishToFeed === 'true') {
          const social = loadSocial();
          post = {
            id: makeId('feed_post'),
            connectorId: 'musicnexus-local-brain',
            platform: 'musicnexus',
            artistId,
            releaseId: built.toolRun.releaseId || '',
            productId: built.toolRun.productId || '',
            toolRunId: built.toolRun.toolRunId,
            caption: built.toolRun.publishablePost,
            statusText: built.toolRun.publishablePost,
            hashtags: ['musicnexus', 'artisttools', built.toolRun.toolId],
            visibility: 'local-feed',
            language: 'en',
            status: 'local-published',
            moderationState: 'visible',
            artist: { id: artistId, name: profile.artistName },
            release: built.toolRun.releaseId ? { id: built.toolRun.releaseId } : null,
            metadata: { appId: built.toolRun.appId, handoffUrl: built.toolRun.handoffUrl },
            createdAt: nowIso(),
            updatedAt: nowIso(),
          };
          social.postQueue.unshift(post);
          saveSocial(social);
          recordGamifyActivity({ artistId, activityType: 'feed_post', releaseId: post.releaseId || '', postId: post.id, source: 'music-brain:manual-tool-feed-post', note: built.toolRun.title });
        }
        saveBrainState(state);
        return respond(201, { ok: true, toolRun: built.toolRun, tool: built.tool, memory: built.memory, post, summary: { toolRuns: state.toolRuns.length } });
      }
      if (action === 'run-local-cycle') return handleRunCycle(payload);
      return respond(400, { ok: false, error: `Unknown POST action: ${action}` });
    }
    return respond(405, { ok: false, error: 'Method not allowed.' });
  } catch (err) {
    return respond(err.statusCode || 500, { ok: false, error: err.message || 'Internal server error.' });
  }
};
