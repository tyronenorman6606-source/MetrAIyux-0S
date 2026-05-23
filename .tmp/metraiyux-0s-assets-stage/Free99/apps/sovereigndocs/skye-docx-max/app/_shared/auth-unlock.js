(function () {
  const TOKEN_EMAIL_KEY = "metraiyux.gate.email";
  const GATE_SYNC_EVENT = "metraiyux:gate-sync";
  const PLATFORM_ID = "skye-docx-max";
  const USAGE_LANE = "document-ai-analysis";

  function gateBridge() {
    if (window.MetrAIyuxGateBridge) return window.MetrAIyuxGateBridge;
    try {
      if (window.parent && window.parent !== window && window.parent.MetrAIyuxGateBridge) {
        return window.parent.MetrAIyuxGateBridge;
      }
    } catch {}
    return null;
  }

  function gateCards() {
    return [
      { id: "0s-core", status: "active", scope: "platform" },
      { id: "fs27", status: "active", scope: "auth" },
      { id: "skye-docx-max", status: "active", scope: "document-ai" },
      { id: "sovereigndocs", status: "active", scope: "document-suite" }
    ];
  }

  function gateSession() {
    const bridge = gateBridge();
    if (!bridge) return null;
    return bridge.requireSession?.({ platformId: PLATFORM_ID, usageLane: USAGE_LANE }) || bridge.current?.() || null;
  }

  function readToken() {
    return String(gateSession()?.token || "").trim();
  }

  function readTokenEmail() {
    const session = gateSession() || {};
    const claims = session.claims || {};
    return String(claims.email || session.email || session.actor || localStorage.getItem(TOKEN_EMAIL_KEY) || "").trim().toLowerCase();
  }

  function broadcastGateSync(token, lockedEmail) {
    const detail = {
      hasSession: Boolean(String(token || "").trim()),
      actor: String(lockedEmail || "").trim().toLowerCase(),
      platform_id: PLATFORM_ID,
      usage_lane: USAGE_LANE
    };
    try {
      window.dispatchEvent(new CustomEvent(GATE_SYNC_EVENT, { detail }));
    } catch {}
  }

  function persistUnlockedToken(token, lockedEmail) {
    const nextToken = String(token || "").trim();
    const nextEmail = String(lockedEmail || "").trim().toLowerCase();
    if (nextEmail) localStorage.setItem(TOKEN_EMAIL_KEY, nextEmail);
    const bridge = gateBridge();
    if (bridge && nextToken) {
      bridge.persist?.({
        token: nextToken,
        actor: nextEmail || "0s-operator",
        source: "skye-docx-max-gate-adapter",
        platform_id: PLATFORM_ID,
        usage_lane: USAGE_LANE,
        gate_cards: gateCards()
      });
      bridge.record?.("skye_docx_gate_session_synced", { platform_id: PLATFORM_ID, usage_lane: USAGE_LANE });
    }
    broadcastGateSync(nextToken, nextEmail);
  }

  function clearUnlockedToken() {
    localStorage.removeItem(TOKEN_EMAIL_KEY);
    broadcastGateSync("", "");
  }

  async function jsonRequest(path, body, method) {
    if (!(window.SKYE_REMOTE_API_ENABLED === true || (document.body && document.body.getAttribute("data-skye-remote-api") === "on"))) {
      throw new Error("Remote Skye API disabled for static mode.");
    }
    const headers = authHeaders();
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(path, {
      method: method || (body ? "POST" : "GET"),
      credentials: "include",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try {
      data = await res.json();
    } catch {}
    if (!res.ok) throw new Error(data && data.error ? data.error : `${path} failed (${res.status})`);
    return data;
  }

  async function readSessionMeta() {
    const session = gateSession();
    if (!session) throw new Error("Sign into 0S/SkyGate first.");
    return {
      ok: true,
      email: readTokenEmail(),
      actor: session.actor || readTokenEmail() || "0s-operator",
      gate_cards: session.gate_cards || [],
      platform_id: PLATFORM_ID,
      usage_lane: USAGE_LANE
    };
  }

  async function issueSessionToken(email, labelPrefix) {
    const token = readToken();
    if (!token) throw new Error("0S/SkyGate session required before document AI can issue a platform lane.");
    persistUnlockedToken(token, email || readTokenEmail());
    return { token, locked_email: email || readTokenEmail(), label_prefix: labelPrefix || "0s-gate-session" };
  }

  async function unlockWithPin() {
    const token = readToken();
    if (!token) throw new Error("PIN unlock is retired here. Use the active 0S/SkyGate login.");
    return { token, locked_email: readTokenEmail(), unlocked_by: "0s-skygate" };
  }

  async function ensureUnlockedAccess(options) {
    const settings = options || {};
    const session = gateSession();
    if (!session?.token) {
      if (settings.prompt === false) return { ok: false, gate_required: true };
      throw new Error("Sign into 0S/SkyGate first.");
    }
    gateBridge()?.record?.("skye_docx_gate_access_ok", { platform_id: PLATFORM_ID, usage_lane: USAGE_LANE, label_prefix: settings.labelPrefix || "skye-docx-max" });
    return {
      ok: true,
      reused: true,
      token: session.token,
      locked_email: readTokenEmail() || null,
      gate_cards: session.gate_cards || []
    };
  }

  function authHeaders() {
    const bridge = gateBridge();
    const headers = bridge?.headers?.({ "x-skye-platform": PLATFORM_ID, "x-skye-usage-lane": USAGE_LANE }) || {};
    const token = readToken();
    const email = readTokenEmail();
    if (token && !headers.Authorization && !headers.authorization) headers.Authorization = `Bearer ${token}`;
    if (email) headers["X-Token-Email"] = email;
    return headers;
  }

  window.SkyeAuthUnlock = {
    GATE_SYNC_EVENT,
    authHeaders,
    clearUnlockedToken,
    ensureUnlockedAccess,
    issueSessionToken,
    persistUnlockedToken,
    readSessionMeta,
    readToken,
    readTokenEmail,
    unlockWithPin,
  };
})();
