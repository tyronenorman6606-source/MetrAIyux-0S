import assert from "node:assert/strict";
import {
  buildSkyePayMetadata,
  getSkyePayClient,
  getSkyePayOffer,
  makeDemoSession,
  resolveSkyePayTrialDays
} from "../netlify/functions/_lib/skyepayCatalog.js";
import {
  skyePayOfferRequiresOwnerApproval,
  skyePayOrderStatusesForPayment
} from "../netlify/functions/_lib/skyepayActivation.js";

const client = getSkyePayClient("metraiyux-0s");
const routex = getSkyePayOffer("metraiyux-routex-workforce-command");
const starter = getSkyePayOffer("metraiyux-starter-command");
const vaultStarter = getSkyePayOffer("skyevault-starter-access");

assert.ok(client, "metraiyux-0s client should exist");
assert.ok(routex, "RouteX offer should exist");
assert.ok(starter, "Starter offer should exist");
assert.ok(vaultStarter, "SkyeVault starter offer should exist");

const routexSetup = routex.line_items.find((item) => item.id === "setup");
const routexMonthly = routex.line_items.find((item) => item.id === "monthly");

assert.equal(routex.owner_approval_required, false, "RouteX must auto-unlock after confirmed payment");
assert.equal(routex.activation_path, "auto_unlock_after_confirmed_payment");
assert.equal(resolveSkyePayTrialDays(routex, client), 0, "RouteX must not be a zero-upfront trial");
assert.equal(routexSetup.amount_cents, 650000, "RouteX setup must be $6,500");
assert.equal(routexMonthly.amount_cents, 149700, "RouteX monthly must be $1,497");
assert.equal(routexSetup.lookup_key, "metraiyux_routex_workforce_command_setup");
assert.equal(routexMonthly.lookup_key, "metraiyux_routex_workforce_command_monthly");

assert.equal(skyePayOfferRequiresOwnerApproval(routex), false);
assert.deepEqual(skyePayOrderStatusesForPayment({ offer: routex, paymentConfirmed: true }), {
  approval_status: "payment_confirmed",
  owner_status: "auto_unlock_pending",
  provisioning_status: "auto_unlock_pending"
});

assert.equal(skyePayOfferRequiresOwnerApproval(starter), false, "Starter app lane should auto-unlock after confirmed payment");
assert.deepEqual(skyePayOrderStatusesForPayment({ offer: starter, paymentConfirmed: true }), {
  approval_status: "payment_confirmed",
  owner_status: "auto_unlock_pending",
  provisioning_status: "auto_unlock_pending"
});

assert.equal(skyePayOfferRequiresOwnerApproval(vaultStarter), false, "Vault subscriptions are the auto-provision exception");
assert.deepEqual(skyePayOrderStatusesForPayment({ offer: vaultStarter, paymentConfirmed: true }), {
  approval_status: "payment_confirmed",
  owner_status: "auto_unlock_pending",
  provisioning_status: "auto_unlock_pending"
});

const metadata = buildSkyePayMetadata({
  client,
  offer: routex,
  body: {
    customer_email: "routex-proof@example.com",
    customer_name: "RouteX Owner",
    company_name: "RouteX Proof Co",
    idempotency_key: "routex-owner-approval-proof"
  },
  orderId: "skypay_routex_owner_approval_proof"
});

assert.equal(metadata.owner_approval_required, "false");
assert.equal(metadata.approval_status, "auto_unlock_after_confirmed_payment");
assert.equal(metadata.activation_path, "auto_unlock_after_confirmed_payment");

const demo = makeDemoSession({
  client,
  offer: routex,
  body: { customer_email: "routex-proof@example.com", idempotency_key: "routex-demo" },
  origin: "http://127.0.0.1:4197"
});

assert.equal(demo.owner_approval_required, false);
assert.equal(demo.approval_status, "demo_checkout");
assert.match(demo.url, /offer=metraiyux-routex-workforce-command/);

console.log(JSON.stringify({
  ok: true,
  routex: {
    setup_cents: routexSetup.amount_cents,
    monthly_cents: routexMonthly.amount_cents,
    owner_approval_required: routex.owner_approval_required,
    activation_path: routex.activation_path
  }
}, null, 2));
