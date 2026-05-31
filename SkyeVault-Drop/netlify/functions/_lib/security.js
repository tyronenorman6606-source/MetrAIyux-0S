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
  const configured = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowed = configured.length ? Array.from(new Set([...configured, ...defaultFirstPartyOrigins()])) : configured;
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

function defaultFirstPartyOrigins() {
  return [
    process.env.METRAIYUX_0S_ORIGIN,
    process.env.METRAIYUX_0S_WORKER_ORIGIN,
    process.env.SKYEVAULT_0S_ORIGIN,
    'https://metraiyux-0s-full-system.graylondonskyes.workers.dev',
    'https://skyevault-drop.graylondonskyes.workers.dev',
    'https://skyevault-drop.netlify.app',
    process.env.URL,
    process.env.DEPLOY_URL,
    process.env.DEPLOY_PRIME_URL
  ].map((origin) => String(origin || '').trim().replace(/\/+$/, '')).filter(Boolean);
}

function workerEnv() {
  return globalThis.__SKYEVAULT_WORKER_ENV || {};
}

function stripBearer(value) {
  return String(value || '').replace(/^Bearer\s+/i, '').trim();
}

const GATE_COOKIE_NAMES = [
  'metraiyux_admin_session',
  'skye_gate_session',
  'skygate_session',
  'skyegate_session',
  'metraiyux_gate_session',
  'free99_gate_session',
  'zero_os_gate_session'
];

function gateCredentialCandidates(event) {
  const cookies = parseCookies(event);
  return [
    getHeader(event, 'authorization'),
    getHeader(event, 'x-admin-token'),
    getHeader(event, 'x-skye-gate-session'),
    getHeader(event, 'x-skygate-session'),
    getHeader(event, 'x-free99-gate-session'),
    getHeader(event, 'x-free99-admin-code'),
    ...GATE_COOKIE_NAMES.map((name) => cookies[name] || '')
  ].map(stripBearer).filter(Boolean);
}

function bearerToken(event) {
  const cookies = parseCookies(event);
  const raw = getHeader(event, 'authorization')
    || getHeader(event, 'x-skye-gate-session')
    || getHeader(event, 'x-skygate-session')
    || getHeader(event, 'x-free99-gate-session')
    || GATE_COOKIE_NAMES.map((name) => cookies[name] || '').find(Boolean)
    || '';
  return stripBearer(raw);
}

const SHARED_GATE_CREDENTIAL_ENV_NAMES = [
  'ZERO_OS_GATE_CODE',
  'ZERO_OS_ADMIN_CODE',
  'ZERO_OS_OWNER_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'METRAIYUX_ADMIN_CODE',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'FREE99_GATE_CODE',
  'FREE99_GATE_PASSWORD',
  'FREE99_OWNER_CODE',
  'FREE99_OWNER_PASSWORD',
  'FS27_ADMIN_CODE',
  'FS27_ADMIN_PASSWORD',
  'FS27_OWNER_CODE',
  'FS27_OWNER_PASSWORD',
  'SKYGATE_ADMIN_CODE',
  'SKYGATE_ADMIN_PASSWORD',
  'SKYGATE_OWNER_CODE',
  'SKYGATE_OWNER_PASSWORD',
  'SKYGATEFS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'SKYGATEFS27_OWNER_CODE',
  'SKYGATEFS27_OWNER_PASSWORD',
  'SKYE_GATE_ADMIN_CODE',
  'SKYE_GATE_ADMIN_PASSWORD',
  'SKYE_GATE_OWNER_CODE',
  'SKYE_GATE_OWNER_PASSWORD'
];

function rawEnvValue(name) {
  const value = process.env[name] ?? workerEnv()[name] ?? '';
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function resolvedEnvValue(name, seen = new Set()) {
  if (seen.has(name)) return '';
  seen.add(name);
  const value = rawEnvValue(name);
  const reference = /^\$\{([A-Z0-9_]+)\}$/.exec(value);
  if (reference) return resolvedEnvValue(reference[1], seen);
  return value;
}

function sharedGateCredentialValues() {
  return Array.from(new Set(SHARED_GATE_CREDENTIAL_ENV_NAMES
    .map((name) => resolvedEnvValue(name))
    .filter((value) => value && !/^\$\{[^}]+\}$/.test(value))));
}

function matchesSharedGateCredential(token) {
  const provided = stripBearer(token);
  if (!provided) return false;
  return sharedGateCredentialValues().some((candidate) => constantTimeEqual(provided, candidate));
}

function sharedGateCredentialFromEvent(event) {
  return gateCredentialCandidates(event).find((candidate) => matchesSharedGateCredential(candidate)) || '';
}

function skygateOrigin() {
  return String(
    process.env.SKYGATEFS27_ORIGIN
    || process.env.SKYEGATEFS27_URL
    || process.env.FS27_LIVE_BASE
    || process.env.SKYGATE_ORIGIN
    || 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev'
  ).replace(/\/+$/, '');
}

async function skygateFetch(path, token) {
  const body = JSON.stringify({ token });
  const init = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body
  };
  const binding = workerEnv().SKYGATEFS27_WORKER;
  if (binding?.fetch) {
    return binding.fetch(new Request(`https://skyegatefs27.internal${path}`, init));
  }
  return fetch(`${skygateOrigin()}${path}`, init);
}

function zeroOsOrigin() {
  return String(
    process.env.METRAIYUX_0S_ORIGIN
    || process.env.METRAIYUX_0S_WORKER_ORIGIN
    || process.env.ZERO_OS_BASE_URL
    || process.env.ZERO_OS_ORIGIN
    || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev'
  ).replace(/\/+$/, '');
}

async function zeroOsOwnerSessionFetch(token) {
  return fetch(`${zeroOsOrigin()}/api/owner/admin-session`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      'x-skye-gate-session': token,
      'x-free99-gate-session': token
    }
  });
}

function scopeList(scope) {
  if (Array.isArray(scope)) return scope.map(String).filter(Boolean);
  return String(scope || '').split(/\s+/).filter(Boolean);
}

function emailAllowlist() {
  return String(
    process.env.SKYEVAULT_ADMIN_EMAILS
    || process.env.METRAIYUX_0S_SKYGATE_ADMIN_EMAILS
    || process.env.SKYGATE_ADMIN_EMAILS
    || process.env.METRAIYUX_ADMIN_EMAILS
    || process.env.ADMIN_EMAILS
    || ''
  ).split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
}

function allowsSkyeVaultAdmin(claims = {}) {
  if (!claims.active && !claims.ok) return false;
  const role = String(claims.role || claims.user?.role || '').toLowerCase();
  const scopes = new Set(scopeList(claims.scope || claims.scopes || claims.user?.scope).map((scope) => scope.toLowerCase()));
  const email = String(claims.email || claims.username || claims.user?.email || '').toLowerCase();
  const allowedEmails = emailAllowlist();
  return ['founder', 'owner', 'admin', 'deployer', 'operator'].includes(role)
    || scopes.has('admin.write')
    || scopes.has('admin.read')
    || scopes.has('keys.write')
    || scopes.has('gateway.invoke')
    || scopes.has('skyevault.admin')
    || scopes.has('vault.admin')
    || scopes.has('vault.download')
    || (allowedEmails.length > 0 && allowedEmails.includes(email));
}

function publicAdminActor(type, claims = {}) {
  const scopes = scopeList(claims.scope || claims.scopes || claims.user?.scope);
  const email = cleanText(claims.email || claims.username || claims.user?.email || '', 180).toLowerCase();
  const subject = cleanText(claims.sub || claims.user_id || claims.userId || claims.user?.id || email || type, 180);
  const gateCard = claims.gate_card || {};
  return {
    type,
    actor: email || subject || type,
    subject,
    email,
    role: cleanText(claims.role || claims.user?.role || '', 80).toLowerCase(),
    customerId: safeId(claims.customer_id || claims.customerId || claims.org || gateCard.customer_id || ''),
    workspaceId: safeId(claims.workspace_id || claims.workspaceId || claims.ws_id || ''),
    sessionId: cleanText(claims.session_id || claims.sid || gateCard.session_id || '', 160),
    apiKeyId: cleanText(claims.api_key_id || claims.apiKeyId || '', 160),
    gateCardId: cleanText(claims.gate_card_id || gateCard.id || '', 160),
    scopes
  };
}

export async function introspectSkygateBearer(event) {
  const token = bearerToken(event);
  if (!token) return { ok: false, statusCode: 401, error: 'Missing FS27 bearer token.' };
  const paths = ['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'];
  let last = null;
  for (const path of paths) {
    try {
      const response = await skygateFetch(path, token);
      const data = await response.json().catch(() => ({ active: false, error: 'Invalid FS27 introspection response.' }));
      last = { response, data, path };
      if (response.status === 404) continue;
      const ok = response.ok && data.active === true;
      return {
        ok,
        active: Boolean(data.active),
        statusCode: ok ? 200 : (response.ok ? 401 : response.status),
        path,
        claims: data,
        error: ok ? '' : (data.error || 'FS27 bearer is inactive or not accepted.')
      };
    } catch (error) {
      last = { error, path };
    }
  }
  return {
    ok: false,
    active: false,
    statusCode: 401,
    path: last?.path || '',
    claims: last?.data || null,
    error: last?.error?.message || `FS27 introspection endpoint was not reachable at ${skygateOrigin()}.`
  };
}

export async function introspectZeroOsOwnerBearer(event) {
  const token = bearerToken(event);
  if (!token) return { ok: false, statusCode: 401, error: 'Missing 0S owner bearer token.' };
  try {
    const response = await zeroOsOwnerSessionFetch(token);
    const data = await response.json().catch(() => ({ ok: false, authenticated: false, error: 'Invalid 0S owner session response.' }));
    const user = data.user || data.session?.user || data.identity || {};
    const role = cleanText(data.role || user.role || 'owner', 80).toLowerCase();
    const email = cleanText(data.email || user.email || data.identity?.email || '', 180).toLowerCase();
    const subject = cleanText(data.subject || user.id || user.sub || email || 'zero-os-owner-session', 180);
    const ok = response.ok && (data.authenticated === true || data.ok === true);
    return {
      ok,
      active: ok,
      statusCode: ok ? 200 : (response.ok ? 401 : response.status),
      path: '/api/owner/admin-session',
      claims: {
        active: ok,
        ok,
        role,
        email,
        sub: subject,
        session_id: cleanText(data.sessionId || data.sid || data.session?.id || '', 160),
        scope: ['admin.read', 'admin.write', 'keys.write', 'gateway.invoke', 'skyevault.admin'],
        user: { role, email, id: subject }
      },
      error: ok ? '' : (data.error || '0S owner session is inactive or not accepted.')
    };
  } catch (error) {
    return {
      ok: false,
      active: false,
      statusCode: 401,
      path: '/api/owner/admin-session',
      claims: null,
      error: error.message || `0S owner session endpoint was not reachable at ${zeroOsOrigin()}.`
    };
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

export async function requireAdminAccess(event) {
  assertAllowedOrigin(event);
  if (sharedGateCredentialFromEvent(event)) {
    return publicAdminActor('shared-0s-gate', {
      active: true,
      ok: true,
      role: 'owner',
      sub: 'shared-0s-gate',
      scope: ['admin.read', 'admin.write', 'keys.write', 'gateway.invoke', 'skyevault.admin']
    });
  }

  const bearer = bearerToken(event);
  if (bearer) {
    let gate = await introspectSkygateBearer(event);
    if (!gate.ok) {
      const zeroOs = await introspectZeroOsOwnerBearer(event);
      if (zeroOs.ok) gate = zeroOs;
      else {
        const error = new Error(gate.error || zeroOs.error || 'FS27 bearer is invalid or inactive.');
        error.statusCode = gate.statusCode || zeroOs.statusCode || 401;
        throw error;
      }
    }
    if (!allowsSkyeVaultAdmin(gate.claims)) {
      const zeroOs = gate.path === '/api/owner/admin-session' ? gate : await introspectZeroOsOwnerBearer(event);
      if (zeroOs.ok && allowsSkyeVaultAdmin(zeroOs.claims)) {
        gate = zeroOs;
      } else {
        const error = new Error('Shared gate bearer is active, but it is not admin-scoped for SkyeVault.');
        error.statusCode = 403;
        throw error;
      }
    }
    return publicAdminActor(gate.path === '/api/owner/admin-session' ? 'zero-os-owner-session' : 'fs27-skygate', gate.claims);
  }

  const configured = process.env.ADMIN_TOKEN;
  const provided = getHeader(event, 'x-admin-token');
  if (configured && provided && constantTimeEqual(provided, configured)) {
    return publicAdminActor('legacy-admin-token', { role: 'admin', sub: 'legacy-admin-token' });
  }
  if (hasValidOperatorSession(event)) {
    return publicAdminActor('operator-session', { role: 'admin', sub: 'operator-session' });
  }

  const error = new Error('Admin token, protected operator session, or FS27 admin bearer is invalid or missing.');
  error.statusCode = 401;
  throw error;
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
    repoPushPlan: item.repoPushPlan,
    repoPushMode: item.repoPushMode,
    repoPushesPerWindow: item.repoPushesPerWindow,
    repoPushWindowDays: item.repoPushWindowDays,
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

function ownerAdminPortalAccess(body = {}, admin = {}) {
  return {
    type: 'owner-admin',
    workspaceId: safeId(body.workspaceId || admin.workspaceId || 'owner-admin'),
    developerId: safeId(body.developerId || admin.subject || admin.actor || 'owner-admin'),
    developerName: cleanText(body.developerName || admin.email || admin.actor || 'Owner Admin', 120),
    clientName: cleanText(body.clientName || 'Owner Admin', 180),
    clientEmail: cleanText(body.clientEmail || admin.email || 'owner-admin@metraiyux.local', 180).toLowerCase(),
    projectName: cleanText(body.projectName || 'Owner Admin Vault', 180),
    maxFilesPerSubmission: 1000000,
    maxTotalSubmissionGb: 5000,
    maxFileSizeGb: 5000,
    repoPushPlan: 'owner-unlimited',
    repoPushMode: 'unlimited',
    repoPushesPerWindow: 0,
    repoPushWindowDays: 30,
    subscriptionStatus: 'active',
    planName: 'owner-admin-unlimited',
    admin
  };
}

export async function resolvePortalAccess(event, body = {}) {
  assertAllowedOrigin(event);
  const adminMaterial = gateCredentialCandidates(event);
  if (adminMaterial.length) {
    const sharedGateToken = sharedGateCredentialFromEvent(event);
    if (matchesSharedGateCredential(sharedGateToken)) {
      recordPortalKeySuccess(event);
      return ownerAdminPortalAccess(body, publicAdminActor('shared-0s-gate', {
        role: 'owner',
        sub: 'shared-0s-gate',
        scope: ['skyevault.admin', 'gateway.invoke']
      }));
    }
    try {
      const admin = await requireAdminAccess(event);
      recordPortalKeySuccess(event);
      return ownerAdminPortalAccess(body, admin);
    } catch {
      // A non-admin bearer may still be paired with a valid portal key below.
    }
  }
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
      developerName: cleanText(body.developerName || '', 120),
      maxTotalSubmissionGb: Number(process.env.SKYEVAULT_DEFAULT_PORTAL_MAX_TOTAL_GB || process.env.SKYEVAULT_DEFAULT_REPO_PUSH_GB || 50),
      maxFileSizeGb: Number(process.env.SKYEVAULT_DEFAULT_PORTAL_MAX_FILE_GB || process.env.SKYEVAULT_DEFAULT_REPO_PUSH_GB || 50),
      repoPushPlan: process.env.SKYEVAULT_DEFAULT_PORTAL_REPO_PLAN || 'repo-standard',
      repoPushMode: 'metered',
      repoPushesPerWindow: Number(process.env.SKYEVAULT_DEFAULT_REPO_PUSHES_PER_WINDOW || 1),
      repoPushWindowDays: Number(process.env.SKYEVAULT_REPO_PUSH_WINDOW_DAYS || 30)
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
