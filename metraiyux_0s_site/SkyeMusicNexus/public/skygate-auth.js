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
    const configured = window.METRAIYUX_API_BASES && window.METRAIYUX_API_BASES.skymusicnexus;
    if (configured) return clean(configured).replace(/\/+$/, '') + '/skygate-session';
    if (/^(127\.0\.0\.1|localhost)$/i.test(window.location.hostname)) return '/.netlify/functions/skygate-session';
    return '/api/skymusicnexus/skygate-session';
  }

  window.createSkyGateAuth = function createSkyGateAuth(config) {
    const options = config || {};
    const storageKey = clean(options.storageKey || 'MetrAIyuxGateBridge');
    const sessionPath = clean(options.sessionPath || defaultSessionPath());
    let memoryToken = '';

    function getToken() {
      if (memoryToken) return memoryToken;
      const musicGateSession = window.SkyeMusicGate && typeof window.SkyeMusicGate.session === 'function'
        ? window.SkyeMusicGate.session()
        : null;
      const musicGateToken = normalizeToken(musicGateSession && musicGateSession.token);
      if (musicGateToken) return musicGateToken;
      const gateBridge = window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
      const bridgeSession = gateBridge && typeof gateBridge.current === 'function' ? gateBridge.current() : null;
      return normalizeToken(bridgeSession && bridgeSession.token);
    }

    function setToken(value) {
      const token = normalizeToken(value);
      memoryToken = token;
      if (token && window.SkyeMusicGate && typeof window.SkyeMusicGate.persist === 'function') {
        window.SkyeMusicGate.persist({ token, source: '0s-gate-session', client: 'MetrAIyux 0S' });
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
