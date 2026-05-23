import { wrap } from "./_lib/wrap.js";
import { buildCors, json, badRequest } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { countRecentFailedLogins, createWorkspaceSession, enforceLoginWindow, enforceWorkspaceRateLimit, recordLoginAttempt, safeText, slugify } from "./_lib/signinpro.js";
import { verifyPassword } from "./_lib/passwords.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed." }, cors);

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON", cors);

  const workspaceSlug = slugify(body.workspaceSlug || body.workspace || body.client);
  const email = safeText(body.email, 254).toLowerCase();
  const password = String(body.password || "");
  if (!workspaceSlug || !email || !password) {
    return badRequest("Workspace slug, email, and password are required.", cors);
  }

  await enforceWorkspaceRateLimit({ request: req, workspaceSlug, route: "auth-login", scope: "public", limit: 20, windowSeconds: 60 });
  const failed = await countRecentFailedLogins(req, workspaceSlug, email);
  enforceLoginWindow(failed);

  const result = await q(
    `select
        wu.id,
        wu.linked_user_id,
        wu.email,
        wu.password_hash,
        wu.role,
        wu.status as user_status,
        wu.communication_email,
        wu.skyemail,
        w.id as workspace_id,
        w.slug,
        w.name,
        w.status as workspace_status,
        w.plan,
        w.metadata,
        w.primary_customer_id,
        w.communication_email as workspace_communication_email,
        w.skyemail as workspace_skyemail,
        ws.branding,
        ws.app_settings,
        ws.security_settings
      from workspace_users wu
      join workspaces w on w.id = wu.workspace_id
      left join workspace_settings ws on ws.workspace_id = w.id
      where w.slug = $1
        and lower(wu.email) = lower($2)
      limit 1`,
    [workspaceSlug, email]
  );
  const row = result.rows[0];
  const ok = row && row.user_status === "active" && row.workspace_status === "active"
    ? await verifyPassword(password, row.password_hash)
    : false;
  if (!ok) {
    await recordLoginAttempt(req, workspaceSlug, email, false, "invalid_credentials");
    return json(401, { ok: false, error: "Invalid workspace login." }, cors);
  }

  await recordLoginAttempt(req, workspaceSlug, email, true, "login_ok");
  await q(`update workspace_users set last_login_at = now(), updated_at = now() where id = $1`, [row.id]);
  const sessionCookie = await createWorkspaceSession(req, {
    id: row.id,
    linked_user_id: row.linked_user_id,
    role: row.role
  }, {
    id: row.workspace_id,
    slug: row.slug,
    name: row.name,
    plan: row.plan,
    primary_customer_id: row.primary_customer_id
  });

  return json(200, {
    ok: true,
    workspace: {
      id: row.workspace_id,
      slug: row.slug,
      name: row.name,
      status: row.workspace_status,
      plan: row.plan,
      metadata: row.metadata || {},
      primaryCustomerId: row.primary_customer_id || null,
      communicationEmail: row.workspace_communication_email || null,
      skyemail: row.workspace_skyemail || null,
      branding: row.branding || {},
      appSettings: row.app_settings || {},
      securitySettings: row.security_settings || {}
    },
    user: {
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.user_status,
      linkedUserId: row.linked_user_id || null,
      communicationEmail: row.communication_email || null,
      skyemail: row.skyemail || null
    },
    csrfToken: sessionCookie.csrfToken
  }, { ...cors, "set-cookie": sessionCookie.cookie });
});
