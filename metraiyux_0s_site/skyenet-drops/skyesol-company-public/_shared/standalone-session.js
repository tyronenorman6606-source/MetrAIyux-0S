(function () {
  const SESSION_KEY = "skyesol.fs27.bridge.session";

  function gateBridge() {
    return window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
  }

  function normalize(session) {
    if (!session || typeof session !== "object" || !session.token) return null;
    return {
      ...session,
      source: session.source || "0s-gate-card-bridge",
      client: session.client || "SkyeSol",
      status: session.status || "free99_gate_session"
    };
  }

  function getSession() {
    return normalize(gateBridge()?.current?.());
  }

  function getToken() {
    return String(getSession()?.token || "");
  }

  function setSession(session, token) {
    const nextSession = normalize({ ...(session || {}), token: token || session?.token || "" });
    if (nextSession) {
      gateBridge()?.persist?.(nextSession, { silent: true });
      gateBridge()?.record?.("skyesol_gate_ready", nextSession, nextSession);
    }
    return nextSession || {};
  }

  function clearSession() {
    gateBridge()?.clear?.();
  }

  window.SkyeStandaloneSession = {
    keys: { session: SESSION_KEY },
    getSession,
    getToken,
    setSession,
    clearSession,
  };
})();
