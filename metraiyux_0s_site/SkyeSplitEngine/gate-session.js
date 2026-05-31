(() => {
  "use strict";

  const SESSION_KEY = "SKYESPLIT_SHARED_FS27_SESSION";
  const EVENT_READY = "skyesplitengine:gate-ready";

  let resolvedSession = null;
  let waitingResolve = null;

  const clean = (value) => String(value == null ? "" : value).trim();
  const safeToken = (value) => clean(value).replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 4096);
  const tokenLooksValid = (value) => /^[a-zA-Z0-9:_.-]{8,4096}$/.test(clean(value));
  const gateBridge = () => globalThis.MetrAIyuxGateBridge || (globalThis.parent && globalThis.parent !== globalThis ? globalThis.parent.MetrAIyuxGateBridge : null);

  function gateLoginHref() {
    const target = new URL("/admin/login.html", location.origin);
    target.searchParams.set("return", `${location.pathname}${location.search}${location.hash || ""}`);
    return target.toString();
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
    overlay.innerHTML = `
      <div class="skye-split-gate-card">
        <p class="microline">Skye Split Engine · FS27 gate session required</p>
        <h1 id="skyeSplitGateTitle">Free99 access is still gated.</h1>
        <p>Skye Split Engine has no charge inside the 0S. Free99 means no charge, not anonymous access. A shared FS27/SkyGate session is required before split rules, payout reports, exports, backups, or local records can run.</p>
        <div class="skye-split-gate-actions">
          <a class="primary" href="${gateLoginHref()}">Open FS27 Gate</a>
        </div>
        <p class="skye-split-gate-status" id="skyeSplitGateStatus">Free99 lives on the shared gate card. This app does not accept URL tokens, manual tokens, or local admin codes.</p>
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
  document.addEventListener("metraiyux:gate-ready", () => {
    const existing = fromStorage();
    if (existing && tokenLooksValid(existing.token)) persist(existing);
  });
})();
