const { json, getBearer, getCookie } = require("./http.js");

const COOKIE_NAME = "sol_staffing_auth";

function cleanToken(value) {
  return String(value || "").replace(/^Bearer\s+/i, "").trim();
}

function publicClaims(claims) {
  if (!claims) return null;
  return {
    active: Boolean(claims.active),
    sub: claims.sub || claims.username || claims.email || null,
    email: claims.email || claims.username || null,
    username: claims.username || claims.email || null,
    role: claims.role || null,
    scope: claims.scope || "",
    org: claims.org || claims.customer_id || null,
    customer_id: claims.customer_id || null,
    session_id: claims.session_id || null,
    source: "skyegate-fs27"
  };
}

function configuredIntrospectionUrl() {
  return process.env.SKYGATE_FS27_INTROSPECT_URL ||
    process.env.SKYEGATE_FS27_INTROSPECT_URL ||
    process.env.SKYGATE_INTROSPECT_URL ||
    process.env.SKYEGATE_INTROSPECT_URL ||
    "";
}

async function introspectToken(token) {
  const clean = cleanToken(token);
  if (!clean) return null;

  const devToken = cleanToken(process.env.SOL_STAFFING_DEV_TOKEN);
  if (devToken && clean === devToken) {
    return {
      active: true,
      sub: "local-dev",
      email: process.env.SOL_STAFFING_DEV_EMAIL || "operator@localhost",
      username: process.env.SOL_STAFFING_DEV_EMAIL || "operator@localhost",
      role: process.env.SOL_STAFFING_DEV_ROLE || "admin",
      scope: "admin.read admin.write staffing.read staffing.write",
      org: "local",
      source: "dev-token"
    };
  }

  const url = configuredIntrospectionUrl();
  if (!url) return null;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: clean })
  });

  if (!res.ok) return null;
  const claims = await res.json().catch(() => null);
  if (!claims || !claims.active) return null;
  return claims;
}

async function authFromEvent(event) {
  const token = cleanToken(getBearer(event) || getCookie(event, COOKIE_NAME));
  if (!token) return { token: "", claims: null };
  const claims = await introspectToken(token);
  return { token, claims: claims ? publicClaims(claims) : null };
}

function allowedRoles() {
  return String(process.env.SOL_STAFFING_ADMIN_ROLES || "owner,admin,operator")
    .split(",")
    .map(role => role.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAuth(event, options = {}) {
  const { claims, token } = await authFromEvent(event);
  if (!claims || !claims.active) {
    return { ok: false, response: json(401, { error: "Skyegate FS27 auth required" }) };
  }

  if (options.admin) {
    const role = String(claims.role || "").toLowerCase();
    if (!allowedRoles().includes(role)) {
      return { ok: false, response: json(403, { error: "Admin role required", role: claims.role || null }) };
    }
  }

  return { ok: true, claims, token };
}

function sessionCookie(token, maxAgeSeconds = 28800) {
  const secure = process.env.NETLIFY ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(cleanToken(token))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

module.exports = {
  COOKIE_NAME,
  authFromEvent,
  cleanToken,
  clearSessionCookie,
  introspectToken,
  publicClaims,
  requireAuth,
  sessionCookie
};
