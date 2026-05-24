import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.SKYPAY_ALLOW_PUBLIC_DRY_RUN = "true";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const gateRoot = path.join(repoRoot, "metraiyux_0s_site", "skyegate", "source", "SkyeGateFS27");
assert.ok(fs.existsSync(path.join(gateRoot, "scripts", "_local-env.mjs")), "SkyeGateFS27 source not found");

const { loadLocalEnv } = await import(pathToFileURL(path.join(gateRoot, "scripts", "_local-env.mjs")).href);
loadLocalEnv({ root: gateRoot, repoRoot });

const [
  { default: offersHandler },
  { default: checkoutHandler },
  { getSkyePayOffer, listSkyePayPlatformRoutes }
] = await Promise.all([
  import(pathToFileURL(path.join(gateRoot, "netlify", "functions", "skyepay-offers.js")).href),
  import(pathToFileURL(path.join(gateRoot, "netlify", "functions", "skyepay-checkout.js")).href),
  import(pathToFileURL(path.join(gateRoot, "netlify", "functions", "_lib", "skyepayCatalog.js")).href)
]);

const expected = {
  "skyenet-edge-starter": {
    title: "SkyeNet Edge Starter",
    setup: 29700,
    recurring: 9700,
    today: 39400,
    lookup: ["skyenet_edge_starter_setup", "skyenet_edge_starter_monthly"],
    activation: "paid_pending_owner_approval",
    cap: 15000
  },
  "skyenet-edge-growth": {
    title: "SkyeNet Edge Growth",
    setup: 99700,
    recurring: 29700,
    today: 129400,
    lookup: ["skyenet_edge_growth_setup", "skyenet_edge_growth_monthly"],
    activation: "owner_approved_after_route_scope",
    cap: 50000
  },
  "skyenet-functions-managed": {
    title: "SkyeNet Functions Managed",
    setup: 150000,
    recurring: 49700,
    today: 199700,
    lookup: ["skyenet_functions_managed_setup", "skyenet_functions_managed_monthly"],
    activation: "owner_approved_after_function_scope",
    cap: 100000
  },
  "skyenet-sovereign-runtime-reserve": {
    title: "SkyeNet Sovereign Runtime Reserve",
    setup: 500000,
    recurring: 99700,
    today: 599700,
    lookup: ["skyenet_sovereign_runtime_setup", "skyenet_sovereign_runtime_monthly"],
    activation: "owner_approved_after_sovereign_runtime_scope",
    cap: 200000
  }
};

async function jsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON response, got: ${text.slice(0, 500)}`);
  }
}

function request(pathname, init = {}) {
  return new Request(`http://127.0.0.1:4987${pathname}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {})
    }
  });
}

function offerById(offers, id) {
  const offer = offers.find((item) => item.id === id);
  assert.ok(offer, `Missing SkyePay offer ${id}`);
  return offer;
}

async function dryRunCheckout(offerId, offer) {
  const response = await checkoutHandler(request("/skyepay/checkout", {
    method: "POST",
    body: JSON.stringify({
      client_slug: "metraiyux-0s",
      offer_id: offerId,
      customer_name: "SkyeNet Proof Buyer",
      customer_email: "skyenet-proof@example.com",
      company_name: "SkyeNet Proof Co",
      dry_run: true,
      idempotency_key: `${offerId}-proof`
    })
  }), {});
  assert.equal(response.status, 200, `${offerId} checkout status`);
  const checkout = await jsonResponse(response);
  assert.equal(checkout.ok, true, `${offerId} checkout ok`);
  assert.equal(checkout.dry_run, true, `${offerId} dry run`);
  assert.equal(checkout.offer.id, offerId, `${offerId} checkout offer id`);
  assert.equal(checkout.metadata.offer_id, offerId, `${offerId} checkout metadata offer`);
  assert.equal(checkout.metadata.client_slug, "metraiyux-0s", `${offerId} checkout metadata client`);
  assert.equal(checkout.owner_approval_required, true, `${offerId} owner approval`);
  assert.equal(checkout.metadata.owner_approval_required, "true", `${offerId} metadata owner approval`);
  assert.equal(checkout.metadata.activation_path, offer.activation_path, `${offerId} activation metadata`);
  assert.equal(Number(checkout.metadata.amount_due_today_cents), offer.today_cents, `${offerId} amount due metadata`);
  assert.match(checkout.url, /status=success/, `${offerId} checkout return URL`);
  assert.match(checkout.url, new RegExp(`offer=${offerId}`), `${offerId} checkout offer URL`);
  return checkout;
}

const offersResponse = await offersHandler(request("/skyepay/offers?client=metraiyux-0s"), {});
assert.equal(offersResponse.status, 200, "offers endpoint status");
const offersPayload = await jsonResponse(offersResponse);
assert.equal(offersPayload.ok, true, "offers endpoint ok");

for (const [id, spec] of Object.entries(expected)) {
  const publicOffer = offerById(offersPayload.offers, id);
  const catalogOffer = getSkyePayOffer(id);
  assert.ok(catalogOffer, `${id} catalog offer exists`);
  assert.equal(publicOffer.title, spec.title, `${id} title`);
  assert.equal(publicOffer.family, "skyenet", `${id} family`);
  assert.equal(publicOffer.mode, "subscription", `${id} mode`);
  assert.equal(publicOffer.setup_cents, spec.setup, `${id} setup`);
  assert.equal(publicOffer.recurring_cents, spec.recurring, `${id} recurring`);
  assert.equal(publicOffer.today_cents, spec.today, `${id} today`);
  assert.equal(publicOffer.zero_upfront_trial, false, `${id} no trial`);
  assert.equal(publicOffer.owner_approval_required, true, `${id} owner approval`);
  assert.equal(publicOffer.activation_path, spec.activation, `${id} activation`);
  assert.equal(publicOffer.rate_limits.monthly_cap_cents, spec.cap, `${id} monthly cap`);
  assert.ok(publicOffer.includes.some((item) => /Owner-approved activation/i.test(item)), `${id} owner-approved include`);
  assert.deepEqual(publicOffer.line_items.map((item) => item.lookup_key), spec.lookup, `${id} lookup keys`);
  assert.ok(publicOffer.line_items.every((item) => item.amount_cents > 0 && item.lookup_key), `${id} billable line items`);
  assert.equal(JSON.stringify(publicOffer).includes("Cloudflare"), false, `${id} public offer hides provider split`);
  await dryRunCheckout(id, publicOffer);
}

assert.equal(offersPayload.offers.some((offer) => offer.id === "skyenet-free99"), false, "Free99 is capped access, not a paid checkout product");

const skynetRoute = listSkyePayPlatformRoutes().find((route) => route.platform_id === "skyenet");
assert.ok(skynetRoute, "SkyePay platform launcher exposes SkyeNet");
assert.equal(skynetRoute.default_offer_id, "skyenet-edge-starter", "SkyeNet platform route defaults to starter product");
assert.match(skynetRoute.route, /offer=skyenet-edge-starter/, "SkyeNet platform route points to billable offer");

console.log("skyenet-skyepay-offer-proof: ok");
