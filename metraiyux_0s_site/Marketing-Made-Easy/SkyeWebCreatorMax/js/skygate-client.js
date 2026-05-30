(function () {
  const config = {
    baseUrl: '',
  };

  function cleanOrigin(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function baseUrl() {
    return cleanOrigin(config.baseUrl || window.MetrAIyuxGateBridge?.origin?.() || window.location.origin);
  }

  function gateToken() {
    return window.MetrAIyuxGateBridge?.current?.()?.token
      || sessionStorage.getItem('adminBrainToken')
      || sessionStorage.getItem('metraiyux.gate.token')
      || sessionStorage.getItem('skye.gate.token')
      || '';
  }

  function authHeaders(headers = {}) {
    const bridgeHeaders = window.MetrAIyuxGateBridge?.headers?.({
      'x-skye-platform': 'skyewebcreator-max',
      'x-skye-usage-lane': 'marketing-made-easy'
    }) || {};
    const token = gateToken();
    return {
      ...headers,
      ...bridgeHeaders,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
  }

  async function postJson(path, body, headers) {
    const origin = baseUrl();
    try {
      const response = await fetch(`${origin}${path}`, {
        method: 'POST',
        headers: authHeaders({ 'content-type': 'application/json', ...headers }),
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  window.SkyeGateFS13Client = {
    configure(next) {
      if (next?.baseUrl) config.baseUrl = cleanOrigin(next.baseUrl);
      return { ok: true, configured: Boolean(baseUrl()), gateOwned: true };
    },
    mirrorEvent(event) {
      return postJson('/api/skygate/platform-event', {
        source_app: 'skyewebcreator-max',
        actor: event.actor || 'skyewebcreator-user',
        org_id: event.org_id || null,
        ws_id: event.ws_id || null,
        type: event.type || 'webcreator.event',
        meta: event.meta || {},
        event_ts: new Date().toISOString(),
      });
    },
    askAI(payload) {
      return postJson('/api/marketing-made-easy/webcreator-runtime/auren', {
        message: payload.prompt || payload.message || '',
        room: 'builder',
        brief: payload.project || payload.brief || {},
        runtime: { files: payload.files || {} },
        allowLiveAi: true,
      });
    },
    state() {
      return {
        configured: Boolean(baseUrl()),
        gateOwned: true,
        hasGateSession: Boolean(gateToken()),
      };
    },
  };
})();
