import crypto from "crypto";
import { wrap } from "./_lib/wrap.js";
import { buildCors, getBearer, json } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { verifyJwt } from "./_lib/crypto.js";
import { verifyAccessToken } from "./_lib/oauth.js";
import { verifySessionToken } from "./_lib/sessions.js";
import { audit } from "./_lib/audit.js";

let crmSchemaPromise = null;

const LEAD_STATUSES = new Set(["new", "qualified", "filtered", "urgent", "quoted", "booked", "won", "lost", "archived"]);
const URGENCIES = new Set(["low", "normal", "high", "emergency"]);
const CALLER_TYPES = new Set(["lead", "customer", "vendor", "spam", "unknown"]);
const BOOKING_STATUSES = new Set(["requested", "confirmed", "completed", "cancelled", "no_show"]);
const FOLLOWUP_STATUSES = new Set(["pending", "sent", "paused", "cancelled", "completed"]);
const REVIEW_STATUSES = new Set(["requested", "sent", "posted", "private_feedback", "cancelled"]);
const PROVIDER_ACTIONS = new Set([
  "send-sms",
  "send-email",
  "create-calendar-event",
  "payment-handoff",
  "request-review",
  "provision-workspace",
  "rollback"
]);

function randomId() {
  return crypto.randomUUID();
}

function normalizeText(value, max = 400) {
  return String(value || "").trim().slice(0, max);
}

function normalizePhone(value) {
  return normalizeText(value, 80).replace(/[^\d+]/g, "").slice(0, 32);
}

function normalizeEmail(value) {
  return normalizeText(value, 320).toLowerCase();
}

function normalizeCents(value) {
  const raw = Number(value || 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.round(raw);
}

function normalizeDollarsToCents(value) {
  const raw = Number(value || 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.round(raw * 100);
}

function estimatedValueCents(body) {
  if (body.estimated_value_cents !== undefined && body.estimated_value_cents !== "") {
    return normalizeCents(body.estimated_value_cents);
  }
  return normalizeDollarsToCents(body.estimated_value ?? body.value);
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function enumValue(value, allowed, fallback) {
  const candidate = normalizeText(value, 80).toLowerCase();
  return allowed.has(candidate) ? candidate : fallback;
}

function boolEnv(name) {
  return /^(1|true|yes|on)$/i.test(String(process.env[name] || "").trim());
}

function hasEnv(...names) {
  return names.some((name) => !!String(process.env[name] || "").trim());
}

function firstEnv(...names) {
  for (const name of names) {
    const value = String(process.env[name] || "").trim();
    if (value) return value;
  }
  return "";
}

function redact(value) {
  const text = normalizeText(value, 120);
  if (!text) return "";
  if (text.length <= 6) return "***";
  return `${text.slice(0, 3)}...${text.slice(-3)}`;
}

function providerDecisions() {
  const twilioReady = hasEnv("TWILIO_ACCOUNT_SID", "SKYGATEFS13_TWILIO_ACCOUNT_SID")
    && hasEnv("TWILIO_AUTH_TOKEN", "SKYGATEFS13_TWILIO_AUTH_TOKEN")
    && hasEnv("TWILIO_PHONE_NUMBER", "SKYGATEFS13_TWILIO_PHONE_NUMBER");
  const resendReady = hasEnv("RESEND_API_KEY") && hasEnv("RESEND_FROM_EMAIL", "RESEND_FROM", "MAIL_FROM");
  const smtpReady = hasEnv("SMTP_HOST") && hasEnv("SMTP_USER") && hasEnv("SMTP_PASS");
  const googleCalendarReady = hasEnv("GOOGLE_CALENDAR_ID")
    && hasEnv("GOOGLE_CLIENT_EMAIL")
    && hasEnv("GOOGLE_PRIVATE_KEY");
  const stripeReady = hasEnv("STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY_LIVE");
  const squareReady = hasEnv("SQUARE_WEBHOOK_SIGNATURE_KEY", "PHC_SQUARE_WEBHOOK_SIGNATURE_KEY");
  const paypalReady = hasEnv("PAYPAL_CLIENT_ID") && hasEnv("PAYPAL_CLIENT_SECRET");
  const storageReady = hasEnv("NETLIFY_DATABASE_URL", "DATABASE_URL", "NEON_DATABASE_URL", "METRAIYUX_0S_D1_NEXUS_ID", "METRAIYUX_0S_KV_NEXUS_ID", "CLOUDFLARE_R2_ACCESS_KEY");
  const northStarReady = hasEnv("NORTHSTAR_API_BASE_URL", "NORTHSTAR_CANONICAL_BASE_URL", "NORTHSTAR_WORKSPACE_COUNT");
  const reviewUrl = firstEnv("VANTACORE_GOOGLE_REVIEW_URL", "GOOGLE_REVIEW_URL", "SKYES_REVIEWS_PUBLIC_URL", "SKYES_REVIEWS_URL");

  return {
    generated_at: new Date().toISOString(),
    provider_policy: "fs27-owned",
    live_action_default: "dry_run",
    live_action_rule: "External writes only happen when a request explicitly sends live=true and the provider is configured.",
    lanes: {
      phone_sms: {
        owner: "FS27",
        provider: "Twilio Programmable Messaging",
        status: twilioReady ? "configured" : "missing_credentials",
        env_aliases: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER", "SKYGATEFS13_TWILIO_*"],
        actions: ["send-sms", "missed-call-recovery", "review-link-sms"]
      },
      email: {
        owner: "SkyeMail / FS27",
        provider: resendReady ? "Resend" : (smtpReady ? "SMTP fallback" : "Resend preferred"),
        status: resendReady || smtpReady ? "configured" : "missing_credentials",
        env_aliases: ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "MAIL_FROM", "SMTP_*"],
        actions: ["send-email", "quote-followup", "review-link-email"]
      },
      calendar_dispatch: {
        owner: "VantaCore booking intent / RouteX-HouseOps dispatch boundary",
        provider: "Google Calendar service account",
        status: googleCalendarReady ? "configured" : "missing_credentials",
        env_aliases: ["GOOGLE_CALENDAR_ID", "GOOGLE_CLIENT_EMAIL", "GOOGLE_PRIVATE_KEY"],
        actions: ["create-calendar-event"]
      },
      reviews: {
        owner: "VantaCore review router",
        provider: reviewUrl ? "Configured public review URL" : "Private feedback first, public review URL pending",
        status: reviewUrl ? "configured" : "needs_review_url",
        public_url_hint: reviewUrl ? redact(reviewUrl) : "",
        actions: ["request-review", "private-feedback-route"]
      },
      payments: {
        owner: "SkyePay / FS27 owner approval",
        provider: stripeReady ? "Stripe via SkyePay" : (paypalReady ? "PayPal available, SkyePay primary still preferred" : (squareReady ? "Square available, SkyePay primary still preferred" : "SkyePay route pending provider")),
        status: stripeReady ? "configured" : (paypalReady || squareReady ? "alternate_provider_available" : "missing_credentials"),
        env_aliases: ["STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY_LIVE", "PAYPAL_*", "SQUARE_*"],
        actions: ["payment-handoff"]
      },
      storage: {
        owner: "FS27 records and audit ledger",
        provider: "Neon/Postgres now, Cloudflare D1/KV/R2 available for expansion",
        status: storageReady ? "configured" : "missing_credentials",
        env_aliases: ["NETLIFY_DATABASE_URL", "DATABASE_URL", "NEON_DATABASE_URL", "METRAIYUX_0S_D1_*", "METRAIYUX_0S_KV_*", "CLOUDFLARE_R2_*"],
        actions: ["tenant-scoped-records", "provider-receipts"]
      },
      provisioning: {
        owner: "NorthStar / FS27 operator provisioning",
        provider: "NorthStar workspace provisioning",
        status: northStarReady ? "configured" : "operator_route_available",
        env_aliases: ["NORTHSTAR_API_BASE_URL", "NORTHSTAR_CANONICAL_BASE_URL", "NORTHSTAR_WORKSPACE_COUNT"],
        actions: ["provision-workspace"]
      },
      rollback_receipts: {
        owner: "FS27 audit",
        provider: "fs27_vantacore_provider_receipts",
        status: "configured",
        actions: ["rollback", "provider-failure-receipt"]
      }
    }
  };
}

function routeParts(pathname) {
  return pathname
    .replace(/^\/api\/vantacore\/crm\/?/, "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function getGateSessionToken(req) {
  const bearer = getBearer(req);
  if (bearer) return bearer;

  for (const header of ["x-skye-gate-session", "x-skygate-session", "x-fs27-session"]) {
    const token = normalizeText(req.headers.get(header), 4096);
    if (token) return token;
  }

  const cookie = req.headers.get("cookie") || req.headers.get("Cookie") || "";
  for (const name of ["skyegate_session", "fs27_session", "skygatefs27_session"]) {
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    if (!match) continue;
    const value = normalizeText(decodeURIComponent(match[1] || ""), 4096);
    if (!value) continue;
    try {
      const parsed = JSON.parse(value);
      const token = normalizeText(parsed?.token || parsed?.session?.token || parsed?.session_token || parsed?.access_token, 4096);
      if (token) return token;
    } catch {}
    return value;
  }

  return null;
}

async function ensureCrmSchema() {
  if (crmSchemaPromise) return crmSchemaPromise;
  crmSchemaPromise = (async () => {
    const statements = [
      `create table if not exists fs27_vantacore_contacts (
        id uuid primary key,
        tenant_key text not null,
        name text not null,
        phone text,
        email text,
        company text,
        tags text[] not null default '{}'::text[],
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create index if not exists fs27_vantacore_contacts_tenant_idx on fs27_vantacore_contacts(tenant_key, created_at desc);`,
      `create index if not exists fs27_vantacore_contacts_lookup_idx on fs27_vantacore_contacts(tenant_key, lower(coalesce(email,'')), coalesce(phone,''));`,

      `create table if not exists fs27_vantacore_leads (
        id uuid primary key,
        tenant_key text not null,
        contact_id uuid not null references fs27_vantacore_contacts(id) on delete cascade,
        source text not null default 'manual',
        service text not null default 'General inquiry',
        status text not null default 'new',
        urgency text not null default 'normal',
        caller_type text not null default 'lead',
        intent text not null default 'request_quote',
        quality_score integer not null default 50,
        estimated_value_cents integer not null default 0,
        owner_next_action text,
        notes text,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create index if not exists fs27_vantacore_leads_tenant_idx on fs27_vantacore_leads(tenant_key, created_at desc);`,
      `create index if not exists fs27_vantacore_leads_status_idx on fs27_vantacore_leads(tenant_key, status, urgency);`,

      `create table if not exists fs27_vantacore_activities (
        id uuid primary key,
        tenant_key text not null,
        lead_id uuid references fs27_vantacore_leads(id) on delete cascade,
        contact_id uuid references fs27_vantacore_contacts(id) on delete set null,
        actor text not null default 'vantacore',
        activity_type text not null,
        summary text not null,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists fs27_vantacore_activities_tenant_idx on fs27_vantacore_activities(tenant_key, created_at desc);`,

      `create table if not exists fs27_vantacore_bookings (
        id uuid primary key,
        tenant_key text not null,
        lead_id uuid references fs27_vantacore_leads(id) on delete set null,
        contact_id uuid not null references fs27_vantacore_contacts(id) on delete cascade,
        service text not null,
        start_at timestamptz not null,
        status text not null default 'requested',
        notes text,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create index if not exists fs27_vantacore_bookings_tenant_idx on fs27_vantacore_bookings(tenant_key, start_at desc);`,

      `create table if not exists fs27_vantacore_followups (
        id uuid primary key,
        tenant_key text not null,
        lead_id uuid references fs27_vantacore_leads(id) on delete cascade,
        contact_id uuid references fs27_vantacore_contacts(id) on delete set null,
        channel text not null default 'sms',
        scheduled_at timestamptz not null,
        status text not null default 'pending',
        template text not null default 'missed-call-recovery',
        notes text,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create index if not exists fs27_vantacore_followups_tenant_idx on fs27_vantacore_followups(tenant_key, scheduled_at desc);`,

      `create table if not exists fs27_vantacore_reviews (
        id uuid primary key,
        tenant_key text not null,
        lead_id uuid references fs27_vantacore_leads(id) on delete set null,
        contact_id uuid references fs27_vantacore_contacts(id) on delete set null,
        rating integer,
        sentiment text not null default 'unknown',
        status text not null default 'requested',
        public_url text,
        private_notes text,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create index if not exists fs27_vantacore_reviews_tenant_idx on fs27_vantacore_reviews(tenant_key, created_at desc);`,

      `create table if not exists fs27_vantacore_provider_receipts (
        id uuid primary key,
        tenant_key text not null,
        lead_id uuid references fs27_vantacore_leads(id) on delete set null,
        actor text not null,
        provider text not null,
        action text not null,
        mode text not null default 'dry_run',
        status text not null,
        external_id text,
        rollback_action text,
        rollback_status text not null default 'not_required',
        request jsonb not null default '{}'::jsonb,
        response jsonb not null default '{}'::jsonb,
        error text,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists fs27_vantacore_provider_receipts_tenant_idx on fs27_vantacore_provider_receipts(tenant_key, created_at desc);`,
      `create index if not exists fs27_vantacore_provider_receipts_action_idx on fs27_vantacore_provider_receipts(tenant_key, action, status, created_at desc);`
    ];

    for (const statement of statements) {
      await q(statement);
    }
  })();
  return crmSchemaPromise;
}

async function resolveAccess(req, url) {
  const token = getGateSessionToken(req);
  if (token) {
    const session = await verifySessionToken(token);
    if (session?.session) {
      const customerId = session.session.customer_id || session.claims?.customer_id || session.user?.primary_customer_id || null;
      return {
        actor: session.user?.email || session.claims?.email || session.claims?.sub || "fs27-session",
        role: session.user?.role || session.claims?.role || "user",
        tenantKey: customerId ? `fs27-customer-${customerId}` : `fs27-session-${session.session.id}`,
        customerId
      };
    }

    const access = await verifyAccessToken(token).catch(() => null);
    if (access?.payload) {
      const customerId = access.payload.customer_id || access.payload.primary_customer_id || null;
      return {
        actor: access.payload.email || access.payload.sub || "fs27-access-token",
        role: access.payload.role || "user",
        tenantKey: customerId ? `fs27-customer-${customerId}` : normalizeText(req.headers.get("x-vantacore-tenant") || url.searchParams.get("tenant") || "fs27-owner", 120),
        customerId
      };
    }

    const jwt = (() => {
      try { return verifyJwt(token); } catch { return null; }
    })();
    if (jwt && ["founder", "owner", "admin"].includes(String(jwt.role || jwt.auth_role || "").toLowerCase())) {
      return {
        actor: jwt.email || jwt.sub || jwt.user_id || "fs27-admin-token",
        role: jwt.auth_role || jwt.role || "admin",
        tenantKey: normalizeText(req.headers.get("x-vantacore-tenant") || url.searchParams.get("tenant") || "fs27-owner", 120),
        customerId: null
      };
    }
  }

  return null;
}

async function recordActivity({ tenantKey, leadId = null, contactId = null, actor = "vantacore", type, summary, metadata = {} }) {
  await q(
    `insert into fs27_vantacore_activities(id, tenant_key, lead_id, contact_id, actor, activity_type, summary, metadata)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [randomId(), tenantKey, leadId, contactId, actor, type, summary, JSON.stringify(metadata || {})]
  );
}

async function recordProviderReceipt({
  access,
  provider,
  action,
  mode = "dry_run",
  status,
  leadId = null,
  externalId = null,
  rollbackAction = null,
  rollbackStatus = "not_required",
  request = {},
  response = {},
  error = null
}) {
  const receiptId = randomId();
  const inserted = await q(
    `insert into fs27_vantacore_provider_receipts(
       id, tenant_key, lead_id, actor, provider, action, mode, status, external_id,
       rollback_action, rollback_status, request, response, error
     )
     values ($1,$2,nullif($3,'')::uuid,$4,$5,$6,$7,$8,nullif($9,''),$10,$11,$12::jsonb,$13::jsonb,$14)
     returning *`,
    [
      receiptId,
      access.tenantKey,
      leadId || "",
      access.actor || "vantacore",
      provider,
      action,
      mode,
      status,
      externalId || "",
      rollbackAction,
      rollbackStatus,
      JSON.stringify(request || {}),
      JSON.stringify(response || {}),
      error ? normalizeText(error, 1200) : null
    ]
  );
  await audit(access.actor || "vantacore", "VANTACORE_PROVIDER_RECEIPT", `receipt:${receiptId}`, {
    source_app: "vantacore-service-crm",
    tenant_key: access.tenantKey,
    provider,
    action,
    mode,
    status,
    lead_id: leadId || null
  });
  return inserted.rows[0];
}

function classifyIntake(text) {
  const value = normalizeText(text, 1600).toLowerCase();
  const vendor = /(seo|marketing agency|rank your|sell you|vendor|supplier|wholesale|advertising package)/i.test(value);
  const spam = /(crypto|loan offer|warranty|extended warranty|casino|prize)/i.test(value);
  const emergency = /(burst|flood|leak|emergency|no heat|no ac|locked out|same day|urgent|water everywhere)/i.test(value);
  const booking = /(book|schedule|appointment|available|come out|visit|tomorrow|today)/i.test(value);
  const quote = /(quote|price|cost|estimate|how much)/i.test(value);

  if (spam) return { callerType: "spam", urgency: "low", intent: "block", qualityScore: 5, status: "filtered" };
  if (vendor) return { callerType: "vendor", urgency: "low", intent: "vendor_intake", qualityScore: 10, status: "filtered" };
  if (emergency) return { callerType: "lead", urgency: "emergency", intent: "emergency_service", qualityScore: 95, status: "urgent" };
  if (booking) return { callerType: "lead", urgency: "high", intent: "book_appointment", qualityScore: 82, status: "qualified" };
  if (quote) return { callerType: "lead", urgency: "normal", intent: "request_quote", qualityScore: 72, status: "qualified" };
  return { callerType: "lead", urgency: "normal", intent: "general_inquiry", qualityScore: 55, status: "new" };
}

async function upsertContact(tenantKey, body) {
  const name = normalizeText(body.name || body.contact_name || "Unknown contact", 180);
  const phone = normalizeText(body.phone || body.contact_phone, 80);
  const email = normalizeEmail(body.email || body.contact_email);
  const company = normalizeText(body.company, 180);

  if (!name && !phone && !email) {
    const err = new Error("Contact name, phone, or email is required.");
    err.status = 400;
    throw err;
  }

  const existing = (phone || email)
    ? await q(
        `select * from fs27_vantacore_contacts
         where tenant_key=$1
           and (($2 <> '' and phone=$2) or ($3 <> '' and lower(email)=lower($3)))
         order by updated_at desc
         limit 1`,
        [tenantKey, phone, email]
      )
    : { rows: [] };

  if (existing.rows[0]) {
    const contact = existing.rows[0];
    const updated = await q(
      `update fs27_vantacore_contacts
       set name=coalesce(nullif($2,''), name),
           phone=coalesce(nullif($3,''), phone),
           email=coalesce(nullif($4,''), email),
           company=coalesce(nullif($5,''), company),
           updated_at=now()
       where id=$1 and tenant_key=$6
       returning *`,
      [contact.id, name, phone, email, company, tenantKey]
    );
    return updated.rows[0];
  }

  const inserted = await q(
    `insert into fs27_vantacore_contacts(id, tenant_key, name, phone, email, company, metadata)
     values ($1,$2,$3,nullif($4,''),nullif($5,''),nullif($6,''),$7::jsonb)
     returning *`,
    [randomId(), tenantKey, name || phone || email || "Unknown contact", phone, email, company, JSON.stringify(body.contact_metadata || {})]
  );
  return inserted.rows[0];
}

async function createLead(req, access, body) {
  const tenantKey = access.tenantKey;
  const content = normalizeText(body.content || body.notes || body.message, 1800);
  const decision = body.auto_classify === false ? {} : classifyIntake(content);
  const contact = await upsertContact(tenantKey, body);

  const source = normalizeText(body.source || body.channel || "manual", 80) || "manual";
  const service = normalizeText(body.service || body.requested_service || "General inquiry", 180) || "General inquiry";
  const status = enumValue(body.status || decision.status, LEAD_STATUSES, "new");
  const urgency = enumValue(body.urgency || decision.urgency, URGENCIES, "normal");
  const callerType = enumValue(body.caller_type || decision.callerType, CALLER_TYPES, "lead");
  const intent = normalizeText(body.intent || decision.intent || "request_quote", 120);
  const qualityScore = clampInt(body.quality_score ?? decision.qualityScore, 0, 100, 50);
  const estimatedCents = estimatedValueCents(body);
  const notes = content || normalizeText(body.notes, 1800);

  const inserted = await q(
    `insert into fs27_vantacore_leads(
       id, tenant_key, contact_id, source, service, status, urgency, caller_type, intent,
       quality_score, estimated_value_cents, owner_next_action, notes, metadata
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
     returning *`,
    [
      randomId(),
      tenantKey,
      contact.id,
      source,
      service,
      status,
      urgency,
      callerType,
      intent,
      qualityScore,
      estimatedCents,
      normalizeText(body.owner_next_action || (status === "filtered" ? "Review filtered intake" : "Qualify and respond"), 220),
      notes,
      JSON.stringify({ ...(body.metadata || {}), classifier: decision })
    ]
  );
  const lead = inserted.rows[0];
  await recordActivity({
    tenantKey,
    leadId: lead.id,
    contactId: contact.id,
    actor: access.actor,
    type: "lead.created",
    summary: `${contact.name} entered ${service} as ${status}`,
    metadata: { source, urgency, caller_type: callerType, intent }
  });
  await audit(access.actor, "VANTACORE_CRM_LEAD_CREATED", `lead:${lead.id}`, { source_app: "vantacore-service-crm", tenant_key: tenantKey, status, urgency });
  return { lead, contact };
}

async function listLeads(tenantKey, url) {
  const status = normalizeText(url.searchParams.get("status"), 80);
  const limit = clampInt(url.searchParams.get("limit"), 1, 250, 100);
  const result = await q(
    `select l.*, c.name as contact_name, c.phone as contact_phone, c.email as contact_email, c.company as contact_company
     from fs27_vantacore_leads l
     join fs27_vantacore_contacts c on c.id = l.contact_id
     where l.tenant_key=$1 and ($2='' or l.status=$2)
     order by
       case when l.urgency='emergency' then 0 when l.urgency='high' then 1 else 2 end,
       l.created_at desc
     limit $3`,
    [tenantKey, status, limit]
  );
  return result.rows;
}

async function patchLead(access, leadId, body) {
  const updates = [];
  const params = [];

  function set(field, value) {
    params.push(value);
    updates.push(`${field}=$${params.length}`);
  }

  if (body.status !== undefined) set("status", enumValue(body.status, LEAD_STATUSES, "new"));
  if (body.urgency !== undefined) set("urgency", enumValue(body.urgency, URGENCIES, "normal"));
  if (body.quality_score !== undefined) set("quality_score", clampInt(body.quality_score, 0, 100, 50));
  if (body.owner_next_action !== undefined) set("owner_next_action", normalizeText(body.owner_next_action, 220));
  if (body.notes !== undefined) set("notes", normalizeText(body.notes, 1800));
  if (body.estimated_value !== undefined || body.estimated_value_cents !== undefined) {
    set("estimated_value_cents", estimatedValueCents(body));
  }

  if (!updates.length) {
    const err = new Error("No supported lead fields were provided.");
    err.status = 400;
    throw err;
  }

  params.push(access.tenantKey, leadId);
  const result = await q(
    `update fs27_vantacore_leads
     set ${updates.join(", ")}, updated_at=now()
     where tenant_key=$${params.length - 1} and id=$${params.length}
     returning *`,
    params
  );
  if (!result.rows[0]) {
    const err = new Error("Lead not found.");
    err.status = 404;
    throw err;
  }
  const lead = result.rows[0];
  await recordActivity({
    tenantKey: access.tenantKey,
    leadId: lead.id,
    contactId: lead.contact_id,
    actor: access.actor,
    type: "lead.updated",
    summary: `Lead moved to ${lead.status}`,
    metadata: { status: lead.status, urgency: lead.urgency }
  });
  return lead;
}

async function createBooking(access, body) {
  const tenantKey = access.tenantKey;
  let contactId = normalizeText(body.contact_id, 80);
  let service = normalizeText(body.service, 180);
  const leadId = normalizeText(body.lead_id, 80);

  if (leadId && (!contactId || !service)) {
    const lead = await q(`select * from fs27_vantacore_leads where tenant_key=$1 and id=$2 limit 1`, [tenantKey, leadId]);
    if (!lead.rows[0]) {
      const err = new Error("Lead not found.");
      err.status = 404;
      throw err;
    }
    contactId = contactId || lead.rows[0].contact_id;
    service = service || lead.rows[0].service;
  }

  if (!contactId || !service || !body.start_at) {
    const err = new Error("Booking requires contact_id or lead_id, service, and start_at.");
    err.status = 400;
    throw err;
  }

  const status = enumValue(body.status, BOOKING_STATUSES, "confirmed");
  const inserted = await q(
    `insert into fs27_vantacore_bookings(id, tenant_key, lead_id, contact_id, service, start_at, status, notes, metadata)
     values ($1,$2,nullif($3,'')::uuid,$4,$5,$6,$7,$8,$9::jsonb)
     returning *`,
    [randomId(), tenantKey, leadId, contactId, service, new Date(body.start_at).toISOString(), status, normalizeText(body.notes, 1000), JSON.stringify(body.metadata || {})]
  );
  const booking = inserted.rows[0];
  if (leadId) {
    await q(`update fs27_vantacore_leads set status='booked', updated_at=now() where tenant_key=$1 and id=$2`, [tenantKey, leadId]);
  }
  await recordActivity({
    tenantKey,
    leadId: leadId || null,
    contactId,
    actor: access.actor,
    type: "booking.created",
    summary: `${service} booked for ${new Date(booking.start_at).toLocaleString("en-US")}`,
    metadata: { booking_id: booking.id, status }
  });
  return booking;
}

async function listBookings(tenantKey) {
  const result = await q(
    `select b.*, c.name as contact_name, c.phone as contact_phone, c.email as contact_email
     from fs27_vantacore_bookings b
     join fs27_vantacore_contacts c on c.id = b.contact_id
     where b.tenant_key=$1
     order by b.start_at desc
     limit 100`,
    [tenantKey]
  );
  return result.rows;
}

async function createFollowup(access, body) {
  const tenantKey = access.tenantKey;
  const leadId = normalizeText(body.lead_id, 80);
  let contactId = normalizeText(body.contact_id, 80);
  if (leadId && !contactId) {
    const lead = await q(`select contact_id from fs27_vantacore_leads where tenant_key=$1 and id=$2 limit 1`, [tenantKey, leadId]);
    contactId = lead.rows[0]?.contact_id || "";
  }
  if (!leadId && !contactId) {
    const err = new Error("Follow-up requires lead_id or contact_id.");
    err.status = 400;
    throw err;
  }
  const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at) : new Date(Date.now() + 60 * 60 * 1000);
  const inserted = await q(
    `insert into fs27_vantacore_followups(id, tenant_key, lead_id, contact_id, channel, scheduled_at, status, template, notes, metadata)
     values ($1,$2,nullif($3,'')::uuid,nullif($4,'')::uuid,$5,$6,$7,$8,$9,$10::jsonb)
     returning *`,
    [
      randomId(),
      tenantKey,
      leadId,
      contactId,
      normalizeText(body.channel || "sms", 40),
      scheduledAt.toISOString(),
      enumValue(body.status, FOLLOWUP_STATUSES, "pending"),
      normalizeText(body.template || "missed-call-recovery", 120),
      normalizeText(body.notes, 1000),
      JSON.stringify(body.metadata || {})
    ]
  );
  const followup = inserted.rows[0];
  await recordActivity({
    tenantKey,
    leadId: leadId || null,
    contactId: contactId || null,
    actor: access.actor,
    type: "followup.scheduled",
    summary: `${followup.channel} follow-up scheduled`,
    metadata: { followup_id: followup.id, template: followup.template }
  });
  return followup;
}

async function listFollowups(tenantKey) {
  const result = await q(
    `select f.*, c.name as contact_name, c.phone as contact_phone, l.service as lead_service
     from fs27_vantacore_followups f
     left join fs27_vantacore_contacts c on c.id = f.contact_id
     left join fs27_vantacore_leads l on l.id = f.lead_id
     where f.tenant_key=$1
     order by f.scheduled_at desc
     limit 100`,
    [tenantKey]
  );
  return result.rows;
}

async function createReview(access, body) {
  const tenantKey = access.tenantKey;
  const leadId = normalizeText(body.lead_id, 80);
  let contactId = normalizeText(body.contact_id, 80);
  if (leadId && !contactId) {
    const lead = await q(`select contact_id from fs27_vantacore_leads where tenant_key=$1 and id=$2 limit 1`, [tenantKey, leadId]);
    contactId = lead.rows[0]?.contact_id || "";
  }
  const rating = body.rating == null || body.rating === "" ? null : clampInt(body.rating, 1, 5, 5);
  const status = enumValue(body.status, REVIEW_STATUSES, rating && rating < 4 ? "private_feedback" : "requested");
  const inserted = await q(
    `insert into fs27_vantacore_reviews(id, tenant_key, lead_id, contact_id, rating, sentiment, status, public_url, private_notes, metadata)
     values ($1,$2,nullif($3,'')::uuid,nullif($4,'')::uuid,$5,$6,$7,nullif($8,''),$9,$10::jsonb)
     returning *`,
    [
      randomId(),
      tenantKey,
      leadId,
      contactId,
      rating,
      normalizeText(body.sentiment || (rating && rating >= 4 ? "positive" : rating ? "negative" : "unknown"), 80),
      status,
      normalizeText(body.public_url, 500),
      normalizeText(body.private_notes, 1200),
      JSON.stringify(body.metadata || {})
    ]
  );
  const review = inserted.rows[0];
  await recordActivity({
    tenantKey,
    leadId: review.lead_id,
    contactId: review.contact_id,
    actor: access.actor,
    type: "review.logged",
    summary: `Review ${review.status}${rating ? ` (${rating}/5)` : ""}`,
    metadata: { review_id: review.id, rating }
  });
  return review;
}

async function listReviews(tenantKey) {
  const result = await q(
    `select r.*, c.name as contact_name, c.phone as contact_phone
     from fs27_vantacore_reviews r
     left join fs27_vantacore_contacts c on c.id = r.contact_id
     where r.tenant_key=$1
     order by r.created_at desc
     limit 100`,
    [tenantKey]
  );
  return result.rows;
}

async function listProviderReceipts(tenantKey, url) {
  const action = normalizeText(url.searchParams.get("action"), 80);
  const limit = clampInt(url.searchParams.get("limit"), 1, 150, 60);
  const result = await q(
    `select *
     from fs27_vantacore_provider_receipts
     where tenant_key=$1 and ($2='' or action=$2)
     order by created_at desc
     limit $3`,
    [tenantKey, action, limit]
  );
  return result.rows;
}

async function providerStatus(tenantKey) {
  const receipts = await q(
    `select provider, action, status, mode, count(*)::int as count, max(created_at) as latest_at
     from fs27_vantacore_provider_receipts
     where tenant_key=$1
     group by provider, action, status, mode
     order by latest_at desc
     limit 40`,
    [tenantKey]
  ).catch(() => ({ rows: [] }));
  return {
    ...providerDecisions(),
    tenant_key: tenantKey,
    recent_receipts: receipts.rows
  };
}

async function loadLeadContext(tenantKey, leadId) {
  const cleanLeadId = normalizeText(leadId, 80);
  if (!cleanLeadId) return { lead: null, contact: null };
  const res = await q(
    `select l.*, c.name as contact_name, c.phone as contact_phone, c.email as contact_email, c.company as contact_company
     from fs27_vantacore_leads l
     join fs27_vantacore_contacts c on c.id = l.contact_id
     where l.tenant_key=$1 and l.id=$2
     limit 1`,
    [tenantKey, cleanLeadId]
  );
  const row = res.rows[0];
  if (!row) {
    const err = new Error("Lead not found.");
    err.status = 404;
    throw err;
  }
  return {
    lead: row,
    contact: {
      id: row.contact_id,
      name: row.contact_name,
      phone: row.contact_phone,
      email: row.contact_email,
      company: row.contact_company
    }
  };
}

async function loadBookingContext(tenantKey, bookingId) {
  const cleanBookingId = normalizeText(bookingId, 80);
  if (!cleanBookingId) return { booking: null, contact: null, lead: null };
  const res = await q(
    `select b.*, c.name as contact_name, c.phone as contact_phone, c.email as contact_email,
            l.status as lead_status, l.urgency as lead_urgency, l.estimated_value_cents as lead_value_cents
     from fs27_vantacore_bookings b
     join fs27_vantacore_contacts c on c.id = b.contact_id
     left join fs27_vantacore_leads l on l.id = b.lead_id
     where b.tenant_key=$1 and b.id=$2
     limit 1`,
    [tenantKey, cleanBookingId]
  );
  const row = res.rows[0];
  if (!row) {
    const err = new Error("Booking not found.");
    err.status = 404;
    throw err;
  }
  return {
    booking: row,
    contact: {
      id: row.contact_id,
      name: row.contact_name,
      phone: row.contact_phone,
      email: row.contact_email
    },
    lead: row.lead_id ? {
      id: row.lead_id,
      status: row.lead_status,
      urgency: row.lead_urgency,
      estimated_value_cents: row.lead_value_cents
    } : null
  };
}

function liveMode(body) {
  return body.live === true || String(body.mode || "").toLowerCase() === "live";
}

function makeMessageTemplate(kind, context, body = {}) {
  const lead = context.lead || {};
  const contact = context.contact || {};
  const service = normalizeText(body.service || lead.service || context.booking?.service || "your service request", 180);
  const reviewUrl = normalizeText(body.public_url || firstEnv("VANTACORE_GOOGLE_REVIEW_URL", "GOOGLE_REVIEW_URL", "SKYES_REVIEWS_PUBLIC_URL", "SKYES_REVIEWS_URL"), 500);
  const custom = normalizeText(body.message || body.body || body.notes, 1200);
  if (custom) return custom;
  if (kind === "review") {
    return reviewUrl
      ? `Thanks again${contact.name ? `, ${contact.name}` : ""}. If we earned it, would you leave a quick review? ${reviewUrl}`
      : `Thanks again${contact.name ? `, ${contact.name}` : ""}. Reply with a 1-5 rating and any feedback so we can route it correctly.`;
  }
  if (kind === "email") {
    return `Hi${contact.name ? ` ${contact.name}` : ""}, following up on ${service}. Reply here with any timing, address, or quote notes and we will keep the job moving.`;
  }
  return `Hi${contact.name ? ` ${contact.name}` : ""}, following up on ${service}. Reply with the best time and address and we will keep this moving.`;
}

async function sendTwilioSms({ to, body }) {
  const accountSid = firstEnv("TWILIO_ACCOUNT_SID", "SKYGATEFS13_TWILIO_ACCOUNT_SID");
  const authToken = firstEnv("TWILIO_AUTH_TOKEN", "SKYGATEFS13_TWILIO_AUTH_TOKEN");
  const from = firstEnv("TWILIO_PHONE_NUMBER", "SKYGATEFS13_TWILIO_PHONE_NUMBER");
  if (!accountSid || !authToken || !from) {
    const err = new Error("Twilio is not configured.");
    err.status = 501;
    throw err;
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
    method: "POST",
    headers: {
      "authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ To: to, From: from, Body: body })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Twilio returned ${res.status}`);
    err.status = res.status;
    err.providerResponse = data;
    throw err;
  }
  return { sid: data.sid, status: data.status, to: redact(to), from: redact(from) };
}

async function sendResendEmail({ to, subject, text }) {
  const apiKey = firstEnv("RESEND_API_KEY");
  const from = firstEnv("RESEND_FROM_EMAIL", "RESEND_FROM", "MAIL_FROM");
  if (!apiKey || !from) {
    const err = new Error("Resend is not configured.");
    err.status = 501;
    throw err;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ from, to: [to], subject, text })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Resend returned ${res.status}`);
    err.status = res.status;
    err.providerResponse = data;
    throw err;
  }
  return { id: data.id, to: redact(to), from: redact(from) };
}

function base64Url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function googlePrivateKey() {
  return firstEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");
}

async function googleAccessToken() {
  const clientEmail = firstEnv("GOOGLE_CLIENT_EMAIL");
  const privateKey = googlePrivateKey();
  if (!clientEmail || !privateKey) {
    const err = new Error("Google Calendar service account is not configured.");
    err.status = 501;
    throw err;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  }));
  const input = `${header}.${claim}`;
  const signature = crypto.createSign("RSA-SHA256").update(input).sign(privateKey, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${input}.${signature}`
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const err = new Error(data.error_description || data.error || `Google token returned ${res.status}`);
    err.status = res.status;
    err.providerResponse = data;
    throw err;
  }
  return data.access_token;
}

async function createGoogleCalendarEvent({ booking, contact, body }) {
  const calendarId = firstEnv("GOOGLE_CALENDAR_ID");
  if (!calendarId) {
    const err = new Error("GOOGLE_CALENDAR_ID is not configured.");
    err.status = 501;
    throw err;
  }
  const accessToken = await googleAccessToken();
  const start = new Date(body.start_at || booking.start_at);
  const end = new Date(start.getTime() + clampInt(body.duration_minutes, 15, 480, 60) * 60 * 1000);
  const event = {
    summary: normalizeText(body.title || `${booking.service} - ${contact.name || "VantaCore customer"}`, 220),
    description: normalizeText(body.description || booking.notes || "Created by VantaCore through FS27 provider control.", 1200),
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    attendees: contact.email ? [{ email: contact.email, displayName: contact.name || undefined }] : undefined,
    extendedProperties: {
      private: {
        source_app: "vantacore-service-crm",
        booking_id: booking.id,
        lead_id: booking.lead_id || ""
      }
    }
  };
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(event)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `Google Calendar returned ${res.status}`);
    err.status = res.status;
    err.providerResponse = data;
    throw err;
  }
  return { id: data.id, htmlLink: data.htmlLink || null, status: data.status || "confirmed" };
}

async function executeProviderAction(req, access, action, body) {
  if (!PROVIDER_ACTIONS.has(action)) {
    const err = new Error("Unsupported provider action.");
    err.status = 404;
    throw err;
  }

  const live = liveMode(body);
  const mode = live ? "live" : "dry_run";
  const leadId = normalizeText(body.lead_id, 80);
  const bookingId = normalizeText(body.booking_id, 80);
  const context = leadId ? await loadLeadContext(access.tenantKey, leadId) : { lead: null, contact: null };
  const bookingContext = bookingId ? await loadBookingContext(access.tenantKey, bookingId) : { booking: null, contact: null, lead: null };
  const lead = context.lead || bookingContext.lead;
  const contact = context.contact || bookingContext.contact || {};
  const requestSummary = {
    lead_id: lead?.id || leadId || null,
    booking_id: bookingContext.booking?.id || bookingId || null,
    live,
    channel: normalizeText(body.channel, 40),
    template: normalizeText(body.template, 120),
    to: body.to ? redact(body.to) : undefined,
    email: body.email ? redact(body.email) : undefined
  };

  let provider = "FS27";
  let response = {};
  let externalId = null;
  let status = "dry_run_ready";
  let rollbackAction = null;

  try {
    if (action === "send-sms") {
      provider = "Twilio";
      const to = normalizePhone(body.to || contact.phone);
      const message = makeMessageTemplate("sms", { lead, contact }, body);
      if (!to) throw Object.assign(new Error("SMS action requires a lead/contact phone or explicit to number."), { status: 400 });
      rollbackAction = "Record cancellation receipt; Twilio SMS cannot be unsent.";
      response = live ? await sendTwilioSms({ to, body: message }) : { dry_run: true, to: redact(to), body_preview: message.slice(0, 220) };
      externalId = response.sid || null;
      status = live ? "sent" : "dry_run_ready";
      if (live && lead?.id) {
        await q(`update fs27_vantacore_followups set status='sent', updated_at=now() where tenant_key=$1 and lead_id=$2 and channel='sms' and status='pending'`, [access.tenantKey, lead.id]);
      }
    }

    if (action === "send-email") {
      provider = "Resend";
      const to = normalizeEmail(body.to || body.email || contact.email);
      const text = makeMessageTemplate("email", { lead, contact }, body);
      const subject = normalizeText(body.subject || `Follow-up: ${lead?.service || "your service request"}`, 180);
      if (!to) throw Object.assign(new Error("Email action requires a lead/contact email or explicit to email."), { status: 400 });
      rollbackAction = "Record cancellation receipt; delivered email cannot be recalled.";
      response = live ? await sendResendEmail({ to, subject, text }) : { dry_run: true, to: redact(to), subject, text_preview: text.slice(0, 320) };
      externalId = response.id || null;
      status = live ? "sent" : "dry_run_ready";
      if (live && lead?.id) {
        await q(`update fs27_vantacore_followups set status='sent', updated_at=now() where tenant_key=$1 and lead_id=$2 and channel='email' and status='pending'`, [access.tenantKey, lead.id]);
      }
    }

    if (action === "create-calendar-event") {
      provider = "Google Calendar";
      const booking = bookingContext.booking || await createBooking(access, { ...body, lead_id: lead?.id || leadId });
      const bookingContact = bookingContext.contact || contact;
      rollbackAction = "Delete or cancel the created Google Calendar event by external_id.";
      response = live
        ? await createGoogleCalendarEvent({ booking, contact: bookingContact, body })
        : { dry_run: true, service: booking.service, start_at: booking.start_at, contact: bookingContact.name || "customer" };
      externalId = response.id || null;
      status = live ? "created" : "dry_run_ready";
    }

    if (action === "payment-handoff") {
      provider = "SkyePay";
      const origin = new URL(req.url).origin;
      const clientSlug = normalizeText(body.client_slug || body.client || "vantacore-service-crm", 120);
      const offerId = normalizeText(body.offer_id || body.offer || "service-crm-owner-approved", 160);
      const email = normalizeEmail(body.customer_email || body.email || contact.email);
      if (!email) throw Object.assign(new Error("Payment handoff requires customer_email or a lead/contact email."), { status: 400 });
      const amount = normalizeCents(body.amount_cents || lead?.estimated_value_cents || 0);
      rollbackAction = "Expire unpaid checkout session or void/refund payment through SkyePay/Stripe owner approval.";
      response = {
        dry_run: !live,
        checkout_endpoint: `${origin}/skyepay/checkout`,
        workspace_url: `${origin}/skyepay.html?client=${encodeURIComponent(clientSlug)}&offer=${encodeURIComponent(offerId)}`,
        provider: hasEnv("STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY_LIVE") ? "Stripe via SkyePay" : "SkyePay pending Stripe secret",
        customer_email: redact(email),
        amount_cents: amount,
        owner_approval_required: true
      };
      status = live ? "handoff_created" : "dry_run_ready";
    }

    if (action === "request-review") {
      provider = body.channel === "email" ? "Resend" : "Twilio";
      const reviewUrl = normalizeText(body.public_url || firstEnv("VANTACORE_GOOGLE_REVIEW_URL", "GOOGLE_REVIEW_URL", "SKYES_REVIEWS_PUBLIC_URL", "SKYES_REVIEWS_URL"), 500);
      const message = makeMessageTemplate("review", { lead, contact }, { ...body, public_url: reviewUrl });
      rollbackAction = "Cancel pending review request in VantaCore; delivered SMS/email cannot be unsent.";
      if (live && body.channel === "email") {
        const to = normalizeEmail(body.to || body.email || contact.email);
        if (!to) throw Object.assign(new Error("Email review request requires an email."), { status: 400 });
        response = await sendResendEmail({ to, subject: normalizeText(body.subject || "Quick review request", 180), text: message });
        externalId = response.id || null;
      } else if (live) {
        const to = normalizePhone(body.to || contact.phone);
        if (!to) throw Object.assign(new Error("SMS review request requires a phone number."), { status: 400 });
        response = await sendTwilioSms({ to, body: message });
        externalId = response.sid || null;
      } else {
        response = { dry_run: true, channel: body.channel === "email" ? "email" : "sms", review_url_configured: !!reviewUrl, body_preview: message.slice(0, 260) };
      }
      status = live ? "sent" : "dry_run_ready";
      if (lead?.id) await createReview(access, { lead_id: lead.id, status: live ? "sent" : "requested", public_url: reviewUrl, private_notes: "Review request routed through FS27 provider control." });
    }

    if (action === "provision-workspace") {
      provider = "NorthStar";
      const origin = new URL(req.url).origin;
      rollbackAction = "Suspend or archive provisioned NorthStar workspace through FS27 operator tools.";
      response = {
        dry_run: !live,
        operator_endpoint: `${origin}/northstar/operator/provision`,
        company_name: normalizeText(body.company_name || body.name || contact.company || contact.name || "VantaCore customer", 180),
        owner_email: redact(normalizeEmail(body.owner_email || contact.email)),
        source_app: "vantacore-service-crm",
        note: "Workspace provisioning stays NorthStar/FS27-owned. This receipt is the VantaCore handoff."
      };
      status = live ? "handoff_created" : "dry_run_ready";
    }

    if (action === "rollback") {
      provider = "FS27 audit";
      const receiptId = normalizeText(body.receipt_id, 80);
      rollbackAction = normalizeText(body.rollback_action || "manual-provider-rollback", 220);
      response = { dry_run: !live, receipt_id: receiptId || null, rollback_action: rollbackAction, note: "Rollback receipt recorded. Provider-native reversal must run in the owning lane." };
      status = live ? "rollback_recorded" : "dry_run_ready";
    }

    const receipt = await recordProviderReceipt({
      access,
      provider,
      action,
      mode,
      status,
      leadId: lead?.id || leadId || null,
      externalId,
      rollbackAction,
      rollbackStatus: live && externalId ? "available" : "not_required",
      request: requestSummary,
      response
    });
    await recordActivity({
      tenantKey: access.tenantKey,
      leadId: lead?.id || null,
      contactId: contact?.id || null,
      actor: access.actor,
      type: `provider.${action}`,
      summary: `${provider} ${action} ${status}`,
      metadata: { receipt_id: receipt.id, mode, provider, action }
    });
    return { ok: true, mode, provider, action, status, response, receipt };
  } catch (error) {
    const receipt = await recordProviderReceipt({
      access,
      provider,
      action,
      mode,
      status: "failed",
      leadId: lead?.id || leadId || null,
      rollbackAction,
      rollbackStatus: "not_required",
      request: requestSummary,
      response: error.providerResponse || {},
      error: error.message || String(error)
    });
    await recordActivity({
      tenantKey: access.tenantKey,
      leadId: lead?.id || null,
      contactId: contact?.id || null,
      actor: access.actor,
      type: `provider.${action}.failed`,
      summary: `${provider} ${action} failed`,
      metadata: { receipt_id: receipt.id, mode, provider, action, error: error.message || String(error) }
    });
    error.receipt = receipt;
    throw error;
  }
}

async function activity(tenantKey) {
  const result = await q(
    `select *
     from fs27_vantacore_activities
     where tenant_key=$1
     order by created_at desc
     limit 100`,
    [tenantKey]
  );
  return result.rows;
}

async function summary(tenantKey) {
  const [counts, pipeline, recent] = await Promise.all([
    q(
      `select
        count(*)::int as leads_total,
        count(*) filter (where status in ('qualified','quoted','booked'))::int as active_pipeline,
        count(*) filter (where urgency='emergency')::int as emergency_leads,
        count(*) filter (where status='filtered')::int as filtered_noise,
        coalesce(sum(estimated_value_cents),0)::int as estimated_value_cents,
        coalesce(avg(quality_score),0)::int as avg_quality_score,
        (select count(*)::int from fs27_vantacore_bookings where tenant_key=$1) as bookings_total,
        (select count(*)::int from fs27_vantacore_followups where tenant_key=$1 and status='pending') as pending_followups,
        (select count(*)::int from fs27_vantacore_reviews where tenant_key=$1 and status in ('requested','sent')) as review_requests
       from fs27_vantacore_leads
       where tenant_key=$1`,
      [tenantKey]
    ),
    q(
      `select status, count(*)::int as count, coalesce(sum(estimated_value_cents),0)::int as value_cents
       from fs27_vantacore_leads
       where tenant_key=$1
       group by status
       order by count desc`,
      [tenantKey]
    ),
    q(
      `select l.id, l.status, l.urgency, l.service, l.quality_score, l.estimated_value_cents, l.created_at,
              c.name as contact_name, c.phone as contact_phone, c.email as contact_email
       from fs27_vantacore_leads l
       join fs27_vantacore_contacts c on c.id = l.contact_id
       where l.tenant_key=$1
       order by l.created_at desc
       limit 8`,
      [tenantKey]
    )
  ]);
  return {
    tenant_key: tenantKey,
    metrics: counts.rows[0] || {},
    pipeline: pipeline.rows,
    recent_leads: recent.rows
  };
}

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });

  const url = new URL(req.url);
  const access = await resolveAccess(req, url);
  if (!access) return json(401, { error: "Inherited FS27/0S authority required." }, cors);

  await ensureCrmSchema();

  const parts = routeParts(url.pathname);
  const resource = parts[0] || "summary";
  const id = parts[1] || "";
  const action = parts[2] || "";
  const body = ["POST", "PATCH", "PUT"].includes(req.method) ? await req.json().catch(() => ({})) : {};

  if (req.method === "GET" && resource === "summary") return json(200, await summary(access.tenantKey), cors);
  if (req.method === "GET" && resource === "providers") return json(200, await providerStatus(access.tenantKey), cors);
  if (req.method === "GET" && resource === "provider-receipts") return json(200, { receipts: await listProviderReceipts(access.tenantKey, url) }, cors);
  if (req.method === "GET" && resource === "receipts") return json(200, { receipts: await listProviderReceipts(access.tenantKey, url) }, cors);
  if (req.method === "POST" && resource === "actions" && id) return json(200, await executeProviderAction(req, access, id, body), cors);
  if (req.method === "POST" && resource === "provider-actions" && id) return json(200, await executeProviderAction(req, access, id, body), cors);
  if (req.method === "PATCH" && resource === "leads" && id) return json(200, { lead: await patchLead(access, id, body) }, cors);
  if (req.method === "POST" && resource === "leads" && id && action === "book") return json(201, { booking: await createBooking(access, { ...body, lead_id: id }) }, cors);
  if (req.method === "GET" && resource === "leads") return json(200, { leads: await listLeads(access.tenantKey, url) }, cors);
  if (req.method === "POST" && (resource === "leads" || resource === "intake")) return json(201, await createLead(req, access, body), cors);

  if (req.method === "GET" && resource === "bookings") return json(200, { bookings: await listBookings(access.tenantKey) }, cors);
  if (req.method === "POST" && resource === "bookings") return json(201, { booking: await createBooking(access, body) }, cors);
  if (req.method === "GET" && resource === "followups") return json(200, { followups: await listFollowups(access.tenantKey) }, cors);
  if (req.method === "POST" && resource === "followups") return json(201, { followup: await createFollowup(access, body) }, cors);

  if (req.method === "GET" && resource === "reviews") return json(200, { reviews: await listReviews(access.tenantKey) }, cors);
  if (req.method === "POST" && resource === "reviews") return json(201, { review: await createReview(access, body) }, cors);

  if (req.method === "GET" && resource === "activity") return json(200, { activity: await activity(access.tenantKey) }, cors);

  return json(404, { error: "VantaCore CRM route not found." }, cors);
});
