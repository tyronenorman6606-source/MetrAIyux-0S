import { createSkyeMailClient, skymailConfigured } from "./skymail-sdk.js";

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
    checkout_url: "https://skyesol.netlify.app/skyepay.html?client=metraiyux-0s&offer=metraiyux-starter-command",
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment",
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
    tagline: "All 5 operating lanes. Full multi-provider intelligence.",
    monthly: 997,
    setup: 3500,
    skyepay_offer_id: "metraiyux-growth-cabinet",
    checkout_url: "https://skyesol.netlify.app/skyepay.html?client=metraiyux-0s&offer=metraiyux-growth-cabinet",
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment",
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
    tagline: "Dispatch, routes, stops, proof vaults, and workforce runtime proof.",
    monthly: 1497,
    setup: 6500,
    skyepay_offer_id: "metraiyux-routex-workforce-command",
    checkout_url: "https://skyesol.netlify.app/skyepay.html?client=metraiyux-0s&offer=metraiyux-routex-workforce-command",
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment",
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
    checkout_url: "https://skyesol.netlify.app/skyepay.html?client=metraiyux-0s&offer=metraiyux-autonomous-office",
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment",
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
    checkout_url: "https://skyesol.netlify.app/skyepay.html?client=metraiyux-0s&offer=metraiyux-enterprise-command",
    owner_approval_required: false,
    activation_path: "auto_unlock_after_confirmed_payment",
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
      provider, model, billable_input_per_1m_usd, billable_output_per_1m_usd
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
};

const SOVEREIGN_STACK = {
  thesis: "MetrAIyux 0S can run on its own VPS while FS27 tracks billing, auth, AI usage, caps, customer data visuals, and platform action telemetry.",
  lanes: [
    { id: "citadeldb", title: "CitadelDB", replaces: ["neon"], status: "owner_selectable_database_lane" },
    { id: "skyevault", title: "SkyeVault", replaces: ["google_drive", "github_repo_storage"], status: "owner_selectable_vault_lane" },
    { id: "skyemail", title: "SkyeMail", replaces: ["gmail_only_business_email"], status: "workspace_mailbox_lane" },
    { id: "skyepay", title: "SkyePay", replaces: ["manual_unlock_checkout"], status: "stripe_confirmed_auto_unlock_lane" },
    { id: "skyeroutex", title: "SkyeRouteX", replaces: ["loose_dispatch_spreadsheets", "unproven_route_ledgers"], status: "stripe_confirmed_auto_unlock_workforce_command_lane" },
    { id: "fs27", title: "SkyeGateFS27", replaces: ["loose_api_keys", "unmetered_ai"], status: "parent_gate_and_telemetry_lane" }
  ]
};

const PREVIEW_CLIENTS = {
  "bobs-smoke-shop": {
    client_id: "bobs-smoke-shop",
    client: "Bob's Smoke Shop",
    workspace_id: "bob-smoke-shop-preview-001",
    workspace_slug: "bobs-smoke-shop-private-preview",
    workspace: "Bob's Smoke Shop Private Preview",
    email: "bob@bobs-smoke-shop-preview.com",
    access_code: "BOBS-FREE-WEEK-2026",
    plan_id: "starter-command",
    status: "free_7_day_tester",
    preview_url: "https://bobs-smoke-shop-metraiyux-preview.pages.dev/",
    qr_url: "https://bobs-smoke-shop-metraiyux-preview.pages.dev/workspace-preview/",
    included_usage: { scans: 7, commands: 25, proof_exports: 5, tester_seats: 2 },
    services: ["website_scan", "specials_update", "inventory_content", "proof_export"],
    discount: "First six months discounted if Bob keeps the workspace after the free trial.",
    company_contact: { email: "SkyesOverLondonLC@solenterprises.org", phone: "(623) 260-7073", contact_page: "https://skyesol.netlify.app/contact" }
  }
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-saas-event-secret"
};

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: { "content-type": "application/json", ...cors }
});

const id = (p) => `${p}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();

async function body(req) {
  try { return await req.json(); } catch { return {}; }
}

function slugify(s) {
  return String(s || "workspace").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "workspace";
}

function auth(req, env) {
  const need = env.ADMIN_TOKEN;
  if (!need) return true;
  const got = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  return got === need;
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

function previewSession(client) {
  return {
    token: `preview_${client.client_id}_${Date.now()}`,
    client_id: client.client_id,
    workspace_id: client.workspace_id,
    workspace_slug: client.workspace_slug,
    client: client.client,
    email: client.email,
    workspace: client.workspace,
    status: client.status,
    expires_in_days: 7,
    issued_at: now()
  };
}

function previewPublic(client) {
  const { access_code, ...safe } = client;
  return safe;
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
  if (!env.RESEND_API_KEY || !env.ADMIN_APPROVAL_EMAIL || !env.RESEND_FROM_EMAIL) return { sent: false, reason: "resend_not_configured" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [env.ADMIN_APPROVAL_EMAIL], subject, html })
  });
  return { sent: res.ok, status: res.status, body: await res.text() };
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
  const workspaceId = workspace?.id || workspace?.workspace_id || "bob-smoke-shop-preview-001";
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
      activation: workspace?.activation || "auto_unlock_after_confirmed_skyepay_payment"
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

async function buildCustomerVisuals(env, workspaceId) {
  const idToFind = workspaceId || "bob-smoke-shop-preview-001";
  let workspace = await safeFirst(env, "SELECT * FROM workspaces WHERE id=? OR slug=? LIMIT 1", [idToFind, idToFind]);
  if (!workspace && env.SAAS_KV) {
    workspace = await env.SAAS_KV.get(`workspace:${idToFind}`, "json") || await env.SAAS_KV.get(`preview_workspace:${idToFind}`, "json");
  }
  if (!workspace && PREVIEW_CLIENTS["bobs-smoke-shop"]?.workspace_id === idToFind) {
    const client = PREVIEW_CLIENTS["bobs-smoke-shop"];
    workspace = { id: client.workspace_id, company_name: client.client, plan_id: client.plan_id, status: client.status };
  }
  if (!workspace) workspace = { id: idToFind, company_name: "Customer workspace", plan_id: "starter-command", status: "workspace_pending" };
  const plan = PLANS[workspace.plan_id] || PLANS["starter-command"];
  let stack = await safeFirst(env, "SELECT * FROM workspace_stack_lanes WHERE workspace_id=? LIMIT 1", [workspace.id]);
  if (!stack && env.SAAS_KV) stack = await env.SAAS_KV.get(`workspace_stack:${workspace.id}`, "json");
  const commands = await safeAll(env, "SELECT * FROM customer_commands WHERE workspace_id=? ORDER BY created_at DESC LIMIT 50", [workspace.id]);
  const events = await safeAll(env, "SELECT * FROM provisioning_events WHERE workspace_id=? ORDER BY created_at DESC LIMIT 50", [workspace.id]);
  return buildVisualRows(env, workspace, plan, stack || {}, commands, events);
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(req.url);
    const path = url.pathname;
    try {
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
          ai_rate_card: publicRateCard(),
          visual_data_kit: { endpoint: "/api/saas/customer-visuals", schema: "0s.customer_visuals.v1" },
          time: now()
        });
      }

      if (path === "/api/saas/plans") return json({ plans: publicPlans(), ai_rate_card: publicRateCard(), sovereign_stack: SOVEREIGN_STACK });
      if (path === "/api/saas/sovereign-stack") return json({ ok: true, sovereign_stack: SOVEREIGN_STACK, ai_rate_card: publicRateCard() });

      if (path === "/api/saas/customer-visuals") {
        if (String(env.CUSTOMER_VISUALS_PUBLIC || "").toLowerCase() !== "true" && !auth(req, env)) return json({ ok: false, error: "unauthorized" }, 401);
        const workspaceId = url.searchParams.get("workspace_id") || url.searchParams.get("workspace") || "bob-smoke-shop-preview-001";
        const visuals = await buildCustomerVisuals(env, workspaceId);
        await audit(env, workspaceId, "customer_visuals_view", "customer_visuals", workspaceId, { workspace_id: workspaceId, status: "rendered", billable: false });
        return json({ ok: true, visuals });
      }

      if (path === "/api/saas/action-event" && req.method === "POST") {
        const eventSecret = String(env.SAAS_ACTION_EVENT_SECRET || "").trim();
        if (eventSecret) {
          const got = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "") || req.headers.get("x-saas-event-secret") || "";
          if (got !== eventSecret) return json({ ok: false, error: "unauthorized_action_event" }, 401);
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
        const b = await body(req);
        const clientId = slugify(b.client_id || b.client || "bobs-smoke-shop");
        const client = PREVIEW_CLIENTS[clientId];
        if (!client) return json({ ok: false, error: "client_preview_not_found" }, 404);
        const emailIn = String(b.email || "").trim().toLowerCase();
        const code = String(b.access_code || b.accessCode || "").trim();
        if (emailIn !== client.email.toLowerCase() || code !== client.access_code) {
          await audit(env, emailIn || "preview-client", "client_login_failed", "preview_client", clientId, { client_id: clientId, email: emailIn });
          return json({ ok: false, error: "invalid_preview_access" }, 401);
        }
        const session = previewSession(client);
        await audit(env, emailIn, "client_login", "preview_client", clientId, { workspace_id: client.workspace_id });
        return json({ ok: true, session, workspace: previewPublic(client), next: `/saas/customer-dashboard.html?workspace=${client.workspace_id}` });
      }

      if (path === "/api/saas/client-preview") {
        const clientId = slugify(url.searchParams.get("client") || "bobs-smoke-shop");
        const client = PREVIEW_CLIENTS[clientId];
        if (!client) return json({ ok: false, error: "client_preview_not_found" }, 404);
        return json({ ok: true, workspace: previewPublic(client) });
      }

      if (path === "/api/saas/client-workspace/claim" && req.method === "POST") {
        const b = await body(req);
        const clientId = slugify(b.client_id || "bobs-smoke-shop");
        const client = PREVIEW_CLIENTS[clientId];
        if (!client) return json({ ok: false, error: "client_preview_not_found" }, 404);
        if (String(b.workspace_id || "") !== client.workspace_id) return json({ ok: false, error: "workspace_mismatch" }, 403);
        let existing = null;
        if (env.SAAS_DB) existing = await env.SAAS_DB.prepare("SELECT * FROM workspaces WHERE slug=? OR id=? LIMIT 1").bind(client.workspace_slug, client.workspace_id).first();
        else if (env.SAAS_KV) existing = await env.SAAS_KV.get(`preview_workspace:${client.workspace_id}`, "json");
        if (existing) {
          await audit(env, client.email, "client_workspace_claim_existing", "workspace", client.workspace_id, { client_id: clientId });
          return json({ ok: true, claimed: true, already_exists: true, workspace: existing, preview: previewPublic(client) });
        }
        const customer_id = id("cus");
        const workspace = {
          id: client.workspace_id,
          customer_id,
          company_name: client.client,
          slug: client.workspace_slug,
          plan_id: client.plan_id,
          status: "preview_workspace_claimed",
          approval_email: client.email,
          created_at: now(),
          updated_at: now(),
          services: client.services,
          database_lane: "citadeldb_or_neon_owner_choice",
          vault_lane: "skyevault",
          mail_lane: "skyemail"
        };
        const customer = { id: customer_id, full_name: "Bob Smoke Shop Preview User", email: client.email, company_name: client.client, phone: "", plan_id: client.plan_id, status: "preview_claimed", created_at: now() };
        if (env.SAAS_KV) {
          await env.SAAS_KV.put(`customer:${customer_id}`, JSON.stringify(customer));
          await env.SAAS_KV.put(`preview_workspace:${client.workspace_id}`, JSON.stringify(workspace));
        }
        if (env.SAAS_DB) {
          await env.SAAS_DB.prepare("INSERT INTO customers (id,full_name,email,company_name,phone,plan_id,status,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(customer.id, customer.full_name, customer.email, customer.company_name, customer.phone, customer.plan_id, customer.status, customer.created_at).run();
          await env.SAAS_DB.prepare("INSERT INTO workspaces (id,customer_id,company_name,slug,plan_id,status,approval_email,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(workspace.id, workspace.customer_id, workspace.company_name, workspace.slug, workspace.plan_id, workspace.status, workspace.approval_email, workspace.created_at, workspace.updated_at).run();
          for (const s of workspace.services) await env.SAAS_DB.prepare("INSERT INTO workspace_services (id,workspace_id,service_key,status,created_at) VALUES (?,?,?,?,?)").bind(id("svc"), workspace.id, String(s), "preview_included", now()).run();
        }
        const stackReceipt = await recordWorkspaceStackLanes(env, workspace);
        await recordProvisioningEvent(env, workspace.id, "client_preview.claimed", { client: previewPublic(client), stackReceipt }, "completed");
        await audit(env, client.email, "client_workspace_claim", "workspace", workspace.id, { client_id: clientId, services: workspace.services });
        return json({ ok: true, claimed: true, already_exists: false, workspace, preview: previewPublic(client), persistence: env.SAAS_DB ? "d1" : "kv_fallback" });
      }

      if (path === "/api/saas/signup" && req.method === "POST") {
        const b = await body(req);
        const customer_id = id("cus");
        const plan_id = b.plan_id || b.plan || "starter-command";
        const customer = { id: customer_id, full_name: b.full_name || "", email: b.email || "", company_name: b.company_name || "", phone: b.phone || "", plan_id, status: "signup_received", created_at: now() };
        if (env.SAAS_KV) await env.SAAS_KV.put(`customer:${customer_id}`, JSON.stringify(customer));
        if (env.SAAS_DB) await env.SAAS_DB.prepare("INSERT INTO customers (id,full_name,email,company_name,phone,plan_id,status,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(customer_id, customer.full_name, customer.email, customer.company_name, customer.phone, plan_id, customer.status, customer.created_at).run();
        await audit(env, b.email || "public", "signup", "customer", customer_id, b);
        return json({ ok: true, customer_id, plan_id, next: "create_workspace", persistence: env.SAAS_DB ? "d1" : "kv_fallback" });
      }

      if (path === "/api/saas/workspaces" && req.method === "POST") {
        const b = await body(req);
        const workspace_id = id("ws");
        const slug = slugify(b.company_name || b.slug || workspace_id);
        const plan_id = b.plan_id || "starter-command";
        const database_lane = String(b.database_lane || b.database_provider || "citadeldb_or_neon_owner_choice").slice(0, 80);
        const vault_lane = String(b.vault_lane || b.file_storage_provider || "skyevault").slice(0, 80);
        const mail_lane = String(b.mail_lane || b.email_provider || "skyemail").slice(0, 80);
        const workspace = { id: workspace_id, customer_id: b.customer_id || "", company_name: b.company_name || slug, slug, plan_id, status: "pending_provisioning", approval_email: b.approval_email || "", created_at: now(), updated_at: now(), services: Array.isArray(b.services) ? b.services : [], database_lane, vault_lane, mail_lane, sovereign_stack: SOVEREIGN_STACK };
        if (env.SAAS_KV) await env.SAAS_KV.put(`workspace:${workspace_id}`, JSON.stringify(workspace));
        if (env.SAAS_DB) {
          await env.SAAS_DB.prepare("INSERT INTO workspaces (id,customer_id,company_name,slug,plan_id,status,approval_email,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(workspace_id, workspace.customer_id, workspace.company_name, slug, plan_id, workspace.status, workspace.approval_email, workspace.created_at, workspace.updated_at).run();
          for (const s of workspace.services) await env.SAAS_DB.prepare("INSERT INTO workspace_services (id,workspace_id,service_key,status,created_at) VALUES (?,?,?,?,?)").bind(id("svc"), workspace_id, String(s), "selected", now()).run();
        }
        const owner = { email: b.owner_email || b.email || b.approval_email || "", full_name: b.full_name || b.owner_name || "" };
        const stackReceipt = await recordWorkspaceStackLanes(env, workspace);
        const skymail = await createSkyeMailClient(env).provisionWorkspaceMailbox(workspace, owner);
        const mailboxReceipt = await recordWorkspaceMailbox(env, workspace_id, skymail);
        const keyCard = await recordWorkspaceKeyCard(env, workspace, owner, skymail, mailboxReceipt);
        await recordProvisioningEvent(env, workspace_id, "sovereign_stack.selected", { database_lane, vault_lane, mail_lane, stackReceipt, stack: SOVEREIGN_STACK }, "recorded");
        await recordProvisioningEvent(env, workspace_id, "skymail.workspace_mailbox", { skymail, mailboxReceipt }, skymail.ok ? "completed" : skymail.skipped ? "skipped" : "needs_attention");
        await recordProvisioningEvent(env, workspace_id, "skymail.vault_key_card", { keyCard }, keyCard.mdp_status === "failed" ? "needs_attention" : "completed");
        if (env.SAAS_QUEUE) await env.SAAS_QUEUE.send({ type: "workspace_provisioning", workspace_id, plan_id, services: workspace.services, skymail: mailboxReceipt, at: now() });
        await audit(env, "system", "create_workspace", "workspace", workspace_id, { ...b, workspace_id, plan_id, database_lane, vault_lane, mail_lane });
        await email(env, "Workspace provisioning receipt", `<h2>Workspace provisioning recorded</h2><p>Workspace ${workspace_id} for ${b.company_name || slug} is pending provisioning.</p><p>Plan: ${plan_id}</p><p>Database lane: ${database_lane}</p><p>Vault lane: ${vault_lane}</p><p>Mail lane: ${mail_lane}</p><p>SkyeMail: ${mailboxReceipt.mailbox_email || mailboxReceipt.provisioning_status}</p><p>Vault key card: ${keyCard.setup_url}</p>`);
        return json({ ok: true, workspace_id, slug, status: "pending_provisioning", queued: !!env.SAAS_QUEUE, persistence: env.SAAS_DB ? "d1" : "kv_fallback", sovereign_stack: { database_lane, vault_lane, mail_lane, fs27_event_mirror: !!fs27MirrorUrl(env), receipt: stackReceipt }, skymail: { ok: skymail.ok, skipped: !!skymail.skipped, mailbox: mailboxReceipt, key_card: keyCard, response: skymail.data || null, error: skymail.error || null } });
      }

      if (path === "/api/saas/skymail/status") {
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
        const b = await body(req);
        const plan_id = b.plan_id || "starter-command";
        const prices = STRIPE_PRICES[plan_id];
        if (!prices) {
          const plan = PLANS[plan_id];
          if (plan?.owner_approval_required) {
            return json({ ok: false, error: "owner_approved_plan_requires_custom_checkout", plan_id, checkout_url: plan.checkout_url, activation_path: plan.activation_path }, 409);
          }
          return json({ ok: false, error: `unknown_plan: ${plan_id}` }, 400);
        }
        const stripeSecret = env.STRIPE_SECRET_KEY || env.STRIPE_SECRET;
        if (!stripeSecret) return json({ ok: false, error: "stripe_not_configured" }, 503);

        const subscription_id = id("sub");
        const sub = { id: subscription_id, customer_id: b.customer_id || "", workspace_id: b.workspace_id || "", plan_id, provider: "stripe", provider_subscription_id: "", status: "checkout_requested", created_at: now() };
        if (env.SAAS_KV) await env.SAAS_KV.put(`subscription:${subscription_id}`, JSON.stringify(sub));
        if (env.SAAS_DB) await env.SAAS_DB.prepare("INSERT INTO subscriptions (id,customer_id,workspace_id,plan_id,provider,provider_subscription_id,status,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(subscription_id, sub.customer_id, sub.workspace_id, plan_id, "stripe", "", "checkout_requested", sub.created_at).run();
        await audit(env, "system", "billing_checkout_started", "subscription", subscription_id, { plan_id, workspace_id: b.workspace_id });

        const baseUrl = env.SAAS_PUBLIC_URL || "https://sovereign-saas-provisioning-worker.graylondonskyes.workers.dev";
        const successUrl = `${baseUrl}/api/saas/billing/checkout-success?subscription_id=${subscription_id}&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${baseUrl}/api/saas/billing/checkout-cancel?subscription_id=${subscription_id}`;
        const params = new URLSearchParams({
          mode: "payment",
          "line_items[0][price]": prices.setup,
          "line_items[0][quantity]": "1",
          success_url: successUrl,
          cancel_url: cancelUrl,
          "metadata[workspace_id]": b.workspace_id || "",
          "metadata[customer_id]": b.customer_id || "",
          "metadata[plan_id]": plan_id,
          "metadata[subscription_id]": subscription_id,
          "metadata[monthly_price_id]": prices.monthly,
        });
        if (b.customer_email) params.set("customer_email", b.customer_email);

        const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: { Authorization: `Bearer ${stripeSecret}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString()
        });
        const session = await stripeRes.json();
        if (!stripeRes.ok) return json({ ok: false, error: "stripe_checkout_failed", stripe_error: session?.error?.message || session }, 502);

        if (env.SAAS_DB) await env.SAAS_DB.prepare("UPDATE subscriptions SET provider_subscription_id=? WHERE id=?").bind(session.id, subscription_id).run();
        if (env.SAAS_KV) {
          const s = await env.SAAS_KV.get(`subscription:${subscription_id}`, "json");
          if (s) { s.provider_subscription_id = session.id; await env.SAAS_KV.put(`subscription:${subscription_id}`, JSON.stringify(s)); }
        }
        return json({ ok: true, subscription_id, checkout_url: session.url, stripe_session_id: session.id, plan_id, persistence: env.SAAS_DB ? "d1" : "kv_fallback" });
      }

      if (path === "/api/saas/billing/webhook" && req.method === "POST") {
        const rawBody = await req.text();
        const sig = req.headers.get("stripe-signature") || "";
        if (env.STRIPE_WEBHOOK_SECRET) {
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
        if (event.type === "checkout.session.completed") {
          const session = event.data?.object || {};
          const workspaceId = session.metadata?.workspace_id;
          const subscriptionId = session.metadata?.subscription_id;
          const updated_at = now();
          if (workspaceId) {
            if (env.SAAS_DB) {
              await env.SAAS_DB.prepare("UPDATE workspaces SET status=?, updated_at=? WHERE id=?").bind("active", updated_at, workspaceId).run();
              if (subscriptionId) await env.SAAS_DB.prepare("UPDATE subscriptions SET status=?, provider_subscription_id=?, updated_at=? WHERE id=?").bind("active", session.id, updated_at, subscriptionId).run();
            }
            if (env.SAAS_KV) {
              const ws = await env.SAAS_KV.get(`workspace:${workspaceId}`, "json");
              if (ws) { ws.status = "active"; ws.updated_at = updated_at; await env.SAAS_KV.put(`workspace:${workspaceId}`, JSON.stringify(ws)); }
            }
            await audit(env, "stripe_webhook", "workspace_activated", "workspace", workspaceId, { stripe_session_id: session.id, subscription_id: subscriptionId });
            await recordProvisioningEvent(env, workspaceId, "billing.checkout_completed", { stripe_session_id: session.id, amount_total: session.amount_total, currency: session.currency }, "completed");
            await email(env, "Payment confirmed — workspace active", `<h2>Payment received</h2><p>Workspace: ${workspaceId}</p><p>Stripe session: ${session.id}</p><p>Amount: $${((session.amount_total || 0) / 100).toFixed(2)} ${(session.currency || "usd").toUpperCase()}</p>`);
          }
        }
        return json({ received: true });
      }

      if (path === "/api/saas/billing/checkout-success") {
        const session_id = url.searchParams.get("session_id") || "";
        return new Response(`<!doctype html><html><body style="font-family:sans-serif;max-width:600px;margin:60px auto;text-align:center"><h1>Payment received</h1><p>Your workspace unlocks automatically after Stripe confirms the payment webhook. You will receive a confirmation email shortly.</p><p style="color:#888;font-size:12px">Session: ${session_id}</p></body></html>`, { headers: { "content-type": "text/html" } });
      }

      if (path === "/api/saas/billing/checkout-cancel") {
        return new Response(`<!doctype html><html><body style="font-family:sans-serif;max-width:600px;margin:60px auto;text-align:center"><h1>Checkout cancelled</h1><p>No payment was collected. You can restart from the pricing page.</p></body></html>`, { headers: { "content-type": "text/html" } });
      }

      if (path === "/api/saas/customer-command" && req.method === "POST") {
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
        if (!auth(req, env)) return json({ ok: false, error: "unauthorized" }, 401);
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
