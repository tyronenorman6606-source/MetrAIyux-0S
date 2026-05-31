const DEFAULT_ZERO_OS_ORIGIN = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';

function clean(value = '') {
  return String(value || '').trim();
}

function cleanIdentityKey(value = '') {
  return clean(value).replace(/^\/+|\/+$/g, '');
}

function cleanBearer(value = '') {
  const raw = clean(value);
  return raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : raw;
}

function getHeader(request, name) {
  return request.headers.get(name) || request.headers.get(name.toLowerCase()) || '';
}

function bearerFromRequest(request) {
  return cleanBearer(
    getHeader(request, 'authorization')
    || getHeader(request, 'x-0s-gate-session')
    || getHeader(request, 'x-skye-gate-session')
    || getHeader(request, 'x-skygate-session')
    || getHeader(request, 'x-fs27-session')
  );
}

function fs27Origin() {
  return clean(
    process.env.SKYGATEFS27_ORIGIN
    || process.env.SKYGATE_ORIGIN
    || process.env.ZERO_OS_ORIGIN
    || DEFAULT_ZERO_OS_ORIGIN
  ).replace(/\/+$/, '');
}

function jsonError(status, code, error) {
  return { status, body: { ok: false, code, error } };
}

function scopesFrom(data = {}) {
  const scopeText = data.scope || data.scopes || data.user?.scope || data.skygate?.scope || '';
  const scopes = Array.isArray(scopeText) ? scopeText : String(scopeText || '').split(/\s+/);
  return scopes.map((scope) => clean(scope).toLowerCase()).filter(Boolean);
}

function gateCardsFrom(data = {}) {
  const cards = data.gate_cards || data.cards || data.user?.gate_cards || data.skygate?.gate_cards || [];
  return Array.isArray(cards) ? cards : [];
}

function entitlementsFrom(data = {}) {
  const raw = [
    ...(Array.isArray(data.entitlements) ? data.entitlements : []),
    ...(Array.isArray(data.user?.entitlements) ? data.user.entitlements : []),
    ...(Array.isArray(data.skygate?.entitlements) ? data.skygate.entitlements : []),
    ...gateCardsFrom(data)
  ];
  return raw.map((item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.id || item.key || item.scope || item.entitlement || item.plan || item.name || '';
  }).map((item) => clean(item).toLowerCase()).filter(Boolean);
}

function activeRole(data = {}) {
  return clean(data.role || data.user?.role || data.skygate?.role || '').toLowerCase();
}

function collectAliasValues(value, output) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectAliasValues(entry, output));
    return;
  }
  if (typeof value === 'object') {
    [
      value.id,
      value.sub,
      value.user_id,
      value.customer_id,
      value.netlify_id,
      value.identity_id,
      value.legacy_user_id,
      value.email
    ].forEach((entry) => collectAliasValues(entry, output));
    return;
  }
  const key = cleanIdentityKey(value);
  if (key) output.push(key);
}

function legacyIdentityMapKeys(email = '', mapText = process.env.SKYEVAULTPRO_LEGACY_IDENTITY_MAP || '') {
  if (!clean(email) || !clean(mapText)) return [];
  try {
    const map = JSON.parse(mapText);
    const direct = map[email] || map[clean(email).toLowerCase()] || [];
    const keys = [];
    collectAliasValues(direct, keys);
    return keys;
  } catch {
    return [];
  }
}

function userFromIntrospection(data = {}, token = '') {
  const email = clean(data.email || data.username || data.user?.email || data.skygate?.email || '');
  const sub = clean(data.sub || data.user_id || data.user?.id || data.skygate?.sub || email || 'fs27-user');
  const name = clean(data.name || data.user?.name || data.user?.user_metadata?.full_name || data.skygate?.name || email);
  return {
    sub,
    email,
    name,
    role: activeRole(data),
    scopes: scopesFrom(data),
    entitlements: entitlementsFrom(data),
    gateCards: gateCardsFrom(data),
    token,
    raw: data
  };
}

export function identityKeysForUser(user = {}, legacyMapText = process.env.SKYEVAULTPRO_LEGACY_IDENTITY_MAP || '') {
  const raw = user.raw || {};
  const keys = [];
  [
    user.sub,
    user.email,
    raw.sub,
    raw.user_id,
    raw.customer_id,
    raw.netlify_id,
    raw.identity_id,
    raw.legacy_user_id,
    raw.email,
    raw.username,
    raw.user?.id,
    raw.user?.sub,
    raw.user?.email,
    raw.user?.app_metadata?.netlify_id,
    raw.user?.app_metadata?.identity_id,
    raw.user?.app_metadata?.legacy_user_id,
    raw.user?.user_metadata?.netlify_id,
    raw.user?.user_metadata?.identity_id,
    raw.user?.user_metadata?.legacy_user_id,
    raw.skygate?.sub,
    raw.skygate?.user_id,
    raw.skygate?.customer_id,
    raw.skygate?.email
  ].forEach((value) => collectAliasValues(value, keys));
  [
    raw.identity_aliases,
    raw.aliases,
    raw.user?.identity_aliases,
    raw.user?.aliases,
    raw.user?.app_metadata?.identity_aliases,
    raw.user?.user_metadata?.identity_aliases,
    raw.skygate?.identity_aliases,
    raw.skygate?.aliases,
    legacyIdentityMapKeys(user.email || raw.email || raw.user?.email || raw.skygate?.email, legacyMapText)
  ].forEach((value) => collectAliasValues(value, keys));

  return [...new Set(keys)];
}

export function primaryIdentityKey(user = {}) {
  return identityKeysForUser(user)[0] || cleanIdentityKey(user.sub || user.email || 'fs27-user');
}

export function fs27AuthErrorResponse(error) {
  const payload = error?.body || { ok: false, code: 'fs27_auth_failed', error: error?.message || 'FS27/SkyGate session required.' };
  return new Response(JSON.stringify(payload), {
    status: error?.status || 401,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export async function requireFs27User(request) {
  const token = bearerFromRequest(request);
  if (!token) throw jsonError(401, 'fs27_gate_session_required', 'Shared FS27/SkyGate session is required.');
  const origin = fs27Origin();
  const paths = [
    '/api/skygate/auth-introspect',
    '/auth-introspect',
    '/auth/introspect',
    '/.netlify/functions/auth-introspect'
  ];
  let last = null;
  for (const path of paths) {
    const response = await fetch(`${origin}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ token })
    }).catch((error) => {
      last = { status: 502, body: { ok: false, code: 'fs27_introspection_fetch_failed', error: error.message } };
      return null;
    });
    if (!response) continue;
    const data = await response.json().catch(() => ({ ok: false, error: 'Invalid FS27/SkyGate response.' }));
    last = { status: response.status, body: data };
    if (response.status === 404) continue;
    if (!response.ok || data.active !== true) {
      throw jsonError(response.ok ? 401 : response.status, data.code || 'fs27_gate_session_inactive', data.error || 'FS27/SkyGate session is inactive.');
    }
    return userFromIntrospection(data.skygate || data, token);
  }
  throw jsonError(last?.status || 503, last?.body?.code || 'fs27_introspection_unavailable', last?.body?.error || 'FS27/SkyGate introspection is unavailable.');
}

export function hasVaultBackupEntitlement(user = {}) {
  const role = clean(user.role).toLowerCase();
  if (['founder', 'owner', 'admin'].includes(role)) return true;
  const values = new Set([
    ...(user.scopes || []),
    ...(user.entitlements || [])
  ].map((value) => clean(value).toLowerCase()));
  return [
    'skyevaultpro-sovereign-backup',
    'skyevaultpro.backup',
    'skyevaultpro.backup.write',
    'vault.backup',
    'sovereign-backup'
  ].some((key) => values.has(key));
}
