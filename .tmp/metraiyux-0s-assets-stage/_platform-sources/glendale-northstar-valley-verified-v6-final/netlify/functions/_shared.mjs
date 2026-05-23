import { neon, neonConfig } from '@neondatabase/serverless';
import crypto from 'node:crypto';

neonConfig.fetchConnectionCache = true;
const COOKIE_NAME = 'sip_session';
const SESSION_HOURS = Number(process.env.SESSION_HOURS || 12);
const LOGIN_FAIL_LIMIT = Number(process.env.LOGIN_FAIL_LIMIT || 8);
const LOGIN_WINDOW_MINUTES = Number(process.env.LOGIN_WINDOW_MINUTES || 15);

const ROLE_PERMISSIONS = Object.freeze({
  owner: ['read','write','settings','users','audit','backup','provision'],
  admin: ['read','write','settings','users','audit','backup'],
  operator: ['read','write','audit','backup'],
  viewer: ['read','audit']
});

export function getSql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured. Inject your Neon connection string as an environment secret.');
  return neon(process.env.DATABASE_URL);
}

export function json(statusCode, payload, headers = {}) {
  return { statusCode, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, headers), body: JSON.stringify(payload) };
}

export async function readBody(event) {
  if (!event.body) return {};
  const text = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  if (!text.trim()) return {};
  return JSON.parse(text);
}

export function safeText(value, max = 240) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function slugify(value) {
  return safeText(value, 140).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

export function randomToken(bytes = 18) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashValue(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

export function hashIp(event) {
  const raw = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'] || '';
  const ip = String(raw).split(',')[0].trim();
  const pepper = process.env.AUDIT_HASH_PEPPER || process.env.SESSION_SECRET || 'signinpro-local-pepper';
  return ip ? crypto.createHmac('sha256', pepper).update(ip).digest('hex') : '';
}

export function userAgent(event) {
  return safeText(event.headers['user-agent'] || event.headers['User-Agent'] || '', 300);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const iterations = 260000;
  const digest = 'sha256';
  const key = crypto.pbkdf2Sync(String(password || ''), salt, iterations, 32, digest).toString('base64url');
  return `pbkdf2$${digest}$${iterations}$${salt}$${key}`;
}

export function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false;
  const [, digest, iterText, salt, key] = parts;
  const iterations = Number(iterText);
  const actual = crypto.pbkdf2Sync(String(password || ''), salt, iterations, 32, digest).toString('base64url');
  const a = Buffer.from(actual);
  const b = Buffer.from(key);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be configured with at least 32 characters.');
  return secret;
}

export function signSession(payload) {
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const body = Buffer.from(JSON.stringify(Object.assign({}, payload, { exp }))).toString('base64url');
  const sig = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionCookie(event) {
  const cookie = event.headers.cookie || event.headers.Cookie || '';
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const [body, sig] = match[1].split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload.exp || Date.now() > payload.exp) return null;
  return payload;
}

export function sessionCookie(token) {
  const secure = process.env.COOKIE_SECURE === 'false' ? '' : '; Secure';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HOURS * 60 * 60}${secure}`;
}

export function clearCookie() {
  const secure = process.env.COOKIE_SECURE === 'false' ? '' : '; Secure';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function requireOperator(event) {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : (event.headers['x-operator-token'] || event.headers['X-Operator-Token'] || '');
  if (!process.env.OPERATOR_PROVISION_TOKEN || token !== process.env.OPERATOR_PROVISION_TOKEN) {
    throw new Error('Operator provisioning token is missing or invalid.');
  }
}

export function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(session, permission) {
  return permissionsForRole(session && session.user && session.user.role).includes(permission);
}

export function requirePermission(session, permission) {
  if (!hasPermission(session, permission)) {
    const err = new Error(`Role ${session && session.user && session.user.role || 'unknown'} does not have ${permission} permission.`);
    err.statusCode = 403;
    throw err;
  }
}

export function requireRole(session, roles) {
  if (!session || !roles.includes(session.user.role)) {
    const err = new Error(`Role ${session && session.user && session.user.role || 'unknown'} is not allowed.`);
    err.statusCode = 403;
    throw err;
  }
}

export function requireCsrf(event, session) {
  const method = event.httpMethod || 'GET';
  if (!['POST','PUT','PATCH','DELETE'].includes(method)) return;
  const expected = session && session.csrfToken;
  const actual = event.headers['x-csrf-token'] || event.headers['X-CSRF-Token'] || '';
  if (!expected || !actual || expected !== actual) {
    const err = new Error('CSRF token missing or invalid. Refresh the session and try again.');
    err.statusCode = 403;
    throw err;
  }
}

export async function requireSession(event) {
  const cookieSession = verifySessionCookie(event);
  if (!cookieSession || !cookieSession.workspaceId || !cookieSession.userId) return null;
  const sql = getSql();
  const rows = await sql`
    select u.id as user_id, u.email, u.role, u.status as user_status,
           w.id as workspace_id, w.slug, w.name, w.status as workspace_status, w.plan, w.metadata,
           s.branding, s.app_settings, s.security_settings
      from workspace_users u
      join workspaces w on w.id = u.workspace_id
      left join workspace_settings s on s.workspace_id = w.id
     where u.id = ${cookieSession.userId} and w.id = ${cookieSession.workspaceId}
     limit 1
  `;
  const row = rows[0];
  if (!row || row.user_status !== 'active' || row.workspace_status !== 'active') return null;
  const user = { id: row.user_id, email: row.email, role: row.role, permissions: permissionsForRole(row.role) };
  const workspace = { id: row.workspace_id, slug: row.slug, name: row.name, status: row.workspace_status, plan: row.plan, metadata: row.metadata || {}, branding: row.branding || {}, appSettings: row.app_settings || {}, securitySettings: row.security_settings || {} };
  return { user, workspace, csrfToken: cookieSession.csrf || '' };
}

export function sanitizeStateForStore(input, workspace) {
  const state = input && typeof input === 'object' ? input : {};
  const clean = Object.assign({}, state);
  clean.workspace = { id: workspace.id, slug: workspace.slug, name: workspace.name, role: clean.workspace && clean.workspace.role || 'operator' };
  clean.schemaVersion = 3;
  clean.appVersion = safeText(clean.appVersion, 80) || '6.4.0-workspace-closure';
  clean.settings = clean.settings && typeof clean.settings === 'object' ? clean.settings : {};
  clean.attendees = Array.isArray(clean.attendees) ? clean.attendees.slice(0, 25000) : [];
  clean.audit = Array.isArray(clean.audit) ? clean.audit.slice(-1000) : [];
  return clean;
}

export function stateHash(state) {
  return hashValue(JSON.stringify(state || {}));
}

export async function auditEvent(sql, event, session, action, detail = '', data = {}) {
  if (!session || !session.workspace || !action) return;
  await sql`
    insert into workspace_audit_events (workspace_id, user_id, action, detail, data, ip_hash, user_agent)
    values (${session.workspace.id}, ${session.user && session.user.id || null}, ${safeText(action, 120)}, ${safeText(detail, 300)}, ${JSON.stringify(data || {})}::jsonb, ${hashIp(event)}, ${userAgent(event)})
  `;
}

export async function countRecentFailedLogins(sql, event, workspaceSlug, email) {
  const ip = hashIp(event);
  const rows = await sql`
    select count(*)::int as count
      from workspace_login_attempts
     where workspace_slug = ${workspaceSlug}
       and email = ${email}
       and coalesce(ip_hash, '') = ${ip}
       and ok = false
       and created_at > now() - (${LOGIN_WINDOW_MINUTES} || ' minutes')::interval
  `;
  return Number(rows[0] && rows[0].count || 0);
}

export async function recordLoginAttempt(sql, event, workspaceSlug, email, ok, reason = '') {
  await sql`
    insert into workspace_login_attempts (workspace_slug, email, ip_hash, ok, reason)
    values (${workspaceSlug}, ${email}, ${hashIp(event)}, ${ok === true}, ${safeText(reason, 120)})
  `;
}

export function enforceLoginWindow(failCount) {
  if (failCount >= LOGIN_FAIL_LIMIT) {
    const err = new Error(`Too many failed login attempts. Try again later or ask NorthStar to rotate the workspace login.`);
    err.statusCode = 429;
    throw err;
  }
}
