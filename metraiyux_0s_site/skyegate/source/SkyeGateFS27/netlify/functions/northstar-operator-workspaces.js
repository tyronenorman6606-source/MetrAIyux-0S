import { wrap } from "./_lib/wrap.js";
import { buildCors, json } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { requireOperatorBearer } from "./_lib/signinpro.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "GET") return json(405, { ok: false, error: "Method not allowed." }, cors);
  await requireOperatorBearer(req);

  const rows = await q(
    `select
        w.id, w.slug, w.name, w.status, w.plan, w.primary_customer_id, w.communication_email, w.skyemail, w.updated_at,
        count(distinct u.id)::int as users,
        count(distinct a.attendee_id)::int as attendees
      from workspaces w
      left join workspace_users u on u.workspace_id = w.id
      left join attendees a on a.workspace_id = w.id
      group by w.id
      order by w.updated_at desc`
  );
  return json(200, { ok: true, workspaces: rows.rows }, cors);
});
