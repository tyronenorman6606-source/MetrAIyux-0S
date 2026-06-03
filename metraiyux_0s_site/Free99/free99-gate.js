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
  const pendingReturnKey = "FREE99_PENDING_APP_RETURN";
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", ""]);
  const clean = (value) => String(value == null ? "" : value).trim();
  const safeToken = (value) => clean(value).replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 4096);
  const tokenLooksValid = (value) => /^[a-zA-Z0-9:_.-]{8,4096}$/.test(clean(value));
  const isLocalHost = () => localHosts.has(location.hostname) || location.protocol === "file:";
  const gateBridge = () => globalThis.MetrAIyuxGateBridge || (globalThis.parent && globalThis.parent !== globalThis ? globalThis.parent.MetrAIyuxGateBridge : null);
  let resolvedSession = null;

  function readSession() {
    const bridge = gateBridge();
    const bridgeSession = bridge?.requireSession?.({ platformId, usageLane: "platform-app" })
      || bridge?.current?.();
    if (bridgeSession && tokenLooksValid(bridgeSession.token)) {
      return { ...bridgeSession, token: safeToken(bridgeSession.token), source: bridgeSession.source || "0s-gate-card-bridge", platform_id: platformId, billing_mode: billingMode };
    }

    const url = new URL(location.href);
    const tourToken = safeToken(url.searchParams.get("tour_token") || url.searchParams.get("tourToken") || "");
    if (platformId === "skyeroutex" && /^rtx_tour_/i.test(tourToken) && tokenLooksValid(tourToken)) {
      return {
        token: tourToken,
        source: "skyeroutex-tour-token-url",
        platform_id: platformId,
        usage_lane: "skyeroutex-tour-readonly",
        billing_mode: "free99-demo",
        readonly: true
      };
    }
    return null;
  }

  function persist(session) {
    const cleanSession = {
      token: safeToken(session.token),
      source: session.source || "shared-0s-gate-session",
      platform_id: platformId,
      usage_lane: session.usage_lane || "platform-app",
      billing_mode: billingMode,
      price_label: priceLabel,
      readonly: session.readonly === true,
      issued_at: session.issued_at || new Date().toISOString()
    };
    if (!cleanSession.readonly) gateBridge()?.persist?.(cleanSession, { silent: true });
    gateBridge()?.record?.("free99_platform_gate_ready", cleanSession, cleanSession);
    resolvedSession = cleanSession;
    unlockUi();
    return cleanSession;
  }

  function headers(extra = {}) {
    const session = resolvedSession || readSession();
    const token = session && safeToken(session.token);
    const bridgeHeaders = gateBridge()?.headers?.({
      "x-skye-platform": platformId,
      "x-skye-usage-lane": session?.usage_lane || "platform-app"
    }) || {};
    return {
      ...bridgeHeaders,
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
    const absoluteRoots = [
      "/__free99_header_probe__",
      "/api/",
      "/0s/",
      "/admin/",
      "/assets/",
      "/audits/",
      "/brain/",
      "/client-app-factory/",
      "/docs/",
      "/downloads/",
      "/founder-command/",
      "/Free99/",
      "/gate/",
      "/governance/",
      "/live/",
      "/Marketing-Made-Easy/",
      "/northstar/",
      "/operator/",
      "/pricing/",
      "/proof/",
      "/sales/",
      "/signin-pro/",
      "/signinpro/",
      "/skyegate/",
      "/skyenet/",
      "/skyerrors/",
      "/SkyeMediaCenter/",
      "/SkyeMusicNexus/",
      "/SkyeProfitConsole/",
      "/SkyeRouteX/",
      "/SkyeSplitEngine/",
      "/valley-verified/",
      "/walkthroughs/"
    ];
    if (!text.startsWith("/") || text.startsWith("//") || text.startsWith(scopedRoot) || absoluteRoots.some((root) => text.startsWith(root))) return value;
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
    document.body?.classList.remove("free99-platform-gate-missing");
    document.body?.classList.add("free99-platform-gate-ready");
    document.getElementById("free99PlatformGate")?.remove();
    document.dispatchEvent(new CustomEvent("free99-platform:gate-ready", { detail: resolvedSession }));
  }

  function handleMissingSession() {
    document.documentElement.classList.remove("free99-platform-gate-locked");
    document.body?.classList.remove("free99-platform-gate-locked");
    document.body?.classList.add("free99-platform-gate-missing");
    document.dispatchEvent(new CustomEvent("free99-platform:gate-missing", {
      detail: { platformId, platformName, billingMode, appRoot: scopedRoot }
    }));

    if (isLocalHost()) return;
    const loginUrl = new URL("/admin/login.html", location.origin);
    const returnPath = location.pathname + location.search + location.hash;
    try { sessionStorage.setItem(pendingReturnKey, returnPath); } catch {}
    loginUrl.searchParams.set("return", returnPath);
    location.replace(loginUrl.toString());
  }

  function boot() {
    gateBridge()?.installFetchPatch?.({ platformId, usageLane: "platform-app" });
    patchFetch();
    installRouteScope();
    const session = readSession();
    if (session && tokenLooksValid(session.token)) persist(session);
    else handleMissingSession();
  }

  window.Free99PlatformGate = {
    platformId,
    platformName,
    billingMode,
    priceLabel,
    appRoot: scopedRoot,
    headers,
    requireSession: () => resolvedSession || readSession(),
    scopeUrl,
    authOwner: "main-worker-enforceZeroOsGate"
  };
  document.addEventListener("metraiyux:gate-ready", () => {
    const session = readSession();
    if (session && tokenLooksValid(session.token)) persist(session);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
