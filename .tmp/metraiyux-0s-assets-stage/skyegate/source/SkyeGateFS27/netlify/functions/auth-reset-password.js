import { wrap } from "./_lib/wrap.js";
import { buildCors, json, badRequest } from "./_lib/http.js";
import { audit } from "./_lib/audit.js";
import { consumeResetToken } from "./_lib/emailAuth.js";
import { hashPassword } from "./_lib/passwords.js";
import { getUserById, updateUserPassword } from "./_lib/identity.js";
import { revokeAllUserSessions } from "./_lib/sessions.js";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resetPage({ token = "", error = "", success = false } = {}) {
  const title = success ? "Password reset complete" : "Reset your password";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#070b12; color:#f7fbff; }
    body { min-height:100vh; margin:0; display:grid; place-items:center; padding:24px; background:radial-gradient(circle at 20% 0%, rgba(46,130,255,.22), transparent 32%), #070b12; }
    main { width:min(440px, 100%); border:1px solid rgba(255,255,255,.14); border-radius:8px; padding:28px; background:rgba(8,13,24,.92); box-shadow:0 24px 80px rgba(0,0,0,.35); }
    h1 { margin:0 0 10px; font-size:24px; letter-spacing:0; }
    p { color:#aeb9ca; line-height:1.5; }
    label { display:block; margin:18px 0 8px; color:#dce7f8; font-weight:700; }
    input { width:100%; box-sizing:border-box; border:1px solid rgba(255,255,255,.16); border-radius:6px; padding:13px 14px; background:#0d1421; color:#fff; font:inherit; }
    button { width:100%; margin-top:18px; border:0; border-radius:6px; padding:13px 16px; background:#64d2ff; color:#04101b; font-weight:800; cursor:pointer; }
    .error { color:#ffb4b4; }
    .success { color:#9ff0c2; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    ${success ? '<p class="success">Your password has been updated. You can return to your dashboard and sign in with the new password.</p>' : '<p>Set a new password for your SkyeGate FS27 account.</p>'}
    ${error ? `<p class="error">${esc(error)}</p>` : ""}
    ${success ? "" : `<form method="post" action="/.netlify/functions/auth-reset-password">
      <input type="hidden" name="token" value="${esc(token)}" />
      <label for="password">New password</label>
      <input id="password" name="password" type="password" autocomplete="new-password" required minlength="8" />
      <button type="submit">Reset password</button>
    </form>`}
  </main>
</body>
</html>`;
}

function html(body, { status = 200, cors = {} } = {}) {
  return new Response(body, {
    status,
    headers: { ...cors, "content-type": "text/html; charset=utf-8" }
  });
}

async function readBodyOrQuery(req) {
  let body = {};
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      body = Object.fromEntries(form.entries());
    } catch {}
  } else {
    try { body = await req.json(); } catch {}
  }
  const url = new URL(req.url);
  return {
    token: body.token || url.searchParams.get("token") || "",
    password: body.password || ""
  };
}

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (!["GET", "POST"].includes(req.method)) return json(405, { error: "Method not allowed" }, cors);

  const payload = await readBodyOrQuery(req);
  if (req.method === "GET") {
    if (!payload.token) return html(resetPage({ error: "Missing reset token." }), { status: 400, cors });
    return html(resetPage({ token: payload.token }), { cors });
  }
  const wantsHtml = (req.headers.get("content-type") || "").includes("application/x-www-form-urlencoded");
  if (!payload.token || !payload.password) {
    if (wantsHtml) return html(resetPage({ token: payload.token, error: "Missing token or password." }), { status: 400, cors });
    return badRequest("Missing token or password", cors);
  }

  const tokenRow = await consumeResetToken(payload.token);
  if (!tokenRow) {
    if (wantsHtml) return html(resetPage({ error: "Invalid or expired token." }), { status: 400, cors });
    return json(400, { error: "Invalid or expired token" }, cors);
  }
  const user = await getUserById(tokenRow.user_id);
  if (!user) {
    if (wantsHtml) return html(resetPage({ error: "User not found." }), { status: 404, cors });
    return json(404, { error: "User not found" }, cors);
  }

  await updateUserPassword(user.id, await hashPassword(payload.password));
  await revokeAllUserSessions(user.id, "password_reset");
  await audit("auth", "AUTH_RESET_PASSWORD", `user:${user.id}`);

  if (wantsHtml) return html(resetPage({ success: true }), { cors });
  return json(200, { ok: true }, cors);
});
