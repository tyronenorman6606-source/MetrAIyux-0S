/**
 * auth-presence.js — Non-blocking soft auth check
 *
 * Always returns HTTP 200. Apps use this to discover WHO the caller is
 * without gating the response. Use this for:
 *   - personalizing UI when a token is present
 *   - deciding which features to enable
 *   - logging "anonymous vs authenticated" usage
 *
 * Do NOT use this to gate AI calls or metered operations.
 * For those, use the full gateway endpoints which enforce hard auth.
 *
 * Accepts token via:
 *   Authorization: Bearer <token>
 *   x-skye-token: <token>
 *   Body: { "token": "<token>" }
 *   Cookie: skyegate_session=<token>
 *
 * Returns:
 *   { "present": false }                            — no or invalid token
 *   { "present": true, "tier": "api|session|oauth", ...claims }  — valid token
 */

import { wrap } from "./_lib/wrap.js";
import { buildCors, json } from "./_lib/http.js";
import { verifySessionToken } from "./_lib/sessions.js";
import { lookupKey } from "./_lib/authz.js";
import { verifyAccessToken } from "./_lib/oauth.js";
import { AUTH_TIERS } from "./_lib/policy.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });

  const token = extractToken(req);
  if (!token) return json(200, { present: false, tier: AUTH_TIERS.PUBLIC }, cors);

  // Session JWT
  const session = await verifySessionToken(token).catch(() => null);
  if (session) {
    const c = session.payload;
    return json(200, {
      present:     true,
      tier:        AUTH_TIERS.SESSION,
      principal:   "session",
      sub:         c.sub,
      email:       c.email || null,
      customer_id: c.customer_id || null,
      role:        c.role || null,
      scope:       scopeArr(c.scope),
      exp:         c.exp || null
    }, cors);
  }

  // OAuth access token
  const access = await verifyAccessToken(token).catch(() => null);
  if (access) {
    const c = access.payload;
    return json(200, {
      present:     true,
      tier:        AUTH_TIERS.SESSION,
      principal:   "oauth",
      sub:         c.sub,
      email:       c.email || null,
      customer_id: c.customer_id || null,
      role:        c.role || null,
      scope:       scopeArr(c.scope),
      exp:         c.exp || null
    }, cors);
  }

  // API key (kx_live_*)
  if (token.startsWith("kx_live_")) {
    const keyRow = await lookupKey(token).catch(() => null);
    if (keyRow && keyRow.is_active) {
      return json(200, {
        present:     true,
        tier:        AUTH_TIERS.API,
        principal:   "api_key",
        sub:         `api_key:${keyRow.api_key_id}`,
        email:       keyRow.customer_email || null,
        customer_id: keyRow.customer_id,
        role:        keyRow.role || "deployer",
        label:       keyRow.label || null,
        scope:       keyScopes(keyRow)
      }, cors);
    }
  }

  // Token was present but invalid/expired — still 200, just not present
  return json(200, { present: false, tier: AUTH_TIERS.PUBLIC }, cors);
});

function extractToken(req) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();

  const xSkye = req.headers.get("x-skye-token") || req.headers.get("X-Skye-Token") || "";
  if (xSkye) return xSkye.trim();

  const cookie = req.headers.get("cookie") || "";
  const match  = cookie.match(/(?:^|;\s*)skyegate_session=([^;]+)/);
  if (match) return match[1].trim();

  return null;
}

function scopeArr(scope) {
  if (!scope) return [];
  if (Array.isArray(scope)) return scope;
  return String(scope).split(/\s+/).filter(Boolean);
}

function keyScopes(keyRow) {
  const base = ["gateway.invoke", "gateway.read"];
  const role = String(keyRow?.role || "").toLowerCase();
  if (["owner", "admin"].includes(role)) base.push("keys.read", "keys.write", "admin.read", "admin.write");
  return base;
}
