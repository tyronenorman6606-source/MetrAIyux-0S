import { wrap } from "./_lib/wrap.js";
import { buildCors, json } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { auditWorkspaceEvent, enforceWorkspaceRateLimit, requireCsrf, requirePermission, resolveWorkspaceSession, sanitizeStateForStore, safeText, stateHash, touchWorkspaceSession } from "./_lib/signinpro.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });

  const session = await resolveWorkspaceSession(req);
  if (!session) return json(401, { ok: false, error: "Not signed in." }, cors);
  await enforceWorkspaceRateLimit({ request: req, workspaceId: session.workspace.id, workspaceSlug: session.workspace.slug, route: "workspace-sync", scope: "private", limit: 90, windowSeconds: 60 });
  await touchWorkspaceSession(session.sessionId, req);

  if (req.method === "GET") {
    requirePermission(session, "read");
    const rows = await q(`select state, updated_at, state_hash, revision from workspace_states where workspace_id = $1 limit 1`, [session.workspace.id]);
    return json(200, {
      ok: true,
      workspace: session.workspace,
      user: session.user,
      state: rows.rows[0] ? rows.rows[0].state : null,
      updatedAt: rows.rows[0] ? rows.rows[0].updated_at : null,
      stateHash: rows.rows[0] ? rows.rows[0].state_hash : null,
      revision: rows.rows[0] ? rows.rows[0].revision : 0
    }, cors);
  }

  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed." }, cors);
  requireCsrf(req, session);
  requirePermission(session, "write");
  const body = await req.json().catch(() => ({}));
  const state = sanitizeStateForStore(body.state, session.workspace);
  const reason = safeText(body.reason || "workspace_sync", 160);
  const hash = stateHash(state);

  await q(
    `insert into workspace_states(workspace_id, state, state_hash, revision, updated_by, updated_at)
     values ($1,$2::jsonb,$3,1,$4,now())
     on conflict (workspace_id) do update
       set state = excluded.state,
           state_hash = excluded.state_hash,
           revision = workspace_states.revision + 1,
           updated_by = excluded.updated_by,
           updated_at = now()`,
    [session.workspace.id, JSON.stringify(state), hash, session.user.id]
  );

  const attendeeIds = [];
  for (const attendee of state.attendees || []) {
    const attendeeId = safeText(attendee.id, 120);
    if (!attendeeId) continue;
    attendeeIds.push(attendeeId);
    await q(
      `insert into attendees(workspace_id, attendee_id, event_id, email, name, checked_in_at, data, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,now())
       on conflict (workspace_id, attendee_id) do update
         set event_id = excluded.event_id,
             email = excluded.email,
             name = excluded.name,
             checked_in_at = excluded.checked_in_at,
             data = excluded.data,
             updated_at = now()`,
      [
        session.workspace.id,
        attendeeId,
        safeText(attendee.eventId, 80) || null,
        safeText(attendee.email, 254).toLowerCase() || null,
        safeText(attendee.name, 180) || null,
        attendee.timestamp || null,
        JSON.stringify(attendee || {})
      ]
    );
  }

  if (attendeeIds.length) {
    await q(`delete from attendees where workspace_id = $1 and not (attendee_id = any($2::text[]))`, [session.workspace.id, attendeeIds]);
  } else {
    await q(`delete from attendees where workspace_id = $1`, [session.workspace.id]);
  }

  if (body.makeBackup === true || reason === "manual_sync") {
    await q(
      `insert into workspace_backups(workspace_id, backup_type, state_hash, state, created_by)
       values ($1,$2,$3,$4::jsonb,$5)`,
      [session.workspace.id, reason === "manual_sync" ? "manual" : "sync", hash, JSON.stringify(state), session.user.id]
    );
  }

  await auditWorkspaceEvent(req, session, "sync", reason, {
    attendeeCount: Array.isArray(state.attendees) ? state.attendees.length : 0,
    stateHash: hash,
    manualBackup: body.makeBackup === true,
    mirroredAttendees: attendeeIds.length
  });

  return json(200, { ok: true, updatedAt: new Date().toISOString(), stateHash: hash, workspace: session.workspace }, cors);
});
