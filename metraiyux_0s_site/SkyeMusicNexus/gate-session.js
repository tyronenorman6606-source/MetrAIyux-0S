(() => {
  "use strict";

  const SESSION_KEY = "SKYE_MUSIC_NEXUS_GATE_SESSION";
  const AUTH_HELPER_KEY = "skye_music_nexus_session";
  const LEGACY_KEYS = [
    "SKYGATE_USER_TOKEN",
    "SKYE_GATE_SESSION",
    "SKYGATE_SESSION_TOKEN",
    "METRAIYUX_GATE_SESSION",
    "SKYE_PROFIT_GATE_SESSION"
  ];
  const SAAS_SESSION_KEY = "saas_client_session";
  const EVENT_READY = "skyemusicnexus:gate-ready";
  let resolvedSession = null;
  let waitingResolve = null;

  const safeToken = (value) => String(value || "").trim().replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 240);
  const tokenLooksValid = (value) => /^[a-zA-Z0-9:_.-]{8,240}$/.test(String(value || ""));
  const readJson = (store, key) => {
    try {
      return JSON.parse(store.getItem(key) || "null");
    } catch {
      return null;
    }
  };

  function clientLoginHref() {
    const path = location.pathname || "";
    if (path.includes("/SkyeMusicNexus/public/")) return "../../saas/client-login.html";
    if (path.includes("/SkyeMusicNexus/")) return "../saas/client-login.html";
    return "/saas/client-login.html";
  }

  function fromStorage() {
    const query = new URLSearchParams(location.search);
    const queryToken = safeToken(query.get("gate_session") || query.get("skygate_session") || query.get("session"));
    if (tokenLooksValid(queryToken)) {
      const session = {
        token: queryToken,
        source: "url-gate-session",
        workspace_id: query.get("workspace") || "",
        client: query.get("client") || "MetrAIyux 0S Free99 Lite"
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      sessionStorage.setItem(AUTH_HELPER_KEY, session.token);
      query.delete("gate_session");
      query.delete("skygate_session");
      query.delete("session");
      const next = `${location.pathname}${query.toString() ? `?${query.toString()}` : ""}${location.hash || ""}`;
      history.replaceState({}, document.title, next);
      return session;
    }

    const current = readJson(sessionStorage, SESSION_KEY);
    if (current && tokenLooksValid(current.token)) return current;

    const helperToken = safeToken(sessionStorage.getItem(AUTH_HELPER_KEY) || localStorage.getItem(AUTH_HELPER_KEY));
    if (tokenLooksValid(helperToken)) return { token: helperToken, source: AUTH_HELPER_KEY, client: "SkyeMusicNexus gate session" };

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
      const parsed = readJson(sessionStorage, key) || readJson(localStorage, key);
      const token = safeToken(parsed && parsed.token ? parsed.token : sessionStorage.getItem(key) || localStorage.getItem(key));
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
      client: session.client || "MetrAIyux 0S Free99 Lite",
      workspace_id: session.workspace_id || "",
      email: session.email || "",
      status: session.status || "free99_gate_session",
      issued_at: session.issued_at || new Date().toISOString()
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(clean));
    sessionStorage.setItem(AUTH_HELPER_KEY, clean.token);
    localStorage.removeItem(AUTH_HELPER_KEY);
    resolvedSession = clean;
    document.documentElement.classList.remove("skyemusic-gate-locked");
    document.body?.classList.remove("skyemusic-gate-locked");
    document.getElementById("skyeMusicGate")?.remove();
    document.dispatchEvent(new CustomEvent(EVENT_READY, { detail: clean }));
    if (waitingResolve) {
      waitingResolve(clean);
      waitingResolve = null;
    }
    return clean;
  }

  function unlockFromInput() {
    const token = safeToken(document.getElementById("skyeMusicGateToken")?.value);
    const status = document.getElementById("skyeMusicGateStatus");
    if (!tokenLooksValid(token)) {
      if (status) status.textContent = "Enter a valid gate session token first.";
      return;
    }
    persist({ token, source: "manual-gate-session" });
  }

  function useClientSession() {
    const session = readJson(localStorage, SAAS_SESSION_KEY);
    const status = document.getElementById("skyeMusicGateStatus");
    if (!session || !tokenLooksValid(session.token)) {
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

  function injectStyles() {
    if (document.getElementById("skyeMusicGateStyles")) return;
    const style = document.createElement("style");
    style.id = "skyeMusicGateStyles";
    style.textContent = `
      .skyemusic-gate-locked body,
      body.skyemusic-gate-locked{overflow:hidden}
      .skyemusic-gate-overlay{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:rgba(2,3,8,.78);backdrop-filter:blur(18px)}
      .skyemusic-gate-card{width:min(620px,100%);border:1px solid rgba(88,245,255,.36);border-radius:28px;background:linear-gradient(135deg,rgba(10,12,24,.96),rgba(18,16,32,.94));box-shadow:0 30px 100px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.08);padding:clamp(22px,4vw,36px);color:#f7fbff}
      .skyemusic-gate-card h1{font-size:clamp(34px,7vw,62px);line-height:.9;margin:8px 0 14px;letter-spacing:-.07em}
      .skyemusic-gate-card p{color:#b7c2d1;line-height:1.55}
      .skyemusic-gate-card .micro{margin:0;color:#58f5ff;text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:950}
      .skyemusic-gate-field{display:grid;gap:8px;margin:18px 0;color:#b7c2d1;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
      .skyemusic-gate-field input{width:100%;min-height:48px;border:1px solid rgba(255,255,255,.16);border-radius:16px;background:rgba(0,0,0,.34);color:#f7fbff;padding:12px 14px}
      .skyemusic-gate-actions{display:flex;gap:10px;flex-wrap:wrap}
      .skyemusic-gate-actions button,.skyemusic-gate-actions a{appearance:none;min-height:44px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(255,255,255,.06);color:#f7fbff;text-decoration:none;font-weight:950;padding:10px 15px;cursor:pointer}
      .skyemusic-gate-actions .primary{border:0;background:linear-gradient(90deg,#58f5ff,#ff5cd7,#ffd166);color:#05060a}
      .skyemusic-gate-status{min-height:24px;margin-bottom:0}
    `;
    document.head.appendChild(style);
  }

  function renderGate() {
    if (document.getElementById("skyeMusicGate")) return;
    injectStyles();
    document.documentElement.classList.add("skyemusic-gate-locked");
    document.body?.classList.add("skyemusic-gate-locked");
    const overlay = document.createElement("section");
    overlay.id = "skyeMusicGate";
    overlay.className = "skyemusic-gate-overlay";
    overlay.setAttribute("aria-labelledby", "skyeMusicGateTitle");
    overlay.innerHTML = `
      <div class="skyemusic-gate-card">
        <p class="micro">FS27 gate session required</p>
        <h1 id="skyeMusicGateTitle">SkyeMusicNexus Lite is Free99, not ungated.</h1>
        <p>Free99 means the Lite lane has no charge. It does not mean anonymous access. A valid 0S or SkyeGate session is required before the artist stage, operator stage, records, workflows, analytics, payouts, paid drops, or proof lanes can run.</p>
        <label class="skyemusic-gate-field">
          <span>Gate session token</span>
          <input id="skyeMusicGateToken" type="password" autocomplete="off" placeholder="Paste 0S / FS27 session token">
        </label>
        <div class="skyemusic-gate-actions">
          <button class="primary" id="skyeMusicGateUnlock" type="button">Unlock Free99 Lite Session</button>
          <button id="skyeMusicGateUseClient" type="button">Use 0S Client Session</button>
          <a href="${clientLoginHref()}">Open Client Login</a>
        </div>
        <p class="skyemusic-gate-status" id="skyeMusicGateStatus">Free99 means no charge. Auth still stays on.</p>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("skyeMusicGateUnlock")?.addEventListener("click", unlockFromInput);
    document.getElementById("skyeMusicGateUseClient")?.addEventListener("click", useClientSession);
    document.getElementById("skyeMusicGateToken")?.addEventListener("keydown", (event) => {
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

  globalThis.SkyeMusicGate = {
    requireSession,
    session,
    headers,
    persist,
    storageKey: SESSION_KEY
  };

  document.addEventListener("DOMContentLoaded", () => {
    requireSession();
  });
})();
