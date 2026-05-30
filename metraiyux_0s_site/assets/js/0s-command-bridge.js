(function () {
  const script = document.currentScript || {};
  const dataset = script.dataset || {};
  const endpoint = dataset.commandBridgeEndpoint || '/api/0s-command-bridge/events';
  const app = dataset.commandBridgeApp || document.body?.dataset?.commandBridgeApp || 'metraiyux-0s';
  const surface = dataset.commandBridgeSurface || document.body?.dataset?.commandBridgeSurface || document.title || location.pathname;
  const autoCapture = dataset.commandBridgeAuto !== 'false';

  function text(value, max) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max || 500);
  }

  function pageEntity() {
    const body = document.body || {};
    const data = body.dataset || {};
    const slug = location.pathname.split('/').filter(Boolean).at(-1) || '';
    return {
      kind: text(data.artistId ? 'artist' : data.entityKind || '', 80),
      id: text(data.artistId || data.merchantId || data.entityId || slug, 180),
      label: text(data.artistName || data.merchantName || document.querySelector('h1')?.textContent || document.title, 220)
    };
  }

  function gateHeaders() {
    const headers = { 'content-type': 'application/json' };
    try {
      const bridgeHeaders = window.Free99PlatformGate?.headers?.() || {};
      Object.assign(headers, bridgeHeaders);
    } catch {}
    try {
      const gate = window.Free99PlatformGate?.requireSession?.() || window.MetrAIyuxGateBridge?.current?.() || null;
      const token = String(gate?.token || gate?.access_token || gate || '').replace(/^Bearer\s+/i, '').trim();
      if (token) {
        headers.authorization = headers.authorization || `Bearer ${token}`;
        headers['x-free99-gate-session'] = headers['x-free99-gate-session'] || token;
        headers['x-skye-gate-session'] = headers['x-skye-gate-session'] || token;
        headers['x-skygate-session'] = headers['x-skygate-session'] || token;
      }
    } catch {}
    return headers;
  }

  async function capture(type, payload) {
    const body = {
      source_app: payload?.source_app || app,
      source_surface: payload?.source_surface || surface,
      event_type: type || `${app}.surface_view`,
      summary: payload?.summary || document.title || location.pathname,
      entity: payload?.entity || pageEntity(),
      ids: payload?.ids || {},
      crm: payload?.crm || {},
      money: payload?.money || {},
      links: payload?.links || [{ label: 'Source Page', href: location.pathname + location.search, kind: 'surface' }],
      metadata: {
        pathname: location.pathname,
        search: location.search,
        referrer: document.referrer || '',
        title: document.title || '',
        ...(payload?.metadata || {})
      }
    };
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: gateHeaders(),
        body: JSON.stringify(body)
      });
      return await response.json().catch(() => ({ ok: response.ok, status: response.status }));
    } catch (error) {
      return { ok: false, error: error?.message || 'command_bridge_capture_failed' };
    }
  }

  window.SkyeCommandBridge = {
    capture,
    view(metadata) {
      return capture(`${app}.surface_view`, { metadata });
    },
    productIntent(product) {
      return capture(`${app}.product_intent`, { entity: { kind: 'product', id: product?.id || product?.productId || '', label: product?.title || product?.name || '' }, money: product?.money || {}, metadata: product || {} });
    },
    pwaDrop(drop) {
      return capture(`${app}.pwa_drop_intent`, { entity: { kind: 'pwa-drop', id: drop?.id || drop?.dropId || '', label: drop?.title || drop?.name || '' }, metadata: drop || {} });
    }
  };

  if (autoCapture) {
    const run = () => capture(`${app}.surface_view`, { metadata: { ready_state: document.readyState } });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
    else run();
  }
})();
