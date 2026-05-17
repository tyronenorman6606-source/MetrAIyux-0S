(() => {
  "use strict";

  const SESSION_KEY = "SKYE_PROFIT_GATE_SESSION";
  const LEGACY_KEYS = [
    "SKYGATE_USER_TOKEN",
    "SKYE_GATE_SESSION",
    "SKYGATE_SESSION_TOKEN",
    "METRAIYUX_GATE_SESSION"
  ];
  const SAAS_SESSION_KEY = "saas_client_session";
  const EVENT_READY = "skyeprofit:gate-ready";
  const LOCAL_ADMIN_GATE_SESSION = "FREE99-ADMIN-LOCAL";
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", ""]);

  let resolvedSession = null;
  let waitingResolve = null;

  const safeToken = (value) => String(value || "").trim().replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 220);
  const tokenLooksValid = (value) => /^[a-zA-Z0-9:_.-]{8,220}$/.test(String(value || ""));
  const readJson = (store, key) => {
    try {
      return JSON.parse(store.getItem(key) || "null");
    } catch {
      return null;
    }
  };
  const isLocalHost = () => LOCAL_HOSTS.has(location.hostname);

  function fromStorage() {
    const query = new URLSearchParams(location.search);
    const queryToken = safeToken(query.get("gate_session") || query.get("skygate_session") || query.get("session"));
    if (tokenLooksValid(queryToken)) {
      const session = {
        token: queryToken,
        source: "url-gate-session",
        workspace_id: query.get("workspace") || "",
        client: query.get("client") || "MetrAIyux 0S Free99"
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      query.delete("gate_session");
      query.delete("skygate_session");
      query.delete("session");
      const next = `${location.pathname}${query.toString() ? `?${query.toString()}` : ""}${location.hash || ""}`;
      history.replaceState({}, document.title, next);
      return session;
    }

    const current = readJson(sessionStorage, SESSION_KEY);
    if (current && tokenLooksValid(current.token)) return current;

    const saasSession = readJson(localStorage, SAAS_SESSION_KEY);
    if (saasSession && tokenLooksValid(saasSession.token)) {
      return {
        token: safeToken(saasSession.token),
        source: "0s-client-session",
        workspace_id: saasSession.workspace_id || "",
        client: saasSession.client || "0S client workspace",
        email: saasSession.email || "",
        status: saasSession.status || ""
      };
    }

    for (const key of LEGACY_KEYS) {
      const token = safeToken(sessionStorage.getItem(key) || localStorage.getItem(key));
      if (tokenLooksValid(token)) return { token, source: key, client: "SkyeGate session" };
    }

    const runtime = globalThis.__SKYEGATE_RUNTIME__ || globalThis.__KAIXU_RUNTIME__ || {};
    const runtimeToken = safeToken(runtime.userToken || runtime.sessionToken || runtime.authToken || runtime.bearerToken || runtime.auth?.token || runtime.auth?.bearerToken);
    if (tokenLooksValid(runtimeToken)) return { token: runtimeToken, source: "skygate-runtime", client: "SkyeGate runtime" };

    return null;
  }

  function persist(session) {
    const clean = {
      token: safeToken(session.token),
      source: session.source || "manual-gate-session",
      client: session.client || "MetrAIyux 0S Free99",
      workspace_id: session.workspace_id || "",
      email: session.email || "",
      status: session.status || "free99_gate_session",
      issued_at: session.issued_at || new Date().toISOString()
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(clean));
    resolvedSession = clean;
    document.documentElement.classList.remove("skye-profit-gate-locked");
    document.body?.classList.remove("skye-profit-gate-locked");
    document.getElementById("skyeProfitGate")?.remove();
    document.dispatchEvent(new CustomEvent(EVENT_READY, { detail: clean }));
    if (waitingResolve) {
      waitingResolve(clean);
      waitingResolve = null;
    }
    return clean;
  }

  function unlockFromInput() {
    const token = safeToken(document.getElementById("skyeProfitGateToken")?.value);
    if (!tokenLooksValid(token)) {
      const status = document.getElementById("skyeProfitGateStatus");
      if (status) status.textContent = "Enter a valid gate session token first.";
      return;
    }
    persist({ token, source: "manual-gate-session" });
  }

  function useClientSession() {
    const session = readJson(localStorage, SAAS_SESSION_KEY);
    if (!session || !tokenLooksValid(session.token)) {
      const status = document.getElementById("skyeProfitGateStatus");
      if (status) status.textContent = "No 0S client session found in this browser. Open Client Login first.";
      return;
    }
    persist({
      token: session.token,
      source: "0s-client-session",
      workspace_id: session.workspace_id,
      client: session.client,
      email: session.email,
      status: session.status
    });
  }

  function useLocalAdminSession() {
    if (!isLocalHost()) {
      const status = document.getElementById("skyeProfitGateStatus");
      if (status) status.textContent = "Local admin gate only works on localhost.";
      return;
    }
    persist({
      token: LOCAL_ADMIN_GATE_SESSION,
      source: "local-admin-dev-gate",
      client: "Local 0S admin",
      status: "free99_local_admin_gate"
    });
  }

  function renderGate() {
    if (document.getElementById("skyeProfitGate")) return;
    document.documentElement.classList.add("skye-profit-gate-locked");
    document.body?.classList.add("skye-profit-gate-locked");
    const overlay = document.createElement("section");
    overlay.id = "skyeProfitGate";
    overlay.className = "profit-gate-overlay";
    overlay.setAttribute("aria-labelledby", "skyeProfitGateTitle");
    const localAdminButton = isLocalHost()
      ? `<button class="void-button ghost" id="skyeProfitGateLocalAdmin" type="button">Use Local Admin Code</button>`
      : "";
    overlay.innerHTML = `
      <div class="profit-gate-card">
        <p class="microline">SkyeProfitConsole · FS27 gate session required</p>
        <h1 id="skyeProfitGateTitle">Free99 access is still gated.</h1>
        <p>There is no charge to open this profit console. It still needs a valid 0S, FS27, or local admin gate session before the app, runtime sync, review packs, execution queue, or dispatch lane can run.</p>
        <label class="profit-gate-field">
          <span>Gate session token</span>
          <input id="skyeProfitGateToken" type="password" autocomplete="off" placeholder="Paste 0S / FS27 session token">
        </label>
        <div class="profit-gate-actions">
          <button class="void-button primary" id="skyeProfitGateUnlock" type="button">Unlock Free99 Session</button>
          <button class="void-button" id="skyeProfitGateUseClient" type="button">Use 0S Client Session</button>
          ${localAdminButton}
          <a class="void-button ghost" href="../saas/client-login.html">Open Client Login</a>
        </div>
        <p class="profit-gate-status" id="skyeProfitGateStatus">Free99 means no charge. Auth still stays on. Local admin code: ${isLocalHost() ? LOCAL_ADMIN_GATE_SESSION : "use your 0S/FS27 session"}.</p>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("skyeProfitGateUnlock")?.addEventListener("click", unlockFromInput);
    document.getElementById("skyeProfitGateUseClient")?.addEventListener("click", useClientSession);
    document.getElementById("skyeProfitGateLocalAdmin")?.addEventListener("click", useLocalAdminSession);
    document.getElementById("skyeProfitGateToken")?.addEventListener("keydown", (event) => {
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
    return {
      authorization: `Bearer ${current.token}`,
      "x-skye-gate-session": current.token,
      "x-skye-gate-source": current.source || "unknown",
      "x-skye-free99": "true"
    };
  }

  globalThis.SkyeProfitGate = {
    requireSession,
    session,
    headers,
    persist,
    storageKey: SESSION_KEY
  };
})();
