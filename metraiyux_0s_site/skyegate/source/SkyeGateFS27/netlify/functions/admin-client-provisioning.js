import { wrap } from "./_lib/wrap.js";
import { buildCors, json, badRequest } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin.js";
import { q } from "./_lib/db.js";
import { audit } from "./_lib/audit.js";
import { randomKey, keyHashHex, encryptSecret } from "./_lib/crypto.js";
import { sendProvisioningEmail } from "./_lib/emailAuth.js";
import {
  createUser,
  getUserByEmail,
  normalizeEmail,
  setUserProvisioningState,
  updateUserPassword
} from "./_lib/identity.js";
import { hashPassword, randomOpaqueToken } from "./_lib/passwords.js";

function clean(value, max = 220) {
  return String(value || "").trim().slice(0, max);
}

function intValue(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeSlug(value, fallback = "client-workspace") {
  const cleaned = clean(value || fallback, 120)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return cleaned || fallback;
}

function clientRole(input) {
  const role = clean(input || "user", 40).toLowerCase();
  return ["user", "client", "viewer"].includes(role) ? role : "user";
}

async function upsertCustomer({ email, planName, monthlyCapCents, communicationEmail = null, skyemail = null }) {
  const existing = await q(`select * from customers where lower(email)=lower($1) limit 1`, [email]);
  if (existing.rowCount) {
    const customer = existing.rows[0];
    const res = await q(
      `update customers
       set plan_name=coalesce($2, plan_name),
           monthly_cap_cents=coalesce($3, monthly_cap_cents),
           communication_email=coalesce($4, communication_email),
           skyemail=coalesce($5, skyemail),
           is_active=true
       where id=$1
       returning *`,
      [
        customer.id,
        planName || null,
        Number.isFinite(monthlyCapCents) ? monthlyCapCents : null,
        communicationEmail || null,
        skyemail || null
      ]
    );
    return { customer: res.rows[0], created: false };
  }
  const res = await q(
    `insert into customers(email, communication_email, skyemail, plan_name, monthly_cap_cents)
     values ($1,$2,$3,$4,$5)
     returning *`,
    [
      email,
      communicationEmail || null,
      skyemail || null,
      planName || "starter",
      Number.isFinite(monthlyCapCents) ? monthlyCapCents : intValue(process.env.DEFAULT_CUSTOMER_CAP_CENTS, 2000)
    ]
  );
  return { customer: res.rows[0], created: true };
}

async function findReusableKey(customerId) {
  const res = await q(
    `select id, key_last4, label, role, created_at
     from api_keys
     where customer_id=$1
       and revoked_at is null
       and (expires_at is null or expires_at > now())
     order by case when role in ('owner','admin') then 0 else 1 end, created_at desc
     limit 1`,
    [customerId]
  );
  return res.rowCount ? res.rows[0] : null;
}

async function createCustomerKey(customerId, { label = "client-master", role = "owner", monthlyCapCents = null, metadata = {} } = {}) {
  const key = randomKey("kx_live_");
  const keyHash = keyHashHex(key);
  const keyLast4 = key.slice(-4);
  const encryptedKey = encryptSecret(key);
  const ins = await q(
    `insert into api_keys(customer_id, key_hash, key_last4, label, role, monthly_cap_cents, encrypted_key, metadata)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
     returning id, key_last4, label, role, created_at`,
    [
      customerId,
      keyHash,
      keyLast4,
      clean(label, 60) || "client-master",
      ["viewer", "deployer", "admin", "owner"].includes(clean(role, 40).toLowerCase()) ? clean(role, 40).toLowerCase() : "owner",
      Number.isFinite(monthlyCapCents) ? monthlyCapCents : null,
      encryptedKey,
      JSON.stringify(metadata || {})
    ]
  );
  return { row: ins.rows[0], plainKey: key };
}

function vaultBaseUrl() {
  return clean(process.env.SKYEVAULT_DROP_URL || process.env.SKYEVAULT_PROVISIONING_URL || "", 400).replace(/\/$/, "");
}

function normalizeBearer(value) {
  return clean(value, 4096).replace(/^Bearer\s+/i, "");
}

function requestBearer(req) {
  const auth = clean(req.headers.get("authorization") || req.headers.get("Authorization") || "", 4096);
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return normalizeBearer(
    bearer
      || req.headers.get("x-skye-gate-session")
      || req.headers.get("x-skygate-session")
      || req.headers.get("x-free99-gate-session")
      || req.headers.get("x-fs27-session")
  );
}

function firstEnv(names = []) {
  for (const name of names) {
    const value = normalizeBearer(process.env[name]);
    if (value) return { name, value };
  }
  return { name: "", value: "" };
}

function fs27Origin() {
  return clean(
    process.env.SKYGATEFS27_ORIGIN
      || process.env.SKYGATEFS27_WORKER_ORIGIN
      || process.env.FS27_LIVE_BASE
      || process.env.URL
      || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev",
    400
  ).replace(/\/$/, "");
}

function adminEmail() {
  return clean(
    process.env.FS27_ADMIN_EMAIL
      || process.env.SKYGATEFS27_ADMIN_EMAIL
      || process.env.SKYGATE_ADMIN_EMAIL
      || process.env.METRAIYUX_OWNER_EMAIL
      || process.env.METRAIYUX_ADMIN_EMAIL,
    254
  ).toLowerCase();
}

function adminPassword() {
  return clean(
    process.env.FS27_ADMIN_PASSWORD
      || process.env.SKYGATEFS27_ADMIN_PASSWORD
      || process.env.SKYGATE_ADMIN_PASSWORD
      || process.env.SKYGATEFS13_ADMIN_PASSWORD
      || process.env.ADMIN_PASSWORD,
    400
  );
}

async function loginProvisioningBearer() {
  const email = adminEmail();
  const password = adminPassword();
  if (!email || !password) return { token: "", source: "" };
  const response = await fetch(`${fs27Origin()}/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json().catch(() => ({}));
  const token = normalizeBearer(data.gateToken || data.gateBearerToken || data.session?.token || data.token || "");
  if (!response.ok || !token) {
    const error = new Error(data.error || `FS27 admin login failed with ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return { token, source: "fs27-admin-login" };
}

async function provisioningBearer(req) {
  const fromRequest = requestBearer(req);
  if (fromRequest) return { token: fromRequest, source: "request-shared-gate" };
  const direct = firstEnv([
    "SKYEVAULT_PROVISIONING_GATE_BEARER",
    "SKYEVAULT_GATE_BEARER",
    "ZERO_OS_GATE_SESSION",
    "FREE99_GATE_SESSION",
    "MCP_GATE_SESSION"
  ]);
  if (direct.value) return { token: direct.value, source: direct.name };
  return loginProvisioningBearer();
}

async function maybeProvisionVaultWorkspace(body, { customer, user, req }) {
  if (body.provision_vault_workspace !== true && body.provisionVaultWorkspace !== true) {
    return { requested: false };
  }
  const baseUrl = vaultBaseUrl();
  const bearer = await provisioningBearer(req);
  if (!baseUrl || !bearer.token) {
    return { requested: true, ok: false, error: "SkyeVault provisioning requires SKYEVAULT_DROP_URL plus a shared FS27/SkyGate bearer or admin login env." };
  }
  const gateBearer = bearer.token.replace(/^Bearer\s+/i, "");
  const companyName = clean(body.company_name || body.companyName || body.client_name || body.clientName || customer.email, 180);
  const workspaceId = safeSlug(body.workspace_id || body.workspaceId || body.workspace_slug || body.workspaceSlug || companyName || customer.email);
  const payload = {
    action: "provision",
    workspaceId,
    developerId: safeSlug(body.developer_id || body.developerId || user.email || workspaceId),
    developerName: clean(body.display_name || body.displayName || companyName || user.email, 120),
    clientName: companyName,
    clientEmail: user.email,
    projectName: clean(body.project_name || body.projectName || `${companyName || workspaceId} Workspace`, 180),
    destinationId: clean(body.destination_id || body.destinationId || process.env.SKYEVAULT_DEFAULT_DESTINATION_ID || "primary", 80),
    planName: clean(body.plan_name || body.planName || customer.plan_name || "starter", 80),
    offerId: clean(body.offer_id || body.offerId || "manual-admin-provision", 140),
    subscriptionStatus: "active",
    active: true
  };
  const response = await fetch(`${baseUrl}/.netlify/functions/provision-workspace`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${gateBearer}`,
      "x-skye-gate-session": gateBearer,
      "x-free99-gate-session": gateBearer,
      "x-skyepay-lane": "admin-client-provisioning"
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    return { requested: true, ok: false, status: response.status, error: data.error || `SkyeVault provisioning failed with ${response.status}.` };
  }
  return { requested: true, ok: true, gate_source: bearer.source || "shared-gate", ...data };
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name || null,
    communication_email: user.communication_email || null,
    skyemail: user.skyemail || null,
    role: user.role,
    primary_customer_id: user.primary_customer_id,
    default_api_key_id: user.default_api_key_id || null,
    password_reset_required: !!user.password_reset_required,
    is_active: !!user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  const admin = requireAdmin(req);
  if (!admin) return json(401, { error: "Unauthorized" }, cors);

  let body;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON", cors); }

  const email = normalizeEmail(body.email || body.client_email || body.clientEmail);
  if (!email) return badRequest("Missing email", cors);

  const planName = clean(body.plan_name || body.planName || "starter", 40) || "starter";
  const monthlyCapCents = intValue(body.monthly_cap_cents ?? body.monthlyCapCents, intValue(process.env.DEFAULT_CUSTOMER_CAP_CENTS, 2000));
  const displayName = clean(body.display_name || body.displayName || body.client_name || body.clientName || "", 120);
  const companyName = clean(body.company_name || body.companyName || body.client_name || body.clientName || "", 180);
  const communicationEmail = normalizeEmail(body.communication_email || body.communicationEmail || email) || email;
  const skyemail = clean(body.skyemail || body.skye_email || body.skyeEmail || body.skyEmail || "", 220);
  const forcePasswordReset = body.force_password_reset !== false && body.forcePasswordReset !== false;
  const resetExistingPassword = body.reset_existing_password !== false && body.resetExistingPassword !== false;

  const customerResult = await upsertCustomer({ email, planName, monthlyCapCents, communicationEmail, skyemail });
  let keyResult = null;
  const reusableKey = await findReusableKey(customerResult.customer.id);
  if (body.rotate_master_key === true || body.rotateMasterKey === true || !reusableKey) {
    keyResult = await createCustomerKey(customerResult.customer.id, {
      label: clean(body.key_label || body.keyLabel || "client-master", 60),
      role: clean(body.key_role || body.keyRole || "owner", 40),
      monthlyCapCents: null,
      metadata: {
        source: "admin-client-provisioning",
        platform_id: "metraiyux-0s",
        client_email: email
      }
    });
  }
  const apiKeyRow = keyResult?.row || reusableKey;

  const temporaryPassword = resetExistingPassword || !(await getUserByEmail(email))
    ? clean(body.temporary_password || body.temporaryPassword || randomOpaqueToken(18), 160)
    : "";
  const passwordHash = temporaryPassword ? await hashPassword(temporaryPassword) : null;

  let user = await getUserByEmail(email);
  if (!user) {
    user = await createUser({
      email,
      passwordHash,
      displayName,
      communicationEmail,
      skyemail,
      customerId: customerResult.customer.id,
      defaultApiKeyId: apiKeyRow?.id || null,
      role: clientRole(body.role),
      passwordResetRequired: forcePasswordReset,
      provisionedBy: admin.user_id ? `admin:${admin.user_id}` : `admin:${admin.via || "password"}`,
      profile: {
        source: "admin-client-provisioning",
        company_name: companyName || null
      }
    });
  } else {
    if (passwordHash) await updateUserPassword(user.id, passwordHash);
    user = await setUserProvisioningState(user.id, {
      customerId: customerResult.customer.id,
      defaultApiKeyId: apiKeyRow?.id || null,
      displayName: displayName || null,
      communicationEmail,
      skyemail,
      role: Object.prototype.hasOwnProperty.call(body, "role") ? clientRole(body.role) : null,
      passwordResetRequired: forcePasswordReset,
      provisionedBy: admin.user_id ? `admin:${admin.user_id}` : `admin:${admin.via || "password"}`,
      profilePatch: {
        source: "admin-client-provisioning",
        company_name: companyName || null,
        reprovisioned_at: new Date().toISOString()
      }
    });
  }

  const vault = await maybeProvisionVaultWorkspace(body, { customer: customerResult.customer, user, req });
  const origin = clean(body.origin || req.headers.get("origin") || new URL(req.url).origin, 400).replace(/\/$/, "");
  const notification = await sendProvisioningEmail(user, {
    temporaryPassword,
    dashboardUrl: `${origin}/gateway/dashboard.html`,
    loginUrl: `${origin}/gateway/dashboard.html`,
    forcePasswordReset,
    skyemail,
    communicationEmail
  }).catch((error) => ({
    delivered: false,
    mode: "error",
    error: error?.message || "Provisioning email failed"
  }));

  await audit("admin", "CLIENT_PROVISION", `customer:${customerResult.customer.id}`, {
    customer_id: customerResult.customer.id,
    user_id: user.id,
    email,
    customer_created: customerResult.created,
    key_created: !!keyResult,
    password_reset_required: forcePasswordReset,
    notification_delivered: notification.delivered === true,
    notification_mode: notification.mode || "unknown",
    vault_requested: vault.requested === true,
    vault_ok: vault.ok === true
  });

  return json(200, {
    ok: true,
    customer: {
      id: customerResult.customer.id,
      email: customerResult.customer.email,
      communication_email: customerResult.customer.communication_email || null,
      skyemail: customerResult.customer.skyemail || null,
      plan_name: customerResult.customer.plan_name,
      monthly_cap_cents: customerResult.customer.monthly_cap_cents,
      created: customerResult.created
    },
    user: publicUser(user),
    api_key: apiKeyRow ? {
      id: apiKeyRow.id,
      label: apiKeyRow.label,
      role: apiKeyRow.role,
      key_last4: apiKeyRow.key_last4,
      key: keyResult?.plainKey || null,
      created: !!keyResult
    } : null,
    credentials: {
      email,
      temporary_password: temporaryPassword || null,
      password_reset_required: forcePasswordReset,
      login_endpoint: "/auth/login",
      change_password_endpoint: "/auth/change-password",
      dashboard_path: "/gateway/dashboard.html"
    },
    notification,
    vault
  }, cors);
});
