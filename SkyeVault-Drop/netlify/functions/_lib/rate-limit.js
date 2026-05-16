const RATE_STATE = globalThis.__CDV_RATE_STATE__ || {
  buckets: new Map(),
  failedPortalKeys: new Map()
};
globalThis.__CDV_RATE_STATE__ = RATE_STATE;

function now() {
  return Date.now();
}

function getHeader(event, name) {
  const lower = String(name || '').toLowerCase();
  return event?.headers?.[name] || event?.headers?.[lower] || '';
}

export function clientAddress(event) {
  const forwarded = getHeader(event, 'x-forwarded-for');
  const firstForwarded = forwarded ? String(forwarded).split(',')[0].trim() : '';
  return getHeader(event, 'x-nf-client-connection-ip')
    || firstForwarded
    || getHeader(event, 'client-ip')
    || getHeader(event, 'x-real-ip')
    || 'unknown-client';
}

export function requestFingerprint(event, scope = 'default') {
  const ua = getHeader(event, 'user-agent').slice(0, 120);
  return `${scope}:${clientAddress(event)}:${ua}`;
}

function bucketKey(event, bucket) {
  return requestFingerprint(event, bucket);
}

function cleanExpired(map) {
  const time = now();
  for (const [key, value] of map.entries()) {
    if (Number(value.resetAt || 0) <= time) map.delete(key);
  }
}

export function applyRateLimit(event, options = {}) {
  const bucket = options.bucket || 'default';
  const limit = Math.max(1, Number(options.limit || 60));
  const windowMs = Math.max(1000, Number(options.windowMs || 60000));
  const key = bucketKey(event, bucket);
  cleanExpired(RATE_STATE.buckets);
  const current = RATE_STATE.buckets.get(key) || { count: 0, resetAt: now() + windowMs };
  current.count += 1;
  RATE_STATE.buckets.set(key, current);
  if (current.count > limit) {
    const error = new Error(options.message || 'Too many requests. Try again after the rate-limit window resets.');
    error.statusCode = 429;
    error.retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now()) / 1000));
    throw error;
  }
  return {
    key,
    count: current.count,
    limit,
    resetAt: new Date(current.resetAt).toISOString(),
    remaining: Math.max(0, limit - current.count)
  };
}

function portalLockKey(event) {
  return requestFingerprint(event, 'portal-key');
}

export function assertPortalKeyNotLocked(event) {
  cleanExpired(RATE_STATE.failedPortalKeys);
  const record = RATE_STATE.failedPortalKeys.get(portalLockKey(event));
  if (!record) return;
  if (record.lockedUntil && record.lockedUntil > now()) {
    const error = new Error('Too many invalid upload-code attempts. Wait before trying again.');
    error.statusCode = 429;
    error.retryAfterSeconds = Math.max(1, Math.ceil((record.lockedUntil - now()) / 1000));
    throw error;
  }
}

export function recordPortalKeyFailure(event) {
  const maxFailures = Math.max(2, Number(process.env.PORTAL_KEY_MAX_FAILURES || 8));
  const windowMs = Math.max(60000, Number(process.env.PORTAL_KEY_FAILURE_WINDOW_MS || 15 * 60 * 1000));
  const lockMs = Math.max(60000, Number(process.env.PORTAL_KEY_LOCKOUT_MS || 15 * 60 * 1000));
  const key = portalLockKey(event);
  cleanExpired(RATE_STATE.failedPortalKeys);
  const record = RATE_STATE.failedPortalKeys.get(key) || { count: 0, resetAt: now() + windowMs, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= maxFailures) record.lockedUntil = now() + lockMs;
  RATE_STATE.failedPortalKeys.set(key, record);
  return { count: record.count, maxFailures, lockedUntil: record.lockedUntil ? new Date(record.lockedUntil).toISOString() : null };
}

export function recordPortalKeySuccess(event) {
  RATE_STATE.failedPortalKeys.delete(portalLockKey(event));
}

export function assertHoneypot(body = {}) {
  const value = String(body.companyWebsite || body.websiteConfirm || body.extraContact || '').trim();
  if (!value) return;
  const error = new Error('Upload rejected by intake spam protection.');
  error.statusCode = 400;
  throw error;
}

export async function verifyTurnstile(event, body = {}) {
  const secret = String(process.env.TURNSTILE_SECRET_KEY || '').trim();
  if (!secret) return { configured: false, ok: true, skipped: true };
  const token = String(body.turnstileToken || body['cf-turnstile-response'] || '').trim();
  if (!token) {
    const error = new Error('Human verification token is required.');
    error.statusCode = 400;
    throw error;
  }
  const params = new URLSearchParams();
  params.set('secret', secret);
  params.set('response', token);
  const remoteIp = clientAddress(event);
  if (remoteIp && remoteIp !== 'unknown-client') params.set('remoteip', remoteIp);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success !== true) {
    const error = new Error('Human verification failed. Refresh the page and try again.');
    error.statusCode = 403;
    error.turnstile = data;
    throw error;
  }
  return { configured: true, ok: true, hostname: data.hostname || null, action: data.action || null };
}

export function abusePolicySummary() {
  return {
    uploadSessionLimitPerWindow: Number(process.env.UPLOAD_SESSION_RATE_LIMIT || 30),
    uploadSessionWindowMs: Number(process.env.UPLOAD_SESSION_RATE_WINDOW_MS || 10 * 60 * 1000),
    statusLimitPerWindow: Number(process.env.STATUS_RATE_LIMIT || 80),
    statusWindowMs: Number(process.env.STATUS_RATE_WINDOW_MS || 10 * 60 * 1000),
    portalKeyMaxFailures: Number(process.env.PORTAL_KEY_MAX_FAILURES || 8),
    portalKeyFailureWindowMs: Number(process.env.PORTAL_KEY_FAILURE_WINDOW_MS || 15 * 60 * 1000),
    portalKeyLockoutMs: Number(process.env.PORTAL_KEY_LOCKOUT_MS || 15 * 60 * 1000),
    turnstileConfigured: Boolean(String(process.env.TURNSTILE_SECRET_KEY || '').trim())
  };
}
