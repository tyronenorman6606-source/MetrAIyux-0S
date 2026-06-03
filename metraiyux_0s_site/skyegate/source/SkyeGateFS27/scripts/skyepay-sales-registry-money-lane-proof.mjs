#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SKYPAY_OFFERS } from "../netlify/functions/_lib/skyepayCatalog.js";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const FS27_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(FS27_ROOT, "../../../..");
const SALES_REGISTRY = path.join(REPO_ROOT, "metraiyux_0s_site", "brain", "sales-offer-registry.json");
const PLATFORM_REGISTRY = path.join(REPO_ROOT, "metraiyux_0s_site", "sales", "platform-surface-pricing-registry.json");
const STRIPE_PARITY_RECEIPT = path.join(REPO_ROOT, "test-artifacts", "stripe-sync", "skyepay-full-catalog-parity-latest.json");
const OUT_DIR = path.join(REPO_ROOT, "test-artifacts", "skyepay-readiness");
const OUT_FILE = path.join(OUT_DIR, "skyepay-sales-registry-money-lane-latest.json");

const FIXED_APPROVED_STATUSES = new Set(["approved", "approved_floor"]);
const VARIABLE_PRICE_TYPES = new Set(["one_time_variable", "quote_only"]);
const DIRECT_PLATFORM_SURFACE_MAP = {
  "starter-command": ["metraiyux-starter-command"],
  "growth-cabinet": ["metraiyux-growth-cabinet"],
  "routex-workforce-command": ["metraiyux-routex-workforce-command"],
  "autonomous-office": ["metraiyux-autonomous-office"],
  "enterprise-managed-gate": ["metraiyux-enterprise-command"],
  "agentic-growth-layer": ["agentic-growth-starter", "agentic-growth-connected", "agentic-growth-operator"],
  "connectlog-relay13": ["relay13-ai-response-starter", "relay13-ai-response-plus", "relay13-managed-ai-inbox"],
  "skymail": ["skyemail-starter-mailbox", "skyemail-business-mailbox", "skyemail-operator-mailbox", "skyemail-ai-response-starter", "skyemail-ai-response-plus", "skyemail-managed-ai-inbox"],
  "skyevault-skysecure": ["skyevault-starter-access", "skyevault-pro-access", "skyevault-command-access", "skyevault-auto-install-addon"],
  "northstar-fs27": ["skygatefs27-managed-control-plane", "skygate-lane-maintenance-monthly"],
  "skyemusicnexus": ["skyemusicnexus-studio", "skyemusicnexus-label-command", "skyemusicnexus-managed-music-ops"],
  "sovereigndocs": ["sovereigndocs-legal-review-lane"],
  "valley-verified": ["valley-verified-app-build-lane"],
  "kaixu-codestudio": ["kaixu-starter-monthly", "kaixu-team-monthly", "kaixu-scale-monthly"],
  "jobping": ["jobping-runtime"],
  "skyepay-skyemerit": ["metraiyux-starter-command", "metraiyux-growth-cabinet"],
  "free99": ["brandforge-ai-generation", "social-batch-ai-burst", "social-batch-ai-studio", "social-batch-ai-unlimited"]
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function clean(value, max = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function isFixedApprovedSalesOffer(offer) {
  return FIXED_APPROVED_STATUSES.has(offer.status)
    && Number(offer.amount_cents || 0) > 0
    && !VARIABLE_PRICE_TYPES.has(String(offer.price_type || ""))
    && Boolean(clean(offer.lookup_key));
}

function stripeIntervalForOffer(offer) {
  const priceType = String(offer.price_type || "");
  if (priceType === "recurring" || priceType === "subscription") return offer.billing_period || "month";
  if (priceType === "recurring_floor") return offer.billing_period || "month";
  return null;
}

function expectedLineType(offer) {
  const priceType = String(offer.price_type || "");
  return priceType === "recurring" || priceType === "subscription" || priceType === "recurring_floor"
    ? "recurring"
    : "one_time";
}

function buildSkyePayLookupIndex() {
  const byOfferId = new Map();
  const byLookupKey = new Map();
  for (const offer of SKYPAY_OFFERS) {
    byOfferId.set(offer.id, offer);
    for (const item of Array.isArray(offer.line_items) ? offer.line_items : []) {
      const key = clean(item.lookup_key, 200);
      if (!key) continue;
      byLookupKey.set(key, { offer, item });
    }
  }
  return { byOfferId, byLookupKey };
}

function buildStripeReceiptIndex(receipt) {
  const byLookupKey = new Map();
  for (const entry of Array.isArray(receipt?.entries) ? receipt.entries : []) {
    if (entry.lookup_key) byLookupKey.set(entry.lookup_key, entry);
  }
  return byLookupKey;
}

function inspectSalesOffer(offer, indexes) {
  const failures = [];
  const match = indexes.skyePay.byLookupKey.get(offer.lookup_key);
  const stripeEntry = indexes.stripeByLookupKey.get(offer.lookup_key);
  const expectedType = expectedLineType(offer);
  const expectedInterval = stripeIntervalForOffer(offer);

  if (!match) {
    failures.push("missing_skypay_offer_line_item");
  } else {
    if (Number(match.item.amount_cents || 0) !== Number(offer.amount_cents || 0)) failures.push("amount_mismatch");
    if (String(match.offer.currency || "usd").toLowerCase() !== String(offer.currency || "usd").toLowerCase()) failures.push("currency_mismatch");
    if (String(match.item.type || "") !== expectedType) failures.push("line_item_type_mismatch");
    if (expectedInterval && String(match.item.interval || "month") !== String(expectedInterval)) failures.push("interval_mismatch");
    if (match.offer.storefront === false) failures.push("skypay_offer_not_storefront");
    if (match.offer.require_stripe_lookup_key !== true) failures.push("skypay_offer_not_required_for_payment_lookup");
    if (!match.offer.fulfillment && !match.offer.activation_path) failures.push("missing_activation_or_fulfillment_context");
  }

  if (!stripeEntry) {
    failures.push("missing_latest_stripe_parity_entry");
  } else if (stripeEntry.status !== "ok") {
    failures.push(`stripe_parity_not_ok:${stripeEntry.status}`);
  }

  return {
    sales_offer_id: offer.id,
    status: offer.status,
    lookup_key: offer.lookup_key,
    expected_amount_cents: Number(offer.amount_cents || 0),
    expected_type: expectedType,
    skypay_offer_id: match?.offer?.id || null,
    skypay_family: match?.offer?.family || null,
    stripe_parity_status: stripeEntry?.status || null,
    failures
  };
}

function inspectPlatformSurface(item, indexes) {
  const expectedOfferIds = DIRECT_PLATFORM_SURFACE_MAP[item.id] || [];
  const mapped = expectedOfferIds.map((id) => indexes.skyePay.byOfferId.get(id)).filter(Boolean);
  const hasExplicitMoneyPhrase = /\$[0-9]/.test(String(item.price || ""));
  const directCheckoutRequired = item.status === "live_proven" && expectedOfferIds.length > 0;
  const failures = [];
  if (directCheckoutRequired && mapped.length !== expectedOfferIds.length) {
    failures.push("mapped_skypay_offer_missing");
  }
  if (directCheckoutRequired && hasExplicitMoneyPhrase) {
    for (const offer of mapped) {
      for (const line of Array.isArray(offer.line_items) ? offer.line_items : []) {
        const stripeEntry = indexes.stripeByLookupKey.get(line.lookup_key);
        if (!stripeEntry || stripeEntry.status !== "ok") {
          failures.push(`mapped_offer_stripe_parity_missing:${offer.id}:${line.lookup_key}`);
        }
      }
    }
  }
  return {
    surface_id: item.id,
    status: item.status,
    price: item.price || "",
    mapped_offer_ids: expectedOfferIds,
    mapped_offer_count: mapped.length,
    direct_checkout_required: directCheckoutRequired,
    failures
  };
}

function flattenPlatformItems(registry) {
  return (Array.isArray(registry.groups) ? registry.groups : [])
    .flatMap((group) => (Array.isArray(group.items) ? group.items : [])
      .map((item) => ({ ...item, group_id: group.id, group_label: group.label })));
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generatedAt = new Date();
  const salesRegistry = readJson(SALES_REGISTRY);
  const platformRegistry = readJson(PLATFORM_REGISTRY);
  const stripeReceipt = fs.existsSync(STRIPE_PARITY_RECEIPT) ? readJson(STRIPE_PARITY_RECEIPT) : null;
  const indexes = {
    skyePay: buildSkyePayLookupIndex(),
    stripeByLookupKey: buildStripeReceiptIndex(stripeReceipt)
  };

  const salesOffers = (Array.isArray(salesRegistry.offers) ? salesRegistry.offers : [])
    .filter(isFixedApprovedSalesOffer);
  const salesEntries = salesOffers.map((offer) => inspectSalesOffer(offer, indexes));
  const platformEntries = flattenPlatformItems(platformRegistry).map((item) => inspectPlatformSurface(item, indexes));
  const failures = [
    ...salesEntries.filter((entry) => entry.failures.length > 0).map((entry) => ({ scope: "sales_offer", ...entry })),
    ...platformEntries.filter((entry) => entry.failures.length > 0).map((entry) => ({ scope: "platform_surface", ...entry }))
  ];
  const receipt = {
    ok: failures.length === 0,
    generated_at: generatedAt.toISOString(),
    proof: "skyepay-sales-registry-money-lane",
    sources: {
      sales_registry: path.relative(REPO_ROOT, SALES_REGISTRY),
      platform_registry: path.relative(REPO_ROOT, PLATFORM_REGISTRY),
      skypay_catalog: "metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js",
      stripe_parity_receipt: path.relative(REPO_ROOT, STRIPE_PARITY_RECEIPT)
    },
    counts: {
      skypay_offer_count: SKYPAY_OFFERS.length,
      sales_registry_offer_count: Array.isArray(salesRegistry.offers) ? salesRegistry.offers.length : 0,
      approved_fixed_sales_offers_checked: salesEntries.length,
      platform_surfaces_checked: platformEntries.length,
      platform_surfaces_with_direct_offer_map: platformEntries.filter((entry) => entry.direct_checkout_required).length,
      stripe_parity_ok: stripeReceipt?.ok === true,
      failure_count: failures.length
    },
    failures,
    sales_entries: salesEntries,
    platform_entries: platformEntries
  };
  const stamped = path.join(OUT_DIR, `skyepay-sales-registry-money-lane-${timestampSlug(generatedAt)}.json`);
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    skypay_offer_count: receipt.counts.skypay_offer_count,
    approved_fixed_sales_offers_checked: receipt.counts.approved_fixed_sales_offers_checked,
    platform_surfaces_with_direct_offer_map: receipt.counts.platform_surfaces_with_direct_offer_map,
    failure_count: receipt.counts.failure_count,
    receipt: path.relative(REPO_ROOT, OUT_FILE)
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main();
