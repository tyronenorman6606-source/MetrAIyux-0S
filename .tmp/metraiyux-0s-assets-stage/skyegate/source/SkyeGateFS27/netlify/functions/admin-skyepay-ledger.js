import { wrap } from "./_lib/wrap.js";
import { json, badRequest } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin.js";
import { audit } from "./_lib/audit.js";
import { q } from "./_lib/db.js";
import { canApproveSkyePayOrder, skyePayHeaders } from "./_lib/skyepaySecurity.js";
import { skyePayOfferRequiresOwnerApproval } from "./_lib/skyepayActivation.js";
import {
  isVaultProvisioningOrder,
  markVaultProvisioningFailure,
  markVaultProvisioningResult,
  provisionVaultWorkspaceForOrder
} from "./_lib/skyepayVaultProvisioning.js";

function clean(value, max = 220) {
  return String(value || "").trim().slice(0, max);
}

function numberOrNull(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function arrayOrNull(value) {
  return Array.isArray(value) && value.length ? value.map((item) => clean(item, 80)).filter(Boolean) : null;
}

function gatePolicyFromOrder(order) {
  const offer = order.offer_snapshot && typeof order.offer_snapshot === "object" ? order.offer_snapshot : {};
  const policy = offer.gate_policy && typeof offer.gate_policy === "object" ? offer.gate_policy : {};
  const rateLimits = offer.rate_limits && typeof offer.rate_limits === "object" ? offer.rate_limits : {};
  const ownerApprovalRequired = skyePayOfferRequiresOwnerApproval(order);
  return {
    plan_name: clean(offer.plan_name || order.offer_id || "skypay-client", 40),
    monthly_cap_cents: numberOrNull(policy.monthly_cap_cents ?? rateLimits.monthly_cap_cents) ?? parseInt(process.env.DEFAULT_CUSTOMER_CAP_CENTS || "2000", 10),
    default_rpm_limit: numberOrNull(policy.default_rpm_limit ?? rateLimits.rpm),
    default_rpd_limit: numberOrNull(policy.default_rpd_limit ?? rateLimits.rpd),
    max_devices_per_key: numberOrNull(policy.max_devices_per_key ?? rateLimits.max_devices_per_key),
    require_install_id: policy.require_install_id === true,
    allowed_providers: arrayOrNull(policy.allowed_providers),
    allowed_models: policy.allowed_models && typeof policy.allowed_models === "object" ? policy.allowed_models : null,
    vault_storage_mb: numberOrNull(policy.vault_storage_mb ?? rateLimits.vault_storage_mb),
    vault_file_limit: numberOrNull(policy.vault_file_limit ?? rateLimits.vault_file_limit),
    vault_workspace_limit: numberOrNull(policy.vault_workspace_limit ?? rateLimits.vault_workspace_limit),
    skypay_policy: {
      offer_id: order.offer_id,
      policy_id: clean(policy.policy_id, 140) || `${clean(order.offer_id, 120)}-gate-policy`,
      store_category: clean(offer.store_category, 100),
      zero_upfront_trial: offer.zero_upfront_trial === true,
      trial_days: numberOrNull(offer.trial_days) || 0,
      deferred_one_time_cents: numberOrNull(offer.deferred_one_time_cents) || 0,
      credits: Array.isArray(offer.credits) ? offer.credits : [],
      platform_metering_mode: clean(policy.platform_metering_mode, 120),
      default_platform_id: clean(policy.default_platform_id, 80),
      free99_access: Array.isArray(policy.free99_access) ? policy.free99_access : [],
      paid_platform_access: policy.paid_platform_access && typeof policy.paid_platform_access === "object" ? policy.paid_platform_access : null,
      platform_usage_buckets: policy.platform_usage_buckets && typeof policy.platform_usage_buckets === "object" ? policy.platform_usage_buckets : null,
      owner_approval_required: ownerApprovalRequired,
      activation_path: clean(offer.activation_path, 180) || (ownerApprovalRequired ? "paid_pending_owner_approval" : "auto_unlock_after_confirmed_payment"),
      gate_policy: policy
    }
  };
}

function relay13Origin() {
  return clean(process.env.RELAY13_ORIGIN || process.env.RELAY13_WORKER_ORIGIN || "https://relay13-core.graylondonskyes.workers.dev", 500).replace(/\/+$/, "");
}

function relay13AdminToken() {
  return clean(process.env.RELAY13_PLATFORM_ADMIN_TOKEN || process.env.SKYGATEFS13_WORKER_ADMIN_TOKEN || "", 800);
}

function relay13AiPolicyFromOrder(order) {
  const offer = order.offer_snapshot && typeof order.offer_snapshot === "object" ? order.offer_snapshot : {};
  const policy = offer.gate_policy && typeof offer.gate_policy === "object" ? offer.gate_policy : {};
  const relay13Ai = policy.relay13_ai && typeof policy.relay13_ai === "object" ? policy.relay13_ai : null;
  if (String(order.offer_id || "").startsWith("relay13-ai-") || relay13Ai) {
    return {
      enabled: true,
      mode: clean(relay13Ai?.default_mode || "draft_only", 40),
      monthlyLimit: numberOrNull(relay13Ai?.included_ai_responses_monthly) || 125,
      backupBucket: numberOrNull(relay13Ai?.backup_bucket_responses_monthly) || 0,
      totalProtected: numberOrNull(relay13Ai?.total_protected_responses_monthly) || (
        (numberOrNull(relay13Ai?.included_ai_responses_monthly) || 125) +
        (numberOrNull(relay13Ai?.backup_bucket_responses_monthly) || 0)
      ),
      allowAutoReply: relay13Ai?.allow_ai_auto_reply_default === true,
      autoReplyPolicy: clean(relay13Ai?.auto_reply_policy || "", 80),
      offerId: clean(order.offer_id || "relay13-ai-response-starter", 120)
    };
  }
  return { enabled: false };
}

async function activateRelay13AiAddon(order) {
  const aiPolicy = relay13AiPolicyFromOrder(order);
  if (!aiPolicy.enabled) return null;

  const token = relay13AdminToken();
  const origin = relay13Origin();
  const workspaceSlug = clean(order.workspace_slug || order.metadata?.workspace_slug || "", 120).toLowerCase();
  if (!workspaceSlug) return { ok: false, skipped: true, reason: "missing_workspace_slug" };
  if (!token || token.length < 32) return { ok: false, skipped: true, reason: "missing_relay13_admin_token", workspace_slug: workspaceSlug };

  const configRes = await fetch(`${origin}/api/v1/widget-config?workspace=${encodeURIComponent(workspaceSlug)}`);
  const configData = await configRes.json().catch(() => ({}));
  if (!configRes.ok || configData?.ok === false || !configData?.config?.workspace_id) {
    return {
      ok: false,
      skipped: false,
      reason: "workspace_config_unavailable",
      workspace_slug: workspaceSlug,
      http_status: configRes.status,
      error: clean(configData?.error || "", 400)
    };
  }

  const workspaceId = clean(configData.config.workspace_id, 140);
  const updateRes = await fetch(`${origin}/api/admin/guardrails`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      ai_mode: aiPolicy.mode,
      allow_ai_auto_reply: aiPolicy.allowAutoReply,
      allow_web_search: false,
      monthly_ai_reply_limit: aiPolicy.monthlyLimit,
      app_knowledge: {
        billing: {
          relay13_ai_addon_active: true,
          offer_id: aiPolicy.offerId,
          order_id: order.id,
          stripe_subscription_id: order.stripe_subscription_id || "",
          activated_at: new Date().toISOString(),
          provider_call_gate: "paid_stripe_addon_with_owner_approval"
        }
      }
    })
  });
  const updateData = await updateRes.json().catch(() => ({}));
  if (!updateRes.ok || updateData?.ok === false) {
    return {
      ok: false,
      skipped: false,
      reason: "guardrail_update_failed",
      workspace_slug: workspaceSlug,
      workspace_id: workspaceId,
      http_status: updateRes.status,
      error: clean(updateData?.error || "", 400)
    };
  }
  return {
    ok: true,
    skipped: false,
    workspace_slug: workspaceSlug,
    workspace_id: workspaceId,
    ai_mode: aiPolicy.mode,
    monthly_ai_reply_limit: aiPolicy.monthlyLimit,
    allow_ai_auto_reply: aiPolicy.allowAutoReply,
    offer_id: aiPolicy.offerId
  };
}

async function findOrCreateCustomer(order) {
  const email = clean(order.customer_email, 254).toLowerCase();
  if (!email) return null;
  const gatePolicy = gatePolicyFromOrder(order);

  const existing = await q(`select id from customers where email=$1 limit 1`, [email]);
  if (existing.rowCount) {
    const customerId = existing.rows[0].id;
    await q(
      `update customers
       set plan_name=$2,
           monthly_cap_cents=$3,
           stripe_customer_id=coalesce($4, stripe_customer_id),
           stripe_subscription_id=coalesce($5, stripe_subscription_id),
           stripe_status=coalesce($6, stripe_status),
           default_rpm_limit=$7,
           default_rpd_limit=$8,
           max_devices_per_key=$9,
           require_install_id=$10,
           allowed_providers=$11,
           allowed_models=$12::jsonb,
           vault_storage_mb=$13,
           vault_file_limit=$14,
           vault_workspace_limit=$15,
           skypay_policy=coalesce(skypay_policy, '{}'::jsonb) || $16::jsonb,
           is_active=true
       where id=$1`,
      [
        customerId,
        gatePolicy.plan_name,
        gatePolicy.monthly_cap_cents,
        clean(order.stripe_customer_id, 160) || null,
        clean(order.stripe_subscription_id, 160) || null,
        clean(order.payment_status, 80) || null,
        gatePolicy.default_rpm_limit,
        gatePolicy.default_rpd_limit,
        gatePolicy.max_devices_per_key,
        gatePolicy.require_install_id,
        gatePolicy.allowed_providers,
        gatePolicy.allowed_models ? JSON.stringify(gatePolicy.allowed_models) : null,
        gatePolicy.vault_storage_mb,
        gatePolicy.vault_file_limit,
        gatePolicy.vault_workspace_limit,
        JSON.stringify(gatePolicy.skypay_policy)
      ]
    );
    return customerId;
  }

  const inserted = await q(
    `insert into customers(
       email, plan_name, monthly_cap_cents, stripe_customer_id, stripe_subscription_id, stripe_status,
       default_rpm_limit, default_rpd_limit, max_devices_per_key, require_install_id,
       allowed_providers, allowed_models, vault_storage_mb, vault_file_limit, vault_workspace_limit,
       skypay_policy
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16::jsonb)
     returning id`,
    [
      email,
      gatePolicy.plan_name,
      gatePolicy.monthly_cap_cents,
      clean(order.stripe_customer_id, 160) || null,
      clean(order.stripe_subscription_id, 160) || null,
      clean(order.payment_status, 80) || null,
      gatePolicy.default_rpm_limit,
      gatePolicy.default_rpd_limit,
      gatePolicy.max_devices_per_key,
      gatePolicy.require_install_id,
      gatePolicy.allowed_providers,
      gatePolicy.allowed_models ? JSON.stringify(gatePolicy.allowed_models) : null,
      gatePolicy.vault_storage_mb,
      gatePolicy.vault_file_limit,
      gatePolicy.vault_workspace_limit,
      JSON.stringify(gatePolicy.skypay_policy)
    ]
  );
  return inserted.rows[0]?.id || null;
}

export default wrap(async (req) => {
  const cors = skyePayHeaders(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });

  const admin = requireAdmin(req);
  if (!admin) return json(401, { error: "Unauthorized" }, cors);

  if (req.method === "GET") {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "50", 10)));
    const status = clean(url.searchParams.get("status"), 80);
    const rows = await q(
      `select id, client_slug, workspace_slug, customer_id, customer_email, customer_name, company_name,
              offer_id, offer_snapshot, amount_setup_cents, amount_recurring_cents, currency,
              checkout_mode, stripe_session_id, stripe_customer_id, stripe_subscription_id,
              payment_intent_id, payment_status, approval_status, owner_status, provisioning_status,
              source, metadata, paid_at, approved_at, provisioned_at, created_at, updated_at
       from skyepay_orders
       where ($1::text = '' or approval_status=$1 or owner_status=$1 or provisioning_status=$1)
       order by created_at desc
       limit $2`,
      [status, limit]
    );
    const summary = await q(
      `select
          count(*)::int as total,
          count(*) filter (where approval_status='paid_pending_owner_approval')::int as pending_approval,
          count(*) filter (where approval_status='approved')::int as approved,
          count(*) filter (where provisioning_status='workspace_unlocked')::int as workspace_unlocked
       from skyepay_orders`,
      []
    );
    return json(200, { ok: true, orders: rows.rows, summary: summary.rows[0] || {} }, cors);
  }

  if (req.method === "PATCH") {
    let body;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON", cors);
    }

    const orderId = clean(body.order_id || body.id, 180);
    const action = clean(body.action, 80);
    if (!orderId) return badRequest("Missing order_id", cors);
    if (!["approve", "void", "mark_provisioned"].includes(action)) return badRequest("Unsupported SkyePay action", cors);

    const orderRes = await q(`select * from skyepay_orders where id=$1 limit 1`, [orderId]);
    if (!orderRes.rowCount) return json(404, { error: "SkyePay order not found" }, cors);
    const order = orderRes.rows[0];
    const approvalStatus = clean(order.approval_status, 80);

    let customerId = order.customer_id || null;
    if (action === "approve") {
      if (!canApproveSkyePayOrder(order)) {
        return json(409, { error: "Order is not in a paid or no-payment-required state yet." }, cors);
      }
      customerId = await findOrCreateCustomer(order);
      let vaultProvisioning = null;
      let relay13AiActivation = null;
      if (isVaultProvisioningOrder(order)) {
        try {
          vaultProvisioning = await provisionVaultWorkspaceForOrder(order, { action: "provision", source: "admin_approve" });
          if (vaultProvisioning.ok && !vaultProvisioning.skipped) {
            await markVaultProvisioningResult(orderId, vaultProvisioning);
          }
        } catch (error) {
          await markVaultProvisioningFailure(orderId, error);
          return json(502, { error: `Vault provisioning failed: ${error.message}` }, cors);
        }
      }
      try {
        relay13AiActivation = await activateRelay13AiAddon(order);
      } catch (error) {
        relay13AiActivation = {
          ok: false,
          skipped: false,
          reason: "activation_exception",
          error: clean(error.message || "Relay13 AI add-on activation failed", 500)
        };
      }
      await q(
        `update skyepay_orders
         set customer_id=coalesce($2, customer_id),
             approval_status='approved',
             owner_status=case when $4::boolean then 'auto_approved' else 'approved' end,
             provisioning_status=case when $4::boolean then 'workspace_unlocked' when provisioning_status='workspace_unlocked' then provisioning_status else 'ready_to_unlock' end,
             approved_at=coalesce(approved_at, now()),
             provisioned_at=case when $4::boolean then coalesce(provisioned_at, now()) else provisioned_at end,
             updated_at=now(),
             metadata=metadata || $3::jsonb
         where id=$1`,
        [orderId, customerId, JSON.stringify({
          approved_by: admin.role || "admin",
          approved_via: admin.via || "admin",
          last_owner_action: "approve",
          last_owner_action_at: new Date().toISOString(),
          vault_provisioning: vaultProvisioning ? {
            ok: vaultProvisioning.ok === true,
            workspaceId: vaultProvisioning.workspace?.workspaceId || null,
            keyCreated: vaultProvisioning.keyCreated === true
          } : null,
          relay13_ai_activation: relay13AiActivation ? {
            ok: relay13AiActivation.ok === true,
            skipped: relay13AiActivation.skipped === true,
            reason: relay13AiActivation.reason || null,
            workspace_slug: relay13AiActivation.workspace_slug || null,
            workspace_id: relay13AiActivation.workspace_id || null,
            ai_mode: relay13AiActivation.ai_mode || null,
            monthly_ai_reply_limit: relay13AiActivation.monthly_ai_reply_limit || null,
            offer_id: relay13AiActivation.offer_id || order.offer_id
          } : null
        }), Boolean((vaultProvisioning?.ok && !vaultProvisioning?.skipped) || (relay13AiActivation?.ok && !relay13AiActivation?.skipped))]
      );
      await audit("admin", "SKYEPAY_APPROVE", `skyepay:${orderId}`, { customer_id: customerId, offer_id: order.offer_id, relay13_ai_activation: relay13AiActivation || null });
    }

    if (action === "void") {
      await q(
        `update skyepay_orders
         set approval_status='void',
             owner_status='void',
             provisioning_status='void',
             updated_at=now(),
             metadata=metadata || $2::jsonb
         where id=$1`,
        [orderId, JSON.stringify({
          voided_by: admin.role || "admin",
          voided_via: admin.via || "admin",
          last_owner_action: "void",
          last_owner_action_at: new Date().toISOString()
        })]
      );
      await audit("admin", "SKYEPAY_VOID", `skyepay:${orderId}`, { offer_id: order.offer_id });
    }

    if (action === "mark_provisioned") {
      if (approvalStatus !== "approved") {
        return json(409, { error: "Workspace unlock requires owner approval first." }, cors);
      }
      let vaultProvisioning = null;
      let relay13AiActivation = null;
      if (isVaultProvisioningOrder(order)) {
        try {
          vaultProvisioning = await provisionVaultWorkspaceForOrder(order, { action: "provision", source: "admin_mark_provisioned" });
        } catch (error) {
          await markVaultProvisioningFailure(orderId, error);
          return json(502, { error: `Vault provisioning failed: ${error.message}` }, cors);
        }
      }
      try {
        relay13AiActivation = await activateRelay13AiAddon(order);
      } catch (error) {
        relay13AiActivation = {
          ok: false,
          skipped: false,
          reason: "activation_exception",
          error: clean(error.message || "Relay13 AI add-on activation failed", 500)
        };
      }
      await q(
        `update skyepay_orders
         set provisioning_status='workspace_unlocked',
             provisioned_at=coalesce(provisioned_at, now()),
             updated_at=now(),
             metadata=metadata || $2::jsonb
         where id=$1`,
        [orderId, JSON.stringify({
          provisioned_by: admin.role || "admin",
          provisioned_via: admin.via || "admin",
          last_owner_action: "mark_provisioned",
          last_owner_action_at: new Date().toISOString(),
          vault_provisioning: vaultProvisioning ? {
            ok: vaultProvisioning.ok === true,
            workspaceId: vaultProvisioning.workspace?.workspaceId || null,
            keyCreated: vaultProvisioning.keyCreated === true
          } : null,
          relay13_ai_activation: relay13AiActivation ? {
            ok: relay13AiActivation.ok === true,
            skipped: relay13AiActivation.skipped === true,
            reason: relay13AiActivation.reason || null,
            workspace_slug: relay13AiActivation.workspace_slug || null,
            workspace_id: relay13AiActivation.workspace_id || null,
            ai_mode: relay13AiActivation.ai_mode || null,
            monthly_ai_reply_limit: relay13AiActivation.monthly_ai_reply_limit || null,
            offer_id: relay13AiActivation.offer_id || order.offer_id
          } : null
        })]
      );
      await audit("admin", "SKYEPAY_WORKSPACE_UNLOCKED", `skyepay:${orderId}`, { customer_id: customerId, relay13_ai_activation: relay13AiActivation || null });
    }

    const updated = await q(`select * from skyepay_orders where id=$1`, [orderId]);
    return json(200, { ok: true, order: updated.rows[0] || null }, cors);
  }

  return json(405, { error: "Method not allowed" }, cors);
});
