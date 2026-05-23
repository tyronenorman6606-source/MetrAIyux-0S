import { wrap } from "./_lib/wrap.js";
import { buildCors, json } from "./_lib/http.js";
import { auditWorkspaceEvent, clearSessionCookie, resolveWorkspaceSession, revokeWorkspaceSession } from "./_lib/signinpro.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed." }, cors);

  const session = await resolveWorkspaceSession(req).catch(() => null);
  if (session) {
    await auditWorkspaceEvent(req, session, "logout", "Workspace user signed out.", {});
    await revokeWorkspaceSession(session.sessionId, "logout");
  }
  return json(200, { ok: true }, { ...cors, "set-cookie": clearSessionCookie(req) });
});
