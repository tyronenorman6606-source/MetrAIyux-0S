(() => {
  "use strict";

  const SESSION_KEY = "SKYE_SPLIT_ENGINE_GATE_SESSION";
  const AUTH_HELPER_KEY = "skye_split_engine_session";
  const SAAS_SESSION_KEY = "saas_client_session";
  const LEGACY_KEYS = [
    "SKYGATEFS27_USER_TOKEN",
    "SKYGATEFS27_GATE_SESSION",
    "SKYGATEFS27_SESSION_TOKEN",
    "SKYGATE_USER_TOKEN",
    "SKYE_GATE_SESSION",
    "SKYGATE_SESSION_TOKEN",
    "METRAIYUX_GATE_SESSION",
    "SKYE_PROFIT_GATE_SESSION",
    "SKYE_MEDIA_CENTER_GATE_SESSION",
    "SKYE_MUSIC_NEXUS_GATE_SESSION"
  ];
  const EVENT_READY = "skyesplitengine:gate-ready";
  const LOCAL_ADMIN_GATE_SESSION = "FREE99-SPLIT-ADMIN-LOCAL";
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", ""]);

  let resolvedSession = null;
  let waitingResolve = null;

  const clean = (value) => String(value == null ? "" : value).trim();
  const safeToken = (value) => clean(value).replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 4096);
  const tokenLooksValid = (value) => /^[a-zA-Z0-9:_.-]{8,4096}$/.test(clean(value));
  const isLocalHost = () => LOCAL_HOSTS.has(location.hostname);
  const gateBridge = () => globalThis.MetrAIyuxGateBridge || (globalThis.parent && globalThis.parent !== globalThis ? globalThis.parent.MetrAIyuxGateBridge : null);
  const readJson = (store, key) => {
    try {
      return JSON.parse(store.getItem(key) || "null");
    } catch {
      return null;
    }
  };

  function clientLoginHref() {
    return location.pathname.includes("/SkyeSplitEngine/") ? "../saas/client-login.html" : "/saas/client-login.html";
  }

  function fromStorage() {
    const bridge = gateBridge();
    const bridgeSession = bridge?.requireSession?.({ platformId: "skyesplitengine", usageLane: "split-engine" })
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
    const queryToken = safeToken(query.get("gate_session") || query.get("skygate_session") || query.get("split_session") || query.get("session"));
    if (tokenLooksValid(queryToken)) {
      const session = {
        token: queryToken,
        source: "url-gate-session",
        workspace_id: query.get("workspace") || "",
        client: query.get("client") || "MetrAIyux 0S Free99",
        status: "free99_gate_session"
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      sessionStorage.setItem(AUTH_HELPER_KEY, session.token);
      query.delete("gate_session");
      query.delete("skygate_session");
      query.delete("split_session");
      query.delete("session");
      const next = `${location.pathname}${query.toString() ? `?${query.toString()}` : ""}${location.hash || ""}`;
      history.replaceState({}, document.title, next);
      return session;
    }

    const current = readJson(sessionStorage, SESSION_KEY);
    if (current && tokenLooksValid(current.token)) return current;

    const helperToken = safeToken(sessionStorage.getItem(AUTH_HELPER_KEY) || localStorage.getItem(AUTH_HELPER_KEY));
    if (tokenLooksValid(helperToken)) return { token: helperToken, source: AUTH_HELPER_KEY, client: "Skye Split Engine gate session", status: "free99_gate_session" };

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
      if (tokenLooksValid(token)) return { token, source: key, client: "SkyeGate session", status: "free99_gate_session" };
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
    sessionStorage.setItem(AUTH_HELPER_KEY, cleanSession.token);
    localStorage.removeItem(AUTH_HELPER_KEY);
    gateBridge()?.persist?.({
      ...cleanSession,
      platform_id: "skyesplitengine",
      usage_lane: "split-engine"
    }, { silent: true });
    gateBridge()?.record?.("skyesplit_gate_ready", cleanSession, cleanSession);
    resolvedSession = cleanSession;
    document.documentElement.classList.remove("skye-split-gate-locked");
    document.body?.classList.remove("skye-split-gate-locked");
    document.body?.classList.add("skye-split-gate-ready");
    document.getElementById("skyeSplitGate")?.remove();
    document.dispatchEvent(new CustomEvent(EVENT_READY, { detail: cleanSession }));
    if (waitingResolve) {
      waitingResolve(cleanSession);
      waitingResolve = null;
    }
    return cleanSession;
  }

  function status(message) {
    const el = document.getElementById("skyeSplitGateStatus");
    if (el) el.textContent = message;
  }

  function unlockFromInput() {
    const token = safeToken(document.getElementById("skyeSplitGateToken")?.value);
    if (!tokenLooksValid(token)) {
      status("Enter a valid gate session token first.");
      return;
    }
    persist({ token, source: "manual-gate-session" });
  }

  function useClientSession() {
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

  function useLocalAdminSession() {
    if (!isLocalHost()) {
      status("Local admin gate only works on localhost.");
      return;
    }
    persist({
      token: LOCAL_ADMIN_GATE_SESSION,
      source: "local-admin-dev-gate",
      client: "Local 0S admin",
      status: "free99_local_admin_gate"
    });
  }

  function injectStyles() {
    if (document.getElementById("skyeSplitGateStyles")) return;
    const style = document.createElement("style");
    style.id = "skyeSplitGateStyles";
    style.textContent = `
      .skye-split-gate-locked body,
      body.skye-split-gate-locked { overflow: hidden !important; }
      body.skye-split-gate-locked > :not(#skyeSplitGate):not(script):not(style) {
        filter: blur(10px) saturate(.45);
        pointer-events: none !important;
        user-select: none !important;
      }
      .skye-split-gate-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at 18% 20%, rgba(247,201,72,.18), transparent 30%),
          radial-gradient(circle at 82% 12%, rgba(139,92,246,.22), transparent 31%),
          rgba(5,2,10,.88);
        color: #faf5ff;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      }
      .skye-split-gate-card {
        width: min(700px, 100%);
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 28px;
        padding: clamp(22px, 4vw, 38px);
        background: linear-gradient(145deg, rgba(19,9,35,.96), rgba(8,4,16,.94));
        box-shadow: 0 30px 120px rgba(0,0,0,.58), 0 0 70px rgba(247,201,72,.10);
      }
      .skye-split-gate-card .microline {
        margin: 0 0 10px;
        color: #f7c948;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .16em;
        text-transform: uppercase;
      }
      .skye-split-gate-card h1 {
        margin: 0 0 12px;
        color: #fff;
        font-size: clamp(34px, 6vw, 64px);
        line-height: .92;
        letter-spacing: 0;
      }
      .skye-split-gate-card p {
        color: #c7b8ee;
        line-height: 1.55;
      }
      .skye-split-gate-field {
        display: grid;
        gap: 8px;
        margin: 18px 0;
        color: #f7c948;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .12em;
        text-transform: uppercase;
      }
      .skye-split-gate-field input {
        width: 100%;
        min-height: 48px;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 16px;
        background: rgba(0,0,0,.34);
        color: #faf5ff;
        padding: 12px 14px;
        font: inherit;
      }
      .skye-split-gate-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .skye-split-gate-actions button,
      .skye-split-gate-actions a {
        appearance: none;
        min-height: 44px;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 999px;
        background: rgba(255,255,255,.06);
        color: #faf5ff;
        text-decoration: none;
        font-weight: 950;
        padding: 10px 15px;
        cursor: pointer;
      }
      .skye-split-gate-actions .primary {
        border: 0;
        background: linear-gradient(90deg, #f7c948, #c084fc, #34d399);
        color: #05020a;
      }
      .skye-split-gate-status {
        min-height: 24px;
        margin-bottom: 0;
      }
    `;
    document.head.appendChild(style);
  }

  function renderGate() {
    if (document.getElementById("skyeSplitGate")) return;
    injectStyles();
    document.documentElement.classList.add("skye-split-gate-locked");
    document.body?.classList.add("skye-split-gate-locked");
    const overlay = document.createElement("section");
    overlay.id = "skyeSplitGate";
    overlay.className = "skye-split-gate-overlay";
    overlay.setAttribute("aria-labelledby", "skyeSplitGateTitle");
    const localAdminButton = isLocalHost()
      ? `<button id="skyeSplitGateLocalAdmin" type="button">Use Local Admin Code</button>`
      : "";
    overlay.innerHTML = `
      <div class="skye-split-gate-card">
        <p class="microline">Skye Split Engine · FS27 gate session required</p>
        <h1 id="skyeSplitGateTitle">Free99 access is still gated.</h1>
        <p>Skye Split Engine has no charge inside the 0S. Free99 means no charge. It does not mean anonymous access. A valid 0S, FS27, SkyGate, or local admin gate session is required before split rules, payout reports, exports, backups, or local records can run.</p>
        <label class="skye-split-gate-field">
          <span>Gate session token</span>
          <input id="skyeSplitGateToken" type="password" autocomplete="off" placeholder="0S should already be signed in; fallback only">
        </label>
        <div class="skye-split-gate-actions">
          <button class="primary" id="skyeSplitGateUnlock" type="button">Attach Fallback Session</button>
          <button id="skyeSplitGateUseClient" type="button">Use 0S Client Session</button>
          ${localAdminButton}
          <a href="${clientLoginHref()}">Open Client Login</a>
        </div>
        <p class="skye-split-gate-status" id="skyeSplitGateStatus">Free99 means no charge. Auth still stays on. Local admin code: ${isLocalHost() ? LOCAL_ADMIN_GATE_SESSION : "use your 0S/FS27 session"}.</p>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("skyeSplitGateUnlock")?.addEventListener("click", unlockFromInput);
    document.getElementById("skyeSplitGateUseClient")?.addEventListener("click", useClientSession);
    document.getElementById("skyeSplitGateLocalAdmin")?.addEventListener("click", useLocalAdminSession);
    document.getElementById("skyeSplitGateToken")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") unlockFromInput();
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
      "x-skye-platform": "skyesplitengine",
      "x-skye-usage-lane": "split-engine"
    }) || {};
    return {
      ...bridgeHeaders,
      authorization: `Bearer ${current.token}`,
      "x-skye-gate-session": current.token,
      "x-0s-gate-session": current.token,
      "x-skye-gate-source": current.source || "unknown",
      "x-skye-split-engine-free99": "true",
      "x-skye-free99": "true"
    };
  }

  globalThis.SkyeSplitGate = {
    requireSession,
    session,
    headers,
    persist,
    storageKey: SESSION_KEY
  };
})();
