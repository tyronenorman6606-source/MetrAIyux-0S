const DEFAULT_CURRENCY = "usd";

function asCents(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function clean(value, max = 140) {
  return String(value || "").trim().slice(0, max);
}

function normalizeCode(value) {
  return clean(value, 120).toUpperCase().replace(/[^A-Z0-9:_-]/g, "");
}

function money(cents) {
  return `$${(asCents(cents) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

export const SKYEMERIT_KAIXU_CREDIT_CENTS = 600;
export const SKYEMERIT_MIN_PAYABLE_CENTS = 50;
export const SKYEMERIT_FIRST_TIME_PACK_ID = "SKYEMERIT-FIRST-PACK";
export const SKYEMERIT_AUTO_CODE = "SKYEMERIT-FIRST-BEST";
export const SKYEMERIT_CART_ADD_ON_CODE = "SKYEMERIT-CART-ADDON-31";
export const GRAYSCAPE467_CODE = "GRAYSCAPE467";
export const GRAYSCAPE467_PACK_ID = "GRAYSCAPE467-OWNER-QA-PACK";

export const SKYEMERIT_RULES = [
  {
    id: "grayscape-467-owner-unlimited-zero-balance",
    code: GRAYSCAPE467_CODE,
    pack_id: GRAYSCAPE467_PACK_ID,
    family: "owner_qa_unlimited",
    title: "GRAYSCAPE467 Owner QA Merit",
    rate_bps: 10000,
    floor_cents: 0,
    cap_cents: null,
    min_transaction_cents: 1,
    max_transaction_cents: null,
    max_discount_cents: null,
    stackable: false,
    minimum_payable_cents: 0,
    allow_free_checkout: true,
    customer_label: "Owner-issued zero-balance unlimited QA merit",
    guardrail: "Owner QA only. It can zero a checkout, but it does not bypass FS27/SkyGate auth, owner approval, quota guards, or abuse controls."
  },
  {
    id: "skyemerit-first-spark-23",
    code: "SKYEMERIT-FIRST-23",
    pack_id: SKYEMERIT_FIRST_TIME_PACK_ID,
    family: "first_time",
    title: "First-Time Spark",
    rate_bps: 2300,
    floor_cents: 0,
    cap_cents: 670000,
    min_transaction_cents: 1,
    max_transaction_cents: 670000,
    stackable: false,
    minimum_payable_cents: SKYEMERIT_MIN_PAYABLE_CENTS,
    customer_label: "23% off eligible first purchase spend up to $6,700",
    guardrail: "Only the eligible subtotal is discounted; gate session is still required; merit cannot make the checkout free without owner approval."
  },
  {
    id: "skyemerit-first-lift-28",
    code: "SKYEMERIT-FIRST-28",
    pack_id: SKYEMERIT_FIRST_TIME_PACK_ID,
    family: "first_time",
    title: "First-Time Lift",
    rate_bps: 2800,
    floor_cents: 0,
    cap_cents: 940000,
    min_transaction_cents: 670001,
    max_transaction_cents: 940000,
    stackable: false,
    minimum_payable_cents: SKYEMERIT_MIN_PAYABLE_CENTS,
    customer_label: "28% off eligible first purchase spend up to $9,400",
    guardrail: "Only the eligible subtotal is discounted; gate session is still required; merit cannot make the checkout free without owner approval."
  },
  {
    id: "skyemerit-first-skyeline-31",
    code: "SKYEMERIT-FIRST-31",
    pack_id: SKYEMERIT_FIRST_TIME_PACK_ID,
    family: "first_time",
    title: "First-Time SkyeLine",
    rate_bps: 3100,
    floor_cents: 0,
    cap_cents: 940000,
    min_transaction_cents: 940001,
    max_transaction_cents: null,
    stackable: false,
    minimum_payable_cents: SKYEMERIT_MIN_PAYABLE_CENTS,
    customer_label: "31% off eligible first purchase spend, capped at the first $9,400",
    guardrail: "Purchases above $9,400 do not discount the whole ticket; the over-cap amount stays full price; merit cannot make the checkout free without owner approval."
  },
  {
    id: "skyemerit-cart-addon-31",
    code: SKYEMERIT_CART_ADD_ON_CODE,
    pack_id: "SKYEMERIT-SKYCART-PACK",
    family: "cart_add_on",
    title: "SkyeCart Add-On Merit 31",
    rate_bps: 3100,
    floor_cents: 0,
    cap_cents: 940000,
    min_transaction_cents: 50,
    max_transaction_cents: null,
    stackable: true,
    minimum_payable_cents: SKYEMERIT_MIN_PAYABLE_CENTS,
    customer_label: "31% SkyeMerit toward an eligible add-on product in today's SkyeCart",
    guardrail: "This is for relevant add-on products. It can stack with an add-on sale incentive, but it cannot reduce premium, unlimited, provider-heavy, or quoted plans to free without owner approval."
  },
  {
    id: "skyemerit-skyeline-22",
    code: "SKYEMERIT-SKYELINE-22",
    pack_id: "SKYEMERIT-OWNER-PACK",
    family: "owner_issued",
    title: "SkyeLine Guard 22",
    rate_bps: 2200,
    floor_cents: 300000,
    cap_cents: 1000000,
    min_transaction_cents: 300001,
    max_transaction_cents: null,
    stackable: false,
    minimum_payable_cents: SKYEMERIT_MIN_PAYABLE_CENTS,
    customer_label: "22% off the eligible spend between $3,000 and $10,000",
    guardrail: "This protects large enterprise tickets by leaving spend below $3,000 and above $10,000 at full price."
  }
];

export const SKYEMERIT_PACKS = [
  {
    id: GRAYSCAPE467_PACK_ID,
    title: "GRAYSCAPE467 Owner QA Merit Pack",
    audience: "owner_qa_unlimited",
    kaixu_credit_cents: 0,
    coupon_codes: [GRAYSCAPE467_CODE],
    delivery_channels: ["skymail", "relay13", "connectlog", "fs27_event_mirror"],
    gate_required: true,
    note: "Owner-issued zero-balance QA lane for unlimited readiness audits. It is not a public unlimited free plan."
  },
  {
    id: SKYEMERIT_FIRST_TIME_PACK_ID,
    title: "First-Time SkyeMerit Pack",
    audience: "new_customer",
    kaixu_credit_cents: SKYEMERIT_KAIXU_CREDIT_CENTS,
    coupon_codes: ["SKYEMERIT-FIRST-23", "SKYEMERIT-FIRST-28", "SKYEMERIT-FIRST-31"],
    delivery_channels: ["resend", "skymail", "relay13", "connectlog", "fs27_event_mirror"],
    gate_required: true,
    note: "Issued during signup/onboarding, including Free99 access. Free99 removes price, not authentication."
  }
];

export function getSkyeMeritRule(code) {
  const normalized = normalizeCode(code);
  return SKYEMERIT_RULES.find((rule) => rule.code === normalized || rule.id.toUpperCase() === normalized) || null;
}

export function publicSkyeMeritCatalog() {
  return {
    ok: true,
    product: "SkyeMerit",
    currency: DEFAULT_CURRENCY,
    auto_code: SKYEMERIT_AUTO_CODE,
    first_time_pack_id: SKYEMERIT_FIRST_TIME_PACK_ID,
    first_time_kaixu_credit_cents: SKYEMERIT_KAIXU_CREDIT_CENTS,
    gate_required: true,
    stripe_stack_rule: "SkyeMerit disables Stripe promotion-code stacking when a merit is applied.",
    stack_policy: {
      default_minimum_payable_cents: SKYEMERIT_MIN_PAYABLE_CENTS,
      owner_free_checkout_override_required: true,
      skycart_add_on_code: SKYEMERIT_CART_ADD_ON_CODE,
      note: "SkyeMerit can stack for approved incentive lanes, but premium, unlimited, provider-heavy, or quoted offers cannot be made free unless the owner explicitly marks that rule/checkout as free."
    },
    rules: SKYEMERIT_RULES.map((rule) => ({
      id: rule.id,
      code: rule.code,
      pack_id: rule.pack_id,
      family: rule.family,
      title: rule.title,
      rate_bps: rule.rate_bps,
      rate_percent: rule.rate_bps / 100,
      floor_cents: rule.floor_cents,
      cap_cents: rule.cap_cents,
      min_transaction_cents: rule.min_transaction_cents,
      max_transaction_cents: rule.max_transaction_cents,
      minimum_payable_cents: rule.minimum_payable_cents ?? SKYEMERIT_MIN_PAYABLE_CENTS,
      allow_free_checkout: rule.allow_free_checkout === true,
      stackable: rule.stackable,
      customer_label: rule.customer_label,
      guardrail: rule.guardrail
    })),
    packs: SKYEMERIT_PACKS.map((pack) => ({ ...pack }))
  };
}

export function calculateSkyeMerit(ruleOrCode, subtotalCents) {
  const rule = typeof ruleOrCode === "string" ? getSkyeMeritRule(ruleOrCode) : ruleOrCode;
  const subtotal = asCents(subtotalCents);
  if (!rule) {
    return {
      ok: false,
      applied: false,
      reason: "unknown_skyemerit_rule",
      subtotal_cents: subtotal,
      discount_cents: 0,
      payable_cents: subtotal
    };
  }

  const minTransaction = asCents(rule.min_transaction_cents || 0);
  const maxTransaction = rule.max_transaction_cents == null ? null : asCents(rule.max_transaction_cents);
  const transactionApplies = subtotal >= minTransaction && (maxTransaction == null || subtotal <= maxTransaction);
  const floor = asCents(rule.floor_cents || 0);
  const cap = rule.cap_cents == null ? subtotal : asCents(rule.cap_cents);
  const eligible = transactionApplies ? Math.max(0, Math.min(subtotal, cap) - floor) : 0;
  const rawDiscount = Math.round((eligible * asCents(rule.rate_bps)) / 10000);
  const maxDiscount = rule.max_discount_cents == null ? rawDiscount : Math.min(rawDiscount, asCents(rule.max_discount_cents));
  const minimumPayable = rule.allow_free_checkout === true || subtotal <= 0
    ? 0
    : asCents(rule.minimum_payable_cents ?? SKYEMERIT_MIN_PAYABLE_CENTS);
  const discountCeiling = Math.max(0, subtotal - minimumPayable);
  const discount = Math.min(maxDiscount, discountCeiling);
  const payable = Math.max(0, subtotal - discount);

  return {
    ok: true,
    applied: discount > 0,
    reason: discount > 0 ? "applied" : transactionApplies ? "no_eligible_amount" : "transaction_outside_rule_band",
    rule_id: rule.id,
    code: rule.code,
    pack_id: rule.pack_id,
    family: rule.family,
    title: rule.title,
    rate_bps: asCents(rule.rate_bps),
    rate_percent: asCents(rule.rate_bps) / 100,
    floor_cents: floor,
    cap_cents: cap,
    min_transaction_cents: minTransaction,
    max_transaction_cents: maxTransaction,
    subtotal_cents: subtotal,
    eligible_cents: eligible,
    discount_cents: discount,
    payable_cents: payable,
    minimum_payable_cents: minimumPayable,
    allow_free_checkout: rule.allow_free_checkout === true,
    guardrail_floor_applied: maxDiscount > discount,
    customer_label: rule.customer_label,
    guardrail: rule.guardrail,
    summary: `${rule.title}: ${money(discount)} off ${money(eligible)} eligible spend; ${money(payable)} due.`
  };
}

export function selectSkyeMerit({ subtotalCents = 0, code = "", packId = SKYEMERIT_FIRST_TIME_PACK_ID, firstTimeEligible = true } = {}) {
  const subtotal = asCents(subtotalCents);
  const requested = normalizeCode(code);

  if (requested && requested !== SKYEMERIT_AUTO_CODE) {
    return calculateSkyeMerit(requested, subtotal);
  }

  if (!firstTimeEligible && (!requested || requested === SKYEMERIT_AUTO_CODE)) {
    return {
      ok: true,
      applied: false,
      reason: "not_first_time_eligible",
      code: requested || SKYEMERIT_AUTO_CODE,
      subtotal_cents: subtotal,
      discount_cents: 0,
      payable_cents: subtotal
    };
  }

  const candidates = SKYEMERIT_RULES
    .filter((rule) => rule.pack_id === packId && rule.family === "first_time")
    .map((rule) => calculateSkyeMerit(rule, subtotal))
    .filter((calc) => calc.ok);
  candidates.sort((a, b) => Number(b.discount_cents || 0) - Number(a.discount_cents || 0));
  return candidates[0] || calculateSkyeMerit(SKYEMERIT_AUTO_CODE, subtotal);
}

export function checkoutLineItemsForOffer(offer, trialDays = 0) {
  if (!offer?.line_items) return [];
  const activeTrialDays = asCents(trialDays);
  const checkoutItems = offer.mode === "subscription" && activeTrialDays > 0
    ? offer.line_items.filter((item) => item.type === "recurring")
    : offer.line_items;
  return checkoutItems.map((item) => ({ ...item, amount_cents: asCents(item.amount_cents) }));
}

export function skyeMeritDiscountableSubtotal(lineItems, offer) {
  const items = Array.isArray(lineItems) ? lineItems : [];
  return items.reduce((sum, item) => {
    if (offer?.mode === "subscription" && item.type === "recurring") return sum;
    if (item.skyemerit_discountable === false) return sum;
    return sum + asCents(item.amount_cents);
  }, 0);
}

export function applySkyeMeritToLineItems(lineItems, calculation, offer) {
  const items = (Array.isArray(lineItems) ? lineItems : []).map((item) => ({ ...item, amount_cents: asCents(item.amount_cents) }));
  let remaining = asCents(calculation?.discount_cents || 0);
  let applied = 0;

  for (const item of items) {
    if (remaining <= 0) break;
    if (offer?.mode === "subscription" && item.type === "recurring") continue;
    if (item.skyemerit_discountable === false) continue;
    const original = asCents(item.amount_cents);
    const minStripeAmount = calculation?.allow_free_checkout === true ? 0 : SKYEMERIT_MIN_PAYABLE_CENTS;
    const maxReduction = Math.max(0, original - minStripeAmount);
    const reduction = Math.min(remaining, maxReduction);
    if (reduction <= 0) continue;
    item.skyemerit_original_amount_cents = original;
    item.skyemerit_discount_cents = reduction;
    item.skyemerit_adjusted = true;
    item.amount_cents = original - reduction;
    remaining -= reduction;
    applied += reduction;
  }

  return {
    line_items: items,
    applied_discount_cents: applied,
    unapplied_discount_cents: remaining
  };
}

export function buildSkyeMeritCheckout({ offer, trialDays = 0, code = "", packId = SKYEMERIT_FIRST_TIME_PACK_ID, firstTimeEligible = true } = {}) {
  const originalLineItems = checkoutLineItemsForOffer(offer, trialDays);
  const originalDue = originalLineItems.reduce((sum, item) => sum + asCents(item.amount_cents), 0);
  const discountableSubtotal = skyeMeritDiscountableSubtotal(originalLineItems, offer);
  const selected = selectSkyeMerit({ subtotalCents: discountableSubtotal, code, packId, firstTimeEligible });
  const adjusted = selected.applied
    ? applySkyeMeritToLineItems(originalLineItems, selected, offer)
    : { line_items: originalLineItems.map((item) => ({ ...item })), applied_discount_cents: 0, unapplied_discount_cents: 0 };
  const adjustedDue = adjusted.line_items.reduce((sum, item) => sum + asCents(item.amount_cents), 0);
  return {
    ...selected,
    requested_code: normalizeCode(code) || SKYEMERIT_AUTO_CODE,
    pack_id: selected.pack_id || packId,
    discountable_subtotal_cents: discountableSubtotal,
    original_due_cents: originalDue,
    adjusted_due_cents: adjustedDue,
    applied_discount_cents: adjusted.applied_discount_cents,
    unapplied_discount_cents: adjusted.unapplied_discount_cents,
    applied: adjusted.applied_discount_cents > 0,
    line_items: adjusted.line_items,
    original_line_items: originalLineItems,
    kaixu_credit_cents: selected.family === "first_time" || packId === SKYEMERIT_FIRST_TIME_PACK_ID ? SKYEMERIT_KAIXU_CREDIT_CENTS : 0,
    gate_required: true,
    stripe_promotion_codes_allowed: adjusted.applied_discount_cents <= 0
  };
}

export function buildFirstTimeSkyeMeritPack({ email = "", customerId = "", workspaceId = "", source = "signup" } = {}) {
  return {
    id: `skyemerit_pack_${safeRandomUUID()}`,
    pack_id: SKYEMERIT_FIRST_TIME_PACK_ID,
    status: "issued",
    audience: "new_customer",
    email: clean(email, 254).toLowerCase(),
    customer_id: clean(customerId, 120),
    workspace_id: clean(workspaceId, 120),
    source: clean(source, 80),
    issued_at: new Date().toISOString(),
    gate_required: true,
    kaixu_credit_cents: SKYEMERIT_KAIXU_CREDIT_CENTS,
    coupon_codes: ["SKYEMERIT-FIRST-23", "SKYEMERIT-FIRST-28", "SKYEMERIT-FIRST-31"],
    delivery_channels: ["resend", "skymail", "relay13", "connectlog", "fs27_event_mirror"],
    customer_summary: "Your first SkyeMerit pack includes a $6 premium kAIxu credit and first-purchase merit discounts. Free99 lanes still require a gate session."
  };
}

function safeRandomUUID() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `uuid_${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
}

export function skyeMeritMetadata(checkout = null) {
  const c = checkout || {};
  return {
    skyemerit_applied: String(c.applied === true),
    skyemerit_code: clean(c.code || c.requested_code || "", 120),
    skyemerit_pack_id: clean(c.pack_id || "", 120),
    skyemerit_title: clean(c.title || "", 140),
    skyemerit_rate_bps: String(asCents(c.rate_bps || 0)),
    skyemerit_floor_cents: String(asCents(c.floor_cents || 0)),
    skyemerit_cap_cents: String(asCents(c.cap_cents || 0)),
    skyemerit_minimum_payable_cents: String(asCents(c.minimum_payable_cents ?? SKYEMERIT_MIN_PAYABLE_CENTS)),
    skyemerit_allow_free_checkout: String(c.allow_free_checkout === true),
    skyemerit_guardrail_floor_applied: String(c.guardrail_floor_applied === true),
    skyemerit_discountable_subtotal_cents: String(asCents(c.discountable_subtotal_cents || c.subtotal_cents || 0)),
    skyemerit_eligible_cents: String(asCents(c.eligible_cents || 0)),
    skyemerit_discount_cents: String(asCents(c.applied_discount_cents || c.discount_cents || 0)),
    skyemerit_original_due_cents: String(asCents(c.original_due_cents || 0)),
    skyemerit_adjusted_due_cents: String(asCents(c.adjusted_due_cents || 0)),
    skyemerit_kaixu_credit_cents: String(asCents(c.kaixu_credit_cents || 0)),
    skyemerit_gate_required: "true",
    skyemerit_no_stripe_promo_stack: String(c.applied === true)
  };
}
