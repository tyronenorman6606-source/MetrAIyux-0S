import fs from "node:fs";
import assert from "node:assert/strict";
import {
  buildSkyeMeritCheckout as buildGateCheckout,
  calculateSkyeMerit as calculateGateMerit,
  selectSkyeMerit as selectGateMerit
} from "../SkyeGateFS27/netlify/functions/_lib/skyeMerit.js";
import {
  buildSkyeMeritCheckout as buildWorkerCheckout,
  calculateSkyeMerit as calculateWorkerMerit,
  selectSkyeMerit as selectWorkerMerit
} from "../metraiyux_0s_site/cloudflare-saas-provisioning-worker/src/skyemerit.js";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function assertIncludes(path, needles) {
  const text = read(path);
  for (const needle of needles) {
    assert.ok(text.includes(needle), `${path} is missing ${needle}`);
  }
}

const skyelineGate = calculateGateMerit("SKYEMERIT-SKYELINE-22", 1300000);
const skyelineWorker = calculateWorkerMerit("SKYEMERIT-SKYELINE-22", 1300000);
assert.equal(skyelineGate.eligible_cents, 700000);
assert.equal(skyelineGate.discount_cents, 154000);
assert.equal(skyelineGate.payable_cents, 1146000);
assert.deepEqual(
  {
    eligible_cents: skyelineWorker.eligible_cents,
    discount_cents: skyelineWorker.discount_cents,
    payable_cents: skyelineWorker.payable_cents
  },
  {
    eligible_cents: skyelineGate.eligible_cents,
    discount_cents: skyelineGate.discount_cents,
    payable_cents: skyelineGate.payable_cents
  }
);

const firstSmall = selectGateMerit({ subtotalCents: 500000, code: "SKYEMERIT-FIRST-BEST", firstTimeEligible: true });
const firstMid = selectGateMerit({ subtotalCents: 800000, code: "SKYEMERIT-FIRST-BEST", firstTimeEligible: true });
const firstLarge = selectGateMerit({ subtotalCents: 1300000, code: "SKYEMERIT-FIRST-BEST", firstTimeEligible: true });
assert.equal(firstSmall.code, "SKYEMERIT-FIRST-23");
assert.equal(firstSmall.discount_cents, 115000);
assert.equal(firstMid.code, "SKYEMERIT-FIRST-28");
assert.equal(firstMid.discount_cents, 224000);
assert.equal(firstLarge.code, "SKYEMERIT-FIRST-31");
assert.equal(firstLarge.discount_cents, 291400);
assert.equal(selectWorkerMerit({ subtotalCents: 1300000, code: "SKYEMERIT-FIRST-BEST", firstTimeEligible: true }).discount_cents, firstLarge.discount_cents);

const offer = {
  id: "proof-offer",
  title: "Proof Offer",
  currency: "usd",
  mode: "payment",
  line_items: [{ id: "setup", name: "Proof Setup", amount_cents: 1300000, type: "one_time", lookup_key: "proof_setup" }]
};
const gateCheckout = buildGateCheckout({ offer, code: "SKYEMERIT-SKYELINE-22", firstTimeEligible: true });
const workerCheckout = buildWorkerCheckout({ offer, code: "SKYEMERIT-SKYELINE-22", firstTimeEligible: true });
assert.equal(gateCheckout.applied, true);
assert.equal(gateCheckout.line_items[0].amount_cents, 1146000);
assert.equal(gateCheckout.adjusted_due_cents, 1146000);
assert.equal(workerCheckout.adjusted_due_cents, gateCheckout.adjusted_due_cents);

const dataRules = JSON.parse(read("metraiyux_0s_site/data/skyemerit-rules.json"));
assert.equal(dataRules.example.discount_cents, 154000);
assert.equal(dataRules.first_time_pack.kaixu_credit_cents, 600);

assertIncludes("SkyeGateFS27/netlify/functions/skyepay-checkout.js", [
  "buildSkyeMeritCheckout",
  "allow_promotion_codes: skyeMeritCheckout?.applied ? false : true",
  "skyemerit"
]);
assertIncludes("SkyeGateFS27/netlify/functions/skyepay-offers.js", ["publicSkyeMeritCatalog"]);
assertIncludes("metraiyux_0s_site/cloudflare-saas-provisioning-worker/src/index.js", [
  "/api/saas/skyemerit/catalog",
  "/api/saas/skyemerit/preview",
  "/api/saas/skyemerit/issue",
  "deliverSkyeMeritPack"
]);
assertIncludes("metraiyux_0s_site/saas/skyemerit.html", [
  "SkyeMerit Wallet",
  "$6 premium kAIxu credit",
  "SKYEMERIT-SKYELINE-22"
]);
assertIncludes("metraiyux_0s_site/index.html", [
  "SkyeMerit first-time merit wallet",
  "saas/skyemerit.html",
  "protected first-time merit wallet"
]);
assertIncludes("metraiyux_0s_site/operator/skyemerit-admin.html", [
  "Issue SkyeMerit Pack",
  "/api/saas/skyemerit/issue"
]);
assertIncludes("metraiyux_0s_site/saas/pricing.html", ["SkyeMerit First-Time Pack"]);
assertIncludes("metraiyux_0s_site/pricing/index.html", ["SkyeMerit First-Time Pack"]);
assertIncludes("metraiyux_0s_site/proof/skyemerit-expansion-receipt.html", [
  "SkyeMerit is wired",
  "npm run 0s:skyemerit:proof"
]);
assertIncludes("metraiyux_0s_site/proof/index.html", ["SkyeMerit Receipt"]);
assertIncludes("metraiyux_0s_site/sales/live-proof-router.html", [
  "SkyeMerit Wallet",
  "They ask about first-time help or discounts.",
  "Skye Content Forge Free99 Publisher",
  "HouseOperations + SkyeBox"
]);
assertIncludes("metraiyux_0s_site/changelog/index.html", [
  "0S Expansion Accounted",
  "SkyeMerit",
  "SkyeMediaCenter",
  "Skye Content Forge",
  "HouseOperations + SkyeBox"
]);
assertIncludes("metraiyux_0s_site/brain/sales-offer-registry.json", [
  "metraiyux_skyemerit_wallet",
  "do_not_create_skyemerit_first_time_pack"
]);
assertIncludes("metraiyux_0s_site/brain/live-surface-registry.json", ["metraiyux-skyemerit-proof-receipt"]);

console.log(JSON.stringify({
  ok: true,
  skyeline_13000: skyelineGate,
  first_time: {
    small: firstSmall,
    mid: firstMid,
    large: firstLarge
  },
  adjusted_checkout_cents: gateCheckout.adjusted_due_cents,
  surfaces: [
    "metraiyux_0s_site/saas/skyemerit.html",
    "metraiyux_0s_site/operator/skyemerit-admin.html",
    "metraiyux_0s_site/proof/skyemerit-expansion-receipt.html",
    "metraiyux_0s_site/sales/live-proof-router.html",
    "SkyeGateFS27/skyepay.html"
  ]
}, null, 2));
