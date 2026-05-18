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

function releasesFile() {
  return path.join(MUSIC_NEXUS_DIR, 'releases.json');
}

function ensureFile(filePath, defaultValue) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2) + '\n', 'utf8');
  }
}

function loadArtists() {
  const file = artistsFile();
  ensureFile(file, []);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveArtists(artists) {
  const file = artistsFile();
  ensureFile(file, []);
  fs.writeFileSync(file, JSON.stringify(artists, null, 2) + '\n', 'utf8');
}

function loadReleases() {
  const file = releasesFile();
  ensureFile(file, []);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function makeId() {
  return crypto.randomBytes(8).toString('hex');
}

function nowIso() {
  return new Date().toISOString();
}

const MAX_PROFILE_PHOTO_CHARS = 1800000;

function cleanString(value, limit = 500) {
  return String(value == null ? '' : value).trim().slice(0, limit);
}

function fail(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
}

function normalizeSkyeId(value) {
  const raw = cleanString(value, 80);
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  return raw.replace(/[^\w-]/g, '').slice(0, 64);
}

function normalizePhoto(value) {
  if (!value) return null;
  const photo = typeof value === 'string' ? { dataUrl: value } : value;
  if (!photo || typeof photo !== 'object') return null;
  const dataUrl = cleanString(photo.dataUrl || photo.photoDataUrl, MAX_PROFILE_PHOTO_CHARS + 20);
  if (!dataUrl) return null;
  if (!dataUrl.startsWith('data:image/')) fail(400, 'profilePhoto must be a data:image URL');
  if (dataUrl.length > MAX_PROFILE_PHOTO_CHARS) fail(413, 'profilePhoto is too large for the artist identity record');
  return {
    dataUrl,
    name: cleanString(photo.name || photo.photoName || 'artist-photo.jpg', 180),
    type: cleanString(photo.type || photo.photoType || 'image/jpeg', 80),
    originalBytes: Number(photo.originalBytes || photo.bytes || 0) || 0,
    width: Number(photo.width || 0) || 0,
    height: Number(photo.height || 0) || 0,
    updatedAt: cleanString(photo.updatedAt || nowIso(), 40),
  };
}

function normalizeIdentity(value, fallback = {}) {
  const input = value && typeof value === 'object' ? value : {};
  const idNumber = normalizeSkyeId(input.idNumber || input.number || input.skyeId || fallback.skyeId);
  const skyeId = normalizeSkyeId(input.skyeId || idNumber || fallback.skyeId);
  const profilePhoto = normalizePhoto(input.photoDataUrl ? { dataUrl: input.photoDataUrl, name: input.photoName, type: input.photoType } : input.profilePhoto);
  return {
    schema: 'skye0s.identity.v1',
    identityId: cleanString(input.identityId || skyeId || idNumber || fallback.identityId || '', 80),
    skyeId,
    idNumber: idNumber || skyeId,
    name: cleanString(input.name || fallback.name || '', 180),
    email: cleanString(input.email || fallback.email || '', 180).toLowerCase(),
    profileType: cleanString(input.profileType || 'artist', 48),
    photoDataUrl: profilePhoto ? profilePhoto.dataUrl : '',
    photoName: profilePhoto ? profilePhoto.name : '',
    photoType: profilePhoto ? profilePhoto.type : '',
    source: cleanString(input.source || 'SkyeMusicNexus', 80),
    updatedAt: cleanString(input.updatedAt || nowIso(), 40),
  };
}

function findArtistIndex(artists, id) {
  const normalized = normalizeSkyeId(id);
  return artists.findIndex((artist) =>
    artist.id === id ||
    artist.id === normalized ||
    artist.skyeId === id ||
    artist.skyeId === normalized ||
    artist.identityId === id ||
    artist.identityId === normalized
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

// ---------------------------------------------------------------------------
// Parse body helper
// ---------------------------------------------------------------------------

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Action: register artist
// ---------------------------------------------------------------------------

function handleRegister(payload) {
  const { name, email, phone, genre, bio, socialLinks } = payload;

  if (!name || !email) {
    return respond(400, { ok: false, error: 'name and email are required' });
  }

  const artists = loadArtists();
  const normalizedEmail = cleanString(email, 180).toLowerCase();
  const skyeId = normalizeSkyeId(payload.skyeId || payload.idNumber || payload.identityId);
  const identityId = cleanString(payload.identityId || skyeId, 80);
  const profilePhoto = normalizePhoto(payload.profilePhoto || payload.photoDataUrl);
  const crossAppIdentity = normalizeIdentity(payload.crossAppIdentity, {
    name,
    email: normalizedEmail,
    skyeId,
    identityId,
  });
  const artistId = skyeId || identityId || makeId();

  const existing = artists.find((a) =>
    a.email === normalizedEmail ||
    a.id === artistId ||
    (skyeId && a.skyeId === skyeId) ||
    (identityId && a.identityId === identityId)
  );
  if (existing) {
    return respond(409, { ok: false, error: `Artist identity "${normalizedEmail || artistId}" already exists` });
  }

  const artist = {
    id: artistId,
    skyeId: skyeId || artistId,
    identityId: identityId || artistId,
    name: cleanString(name, 180),
    email: normalizedEmail,
    phone: phone ? cleanString(phone, 80) : '',
    genre: Array.isArray(genre) ? genre.map((g) => String(g).trim()) : [],
    bio: bio ? cleanString(bio, 2000) : '',
    socialLinks: socialLinks && typeof socialLinks === 'object' ? socialLinks : {},
    profilePhoto,
    crossAppIdentity: {
      ...crossAppIdentity,
      photoDataUrl: crossAppIdentity.photoDataUrl || (profilePhoto ? profilePhoto.dataUrl : ''),
      photoName: crossAppIdentity.photoName || (profilePhoto ? profilePhoto.name : ''),
      photoType: crossAppIdentity.photoType || (profilePhoto ? profilePhoto.type : ''),
    },
    status: 'pending_review',
    balance: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  artists.push(artist);
  saveArtists(artists);

  return respond(201, { ok: true, artist, artistId: artist.id });
}

// ---------------------------------------------------------------------------
// Action: list artists
// ---------------------------------------------------------------------------

function handleList(params) {
  let artists = loadArtists();

  const genre = params.genre ? params.genre.trim() : '';
  const status = params.status ? params.status.trim() : '';

  if (genre) {
    artists = artists.filter((a) =>
      Array.isArray(a.genre) && a.genre.some((g) => g.toLowerCase() === genre.toLowerCase())
    );
  }

  if (status) {
    artists = artists.filter((a) => a.status === status);
  }

  return respond(200, { ok: true, artists, total: artists.length });
}

// ---------------------------------------------------------------------------
// Action: get artist profile + their releases
// ---------------------------------------------------------------------------

function handleGet(params) {
  const { id } = params;
  if (!id) {
    return respond(400, { ok: false, error: 'id is required' });
  }

  const artists = loadArtists();
  const idx = findArtistIndex(artists, id);
  if (idx === -1) {
    return respond(404, { ok: false, error: 'Artist not found' });
  }
  const artist = artists[idx];

  const artistIds = new Set([artist.id, artist.skyeId, artist.identityId].filter(Boolean));
  const releases = loadReleases().filter((r) => artistIds.has(r.artistId));

  return respond(200, { ok: true, artist, releases });
}

// ---------------------------------------------------------------------------
// Action: update artist profile
// ---------------------------------------------------------------------------

function handleUpdate(payload) {
  const { id, ...fields } = payload;
  if (!id) {
    return respond(400, { ok: false, error: 'id is required' });
  }

  const artists = loadArtists();
  const idx = findArtistIndex(artists, id);
  if (idx === -1) {
    return respond(404, { ok: false, error: 'Artist not found' });
  }

  const protected_fields = ['id', 'createdAt', 'balance'];
  const artist = { ...artists[idx] };

  for (const [key, value] of Object.entries(fields)) {
    if (protected_fields.includes(key)) continue;
    if (key === 'email') {
      const normalized = String(value).trim().toLowerCase();
      const conflict = artists.find((a, i) => i !== idx && a.email === normalized);
      if (conflict) {
        return respond(409, { ok: false, error: `Email "${normalized}" is already in use` });
      }
      artist.email = normalized;
    } else if (key === 'genre') {
      artist.genre = Array.isArray(value) ? value.map((g) => String(g).trim()) : artist.genre;
    } else if (key === 'socialLinks') {
      artist.socialLinks = value && typeof value === 'object' ? value : artist.socialLinks;
    } else if (key === 'skyeId') {
      const normalized = normalizeSkyeId(value);
      if (!normalized) continue;
      const conflict = artists.find((a, i) => i !== idx && (a.id === normalized || a.skyeId === normalized || a.identityId === normalized));
      if (conflict) {
        return respond(409, { ok: false, error: `Skye ID "${normalized}" is already in use` });
      }
      artist.skyeId = normalized;
    } else if (key === 'identityId') {
      const normalized = cleanString(value, 80);
      if (!normalized) continue;
      const conflict = artists.find((a, i) => i !== idx && (a.id === normalized || a.skyeId === normalized || a.identityId === normalized));
      if (conflict) {
        return respond(409, { ok: false, error: `Identity "${normalized}" is already in use` });
      }
      artist.identityId = normalized;
    } else if (key === 'profilePhoto') {
      artist.profilePhoto = normalizePhoto(value) || artist.profilePhoto;
    } else if (key === 'crossAppIdentity') {
      const identity = normalizeIdentity(value, artist);
      artist.crossAppIdentity = {
        ...identity,
        photoDataUrl: identity.photoDataUrl || (artist.profilePhoto ? artist.profilePhoto.dataUrl : ''),
        photoName: identity.photoName || (artist.profilePhoto ? artist.profilePhoto.name : ''),
        photoType: identity.photoType || (artist.profilePhoto ? artist.profilePhoto.type : ''),
      };
    } else if (key === 'name') {
      artist.name = cleanString(value, 180);
    } else if (key === 'phone') {
      artist.phone = cleanString(value, 80);
    } else if (key === 'bio') {
      artist.bio = cleanString(value, 2000);
    } else {
      artist[key] = value;
    }
  }

  artist.updatedAt = nowIso();
  artists[idx] = artist;
  saveArtists(artists);

  return respond(200, { ok: true, artist });
}

// ---------------------------------------------------------------------------
// Action: approve artist
// ---------------------------------------------------------------------------

function handleApprove(payload, params) {
  const id = (payload && payload.id) || (params && params.id);
  if (!id) {
    return respond(400, { ok: false, error: 'id is required' });
  }

  const artists = loadArtists();
  const idx = findArtistIndex(artists, id);
  if (idx === -1) {
    return respond(404, { ok: false, error: 'Artist not found' });
  }

  artists[idx].status = 'active';
  artists[idx].updatedAt = nowIso();
  saveArtists(artists);

  return respond(200, { ok: true, artist: artists[idx] });
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
      const action = params.action || 'list';
      if (action === 'list') return handleList(params);
      if (action === 'get') return handleGet(params);
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
      if (action === 'register') return handleRegister(payload);
      if (action === 'approve') return handleApprove(payload, params);
      return respond(400, { ok: false, error: `Unknown POST action: ${action}` });
    }

    if (method === 'PUT') {
      const denied = requireSkyGate(event);
      if (denied) return denied;
      const payload = parseBody(event);
      if (payload === null) {
        return respond(400, { ok: false, error: 'Invalid JSON body' });
      }
      const action = payload.action || params.action || 'update';
      if (action === 'update') return handleUpdate(payload);
      return respond(400, { ok: false, error: `Unknown PUT action: ${action}` });
    }

    return respond(405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    return respond(err.statusCode || 500, { ok: false, error: err.message || 'Internal server error' });
  }
};
