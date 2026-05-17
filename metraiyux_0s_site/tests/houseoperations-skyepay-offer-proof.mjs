import assert from "node:assert/strict";

process.env.SKYPAY_ALLOW_PUBLIC_DRY_RUN = "true";
process.env.SKYGATE_SKIP_SCHEMA_BOOTSTRAP = "true";

const [{ default: offersHandler }, { default: checkoutHandler }] = await Promise.all([
  import("../../SkyeGateFS27/netlify/functions/skyepay-offers.js"),
  import("../../SkyeGateFS27/netlify/functions/skyepay-checkout.js")
]);

async function jsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Expected JSON response, got: ${text.slice(0, 500)}`);
  }
}

function request(path, init = {}) {
  return new Request(`http://127.0.0.1:4987${path}`, {
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

function assertOffer(offer, expected) {
  assert.equal(offer.setup_cents, expected.setup_cents, `${offer.id} setup amount`);
  assert.equal(offer.recurring_cents, expected.recurring_cents, `${offer.id} monthly amount`);
  assert.equal(offer.currency, "usd", `${offer.id} currency`);
  assert.equal(offer.mode, "subscription", `${offer.id} mode`);
  assert.equal(offer.gate_policy?.policy_id, `${offer.id}-gate-policy`, `${offer.id} gate policy`);
  assert.equal(offer.gate_policy?.require_install_id, true, `${offer.id} install id required`);
  assert.ok(offer.line_items.some((item) => item.lookup_key === expected.setup_lookup), `${offer.id} setup lookup key`);
  assert.ok(offer.line_items.some((item) => item.lookup_key === expected.monthly_lookup), `${offer.id} monthly lookup key`);
  assert.ok(offer.includes.some((item) => /HouseOperations/i.test(item)), `${offer.id} HouseOperations include`);
  assert.ok(offer.includes.some((item) => /SkyeBox/i.test(item)), `${offer.id} SkyeBox include`);
}

async function dryRunCheckout(offerId, expectedApproval) {
  const response = await checkoutHandler(request("/skyepay/checkout", {
    method: "POST",
    body: JSON.stringify({
      client_slug: "metraiyux-0s",
      offer_id: offerId,
      customer_name: "HouseOps Proof Buyer",
      customer_email: "houseops-proof@example.com",
      company_name: "HouseOps Proof Co",
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
  assert.equal(checkout.owner_approval_required, expectedApproval, `${offerId} approval flag`);
  assert.match(checkout.url, /status=success/, `${offerId} checkout return URL`);
  assert.match(checkout.url, new RegExp(`offer=${offerId}`), `${offerId} checkout offer URL`);
  assert.ok(checkout.offer.gate_policy?.policy_id === `${offerId}-gate-policy`, `${offerId} checkout gate policy`);
  return checkout;
}

const offersResponse = await offersHandler(request("/skyepay/offers?client=metraiyux-0s"), {});
assert.equal(offersResponse.status, 200, "offers endpoint status");
const offersPayload = await jsonResponse(offersResponse);
assert.equal(offersPayload.ok, true, "offers endpoint ok");

const command = offerById(offersPayload.offers, "metraiyux-houseoperations-command");
const managed = offerById(offersPayload.offers, "metraiyux-houseoperations-managed");

assertOffer(command, {
  setup_cents: 250000,
  recurring_cents: 49700,
  setup_lookup: "metraiyux_houseoperations_command_setup",
  monthly_lookup: "metraiyux_houseoperations_command_monthly"
});
assert.equal(command.zero_upfront_trial, true, "command zero upfront trial");
assert.equal(command.today_cents, 0, "command starts at zero during trial");

assertOffer(managed, {
  setup_cents: 500000,
  recurring_cents: 99700,
  setup_lookup: "metraiyux_houseoperations_managed_setup",
  monthly_lookup: "metraiyux_houseoperations_managed_monthly"
});
assert.equal(managed.zero_upfront_trial, false, "managed no zero upfront trial");
assert.equal(managed.today_cents, 599700, "managed first checkout total");
assert.equal(managed.owner_approval_required, true, "managed requires owner approval");

await dryRunCheckout(command.id, false);
await dryRunCheckout(managed.id, true);

console.log("houseoperations-skyepay-offer-proof: ok");
