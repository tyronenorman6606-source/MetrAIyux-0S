import { wrap } from "./_lib/wrap.js";
import { buildCors, json } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin.js";
import { q } from "./_lib/db.js";

function normalizeLimit(value) {
  const parsed = parseInt(String(value || "50"), 10);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(200, parsed));
}

function formatRow(row) {
  const meta = row.meta || {};
  const routex = meta.meta || {};
  return {
    id: `audit:${row.id}`,
    source: "audit",
    created_at: row.created_at,
    actor: row.actor,
    action: meta.type || row.action,
    type: meta.type || row.action,
    lane: meta.lane || "platform",
    billable: !!meta.billable,
    privileged: !!meta.privileged,
    app_id: meta.source_app || "metraiyux-0s",
    org_id: meta.org_id || null,
    ws_id: meta.ws_id || null,
    event_ts: meta.event_ts || null,
    status: meta.privileged ? "privileged" : "mirrored",
    target: row.target || null,
    targetLabel: row.target || (routex.entity_id ? `${routex.entity_type || "routex"}:${routex.entity_id}` : "app:metraiyux-0s"),
    groupLabel: meta.lane || "platform",
    summary: `${meta.lane || "platform"} · ${meta.type || row.action}`,
    meta: routex,
    raw_meta: meta
  };
}

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  const admin = requireAdmin(req);
  if (!admin) return json(401, { error: "Unauthorized" }, cors);
  if (req.method !== "GET") return json(405, { error: "Method not allowed" }, cors);

  const url = new URL(req.url);
  const limit = normalizeLimit(url.searchParams.get("limit"));
  const rows = await q(
    `select id, actor, action, target, meta, created_at
     from audit_events
     where action='PLATFORM_EVENT_MIRROR'
       and meta->>'source_app' = 'metraiyux-0s'
       and (
         meta->>'type' like 'skyeroutex.%'
         or coalesce(meta->'meta'->>'routex_event_type', '') <> ''
       )
     order by created_at desc
     limit $1`,
    [limit]
  );
  const events = (rows.rows || []).map(formatRow);
  const summary = events.reduce((acc, event) => {
    acc.total += 1;
    acc.by_lane[event.lane] = (acc.by_lane[event.lane] || 0) + 1;
    if (event.billable) acc.billable += 1;
    if (event.privileged) acc.privileged += 1;
    return acc;
  }, { total: 0, billable: 0, privileged: 0, by_lane: {} });

  return json(200, { app_id: "metraiyux-0s", surface: "skyeroutex", limit, summary, events }, cors);
});
