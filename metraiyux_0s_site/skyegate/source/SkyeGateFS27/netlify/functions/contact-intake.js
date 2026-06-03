import crypto from "crypto";
import { wrap } from "./_lib/wrap.js";
import { json } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { audit } from "./_lib/audit.js";
import { resolveAdminAuthority } from "./_lib/admin.js";
import { publicProviderRuntime, runZeroOsProviderAction } from "./_lib/providerRuntime.js";

const REVIEW_BATCH_SIZE = 5;
const KINDS = new Set(["service_request", "review", "contact", "support", "partnership"]);
const PUBLIC_STATUSES = new Set(["pending_admin_triage", "pending_0s_qa"]);
let schemaPromise = null;

function normalizeText(value, max = 1200) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeEmail(value = "") {
  const email = normalizeText(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizePhone(value = "") {
  return normalizeText(value, 80).replace(/[^\d+().\-\s]/g, "").slice(0, 80);
}

function bool(value) {
  return value === true || /^(1|true|yes|on)$/i.test(String(value || "").trim());
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstEnv(...names) {
  for (const name of names) {
    const value = String(process.env[name] || "").trim();
    if (value) return value;
  }
  return "";
}

function firstRuntimeEnv(context, ...names) {
  for (const name of names) {
    const contextValue = context?.env?.[name];
    if (typeof contextValue === "string" && contextValue.trim()) return contextValue.trim();
    const processValue = String(process.env[name] || "").trim();
    if (processValue) return processValue;
  }
  return "";
}

function normalizeSlug(value, fallback = "") {
  const slug = normalizeText(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function redact(value = "") {
  const text = normalizeText(value, 180);
  if (!text) return "";
  if (text.includes("@")) {
    const [name, domain] = text.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  if (text.length <= 6) return "***";
  return `${text.slice(0, 3)}...${text.slice(-3)}`;
}

function kindFrom(body) {
  const raw = normalizeText(body.kind || body.requestKind || body.type || "", 80).toLowerCase().replace(/[-\s]+/g, "_");
  if (KINDS.has(raw)) return raw;
  if (raw.includes("review")) return "review";
  if (raw.includes("partner")) return "partnership";
  if (raw.includes("support")) return "support";
  if (raw.includes("service") || raw.includes("request")) return "service_request";
  return "contact";
}

function laneFor(kind) {
  if (kind === "review") return "reviews";
  if (kind === "service_request") return "sales_intake";
  if (kind === "support") return "support";
  if (kind === "partnership") return "partnerships";
  return "contact";
}

function initialStatus(kind) {
  return kind === "review" ? "pending_0s_qa" : "pending_admin_triage";
}

function adminRecipients() {
  const configured = firstEnv(
    "CONTACT_INTAKE_ADMIN_EMAIL",
    "SKYES_CONTACT_ADMIN_EMAIL",
    "ADMIN_APPROVAL_EMAIL",
    "LEGAL_REVIEW_ADMIN_EMAIL",
    "RESEND_ADMIN_EMAIL"
  );
  return (configured || "skyesoverlondon@gmail.com")
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

function fallbackMailto(record) {
  const to = "skyesoverlondon@gmail.com";
  const subject = encodeURIComponent(`[0S ${record.kind}] ${record.service || record.company || record.name || record.id}`);
  const body = encodeURIComponent([
    `0S intake fallback for ${record.kind}`,
    "",
    `Receipt: ${record.id}`,
    `Name: ${record.name}`,
    `Email: ${record.email}`,
    `Phone: ${record.phone}`,
    `Company: ${record.company}`,
    `Service: ${record.service}`,
    "",
    record.message
  ].filter(Boolean).join("\n"));
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

function recordEmailText(record) {
  return [
    `New 0S contact intake: ${record.kind}`,
    "",
    `Receipt: ${record.id}`,
    `Lane: ${record.lane}`,
    `Status: ${record.status}`,
    `Name: ${record.name || "n/a"}`,
    `Email: ${record.email || "n/a"}`,
    `Phone: ${record.phone || "n/a"}`,
    `Company: ${record.company || "n/a"}`,
    `Role: ${record.role || "n/a"}`,
    `Service: ${record.service || "n/a"}`,
    record.rating ? `Rating: ${record.rating}` : null,
    `Source: ${record.source_url || "n/a"}`,
    "",
    "Message:",
    record.message || "n/a",
    "",
    record.proof_notes ? `Proof notes: ${record.proof_notes}` : null,
    "",
    "This is a backup notification. The private source of truth is FS27 contact intake, not public email."
  ].filter(Boolean).join("\n");
}

async function sendBackupEmail(record) {
  const to = adminRecipients();
  if (!to.length) {
    return {
      delivered: false,
      mode: "fallback_mailto",
      reason: "admin_recipient_not_configured",
      fallback_url: fallbackMailto(record)
    };
  }

  const subject = `[0S ${record.kind.replaceAll("_", " ")}] ${record.service || record.company || record.name || "new intake"}`;
  const runtime = await runZeroOsProviderAction({
    provider_id: "resend",
    action: "resend.email.send",
    app_id: "fs27-contact-intake",
    workspace_id: record.source_app || "metraiyux-0s",
    customer_id: `contact-intake:${record.id}`,
    client_id: record.lane || record.kind || "contact",
    usage_lane: `fs27:contact-intake:${record.lane || record.kind || "contact"}`,
    payload: {
      to,
      subject,
      text: recordEmailText(record)
    }
  });
  const providerResult = runtime.receipt?.provider_result || {};
  return {
    delivered: runtime.ok,
    mode: "provider_runtime_resend",
    status: runtime.status,
    id: providerResult.id || null,
    error: runtime.ok ? null : (runtime.receipt?.error || runtime.response?.error || "resend_delivery_failed"),
    backup_recipient_count: to.length,
    provider_runtime: publicProviderRuntime(runtime.receipt),
    fallback_url: runtime.ok ? undefined : fallbackMailto(record)
  };
}

function relay13ConversationUrl(base = "") {
  const clean = String(base || "").trim().replace(/\/+$/, "");
  if (!clean) return "";
  if (clean.endsWith("/api/relay13") || clean.endsWith("/api")) return `${clean}/v1/conversations`;
  return `${clean}/api/v1/conversations`;
}

function relay13Payload(record, workspace) {
  return {
    workspace,
    channel: "connectlog-card",
    subject: `[0S ${record.kind}] ${record.service || record.company || record.name || record.id}`,
    customer_name: record.name || "0S contact",
    customer_email: record.email || "",
    customer_phone: record.phone || "",
    source_url: record.source_url || "",
    body: record.message || `${record.kind} received in FS27 contact intake.`,
    metadata: {
      fs27_contact_intake_id: record.id,
      kind: record.kind,
      lane: record.lane,
      service: record.service,
      company: record.company,
      proof_notes: record.proof_notes ? "stored_in_fs27" : "",
      security_authority: "0s_gate",
      relay_source: "fs27_contact_intake"
    },
    connectlog_bridge: true,
    connectlog_card_id: "metraiyux-0s-contact-ecology",
    connectlog_card_label: "MetrAIyux 0S Contact Ecology",
    connectlog_campaign: record.lane,
    connectlog_owner_name: "0S Admin",
    connectlog_welcome_message: "New 0S intake captured through FS27 contact ecology."
  };
}

async function relay13Receipt(res, mode, workspace, extra = {}) {
  const data = await res.json().catch(() => ({}));
  return {
    delivered: res.ok,
    mode,
    status: res.status,
    workspace,
    ...extra,
    conversation_id: data.conversation_id || null,
    bridge: data.bridge || null,
    connectlog_card_record_id: data.connectlog_card_record_id || null,
    guardrail: data.guardrail || null,
    error: res.ok ? null : (data.error || "relay13_delivery_failed")
  };
}

async function mirrorToRelay13(record, context = {}) {
  const workspace = normalizeSlug(
    firstRuntimeEnv(context, "CONTACT_INTAKE_RELAY13_WORKSPACE", "RELAY13_CONTACT_WORKSPACE", "BOOTSTRAP_WORKSPACE_SLUG"),
    "connectlog-main"
  );
  const origin = firstRuntimeEnv(context, "CONTACT_INTAKE_0S_ORIGIN", "METRAIYUX_0S_ORIGIN")
    || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
  const payload = relay13Payload(record, workspace);
  let primaryReceipt = null;
  const has0sServiceBinding = Boolean(context?.env?.METRAIYUX_0S_WORKER?.fetch);

  if (has0sServiceBinding) {
    const res = await context.env.METRAIYUX_0S_WORKER.fetch("https://metraiyux-0s.internal/api/relay13/v1/conversations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin
      },
      body: JSON.stringify(payload)
    });
    primaryReceipt = await relay13Receipt(res, "relay13_0s_service_binding", workspace, { route: "0s_service_binding" });
    if (primaryReceipt.delivered) return primaryReceipt;
  }

  const base = firstRuntimeEnv(context, "RELAY13_0S_API_BASE_URL", "RELAY13_CORE_WORKER_URL");
  const target = relay13ConversationUrl(base);
  if (has0sServiceBinding) {
    primaryReceipt = primaryReceipt || {
      delivered: false,
      mode: "relay13_0s_service_binding",
      reason: "0s_service_binding_failed_before_http_fallback",
      workspace
    };
  } else if (!target) {
    primaryReceipt = {
      delivered: false,
      mode: "pending_internal_relay13_route",
      reason: "relay13_0s_mount_not_configured",
      workspace
    };
  } else {
    const apiKey = firstRuntimeEnv(context, "RELAY13_API_KEY", "RELAY13_0S_API_KEY", "RELAY13_ADMIN_API_KEY", "CONNECTLOG_RELAY13_API_KEY");
    const headers = {
      "content-type": "application/json",
      origin
    };
    if (apiKey) headers["x-relay13-api-key"] = apiKey;

    const res = await fetch(target, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    primaryReceipt = await relay13Receipt(res, apiKey ? "relay13_scoped_key" : "relay13_0s_mount", workspace, { route: "0s_http_mount" });
    if (primaryReceipt.delivered) return primaryReceipt;
  }

  if (context?.env?.RELAY13_WORKER?.fetch) {
    const res = await context.env.RELAY13_WORKER.fetch("https://relay13.internal/api/v1/conversations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin
      },
      body: JSON.stringify(payload)
    });
    const fallbackReceipt = await relay13Receipt(res, "relay13_service_binding", workspace, {
      route: "relay13_service_binding",
      primary_route_status: primaryReceipt?.status || null,
      primary_route_mode: primaryReceipt?.mode || null,
      primary_route_error: primaryReceipt?.error || primaryReceipt?.reason || null
    });
    if (fallbackReceipt.delivered) return fallbackReceipt;
    return {
      ...fallbackReceipt,
      primary_route_receipt: primaryReceipt
    };
  }

  return primaryReceipt;
}

async function ensureContactSchema() {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    await q(`create table if not exists fs27_contact_intake (
      id uuid primary key,
      kind text not null,
      lane text not null,
      status text not null,
      visibility text not null default 'admin_private',
      source_app text,
      source_url text,
      name text,
      email text,
      phone text,
      company text,
      role text,
      service text,
      rating integer,
      message text,
      proof_notes text,
      consent boolean not null default false,
      public_name_consent boolean not null default false,
      public_company_consent boolean not null default false,
      relay_status text,
      relay_receipt jsonb not null default '{}'::jsonb,
      backup_email_status text,
      backup_email_receipt jsonb not null default '{}'::jsonb,
      production_batch_id text,
      production_batch_status text,
      reviewed_at timestamptz,
      reviewed_by text,
      qa_notes text,
      published_at timestamptz,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );`);
    await q(`create index if not exists fs27_contact_intake_kind_status_idx on fs27_contact_intake(kind, status, created_at desc);`);
    await q(`create index if not exists fs27_contact_intake_lane_idx on fs27_contact_intake(lane, created_at desc);`);
    await q(`create index if not exists fs27_contact_intake_email_idx on fs27_contact_intake(lower(coalesce(email, '')), created_at desc);`);
  })();
  return schemaPromise;
}

function validate(body, kind) {
  const errors = [];
  const name = normalizeText(body.name || body.reviewerName || body.customer_name || body.contact, 140);
  const email = normalizeEmail(body.email || body.reviewerEmail || body.customer_email);
  const phone = normalizePhone(body.phone || body.customer_phone);
  const message = normalizeText(body.message || body.reviewText || body.requirements || body.details || body.body, 2400);
  const consent = bool(body.consent);

  if (!name || name.length < 2) errors.push("name");
  if (!email && !phone) errors.push("email_or_phone");
  if (kind === "review") {
    if (!email) errors.push("email");
    if (message.length < 40) errors.push("reviewText");
    if (!consent) errors.push("consent");
  } else if (message.length < 8) {
    errors.push("message");
  }

  return { errors, name, email, phone, message, consent };
}

function rowToRecord(row, includePrivate = true) {
  const base = {
    id: row.id,
    kind: row.kind,
    lane: row.lane,
    status: row.status,
    visibility: row.visibility,
    source_app: row.source_app,
    source_url: row.source_url,
    name: row.name,
    company: row.company,
    role: row.role,
    service: row.service,
    rating: row.rating,
    message: row.message,
    consent: row.consent,
    public_name_consent: row.public_name_consent,
    public_company_consent: row.public_company_consent,
    production_batch_id: row.production_batch_id,
    production_batch_status: row.production_batch_status,
    reviewed_at: row.reviewed_at,
    reviewed_by: row.reviewed_by,
    qa_notes: row.qa_notes,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata: row.metadata || {}
  };
  if (!includePrivate) return base;
  return {
    ...base,
    email: row.email,
    phone: row.phone,
    proof_notes: row.proof_notes,
    relay_status: row.relay_status,
    relay_receipt: row.relay_receipt || {},
    backup_email_status: row.backup_email_status,
    backup_email_receipt: row.backup_email_receipt || {}
  };
}

async function summarize(kind = "") {
  const rows = await q(
    `select kind, status, count(*)::int as count
     from fs27_contact_intake
     where ($1 = '' or kind = $1)
     group by kind, status`,
    [kind]
  );
  const summary = {
    total: 0,
    pending0sQa: 0,
    pendingAdminTriage: 0,
    approvedUnpublished: 0,
    rejected: 0,
    published: 0,
    publishThreshold: REVIEW_BATCH_SIZE,
    readyForProduction: false,
    neededForNextBatch: REVIEW_BATCH_SIZE,
    byStatus: {}
  };
  for (const row of rows.rows) {
    summary.total += row.count;
    summary.byStatus[row.status] = (summary.byStatus[row.status] || 0) + row.count;
  }
  summary.pending0sQa = summary.byStatus.pending_0s_qa || 0;
  summary.pendingAdminTriage = summary.byStatus.pending_admin_triage || 0;
  summary.approvedUnpublished = (summary.byStatus.approved_0s_qa || 0) + (summary.byStatus.ready_for_production || 0);
  summary.rejected = summary.byStatus.rejected || 0;
  summary.published = summary.byStatus.published || 0;
  summary.readyForProduction = summary.approvedUnpublished >= REVIEW_BATCH_SIZE;
  const remainder = summary.approvedUnpublished % REVIEW_BATCH_SIZE;
  summary.neededForNextBatch = remainder === 0
    ? (summary.approvedUnpublished === 0 ? REVIEW_BATCH_SIZE : 0)
    : REVIEW_BATCH_SIZE - remainder;
  return summary;
}

async function insertRecord(body, req) {
  const kind = kindFrom(body);
  const lane = laneFor(kind);
  const validation = validate(body, kind);
  if (validation.errors.length) {
    const err = new Error("validation_failed");
    err.status = 400;
    err.fields = validation.errors;
    throw err;
  }

  const id = crypto.randomUUID();
  const sourceUrl = normalizeText(body.source_url || body.page_url || req.headers.get("referer") || req.headers.get("Referer"), 700);
  const sourceApp = normalizeText(body.source_app || body.sourceApp || "skyes-over-london-contact", 160);
  const metadata = {
    user_agent: normalizeText(req.headers.get("user-agent"), 260),
    ip_hint: normalizeText(req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"), 80),
    form_id: normalizeText(body.form_id || body.formId, 120),
    fallback_mailto: "skyesoverlondon@gmail.com"
  };

  const inserted = await q(
    `insert into fs27_contact_intake (
      id, kind, lane, status, source_app, source_url, name, email, phone, company, role, service, rating,
      message, proof_notes, consent, public_name_consent, public_company_consent, production_batch_status, metadata
     ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb
     ) returning *`,
    [
      id,
      kind,
      lane,
      initialStatus(kind),
      sourceApp,
      sourceUrl,
      validation.name,
      validation.email,
      validation.phone,
      normalizeText(body.company, 180),
      normalizeText(body.role, 180),
      normalizeText(body.service, 180) || (kind === "review" ? "Business Operations" : "General request"),
      number(body.rating, null),
      validation.message,
      normalizeText(body.proofNotes || body.proof_notes, 1000),
      validation.consent,
      bool(body.publicNameConsent || body.public_name_consent),
      bool(body.publicCompanyConsent || body.public_company_consent),
      kind === "review" ? "waiting_for_five_approved_reviews" : "admin_triage_required",
      JSON.stringify(metadata)
    ]
  );
  return rowToRecord(inserted.rows[0]);
}

async function updateDeliveryReceipts(record, backup, relay) {
  const updated = await q(
    `update fs27_contact_intake
     set backup_email_status=$2,
         backup_email_receipt=$3::jsonb,
         relay_status=$4,
         relay_receipt=$5::jsonb,
         updated_at=now()
     where id=$1
     returning *`,
    [
      record.id,
      backup.delivered ? "sent" : backup.mode,
      JSON.stringify(backup),
      relay.delivered ? "sent" : relay.mode,
      JSON.stringify(relay)
    ]
  );
  return rowToRecord(updated.rows[0]);
}

async function handleSubmit(req, cors, context) {
  const body = await req.json().catch(() => ({}));
  if (body.website || body.companyFax) return json(202, { ok: true, status: "ignored" }, cors);

  let record;
  try {
    record = await insertRecord(body, req);
  } catch (error) {
    if (error.status === 400) return json(400, { ok: false, error: error.message, fields: error.fields || [] }, cors);
    throw error;
  }

  const [backup, relay] = await Promise.all([
    sendBackupEmail(record).catch((error) => ({ delivered: false, mode: "resend_error", error: error.message })),
    mirrorToRelay13(record, context).catch((error) => ({ delivered: false, mode: "relay13_error", error: error.message }))
  ]);
  const stored = await updateDeliveryReceipts(record, backup, relay);

  await audit(
    `contact-intake:${stored.kind}`,
    "FS27_CONTACT_INTAKE_RECEIVED",
    `contact-intake:${stored.id}`,
    {
      kind: stored.kind,
      lane: stored.lane,
      status: stored.status,
      source_app: stored.source_app,
      source_url: stored.source_url,
      email: redact(stored.email),
      relay_status: stored.relay_status,
      backup_email_status: stored.backup_email_status
    }
  );

  return json(201, {
    ok: true,
    submissionId: stored.id,
    contact_intake_id: stored.id,
    status: stored.status,
    lane: stored.lane,
    qaLane: stored.kind === "review" ? "fs27_0s_review_qa" : "fs27_admin_contact_triage",
    admin_system: "SkyeGate FS27 contact intake",
    relay_status: stored.relay_status,
    backup_email_status: stored.backup_email_status,
    fallback_mailto: backup.fallback_url || fallbackMailto(stored),
    summary: await summarize(stored.kind)
  }, cors);
}

async function requireAdmin(req, cors) {
  const admin = await resolveAdminAuthority(req);
  if (!admin) return { ok: false, response: json(401, { ok: false, error: "Unauthorized" }, cors) };
  return { ok: true, admin };
}

async function handleList(req, cors) {
  const url = new URL(req.url);
  await ensureContactSchema();

  const publicStats = url.searchParams.get("public") === "stats";
  const kind = KINDS.has(url.searchParams.get("kind")) ? url.searchParams.get("kind") : "";
  if (publicStats) {
    return json(200, { ok: true, summary: await summarize(kind) }, cors);
  }

  const admin = await requireAdmin(req, cors);
  if (!admin.ok) return admin.response;

  const limit = Math.max(1, Math.min(250, parseInt(url.searchParams.get("limit") || "100", 10) || 100));
  const status = normalizeText(url.searchParams.get("status"), 80);
  const rows = await q(
    `select *
     from fs27_contact_intake
     where ($1 = '' or kind = $1)
       and ($2 = '' or status = $2)
     order by created_at desc
     limit $3`,
    [kind, status, limit]
  );

  const submissions = rows.rows.map((row) => rowToRecord(row, true));
  return json(200, {
    ok: true,
    summary: await summarize(kind),
    submissions,
    contacts: submissions
  }, cors);
}

async function handleAdminAction(req, cors) {
  const admin = await requireAdmin(req, cors);
  if (!admin.ok) return admin.response;

  const body = await req.json().catch(() => ({}));
  const action = normalizeText(body.action, 60).toLowerCase();
  const id = normalizeText(body.id || body.contact_intake_id, 80);
  const qaNotes = normalizeText(body.qaNotes || body.qa_notes, 1000);
  const reviewer = normalizeText(admin.admin.email || admin.admin.user_id || admin.admin.via || "fs27-admin", 180);

  if (action === "approve" || action === "reject") {
    if (!id) return json(400, { ok: false, error: "missing_id" }, cors);
    const nextStatus = action === "approve" ? "approved_0s_qa" : "rejected";
    const nextBatchStatus = action === "approve" ? "approved_waiting_for_five_review_batch" : "rejected_by_0s_qa";
    const updated = await q(
      `update fs27_contact_intake
       set status=$2,
           qa_notes=$3,
           reviewed_at=now(),
           reviewed_by=$4,
           production_batch_status=$5,
           updated_at=now()
       where id=$1
       returning *`,
      [id, nextStatus, qaNotes, reviewer, nextBatchStatus]
    );
    if (!updated.rowCount) return json(404, { ok: false, error: "not_found" }, cors);
    const record = rowToRecord(updated.rows[0], true);
    await audit(`contact-intake:${reviewer}`, `FS27_CONTACT_INTAKE_${action.toUpperCase()}`, `contact-intake:${id}`, {
      kind: record.kind,
      lane: record.lane,
      status: record.status
    });
    return json(200, { ok: true, submission: record, summary: await summarize(record.kind) }, cors);
  }

  if (action === "mark_batch_ready") {
    const approved = await q(
      `select *
       from fs27_contact_intake
       where kind='review'
         and status='approved_0s_qa'
         and published_at is null
       order by coalesce(reviewed_at, created_at) asc
       limit $1`,
      [REVIEW_BATCH_SIZE]
    );
    if (approved.rowCount < REVIEW_BATCH_SIZE) {
      return json(409, {
        ok: false,
        error: "not_enough_approved_reviews",
        approvedUnpublished: approved.rowCount,
        required: REVIEW_BATCH_SIZE,
        summary: await summarize("review")
      }, cors);
    }
    const batchId = `sol-review-batch-${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 6)}`;
    const ids = approved.rows.map((row) => row.id);
    const ready = await q(
      `update fs27_contact_intake
       set status='ready_for_production',
           production_batch_id=$1,
           production_batch_status='ready_for_static_wall_publish',
           updated_at=now()
       where id = any($2::uuid[])
       returning *`,
      [batchId, ids]
    );
    await audit(`contact-intake:${reviewer}`, "FS27_REVIEW_BATCH_READY", `review-batch:${batchId}`, { ids });
    return json(200, {
      ok: true,
      batchId,
      batchSize: ready.rowCount,
      submissions: ready.rows.map((row) => row.id),
      ready_reviews: ready.rows.map((row) => rowToRecord(row, true)),
      summary: await summarize("review")
    }, cors);
  }

  if (action === "mark_triaged") {
    if (!id) return json(400, { ok: false, error: "missing_id" }, cors);
    const updated = await q(
      `update fs27_contact_intake
       set status='triaged',
           qa_notes=$2,
           reviewed_at=now(),
           reviewed_by=$3,
           updated_at=now()
       where id=$1
       returning *`,
      [id, qaNotes, reviewer]
    );
    if (!updated.rowCount) return json(404, { ok: false, error: "not_found" }, cors);
    return json(200, { ok: true, submission: rowToRecord(updated.rows[0], true), summary: await summarize("") }, cors);
  }

  return json(400, { ok: false, error: "unsupported_action" }, cors);
}

export default wrap(async (req, cors, context) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  await ensureContactSchema();
  if (req.method === "POST") return handleSubmit(req, cors, context);
  if (req.method === "GET") return handleList(req, cors);
  if (req.method === "PATCH") return handleAdminAction(req, cors);
  return json(405, { ok: false, error: "method_not_allowed" }, cors);
});
