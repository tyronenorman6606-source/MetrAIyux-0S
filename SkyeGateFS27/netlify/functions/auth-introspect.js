import { wrap } from "./_lib/wrap.js";
import { buildCors, json, badRequest } from "./_lib/http.js";
import { getSessionById, verifySessionToken } from "./_lib/sessions.js";
import { lookupKey } from "./_lib/authz.js";
import { verifyAccessToken } from "./_lib/oauth.js";
import { getUserById } from "./_lib/identity.js";

/**
 * Token introspection endpoint - RFC 7662 compatible
 * Allows downstream systems (like QuantumSkyes) to validate Skyegate tokens
 *
 * Request:
 *   POST /auth-introspect
 *   Content-Type: application/json
 *   { "token": "Bearer <jwt_or_session_token>" }
 *
 * Response (if valid):
 *   {
 *     "active": true,
 *     "scope": "openid profile email gateway.read",
 *     "client_id": "system",
 *     "username": "user@example.com",
 *     "token_type": "Bearer",
 *     "exp": 1234567890,
 *     "iat": 1234567800,
 *     "sub": "user_123",
 *     "aud": "skyegatefs27",
 *     "customer_id": "cust_123",
 *     "session_id": "session_123",
 *     "api_key_id": "key_123",
 *     "email": "user@example.com",
 *     "email_verified": true
 *   }
 *
 * Response (if invalid):
 *   { "active": false }
 */
export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  let body;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON", cors); }

  const token = (body.token || "").toString().trim();
  if (!token) return json(200, { active: false }, cors);

  // Strip Bearer prefix if present
  const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;

  const session = await verifySessionToken(cleanToken);
  if (session) {
    const claims = session.payload;
    return json(200, {
      active: true,
      scope: scopeString(claims.scope),
      client_id: claims.client_id || "system",
      username: claims.email || claims.sub,
      token_type: "Bearer",
      exp: claims.exp,
      iat: claims.iat,
      sub: claims.sub,
      role: claims.role || session.user?.role || null,
      sub_type: claims.sub_type || null,
      aud: claims.aud,
      customer_id: claims.customer_id,
      session_id: claims.sid,
      api_key_id: claims.api_key_id,
      email: claims.email,
      email_verified: claims.email_verified,
      org: claims.customer_id
    }, cors);
  }

  const access = await verifyAccessToken(cleanToken);
  if (access) {
    const claims = access.payload;
    if (claims.sid) {
      const sessionRow = await getSessionById(claims.sid);
      if (!sessionRow || sessionRow.revoked_at || new Date(sessionRow.expires_at).getTime() <= Date.now()) {
        return json(200, { active: false }, cors);
      }
    }
    if (claims.sub_type === "user" && claims.sub) {
      const user = await getUserById(claims.sub);
      if (!user || !user.is_active) return json(200, { active: false }, cors);
    }
    return json(200, {
      active: true,
      scope: scopeString(claims.scope),
      client_id: claims.client_id || "oauth",
      username: claims.email || claims.sub,
      token_type: "Bearer",
      exp: claims.exp,
      iat: claims.iat,
      sub: claims.sub,
      role: claims.role || null,
      sub_type: claims.sub_type || null,
      aud: claims.aud,
      customer_id: claims.customer_id,
      session_id: claims.sid,
      api_key_id: claims.api_key_id,
      email: claims.email,
      email_verified: claims.email_verified,
      org: claims.customer_id
    }, cors);
  }

  // Check if it's an API key that starts with kx_live_
  if (cleanToken.startsWith("kx_live_")) {
    const keyRow = await lookupKey(cleanToken);
    if (!keyRow || !keyRow.is_active) return json(200, { active: false }, cors);
    return json(200, {
      active: true,
      scope: keyScopeString(keyRow),
      client_id: "kx_live",
      username: keyRow.customer_email || `customer:${keyRow.customer_id}`,
      token_type: "Bearer",
      sub: `api_key:${keyRow.api_key_id}`,
      customer_id: keyRow.customer_id,
      api_key_id: keyRow.api_key_id,
      org: keyRow.customer_id,
      role: keyRow.role || "deployer"
    }, cors);
  }

  return json(200, { active: false }, cors);
});

function scopeString(scope) {
  if (!scope) return "";
  if (Array.isArray(scope)) return scope.map(String).filter(Boolean).join(" ");
  return String(scope);
}

function keyScopeString(keyRow) {
  const base = ["gateway.invoke", "gateway.read"];
  const role = String(keyRow?.role || "").toLowerCase();
  if (role === "owner" || role === "admin") {
    base.push("keys.read", "keys.write", "admin.read", "admin.write");
  }
  return base.join(" ");
}
