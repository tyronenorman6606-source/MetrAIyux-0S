'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { requireSkyGate, verifySkyGateBearer } = require('./_lib/skygate-auth');

const MUSIC_NEXUS_DIR = process.env.MUSIC_NEXUS_DATA_DIR || path.join(os.tmpdir(), 'skye-music-nexus');
const GAMIFY_FILE = 'gamify-spine.json';
const SKYEMETER_THRESHOLD = 100;

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

function loadGamify() {
  const state = loadJson(GAMIFY_FILE, {});
  return {
    meters: Array.isArray(state.meters) ? state.meters : [],
    merits: Array.isArray(state.merits) ? state.merits : [],
    events: Array.isArray(state.events) ? state.events : [],
    giveaways: Array.isArray(state.giveaways) ? state.giveaways : [],
    entries: Array.isArray(state.entries) ? state.entries : [],
  };
}

function saveGamify(state) {
  saveJson(GAMIFY_FILE, {
    meters: state.meters || [],
    merits: state.merits || [],
    events: state.events || [],
    giveaways: state.giveaways || [],
    entries: state.entries || [],
  });
}

function clean(value, fallback = '', limit = 1000) {
  return String(value == null ? fallback : value).trim().slice(0, limit);
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
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

function requireOperatorGate(event) {
  const guard = verifySkyGateBearer(event);
  if (!guard.ok) return respond(guard.statusCode || 401, { ok: false, error: guard.error || 'Unauthorized.' });
  const role = clean(guard.claims?.role || '', '', 40).toLowerCase();
  return ['admin', 'owner', 'operator', 'founder'].includes(role)
    ? null
    : respond(403, { ok: false, error: 'Operator role required for this MusicNexus gamify action.' });
}

function pointsFor(type, override) {
  const explicit = Number(override);
  if (Number.isFinite(explicit) && explicit > 0) return Math.min(500, Math.round(explicit));
  const key = clean(type || 'activity', 'activity', 80).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return {
    stream_other_artist: 18,
    stream_received: 4,
    stream_own_release: 8,
    qualified_stream: 30,
    feed_post: 14,
    feed_comment: 8,
    feed_like: 3,
    feed_save: 5,
    feed_boost: 7,
    engagement_received: 3,
    follow: 6,
    store_product: 20,
    store_order: 30,
    drop_create: 25,
    brain_cycle: 15,
    giveaway_enter: 10,
    giveaway_win: 50,
    operator_award: 100,
  }[key] || 5;
}

function meterPercent(meter) {
  return Math.max(0, Math.min(100, Math.round((Number(meter.cyclePoints || 0) / SKYEMETER_THRESHOLD) * 100)));
}

function ensureMeter(state, artistId) {
  let meter = state.meters.find((item) => item.artistId === artistId);
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
    state.meters.unshift(meter);
  }
  return meter;
}

function issueMerit(state, meter, source = {}) {
  const merit = {
    meritId: makeId('skye_merit'),
    artistId: meter.artistId,
    artistName: meter.artistName || meter.artistId,
    denomination: Number(source.denomination || 1) || 1,
    reason: clean(source.reason || 'SkyeMeter filled', 'SkyeMeter filled', 220),
    sourceEventId: source.gamifyEventId || '',
    sourceType: source.activityType || 'skyemeter',
    status: 'issued',
    createdAt: nowIso(),
  };
  state.merits.unshift(merit);
  meter.meritBalance = Number(meter.meritBalance || 0) + merit.denomination;
  meter.meritCount = Number(meter.meritCount || 0) + 1;
  return merit;
}

function recordActivity(state, payload = {}) {
  const artistId = clean(payload.artistId, '', 120);
  if (!artistId) return null;
  const activityType = clean(payload.activityType || payload.type || 'activity', 'activity', 100).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const points = pointsFor(activityType, payload.points);
  const meter = ensureMeter(state, artistId);
  const event = {
    gamifyEventId: payload.gamifyEventId || makeId('skye_evt'),
    artistId,
    artistName: meter.artistName || artistId,
    activityType,
    points,
    releaseId: clean(payload.releaseId || '', '', 120),
    targetArtistId: clean(payload.targetArtistId || '', '', 120),
    postId: clean(payload.postId || payload.targetId || '', '', 120),
    source: clean(payload.source || 'skymusicnexus', 'skymusicnexus', 120),
    note: clean(payload.note || '', '', 500),
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
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
    merits.push(issueMerit(state, meter, { ...event, reason: `SkyeMeter filled by ${activityType.replace(/_/g, ' ')}` }));
  }
  event.meterPercent = meterPercent(meter);
  event.issuedMerits = merits.map((merit) => merit.meritId);
  state.events.unshift(event);
  state.events = state.events.slice(0, 1000);
  return { event, meter: { ...meter, percent: meterPercent(meter) }, merits };
}

function summary(state) {
  return {
    meters: state.meters.length,
    merits: state.merits.length,
    events: state.events.length,
    giveaways: state.giveaways.length,
    openGiveaways: state.giveaways.filter((item) => item.status === 'open').length,
    entries: state.entries.length,
    totalLifetimePoints: state.meters.reduce((sum, meter) => sum + Number(meter.lifetimePoints || 0), 0),
    totalMeritBalance: state.meters.reduce((sum, meter) => sum + Number(meter.meritBalance || 0), 0),
    nextMeritAt: SKYEMETER_THRESHOLD,
  };
}

function scoped(state, artistId) {
  return {
    meters: state.meters.filter((item) => !artistId || item.artistId === artistId).map((item) => ({ ...item, percent: meterPercent(item) })),
    merits: state.merits.filter((item) => !artistId || item.artistId === artistId),
    events: state.events.filter((item) => !artistId || item.artistId === artistId),
    giveaways: state.giveaways.filter((item) => !artistId || item.status === 'open' || item.sponsorArtistId === artistId),
    entries: state.entries.filter((item) => !artistId || item.artistId === artistId),
  };
}

function prizeType(value) {
  const type = clean(value || 'content_launch_drop_package', 'content_launch_drop_package', 100).toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return ['content_launch_drop_package', 'new_drop_package', 'artist_store_makeover', 'agentic_website_boost', 'featured_feed_push', 'studio_session_pack'].includes(type)
    ? type
    : 'content_launch_drop_package';
}

module.exports.handler = async (event) => {
  try {
    const denied = requireSkyGate(event);
    if (denied) return denied;
    const method = (event.httpMethod || 'GET').toUpperCase();
    const params = event.queryStringParameters || {};
    const state = loadGamify();
    if (method === 'GET') {
      const data = scoped(state, clean(params.artistId, '', 120));
      return respond(200, { ok: true, providerRequired: false, gateSessionRequired: true, ...data, summary: summary(data), generatedAt: nowIso() });
    }
    if (method !== 'POST' && method !== 'PUT') return respond(405, { ok: false, error: 'Method not allowed.' });
    const payload = parseBody(event);
    if (payload === null) return respond(400, { ok: false, error: 'Invalid JSON body.' });
    const action = clean(payload.action || params.action, '', 80);
    if (['award-merits', 'draw-giveaway', 'close-giveaway'].includes(action)) {
      const operatorDenied = requireOperatorGate(event);
      if (operatorDenied) return operatorDenied;
    }

    if (action === 'record-activity') {
      const recorded = recordActivity(state, { ...payload, source: payload.source || 'manual-gated-activity' });
      if (!recorded) return respond(400, { ok: false, error: 'artistId is required.' });
      saveGamify(state);
      return respond(201, { ok: true, ...recorded });
    }
    if (action === 'award-merits') {
      const artistId = clean(payload.artistId, '', 120);
      if (!artistId) return respond(400, { ok: false, error: 'artistId is required.' });
      const meter = ensureMeter(state, artistId);
      const count = Math.max(1, Math.min(25, Number(payload.count || payload.denomination || 1) || 1));
      const merits = [];
      for (let index = 0; index < count; index += 1) merits.push(issueMerit(state, meter, { reason: payload.reason || 'Operator SkyeMerit award', activityType: 'operator_award' }));
      meter.updatedAt = nowIso();
      saveGamify(state);
      return respond(200, { ok: true, meter: { ...meter, percent: meterPercent(meter) }, merits });
    }
    if (action === 'open-giveaway') {
      const giveawayId = payload.giveawayId || makeId('giveaway');
      const giveaway = {
        giveawayId,
        id: giveawayId,
        title: clean(payload.title || 'Content launch drop package giveaway', '', 180),
        prizeType: prizeType(payload.prizeType),
        prizeDescription: clean(payload.prizeDescription || 'Owner-approved content launch, new drop, or agentic website growth package.', '', 1000),
        sponsorArtistId: clean(payload.sponsorArtistId || payload.artistId || '', '', 120),
        entryCostPoints: Math.max(0, Number(payload.entryCostPoints || 0) || 0),
        maxEntries: Math.max(1, Math.min(5000, Number(payload.maxEntries || 250) || 250)),
        status: 'open',
        winnerEntryId: '',
        winnerArtistId: '',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      state.giveaways = state.giveaways.filter((item) => item.giveawayId !== giveawayId && item.id !== giveawayId);
      state.giveaways.unshift(giveaway);
      saveGamify(state);
      return respond(201, { ok: true, giveaway });
    }
    if (action === 'enter-giveaway') {
      const giveawayId = clean(payload.giveawayId, '', 120);
      const artistId = clean(payload.artistId, '', 120);
      if (!giveawayId || !artistId) return respond(400, { ok: false, error: 'giveawayId and artistId are required.' });
      const giveaway = state.giveaways.find((item) => item.giveawayId === giveawayId || item.id === giveawayId);
      if (!giveaway) return respond(404, { ok: false, error: 'giveaway_not_found' });
      if (giveaway.status !== 'open') return respond(409, { ok: false, error: 'giveaway_not_open' });
      const meter = ensureMeter(state, artistId);
      if (Number(giveaway.entryCostPoints || 0) > Number(meter.lifetimePoints || 0)) return respond(409, { ok: false, error: 'skyemeter_points_required', required: giveaway.entryCostPoints, current: meter.lifetimePoints });
      let entry = state.entries.find((item) => item.giveawayId === giveaway.giveawayId && item.artistId === artistId);
      if (!entry) {
        const entryId = payload.entryId || makeId('giveaway_entry');
        entry = { entryId, id: entryId, giveawayId: giveaway.giveawayId, artistId, artistName: meter.artistName || artistId, status: 'entered', createdAt: nowIso() };
        state.entries.unshift(entry);
      }
      entry.note = clean(payload.note || entry.note || '', '', 500);
      entry.meterSnapshot = { lifetimePoints: meter.lifetimePoints, cyclePoints: meter.cyclePoints, meritBalance: meter.meritBalance };
      entry.updatedAt = nowIso();
      const recorded = recordActivity(state, { artistId, activityType: 'giveaway_enter', source: 'music-gamify', note: `Entered ${giveaway.title}`, metadata: { giveawayId: giveaway.giveawayId } });
      saveGamify(state);
      return respond(201, { ok: true, giveaway, entry, meter: recorded.meter });
    }
    if (action === 'draw-giveaway') {
      const giveawayId = clean(payload.giveawayId, '', 120);
      const giveaway = state.giveaways.find((item) => item.giveawayId === giveawayId || item.id === giveawayId);
      if (!giveaway) return respond(404, { ok: false, error: 'giveaway_not_found' });
      const entries = state.entries.filter((item) => item.giveawayId === giveaway.giveawayId && item.status !== 'withdrawn');
      if (!entries.length) return respond(409, { ok: false, error: 'giveaway_has_no_entries' });
      const winner = entries[Math.max(0, Math.min(entries.length - 1, Number(payload.winnerIndex || 0) || 0))];
      winner.status = 'winner';
      winner.wonAt = nowIso();
      giveaway.status = 'awarded';
      giveaway.winnerEntryId = winner.entryId;
      giveaway.winnerArtistId = winner.artistId;
      giveaway.awardedAt = winner.wonAt;
      giveaway.updatedAt = winner.wonAt;
      const recorded = recordActivity(state, { artistId: winner.artistId, activityType: 'giveaway_win', source: 'music-gamify', note: `Won ${giveaway.title}`, metadata: { giveawayId: giveaway.giveawayId, prizeType: giveaway.prizeType } });
      saveGamify(state);
      return respond(200, { ok: true, giveaway, winner, meter: recorded.meter, prizeReceipt: { status: 'owner_approval_required', prizeType: giveaway.prizeType, route: 'agentic-growth-or-drop-package-handoff' } });
    }
    if (action === 'close-giveaway') {
      const giveaway = state.giveaways.find((item) => item.giveawayId === payload.giveawayId || item.id === payload.giveawayId);
      if (!giveaway) return respond(404, { ok: false, error: 'giveaway_not_found' });
      giveaway.status = payload.status === 'cancelled' ? 'cancelled' : 'closed';
      giveaway.updatedAt = nowIso();
      saveGamify(state);
      return respond(200, { ok: true, giveaway });
    }
    return respond(400, { ok: false, error: `Unknown POST action: ${action}` });
  } catch (err) {
    return respond(err.statusCode || 500, { ok: false, error: err.message || 'Internal server error.' });
  }
};
