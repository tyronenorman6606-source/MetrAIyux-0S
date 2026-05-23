import { getSql, json, readBody, safeText, slugify, verifyPassword, signSession, sessionCookie, randomToken, countRecentFailedLogins, recordLoginAttempt, enforceLoginWindow, auditEvent, permissionsForRole } from './_shared.mjs';

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
    const body = await readBody(event);
    const workspaceSlug = slugify(body.workspaceSlug || body.workspace || body.client);
    const email = safeText(body.email, 254).toLowerCase();
    const password = String(body.password || '');
    if (!workspaceSlug || !email || !password) return json(400, { ok: false, error: 'Workspace slug, email, and password are required.' });
    const sql = getSql();
    const failed = await countRecentFailedLogins(sql, event, workspaceSlug, email);
    enforceLoginWindow(failed);
    const rows = await sql`
      select u.id as user_id, u.email, u.password_hash, u.role, u.status as user_status,
             w.id as workspace_id, w.slug, w.name, w.status as workspace_status, w.plan, w.metadata,
             s.branding, s.app_settings, s.security_settings
        from workspace_users u
        join workspaces w on w.id = u.workspace_id
        left join workspace_settings s on s.workspace_id = w.id
       where w.slug = ${workspaceSlug} and lower(u.email) = ${email}
       limit 1
    `;
    const row = rows[0];
    if (!row || row.user_status !== 'active' || row.workspace_status !== 'active' || !verifyPassword(password, row.password_hash)) {
      await recordLoginAttempt(sql, event, workspaceSlug, email, false, 'invalid_credentials');
      return json(401, { ok: false, error: 'Invalid workspace login.' });
    }
    await recordLoginAttempt(sql, event, workspaceSlug, email, true, 'login_ok');
    await sql`update workspace_users set last_login_at = now(), updated_at = now() where id = ${row.user_id}`;
    const csrf = randomToken(24);
    const token = signSession({ workspaceId: row.workspace_id, userId: row.user_id, role: row.role, csrf });
    const session = {
      user: { id: row.user_id, email: row.email, role: row.role, permissions: permissionsForRole(row.role) },
      workspace: { id: row.workspace_id, slug: row.slug, name: row.name, status: row.workspace_status, plan: row.plan, metadata: row.metadata || {}, branding: row.branding || {}, appSettings: row.app_settings || {}, securitySettings: row.security_settings || {} },
      csrfToken: csrf
    };
    await auditEvent(sql, event, session, 'login', 'Workspace user signed in.', { role: row.role, email: row.email });
    return json(200, { ok: true, workspace: session.workspace, user: session.user, csrfToken: csrf }, { 'set-cookie': sessionCookie(token) });
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message || 'Login failed.' });
  }
}
