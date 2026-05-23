import { getSql, json, requireSession, requirePermission } from './_shared.mjs';

export async function handler(event) {
  try {
    if (event.httpMethod !== 'GET') return json(405, { ok: false, error: 'Method not allowed.' });
    const session = await requireSession(event);
    if (!session) return json(401, { ok: false, error: 'Not signed in.' });
    requirePermission(session, 'backup');
    const limit = Math.max(1, Math.min(100, Number(event.queryStringParameters && event.queryStringParameters.limit || 25)));
    const sql = getSql();
    const rows = await sql`
      select id, backup_type, state_hash, created_at
        from workspace_backups
       where workspace_id = ${session.workspace.id}
       order by created_at desc
       limit ${limit}
    `;
    return json(200, { ok: true, backups: rows });
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message || 'Backups fetch failed.' });
  }
}
