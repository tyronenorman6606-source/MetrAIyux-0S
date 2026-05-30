const crypto = require('crypto');
const { canonicalize } = require('./export-import');
const {
  cleanCredential,
  extractGateCredentialFromHeaders,
  verifyGateRequest,
  verifyGateCredentialSync,
  buildGateHeaders
} = require('./fs27-gate');

function stableHex(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(canonicalize(value))).digest('hex');
}

function disabledRecord(reason) {
  return canonicalize({
    schema: 'skye.fs27.auth.disabled-local-credential',
    version: '1.0.0',
    ok: false,
    reason,
    auth_owner: 'FS27/SkyGate/Free99 shared gate'
  });
}

function hashPassphrase() {
  return disabledRecord('app-local-passphrase-hashing-removed');
}

function verifyPassphrase() {
  return false;
}

function issueAccessToken(claims = {}) {
  const token = cleanCredential(claims.gate_session || claims.access_token || claims.token || '');
  if (!token) throw new Error('FS27/SkyGate gate session required. This copied app no longer mints local access tokens.');
  return token;
}

function verifyAccessToken(token, _secret, _nowSeconds, options = {}) {
  return verifyGateCredentialSync(token, options.env || process.env);
}

function issueRefreshToken() {
  return canonicalize({
    schema: 'skye.fs27.refresh.disabled',
    version: '1.0.0',
    ok: false,
    token: null,
    reason: 'FS27/SkyGate owns refresh and session rotation for mounted 0S apps.'
  });
}

function verifyRefreshToken() {
  return canonicalize({
    schema: 'skye.fs27.refresh.verification',
    version: '1.0.0',
    ok: false,
    issues: ['local-refresh-disabled'],
    reason: 'Use the shared FS27/SkyGate session instead of app refresh tokens.'
  });
}

function parseBearerToken(headerValue = '') {
  const match = /^Bearer\s+(.+)$/i.exec(String(headerValue || '').trim());
  return match ? cleanCredential(match[1]) : null;
}

module.exports = {
  stableHex,
  hashPassphrase,
  verifyPassphrase,
  issueAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  parseBearerToken,
  extractGateCredentialFromHeaders,
  verifyGateRequest,
  verifyGateCredentialSync,
  buildGateHeaders
};
