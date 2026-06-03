import { q } from "./db.js";
import { hmacSha256Hex } from "./crypto.js";

const COMMERCE_SECRET_NAMES = Object.freeze([
  "SKYEPAY_COMMERCE_SHARED_SECRET",
  "SKYECOMMERCE_SKYEPAY_SHARED_SECRET",
  "SKYGATEFS27_EVENT_MIRROR_SECRET",
  "FS27_EVENT_MIRROR_SECRET",
  "PLATFORM_EVENT_MIRROR_SECRET",
  "SKYGATE_EVENT_MIRROR_SECRET"
]);

const WEBHOOK_SECRET_NAMES = Object.freeze([
  "SKYECOMMERCE_PAYMENT_WEBHOOK_SECRET",
  "PAYMENT_WEBHOOK_SECRET",
  "SKYECOMMERCE_SESSION_SECRET"
]);

function safeText(value = "", max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function envText(name = "", env = process.env) {
  return safeText(env?.[name] ?? "", 2000);
}

function withoutTrailingSlash(value = "") {
  return safeText(value, 2000).replace(/\/+$/, "");
}

export function skyePaySkyeCommerceMetadata(order = {}) {
  const metadata = order?.metadata && typeof order.metadata === "object" ? order.metadata : {};
  const nested = metadata.metadata && typeof metadata.metadata === "object" ? metadata.metadata : {};
  const snapshot = order?.offer_snapshot && typeof order.offer_snapshot === "object" ? order.offer_snapshot : {};
  return {
    ...nested,
    ...metadata,
    offer_family: order?.offer_family || snapshot.family || metadata.offer_family || nested.offer_family || "",
    activation_path: order?.activation_path || snapshot.activation_path || metadata.activation_path || nested.activation_path || ""
  };
}

export function isSkyeCommerceOrder(order = {}) {
  const metadata = skyePaySkyeCommerceMetadata(order);
  return String(metadata.skyecommerce_dynamic || "").toLowerCase() === "true"
    || String(metadata.offer_family || "").toLowerCase() === "skyecommerce"
    || String(order?.offer_id || "").toLowerCase().startsWith("skyecommerce-")
    || String(metadata.activation_path || "").toLowerCase() === "skyecommerce_order_payment_confirmed";
}

function paymentWebhookUrl(env = process.env) {
  const explicit = [
    "SKYECOMMERCE_PAYMENT_WEBHOOK_URL",
    "SKYECOMMERCE_SKYEPAY_PAYMENT_WEBHOOK_URL",
    "SKYEPAY_SKYECOMMERCE_PAYMENT_WEBHOOK_URL"
  ].map((name) => envText(name, env)).find(Boolean);
  if (explicit) return explicit;

  const origin = [
    "SKYECOMMERCE_ORIGIN",
    "SKYECOMMERCE_WORKER_URL",
    "SKYECOMMERCE_PUBLIC_BASE_URL"
  ].map((name) => envText(name, env)).find(Boolean);
  if (!origin) return "";

  return `${withoutTrailingSlash(origin)}/api/payments/webhook`;
}

function signingSecret(env = process.env) {
  const webhookSecret = WEBHOOK_SECRET_NAMES.map((name) => envText(name, env)).find(Boolean);
  if (webhookSecret) return { secret: webhookSecret, header: "x-skye-signature", prefix: "" };
  const commerceSecret = COMMERCE_SECRET_NAMES.map((name) => envText(name, env)).find(Boolean);
  if (commerceSecret) return { secret: commerceSecret, header: "x-skyepay-commerce-signature", prefix: "sha256=" };
  return { secret: "", header: "", prefix: "" };
}

export function buildSkyeCommercePaymentWebhookBody(order = {}, session = {}, options = {}) {
  const metadata = skyePaySkyeCommerceMetadata(order);
  return {
    provider: "skyepay",
    checkoutToken: safeText(metadata.skyecommerce_checkout_token, 160),
    providerReference: safeText(session?.id || order?.stripe_session_id, 220),
    status: "paid",
    amountCents: Math.max(0, Number(session?.amount_total ?? metadata.skyecommerce_amount_cents ?? 0) || 0),
    currency: safeText(session?.currency || metadata.skyecommerce_currency || order?.currency || "USD", 12).toUpperCase(),
    eventId: safeText(options?.eventId || options?.event?.id || "", 220),
    note: "SkyePay checkout completed through Stripe.",
    skyepay_order_id: safeText(order?.id, 180),
    stripe_session_id: safeText(session?.id, 220),
    stripe_payment_intent_id: typeof session?.payment_intent === "string" ? safeText(session.payment_intent, 220) : "",
    skyecommerce_merchant_id: safeText(metadata.skyecommerce_merchant_id, 160),
    skyecommerce_order_id: safeText(metadata.skyecommerce_order_id, 160),
    skyecommerce_payment_transaction_id: safeText(metadata.skyecommerce_payment_transaction_id, 160)
  };
}

export async function markSkyeCommercePaymentDeliveryResult(orderId, result = {}) {
  if (!orderId) return;
  await q(
    `update skyepay_orders
     set approval_status=case when approval_status in ('approved','void','refunded') then approval_status else 'payment_confirmed' end,
         owner_status=case when owner_status in ('approved','void') then owner_status else 'payment_confirmed' end,
         provisioning_status='skyecommerce_order_confirmed',
         metadata=metadata || $2::jsonb,
         updated_at=now()
     where id=$1`,
    [
      orderId,
      JSON.stringify({
        skyecommerce_payment_webhook: {
          ok: true,
          status: result.status || 200,
          delivered_at: new Date().toISOString(),
          checkout_token: result.checkoutToken || "",
          url_configured: Boolean(result.url)
        }
      })
    ]
  );
}

export async function markSkyeCommercePaymentDeliveryFailure(orderId, errorOrResult = {}) {
  if (!orderId) return;
  const message = errorOrResult?.message || errorOrResult?.error || errorOrResult?.reason || String(errorOrResult || "SkyeCommerce payment webhook failed.");
  await q(
    `update skyepay_orders
     set provisioning_status=case when provisioning_status='skyecommerce_order_confirmed' then provisioning_status else 'skyecommerce_payment_webhook_pending' end,
         metadata=metadata || $2::jsonb,
         updated_at=now()
     where id=$1`,
    [
      orderId,
      JSON.stringify({
        skyecommerce_payment_webhook: {
          ok: false,
          status: errorOrResult?.status || 0,
          error: safeText(message, 600),
          last_attempt_at: new Date().toISOString(),
          url_configured: Boolean(errorOrResult?.url)
        }
      })
    ]
  );
}

export async function notifySkyeCommercePaymentComplete(order = {}, session = {}, options = {}) {
  if (!isSkyeCommerceOrder(order)) return { ok: true, skipped: true, reason: "not_skyecommerce_order" };

  const body = buildSkyeCommercePaymentWebhookBody(order, session, options);
  if (!body.checkoutToken) {
    return { ok: false, skipped: true, reason: "skyecommerce_checkout_token_missing", checkoutToken: "" };
  }

  const url = paymentWebhookUrl(options.env || process.env);
  if (!url) return { ok: false, skipped: true, reason: "skyecommerce_payment_webhook_url_missing", checkoutToken: body.checkoutToken };

  const signer = signingSecret(options.env || process.env);
  if (!signer.secret) return { ok: false, skipped: true, reason: "skyecommerce_payment_webhook_secret_missing", url, checkoutToken: body.checkoutToken };

  const raw = JSON.stringify(body);
  const digest = hmacSha256Hex(signer.secret, raw);
  const headers = {
    "content-type": "application/json",
    "user-agent": "SkyePay-FS27-StripeWebhook/1.0",
    "x-skyepay-order-id": body.skyepay_order_id
  };
  headers[signer.header] = `${signer.prefix}${digest}`;

  const fetchImpl = options.fetch || globalThis.fetch;
  if (typeof fetchImpl !== "function") return { ok: false, skipped: true, reason: "fetch_unavailable", url, checkoutToken: body.checkoutToken };

  const response = await fetchImpl(url, { method: "POST", headers, body: raw });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return {
    ok: response.ok && data?.ok !== false,
    status: response.status,
    url,
    checkoutToken: body.checkoutToken,
    response: data
  };
}
