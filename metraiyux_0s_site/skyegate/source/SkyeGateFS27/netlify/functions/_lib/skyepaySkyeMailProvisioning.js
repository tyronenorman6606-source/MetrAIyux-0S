import { q } from "./db.js";
import { audit } from "./audit.js";

function clean(value, max = 220) {
  return String(value || "").trim().slice(0, max);
}

function normalizeBearer(value) {
  return clean(value, 4096).replace(/^Bearer\s+/i, "");
}

function normalizeEmail(value) {
  const email = clean(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeMailboxLocalPart(value) {
  return clean(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .slice(0, 64);
}

function normalizeMailboxDomain(value) {
  return clean(value, 180)
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function slugify(value, fallback = "skyemail-workspace") {
  return clean(value, 160)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || fallback;
}

function objectOrNull(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function orderMetadata(order) {
  const metadata = objectOrNull(order?.metadata) || {};
  const nested = objectOrNull(metadata.metadata) || {};
  return { ...nested, ...metadata };
}

function skyemailPolicy(order) {
  const offer = objectOrNull(order?.offer_snapshot) || {};
  const policy = objectOrNull(offer.gate_policy) || {};
  return objectOrNull(policy.skyemail_mailbox) || null;
}

function firstEnv(names = []) {
  for (const name of names) {
    const value = normalizeBearer(process.env[name]);
    if (value) return { name, value };
  }
  return { name: "", value: "" };
}

function skyemailBaseUrl() {
  return clean(
    process.env.SKYEMAIL_WORKER_URL
      || process.env.SKYEMAIL_PUBLIC_URL
      || process.env.SKYMAIL_PUBLIC_URL
      || process.env.SKYMAIL_WORKER_URL
      || "https://skyemail-platform.graylondonskyes.workers.dev",
    400
  ).replace(/\/$/, "");
}

function skyemailServiceToken() {
  return firstEnv([
    "SKYMAIL_SERVICE_TOKEN",
    "SKYE_MAIL_SERVICE_TOKEN",
    "SKYEMAIL_SERVICE_TOKEN",
    "SKYEMAIL_SKYEPAY_SERVICE_TOKEN"
  ]);
}

export function isSkyeMailMailboxOrder(order) {
  const md = orderMetadata(order);
  const policy = skyemailPolicy(order);
  return (Boolean(policy) && policy.enabled_after_skyepay !== false)
    || md.skyemail_mailbox === "true";
}

export function skyeMailMailboxProvisioningActive(status) {
  return [
    "skyemail_mailbox_provisioned",
    "skyemail_mailbox_provisioned_pending_key_setup"
  ].includes(String(status || "").toLowerCase());
}

export function skyeMailMailboxClaim(order) {
  const md = orderMetadata(order);
  const rawEmail = normalizeEmail(
    md.skyemail_mailbox_email
      || md.mailbox_email
      || md.skyemail
      || order?.skyemail
      || ""
  );
  const [emailLocal = "", emailDomain = ""] = rawEmail ? rawEmail.split("@") : [];
  const localPart = normalizeMailboxLocalPart(
    md.skyemail_mailbox_local_part
      || md.mailbox_local_part
      || md.local_part
      || emailLocal
  );
  const domain = normalizeMailboxDomain(
    md.skyemail_mailbox_domain
      || md.mailbox_domain
      || emailDomain
      || process.env.SKYEMAIL_DEFAULT_DOMAIN
      || process.env.SKYMAIL_PRIMARY_DOMAIN
      || process.env.ZERO_OS_SKYEMAIL_DOMAIN
      || "solenterprises.org"
  );
  const validLocal = /^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/.test(localPart);
  const validDomain = /^[a-z0-9][a-z0-9.-]*\.[a-z0-9-]{2,}$/.test(domain);
  return {
    ok: validLocal && validDomain,
    email: validLocal && validDomain ? `${localPart}@${domain}` : "",
    local_part: localPart,
    domain,
    reason: validLocal ? (validDomain ? "" : "mailbox_domain_required") : "mailbox_local_part_required"
  };
}

function provisioningPayload(order, action = "provision") {
  const md = orderMetadata(order);
  const claim = skyeMailMailboxClaim(order);
  const policy = skyemailPolicy(order) || {};
  const workspaceSlug = slugify(
    md.workspace_slug
      || order?.workspace_slug
      || order?.company_name
      || order?.customer_email
      || order?.id
  );
  return {
    action,
    source: "skyepay",
    skyepay_order_id: clean(order?.id, 180),
    stripe_customer_id: clean(order?.stripe_customer_id, 160),
    stripe_subscription_id: clean(order?.stripe_subscription_id, 160),
    offer_id: clean(order?.offer_id, 140),
    plan_id: clean(order?.offer_id, 140),
    plan_name: clean(objectOrNull(order?.offer_snapshot)?.plan_name || order?.offer_id, 120),
    workspace_id: workspaceSlug,
    workspace_slug: workspaceSlug,
    customer_id: clean(order?.customer_id || order?.customer_email || order?.id, 180),
    owner_email: normalizeEmail(order?.customer_email || md.customer_email),
    email: normalizeEmail(order?.customer_email || md.customer_email),
    approval_email: normalizeEmail(order?.customer_email || md.customer_email),
    company_name: clean(order?.company_name || md.company_name || workspaceSlug, 180),
    local_part: claim.local_part,
    domain: claim.domain,
    mailbox_email: claim.email,
    mailbox_plan: {
      production_mailboxes: Number(policy.production_mailboxes || 1),
      aliases: Number(policy.aliases || 0),
      verified_domains: Number(policy.verified_domains || 0),
      storage_gb: Number(policy.storage_gb || 0),
      outbound_sends_monthly: Number(policy.outbound_sends_monthly || 0),
      team_members: Number(policy.team_members || 1)
    }
  };
}

export async function provisionSkyeMailMailboxForOrder(order, { action = "provision", source = "skyepay" } = {}) {
  if (!isSkyeMailMailboxOrder(order)) return { ok: true, skipped: true, reason: "not_skyemail_mailbox_order" };
  if (action !== "provision") return { ok: true, skipped: true, reason: "unsupported_action" };
  if (skyeMailMailboxProvisioningActive(order?.provisioning_status)) {
    return { ok: true, skipped: true, reason: "mailbox_already_provisioned" };
  }

  const claim = skyeMailMailboxClaim(order);
  if (!claim.ok) {
    return { ok: false, skipped: true, reason: "mailbox_claim_required", claim };
  }

  const token = skyemailServiceToken();
  if (!token.value) {
    const error = new Error("SkyeMail mailbox provisioning requires SKYMAIL_SERVICE_TOKEN or SKYE_MAIL_SERVICE_TOKEN on SkyePay.");
    error.status = 500;
    throw error;
  }

  const gateBearer = token.value.replace(/^Bearer\s+/i, "");
  const response = await fetch(`${skyemailBaseUrl()}/api/workspace-provision`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${gateBearer}`,
      "x-skymail-service-token": gateBearer,
      "x-skye-gate-session": gateBearer,
      "x-free99-gate-session": gateBearer,
      "x-skyepay-lane": "skyemail-mailbox-provisioning"
    },
    body: JSON.stringify(provisioningPayload(order, action))
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || data.detail || `SkyeMail mailbox provisioning failed with ${response.status}.`);
    error.status = response.status;
    error.skyemail = data;
    throw error;
  }

  await audit("system", "SKYEPAY_SKYEMAIL_MAILBOX_PROVISIONED", `skyepay:${order.id}`, {
    source,
    action,
    mailbox_email: data.mailbox?.mailbox_email || claim.email,
    provisioning_status: data.mailbox?.provisioning_status || null,
    inbox_ready: data.inbox_ready === true,
    gate_source: token.name || "skymail-service-token",
    stripe_subscription_id: order.stripe_subscription_id || null
  });
  return data;
}

export async function markSkyeMailProvisioningResult(orderId, result, status = "") {
  const mailbox = objectOrNull(result?.mailbox) || {};
  const mailboxProvisioned = mailbox.status === "active" && mailbox.provisioning_status === "provisioned";
  const nextStatus = status || (mailboxProvisioned && result?.inbox_ready === false
    ? "skyemail_mailbox_provisioned_pending_key_setup"
    : "skyemail_mailbox_provisioned");
  await q(
    `update skyepay_orders
     set approval_status='approved',
         owner_status=case when owner_status='void' then owner_status else 'auto_approved' end,
         provisioning_status=$2,
         provisioned_at=case when $2 in ('skyemail_mailbox_provisioned','skyemail_mailbox_provisioned_pending_key_setup') then coalesce(provisioned_at, now()) else provisioned_at end,
         metadata=metadata || $3::jsonb,
         updated_at=now()
     where id=$1`,
    [
      orderId,
      nextStatus,
      JSON.stringify({
        skyemail_provisioning: {
          ok: result?.ok !== false,
          mailbox_email: mailbox.mailbox_email || null,
          mailbox_id: mailbox.id || null,
          provider: mailbox.provider || null,
          provisioning_status: mailbox.provisioning_status || null,
          inbox_ready: result?.inbox_ready === true,
          key_state_active: result?.key_state?.active === true,
          provisioned_at: new Date().toISOString()
        }
      })
    ]
  );
}

export async function markSkyeMailProvisioningNeedsInput(orderId, result) {
  await q(
    `update skyepay_orders
     set provisioning_status='skyemail_mailbox_claim_required',
         metadata=metadata || $2::jsonb,
         updated_at=now()
     where id=$1`,
    [
      orderId,
      JSON.stringify({
        skyemail_provisioning: {
          ok: false,
          reason: result?.reason || "mailbox_claim_required",
          claim_reason: result?.claim?.reason || null,
          needs_customer_mailbox_claim: true,
          updated_at: new Date().toISOString()
        }
      })
    ]
  );
}

export async function markSkyeMailProvisioningFailure(orderId, error) {
  await q(
    `update skyepay_orders
     set provisioning_status='skyemail_mailbox_provisioning_failed',
         metadata=metadata || $2::jsonb,
         updated_at=now()
     where id=$1`,
    [
      orderId,
      JSON.stringify({
        skyemail_provisioning_error: {
          message: error?.message || "SkyeMail mailbox provisioning failed.",
          status: error?.status || null,
          failed_at: new Date().toISOString()
        }
      })
    ]
  );
}
