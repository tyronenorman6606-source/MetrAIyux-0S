const { json } = require("./_lib/http.js");
const { clearSessionCookie } = require("./_lib/auth.js");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  return json(200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
};
