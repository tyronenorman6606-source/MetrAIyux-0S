(() => {
  "use strict";

  const SESSION_KEY = "SKYEPROFIT_SHARED_FS27_SESSION";
  const EVENT_READY = "skyeprofit:gate-ready";

  let resolvedSession = null;
  let waitingResolve = null;

  const safeToken = (value) => String(value || "").trim().replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 220);
  const tokenLooksValid = (value) => /^[a-zA-Z0-9:_.-]{8,220}$/.test(String(value || ""));
  const gateBridge = () => globalThis.MetrAIyuxGateBridge || (globalThis.parent && globalThis.parent !== globalThis ? globalThis.parent.MetrAIyuxGateBridge : null);

  function gateLoginHref() {
    const target = new URL("/admin/login.html", location.origin);
    target.searchParams.set("return", `${location.pathname}${location.search}${location.hash || ""}`);
    return target.toString();
  }

  function fromStorage() {
    const bridge = gateBridge();
    const bridgeSession = bridge?.requireSession?.({ platformId: "skyeprofitconsole", usageLane: "profit-console" })
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
    return null;
  }

  function persist(session) {
    const clean = {
      token: safeToken(session.token),
      source: session.source || "0s-gate-card-bridge",
      client: session.client || "MetrAIyux 0S Free99",
      workspace_id: session.workspace_id || "",
      email: session.email || "",
      status: session.status || "free99_gate_session",
      issued_at: session.issued_at || new Date().toISOString()
    };
    gateBridge()?.persist?.({
      ...clean,
      platform_id: "skyeprofitconsole",
      usage_lane: "profit-console"
    }, { silent: true });
    gateBridge()?.record?.("skyeprofit_gate_ready", clean, clean);
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

  function renderGate() {
    if (document.getElementById("skyeProfitGate")) return;
    document.documentElement.classList.add("skye-profit-gate-locked");
    document.body?.classList.add("skye-profit-gate-locked");
    const overlay = document.createElement("section");
    overlay.id = "skyeProfitGate";
    overlay.className = "profit-gate-overlay";
    overlay.setAttribute("aria-labelledby", "skyeProfitGateTitle");
    overlay.innerHTML = `
      <div class="profit-gate-card">
        <p class="microline">SkyeProfitConsole · FS27 gate session required</p>
        <h1 id="skyeProfitGateTitle">Free99 access is still gated.</h1>
        <p>There is no charge to open this profit console. It still needs the shared FS27/SkyGate session before the app, runtime sync, review packs, execution queue, or dispatch lane can run.</p>
        <div class="profit-gate-actions">
          <a class="void-button primary" href="${gateLoginHref()}">Open FS27 Gate</a>
        </div>
        <p class="profit-gate-status" id="skyeProfitGateStatus">Free99 lives on the shared gate card. This app does not accept URL tokens, manual tokens, or local admin codes.</p>
      </div>
    `;
    document.body.appendChild(overlay);
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
      "x-skye-platform": "skyeprofitconsole",
      "x-skye-usage-lane": "profit-console"
    }) || {};
    return {
      ...bridgeHeaders,
      authorization: `Bearer ${current.token}`,
      "x-skye-gate-session": current.token,
      "x-0s-gate-session": current.token,
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
  document.addEventListener("metraiyux:gate-ready", () => {
    const existing = fromStorage();
    if (existing && tokenLooksValid(existing.token)) persist(existing);
  });
})();
