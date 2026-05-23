import { getSql, json, requireOperator } from './_shared.mjs';
export async function handler(event) {
  try {
    requireOperator(event);
    const sql = getSql();
    const rows = await sql`
      select w.id, w.slug, w.name, w.status, w.plan, w.updated_at,
             count(distinct u.id) as users,
             count(distinct a.attendee_id) as attendees
        from workspaces w
        left join workspace_users u on u.workspace_id = w.id
        left join attendees a on a.workspace_id = w.id
       group by w.id
       order by w.updated_at desc
    `;
    return json(200, { ok: true, workspaces: rows });
  } catch (error) {
    return json(401, { ok: false, error: error.message || 'Unauthorized.' });
  }
}
