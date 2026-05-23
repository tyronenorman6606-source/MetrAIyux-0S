import { getSql, json, requireSession } from './_shared.mjs';

export async function handler(event) {
  try {
    if (event.httpMethod !== 'GET') return json(405, { ok: false, error: 'Method not allowed.' });
    const session = await requireSession(event);
    if (!session) return json(401, { ok: false, error: 'Not signed in.' });
    const sql = getSql();
    const rows = await sql`select state, updated_at, state_hash, revision from workspace_states where workspace_id = ${session.workspace.id} limit 1`;
    return json(200, {
      ok: true,
      workspace: session.workspace,
      user: session.user,
      csrfToken: session.csrfToken,
      remoteState: rows[0] ? rows[0].state : null,
      updatedAt: rows[0] ? rows[0].updated_at : null,
      stateHash: rows[0] ? rows[0].state_hash : null,
      revision: rows[0] ? rows[0].revision : 0
    });
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message || 'Session failed.' });
  }
}
