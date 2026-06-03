import { wrap } from "./_lib/wrap.js";
import { json, badRequest } from "./_lib/http.js";
import { audit } from "./_lib/audit.js";
import { q } from "./_lib/db.js";
import { hmacSha256Hex } from "./_lib/crypto.js";
import { cleanRequestToken, skyePayHeaders } from "./_lib/skyepaySecurity.js";
import { publicProviderRuntime, runZeroOsProviderAction } from "./_lib/providerRuntime.js";

function skyPayCommerceSecret() {
  const names = [
    "SKYEPAY_COMMERCE_SHARED_SECRET",
    "SKYECOMMERCE_SKYEPAY_SHARED_SECRET",
    "SKYGATEFS27_EVENT_MIRROR_SECRET",
    "FS27_EVENT_MIRROR_SECRET",
    "PLATFORM_EVENT_MIRROR_SECRET",
    "SKYGATE_EVENT_MIRROR_SECRET"
  ];
  for (const name of names) {
    const value = String(process.env[name] || "").trim();
    if (value) return value;
  }
  return "";
}

function cleanCommerceSignature(value = "") {
  return String(value || "").trim().replace(/^sha256=/i, "").toLowerCase();
}

function constantEqual(a = "", b = "") {
  const left = cleanCommerceSignature(a);
  const right = cleanCommerceSignature(b);
  if (!left || !right || left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
}

function verifySkyeCommerceSignature(req, rawText = "") {
  const secret = skyPayCommerceSecret();
  if (!secret) return { ok: false, code: "SKYEPAY_COMMERCE_SECRET_MISSING" };
  const provided = req.headers.get("x-skyepay-commerce-signature")
    || req.headers.get("x-skyecommerce-signature")
    || req.headers.get("x-skye-signature")
    || "";
  const expected = hmacSha256Hex(secret, rawText);
  return constantEqual(provided, expected)
    ? { ok: true }
    : { ok: false, code: "SKYEPAY_COMMERCE_SIGNATURE_INVALID" };
}

function normalizeRefundBody(body = {}) {
  const amountCents = Math.max(0, Math.trunc(Number(body.amount_cents ?? body.amountCents ?? 0)));
  return {
    sessionId: cleanRequestToken(body.session_id || body.sessionId, 220),
    amountCents,
    reason: cleanRequestToken(body.reason || "requested_by_customer", 120),
    idempotencyKey: cleanRequestToken(body.idempotency_key || body.idempotencyKey, 220),
    skyecommerce: body.skyecommerce && typeof body.skyecommerce === "object" ? body.skyecommerce : {}
  };
}

function metadataObject(order = {}) {
  const metadata = order.metadata && typeof order.metadata === "object" ? order.metadata : {};
  const nested = metadata.metadata && typeof metadata.metadata === "object" ? metadata.metadata : {};
  return { ...nested, ...metadata };
}

function refundableOrderAmountCents(order = {}) {
  const metadata = metadataObject(order);
  const adjustedDue = Number(metadata.skyemerit_adjusted_due_cents || metadata.adjusted_due_cents || 0);
  if (Number.isFinite(adjustedDue) && adjustedDue > 0) return Math.trunc(adjustedDue);
  return Math.max(0, Number(order.amount_setup_cents || 0) + Number(order.amount_recurring_cents || 0));
}

function nextRefundState({ order = {}, amountCents = 0, priorRefundedCents = 0 } = {}) {
  const orderAmount = refundableOrderAmountCents(order);
  const totalRefunded = Math.max(0, Number(priorRefundedCents || 0)) + Math.max(0, Number(amountCents || 0));
  const fullRefund = orderAmount > 0 && totalRefunded >= orderAmount;
  return {
    order_amount_cents: orderAmount,
    total_refunded_cents: totalRefunded,
    full_refund: fullRefund,
    payment_status: fullRefund ? "refunded" : "partially_refunded",
    approval_status: fullRefund ? "refunded" : cleanRequestToken(order.approval_status || "paid_pending_owner_approval", 80),
    owner_status: fullRefund ? "refunded" : cleanRequestToken(order.owner_status || "pending_owner_approval", 80),
    provisioning_status: fullRefund ? "refunded" : cleanRequestToken(order.provisioning_status || "waiting_for_owner_approval", 80)
  };
}

async function getOrderBySession(sessionId) {
  const res = await q(
    `select id, client_slug, workspace_slug, customer_email, offer_id, amount_setup_cents,
            amount_recurring_cents, currency, stripe_session_id, payment_intent_id,
            payment_status, approval_status, owner_status, provisioning_status, metadata
     from skyepay_orders
     where stripe_session_id=$1
     limit 1`,
    [sessionId]
  );
  return res.rows[0] || null;
}

export default wrap(async (req) => {
  const headers = skyePayHeaders(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, headers);

  let rawText = "";
  let rawBody;
  try {
    rawText = await req.text();
    rawBody = JSON.parse(rawText || "{}");
  } catch {
    return badRequest("Invalid JSON", headers);
  }

  const signature = verifySkyeCommerceSignature(req, rawText);
  if (!signature.ok) return json(401, { error: "Invalid SkyeCommerce SkyPay signature", code: signature.code }, headers);

  const body = normalizeRefundBody(rawBody);
  if (!body.sessionId) return badRequest("session_id is required", headers);
  if (!body.amountCents) return badRequest("amount_cents is required", headers);

  const order = await getOrderBySession(body.sessionId);
  if (!order) return json(404, { error: "SkyePay order not found", code: "SKYEPAY_ORDER_NOT_FOUND" }, headers);

  const priorRefunds = await q(
    `select coalesce(sum(amount_cents), 0)::int as refunded_cents
     from skyepay_refunds
     where skyepay_order_id=$1 and status in ('succeeded','pending','requires_action')`,
    [order.id]
  );
  const priorRefundedCents = Number(priorRefunds.rows[0]?.refunded_cents || 0);
  const orderAmountCents = refundableOrderAmountCents(order);
  const remainingRefundableCents = Math.max(0, orderAmountCents - priorRefundedCents);
  if (!remainingRefundableCents) {
    return json(409, { error: "Order has already been fully refunded.", code: "SKYEPAY_ORDER_ALREADY_REFUNDED" }, headers);
  }
  if (body.amountCents > remainingRefundableCents) {
    return json(400, {
      error: "Refund amount exceeds the remaining refundable balance.",
      code: "SKYEPAY_REFUND_AMOUNT_EXCEEDS_REMAINING",
      remaining_refundable_cents: remainingRefundableCents,
      prior_refunded_cents: priorRefundedCents,
      order_amount_cents: orderAmountCents
    }, headers);
  }

  let paymentIntentId = order.payment_intent_id || "";
  let retrieveRuntimeReceipt = null;
  if (!paymentIntentId) {
    const retrieveRuntime = await runZeroOsProviderAction({
      provider_id: "stripe",
      action: "stripe.checkout.retrieve",
      app_id: "skyepay",
      workspace_id: order.workspace_slug || order.client_slug,
      customer_id: order.customer_email,
      client_id: order.client_slug,
      usage_lane: "skyepay:checkout-retrieve-for-refund",
      payload: { session_id: body.sessionId }
    });
    retrieveRuntimeReceipt = retrieveRuntime.receipt;
    if (!retrieveRuntime.ok) {
      await audit("system", "SKYEPAY_PROVIDER_RUNTIME_CHECKOUT_RETRIEVE_FAILED", `skyepay:${order.id}`, {
        stripe_session_id: body.sessionId,
        provider_runtime_receipt_id: retrieveRuntimeReceipt?.id || "",
        error: retrieveRuntimeReceipt?.error || retrieveRuntime.response?.error || "stripe_checkout_retrieve_runtime_failed"
      });
      return json(retrieveRuntime.status || 502, {
        error: "Stripe checkout provider runtime failed",
        code: "STRIPE_PROVIDER_RUNTIME_FAILED",
        provider_runtime: publicProviderRuntime(retrieveRuntimeReceipt)
      }, headers);
    }
    paymentIntentId = retrieveRuntimeReceipt?.provider_result?.payment_intent_id || "";
    if (paymentIntentId) {
      await q(`update skyepay_orders set payment_intent_id=$1, updated_at=now() where id=$2`, [paymentIntentId, order.id]);
    }
  }
  if (!paymentIntentId) return json(409, { error: "Stripe payment intent is not available for this SkyPay order", code: "PAYMENT_INTENT_NOT_FOUND" }, headers);

  const refundRuntime = await runZeroOsProviderAction({
    provider_id: "stripe",
    action: "stripe.refund.create",
    app_id: "skyepay",
    workspace_id: order.workspace_slug || order.client_slug,
    customer_id: order.customer_email,
    client_id: order.client_slug,
    usage_lane: "skyepay:refund",
    payload: {
      payment_intent_id: paymentIntentId,
      amount_cents: body.amountCents,
      reason: ["duplicate", "fraudulent", "requested_by_customer"].includes(body.reason) ? body.reason : "requested_by_customer",
      source: "skyecommerce",
      idempotency_key: `skyepay_refund:${body.idempotencyKey || order.id}:${body.amountCents}`.slice(0, 255),
      skyecommerce: body.skyecommerce
    }
  });
  const refundRuntimeReceipt = refundRuntime.receipt;
  if (!refundRuntime.ok) {
    await audit("system", "SKYEPAY_PROVIDER_RUNTIME_REFUND_FAILED", `skyepay:${order.id}`, {
      stripe_session_id: body.sessionId,
      payment_intent_id: paymentIntentId,
      amount_cents: body.amountCents,
      provider_runtime_receipt_id: refundRuntimeReceipt?.id || "",
      error: refundRuntimeReceipt?.error || refundRuntime.response?.error || "stripe_refund_runtime_failed"
    });
    return json(refundRuntime.status || 502, {
      error: "Stripe refund provider runtime failed",
      code: "STRIPE_PROVIDER_RUNTIME_FAILED",
      provider_runtime: publicProviderRuntime(refundRuntimeReceipt)
    }, headers);
  }
  const refund = {
    id: refundRuntimeReceipt?.provider_result?.id || `re_provider_${crypto.randomUUID()}`,
    status: refundRuntimeReceipt?.provider_result?.status || "succeeded",
    currency: refundRuntimeReceipt?.provider_result?.currency || order.currency || "usd"
  };

  const next = nextRefundState({ order, amountCents: body.amountCents, priorRefundedCents });
  await q(
    `update skyepay_orders
     set payment_status=$1,
         approval_status=$2,
         owner_status=$3,
         provisioning_status=$4,
         updated_at=now(),
         metadata=coalesce(metadata, '{}'::jsonb) || $5::jsonb
     where id=$6`,
    [
      next.payment_status,
      next.approval_status,
      next.owner_status,
      next.provisioning_status,
      JSON.stringify({
        last_refund: {
          source: "skyecommerce",
          amount_cents: body.amountCents,
          order_amount_cents: next.order_amount_cents,
          total_refunded_cents: next.total_refunded_cents,
          full_refund: next.full_refund,
          refund_status: refund.status || "succeeded",
          provider_runtime_receipt_id: refundRuntimeReceipt?.id || "",
          checkout_retrieve_provider_runtime_receipt_id: retrieveRuntimeReceipt?.id || ""
        }
      }),
      order.id
    ]
  );
  await q(
    `insert into skyepay_refunds (
       id, skyepay_order_id, stripe_refund_id, stripe_payment_intent_id, amount_cents,
       currency, status, reason, metadata
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
     on conflict (stripe_refund_id) do update set
       status=excluded.status,
       metadata=excluded.metadata,
       updated_at=now()`,
    [
      `skypay_ref_${refund.id}`,
      order.id,
      refund.id,
      paymentIntentId,
      body.amountCents,
      String(order.currency || refund.currency || "usd").toLowerCase(),
      refund.status || "succeeded",
      body.reason,
      JSON.stringify({
        source: "skyecommerce",
        skyecommerce: body.skyecommerce,
        order_amount_cents: next.order_amount_cents,
        total_refunded_cents: next.total_refunded_cents,
        full_refund: next.full_refund
      })
    ]
  );
  await audit("system", "SKYEPAY_REFUND_CREATED", `skyepay:${order.id}`, {
    stripe_refund_id: refund.id,
    stripe_session_id: body.sessionId,
    amount_cents: body.amountCents,
    provider_runtime_receipt_id: refundRuntimeReceipt?.id || "",
    checkout_retrieve_provider_runtime_receipt_id: retrieveRuntimeReceipt?.id || "",
    skyecommerce: body.skyecommerce
  });

  return json(200, {
    ok: true,
    refund_id: refund.id,
    order_id: order.id,
    payment_intent_id: paymentIntentId,
    amount_cents: body.amountCents,
    currency: order.currency || refund.currency || "usd",
    status: refund.status || "succeeded",
    payment_status: next.payment_status,
    full_refund: next.full_refund,
    provider_runtime: publicProviderRuntime(refundRuntimeReceipt),
    checkout_retrieve_provider_runtime: publicProviderRuntime(retrieveRuntimeReceipt)
  }, headers);
});
