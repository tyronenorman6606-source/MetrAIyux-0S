const jwt = require("jsonwebtoken");
const { query } = require("./_db");
const { requireEnv, randomToken } = require("./_utils");

function cleanOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getHeader(event, name) {
  const wanted = String(name || "").toLowerCase();
  const headers = event.headers || {};
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === wanted) return String(value || "");
  }
  return "";
}

function getBearer(event) {
  const h = getHeader(event, "authorization");
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

function fs27Origin() {
  return cleanOrigin(process.env.SKYGATEFS27_ORIGIN || process.env.SKYGATE_ORIGIN || "");
}

function mirrorSecret() {
  return String(process.env.SKYGATE_EVENT_MIRROR_SECRET || process.env.SKYGATEFS27_EVENT_MIRROR_SECRET || "").trim();
}

function normalizeScope(scope) {
  if (Array.isArray(scope)) return scope.map(String).filter(Boolean);
  return String(scope || "").split(/\s+/).map((v) => v.trim()).filter(Boolean);
}

function hasAnyScope(claims, wanted = []) {
  const scopes = new Set(normalizeScope(claims?.scope).map((scope) => scope.toLowerCase()));
  return wanted.some((scope) => scopes.has(String(scope).toLowerCase()));
}

function isAdminLike(claims = {}) {
  const role = String(claims.role || "").toLowerCase();
  return ["founder", "owner", "admin", "operator"].includes(role)
    || hasAnyScope(claims, ["admin.read", "admin.write", "mail.admin", "skymail.admin"]);
}

async function introspectToken(token) {
  const origin = fs27Origin();
  if (!origin) {
    const err = new Error("SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN env var missing.");
    err.statusCode = 501;
    throw err;
  }
  const cleanToken = String(token || "").replace(/^Bearer\s+/i, "").trim();
  if (!cleanToken) {
    const err = new Error("Missing FS27 bearer token.");
    err.statusCode = 401;
    throw err;
  }

  const paths = ["/auth-introspect", "/auth/introspect", "/.netlify/functions/auth-introspect"];
  let last = null;
  for (const path of paths) {
    const res = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: cleanToken })
    });
    const data = await res.json().catch(() => ({ active: false, error: "Invalid FS27 response." }));
    last = { status: res.status, data, path };
    if (res.status === 404) continue;
    if (!res.ok || data.active !== true) {
      const err = new Error(data.error || "FS27 token is inactive.");
      err.statusCode = res.ok ? 401 : res.status;
      err.skygate = data;
      throw err;
    }
    return { ...data, _introspection_path: path };
  }

  const err = new Error(`FS27 introspection endpoint was not found at ${origin}.`);
  err.statusCode = last?.status || 404;
  throw err;
}

async function requireFs27(event, options = {}) {
  const claims = await introspectToken(getBearer(event));
  if (options.admin && !isAdminLike(claims)) {
    const err = new Error("FS27 token is active but not admin/operator scoped for SkyeMail.");
    err.statusCode = 403;
    throw err;
  }
  if (Array.isArray(options.anyScope) && options.anyScope.length && !hasAnyScope(claims, options.anyScope)) {
    const err = new Error(`FS27 token is missing required scope: ${options.anyScope.join(" or ")}`);
    err.statusCode = 403;
    throw err;
  }
  return claims;
}

function slugHandle(value) {
  return String(value || "skymail-user")
    .toLowerCase()
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28) || "skymail-user";
}

async function uniqueHandle(base) {
  const root = slugHandle(base);
  for (let i = 0; i < 25; i += 1) {
    const candidate = i ? `${root.slice(0, 24)}-${i}` : root;
    const res = await query("select 1 from users where lower(handle)=lower($1) limit 1", [candidate]);
    if (!res.rows.length) return candidate;
  }
  return `${root.slice(0, 18)}-${randomToken(4).toLowerCase()}`;
}

async function ensureSkyeMailUser(claims = {}) {
  const email = String(claims.email || claims.username || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    const err = new Error("FS27 token must include an email/username email before SkyeMail can create a workspace user.");
    err.statusCode = 400;
    throw err;
  }

  const existing = await query("select id, handle, email from users where lower(email)=lower($1) limit 1", [email]);
  if (existing.rows.length) return existing.rows[0];

  const handle = await uniqueHandle(email);
  const passwordHash = `fs27:${claims.sub || claims.session_id || randomToken(16)}`;
  const inserted = await query(
    `insert into users(handle, email, password_hash)
     values($1,$2,$3)
     returning id, handle, email`,
    [handle, email, passwordHash]
  );
  return inserted.rows[0];
}

function mintSkyeMailSession(user, claims = {}) {
  const secret = requireEnv("JWT_SECRET");
  return jwt.sign({
    sub: user.id,
    handle: user.handle,
    email: user.email,
    auth_provider: "skygatefs27",
    fs27_sub: claims.sub || null,
    fs27_customer_id: claims.customer_id || claims.org || null,
    fs27_role: claims.role || null
  }, secret, { expiresIn: "14d" });
}

async function mirrorPlatformEvent(payload = {}) {
  const origin = fs27Origin();
  const secret = mirrorSecret();
  if (!origin || !secret) return { ok: false, skipped: true, reason: "FS27 origin or mirror secret is not configured." };
  const res = await fetch(`${origin}/platform/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-skygate-mirror-secret": secret
    },
    body: JSON.stringify({
      source_app: process.env.SKYGATE_SOURCE_APP || "skymail",
      actor: payload.actor || "skymail",
      org_id: payload.org_id || null,
      ws_id: payload.ws_id || null,
      type: payload.type || "skymail.event",
      event_ts: payload.event_ts || new Date().toISOString(),
      meta: payload.meta || {}
    })
  });
  const data = await res.json().catch(() => ({ ok: res.ok, status: res.status }));
  return { ok: res.ok, status: res.status, data };
}

module.exports = {
  fs27Origin,
  mirrorSecret,
  getBearer,
  introspectToken,
  requireFs27,
  isAdminLike,
  ensureSkyeMailUser,
  mintSkyeMailSession,
  mirrorPlatformEvent
};
