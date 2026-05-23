(() => {
  "use strict";

  const SESSION_KEY = "SKYE_CONTENT_FORGE_GATE_SESSION";
  const APP_TOKEN_KEY = "skye-content-forge-access-token";
  const SAAS_SESSION_KEY = "saas_client_session";
  const LOCAL_ADMIN_GATE_SESSION = "FREE99-CONTENT-LOCAL";
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", ""]);
  const LEGACY_KEYS = [
    "SKYGATEFS27_USER_TOKEN",
    "SKYGATEFS27_GATE_SESSION",
    "SKYGATEFS27_SESSION_TOKEN",
    "SKYGATE_USER_TOKEN",
    "SKYE_GATE_SESSION",
    "SKYGATE_SESSION_TOKEN",
    "METRAIYUX_GATE_SESSION"
  ];
  const EVENT_READY = "skyecontentforge:gate-ready";

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

  function fromStorage() {
    const bridge = gateBridge();
    const bridgeSession = bridge?.requireSession?.({ platformId: "skyecontentforge", usageLane: "content-forge" })
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
    const queryToken = safeToken(query.get("gate_session") || query.get("skygate_session") || query.get("content_session") || query.get("session"));
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
      query.delete("content_session");
      query.delete("session");
      const next = `${location.pathname}${query.toString() ? `?${query.toString()}` : ""}${location.hash || ""}`;
      history.replaceState({}, document.title, next);
      return session;
    }

    const current = readJson(sessionStorage, SESSION_KEY);
    if (current && tokenLooksValid(current.token)) return current;

    const savedAppToken = safeToken(localStorage.getItem(APP_TOKEN_KEY) || sessionStorage.getItem(APP_TOKEN_KEY));
    if (tokenLooksValid(savedAppToken)) {
      return { token: savedAppToken, source: "content-forge-dashboard-token", client: "Skye Content Forge", status: "free99_gate_session" };
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
    sessionStorage.setItem(APP_TOKEN_KEY, cleanSession.token);
    localStorage.setItem(APP_TOKEN_KEY, cleanSession.token);
    gateBridge()?.persist?.({
      ...cleanSession,
      platform_id: "skyecontentforge",
      usage_lane: "content-forge"
    }, { silent: true });
    gateBridge()?.record?.("skyecontent_gate_ready", cleanSession, cleanSession);
    resolvedSession = cleanSession;
    document.documentElement.classList.remove("skye-content-gate-locked");
    document.body?.classList.remove("skye-content-gate-locked");
    document.body?.classList.add("skye-content-gate-ready");
    document.getElementById("skyeContentGate")?.remove();
    document.dispatchEvent(new CustomEvent(EVENT_READY, { detail: cleanSession }));
    if (waitingResolve) {
      waitingResolve(cleanSession);
      waitingResolve = null;
    }
    return cleanSession;
  }

  function clear() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(APP_TOKEN_KEY);
    localStorage.removeItem(APP_TOKEN_KEY);
    resolvedSession = null;
  }

  function status(message) {
    const el = document.getElementById("skyeContentGateStatus");
    if (el) el.textContent = message;
  }

  function unlockFromInput() {
    const token = safeToken(document.getElementById("skyeContentGateToken")?.value);
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

  function installStyle() {
    if (document.getElementById("skyeContentGateStyle")) return;
    const style = document.createElement("style");
    style.id = "skyeContentGateStyle";
    style.textContent = `
      html.skye-content-gate-locked,
      body.skye-content-gate-locked { overflow: hidden !important; }
      body.skye-content-gate-locked > :not(#skyeContentGate):not(script):not(style) {
        filter: blur(10px) saturate(.45);
        pointer-events: none !important;
        user-select: none !important;
      }
      .skye-content-gate-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at 18% 18%, rgba(248,214,78,.18), transparent 32%),
          radial-gradient(circle at 82% 14%, rgba(56,213,255,.18), transparent 30%),
          rgba(7,7,17,.9);
        color: #f8f7ff;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      }
      .skye-content-gate-card {
        width: min(680px, 100%);
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 28px;
        padding: 28px;
        background: linear-gradient(135deg, rgba(15,16,32,.98), rgba(21,15,38,.96));
        box-shadow: 0 30px 100px rgba(0,0,0,.62), 0 0 42px rgba(56,213,255,.16);
      }
      .skye-content-gate-card h1 {
        margin: 0 0 12px;
        font-size: clamp(2rem, 6vw, 4.2rem);
        line-height: 1;
        letter-spacing: 0;
      }
      .skye-content-gate-card p {
        color: #cfcde4;
        line-height: 1.65;
      }
      .skye-content-gate-card .microline {
        margin: 0 0 10px;
        color: #f8d64e;
        text-transform: uppercase;
        letter-spacing: .14em;
        font-weight: 900;
        font-size: .76rem;
      }
      .skye-content-gate-field {
        display: grid;
        gap: 8px;
        margin: 18px 0;
        color: #f8f7ff;
        font-weight: 800;
      }
      .skye-content-gate-field input {
        width: 100%;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 16px;
        padding: 14px 16px;
        color: #f8f7ff;
        background: rgba(0,0,0,.28);
      }
      .skye-content-gate-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .skye-content-gate-actions button,
      .skye-content-gate-actions a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 999px;
        padding: 10px 14px;
        color: #f8f7ff;
        background: rgba(255,255,255,.08);
        text-decoration: none;
        font-weight: 900;
      }
      .skye-content-gate-actions .primary {
        color: #090812;
        border-color: transparent;
        background: linear-gradient(135deg, #f8d64e, #ff9d2e 45%, #8e63ff);
      }
      .skye-content-gate-status {
        min-height: 24px;
        margin-bottom: 0;
        color: #f8d64e !important;
      }
      @media (max-width: 620px) {
        .skye-content-gate-card { padding: 22px; border-radius: 22px; }
      }
    `;
    document.head.appendChild(style);
  }

  function clientLoginHref() {
    if (location.pathname.includes("/skye-content-repurposer-local/public/")) return "../../saas/client-login.html";
    if (location.pathname.includes("/skye-content-repurposer-local/")) return "../saas/client-login.html";
    return "/saas/client-login.html";
  }

  function renderGate() {
    if (document.getElementById("skyeContentGate")) return;
    installStyle();
    document.documentElement.classList.add("skye-content-gate-locked");
    document.body?.classList.add("skye-content-gate-locked");
    const overlay = document.createElement("section");
    overlay.id = "skyeContentGate";
    overlay.className = "skye-content-gate-overlay";
    overlay.setAttribute("aria-labelledby", "skyeContentGateTitle");
    const localAdminButton = isLocalHost()
      ? `<button class="ghost" id="skyeContentGateLocalAdmin" type="button">Use Local Admin Code</button>`
      : "";
    overlay.innerHTML = `
      <div class="skye-content-gate-card">
        <p class="microline">Skye Content Forge · FS27 gate session required</p>
        <h1 id="skyeContentGateTitle">Free99 content command still stays gated.</h1>
        <p>There is no charge to use this content repurposer. It still needs a valid 0S, FS27, SkyGate, or local admin gate session before source scanning, draft access, exports, scheduler ticks, backup, deployment hooks, or publishing controls can run.</p>
        <label class="skye-content-gate-field">
          <span>Gate session token</span>
          <input id="skyeContentGateToken" type="password" autocomplete="off" placeholder="0S should already be signed in; fallback only">
        </label>
        <div class="skye-content-gate-actions">
          <button class="primary" id="skyeContentGateUnlock" type="button">Attach Fallback Session</button>
          <button id="skyeContentGateUseClient" type="button">Use 0S Client Session</button>
          ${localAdminButton}
          <a href="${clientLoginHref()}">Open Client Login</a>
        </div>
        <p class="skye-content-gate-status" id="skyeContentGateStatus">Free99 means no charge. Auth still stays on. Local admin code: ${isLocalHost() ? LOCAL_ADMIN_GATE_SESSION : "use your 0S/FS27 session"}.</p>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("skyeContentGateUnlock")?.addEventListener("click", unlockFromInput);
    document.getElementById("skyeContentGateUseClient")?.addEventListener("click", useClientSession);
    document.getElementById("skyeContentGateLocalAdmin")?.addEventListener("click", useLocalAdminSession);
    document.getElementById("skyeContentGateToken")?.addEventListener("keydown", (event) => {
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
      "x-skye-platform": "skyecontentforge",
      "x-skye-usage-lane": "content-forge"
    }) || {};
    return {
      ...bridgeHeaders,
      authorization: `Bearer ${current.token}`,
      "x-app-token": current.token,
      "x-skye-gate-session": current.token,
      "x-0s-gate-session": current.token,
      "x-skye-gate-source": current.source || "unknown",
      "x-skye-free99": "true"
    };
  }

  globalThis.SkyeContentGate = {
    requireSession,
    session,
    headers,
    persist,
    clear,
    storageKey: SESSION_KEY
  };
})();
