const { json } = require("./_utils");
const {
  requireFs27,
  ensureSkyeMailUser,
  mintSkyeMailSession,
  mirrorPlatformEvent
} = require("./_skygate");

exports.handler = async (event) => {
  try {
    if (String(event.httpMethod || "POST").toUpperCase() !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const claims = await requireFs27(event);
    const user = await ensureSkyeMailUser(claims);
    const token = mintSkyeMailSession(user, claims);

    await mirrorPlatformEvent({
      actor: user.email,
      org_id: claims.customer_id || claims.org || null,
      ws_id: user.id,
      type: "skymail.auth.fs27_session",
      meta: {
        skymail_user_id: user.id,
        handle: user.handle,
        fs27_sub: claims.sub || null,
        fs27_role: claims.role || null,
        fs27_client_id: claims.client_id || null
      }
    }).catch(() => null);

    return json(200, {
      ok: true,
      token,
      handle: user.handle,
      email: user.email,
      auth_provider: "skygatefs27",
      fs27: {
        active: true,
        sub: claims.sub || null,
        role: claims.role || null,
        customer_id: claims.customer_id || claims.org || null,
        scope: claims.scope || ""
      }
    });
  } catch (err) {
    return json(err.statusCode || 500, { error: err.message || "Server error", skygate: err.skygate || null });
  }
};
