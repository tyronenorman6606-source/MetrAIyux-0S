import { wrap } from "./_lib/wrap.js";
import { json, badRequest } from "./_lib/http.js";
import { audit } from "./_lib/audit.js";
import { q } from "./_lib/db.js";
import {
  cleanRequestToken,
  resolveSkyePayReturnOrigin,
  resolveSkyePayReturnUrl,
  skyePayHeaders
} from "./_lib/skyepaySecurity.js";
import {
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
  buildSkyeMeritCheckout
} from "./_lib/skyeMerit.js";

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

export default wrap(async (req) => {
  const headers = skyePayHeaders(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, headers);

  let rawBody;
  try {
    rawBody = await req.json();
  } catch {
    return badRequest("Invalid JSON", headers);
  }

  const body = normalizeSkyePayCheckoutBody(rawBody);
  const client = getSkyePayClient(body.client_slug);
  const offer = getSkyePayOffer(body.offer_id || client.default_offer_id);
  if (!offer) return badRequest("Unknown SkyePay offer", headers);
  if (!body.customer_email) return badRequest("Valid customer_email is required", headers);

  const origin = resolveSkyePayReturnOrigin(req);
  if (body.dry_run) {
    if (!allowDryRun(req)) return json(403, { error: "Dry-run checkout is disabled on this host" }, headers);
    const demo = makeDemoSession({ client, offer, body, origin });
    await audit("system", "SKYEPAY_DRY_RUN_CHECKOUT", `client:${client.slug}`, {
      offer_id: offer.id,
      customer_email: body.customer_email
    });
    return json(200, demo, headers);
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return json(501, { error: "Stripe is not configured for SkyePay checkout" }, headers);

  const orderId = makeOrderId(body);
  const trialDays = resolveSkyePayTrialDays(offer, client);
  const firstTimeEligible = body.skyemerit_first_time && await firstTimeSkyeMeritEligible(body.customer_email);
  const requestedSkyeMeritCode = body.skyemerit_apply
    ? (body.skyemerit_code || (firstTimeEligible ? SKYEMERIT_AUTO_CODE : ""))
    : "";
  const skyeMeritCheckout = requestedSkyeMeritCode
    ? buildSkyeMeritCheckout({
      offer,
      trialDays,
      code: requestedSkyeMeritCode,
      packId: body.skyemerit_pack_id,
      firstTimeEligible
    })
    : null;
  const bodyWithMerit = { ...body, skyeMeritCheckout };
  const metadata = buildSkyePayMetadata({ client, offer, body: bodyWithMerit, orderId, trialDays });
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });
  const { success_url, cancel_url } = sessionReturnUrls(req, origin, client.slug, body);
  const sessionParams = {
    mode: offer.mode || "payment",
    success_url,
    cancel_url,
    customer_email: body.customer_email,
    client_reference_id: orderId,
    allow_promotion_codes: skyeMeritCheckout?.applied ? false : true,
    line_items: await buildStripeLineItemsWithCatalogPrices({ stripe, offer, client, trialDays, skyeMeritCheckout }),
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
  const session = await stripe.checkout.sessions.create(sessionParams, {
    idempotencyKey: stripeIdempotencyKey(body, orderId)
  });

  const order = await upsertSkyePayOrderFromSession({ session, offer, client, source: "checkout_created" });
  await audit("system", "SKYEPAY_CHECKOUT_CREATED", `skyepay:${order?.id || orderId}`, {
    client_slug: client.slug,
    offer_id: offer.id,
    stripe_session_id: session.id,
    skyemerit: skyeMeritCheckout ? {
      applied: skyeMeritCheckout.applied,
      code: skyeMeritCheckout.code || skyeMeritCheckout.requested_code,
      discount_cents: skyeMeritCheckout.applied_discount_cents || 0,
      adjusted_due_cents: skyeMeritCheckout.adjusted_due_cents || null
    } : null
  });

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
    client: {
      slug: client.slug,
      client_name: client.client_name,
      workspace_slug: client.workspace_slug
    }
  }, headers);
});
