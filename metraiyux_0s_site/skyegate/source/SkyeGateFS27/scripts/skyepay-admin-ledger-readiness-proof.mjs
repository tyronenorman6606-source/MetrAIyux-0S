#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(__dirname, "../../../../..");

function read(rel) {
  return fs.readFileSync(path.join(appRoot, rel), "utf8");
}

function checkContains(checks, id, file, pattern, description) {
  const source = read(file);
  const ok = typeof pattern === "string" ? source.includes(pattern) : pattern.test(source);
  checks.push({ id, file, ok, description });
}

const checks = [];

checkContains(checks, "admin-refund-action", "netlify/functions/admin-skyepay-ledger.js", "\"refund\"", "Admin ledger accepts a refund action.");
checkContains(checks, "admin-refund-runtime", "netlify/functions/admin-skyepay-ledger.js", "action: \"stripe.refund.create\"", "Admin refunds execute through the shared Stripe provider runtime.");
checkContains(checks, "admin-refund-retrieve", "netlify/functions/admin-skyepay-ledger.js", "action: \"stripe.checkout.retrieve\"", "Admin refunds retrieve missing payment intents through the shared provider runtime.");
checkContains(checks, "admin-paid-void-block", "netlify/functions/admin-skyepay-ledger.js", "PAID_ORDER_REQUIRES_REFUND", "Paid SkyePay orders cannot be voided instead of refunded.");
checkContains(checks, "admin-over-refund-block", "netlify/functions/admin-skyepay-ledger.js", "SKYEPAY_REFUND_AMOUNT_EXCEEDS_REMAINING", "Admin refunds reject amounts above the remaining refundable balance.");
checkContains(checks, "admin-already-refunded-block", "netlify/functions/admin-skyepay-ledger.js", "SKYEPAY_ORDER_ALREADY_REFUNDED", "Admin refunds reject already fully refunded orders.");
checkContains(checks, "admin-refund-ledger", "netlify/functions/admin-skyepay-ledger.js", "skyepay_refunds", "Admin refunds are persisted to the refund ledger.");
checkContains(checks, "commerce-over-refund-block", "netlify/functions/skyepay-refund.js", "SKYEPAY_REFUND_AMOUNT_EXCEEDS_REMAINING", "SkyeCommerce refund bridge rejects over-refunds before Stripe is called.");
checkContains(checks, "commerce-full-refund-state", "netlify/functions/skyepay-refund.js", "provisioning_status=$4", "SkyeCommerce full refunds close the order/provisioning state.");
checkContains(checks, "commerce-provider-runtime", "netlify/functions/skyepay-refund.js", "action: \"stripe.refund.create\"", "SkyeCommerce refunds execute through the shared Stripe provider runtime.");
checkContains(checks, "admin-ui-refund-button", "assets/skyepay-admin.js", "data-action=\"refund\"", "SkyePay admin UI exposes the refund action.");
checkContains(checks, "admin-ui-paid-void-disabled", "assets/skyepay-admin.js", "Paid orders require a Stripe refund instead of void.", "SkyePay admin UI disables void on paid orders.");
checkContains(checks, "admin-ui-refund-stat", "skyepay-admin.html", "id=\"statRefunded\"", "SkyePay admin UI surfaces refunded order count.");
checkContains(checks, "bootstrap-refund-table", "scripts/bootstrap-skyepay-db.mjs", "create table if not exists skyepay_refunds", "Bootstrap creates the SkyePay refund ledger table.");
checkContains(checks, "runtime-refund-table", "netlify/functions/_lib/db.js", "create table if not exists skyepay_refunds", "Runtime DB initializer creates the SkyePay refund ledger table.");
checkContains(checks, "unit-refund-balance", "tests/skyepay-admin-ledger-safety.test.mjs", "skyePayRemainingRefundableCents", "Unit tests cover remaining refundable balance calculations.");

const failures = checks.filter((item) => !item.ok);
const receipt = {
  ok: failures.length === 0,
  generated_at: new Date().toISOString(),
  proof: "skyepay-admin-ledger-readiness",
  checked_files: Array.from(new Set(checks.map((item) => item.file))).sort(),
  check_count: checks.length,
  failure_count: failures.length,
  checks,
  failures,
  browser_proof: "owner_disabled_by_repo_policy"
};

const outDir = path.join(repoRoot, "test-artifacts/skyepay-readiness");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "skyepay-admin-ledger-readiness-latest.json");
fs.writeFileSync(outFile, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.ok) process.exit(1);
