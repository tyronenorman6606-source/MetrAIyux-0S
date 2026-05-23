import { wrap } from "./_lib/wrap.js";
import { buildCors, json } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { enforceWorkspaceRateLimit, requirePermission, resolveWorkspaceSession, touchWorkspaceSession } from "./_lib/signinpro.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "GET") return json(405, { ok: false, error: "Method not allowed." }, cors);

  const session = await resolveWorkspaceSession(req);
  if (!session) return json(401, { ok: false, error: "Not signed in." }, cors);
  await enforceWorkspaceRateLimit({ request: req, workspaceId: session.workspace.id, workspaceSlug: session.workspace.slug, route: "workspace-audit", scope: "private", limit: 60, windowSeconds: 60 });
  await touchWorkspaceSession(session.sessionId, req);
  requirePermission(session, "audit");

  const limit = Math.max(1, Math.min(250, Number(new URL(req.url).searchParams.get("limit") || 100)));
  const rows = await q(
    `select a.id, a.action, a.detail, a.data, a.created_at, u.email, u.role
       from workspace_audit_events a
       left join workspace_users u on u.id = a.user_id
      where a.workspace_id = $1
      order by a.created_at desc
      limit $2`,
    [session.workspace.id, limit]
  );
  return json(200, { ok: true, workspace: session.workspace, events: rows.rows }, cors);
});
