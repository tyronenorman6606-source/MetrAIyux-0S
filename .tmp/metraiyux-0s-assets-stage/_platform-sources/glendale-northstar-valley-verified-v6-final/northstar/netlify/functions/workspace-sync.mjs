import { getSql, json, readBody, requireSession, requirePermission, requireCsrf, sanitizeStateForStore, safeText, stateHash, auditEvent } from './_shared.mjs';

export async function handler(event) {
  try {
    const session = await requireSession(event);
    if (!session) return json(401, { ok: false, error: 'Not signed in.' });
    const sql = getSql();
    if (event.httpMethod === 'GET') {
      requirePermission(session, 'read');
      const rows = await sql`select state, updated_at, state_hash, revision from workspace_states where workspace_id = ${session.workspace.id} limit 1`;
      return json(200, { ok: true, workspace: session.workspace, user: session.user, state: rows[0] ? rows[0].state : null, updatedAt: rows[0] ? rows[0].updated_at : null, stateHash: rows[0] ? rows[0].state_hash : null, revision: rows[0] ? rows[0].revision : 0 });
    }
    if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
    requireCsrf(event, session);
    requirePermission(session, 'write');
    const body = await readBody(event);
    const state = sanitizeStateForStore(body.state, session.workspace);
    const reason = safeText(body.reason || 'workspace_sync', 160);
    const hash = stateHash(state);

    await sql`
      insert into workspace_states (workspace_id, state, state_hash, revision, updated_by, updated_at)
      values (${session.workspace.id}, ${JSON.stringify(state)}::jsonb, ${hash}, 1, ${session.user.id}, now())
      on conflict (workspace_id) do update set state = excluded.state, state_hash = excluded.state_hash, revision = workspace_states.revision + 1, updated_by = excluded.updated_by, updated_at = now()
    `;

    const attendeeIds = [];
    for (const attendee of state.attendees || []) {
      const attendeeId = safeText(attendee.id, 120);
      if (!attendeeId) continue;
      attendeeIds.push(attendeeId);
      await sql`
        insert into attendees (workspace_id, attendee_id, event_id, email, name, checked_in_at, data, updated_at)
        values (${session.workspace.id}, ${attendeeId}, ${safeText(attendee.eventId, 80)}, ${safeText(attendee.email, 254).toLowerCase()}, ${safeText(attendee.name, 180)}, ${attendee.timestamp || null}, ${JSON.stringify(attendee)}::jsonb, now())
        on conflict (workspace_id, attendee_id) do update set event_id = excluded.event_id, email = excluded.email, name = excluded.name, checked_in_at = excluded.checked_in_at, data = excluded.data, updated_at = now()
      `;
    }

    if (attendeeIds.length) {
      await sql`delete from attendees where workspace_id = ${session.workspace.id} and not (attendee_id = any(${attendeeIds}))`;
    } else {
      await sql`delete from attendees where workspace_id = ${session.workspace.id}`;
    }

    if (body.makeBackup === true || reason === 'manual_sync') {
      await sql`
        insert into workspace_backups (workspace_id, backup_type, state_hash, state, created_by)
        values (${session.workspace.id}, ${reason === 'manual_sync' ? 'manual' : 'sync'}, ${hash}, ${JSON.stringify(state)}::jsonb, ${session.user.id})
      `;
    }

    await auditEvent(sql, event, session, 'sync', reason, { attendeeCount: state.attendees.length, stateHash: hash, manualBackup: body.makeBackup === true, mirroredAttendees: attendeeIds.length });

    return json(200, { ok: true, updatedAt: new Date().toISOString(), stateHash: hash, workspace: session.workspace });
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message || 'Sync failed.' });
  }
}
