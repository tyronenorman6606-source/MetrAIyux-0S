import crypto from "crypto";
import { wrap } from "./_lib/wrap.js";
import { buildCors, json, badRequest } from "./_lib/http.js";
import { audit } from "./_lib/audit.js";
import { createVerificationToken, sendVerificationEmail } from "./_lib/emailAuth.js";
import { createUser, ensureCustomerForUser, getUserByEmail } from "./_lib/identity.js";
import { ensureSystemClient, issueRefreshToken } from "./_lib/oauth.js";
import { hashPassword } from "./_lib/passwords.js";
import { createSession } from "./_lib/sessions.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  const issuer = new URL(req.url).origin;
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  let body;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON", cors); }

  const email = (body.email || "").toString().trim();
  const password = (body.password || "").toString();
  const displayName = (body.display_name || body.name || "").toString();
  const communicationEmail = (body.communication_email || body.communicationEmail || email).toString().trim();
  const skyemail = (body.skyemail || body.skyEmail || body.skye_email || body.skyeEmail || "").toString().trim();
  if (!email) return badRequest("Missing email", cors);
  if (!password) return badRequest("Missing password", cors);

  const existing = await getUserByEmail(email);
  if (existing) return json(409, { error: "User already exists" }, cors);

  const customer = await ensureCustomerForUser({ email, planName: body.plan_name || "starter", communicationEmail, skyemail });
  const passwordHash = await hashPassword(password);
  const user = await createUser({
    email,
    passwordHash,
    displayName,
    communicationEmail,
    skyemail,
    customerId: customer.id,
    role: "user",
    profile: body.profile || {}
  });
  const verificationToken = await createVerificationToken(user);
  const origin = new URL(req.url).origin;
  const emailDelivery = await sendVerificationEmail(user, verificationToken, origin);

  const client = await ensureSystemClient();
  const session = await createSession({
    user,
    customerId: customer.id,
    scope: ["openid", "profile", "email", "offline_access", "gateway.read", "keys.read", "billing.read"],
    title: "SkyeGate FS27 primary session",
    meta: { flow: "signup" },
    issuer
  });
  const refresh = await issueRefreshToken({
    userId: user.id,
    clientId: client.client_id,
    sessionId: session.session_id,
    scope: session.scope,
    audience: "skyegatefs27",
    metadata: { flow: "signup" }
  });

  await audit("auth", "AUTH_SIGNUP", `user:${user.id}`, { email: user.email, customer_id: customer.id });

  return json(200, {
    issuer: origin,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name || null,
      communication_email: user.communication_email || null,
      skyemail: user.skyemail || null,
      primary_customer_id: customer.id,
      email_verified: false
    },
    session: {
      token: session.token,
      expires_at: session.expires_at,
      session_id: session.session_id
    },
    gate_card: gateCard({
      sub: user.id,
      email: user.email,
      customerId: customer.id,
      role: user.role || "user",
      sessionId: session.session_id,
      scope: session.scope
    }),
    refresh_token: refresh.token,
    pin_gate: {
      setup_endpoint: "/auth/pin/setup",
      login_endpoint: "/auth/pin/login",
      recovery_endpoint: "/auth/recovery/login",
      note: "After signup/login, the user can set a generated Gate ID + PIN credential and receive one-time recovery codes."
    },
    verification: {
      required: true,
      delivery: emailDelivery,
      token_preview: emailDelivery.mode === "preview" ? verificationToken : undefined
    }
  }, cors);
});

function gateCard({ sub, email, customerId, role, sessionId, scope = [] }) {
  const seed = [sub, email, customerId].filter(Boolean).join("|") || crypto.randomUUID();
  const digest = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 20);
  return {
    id: `gate_basic_${digest}`,
    type: "basic_gate_card",
    status: "active",
    principal: "session",
    sub,
    email,
    customer_id: customerId,
    role,
    session_id: sessionId,
    scope,
    usage_required: false,
    reloadable: true
  };
}
