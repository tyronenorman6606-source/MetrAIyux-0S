import { wrap } from "./_lib/wrap.js";
import { buildCors, json, badRequest } from "./_lib/http.js";
import { signJwt } from "./_lib/crypto.js";
import { audit } from "./_lib/audit.js";
import {
  createUser,
  ensureCustomerForUser,
  getDefaultApiKeyIdForUser,
  getUserByEmail,
  getUserPasswordRecord,
  markEmailVerified,
  setUserProvisioningState
} from "./_lib/identity.js";
import { hashPassword, verifyPassword } from "./_lib/passwords.js";
import { matchesAdminPassword, matchesOwnerRecoveryCredential } from "./_lib/admin.js";
import { buildAuthMeResponse, createSession } from "./_lib/sessions.js";

function truthyEnv(value) {
  const clean = String(value || "").trim().toLowerCase();
  return clean === "1" || clean === "true" || clean === "yes" || clean === "on";
}

function firstValue(...values) {
  for (const value of values) {
    const clean = String(value || "").split(",")[0].trim().toLowerCase();
    if (clean) return clean;
  }
  return "";
}

function ownerRecoveryEmail() {
  return firstValue(
    process.env.FS27_OWNER_EMAIL,
    process.env.SKYGATEFS27_OWNER_EMAIL,
    process.env.SKYGATE_OWNER_EMAIL,
    process.env.SKYE_GATE_OWNER_EMAIL,
    process.env.METRAIYUX_OWNER_EMAIL,
    process.env.METRAIYUX_ADMIN_EMAIL,
    process.env.ADMIN_EMAILS,
    process.env.SKYGATEFS27_ADMIN_EMAIL,
    process.env.FS27_ADMIN_EMAIL,
    "grayskyes@solenterprises.org"
  );
}

async function ensureOwnerRecoveryUser({ password }) {
  const email = ownerRecoveryEmail();
  const communicationEmail = firstValue(
    process.env.FS27_OWNER_COMMUNICATION_EMAIL,
    process.env.METRAIYUX_OWNER_COMMUNICATION_EMAIL,
    process.env.GRAYSKYES_MAIN_EMAIL,
    "grayskyes@solenterprises.org"
  ) || email;
  const skyemail = firstValue(
    process.env.FS27_OWNER_SKYEMAIL,
    process.env.METRAIYUX_OWNER_SKYEMAIL,
    "grayskyes@solenterprises.org"
  );
  const customer = await ensureCustomerForUser({
    email,
    planName: "founder-unlimited",
    communicationEmail,
    skyemail
  });
  let user = await getUserByEmail(email);
  if (user) {
    user = await setUserProvisioningState(user.id, {
      customerId: customer.id,
      role: ["founder", "owner", "admin"].includes(String(user.role || "").toLowerCase()) ? user.role : "founder",
      communicationEmail,
      skyemail,
      passwordResetRequired: false,
      provisionedBy: "fs27-owner-recovery",
      profilePatch: {
        founder_command: true,
        plan: "founder-unlimited",
        recovery_lane: "fs27-owner-recovery"
      }
    }) || user;
  } else {
    const passwordHash = await hashPassword(password);
    user = await createUser({
      email,
      passwordHash,
      displayName: "Gray London Skyes",
      communicationEmail,
      skyemail,
      customerId: customer.id,
      role: "founder",
      profile: {
        founder_command: true,
        plan: "founder-unlimited",
        recovery_lane: "fs27-owner-recovery"
      },
      passwordResetRequired: false,
      provisionedBy: "fs27-owner-recovery"
    });
  }
  await markEmailVerified(user.id).catch(() => null);
  return await getUserByEmail(email) || user;
}

async function issueOwnerRecoverySession({ password, req, cors }) {
  const user = await ensureOwnerRecoveryUser({ password });
  const apiKeyId = await getDefaultApiKeyIdForUser(user);
  const session = await createSession({
    user,
    customerId: user.primary_customer_id,
    apiKeyId,
    scope: ["openid", "profile", "email", "admin.read", "admin.write", "gateway.invoke", "keys.read", "keys.write", "billing.read", "billing.write", "skyevault.admin", "skymail.admin", "skymail.service"],
    title: "SkyeGate FS27 owner recovery session",
    meta: { flow: "owner_recovery_env_credential", via: "fs27-owner-recovery" },
    issuer: new URL(req.url).origin
  });
  await audit("admin", "ADMIN_OWNER_RECOVERY_LOGIN_OK", `user:${user.id}`, { via: "fs27-owner-recovery", customer_id: user.primary_customer_id || null });
  return json(200, {
    token: session.token,
    token_kind: "fs27_gate_session",
    gateToken: session.token,
    gateBearerToken: session.token,
    via: "fs27-owner-recovery",
    recovery: true,
    user: buildAuthMeResponse({
      user,
      session: {
        id: session.session_id,
        session_kind: "human",
        customer_id: user.primary_customer_id,
        api_key_id: apiKeyId,
        scope: session.scope,
        expires_at: session.expires_at,
        created_at: new Date().toISOString()
      },
      claims: session.claims
    }),
    session: {
      token: session.token,
      expires_at: session.expires_at,
      session_id: session.session_id
    },
    recovery_notice: "Owner recovery credential was accepted by FS27 and minted a canonical gate session."
  }, cors);
}

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  let body;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON", cors); }

  const password = (body.password || "").toString();
  if (!password) return badRequest("Missing password", cors);

	  const email = (body.email || "").toString().trim();
	  if (email) {
	    const user = await getUserByEmail(email);
	    const record = user ? await getUserPasswordRecord(user.id) : null;
	    const ok = user && record ? await verifyPassword(password, record.password_hash) : false;
	    const role = (user?.role || "").toLowerCase();
	    if (ok && ["founder", "owner", "admin"].includes(role)) {
	      await audit("admin", "ADMIN_LOGIN_OK", `user:${user.id}`, { via: "central-auth" });
	      const apiKeyId = await getDefaultApiKeyIdForUser(user);
	      const session = await createSession({
	        user,
	        customerId: user.primary_customer_id,
	        apiKeyId,
	        scope: ["openid", "profile", "email", "admin.read", "admin.write", "gateway.invoke", "keys.write", "billing.read"],
	        title: "SkyeGate FS27 admin session",
	        meta: { flow: "admin_login", via: "central-auth" },
	        issuer: new URL(req.url).origin
	      });
	      const token = signJwt({
	        role: "admin",
	        user_id: user.id,
	        email: user.email,
	        auth_role: role,
	        via: "central-auth-compat",
	        fs27_session_id: session.session_id
	      }, 12 * 60 * 60);
	      return json(200, {
	        token,
	        token_kind: "admin_compat_jwt",
	        gateToken: session.token,
	        gateBearerToken: session.token,
	        via: "central-auth",
	        user: buildAuthMeResponse({
	          user,
	          session: {
	            id: session.session_id,
	            session_kind: "human",
	            customer_id: user.primary_customer_id,
	            api_key_id: apiKeyId,
	            scope: session.scope,
	            expires_at: session.expires_at,
	            created_at: new Date().toISOString()
	          },
	          claims: session.claims
	        }),
	        session: {
	          token: session.token,
	          expires_at: session.expires_at,
	          session_id: session.session_id
	        }
	      }, cors);
	    }
	  }

	  if (!truthyEnv(process.env.FS27_ALLOW_STATIC_ADMIN_LOGIN) && !truthyEnv(process.env.SKYGATEFS27_ALLOW_STATIC_ADMIN_LOGIN)) {
	    if (matchesOwnerRecoveryCredential(password)) {
	      return await issueOwnerRecoverySession({ password, req, cors });
	    }
	    await audit("admin", "ADMIN_LOGIN_FAIL", null, { ip: req.headers.get("x-nf-client-connection-ip") || null, reason: "static_admin_disabled" });
	    return json(401, { error: "Invalid credentials", code: "FS27_CENTRAL_ADMIN_LOGIN_REQUIRED" }, cors);
	  }

	  if (matchesOwnerRecoveryCredential(password)) {
	    return await issueOwnerRecoverySession({ password, req, cors });
	  }

	  if (!matchesAdminPassword(password)) {
	    await audit("admin", "ADMIN_LOGIN_FAIL", null, { ip: req.headers.get("x-nf-client-connection-ip") || null });
	    return json(401, { error: "Invalid credentials" }, cors);
	  }

	  await audit("admin", "ADMIN_BREAK_GLASS_STATIC_LOGIN_OK", null, { explicit_env: true });
	  const token = signJwt({ role: "admin", via: "explicit-break-glass-static-admin", break_glass: true }, 15 * 60);
	  return json(200, {
	    token,
	    via: "explicit-break-glass-static-admin",
	    break_glass: true,
	    expires_in: 15 * 60,
	    recovery_notice: "Static admin login is explicit break-glass only. Prefer FS27 user login, PIN, or recovery-code login."
	  }, cors);
	});
