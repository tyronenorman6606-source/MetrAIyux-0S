#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SKYPAY_OFFERS } from "../netlify/functions/_lib/skyepayCatalog.js";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const FS27_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(FS27_ROOT, "../../../..");
const OUT_DIR = path.join(REPO_ROOT, "test-artifacts", "skyepay-readiness");
const OUT_FILE = path.join(OUT_DIR, "skyepay-public-buy-link-proof-latest.json");
const STRIPE_PARITY_RECEIPT = path.join(REPO_ROOT, "test-artifacts", "stripe-sync", "skyepay-full-catalog-parity-latest.json");

const SCAN_ROOTS = [
  "marketing/metraiyux-0s",
  "metraiyux_0s_site/sales",
  "metraiyux_0s_site/live/SkyeMail",
  "metraiyux_0s_site/saas",
  "metraiyux_0s_site/pricing"
];

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "proof-ecology",
  "test-artifacts"
]);

const TEXT_EXTENSIONS = new Set([".html", ".md", ".json", ".js", ".mjs"]);

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function relative(file) {
  return path.relative(REPO_ROOT, file);
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

function readStripeParity() {
  if (!fs.existsSync(STRIPE_PARITY_RECEIPT)) {
    return { ok: false, entries: [], missing: true };
  }
  try {
    return JSON.parse(fs.readFileSync(STRIPE_PARITY_RECEIPT, "utf8"));
  } catch (error) {
    return { ok: false, entries: [], error: error.message };
  }
}

function extractSkyePayLinks(file) {
  const text = fs.readFileSync(file, "utf8");
  const links = [];
  const patterns = [
    /https:\/\/skyegatefs27-citadeldb\.graylondonskyes\.workers\.dev\/skyepay\.html\?[^"'<>\\\s)]+/gi,
    /(?:^|["'(\\s])(?:\.\.\/|\.\/|\/)?(?:saas\/)?skyepay\.html\?[^"'<>\\\s)]+/gi
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) {
      const raw = match[0].replace(/^[\s"'(]+/, "").replace(/&amp;/g, "&");
      const query = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
      const params = new URLSearchParams(query);
      const offer = params.get("offer") || params.get("offer_id") || params.get("plan") || "";
      if (!offer) continue;
      links.push({
        file: relative(file),
        raw,
        client: params.get("client") || params.get("client_slug") || "",
        offer
      });
    }
  }
  return links;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function inspectOfferLink(link, offerById, stripeByLookupKey) {
  const failures = [];
  const offer = offerById.get(link.offer);
  if (!link.client) failures.push("missing_client_param");
  if (!offer) {
    failures.push("missing_skypay_offer");
    return { ...link, exists: false, failures };
  }

  const lineItems = Array.isArray(offer.line_items) ? offer.line_items : [];
  if (offer.storefront === false) failures.push("offer_not_storefront");
  if (offer.require_stripe_lookup_key !== true) failures.push("offer_lookup_key_not_required");
  if (!lineItems.length) failures.push("offer_missing_line_items");

  const stripe = [];
  for (const item of lineItems) {
    if (!item.lookup_key) {
      failures.push("line_item_missing_lookup_key");
      stripe.push({ lookup_key: "", status: "missing_lookup_key" });
      continue;
    }
    const stripeEntry = stripeByLookupKey.get(item.lookup_key);
    const status = stripeEntry?.status || "missing";
    stripe.push({ lookup_key: item.lookup_key, status });
    if (status !== "ok") failures.push(`stripe_parity_not_ok:${item.lookup_key}:${status}`);
  }

  return {
    ...link,
    exists: true,
    title: offer.title || "",
    family: offer.family || "",
    activation_path: offer.activation_path || "",
    owner_approval_required: offer.owner_approval_required === true,
    line_item_count: lineItems.length,
    stripe,
    failures
  };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generatedAt = new Date();
  const files = SCAN_ROOTS.flatMap((root) => walk(path.join(REPO_ROOT, root)));
  const links = files.flatMap(extractSkyePayLinks);
  const uniqueLinks = uniqueBy(links, (link) => `${link.file}::${link.raw}`);
  const uniqueOffers = uniqueBy(links.map((link) => ({ offer: link.offer })), (entry) => entry.offer)
    .map((entry) => entry.offer)
    .sort();
  const offerById = new Map(SKYPAY_OFFERS.map((offer) => [offer.id, offer]));
  const stripeParity = readStripeParity();
  const stripeByLookupKey = new Map((Array.isArray(stripeParity.entries) ? stripeParity.entries : [])
    .map((entry) => [entry.lookup_key, entry]));
  const entries = uniqueLinks.map((link) => inspectOfferLink(link, offerById, stripeByLookupKey));
  const failures = entries.filter((entry) => entry.failures.length > 0);
  if (stripeParity.ok !== true) {
    failures.push({
      file: relative(STRIPE_PARITY_RECEIPT),
      raw: "",
      client: "",
      offer: "",
      exists: false,
      failures: ["stripe_parity_receipt_not_ok"]
    });
  }

  const receipt = {
    ok: failures.length === 0,
    generated_at: generatedAt.toISOString(),
    proof: "skyepay-public-buy-link-proof",
    sources: {
      scan_roots: SCAN_ROOTS,
      skypay_catalog: "metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js",
      stripe_parity_receipt: relative(STRIPE_PARITY_RECEIPT)
    },
    counts: {
      files_scanned: files.length,
      buy_links_checked: uniqueLinks.length,
      unique_offer_links: uniqueOffers.length,
      skypay_catalog_offers: SKYPAY_OFFERS.length,
      stripe_parity_ok: stripeParity.ok === true,
      failure_count: failures.length
    },
    unique_offers: uniqueOffers,
    failures,
    entries
  };

  const stamped = path.join(OUT_DIR, `skyepay-public-buy-link-proof-${timestampSlug(generatedAt)}.json`);
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    files_scanned: receipt.counts.files_scanned,
    buy_links_checked: receipt.counts.buy_links_checked,
    unique_offer_links: receipt.counts.unique_offer_links,
    failure_count: receipt.counts.failure_count,
    receipt: relative(OUT_FILE)
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main();
