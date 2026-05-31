import { wrap } from "./_lib/wrap.js";
import { json, badRequest } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { getSkyePayOffer } from "./_lib/skyepayCatalog.js";
import { cleanRequestToken, publicSkyePayOrder, skyePayHeaders } from "./_lib/skyepaySecurity.js";

export default wrap(async (req) => {
  const headers = skyePayHeaders(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers });
  if (req.method !== "GET") return json(405, { error: "Method not allowed" }, headers);

  const url = new URL(req.url);
  const sessionId = cleanRequestToken(url.searchParams.get("session_id"), 220);
  const orderId = cleanRequestToken(url.searchParams.get("order_id"), 180);
  const demoSession = cleanRequestToken(url.searchParams.get("demo_session"), 180);
  const demoOffer = getSkyePayOffer(cleanRequestToken(url.searchParams.get("offer"), 140));

  if (demoSession.startsWith("skypay_demo_")) {
    const ownerApproval = demoOffer?.owner_approval_required === true;
    return json(200, {
      ok: true,
      dry_run: true,
      order: {
        id: demoSession,
        offer_id: demoOffer?.id || null,
        offer: demoOffer ? {
          title: demoOffer.title,
          plan_name: demoOffer.plan_name,
          setup_cents: demoOffer.line_items
            .filter((item) => item.type === "one_time")
            .reduce((sum, item) => sum + Number(item.amount_cents || 0), 0),
          recurring_cents: demoOffer.line_items
            .filter((item) => item.type === "recurring")
            .reduce((sum, item) => sum + Number(item.amount_cents || 0), 0),
          currency: demoOffer.currency || "usd",
          activation_path: demoOffer.activation_path || null
        } : null,
        payment_status: "demo_not_charged",
        approval_status: ownerApproval ? "demo_pending_owner_approval" : "demo_checkout",
        owner_status: ownerApproval ? "pending_owner_approval" : "demo_not_charged",
        provisioning_status: ownerApproval ? "waiting_for_owner_approval" : "demo_not_unlocked"
      }
    }, headers);
  }

  if (!sessionId && !orderId) return badRequest("Missing session_id or order_id", headers);
  if (orderId && !sessionId && String(process.env.SKYPAY_ALLOW_PUBLIC_ORDER_LOOKUP || "").toLowerCase() !== "true") {
    return json(403, { error: "Public order lookup is disabled; use session_id from the checkout return." }, headers);
  }

  const res = await q(
    `select id, client_slug, workspace_slug, customer_email, customer_name, company_name,
            offer_id, offer_snapshot, amount_setup_cents, amount_recurring_cents, currency,
            checkout_mode, stripe_session_id, stripe_customer_id, stripe_subscription_id,
            payment_status, approval_status, owner_status, provisioning_status,
            metadata, paid_at, approved_at, provisioned_at, created_at, updated_at
     from skyepay_orders
     where ($1::text is not null and stripe_session_id=$1)
        or ($2::text is not null and id=$2)
     limit 1`,
    [sessionId || null, orderId || null]
  );

  if (!res.rowCount) return json(404, { error: "SkyePay order not found" }, headers);
  return json(200, {
    ok: true,
    order: publicSkyePayOrder(res.rows[0], { includeVaultAgentSecrets: Boolean(sessionId) })
  }, headers);
});
