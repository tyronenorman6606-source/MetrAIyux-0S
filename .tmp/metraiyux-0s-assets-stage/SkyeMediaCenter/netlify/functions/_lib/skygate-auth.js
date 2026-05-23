'use strict';

const crypto = require('node:crypto');
const { createLocalIdentity } = require('./local-identity');

const localIdentity = createLocalIdentity({
  dataDirEnv: 'MEDIA_CENTER_DATA_DIR',
  defaultDataDirName: 'skye-media-center',
  issuer: 'local://skye-media-center/session',
  audience: 'skye-media-center',
});

function clean(value) { return String(value == null ? '' : value).trim(); }
function firstEnv(names) {
  for (const name of names) {
    const value = clean(process.env[name]);
    if (value) return value;
  }
  return '';
}
function list(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return clean(value).split(',').map(clean).filter(Boolean);
}
function json(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(body) };
}
function parsePart(part) {
  return JSON.parse(Buffer.from(clean(part), 'base64url').toString('utf8'));
}
function publicKeyFor(header) {
  const pem = firstEnv(['SKYGATEFS27_PUBLIC_KEY_PEM', 'SKYGATE_PUBLIC_KEY_PEM', 'SKYGATEFS13_PUBLIC_KEY_PEM']);
  if (pem) return pem.replace(/\\n/g, '\n');
  const raw = firstEnv(['SKYGATEFS27_JWKS_JSON', 'SKYGATE_JWKS_JSON', 'SKYGATEFS13_JWKS_JSON']);
  if (!raw) return null;
  const jwks = JSON.parse(raw);
  const keys = Array.isArray(jwks.keys) ? jwks.keys : [];
  const jwk = keys.find((key) => clean(key.kid) === clean(header.kid)) || (keys.length === 1 ? keys[0] : null);
  return jwk ? crypto.createPublicKey({ key: jwk, format: 'jwk' }) : null;
}
function bearer(event) {
  const raw = clean(event && event.headers && (event.headers.authorization || event.headers.Authorization));
  return raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : '';
}
function verifyExternalSkyGateToken(token, options = {}) {
  const parts = clean(token).split('.');
  if (parts.length !== 3) return { ok: false, statusCode: 401, error: 'Malformed SkyGate bearer token.' };
  let header;
  let payload;
  try {
    header = parsePart(parts[0]);
    payload = parsePart(parts[1]);
  } catch {
    return { ok: false, statusCode: 401, error: 'SkyGate token decode failed.' };
  }
  if (header.alg !== 'RS256') return { ok: false, statusCode: 401, error: 'SkyGate token must use RS256.' };
  let key;
  try {
    key = publicKeyFor(header);
  } catch {
    return { ok: false, statusCode: 503, error: 'SkyGate JWKS is invalid.' };
  }
  if (!key) return { ok: false, statusCode: 503, error: 'SkyGate public key/JWKS is not configured.' };
  const valid = crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, Buffer.from(parts[2], 'base64url'));
  if (!valid) return { ok: false, statusCode: 401, error: 'SkyGate token signature invalid.' };
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > Number(payload.exp)) return { ok: false, statusCode: 401, error: 'SkyGate token expired.' };
  const expectedAudiences = list(options.audience || firstEnv(['SKYGATEFS27_EXPECTED_AUDIENCE', 'SKYGATE_EXPECTED_AUDIENCE', 'SKYGATEFS13_EXPECTED_AUDIENCE']) || 'skygatefs27,skygatefs13,skye-media-center');
  const audiences = list(payload.aud);
  if (expectedAudiences.length && !audiences.some((audience) => expectedAudiences.includes(audience))) {
    return { ok: false, statusCode: 401, error: 'SkyGate token audience mismatch.' };
  }
  const issuer = firstEnv(['SKYGATEFS27_ISSUER', 'SKYGATE_ISSUER', 'SKYGATEFS13_ISSUER']);
  if (issuer && clean(payload.iss) !== issuer) return { ok: false, statusCode: 401, error: 'SkyGate token issuer mismatch.' };
  const roles = Array.isArray(options.roles) ? options.roles.map(clean).filter(Boolean) : [];
  if (roles.length && !roles.includes(clean(payload.role))) {
    return { ok: false, statusCode: 403, error: 'The active token does not have the required role.' };
  }
  return { ok: true, claims: payload, source: 'external-skygate-jwt' };
}
function verifySkyGateBearer(event, options = {}) {
  const token = bearer(event);
  if (!token) return { ok: false, statusCode: 401, error: 'Missing bearer token.' };
  const local = localIdentity.verifySessionToken(token, options);
  if (local.ok || !token.includes('.')) return local;
  return verifyExternalSkyGateToken(token, options);
}
function requireSkyGate(event, options) {
  const guard = verifySkyGateBearer(event, options);
  return guard.ok ? null : json(guard.statusCode || 401, { ok: false, error: guard.error || 'Unauthorized.' });
}

module.exports = { requireSkyGate, verifySkyGateBearer, localIdentity };
