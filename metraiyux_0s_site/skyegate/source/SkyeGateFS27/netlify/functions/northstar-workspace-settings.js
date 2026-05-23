import { wrap } from "./_lib/wrap.js";
import { buildCors, json } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { auditWorkspaceEvent, cleanObject, enforceWorkspaceRateLimit, requireCsrf, requirePermission, resolveWorkspaceSession, touchWorkspaceSession } from "./_lib/signinpro.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });

  const session = await resolveWorkspaceSession(req);
  if (!session) return json(401, { ok: false, error: "Not signed in." }, cors);
  await enforceWorkspaceRateLimit({ request: req, workspaceId: session.workspace.id, workspaceSlug: session.workspace.slug, route: "workspace-settings", scope: "private", limit: 60, windowSeconds: 60 });
  await touchWorkspaceSession(session.sessionId, req);

  if (req.method === "GET") {
    requirePermission(session, "read");
    const rows = await q(`select branding, app_settings, security_settings, updated_at from workspace_settings where workspace_id = $1 limit 1`, [session.workspace.id]);
    return json(200, {
      ok: true,
      workspace: session.workspace,
      settings: rows.rows[0] || { branding: {}, app_settings: {}, security_settings: {} }
    }, cors);
  }

  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed." }, cors);
  requireCsrf(req, session);
  requirePermission(session, "settings");

  const body = await req.json().catch(() => ({}));
  const branding = cleanObject(body.branding || {});
  const appSettings = cleanObject(body.appSettings || body.app_settings || {});
  const securitySettings = cleanObject(body.securitySettings || body.security_settings || {});
  await q(
    `insert into workspace_settings(workspace_id, branding, app_settings, security_settings, updated_by, updated_at)
     values ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,now())
     on conflict (workspace_id) do update
       set branding = workspace_settings.branding || excluded.branding,
           app_settings = workspace_settings.app_settings || excluded.app_settings,
           security_settings = workspace_settings.security_settings || excluded.security_settings,
           updated_by = excluded.updated_by,
           updated_at = now()`,
    [session.workspace.id, JSON.stringify(branding), JSON.stringify(appSettings), JSON.stringify(securitySettings), session.user.id]
  );

  await auditWorkspaceEvent(req, session, "settings_updated", "Workspace settings updated.", {
    brandingKeys: Object.keys(branding),
    appSettingsKeys: Object.keys(appSettings)
  });

  return json(200, { ok: true, workspace: session.workspace }, cors);
});
