import { wrap } from "./_lib/wrap.js";
import { buildCors, json } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { audit } from "./_lib/audit.js";
import { emitEvent, getRequestId } from "./_lib/monitor.js";

function readMirrorSecret(req) {
  return String(
    req.headers.get("x-skygate-mirror-secret") ||
    req.headers.get("x-skygate-event-mirror-secret") ||
    ""
  ).trim();
}

function configuredMirrorSecret() {
  return String(
    process.env.SKYGATE_EVENT_MIRROR_SECRET ||
    process.env.SKYGATEFS27_EVENT_MIRROR_SECRET ||
    ""
  ).trim();
}

function normalizeText(value, max = 400) {
  return String(value || "").trim().slice(0, max);
}

function normalizeMeta(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function inferLane(type, meta) {
  const t = normalizeText(type, 160).toLowerCase();
  const joined = `${t} ${JSON.stringify(meta || {})}`.toLowerCase();
  if (joined.includes("vantacore") || joined.includes("service crm") || joined.includes("lead firewall") || joined.includes("booking") || joined.includes("missed call")) return "crm";
  if (joined.includes("connectlog") || joined.includes("relay13") || joined.includes("websocket") || joined.includes("messaging") || joined.includes("relationship")) return "messaging";
  if (joined.includes("auth")) return "auth";
  if (joined.includes("push") || joined.includes("deploy") || joined.includes("github")) return "push";
  if (joined.includes("invoice") || joined.includes("billing") || joined.includes("payment") || joined.includes("checkout")) return "billing";
  if (joined.includes("voice") || joined.includes("twilio") || joined.includes("call")) return "voice";
  if (joined.includes("mail") || joined.includes("smtp") || joined.includes("gmail") || joined.includes("resend")) return "mail";
  if (joined.includes("workspace") || joined.includes("document") || joined.includes("save")) return "workspace";
  if (joined.includes("ai") || joined.includes("prompt") || joined.includes("generation") || joined.includes("provider")) return "ai";
  if (joined.includes("org") || joined.includes("team") || joined.includes("member")) return "org";
  return "platform";
}

function inferBillable(lane, meta) {
  if (meta?.billable === true) return true;
  if (meta?.billable === false) return false;
  return ["ai", "push", "voice", "mail", "billing"].includes(lane);
}

function inferPrivileged(lane, type) {
  const t = normalizeText(type, 160).toLowerCase();
  if (["auth", "billing", "push", "org"].includes(lane)) return true;
  return /(revoke|issue|admin|delete|rotate|deploy|invite|grant|reset)/.test(t);
}

async function resolveActorContext(actor) {
  const email = normalizeText(actor, 320).toLowerCase();
  if (!email || !email.includes("@")) {
    return { actor_email: email || null, user_id: null, customer_id: null };
  }
  const res = await q(
    "select id, email, primary_customer_id from users where lower(email)=lower($1) limit 1",
    [email]
  );
  const row = res.rows?.[0];
  return {
    actor_email: row?.email || email,
    user_id: row?.id || null,
    customer_id: Number.isFinite(row?.primary_customer_id) ? row.primary_customer_id : null
  };
}

function normalizeBool(value) {
  if (value === true || value === false) return value;
  const text = normalizeText(value, 20).toLowerCase();
  if (["1", "true", "yes", "y"].includes(text)) return true;
  if (["0", "false", "no", "n"].includes(text)) return false;
  return false;
}

function normalizeInt(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.trunc(number));
}

function isProviderUsageEvent(type, meta) {
  const t = normalizeText(type, 160).toLowerCase();
  return t === "0s.provider_execution"
    || normalizeText(meta?.provider_id, 120)
    || normalizeText(meta?.receipt_id, 160);
}

async function recordProviderUsageEvent({ source_app, actorContext, org_id, ws_id, type, lane, billable, meta, event_ts }) {
  if (!isProviderUsageEvent(type, meta)) return false;
  await q(
    `insert into provider_usage_events(
       source_app, actor_email, gate_user_id, gate_customer_id, org_id,
       workspace_id, customer_ref, client_ref, provider_id, action, usage_lane,
       quantity, estimated_cost_cents, billable, chargeback_ready,
       provider_call_made, receipt_id, event_ts, meta
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::timestamptz,$19::jsonb)`,
    [
      source_app,
      actorContext.actor_email,
      actorContext.user_id,
      actorContext.customer_id,
      org_id,
      normalizeText(meta?.workspace_id || ws_id || "", 160) || null,
      normalizeText(meta?.customer_id || meta?.customer_ref || "", 160) || null,
      normalizeText(meta?.client_id || meta?.client_ref || "", 160) || null,
      normalizeText(meta?.provider_id || "unknown-provider", 120),
      normalizeText(meta?.action || type || "provider.action", 160),
      normalizeText(meta?.usage_lane || lane || "provider", 120),
      normalizeInt(meta?.quantity, 1) || 1,
      normalizeInt(meta?.estimated_cost_cents, 0),
      meta?.billable === false ? false : (normalizeBool(meta?.billable) || billable === true),
      normalizeBool(meta?.chargeback_ready),
      normalizeBool(meta?.provider_call_made),
      normalizeText(meta?.receipt_id || "", 180) || null,
      event_ts,
      JSON.stringify(meta || {})
    ]
  );
  return true;
}

export default wrap(async (req, _cors, context) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  const expected = configuredMirrorSecret();
  if (!expected) {
    return json(501, { error: "SkyeGate event mirror secret is not configured." }, cors);
  }

  const provided = readMirrorSecret(req);
  if (!provided || provided !== expected) {
    return json(401, { error: "Unauthorized" }, cors);
  }

  const body = await req.json().catch(() => ({}));
  const source_app = normalizeText(body?.source_app || "unknown-app", 120);
  const actor = normalizeText(body?.actor || "", 320);
  const org_id = normalizeText(body?.org_id || "", 120) || null;
  const ws_id = normalizeText(body?.ws_id || "", 120) || null;
  const type = normalizeText(body?.type || "platform.event", 160) || "platform.event";
  const meta = normalizeMeta(body?.meta);
  const event_ts = normalizeText(body?.event_ts || new Date().toISOString(), 80);
  const lane = inferLane(type, meta);
  const billable = inferBillable(lane, meta);
  const privileged = inferPrivileged(lane, type);

  const request_id = getRequestId(req);
  let provider_usage_recorded = false;
  const recordEvent = async () => {
    const actorContext = await resolveActorContext(actor);

    await emitEvent({
      request_id,
      level: "info",
      kind: "platform.audit",
      function_name: "platform-event-ingest",
      method: req.method,
      path: new URL(req.url).pathname,
      app_id: source_app,
      customer_id: actorContext.customer_id,
      extra: {
        mirrored_type: type,
        mirrored_actor: actorContext.actor_email,
        mirrored_user_id: actorContext.user_id,
        mirrored_org_id: org_id,
        mirrored_ws_id: ws_id,
        mirrored_event_ts: event_ts,
        mirrored_lane: lane,
        mirrored_billable: billable,
        mirrored_privileged: privileged,
        mirrored_meta: meta
      }
    });

    await audit(
      actorContext.actor_email ? `platform:${source_app}:${actorContext.actor_email}` : `platform:${source_app}`,
      "PLATFORM_EVENT_MIRROR",
      ws_id ? `workspace:${ws_id}` : (org_id ? `org:${org_id}` : `app:${source_app}`),
      {
        request_id,
        source_app,
        actor_email: actorContext.actor_email,
        user_id: actorContext.user_id,
        customer_id: actorContext.customer_id,
        org_id,
        ws_id,
        type,
        lane,
        billable,
        privileged,
        event_ts,
        meta
      }
    );

    provider_usage_recorded = await recordProviderUsageEvent({
      source_app,
      actorContext,
      org_id,
      ws_id,
      type,
      lane,
      billable,
      meta,
      event_ts
    });
  };

  const forceSync = req.headers.get("x-skygate-mirror-sync") === "1";
  if (context?.waitUntil && !forceSync) {
    context.waitUntil(recordEvent().catch((error) => {
      console.error("platform event mirror persistence failed", error);
    }));
    return json(200, { ok: true, request_id, accepted: true }, cors);
  }

  await recordEvent();

  return json(200, { ok: true, request_id, accepted: true, persisted: true, provider_usage_recorded }, cors);
});
