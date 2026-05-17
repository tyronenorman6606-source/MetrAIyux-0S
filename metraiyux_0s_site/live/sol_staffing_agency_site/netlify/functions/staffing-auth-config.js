const { json } = require("./_lib/http.js");

exports.handler = async function(event) {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  return json(200, {
    authority: "Skyegate FS27",
    login_url: process.env.SKYGATE_FS27_LOGIN_URL || process.env.SKYEGATE_FS27_LOGIN_URL || "",
    introspection_configured: Boolean(
      process.env.SKYGATE_FS27_INTROSPECT_URL ||
      process.env.SKYEGATE_FS27_INTROSPECT_URL ||
      process.env.SKYGATE_INTROSPECT_URL ||
      process.env.SKYEGATE_INTROSPECT_URL
    )
  });
};
