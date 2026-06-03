const { json } = require("./_utils");

function zeroOsGateOrigin() {
  return String(process.env.ZERO_OS_GATE_ORIGIN || process.env.METRAIYUX_0S_ORIGIN || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, "");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  const login = new URL("/admin/login.html", zeroOsGateOrigin());
  login.searchParams.set("return", "/live/SkyeMail/session-handoff.html?next=dashboard.html&from=skymail-auth-login");
  return json(410, {
    ok: false,
    error: "app_local_auth_disabled_by_shared_gate",
    message: "SkyeMail login is owned by the canonical 0S Gate. Use an active SkyeGate FS27 bearer with /auth-fs27-session.",
    gate_required: true,
    gate_login: login.toString(),
    session_endpoint: "/auth-fs27-session"
  });
};
