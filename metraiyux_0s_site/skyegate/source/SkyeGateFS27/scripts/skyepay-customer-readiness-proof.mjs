#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SKYPAY_OFFERS,
  getSkyePayClient,
  publicOffer
} from "../netlify/functions/_lib/skyepayCatalog.js";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const FS27_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(FS27_ROOT, "../../../..");
const OUT_DIR = path.join(REPO_ROOT, "test-artifacts", "skyepay-readiness");
const OUT_FILE = path.join(OUT_DIR, "skyepay-customer-readiness-latest.json");

const BANNED_PUBLIC_TERMS = [
  "provider-backed",
  "zoho",
  "resend",
  "neon database",
  "backed by neon",
  "backed by cloudflare",
  "provider:",
  "stripe-confirmed",
  "stripe_confirmed",
  "stripe-backed",
  "\"stripe",
  "stripe\"",
  "stripe "
];

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function inspectOffer(offer, client) {
  const exposed = publicOffer(offer, client);
  const failures = [];
  const lineItems = Array.isArray(exposed.line_items) ? exposed.line_items : [];
  const fulfillment = exposed.fulfillment || {};
  const publicJson = JSON.stringify(exposed).toLowerCase();

  if (exposed.storefront !== true) failures.push("not_storefront");
  if (offer.require_stripe_lookup_key !== true) failures.push("lookup_key_not_required");
  if (!lineItems.length) failures.push("missing_line_items");
  if (lineItems.some((item) => !item.lookup_key)) failures.push("line_item_missing_lookup_key");
  if (!hasText(exposed.activation_path)) failures.push("missing_activation_path");
  if (typeof exposed.owner_approval_required !== "boolean") failures.push("owner_approval_not_boolean");
  if (!hasText(fulfillment.type)) failures.push("missing_fulfillment_type");
  if (!hasText(fulfillment.activation_label)) failures.push("missing_fulfillment_activation_label");
  if (!hasText(fulfillment.customer_next_step)) failures.push("missing_fulfillment_next_step");
  if (!hasText(fulfillment.delivery_surface)) failures.push("missing_fulfillment_delivery_surface");
  if (!hasText(fulfillment.support_email)) failures.push("missing_fulfillment_support_email");
  if (BANNED_PUBLIC_TERMS.some((term) => publicJson.includes(term))) failures.push("provider_language_leak");
  if (exposed.gate_policy?.skyemail_mailbox && fulfillment.type !== "skyemail_mailbox") failures.push("skyemail_mailbox_wrong_fulfillment_type");
  if (exposed.family === "skyevault" && fulfillment.type !== "skyevault_agent") failures.push("skyevault_wrong_fulfillment_type");
  if (exposed.family === "sovereigndocs" && fulfillment.type !== "operator_triage") failures.push("sovereigndocs_wrong_fulfillment_type");

  return {
    offer_id: exposed.id,
    family: exposed.family,
    title: exposed.title,
    owner_approval_required: exposed.owner_approval_required,
    activation_path: exposed.activation_path,
    fulfillment_type: fulfillment.type || null,
    self_serve_after_payment: fulfillment.self_serve_after_payment === true,
    line_item_count: lineItems.length,
    lookup_keys: lineItems.map((item) => item.lookup_key),
    failures
  };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generatedAt = new Date();
  const client = getSkyePayClient("metraiyux-0s");
  const publicOffers = SKYPAY_OFFERS.filter((offer) => offer.storefront !== false);
  const entries = publicOffers.map((offer) => inspectOffer(offer, client));
  const failures = entries.filter((entry) => entry.failures.length > 0);
  const receipt = {
    ok: failures.length === 0,
    generated_at: generatedAt.toISOString(),
    client_slug: client.slug,
    checks: {
      public_offer_count: publicOffers.length,
      total_catalog_offer_count: SKYPAY_OFFERS.length,
      failure_count: failures.length,
      families: countBy(entries, "family"),
      fulfillment_types: countBy(entries, "fulfillment_type"),
      self_serve_after_payment_count: entries.filter((entry) => entry.self_serve_after_payment).length,
      operator_review_count: entries.filter((entry) => entry.owner_approval_required).length
    },
    failures,
    entries
  };
  const stamped = path.join(OUT_DIR, `skyepay-customer-readiness-${timestampSlug(generatedAt)}.json`);
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    public_offer_count: receipt.checks.public_offer_count,
    failure_count: receipt.checks.failure_count,
    fulfillment_types: receipt.checks.fulfillment_types,
    receipt: path.relative(REPO_ROOT, OUT_FILE)
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main();
