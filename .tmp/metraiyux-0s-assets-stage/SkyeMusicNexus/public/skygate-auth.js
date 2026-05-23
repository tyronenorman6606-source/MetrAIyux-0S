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
    const storageKey = clean(options.storageKey || 'skygate_token');
    const sessionPath = clean(options.sessionPath || defaultSessionPath());

    function readStorage(storage) {
      try {
        return normalizeToken(storage.getItem(storageKey));
      } catch {
        return '';
      }
    }

    function writeStorage(storage, token) {
      try {
        if (token) storage.setItem(storageKey, token);
        else storage.removeItem(storageKey);
      } catch {}
    }

    function getToken() {
      const sessionToken = readStorage(window.sessionStorage);
      if (sessionToken) return sessionToken;
      const musicGateSession = window.SkyeMusicGate && typeof window.SkyeMusicGate.session === 'function'
        ? window.SkyeMusicGate.session()
        : null;
      const musicGateToken = normalizeToken(musicGateSession && musicGateSession.token);
      if (musicGateToken) {
        writeStorage(window.sessionStorage, musicGateToken);
        return musicGateToken;
      }
      const legacyToken = readStorage(window.localStorage);
      if (legacyToken) {
        writeStorage(window.sessionStorage, legacyToken);
        writeStorage(window.localStorage, '');
      }
      return legacyToken;
    }

    function setToken(value) {
      const token = normalizeToken(value);
      writeStorage(window.sessionStorage, token);
      writeStorage(window.localStorage, '');
      return token;
    }

    function clearToken() {
      return setToken('');
    }

    async function bootstrapLocalProof(payload) {
      const response = await window.fetch(sessionPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      const data = await response.json().catch(function parseFailure() { return {}; });
      if (!response.ok || !data.token) {
        throw new Error(data.error || 'Local proof session bootstrap failed.');
      }
      setToken(data.token);
      return data;
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

    async function loginLocalOperator(credentials) {
      const payload = credentials || {};
      const response = await window.fetch(sessionPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantType: 'password',
          email: clean(payload.email || payload.username),
          password: clean(payload.password),
          subject: clean(payload.subject),
          role: clean(payload.role),
        }),
      });
      const data = await response.json().catch(function parseFailure() { return {}; });
      if (!response.ok || !data.token) {
        throw new Error(data.error || 'Local operator login failed.');
      }
      setToken(data.token);
      return data;
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
      bootstrapLocalProof,
      loginLocalOperator,
      logoutSession,
      fetch: authFetch,
    };
  };
})();
