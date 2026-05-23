import { wrap } from "./_lib/wrap.js";
import { buildCors, json } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { enforceWorkspaceRateLimit, resolveWorkspaceSession, touchWorkspaceSession } from "./_lib/signinpro.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "GET") return json(405, { ok: false, error: "Method not allowed." }, cors);

  const session = await resolveWorkspaceSession(req);
  if (!session) return json(401, { ok: false, error: "Not signed in." }, cors);
  await enforceWorkspaceRateLimit({ request: req, workspaceId: session.workspace.id, workspaceSlug: session.workspace.slug, route: "auth-session", scope: "private", limit: 120, windowSeconds: 60 });
  await touchWorkspaceSession(session.sessionId, req);

  const rows = await q(`select state, updated_at, state_hash, revision from workspace_states where workspace_id = $1 limit 1`, [session.workspace.id]);
  return json(200, {
    ok: true,
    workspace: session.workspace,
    user: session.user,
    csrfToken: session.csrfToken,
    remoteState: rows.rows[0] ? rows.rows[0].state : null,
    updatedAt: rows.rows[0] ? rows.rows[0].updated_at : null,
    stateHash: rows.rows[0] ? rows.rows[0].state_hash : null,
    revision: rows.rows[0] ? rows.rows[0].revision : 0
  }, cors);
});
