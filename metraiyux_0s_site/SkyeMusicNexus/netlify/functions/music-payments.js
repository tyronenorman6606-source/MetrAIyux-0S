'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { requireSkyGate } = require('./_lib/skygate-auth');

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const MUSIC_NEXUS_DIR =
  process.env.MUSIC_NEXUS_DATA_DIR || path.join(os.tmpdir(), 'skye-music-nexus');

function artistsFile() {
  return path.join(MUSIC_NEXUS_DIR, 'artists.json');
}

function ledgerFile() {
  return path.join(MUSIC_NEXUS_DIR, 'ledger.json');
}

function payoutsFile() {
  return path.join(MUSIC_NEXUS_DIR, 'payouts.json');
}

function ensureFile(filePath, defaultValue) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2) + '\n', 'utf8');
  }
}

function loadFile(filePath) {
  ensureFile(filePath, []);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function saveFile(filePath, data) {
  ensureFile(filePath, []);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function loadArtists() {
  return loadFile(artistsFile());
}

function saveArtists(artists) {
  saveFile(artistsFile(), artists);
}

function loadLedger() {
  return loadFile(ledgerFile());
}

function saveLedger(ledger) {
  saveFile(ledgerFile(), ledger);
}

function loadPayouts() {
  return loadFile(payoutsFile());
}

function savePayouts(payouts) {
  saveFile(payoutsFile(), payouts);
}

function makeId() {
  return crypto.randomBytes(8).toString('hex');
}

function nowIso() {
  return new Date().toISOString();
}

const WORKFORCE_COMMAND_URL = '/SkyeRouteX/workforce-command-v0.4.0/index.html#contractor-panel';
const WORKFORCE_PACKET_URL = '/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html';
const CONNECTLOG_URL = '/connectlog-v7.7-relay13-operator-proof/app.html';
const RELAY13_INBOX_URL = '/connectlog-v7.7-relay13-operator-proof/relay13-inbox.html';

function slugify(value, fallback = 'new-artist') {
  return String(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || fallback;
}

function artistLinkSlug(artist) {
  return slugify(artist && (artist.slug || artist.name || artist.artistId || artist.id || artist.skyeId || artist.email), 'new-artist');
}

function paperworkComplete(artist) {
  return ['complete', 'completed', 'approved', 'on_file', 'verified'].includes(String(artist && artist.paperwork && artist.paperwork.status || '').toLowerCase());
}

function paperworkFor(artist = {}) {
  const existing = artist.paperwork && typeof artist.paperwork === 'object' ? artist.paperwork : {};
  const slug = artistLinkSlug({ ...artist, slug: existing.artistSlug || artist.slug });
  return {
    requiredBeforePayout: true,
    payoutHold: !paperworkComplete({ paperwork: { status: existing.status || 'required' } }),
    status: String(existing.status || 'required').toLowerCase(),
    artistSlug: slug,
    legalPaymentNotice: 'If paperwork is not completed, this artist cannot legally be paid through SkyePay.',
    workforceFormUrl: existing.workforceFormUrl || `${WORKFORCE_PACKET_URL}?source=SkyeMusicNexus&artist=${encodeURIComponent(slug)}`,
    workforceCommandUrl: existing.workforceCommandUrl || WORKFORCE_COMMAND_URL,
    connectLogUrl: existing.connectLogUrl || CONNECTLOG_URL,
    relay13InboxUrl: existing.relay13InboxUrl || RELAY13_INBOX_URL,
    payoutHoldReason: existing.payoutHoldReason || 'Paperwork must be completed and owner-approved before external payout release.',
  };
}

function findArtist(artists, artistId) {
  const target = String(artistId || '').toLowerCase();
  return artists.find((artist) =>
    String(artist.id || '').toLowerCase() === target ||
    String(artist.artistId || '').toLowerCase() === target ||
    String(artist.skyeId || '').toLowerCase() === target ||
    String(artist.identityId || '').toLowerCase() === target ||
    String(artist.email || '').toLowerCase() === target ||
    String(artist.slug || '').toLowerCase() === target
  );
}

// ---------------------------------------------------------------------------
// JSON response helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Action: credit artist account
// ---------------------------------------------------------------------------

function handleCredit(payload) {
  const { artistId, amount, reason, referenceId } = payload;

  if (!artistId) {
    return respond(400, { ok: false, error: 'artistId is required' });
  }

  const creditAmount = Number(amount);
  if (isNaN(creditAmount) || creditAmount <= 0) {
    return respond(400, { ok: false, error: 'amount must be a positive number' });
  }

  const artists = loadArtists();
  const artist = findArtist(artists, artistId);
  const artistIdx = artists.indexOf(artist);
  if (!artist || artistIdx === -1) {
    return respond(404, { ok: false, error: 'Artist not found' });
  }

  // Update artist balance
  const prevBalance = Number(artists[artistIdx].balance || 0);
  const newBalance = prevBalance + creditAmount;
  artists[artistIdx].balance = newBalance;
  artists[artistIdx].updatedAt = nowIso();
  saveArtists(artists);

  // Create ledger entry
  const ledger = loadLedger();
  const entry = {
    id: makeId(),
    artistId: String(artistId),
    type: 'credit',
    amount: creditAmount,
    balance_after: newBalance,
    reason: reason ? String(reason).trim() : '',
    referenceId: referenceId ? String(referenceId).trim() : '',
    createdAt: nowIso(),
  };
  ledger.push(entry);
  saveLedger(ledger);

  return respond(201, { ok: true, entry, balance: newBalance });
}

// ---------------------------------------------------------------------------
// Action: payout request
// ---------------------------------------------------------------------------

function handlePayout(payload) {
  const { artistId, amount, payoutMethod, payoutDetails } = payload;

  if (!artistId) {
    return respond(400, { ok: false, error: 'artistId is required' });
  }

  const payoutAmount = Number(amount);
  if (isNaN(payoutAmount) || payoutAmount <= 0) {
    return respond(400, { ok: false, error: 'amount must be a positive number' });
  }

  const validMethods = ['bank', 'paypal'];
  if (!payoutMethod || !validMethods.includes(payoutMethod)) {
    return respond(400, { ok: false, error: `payoutMethod must be one of: ${validMethods.join(', ')}` });
  }

  const artists = loadArtists();
  const artist = findArtist(artists, artistId);
  const artistIdx = artists.indexOf(artist);
  if (!artist || artistIdx === -1) {
    return respond(404, { ok: false, error: 'Artist not found' });
  }

  const currentBalance = Number(artists[artistIdx].balance || 0);
  if (currentBalance < payoutAmount) {
    return respond(422, {
      ok: false,
      error: `Insufficient balance. Available: ${currentBalance}, requested: ${payoutAmount}`,
    });
  }

  if (!paperworkComplete(artist)) {
    const payouts = loadPayouts();
    const paperwork = paperworkFor(artist);
    const payout = {
      id: makeId(),
      artistId: String(artistId),
      amount: payoutAmount,
      payoutMethod,
      payoutDetails: payoutDetails && typeof payoutDetails === 'object' ? payoutDetails : {},
      status: 'paperwork_hold',
      holdReason: paperwork.payoutHoldReason,
      paperwork,
      ledgerEntryId: '',
      createdAt: nowIso(),
      completedAt: null,
    };
    payouts.push(payout);
    savePayouts(payouts);
    return respond(201, { ok: true, payout, balance: currentBalance });
  }

  // Debit artist balance
  const newBalance = currentBalance - payoutAmount;
  artists[artistIdx].balance = newBalance;
  artists[artistIdx].updatedAt = nowIso();
  saveArtists(artists);

  // Create ledger debit entry
  const ledger = loadLedger();
  const ledgerEntry = {
    id: makeId(),
    artistId: String(artistId),
    type: 'debit',
    amount: payoutAmount,
    balance_after: newBalance,
    reason: `Payout request via ${payoutMethod}`,
    referenceId: '',
    createdAt: nowIso(),
  };
  ledger.push(ledgerEntry);
  saveLedger(ledger);

  // Create payout record
  const payouts = loadPayouts();
  const payout = {
    id: makeId(),
    artistId: String(artistId),
    amount: payoutAmount,
    payoutMethod,
    payoutDetails: payoutDetails && typeof payoutDetails === 'object' ? payoutDetails : {},
    status: 'pending_owner_approval',
    paperwork: paperworkFor(artists[artistIdx]),
    ledgerEntryId: ledgerEntry.id,
    createdAt: nowIso(),
    completedAt: null,
  };
  ledger[ledger.length - 1].referenceId = payout.id;
  payouts.push(payout);
  savePayouts(payouts);
  saveLedger(ledger);

  return respond(201, { ok: true, payout, balance: newBalance });
}

// ---------------------------------------------------------------------------
// Action: get ledger for artist
// ---------------------------------------------------------------------------

function handleLedger(params) {
  const { artistId } = params;
  if (!artistId) {
    return respond(400, { ok: false, error: 'artistId is required' });
  }

  const ledger = loadLedger().filter((e) => e.artistId === artistId);

  const artists = loadArtists();
  const artist = findArtist(artists, artistId);

  return respond(200, {
    ok: true,
    artistId,
    balance: artist ? Number(artist.balance || 0) : null,
    ledger,
    total: ledger.length,
  });
}

// ---------------------------------------------------------------------------
// Action: list payouts
// ---------------------------------------------------------------------------

function handlePayouts(params) {
  let payouts = loadPayouts();

  const status = params.status ? params.status.trim() : '';
  if (status) {
    payouts = payouts.filter((p) => p.status === status);
  }

  return respond(200, { ok: true, payouts, total: payouts.length });
}

// ---------------------------------------------------------------------------
// Action: complete payout
// ---------------------------------------------------------------------------

function handleCompletePayout(payload, params) {
  const payoutId =
    (payload && payload.payoutId) || (params && params.payoutId);

  if (!payoutId) {
    return respond(400, { ok: false, error: 'payoutId is required' });
  }

  const payouts = loadPayouts();
  const idx = payouts.findIndex((p) => p.id === payoutId);
  if (idx === -1) {
    return respond(404, { ok: false, error: 'Payout not found' });
  }

  if (payouts[idx].status === 'completed') {
    return respond(409, { ok: false, error: 'Payout is already completed' });
  }

  const artists = loadArtists();
  const artist = findArtist(artists, payouts[idx].artistId);
  if (!artist || !paperworkComplete(artist)) {
    payouts[idx].status = 'paperwork_hold';
    payouts[idx].holdReason = 'Paperwork must be completed before this payout can legally be released.';
    payouts[idx].paperwork = paperworkFor(artist || { id: payouts[idx].artistId });
    savePayouts(payouts);
    return respond(409, { ok: false, error: 'paperwork_required_before_payout', payout: payouts[idx], paperwork: payouts[idx].paperwork });
  }

  payouts[idx].status = 'completed';
  payouts[idx].completedAt = nowIso();
  savePayouts(payouts);

  return respond(200, { ok: true, payout: payouts[idx] });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

module.exports.handler = async (event) => {
  try {
    const method = (event.httpMethod || 'GET').toUpperCase();
    const params = event.queryStringParameters || {};

    if (method === 'GET') {
      const denied = requireSkyGate(event);
      if (denied) return denied;
      const action = params.action || '';
      if (action === 'ledger') return handleLedger(params);
      if (action === 'payouts') return handlePayouts(params);
      return respond(400, { ok: false, error: `Unknown GET action: ${action}` });
    }

    if (method === 'POST') {
      const denied = requireSkyGate(event);
      if (denied) return denied;
      const payload = parseBody(event);
      if (payload === null) {
        return respond(400, { ok: false, error: 'Invalid JSON body' });
      }
      const action = payload.action || params.action || '';
      if (action === 'credit') return handleCredit(payload);
      if (action === 'payout') return handlePayout(payload);
      if (action === 'complete-payout') return handleCompletePayout(payload, params);
      return respond(400, { ok: false, error: `Unknown POST action: ${action}` });
    }

    return respond(405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    return respond(500, { ok: false, error: err.message || 'Internal server error' });
  }
};
