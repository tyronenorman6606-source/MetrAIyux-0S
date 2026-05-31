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
  return process.env.OPERATOR_SESSION_SECRET || '';
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

function encodeSessionPayload(value = {}) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeSessionPayload(value = '') {
  try {
    return JSON.parse(Buffer.from(String(value || ''), 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function operatorSessionClaimsFromActor(admin = {}, issuedAt = Date.now()) {
  const expiresAt = issuedAt + operatorSessionHours() * 60 * 60 * 1000;
  return {
    v: 2,
    iat: issuedAt,
    exp: expiresAt,
    actor: cleanText(admin.actor || admin.email || admin.subject || 'skyevault-owner', 180),
    sub: cleanText(admin.subject || admin.actor || admin.email || 'skyevault-owner', 180),
    email: cleanText(admin.email || '', 180).toLowerCase(),
    role: cleanText(admin.role || 'owner', 80).toLowerCase(),
    auth_type: cleanText(admin.type || 'fs27-skygate', 80),
    customer_id: safeId(admin.customerId || ''),
    workspace_id: safeId(admin.workspaceId || ''),
    session_id: cleanText(admin.sessionId || '', 160),
    api_key_id: cleanText(admin.apiKeyId || '', 160),
    gate_card_id: cleanText(admin.gateCardId || '', 160),
    scope: scopeList(admin.scopes || ['admin.read', 'admin.write', 'keys.write', 'gateway.invoke', 'skyevault.admin'])
  };
}

export function createOperatorSessionCookie(event = null, admin = {}) {
  const issuedAt = Date.now();
  const payload = `v2.${encodeSessionPayload(operatorSessionClaimsFromActor(admin, issuedAt))}`;
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

export function operatorSessionClaims(event) {
  const token = parseCookies(event).cdv_operator || '';
  const [version, payloadRaw, signature] = token.split('.');
  if (!version || !payloadRaw || !signature) return null;

  if (version === 'v2') {
    const expected = hmac(`v2.${payloadRaw}`);
    if (!constantTimeEqual(signature, expected)) return null;
    const claims = decodeSessionPayload(payloadRaw);
    if (!claims || claims.v !== 2) return null;
    const expiresAt = Number(claims.exp || 0);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
    return claims;
  }

  if (version === 'v1') {
    const issuedAt = Number(payloadRaw);
    if (!Number.isFinite(issuedAt) || issuedAt <= 0) return null;
    const maxAgeMs = operatorSessionHours() * 60 * 60 * 1000;
    if (Date.now() - issuedAt > maxAgeMs) return null;
    const expected = hmac(`v1.${payloadRaw}`);
    if (!constantTimeEqual(signature, expected)) return null;
    return {
      v: 1,
      iat: issuedAt,
      exp: issuedAt + maxAgeMs,
      actor: 'skyevault-fs27-bound-operator-session',
      sub: 'skyevault-fs27-bound-operator-session',
      role: 'owner',
      auth_type: 'fs27-bound-operator-session',
      scope: ['admin.read', 'admin.write', 'keys.write', 'gateway.invoke', 'skyevault.admin'],
      legacy: true
    };
  }

  return null;
}

export function hasValidOperatorSession(event) {
  return Boolean(operatorSessionClaims(event));
}

export function hasValidFs27BoundOperatorSession(event) {
  const claims = operatorSessionClaims(event);
  if (!claims || claims.legacy) return false;
  return claims.v === 2 && Boolean(claims.auth_type);
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
  'METRAIYUX_GATE_SESSION',
  'SKYGATEFS27_GATE_SESSION',
  'SKYE_GATE_SESSION',
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
    || getHeader(event, 'x-admin-token')
    || getHeader(event, 'x-free99-admin-code')
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

function actorRole(claims = {}) {
  return String(claims.role || claims.user?.role || '').toLowerCase();
}

function actorScopes(claims = {}) {
  return new Set(scopeList(claims.scope || claims.scopes || claims.user?.scope).map((scope) => scope.toLowerCase()));
}

function actorEmail(claims = {}) {
  return String(claims.email || claims.username || claims.user?.email || '').toLowerCase();
}

function isPrivilegedRole(role) {
  return ['founder', 'owner', 'admin', 'deployer', 'operator'].includes(role);
}

function isAllowlistedEmail(email) {
  const allowedEmails = emailAllowlist();
  return allowedEmails.length > 0 && allowedEmails.includes(email);
}

function allowsSkyeVaultAdminWrite(claims = {}) {
  if (!claims.active && !claims.ok) return false;
  const role = actorRole(claims);
  const scopes = actorScopes(claims);
  const email = actorEmail(claims);
  return isPrivilegedRole(role)
    || scopes.has('admin.write')
    || scopes.has('keys.write')
    || scopes.has('gateway.invoke')
    || scopes.has('skyevault.admin')
    || scopes.has('vault.admin')
    || isAllowlistedEmail(email);
}

function allowsSkyeVaultAdminRead(claims = {}) {
  if (!claims.active && !claims.ok) return false;
  const scopes = actorScopes(claims);
  return allowsSkyeVaultAdminWrite(claims) || scopes.has('admin.read');
}

function allowsSkyeVaultDownload(claims = {}) {
  if (!claims.active && !claims.ok) return false;
  const scopes = actorScopes(claims);
  return allowsSkyeVaultAdminRead(claims) || scopes.has('vault.download');
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
  const error = new Error('SkyeVault admin access requires the shared FS27/SkyGate bearer via requireAdminAccess.');
  error.statusCode = 503;
  throw error;
}

function accessAllowedForLevel(claims, level) {
  if (level === 'download') return allowsSkyeVaultDownload(claims);
  if (level === 'read') return allowsSkyeVaultAdminRead(claims);
  return allowsSkyeVaultAdminWrite(claims);
}

function accessErrorForLevel(level) {
  if (level === 'download') return 'Shared gate bearer is active, but it is not vault-download-scoped for SkyeVault.';
  if (level === 'read') return 'Shared gate bearer is active, but it is not admin-read-scoped for SkyeVault.';
  return 'Shared gate bearer is active, but it is not admin-write-scoped for SkyeVault.';
}

export async function requireAdminAccess(event, options = {}) {
  assertAllowedOrigin(event);
  const level = options.level || 'write';
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
    if (!accessAllowedForLevel(gate.claims, level)) {
      const zeroOs = gate.path === '/api/owner/admin-session' ? gate : await introspectZeroOsOwnerBearer(event);
      if (zeroOs.ok && accessAllowedForLevel(zeroOs.claims, level)) {
        gate = zeroOs;
      } else {
        const error = new Error(accessErrorForLevel(level));
        error.statusCode = 403;
        throw error;
      }
    }
    return publicAdminActor(gate.path === '/api/owner/admin-session' ? 'zero-os-owner-session' : 'fs27-skygate', gate.claims);
  }

  const operatorClaims = operatorSessionClaims(event);
  if (operatorClaims && !operatorClaims.legacy && accessAllowedForLevel({ ...operatorClaims, active: true, ok: true }, level)) {
    return publicAdminActor('fs27-bound-operator-session', {
      active: true,
      ok: true,
      role: operatorClaims.role || 'owner',
      email: operatorClaims.email || '',
      sub: operatorClaims.sub || operatorClaims.actor || 'skyevault-fs27-bound-operator-session',
      customer_id: operatorClaims.customer_id || '',
      workspace_id: operatorClaims.workspace_id || '',
      session_id: operatorClaims.session_id || '',
      api_key_id: operatorClaims.api_key_id || '',
      gate_card_id: operatorClaims.gate_card_id || '',
      scope: operatorClaims.scope || ['admin.read', 'admin.write', 'keys.write', 'gateway.invoke', 'skyevault.admin']
    });
  }

  const error = new Error('Shared FS27/SkyGate admin bearer is invalid or missing.');
  error.statusCode = 401;
  throw error;
}

export function requireAdminReadAccess(event) {
  return requireAdminAccess(event, { level: 'read' });
}

export function requireVaultDownloadAccess(event) {
  return requireAdminAccess(event, { level: 'download' });
}

export function adminAuditDetails(admin = {}, extra = {}) {
  return {
    actor: admin.actor || '',
    authType: admin.type || '',
    subject: admin.subject || '',
    email: admin.email || '',
    workspaceId: admin.workspaceId || '',
    customerId: admin.customerId || '',
    gateCardId: admin.gateCardId || '',
    sessionId: admin.sessionId || '',
    apiKeyId: admin.apiKeyId || '',
    ...extra
  };
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
