import { wrap } from "./_lib/wrap.js";
import { json } from "./_lib/http.js";
import { skyePayHeaders } from "./_lib/skyepaySecurity.js";
import { getSkyePayClient, listSkyePayOffers, listSkyePayPlatformRoutes } from "./_lib/skyepayCatalog.js";
import { REPO_STRIPE_CATALOG_SOURCE, SKYPAY_REPO_STRIPE_OFFER_COUNT } from "./_lib/skyepayRepoStripeOffers.js";

export default wrap(async (req) => {
  const headers = skyePayHeaders(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers });
  if (req.method !== "GET") return json(405, { error: "Method not allowed" }, headers);

  const url = new URL(req.url);
  const client = getSkyePayClient(url.searchParams.get("client") || "bobs-smoke-shop");

  return json(200, {
    ok: true,
    product: "SkyePay",
    gate: "SkyeGateFS27",
    stripe_backed: true,
    owner_approval_required: true,
    repo_stripe_catalog: {
      source: REPO_STRIPE_CATALOG_SOURCE,
      imported_checkout_offers: SKYPAY_REPO_STRIPE_OFFER_COUNT,
      checkout_rule: "approved and approved_floor fixed-amount offers only",
      excluded_from_instant_checkout: ["quote_only", "do_not_create", "approved_metered", "one_time_variable"]
    },
    client,
    offers: listSkyePayOffers(client),
    platform_routes: listSkyePayPlatformRoutes()
  }, headers);
});
