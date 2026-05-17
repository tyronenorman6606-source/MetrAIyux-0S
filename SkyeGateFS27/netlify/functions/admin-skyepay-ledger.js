import { wrap } from "./_lib/wrap.js";
import { json, badRequest } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin.js";
import { audit } from "./_lib/audit.js";
import { q } from "./_lib/db.js";
import { canApproveSkyePayOrder, skyePayHeaders } from "./_lib/skyepaySecurity.js";
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
      owner_approval_required: offer.owner_approval_required === true,
      activation_path: clean(offer.activation_path, 180) || "auto_unlock_after_confirmed_payment",
      gate_policy: policy
    }
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
          } : null
        }), Boolean(vaultProvisioning?.ok && !vaultProvisioning?.skipped)]
      );
      await audit("admin", "SKYEPAY_APPROVE", `skyepay:${orderId}`, { customer_id: customerId, offer_id: order.offer_id });
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
      if (isVaultProvisioningOrder(order)) {
        try {
          vaultProvisioning = await provisionVaultWorkspaceForOrder(order, { action: "provision", source: "admin_mark_provisioned" });
        } catch (error) {
          await markVaultProvisioningFailure(orderId, error);
          return json(502, { error: `Vault provisioning failed: ${error.message}` }, cors);
        }
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
          } : null
        })]
      );
      await audit("admin", "SKYEPAY_WORKSPACE_UNLOCKED", `skyepay:${orderId}`, { customer_id: customerId });
    }

    const updated = await q(`select * from skyepay_orders where id=$1`, [orderId]);
    return json(200, { ok: true, order: updated.rows[0] || null }, cors);
  }

  return json(405, { error: "Method not allowed" }, cors);
});
