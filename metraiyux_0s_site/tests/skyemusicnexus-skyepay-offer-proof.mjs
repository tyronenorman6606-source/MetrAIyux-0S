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
  } catch {
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

async function dryRunCheckout(offerId) {
  const response = await checkoutHandler(request("/skyepay/checkout", {
    method: "POST",
    body: JSON.stringify({
      client_slug: "metraiyux-0s",
      offer_id: offerId,
      customer_name: "Music Proof Buyer",
      customer_email: "music-proof@example.com",
      company_name: "Music Proof Co",
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
  assert.match(checkout.url, /status=success/, `${offerId} checkout return URL`);
  assert.match(checkout.url, new RegExp(`offer=${offerId}`), `${offerId} checkout offer URL`);
  return checkout;
}

const offersResponse = await offersHandler(request("/skyepay/offers?client=metraiyux-0s"), {});
assert.equal(offersResponse.status, 200, "offers endpoint status");
const offersPayload = await jsonResponse(offersResponse);
assert.equal(offersPayload.ok, true, "offers endpoint ok");

const studio = offerById(offersPayload.offers, "skyemusicnexus-studio");
assert.equal(studio.setup_cents, 150000, "studio setup");
assert.equal(studio.recurring_cents, 49700, "studio monthly");
assert.equal(studio.today_cents, 199700, "studio checkout total");
assert.equal(studio.zero_upfront_trial, false, "studio no trial");
assert.ok(studio.line_items.some((item) => item.lookup_key === "skyemusicnexus_studio_setup"), "studio setup lookup");
assert.ok(studio.line_items.some((item) => item.lookup_key === "skyemusicnexus_studio_monthly"), "studio monthly lookup");
assert.ok(studio.includes.some((item) => /Gate session required/i.test(item)), "studio gate include");

const single = offerById(offersPayload.offers, "skyemusicnexus-single-song-drop");
assert.equal(single.setup_cents, 19900, "single song amount");
assert.equal(single.recurring_cents, 0, "single song no recurring");
assert.equal(single.today_cents, 19900, "single song checkout total");
assert.equal(single.mode, "payment", "single song payment mode");
assert.ok(single.line_items.some((item) => item.lookup_key === "skyemusicnexus_single_song_drop"), "single song lookup");
assert.ok(single.includes.some((item) => /Gate session required/i.test(item)), "single song gate include");

const artistSeat = offerById(offersPayload.offers, "skyemusicnexus-extra-artist-seat");
assert.equal(artistSeat.setup_cents, 0, "artist seat setup");
assert.equal(artistSeat.recurring_cents, 2900, "artist seat monthly");
assert.equal(artistSeat.today_cents, 2900, "artist seat checkout total");
assert.equal(artistSeat.mode, "subscription", "artist seat subscription mode");

const contentKit = offerById(offersPayload.offers, "skyemusicnexus-release-content-kit");
assert.equal(contentKit.setup_cents, 49900, "release content kit amount");
assert.equal(contentKit.recurring_cents, 0, "release content kit no recurring");
assert.equal(contentKit.today_cents, 49900, "release content kit checkout total");
assert.equal(contentKit.mode, "payment", "release content kit payment mode");
assert.ok(contentKit.line_items.some((item) => item.lookup_key === "skyemusicnexus_release_content_kit"), "release content kit lookup");
assert.ok(contentKit.includes.some((item) => /Gate session required/i.test(item)), "release content kit gate include");

await dryRunCheckout(studio.id);
await dryRunCheckout(single.id);
await dryRunCheckout(contentKit.id);
await dryRunCheckout(artistSeat.id);

console.log("skyemusicnexus-skyepay-offer-proof: ok");
