(() => {
  "use strict";

  if (globalThis.MetrAIyuxGateBridge) return;

  const VERSION = "2026-05-22.skyemail-0s-gate-bridge";
  const SESSION_KEYS = [
    "METRAIYUX_GATE_SESSION",
    "SKYGATEFS27_GATE_SESSION",
    "SKYE_GATE_SESSION"
  ];
  const LEGACY_SESSION_KEYS = [
    ...SESSION_KEYS,
    "SKYGATEFS27_USER_TOKEN",
    "SKYGATE_USER_TOKEN",
    "SKYGATE_SESSION_TOKEN",
    "FREE99_PLATFORM_GATE_SESSION",
    "adminBrainToken",
    "adminSecuritySession",
    "saas_client_session"
  ];
  const CLAIMS_KEY = "metraiyux.skygate.claims.v1";
  const EVENT_KEY = "metraiyux.gate.events.v1";
  const MAX_EVENTS = 160;

  const clean = (value) => String(value == null ? "" : value).trim();
  const safeToken = (value) => clean(value).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 8192);
  const tokenLooksValid = (value) => safeToken(value).length >= 8;

  function readStore(store, key) {
    try {
      return store.getItem(key);
    } catch {
      return "";
    }
  }

  function writeStore(store, key, value) {
    try {
      store.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function removeStore(store, key) {
    try {
      store.removeItem(key);
    } catch {}
  }

  function readJson(store, key) {
    const raw = readStore(store, key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function readClaims() {
    return readJson(sessionStorage, CLAIMS_KEY) || readJson(localStorage, CLAIMS_KEY) || {};
  }

  function actorFrom(claims, fallback) {
    const c = claims?.skygate || claims || {};
    return c.email || c.username || c.user || c.sub || c.actor || fallback || "0s-operator";
  }

  function normalizeCards(inputCards, claims = {}) {
    const raw = Array.isArray(inputCards)
      ? inputCards
      : Array.isArray(claims.gate_cards)
        ? claims.gate_cards
        : Array.isArray(claims.cards)
          ? claims.cards
          : [];
    const seen = new Set();
    const cards = raw
      .map((card) => {
        if (!card) return null;
        const id = clean(card.id || card.key || card.card || card.scope || card.name).toLowerCase();
        if (!id || seen.has(id)) return null;
        seen.add(id);
        return {
          id,
          name: card.name || card.label || id,
          status: card.status || "active",
          scope: card.scope || card.entitlement || "gate-card",
          source: card.source || "session"
        };
      })
      .filter(Boolean);

    [
      ["0s-core", "0S Core", "desktop-control"],
      ["fs27", "SkyeGate FS27", "identity-auth"],
      ["0meg4kai", "0meg4kAI Security", "security-governance"],
      ["skyerunners", "SkyeRunners", "runner-orchestration"],
      ["skyemail", "SkyeMail", "mail-control"]
    ].forEach(([id, name, scope]) => {
      if (!seen.has(id)) cards.push({ id, name, status: "active", scope, source: "0s-default" });
    });
    return cards;
  }

  function normalizeSession(input = {}, source = "unknown") {
    const claims = input.claims || input.skygate || input.user || readClaims();
    const token = safeToken(
      input.token ||
      input.session ||
      input.sessionToken ||
      input.userToken ||
      input.authToken ||
      input.bearerToken ||
      input.access_token ||
      input.accessToken ||
      input.jwt ||
      input.value ||
      ""
    );
    if (!tokenLooksValid(token)) return null;
    return {
      token,
      source: input.source || source,
      bridge_version: VERSION,
      platform_id: input.platform_id || input.platformId || input.platform || "metraiyux-0s",
      usage_lane: input.usage_lane || input.usageLane || input.lane || "skyemail-gate-card",
      billing_mode: input.billing_mode || input.billingMode || "",
      price_label: input.price_label || input.priceLabel || "",
      workspace_id: input.workspace_id || input.workspaceId || input.workspace || "",
      client_id: input.client_id || input.clientId || "",
      customer_id: input.customer_id || input.customerId || claims?.customer_id || claims?.customerId || claims?.skygate?.customer_id || "",
      client: input.client || input.customer || "",
      email: input.email || claims?.email || claims?.skygate?.email || "",
      role: input.role || claims?.role || claims?.skygate?.role || "",
      status: input.status || "gate_session_active",
      issued_at: input.issued_at || input.issuedAt || new Date().toISOString(),
      actor: input.actor || actorFrom(claims, input.email || input.client),
      claims,
      gate_cards: normalizeCards(input.gate_cards || input.cards, claims)
    };
  }

  function parseMaybeSession(raw, source) {
    if (!raw) return null;
    if (typeof raw === "object") return normalizeSession(raw, source);
    const text = clean(raw);
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") return normalizeSession(parsed, source);
    } catch {}
    return normalizeSession({ token: text }, source);
  }

  function sessionFromRuntime() {
    const runtime = globalThis.METRAIYUX_0S_SESSION || {};
    return normalizeSession(runtime, runtime.source || "runtime");
  }

  function sessionFromStorage() {
    for (const key of SESSION_KEYS) {
      const parsed = readJson(sessionStorage, key) || readJson(localStorage, key);
      const normalized = parsed ? normalizeSession(parsed, parsed.source || key) : parseMaybeSession(readStore(sessionStorage, key) || readStore(localStorage, key), key);
      if (normalized) return normalized;
    }
    return null;
  }

  function current() {
    return sessionFromStorage() || sessionFromRuntime();
  }

  function persist(input, options = {}) {
    const session = normalizeSession(input, input?.source || "0s-gate-card-bridge");
    if (!session) return null;
    const serialized = JSON.stringify(session);
    SESSION_KEYS.forEach((key) => {
      writeStore(sessionStorage, key, serialized);
      writeStore(localStorage, key, serialized);
    });
    writeStore(sessionStorage, CLAIMS_KEY, JSON.stringify(session.claims || {}));
    globalThis.METRAIYUX_0S_SESSION = session;
    if (!options.silent) record("gate_session_persisted", {
      source: session.source,
      platform_id: session.platform_id,
      usage_lane: session.usage_lane,
      actor: session.actor
    }, session);
    return session;
  }

  function clear() {
    LEGACY_SESSION_KEYS.forEach((key) => {
      removeStore(sessionStorage, key);
      removeStore(localStorage, key);
    });
    delete globalThis.METRAIYUX_0S_SESSION;
  }

  function gateCards() {
    const session = current();
    return session ? session.gate_cards : normalizeCards([], readClaims());
  }

  function headers(extra = {}) {
    const session = current();
    if (!session) return { ...extra };
    const cardIds = (session.gate_cards || []).map((card) => card.id || card.card_id || card.name).filter(Boolean);
    return {
      Authorization: `Bearer ${session.token}`,
      authorization: `Bearer ${session.token}`,
      "x-free99-gate-session": session.token,
      "x-skye-gate-session": session.token,
      "x-skygate-session": session.token,
      "x-0s-gate-session": session.token,
      "x-0s-gate-cards": cardIds.join(","),
      "x-skye-gate-cards": cardIds.join(","),
      "x-skye-gate-source": session.source || "unknown",
      "x-metraiyux-session-source": session.source || "unknown",
      "x-skye-platform": session.platform_id || "metraiyux-0s",
      "x-0s-platform": session.platform_id || "metraiyux-0s",
      "x-skye-usage-lane": session.usage_lane || "skyemail-gate-card",
      "x-0s-actor": session.actor || "0s-operator",
      "x-0s-role": session.role || "",
      "x-0s-email": session.email || "",
      "x-0s-customer-id": session.customer_id || "",
      "x-0s-workspace-id": session.workspace_id || "",
      "x-0s-client-id": session.client_id || "",
      "x-0s-gate-card-count": String((session.gate_cards || []).length),
      ...extra
    };
  }

  function requireSession(options = {}) {
    const session = current();
    if (session) {
      const tagged = persist({
        ...session,
        platform_id: options.platformId || session.platform_id,
        usage_lane: options.usageLane || session.usage_lane
      }, { silent: true });
      record("gate_session_required_ok", {
        platform_id: tagged.platform_id,
        usage_lane: tagged.usage_lane,
        source: tagged.source
      }, tagged);
      return tagged;
    }
    record("gate_session_missing", {
      platform_id: options.platformId || "unknown",
      usage_lane: options.usageLane || "unknown"
    });
    document.dispatchEvent(new CustomEvent("metraiyux:gate-session-missing", { detail: options }));
    return null;
  }

  function readEvents() {
    return readJson(localStorage, EVENT_KEY) || [];
  }

  function record(type, detail = {}, session = current()) {
    const event = {
      id: `gateevt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      type: clean(type) || "gate_event",
      at: new Date().toISOString(),
      platform_id: detail.platform_id || session?.platform_id || "metraiyux-0s",
      usage_lane: detail.usage_lane || session?.usage_lane || "skyemail-gate-card",
      actor: detail.actor || session?.actor || "0s-operator",
      source: detail.source || session?.source || "0s-gate-card-bridge",
      detail
    };
    const events = readEvents().concat(event).slice(-MAX_EVENTS);
    writeStore(localStorage, EVENT_KEY, JSON.stringify(events));
    document.dispatchEvent(new CustomEvent("metraiyux:gate-event", { detail: event }));
    return event;
  }

  function installFetchPatch(options = {}) {
    if (globalThis.__METRAIYUX_GATE_FETCH_PATCHED__) return false;
    globalThis.__METRAIYUX_GATE_FETCH_PATCHED__ = true;
    const originalFetch = globalThis.fetch?.bind(globalThis);
    if (!originalFetch) return false;
    globalThis.fetch = (input, init = {}) => {
      const request = input instanceof Request ? input : null;
      const url = request ? new URL(request.url, location.href) : new URL(String(input), location.href);
      const sameOrigin = url.origin === location.origin;
      const attach = sameOrigin && /^(\/api\/|\/\.netlify\/functions\/|\/v1\/|\/skygate\/|\/ai\/)/.test(url.pathname);
      if (!attach) return originalFetch(input, init);
      const nextHeaders = new Headers(request ? request.headers : undefined);
      new Headers(init.headers || {}).forEach((value, key) => nextHeaders.set(key, value));
      Object.entries(headers({
        "x-skye-platform": options.platformId || current()?.platform_id || "metraiyux-0s",
        "x-skye-usage-lane": options.usageLane || current()?.usage_lane || "skyemail-gate-card"
      })).forEach(([key, value]) => {
        if (value) nextHeaders.set(key, value);
      });
      return originalFetch(input, { ...init, headers: nextHeaders });
    };
    record("gate_fetch_patch_installed", options);
    return true;
  }

  function getKaixuBearer() {
    return current()?.token || "";
  }

  const api = {
    version: VERSION,
    current,
    persist,
    clear,
    requireSession,
    headers,
    gateCards,
    record,
    readEvents,
    installFetchPatch,
    getKaixuBearer
  };

  globalThis.MetrAIyuxGateBridge = api;
  globalThis.METRAIYUX_GATE_BRIDGE = api;

  const bootSession = current();
  if (bootSession) persist(bootSession, { silent: true });
  document.dispatchEvent(new CustomEvent("metraiyux:gate-ready", { detail: current() }));
})();
