/**
 * Enhanced Environment Validation
 * Section 20 compliance: Missing env vars must fail loudly, not silently.
 *
 * This module provides fail-loud validation for all required environment variables.
 * In production, missing CRITICAL required vars will crash the app immediately.
 *
 * Scopes:
 *   BUILD  = Required during `next build` / CI compile step.
 *   RUNTIME= Required when the serverless function / edge worker boots.
 *   OPTIONAL = Feature is disabled if omitted.
 */

import { z } from "zod";
import {
  currentAppUrl,
  firstEnv,
  fs27GateMode,
  fs27IntrospectionUrl,
  healthSecret,
  isLocalRuntime,
  messagingMode,
  paymentMode,
  skyPayBaseUrl,
  storageMode,
  vanta13Endpoint,
  webhookMode,
} from "@/lib/runtime-env";

// ─── Schemas ────────────────────────────────────────────────────────────────

const emptyStringToUndefined = (value: unknown) => value === "" ? undefined : value;

const criticalRuntimeSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required for database connectivity"),
  NEXT_PUBLIC_APP_URL: z.string().min(1, "NEXT_PUBLIC_APP_URL is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const fullSchema = z.object({
  // --- Core ---
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // --- Twilio ---
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // --- Stripe ---
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // --- Resend ---
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),

  // --- AI Providers ---
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // --- Storage ---
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_R2_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_SECRET_KEY: z.string().optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().optional(),
  CLOUDFLARE_R2_PUBLIC_URL: z.string().optional(),

  // --- Calendar ---
  GOOGLE_CALENDAR_ID: z.string().optional(),
  GOOGLE_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),

  // --- Analytics ---
  POSTHOG_API_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.preprocess(emptyStringToUndefined, z.string().url().optional()),

  // --- Auth ---
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  JWT_SECRET: z.string().optional(),

  // --- Observability ---
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).optional(),
  HEALTH_CHECK_SECRET: z.string().optional(),
})
.refine(
  (data) => {
    const hasTwilioVar = data.TWILIO_ACCOUNT_SID || data.TWILIO_AUTH_TOKEN || data.TWILIO_PHONE_NUMBER;
    if (!hasTwilioVar) return true;
    return !!(data.TWILIO_ACCOUNT_SID && data.TWILIO_AUTH_TOKEN && data.TWILIO_PHONE_NUMBER);
  },
  { message: "Twilio is partially configured" }
)
.refine(
  (data) => {
    const hasStripeVar = data.STRIPE_PUBLISHABLE_KEY || data.STRIPE_SECRET_KEY || data.STRIPE_WEBHOOK_SECRET;
    if (!hasStripeVar) return true;
    return !!(data.STRIPE_SECRET_KEY && data.STRIPE_WEBHOOK_SECRET);
  },
  { message: "Stripe is partially configured" }
)
.refine(
  (data) => {
    const hasResendVar = data.RESEND_API_KEY || data.RESEND_WEBHOOK_SECRET;
    if (!hasResendVar) return true;
    return !!data.RESEND_API_KEY;
  },
  { message: "Resend is partially configured" }
)
.refine(
  (data) => {
    const hasS3 = data.S3_BUCKET || data.S3_ACCESS_KEY || data.S3_SECRET_KEY || data.S3_REGION;
    if (!hasS3) return true;
    return !!(data.S3_BUCKET && data.S3_ACCESS_KEY && data.S3_SECRET_KEY && data.S3_REGION);
  },
  { message: "S3 storage is partially configured" }
)
.refine(
  (data) => {
    const hasR2 = data.CLOUDFLARE_R2_ACCOUNT_ID || data.CLOUDFLARE_R2_ACCESS_KEY || data.CLOUDFLARE_R2_SECRET_KEY;
    if (!hasR2) return true;
    return !!(data.CLOUDFLARE_R2_ACCOUNT_ID && data.CLOUDFLARE_R2_ACCESS_KEY && data.CLOUDFLARE_R2_SECRET_KEY);
  },
  { message: "Cloudflare R2 storage is partially configured" }
);

// ─── Detect build phase ─────────────────────────────────────────────────────

function isBuildPhase(): boolean {
  return !!(
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.IS_NEXT_BUILD === "1" ||
    process.env.npm_lifecycle_event === "build" ||
    process.env.npm_lifecycle_event === "postbuild"
  );
}

// ─── Validation ─────────────────────────────────────────────────────────────

let _validationRan = false;
let _validationOk = false;

function validateEnvironment(): void {
  if (_validationRan) return;
  _validationRan = true;

  const buildPhase = isBuildPhase();
  const isProd = process.env.NODE_ENV === "production";
  const localRuntime = isLocalRuntime();

  // 1. Critical runtime validation (never bypassed in production)
  const critical = criticalRuntimeSchema.safeParse(process.env);
  if (!critical.success) {
    const formatted = critical.error.format();
    if (isProd) {
      console.error("❌ CRITICAL ENVIRONMENT FAILURE ❌");
      console.error("The following required variables are missing or invalid:");
      console.error(JSON.stringify(formatted, null, 2));
      console.error("DEBUG - Env keys present:", Object.keys(process.env).filter(k => !k.includes("SECRET") && !k.includes("KEY") && !k.includes("TOKEN")));

      if (buildPhase) {
        console.error("⚠️  CRITICAL VARS MISSING DURING BUILD. The app WILL FAIL AT RUNTIME if these are not injected by your platform.");
      } else {
        throw new Error(`VantaCore runtime abort: missing critical environment variables. ${JSON.stringify(formatted)}`);
      }
    } else {
      console.warn("⚠️  Critical environment variables missing (non-production mode — continuing):");
      console.warn(JSON.stringify(formatted, null, 2));
    }
  }

  // 2. Full schema validation (catches partial provider configs)
  const full = fullSchema.safeParse(process.env);
  if (!full.success) {
    if (isProd) {
      console.error("❌ Environment configuration errors (non-critical):");
      console.error(full.error.format());
      if (!buildPhase) {
        const messages = full.error.issues.map(i => i.message).join("; ");
        throw new Error(`VantaCore runtime abort: invalid environment configuration. ${messages}`);
      }
    } else {
      console.warn("⚠️  Some environment variables are missing or invalid. This may limit functionality.");
    }
  }

  const ownershipErrors: string[] = [];
  if (isProd && !localRuntime) {
    if (fs27GateMode() !== "enforced") {
      ownershipErrors.push("FS27_GATE_MODE must be 'enforced' for non-local production.");
    }
    if (!fs27IntrospectionUrl()) {
      ownershipErrors.push("FS27 introspection URL is required. Set FS27_INTROSPECTION_URL or one of the SkyGate alias env vars.");
    }
    if (paymentMode() === "mock") {
      ownershipErrors.push("VANTACORE_PAYMENT_MODE=mock is not allowed for non-local production.");
    }
    if (paymentMode() === "skypay" && (!skyPayBaseUrl() || !firstEnv("VANTACORE_SKYPAY_DEPOSIT_OFFER_ID"))) {
      ownershipErrors.push("SkyePay deposit mode requires SKYPAY_BASE_URL/SKYGATEFS27_WORKER_URL and VANTACORE_SKYPAY_DEPOSIT_OFFER_ID.");
    }
    if (webhookMode() !== "signed") {
      ownershipErrors.push("VANTACORE_WEBHOOK_MODE must be 'signed' for non-local production.");
    }
  }

  if (ownershipErrors.length > 0) {
    if (isProd && !buildPhase) {
      throw new Error(`VantaCore FS27 ownership contract failed: ${ownershipErrors.join(" ")}`);
    }
    console.warn("⚠️  VantaCore FS27 ownership warnings:");
    ownershipErrors.forEach((message) => console.warn(` - ${message}`));
  }

  _validationOk = critical.success && full.success;
}

/**
 * Explicit runtime startup validation.
 * Call this in your server boot / API route entrypoint to guarantee
 * the environment is sound before handling traffic.
 */
export function validateRuntime(): void {
  const buildPhase = isBuildPhase();
  if (buildPhase) {
    return;
  }
  validateEnvironment();
  if (!_validationOk && process.env.NODE_ENV === "production") {
    throw new Error("VantaCore runtime validation failed. Check logs above for missing environment variables.");
  }
}

// Run validation immediately on module load in non-build contexts.
if (!isBuildPhase()) {
  validateEnvironment();
}

// ─── Exported Env Object ──────────────────────────────────────────────────

export const env = {
  // Core
  get databaseUrl(): string {
    const v = process.env.DATABASE_URL;
    if (!v && process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is not set. VantaCore cannot connect to the database.");
    }
    return v || "";
  },
  get appUrl(): string { return currentAppUrl(); },
  get nodeEnv(): string { return process.env.NODE_ENV || "development"; },
  get isProduction(): boolean { return process.env.NODE_ENV === "production"; },
  get isDevelopment(): boolean { return process.env.NODE_ENV === "development"; },
  get isTest(): boolean { return process.env.NODE_ENV === "test"; },

  // Twilio
  get hasTwilio(): boolean {
    return !!(
      firstEnv("TWILIO_ACCOUNT_SID", "SKYGATEFS13_TWILIO_ACCOUNT_SID") &&
      firstEnv("TWILIO_AUTH_TOKEN", "SKYGATEFS13_TWILIO_AUTH_TOKEN") &&
      firstEnv("TWILIO_PHONE_NUMBER", "SKYGATEFS13_TWILIO_PHONE_NUMBER")
    );
  },
  get twilioAccountSid(): string | undefined { return firstEnv("TWILIO_ACCOUNT_SID", "SKYGATEFS13_TWILIO_ACCOUNT_SID"); },
  get twilioAuthToken(): string | undefined { return firstEnv("TWILIO_AUTH_TOKEN", "SKYGATEFS13_TWILIO_AUTH_TOKEN"); },
  get twilioPhoneNumber(): string | undefined { return firstEnv("TWILIO_PHONE_NUMBER", "SKYGATEFS13_TWILIO_PHONE_NUMBER"); },

  // Stripe
  get hasStripe(): boolean {
    return !!(
      firstEnv("STRIPE_PUBLISHABLE_KEY") &&
      firstEnv("STRIPE_SECRET_KEY", "SKYGATEFS13_STRIPE_SECRET_KEY") &&
      firstEnv("STRIPE_WEBHOOK_SECRET", "SKYGATEFS13_STRIPE_WEBHOOK_SECRET")
    );
  },
  get stripePublishableKey(): string | undefined { return firstEnv("STRIPE_PUBLISHABLE_KEY"); },
  get stripeSecretKey(): string | undefined { return firstEnv("STRIPE_SECRET_KEY", "SKYGATEFS13_STRIPE_SECRET_KEY"); },
  get stripeWebhookSecret(): string | undefined { return firstEnv("STRIPE_WEBHOOK_SECRET", "SKYGATEFS13_STRIPE_WEBHOOK_SECRET"); },

  // Resend
  get hasResend(): boolean { return !!firstEnv("RESEND_API_KEY"); },
  get resendApiKey(): string | undefined { return firstEnv("RESEND_API_KEY"); },
  get resendWebhookSecret(): string | undefined { return firstEnv("RESEND_WEBHOOK_SECRET"); },
  get resendFromEmail(): string | undefined { return firstEnv("RESEND_FROM_EMAIL", "MAIL_FROM"); },

  // AI Providers
  get hasAIProvider(): boolean { return !!(firstEnv("OPENAI_API_KEY", "SKYGATEFS13_OPENAI_API_KEY") || process.env.ANTHROPIC_API_KEY || vanta13Endpoint()); },
  get openAIKey(): string | undefined { return firstEnv("OPENAI_API_KEY", "SKYGATEFS13_OPENAI_API_KEY"); },
  get anthropicKey(): string | undefined { return process.env.ANTHROPIC_API_KEY; },

  // Storage
  get hasStorage(): boolean {
    if (storageMode() === "disabled") return false;
    const hasS3 = process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY && process.env.S3_REGION;
    const hasR2 =
      firstEnv("CLOUDFLARE_R2_ACCOUNT_ID", "R2_ACCOUNT_ID") &&
      firstEnv("CLOUDFLARE_R2_ACCESS_KEY", "R2_ACCESS_KEY") &&
      firstEnv("CLOUDFLARE_R2_SECRET_KEY", "R2_SECRET_KEY") &&
      firstEnv("CLOUDFLARE_R2_BUCKET_NAME", "R2_BUCKET", "R2_BUCKET_NAME");
    return !!(hasS3 || hasR2);
  },
  get isS3(): boolean {
    const mode = storageMode();
    if (mode !== "auto" && mode !== "s3") return false;
    return !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY && process.env.S3_REGION);
  },
  get isR2(): boolean {
    const mode = storageMode();
    if (mode !== "auto" && mode !== "r2") return false;
    return !!(
      firstEnv("CLOUDFLARE_R2_ACCOUNT_ID", "R2_ACCOUNT_ID") &&
      firstEnv("CLOUDFLARE_R2_ACCESS_KEY", "R2_ACCESS_KEY") &&
      firstEnv("CLOUDFLARE_R2_SECRET_KEY", "R2_SECRET_KEY") &&
      firstEnv("CLOUDFLARE_R2_BUCKET_NAME", "R2_BUCKET", "R2_BUCKET_NAME")
    );
  },
  get s3Bucket(): string | undefined { return process.env.S3_BUCKET; },
  get s3Region(): string | undefined { return process.env.S3_REGION; },
  get s3AccessKey(): string | undefined { return process.env.S3_ACCESS_KEY; },
  get s3SecretKey(): string | undefined { return process.env.S3_SECRET_KEY; },
  get r2AccountId(): string | undefined { return firstEnv("CLOUDFLARE_R2_ACCOUNT_ID", "R2_ACCOUNT_ID"); },
  get r2AccessKey(): string | undefined { return firstEnv("CLOUDFLARE_R2_ACCESS_KEY", "R2_ACCESS_KEY"); },
  get r2SecretKey(): string | undefined { return firstEnv("CLOUDFLARE_R2_SECRET_KEY", "R2_SECRET_KEY"); },
  get r2BucketName(): string | undefined { return firstEnv("CLOUDFLARE_R2_BUCKET_NAME", "R2_BUCKET", "R2_BUCKET_NAME"); },
  get r2PublicUrl(): string | undefined { return firstEnv("CLOUDFLARE_R2_PUBLIC_URL", "R2_PUBLIC_URL"); },

  // Calendar
  get hasCalendar(): boolean {
    return !!(process.env.GOOGLE_CALENDAR_ID && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
  },
  get googleCalendarId(): string | undefined { return process.env.GOOGLE_CALENDAR_ID; },
  get googleClientEmail(): string | undefined { return process.env.GOOGLE_CLIENT_EMAIL; },
  get googlePrivateKey(): string | undefined { return process.env.GOOGLE_PRIVATE_KEY; },

  // Auth
  get hasClerk(): boolean { return !!(process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY); },
  get clerkPublishableKey(): string | undefined { return process.env.CLERK_PUBLISHABLE_KEY; },
  get clerkSecretKey(): string | undefined { return process.env.CLERK_SECRET_KEY; },
  get hasCustomAuth(): boolean { return !!fs27IntrospectionUrl() || !!process.env.JWT_SECRET; },
  get jwtSecret(): string | undefined { return firstEnv("JWT_SECRET", "SKYGATEFS13_JWT_SECRET"); },
  get fs27IntrospectionUrl(): string | undefined { return fs27IntrospectionUrl(); },
  get fs27GateMode(): string { return fs27GateMode(); },

  // Analytics
  get hasAnalytics(): boolean { return !!process.env.POSTHOG_API_KEY; },
  get posthogApiKey(): string | undefined { return process.env.POSTHOG_API_KEY; },
  get posthogHost(): string | undefined { return process.env.NEXT_PUBLIC_POSTHOG_HOST; },

  // Observability
  get sentryDsn(): string | undefined { return process.env.SENTRY_DSN; },
  get logLevel(): string { return process.env.LOG_LEVEL || "info"; },
  get healthCheckSecret(): string | undefined { return healthSecret(); },
  get paymentMode(): string { return paymentMode(); },
  get messagingMode(): string { return messagingMode(); },
  get webhookMode(): string { return webhookMode(); },
  get skyPayBaseUrl(): string | undefined { return skyPayBaseUrl(); },
  get vanta13Endpoint(): string | undefined { return vanta13Endpoint(); },
};

export { env as _env };
