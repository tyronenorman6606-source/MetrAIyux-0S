import crypto from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { query } from './db.js';

let jwks;

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function usernameFromEmail(email) {
  return cleanEmail(email).split('@')[0].replace(/[^a-zA-Z0-9-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 39) || 'user';
}

function parseList(value) {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  return String(value || '').split(',').map((v) => v.trim()).filter(Boolean);
}

function safeEqualString(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function apiKeyFromRequest(req) {
  const headerKey = req.header('x-s13-api-key');
  if (headerKey) return headerKey.trim();
  const bearer = (req.header('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer && bearer.startsWith('s13_')) return bearer.trim();
  return null;
}

export function adminEmails() {
  return parseList(process.env.ADMIN_EMAILS).map(cleanEmail);
}

export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'admin_required' });
  }
  next();
}

export function requireScope(scope) {
  return function scoped(req, res, next) {
    const scopes = Array.isArray(req.user?.scopes) ? req.user.scopes : [];
    if (req.user?.isAdmin || scopes.includes(scope) || scopes.includes('*')) return next();
    return res.status(403).json({ error: 'scope_required', scope });
  };
}

export function requireGateSecret(req) {
  const requiredSecret = process.env.TRUSTED_HEADER_AUTH_SECRET || process.env.GATE_SHARED_SECRET;
  const secretHeader = process.env.AUTH_GATE_SECRET_HEADER || 'x-s13-gate-secret';
  if (!requiredSecret || requiredSecret.startsWith('CHANGE_ME')) {
    const error = new Error('Trusted-header auth is enabled but TRUSTED_HEADER_AUTH_SECRET is not configured. Put the control plane behind the gate and set the shared secret.');
    error.status = 500;
    error.code = 'trusted_header_secret_missing';
    throw error;
  }
  const supplied = req.header(secretHeader);
  if (!supplied || !safeEqualString(supplied, requiredSecret)) {
    const error = new Error('Trusted-header auth rejected: missing or invalid gate secret header.');
    error.status = 401;
    error.code = 'gate_secret_invalid';
    throw error;
  }
}

export async function authenticate(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({ error: 'auth_required', message: 'Request must come through the upstream gate, carry a valid JWT, or use a SoveReign13 API key.' });
    }
    const admins = adminEmails();
    const roles = Array.isArray(user.roles) ? user.roles : [];
    user.isAdmin = Boolean(user.isAdmin || admins.includes(cleanEmail(user.email)) || roles.includes('admin') || roles.includes('owner'));
    req.user = user;
    next();
  } catch (error) {
    res.status(error.status || 401).json({ error: error.code || 'auth_invalid', message: error.message });
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    req.user = await resolveUser(req);
  } catch {
    req.user = null;
  }
  next();
}

async function resolveApiKey(req) {
  const raw = apiKeyFromRequest(req);
  if (!raw) return null;
  if (!raw.startsWith('s13_') || raw.length < 20) {
    const error = new Error('Malformed SoveReign13 API key');
    error.status = 401;
    error.code = 'api_key_malformed';
    throw error;
  }
  const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const result = await query(
    `SELECT k.*, a.slug AS account_slug, a.owner_email AS account_owner_email, a.status AS account_status, a.suspended_at AS account_suspended_at
     FROM api_keys k
     LEFT JOIN accounts a ON a.id = k.account_id
     WHERE k.key_hash=$1 AND k.revoked_at IS NULL
     LIMIT 1`,
    [keyHash]
  );
  const record = result.rows[0];
  if (!record) {
    const error = new Error('Invalid or revoked SoveReign13 API key');
    error.status = 401;
    error.code = 'api_key_invalid';
    throw error;
  }
  if (record.account_id && record.account_suspended_at) {
    const error = new Error('Account API key rejected because the account is suspended.');
    error.status = 403;
    error.code = 'account_suspended';
    throw error;
  }
  await query('UPDATE api_keys SET last_used_at=now() WHERE id=$1', [record.id]);
  const scopes = Array.isArray(record.scopes) ? record.scopes : [];
  const email = cleanEmail(record.created_by_email || record.account_owner_email || 'api-key@soveReign13.local');
  return {
    sub: `api-key:${record.id}`,
    email,
    username: `api-${record.prefix}`,
    name: record.name,
    roles: scopes.includes('admin') ? ['admin'] : ['api'],
    scopes,
    authMethod: 'api-key',
    apiKeyId: record.id,
    accountId: record.account_id || null,
    isAdmin: scopes.includes('admin') || scopes.includes('*')
  };
}

async function resolveUser(req) {
  const apiKeyUser = await resolveApiKey(req);
  if (apiKeyUser) return apiKeyUser;

  if (String(process.env.AUTH_MODE || '').toLowerCase() === 'dev') {
    const email = cleanEmail(req.header('x-dev-email') || process.env.DEV_AUTH_EMAIL || 'operator@example.com');
    return {
      sub: req.header('x-dev-sub') || `dev:${email}`,
      email,
      username: req.header('x-dev-username') || usernameFromEmail(email),
      name: req.header('x-dev-name') || email,
      roles: parseList(req.header('x-dev-roles') || 'admin'),
      authMethod: 'dev-header'
    };
  }

  if (String(process.env.TRUSTED_HEADER_AUTH || '').toLowerCase() === 'true') {
    const email = cleanEmail(req.header(process.env.AUTH_EMAIL_HEADER || 'x-s13-user-email'));
    if (email) {
      requireGateSecret(req);
      return {
        sub: req.header(process.env.AUTH_SUBJECT_HEADER || 'x-s13-user-id') || email,
        email,
        username: req.header(process.env.AUTH_USERNAME_HEADER || 'x-s13-user-name') || usernameFromEmail(email),
        name: req.header(process.env.AUTH_DISPLAY_NAME_HEADER || 'x-s13-user-display-name') || email,
        roles: parseList(req.header(process.env.AUTH_ROLES_HEADER || 'x-s13-user-roles')),
        authMethod: 'trusted-header'
      };
    }
  }

  const bearer = (req.header('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer && process.env.AUTH_JWKS_URL) {
    if (!jwks) jwks = createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL));
    const options = {};
    if (process.env.AUTH_ISSUER) options.issuer = process.env.AUTH_ISSUER;
    if (process.env.AUTH_AUDIENCE) options.audience = process.env.AUTH_AUDIENCE;
    const { payload } = await jwtVerify(bearer, jwks, options);
    const email = cleanEmail(payload.email || payload.preferred_username);
    if (!email) throw new Error('JWT did not contain email/preferred_username');
    return {
      sub: payload.sub,
      email,
      username: payload.nickname || payload.preferred_username || usernameFromEmail(email),
      name: payload.name || email,
      roles: Array.isArray(payload.roles) ? payload.roles : parseList(payload.roles || payload.groups),
      authMethod: 'jwt'
    };
  }

  return null;
}
