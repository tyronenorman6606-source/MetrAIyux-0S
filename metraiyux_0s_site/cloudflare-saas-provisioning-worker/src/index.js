import { createSkyeMailClient, skymailConfigured } from "./skymail-sdk.js";
import { executeZeroOsAutomationAction } from "../../cloudflare/zero-os-automation-spine.mjs";
import {
  SKYEMERIT_AUTO_CODE,
  SKYEMERIT_FIRST_TIME_PACK_ID,
  GRAYSCAPE467_CODE,
  GRAYSCAPE467_PACK_ID,
  buildFirstTimeSkyeMeritPack,
  buildSkyeMeritCheckout,
  calculateSkyeMerit,
  publicSkyeMeritCatalog,
  selectSkyeMerit,
  skyeMeritMetadata
} from "./skyemerit.js";

// AI_CREDIT_VALUE_CENTS: 1 credit = 1 cent FS27 billable spend.
// Credits are the customer-facing abstraction — never expose dollar amounts.
const AI_CREDIT_VALUE_CENTS = 1;

const PLANS = {
  "starter-command": {
    name: "Starter Command",
    tagline: "Your first autonomous business OS",
    monthly: 397,
    setup: 1500,
    skyepay_offer_id: "metraiyux-starter-command",
    checkout_url: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=metraiyux-starter-command",
    owner_approval_required: true,
    activation_path: "paid_pending_owner_approval",
    // Customer-facing platform features — shown in marketing, portal, and SDK
    features: {
      skyeprofitconsole_free99: "gate_session_required_no_charge",
      skyemediacenter_free99: "gate_session_required_no_charge",
      ai_compute_credits_monthly: 25000,
      kaixu_variants: ["kaixu-6.7-nano", "kaixu-6.7-mini"],
      workspaces: 1,
      api_keys: 2,
      vault_storage_gb: 1,
      vault_files: 250,
      operating_lanes: ["NEXUS", "SKYEROUTEX_V0_4_PREVIEW"],
      brains: 16,
      skyemail_inboxes: 1,      // launching with SkyeMail
      citadeldb: "read",        // launching with CitadelDB
      vps_instances: 0,
      support: "email",
      rpm: 30,
      rpd: 600,
    },
    // Internal billing limits — never returned to customers
    limits: {
      monthly_ai_cap_usd: 250,
      requests_per_minute: 30,
      requests_per_day: 600,
      devices_per_key: 2,
      workspaces: 1,
      vault_storage_mb: 1024,
      vault_file_limit: 250,
      allowed_providers: ["openai", "gemini"],
      allowed_models: { openai: ["gpt-4o-mini", "gpt-4o"], gemini: ["gemini-2.5-flash"] }
    }
  },
  "growth-cabinet": {
    name: "Growth Cabinet",
    tagline: "All 5 operating lanes. Full Skyes Over London intelligence.",
    monthly: 997,
    setup: 3500,
    skyepay_offer_id: "metraiyux-growth-cabinet",
    checkout_url: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=metraiyux-growth-cabinet",
    owner_approval_required: true,
    activation_path: "owner_approved_after_route_scope",
    features: {
      skyeprofitconsole_free99: "gate_session_required_no_charge",
      skyemediacenter_free99: "gate_session_required_no_charge",
      ai_compute_credits_monthly: 75000,
      kaixu_variants: ["kaixu-6.7-nano", "kaixu-6.7-mini", "kaixu-6.7", "kaixu-6.7-pro"],
      workspaces: 3,
      api_keys: 5,
      vault_storage_gb: 5,
      vault_files: 1200,
      operating_lanes: ["NEXUS", "QUANTUM-OPS", "CROWN-OS", "ASCENSION", "APEX", "SKYEROUTEX_V0_4_FIT_CHECK"],
      brains: 16,
      skyemail_inboxes: 3,
      citadeldb: "full",
      vps_instances: 0,
      support: "priority_email",
      rpm: 90,
      rpd: 2500,
    },
    limits: {
      monthly_ai_cap_usd: 750,
      requests_per_minute: 90,
      requests_per_day: 2500,
      devices_per_key: 5,
      workspaces: 3,
      vault_storage_mb: 5120,
      vault_file_limit: 1200,
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: { openai: ["gpt-4o-mini", "gpt-4o"], gemini: ["gemini-2.5-flash"], anthropic: ["claude-3-5-sonnet-20241022"] }
    }
  },
  "routex-workforce-command": {
    name: "RouteX Workforce Command",
    tagline: "Dispatch, routes, stops, proof vaults, manual compliance, and workforce runtime proof.",
    monthly: 1497,
    setup: 6500,
    skyepay_offer_id: "metraiyux-routex-workforce-command",
    checkout_url: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=metraiyux-routex-workforce-command",
    owner_approval_required: true,
    activation_path: "owner_approved_after_route_scope",
    features: {
      skyeprofitconsole_free99: "gate_session_required_no_charge",
      skyemediacenter_free99: "gate_session_required_no_charge",
      ai_compute_credits_monthly: 100000,
      kaixu_variants: ["kaixu-6.7-nano", "kaixu-6.7-mini", "kaixu-6.7"],
      workspaces: 3,
      api_keys: 8,
      vault_storage_gb: 10,
      vault_files: 2500,
      operating_lanes: ["NEXUS", "SKYEROUTEX_V0_4", "SKYEROUTEX_V83_COMPAT", "PROOF-VAULT"],
      brains: 16,
      skyemail_inboxes: 5,
      citadeldb: "full",
      skyeroutex_workspaces: 1,
      skyeroutex_operator_seats: 5,
      skyeroutex_daily_routes: 50,
      skyeroutex_monthly_stops: 2500,
      skyeroutex_job_board: true,
      skyeroutex_market_reports: true,
      support: "priority_email",
      rpm: 120,
      rpd: 3500,
    },
    limits: {
      monthly_ai_cap_usd: 1000,
      requests_per_minute: 120,
      requests_per_day: 3500,
      devices_per_key: 8,
      workspaces: 3,
      vault_storage_mb: 10240,
      vault_file_limit: 2500,
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: { openai: ["gpt-4o-mini", "gpt-4o"], gemini: ["gemini-2.5-flash"], anthropic: ["claude-3-5-sonnet-20241022"] }
    }
  },
  "autonomous-office": {
    name: "Autonomous Office",
    tagline: "Full sovereign stack. kAIxu-max. Built to run without you.",
    monthly: 2497,
    setup: 7500,
    skyepay_offer_id: "metraiyux-autonomous-office",
    checkout_url: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=metraiyux-autonomous-office",
    owner_approval_required: true,
    activation_path: "owner_approved_after_sovereign_stack_review",
    features: {
      skyeprofitconsole_free99: "gate_session_required_no_charge",
      skyemediacenter_free99: "gate_session_required_no_charge",
      ai_compute_credits_monthly: 150000,
      kaixu_variants: ["kaixu-6.7-nano", "kaixu-6.7-mini", "kaixu-6.7", "kaixu-6.7-pro", "kaixu-6.7-max"],
      workspaces: 8,
      api_keys: 12,
      vault_storage_gb: 20,
      vault_files: 5000,
      operating_lanes: ["NEXUS", "QUANTUM-OPS", "CROWN-OS", "ASCENSION", "APEX", "SKYEROUTEX_V0_4"],
      brains: 16,
      skyemail_inboxes: 10,
      citadeldb: "full",
      vps_instances: 1,
      white_label: true,
      support: "dedicated",
      rpm: 180,
      rpd: 6000,
    },
    limits: {
      monthly_ai_cap_usd: 1500,
      requests_per_minute: 180,
      requests_per_day: 6000,
      devices_per_key: 12,
      workspaces: 8,
      vault_storage_mb: 20480,
      vault_file_limit: 5000,
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: { openai: ["gpt-4o-mini", "gpt-4o"], gemini: ["gemini-2.5-flash"], anthropic: ["claude-3-5-sonnet-20241022", "claude-opus-4-6"] }
    }
  },
  "enterprise-command": {
    name: "Enterprise / Managed Gate",
    tagline: "Custom infrastructure. Custom brains. White-glove delivery.",
    monthly: 3997,
    setup: 15000,
    skyepay_offer_id: "metraiyux-enterprise-command",
    checkout_url: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=metraiyux-enterprise-command",
    owner_approval_required: true,
    activation_path: "owner_approved_after_gate_scope",
    features: {
      skyeprofitconsole_free99: "gate_session_required_no_charge",
      skyemediacenter_free99: "gate_session_required_no_charge",
      ai_compute_credits_monthly: "custom",
      kaixu_variants: ["kaixu-6.7-nano", "kaixu-6.7-mini", "kaixu-6.7", "kaixu-6.7-pro", "kaixu-6.7-max"],
      workspaces: "custom",
      api_keys: "custom",
      vault_storage_gb: "custom",
      vault_files: "custom",
      operating_lanes: ["NEXUS", "QUANTUM-OPS", "CROWN-OS", "ASCENSION", "APEX", "SKYEROUTEX_V0_4_CUSTOM"],
      brains: 16,
      skyemail_inboxes: "custom",
      citadeldb: "custom",
      vps_instances: "custom",
      white_label: true,
      support: "sla_backed",
      rpm: "custom",
      rpd: "custom",
    },
    limits: {
      monthly_ai_cap_usd: "custom",
      requests_per_minute: "custom",
      requests_per_day: "custom",
      devices_per_key: "custom",
      workspaces: "custom",
      vault_storage_mb: "custom",
      vault_file_limit: "custom",
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: { openai: ["gpt-4o-mini", "gpt-4o"], gemini: ["gemini-2.5-flash"], anthropic: ["claude-3-5-sonnet-20241022"] }
    }
  },
  "unlimited-command": {
    name: "Unlimited Command",
    tagline: "Owner QA unlimited 0S lane for full-platform readiness scans.",
    monthly: 3997,
    setup: 15000,
    skyepay_offer_id: "metraiyux-enterprise-command",
    checkout_url: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=metraiyux-enterprise-command",
    owner_approval_required: true,
    activation_path: "owner_qa_zero_balance_pending_owner_approval",
    internal_qa_only: true,
    features: {
      skyeprofitconsole_free99: "gate_session_required_no_charge",
      skyemediacenter_free99: "gate_session_required_no_charge",
      ai_compute_credits_monthly: "owner_qa_capped",
      kaixu_variants: ["kaixu-6.7-nano", "kaixu-6.7-mini", "kaixu-6.7", "kaixu-6.7-pro", "kaixu-6.7-max"],
      workspaces: "owner_qa_unlimited",
      api_keys: "owner_qa_unlimited",
      vault_storage_gb: "owner_qa_capped",
      vault_files: "owner_qa_capped",
      operating_lanes: ["NEXUS", "QUANTUM-OPS", "CROWN-OS", "ASCENSION", "APEX", "SKYEROUTEX_V0_4_CUSTOM", "SKYENET", "SKYEMAIL"],
      brains: 16,
      skyemail_inboxes: "owner_qa_unlimited",
      citadeldb: "owner_qa_full",
      vps_instances: "owner_qa_optional",
      white_label: true,
      support: "owner_qa",
      rpm: "owner_qa_capped",
      rpd: "owner_qa_capped"
    },
    limits: {
      monthly_ai_cap_usd: 0,
      requests_per_minute: 240,
      requests_per_day: 10000,
      devices_per_key: 20,
      workspaces: 25,
      vault_storage_mb: 51200,
      vault_file_limit: 25000,
      allowed_providers: ["openai", "gemini", "anthropic"],
      allowed_models: { openai: ["gpt-4o-mini", "gpt-4o"], gemini: ["gemini-2.5-flash"], anthropic: ["claude-3-5-sonnet-20241022"] }
    }
  }
};

const AI_MARGIN_FLOOR_PCT = 31; // enforced minimum — never bill below this gross margin

const AI_RATE_CARD = {
  effective_date: "2026-05-17",
  unit: "per_1m_tokens",
  business_rule: "AI caps are FS27 billable spend ceilings, not unlimited upstream usage. All rates carry a minimum 31% gross margin.",
  models: [
    { provider: "openai",    model: "gpt-4o-mini",               billable_input_per_1m_usd: 0.2174,  billable_output_per_1m_usd: 0.8696,  upstream_input_per_1m_usd: 0.15, upstream_output_per_1m_usd: 0.6,  gross_margin_pct: 31 },
    { provider: "openai",    model: "gpt-4o",                    billable_input_per_1m_usd: 3.6232,  billable_output_per_1m_usd: 14.4928, upstream_input_per_1m_usd: 2.5,  upstream_output_per_1m_usd: 10,   gross_margin_pct: 31 },
    { provider: "gemini",    model: "gemini-2.5-flash",          billable_input_per_1m_usd: 0.4348,  billable_output_per_1m_usd: 3.6232,  upstream_input_per_1m_usd: 0.3,  upstream_output_per_1m_usd: 2.5,  gross_margin_pct: 31 },
    { provider: "gemini",    model: "gemini-embedding-001",      billable_input_per_1m_usd: 0.2174,  billable_output_per_1m_usd: 0,       upstream_input_per_1m_usd: 0.15, upstream_output_per_1m_usd: 0,    gross_margin_pct: 31 },
    { provider: "anthropic", model: "claude-3-5-sonnet-20241022",billable_input_per_1m_usd: 4.3478,  billable_output_per_1m_usd: 21.7391, upstream_input_per_1m_usd: 3,    upstream_output_per_1m_usd: 15,   gross_margin_pct: 31 },
    { provider: "anthropic", model: "claude-opus-4-6",           billable_input_per_1m_usd: 7.2464,  billable_output_per_1m_usd: 36.2319, upstream_input_per_1m_usd: 5,    upstream_output_per_1m_usd: 25,   gross_margin_pct: 31 },
  ]
};

const PUBLIC_AI_PROVIDER = "Skyes Over London";
const PUBLIC_AI_MODELS = {
  "openai::gpt-4o-mini": "kaixu-6.7-mini",
  "openai::gpt-4o": "kaixu-6.7",
  "gemini::gemini-2.5-flash": "kaixu-6.7-nano",
  "gemini::gemini-embedding-001": "kaixu-6.7-embed",
  "anthropic::claude-3-5-sonnet-20241022": "kaixu-6.7-pro",
  "anthropic::claude-opus-4-6": "kaixu-6.7-max"
};

function publicAiModel(provider, model) {
  return PUBLIC_AI_MODELS[`${provider}::${model}`] || (String(model || "").startsWith("kaixu") ? model : "kaixu-6.7");
}

// Customer-safe plan view — returns features only, never internal limits or AI dollar caps.
function publicPlans() {
  const out = {};
  for (const [id, plan] of Object.entries(PLANS)) {
    out[id] = {
      id,
      name: plan.name,
      tagline: plan.tagline,
      monthly: plan.monthly,
      setup: plan.setup,
      features: plan.features,
      checkout_url: plan.checkout_url,
      skyepay_offer_id: plan.skyepay_offer_id,
      owner_approval_required: plan.owner_approval_required,
      activation_path: plan.activation_path,
      skyemerit: {
        first_time_pack_id: SKYEMERIT_FIRST_TIME_PACK_ID,
        auto_code: SKYEMERIT_AUTO_CODE,
        kaixu_credit_cents: 600,
        gate_required: true
      },
    };
  }
  return out;
}

// Customer-safe rate card — strips upstream costs and margin internals before any public API response.
function publicRateCard() {
  return {
    effective_date: AI_RATE_CARD.effective_date,
    unit: AI_RATE_CARD.unit,
    models: AI_RATE_CARD.models.map(({ provider, model, billable_input_per_1m_usd, billable_output_per_1m_usd }) => ({
      provider: PUBLIC_AI_PROVIDER,
      model: publicAiModel(provider, model),
      billable_input_per_1m_usd,
      billable_output_per_1m_usd
    }))
  };
}

// Internal enforcement — throws at startup if any model is below the margin floor.
(function enforceMarginFloor() {
  for (const m of AI_RATE_CARD.models) {
    const bill = m.billable_input_per_1m_usd + m.billable_output_per_1m_usd;
    const up   = m.upstream_input_per_1m_usd + m.upstream_output_per_1m_usd;
    if (bill <= 0) continue;
    const actual = ((bill - up) / bill) * 100;
    if (actual < AI_MARGIN_FLOOR_PCT - 0.1) {
      throw new Error(
        `MARGIN FLOOR VIOLATION: ${m.provider}/${m.model} computed margin ${actual.toFixed(2)}% < floor ${AI_MARGIN_FLOOR_PCT}%`
      );
    }
  }
})();

// Live Stripe price IDs — account acct_1Seml2HEgCmnlKPJ.
// Synced by tools/sync-metraiyux-stripe-products.mjs on 2026-05-17.
const STRIPE_PRICES = {
  'starter-command': { setup: 'price_1TY9TxHEgCmnlKPJ0mBR8cwZ', monthly: 'price_1TY9TyHEgCmnlKPJTl703ekt' },
  'growth-cabinet': { setup: 'price_1TY9TzHEgCmnlKPJqXBTbH5Y', monthly: 'price_1TY9TzHEgCmnlKPJqFm0FhAS' },
  'routex-workforce-command': { setup: 'price_1TY9U1HEgCmnlKPJPNiPFacB', monthly: 'price_1TY9U1HEgCmnlKPJ8s3kF0eC' },
  'autonomous-office': { setup: 'price_1TY9U2HEgCmnlKPJPqDe4Cqr', monthly: 'price_1TY9U2HEgCmnlKPJq5d7ccZs' },
  'enterprise-command': { setup: 'price_1TY9U3HEgCmnlKPJ7ACUntvj', monthly: 'price_1TY9U4HEgCmnlKPJSWLllIxH' },
  'unlimited-command': { setup: 'price_1TY9U3HEgCmnlKPJ7ACUntvj', monthly: 'price_1TY9U4HEgCmnlKPJSWLllIxH' },
};

const SOVEREIGN_STACK = {
  thesis: "MetrAIyux 0S can run on its own VPS while FS27 tracks billing, auth, AI usage, caps, customer data visuals, and platform action telemetry.",
  lanes: [
    { id: "citadeldb", title: "CitadelDB", replaces: ["neon"], status: "owner_selectable_database_lane" },
    { id: "skyevault", title: "SkyeVault", replaces: ["outside_drive_storage", "repo_package_storage"], status: "owner_selectable_vault_lane" },
    { id: "skyemail", title: "SkyeMail", replaces: ["single_provider_business_email"], status: "workspace_mailbox_lane" },
    { id: "skyepay", title: "SkyePay", replaces: ["loose_payment_links"], status: "stripe_confirmed_controlled_activation_lane" },
    { id: "skyemerit", title: "SkyeMerit", replaces: ["unbounded_coupons", "manual_discount_math"], status: "gated_merit_credit_discount_lane" },
    { id: "skyeroutex", title: "SkyeRouteX", replaces: ["loose_dispatch_spreadsheets", "unproven_route_ledgers"], status: "owner_approved_workforce_command_lane" },
    { id: "fs27", title: "SkyeGateFS27", replaces: ["loose_api_keys", "unmetered_ai"], status: "parent_gate_and_telemetry_lane" }
  ]
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-saas-event-secret,x-kaixu-install-id,x-kaixu-app,x-kaixu-build,x-kaixu-request-id,x-0s-shared-gate,x-0s-internal-proxy-secret,x-0s-gate-session,x-free99-gate-session,x-skye-gate-session,x-skygate-session,x-fs27-token"
};

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: { "content-type": "application/json", ...cors }
});

const id = (p) => `${p}_${safeRandomUUID()}`;
const now = () => new Date().toISOString();

function safeRandomUUID() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `uuid_${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
}

async function body(req) {
  try { return await req.json(); } catch { return {}; }
}

function slugify(s) {
  return String(s || "workspace").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "workspace";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function emailDomain(email) {
  const parts = normalizeEmail(email).split("@");
  return parts.length === 2 ? parts[1] : "";
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

function normalizePlanId(value, fallback = "starter-command") {
  const raw = String(value || fallback).trim().toLowerCase();
  if (raw === "unlimited") return "unlimited-command";
  return raw || fallback;
}

function testEmailDomain(domain) {
  const d = String(domain || "").toLowerCase();
  return d === "example.com"
    || d === "example.org"
    || d === "example.net"
    || d === "example.invalid"
    || d === "localhost"
    || d.endsWith(".invalid")
    || d.endsWith(".test");
}

function emailDeliveryPolicy(email, env) {
  const normalized = normalizeEmail(email);
  if (!validEmail(normalized)) return { ok: false, email: normalized, reason: "invalid_email" };
  const allowTestDelivery = String(env.SAAS_ALLOW_TEST_EMAIL_DELIVERY || env.ALLOW_TEST_EMAIL_DELIVERY || "").toLowerCase() === "true";
  if (!allowTestDelivery && testEmailDomain(emailDomain(normalized))) {
    return { ok: false, email: normalized, reason: "test_email_domain" };
  }
  return { ok: true, email: normalized };
}

function signupSpamSignals(payload = {}) {
  const signals = [];
  if (payload.website || payload.homepage || payload.url || payload._gotcha || payload.honeypot) signals.push("honeypot_field");
  const combined = [payload.full_name, payload.company_name, payload.message, payload.notes].map((value) => String(value || "")).join(" ");
  const linkCount = (combined.match(/https?:\/\//gi) || []).length;
  if (linkCount > 2) signals.push("excess_links");
  if (combined.length > 4000) signals.push("oversized_payload");
  return signals;
}

function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

async function sha256Short(value) {
  if (!globalThis.crypto?.subtle?.digest) {
    let hash = 2166136261;
    for (const char of String(value || "")) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0").repeat(3).slice(0, 24);
  }
  const bytes = new TextEncoder().encode(String(value || ""));
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

function requestIp(req) {
  return String(req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown")
    .split(",")[0]
    .trim()
    .slice(0, 120) || "unknown";
}

async function bumpRateLimit(kv, key, limit, ttlSeconds) {
  const existing = await kv.get(key, { type: "json" }).catch(() => null);
  const count = Number(existing?.count || 0);
  if (count >= limit) return { ok: false, key, count, limit, retry_after_seconds: ttlSeconds };
  const next = { count: count + 1, limit, updated_at: now() };
  await kv.put(key, JSON.stringify(next), { expirationTtl: ttlSeconds });
  return { ok: true, key, count: next.count, limit };
}

async function checkSignupRateLimit(req, env, email) {
  if (!env.SAAS_KV) return { ok: true, enforced: false, reason: "SAAS_KV_not_bound" };
  const windowSeconds = clampInt(env.SAAS_SIGNUP_RATE_WINDOW_SECONDS, 3600, 60, 86400);
  const limit = clampInt(env.SAAS_SIGNUP_RATE_LIMIT, 5, 1, 100);
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const ipHash = await sha256Short(requestIp(req));
  const emailHash = await sha256Short(normalizeEmail(email));
  const checks = [
    await bumpRateLimit(env.SAAS_KV, `rate:signup:ip:${bucket}:${ipHash}`, limit, windowSeconds * 2),
    await bumpRateLimit(env.SAAS_KV, `rate:signup:email:${bucket}:${emailHash}`, limit, windowSeconds * 2)
  ];
  const blocked = checks.find((check) => !check.ok);
  return blocked ? { ok: false, enforced: true, ...blocked } : { ok: true, enforced: true, checks };
}

function boolEnv(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function sharedGateRequired(env) {
  return boolEnv(env.ZERO_OS_SHARED_GATE_REQUIRED) || boolEnv(env.SKYE_SHARED_GATE_REQUIRED);
}

function sharedProxySecret(env) {
  return String(env.ZERO_OS_INTERNAL_PROXY_SECRET || env.METRAIYUX_0S_INTERNAL_PROXY_SECRET || env.SAAS_INTERNAL_PROXY_SECRET || "").trim();
}

function sharedGateProxyAuth(req, env) {
  const secret = sharedProxySecret(env);
  if (!secret) return false;
  return ["operator", "gate", "user"].includes(String(req.headers.get("x-0s-shared-gate") || "").toLowerCase())
    && String(req.headers.get("x-0s-internal-proxy-secret") || "").trim() === secret;
}

function presentedGateToken(req) {
  return [
    (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim(),
    req.headers.get("x-0s-gate-session"),
    req.headers.get("x-free99-gate-session"),
    req.headers.get("x-skye-gate-session"),
    req.headers.get("x-skygate-session"),
    req.headers.get("x-fs27-token")
  ].map((value) => String(value || "").replace(/^Bearer\s+/i, "").trim()).find(Boolean) || "";
}

async function auth(req, env) {
  if (sharedGateProxyAuth(req, env)) return true;
  const token = presentedGateToken(req);
  if (!token) return false;
  const result = await sdkAuth(new Request(req.url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  }), env);
  return result.ok === true;
}

function providerRuntimeEnv(env) {
  return {
    ...env,
    SKYEMAIL_PLATFORM_WORKER: env.SKYEMAIL_PLATFORM_WORKER || env.SKYMAIL_PLATFORM_WORKER || env.SKYMAIL_WORKER || null,
    SKYMAIL_API_TOKEN: env.SKYMAIL_API_TOKEN || env.SKYEMAIL_API_TOKEN || env.SKYMAIL_SERVICE_TOKEN || env.SKYE_MAIL_SERVICE_TOKEN || "",
    RELAY13_WORKER_ORIGIN: env.RELAY13_WORKER_ORIGIN || env.RELAY13_ORIGIN || originFromUrl(env.RELAY13_SKYEMERIT_URL || env.RELAY13_EVENT_URL || ""),
    RELAY13_API_KEY: env.RELAY13_API_KEY || env.CONNECTLOG_RELAY13_API_KEY || env.RELAY13_API_TOKEN || env.RELAY13_EVENT_SECRET || "",
    RELAY13_ADMIN_TOKEN: env.RELAY13_ADMIN_TOKEN || env.RELAY13_PLATFORM_ADMIN_TOKEN || env.RELAY13_API_TOKEN || "",
    SITE_EVENTS_KV: env.SITE_EVENTS_KV || env.ZERO_OS_AUTOMATION_KV || env.AUTOMATION_KV || env.SAAS_KV || null
  };
}

function originFromUrl(value) {
  try {
    return new URL(String(value || "")).origin;
  } catch {
    return "";
  }
}

function pathFromUrl(value, fallback = "/api/v1/connectlog/scan") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (raw.startsWith("/")) return raw;
  try {
    const url = new URL(raw);
    return `${url.pathname || fallback}${url.search || ""}`;
  } catch {
    return fallback;
  }
}

async function runSaasProviderAction(env, envelope) {
  const runtimeEnv = providerRuntimeEnv(env);
  return executeZeroOsAutomationAction(runtimeEnv, {}, {
    app_id: "saas-provisioning",
    owner_approved: true,
    ...envelope
  }, { actor: "saas-provisioning-worker" }, { operator_ok: true });
}

function publicProviderRuntimeReceipt(receipt = null) {
  if (!receipt) return null;
  return {
    id: receipt.id,
    provider_id: receipt.provider_id,
    action: receipt.action,
    status: receipt.status,
    executed: receipt.executed === true,
    provider_call_made: receipt.provider_call_made === true,
    provider_result: receipt.provider_result || null,
    http_status: receipt.http_status || null,
    error: receipt.error || ""
  };
}

async function sendRuntimeEmail(env, { to, subject, html, text = "", usage_lane = "saas:email", workspace_id = "", customer_id = "", client_id = "" } = {}) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length || !env.RESEND_FROM_EMAIL) return { sent: false, reason: "resend_not_configured" };
  const runtimeSandbox = boolEnv(env.SAAS_PROVIDER_RUNTIME_SANDBOX) || boolEnv(env.ZERO_OS_PROVIDER_SANDBOX);
  const runtimeEmail = await runSaasProviderAction(env, {
    provider_id: "resend",
    action: "resend.email.send",
    workspace_id,
    customer_id,
    client_id: client_id || recipients[0] || "",
    usage_lane,
    live: !runtimeSandbox,
    sandbox: runtimeSandbox,
    payload: {
      to: recipients,
      subject,
      html,
      text: text || html
    }
  });
  const receipt = runtimeEmail.response?.receipt || null;
  return {
    sent: runtimeEmail.response?.ok === true,
    status: receipt?.http_status || runtimeEmail.status,
    provider_runtime: publicProviderRuntimeReceipt(receipt),
    provider_runtime_receipt_id: receipt?.id || null,
    provider_runtime_status: receipt?.status || null,
    provider_call_made: receipt?.provider_call_made === true,
    response: receipt?.provider_result || null,
    error: runtimeEmail.response?.ok === true ? "" : (receipt?.error || "resend_provider_runtime_failed")
  };
}

async function sendRelay13RuntimeEvent(env, event = {}) {
  const relayUrl = env.RELAY13_SKYEMERIT_URL || env.RELAY13_EVENT_URL || "";
  const hasRuntimeConfig = relayUrl || env.RELAY13_WORKER_ORIGIN || env.RELAY13_ORIGIN || boolEnv(env.SAAS_PROVIDER_RUNTIME_SANDBOX) || boolEnv(env.ZERO_OS_PROVIDER_SANDBOX);
  if (!hasRuntimeConfig) return { status: "skipped", reason: "relay13_not_configured" };
  const runtimeSandbox = boolEnv(env.SAAS_PROVIDER_RUNTIME_SANDBOX) || boolEnv(env.ZERO_OS_PROVIDER_SANDBOX);
  const runtime = await runSaasProviderAction(env, {
    provider_id: "relay13",
    action: "relay13.thread.attach",
    workspace_id: event.workspace_id || "",
    customer_id: event.customer_id || "",
    client_id: event.actor || event.customer_id || "",
    usage_lane: "saas:relay13_skyemerit_delivery",
    live: !runtimeSandbox,
    sandbox: runtimeSandbox,
    payload: {
      path: pathFromUrl(relayUrl),
      method: "POST",
      body: event
    }
  });
  const receipt = runtime.response?.receipt || null;
  return {
    status: runtime.response?.ok === true ? "sent" : "failed",
    http_status: receipt?.http_status || runtime.status,
    response: receipt?.provider_result || null,
    provider_runtime: publicProviderRuntimeReceipt(receipt),
    provider_runtime_receipt_id: receipt?.id || null,
    provider_runtime_status: receipt?.status || null,
    provider_call_made: receipt?.provider_call_made === true,
    error: runtime.response?.ok === true ? "" : (receipt?.error || "relay13_provider_runtime_failed")
  };
}

function saasStripeWebhookRuntimePayload(event = {}, object = {}) {
  const metadata = object?.metadata && typeof object.metadata === "object" ? object.metadata : {};
  return {
    event_id: String(event.id || object.id || ""),
    event_type: String(event.type || ""),
    type: String(event.type || ""),
    object_id: String(object.id || event.id || ""),
    object_type: String(object.object || ""),
    session_id: String(object.object === "checkout.session" ? object.id || "" : metadata.session_id || ""),
    subscription_id: String(object.subscription || metadata.subscription_id || ""),
    payment_status: String(object.payment_status || object.status || ""),
    amount_total: Number(object.amount_total || object.amount || 0) || 0,
    currency: String(object.currency || "usd"),
    client_reference_id: String(object.client_reference_id || ""),
    workspace_id: String(metadata.workspace_id || ""),
    customer_id: String(metadata.customer_id || object.customer || ""),
    plan_id: String(metadata.plan_id || ""),
    subscription_record_id: String(metadata.subscription_id || "")
  };
}

async function mirrorSaasStripeWebhookProviderRuntime(env, event = {}, object = {}) {
  const payload = saasStripeWebhookRuntimePayload(event, object);
  const runtime = await runSaasProviderAction(env, {
    provider_id: "stripe",
    action: "stripe.webhook.lifecycle",
    workspace_id: payload.workspace_id,
    customer_id: payload.customer_id,
    client_id: payload.client_reference_id || payload.customer_id || payload.subscription_record_id || "",
    usage_lane: "saas:stripe_webhook_lifecycle",
    live: true,
    sandbox: false,
    payload
  });
  const receipt = runtime.response?.receipt || null;
  return publicProviderRuntimeReceipt(receipt);
}

function fs27MirrorUrl(env) {
  return String(env.FS27_EVENT_MIRROR_URL || env.PLATFORM_EVENT_MIRROR_URL || env.SKYGATEFS27_EVENT_MIRROR_URL || "").trim();
}

function fs27MirrorSecret(env) {
  return String(env.FS27_EVENT_MIRROR_SECRET || env.PLATFORM_EVENT_MIRROR_SECRET || env.SKYGATEFS27_EVENT_MIRROR_SECRET || "").trim();
}

function redactPayload(value, depth = 0) {
  if (depth > 3) return "[max_depth]";
  if (value == null || typeof value !== "object") {
    const out = String(value ?? "");
    return out.length > 1000 ? `${out.slice(0, 1000)}...(truncated)` : value;
  }
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => redactPayload(item, depth + 1));
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    out[key] = /password|secret|token|api[_-]?key|authorization|cookie|access_code/i.test(key)
      ? "[redacted]"
      : redactPayload(raw, depth + 1);
  }
  return out;
}

function eventClass(action, resourceType, payload) {
  const combined = `${action || ""} ${resourceType || ""}`;
  return {
    privileged: /billing|workspace|command|approval|key|mailbox|vault|database|citadel|payment|checkout/i.test(combined),
    billable: /billing|checkout|workspace|customer_command|client_action|ai|skymail|vault|database/i.test(combined) || Boolean(payload?.billable)
  };
}

async function mirrorToFs27(env, event) {
  const url = fs27MirrorUrl(env);
  if (!url) return { status: "skipped", reason: "FS27_EVENT_MIRROR_URL_not_configured" };
  const secret = fs27MirrorSecret(env);
  const headers = { "content-type": "application/json" };
  if (secret) {
    headers.authorization = `Bearer ${secret}`;
    headers["x-fs27-event-secret"] = secret;
  }
  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(event) });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 1000) }; }
    return { status: res.ok ? "sent" : "failed", http_status: res.status, response: data };
  } catch (error) {
    return { status: "failed", error: error?.message || "FS27 mirror request failed" };
  }
}

function omegaScan(text) {
  const t = String(text || "");
  const findings = [];
  const add = (id, why) => findings.push({ id, why });
  if (/owner|founder|gray|main orchestrator|mega brain|production social|admin social|admin brain|company social/i.test(t)) add("owner_connector_or_admin_brain_request", "Customer command references owner/admin systems.");
  if (/admin token|secret|api key|credential|password|bypass|all tenants|global ledger|root access|oauth/i.test(t)) add("privilege_escalation", "Customer command requests privileged credentials or global access.");
  if (/publish|post|send email|send sms|dispatch|go live|public claim|announce/i.test(t)) add("external_action", "Customer command requests public/external action.");
  if (/contract|signature|legal|tax|filing|incorporat|hire|fire|payroll|payment|refund|price|billing/i.test(t)) add("regulated_or_approval_sensitive", "Customer command touches legal, finance, HR, pricing, or filing-sensitive work.");
  if (/other customer|all workspaces|cross tenant|client list|candidate list|export everything/i.test(t)) add("tenant_boundary_risk", "Customer command may cross tenant boundaries.");
  let decision = "allow_customer_scoped";
  if (findings.some((f) => ["owner_connector_or_admin_brain_request", "privilege_escalation", "tenant_boundary_risk"].includes(f.id))) decision = "quarantine_for_admin_review";
  else if (findings.length) decision = "approval_required";
  return { reviewer: "0meg4kAI", decision, findings };
}

function routeCommand(text) {
  const t = String(text || "").toLowerCase();
  if (/post|social|content|blog|marketing/.test(t)) return { primary: "Valentina Reyes / Marketing Brain", secondary: "Victor Saint / QA Brain", approval_required: true };
  if (/hire|candidate|recruit|staff|worker/.test(t)) return { primary: "Sienna Brooks / Staffing Brain", secondary: "Marcus Vale / Operations Brain", approval_required: true };
  if (/contract|legal|compliance|filing|claim/.test(t)) return { primary: "Julian Mercer / Compliance Brain", secondary: "Victor Saint / QA Brain", approval_required: true };
  if (/invoice|price|billing|payment/.test(t)) return { primary: "Naomi Sterling / Finance Brain", secondary: "Marcus Vale / Operations Brain", approval_required: true };
  if (/lead|sale|proposal|close/.test(t)) return { primary: "Celeste Monroe / Revenue Brain", secondary: "Adrian Cross / Client Success Brain", approval_required: false };
  return { primary: "Site Operator Brain", secondary: "Central Company Command Brain", approval_required: false };
}

async function email(env, subject, html) {
  if (!env.ADMIN_APPROVAL_EMAIL || !env.RESEND_FROM_EMAIL) return { sent: false, reason: "resend_not_configured" };
  return sendRuntimeEmail(env, {
    to: [env.ADMIN_APPROVAL_EMAIL],
    subject,
    html,
    usage_lane: "saas:admin_email",
    client_id: env.ADMIN_APPROVAL_EMAIL
  });
}

function skyeMeritCheckoutOffer(plan, planId) {
  return {
    id: `saas-${planId}-setup`,
    title: `${plan?.name || planId} Setup`,
    currency: "usd",
    mode: "payment",
    line_items: [
      {
        id: "setup",
        name: `${plan?.name || planId} Setup`,
        amount_cents: Math.round(Number(plan?.setup || 0) * 100),
        type: "one_time",
        lookup_key: `${planId}_setup`
      }
    ]
  };
}

function skyeMeritHtml(pack) {
  const codes = (pack.coupon_codes || []).map((code) => `<li><b>${code}</b></li>`).join("");
  const credit = Number(pack.kaixu_credit_cents || 0);
  const creditLine = credit > 0
    ? `<p>Your pack includes a $${(credit / 100).toFixed(2)} premium kAIxu model spend credit.</p>`
    : `<p>This owner-issued pack is a zero-balance QA unlock. Gate, abuse, quota, and owner-approval checks still apply.</p>`;
  return `<h2>${pack.title || "Your SkyeMerit pack is active"}</h2>
    ${creditLine}
    <p>Use the SkyePay checkout lane to apply the best eligible SkyeMerit. Free99 means no charge, but the gate session still applies.</p>
    <ul>${codes}</ul>
    <p>Pack: ${pack.pack_id}</p>`;
}

async function sendCustomerEmail(env, to, subject, html) {
  const policy = emailDeliveryPolicy(to, env);
  if (!policy.ok) return { sent: false, skipped: true, provider_delivery_suppressed: true, reason: policy.reason };
  if (!env.RESEND_FROM_EMAIL || !to) return { sent: false, reason: "resend_not_configured" };
  return sendRuntimeEmail(env, {
    to: [to],
    subject,
    html,
    usage_lane: "saas:customer_email",
    client_id: policy.email || to
  });
}

async function optionalJsonPost(url, payload, secret = "") {
  if (!url) return { status: "skipped", reason: "url_not_configured" };
  const headers = { "content-type": "application/json" };
  if (secret) headers.authorization = `Bearer ${secret}`;
  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 1000) }; }
    return { status: res.ok ? "sent" : "failed", http_status: res.status, response: data };
  } catch (error) {
    return { status: "failed", error: error?.message || "dispatch_failed" };
  }
}

async function sendSkyeMailSystemMessage(env, pack) {
  const policy = emailDeliveryPolicy(pack.email, env);
  if (!policy.ok) return { status: "skipped", provider_delivery_suppressed: true, reason: policy.reason };
  const path = String(env.SKYMAIL_SKYEMERIT_PATH || "/system-message");
  const payload = {
    type: "skyemerit.pack_issued",
    to: pack.email,
    subject: "Your SkyeMerit pack is active",
    html: skyeMeritHtml(pack),
    pack
  };
  const runtimeSandbox = boolEnv(env.SAAS_PROVIDER_RUNTIME_SANDBOX) || boolEnv(env.ZERO_OS_PROVIDER_SANDBOX);
  const runtime = await runSaasProviderAction(env, {
    provider_id: "skymail",
    action: "skymail.system_message.send",
    workspace_id: pack.workspace_id || "",
    customer_id: pack.customer_id || "",
    client_id: pack.email || "",
    usage_lane: "saas:skymail_skyemerit_system_message",
    live: !runtimeSandbox,
    sandbox: runtimeSandbox,
    payload: { path, method: "POST", body: payload }
  });
  const receipt = runtime.response?.receipt || null;
  return {
    status: runtime.response?.ok === true ? "sent" : "failed",
    http_status: receipt?.http_status || runtime.status,
    response: receipt?.provider_result || null,
    provider_runtime: publicProviderRuntimeReceipt(receipt),
    provider_runtime_receipt_id: receipt?.id || null,
    provider_runtime_status: receipt?.status || null,
    provider_call_made: receipt?.provider_call_made === true,
    error: runtime.response?.ok === true ? "" : (receipt?.error || "skymail_send_failed")
  };
}

async function deliverSkyeMeritPack(env, pack) {
  const connectLogUrl = env.CONNECTLOG_SKYEMERIT_URL || env.CONNECTLOG_EVENT_URL || "";
  const connectLogSecret = env.CONNECTLOG_API_TOKEN || env.CONNECTLOG_EVENT_SECRET || "";
  const event = {
    source_app: "metraiyux-0s",
    type: "skyemerit.pack_issued",
    action: "skyemerit.pack_issued",
    lane: "skyemerit",
    customer_id: pack.customer_id || null,
    workspace_id: pack.workspace_id || null,
    actor: pack.email || "new_customer",
    resource_type: "skyemerit_pack",
    resource_id: pack.id,
    billable: false,
    privileged: true,
    status: "issued",
    summary: "First-time SkyeMerit pack issued",
    payload: redactPayload(pack),
    event_ts: pack.issued_at
  };
  return {
    resend: await sendCustomerEmail(env, pack.email, "Your SkyeMerit pack is active", skyeMeritHtml(pack)),
    skymail: await sendSkyeMailSystemMessage(env, pack),
    relay13: await sendRelay13RuntimeEvent(env, event),
    connectlog: await optionalJsonPost(connectLogUrl, event, connectLogSecret),
    fs27_mirror: await mirrorToFs27(env, event)
  };
}

async function ensureSkyeMeritPackTable(env) {
  if (!env.SAAS_DB) return false;
  await env.SAAS_DB.prepare(`CREATE TABLE IF NOT EXISTS skyemerit_packs (
    id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL,
    customer_id TEXT,
    workspace_id TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'issued',
    kaixu_credit_cents INTEGER NOT NULL DEFAULT 0,
    coupon_codes TEXT,
    delivery TEXT,
    payload TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await env.SAAS_DB.prepare("CREATE INDEX IF NOT EXISTS idx_skyemerit_packs_email ON skyemerit_packs(email)").run();
  await env.SAAS_DB.prepare("CREATE INDEX IF NOT EXISTS idx_skyemerit_packs_customer ON skyemerit_packs(customer_id)").run();
  await env.SAAS_DB.prepare("CREATE INDEX IF NOT EXISTS idx_skyemerit_packs_workspace ON skyemerit_packs(workspace_id)").run();
  return true;
}

async function insertSkyeMeritPackRow(env, pack, delivery, row) {
  await env.SAAS_DB.prepare(`INSERT INTO skyemerit_packs
    (id,pack_id,customer_id,workspace_id,email,status,kaixu_credit_cents,coupon_codes,delivery,payload,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(pack.id, pack.pack_id, pack.customer_id || "", pack.workspace_id || "", pack.email || "", pack.status, pack.kaixu_credit_cents || 0, JSON.stringify(pack.coupon_codes || []), JSON.stringify(delivery || {}), JSON.stringify(row), pack.issued_at, row.updated_at)
    .run();
}

async function recordSkyeMeritPack(env, pack, delivery) {
  const row = { ...pack, delivery, updated_at: now() };
  if (env.SAAS_KV) await env.SAAS_KV.put(`skyemerit_pack:${pack.id}`, JSON.stringify(row));
  if (env.SAAS_KV && pack.email) await env.SAAS_KV.put(`skyemerit_pack_email:${pack.email}`, JSON.stringify(row));
  if (env.SAAS_DB) {
    try {
      await insertSkyeMeritPackRow(env, pack, delivery, row);
    } catch (error) {
      try {
        await ensureSkyeMeritPackTable(env);
        await insertSkyeMeritPackRow(env, pack, delivery, row);
        row.persistence_repaired = true;
      } catch (repairError) {
        row.persistence_warning = repairError?.message || error?.message || "skyemerit_packs migration not applied";
      }
    }
  }
  return row;
}

async function issueSkyeMeritPack(env, payload = {}, source = "signup") {
  const requestedCode = String(payload.skyemerit_code || payload.code || payload.skyeMeritCode || "").trim().toUpperCase();
  const pack = buildFirstTimeSkyeMeritPack({
    email: payload.email || payload.customer_email || payload.approval_email || "",
    customerId: payload.customer_id || "",
    workspaceId: payload.workspace_id || "",
    source
  });
  if (requestedCode === GRAYSCAPE467_CODE) {
    pack.pack_id = GRAYSCAPE467_PACK_ID;
    pack.title = "GRAYSCAPE467 Owner QA Merit Pack";
    pack.status = "issued";
    pack.audience = "owner_qa_unlimited";
    pack.kaixu_credit_cents = 0;
    pack.coupon_codes = [GRAYSCAPE467_CODE];
    pack.delivery_channels = ["skymail", "relay13", "connectlog", "fs27_event_mirror"];
    pack.customer_summary = "GRAYSCAPE467 is an owner-issued zero-balance unlimited QA merit. It does not bypass FS27/SkyGate auth, owner approval, quota guards, or abuse controls.";
  }
  const delivery = await deliverSkyeMeritPack(env, pack);
  const record = await recordSkyeMeritPack(env, pack, delivery);
  await audit(env, pack.email || "public", "skyemerit_pack_issued", "skyemerit_pack", pack.id, {
    customer_id: pack.customer_id || null,
    workspace_id: pack.workspace_id || null,
    delivery,
    status: "issued",
    billable: false
  });
  return record;
}

async function audit(env, actor, action, resource_type, resource_id, payload) {
  const row = { id: id("audit"), actor, action, resource_type, resource_id, payload: payload || {}, created_at: now() };
  if (env.SAAS_KV) await env.SAAS_KV.put(`audit:${row.id}`, JSON.stringify(row));
  if (env.SAAS_DB) {
    await env.SAAS_DB.prepare("INSERT INTO audit_log (id,actor,action,resource_type,resource_id,payload,created_at) VALUES (?,?,?,?,?,?,?)")
      .bind(row.id, actor, action, resource_type, resource_id, JSON.stringify(payload || {}), row.created_at)
      .run();
  }
  const cls = eventClass(action, resource_type, payload || {});
  row.fs27_mirror = await mirrorToFs27(env, {
    source_app: "metraiyux-0s",
    type: action,
    action,
    lane: resource_type,
    actor: actor || "system",
    resource_type,
    resource_id,
    target: resource_id,
    customer_id: payload?.customer_id || (resource_type === "customer" ? resource_id : null),
    workspace_id: payload?.workspace_id || payload?.ws_id || (resource_type === "workspace" ? resource_id : null),
    ws_id: payload?.workspace_id || payload?.ws_id || (resource_type === "workspace" ? resource_id : null),
    plan_id: payload?.plan_id || null,
    billable: cls.billable,
    privileged: cls.privileged,
    status: payload?.status || "recorded",
    summary: `${action} on ${resource_type}`,
    payload: redactPayload(payload || {}),
    event_ts: row.created_at
  });
  return row;
}

async function recordProvisioningEvent(env, workspaceId, eventType, payload, status = "recorded") {
  const row = { id: id("prov"), workspace_id: workspaceId, event_type: eventType, payload: payload || {}, status, created_at: now() };
  if (env.SAAS_KV) await env.SAAS_KV.put(`provisioning_event:${row.id}`, JSON.stringify(row));
  if (env.SAAS_DB) {
    await env.SAAS_DB.prepare("INSERT INTO provisioning_events (id,workspace_id,event_type,payload,status,created_at) VALUES (?,?,?,?,?,?)")
      .bind(row.id, workspaceId, eventType, JSON.stringify(payload || {}), status, row.created_at)
      .run();
  }
  const cls = eventClass(eventType, "provisioning", payload || {});
  row.fs27_mirror = await mirrorToFs27(env, {
    source_app: "metraiyux-0s",
    type: eventType,
    action: eventType,
    lane: "provisioning",
    actor: "system",
    resource_type: "provisioning",
    resource_id: row.id,
    workspace_id: workspaceId,
    ws_id: workspaceId,
    billable: cls.billable,
    privileged: cls.privileged,
    status,
    summary: `${eventType} for workspace ${workspaceId}`,
    payload: redactPayload(payload || {}),
    event_ts: row.created_at
  });
  return row;
}

async function safeFirst(env, sql, bindings = []) {
  if (!env.SAAS_DB) return null;
  try { return await env.SAAS_DB.prepare(sql).bind(...bindings).first(); } catch { return null; }
}

async function safeAll(env, sql, bindings = []) {
  if (!env.SAAS_DB) return [];
  try {
    const rows = await env.SAAS_DB.prepare(sql).bind(...bindings).all();
    return rows.results || [];
  } catch {
    return [];
  }
}

async function loadWorkspaceByIdOrSlug(env, value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const slug = slugify(raw);
  let workspace = await safeFirst(env, "SELECT * FROM workspaces WHERE id=? OR slug=? LIMIT 1", [raw, slug]);
  if (workspace) return workspace;
  if (!env.SAAS_KV) return null;
  workspace = await env.SAAS_KV.get(`workspace:${raw}`, "json");
  if (workspace) return workspace;
  const indexed = await env.SAAS_KV.get(`workspace_slug:${slug}`, "json");
  if (indexed?.id) return env.SAAS_KV.get(`workspace:${indexed.id}`, "json");
  return null;
}

async function indexWorkspace(env, workspace) {
  if (!env.SAAS_KV || !workspace?.id) return;
  await env.SAAS_KV.put(`workspace:${workspace.id}`, JSON.stringify(workspace));
  if (workspace.slug) await env.SAAS_KV.put(`workspace_slug:${workspace.slug}`, JSON.stringify({ id: workspace.id, slug: workspace.slug, updated_at: now() }));
}

function workspaceSession(workspace = {}) {
  return {
    token: "",
    client_id: workspace.slug || workspace.id || "",
    workspace_id: workspace.id || workspace.workspace_id || "",
    workspace_slug: workspace.slug || workspace.workspace_slug || "",
    client: workspace.company_name || workspace.company || workspace.slug || "",
    email: workspace.approval_email || workspace.owner_email || "",
    workspace: workspace.company_name || workspace.company || workspace.id || "",
    status: workspace.status || "workspace_recorded",
    shared_gate: true,
    issued_at: now()
  };
}

async function recordWorkspaceMailbox(env, workspaceId, skymail) {
  const mailbox = skymail?.data?.mailbox || null;
  const row = {
    id: id("mbx"),
    workspace_id: workspaceId,
    provider: mailbox?.provider || "skymail",
    mailbox_email: mailbox?.mailbox_email || "",
    status: mailbox?.status || (skymail?.skipped ? "skipped" : "pending"),
    provisioning_status: mailbox?.provisioning_status || (skymail?.skipped ? "skymail_not_configured" : "unknown"),
    skymail_user_id: skymail?.data?.user?.id || "",
    skymail_mailbox_id: mailbox?.id || "",
    inbox_ready: skymail?.data?.inbox_ready ? 1 : 0,
    provider_ready: skymail?.data?.provider_ready ? 1 : 0,
    key_state: skymail?.data?.key_state || {},
    payload: skymail?.data || skymail || {},
    created_at: now(),
    updated_at: now()
  };
  if (env.SAAS_KV) await env.SAAS_KV.put(`workspace_mailbox:${workspaceId}`, JSON.stringify(row));
  if (env.SAAS_DB) {
    await env.SAAS_DB.prepare(`INSERT INTO workspace_mailboxes
      (id,workspace_id,provider,mailbox_email,status,provisioning_status,skymail_user_id,skymail_mailbox_id,inbox_ready,provider_ready,key_state,payload,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(row.id, row.workspace_id, row.provider, row.mailbox_email, row.status, row.provisioning_status, row.skymail_user_id, row.skymail_mailbox_id, row.inbox_ready, row.provider_ready, JSON.stringify(row.key_state), JSON.stringify(row.payload), row.created_at, row.updated_at)
      .run();
  }
  return row;
}

async function recordWorkspaceStackLanes(env, workspace) {
  const row = {
    workspace_id: workspace.id,
    customer_id: workspace.customer_id || "",
    plan_id: workspace.plan_id || "",
    database_lane: workspace.database_lane || "citadeldb_or_neon_owner_choice",
    vault_lane: workspace.vault_lane || "skyevault",
    mail_lane: workspace.mail_lane || "skyemail",
    fs27_event_mirror: fs27MirrorUrl(env) ? 1 : 0,
    payload: { sovereign_stack: SOVEREIGN_STACK },
    created_at: now(),
    updated_at: now()
  };
  if (env.SAAS_KV) await env.SAAS_KV.put(`workspace_stack:${workspace.id}`, JSON.stringify(row));
  if (env.SAAS_DB) {
    try {
      await env.SAAS_DB.prepare(`INSERT INTO workspace_stack_lanes
        (workspace_id,customer_id,plan_id,database_lane,vault_lane,mail_lane,fs27_event_mirror,payload,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(workspace_id) DO UPDATE SET
          customer_id=excluded.customer_id,
          plan_id=excluded.plan_id,
          database_lane=excluded.database_lane,
          vault_lane=excluded.vault_lane,
          mail_lane=excluded.mail_lane,
          fs27_event_mirror=excluded.fs27_event_mirror,
          payload=excluded.payload,
          updated_at=excluded.updated_at`)
        .bind(row.workspace_id, row.customer_id, row.plan_id, row.database_lane, row.vault_lane, row.mail_lane, row.fs27_event_mirror, JSON.stringify(row.payload), row.created_at, row.updated_at)
        .run();
      await env.SAAS_DB.prepare("UPDATE workspaces SET database_lane=?, vault_lane=?, mail_lane=?, updated_at=? WHERE id=?")
        .bind(row.database_lane, row.vault_lane, row.mail_lane, row.updated_at, row.workspace_id)
        .run();
    } catch (error) {
      row.persistence_warning = error?.message || "workspace_stack_lanes migration not applied";
    }
  }
  row.fs27_mirror = await mirrorToFs27(env, {
    source_app: "metraiyux-0s",
    type: "sovereign_stack.selected",
    action: "sovereign_stack.selected",
    lane: "sovereign_stack",
    actor: "system",
    resource_type: "workspace",
    resource_id: workspace.id,
    workspace_id: workspace.id,
    ws_id: workspace.id,
    customer_id: workspace.customer_id || null,
    plan_id: workspace.plan_id || null,
    billable: false,
    privileged: true,
    status: "recorded",
    summary: `Sovereign stack lanes selected for ${workspace.id}`,
    payload: redactPayload(row),
    event_ts: row.created_at
  });
  return row;
}

function cardDisplayName(workspace, owner) {
  return String(owner?.full_name || owner?.name || workspace?.company_name || workspace?.slug || "Workspace Owner").trim();
}

function buildWorkspaceKeyCard(env, workspace, owner, skymail, mailboxReceipt) {
  const mailboxEmail = mailboxReceipt?.mailbox_email || skymail?.data?.mailbox?.mailbox_email || "";
  const skymailUrl = String(env.SKYMAIL_PUBLIC_URL || env.SKYMAIL_API_URL || "https://skyemail-platform.graylondonskyes.workers.dev").replace(/\/+$/, "");
  const setup = new URL(`${skymailUrl}/login`);
  setup.searchParams.set("workspace_id", workspace.id);
  if (mailboxEmail) setup.searchParams.set("mailbox", mailboxEmail);
  setup.searchParams.set("next", "vault-setup");
  const keyState = skymail?.data?.key_state || {};
  return {
    id: id("keycard"),
    type: "skymail_vault_key_card",
    title: "SkyeMail Vault Key Card",
    workspace_id: workspace.id,
    customer_id: workspace.customer_id || "",
    workspace_slug: workspace.slug,
    company_name: workspace.company_name,
    plan_id: workspace.plan_id,
    recipient_email: owner?.email || workspace.approval_email || "",
    display_name: cardDisplayName(workspace, owner),
    mailbox_email: mailboxEmail,
    setup_url: setup.toString(),
    recovery_policy: "client_managed_optional_admin_recovery",
    key_state: { active: Boolean(keyState.active), version: keyState.version || null, setup_required: !keyState.active },
    security_model: [
      "Client creates the vault key pair in their browser.",
      "SkyeMail stores the public key for inbound encryption.",
      "The private key is stored only after being wrapped by the client's Vault Passphrase.",
      "Admin recovery is optional and must be disclosed if enabled."
    ],
    mdp_rendering: { requested: Boolean(env.MDP_KEYCARD_WEBHOOK_URL || env.MCP_KEYCARD_WEBHOOK_URL), format: "resume_style_workspace_security_card" },
    created_at: now()
  };
}

async function sendKeyCardToMdp(env, card) {
  const url = env.MDP_KEYCARD_WEBHOOK_URL || env.MCP_KEYCARD_WEBHOOK_URL || "";
  if (!url) return { status: "not_configured", response: null };
  const secret = env.MDP_KEYCARD_WEBHOOK_SECRET || env.MCP_KEYCARD_WEBHOOK_SECRET || "";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(secret ? { authorization: `Bearer ${secret}`, "x-metraiyux-keycard-secret": secret } : {}) },
      body: JSON.stringify({ type: "metraiyux.workspace.key_card.issue", card })
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 1000) }; }
    return { status: res.ok ? "sent" : "failed", http_status: res.status, response: data };
  } catch (error) {
    return { status: "failed", error: error?.message || "MDP key-card dispatch failed." };
  }
}

async function recordWorkspaceKeyCard(env, workspace, owner, skymail, mailboxReceipt) {
  const card = buildWorkspaceKeyCard(env, workspace, owner, skymail, mailboxReceipt);
  const mdp = await sendKeyCardToMdp(env, card);
  const row = { ...card, status: "issued", mdp_status: mdp.status, mdp_response: mdp, payload: card, updated_at: now() };
  if (env.SAAS_KV) await env.SAAS_KV.put(`workspace_key_card:${workspace.id}`, JSON.stringify(row));
  if (env.SAAS_DB) {
    await env.SAAS_DB.prepare(`INSERT INTO workspace_key_cards
      (id,workspace_id,customer_id,card_type,recipient_email,display_name,mailbox_email,setup_url,recovery_policy,status,mdp_status,mdp_response,payload,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(row.id, row.workspace_id, row.customer_id, row.type, row.recipient_email, row.display_name, row.mailbox_email, row.setup_url, row.recovery_policy, row.status, row.mdp_status, JSON.stringify(row.mdp_response || {}), JSON.stringify(row.payload || {}), row.created_at, row.updated_at)
      .run();
  }
  return row;
}

function buildVisualRows(env, workspace, plan, stack, commands, events) {
  const limits = plan?.limits || {};
  const commandRows = Array.isArray(commands) ? commands : [];
  const eventRows = Array.isArray(events) ? events : [];
  const approvalCount = commandRows.filter((cmd) => Number(cmd.approval_required || 0) || /approval/i.test(String(cmd.status || ""))).length;
  const openCommands = commandRows.filter((cmd) => !/complete|done|closed/i.test(String(cmd.status || ""))).length;
  const workspaceId = workspace?.id || workspace?.workspace_id || "workspace";
  const planId = workspace?.plan_id || plan?.id || "starter-command";
  const aiCap = Number(limits.monthly_ai_cap_usd || 250);
  const dailyLimit = Number(limits.requests_per_day || 600);
  const vaultLimit = Number(limits.vault_storage_mb || 1024);
  const fileLimit = Number(limits.vault_file_limit || 250);
  const vaultUsed = Number(stack?.vault_used_mb || stack?.vault_storage_used_mb || 0);
  const filesUsed = Number(stack?.vault_file_count || 0);
  const requestsUsed = Number(stack?.requests_today || 0);
  const aiUsed = Number(stack?.ai_spend_usd || 0);
  const eventMixMap = {};
  for (const ev of eventRows) {
    const label = String(ev.event_type || ev.resource_type || ev.action || "event").split(".")[0].replace(/_/g, " ") || "event";
    eventMixMap[label] = (eventMixMap[label] || 0) + 1;
  }
  if (!Object.keys(eventMixMap).length) {
    eventMixMap.Workspace = 1;
    if (commandRows.length) eventMixMap.Command = commandRows.length;
  }
  const completed = commandRows.filter((cmd) => /complete|done|closed/i.test(String(cmd.status || ""))).length;
  const queued = commandRows.filter((cmd) => /queued|routed|pending/i.test(String(cmd.status || ""))).length || Math.max(1, openCommands - approvalCount);
  const blocked = commandRows.filter((cmd) => /blocked|failed/i.test(String(cmd.status || ""))).length;
  return {
    schema_version: "0s.customer_visuals.v1",
    generated_at: now(),
    workspace: {
      workspace_id: workspaceId,
      company_name: workspace?.company_name || workspace?.workspace || "Customer workspace",
      plan_id: planId,
      status: workspace?.status || "workspace_tracked",
      activation: workspace?.activation || "paid_status_then_plan_policy_activation"
    },
    kpis: [
      { label: "AI cap", value: `$${aiCap.toLocaleString()}`, detail: `$${aiUsed.toFixed(2)} metered`, tone: "gold" },
      { label: "Requests today", value: String(requestsUsed), detail: `${dailyLimit.toLocaleString()}/day plan limit`, tone: "cyan" },
      { label: "Vault usage", value: vaultUsed >= 1024 ? `${(vaultUsed / 1024).toFixed(1)} GB` : `${vaultUsed} MB`, detail: `${vaultLimit >= 1024 ? `${(vaultLimit / 1024).toFixed(1)} GB` : `${vaultLimit} MB`} plan limit`, tone: "mint" },
      { label: "Open commands", value: String(openCommands), detail: `${approvalCount} approval-sensitive`, tone: "violet" }
    ],
    progress: [
      { id: "ai_spend", label: "AI spend cap", used: aiUsed, limit: aiCap, unit: "usd", status: aiUsed >= aiCap ? "blocked" : aiUsed >= aiCap * 0.8 ? "watch" : "healthy" },
      { id: "daily_requests", label: "Daily request limit", used: requestsUsed, limit: dailyLimit, unit: "requests", status: requestsUsed >= dailyLimit ? "blocked" : requestsUsed >= dailyLimit * 0.8 ? "watch" : "healthy" },
      { id: "vault_storage", label: "Vault storage", used: vaultUsed, limit: vaultLimit, unit: "mb", status: vaultUsed >= vaultLimit ? "blocked" : vaultUsed >= vaultLimit * 0.8 ? "watch" : "healthy" },
      { id: "vault_files", label: "Vault files", used: filesUsed, limit: fileLimit, unit: "files", status: filesUsed >= fileLimit ? "blocked" : filesUsed >= fileLimit * 0.8 ? "watch" : "healthy" }
    ],
    bars: [
      { label: "AI", value: aiUsed, limit: aiCap, unit: "usd" },
      { label: "Requests", value: requestsUsed, limit: dailyLimit, unit: "requests" },
      { label: "Storage", value: vaultUsed, limit: vaultLimit, unit: "mb" },
      { label: "Files", value: filesUsed, limit: fileLimit, unit: "files" }
    ],
    donut: [
      { label: "Completed", value: completed, tone: "mint" },
      { label: "Queued", value: queued, tone: "cyan" },
      { label: "Approval", value: approvalCount, tone: "gold" },
      { label: "Blocked", value: blocked, tone: "danger" }
    ],
    timeline: eventRows.slice(0, 8).map((ev) => ({
      time: ev.created_at,
      title: String(ev.event_type || ev.action || "Workspace event"),
      detail: String(ev.status || ev.resource_type || "recorded"),
      status: String(ev.status || "recorded")
    })),
    sovereign_stack: [
      { label: "Database", value: stack?.database_lane || workspace?.database_lane || "CitadelDB or Neon", status: "owner choice" },
      { label: "Vault", value: stack?.vault_lane || workspace?.vault_lane || "SkyeVault", status: "tracked" },
      { label: "Email", value: stack?.mail_lane || workspace?.mail_lane || "SkyeMail", status: "tracked" },
      { label: "Gate", value: "FS27", status: fs27MirrorUrl(env) ? "mirroring" : "mirror configured by env" }
    ],
    event_mix: Object.entries(eventMixMap).map(([label, value]) => ({ label, value }))
  };
}

async function sdkAuth(req, env) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim()
    || (req.headers.get("x-fs27-token") || "").trim();
  if (!token) return { ok: false, error: "no_token", status: 401 };

  const authHeaders = { Authorization: `Bearer ${token}`, "content-type": "application/json" };
  let res;
  try {
    // Prefer service binding (same-account, no DNS, faster + no routing quirks)
    if (env.FS27_WORKER) {
      res = await env.FS27_WORKER.fetch(new Request("https://fs27/auth-card", { method: "GET", headers: authHeaders }));
    } else {
      const fs27Url = String(env.FS27_URL || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev").replace(/\/$/, "");
      res = await fetch(`${fs27Url}/auth-card`, { method: "GET", headers: authHeaders });
    }
  } catch (err) {
    return { ok: false, error: `fs27_unreachable: ${err?.message || err}`, status: 503 };
  }

  // 401, 403, 404 all mean "token not accepted"
  if (res.status === 401 || res.status === 403 || res.status === 404) return { ok: false, error: "invalid_token", status: 401 };
  if (!res.ok) return { ok: false, error: `fs27_auth_card_${res.status}`, status: 502 };

  let body;
  try { body = await res.json(); } catch { return { ok: false, error: "fs27_response_parse_error", status: 502 }; }
  if (!body?.card) return { ok: false, error: "fs27_card_missing", status: 502 };
  return { ok: true, card: body.card, token };
}

function fs27GatewayPath(path) {
  const normalized = String(path || "").replace(/\/+$/, "") || "/";
  if (normalized === "/gateway-chat" || normalized === "/gateway/chat" || normalized === "/api/kaixu/chat" || normalized === "/.netlify/functions/gateway-chat") return "/gateway-chat";
  if (normalized === "/gateway-stream" || normalized === "/gateway/stream" || normalized === "/api/kaixu/stream" || normalized === "/.netlify/functions/gateway-stream") return "/gateway-stream";
  return "";
}

async function proxyFs27Gateway(req, env, targetPath) {
  const sourceUrl = new URL(req.url);
  const targetSearch = sourceUrl.search || "";
  const targetUrl = env.FS27_WORKER
    ? new URL(`https://fs27${targetPath}${targetSearch}`)
    : new URL(`${String(env.FS27_URL || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev").replace(/\/$/, "")}${targetPath}${targetSearch}`);
  const proxied = new Request(targetUrl, req);
  return env.FS27_WORKER ? env.FS27_WORKER.fetch(proxied) : fetch(proxied);
}

async function buildCustomerVisuals(env, workspaceId) {
  const idToFind = String(workspaceId || "").trim();
  if (!idToFind) return { ok: false, error: "workspace_id_required" };
  const workspace = await loadWorkspaceByIdOrSlug(env, idToFind);
  if (!workspace) return { ok: false, error: "workspace_not_found", workspace_id: idToFind };
  const plan = PLANS[workspace.plan_id] || PLANS["starter-command"];
  let stack = await safeFirst(env, "SELECT * FROM workspace_stack_lanes WHERE workspace_id=? LIMIT 1", [workspace.id]);
  if (!stack && env.SAAS_KV) stack = await env.SAAS_KV.get(`workspace_stack:${workspace.id}`, "json");
  const commands = await safeAll(env, "SELECT * FROM customer_commands WHERE workspace_id=? ORDER BY created_at DESC LIMIT 50", [workspace.id]);
  const events = await safeAll(env, "SELECT * FROM provisioning_events WHERE workspace_id=? ORDER BY created_at DESC LIMIT 50", [workspace.id]);
  return { ok: true, ...buildVisualRows(env, workspace, plan, stack || {}, commands, events) };
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(req.url);
    const path = url.pathname;
    try {
      const gatewayTarget = fs27GatewayPath(path);
      if (gatewayTarget && req.method === "POST") return proxyFs27Gateway(req, env, gatewayTarget);

      if (path === "/" || path === "/health" || path === "/api/saas/status") {
        return json({
          ok: true,
          service: "saas-self-serve-provisioning",
          plans: Object.keys(PLANS),
          d1: !!env.SAAS_DB,
          kv: !!env.SAAS_KV,
          queue: !!env.SAAS_QUEUE,
          resend: !!env.RESEND_API_KEY,
          skymail: skymailConfigured(env),
          skymail_url: env.SKYMAIL_API_URL || env.SKYMAIL_PUBLIC_URL || null,
          fs27_event_mirror: { configured: !!fs27MirrorUrl(env), signed: !!fs27MirrorSecret(env) },
          sovereign_stack: SOVEREIGN_STACK,
          skyemerit: publicSkyeMeritCatalog(),
          ai_rate_card: publicRateCard(),
          visual_data_kit: { endpoint: "/api/saas/customer-visuals", schema: "0s.customer_visuals.v1" },
          time: now()
        });
      }

      if (path === "/api/saas/plans") return json({ plans: publicPlans(), ai_rate_card: publicRateCard(), sovereign_stack: SOVEREIGN_STACK, skyemerit: publicSkyeMeritCatalog() });
      if (path === "/api/saas/sovereign-stack") return json({ ok: true, sovereign_stack: SOVEREIGN_STACK, ai_rate_card: publicRateCard(), skyemerit: publicSkyeMeritCatalog() });

      if (path === "/api/saas/skyemerit/catalog") return json(publicSkyeMeritCatalog());

      if (path === "/api/saas/skyemerit/preview" && (req.method === "POST" || req.method === "GET")) {
        const b = req.method === "POST" ? await body(req) : {
          subtotal_cents: url.searchParams.get("subtotal_cents"),
          subtotal_usd: url.searchParams.get("subtotal"),
          code: url.searchParams.get("code"),
          first_time_eligible: url.searchParams.get("first_time_eligible") !== "false"
        };
        const subtotal = Math.round(Number(b.subtotal_cents ?? Number(b.subtotal_usd || 0) * 100));
        const code = b.code || b.skyemerit_code || SKYEMERIT_AUTO_CODE;
        const result = code === SKYEMERIT_AUTO_CODE
          ? selectSkyeMerit({ subtotalCents: subtotal, code, firstTimeEligible: b.first_time_eligible !== false })
          : calculateSkyeMerit(code, subtotal);
        return json({ ok: result.ok !== false, result, selected: result, catalog: publicSkyeMeritCatalog() });
      }

      if (path === "/api/saas/skyemerit/issue" && req.method === "POST") {
        if (!await auth(req, env)) return json({ ok: false, error: "unauthorized" }, 401);
        const b = await body(req);
        const pack = await issueSkyeMeritPack(env, b, b.source || "owner_dashboard");
        return json({ ok: true, pack, skyemerit: pack, catalog: publicSkyeMeritCatalog() });
      }

      if (path === "/api/saas/customer-visuals") {
        if (!await auth(req, env)) return json({ ok: false, error: "unauthorized_shared_gate_required" }, 401);
        const workspaceId = url.searchParams.get("workspace_id") || url.searchParams.get("workspace") || "";
        const visuals = await buildCustomerVisuals(env, workspaceId);
        if (visuals.ok === false) return json(visuals, visuals.error === "workspace_id_required" ? 400 : 404);
        await audit(env, workspaceId, "customer_visuals_view", "customer_visuals", workspaceId, { workspace_id: workspaceId, status: "rendered", billable: false });
        return json({ ok: true, visuals });
      }

      if (path === "/api/saas/action-event" && req.method === "POST") {
        const eventSecret = String(env.SAAS_ACTION_EVENT_SECRET || "").trim();
        if (eventSecret) {
          const got = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "") || req.headers.get("x-saas-event-secret") || "";
          if (got !== eventSecret) return json({ ok: false, error: "unauthorized_action_event" }, 401);
        } else if (!await auth(req, env)) {
          return json({ ok: false, error: "unauthorized_shared_gate_required" }, 401);
        }
        const b = await body(req);
        const eventId = b.event_id || id("evt");
        const lane = String(b.lane || b.resource_type || "client_action").slice(0, 80);
        const action = String(b.action || b.type || "client_action").slice(0, 120);
        const actor = String(b.actor || b.email || b.workspace_id || "client").slice(0, 240);
        const row = await audit(env, actor, action, lane, b.resource_id || eventId, { ...b, event_id: eventId, lane, action, status: b.status || "client_reported", trust: eventSecret ? "signed_client_event" : "unsigned_client_event" });
        return json({ ok: true, event_id: row.id, resource_event_id: eventId, fs27_mirror: row.fs27_mirror || null });
      }

      if (path === "/api/saas/client-login" && req.method === "POST") {
        return json({ ok: false, error: "preview_auth_disabled_by_shared_gate", gate: "FS27/SkyGate/Free99" }, 410);
      }

      if (path === "/api/saas/client-preview") {
        if (!await auth(req, env)) return json({ ok: false, error: "unauthorized_shared_gate_required" }, 401);
        const clientId = String(url.searchParams.get("client") || url.searchParams.get("workspace") || url.searchParams.get("workspace_id") || "").trim();
        if (!clientId) return json({ ok: false, error: "client_or_workspace_required" }, 400);
        const workspace = await loadWorkspaceByIdOrSlug(env, clientId);
        if (!workspace) return json({ ok: false, error: "workspace_not_found", client: clientId }, 404);
        return json({ ok: true, workspace, session: workspaceSession(workspace) });
      }

      if (path === "/api/saas/client-workspace/claim" && req.method === "POST") {
        if (!await auth(req, env)) return json({ ok: false, error: "unauthorized_shared_gate_required" }, 401);
        const b = await body(req);
        const workspaceId = String(b.workspace_id || b.workspace || b.client_id || "").trim();
        if (!workspaceId) return json({ ok: false, error: "workspace_id_required" }, 400);
        const workspace = await loadWorkspaceByIdOrSlug(env, workspaceId);
        if (!workspace) return json({ ok: false, error: "workspace_not_found", workspace_id: workspaceId }, 404);
        await audit(env, workspace.approval_email || workspace.owner_email || "shared-gate-user", "client_workspace_claim", "workspace", workspace.id, { workspace_id: workspace.id, shared_gate: true });
        return json({ ok: true, claimed: true, workspace, session: workspaceSession(workspace), persistence: env.SAAS_DB ? "d1" : "kv" });
      }

      if (path === "/api/saas/signup" && req.method === "POST") {
        const b = await body(req);
        const emailPolicy = emailDeliveryPolicy(b.email, env);
        if (!emailPolicy.ok) {
          return json({ ok: false, error: emailPolicy.reason, provider_delivery_suppressed: true }, 400);
        }
        const spamSignals = signupSpamSignals(b);
        if (spamSignals.length) {
          return json({ ok: false, error: "signup_spam_rejected", signals: spamSignals, provider_delivery_suppressed: true }, 400);
        }
        const rateLimit = await checkSignupRateLimit(req, env, emailPolicy.email);
        if (!rateLimit.ok) {
          return json({ ok: false, error: "signup_rate_limited", rate_limit: rateLimit, provider_delivery_suppressed: true }, 429);
        }
        const customer_id = id("cus");
        const plan_id = normalizePlanId(b.plan_id || b.plan, "starter-command");
        const customer = { id: customer_id, full_name: b.full_name || "", email: emailPolicy.email, company_name: b.company_name || "", phone: b.phone || "", plan_id, status: "intake_pending_review", created_at: now() };
        if (env.SAAS_KV) await env.SAAS_KV.put(`customer:${customer_id}`, JSON.stringify(customer));
        if (env.SAAS_DB) await env.SAAS_DB.prepare("INSERT INTO customers (id,full_name,email,company_name,phone,plan_id,status,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(customer_id, customer.full_name, customer.email, customer.company_name, customer.phone, plan_id, customer.status, customer.created_at).run();
        const skyemerit = await issueSkyeMeritPack(env, { ...b, customer_id, email: customer.email }, "signup");
        await audit(env, customer.email || "public", "signup", "customer", customer_id, { ...b, email: customer.email, status: customer.status, rate_limit: rateLimit });
        return json({ ok: true, customer_id, plan_id, status: customer.status, rate_limit: rateLimit, skyemerit, next: "create_workspace", persistence: env.SAAS_DB ? "d1" : "kv_fallback" });
      }

      if (path === "/api/saas/workspaces" && req.method === "POST") {
        if (!await auth(req, env)) return json({ ok: false, error: "unauthorized_shared_gate_required" }, 401);
        const b = await body(req);
        const workspace_id = String(b.workspace_id || "").trim() || id("ws");
        const slug = slugify(b.workspace_slug || b.company_name || b.slug || workspace_id);
        const plan_id = normalizePlanId(b.plan_id || b.plan, "starter-command");
        const database_lane = String(b.database_lane || b.database_provider || "citadeldb_or_neon_owner_choice").slice(0, 80);
        const vault_lane = String(b.vault_lane || b.file_storage_provider || "skyevault").slice(0, 80);
        const mail_lane = String(b.mail_lane || b.email_provider || "skyemail").slice(0, 80);
        const workspace = { id: workspace_id, customer_id: b.customer_id || "", company_name: b.company_name || slug, slug, plan_id, status: "pending_provisioning", approval_email: b.approval_email || b.owner_email || b.email || "", created_at: now(), updated_at: now(), services: Array.isArray(b.services) ? b.services : [], database_lane, vault_lane, mail_lane, sovereign_stack: SOVEREIGN_STACK };
        await indexWorkspace(env, workspace);
        if (env.SAAS_DB) {
          await env.SAAS_DB.prepare("INSERT INTO workspaces (id,customer_id,company_name,slug,plan_id,status,approval_email,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(workspace_id, workspace.customer_id, workspace.company_name, slug, plan_id, workspace.status, workspace.approval_email, workspace.created_at, workspace.updated_at).run();
          for (const s of workspace.services) await env.SAAS_DB.prepare("INSERT INTO workspace_services (id,workspace_id,service_key,status,created_at) VALUES (?,?,?,?,?)").bind(id("svc"), workspace_id, String(s), "selected", now()).run();
        }
        const owner = { email: b.owner_email || b.email || b.approval_email || "", full_name: b.full_name || b.owner_name || "" };
        const stackReceipt = await recordWorkspaceStackLanes(env, workspace);
        const skymail = await createSkyeMailClient(env).provisionWorkspaceMailbox(workspace, owner);
        const mailboxReceipt = await recordWorkspaceMailbox(env, workspace_id, skymail);
        const keyCard = await recordWorkspaceKeyCard(env, workspace, owner, skymail, mailboxReceipt);
        const skyemerit = await issueSkyeMeritPack(env, { ...b, customer_id: workspace.customer_id, workspace_id, email: owner.email }, "workspace_onboarding");
        await recordProvisioningEvent(env, workspace_id, "sovereign_stack.selected", { database_lane, vault_lane, mail_lane, stackReceipt, stack: SOVEREIGN_STACK }, "recorded");
        await recordProvisioningEvent(env, workspace_id, "skymail.workspace_mailbox", { skymail, mailboxReceipt }, skymail.ok ? "completed" : skymail.skipped ? "skipped" : "needs_attention");
        await recordProvisioningEvent(env, workspace_id, "skymail.vault_key_card", { keyCard }, keyCard.mdp_status === "failed" ? "needs_attention" : "completed");
        await recordProvisioningEvent(env, workspace_id, "skyemerit.pack_issued", { skyemerit }, "completed");
        if (env.SAAS_QUEUE) await env.SAAS_QUEUE.send({ type: "workspace_provisioning", workspace_id, plan_id, services: workspace.services, skymail: mailboxReceipt, at: now() });
        await audit(env, "system", "create_workspace", "workspace", workspace_id, { ...b, workspace_id, plan_id, database_lane, vault_lane, mail_lane });
        await email(env, "Workspace provisioning receipt", `<h2>Workspace provisioning recorded</h2><p>Workspace ${workspace_id} for ${b.company_name || slug} is pending provisioning.</p><p>Plan: ${plan_id}</p><p>Database lane: ${database_lane}</p><p>Vault lane: ${vault_lane}</p><p>Mail lane: ${mail_lane}</p><p>SkyeMail: ${mailboxReceipt.mailbox_email || mailboxReceipt.provisioning_status}</p><p>Vault key card: ${keyCard.setup_url}</p>`);
        return json({ ok: true, workspace, workspace_id, slug, status: "pending_provisioning", queued: !!env.SAAS_QUEUE, persistence: env.SAAS_DB ? "d1" : "kv_fallback", sovereign_stack: { database_lane, vault_lane, mail_lane, fs27_event_mirror: !!fs27MirrorUrl(env), receipt: stackReceipt }, skymail: { ok: skymail.ok, skipped: !!skymail.skipped, mailbox: mailboxReceipt, key_card: keyCard, response: skymail.data || null, error: skymail.error || null }, skyemerit });
      }

      if (path === "/api/saas/skymail/status") {
        if (!await auth(req, env)) return json({ ok: false, error: "unauthorized_shared_gate_required" }, 401);
        const workspace_id = url.searchParams.get("workspace_id") || "";
        if (!workspace_id) return json({ ok: false, error: "workspace_id_required" }, 400);
        if (env.SAAS_DB) {
          const rows = await env.SAAS_DB.prepare("SELECT * FROM workspace_mailboxes WHERE workspace_id=? ORDER BY created_at DESC LIMIT 10").bind(workspace_id).all();
          return json({ ok: true, rows: rows.results || [] });
        }
        if (env.SAAS_KV) {
          const row = await env.SAAS_KV.get(`workspace_mailbox:${workspace_id}`, "json");
          return json({ ok: true, rows: row ? [row] : [] });
        }
        return json({ ok: false, error: "no_persistence_bound" }, 500);
      }

      if (path === "/api/saas/key-card") {
        if (!await auth(req, env)) return json({ ok: false, error: "unauthorized_shared_gate_required" }, 401);
        const workspace_id = url.searchParams.get("workspace_id") || "";
        if (!workspace_id) return json({ ok: false, error: "workspace_id_required" }, 400);
        if (env.SAAS_DB) {
          const rows = await env.SAAS_DB.prepare("SELECT * FROM workspace_key_cards WHERE workspace_id=? ORDER BY created_at DESC LIMIT 10").bind(workspace_id).all();
          return json({ ok: true, rows: rows.results || [] });
        }
        if (env.SAAS_KV) {
          const row = await env.SAAS_KV.get(`workspace_key_card:${workspace_id}`, "json");
          return json({ ok: true, rows: row ? [row] : [] });
        }
        return json({ ok: false, error: "no_persistence_bound" }, 500);
      }

      if (path === "/api/saas/workspace-stack") {
        if (!await auth(req, env)) return json({ ok: false, error: "unauthorized_shared_gate_required" }, 401);
        const workspace_id = url.searchParams.get("workspace_id") || "";
        if (!workspace_id) return json({ ok: false, error: "workspace_id_required" }, 400);
        if (env.SAAS_DB) {
          try {
            const rows = await env.SAAS_DB.prepare("SELECT * FROM workspace_stack_lanes WHERE workspace_id=? LIMIT 1").bind(workspace_id).all();
            return json({ ok: true, rows: rows.results || [], sovereign_stack: SOVEREIGN_STACK });
          } catch (error) {
            return json({ ok: false, error: "workspace_stack_lanes_migration_not_applied", detail: error?.message || String(error) }, 501);
          }
        }
        if (env.SAAS_KV) {
          const row = await env.SAAS_KV.get(`workspace_stack:${workspace_id}`, "json");
          return json({ ok: true, rows: row ? [row] : [], sovereign_stack: SOVEREIGN_STACK });
        }
        return json({ ok: false, error: "no_persistence_bound" }, 500);
      }

      if (path === "/api/saas/billing/checkout-session" && req.method === "POST") {
        if (!await auth(req, env)) return json({ ok: false, error: "unauthorized_shared_gate_required" }, 401);
        const b = await body(req);
        const plan_id = normalizePlanId(b.plan_id, "starter-command");
        const plan = PLANS[plan_id];
        if (!plan) return json({ ok: false, error: `unknown_plan: ${plan_id}` }, 400);
        const subscription_id = id("sub");
        const baseUrl = env.SAAS_PUBLIC_URL || "https://sovereign-saas-provisioning-worker.graylondonskyes.workers.dev";
        const successUrl = `${baseUrl}/api/saas/billing/checkout-success?subscription_id=${subscription_id}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${baseUrl}/api/saas/billing/checkout-cancel?subscription_id=${subscription_id}`;
        const skyeMeritCheckout = b.skyemerit_apply === false || b.skyemerit_apply === "false"
          ? null
          : buildSkyeMeritCheckout({
            offer: skyeMeritCheckoutOffer(plan, plan_id),
            code: b.skyemerit_code || SKYEMERIT_AUTO_CODE,
            packId: b.skyemerit_pack_id || (String(b.skyemerit_code || "").trim().toUpperCase() === GRAYSCAPE467_CODE ? GRAYSCAPE467_PACK_ID : SKYEMERIT_FIRST_TIME_PACK_ID),
            firstTimeEligible: b.skyemerit_first_time !== false
          });

        const zeroBalanceApproved = skyeMeritCheckout?.applied
          && skyeMeritCheckout.allow_free_checkout === true
          && Number(skyeMeritCheckout.adjusted_due_cents || 0) === 0;
        const subStatus = zeroBalanceApproved
          ? (plan.owner_approval_required ? "zero_balance_pending_owner_approval" : "active")
          : "checkout_requested";
        const sub = { id: subscription_id, customer_id: b.customer_id || "", workspace_id: b.workspace_id || "", plan_id, provider: zeroBalanceApproved ? "skyemerit_zero_balance" : "stripe", provider_subscription_id: "", status: subStatus, created_at: now() };
        if (env.SAAS_KV) await env.SAAS_KV.put(`subscription:${subscription_id}`, JSON.stringify(sub));
        if (env.SAAS_DB) await env.SAAS_DB.prepare("INSERT INTO subscriptions (id,customer_id,workspace_id,plan_id,provider,provider_subscription_id,status,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(subscription_id, sub.customer_id, sub.workspace_id, plan_id, sub.provider, "", subStatus, sub.created_at).run();
        await audit(env, "system", zeroBalanceApproved ? "billing_zero_balance_started" : "billing_checkout_started", "subscription", subscription_id, { plan_id, workspace_id: b.workspace_id, skyemerit: skyeMeritCheckout, status: subStatus });

        if (zeroBalanceApproved) {
          const zeroSessionId = `skye_zero_${safeRandomUUID()}`;
          const updated_at = now();
          const workspaceStatus = plan.owner_approval_required ? "zero_balance_pending_owner_approval" : "active";
          if (env.SAAS_DB) {
            try {
              await env.SAAS_DB.prepare("UPDATE subscriptions SET provider_subscription_id=?, status=?, updated_at=? WHERE id=?").bind(zeroSessionId, subStatus, updated_at, subscription_id).run();
            } catch {
              await env.SAAS_DB.prepare("UPDATE subscriptions SET provider_subscription_id=?, status=? WHERE id=?").bind(zeroSessionId, subStatus, subscription_id).run();
            }
            if (b.workspace_id) await env.SAAS_DB.prepare("UPDATE workspaces SET status=?, updated_at=? WHERE id=?").bind(workspaceStatus, updated_at, b.workspace_id).run();
          }
          if (env.SAAS_KV) {
            const stored = await env.SAAS_KV.get(`subscription:${subscription_id}`, "json");
            if (stored) {
              stored.provider_subscription_id = zeroSessionId;
              stored.status = subStatus;
              stored.updated_at = updated_at;
              await env.SAAS_KV.put(`subscription:${subscription_id}`, JSON.stringify(stored));
            }
            if (b.workspace_id) {
              const ws = await env.SAAS_KV.get(`workspace:${b.workspace_id}`, "json");
              if (ws) {
                ws.status = workspaceStatus;
                ws.owner_approval_required = plan.owner_approval_required !== false;
                ws.updated_at = updated_at;
                await env.SAAS_KV.put(`workspace:${b.workspace_id}`, JSON.stringify(ws));
              }
            }
          }
          if (b.workspace_id) {
            await recordProvisioningEvent(env, b.workspace_id, "billing.zero_balance.owner_qa", {
              subscription_id,
              session_id: zeroSessionId,
              plan_id,
              amount_total: 0,
              currency: "usd",
              owner_approval_required: plan.owner_approval_required !== false,
              activation_path: plan.activation_path,
              skyemerit: skyeMeritCheckout
            }, "pending_owner_approval");
          }
          await audit(env, b.customer_email || b.customer_id || "system", "billing_zero_balance_confirmed", "subscription", subscription_id, {
            customer_id: b.customer_id || null,
            workspace_id: b.workspace_id || null,
            plan_id,
            stripe_bypassed: true,
            status: subStatus,
            skyemerit: skyeMeritCheckout
          });
          await email(env, "Zero-balance owner QA checkout recorded", `<h2>Zero-balance owner QA checkout recorded</h2><p>Workspace: ${b.workspace_id || "none"}</p><p>Plan: ${plan_id}</p><p>Session: ${zeroSessionId}</p><p>SkyeMerit: ${skyeMeritCheckout.code || skyeMeritCheckout.requested_code}</p>`);
          return json({ ok: true, zero_balance: true, subscription_id, checkout_url: successUrl.replace("{CHECKOUT_SESSION_ID}", zeroSessionId), stripe_session_id: null, session_id: zeroSessionId, payment_status: "no_payment_required", approval_status: subStatus, owner_approval_required: plan.owner_approval_required !== false, activation_path: plan.activation_path, plan_id, skyemerit: skyeMeritCheckout, persistence: env.SAAS_DB ? "d1" : "kv_fallback" });
        }

        const prices = STRIPE_PRICES[plan_id];
        if (!prices) {
          if (plan?.owner_approval_required) {
            return json({ ok: false, error: "owner_approved_plan_requires_custom_checkout", plan_id, checkout_url: plan.checkout_url, activation_path: plan.activation_path }, 409);
          }
          return json({ ok: false, error: `unknown_plan: ${plan_id}` }, 400);
        }
        const params = new URLSearchParams({
          mode: "payment",
          success_url: successUrl,
          cancel_url: cancelUrl,
          "metadata[workspace_id]": b.workspace_id || "",
          "metadata[customer_id]": b.customer_id || "",
          "metadata[plan_id]": plan_id,
          "metadata[subscription_id]": subscription_id,
          "metadata[monthly_price_id]": prices.monthly,
        });
        if (skyeMeritCheckout?.applied) {
          const item = skyeMeritCheckout.line_items[0];
          params.set("line_items[0][price_data][currency]", "usd");
          params.set("line_items[0][price_data][unit_amount]", String(item.amount_cents));
          params.set("line_items[0][price_data][product_data][name]", `${plan.name} Setup - SkyeMerit adjusted`);
          params.set("line_items[0][quantity]", "1");
          params.set("allow_promotion_codes", "false");
        } else {
          params.set("line_items[0][price]", prices.setup);
          params.set("line_items[0][quantity]", "1");
          params.set("allow_promotion_codes", "true");
        }
        for (const [key, value] of Object.entries(skyeMeritMetadata(skyeMeritCheckout))) {
          params.set(`metadata[${key}]`, String(value));
        }
        if (b.customer_email) params.set("customer_email", b.customer_email);

        const runtimeSandbox = boolEnv(env.SAAS_PROVIDER_RUNTIME_SANDBOX) || boolEnv(env.ZERO_OS_PROVIDER_SANDBOX);
        const runtimeCheckout = await runSaasProviderAction(env, {
          provider_id: "stripe",
          action: "stripe.checkout.create",
          workspace_id: b.workspace_id || "",
          customer_id: b.customer_id || "",
          client_id: b.client_id || b.customer_id || "",
          usage_lane: "saas:stripe_checkout",
          live: !runtimeSandbox,
          sandbox: runtimeSandbox,
          payload: { params: Object.fromEntries(params.entries()) }
        });
        const runtimeReceipt = runtimeCheckout.response?.receipt || null;
        if (runtimeCheckout.response?.ok !== true) {
          return json({
            ok: false,
            error: runtimeReceipt?.error || "stripe_checkout_failed",
            provider_runtime_receipt_id: runtimeReceipt?.id || null,
            provider_runtime_status: runtimeReceipt?.status || null
          }, runtimeReceipt?.http_status || runtimeCheckout.status || 502);
        }
        const session = {
          id: runtimeReceipt.provider_result?.id,
          url: runtimeReceipt.provider_result?.url
        };

        if (env.SAAS_DB) await env.SAAS_DB.prepare("UPDATE subscriptions SET provider_subscription_id=? WHERE id=?").bind(session.id, subscription_id).run();
        if (env.SAAS_KV) {
          const s = await env.SAAS_KV.get(`subscription:${subscription_id}`, "json");
          if (s) {
            s.provider_subscription_id = session.id;
            s.provider_runtime_receipt_id = runtimeReceipt.id;
            s.provider_runtime_status = runtimeReceipt.status;
            await env.SAAS_KV.put(`subscription:${subscription_id}`, JSON.stringify(s));
          }
        }
        await audit(env, b.customer_email || b.customer_id || "system", "billing_checkout_provider_runtime_receipted", "subscription", subscription_id, {
          customer_id: b.customer_id || null,
          workspace_id: b.workspace_id || null,
          plan_id,
          provider_runtime_receipt_id: runtimeReceipt.id,
          provider_call_made: runtimeReceipt.provider_call_made,
          status: runtimeReceipt.status
        });
        return json({ ok: true, subscription_id, checkout_url: session.url, stripe_session_id: session.id, provider_runtime_receipt_id: runtimeReceipt.id, provider_runtime_status: runtimeReceipt.status, provider_call_made: runtimeReceipt.provider_call_made, plan_id, skyemerit: skyeMeritCheckout, persistence: env.SAAS_DB ? "d1" : "kv_fallback" });
      }

      if (path === "/api/saas/billing/webhook" && req.method === "POST") {
        const rawBody = await req.text();
        const sig = req.headers.get("stripe-signature") || "";
        if (!env.STRIPE_WEBHOOK_SECRET) return new Response("stripe_webhook_secret_required", { status: 503 });
        {
          const encoder = new TextEncoder();
          const parts = sig.split(",").reduce((acc, p) => { const [k, v] = p.split("="); acc[k] = v; return acc; }, {});
          const ts = parts.t; const v1 = parts.v1;
          if (!ts || !v1) return new Response("invalid_signature", { status: 400 });
          const key = await crypto.subtle.importKey("raw", encoder.encode(env.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
          const computed = await crypto.subtle.sign("HMAC", key, encoder.encode(`${ts}.${rawBody}`));
          const hex = Array.from(new Uint8Array(computed)).map(b => b.toString(16).padStart(2, "0")).join("");
          if (hex !== v1) return new Response("invalid_signature", { status: 400 });
        }
        let event; try { event = JSON.parse(rawBody); } catch { return new Response("invalid_json", { status: 400 }); }
        const webhookObject = event.data?.object || {};
        const providerRuntime = await mirrorSaasStripeWebhookProviderRuntime(env, event, webhookObject);
        if (event.type === "checkout.session.completed") {
          const session = webhookObject;
          const workspaceId = session.metadata?.workspace_id;
          const subscriptionId = session.metadata?.subscription_id;
          const planId = session.metadata?.plan_id || "";
          const plan = PLANS[planId] || null;
          const ownerApprovalRequired = plan?.owner_approval_required !== false;
          const workspaceStatus = ownerApprovalRequired ? "paid_pending_owner_approval" : "active";
          const subscriptionStatus = ownerApprovalRequired ? "paid_pending_owner_approval" : "active";
          const auditAction = ownerApprovalRequired ? "workspace_payment_confirmed_pending_owner_approval" : "workspace_activated";
          const provisioningEvent = ownerApprovalRequired ? "billing.checkout_completed.pending_owner_approval" : "billing.checkout_completed";
          const provisioningStatus = ownerApprovalRequired ? "pending_owner_approval" : "completed";
          const updated_at = now();
          if (workspaceId) {
            if (env.SAAS_DB) {
              await env.SAAS_DB.prepare("UPDATE workspaces SET status=?, updated_at=? WHERE id=?").bind(workspaceStatus, updated_at, workspaceId).run();
              if (subscriptionId) await env.SAAS_DB.prepare("UPDATE subscriptions SET status=?, provider_subscription_id=?, updated_at=? WHERE id=?").bind(subscriptionStatus, session.id, updated_at, subscriptionId).run();
            }
            if (env.SAAS_KV) {
              const ws = await env.SAAS_KV.get(`workspace:${workspaceId}`, "json");
              if (ws) { ws.status = workspaceStatus; ws.owner_approval_required = ownerApprovalRequired; ws.updated_at = updated_at; await env.SAAS_KV.put(`workspace:${workspaceId}`, JSON.stringify(ws)); }
            }
            await audit(env, "stripe_webhook", auditAction, "workspace", workspaceId, { stripe_session_id: session.id, subscription_id: subscriptionId, plan_id: planId, owner_approval_required: ownerApprovalRequired, provider_runtime: providerRuntime });
            await recordProvisioningEvent(env, workspaceId, provisioningEvent, { stripe_session_id: session.id, amount_total: session.amount_total, currency: session.currency, owner_approval_required: ownerApprovalRequired, activation_path: plan?.activation_path || "paid_pending_owner_approval", provider_runtime: providerRuntime, skyemerit: session.metadata?.skyemerit_code ? {
              applied: session.metadata.skyemerit_applied,
              code: session.metadata.skyemerit_code,
              discount_cents: session.metadata.skyemerit_discount_cents,
              adjusted_due_cents: session.metadata.skyemerit_adjusted_due_cents
            } : null }, provisioningStatus);
            await email(env, ownerApprovalRequired ? "Payment confirmed — owner approval pending" : "Payment confirmed — workspace active", `<h2>Payment received</h2><p>Workspace: ${workspaceId}</p><p>Stripe session: ${session.id}</p><p>Amount: $${((session.amount_total || 0) / 100).toFixed(2)} ${(session.currency || "usd").toUpperCase()}</p><p>${ownerApprovalRequired ? "Paid status is recorded. FS27 is holding activation for owner approval." : "Workspace activation is complete."}</p>`);
          }
        }
        return json({ received: true, provider_runtime: providerRuntime });
      }

      if (path === "/api/saas/billing/checkout-success") {
        const session_id = url.searchParams.get("session_id") || "";
        return new Response(`<!doctype html><html><body style="font-family:sans-serif;max-width:600px;margin:60px auto;text-align:center"><h1>Payment received</h1><p>Stripe confirmation records paid status. FS27 holds activation for owner approval before any paid workspace opens. You will receive a confirmation email shortly.</p><p style="color:#888;font-size:12px">Session: ${session_id}</p></body></html>`, { headers: { "content-type": "text/html" } });
      }

      if (path === "/api/saas/billing/checkout-cancel") {
        return new Response(`<!doctype html><html><body style="font-family:sans-serif;max-width:600px;margin:60px auto;text-align:center"><h1>Checkout cancelled</h1><p>No payment was collected. You can restart from the pricing page.</p></body></html>`, { headers: { "content-type": "text/html" } });
      }

      if (path === "/api/saas/customer-command" && req.method === "POST") {
        if (!await auth(req, env)) return json({ ok: false, error: "unauthorized_shared_gate_required" }, 401);
        const b = await body(req);
        const cmd_id = id("cmd");
        const omega = omegaScan(b.command_text || b.command || "");
        const route = routeCommand(b.command_text || b.command || "");
        if (omega.decision === "quarantine_for_admin_review") {
          route.primary = "0meg4kAI / Security QA Brain";
          route.secondary = "Main Automation Brain approval queue";
          route.approval_required = true;
        } else if (omega.decision === "approval_required") {
          route.secondary = "0meg4kAI / Security QA Brain";
          route.approval_required = true;
        }
        const command = { id: cmd_id, workspace_id: b.workspace_id || "", command_text: b.command_text || b.command || "", primary_brain: route.primary, secondary_brain: route.secondary, approval_required: !!route.approval_required, status: route.approval_required ? "approval_required" : "queued", created_at: now(), route, omega };
        if (env.SAAS_KV) await env.SAAS_KV.put(`customer_command:${cmd_id}`, JSON.stringify(command));
        if (env.SAAS_DB) await env.SAAS_DB.prepare("INSERT INTO customer_commands (id,workspace_id,command_text,primary_brain,secondary_brain,approval_required,status,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(cmd_id, command.workspace_id, command.command_text, route.primary, route.secondary, route.approval_required ? 1 : 0, command.status, command.created_at).run();
        if (route.approval_required) await email(env, "Customer command needs approval", `<h2>Approval needed</h2><p><b>Primary:</b> ${route.primary}</p><p><b>Secondary:</b> ${route.secondary}</p><pre>${b.command_text || b.command || ""}</pre>`);
        if (env.SAAS_QUEUE) await env.SAAS_QUEUE.send({ type: "customer_command", command_id: cmd_id, route, at: now() });
        await audit(env, b.workspace_id || "customer", "customer_command", "command", cmd_id, { ...b, route, omega, workspace_id: b.workspace_id || "" });
        return json({ ok: true, command_id: cmd_id, route, omega_review: omega, queued: !!env.SAAS_QUEUE, persistence: env.SAAS_DB ? "d1" : "kv_fallback", boundary: "customer commands never access owner Main Automation Brain or owner production connectors directly" });
      }

      if (path === "/api/saas/ledger") {
        if (!await auth(req, env)) return json({ ok: false, error: "unauthorized" }, 401);
        if (!env.SAAS_DB) {
          if (!env.SAAS_KV) return json({ ok: false, error: "SAAS_KV_not_bound" }, 500);
          const list = await env.SAAS_KV.list({ prefix: "audit:", limit: 100 });
          const rows = [];
          for (const k of list.keys) rows.push(await env.SAAS_KV.get(k.name, "json"));
          return json({ ok: true, rows: rows.filter(Boolean), persistence: "kv_fallback" });
        }
        const rows = await env.SAAS_DB.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100").all();
        return json({ ok: true, rows: rows.results || [] });
      }

      // ── SDK routes (/api/sdk/*) ────────────────────────────────────────────
      // All SDK routes validate via FS27 auth-card. No other credentials needed.

      if (path.startsWith("/api/sdk/")) {
        const sdkResult = await sdkAuth(req, env);
        if (!sdkResult.ok) return json({ ok: false, error: sdkResult.error, hint: "Pass your FS27 gate card token as Authorization: Bearer <token>" }, sdkResult.status);
        const { card } = sdkResult;
        const sdkWorkspaceId = card?.identity?.customer_id || null;

        // SDK init — validates token, returns workspace context + plan info
        if (path === "/api/sdk/init" || path === "/api/sdk/auth") {
          const planInfo = PLANS[card?.identity?.plan?.toLowerCase?.() || "starter-command"] || PLANS["starter-command"];
          await audit(env, card?.identity?.email || sdkWorkspaceId || "sdk", "sdk_init", "sdk", sdkWorkspaceId || "unknown", { principal: card?.principal, tier: card?.tier });
          return json({
            ok: true,
            sdk_version: "1.0.0",
            workspace_id: sdkWorkspaceId,
            principal: card?.principal,
            tier: card?.tier,
            identity: card?.identity,
            permissions: card?.permissions,
            budget: card?.budget,
            limits: card?.limits,
            vault: card?.vault,
            operations: card?.operations,
            plans: PLANS,
            gateway_url: env.SAAS_PUBLIC_URL || "https://sovereign-saas-provisioning-worker.graylondonskyes.workers.dev",
            fs27_url: env.FS27_URL || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev",
            sovereign_stack: SOVEREIGN_STACK
          });
        }

        // SDK command — brain routing with FS27 token auth
        if (path === "/api/sdk/command" && req.method === "POST") {
          const b = await body(req);
          const commandText = b.command_text || b.command || "";
          if (!commandText.trim()) return json({ ok: false, error: "command_text required" }, 400);
          const workspaceId = b.workspace_id || sdkWorkspaceId || "";

          const cmd_id = id("cmd");
          const omega = omegaScan(commandText);
          const route = routeCommand(commandText);
          if (omega.decision === "quarantine_for_admin_review") { route.primary = "0meg4kAI / Security QA Brain"; route.secondary = "Main Automation Brain approval queue"; route.approval_required = true; }
          else if (omega.decision === "approval_required") { route.secondary = "0meg4kAI / Security QA Brain"; route.approval_required = true; }

          const command = { id: cmd_id, workspace_id: workspaceId, command_text: commandText, primary_brain: route.primary, secondary_brain: route.secondary, approval_required: !!route.approval_required, status: route.approval_required ? "approval_required" : "queued", created_at: now(), route, omega, sdk: true, sdk_principal: card?.principal, sdk_tier: card?.tier };
          if (env.SAAS_KV) await env.SAAS_KV.put(`customer_command:${cmd_id}`, JSON.stringify(command));
          if (env.SAAS_DB) await env.SAAS_DB.prepare("INSERT INTO customer_commands (id,workspace_id,command_text,primary_brain,secondary_brain,approval_required,status,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(cmd_id, workspaceId, commandText, route.primary, route.secondary, route.approval_required ? 1 : 0, command.status, command.created_at).run();
          if (route.approval_required) await email(env, "Customer command needs approval", `<h2>Approval needed</h2><p><b>SDK principal:</b> ${card?.identity?.email || card?.principal}</p><p><b>Primary:</b> ${route.primary}</p><p><b>Secondary:</b> ${route.secondary}</p><pre>${commandText}</pre>`);
          if (env.SAAS_QUEUE) await env.SAAS_QUEUE.send({ type: "customer_command", command_id: cmd_id, route, sdk: true, at: now() });
          await audit(env, card?.identity?.email || workspaceId || "sdk", "sdk_command", "command", cmd_id, { commandText, route, omega, workspace_id: workspaceId, sdk_principal: card?.principal });
          return json({ ok: true, command_id: cmd_id, route, omega_review: omega, approval_required: route.approval_required, queued: !!env.SAAS_QUEUE, workspace_id: workspaceId, sdk: true });
        }

        // SDK workspace status
        if (path === "/api/sdk/workspace") {
          const visuals = await buildCustomerVisuals(env, sdkWorkspaceId || "");
          const planId = card?.identity?.plan || "starter-command";
          return json({ ok: true, workspace_id: sdkWorkspaceId, plan: planId, plan_info: PLANS[planId] || null, budget: card?.budget, limits: card?.limits, vault: card?.vault, visuals: visuals || null });
        }

        // SDK command history
        if (path === "/api/sdk/commands") {
          const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
          if (!sdkWorkspaceId) return json({ ok: false, error: "workspace_id_not_in_card" }, 400);
          const rows = await safeAll(env, "SELECT * FROM customer_commands WHERE workspace_id=? ORDER BY created_at DESC LIMIT ?", [sdkWorkspaceId, limit]);
          return json({ ok: true, rows, workspace_id: sdkWorkspaceId });
        }

        // SDK proof ledger (scoped to workspace)
        if (path === "/api/sdk/proof/ledger") {
          const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
          if (!sdkWorkspaceId) return json({ ok: false, error: "workspace_id_not_in_card" }, 400);
          const rows = await safeAll(env, "SELECT * FROM audit_log WHERE actor=? OR resource_id=? ORDER BY created_at DESC LIMIT ?", [sdkWorkspaceId, sdkWorkspaceId, limit]);
          return json({ ok: true, rows, workspace_id: sdkWorkspaceId });
        }

        // SDK proof receipt (single event)
        if (path === "/api/sdk/proof/receipt") {
          const resourceId = url.searchParams.get("id") || "";
          if (!resourceId) return json({ ok: false, error: "id required" }, 400);
          const row = await safeFirst(env, "SELECT * FROM audit_log WHERE id=? AND (actor=? OR resource_id=?) LIMIT 1", [resourceId, sdkWorkspaceId, resourceId]);
          if (!row) return json({ ok: false, error: "receipt_not_found" }, 404);
          return json({ ok: true, receipt: row });
        }

        // SDK billing status
        if (path === "/api/sdk/billing/status") {
          if (!sdkWorkspaceId) return json({ ok: false, error: "workspace_id_not_in_card" }, 400);
          const sub = await safeFirst(env, "SELECT * FROM subscriptions WHERE workspace_id=? ORDER BY created_at DESC LIMIT 1", [sdkWorkspaceId]);
          const ws = await safeFirst(env, "SELECT id,status,plan_id,company_name FROM workspaces WHERE id=? LIMIT 1", [sdkWorkspaceId]);
          return json({ ok: true, workspace_id: sdkWorkspaceId, workspace: ws || null, subscription: sub || null });
        }

        return json({ ok: false, error: "unknown_sdk_path", path }, 404);
      }

      return json({ ok: false, error: "not_found", path }, 404);
    } catch (err) {
      return json({ ok: false, error: String(err?.message || err) }, 500);
    }
  }
};
