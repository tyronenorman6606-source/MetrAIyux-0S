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
export const SKYEMERIT_FIRST_TIME_PACK_ID = "SKYEMERIT-FIRST-PACK";
export const SKYEMERIT_AUTO_CODE = "SKYEMERIT-FIRST-BEST";

export const SKYEMERIT_RULES = [
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
    customer_label: "23% off eligible first purchase spend up to $6,700",
    guardrail: "Only the eligible subtotal is discounted; gate session is still required."
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
    customer_label: "28% off eligible first purchase spend up to $9,400",
    guardrail: "Only the eligible subtotal is discounted; gate session is still required."
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
    customer_label: "31% off eligible first purchase spend, capped at the first $9,400",
    guardrail: "Purchases above $9,400 do not discount the whole ticket; the over-cap amount stays full price."
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
    customer_label: "22% off the eligible spend between $3,000 and $10,000",
    guardrail: "This protects large enterprise tickets by leaving spend below $3,000 and above $10,000 at full price."
  }
];

export const SKYEMERIT_PACKS = [
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
  const discount = Math.min(maxDiscount, subtotal);
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
    const minStripeAmount = 50;
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
    id: `skyemerit_pack_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
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
