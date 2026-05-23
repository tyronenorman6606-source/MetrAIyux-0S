import { wrap } from "./_lib/wrap.js";
import crypto from "crypto";
import { buildCors, json } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { auditWorkspaceEvent, enforceWorkspaceRateLimit, requireCsrf, requirePermission, resolveWorkspaceSession, safeText, touchWorkspaceSession, upsertWorkspaceGateUser } from "./_lib/signinpro.js";

const ROLES = new Set(["owner", "admin", "operator", "viewer"]);

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });

  const session = await resolveWorkspaceSession(req);
  if (!session) return json(401, { ok: false, error: "Not signed in." }, cors);
  await enforceWorkspaceRateLimit({ request: req, workspaceId: session.workspace.id, workspaceSlug: session.workspace.slug, route: "workspace-users", scope: "private", limit: 60, windowSeconds: 60 });
  await touchWorkspaceSession(session.sessionId, req);

  if (req.method === "GET") {
    requirePermission(session, "users");
    const users = await q(
      `select id, linked_user_id, email, communication_email, skyemail, role, status, created_at, updated_at, last_login_at
         from workspace_users
        where workspace_id = $1
        order by created_at asc`,
      [session.workspace.id]
    );
    return json(200, { ok: true, users: users.rows }, cors);
  }

  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed." }, cors);
  requireCsrf(req, session);
  requirePermission(session, "users");
  const body = await req.json().catch(() => ({}));
  const email = safeText(body.email, 254).toLowerCase();
  const role = ROLES.has(body.role) ? body.role : "operator";
  const status = body.status === "disabled" ? "disabled" : "active";
  const password = String(body.password || crypto.randomUUID());
  if (!email || !email.includes("@")) return json(400, { ok: false, error: "A valid email is required." }, cors);
  if (session.user.role !== "owner" && role === "owner") return json(403, { ok: false, error: "Only owners can create another owner." }, cors);

  const result = await upsertWorkspaceGateUser({
    workspaceId: session.workspace.id,
    workspaceSlug: session.workspace.slug,
    customerId: session.workspace.primaryCustomerId || null,
    email,
    password,
    role,
    displayName: body.displayName || body.name || null,
    communicationEmail: body.communicationEmail || null,
    skyemail: body.skyemail || null,
    provisionedBy: session.user.gateUserEmail || session.user.email || "northstar-signinpro"
  });
  if (status === "disabled") {
    await q(`update workspace_users set status = 'disabled', updated_at = now() where id = $1`, [result.workspaceUser.id]);
  }

  await auditWorkspaceEvent(req, session, "workspace_user_upserted", "Workspace user created or updated.", {
    email,
    role,
    status,
    linked_user_id: result.gateUser.id
  });

  return json(200, {
    ok: true,
    user: {
      id: result.workspaceUser.id,
      linked_user_id: result.workspaceUser.linked_user_id || result.gateUser.id,
      email: result.workspaceUser.email,
      communication_email: result.workspaceUser.communication_email || null,
      skyemail: result.workspaceUser.skyemail || null,
      role: result.workspaceUser.role,
      status
    },
    oneTimePassword: result.oneTimePassword
  }, cors);
});
