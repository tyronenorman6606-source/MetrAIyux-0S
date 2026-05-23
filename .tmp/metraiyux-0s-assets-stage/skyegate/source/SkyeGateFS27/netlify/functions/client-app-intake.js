import crypto from "crypto";
import { wrap } from "./_lib/wrap.js";
import { json, badRequest, getClientIp, getUserAgent } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { audit } from "./_lib/audit.js";
import { sendClientAppIntakeEmail } from "./_lib/emailAuth.js";
import { sendClientAppLeadToRelay13 } from "./_lib/relay13Bridge.js";

const DASHBOARD_URL = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/gateway/dashboard.html";

const CLIENTS = {
  "480-realty-property-management": {
    businessName: "480 Realty & Property Management",
    tenantKey: "client-app-480-realty-property-management",
    notifyEmail: "mario@480realtypm.com",
    appUrl: "https://480-realty-property-management.pages.dev/",
    workspaceId: "480-realty-property-management-preview-001",
    allowedHosts: ["480-realty-property-management.pages.dev"],
    relay13WorkspaceSlug: "480-realty-property-management",
    relay13WorkspaceId: "ws_480_realty_property_management",
    relay13AccountCode: "480-REALTY-PROPERTY-MANAGEMENT-SKM",
    connectlogCardId: "480-realty-property-management-client-workspace"
  },
  "dink-and-dine-pickle-park": {
    businessName: "Dink & Dine Pickle Park",
    tenantKey: "client-app-dink-and-dine-pickle-park",
    notifyEmail: "connect@dinkanddine.com",
    appUrl: "https://dink-and-dine-pickle-park.pages.dev/",
    workspaceId: "dink-and-dine-pickle-park-preview-001",
    allowedHosts: ["dink-and-dine-pickle-park.pages.dev"],
    relay13WorkspaceSlug: "dink-and-dine-pickle-park",
    relay13WorkspaceId: "ws_dink_and_dine_pickle_park",
    relay13AccountCode: "DINK-AND-DINE-PICKLE-PARK-SKM",
    connectlogCardId: "dink-and-dine-pickle-park-client-workspace"
  },
  "techbros-electronic-recycling-itad": {
    businessName: "Techbros Electronic Recycling & ITAD",
    tenantKey: "client-app-techbros-electronic-recycling-itad",
    notifyEmail: "recycle@techbrosaz.com",
    appUrl: "https://techbros-electronic-recycling-itad.pages.dev/",
    workspaceId: "techbros-electronic-recycling-itad-preview-001",
    allowedHosts: ["techbros-electronic-recycling-itad.pages.dev"],
    relay13WorkspaceSlug: "techbros-electronic-recycling-itad",
    relay13WorkspaceId: "ws_techbros_electronic_recycling_itad",
    relay13AccountCode: "TECHBROS-ELECTRONIC-RECYCLING-ITAD-SKM",
    connectlogCardId: "techbros-electronic-recycling-itad-client-workspace"
  },
  "empire-pallets": {
    businessName: "Empire Pallets",
    tenantKey: "client-app-empire-pallets",
    notifyEmail: "sales@empirepalletsaz.com",
    appUrl: "https://empire-pallets.pages.dev/",
    workspaceId: "empire-pallets-preview-001",
    allowedHosts: ["empire-pallets.pages.dev"],
    relay13WorkspaceSlug: "empire-pallets",
    relay13WorkspaceId: "ws_empire_pallets",
    relay13AccountCode: "EMPIRE-PALLETS-SKM",
    connectlogCardId: "empire-pallets-client-workspace"
  },
  "arclight-pictures": {
    businessName: "ArcLight Pictures",
    tenantKey: "client-app-arclight-pictures",
    notifyEmail: "info@arclightpictures.com",
    appUrl: "https://arclight-pictures.pages.dev/",
    workspaceId: "arclight-pictures-preview-001",
    allowedHosts: ["arclight-pictures.pages.dev"],
    relay13WorkspaceSlug: "arclight-pictures",
    relay13WorkspaceId: "ws_arclight_pictures",
    relay13AccountCode: "ARCLIGHT-PICTURES-SKM",
    connectlogCardId: "arclight-pictures-client-workspace"
  },
  "bobs-smoke-shop": {
    businessName: "Bob's Smoke Shop",
    tenantKey: "client-app-bobs-smoke-shop",
    notifyEmail: "bobsmokeshopaz@gmail.com",
    appUrl: "https://bobs-smoke-shop.pages.dev/",
    workspaceId: "bob-smoke-shop-preview-001",
    allowedHosts: ["bobs-smoke-shop.pages.dev"],
    relay13WorkspaceSlug: "bobs-smoke-shop",
    relay13WorkspaceId: "ws_bobs_smoke_shop",
    relay13AccountCode: "BOBS-SMOKE-SHOP-SKM",
    connectlogCardId: "bobs-smoke-shop-client-workspace"
  },
  "next-level-gaming-az": {
    businessName: "Next Level Gaming AZ",
    tenantKey: "client-app-next-level-gaming-az",
    notifyEmail: "nlgaming2023@gmail.com",
    appUrl: "https://next-level-gaming-az.pages.dev/",
    workspaceId: "next-level-gaming-preview-001",
    allowedHosts: ["next-level-gaming-az.pages.dev"],
    relay13WorkspaceSlug: "next-level-gaming-az",
    relay13WorkspaceId: "ws_next_level_gaming_az",
    relay13AccountCode: "NEXT-LEVEL-GAMING-AZ-SKM",
    connectlogCardId: "next-level-gaming-az-client-workspace"
  }
};

let intakeSchemaPromise = null;

function clean(value, max = 400) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeEmail(value) {
  return clean(value, 320).toLowerCase();
}

function sourceKey(value) {
  return clean(value, 120)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function uuid() {
  return crypto.randomUUID();
}

function clientCors(req, client = null) {
  const origin = req.headers.get("origin") || req.headers.get("Origin") || "";
  const headers = {
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "content-type": "application/json; charset=utf-8"
  };
  if (req.method === "OPTIONS" && origin) {
    headers["access-control-allow-origin"] = origin;
    headers.vary = "Origin";
    return headers;
  }
  if (!origin || isAllowedOrigin(origin, client)) {
    headers["access-control-allow-origin"] = origin || "*";
    if (origin) headers.vary = "Origin";
  } else {
    headers.vary = "Origin";
  }
  return headers;
}

function isLocalOrigin(origin) {
  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin, client = null) {
  if (!origin) return true;
  if (isLocalOrigin(origin)) return true;
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    const allowedHosts = client
      ? client.allowedHosts || []
      : Object.values(CLIENTS).flatMap((entry) => entry.allowedHosts || []);
    return allowedHosts.some((allowed) => {
      const normalized = String(allowed || "").toLowerCase();
      return hostname === normalized || hostname.endsWith(`.${normalized}`);
    });
  } catch {
    return false;
  }
}

async function ensureIntakeSchema() {
  if (intakeSchemaPromise) return intakeSchemaPromise;
  intakeSchemaPromise = (async () => {
    const statements = [
      `create table if not exists client_app_intakes (
        id uuid primary key,
        source_app text not null,
        workspace_id text,
        tenant_key text not null,
        business_name text not null,
        company text,
        contact text,
        email text,
        phone text,
        service text,
        area text,
        timing text,
        requirements text,
        page_url text,
        app_url text,
        status text not null default 'new',
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );`,
      `alter table client_app_intakes add column if not exists relay13_conversation_id text;`,
      `alter table client_app_intakes add column if not exists relay13_bridge_status text not null default 'pending';`,
      `alter table client_app_intakes add column if not exists relay13_bridge_error text;`,
      `alter table client_app_intakes add column if not exists relay13_bridge_payload jsonb not null default '{}'::jsonb;`,
      `create index if not exists client_app_intakes_source_created_idx on client_app_intakes(source_app, created_at desc);`,
      `create index if not exists client_app_intakes_tenant_created_idx on client_app_intakes(tenant_key, created_at desc);`,
      `create index if not exists client_app_intakes_relay13_idx on client_app_intakes(relay13_bridge_status, created_at desc);`,
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
        source text not null default 'client-app',
        service text not null default 'General inquiry',
        status text not null default 'new',
        urgency text not null default 'normal',
        caller_type text not null default 'lead',
        intent text not null default 'request_quote',
        quality_score integer not null default 65,
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
        actor text not null default 'client-app-intake',
        activity_type text not null,
        summary text not null,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );`,
      `create index if not exists fs27_vantacore_activities_tenant_idx on fs27_vantacore_activities(tenant_key, created_at desc);`
    ];
    for (const statement of statements) await q(statement);
  })();
  return intakeSchemaPromise;
}

async function upsertContact(tenantKey, body, metadata) {
  const name = clean(body.contact || body.name || body.contact_name || body.company || "Unknown contact", 180);
  const phone = clean(body.phone || body.contact_phone, 80);
  const email = normalizeEmail(body.email || body.contact_email);
  const company = clean(body.company || body.business || "", 180);
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
    const updated = await q(
      `update fs27_vantacore_contacts
       set name=coalesce(nullif($2,''), name),
           phone=coalesce(nullif($3,''), phone),
           email=coalesce(nullif($4,''), email),
           company=coalesce(nullif($5,''), company),
           metadata=coalesce(metadata,'{}'::jsonb) || $6::jsonb,
           updated_at=now()
       where id=$1 and tenant_key=$7
       returning *`,
      [existing.rows[0].id, name, phone, email, company, JSON.stringify(metadata || {}), tenantKey]
    );
    return updated.rows[0];
  }
  const inserted = await q(
    `insert into fs27_vantacore_contacts(id, tenant_key, name, phone, email, company, tags, metadata)
     values ($1,$2,$3,nullif($4,''),nullif($5,''),nullif($6,''),$7::text[],$8::jsonb)
     returning *`,
    [uuid(), tenantKey, name || phone || email || "Unknown contact", phone, email, company, ["client-app"], JSON.stringify(metadata || {})]
  );
  return inserted.rows[0];
}

function classifyUrgency(text) {
  const haystack = clean(text, 2000).toLowerCase();
  if (/(urgent|today|asap|emergency|same day|deadline|locked out|flood|data breach)/.test(haystack)) return "high";
  return "normal";
}

async function createCrmLead(client, body, intakeId, req) {
  const metadata = {
    intake_id: intakeId,
    source_app: body.source_app,
    workspace_id: body.workspace_id || client.workspaceId,
    page_url: body.page_url || "",
    app_url: body.app_url || client.appUrl,
    ip: getClientIp(req),
    user_agent: getUserAgent(req)
  };
  const contact = await upsertContact(client.tenantKey, body, metadata);
  const notes = clean([
    body.requirements || body.notes || body.message || "",
    body.area ? `Area: ${body.area}` : "",
    body.timing ? `Timing: ${body.timing}` : ""
  ].filter(Boolean).join("\n"), 1800);
  const service = clean(body.service || body.requested_service || "General inquiry", 180) || "General inquiry";
  const urgency = classifyUrgency(`${service} ${notes}`);
  const lead = await q(
    `insert into fs27_vantacore_leads(
      id, tenant_key, contact_id, source, service, status, urgency, caller_type,
      intent, quality_score, owner_next_action, notes, metadata
    )
     values ($1,$2,$3,$4,$5,'new',$6,'lead','request_quote',72,$7,$8,$9::jsonb)
     returning *`,
    [
      uuid(),
      client.tenantKey,
      contact.id,
      `client-app:${body.source_app}`,
      service,
      urgency,
      `Respond to ${client.businessName} app intake`,
      notes,
      JSON.stringify(metadata)
    ]
  );
  await q(
    `insert into fs27_vantacore_activities(id, tenant_key, lead_id, contact_id, actor, activity_type, summary, metadata)
     values ($1,$2,$3,$4,'client-app-intake','lead.created',$5,$6::jsonb)`,
    [uuid(), client.tenantKey, lead.rows[0].id, contact.id, `${contact.name} submitted ${service}`, JSON.stringify(metadata)]
  );
  return { lead: lead.rows[0], contact };
}

export default wrap(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: clientCors(req) });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, clientCors(req));

  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON", clientCors(req));
  }

  const sourceApp = sourceKey(body.source_app || body.sourceApp || body.business_id || body.business || "");
  const client = CLIENTS[sourceApp];
  const cors = clientCors(req, client);
  if (!client) return badRequest("Unknown client app.", cors);
  if (!isAllowedOrigin(req.headers.get("origin") || "", client)) {
    return json(403, { error: "Origin is not allowed for this client app." }, cors);
  }
  if (clean(body.website || body.url || "", 200)) {
    return json(200, { ok: true, ignored: true }, cors);
  }

  const contact = clean(body.contact || body.name || body.contact_name || "", 180);
  const email = normalizeEmail(body.email || body.contact_email || "");
  const phone = clean(body.phone || body.contact_phone || "", 80);
  if (!contact && !email && !phone) return badRequest("Contact name, phone, or email is required.", cors);

  await ensureIntakeSchema();

  const id = uuid();
  const normalized = {
    source_app: sourceApp,
    workspace_id: clean(body.workspace_id || body.workspaceId || client.workspaceId, 160),
    business_name: client.businessName,
    company: clean(body.company || "", 180),
    contact,
    email,
    phone,
    service: clean(body.service || "General inquiry", 180),
    area: clean(body.area || "", 220),
    timing: clean(body.timing || "", 220),
    requirements: clean(body.requirements || body.notes || body.message || "", 1800),
    page_url: clean(body.page_url || body.pageUrl || "", 600),
    app_url: clean(body.app_url || body.appUrl || client.appUrl, 600)
  };
  const metadata = {
    raw_keys: Object.keys(body || {}).sort(),
    ip: getClientIp(req),
    user_agent: getUserAgent(req),
    referrer: clean(req.headers.get("referer") || req.headers.get("referrer") || "", 600)
  };

  await q(
    `insert into client_app_intakes(
      id, source_app, workspace_id, tenant_key, business_name, company, contact, email, phone,
      service, area, timing, requirements, page_url, app_url, metadata
    )
     values ($1,$2,$3,$4,$5,nullif($6,''),nullif($7,''),nullif($8,''),nullif($9,''),
       nullif($10,''),nullif($11,''),nullif($12,''),nullif($13,''),nullif($14,''),nullif($15,''),$16::jsonb)`,
    [
      id,
      normalized.source_app,
      normalized.workspace_id,
      client.tenantKey,
      normalized.business_name,
      normalized.company,
      normalized.contact,
      normalized.email,
      normalized.phone,
      normalized.service,
      normalized.area,
      normalized.timing,
      normalized.requirements,
      normalized.page_url,
      normalized.app_url,
      JSON.stringify(metadata)
    ]
  );

  const crm = await createCrmLead(client, normalized, id, req);
  const relay13 = await sendClientAppLeadToRelay13({
    client,
    normalized,
    intakeId: id,
    crm
  });
  await q(
    `update client_app_intakes
     set relay13_conversation_id=nullif($2,''),
         relay13_bridge_status=$3,
         relay13_bridge_error=nullif($4,''),
         relay13_bridge_payload=$5::jsonb,
         metadata=coalesce(metadata,'{}'::jsonb) || $6::jsonb
     where id=$1`,
    [
      id,
      relay13.conversation_id || "",
      relay13.status || (relay13.ok ? "sent" : "failed"),
      relay13.error || "",
      JSON.stringify(relay13 || {}),
      JSON.stringify({
        relay13_bridge_status: relay13.status || (relay13.ok ? "sent" : "failed"),
        relay13_conversation_id: relay13.conversation_id || "",
        relay13_workspace_id: relay13.workspace_id || ""
      })
    ]
  );
  const notification = await sendClientAppIntakeEmail({
    to: client.notifyEmail,
    reply_to: normalized.email || undefined,
    ...normalized,
    dashboard_url: DASHBOARD_URL
  }).catch((error) => ({
    delivered: false,
    mode: "error",
    error: error?.message || "Client intake email failed"
  }));

  await audit("client-app-intake", "CLIENT_APP_INTAKE_CREATED", `intake:${id}`, {
    intake_id: id,
    lead_id: crm.lead.id,
    source_app: sourceApp,
    tenant_key: client.tenantKey,
    business_name: client.businessName,
    notification_delivered: notification.delivered === true,
    notification_mode: notification.mode || "unknown",
    relay13_bridge_status: relay13.status || (relay13.ok ? "sent" : "failed"),
    relay13_conversation_id: relay13.conversation_id || "",
    relay13_workspace_id: relay13.workspace_id || ""
  });

  return json(200, {
    ok: true,
    intake_id: id,
    lead_id: crm.lead.id,
    contact_id: crm.contact.id,
    source_app: sourceApp,
    workspace_id: normalized.workspace_id,
    status: "received",
    relay13: {
      status: relay13.status || (relay13.ok ? "sent" : "failed"),
      conversation_id: relay13.conversation_id || null,
      workspace_id: relay13.workspace_id || null,
      bridge: relay13.bridge || null,
      connectlog_card_record_id: relay13.connectlog_card_record_id || null,
      ai_policy: relay13.ai_policy || null,
      error: relay13.ok ? null : relay13.error || "Relay13 bridge failed"
    },
    notification: {
      delivered: notification.delivered === true,
      mode: notification.mode || "unknown"
    }
  }, cors);
});
