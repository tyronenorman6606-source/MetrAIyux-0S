import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SKYPAY_OFFERS } from "../SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = path.join(root, "metraiyux_0s_site");
const plansPath = path.join(siteDir, "data", "plans.json");
const gatewayPath = path.join(siteDir, "data", "skyepay-gateway.json");
const workerPath = path.join(siteDir, "cloudflare-saas-provisioning-worker", "src", "index.js");
const stripeWebhookPath = path.join(root, "SkyeGateFS27", "netlify", "functions", "stripe-webhook.js");
const activationPath = path.join(root, "SkyeGateFS27", "netlify", "functions", "_lib", "skyepayActivation.js");

const planOfferMap = {
  "starter-command": "metraiyux-starter-command",
  "growth-cabinet": "metraiyux-growth-cabinet",
  "routex-workforce-command": "metraiyux-routex-workforce-command",
  "autonomous-office": "metraiyux-autonomous-office",
  "enterprise-command": "metraiyux-enterprise-command"
};

const htmlRequiredTokens = {
  "pricing/index.html": [
    "$397",
    "$1,500",
    "$997",
    "$3,500",
    "$1,497",
    "$6,500",
    "$2,497",
    "$7,500",
    "$3,997",
    "$15,000",
    "SkyeProfitConsole",
    "Free99",
    "gate session required",
    "SkyeRoutexFlow v0.4.0",
    "600 requests/day",
    "2,500 requests/day",
    "6,000 requests/day",
    "Monthly AI spend cap"
  ],
  "saas/pricing.html": [
    "data-plan=\"starter-command\"",
    "data-plan=\"growth-cabinet\"",
    "data-plan=\"routex-workforce-command\"",
    "data-plan=\"autonomous-office\"",
    "SkyeProfitConsole",
    "Free99",
    "gate session required",
    "25,000 AI credits/mo",
    "100,000 AI credits/mo",
    "SkyeRoutexFlow v0.4.0"
  ],
  "saas/skyepay.html": [
    "metraiyux-starter-command",
    "metraiyux-growth-cabinet",
    "metraiyux-routex-workforce-command",
    "metraiyux-autonomous-office",
    "metraiyux-enterprise-command",
    "Automatic unlock gate"
  ],
  "saas/billing.html": [
    "30 rpm",
    "90 rpm",
    "120 rpm",
    "180 rpm",
    "Confirmed Stripe payment unlocks the paid workspace automatically"
  ],
  "saas/signup.html": [
    "$1,500 setup",
    "$3,500 setup",
    "$6,500 setup",
    "$7,500 setup",
    "$15,000 setup",
    "Signup intent does not start billing"
  ]
};

const failures = [];

function fail(message) {
  failures.push(message);
}

function setupCents(offer) {
  return offer.line_items
    .filter((item) => item.type === "one_time")
    .reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);
}

function monthlyCents(offer) {
  return offer.line_items
    .filter((item) => item.type === "recurring")
    .reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);
}

function normalizeCheckout(planId, offerId) {
  return `https://skyesol.netlify.app/skyepay.html?client=metraiyux-0s&offer=${offerId}`;
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertPolicyEqual(label, actual, expected) {
  if (typeof actual === "string" && actual.toLowerCase() === "custom") return;
  assertEqual(label, actual, expected);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

const plans = await readJson(plansPath);
const gateway = await readJson(gatewayPath);
const workerSource = await fs.readFile(workerPath, "utf8");
const stripeWebhookSource = await fs.readFile(stripeWebhookPath, "utf8");
const activationSource = await fs.readFile(activationPath, "utf8");
const offersById = new Map(SKYPAY_OFFERS.map((offer) => [offer.id, offer]));
const plansById = new Map(plans.map((plan) => [plan.id, plan]));

for (const [planId, offerId] of Object.entries(planOfferMap)) {
  const plan = plansById.get(planId);
  const offer = offersById.get(offerId);
  if (!plan) {
    fail(`plans.json missing ${planId}`);
    continue;
  }
  if (!offer) {
    fail(`SkyePay catalog missing ${offerId}`);
    continue;
  }

  const policy = offer.gate_policy;
  const customPolicyPlan = [
    plan.limits.monthly_ai_cap_usd,
    plan.limits.requests_per_minute,
    plan.limits.requests_per_day,
    plan.limits.devices_per_key,
    plan.limits.workspaces,
    plan.limits.vault_storage_mb,
    plan.limits.vault_file_limit
  ].some((value) => typeof value === "string" && value.toLowerCase() === "custom");
  if (!policy && !customPolicyPlan) {
    fail(`${offerId} missing gate_policy`);
    continue;
  }

  const checkoutUrl = normalizeCheckout(planId, offerId);
  assertEqual(`${planId}.skyepay_offer_id`, plan.skyepay_offer_id, offerId);
  assertEqual(`${planId}.checkout_url`, plan.checkout_url, checkoutUrl);
  assertEqual(`${planId}.owner_approval_required`, plan.owner_approval_required, offer.owner_approval_required);
  assertEqual(`${planId}.activation_path`, plan.activation_path, offer.activation_path);
  assertEqual(`skyepay-gateway owner_approval_required`, gateway.owner_approval_required, false);
  assertEqual(`skyepay-gateway activation_path`, gateway.activation_path, "auto_unlock_after_confirmed_payment");
  assertEqual(`${planId}.price_monthly`, plan.price_monthly, monthlyCents(offer) / 100);
  assertEqual(`${planId}.setup_fee`, plan.setup_fee, setupCents(offer) / 100);
  if (policy) {
    assertPolicyEqual(`${planId}.limits.monthly_ai_cap_usd`, plan.limits.monthly_ai_cap_usd, policy.monthly_cap_cents / 100);
    assertPolicyEqual(`${planId}.limits.requests_per_minute`, plan.limits.requests_per_minute, policy.default_rpm_limit);
    assertPolicyEqual(`${planId}.limits.requests_per_day`, plan.limits.requests_per_day, policy.default_rpd_limit);
    assertPolicyEqual(`${planId}.limits.devices_per_key`, plan.limits.devices_per_key, policy.max_devices_per_key);
    assertPolicyEqual(`${planId}.limits.workspaces`, plan.limits.workspaces, policy.vault_workspace_limit);
    assertPolicyEqual(`${planId}.limits.vault_storage_mb`, plan.limits.vault_storage_mb, policy.vault_storage_mb);
    assertPolicyEqual(`${planId}.limits.vault_file_limit`, plan.limits.vault_file_limit, policy.vault_file_limit);
  }
  assertEqual(`skyepay-gateway ${planId}`, gateway.checkout_routes?.[planId], checkoutUrl);

  const workerTokens = [
    offerId,
    checkoutUrl
  ];
  if (policy) workerTokens.push(
    `monthly_ai_cap_usd: ${policy.monthly_cap_cents / 100}`,
    `requests_per_day: ${policy.default_rpd_limit}`,
    `requests_per_minute: ${policy.default_rpm_limit}`
  );
  for (const token of workerTokens) {
    if (!workerSource.includes(token)) fail(`worker PLANS missing ${planId} token: ${token}`);
  }
}

for (const token of [
  "autoUnlockSkyePayOrder(order",
  "stripe_webhook",
  "customer.subscription.updated",
  "workspace_unlocked"
]) {
  if (!stripeWebhookSource.includes(token)) fail(`stripe webhook missing automatic unlock token: ${token}`);
}

for (const token of [
  "SKYEPAY_AUTO_WORKSPACE_UNLOCKED",
  "findOrCreateSkyePayCustomer",
  "stripe_confirmed_skyepay_transaction",
  "provisioning_status='workspace_unlocked'"
]) {
  if (!activationSource.includes(token)) fail(`activation helper missing token: ${token}`);
}

for (const [relativePath, tokens] of Object.entries(htmlRequiredTokens)) {
  const source = await fs.readFile(path.join(siteDir, relativePath), "utf8");
  const foldedSource = source.toLowerCase();
  for (const token of tokens) {
    if (!foldedSource.includes(token.toLowerCase())) fail(`${relativePath} missing disclosure token: ${token}`);
  }
}

if (failures.length) {
  console.error("Commercial plan limit audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Commercial plan limit audit passed for ${Object.keys(planOfferMap).length} plans.`);
