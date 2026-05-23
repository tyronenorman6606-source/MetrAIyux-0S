import { wrap } from "./_lib/wrap.js";
import { json } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { audit } from "./_lib/audit.js";
import { autoUnlockSkyePayOrder } from "./_lib/skyepayActivation.js";
import { upsertSkyePayOrderFromSession } from "./_lib/skyepayCatalog.js";
import {
  isVaultProvisioningOrder,
  markVaultProvisioningFailure,
  markVaultProvisioningResult,
  provisionVaultWorkspaceForOrder
} from "./_lib/skyepayVaultProvisioning.js";

function sessionCanMoveToOwnerApproval(session) {
  const paymentStatus = String(session?.payment_status || "").toLowerCase();
  if (["paid", "no_payment_required"].includes(paymentStatus)) return true;
  return !paymentStatus && String(session?.status || "").toLowerCase() === "complete";
}

async function holdSkyePayForPayment(session, eventType) {
  await q(
    `update skyepay_orders
     set payment_status=$2,
         approval_status=case when approval_status in ('approved','void','refunded') then approval_status else 'payment_pending' end,
         owner_status=case when owner_status in ('approved','void') then owner_status else 'payment_pending' end,
         provisioning_status=case when provisioning_status='workspace_unlocked' then provisioning_status else 'waiting_for_payment' end,
         metadata=metadata || $3::jsonb,
         updated_at=now()
     where stripe_session_id=$1`,
    [
      session.id,
      session.payment_status || session.status || "payment_pending",
      JSON.stringify({ stripe_event_type: eventType, held_for_payment: true })
    ]
  );
}

/**
 * Stripe webhook handler.
 * Configure your Stripe webhook endpoint to hit:
 *   https://<yoursite>/.netlify/functions/stripe-webhook
 */
export default wrap(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, { "content-type": "application/json" });

  const secret = process.env.STRIPE_SECRET_KEY;
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whsec) {
    return json(501, { error: "Stripe not configured" }, { "content-type": "application/json" });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return json(400, { error: "Missing stripe-signature" }, { "content-type": "application/json" });

  const body = await req.text();

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whsec);
  } catch (e) {
    return json(400, { error: "Webhook signature verification failed" }, { "content-type": "application/json" });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    if (session?.metadata?.skyepay === "true") {
      const order = await upsertSkyePayOrderFromSession({ session, source: event.type });
      if (!sessionCanMoveToOwnerApproval(session)) {
        await holdSkyePayForPayment(session, event.type);
      } else if (isVaultProvisioningOrder(order)) {
        try {
          const result = await provisionVaultWorkspaceForOrder(order, { action: "provision", source: event.type });
          if (result.ok && !result.skipped) await markVaultProvisioningResult(order.id, result);
        } catch (error) {
          await markVaultProvisioningFailure(order.id, error);
          await audit("system", "SKYEPAY_VAULT_PROVISIONING_FAILED", `skyepay:${order?.id || session.id}`, {
            event_type: event.type,
            error: error.message
          });
        }
      } else {
        await autoUnlockSkyePayOrder(order, { source: "stripe_webhook", eventType: event.type });
      }
      await audit("system", "SKYEPAY_STRIPE_WEBHOOK", `skyepay:${order?.id || session.id}`, {
        event_type: event.type,
        stripe_session_id: session.id,
        payment_status: session.payment_status || session.status || null
      });
      return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
    }
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object;
    if (session?.metadata?.skyepay === "true") {
      await q(
        `update skyepay_orders
         set payment_status='payment_failed',
             approval_status=case when approval_status in ('approved','void') then approval_status else 'payment_failed' end,
             owner_status=case when owner_status in ('approved','void') then owner_status else 'payment_failed' end,
             provisioning_status=case when provisioning_status='workspace_unlocked' then provisioning_status else 'payment_failed' end,
             metadata=metadata || $2::jsonb,
             updated_at=now()
         where stripe_session_id=$1`,
        [session.id, JSON.stringify({ stripe_event_type: event.type })]
      );
      await audit("system", "SKYEPAY_PAYMENT_FAILED", `stripe:${session.id}`, { event_type: event.type });
      return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    if (session?.metadata?.skyepay === "true") {
      await q(
        `update skyepay_orders
         set payment_status='expired',
             approval_status=case when approval_status in ('approved','void') then approval_status else 'expired' end,
             owner_status=case when owner_status in ('approved','void') then owner_status else 'checkout_expired' end,
             updated_at=now()
         where stripe_session_id=$1`,
        [session.id]
      );
      await audit("system", "SKYEPAY_CHECKOUT_EXPIRED", `stripe:${session.id}`, { event_type: event.type });
      return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    if (subscription?.metadata?.skyepay === "true") {
      await q(
        `update skyepay_orders
         set payment_status=$2,
             metadata=metadata || $3::jsonb,
             updated_at=now()
         where stripe_subscription_id=$1`,
        [
          subscription.id,
          subscription.status || event.type,
          JSON.stringify({
            subscription_status: subscription.status || null,
            current_period_end: subscription.current_period_end || null,
            stripe_event_type: event.type
          })
        ]
      );
      const orderRes = await q(`select * from skyepay_orders where stripe_subscription_id=$1 limit 1`, [subscription.id]);
      const order = orderRes.rows[0] || null;
      if (order && isVaultProvisioningOrder(order)) {
        const status = String(subscription.status || "").toLowerCase();
        const action = event.type === "customer.subscription.deleted" || ["canceled", "cancelled", "unpaid", "incomplete_expired"].includes(status)
          ? "suspend"
          : "provision";
        try {
          const result = await provisionVaultWorkspaceForOrder({
            ...order,
            payment_status: subscription.status || order.payment_status
          }, { action, source: event.type });
          if (result.ok && !result.skipped && action === "provision") await markVaultProvisioningResult(order.id, result);
          if (result.ok && !result.skipped && action === "suspend") {
            await q(
              `update skyepay_orders
               set provisioning_status='vault_suspended',
                   metadata=metadata || $2::jsonb,
                   updated_at=now()
               where id=$1`,
              [order.id, JSON.stringify({ vault_suspended_at: new Date().toISOString(), subscription_status: subscription.status || null })]
            );
          }
        } catch (error) {
          await markVaultProvisioningFailure(order.id, error);
          await audit("system", "SKYEPAY_VAULT_PROVISIONING_FAILED", `skyepay:${order.id}`, {
            event_type: event.type,
            action,
            error: error.message
          });
        }
      } else if (order) {
        const status = String(subscription.status || "").toLowerCase();
        if (["active", "trialing"].includes(status)) {
          await autoUnlockSkyePayOrder({
            ...order,
            payment_status: subscription.status || order.payment_status
          }, { source: "stripe_subscription", eventType: event.type });
        }
        if (event.type === "customer.subscription.deleted" || ["canceled", "cancelled", "unpaid", "incomplete_expired"].includes(status)) {
          await q(
            `update skyepay_orders
             set provisioning_status=case when provisioning_status='void' then provisioning_status else 'subscription_inactive' end,
                 metadata=metadata || $2::jsonb,
                 updated_at=now()
             where id=$1`,
            [order.id, JSON.stringify({ subscription_inactive_at: new Date().toISOString(), subscription_status: subscription.status || null })]
          );
        }
      }
      await audit("system", "SKYEPAY_SUBSCRIPTION_EVENT", `stripe-sub:${subscription.id}`, {
        event_type: event.type,
        status: subscription.status || null
      });
      return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
    }
  }

  // Existing usage top-up support stays intact.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const md = session.metadata || {};

    const customer_id = parseInt(md.customer_id, 10);
    const month = (md.month || "").toString();
    const amount_cents = parseInt(md.amount_cents, 10);

    if (Number.isFinite(customer_id) && /^\d{4}-\d{2}$/.test(month) && Number.isFinite(amount_cents) && amount_cents > 0) {
      // credit cap
      await q(
        `insert into monthly_usage(customer_id, month, spent_cents, extra_cents, input_tokens, output_tokens)
         values ($1,$2,0,$3,0,0)
         on conflict (customer_id, month)
         do update set extra_cents = monthly_usage.extra_cents + excluded.extra_cents`,
        [customer_id, month, amount_cents]
      );

      await q(
        `insert into topup_events(customer_id, month, amount_cents, source, stripe_session_id, status)
         values ($1,$2,$3,'stripe',$4,'applied')`,
        [customer_id, month, amount_cents, session.id]
      );

      await audit("system", "TOPUP_STRIPE", `customer:${customer_id}`, { month, amount_cents, session_id: session.id });
    }
  }

  return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
});
