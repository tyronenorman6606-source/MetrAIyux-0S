const DEFAULT_INTROSPECT_PATH = '/auth-introspect';
const DEFAULT_EVENT_PATH = '/platform/events';

function truthy(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

function cleanBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function cleanPath(value, fallback) {
  const path = String(value || fallback).trim();
  if (!path) return fallback;
  return path.startsWith('/') ? path : `/${path}`;
}

function bearerFromReq(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice('Bearer '.length).trim();
}

async function fetchWithTimeout(url, options, timeoutMs) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`Skyegate request timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([fetch(url, options), timeoutPromise]);
  } finally {
    clearTimeout(timeout);
  }
}

function scopeSet(claims = {}) {
  const raw = claims.scope || claims.scopes || '';
  const parts = Array.isArray(raw) ? raw : String(raw).split(/\s+/);
  return new Set(parts.map(value => String(value).trim()).filter(Boolean));
}

export function skyGateConfig() {
  const baseUrl = cleanBaseUrl(process.env.SKYGATEFS13_URL || process.env.SKYGATE_URL);
  const eventSecret = String(
    process.env.SKYGATE_EVENT_MIRROR_SECRET ||
    process.env.SKYGATEFS13_EVENT_MIRROR_SECRET ||
    ''
  ).trim();

  return {
    baseUrl,
    introspectPath: cleanPath(process.env.SKYGATEFS13_INTROSPECT_PATH, DEFAULT_INTROSPECT_PATH),
    eventPath: cleanPath(process.env.SKYGATEFS13_EVENT_PATH, DEFAULT_EVENT_PATH),
    authRequired: truthy(process.env.SKYGATEFS13_AUTH_REQUIRED),
    acceptLegacyAdmin: !truthy(process.env.SKYGATEFS13_DISABLE_LEGACY_ADMIN_TOKEN),
    eventMirrorEnabled: truthy(process.env.SKYGATEFS13_EVENT_MIRROR_ENABLED),
    eventSecretConfigured: !!eventSecret,
    sourceApp: process.env.SKYGATEFS13_SOURCE_APP || 'citadeldb',
    timeoutMs: Number(process.env.SKYGATEFS13_TIMEOUT_MS || 3500)
  };
}

export function skyGateStatus() {
  const config = skyGateConfig();
  return {
    configured: !!config.baseUrl,
    baseUrl: config.baseUrl || null,
    introspectPath: config.introspectPath,
    eventPath: config.eventPath,
    authRequired: config.authRequired,
    acceptLegacyAdmin: config.acceptLegacyAdmin,
    eventMirrorEnabled: config.eventMirrorEnabled,
    eventSecretConfigured: config.eventSecretConfigured,
    sourceApp: config.sourceApp
  };
}

export function hasSkyGateAdminAuthority(claims = {}, req = null) {
  const scopes = scopeSet(claims);
  const role = String(claims.role || '').toLowerCase();
  const method = String(req?.method || 'GET').toUpperCase();
  const readOnly = ['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (['founder', 'owner', 'admin', 'deployer', 'operator'].includes(role)) return true;
  if (readOnly && (scopes.has('gateway.read') || scopes.has('admin.read'))) return true;
  if (scopes.has('admin.write') || scopes.has('gateway.invoke')) return true;
  return false;
}

export async function introspectSkyGateToken(token, { signal } = {}) {
  const config = skyGateConfig();
  if (!config.baseUrl || !token) return { ok: false, active: false, skipped: true, reason: 'not_configured' };

  try {
    const endpoint = new URL(config.introspectPath, `${config.baseUrl}/`).toString();
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
      ...(signal ? { signal } : {})
    }, config.timeoutMs);
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      active: !!data.active,
      claims: data
    };
  } catch (error) {
    return { ok: false, active: false, error: error.message };
  }
}

export async function resolveSkyGateOperator(req) {
  const token = bearerFromReq(req);
  const result = await introspectSkyGateToken(token);
  if (!result.active) return { authorized: false, result };
  if (!hasSkyGateAdminAuthority(result.claims, req)) {
    return { authorized: false, result, reason: 'insufficient_scope' };
  }

  const claims = result.claims || {};
  return {
    authorized: true,
    result,
    operator: {
      id: claims.email || claims.username || claims.sub || 'skygate-operator',
      tenant: claims.org || claims.customer_id || null,
      role: claims.role || claims.client_id || 'skygate',
      source: 'skygatefs13',
      apiKeyId: claims.api_key_id || null,
      sessionId: claims.session_id || null,
      scopes: Array.from(scopeSet(claims))
    }
  };
}

export async function emitSkyGateEvent({ type, actor, orgId = null, workspaceId = null, meta = {} }) {
  const config = skyGateConfig();
  if (!config.baseUrl) return { ok: false, skipped: true, reason: 'not_configured' };
  if (!config.eventMirrorEnabled) return { ok: false, skipped: true, reason: 'disabled' };

  const secret = String(
    process.env.SKYGATE_EVENT_MIRROR_SECRET ||
    process.env.SKYGATEFS13_EVENT_MIRROR_SECRET ||
    ''
  ).trim();
  if (!secret) return { ok: false, skipped: true, reason: 'missing_event_secret' };

  try {
    const endpoint = new URL(config.eventPath, `${config.baseUrl}/`).toString();
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-skygate-mirror-secret': secret
      },
      body: JSON.stringify({
        source_app: config.sourceApp,
        actor: actor || 'citadeldb',
        org_id: orgId,
        ws_id: workspaceId,
        type,
        event_ts: new Date().toISOString(),
        meta
      })
    }, config.timeoutMs);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
