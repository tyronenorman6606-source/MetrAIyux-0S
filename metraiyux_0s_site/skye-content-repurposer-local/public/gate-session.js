(() => {
  "use strict";

  const SESSION_KEY = "SKYE_CONTENT_FORGE_GATE_SESSION";
  const EVENT_READY = "skyecontentforge:gate-ready";

  let resolvedSession = null;
  let waitingResolve = null;

  const clean = (value) => String(value == null ? "" : value).trim();
  const safeToken = (value) => clean(value).replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 4096);
  const tokenLooksValid = (value) => /^[a-zA-Z0-9:_.-]{8,4096}$/.test(clean(value));
  const gateBridge = () => globalThis.MetrAIyuxGateBridge || (globalThis.parent && globalThis.parent !== globalThis ? globalThis.parent.MetrAIyuxGateBridge : null);

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

    return null;
  }

  function persist(session) {
    const cleanSession = {
      token: safeToken(session.token),
      source: session.source || "0s-gate-card-bridge",
      client: session.client || "MetrAIyux 0S Free99",
      workspace_id: session.workspace_id || "",
      email: session.email || "",
      status: session.status || "free99_gate_session",
      issued_at: session.issued_at || new Date().toISOString()
    };
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
    resolvedSession = null;
  }

  function status(message) {
    const el = document.getElementById("skyeContentGateStatus");
    if (el) el.textContent = message;
  }

  function unlockFromInput() {
    status("Manual token entry is disabled. Opening the shared 0S client login.");
    setTimeout(() => {
      location.href = clientLoginHref();
    }, 450);
  }

  function useClientSession() {
    const session = gateBridge()?.requireSession?.({ platformId: "skyecontentforge", usageLane: "content-forge" })
      || gateBridge()?.current?.();
    if (!session || !tokenLooksValid(session.token)) {
      status("No active 0S gate bridge session found. Open Client Login first.");
      return;
    }
    persist({
      token: session.token,
      source: session.source || "0s-gate-card-bridge",
      workspace_id: session.workspace_id,
      client: session.client,
      email: session.email,
      status: session.status || "free99_gate_session"
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
    overlay.innerHTML = `
      <div class="skye-content-gate-card">
        <p class="microline">Skye Content Forge · FS27 gate session required</p>
        <h1 id="skyeContentGateTitle">Free99 content command still stays gated.</h1>
        <p>There is no charge to use this content repurposer. It still needs the shared 0S/FS27 gate session before source scanning, draft access, exports, scheduler ticks, backup, deployment hooks, or publishing controls can run.</p>
        <div class="skye-content-gate-actions">
          <button class="primary" id="skyeContentGateUnlock" type="button">Open Shared Gate</button>
          <button id="skyeContentGateUseClient" type="button">Use Current 0S Session</button>
          <a href="${clientLoginHref()}">Open Client Login</a>
        </div>
        <p class="skye-content-gate-status" id="skyeContentGateStatus">Free99 means no charge. Auth still stays on through FS27.</p>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("skyeContentGateUnlock")?.addEventListener("click", unlockFromInput);
    document.getElementById("skyeContentGateUseClient")?.addEventListener("click", useClientSession);
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
