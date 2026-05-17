import crypto from 'node:crypto';
import { assertPortalKeyNotLocked, recordPortalKeyFailure, recordPortalKeySuccess } from './rate-limit.js';
import { hashWorkspaceKey, loadDeveloperWorkspaces } from './workspace-registry.js';

export function constantTimeEqual(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (!left || !right || left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i += 1) {
    result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return result === 0;
}

export function getHeader(event, name) {
  const headers = event.headers || {};
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return '';
}

export function parseCookies(event) {
  const raw = getHeader(event, 'cookie');
  const cookies = {};
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function operatorSecret() {
  return process.env.OPERATOR_SESSION_SECRET || process.env.ADMIN_TOKEN || '';
}

function operatorSessionHours() {
  const value = Number(process.env.OPERATOR_SESSION_HOURS || 12);
  if (!Number.isFinite(value) || value <= 0) return 12;
  return Math.min(168, Math.max(1, value));
}

function hmac(payload) {
  const secret = operatorSecret();
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function createOperatorSessionCookie(event = null) {
  const issuedAt = Date.now();
  const payload = `v1.${issuedAt}`;
  const signature = hmac(payload);
  const token = `${payload}.${signature}`;
  const maxAge = Math.floor(operatorSessionHours() * 60 * 60);
  const isLocal = String(getHeader(event || {}, 'host')).includes('localhost') || process.env.NETLIFY_DEV === 'true';
  return [
    `cdv_operator=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    isLocal ? '' : 'Secure'
  ].filter(Boolean).join('; ');
}

export function clearOperatorSessionCookie() {
  return 'cdv_operator=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure';
}

export function hasValidOperatorSession(event) {
  const token = parseCookies(event).cdv_operator || '';
  const [version, issuedAtRaw, signature] = token.split('.');
  if (version !== 'v1' || !issuedAtRaw || !signature) return false;
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) return false;
  const maxAgeMs = operatorSessionHours() * 60 * 60 * 1000;
  if (Date.now() - issuedAt > maxAgeMs) return false;
  const expected = hmac(`v1.${issuedAtRaw}`);
  return constantTimeEqual(signature, expected);
}

export function assertAllowedOrigin(event) {
  const allowed = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = getHeader(event, 'origin');
  if (!allowed.length || allowed.includes('*')) return;
  if (!origin) return;
  const host = String(getHeader(event, 'host') || '').split(',')[0].trim();
  const forwardedProto = String(getHeader(event, 'x-forwarded-proto') || 'https').split(',')[0].trim() || 'https';
  const sameSiteOrigins = [
    host ? `${forwardedProto}://${host}` : '',
    host ? `https://${host}` : '',
    process.env.URL,
    process.env.DEPLOY_URL,
    process.env.DEPLOY_PRIME_URL
  ].filter(Boolean);
  const matchesSameSite = sameSiteOrigins.some((sameSiteOrigin) => {
    try {
      const left = new URL(origin);
      const right = new URL(sameSiteOrigin);
      return left.protocol === right.protocol && left.host === right.host;
    } catch {
      return origin === sameSiteOrigin;
    }
  });
  if (!matchesSameSite && !allowed.includes(origin)) {
    const error = new Error('Origin is not allowed for this upload portal.');
    error.statusCode = 403;
    throw error;
  }
}

export function requireAdmin(event) {
  assertAllowedOrigin(event);
  const configured = process.env.ADMIN_TOKEN;
  if (!configured) {
    const error = new Error('ADMIN_TOKEN is not configured.');
    error.statusCode = 500;
    throw error;
  }
  const provided = getHeader(event, 'x-admin-token');
  const headerOk = provided ? constantTimeEqual(provided, configured) : false;
  const sessionOk = hasValidOperatorSession(event);
  if (!headerOk && !sessionOk) {
    const error = new Error('Admin token or protected operator session is invalid or missing.');
    error.statusCode = 401;
    throw error;
  }
}

export function requirePortalKey(event, body = {}) {
  return resolvePortalAccess(event, body);
}

function publicWorkspaceAccess(item) {
  if (!item) return null;
  return {
    type: 'developer-workspace',
    workspaceId: item.workspaceId,
    developerId: item.developerId,
    developerName: item.developerName,
    clientName: item.clientName,
    clientEmail: item.clientEmail,
    projectName: item.projectName,
    destinationId: item.destinationId,
    maxFilesPerSubmission: item.maxFilesPerSubmission,
    maxTotalSubmissionGb: item.maxTotalSubmissionGb,
    maxFileSizeGb: item.maxFileSizeGb,
    rateLimitUploadSessionsPerWindow: item.rateLimitUploadSessionsPerWindow,
    rateLimitStatusPerWindow: item.rateLimitStatusPerWindow,
    rateLimitWindowMs: item.rateLimitWindowMs,
    subscriptionStatus: item.subscriptionStatus,
    planName: item.planName
  };
}

function workspaceKeyMatches(provided, workspace) {
  if (!provided || workspace.active === false) return false;
  if (workspace.key && constantTimeEqual(provided, workspace.key)) return true;
  if (workspace.keyHash && constantTimeEqual(hashWorkspaceKey(provided), workspace.keyHash)) return true;
  return false;
}

export async function resolvePortalAccess(event, body = {}) {
  assertAllowedOrigin(event);
  const configured = process.env.CLIENT_PORTAL_KEY;
  const developerWorkspaces = await loadDeveloperWorkspaces();
  if (!configured && !developerWorkspaces.length) return { type: 'open' };
  assertPortalKeyNotLocked(event);
  const provided = getHeader(event, 'x-portal-key') || body.portalKey;
  for (const workspace of developerWorkspaces) {
    if (workspaceKeyMatches(provided, workspace)) {
      recordPortalKeySuccess(event);
      return publicWorkspaceAccess(workspace);
    }
  }
  if (configured && constantTimeEqual(provided, configured)) {
    recordPortalKeySuccess(event);
    return {
      type: 'portal',
      workspaceId: safeId(body.workspaceId || ''),
      developerId: safeId(body.developerId || ''),
      developerName: cleanText(body.developerName || '', 120)
    };
  }
  if (!constantTimeEqual(provided, configured)) {
    const failure = recordPortalKeyFailure(event);
    const error = new Error(failure.lockedUntil
      ? `Client upload code is invalid. This requester is locked until ${failure.lockedUntil}.`
      : 'Client upload code is invalid or missing.');
    error.statusCode = failure.lockedUntil ? 429 : 401;
    throw error;
  }
}

export function safeFileName(name) {
  const raw = String(name || 'upload.bin').trim();
  const stripped = raw.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').slice(0, 180);
  return stripped || 'upload.bin';
}

export function safeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function cleanText(value, max = 1200) {
  return String(value || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}
