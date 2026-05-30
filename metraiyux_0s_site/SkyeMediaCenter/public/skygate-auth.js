(function initSkyGateBrowserAuth() {
  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeToken(value) {
    const raw = clean(value);
    if (!raw) return '';
    return raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : raw;
  }

  function defaultSessionPath() {
    const configured = window.METRAIYUX_API_BASES?.media;
    if (configured) return clean(configured).replace(/\/+$/, '') + '/session';
    if (/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) return '/.netlify/functions/skygate-session';
    return '/api/media/session';
  }

  window.createSkyGateAuth = function createSkyGateAuth(config) {
    const options = config || {};
    const storageKey = clean(options.storageKey || 'MetrAIyuxGateBridge');
    const sessionPath = clean(options.sessionPath || defaultSessionPath());
    let memoryToken = '';

    function getToken() {
      if (memoryToken) return memoryToken;
      const mediaGateSession = window.SkyeMediaGate && typeof window.SkyeMediaGate.session === 'function'
        ? window.SkyeMediaGate.session()
        : null;
      const mediaGateToken = normalizeToken(mediaGateSession && mediaGateSession.token);
      if (mediaGateToken) return mediaGateToken;
      const gateBridge = window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
      const bridgeSession = gateBridge && typeof gateBridge.current === 'function' ? gateBridge.current() : null;
      return normalizeToken(bridgeSession && bridgeSession.token);
    }

    function setToken(value) {
      const token = normalizeToken(value);
      memoryToken = token;
      if (token && window.SkyeMediaGate && typeof window.SkyeMediaGate.persist === 'function') {
        window.SkyeMediaGate.persist({ token, source: '0s-gate-session', client: 'MetrAIyux 0S' });
      }
      return token;
    }

    function clearToken() {
      memoryToken = '';
      return '';
    }

    async function getSessionInfo() {
      const headers = { 'Content-Type': 'application/json' };
      const token = getToken();
      if (token) headers.Authorization = 'Bearer ' + token;
      const response = await window.fetch(sessionPath, {
        method: 'GET',
        headers,
      });
      return response.json().catch(function parseFailure() { return {}; });
    }

    async function authFetch(url, init, authOptions) {
      const requestInit = init || {};
      const opts = authOptions || {};
      const headers = new window.Headers(requestInit.headers || {});
      if (opts.auth !== false) {
        const token = getToken();
        if (!token) {
          throw new Error(opts.missingAuthMessage || 'Connect a SkyGate token before using this action.');
        }
        headers.set('Authorization', 'Bearer ' + token);
      }
      return window.fetch(url, { ...requestInit, headers });
    }

    async function logoutSession() {
      const token = getToken();
      if (!token) return { ok: true, cleared: true };
      const response = await window.fetch(sessionPath, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
      });
      const data = await response.json().catch(function parseFailure() { return {}; });
      clearToken();
      if (!response.ok) {
        throw new Error(data.error || 'Local session logout failed.');
      }
      return data;
    }

    return {
      storageKey,
      sessionPath,
      getToken,
      setToken,
      clearToken,
      hasToken: function hasToken() { return Boolean(getToken()); },
      getSessionInfo,
      logoutSession,
      fetch: authFetch,
    };
  };
})();
