const { canonicalize } = require('./export-import');

const GATE_HEADER_NAMES = [
  'authorization',
  'x-admin-token',
  'x-free99-admin-code',
  'x-free99-gate-session',
  'x-skye-gate-session',
  'x-skygate-session',
  'x-skye-gate-token'
];

const SHARED_TOKEN_ENV_NAMES = [
  'MCP_GATE_SESSION',
  'QUANTUMSKYES_MCP_TOKEN',
  'FS27_GATE_SESSION',
  'SKYGATEFS27_GATE_SESSION',
  'SKYE_GATE_SESSION',
  'FREE99_GATE_SESSION',
  'ZERO_OS_GATE_SESSION',
  'SKYENET_AUTH',
  'OWNER_ADMIN_SESSION'
];

function cleanCredential(value) {
  return String(value || '').replace(/^Bearer\s+/i, '').trim();
}

function headerValue(headers = {}, name) {
  const wanted = String(name || '').toLowerCase();
  if (typeof headers.get === 'function') return headers.get(name) || headers.get(wanted) || '';
  for (const [key, value] of Object.entries(headers || {})) {
    if (String(key).toLowerCase() === wanted) return Array.isArray(value) ? value[0] : value;
  }
  return '';
}

function parseCookies(cookieHeader = '') {
  return String(cookieHeader || '').split(';').map((part) => part.trim()).filter(Boolean).reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index > 0) acc[part.slice(0, index)] = decodeURIComponent(part.slice(index + 1));
    return acc;
  }, {});
}

function extractGateCredentialFromHeaders(headers = {}) {
  const authorization = headerValue(headers, 'authorization');
  const bearer = cleanCredential(authorization);
  if (bearer && /^Bearer\s+/i.test(String(authorization))) return bearer;
  for (const name of GATE_HEADER_NAMES.filter((item) => item !== 'authorization')) {
    const value = cleanCredential(headerValue(headers, name));
    if (value) return value;
  }
  const cookies = parseCookies(headerValue(headers, 'cookie'));
  for (const name of ['METRAIYUX_GATE_SESSION', 'SKYGATEFS27_GATE_SESSION', 'SKYE_GATE_SESSION', 'owner_admin_session']) {
    const raw = cookies[name];
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const token = cleanCredential(parsed.token || parsed.session || raw);
      if (token) return token;
    } catch {
      const token = cleanCredential(raw);
      if (token) return token;
    }
  }
  return '';
}

function configuredSharedTokens(env = process.env) {
  return SHARED_TOKEN_ENV_NAMES
    .map((name) => cleanCredential(env[name]))
    .filter((value, index, all) => value && all.indexOf(value) === index);
}

function safeJson(text) {
  try { return JSON.parse(text || '{}'); } catch { return { raw: text || '' }; }
}

function normalizeGateIdentity(data = {}, fallback = {}) {
  const source = data.skygate || data.gate || data.identity || data.user || data;
  const email = source.email || source.username || source.user?.email || fallback.email || '';
  const role = source.role || source.user?.role || fallback.role || 'gate-user';
  const scopes = Array.isArray(source.scope) ? source.scope : String(source.scope || source.scopes || '').split(/\s+/).filter(Boolean);
  return canonicalize({
    id: source.sub || source.id || email || fallback.id || 'fs27-gate-session',
    email,
    role,
    scopes,
    source: source.source || fallback.source || 'fs27-skygate'
  });
}

function localSharedVerification(credential, env = process.env) {
  const token = cleanCredential(credential);
  const shared = configuredSharedTokens(env);
  if (!token) {
    return canonicalize({ schema: 'skye.fs27.gate.verification', version: '1.0.0', ok: false, status: 401, issues: ['missing-gate-session'], via: 'local-shared-token' });
  }
  if (shared.includes(token)) {
    return canonicalize({
      schema: 'skye.fs27.gate.verification',
      version: '1.0.0',
      ok: true,
      active: true,
      status: 200,
      issues: [],
      via: 'local-shared-token',
      identity: normalizeGateIdentity({}, { id: 'shared-0s-gate-session', role: 'operator', source: 'root-env-shared-gate' })
    });
  }
  return canonicalize({
    schema: 'skye.fs27.gate.verification',
    version: '1.0.0',
    ok: false,
    active: false,
    status: 401,
    issues: ['not-a-configured-shared-gate-session'],
    via: 'local-shared-token'
  });
}

function resolveIntrospectionUrl(env = process.env) {
  return cleanCredential(
    env.SKYE_GATE_INTROSPECT_URL
    || env.FS27_AUTH_INTROSPECT_URL
    || env.SKYGATE_INTROSPECT_URL
    || (env.METRAIYUX_0S_WORKER_ORIGIN ? `${String(env.METRAIYUX_0S_WORKER_ORIGIN).replace(/\/+$/, '')}/api/skygate/auth-introspect` : '')
    || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skygate/auth-introspect'
  );
}

async function introspectGateCredential(credential, options = {}) {
  const env = options.env || process.env;
  const token = cleanCredential(credential);
  const local = localSharedVerification(token, env);
  if (local.ok) return local;
  const introspectionUrl = options.introspectionUrl || resolveIntrospectionUrl(env);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (!token || !introspectionUrl || typeof fetchImpl !== 'function') return local;
  try {
    const response = await fetchImpl(introspectionUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'x-skye-gate-session': token,
        'x-free99-gate-session': token
      },
      body: JSON.stringify({ source: 'devisional-riftx', purpose: 'copied-platform-fs27-auth' })
    });
    const text = await response.text();
    const data = safeJson(text);
    const active = data.ok === true || data.active === true;
    return canonicalize({
      schema: 'skye.fs27.gate.verification',
      version: '1.0.0',
      ok: response.ok && active,
      active,
      status: response.status,
      issues: response.ok && active ? [] : [data.error || 'fs27-introspection-rejected'],
      via: 'fs27-introspection',
      identity: active ? normalizeGateIdentity(data) : null,
      skygate: data
    });
  } catch (error) {
    return canonicalize({
      schema: 'skye.fs27.gate.verification',
      version: '1.0.0',
      ok: false,
      active: false,
      status: 503,
      issues: ['fs27-introspection-unavailable'],
      error: error.message,
      via: 'fs27-introspection'
    });
  }
}

async function verifyGateRequest(req, env = process.env, options = {}) {
  const credential = extractGateCredentialFromHeaders(req.headers || req);
  return introspectGateCredential(credential, { ...options, env });
}

function verifyGateCredentialSync(credential, env = process.env) {
  return localSharedVerification(credential, env);
}

function buildGateHeaders(credential, extra = {}) {
  const token = cleanCredential(credential);
  return {
    ...extra,
    ...(token ? { authorization: `Bearer ${token}`, 'x-skye-gate-session': token, 'x-free99-gate-session': token } : {}),
  };
}

module.exports = {
  GATE_HEADER_NAMES,
  SHARED_TOKEN_ENV_NAMES,
  cleanCredential,
  extractGateCredentialFromHeaders,
  configuredSharedTokens,
  introspectGateCredential,
  verifyGateRequest,
  verifyGateCredentialSync,
  buildGateHeaders,
  normalizeGateIdentity
};
