import { wrap } from "./_lib/wrap.js";
import { buildCors, json } from "./_lib/http.js";
import { linkAppIdentity, resolveAppSpineActor } from "./_lib/appSpine.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  const actor = await resolveAppSpineActor(req);
  if (!actor) {
    return json(401, {
      error: "SkyeGate FS27 session required",
      code: "FS27_APP_SPINE_AUTH_REQUIRED"
    }, cors);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json(400, { error: "Invalid JSON body" }, cors);
  }

  try {
    const linked = await linkAppIdentity(body, actor);
    return json(200, { ok: true, linked, actor: { mode: actor.mode, role: actor.role } }, cors);
  } catch (error) {
    return json(error?.status || 500, {
      error: error?.message || "Could not link app identity into FS27.",
      code: error?.code || "FS27_APP_SPINE_LINK_FAILED"
    }, cors);
  }
});
