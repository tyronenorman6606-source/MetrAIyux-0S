const { json } = require("./_lib/http.js");
const { requireAuth } = require("./_lib/auth.js");

exports.handler = async function(event) {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  const auth = await requireAuth(event);
  if (!auth.ok) return auth.response;
  return json(200, { ok: true, auth: auth.claims });
};
