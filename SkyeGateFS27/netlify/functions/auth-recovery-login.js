import { wrap } from "./_lib/wrap.js";
import { buildCors, json, badRequest, getClientIp, getUserAgent } from "./_lib/http.js";
import { audit } from "./_lib/audit.js";
import { ensureSystemClient, issueRefreshToken } from "./_lib/oauth.js";
import { consumeRecoveryCredential, normalizeGateId } from "./_lib/pinAuth.js";
import { buildAuthMeResponse, createSession, touchSession } from "./_lib/sessions.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  const issuer = new URL(req.url).origin;
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  let body;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON", cors); }

  const gateId = normalizeGateId(body.gate_id || "");
  const recoveryCode = (body.recovery_code || body.code || "").toString();
  if (!gateId || !recoveryCode) return badRequest("Missing gate_id and recovery_code", cors);

  const consumed = await consumeRecoveryCredential({ gateId, recoveryCode });
  if (!consumed?.user?.is_active) {
    await audit("auth", "AUTH_RECOVERY_LOGIN_FAIL", null, { gate_id: gateId });
    return json(401, { error: "Invalid or used recovery code" }, cors);
  }

  const user = consumed.user;
  const session = await createSession({
    user,
    customerId: user.primary_customer_id,
    scope: ["openid", "profile", "email", "offline_access", "gateway.read", "keys.read", "billing.read"],
    title: "SkyeGateFS27 recovery-code session",
    meta: { flow: "recovery_login", gate_id: gateId, credential_id: consumed.credential.id },
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
    metadata: { flow: "recovery_login", gate_id: gateId }
  });

  await audit("auth", "AUTH_RECOVERY_LOGIN_OK", `user:${user.id}`, { gate_id: gateId, credential_id: consumed.credential.id });

  return json(200, {
    user: buildAuthMeResponse({
      user,
      session: { id: session.session_id, session_kind: "human", customer_id: user.primary_customer_id, api_key_id: null, scope: session.scope, expires_at: session.expires_at, created_at: new Date().toISOString() },
      claims: session.claims
    }),
    session: {
      token: session.token,
      expires_at: session.expires_at,
      session_id: session.session_id
    },
    refresh_token: refresh.token,
    gate_id: gateId,
    recovery_notice: "Recovery code consumed. Set a fresh PIN or rotate recovery codes after login."
  }, cors);
});
