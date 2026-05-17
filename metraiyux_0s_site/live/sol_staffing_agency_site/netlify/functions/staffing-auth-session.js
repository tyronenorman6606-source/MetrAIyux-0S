const { json, getBearer, parseJson } = require("./_lib/http.js");
const { cleanToken, introspectToken, publicClaims, sessionCookie } = require("./_lib/auth.js");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const body = parseJson(event);
  if (body === null) return json(400, { error: "Invalid JSON" });

  const token = cleanToken(body.token || getBearer(event));
  if (!token) return json(400, { error: "Missing Skyegate FS27 token" });

  const claims = await introspectToken(token);
  if (!claims || !claims.active) return json(401, { error: "Skyegate FS27 token is inactive" });

  return json(200, {
    ok: true,
    auth: publicClaims(claims)
  }, {
    "Set-Cookie": sessionCookie(token, Number(process.env.SOL_STAFFING_SESSION_SECONDS || 28800))
  });
};
