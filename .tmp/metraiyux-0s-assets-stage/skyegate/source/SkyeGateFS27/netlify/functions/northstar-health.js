import { wrap } from "./_lib/wrap.js";
import { buildCors, json } from "./_lib/http.js";
import { q } from "./_lib/db.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (!["GET", "HEAD"].includes(req.method)) return json(405, { ok: false, error: "Method not allowed." }, cors);

  const counts = await Promise.all([
    q(`select count(*)::int as count from workspaces`),
    q(`select count(*)::int as count from workspace_users`),
    q(`select count(*)::int as count from workspace_states`)
  ]);

  return json(200, {
    ok: true,
    app: "northstar-signinpro",
    mounted: true,
    gate_owned: true,
    free99_rate_limited: true,
    tables: {
      workspaces: Number(counts[0].rows[0]?.count || 0),
      workspace_users: Number(counts[1].rows[0]?.count || 0),
      workspace_states: Number(counts[2].rows[0]?.count || 0)
    }
  }, cors);
});
