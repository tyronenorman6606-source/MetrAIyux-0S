import { wrap } from "./_lib/wrap.js";
import { json, badRequest } from "./_lib/http.js";
import { audit } from "./_lib/audit.js";
import { q } from "./_lib/db.js";
import { hmacSha256Hex } from "./_lib/crypto.js";
import {
  cleanRequestToken,
  resolveSkyePayReturnOrigin,
  resolveSkyePayReturnUrl,
  skyePayHeaders
} from "./_lib/skyepaySecurity.js";
import {
  buildSkyCartOffer,
  buildSkyeCommerceDynamicOffer,
  buildSkyePayMetadata,
  buildStripeLineItemsWithCatalogPrices,
  getSkyePayClient,
  getSkyePayOffer,
  makeDemoSession,
  normalizeSkyePayCheckoutBody,
  resolveSkyePayTrialDays,
  upsertSkyePayOrderFromSession
} from "./_lib/skyepayCatalog.js";
import {
  SKYEMERIT_AUTO_CODE,
  SKYEMERIT_FIRST_TIME_PACK_ID,
  buildSkyeMeritCheckout
} from "./_lib/skyeMerit.js";
import {
  SKYPAY_LEGAL_ACCEPTANCE_URLS,
  missingLegalAcceptance
} from "./_lib/legalAcceptance.js";
import { sendSkyePayOrderToRelay13 } from "./_lib/relay13Bridge.js";
import { publicProviderRuntime, runZeroOsProviderAction } from "./_lib/providerRuntime.js";

function allowDryRun(req) {
  const url = new URL(req.url);
  const host = url.hostname;
  if (["localhost", "127.0.0.1", "::1"].includes(host)) return true;
  if (host === "skyegatefs27.internal" && req.headers.get("x-skypay-proof-mode") === "1") return true;
  return String(process.env.SKYPAY_ALLOW_PUBLIC_DRY_RUN || "").toLowerCase() === "true";
}

function sessionReturnUrls(req, origin, clientSlug, body = {}) {
  const success = new URL("/skyepay.html", origin);
  success.searchParams.set("client", clientSlug);
  success.searchParams.set("status", "success");
  success.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

  const cancel = new URL("/skyepay.html", origin);
  cancel.searchParams.set("client", clientSlug);
  cancel.searchParams.set("status", "cancelled");

  return {
    success_url: process.env.SKYPAY_SUCCESS_URL || resolveSkyePayReturnUrl(req, body.success_url, success.toString()),
    cancel_url: process.env.SKYPAY_CANCEL_URL || resolveSkyePayReturnUrl(req, body.cancel_url, cancel.toString())
  };
}

function makeOrderId(body) {
  const token = cleanRequestToken(body.idempotency_key, 140);
  if (token) return `skypay_${token}`.slice(0, 160);
  return `skypay_${crypto.randomUUID()}`;
}

function stripeIdempotencyKey(body, orderId) {
  const token = cleanRequestToken(body.idempotency_key, 190) || orderId;
  return `skyepay:${token}`.slice(0, 255);
}

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

async function firstTimeSkyeMeritEligible(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  try {
    const res = await q(
      `select id
       from skyepay_orders
       where lower(customer_email)=lower($1)
         and payment_status in ('paid','complete','no_payment_required','trialing','active')
       limit 1`,
      [normalized]
    );
    return !res.rowCount;
  } catch {
    return true;
  }
}

function scheduleBackground(promise, context) {
  try {
    if (context && typeof context.waitUntil === "function") {
      context.waitUntil(promise);
      return;
    }
    promise.catch((error) => console.warn("background task failed:", error?.message || error));
  } catch (error) {
    console.warn("background task scheduling failed:", error?.message || error);
  }
}

export default wrap(async (req, _cors, context) => {
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

  const dynamic = buildSkyeCommerceDynamicOffer(rawBody);
  if (dynamic?.active && !dynamic.ok) return badRequest(dynamic.error || "Invalid SkyeCommerce dynamic checkout", headers);
  if (dynamic?.active) {
    const signature = verifySkyeCommerceSignature(req, rawText);
    if (!signature.ok) return json(401, { error: "Invalid SkyeCommerce SkyPay signature", code: signature.code }, headers);
  }

  const normalizedBody = normalizeSkyePayCheckoutBody(rawBody);
  const body = dynamic?.active
    ? {
      ...normalizedBody,
      skyecommerce_dynamic: true,
      skyecommerce: dynamic.commerce,
      skyemerit_apply: false,
      skyemerit_first_time: false,
      skyecart_add_on_accepted: false,
      skyecart_add_on_offer_id: ""
    }
    : normalizedBody;
  const client = getSkyePayClient(body.client_slug);
  const primaryOffer = dynamic?.offer || getSkyePayOffer(body.offer_id || client.default_offer_id);
  if (!primaryOffer) return badRequest("Unknown SkyePay offer", headers);
  const addOnOffer = !dynamic?.active && body.skyecart_add_on_accepted && body.skyecart_add_on_offer_id
    ? getSkyePayOffer(body.skyecart_add_on_offer_id)
    : null;
  const skyCartOffer = addOnOffer ? buildSkyCartOffer({ offer: primaryOffer, addOnOffer }) : null;
  const offer = skyCartOffer || primaryOffer;
  const bodyWithSkyCart = skyCartOffer
    ? {
      ...body,
      skyecart_add_on_accepted: true,
      skyecart_primary_offer_id: primaryOffer.id,
      skyecart_add_on_offer_id: addOnOffer.id
    }
    : body;
  if (!body.customer_email) return badRequest("Valid customer_email is required", headers);
  const missingLegal = missingLegalAcceptance(bodyWithSkyCart);
  if (!body.dry_run && missingLegal.length) {
    return json(403, {
      error: "Legal Skyes transaction acceptance is required before checkout.",
      code: "LEGAL_ACCEPTANCE_REQUIRED",
      missing: missingLegal,
      legal_urls: SKYPAY_LEGAL_ACCEPTANCE_URLS
    }, headers);
  }

  const origin = resolveSkyePayReturnOrigin(req);
  if (body.dry_run) {
    if (!allowDryRun(req)) return json(403, { error: "Dry-run checkout is disabled on this host" }, headers);
    const demo = makeDemoSession({ client, offer, body: bodyWithSkyCart, origin });
    await audit("system", "SKYEPAY_DRY_RUN_CHECKOUT", `client:${client.slug}`, {
      offer_id: offer.id,
      skyecart_add_on_offer_id: bodyWithSkyCart.skyecart_add_on_offer_id || "",
      customer_email: body.customer_email
    });
    return json(200, demo, headers);
  }

  const orderId = makeOrderId(bodyWithSkyCart);
  const trialDays = resolveSkyePayTrialDays(offer, client);
  const firstTimeEligible = !dynamic?.active && body.skyemerit_first_time && await firstTimeSkyeMeritEligible(body.customer_email);
  const offerDefaultSkyeMeritCode = String(offer.skyemerit_default_code || "").trim();
  const offerDefaultSkyeMeritPack = String(offer.skyemerit_pack_id || "").trim();
  const requestedSkyeMeritCode = !dynamic?.active && body.skyemerit_apply
    ? (body.skyemerit_code || offerDefaultSkyeMeritCode || (firstTimeEligible ? SKYEMERIT_AUTO_CODE : ""))
    : "";
  const skyeMeritCheckout = requestedSkyeMeritCode
    ? buildSkyeMeritCheckout({
      offer,
      trialDays,
      code: requestedSkyeMeritCode,
      packId: body.skyemerit_pack_id || offerDefaultSkyeMeritPack || SKYEMERIT_FIRST_TIME_PACK_ID,
      firstTimeEligible
    })
    : null;
  const bodyWithMerit = { ...bodyWithSkyCart, skyeMeritCheckout };
  const metadata = buildSkyePayMetadata({ client, offer, body: bodyWithMerit, orderId, trialDays });
  const { success_url, cancel_url } = sessionReturnUrls(req, origin, client.slug, bodyWithSkyCart);

  if (skyeMeritCheckout?.applied
    && skyeMeritCheckout.allow_free_checkout === true
    && Number(skyeMeritCheckout.adjusted_due_cents || 0) === 0) {
    const session = {
      id: `skypay_zero_${crypto.randomUUID()}`,
      mode: offer.mode || "payment",
      status: "complete",
      payment_status: "no_payment_required",
      currency: offer.currency || "usd",
      amount_total: 0,
      customer_email: body.customer_email,
      client_reference_id: orderId,
      success_url: success_url.replace("{CHECKOUT_SESSION_ID}", `skypay_zero_${crypto.randomUUID()}`),
      cancel_url,
      metadata
    };
    session.success_url = success_url.replace("{CHECKOUT_SESSION_ID}", session.id);
    const order = await upsertSkyePayOrderFromSession({ session, offer, client, source: "skyemerit_zero_balance" });
    await audit("system", "SKYEPAY_ZERO_BALANCE_CHECKOUT_CREATED", `skyepay:${order?.id || orderId}`, {
      client_slug: client.slug,
      offer_id: offer.id,
      skyecart_add_on_offer_id: bodyWithSkyCart.skyecart_add_on_offer_id || "",
      stripe_bypassed: true,
      skyemerit: {
        applied: skyeMeritCheckout.applied,
        code: skyeMeritCheckout.code || skyeMeritCheckout.requested_code,
        discount_cents: skyeMeritCheckout.applied_discount_cents || 0,
        adjusted_due_cents: skyeMeritCheckout.adjusted_due_cents || 0
      }
    });
    return json(200, {
      ok: true,
      zero_balance: true,
      id: session.id,
      order_id: order?.id || orderId,
      url: session.success_url,
      payment_status: session.payment_status,
      approval_status: order?.approval_status || (offer.owner_approval_required === true ? "paid_pending_owner_approval" : "auto_unlock_after_confirmed_payment"),
      owner_approval_required: offer.owner_approval_required === true,
      activation_path: offer.activation_path || null,
      trial_days: trialDays,
      zero_upfront_trial: trialDays > 0,
      skyemerit: skyeMeritCheckout,
      relay13_inbox_delivery: offer.relay13_inbox_delivery === true,
      client: {
        slug: client.slug,
        client_name: client.client_name,
        workspace_slug: client.workspace_slug
      }
    }, headers);
  }

  const sessionParams = {
    mode: offer.mode || "payment",
    success_url,
    cancel_url,
    customer_email: body.customer_email,
    client_reference_id: orderId,
    allow_promotion_codes: skyeMeritCheckout?.applied ? false : true,
    line_items: await buildStripeLineItemsWithCatalogPrices({ stripe: null, offer, client, trialDays, skyeMeritCheckout }),
    metadata,
    expires_at: Math.floor(Date.now() / 1000) + (60 * 60 * 2),
    ...(offer.mode === "subscription" ? {
      payment_method_collection: "always",
      subscription_data: {
        metadata,
        ...(trialDays > 0 ? {
          trial_period_days: trialDays,
          trial_settings: {
            end_behavior: {
              missing_payment_method: "cancel"
            }
          }
        } : {})
      }
    } : {
      payment_intent_data: { metadata }
    })
  };
  const runtime = await runZeroOsProviderAction({
    provider_id: "stripe",
    action: "stripe.checkout.create",
    app_id: "skyepay",
    workspace_id: client.workspace_slug || client.slug,
    customer_id: body.customer_email,
    client_id: client.slug,
    usage_lane: "skyepay:checkout",
    payload: {
      params: sessionParams,
      idempotency_key: stripeIdempotencyKey(bodyWithSkyCart, orderId)
    }
  });
  const runtimeReceipt = runtime.receipt;
  if (!runtime.ok) {
    await audit("system", "SKYEPAY_PROVIDER_RUNTIME_CHECKOUT_FAILED", `skyepay:${orderId}`, {
      client_slug: client.slug,
      offer_id: offer.id,
      provider_runtime_receipt_id: runtimeReceipt?.id || "",
      error: runtimeReceipt?.error || runtime.response?.error || "stripe_checkout_runtime_failed"
    });
    return json(runtime.status || 502, {
      error: "Stripe checkout provider runtime failed",
      code: "STRIPE_PROVIDER_RUNTIME_FAILED",
      provider_runtime: publicProviderRuntime(runtimeReceipt)
    }, headers);
  }
  const providerResult = runtimeReceipt?.provider_result || {};
  const sessionId = providerResult.id || `skyepay_provider_${crypto.randomUUID()}`;
  const session = {
    ...sessionParams,
    id: sessionId,
    status: providerResult.status || "open",
    payment_status: providerResult.payment_status || "unpaid",
    currency: providerResult.currency || offer.currency || "usd",
    amount_total: providerResult.amount_total || 0,
    client_reference_id: providerResult.client_reference_id || orderId,
    payment_intent: providerResult.payment_intent_id || "",
    url: providerResult.url || success_url.replace("{CHECKOUT_SESSION_ID}", sessionId),
    metadata
  };

  const order = await upsertSkyePayOrderFromSession({ session, offer, client, source: "checkout_created" });
  await audit("system", "SKYEPAY_CHECKOUT_CREATED", `skyepay:${order?.id || orderId}`, {
    client_slug: client.slug,
    offer_id: offer.id,
    skyecart_add_on_offer_id: bodyWithSkyCart.skyecart_add_on_offer_id || "",
    stripe_session_id: session.id,
    provider_runtime_receipt_id: runtimeReceipt?.id || "",
    skyemerit: skyeMeritCheckout ? {
      applied: skyeMeritCheckout.applied,
      code: skyeMeritCheckout.code || skyeMeritCheckout.requested_code,
      discount_cents: skyeMeritCheckout.applied_discount_cents || 0,
      adjusted_due_cents: skyeMeritCheckout.adjusted_due_cents || null
    } : null
  });

  if (offer.relay13_inbox_delivery === true) {
    scheduleBackground(
      sendSkyePayOrderToRelay13({
        client,
        offer,
        body: bodyWithSkyCart,
        orderId: order?.id || orderId,
        metadata,
        skyeMeritCheckout,
        checkoutUrl: session.url,
        sessionId: session.id
      }).then((relay13) => audit("system", relay13.ok ? "SKYEPAY_RELAY13_INBOX_SENT" : "SKYEPAY_RELAY13_INBOX_FAILED", `skyepay:${order?.id || orderId}`, {
        client_slug: client.slug,
        offer_id: offer.id,
        stripe_session_id: session.id,
        provider_runtime_receipt_id: runtimeReceipt?.id || "",
        relay13
      })),
      context
    );
  }

  return json(200, {
    ok: true,
    id: session.id,
    order_id: order?.id || orderId,
    url: session.url,
    payment_status: session.payment_status || "created",
    approval_status: order?.approval_status || "checkout_created",
    owner_approval_required: offer.owner_approval_required === true,
    activation_path: offer.activation_path || null,
    trial_days: trialDays,
    zero_upfront_trial: trialDays > 0,
    skyemerit: skyeMeritCheckout,
    provider_runtime: publicProviderRuntime(runtimeReceipt),
    relay13_inbox_delivery: offer.relay13_inbox_delivery === true,
    client: {
      slug: client.slug,
      client_name: client.client_name,
      workspace_slug: client.workspace_slug
    }
  }, headers);
});
