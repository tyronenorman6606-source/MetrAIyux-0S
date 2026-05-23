import { wrap } from "./_lib/wrap.js";
import { buildCors, getBearer, json } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { emitEvent } from "./_lib/monitor.js";

function cleanString(value, fallback = "", max = 500) {
  const raw = value == null ? fallback : value;
  return String(raw || fallback).trim().slice(0, max);
}

function cleanBool(value) {
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "y"].includes(String(value || "").toLowerCase());
}

function cleanInt(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function mirrorSecret() {
  return cleanString(
    process.env.FS27_EVENT_MIRROR_SECRET ||
      process.env.PLATFORM_EVENT_MIRROR_SECRET ||
      process.env.SKYGATEFS27_EVENT_MIRROR_SECRET ||
      "",
    "",
    2000
  );
}

function allowUnsignedMirror() {
  return cleanBool(process.env.FS27_ALLOW_UNSIGNED_MIRROR || process.env.PLATFORM_EVENT_ALLOW_UNSIGNED);
}

function authorize(req) {
  const secret = mirrorSecret();
  if (!secret) {
    if (allowUnsignedMirror()) return { ok: true, mode: "unsigned_allowed" };
    return {
      ok: false,
      status: 503,
      error: "FS27 event mirror secret is not configured. Set FS27_EVENT_MIRROR_SECRET before accepting platform events."
    };
  }

  const headerSecret = cleanString(
    req.headers.get("x-fs27-event-secret") ||
      req.headers.get("x-platform-event-secret") ||
      "",
    "",
    2000
  );
  const bearer = getBearer(req) || "";
  if (headerSecret === secret || bearer === secret) return { ok: true, mode: "signed" };
  return { ok: false, status: 401, error: "Unauthorized platform event mirror request" };
}

async function readBody(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function safeMeta(input) {
  const meta = input && typeof input === "object" ? { ...input } : {};
  for (const key of Object.keys(meta)) {
    if (/password|secret|token|api[_-]?key|authorization|cookie/i.test(key)) {
      meta[key] = "[redacted]";
    }
  }
  return meta;
}

function normalizeEvent(body, authMode) {
  const eventType = cleanString(body.type || body.action || body.event_type || "platform.action", "platform.action", 160);
  const sourceApp = cleanString(body.source_app || body.app_id || "unknown-platform", "unknown-platform", 120);
  const lane = cleanString(body.lane || body.resource_type || "platform", "platform", 80);
  const actor = cleanString(body.actor || body.user_email || body.customer_email || "system", "system", 240);
  const target = cleanString(
    body.target ||
      body.resource_id ||
      body.ws_id ||
      body.workspace_id ||
      body.customer_id ||
      "",
    "",
    300
  );
  const meta = safeMeta({
    ...(body.meta && typeof body.meta === "object" ? body.meta : {}),
    payload: safeMeta(body.payload || {}),
    source_app: sourceApp,
    lane,
    type: eventType,
    action: cleanString(body.action || eventType, eventType, 160),
    actor,
    org_id: body.org_id || null,
    ws_id: body.ws_id || body.workspace_id || null,
    workspace_id: body.workspace_id || body.ws_id || null,
    customer_id: body.customer_id || null,
    user_id: body.user_id || null,
    resource_type: body.resource_type || lane,
    resource_id: body.resource_id || target || null,
    billable: cleanBool(body.billable),
    privileged: cleanBool(body.privileged),
    status: cleanString(body.status || "mirrored", "mirrored", 80),
    summary: cleanString(body.summary || "", "", 500),
    cost_cents: cleanInt(body.cost_cents),
    usage: body.usage && typeof body.usage === "object" ? body.usage : null,
    plan_id: body.plan_id || null,
    event_ts: body.event_ts || body.created_at || new Date().toISOString(),
    mirror_auth_mode: authMode
  });

  return { sourceApp, lane, eventType, actor, target, meta };
}

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  const auth = authorize(req);
  if (!auth.ok) return json(auth.status || 401, { ok: false, error: auth.error }, cors);

  const body = await readBody(req);
  const event = normalizeEvent(body, auth.mode);
  const inserted = await q(
    `insert into audit_events(actor, action, target, meta)
     values ($1,$2,$3,$4::jsonb)
     returning id, created_at`,
    [event.actor, "PLATFORM_EVENT_MIRROR", event.target || null, JSON.stringify(event.meta)]
  );
  const row = inserted.rows?.[0] || {};

  await emitEvent({
    request_id: req.headers.get("x-kaixu-request-id") || `mirror_${row.id || Date.now()}`,
    level: event.meta.status === "failed" ? "warn" : "info",
    kind: "platform.audit",
    function_name: "platform-event-mirror",
    method: req.method,
    path: new URL(req.url).pathname,
    app_id: event.sourceApp,
    customer_id: Number.isFinite(Number(event.meta.customer_id)) ? Number(event.meta.customer_id) : null,
    http_status: 202,
    extra: {
      mirrored_event_id: row.id || null,
      mirrored_actor: event.actor,
      mirrored_type: event.eventType,
      mirrored_lane: event.lane,
      mirrored_billable: !!event.meta.billable,
      mirrored_privileged: !!event.meta.privileged,
      mirrored_org_id: event.meta.org_id || null,
      mirrored_ws_id: event.meta.ws_id || event.meta.workspace_id || null,
      mirrored_user_id: event.meta.user_id || null,
      mirrored_event_ts: event.meta.event_ts || null,
      mirrored_meta: event.meta
    }
  });

  return json(202, {
    ok: true,
    event_id: row.id || null,
    created_at: row.created_at || null,
    action: "PLATFORM_EVENT_MIRROR",
    source_app: event.sourceApp,
    lane: event.lane,
    type: event.eventType
  }, cors);
});
