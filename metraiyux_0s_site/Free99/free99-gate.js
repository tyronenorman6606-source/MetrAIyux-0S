(() => {
  "use strict";

  const script = document.currentScript || {};
  const data = script.dataset || {};
  const platformId = (data.platformId || "free99-platform").trim();
  const platformName = (data.platformName || platformId).trim();
  const billingMode = (data.billingMode || "paid_pending_sku").trim();
  const priceLabel = (data.priceLabel || "Owner-approved platform lane").trim();
  const appRoot = (data.appRoot || location.pathname.replace(/\/[^/]*$/, "/")).trim();
  const scopedRoot = appRoot.endsWith("/") ? appRoot : appRoot + "/";
  const storageKey = "FREE99_PLATFORM_GATE_SESSION";
  const appStorageKey = "FREE99_PLATFORM_GATE_SESSION_" + platformId.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", ""]);
  const free = billingMode === "free99";
  const clean = (value) => String(value == null ? "" : value).trim();
  const safeToken = (value) => clean(value).replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 4096);
  const tokenLooksValid = (value) => /^[a-zA-Z0-9:_.-]{8,4096}$/.test(clean(value));
  const isLocalHost = () => localHosts.has(location.hostname);
  let resolvedSession = null;

  document.documentElement.classList.add("free99-platform-gate-locked");

  function readJson(store, key) {
    try { return JSON.parse(store.getItem(key) || "null"); } catch { return null; }
  }

  function readSession() {
    const query = new URLSearchParams(location.search);
    const queryToken = safeToken(query.get("gate_session") || query.get("skygate_session") || query.get("session"));
    if (tokenLooksValid(queryToken)) {
      const session = {
        token: queryToken,
        source: "url-gate-session",
        platform_id: platformId,
        billing_mode: billingMode,
        issued_at: new Date().toISOString()
      };
      persist(session, false);
      query.delete("gate_session");
      query.delete("skygate_session");
      query.delete("session");
      history.replaceState({}, document.title, location.pathname + (query.toString() ? "?" + query.toString() : "") + (location.hash || ""));
      return session;
    }
    for (const key of [appStorageKey, storageKey, "METRAIYUX_GATE_SESSION", "SKYGATEFS27_GATE_SESSION", "SKYGATE_USER_TOKEN", "SKYE_GATE_SESSION"]) {
      const parsed = readJson(sessionStorage, key) || readJson(localStorage, key);
      const token = safeToken(parsed && parsed.token ? parsed.token : sessionStorage.getItem(key) || localStorage.getItem(key));
      if (tokenLooksValid(token)) return { ...(parsed || {}), token, source: parsed?.source || key, platform_id: platformId, billing_mode: billingMode };
    }
    const saas = readJson(localStorage, "saas_client_session");
    if (saas && tokenLooksValid(saas.token)) return { ...saas, token: safeToken(saas.token), source: "0s-client-session", platform_id: platformId, billing_mode: billingMode };
    const runtime = globalThis.__SKYEGATE_RUNTIME__ || globalThis.__KAIXU_RUNTIME__ || {};
    const runtimeToken = safeToken(runtime.userToken || runtime.sessionToken || runtime.authToken || runtime.bearerToken || runtime.auth?.token || runtime.auth?.bearerToken);
    if (tokenLooksValid(runtimeToken)) return { token: runtimeToken, source: "skygate-runtime", platform_id: platformId, billing_mode: billingMode };
    return null;
  }

  function persist(session, removeOverlay = true) {
    const cleanSession = {
      token: safeToken(session.token),
      source: session.source || "manual-gate-session",
      platform_id: platformId,
      usage_lane: session.usage_lane || "platform-app",
      billing_mode: billingMode,
      price_label: priceLabel,
      issued_at: session.issued_at || new Date().toISOString()
    };
    sessionStorage.setItem(storageKey, JSON.stringify(cleanSession));
    sessionStorage.setItem(appStorageKey, JSON.stringify(cleanSession));
    resolvedSession = cleanSession;
    if (removeOverlay) unlockUi();
    return cleanSession;
  }

  function headers(extra = {}) {
    const session = resolvedSession || readSession();
    const token = session && safeToken(session.token);
    return {
      ...(token ? { authorization: "Bearer " + token, "x-skye-gate-session": token } : {}),
      "x-skye-platform": platformId,
      "x-kaixu-platform": platformId,
      "x-skye-usage-lane": session?.usage_lane || "platform-app",
      "x-free99-billing-mode": billingMode,
      ...extra
    };
  }

  function scopeUrl(value) {
    const text = String(value || "");
    if (!text.startsWith("/") || text.startsWith("//") || text.startsWith(scopedRoot) || text.startsWith("/Free99/")) return value;
    return scopedRoot + text.replace(/^\/+/, "");
  }

  function rewriteScopedRoutes(root = document) {
    const nodes = [];
    if (root.matches?.('a[href^="/"], form[action^="/"]')) nodes.push(root);
    root.querySelectorAll?.('a[href^="/"], form[action^="/"]').forEach((node) => nodes.push(node));
    nodes.forEach((node) => {
      const attr = node.tagName === "FORM" ? "action" : "href";
      const current = node.getAttribute(attr);
      const scoped = scopeUrl(current);
      if (scoped !== current) node.setAttribute(attr, scoped);
    });
  }

  function installRouteScope() {
    if (window.__FREE99_PLATFORM_ROUTE_SCOPE__) return;
    window.__FREE99_PLATFORM_ROUTE_SCOPE__ = true;
    rewriteScopedRoutes();
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node?.nodeType === 1) rewriteScopedRoutes(node);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", (event) => {
      const link = event.target?.closest?.('a[href^="/"]');
      if (!link) return;
      const current = link.getAttribute("href");
      const scoped = scopeUrl(current);
      if (scoped !== current) link.setAttribute("href", scoped);
    }, true);
  }

  function patchFetch() {
    if (window.__FREE99_PLATFORM_FETCH_PATCHED__) return;
    window.__FREE99_PLATFORM_FETCH_PATCHED__ = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
      const scopedInput = typeof input === "string" ? scopeUrl(input) : input;
      const nextHeaders = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init.headers || {}).forEach((value, key) => nextHeaders.set(key, value));
      Object.entries(headers()).forEach(([key, value]) => nextHeaders.set(key, value));
      const nextInit = { ...init, headers: nextHeaders };
      return originalFetch(scopedInput, nextInit);
    };
  }

  function unlockUi() {
    document.documentElement.classList.remove("free99-platform-gate-locked");
    document.body?.classList.remove("free99-platform-gate-locked");
    document.body?.classList.add("free99-platform-gate-ready");
    document.getElementById("free99PlatformGate")?.remove();
    document.dispatchEvent(new CustomEvent("free99-platform:gate-ready", { detail: resolvedSession }));
  }

  function status(message) {
    const el = document.getElementById("free99PlatformGateStatus");
    if (el) el.textContent = message;
  }

  function unlockFromInput() {
    const token = safeToken(document.getElementById("free99PlatformGateToken")?.value);
    if (!tokenLooksValid(token)) {
      status("Enter a valid 0S or FS27 gate session token.");
      return;
    }
    persist({ token, source: "manual-gate-session" });
  }

  function useLocalProof() {
    if (!isLocalHost()) {
      status("Local proof unlock only works on localhost.");
      return;
    }
    persist({ token: "FREE99-PLATFORM-LOCAL-PROOF", source: "local-proof-session" });
  }

  function injectStyles() {
    if (document.getElementById("free99PlatformGateStyles")) return;
    const style = document.createElement("style");
    style.id = "free99PlatformGateStyles";
    style.textContent = ".free99-platform-gate-locked body,body.free99-platform-gate-locked{overflow:hidden!important}body.free99-platform-gate-locked>:not(#free99PlatformGate):not(script):not(style){filter:blur(9px) saturate(.45);pointer-events:none!important;user-select:none!important}.free99-platform-gate-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px;background:rgba(4,7,13,.9);color:#f8fafc;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}.free99-platform-gate-card{width:min(760px,100%);border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:28px;background:#0b1020;box-shadow:0 30px 120px rgba(0,0,0,.55)}.free99-platform-gate-card h1{margin:0 0 12px;font-size:clamp(30px,5vw,52px);line-height:1;letter-spacing:0}.free99-platform-gate-card p{color:#cbd5e1;line-height:1.55}.free99-platform-gate-badge{display:inline-block;margin:0 0 14px;padding:7px 10px;border:1px solid rgba(255,255,255,.18);border-radius:999px;color:#fde68a;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.free99-platform-gate-field{display:grid;gap:8px;margin:18px 0;color:#fde68a;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.free99-platform-gate-field input{width:100%;min-height:48px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.06);color:#fff;padding:0 12px}.free99-platform-gate-actions{display:flex;flex-wrap:wrap;gap:10px}.free99-platform-gate-actions button,.free99-platform-gate-actions a{border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.08);color:#fff;padding:12px 14px;text-decoration:none;font-weight:800;cursor:pointer}.free99-platform-gate-actions .primary{background:#fde68a;color:#111827}.free99-platform-gate-status{margin-top:14px;color:#a7f3d0!important;font-size:13px}";
    document.head.appendChild(style);
  }

  function showGate() {
    injectStyles();
    document.body?.classList.add("free99-platform-gate-locked");
    if (document.getElementById("free99PlatformGate")) return;
    const overlay = document.createElement("div");
    overlay.id = "free99PlatformGate";
    overlay.className = "free99-platform-gate-overlay";
    overlay.innerHTML = '<section class="free99-platform-gate-card" role="dialog" aria-modal="true" aria-labelledby="free99PlatformGateTitle"><span class="free99-platform-gate-badge">' + (free ? "Free99 gated app" : "Paid platform lane") + '</span><h1 id="free99PlatformGateTitle">' + platformName + '</h1><p>' + (free ? "This app is Free99: no charge, still gated." : "This app is not Free99. It is mounted for 0S review, but live use requires a paid or owner-approved platform lane.") + '</p><p><strong>Platform ID:</strong> ' + platformId + ' · <strong>Billing:</strong> ' + priceLabel + '</p><label class="free99-platform-gate-field">0S / FS27 gate session<input id="free99PlatformGateToken" autocomplete="off" placeholder="paste gate session token"></label><div class="free99-platform-gate-actions"><button class="primary" id="free99PlatformGateUnlock" type="button">Unlock Session</button><button id="free99PlatformLocalProof" type="button">Local Proof Unlock</button><a href="/Free99/index.html">Back to Free99 Hub</a></div><p class="free99-platform-gate-status" id="free99PlatformGateStatus">Usage will be tagged as platform_id=' + platformId + ' and usage_lane=platform-app.</p></section>';
    document.body.appendChild(overlay);
    document.getElementById("free99PlatformGateUnlock")?.addEventListener("click", unlockFromInput);
    document.getElementById("free99PlatformLocalProof")?.addEventListener("click", useLocalProof);
    document.getElementById("free99PlatformGateToken")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") unlockFromInput();
    });
  }

  function boot() {
    patchFetch();
    installRouteScope();
    const session = readSession();
    if (session && tokenLooksValid(session.token)) {
      persist(session);
    } else {
      showGate();
    }
  }

  window.Free99PlatformGate = { platformId, platformName, billingMode, priceLabel, appRoot: scopedRoot, headers, requireSession: () => resolvedSession || readSession(), scopeUrl };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
