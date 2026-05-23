import { wrap } from "./_lib/wrap.js";
import { buildCors, json, getBearer } from "./_lib/http.js";
import { gateAuthErrorResponse, requireGateAuth } from "./_lib/authz.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "GET") return json(405, { error: "Method not allowed" }, cors);

  const key = getBearer(req) || req.headers.get("x-0s-gate-session") || req.headers.get("x-skye-gate-session") || "";
  let row;
  try {
    row = await requireGateAuth(req, "viewer");
  } catch (e) {
    return gateAuthErrorResponse(e, cors);
  }

  return json(200, {
    ok: true,
    api_key_id: row.api_key_id,
    customer_id: row.customer_id,
    customer_email: row.customer_email || null,
    role: row.role || "deployer",
    key_last4: row.key_last4
  }, cors);
});
