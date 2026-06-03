#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./_local-env.mjs";
import { SKYPAY_OFFERS } from "../netlify/functions/_lib/skyepayCatalog.js";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const FS27_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(FS27_ROOT, "../../../..");
const OUT_DIR = path.join(REPO_ROOT, "test-artifacts", "stripe-sync");
const OUT_FILE = path.join(OUT_DIR, "skyepay-full-catalog-parity-latest.json");

const args = new Set(process.argv.slice(2));
const SYNC = args.has("--sync");
const STRICT = args.has("--strict");
const INCLUDE_OWNER_APPROVAL = !args.has("--customer-ready-only");
const FAMILY_FILTERS = process.argv
  .filter((arg) => arg.startsWith("--family="))
  .flatMap((arg) => arg.slice("--family=".length).split(","))
  .map((item) => item.trim())
  .filter(Boolean);
const OFFER_FILTERS = process.argv
  .filter((arg) => arg.startsWith("--offer="))
  .flatMap((arg) => arg.slice("--offer=".length).split(","))
  .map((item) => item.trim())
  .filter(Boolean);

loadLocalEnv({ root: FS27_ROOT, repoRoot: REPO_ROOT });

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET || "";
const STRIPE_API_BASE = (process.env.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/+$/, "");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!STRIPE_SECRET) fail("Missing STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_LIVE for SkyePay Stripe parity.");

function safeText(value, max = 500) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function stripeAuthHeaders(extra = {}) {
  return {
    authorization: `Bearer ${STRIPE_SECRET}`,
    accept: "application/json",
    ...extra
  };
}

function appendParam(params, key, value) {
  if (value == null || value === "") return;
  params.append(key, String(value));
}

async function stripeRequest(method, endpoint, body = null, idempotencyKey = "") {
  const headers = stripeAuthHeaders();
  const options = { method, headers };
  if (body) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    options.body = body;
  }
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey.slice(0, 255);

  const response = await fetch(`${STRIPE_API_BASE}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.error?.message || data?.message || `Stripe ${method} ${endpoint} failed`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

function offerIsIncluded(offer) {
  if (!offer || !offer.id) return false;
  if (FAMILY_FILTERS.length && !FAMILY_FILTERS.includes(offer.family)) return false;
  if (OFFER_FILTERS.length && !OFFER_FILTERS.includes(offer.id)) return false;
  if (!INCLUDE_OWNER_APPROVAL && offer.owner_approval_required === true) return false;
  return true;
}

function collectPriceSpecs() {
  const specs = [];
  for (const offer of SKYPAY_OFFERS) {
    if (!offerIsIncluded(offer)) continue;
    for (const item of Array.isArray(offer.line_items) ? offer.line_items : []) {
      if (!item.lookup_key) {
        specs.push({
          offer_id: offer.id,
          offer_family: offer.family,
          item_id: item.id || "",
          lookup_key: "",
          status: "missing_catalog_lookup_key",
          expected: {
            amount_cents: Number(item.amount_cents || 0),
            currency: String(offer.currency || "usd").toLowerCase(),
            type: item.type || "one_time",
            interval: item.interval || null
          }
        });
        continue;
      }
      specs.push({
        offer,
        item,
        offer_id: offer.id,
        offer_title: offer.title || offer.plan_name || offer.id,
        offer_family: offer.family,
        owner_approval_required: offer.owner_approval_required === true,
        require_stripe_lookup_key: offer.require_stripe_lookup_key === true,
        item_id: item.id || "",
        item_name: item.name || offer.title || offer.id,
        lookup_key: item.lookup_key,
        expected: {
          amount_cents: Number(item.amount_cents || 0),
          currency: String(offer.currency || "usd").toLowerCase(),
          type: item.type || "one_time",
          interval: item.type === "recurring" ? (item.interval || "month") : null
        }
      });
    }
  }
  return specs;
}

function priceMismatchReasons(price, spec) {
  if (!price) return ["missing"];
  const reasons = [];
  const expected = spec.expected;
  if (Number(price.unit_amount || 0) !== expected.amount_cents) reasons.push("amount");
  if (String(price.currency || "").toLowerCase() !== expected.currency) reasons.push("currency");
  if (expected.type === "recurring") {
    if (!price.recurring) reasons.push("recurring");
    if (price.recurring && String(price.recurring.interval || "") !== expected.interval) reasons.push("interval");
  } else if (price.recurring) {
    reasons.push("one_time");
  }
  if (price.active !== true) reasons.push("inactive_price");
  if (price.product && typeof price.product === "object" && price.product.active === false) reasons.push("inactive_product");
  return reasons;
}

function summarizePrice(price) {
  if (!price) return null;
  const product = price.product && typeof price.product === "object" ? price.product : null;
  return {
    id: price.id || null,
    active: price.active === true,
    livemode: price.livemode === true,
    lookup_key: price.lookup_key || null,
    unit_amount: price.unit_amount ?? null,
    currency: price.currency || null,
    type: price.recurring ? "recurring" : "one_time",
    interval: price.recurring?.interval || null,
    product_id: product?.id || (typeof price.product === "string" ? price.product : null),
    product_name: product?.name || null,
    product_active: product?.active !== false
  };
}

async function listPricesByLookupKey(lookupKey) {
  const params = new URLSearchParams({ active: "true", limit: "100" });
  params.append("lookup_keys[]", lookupKey);
  params.append("expand[]", "data.product");
  const data = await stripeRequest("GET", `/v1/prices?${params.toString()}`);
  return Array.isArray(data.data) ? data.data : [];
}

function exactPrice(prices, spec) {
  return prices.find((price) => priceMismatchReasons(price, spec).length === 0) || null;
}

function productIdFromPrice(price) {
  if (!price) return "";
  if (typeof price.product === "string") return price.product;
  return price.product?.id || "";
}

async function createProduct(spec) {
  const params = new URLSearchParams();
  appendParam(params, "name", safeText(spec.offer_title, 220) || safeText(spec.item_name, 220));
  appendParam(params, "description", safeText(spec.offer.description || spec.item_name, 500));
  appendParam(params, "metadata[skyepay]", "true");
  appendParam(params, "metadata[offer_id]", spec.offer_id);
  appendParam(params, "metadata[offer_family]", spec.offer_family);
  appendParam(params, "metadata[source]", "skygatefs27_catalog_parity");
  return stripeRequest(
    "POST",
    "/v1/products",
    params,
    `skyepay_product_${spec.offer_id}_${timestampSlug(new Date()).slice(0, 10)}`
  );
}

async function createPrice(spec, productId, transferLookupKey = false) {
  const params = new URLSearchParams();
  appendParam(params, "currency", spec.expected.currency);
  appendParam(params, "unit_amount", spec.expected.amount_cents);
  appendParam(params, "product", productId);
  appendParam(params, "lookup_key", spec.lookup_key);
  appendParam(params, "nickname", safeText(spec.item_name, 240));
  if (transferLookupKey) appendParam(params, "transfer_lookup_key", "true");
  if (spec.expected.type === "recurring") appendParam(params, "recurring[interval]", spec.expected.interval || "month");
  appendParam(params, "metadata[skyepay]", "true");
  appendParam(params, "metadata[offer_id]", spec.offer_id);
  appendParam(params, "metadata[offer_family]", spec.offer_family);
  appendParam(params, "metadata[item_id]", spec.item_id);
  appendParam(params, "metadata[source]", "skygatefs27_catalog_parity");
  return stripeRequest("POST", "/v1/prices", params, `skyepay_price_${spec.lookup_key}_${spec.expected.amount_cents}`);
}

async function retrieveAccount() {
  const account = await stripeRequest("GET", "/v1/account");
  return {
    id: account.id || null,
    country: account.country || null,
    charges_enabled: account.charges_enabled === true,
    payouts_enabled: account.payouts_enabled === true,
    details_submitted: account.details_submitted === true,
    default_currency: account.default_currency || null
  };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generatedAt = new Date();
  const specs = collectPriceSpecs();
  const productCache = new Map();
  const account = await retrieveAccount();
  const entries = [];

  for (const spec of specs) {
    if (spec.status === "missing_catalog_lookup_key") {
      entries.push(spec);
      continue;
    }

    try {
      const prices = await listPricesByLookupKey(spec.lookup_key);
      let price = exactPrice(prices, spec);
      let action = "reused";
      let reasons = price ? [] : priceMismatchReasons(prices[0], spec);

      if (!price && SYNC) {
        let productId = productCache.get(spec.offer_id) || productIdFromPrice(prices[0]);
        if (!productId) {
          const product = await createProduct(spec);
          productId = product.id;
          productCache.set(spec.offer_id, productId);
        }
        const created = await createPrice(spec, productId, prices.length > 0);
        price = created;
        action = prices.length > 0 ? "created_price_transferred_lookup_key" : "created_price";
        reasons = priceMismatchReasons(price, spec);
      } else if (price) {
        const productId = productIdFromPrice(price);
        if (productId && !productCache.has(spec.offer_id)) productCache.set(spec.offer_id, productId);
      }

      const status = price && reasons.length === 0 ? "ok" : prices.length ? "mismatch" : "missing";
      entries.push({
        offer_id: spec.offer_id,
        offer_family: spec.offer_family,
        owner_approval_required: spec.owner_approval_required,
        require_stripe_lookup_key: spec.require_stripe_lookup_key,
        item_id: spec.item_id,
        lookup_key: spec.lookup_key,
        expected: spec.expected,
        status,
        action,
        mismatch_reasons: reasons,
        observed_price_count: prices.length,
        stripe_price: summarizePrice(price || prices[0])
      });
    } catch (error) {
      entries.push({
        offer_id: spec.offer_id,
        offer_family: spec.offer_family,
        owner_approval_required: spec.owner_approval_required,
        require_stripe_lookup_key: spec.require_stripe_lookup_key,
        item_id: spec.item_id,
        lookup_key: spec.lookup_key,
        expected: spec.expected,
        status: "stripe_error",
        error: safeText(error.message, 500),
        stripe_status: error.status || null
      });
    }
  }

  const failures = entries.filter((entry) => entry.status !== "ok");
  const receipt = {
    ok: failures.length === 0,
    generated_at: generatedAt.toISOString(),
    mode: SYNC ? "sync" : "audit",
    strict: STRICT,
    catalog: {
      offer_count: SKYPAY_OFFERS.length,
      inspected_price_count: entries.length,
      family_filters: FAMILY_FILTERS,
      offer_filters: OFFER_FILTERS,
      owner_approval_included: INCLUDE_OWNER_APPROVAL
    },
    stripe_account: account,
    counts: {
      by_status: countBy(entries, "status"),
      by_family: countBy(entries, "offer_family"),
      public_static_prices_ok: entries.filter((entry) => entry.status === "ok").length,
      public_static_prices_failed: failures.length
    },
    failures,
    entries
  };

  const stamped = path.join(OUT_DIR, `skyepay-full-catalog-parity-${timestampSlug(generatedAt)}.json`);
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(stamped, `${JSON.stringify(receipt, null, 2)}\n`);

  console.log(JSON.stringify({
    ok: receipt.ok,
    mode: receipt.mode,
    inspected_price_count: receipt.catalog.inspected_price_count,
    failed_price_count: failures.length,
    counts: receipt.counts.by_status,
    receipt: path.relative(REPO_ROOT, OUT_FILE)
  }, null, 2));

  if ((STRICT || SYNC) && failures.length) process.exit(1);
}

main().catch((error) => fail(error.stack || error.message));
