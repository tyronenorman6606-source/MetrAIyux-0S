(function () {
  const STORAGE_KEY = "skye.telemetry.events";
  const script = document.currentScript || {};
  const endpoint = script.dataset.telemetryEndpoint
    || window.SKYE_TELEMETRY_ENDPOINT
    || "/api/0s-command-bridge/events";

  function readEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function gateHeaders() {
    const headers = { "content-type": "application/json" };
    try {
      const bridgeHeaders = window.MetrAIyuxGateBridge?.headers?.() || window.Free99PlatformGate?.headers?.() || {};
      Object.entries(bridgeHeaders).forEach(([key, value]) => {
        if (value) headers[key] = value;
      });
    } catch {}
    return headers;
  }

  function commandBridgePayload(payload) {
    return {
      source_app: payload.source_app || "skyesol-public",
      source_surface: payload.source_surface || document.title || "SkyeSol public surface",
      event_type: payload.type || payload.event_type || "skyesol.telemetry",
      summary: payload.summary || payload.label || payload.type || "SkyeSol telemetry event",
      entity: {
        kind: payload.entity_kind || "public-surface",
        id: payload.entity_id || location.pathname,
        label: payload.entity_label || document.title || "SkyeSol"
      },
      ids: payload.ids || {},
      links: [{ label: "Source page", href: location.pathname + location.search, kind: "surface" }],
      metadata: {
        ...payload,
        pathname: location.pathname,
        title: document.title || "",
        referrer: document.referrer || ""
      }
    };
  }

  async function sendLive(payload) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: gateHeaders(),
        body: JSON.stringify(commandBridgePayload(payload))
      });
      const body = await response.json().catch(() => ({ ok: response.ok, status: response.status }));
      return { ok: Boolean(response.ok && body?.ok !== false), status: response.status, body };
    } catch (error) {
      return { ok: false, error: error?.message || "skye_telemetry_live_write_failed" };
    }
  }

  async function emit(event) {
    const payload = {
      ...event,
      recordedAt: new Date().toISOString(),
      liveEndpoint: endpoint,
      liveStatus: "queued_live_write",
    };
    const next = readEvents();
    next.unshift(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 100)));
    const result = await sendLive(payload);
    const updated = readEvents().map((item) => item.recordedAt === payload.recordedAt
      ? { ...item, liveStatus: result.ok ? "posted" : "live_write_failed", liveResult: result }
      : item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 100)));
    window.dispatchEvent(new CustomEvent("skye:telemetry-live", { detail: result }));
    return payload;
  }

  window.SkyeTelemetry = { emit };
})();
