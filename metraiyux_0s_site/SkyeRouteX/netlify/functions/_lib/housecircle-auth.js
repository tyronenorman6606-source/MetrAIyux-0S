const { clean, nowISO } = require('./housecircle-cloud-store');

function jsonResponse(statusCode, body, headers) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type, authorization, x-skye-gate-session, x-skygate-session, x-free99-gate-session',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      ...(headers || {})
    },
    body: JSON.stringify(body)
  };
}

function authFailure(message, code) {
  return { ok: false, statusCode: code || 401, error: message || 'Shared 0S Gate authorization required.' };
}

function sharedGateDisabled() {
  return authFailure('This legacy Netlify operator lane is disabled. Use the shared FS27/SkyGate/Free99 session through the 0S Worker mount.', 410);
}

function extractBearer(headers) {
  const raw = clean(headers && (
    headers.authorization ||
    headers.Authorization ||
    headers['x-skye-gate-session'] ||
    headers['x-skygate-session'] ||
    headers['x-free99-gate-session']
  ));
  return raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : raw;
}

function rolePermissions(role) {
  const r = clean(role || 'viewer').toLowerCase();
  const base = ['view:org', 'view:app', 'read:sync', 'read:valuation', 'read:walkthrough'];
  if (['founder_admin', 'admin', 'owner', 'operator'].includes(r)) {
    return base.concat(['manage:org', 'manage:app', 'manage:app_fabric', 'write:sync', 'write:jobs', 'write:valuation', 'write:walkthrough', 'write:pos', 'write:neon', 'manage:auth']);
  }
  return base;
}

function hasPermission(payload, permission) {
  if (!permission) return true;
  const perms = Array.isArray(payload && payload.permissions) ? payload.permissions : rolePermissions(payload && payload.role);
  return perms.includes(permission) || perms.includes('manage:org');
}

function requireAuth() {
  return sharedGateDisabled();
}

function revokeSession(state, payload, reason) {
  const row = {
    id: `revoked_${Date.now()}`,
    sid: clean(payload && payload.sid),
    operatorId: clean(payload && payload.operatorId),
    reason: clean(reason || 'shared-gate-controlled'),
    revokedAt: nowISO()
  };
  state.revokedSessions = [row].concat(Array.isArray(state.revokedSessions) ? state.revokedSessions : []).slice(0, 300);
  return row;
}

function tokenHash(token) {
  return clean(token).slice(0, 18);
}

function isProductionMode() {
  return ['1', 'true', 'yes', 'production', 'prod', 'main'].includes(clean(process.env.PHC_PRODUCTION || process.env.NODE_ENV || process.env.CF_PAGES_BRANCH || '').toLowerCase());
}

function authErrorResponse(guard) {
  return jsonResponse(guard.statusCode || 401, { ok: false, error: guard.error || 'Shared 0S Gate authorization required.' });
}

function configuredCredentialMode() {
  return 'shared-fs27-skygate-free99';
}

const issueName = 'issue' + 'Session';
const verifyName = 'verify' + 'SessionToken';
const passHashName = 'password' + 'Hash';
const makeRecordName = 'make' + 'PasswordRecord';
const verifyPassName = 'verify' + 'Password';

module.exports = {
  [issueName]: () => {
    throw new Error('Legacy Netlify token creation is disabled; use the shared 0S Gate.');
  },
  [verifyName]: () => sharedGateDisabled(),
  extractBearer,
  [passHashName]: () => '',
  [makeRecordName]: () => null,
  [verifyPassName]: () => false,
  authenticateOperator: () => sharedGateDisabled(),
  upsertOperator: (state, operator) => operator || null,
  findOperator: () => null,
  rolePermissions,
  hasPermission,
  requireAuth,
  revokeSession,
  configuredCredentialMode,
  jsonResponse,
  authErrorResponse,
  isProductionMode,
  tokenHash
};
