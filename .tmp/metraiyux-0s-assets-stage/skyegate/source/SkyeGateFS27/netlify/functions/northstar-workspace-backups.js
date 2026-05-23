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
  await enforceWorkspaceRateLimit({ request: req, workspaceId: session.workspace.id, workspaceSlug: session.workspace.slug, route: "workspace-backups", scope: "private", limit: 60, windowSeconds: 60 });
  await touchWorkspaceSession(session.sessionId, req);
  requirePermission(session, "backup");

  const limit = Math.max(1, Math.min(100, Number(new URL(req.url).searchParams.get("limit") || 25)));
  const rows = await q(
    `select id, backup_type, state_hash, created_at
       from workspace_backups
      where workspace_id = $1
      order by created_at desc
      limit $2`,
    [session.workspace.id, limit]
  );
  return json(200, { ok: true, backups: rows.rows }, cors);
});
