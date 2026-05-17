import { audit } from "./audit.js";
import { q } from "./db.js";

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

export function skyePayPaymentConfirmed(value) {
  const status = String(value || "").toLowerCase();
  return ["paid", "complete", "no_payment_required", "active", "trialing"].includes(status);
}

export function skyePayOfferRequiresOwnerApproval(source = {}) {
  const offer = source.offer_snapshot && typeof source.offer_snapshot === "object"
    ? source.offer_snapshot
    : source;
  const metadata = source.metadata && typeof source.metadata === "object" ? source.metadata : {};
  const activationPath = String(offer.activation_path || metadata.activation_path || source.activation_path || "").toLowerCase();
  return offer.owner_approval_required === true ||
    metadata.owner_approval_required === true ||
    String(metadata.owner_approval_required || "").toLowerCase() === "true" ||
    activationPath.includes("owner_approval") ||
    activationPath.includes("pending_owner");
}

export function skyePayOrderStatusesForPayment({ offer = {}, paymentConfirmed = false } = {}) {
  if (!paymentConfirmed) {
    return {
      approval_status: "checkout_created",
      owner_status: "waiting_for_checkout",
      provisioning_status: "waiting_for_payment"
    };
  }

  if (skyePayOfferRequiresOwnerApproval(offer)) {
    return {
      approval_status: "paid_pending_owner_approval",
      owner_status: "pending_owner_approval",
      provisioning_status: "waiting_for_owner_approval"
    };
  }

  return {
    approval_status: "payment_confirmed",
    owner_status: "auto_unlock_pending",
    provisioning_status: "auto_unlock_pending"
  };
}

export function gatePolicyFromOrder(order) {
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
      owner_approval_required: skyePayOfferRequiresOwnerApproval(order),
      activation_path: clean(offer.activation_path, 180) || "auto_unlock_after_confirmed_payment",
      gate_policy: policy
    }
  };
}

export async function findOrCreateSkyePayCustomer(order) {
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

export async function autoUnlockSkyePayOrder(order, { source = "stripe_webhook", eventType = "" } = {}) {
  if (!order?.id) return null;
  if (!skyePayPaymentConfirmed(order.payment_status)) return null;
  if (skyePayOfferRequiresOwnerApproval(order)) {
    const result = await q(
      `update skyepay_orders
       set approval_status=case
             when approval_status in ('approved','void','refunded') then approval_status
             else 'paid_pending_owner_approval'
           end,
           owner_status=case
             when owner_status in ('approved','void') then owner_status
             else 'pending_owner_approval'
           end,
           provisioning_status=case
             when provisioning_status in ('workspace_unlocked','void') then provisioning_status
             else 'waiting_for_owner_approval'
           end,
           metadata=metadata || $2::jsonb,
           updated_at=now()
       where id=$1
       returning *`,
      [
        order.id,
        JSON.stringify({
          owner_approval_gate: {
            source,
            event_type: eventType || null,
            held_at: new Date().toISOString(),
            rule: "owner_approved_offer_cannot_auto_unlock"
          }
        })
      ]
    );
    await audit("system", "SKYEPAY_OWNER_APPROVAL_REQUIRED", `skyepay:${order.id}`, {
      offer_id: order.offer_id,
      event_type: eventType || null
    });
    return result.rows[0] || order;
  }

  const customerId = await findOrCreateSkyePayCustomer(order);
  const result = await q(
    `update skyepay_orders
     set customer_id=coalesce($2, customer_id),
         approval_status='approved',
         owner_status='auto_approved',
         provisioning_status='workspace_unlocked',
         approved_at=coalesce(approved_at, now()),
         provisioned_at=coalesce(provisioned_at, now()),
         updated_at=now(),
         metadata=metadata || $3::jsonb
     where id=$1
     returning *`,
    [
      order.id,
      customerId,
      JSON.stringify({
        auto_unlock: {
          source,
          event_type: eventType || null,
          customer_id: customerId,
          unlocked_at: new Date().toISOString(),
          rule: "stripe_confirmed_skyepay_transaction"
        }
      })
    ]
  );
  await audit("system", "SKYEPAY_AUTO_WORKSPACE_UNLOCKED", `skyepay:${order.id}`, {
    customer_id: customerId,
    offer_id: order.offer_id,
    event_type: eventType || null
  });
  return result.rows[0] || null;
}
