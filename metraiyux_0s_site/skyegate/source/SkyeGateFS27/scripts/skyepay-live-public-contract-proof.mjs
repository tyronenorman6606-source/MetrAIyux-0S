#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const FS27_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(FS27_ROOT, "../../../..");
const OUT_DIR = path.join(REPO_ROOT, "test-artifacts", "skyepay-live-nonbrowser");
const OUT_FILE = path.join(OUT_DIR, "skyepay-live-public-contract-latest.json");
const ORIGIN = (process.env.SKYPAY_LIVE_ORIGIN || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev").replace(/\/+$/, "");

const CUSTOMER_SURFACES = [
  "/skyepay.html?client=metraiyux-0s",
  "/skyepay-store.html?client=metraiyux-0s",
  "/skyepay-api.html",
  "/skyepay-api.json",
  "/openapi/skyepay.openapi.json",
  "/assets/skyepay.js",
  "/assets/skyepay-store.js"
];

const BANNED_PUBLIC_TERMS = [
  "provider-backed",
  "zoho",
  "resend",
  "neon database",
  "backed by neon",
  "backed by cloudflare",
  "provider:",
  "stripe",
  "grayscape467",
  "owner_qa_unlimited",
  "owner qa merit"
];

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim().replace(/^export\s+/, "");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value) out[key] = value;
  }
  return out;
}

function ownerProofToken() {
  return process.env.FREE99_ADMIN_CODE || parseEnvFile(path.join(REPO_ROOT, ".env")).FREE99_ADMIN_CODE || "";
}

async function fetchText(pathname, options = {}) {
  const response = await fetch(`${ORIGIN}${pathname}`, {
    ...options,
    headers: {
      "user-agent": "skyepay-live-public-contract-proof/1.0",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  return { response, text };
}

async function fetchJson(pathname, options = {}) {
  const result = await fetchText(pathname, options);
  let data = null;
  try {
    data = JSON.parse(result.text || "{}");
  } catch {
    data = null;
  }
  return { ...result, data };
}

function bannedHits(value) {
  const text = String(value || "").toLowerCase();
  return BANNED_PUBLIC_TERMS.filter((term) => text.includes(term));
}

function check(ok, id, details = {}) {
  return { id, ok: Boolean(ok), ...details };
}

function mailboxProofs(offers) {
  const ids = ["skyemail-starter-mailbox", "skyemail-business-mailbox", "skyemail-operator-mailbox"];
  return ids.map((id) => {
    const offer = offers.find((item) => item.id === id);
    const text = JSON.stringify(offer || {});
    const mailboxPolicy = offer?.gate_policy?.skyemail_mailbox || {};
    const nextStep = String(offer?.fulfillment?.customer_next_step || "").toLowerCase();
    const deliverySurface = String(offer?.fulfillment?.delivery_surface || "").toLowerCase();
    return check(
      offer &&
        offer.fulfillment?.type === "skyemail_mailbox" &&
        offer.owner_approval_required === true &&
        offer.activation_path === "paid_pending_capacity_approval" &&
        offer.fulfillment?.owner_review_required === true &&
        offer.fulfillment?.self_serve_after_payment === false &&
        deliverySurface.includes("capacity approval") &&
        nextStep.includes("mailbox") &&
        nextStep.includes("capacity") &&
        mailboxPolicy.capacity_verification_required === true &&
        mailboxPolicy.enabled_after_skyepay === false &&
        mailboxPolicy.sellable_inventory_required === "skyemail_routable_active_provisioned" &&
        Array.isArray(offer.line_items) &&
        offer.line_items.length > 0 &&
        offer.line_items.every((item) => item.lookup_key) &&
        bannedHits(text).length === 0,
      `mailbox-capacity-offer-${id}`,
      {
        title: offer?.title || null,
        fulfillment_type: offer?.fulfillment?.type || null,
        activation_path: offer?.activation_path || null,
        owner_approval_required: offer?.owner_approval_required ?? null,
        owner_review_required: offer?.fulfillment?.owner_review_required ?? null,
        self_serve_after_payment: offer?.fulfillment?.self_serve_after_payment ?? null,
        delivery_surface: offer?.fulfillment?.delivery_surface || null,
        customer_next_step: offer?.fulfillment?.customer_next_step || null,
        capacity_verification_required: mailboxPolicy.capacity_verification_required ?? null,
        enabled_after_skyepay: mailboxPolicy.enabled_after_skyepay ?? null,
        sellable_inventory_required: mailboxPolicy.sellable_inventory_required || null,
        line_item_count: offer?.line_items?.length || 0,
        banned_hits: bannedHits(text)
      }
    );
  });
}

function skyeMeritProofs(catalog = {}) {
  const rules = Array.isArray(catalog.rules) ? catalog.rules : [];
  const packs = Array.isArray(catalog.packs) ? catalog.packs : [];
  const text = JSON.stringify(catalog || {});
  return [
    check(bannedHits(text).length === 0, "skyemerit-no-owner-qa-public-code", { banned_hits: bannedHits(text) }),
    check(rules.every((rule) => rule.allow_free_checkout !== true), "skyemerit-no-public-free-checkout-rules", {
      free_checkout_rule_count: rules.filter((rule) => rule.allow_free_checkout === true).length
    }),
    check(packs.every((pack) => pack.audience !== "owner_qa_unlimited"), "skyemerit-no-owner-qa-public-pack", {
      owner_qa_pack_count: packs.filter((pack) => pack.audience === "owner_qa_unlimited").length
    }),
    check(catalog.stack_policy?.owner_free_checkout_codes_public === false, "skyemerit-owner-free-codes-not-public", {
      owner_free_checkout_codes_public: catalog.stack_policy?.owner_free_checkout_codes_public ?? null
    })
  ];
}

function proofPayload({ idempotency = "public-contract-proof" } = {}) {
  const local = `proof-${Date.now().toString(36)}`;
  return {
    client_slug: "metraiyux-0s-skm",
    offer_id: "skyemail-starter-mailbox",
    customer_name: "SkyePay Contract Proof",
    customer_email: "skyepay-contract-proof@example.com",
    company_name: "SkyePay Contract Proof",
    mailbox_local_part: local,
    mailbox_domain: "solenterprises.org",
    mailbox_email: `${local}@solenterprises.org`,
    dry_run: true,
    idempotency_key: `${idempotency}-${local}`
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generatedAt = new Date();
  const checks = [];

  for (const surface of CUSTOMER_SURFACES) {
    const { response, text } = await fetchText(surface);
    checks.push(check(response.ok, `surface-${surface}`, { status: response.status }));
    checks.push(check(bannedHits(text).length === 0, `surface-copy-${surface}`, { banned_hits: bannedHits(text) }));
  }

  const offersResult = await fetchJson("/skyepay/offers?client=metraiyux-0s");
  const offersJson = offersResult.data || {};
  const offersText = JSON.stringify(offersJson);
  const offers = Array.isArray(offersJson.offers) ? offersJson.offers : [];
  checks.push(check(offersResult.response.ok && offersJson.ok === true, "offers-route-ok", { status: offersResult.response.status }));
  checks.push(check(offersJson.skypay_live === true, "offers-skypay-live", { skypay_live: offersJson.skypay_live ?? null }));
  checks.push(check(!("stripe_backed" in offersJson) && !("repo_stripe_catalog" in offersJson), "offers-no-provider-contract-fields"));
  checks.push(check((offersJson.catalog_integrity?.imported_checkout_offers || 0) >= 50, "offers-catalog-integrity", {
    imported_checkout_offers: offersJson.catalog_integrity?.imported_checkout_offers || 0,
    source: offersJson.catalog_integrity?.source || null
  }));
  checks.push(check(offers.length >= 100, "offers-count", { offer_count: offers.length }));
  checks.push(check(bannedHits(offersText).length === 0, "offers-public-provider-language", { banned_hits: bannedHits(offersText) }));
  checks.push(...mailboxProofs(offers));
  checks.push(...skyeMeritProofs(offersJson.skyemerit || {}));

  const publicDryRun = await fetchJson("/skyepay/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(proofPayload({ idempotency: "public-block" }))
  });
  checks.push(check(publicDryRun.response.status === 403, "public-dry-run-blocked", {
    status: publicDryRun.response.status,
    code: publicDryRun.data?.code || null
  }));

  const token = ownerProofToken();
  let ownerDryRun = null;
  if (token) {
    ownerDryRun = await fetchJson("/skyepay/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-skypay-proof-mode": "1",
        "x-free99-admin-code": token
      },
      body: JSON.stringify(proofPayload({ idempotency: "owner-proof" }))
    });
    checks.push(check(ownerDryRun.response.ok && ownerDryRun.data?.ok === true && ownerDryRun.data?.dry_run === true, "owner-proof-dry-run", {
      status: ownerDryRun.response.status,
      dry_run: ownerDryRun.data?.dry_run ?? null,
      offer_id: ownerDryRun.data?.offer?.id || null,
      payment_status: ownerDryRun.data?.payment_status || null
    }));

    const statusUrl = new URL("/skyepay/status", ORIGIN);
    statusUrl.searchParams.set("demo_session", ownerDryRun.data?.id || "");
    statusUrl.searchParams.set("offer", "skyemail-starter-mailbox");
    const statusResult = await fetchJson(`${statusUrl.pathname}${statusUrl.search}`);
    checks.push(check(statusResult.response.ok && statusResult.data?.dry_run === true && statusResult.data?.order?.payment_status === "demo_not_charged", "owner-proof-status", {
      status: statusResult.response.status,
      payment_status: statusResult.data?.order?.payment_status || null,
      provisioning_status: statusResult.data?.order?.provisioning_status || null,
      activation_path: statusResult.data?.order?.offer?.activation_path || null
    }));
  } else {
    checks.push(check(false, "owner-proof-token-present", { missing: "FREE99_ADMIN_CODE" }));
  }

  const failures = checks.filter((entry) => !entry.ok);
  const receipt = {
    ok: failures.length === 0,
    generated_at: generatedAt.toISOString(),
    origin: ORIGIN,
    proof: "skyepay-live-public-contract",
    checked_surface_count: CUSTOMER_SURFACES.length,
    offer_count: offers.length,
    owner_proof_executed: Boolean(token),
    checks,
    failures
  };
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, `skyepay-live-public-contract-${timestampSlug(generatedAt)}.json`), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    origin: receipt.origin,
    offer_count: receipt.offer_count,
    checked_surface_count: receipt.checked_surface_count,
    failure_count: failures.length,
    receipt: path.relative(REPO_ROOT, OUT_FILE)
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
