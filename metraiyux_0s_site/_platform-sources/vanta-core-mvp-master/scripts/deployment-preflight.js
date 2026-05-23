#!/usr/bin/env node
/**
 * VantaCore Deployment Preflight Validation
 * VantaCore by Skyes Over London
 *
 * Run this before deploying to catch missing or misconfigured
 * environment variables early. Exit code 0 = ready to deploy.
 *
 * Usage:
 *   node scripts/deployment-preflight.js
 *   node scripts/deployment-preflight.js --strict   # Fail on warnings too
 *   node scripts/deployment-preflight.js --ci       # CI mode (no TTY colours)
 */

import { readFileSync } from "node:fs";

const isStrict = process.argv.includes("--strict");
const isCI = process.env.CI === "true" || process.argv.includes("--ci");

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

const isTTY = !isCI && process.stdout.isTTY;
const prefix = (color, text) => (isTTY ? `${color}${text}${colors.reset}` : text);
const log = {
  ok: (msg) => console.log(`${prefix(colors.green, "✅")} ${msg}`),
  warn: (msg) => console.warn(`${prefix(colors.yellow, "⚠️")} ${msg}`),
  fail: (msg) => console.error(`${prefix(colors.red, "❌")} ${msg}`),
  info: (msg) => console.log(`${prefix(colors.cyan, "ℹ️")} ${msg}`),
  skip: (msg) => console.log(`${prefix(colors.dim, "➖")} ${msg}`),
  section: (msg) => {
    console.log(`\n${"─".repeat(60)}`);
    console.log(prefix(colors.bright, `  ${msg}`));
    console.log("─".repeat(60));
  },
};

let errors = 0;
let warnings = 0;
let checks = 0;

function check(name, condition, errorMsg, warnMsg = null) {
  checks++;
  if (condition) {
    log.ok(name);
    return true;
  }
  if (warnMsg && !isCI) {
    log.warn(`${name}: ${warnMsg}`);
    warnings++;
    if (isStrict) {
      errors++;
    }
    return false;
  }
  log.fail(`${name}: ${errorMsg}`);
  errors++;
  return false;
}

function section(name) {
  log.section(name);
}

function group(name, fn) {
  console.log(`\n${prefix(colors.cyan, `[ ${name} ]`)}`);
  fn();
}

function env(key) {
  return process.env[key];
}

function has(key) {
  return !!process.env[key] && process.env[key].length > 0;
}

function firstEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function hasAny(...keys) {
  return !!firstEnv(...keys);
}

function isLocalUrl(value) {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
  } catch {
    return false;
  }
}

function appUrlValue() {
  return firstEnv("NEXT_PUBLIC_APP_URL", "VANTACORE_APP_URL") || "";
}

function fs27IntrospectionUrl() {
  return firstEnv(
    "FS27_INTROSPECTION_URL",
    "SKYEGATE_INTROSPECT_URL",
    "SKYGATE_INTROSPECT_URL",
    "METRAIYUX_0S_SKYGATE_FS27_INTROSPECT_ENDPOINT",
    "METRAIYUX_0S_SKYGATE_FS27_INTROSPECT_FUNCTION_ENDPOINT"
  );
}

function storageMode() {
  const mode = (firstEnv("VANTACORE_STORAGE_MODE") || "disabled").toLowerCase();
  return ["auto", "r2", "s3"].includes(mode) ? mode : "disabled";
}

function paymentMode() {
  const mode = (firstEnv("VANTACORE_PAYMENT_MODE", "PAYMENT_PROVIDER") || "").toLowerCase();
  if (mode === "skypay") return "skypay";
  if (mode === "mock" || mode === "local") return "mock";
  return isLocalUrl(appUrlValue()) ? "mock" : "disabled";
}

// ─── Core Environment ────────────────────────────────────────────────────────

section("VantaCore Core Environment");

group("Critical Variables (Build + Runtime)", () => {
  check(
    "NODE_ENV is set",
    has("NODE_ENV"),
    "NODE_ENV is not set — this prevents the app from knowing which mode to run in",
    "NODE_ENV defaults to 'development' but should be explicit"
  );
  check(
    "NODE_ENV is production",
    env("NODE_ENV") === "production",
    `NODE_ENV is '${env("NODE_ENV") || "(not set)"}', should be 'production' for deploy`,
    null
  );
  check(
    "DATABASE_URL is set",
    has("DATABASE_URL"),
    "DATABASE_URL is not set — database connection will fail at runtime [CRITICAL]",
    "DATABASE_URL is required for production"
  );
  if (has("DATABASE_URL")) {
    check(
      "DATABASE_URL is a valid Postgres URL",
      env("DATABASE_URL").startsWith("postgres") || env("DATABASE_URL").startsWith("postgresql"),
      "DATABASE_URL does not look like a Postgres connection string"
    );
  }
  check(
    "NEXT_PUBLIC_APP_URL is set",
    has("NEXT_PUBLIC_APP_URL"),
    "NEXT_PUBLIC_APP_URL is not set — client-side redirects and absolute links will break [CRITICAL]",
    "NEXT_PUBLIC_APP_URL is required for production"
  );
});

// ─── Provider Configurations ──────────────────────────────────────────────────

section("VantaCore Provider Configurations");

group("VantaCore Twilio [RUNTIME]", () => {
  const hasSid = has("TWILIO_ACCOUNT_SID");
  const hasToken = has("TWILIO_AUTH_TOKEN");
  const hasPhone = has("TWILIO_PHONE_NUMBER");
  const anySet = hasSid || hasToken || hasPhone;
  const allSet = hasSid && hasToken && hasPhone;

  if (!anySet) {
    log.skip("Twilio not configured — SMS/voice features disabled");
    return;
  }

  check("TWILIO_ACCOUNT_SID is set", hasSid, "TWILIO_ACCOUNT_SID is required when Twilio is enabled");
  check("TWILIO_AUTH_TOKEN is set", hasToken, "TWILIO_AUTH_TOKEN is required for webhook signature verification");
  check("TWILIO_PHONE_NUMBER is set", hasPhone, "TWILIO_PHONE_NUMBER is required for outbound SMS/voice");
  check("Twilio configuration is complete", allSet, "Twilio is partially configured — all three vars are required (SID, AUTH_TOKEN, PHONE_NUMBER)");
});

group("VantaCore Stripe [BUILD + RUNTIME]", () => {
  const hasPub = has("STRIPE_PUBLISHABLE_KEY");
  const hasSec = has("STRIPE_SECRET_KEY");
  const hasWebhook = has("STRIPE_WEBHOOK_SECRET");
  const anySet = hasPub || hasSec || hasWebhook;
  const hasRequired = hasSec && hasWebhook;

  if (!anySet) {
    log.skip("Stripe not configured — billing features disabled");
    return;
  }

  check("STRIPE_SECRET_KEY is set [RUNTIME]", hasSec, "STRIPE_SECRET_KEY is required for Stripe billing");
  check("STRIPE_WEBHOOK_SECRET is set [RUNTIME]", hasWebhook, "STRIPE_WEBHOOK_SECRET is required for webhook signature verification");
  check("STRIPE_PUBLISHABLE_KEY is set [BUILD]", hasPub, "STRIPE_PUBLISHABLE_KEY is required for client-side Stripe Elements");
  check("Stripe configuration meets minimum requirements", hasRequired, "Stripe is partially configured — STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET are required when any STRIPE var is set");
  if (hasPub && !hasSec) {
    log.warn("STRIPE_PUBLISHABLE_KEY is set but STRIPE_SECRET_KEY is missing — billing API will fail");
  }
});

group("VantaCore Resend [RUNTIME]", () => {
  const hasApi = has("RESEND_API_KEY");
  const anySet = hasApi || has("RESEND_WEBHOOK_SECRET");

  if (!anySet) {
    log.skip("Resend not configured — email features disabled");
    return;
  }

  check("RESEND_API_KEY is set", hasApi, "RESEND_API_KEY is required for email sending");
});

group("VantaCore VANTA13 AI [RUNTIME]", () => {
  const hasOpenAI = hasAny("OPENAI_API_KEY", "SKYGATEFS13_OPENAI_API_KEY");
  const hasAnthropic = has("ANTHROPIC_API_KEY");
  const hasWorker = hasAny("VANTA13_CLASSIFY_URL", "VANTA13_CLOUDFLARE_WORKER_URL");
  const hasAnyProvider = hasOpenAI || hasAnthropic || hasWorker || firstEnv("VANTA13_MODE") === "deterministic";
  check("At least one AI provider or owned VANTA13 worker is set", hasAnyProvider, "No AI provider configured — VANTA13 autonomous operator will be disabled");
  if (hasOpenAI) log.info("OpenAI API key configured for VANTA13");
  if (hasAnthropic) log.info("Anthropic API key configured for VANTA13");
  if (hasWorker) log.info("0S-owned VANTA13 worker configured");
});

group("VantaCore Storage [RUNTIME]", () => {
  if (storageMode() === "disabled") {
    log.skip("Storage disabled by VANTACORE_STORAGE_MODE=disabled — uploads must route through the 0S/FS27 storage adapter before enabling");
    return;
  }

  const hasS3 = has("S3_BUCKET") && has("S3_ACCESS_KEY") && has("S3_SECRET_KEY") && has("S3_REGION");
  const hasR2 =
    hasAny("CLOUDFLARE_R2_ACCOUNT_ID", "R2_ACCOUNT_ID") &&
    hasAny("CLOUDFLARE_R2_ACCESS_KEY", "R2_ACCESS_KEY") &&
    hasAny("CLOUDFLARE_R2_SECRET_KEY", "R2_SECRET_KEY") &&
    hasAny("CLOUDFLARE_R2_BUCKET_NAME", "R2_BUCKET", "R2_BUCKET_NAME");
  const anySet =
    has("S3_BUCKET") ||
    has("S3_ACCESS_KEY") ||
    has("S3_SECRET_KEY") ||
    hasAny("CLOUDFLARE_R2_ACCOUNT_ID", "R2_ACCOUNT_ID") ||
    hasAny("CLOUDFLARE_R2_ACCESS_KEY", "R2_ACCESS_KEY") ||
    hasAny("CLOUDFLARE_R2_SECRET_KEY", "R2_SECRET_KEY");

  if (!anySet) {
    log.skip("Storage not configured — file uploads / quote photos disabled");
    return;
  }

  if (hasS3) log.info("AWS S3 configured for file storage");
  if (hasR2) log.info("Cloudflare R2 configured for file storage");
  check("Storage is fully configured (S3 or R2)", hasS3 || hasR2, "Storage is partially configured — provide full S3 or full R2 config");
  if (hasR2 && !hasAny("CLOUDFLARE_R2_PUBLIC_URL", "R2_PUBLIC_URL")) {
    log.warn("CLOUDFLARE_R2_PUBLIC_URL is missing — generated asset URLs may be invalid");
  }
});

group("VantaCore Google Calendar [RUNTIME]", () => {
  const hasAll = has("GOOGLE_CALENDAR_ID") && has("GOOGLE_CLIENT_EMAIL") && has("GOOGLE_PRIVATE_KEY");
  const anySet = has("GOOGLE_CALENDAR_ID") || has("GOOGLE_CLIENT_EMAIL") || has("GOOGLE_PRIVATE_KEY");

  if (!anySet) {
    log.skip("Google Calendar not configured — booking calendar sync disabled");
    return;
  }

  check("Google Calendar is fully configured", hasAll, "Google Calendar is partially configured — all three vars are required");
});

group("0S / FS27 Ownership Gate [RUNTIME]", () => {
  const gateMode = firstEnv("FS27_GATE_MODE", "VANTACORE_FS27_GATE_MODE") || (env("NODE_ENV") === "production" ? "enforced" : "local-bypass");
  const local = isLocalUrl(appUrlValue());
  check("FS27 introspection URL is configured", !!fs27IntrospectionUrl(), "Missing FS27 introspection endpoint");
  check(
    "FS27 gate mode is safe for this target",
    gateMode === "enforced" || (gateMode === "local-bypass" && local),
    `FS27_GATE_MODE=${gateMode} is unsafe for non-local deployments`
  );
  if (firstEnv("FS27_REQUIRED_SCOPES", "VANTACORE_FS27_REQUIRED_SCOPES")) {
    log.info(`FS27 required scopes: ${firstEnv("FS27_REQUIRED_SCOPES", "VANTACORE_FS27_REQUIRED_SCOPES")}`);
  } else {
    log.info("FS27 required scopes default to gateway.read");
  }
});

group("0S / SkyePay Deposits [RUNTIME]", () => {
  const mode = paymentMode();
  if (mode === "disabled") {
    log.skip("Deposits disabled — safe until a SkyePay deposit offer is configured");
    return;
  }
  if (mode === "mock") {
    check("Mock deposits are local-only", isLocalUrl(appUrlValue()), "Mock deposits cannot be used on a non-local deployment");
    return;
  }
  const hasSkyePayBase = hasAny("SKYPAY_BASE_URL", "SKYPAY_PUBLIC_ORIGIN", "SKYGATEFS27_WORKER_ORIGIN", "SKYGATEFS27_WORKER_URL", "SKYEGATE_FS27_URL");
  check("SkyePay base URL is configured", hasSkyePayBase, "Missing SkyePay/FS27 worker URL");
  check("SkyePay deposit offer is configured", has("VANTACORE_SKYPAY_DEPOSIT_OFFER_ID"), "Missing VANTACORE_SKYPAY_DEPOSIT_OFFER_ID");
});

group("VantaCore Observability [OPTIONAL]", () => {
  if (has("SENTRY_DSN")) log.info("Sentry DSN configured for error tracking");
  else log.skip("SENTRY_DSN not set — error tracking disabled");

  if (hasAny("HEALTH_CHECK_SECRET", "SKYGATEFS13_JOB_WORKER_SECRET", "PHC_SESSION_SECRET")) log.info("Health check secret configured");
  else log.warn("HEALTH_CHECK_SECRET not set — internal health probes are unauthenticated");
});

// ─── Build Safety ─────────────────────────────────────────────────────────────

section("VantaCore Build Safety Checks");

group("next.config.ts", () => {
  try {
    const content = readFileSync("next.config.ts", "utf-8");
    const hasIgnoreBuildErrors = content.includes("ignoreBuildErrors: true");
    const hasIgnoreLintErrors = content.includes("ignoreDuringBuilds: true");

    check(
      "next.config.ts does NOT have ignoreBuildErrors: true",
      !hasIgnoreBuildErrors,
      "next.config.ts has ignoreBuildErrors: true — TypeScript errors will be silently swallowed in production"
    );
    check(
      "next.config.ts does NOT have ignoreDuringBuilds: true",
      !hasIgnoreLintErrors,
      "next.config.ts has ignoreDuringBuilds: true — ESLint errors will be silently swallowed in production"
    );
  } catch {
    log.fail("Could not read next.config.ts for build safety checks");
    errors++;
  }
});

// ─── Webhook Endpoints ────────────────────────────────────────────────────────

section("VantaCore Webhook Endpoints");

const appUrl = env("NEXT_PUBLIC_APP_URL") || "(not set — using placeholder)";
const webhookEndpoints = [
  { name: "Stripe Billing", path: "/api/billing/webhook", provider: "Stripe", scope: "RUNTIME" },
  { name: "Twilio SMS", path: "/api/sms/webhook", provider: "Twilio", scope: "RUNTIME" },
  { name: "Twilio Voice", path: "/api/voice/webhook", provider: "Twilio", scope: "RUNTIME" },
  { name: "Resend Email", path: "/api/email/webhook", provider: "Resend", scope: "RUNTIME" },
];

webhookEndpoints.forEach(({ name, path, scope }) => {
  const url = appUrl.replace(/\/$/, "") + path;
  log.info(`${name} [${scope}]: ${url}`);
});

// ─── Deployment Checklist ─────────────────────────────────────────────────────

section("VantaCore Deployment Checklist");

const checklist = [
  { item: "Database (Neon Postgres) provisioned and reachable from deploy target", condition: has("DATABASE_URL") },
  { item: "Stripe webhook endpoint registered in Stripe Dashboard", condition: has("STRIPE_WEBHOOK_SECRET") },
  { item: "Twilio phone number purchased and webhook URL set in Twilio Console", condition: has("TWILIO_PHONE_NUMBER") },
  { item: "Resend domain verified and sender identity configured", condition: has("RESEND_API_KEY") },
  { item: "Storage bucket (S3 or R2) created and CORS configured for uploads", condition: storageMode() === "disabled" || has("S3_BUCKET") || hasAny("CLOUDFLARE_R2_ACCOUNT_ID", "R2_ACCOUNT_ID") },
  { item: "Google Calendar service account created and calendar shared", condition: has("GOOGLE_CLIENT_EMAIL") },
  { item: "FS27 introspection gate configured", condition: !!fs27IntrospectionUrl() },
  { item: "NEXT_PUBLIC_APP_URL matches production domain (no trailing slash)", condition: has("NEXT_PUBLIC_APP_URL") && !env("NEXT_PUBLIC_APP_URL").endsWith("/") },
  { item: "Environment variables injected into Netlify / Cloudflare dashboard", condition: has("DATABASE_URL") && has("NEXT_PUBLIC_APP_URL") },
  { item: "DNS / custom domain pointed at deploy target", condition: has("NEXT_PUBLIC_APP_URL") && !env("NEXT_PUBLIC_APP_URL").includes("localhost") },
];

checklist.forEach(({ item, condition }) => {
  if (condition) {
    log.ok(`[READY] ${item}`);
  } else {
    log.warn(`[PENDING] ${item}`);
  }
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${"=".repeat(60)}`);
console.log(`${prefix(colors.bright, "  VantaCore Deployment Preflight Summary")}`);
console.log(`${"=".repeat(60)}`);
console.log(`  Checks run:  ${checks}`);
console.log(`  ${prefix(colors.green, `Passed:      ${checks - errors - warnings}`)}`);
if (warnings > 0) console.log(`  ${prefix(colors.yellow, `Warnings:    ${warnings}`)}`);
if (errors > 0) console.log(`  ${prefix(colors.red, `Errors:      ${errors}`)}`);
console.log(`${"=".repeat(60)}`);

if (errors > 0) {
  console.log(`\n${prefix(colors.red, "❌ DEPLOYMENT BLOCKED — fix errors before deploying")}\n`);
  process.exit(1);
}

if (warnings > 0 && isStrict) {
  console.log(`\n${prefix(colors.yellow, "⚠️  STRICT MODE: warnings treated as errors")}\n`);
  process.exit(1);
}

console.log(`\n${prefix(colors.green, "✅ VantaCore is ready to deploy")}\n`);
console.log(`${prefix(colors.cyan, "📋 Next steps:")}`);
console.log("   1. Review the checklist above and resolve any [PENDING] items.");
console.log("   2. Run smoke tests against the staging / preview URL.");
console.log("   3. Verify webhook endpoints are reachable from the public internet.");
console.log("   4. Confirm DNS and SSL certificates are active.\n");

process.exit(0);
