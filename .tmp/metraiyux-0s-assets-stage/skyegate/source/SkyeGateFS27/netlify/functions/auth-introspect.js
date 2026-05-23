import { wrap } from "./_lib/wrap.js";
import crypto from "crypto";
import { buildCors, json, badRequest } from "./_lib/http.js";
import { verifyJwt } from "./_lib/crypto.js";
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

  const adminJwt = verifyJwt(cleanToken);
  if (adminJwt && String(adminJwt.role || "").toLowerCase() === "admin") {
    const scopes = ["admin.read", "admin.write", "keys.write", "gateway.invoke", "skyevault.admin"];
    return json(200, {
      active: true,
      scope: scopes.join(" "),
      client_id: adminJwt.client_id || "fs27-admin",
      username: adminJwt.email || adminJwt.user_id || "fs27-admin",
      token_type: "Bearer",
      exp: adminJwt.exp,
      iat: adminJwt.iat,
      sub: adminJwt.user_id || adminJwt.sub || "fs27-admin",
      role: "admin",
      sub_type: adminJwt.user_id ? "user" : "admin",
      aud: adminJwt.aud || "skyegatefs27",
      customer_id: adminJwt.customer_id || null,
      session_id: adminJwt.sid || null,
      api_key_id: adminJwt.api_key_id || null,
      email: adminJwt.email || null,
      email_verified: Boolean(adminJwt.email),
      org: adminJwt.customer_id || null,
      via: adminJwt.via || "admin-jwt",
      gate_card_id: gateCardId(adminJwt.user_id || adminJwt.sub || "fs27-admin", adminJwt.email, adminJwt.customer_id),
      gate_card: gateCard({
        sub: adminJwt.user_id || adminJwt.sub || "fs27-admin",
        email: adminJwt.email || null,
        customerId: adminJwt.customer_id || null,
        role: "admin",
        sessionId: adminJwt.sid || null,
        scope: scopes,
        principal: adminJwt.via || "admin-jwt"
      })
    }, cors);
  }

  const session = await verifySessionToken(cleanToken);
  if (session) {
    const claims = session.payload;
    if (session.session?.session_kind === "password_reset" || session.user?.password_reset_required || claims.password_reset_required) {
      return json(200, {
        active: false,
        password_reset_required: true,
        scope: scopeString(claims.scope),
        token_type: "Bearer",
        sub: claims.sub,
        role: claims.role || session.user?.role || null,
        sub_type: claims.sub_type || null,
        customer_id: claims.customer_id,
        session_id: claims.sid,
        email: claims.email,
        email_verified: claims.email_verified,
        reason: "password_reset_required"
      }, cors);
    }
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
      org: claims.customer_id,
      gate_card_id: gateCardId(claims.sub, claims.email, claims.customer_id),
      gate_card: gateCard({
        sub: claims.sub,
        email: claims.email,
        customerId: claims.customer_id,
        role: claims.role || session.user?.role || null,
        sessionId: claims.sid,
        scope: scopeArr(claims.scope),
        principal: "session"
      })
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
      if (user.password_reset_required || claims.password_reset_required) {
        return json(200, {
          active: false,
          password_reset_required: true,
          scope: scopeString(claims.scope),
          token_type: "Bearer",
          sub: claims.sub,
          role: claims.role || user.role || null,
          sub_type: claims.sub_type || null,
          customer_id: claims.customer_id,
          session_id: claims.sid,
          email: claims.email || user.email,
          email_verified: claims.email_verified,
          reason: "password_reset_required"
        }, cors);
      }
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
      org: claims.customer_id,
      gate_card_id: gateCardId(claims.sub, claims.email, claims.customer_id),
      gate_card: gateCard({
        sub: claims.sub,
        email: claims.email,
        customerId: claims.customer_id,
        role: claims.role || null,
        sessionId: claims.sid,
        scope: scopeArr(claims.scope),
        principal: "oauth"
      })
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
      exp: keyRow.expires_at ? Math.floor(new Date(keyRow.expires_at).getTime() / 1000) : null,
      sub: `api_key:${keyRow.api_key_id}`,
      customer_id: keyRow.customer_id,
      api_key_id: keyRow.api_key_id,
      org: keyRow.customer_id,
      role: keyRow.role || "deployer",
      vault_storage_mb: keyRow.customer_vault_storage_mb || null,
      vault_file_limit: keyRow.customer_vault_file_limit || null,
      vault_workspace_limit: keyRow.customer_vault_workspace_limit || null,
      limits: {
        vault_storage_mb: keyRow.customer_vault_storage_mb || null,
        vault_file_limit: keyRow.customer_vault_file_limit || null,
        vault_workspace_limit: keyRow.customer_vault_workspace_limit || null
      },
      gate_card_id: gateCardId(`api_key:${keyRow.api_key_id}`, keyRow.customer_email, keyRow.customer_id),
      gate_card: gateCard({
        sub: `api_key:${keyRow.api_key_id}`,
        email: keyRow.customer_email || null,
        customerId: keyRow.customer_id,
        role: keyRow.role || "deployer",
        scope: keyScopeString(keyRow).split(/\s+/).filter(Boolean),
        principal: "api_key",
        expiresAt: keyRow.expires_at || null,
        metadata: keyRow.key_metadata || {}
      })
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

function scopeArr(scope) {
  if (!scope) return [];
  if (Array.isArray(scope)) return scope.map(String).filter(Boolean);
  return String(scope).split(/\s+/).filter(Boolean);
}

function gateCardId(sub, email, customerId) {
  const seed = [sub, email, customerId].filter(Boolean).join("|") || "skyegatefs27";
  return `gate_basic_${crypto.createHash("sha256").update(seed).digest("hex").slice(0, 20)}`;
}

function gateCard({ sub, email, customerId, role, sessionId = null, scope = [], principal = "session", expiresAt = null, metadata = {} }) {
  const cardType = metadata?.card_type === "pentest_hour_key" ? "pentest_gate_card" : "basic_gate_card";
  const cardId = cardType === "pentest_gate_card"
    ? gateCardId(sub, email, customerId).replace("gate_basic_", "gate_pentest_")
    : gateCardId(sub, email, customerId);
  return {
    id: cardId,
    type: cardType,
    status: "active",
    principal,
    sub,
    email: email || null,
    customer_id: customerId || null,
    role: role || "user",
    session_id: sessionId,
    scope,
    expires_at: expiresAt,
    metadata,
    usage_required: false,
    reloadable: true
  };
}
