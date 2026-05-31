(() => {
  "use strict";

  const PLATFORM_ID = "brandid-offline-pwa";
  const USAGE_LANE = "brand-intake-offline-pwa";
  const AUTH_OWNER = "main-worker-enforceZeroOsGate";
  const ACCEPTED_GATE_HEADERS = [
    "Authorization",
    "x-free99-gate-session",
    "x-skye-gate-session"
  ];
  const SHARED_SESSION_KEYS = [
    "METRAIYUX_GATE_SESSION",
    "SKYGATEFS27_GATE_SESSION",
    "SKYE_GATE_SESSION"
  ];

  const nativeFetch = window.fetch.bind(window);

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeToken(value) {
    return clean(value).replace(/^Bearer\s+/i, "").replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 4096);
  }

  function tokenLooksValid(value) {
    return /^[a-zA-Z0-9:_.-]{8,4096}$/.test(clean(value));
  }

  function safeJson(value) {
    try {
      return JSON.parse(value || "null");
    } catch {
      return null;
    }
  }

  function gateBridge() {
    if (window.MetrAIyuxGateBridge) return window.MetrAIyuxGateBridge;
    try {
      if (window.parent && window.parent !== window && window.parent.MetrAIyuxGateBridge) {
        return window.parent.MetrAIyuxGateBridge;
      }
    } catch {}
    return null;
  }

  function tokenFromSession(session) {
    if (!session || typeof session !== "object") return "";
    return normalizeToken(
      session.token ||
      session.access_token ||
      session.session ||
      session.sessionToken ||
      session.authToken ||
      session.bearerToken ||
      session.auth?.token ||
      session.auth?.bearerToken
    );
  }

  function readStoreSession(store, key) {
    if (!store) return null;
    let raw = "";
    try {
      raw = store.getItem(key) || "";
    } catch {
      return null;
    }
    if (!raw) return null;
    const parsed = safeJson(raw);
    const token = tokenFromSession(parsed) || normalizeToken(raw);
    if (!tokenLooksValid(token)) return null;
    return {
      ...(parsed && typeof parsed === "object" ? parsed : {}),
      token,
      source: parsed?.source || key
    };
  }

  function readKnownStoredSession() {
    const stores = [window.sessionStorage, window.localStorage].filter(Boolean);
    for (const store of stores) {
      for (const key of SHARED_SESSION_KEYS) {
        const session = readStoreSession(store, key);
        if (session) return session;
      }
    }
    return null;
  }

  function readDiscoveredStoredSession() {
    const stores = [window.sessionStorage, window.localStorage].filter(Boolean);
    for (const store of stores) {
      let length = 0;
      try {
        length = store.length;
      } catch {
        continue;
      }
      for (let index = 0; index < length; index += 1) {
        let key = "";
        try {
          key = store.key(index) || "";
        } catch {
          continue;
        }
        if (!/gate|free99|skye|owner|session/i.test(key)) continue;
        const session = readStoreSession(store, key);
        if (session) return session;
      }
    }
    return null;
  }

  function currentSession() {
    const bridge = gateBridge();
    let bridgeSession = null;
    try {
      bridgeSession = bridge?.current?.();
    } catch {}
    const bridgeToken = tokenFromSession(bridgeSession);
    if (tokenLooksValid(bridgeToken)) {
      return {
        ...bridgeSession,
        token: bridgeToken,
        source: bridgeSession?.source || "MetrAIyuxGateBridge.current",
        platform_id: PLATFORM_ID,
        usage_lane: USAGE_LANE
      };
    }

    const stored = readKnownStoredSession();
    if (!stored) return null;
    return {
      ...stored,
      platform_id: PLATFORM_ID,
      usage_lane: stored.usage_lane || USAGE_LANE
    };
  }

  function bridgeHeaders() {
    const bridge = gateBridge();
    try {
      return bridge?.headers?.({
        "x-skye-platform": PLATFORM_ID,
        "x-0s-platform": PLATFORM_ID,
        "x-skye-usage-lane": USAGE_LANE
      }) || {};
    } catch {
      return {};
    }
  }

  function headers(extra = {}) {
    const session = currentSession();
    const token = session?.token || "";
    return {
      ...bridgeHeaders(),
      ...(token ? {
        Authorization: `Bearer ${token}`,
        "x-skye-gate-session": token,
        "x-free99-gate-session": token
      } : {}),
      "x-skye-platform": PLATFORM_ID,
      "x-0s-platform": PLATFORM_ID,
      "x-skye-usage-lane": session?.usage_lane || USAGE_LANE,
      "x-free99-billing-mode": "gate_owned",
      ...extra
    };
  }

  function withGateHeaders(input, init = {}) {
    const nextHeaders = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init.headers || {}).forEach((value, key) => nextHeaders.set(key, value));
    Object.entries(headers()).forEach(([key, value]) => {
      if (value && !nextHeaders.has(key)) nextHeaders.set(key, value);
    });
    return {
      ...init,
      credentials: init.credentials || "same-origin",
      headers: nextHeaders
    };
  }

  function fetchWithGate(input, init = {}) {
    const requestUrl = typeof input === "string" ? input : input?.url || "";
    const url = new URL(requestUrl, window.location.href);
    if (url.origin !== window.location.origin) return nativeFetch(input, init);
    return nativeFetch(input, withGateHeaders(input, init));
  }

  function describe() {
    const session = currentSession();
    return {
      platformId: PLATFORM_ID,
      usageLane: USAGE_LANE,
      authOwner: AUTH_OWNER,
      hasSession: Boolean(session?.token),
      sessionSource: session?.source || "shared-gate-session-not-present-in-client-storage",
      acceptedHeaders: ACCEPTED_GATE_HEADERS,
      cookieMode: "same-origin"
    };
  }

  function announce() {
    document.documentElement.dataset.brandIdGateBridge = "shared-0s-fs27-skygate-free99";
    document.dispatchEvent(new CustomEvent("brandid:gate-bridge-ready", { detail: describe() }));
  }

  window.BrandIDGateBridge = {
    platformId: PLATFORM_ID,
    usageLane: USAGE_LANE,
    authOwner: AUTH_OWNER,
    acceptedHeaders: ACCEPTED_GATE_HEADERS,
    current: currentSession,
    hasSession: () => Boolean(currentSession()?.token),
    headers,
    withGateHeaders,
    fetch: fetchWithGate,
    describe
  };

  document.addEventListener("metraiyux:gate-ready", announce);
  document.addEventListener("free99-platform:gate-ready", announce);
  window.addEventListener("storage", announce);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", announce, { once: true });
  else announce();
})();
