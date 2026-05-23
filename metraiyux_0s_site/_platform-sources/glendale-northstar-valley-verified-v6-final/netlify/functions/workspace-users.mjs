import { getSql, json, readBody, requireSession, requirePermission, requireCsrf, safeText, hashPassword, randomToken, auditEvent } from './_shared.mjs';

const ROLES = new Set(['owner','admin','operator','viewer']);

export async function handler(event) {
  try {
    const session = await requireSession(event);
    if (!session) return json(401, { ok: false, error: 'Not signed in.' });
    const sql = getSql();
    if (event.httpMethod === 'GET') {
      requirePermission(session, 'users');
      const users = await sql`
        select id, email, role, status, created_at, updated_at, last_login_at
          from workspace_users
         where workspace_id = ${session.workspace.id}
         order by created_at asc
      `;
      return json(200, { ok: true, users });
    }
    if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
    requireCsrf(event, session);
    requirePermission(session, 'users');
    const body = await readBody(event);
    const email = safeText(body.email, 254).toLowerCase();
    const role = ROLES.has(body.role) ? body.role : 'operator';
    const status = body.status === 'disabled' ? 'disabled' : 'active';
    const password = String(body.password || randomToken(18));
    if (!email || !email.includes('@')) return json(400, { ok: false, error: 'A valid email is required.' });
    if (session.user.role !== 'owner' && role === 'owner') return json(403, { ok: false, error: 'Only owners can create another owner.' });
    const passwordHash = hashPassword(password);
    const rows = await sql`
      insert into workspace_users (workspace_id, email, password_hash, role, status, updated_at)
      values (${session.workspace.id}, ${email}, ${passwordHash}, ${role}, ${status}, now())
      on conflict (workspace_id, email) do update set password_hash = excluded.password_hash, role = excluded.role, status = excluded.status, updated_at = now()
      returning id, email, role, status, created_at, updated_at
    `;
    await auditEvent(sql, event, session, 'workspace_user_upserted', 'Workspace user created or updated.', { email, role, status });
    return json(200, { ok: true, user: rows[0], oneTimePassword: password });
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message || 'Workspace user update failed.' });
  }
}
