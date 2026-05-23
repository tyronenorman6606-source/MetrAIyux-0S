import { getSql, json, readBody, requireSession, requirePermission, requireCsrf, safeText, auditEvent } from './_shared.mjs';

function cleanObject(value, maxText = 1000) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};
  for (const [key, raw] of Object.entries(value).slice(0, 80)) {
    const k = safeText(key, 80);
    if (!k) continue;
    if (raw && typeof raw === 'object') out[k] = cleanObject(raw, maxText);
    else if (typeof raw === 'boolean' || typeof raw === 'number') out[k] = raw;
    else out[k] = safeText(raw, maxText);
  }
  return out;
}

export async function handler(event) {
  try {
    const session = await requireSession(event);
    if (!session) return json(401, { ok: false, error: 'Not signed in.' });
    const sql = getSql();
    if (event.httpMethod === 'GET') {
      requirePermission(session, 'read');
      const rows = await sql`select branding, app_settings, security_settings, updated_at from workspace_settings where workspace_id = ${session.workspace.id} limit 1`;
      return json(200, { ok: true, workspace: session.workspace, settings: rows[0] || { branding: {}, app_settings: {}, security_settings: {} } });
    }
    if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
    requireCsrf(event, session);
    requirePermission(session, 'settings');
    const body = await readBody(event);
    const branding = cleanObject(body.branding || {});
    const appSettings = cleanObject(body.appSettings || body.app_settings || {});
    const securitySettings = cleanObject(body.securitySettings || body.security_settings || {});
    await sql`
      insert into workspace_settings (workspace_id, branding, app_settings, security_settings, updated_by, updated_at)
      values (${session.workspace.id}, ${JSON.stringify(branding)}::jsonb, ${JSON.stringify(appSettings)}::jsonb, ${JSON.stringify(securitySettings)}::jsonb, ${session.user.id}, now())
      on conflict (workspace_id) do update set branding = workspace_settings.branding || excluded.branding, app_settings = workspace_settings.app_settings || excluded.app_settings, security_settings = workspace_settings.security_settings || excluded.security_settings, updated_by = excluded.updated_by, updated_at = now()
    `;
    await auditEvent(sql, event, session, 'settings_updated', 'Workspace settings updated.', { brandingKeys: Object.keys(branding), appSettingsKeys: Object.keys(appSettings) });
    return json(200, { ok: true, workspace: session.workspace });
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, error: error.message || 'Settings update failed.' });
  }
}
