import { getSql, json, requireSession, requirePermission } from './_shared.mjs';

export async function handler(event) {
  try {
    if (event.httpMethod !== 'GET') return json(405, { ok: false, error: 'Method not allowed.' });
    const session = await requireSession(event);
    if (!session) return json(401, { ok: false, error: 'Not signed in.' });
    requirePermission(session, 'audit');
    const limit = Math.max(1, Math.min(250, Number(event.queryStringParameters && event.queryStringParameters.limit || 100)));
    const sql = getSql();
    const rows = await sql`
      select a.id, a.action, a.detail, a.data, a.created_at, u.email, u.role
        from workspace_audit_events a
        left join workspace_users u on u.id = a.user_id
       where a.workspace_id = ${session.workspace.id}
       order by a.created_at desc
       limit ${limit}
    `;
    return json(200, { ok: true, workspace: session.workspace, events: rows });
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message || 'Audit fetch failed.' });
  }
}
