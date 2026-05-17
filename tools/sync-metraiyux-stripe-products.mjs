#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ENV_FILE = process.env.ROOT_ENV_FILE || path.join(ROOT, ".env");
const OUT_DIR = path.join(ROOT, "test-artifacts", "stripe-sync");
const OUT_FILE = path.join(OUT_DIR, "metraiyux-stripe-sync-receipt.json");

function parseEnv(file) {
  const out = {};
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

const env = parseEnv(ENV_FILE);
const stripeKey = env.STRIPE_SECRET_KEY_LIVE || env.STRIPE_SECRET_KEY || env.stripe_key || env.stripe_agent_key;

if (!stripeKey) {
  console.error("Missing Stripe secret key in root env.");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");
const musicPricingPath = path.join(ROOT, "metraiyux_0s_site", "data", "skyemusicnexus-pricing.json");
const musicPricing = JSON.parse(fs.readFileSync(musicPricingPath, "utf8"));

function dollarsToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function musicPriceSpecs(item) {
  if (item.monthly && item.setup !== undefined) {
    return [
      { kind: "setup", nickname: `${item.name} setup`, lookupKey: item.lookup_keys[0], amount: dollarsToCents(item.setup) },
      { kind: "monthly", nickname: `${item.name} monthly`, lookupKey: item.lookup_keys[1], amount: dollarsToCents(item.monthly), interval: "month" }
    ];
  }
  if (item.billing === "monthly_with_setup") {
    return [
      { kind: "setup", nickname: `${item.name} setup`, lookupKey: item.lookup_keys[0], amount: dollarsToCents(item.setup) },
      { kind: "monthly", nickname: `${item.name} monthly`, lookupKey: item.lookup_keys[1], amount: dollarsToCents(item.amount), interval: "month" }
    ];
  }
  if (item.billing === "monthly") {
    return [{ kind: "monthly", nickname: `${item.name} monthly`, lookupKey: item.lookup_key, amount: dollarsToCents(item.amount), interval: "month" }];
  }
  return [{ kind: "one-time", nickname: item.name, lookupKey: item.lookup_key, amount: dollarsToCents(item.amount) }];
}

const musicOffers = [
  ...musicPricing.paid_tiers,
  ...musicPricing.addons.filter((item) => item.billing !== "quote_starting_at")
].map((item) => ({
  planId: item.id,
  productName: item.name,
  description: `${item.summary} Gate session required; paid checkout does not create live distributor, DSP, payment, legal, label, identity-provider, or deployed persistence claims without separate provider proof.`,
  sourceFolder: "metraiyux_0s_site/SkyeMusicNexus",
  brainOwner: "naomi-sterling-brain",
  ownerApprovalRequired: true,
  prices: musicPriceSpecs(item),
  includes: `skyemusicnexus_${item.id.replace(/^skyemusicnexus-/, "").replace(/-/g, "_")}_gate_required`
}));

const offers = [
  {
    planId: "starter-command",
    productName: "MetrAIyux 0S - Starter Command",
    description: "Starter company operating room with ConnectLog relationship capture, Relay13 bridge readiness, proof routing, and owner-approved workspace activation.",
    sourceFolder: "metraiyux_0s_site",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "Starter Command setup", lookupKey: "metraiyux_starter_command_setup", amount: 150000 },
      { kind: "monthly", nickname: "Starter Command monthly", lookupKey: "metraiyux_starter_command_monthly", amount: 39700, interval: "month" }
    ],
    includes: "connectlog_relay13_houseops_skyebox_skyeroutex_static_ready"
  },
  {
    planId: "growth-cabinet",
    productName: "MetrAIyux 0S - Growth Cabinet",
    description: "Growth operating room with ConnectLog workflows, Relay13 workspace bridge, proof exports, weekly operating rhythm, and owner-approved activation.",
    sourceFolder: "metraiyux_0s_site",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "Growth Cabinet setup", lookupKey: "metraiyux_growth_cabinet_setup", amount: 350000 },
      { kind: "monthly", nickname: "Growth Cabinet monthly", lookupKey: "metraiyux_growth_cabinet_monthly", amount: 99700, interval: "month" }
    ],
    includes: "connectlog_relay13_houseops_skyebox_skyeroutex_workflow_map"
  },
  {
    planId: "houseoperations-command",
    productName: "MetrAIyux 0S - HouseOperations Command",
    description: "Paid HouseOperations command room with task, vendor, owner-alert, proof, tutorial, local SkyeBox vault, and FS27 PIN Gate handoff boundaries.",
    sourceFolder: "metraiyux_0s_site/HouseOperations",
    brainOwner: "marcus-vale-brain",
    prices: [
      { kind: "setup", nickname: "HouseOperations Command setup", lookupKey: "metraiyux_houseoperations_command_setup", amount: 250000 },
      { kind: "monthly", nickname: "HouseOperations Command monthly", lookupKey: "metraiyux_houseoperations_command_monthly", amount: 49700, interval: "month" }
    ],
    includes: "houseoperations_task_vendor_alert_proof_skyebox_pin_gate_tutorial"
  },
  {
    planId: "houseoperations-managed",
    productName: "MetrAIyux 0S - HouseOperations Managed",
    description: "Managed HouseOperations rollout with weekly proof review, multiple local vault handoffs, event mirror policy, and operator handoff.",
    sourceFolder: "metraiyux_0s_site/HouseOperations",
    brainOwner: "marcus-vale-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "HouseOperations Managed setup", lookupKey: "metraiyux_houseoperations_managed_setup", amount: 500000 },
      { kind: "monthly", nickname: "HouseOperations Managed monthly", lookupKey: "metraiyux_houseoperations_managed_monthly", amount: 99700, interval: "month" }
    ],
    includes: "managed_houseoperations_weekly_proof_multi_vault_event_mirror_policy"
  },
  {
    planId: "routex-workforce-command",
    productName: "MetrAIyux 0S - RouteX Workforce Command",
    description: "Owner-approved workforce command lane with SkyeRoutexFlow v0.4.0 local proof, V83 routed shell, jobs, assignments, proof, payments, stops, and reports.",
    sourceFolder: "metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0",
    brainOwner: "marcus-vale-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "RouteX Workforce Command setup", lookupKey: "metraiyux_routex_workforce_command_setup", amount: 650000 },
      { kind: "monthly", nickname: "RouteX Workforce Command monthly", lookupKey: "metraiyux_routex_workforce_command_monthly", amount: 149700, interval: "month" }
    ],
    includes: "skyeroutex_v040_api_browser_proof_v83_local_runtime"
  },
  {
    planId: "autonomous-office",
    productName: "MetrAIyux 0S - Autonomous Office",
    description: "Full managed office lane with stronger gate persistence, approval inboxes, ConnectLog operator proof, Relay13 live handoff, connector readiness, and owner-approved sovereign stack activation.",
    sourceFolder: "metraiyux_0s_site",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "Autonomous Office setup", lookupKey: "metraiyux_autonomous_office_setup", amount: 750000 },
      { kind: "monthly", nickname: "Autonomous Office monthly", lookupKey: "metraiyux_autonomous_office_monthly", amount: 249700, interval: "month" }
    ],
    includes: "connectlog_relay13_houseops_skyebox_skyeroutex_v040_handoff"
  },
  {
    planId: "enterprise-command",
    productName: "MetrAIyux 0S - Enterprise",
    description: "Enterprise managed gate base with custom written limits, ConnectLog/Relay13 architecture, SkyeRouteX deployment scope, and audit exports.",
    sourceFolder: "metraiyux_0s_site",
    brainOwner: "celeste-monroe-brain",
    ownerApprovalRequired: true,
    prices: [
      { kind: "setup", nickname: "Enterprise setup", lookupKey: "metraiyux_enterprise_setup", amount: 1500000 },
      { kind: "monthly", nickname: "Enterprise monthly", lookupKey: "metraiyux_enterprise_monthly", amount: 399700, interval: "month" }
    ],
    includes: "managed_connectlog_relay13_houseops_skyebox_custom_skyeroutex_v040"
  },
  ...musicOffers,
  {
    planId: "skygatefs27-managed",
    productName: "SkyeGateFS27 Managed Control Plane",
    description: "Managed gate operations, billing visibility, auth clearance, usage ledger, platform mirroring, and control-plane support.",
    sourceFolder: "SkyeGateFS27",
    brainOwner: "naomi-sterling-brain",
    prices: [
      { kind: "onboarding", nickname: "Managed gate onboarding", lookupKey: "skygatefs27_managed_gate_onboarding", amount: 1250000 },
      { kind: "monthly", nickname: "Managed gate operations monthly", lookupKey: "skygatefs27_managed_control_plane_monthly", amount: 125000, interval: "month" }
    ],
    includes: "auth_usage_billing_platform_event_mirroring"
  },
  {
    planId: "skygatefs27-lane-maintenance",
    productName: "SkyeGateFS27 Lane Maintenance",
    description: "Monthly lane maintenance for gate-connected client app routes, updates, small fixes, and proof support.",
    sourceFolder: "SkyeGateFS27",
    brainOwner: "naomi-sterling-brain",
    prices: [
      { kind: "monthly", nickname: "Lane maintenance monthly", lookupKey: "skygatefs27_lane_maintenance_monthly", amount: 24900, interval: "month" }
    ],
    includes: "lane_updates_small_tweaks_support"
  }
];

function form(data) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  return params;
}

async function stripe(method, route, data = null) {
  const response = await fetch(`https://api.stripe.com/v1/${route}`, {
    method,
    headers: {
      authorization: `Bearer ${stripeKey}`,
      ...(data ? { "content-type": "application/x-www-form-urlencoded" } : {})
    },
    body: data ? form(data).toString() : undefined
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(JSON.stringify({ method, route, status: response.status, error: body.error?.message || body }));
  }
  return body;
}

async function listPricesByLookup(lookupKey) {
  const params = new URLSearchParams();
  params.set("limit", "10");
  params.append("lookup_keys[]", lookupKey);
  params.append("expand[]", "data.product");
  const response = await fetch(`https://api.stripe.com/v1/prices?${params}`, {
    headers: { authorization: `Bearer ${stripeKey}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(JSON.stringify({ lookupKey, status: response.status, error: body.error?.message || body }));
  return body.data || [];
}

async function searchProductsByPlan(planId) {
  const params = new URLSearchParams();
  params.set("limit", "10");
  params.set("query", `metadata['plan_id']:'${planId}'`);
  const response = await fetch(`https://api.stripe.com/v1/products/search?${params}`, {
    headers: { authorization: `Bearer ${stripeKey}` }
  });
  const body = await response.json();
  if (!response.ok) return [];
  return body.data || [];
}

function priceMatches(price, spec) {
  return (
    price.active === true &&
    price.unit_amount === spec.amount &&
    price.currency === "usd" &&
    (spec.interval ? price.recurring?.interval === spec.interval : !price.recurring)
  );
}

function productId(product) {
  return typeof product === "string" ? product : product?.id;
}

async function ensureProduct(offer, existingPrices) {
  const fromPrices = existingPrices.map((price) => productId(price.product)).filter(Boolean);
  if (fromPrices[0]) return fromPrices[0];

  const byPlan = await searchProductsByPlan(offer.planId);
  if (byPlan[0]?.id) return byPlan[0].id;

  if (DRY_RUN) return `dry_run_product_${offer.planId}`;

  const product = await stripe("POST", "products", {
    name: offer.productName,
    description: offer.description,
    statement_descriptor: offer.productName.startsWith("SkyeGate") ? "SKYEGATEFS27" : "METRAIYUX0S",
    "metadata[source_folder]": offer.sourceFolder,
    "metadata[source_file]": "STRIPE_PRODUCT_PRICE_CATALOG.md",
    "metadata[offer_family]": offer.productName.startsWith("SkyeGate") ? "skygate" : "metraiyux",
    "metadata[plan_id]": offer.planId,
    "metadata[status]": "approved",
    "metadata[brain_owner]": offer.brainOwner,
    "metadata[includes]": offer.includes,
    ...(offer.ownerApprovalRequired ? { "metadata[owner_approval_required]": "true" } : {})
  });
  return product.id;
}

async function updateProduct(productIdValue, offer) {
  if (DRY_RUN || String(productIdValue).startsWith("dry_run_")) return { updated: false };
  return stripe("POST", `products/${productIdValue}`, {
    name: offer.productName,
    description: offer.description,
    "metadata[source_folder]": offer.sourceFolder,
    "metadata[source_file]": "STRIPE_PRODUCT_PRICE_CATALOG.md",
    "metadata[offer_family]": offer.productName.startsWith("SkyeGate") ? "skygate" : "metraiyux",
    "metadata[plan_id]": offer.planId,
    "metadata[status]": "approved",
    "metadata[brain_owner]": offer.brainOwner,
    "metadata[includes]": offer.includes,
    ...(offer.ownerApprovalRequired ? { "metadata[owner_approval_required]": "true" } : {})
  });
}

async function createPrice(productIdValue, offer, spec) {
  if (DRY_RUN) {
    return {
      id: `dry_run_price_${spec.lookupKey}`,
      active: true,
      livemode: false,
      lookup_key: spec.lookupKey,
      unit_amount: spec.amount,
      recurring: spec.interval ? { interval: spec.interval } : null,
      product: productIdValue
    };
  }
  return stripe("POST", "prices", {
    product: productIdValue,
    currency: "usd",
    unit_amount: spec.amount,
    ...(spec.interval ? { "recurring[interval]": spec.interval } : {}),
    nickname: spec.nickname,
    lookup_key: spec.lookupKey,
    transfer_lookup_key: "true",
    "metadata[source_folder]": offer.sourceFolder,
    "metadata[source_file]": "STRIPE_PRODUCT_PRICE_CATALOG.md",
    "metadata[offer_family]": offer.productName.startsWith("SkyeGate") ? "skygate" : "metraiyux",
    "metadata[plan_id]": offer.planId,
    "metadata[status]": "approved",
    "metadata[brain_owner]": offer.brainOwner,
    "metadata[price_kind]": spec.kind,
    "metadata[includes]": offer.includes,
    ...(spec.kind !== "monthly" ? { "metadata[setup_for]": offer.planId } : {}),
    ...(offer.ownerApprovalRequired ? { "metadata[owner_approval_required]": "true" } : {})
  });
}

async function archivePrice(priceIdValue) {
  if (DRY_RUN || !priceIdValue || String(priceIdValue).startsWith("dry_run_")) return null;
  return stripe("POST", `prices/${priceIdValue}`, { active: "false" });
}

const startedAt = new Date().toISOString();
const account = await stripe("GET", "account");
const receipt = {
  ok: true,
  mode: DRY_RUN ? "dry_run" : "live",
  generated_at: startedAt,
  stripe_account: {
    id: account.id,
    charges_enabled: account.charges_enabled,
    details_submitted: account.details_submitted
  },
  source_env_file: ENV_FILE.replace(ROOT, "."),
  synced: []
};

for (const offer of offers) {
  const existingBySpec = {};
  const allExisting = [];
  for (const spec of offer.prices) {
    const prices = await listPricesByLookup(spec.lookupKey);
    existingBySpec[spec.lookupKey] = prices;
    allExisting.push(...prices);
  }

  const product = await ensureProduct(offer, allExisting);
  await updateProduct(product, offer);
  const offerReceipt = {
    plan_id: offer.planId,
    product_id: product,
    product_name: offer.productName,
    prices: []
  };

  for (const spec of offer.prices) {
    const existing = existingBySpec[spec.lookupKey] || [];
    const current = existing.find((price) => priceMatches(price, spec));
    if (current) {
      offerReceipt.prices.push({
        lookup_key: spec.lookupKey,
        desired_amount_cents: spec.amount,
        interval: spec.interval || null,
        action: "reused_current_price",
        price_id: current.id,
        livemode: current.livemode,
        archived_price_ids: []
      });
      continue;
    }

    const stale = existing.map((price) => ({
      id: price.id,
      amount_cents: price.unit_amount,
      interval: price.recurring?.interval || null,
      active: price.active,
      livemode: price.livemode
    }));

    const created = await createPrice(product, offer, spec);
    const archived = [];
    for (const price of existing) {
      if (price.id !== created.id && price.active) {
        await archivePrice(price.id);
        archived.push(price.id);
      }
    }
    offerReceipt.prices.push({
      lookup_key: spec.lookupKey,
      desired_amount_cents: spec.amount,
      interval: spec.interval || null,
      action: stale.length ? "created_replacement_price" : "created_new_price",
      price_id: created.id,
      livemode: created.livemode,
      stale_before: stale,
      archived_price_ids: archived
    });
  }

  receipt.synced.push(offerReceipt);
}

receipt.completed_at = new Date().toISOString();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, `${JSON.stringify(receipt, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  mode: receipt.mode,
  stripe_account: receipt.stripe_account.id,
  synced_offer_count: receipt.synced.length,
  changed_price_count: receipt.synced.flatMap((offer) => offer.prices).filter((price) => price.action !== "reused_current_price").length,
  receipt: OUT_FILE
}, null, 2));
