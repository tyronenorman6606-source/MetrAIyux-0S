const { json } = require("./_utils");

function zeroOsGateOrigin() {
  return String(process.env.ZERO_OS_GATE_ORIGIN || process.env.METRAIYUX_0S_ORIGIN || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, "");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  const signup = new URL("/gate/signup/", zeroOsGateOrigin());
  signup.searchParams.set("return", "/live/SkyeMail/session-handoff.html?next=onboarding.html&from=skymail-auth-signup");
  return json(410, {
    ok: false,
    error: "app_local_auth_disabled_by_shared_gate",
    message: "SkyeMail signup is owned by the canonical 0S Gate. Create or unlock the SkyeGate FS27 session, then call /auth-fs27-session to bind SkyeMail.",
    gate_required: true,
    gate_signup: signup.toString(),
    session_endpoint: "/auth-fs27-session"
  });
};
