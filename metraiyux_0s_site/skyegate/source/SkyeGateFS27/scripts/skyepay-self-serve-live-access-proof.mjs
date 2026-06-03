#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./_local-env.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const FS27_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(FS27_ROOT, "../../../..");
const OUT_DIR = path.join(REPO_ROOT, "test-artifacts", "skyepay-live-nonbrowser");
const OUT_FILE = path.join(OUT_DIR, "skyepay-self-serve-live-access-latest.json");

loadLocalEnv({ root: FS27_ROOT, repoRoot: REPO_ROOT });

const ORIGIN = (process.env.SKYPAY_LIVE_ORIGIN || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev").replace(/\/+$/, "");
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET || "";
const STRIPE_API_BASE = (process.env.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/+$/, "");
const FETCH_TIMEOUT_MS = Number(process.env.SKYPAY_PROOF_FETCH_TIMEOUT_MS || 30000);
const STRIPE_TIMEOUT_MS = Number(process.env.SKYPAY_PROOF_STRIPE_TIMEOUT_MS || 45000);
const ONLY = process.argv
  .filter((arg) => arg.startsWith("--offer="))
  .flatMap((arg) => arg.slice("--offer=".length).split(","))
  .map((value) => value.trim())
  .filter(Boolean);

if (!STRIPE_SECRET) {
  console.error("Missing STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_LIVE for live SkyePay self-serve access proof.");
  process.exit(1);
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function clean(value, max = 500) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function redactSession(value = "") {
  return String(value || "").replace(/cs_(live|test)_[A-Za-z0-9_]+/g, "cs_$1_[redacted]");
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Timed out after ${FETCH_TIMEOUT_MS}ms fetching ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 2000) };
  }
  return { response, data };
}

async function stripeRequest(method, endpoint, body = null) {
  const headers = {
    authorization: `Bearer ${STRIPE_SECRET}`,
    accept: "application/json"
  };
  const options = { method, headers };
  if (body) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    options.body = body;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STRIPE_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${STRIPE_API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Timed out after ${STRIPE_TIMEOUT_MS}ms calling Stripe ${method} ${endpoint}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || data?.message || `Stripe ${method} ${endpoint} failed`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function stripeLineItems(sessionId) {
  const params = new URLSearchParams({ limit: "100" });
  params.append("expand[]", "data.price.product");
  const data = await stripeRequest("GET", `/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?${params.toString()}`);
  return Array.isArray(data.data) ? data.data : [];
}

async function expireSession(sessionId) {
  try {
    return await stripeRequest("POST", `/v1/checkout/sessions/${encodeURIComponent(sessionId)}/expire`, new URLSearchParams());
  } catch (error) {
    return {
      ok: false,
      error: clean(error.message),
      status: error.status || null
    };
  }
}

function expectedLookupKeys(offer) {
  return (Array.isArray(offer.line_items) ? offer.line_items : [])
    .filter((item) => Number(item.amount_cents || 0) > 0)
    .map((item) => item.lookup_key)
    .filter(Boolean)
    .sort();
}

function observedLookupKeys(lineItems) {
  return lineItems
    .map((item) => item.price?.lookup_key || "")
    .filter(Boolean)
    .sort();
}

function proofBody(offer, index) {
  const suffix = `${Date.now().toString(36)}-${index}`;
  const local = `proof-${offer.id}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 42);
  const body = {
    client_slug: "metraiyux-0s",
    offer_id: offer.id,
    customer_name: "SkyePay Self-Serve Access Proof",
    customer_email: `skyepay-selfserve+${suffix}@example.com`,
    company_name: "SkyePay Self-Serve Access Proof",
    idempotency_key: `selfserve-access-${offer.id}-${suffix}`.slice(0, 220),
    skyemerit_apply: false,
    skyemerit_first_time: false,
    legal_acceptance: {
      legal_terms_accepted: true,
      arbitration_accepted: true,
      payments_policy_accepted: true,
      no_outcome_guarantee_accepted: true,
      truthful_review_boundary_acknowledged: true,
      privacy_policy_accepted: true,
      accepted_at: new Date().toISOString(),
      acceptance_surface: "skyepay-self-serve-live-access-proof",
      source_url: `${ORIGIN}/skyepay.html?offer=${encodeURIComponent(offer.id)}`
    }
  };
  if (offer.fulfillment?.type === "skyemail_mailbox" || offer.family === "skyemail") {
    body.client_slug = "metraiyux-0s-skm";
    body.mailbox_local_part = `${local}-${suffix}`.replace(/[^a-z0-9-]+/g, "-").slice(0, 55);
    body.mailbox_domain = "solenterprises.org";
    body.mailbox_email = `${body.mailbox_local_part}@${body.mailbox_domain}`;
  }
  return body;
}

function entryOk(entry) {
  return entry.checkout_ok &&
    entry.status_ok &&
    entry.stripe_session_ok &&
    entry.lookup_keys_ok &&
    entry.fulfillment_ok &&
    entry.activation_path_ok &&
    entry.not_paid_before_payment &&
    entry.expired_ok;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generatedAt = new Date();
  const offersUrl = `${ORIGIN}/skyepay/offers?client=metraiyux-0s`;
  const offersResult = await fetchJson(offersUrl);
  const offers = Array.isArray(offersResult.data?.offers) ? offersResult.data.offers : [];
  const selfServe = offers
    .filter((offer) => offer.fulfillment?.self_serve_after_payment === true && offer.owner_approval_required === false)
    .filter((offer) => !ONLY.length || ONLY.includes(offer.id));
  const entries = [];

  for (const [index, offer] of selfServe.entries()) {
    const expected = expectedLookupKeys(offer);
    const checkout = await fetchJson(`${ORIGIN}/skyepay/checkout`, {
      method: "POST",
      body: JSON.stringify(proofBody(offer, index))
    });
    const checkoutBody = checkout.data || {};
    const sessionId = checkoutBody.id || "";
    let lineItems = [];
    let expired = null;
    let stripeError = null;
    if (sessionId.startsWith("cs_")) {
      try {
        lineItems = await stripeLineItems(sessionId);
      } catch (error) {
        stripeError = clean(error.message);
      }
      expired = await expireSession(sessionId);
    }
    const statusUrl = new URL("/skyepay/status", ORIGIN);
    statusUrl.searchParams.set("session_id", sessionId);
    statusUrl.searchParams.set("offer", offer.id);
    const status = await fetchJson(statusUrl.toString());
    const observed = observedLookupKeys(lineItems);
    const order = status.data?.order || {};
    const fulfillment = checkoutBody.fulfillment || {};
    const entry = {
      offer_id: offer.id,
      family: offer.family,
      fulfillment_type: offer.fulfillment?.type || null,
      expected_activation_path: offer.activation_path || null,
      expected_lookup_keys: expected,
      checkout_status: checkout.response.status,
      checkout_ok: checkout.response.ok && checkoutBody.ok === true,
      checkout_url_host: checkoutBody.url ? new URL(checkoutBody.url).host : null,
      stripe_session_ok: /^cs_live_/.test(sessionId) && /^https:\/\/checkout\.stripe\.com\//.test(checkoutBody.url || ""),
      session_id_redacted: redactSession(sessionId),
      stripe_line_item_count: lineItems.length,
      observed_lookup_keys: observed,
      lookup_keys_ok: expected.length > 0 && expected.every((key) => observed.includes(key)),
      fulfillment_ok: fulfillment.type === offer.fulfillment?.type && fulfillment.self_serve_after_payment === true,
      activation_path_ok: checkoutBody.activation_path === offer.activation_path,
      status_code: status.response.status,
      status_ok: status.response.ok && status.data?.ok === true,
      order_payment_status: order.payment_status || null,
      order_provisioning_status: order.provisioning_status || null,
      not_paid_before_payment: !["paid", "complete", "succeeded"].includes(String(order.payment_status || checkoutBody.payment_status || "").toLowerCase()),
      mailbox_claimed_before_payment: Boolean(order.public_mailbox?.mailbox_email || status.data?.public_mailbox?.mailbox_email || checkoutBody.public_mailbox?.mailbox_email),
      expired_status: expired?.status || null,
      expired_ok: expired?.status === "expired" || expired?.status === 400 || expired?.error === "This Checkout Session has already expired.",
      stripe_error: stripeError,
      checkout_error: checkoutBody.error || null,
      status_error: status.data?.error || null
    };
    entry.ok = entryOk(entry);
    entries.push(entry);
  }

  const failures = entries.filter((entry) => !entry.ok);
  const receipt = {
    ok: offersResult.response.ok && failures.length === 0 && selfServe.length > 0,
    generated_at: generatedAt.toISOString(),
    origin: ORIGIN,
    proof: "skyepay-self-serve-live-access",
    offer_filter: ONLY,
    live_offer_count: offers.length,
    self_serve_offer_count: selfServe.length,
    checked_offer_count: entries.length,
    failure_count: failures.length,
    failures,
    entries
  };
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, `skyepay-self-serve-live-access-${timestampSlug(generatedAt)}.json`), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    live_offer_count: receipt.live_offer_count,
    checked_offer_count: receipt.checked_offer_count,
    failure_count: receipt.failure_count,
    receipt: path.relative(REPO_ROOT, OUT_FILE)
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
