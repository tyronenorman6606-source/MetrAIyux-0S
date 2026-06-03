import { q } from "./db.js";
import { audit } from "./audit.js";

function clean(value, max = 220) {
  return String(value || "").trim().slice(0, max);
}

function normalizeEmail(value) {
  return clean(value, 254).toLowerCase();
}

function emailDeveloperId(email, fallback) {
  const local = normalizeEmail(email).split("@")[0] || fallback || "developer";
  return local.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 64) || "developer";
}

function vaultBaseUrl() {
  return clean(process.env.SKYEVAULT_DROP_URL || process.env.SKYEVAULT_PROVISIONING_URL || "", 400).replace(/\/$/, "");
}

function normalizeBearer(value) {
  return clean(value, 4096).replace(/^Bearer\s+/i, "");
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

async function provisioningBearer() {
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

export function isVaultProvisioningOrder(order) {
  const offer = order?.offer_snapshot && typeof order.offer_snapshot === "object" ? order.offer_snapshot : {};
  const metadata = order?.metadata && typeof order.metadata === "object" ? order.metadata : {};
  const md = metadata.metadata && typeof metadata.metadata === "object" ? metadata.metadata : metadata;
  const provisioning = offer.provisioning && typeof offer.provisioning === "object" ? offer.provisioning : {};
  if (provisioning.workspace_required === false) return false;
  return offer.family === "skyevault"
    || md.vault_workspace === "true"
    || String(order?.offer_id || "").startsWith("skyevault-");
}

export function skyePayVaultPlanLimits(order) {
  const offer = order?.offer_snapshot && typeof order.offer_snapshot === "object" ? order.offer_snapshot : {};
  const policy = offer.gate_policy || {};
  const storageGb = policy.vault_storage_mb ? Math.max(1, Math.ceil(Number(policy.vault_storage_mb) / 1024)) : null;
  const fileLimit = policy.vault_file_limit ? Math.max(1, Math.floor(Number(policy.vault_file_limit))) : null;
  return {
    maxFilesPerSubmission: fileLimit || undefined,
    maxTotalSubmissionGb: storageGb || undefined,
    maxFileSizeGb: storageGb || undefined,
    rateLimitUploadSessionsPerWindow: policy.vault_workspace_limit ? Number(policy.vault_workspace_limit) * 20 : undefined,
    rateLimitStatusPerWindow: policy.default_rpd_limit ? Math.min(5000, Math.max(120, Number(policy.default_rpd_limit))) : undefined,
    rateLimitWindowMs: 60 * 60 * 1000
  };
}

function provisioningPayload(order, action = "provision") {
  const email = normalizeEmail(order.customer_email);
  const workspaceSlug = clean(order.workspace_slug || order.client_slug || order.id, 120).toLowerCase();
  const developerId = emailDeveloperId(email, workspaceSlug);
  const offer = order.offer_snapshot && typeof order.offer_snapshot === "object" ? order.offer_snapshot : {};
  return {
    action,
    workspaceId: workspaceSlug,
    developerId,
    developerName: clean(order.customer_name || order.company_name || developerId, 120),
    clientName: clean(order.company_name || order.customer_name || workspaceSlug, 180),
    clientEmail: email,
    projectName: clean(order.company_name || `${workspaceSlug} Vault Workspace`, 180),
    destinationId: process.env.SKYEVAULT_DEFAULT_DESTINATION_ID || "primary",
    planName: clean(offer.plan_name || order.offer_id, 80),
    offerId: clean(order.offer_id, 140),
    subscriptionStatus: clean(order.payment_status || "active", 80),
    stripeCustomerId: clean(order.stripe_customer_id, 160),
    stripeSubscriptionId: clean(order.stripe_subscription_id, 160),
    skyepayOrderId: clean(order.id, 180),
    active: action !== "suspend" && action !== "cancel",
    ...skyePayVaultPlanLimits(order)
  };
}

function safeRepoEnv(repoEnv = {}) {
  const allowed = [
    "SKYEVAULT_DROP_URL",
    "SKYEVAULT_PORTAL_KEY",
    "SKYEVAULT_WORKSPACE_ID",
    "SKYEVAULT_DEVELOPER_ID",
    "SKYEVAULT_DEVELOPER_NAME",
    "SKYEVAULT_DESTINATION_ID"
  ];
  const out = {};
  for (const key of allowed) {
    const value = clean(repoEnv?.[key], key === "SKYEVAULT_PORTAL_KEY" ? 400 : 220);
    if (value) out[key] = value;
  }
  return out;
}

export async function provisionVaultWorkspaceForOrder(order, { action = "provision", source = "skyepay" } = {}) {
  if (!isVaultProvisioningOrder(order)) return { ok: true, skipped: true, reason: "not_vault_order" };
  const baseUrl = vaultBaseUrl();
  const bearer = await provisioningBearer();
  if (!baseUrl || !bearer.token) {
    const error = new Error("SkyeVault provisioning requires SKYEVAULT_DROP_URL plus a shared SkyeGate FS27 bearer or admin login env.");
    error.status = 500;
    throw error;
  }
  const gateBearer = bearer.token.replace(/^Bearer\s+/i, "");
  const response = await fetch(`${baseUrl}/.netlify/functions/provision-workspace`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${gateBearer}`,
      "x-skye-gate-session": gateBearer,
      "x-free99-gate-session": gateBearer,
      "x-skyepay-lane": "skyevault-agent-provisioning"
    },
    body: JSON.stringify(provisioningPayload(order, action))
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || `SkyeVault provisioning failed with ${response.status}.`);
    error.status = response.status;
    error.vault = data;
    throw error;
  }
  await audit("system", "SKYEPAY_VAULT_PROVISIONED", `skyepay:${order.id}`, {
    source,
    action,
    workspace_id: data.workspace?.workspaceId || order.workspace_slug || null,
    key_created: data.keyCreated === true,
    gate_source: bearer.source || "shared-gate",
    stripe_subscription_id: order.stripe_subscription_id || null
  });
  return data;
}

export async function markVaultProvisioningResult(orderId, result, status = "workspace_unlocked") {
  await q(
    `update skyepay_orders
     set approval_status='approved',
         owner_status=case when owner_status='void' then owner_status else 'auto_approved' end,
         provisioning_status=$2,
         provisioned_at=case when $2='workspace_unlocked' then coalesce(provisioned_at, now()) else provisioned_at end,
         metadata=metadata || $3::jsonb,
         updated_at=now()
     where id=$1`,
    [
      orderId,
      status,
      JSON.stringify({
        vault_provisioning: {
          ok: result?.ok === true,
          workspaceId: result?.workspace?.workspaceId || null,
          keyCreated: result?.keyCreated === true,
          portalKeyReturned: Boolean(result?.portalKey),
          repoEnv: safeRepoEnv(result?.repoEnv || {}),
          provisionedAt: new Date().toISOString()
        }
      })
    ]
  );
}

export async function markVaultProvisioningFailure(orderId, error) {
  await q(
    `update skyepay_orders
     set provisioning_status='vault_provisioning_failed',
         metadata=metadata || $2::jsonb,
         updated_at=now()
     where id=$1`,
    [
      orderId,
      JSON.stringify({
        vault_provisioning_error: {
          message: error?.message || "Vault provisioning failed.",
          status: error?.status || null,
          failedAt: new Date().toISOString()
        }
      })
    ]
  );
}
