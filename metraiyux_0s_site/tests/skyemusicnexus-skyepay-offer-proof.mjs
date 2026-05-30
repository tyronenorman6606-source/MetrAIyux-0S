import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.SKYPAY_ALLOW_PUBLIC_DRY_RUN = "true";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const gateRootCandidates = [
  path.join(repoRoot, "metraiyux_0s_site", "skyegate", "source", "SkyeGateFS27"),
  path.join(repoRoot, "SkyeGateFS27")
];
const gateRoot = gateRootCandidates.find((candidate) => fs.existsSync(path.join(candidate, "scripts", "_local-env.mjs")));
assert.ok(gateRoot, `SkyeGateFS27 source not found. Checked: ${gateRootCandidates.join(", ")}`);
const { loadLocalEnv } = await import(pathToFileURL(path.join(gateRoot, "scripts", "_local-env.mjs")).href);
loadLocalEnv({ root: gateRoot, repoRoot });

const [{ default: offersHandler }, { default: checkoutHandler }] = await Promise.all([
  import(pathToFileURL(path.join(gateRoot, "netlify", "functions", "skyepay-offers.js")).href),
  import(pathToFileURL(path.join(gateRoot, "netlify", "functions", "skyepay-checkout.js")).href)
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
assert.equal(studio.setup_cents, 0, "artist host setup");
assert.equal(studio.recurring_cents, 900, "artist host monthly");
assert.equal(studio.today_cents, 900, "artist host checkout total");
assert.equal(studio.zero_upfront_trial, false, "studio no trial");
assert.ok(studio.line_items.some((item) => item.lookup_key === "skyemusicnexus_studio_monthly"), "studio monthly lookup");
assert.ok(studio.includes.some((item) => /Gate session required/i.test(item)), "studio gate include");
assert.ok(studio.includes.some((item) => /Fan preview/i.test(item)), "artist host fan preview include");

const single = offerById(offersPayload.offers, "skyemusicnexus-single-song-drop");
assert.equal(single.setup_cents, 1500, "single song amount");
assert.equal(single.recurring_cents, 0, "single song no recurring");
assert.equal(single.today_cents, 1500, "single song checkout total");
assert.equal(single.mode, "payment", "single song payment mode");
assert.ok(single.line_items.some((item) => item.lookup_key === "skyemusicnexus_single_song_drop"), "single song lookup");
assert.ok(single.includes.some((item) => /Gate session required/i.test(item)), "single song gate include");

const artistSeat = offerById(offersPayload.offers, "skyemusicnexus-extra-artist-seat");
assert.equal(artistSeat.setup_cents, 0, "artist seat setup");
assert.equal(artistSeat.recurring_cents, 500, "artist seat monthly");
assert.equal(artistSeat.today_cents, 500, "artist seat checkout total");
assert.equal(artistSeat.mode, "subscription", "artist seat subscription mode");

const audioVault = offerById(offersPayload.offers, "skyemusicnexus-gated-audio-vault-pack");
assert.equal(audioVault.setup_cents, 0, "audio vault setup");
assert.equal(audioVault.recurring_cents, 900, "audio vault monthly");
assert.equal(audioVault.today_cents, 900, "audio vault checkout total");
assert.equal(audioVault.mode, "subscription", "audio vault subscription mode");
assert.ok(audioVault.line_items.some((item) => item.lookup_key === "skyemusicnexus_gated_audio_vault_pack_monthly"), "audio vault lookup");
assert.ok(audioVault.includes.some((item) => /Gate session required/i.test(item)), "audio vault gate include");
assert.ok(audioVault.includes.some((item) => /No public streaming license claim/i.test(item)), "audio vault licensing boundary");

const contentKit = offerById(offersPayload.offers, "skyemusicnexus-release-content-kit");
assert.equal(contentKit.setup_cents, 7900, "release content kit amount");
assert.equal(contentKit.recurring_cents, 0, "release content kit no recurring");
assert.equal(contentKit.today_cents, 7900, "release content kit checkout total");
assert.equal(contentKit.mode, "payment", "release content kit payment mode");
assert.ok(contentKit.line_items.some((item) => item.lookup_key === "skyemusicnexus_release_content_kit"), "release content kit lookup");
assert.ok(contentKit.includes.some((item) => /Gate session required/i.test(item)), "release content kit gate include");

function assertLandingOffer(id, listedCents, dueCents, lookupKey) {
  const offer = offerById(offersPayload.offers, id);
  assert.equal(offer.setup_cents, listedCents, `${id} listed amount`);
  assert.equal(offer.today_cents, listedCents, `${id} pre-merit checkout total`);
  assert.equal(offer.skyemerit.default_code, "SKYEMUSICNEXUS-LAUNCH-2000", `${id} default merit code`);
  assert.equal(offer.skyemerit.default_pack_id, "SKYEMUSICNEXUS-LAUNCH-MERIT-PACK", `${id} default merit pack`);
  assert.equal(offer.skyemerit.estimated_discount_cents, 200000, `${id} estimated merit`);
  assert.equal(offer.skyemerit.estimated_payable_today_cents, dueCents, `${id} estimated due`);
  assert.equal(offer.skyemerit.launch_window_ends_on, "2026-06-26", `${id} launch window`);
  assert.equal(offer.relay13_inbox_delivery, true, `${id} Relay13 inbox flag`);
  assert.ok(offer.line_items.some((item) => item.lookup_key === lookupKey), `${id} lookup`);
  assert.ok(offer.includes.some((item) => /Relay13\/0S inbox/i.test(item)), `${id} Relay13 include`);
  return offer;
}

const singleLanding = assertLandingOffer("skyemusicnexus-single-drop-landing-page", 223900, 23900, "skyemusicnexus_single_drop_landing_page");
const artistEpk = assertLandingOffer("skyemusicnexus-artist-page-epk", 244400, 44400, "skyemusicnexus_artist_page_epk");
const visualizer = assertLandingOffer("skyemusicnexus-animated-visualizer-page", 279600, 79600, "skyemusicnexus_animated_visualizer_page");
const universe = assertLandingOffer("skyemusicnexus-custom-artist-universe", 319700, 119700, "skyemusicnexus_custom_artist_universe");

await dryRunCheckout(studio.id);
await dryRunCheckout(single.id);
await dryRunCheckout(contentKit.id);
await dryRunCheckout(artistSeat.id);
await dryRunCheckout(audioVault.id);

for (const offer of [singleLanding, artistEpk, visualizer, universe]) {
  const checkout = await dryRunCheckout(offer.id);
  assert.equal(checkout.skyemerit.applied, true, `${offer.id} merit applied`);
  assert.equal(checkout.skyemerit.code, "SKYEMUSICNEXUS-LAUNCH-2000", `${offer.id} checkout merit code`);
  assert.equal(checkout.skyemerit.pack_id, "SKYEMUSICNEXUS-LAUNCH-MERIT-PACK", `${offer.id} checkout merit pack`);
  assert.equal(checkout.skyemerit.applied_discount_cents, 200000, `${offer.id} checkout merit discount`);
  assert.equal(Number(checkout.metadata.skyemerit_discount_cents), 200000, `${offer.id} metadata merit discount`);
  assert.equal(Number(checkout.metadata.amount_due_today_cents), offer.skyemerit.estimated_payable_today_cents, `${offer.id} metadata due`);
  assert.equal(Number(checkout.metadata.original_amount_due_today_cents), offer.setup_cents, `${offer.id} metadata listed`);
}

console.log("skyemusicnexus-skyepay-offer-proof: ok");
