import { wrap } from "./_lib/wrap.js";
import { buildCors, json, badRequest, getClientIp, getUserAgent } from "./_lib/http.js";
import { audit } from "./_lib/audit.js";
import { getDefaultApiKeyIdForUser } from "./_lib/identity.js";
import { ensureSystemClient, issueRefreshToken } from "./_lib/oauth.js";
import { normalizeGateId, verifyPinCredential } from "./_lib/pinAuth.js";
import { buildAuthMeResponse, createSession, touchSession } from "./_lib/sessions.js";

function splitCombined(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 14) return { gate_id: "", pin: "" };
  return { gate_id: digits.slice(0, 10), pin: digits.slice(10) };
}

export default wrap(async (req) => {
  const cors = buildCors(req);
  const issuer = new URL(req.url).origin;
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  let body;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON", cors); }

  const combined = splitCombined(body.credential || body.gate_pin || "");
  const gateId = normalizeGateId(body.gate_id || combined.gate_id);
  const pin = (body.pin || combined.pin || "").toString();
  if (!gateId || !pin) return badRequest("Missing gate_id and pin", cors);

  const verified = await verifyPinCredential({ gateId, pin });
  if (!verified?.user?.is_active) {
    await audit("auth", "AUTH_PIN_LOGIN_FAIL", null, { gate_id: gateId });
    return json(401, { error: "Invalid credentials" }, cors);
  }

  const user = verified.user;
  if (user.password_reset_required) {
    await audit("auth", "AUTH_PIN_PASSWORD_RESET_REQUIRED", `user:${user.id}`, { gate_id: gateId, credential_id: verified.credential.id });
    return json(403, {
      error: "Password reset required",
      password_reset_required: true,
      next_step: { endpoint: "/auth/login", note: "Log in with the temporary password, then set a new password." }
    }, cors);
  }
  const apiKeyId = await getDefaultApiKeyIdForUser(user);
  const session = await createSession({
    user,
    customerId: user.primary_customer_id,
    apiKeyId,
    scope: ["openid", "profile", "email", "offline_access", "gateway.read", "keys.read", "billing.read"],
    title: "SkyeGateFS27 PIN session",
    meta: { flow: "pin_login", gate_id: gateId, credential_id: verified.credential.id },
    issuer
  });
  await touchSession(session.session_id, { ip: getClientIp(req), userAgent: getUserAgent(req) });

  const client = await ensureSystemClient();
  const refresh = await issueRefreshToken({
    userId: user.id,
    clientId: client.client_id,
    sessionId: session.session_id,
    scope: session.scope,
    audience: "skyegatefs27",
    metadata: { flow: "pin_login", gate_id: gateId }
  });

  await audit("auth", "AUTH_PIN_LOGIN_OK", `user:${user.id}`, { gate_id: gateId, credential_id: verified.credential.id });

  return json(200, {
    user: buildAuthMeResponse({
      user,
      session: { id: session.session_id, session_kind: "human", customer_id: user.primary_customer_id, api_key_id: apiKeyId, scope: session.scope, expires_at: session.expires_at, created_at: new Date().toISOString() },
      claims: session.claims
    }),
    session: {
      token: session.token,
      expires_at: session.expires_at,
      session_id: session.session_id
    },
    refresh_token: refresh.token,
    gate_id: gateId
  }, cors);
});
