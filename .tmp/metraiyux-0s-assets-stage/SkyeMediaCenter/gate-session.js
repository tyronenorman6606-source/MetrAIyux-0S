(() => {
  "use strict";

  const SESSION_KEY = "SKYE_MEDIA_CENTER_GATE_SESSION";
  const MEDIA_TOKEN_KEY = "skye_media_center_token";
  const SAAS_SESSION_KEY = "saas_client_session";
  const LEGACY_KEYS = [
    "SKYGATEFS27_USER_TOKEN",
    "SKYGATEFS27_GATE_SESSION",
    "SKYGATEFS27_SESSION_TOKEN",
    "SKYGATE_USER_TOKEN",
    "SKYE_GATE_SESSION",
    "SKYGATE_SESSION_TOKEN",
    "METRAIYUX_GATE_SESSION"
  ];
  const EVENT_READY = "skyemediacenter:gate-ready";

  let resolvedSession = null;
  let waitingResolve = null;

  const clean = (value) => String(value == null ? "" : value).trim();
  const safeToken = (value) => clean(value).replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 4096);
  const tokenLooksValid = (value) => /^[a-zA-Z0-9:_.-]{8,4096}$/.test(clean(value));
  const gateBridge = () => globalThis.MetrAIyuxGateBridge || (globalThis.parent && globalThis.parent !== globalThis ? globalThis.parent.MetrAIyuxGateBridge : null);
  const readJson = (store, key) => {
    try {
      return JSON.parse(store.getItem(key) || "null");
    } catch {
      return null;
    }
  };

  function sessionPath() {
    const configured = window.METRAIYUX_API_BASES?.media;
    if (configured) return clean(configured).replace(/\/+$/, "") + "/session";
    if (/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) return "/.netlify/functions/skygate-session";
    return "/api/media/session";
  }

  function browserAuth() {
    if (typeof window.createSkyGateAuth !== "function") return null;
    return window.createSkyGateAuth({ sessionPath: sessionPath(), storageKey: MEDIA_TOKEN_KEY });
  }

  function clientLoginHref() {
    const path = location.pathname;
    if (path.includes("/SkyeMediaCenter/public/")) return "../../saas/client-login.html";
    if (path.includes("/SkyeMediaCenter/")) return "../saas/client-login.html";
    return "/saas/client-login.html";
  }

  function fromStorage() {
    const bridge = gateBridge();
    const bridgeSession = bridge?.requireSession?.({ platformId: "skyemediacenter", usageLane: "media-center" })
      || bridge?.current?.();
    if (bridgeSession && tokenLooksValid(bridgeSession.token)) {
      return {
        ...bridgeSession,
        token: safeToken(bridgeSession.token),
        source: bridgeSession.source || "0s-gate-card-bridge",
        client: bridgeSession.client || "MetrAIyux 0S",
        status: bridgeSession.status || "free99_gate_session"
      };
    }

    const query = new URLSearchParams(location.search);
    const queryToken = safeToken(query.get("gate_session") || query.get("skygate_session") || query.get("media_session") || query.get("session"));
    if (tokenLooksValid(queryToken)) {
      const session = {
        token: queryToken,
        source: "url-gate-session",
        workspace_id: query.get("workspace") || "",
        client: query.get("client") || "MetrAIyux 0S Free99",
        status: "free99_gate_session"
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      query.delete("gate_session");
      query.delete("skygate_session");
      query.delete("media_session");
      query.delete("session");
      const next = `${location.pathname}${query.toString() ? `?${query.toString()}` : ""}${location.hash || ""}`;
      history.replaceState({}, document.title, next);
      return session;
    }

    const current = readJson(sessionStorage, SESSION_KEY);
    if (current && tokenLooksValid(current.token)) return current;

    const mediaToken = safeToken(sessionStorage.getItem(MEDIA_TOKEN_KEY));
    if (tokenLooksValid(mediaToken)) {
      return { token: mediaToken, source: "media-center-session", client: "SkyeMediaCenter", status: "free99_gate_session" };
    }

    const saasSession = readJson(localStorage, SAAS_SESSION_KEY);
    if (saasSession && tokenLooksValid(saasSession.token)) {
      return {
        token: safeToken(saasSession.token),
        source: "0s-client-session",
        workspace_id: saasSession.workspace_id || "",
        client: saasSession.client || "0S client workspace",
        email: saasSession.email || "",
        status: saasSession.status || "free99_gate_session"
      };
    }

    for (const key of LEGACY_KEYS) {
      const parsed = readJson(sessionStorage, key) || readJson(localStorage, key);
      const token = safeToken(parsed && parsed.token ? parsed.token : sessionStorage.getItem(key) || localStorage.getItem(key));
      if (tokenLooksValid(token)) return { ...(parsed || {}), token, source: parsed?.source || key, client: parsed?.client || "SkyeGate session", status: parsed?.status || "free99_gate_session" };
    }

    const runtime = globalThis.__SKYEGATE_RUNTIME__ || globalThis.__KAIXU_RUNTIME__ || {};
    const runtimeToken = safeToken(runtime.userToken || runtime.sessionToken || runtime.authToken || runtime.bearerToken || runtime.auth?.token || runtime.auth?.bearerToken);
    if (tokenLooksValid(runtimeToken)) return { token: runtimeToken, source: "skygate-runtime", client: "SkyeGate runtime", status: "free99_gate_session" };

    return null;
  }

  function persist(session) {
    const cleanSession = {
      token: safeToken(session.token),
      source: session.source || "manual-gate-session",
      client: session.client || "MetrAIyux 0S Free99",
      workspace_id: session.workspace_id || "",
      email: session.email || "",
      status: session.status || "free99_gate_session",
      issued_at: session.issued_at || new Date().toISOString()
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(cleanSession));
    sessionStorage.setItem(MEDIA_TOKEN_KEY, cleanSession.token);
    gateBridge()?.persist?.({
      ...cleanSession,
      platform_id: "skyemediacenter",
      usage_lane: "media-center"
    }, { silent: true });
    gateBridge()?.record?.("skyemedia_gate_ready", cleanSession, cleanSession);
    resolvedSession = cleanSession;
    document.documentElement.classList.remove("skye-media-gate-locked");
    document.body?.classList.remove("skye-media-gate-locked");
    document.body?.classList.add("skye-media-gate-ready");
    document.getElementById("skyeMediaGate")?.remove();
    document.dispatchEvent(new CustomEvent(EVENT_READY, { detail: cleanSession }));
    if (waitingResolve) {
      waitingResolve(cleanSession);
      waitingResolve = null;
    }
    return cleanSession;
  }

  function clear() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(MEDIA_TOKEN_KEY);
    resolvedSession = null;
  }

  function status(message) {
    const el = document.getElementById("skyeMediaGateStatus");
    if (el) el.textContent = message;
  }

  async function attachTokenFromInput() {
    const token = safeToken(document.getElementById("skyeMediaGateToken")?.value);
    if (!tokenLooksValid(token)) {
      status("Enter a valid gate session token first.");
      return;
    }
    persist({ token, source: "manual-gate-session" });
  }

  async function useClientSession() {
    const session = readJson(localStorage, SAAS_SESSION_KEY);
    if (!session || !tokenLooksValid(session.token)) {
      status("No 0S client session found in this browser. Open Client Login first.");
      return;
    }
    persist({
      token: session.token,
      source: "0s-client-session",
      workspace_id: session.workspace_id,
      client: session.client,
      email: session.email,
      status: session.status || "free99_gate_session"
    });
  }

  async function loginLocalOperator() {
    const auth = browserAuth();
    if (!auth) {
      status("SkyGate browser helper is not loaded yet.");
      return;
    }
    const email = prompt("Local operator email", "");
    if (email === null) return;
    const password = prompt("Local operator password. The issued session stays in this browser tab.", "");
    if (password === null) return;
    try {
      const result = await auth.loginLocalOperator({ email, password, subject: "mediacenter-free99-operator", role: "admin" });
      persist({ token: result.token, source: result.source || "local-operator-login", email, client: "SkyeMediaCenter", status: "free99_gate_session" });
    } catch (error) {
      status(error.message || "Local operator login failed.");
    }
  }

  async function bootstrapProofSession() {
    const auth = browserAuth();
    if (!auth) {
      status("SkyGate browser helper is not loaded yet.");
      return;
    }
    try {
      const result = await auth.bootstrapLocalProof({ subject: "mediacenter-free99-proof" });
      persist({ token: result.token, source: result.source || "local-proof-bootstrap", client: "SkyeMediaCenter", status: "free99_gate_session" });
    } catch (error) {
      status(error.message || "Proof session bootstrap failed.");
    }
  }

  function installStyle() {
    if (document.getElementById("skyeMediaGateStyle")) return;
    const style = document.createElement("style");
    style.id = "skyeMediaGateStyle";
    style.textContent = `
      html.skye-media-gate-locked,
      body.skye-media-gate-locked { overflow: hidden !important; }
      body.skye-media-gate-locked > :not(#skyeMediaGate):not(script):not(style) {
        filter: blur(10px) saturate(.45);
        pointer-events: none !important;
        user-select: none !important;
      }
      .skye-media-gate-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at 18% 20%, rgba(68,244,255,.2), transparent 32%),
          radial-gradient(circle at 82% 12%, rgba(255,79,216,.18), transparent 28%),
          rgba(4,2,9,.88);
        color: #fff8ff;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      }
      .skye-media-gate-card {
        width: min(720px, 100%);
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 28px;
        padding: clamp(22px, 4vw, 38px);
        background: linear-gradient(145deg, rgba(18,10,34,.94), rgba(4,2,9,.9));
        box-shadow: 0 30px 120px rgba(0,0,0,.55), 0 0 70px rgba(68,244,255,.12);
      }
      .skye-media-gate-card .microline {
        margin: 0 0 10px;
        color: #44f4ff;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .18em;
        text-transform: uppercase;
      }
      .skye-media-gate-card h1 {
        margin: 0 0 12px;
        color: #fff8ff;
        font-size: clamp(34px, 5vw, 64px);
        line-height: .9;
        letter-spacing: 0;
      }
      .skye-media-gate-card p {
        color: #b9acc7;
        line-height: 1.55;
      }
      .skye-media-gate-field {
        display: grid;
        gap: 8px;
        margin: 18px 0;
        color: #44f4ff;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .12em;
        text-transform: uppercase;
      }
      .skye-media-gate-field input {
        width: 100%;
        min-height: 48px;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 16px;
        padding: 0 14px;
        background: rgba(0,0,0,.3);
        color: #fff8ff;
        font: inherit;
        letter-spacing: 0;
        text-transform: none;
      }
      .skye-media-gate-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .skye-media-gate-actions button,
      .skye-media-gate-actions a {
        min-height: 44px;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 999px;
        padding: 0 16px;
        background: rgba(255,255,255,.06);
        color: #fff8ff;
        font-weight: 900;
        text-decoration: none;
        cursor: pointer;
      }
      .skye-media-gate-actions .primary {
        border: 0;
        background: linear-gradient(90deg, #ffd166, #ff4fd8, #44f4ff);
        color: #090613;
      }
      .skye-media-gate-status {
        min-height: 22px;
        color: #ffd166 !important;
      }
      @media (max-width: 640px) {
        .skye-media-gate-actions button,
        .skye-media-gate-actions a { width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function renderGate() {
    installStyle();
    if (document.getElementById("skyeMediaGate")) return;
    document.documentElement.classList.add("skye-media-gate-locked");
    document.body?.classList.add("skye-media-gate-locked");
    const overlay = document.createElement("section");
    overlay.id = "skyeMediaGate";
    overlay.className = "skye-media-gate-overlay";
    overlay.setAttribute("aria-labelledby", "skyeMediaGateTitle");
    overlay.innerHTML = `
      <div class="skye-media-gate-card">
        <p class="microline">FS27 gate session required</p>
        <h1 id="skyeMediaGateTitle">SkyeMediaCenter is Free99, not ungated.</h1>
        <p>No charge means no payment. It does not mean open access. Start or attach a valid 0S/SkyGate session before the media shell, intake portal, operator theater, asset list, search, publish queue, or file delivery can run.</p>
        <label class="skye-media-gate-field">
          <span>Gate session token</span>
          <input id="skyeMediaGateToken" type="password" autocomplete="off" placeholder="0S should already be signed in; fallback only">
        </label>
        <div class="skye-media-gate-actions">
          <button class="primary" id="skyeMediaGateLogin" type="button">Operator Login</button>
          <button id="skyeMediaGateProof" type="button">Proof Session</button>
          <button id="skyeMediaGateUnlock" type="button">Attach Fallback Session</button>
          <button id="skyeMediaGateUseClient" type="button">Use 0S Client Session</button>
          <a href="${clientLoginHref()}">Open Client Login</a>
        </div>
        <p class="skye-media-gate-status" id="skyeMediaGateStatus">Free99 means no charge. Auth still stays on.</p>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("skyeMediaGateLogin")?.addEventListener("click", loginLocalOperator);
    document.getElementById("skyeMediaGateProof")?.addEventListener("click", bootstrapProofSession);
    document.getElementById("skyeMediaGateUnlock")?.addEventListener("click", attachTokenFromInput);
    document.getElementById("skyeMediaGateUseClient")?.addEventListener("click", useClientSession);
    document.getElementById("skyeMediaGateToken")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") attachTokenFromInput();
    });
  }

  function requireSession() {
    const existing = resolvedSession || fromStorage();
    if (existing && tokenLooksValid(existing.token)) return Promise.resolve(persist(existing));
    renderGate();
    return new Promise((resolve) => {
      waitingResolve = resolve;
    });
  }

  function session() {
    const existing = resolvedSession || fromStorage();
    return existing && tokenLooksValid(existing.token) ? existing : null;
  }

  function headers() {
    const current = session();
    if (!current) return {};
    const bridgeHeaders = gateBridge()?.headers?.({
      "x-skye-platform": "skyemediacenter",
      "x-skye-usage-lane": "media-center"
    }) || {};
    return {
      ...bridgeHeaders,
      authorization: `Bearer ${current.token}`,
      "x-skye-gate-session": current.token,
      "x-0s-gate-session": current.token,
      "x-skye-gate-source": current.source || "unknown",
      "x-skye-media-center-free99": "true"
    };
  }

  globalThis.SkyeMediaGate = {
    requireSession,
    session,
    headers,
    persist,
    clear,
    storageKey: SESSION_KEY,
    eventReady: EVENT_READY
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!session()) renderGate();
  });
})();
