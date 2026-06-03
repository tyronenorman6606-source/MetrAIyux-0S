#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const FS27_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(FS27_ROOT, "../../../..");
const OUT_DIR = path.join(REPO_ROOT, "test-artifacts", "skyepay-readiness");
const OUT_FILE = path.join(OUT_DIR, "skyepay-buyer-fulfillment-truth-latest.json");
const ORIGIN = (process.env.SKYPAY_LIVE_ORIGIN || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev").replace(/\/+$/, "");

const REQUIRED_FULFILLMENT_FIELDS = [
  "type",
  "activation_path",
  "activation_label",
  "delivery_surface",
  "customer_next_step",
  "support_email",
  "support_note"
];

const ALLOWED_TYPES = new Set([
  "paid_access",
  "operator_review",
  "operator_triage",
  "skyemail_mailbox",
  "skyevault_agent"
]);

const SELF_SERVE_TYPES = new Set(["paid_access", "skyevault_agent"]);
const REVIEW_TYPES = new Set(["operator_review", "operator_triage"]);
const SKYEMAIL_MAILBOX_OFFER_IDS = new Set([
  "skyemail-starter-mailbox",
  "skyemail-business-mailbox",
  "skyemail-operator-mailbox"
]);

const BANNED_PUBLIC_TERMS = [
  /provider-backed/i,
  /\bzoho\b/i,
  /\bresend\b/i,
  /\bneon\b/i,
  /backed by cloudflare/i,
  /provider:/i,
  /\bstripe\b/i,
  /proof-demo/i,
  /demo_not_charged/i,
  /\bfake\b/i,
  /placeholder/i,
  /local route/i,
  /must be provider-backed before/i
];

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function bannedHits(value) {
  const text = JSON.stringify(value || {});
  return BANNED_PUBLIC_TERMS
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source.replace(/\\b/g, ""));
}

function includesAny(value, words) {
  const text = String(value || "").toLowerCase();
  return words.some((word) => text.includes(word));
}

function failWhen(condition, failures, code) {
  if (condition) failures.push(code);
}

async function fetchJson(pathname) {
  const response = await fetch(`${ORIGIN}${pathname}`, {
    headers: { "user-agent": "skyepay-buyer-fulfillment-truth-proof/1.0" }
  });
  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text || "{}");
  } catch {
    data = null;
  }
  return { response, text, data };
}

function inspectOffer(offer) {
  const failures = [];
  const fulfillment = offer.fulfillment || {};
  const type = fulfillment.type || "";
  const skyemailMailboxPolicy = offer.gate_policy?.skyemail_mailbox && typeof offer.gate_policy.skyemail_mailbox === "object"
    ? offer.gate_policy.skyemail_mailbox
    : null;
  const isPrimarySkyeMailMailboxOffer = SKYEMAIL_MAILBOX_OFFER_IDS.has(offer.id);
  const isSkyeMailMailboxOffer = isPrimarySkyeMailMailboxOffer || Boolean(skyemailMailboxPolicy);
  const isAutoSkyeMailMailbox = isSkyeMailMailboxOffer
    && skyemailMailboxPolicy?.enabled_after_skyepay !== false
    && offer.activation_path === "skyepay_confirmed_skyemail_mailbox_auto_provision"
    && offer.owner_approval_required === false;
  const expectedSelfServe = type === "skyemail_mailbox"
    ? isAutoSkyeMailMailbox
    : SELF_SERVE_TYPES.has(type);
  const lineItems = Array.isArray(offer.line_items) ? offer.line_items : [];
  const hits = bannedHits(offer);

  failWhen(offer.storefront !== true, failures, "not_public_storefront");
  failWhen(typeof offer.owner_approval_required !== "boolean", failures, "owner_approval_required_not_boolean");
  failWhen(!hasText(offer.activation_path), failures, "missing_top_level_activation_path");
  failWhen(lineItems.length === 0, failures, "missing_line_items");
  failWhen(lineItems.some((item) => !hasText(item.lookup_key)), failures, "line_item_missing_lookup_key");
  failWhen(hits.length > 0, failures, `banned_public_terms:${hits.join(",")}`);

  for (const field of REQUIRED_FULFILLMENT_FIELDS) {
    failWhen(!hasText(fulfillment[field]), failures, `missing_fulfillment_${field}`);
  }

  failWhen(!ALLOWED_TYPES.has(type), failures, "unknown_fulfillment_type");
  failWhen(
    fulfillment.activation_path !== offer.activation_path,
    failures,
    "fulfillment_activation_path_mismatch"
  );
  failWhen(
    fulfillment.owner_review_required !== (offer.owner_approval_required === true),
    failures,
    "owner_review_flag_mismatch"
  );
  failWhen(
    fulfillment.self_serve_after_payment !== expectedSelfServe,
    failures,
    "self_serve_flag_mismatch"
  );

  if (REVIEW_TYPES.has(type)) {
    failWhen(offer.owner_approval_required !== true, failures, "review_offer_not_owner_approved");
    failWhen(fulfillment.self_serve_after_payment !== false, failures, "review_offer_self_serve_true");
    failWhen(!includesAny(fulfillment.activation_label, ["review", "triage", "activate"]), failures, "review_activation_label_unclear");
    failWhen(!includesAny(fulfillment.customer_next_step, ["status", "review", "activate", "triage", "operator"]), failures, "review_next_step_unclear");
  }

  if (SELF_SERVE_TYPES.has(type)) {
    failWhen(offer.owner_approval_required !== false, failures, "self_serve_offer_owner_approval_true");
    failWhen(fulfillment.self_serve_after_payment !== true, failures, "self_serve_offer_not_self_serve");
    failWhen(!includesAny(fulfillment.customer_next_step, ["status", "unlock", "claim", "install", "mailbox", "access"]), failures, "self_serve_next_step_unclear");
  }

  if (isSkyeMailMailboxOffer) {
    failWhen(type !== "skyemail_mailbox", failures, "skyemail_wrong_fulfillment_type");
    failWhen(
      !["skyepay_confirmed_skyemail_mailbox_auto_provision", "paid_pending_capacity_approval"].includes(offer.activation_path),
      failures,
      "skyemail_wrong_activation_path"
    );
    if (isPrimarySkyeMailMailboxOffer) {
      failWhen(offer.activation_path !== "paid_pending_capacity_approval", failures, "skyemail_primary_not_capacity_gated");
      failWhen(offer.owner_approval_required !== true, failures, "skyemail_primary_not_owner_reviewed");
      failWhen(fulfillment.self_serve_after_payment !== false, failures, "skyemail_primary_marked_self_serve");
      failWhen(!includesAny(`${fulfillment.activation_label} ${fulfillment.customer_next_step} ${fulfillment.delivery_surface}`, ["capacity", "approval", "operator", "activation"]), failures, "skyemail_primary_capacity_copy_unclear");
    } else if (isAutoSkyeMailMailbox) {
      failWhen(fulfillment.self_serve_after_payment !== true, failures, "skyemail_auto_not_self_serve_after_payment");
      failWhen(offer.owner_approval_required !== false, failures, "skyemail_auto_owner_approval_required");
    } else {
      failWhen(offer.activation_path !== "paid_pending_capacity_approval", failures, "skyemail_capacity_missing_activation_path");
      failWhen(offer.owner_approval_required !== true, failures, "skyemail_capacity_not_owner_reviewed");
      failWhen(fulfillment.self_serve_after_payment !== false, failures, "skyemail_capacity_marked_self_serve");
      failWhen(!includesAny(`${fulfillment.activation_label} ${fulfillment.customer_next_step} ${fulfillment.delivery_surface}`, ["capacity", "approval", "operator", "activation"]), failures, "skyemail_capacity_copy_unclear");
    }
    failWhen(!includesAny(`${offer.title} ${offer.description} ${fulfillment.customer_next_step}`, ["skyemail", "mailbox", "inbox"]), failures, "skyemail_copy_not_mailbox_specific");
  }

  if (offer.family === "skyemail" && !isSkyeMailMailboxOffer) {
    failWhen(type === "skyemail_mailbox", failures, "skyemail_addon_wrongly_marked_mailbox");
    failWhen(!includesAny(`${fulfillment.activation_label} ${fulfillment.customer_next_step}`, ["status", "review", "activate", "unlock", "capacity", "plan"]), failures, "skyemail_addon_next_step_unclear");
  }

  if (type === "skyevault_agent") {
    failWhen(offer.family !== "skyevault", failures, "skyevault_wrong_family");
    failWhen(!includesAny(`${fulfillment.delivery_surface} ${fulfillment.customer_next_step}`, ["install", "unlock", "download", "agent", "status"]), failures, "skyevault_delivery_unclear");
  }

  return {
    offer_id: offer.id || null,
    family: offer.family || null,
    title: offer.title || null,
    fulfillment_type: type || null,
    activation_path: offer.activation_path || null,
    owner_approval_required: offer.owner_approval_required,
    self_serve_after_payment: fulfillment.self_serve_after_payment === true,
    line_item_count: lineItems.length,
    lookup_keys: lineItems.map((item) => item.lookup_key).filter(Boolean),
    failures
  };
}

function countBy(entries, key) {
  return entries.reduce((acc, entry) => {
    const value = entry[key] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generatedAt = new Date();
  const result = await fetchJson("/skyepay/offers?client=metraiyux-0s");
  const offers = Array.isArray(result.data?.offers) ? result.data.offers : [];
  const entries = offers.map(inspectOffer);
  const failures = entries.filter((entry) => entry.failures.length > 0);
  const receipt = {
    ok: result.response.ok && result.data?.ok === true && failures.length === 0,
    generated_at: generatedAt.toISOString(),
    origin: ORIGIN,
    proof: "skyepay-buyer-fulfillment-truth",
    route_status: result.response.status,
    skypay_live: result.data?.skypay_live ?? null,
    offer_count: offers.length,
    checks: {
      failure_count: failures.length,
      families: countBy(entries, "family"),
      fulfillment_types: countBy(entries, "fulfillment_type"),
      owner_approval_required: entries.filter((entry) => entry.owner_approval_required === true).length,
      self_serve_after_payment: entries.filter((entry) => entry.self_serve_after_payment === true).length,
      skyemail_mailboxes: entries.filter((entry) => entry.fulfillment_type === "skyemail_mailbox").length
    },
    failures,
    entries
  };
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, `skyepay-buyer-fulfillment-truth-${timestampSlug(generatedAt)}.json`), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    origin: receipt.origin,
    offer_count: receipt.offer_count,
    failure_count: failures.length,
    fulfillment_types: receipt.checks.fulfillment_types,
    receipt: path.relative(REPO_ROOT, OUT_FILE)
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
