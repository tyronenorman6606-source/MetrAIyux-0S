(function () {
  'use strict';

  const API_BASE = '/api/northstar';
  const SESSION_STORAGE_KEY = 'signinpro_last_workspace_session_v2';
  const SHARED_GATE_KEYS = [
    'METRAIYUX_GATE_SESSION',
    'SKYGATEFS27_GATE_SESSION',
    'SKYE_GATE_SESSION'
  ];
  const BUILTIN_WORKSPACE_PROFILES = {
    'bobs-smoke-shop': { name: "Bob's Smoke Shop" },
    'bobs-smoke-shop-litchfield-park': { name: "Bob's Smoke Shop" },
    'bob-smoke-shop-preview-001': { name: "Bob's Smoke Shop" }
  };
  let csrfToken = '';

  function safeText(value, maxLength) {
    return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength || 240);
  }

  function cleanToken(value) {
    return String(value || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
  }

  function readTokenFromStorage(store, key) {
    try {
      const raw = store.getItem(key);
      if (!raw) return '';
      const parsed = raw.startsWith('{') ? JSON.parse(raw) : null;
      return cleanToken(parsed && parsed.token ? parsed.token : raw);
    } catch (error) {
      return '';
    }
  }

  function readSharedGateToken() {
    const bridgeToken = cleanToken(window.MetrAIyuxGateBridge?.current?.()?.token || window.Free99PlatformGate?.requireSession?.()?.token || '');
    if (bridgeToken) return bridgeToken;
    for (const key of SHARED_GATE_KEYS) {
      const token = readTokenFromStorage(sessionStorage, key) || readTokenFromStorage(localStorage, key);
      if (token) return token;
    }
    return '';
  }

  function ownerAdminCredential(input) {
    return cleanToken(
      input && (
        input.code
        || input.adminCode
        || input.admin_code
        || input.password
        || input.free99Code
        || input.free99_code
        || input.gateToken
        || input.gate_token
        || input.token
      )
    ) || readSharedGateToken();
  }

  function persistSharedGateToken(token, source) {
    const clean = cleanToken(token);
    if (!clean) return;
    const shared = {
      token: clean,
      source: source || 'signinpro-owner-unlock',
      platform_id: 'signinpro-northstar',
      usage_lane: '0s-gate-owner-session',
      issued_at: new Date().toISOString()
    };
    try {
      sessionStorage.setItem('METRAIYUX_GATE_SESSION', JSON.stringify(shared));
      sessionStorage.setItem('SKYGATEFS27_GATE_SESSION', JSON.stringify(shared));
    } catch (error) {}
    window.MetrAIyuxGateBridge?.persist?.(shared, { silent: true });
  }

  function isLocalPreview() {
    const params = new URLSearchParams(location.search);
    return location.protocol === 'file:' || ((params.get('local') === '1') && /^localhost$|^127\.0\.0\.1$/.test(location.hostname));
  }

  function workspaceHintSlug() {
    const params = new URLSearchParams(location.search);
    return safeText(params.get('workspace') || params.get('client') || 'northstar-local-preview', 120);
  }

  function workspaceHintProfile(slug) {
    const directory = window.NORTHSTAR_WORKSPACE_DIRECTORY || {};
    return directory[slug] || BUILTIN_WORKSPACE_PROFILES[slug] || null;
  }

  function stateKey(workspace) {
    const Core = window.SignInProCore || {};
    const prefix = Core.WORKSPACE_STATE_PREFIX || 'signinpro_workspace_state_v4';
    const slug = safeText(workspace && (workspace.slug || workspace.workspaceSlug), 120) || 'northstar-local';
    return `${prefix}:${slug}`;
  }

  function remember(payload) {
    if (payload && payload.csrfToken) csrfToken = payload.csrfToken;
    try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload || {})); } catch (error) {}
  }

  function restoreCsrf() {
    if (csrfToken) return csrfToken;
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) csrfToken = JSON.parse(raw).csrfToken || '';
    } catch (error) {}
    return csrfToken;
  }

  async function api(path, options) {
    const method = (options && options.method || 'GET').toUpperCase();
    const headers = Object.assign({ 'content-type': 'application/json' }, options && options.headers || {});
    const gateToken = readSharedGateToken();
    if (gateToken) {
      headers.authorization = `Bearer ${gateToken}`;
      headers['x-skye-gate-session'] = gateToken;
      headers['x-free99-gate-session'] = gateToken;
    }
    if (['POST','PUT','PATCH','DELETE'].includes(method)) {
      const csrf = restoreCsrf();
      if (csrf) headers['x-csrf-token'] = csrf;
    }
    const response = await fetch(`${API_BASE}${path}`, Object.assign({ credentials: 'include', headers }, options || {}));
    const text = await response.text();
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; } catch (error) { payload = { ok: false, error: text || 'Invalid JSON response.' }; }
    if (payload && payload.csrfToken) remember(payload);
    if (!response.ok) {
      const message = payload && payload.error ? payload.error : `Request failed with HTTP ${response.status}`;
      throw new Error(message);
    }
    return payload;
  }

  function localPreviewSession() {
    const slug = workspaceHintSlug();
    const profile = workspaceHintProfile(slug);
    const name = safeText(profile && profile.name, 160) || 'SignIn Pro Local Preview';
    return {
      authenticated: true,
      localPreview: true,
      csrfToken: 'local-preview',
      workspace: { id: `local-preview:${slug}`, slug, name, status: 'local-preview', plan: 'provided-infrastructure' },
      user: { email: 'SkyeDevAdmin@metraiyux.local', role: 'owner', permissions: ['read','write','settings','users','audit','backup','provision'] },
      remoteState: null
    };
  }

  async function session() {
    if (isLocalPreview()) return localPreviewSession();
    try {
      const payload = await api('/auth-session', { method: 'GET' });
      if (payload && payload.ok && payload.workspace) {
        remember(payload);
        return Object.assign({ authenticated: true }, payload);
      }
      return { authenticated: false };
    } catch (error) {
      return { authenticated: false, error: error.message || 'Session unavailable.' };
    }
  }

  async function login(input) {
    throw new Error('Workspace password login is disabled on the mounted 0S app. Use the shared FS27/SkyGate/Free99 session.');
  }

  async function ownerAdminLogin(input) {
    const code = ownerAdminCredential(input || {});
    const payloadBody = Object.assign({}, input || {}, {
      code,
      password: code,
      gateToken: code,
      free99Code: code
    });
    const headers = { 'content-type': 'application/json' };
    if (code) {
      headers.authorization = `Bearer ${code}`;
      headers['x-admin-token'] = code;
      headers['x-free99-admin-code'] = code;
      headers['x-free99-gate-session'] = code;
      headers['x-skye-gate-session'] = code;
    }
    const response = await fetch('/api/owner/admin-login', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(payloadBody)
    });
    const text = await response.text();
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; } catch (error) { payload = { ok: false, error: text || 'Invalid JSON response.' }; }
    if (!response.ok) throw new Error(payload.error || `Owner unlock failed with HTTP ${response.status}`);
    remember(payload);
    try {
      if (payload.token) persistSharedGateToken(payload.token, 'signinpro-owner-unlock');
    } catch (error) {}
    return Object.assign({ authenticated: true, owner: true }, payload);
  }

  async function logout() {
    try { await api('/auth-logout', { method: 'POST', body: JSON.stringify({}) }); } catch (error) {}
    try { await fetch('/api/owner/admin-logout', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) }); } catch (error) {}
    csrfToken = '';
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {}
  }

  async function pull() { return api('/workspace-sync', { method: 'GET' }); }
  async function push(state, reason, makeBackup) { return api('/workspace-sync', { method: 'POST', body: JSON.stringify({ state, reason: safeText(reason, 160), makeBackup: makeBackup === true }) }); }
  async function audit(limit) { return api(`/workspace-audit?limit=${encodeURIComponent(limit || 100)}`, { method: 'GET' }); }
  async function settings() { return api('/workspace-settings', { method: 'GET' }); }
  async function updateSettings(input) { return api('/workspace-settings', { method: 'POST', body: JSON.stringify(input || {}) }); }
  async function users() { return api('/workspace-users', { method: 'GET' }); }
  async function upsertUser(input) { return api('/workspace-users', { method: 'POST', body: JSON.stringify(input || {}) }); }
  async function backups(limit) { return api(`/workspace-backups?limit=${encodeURIComponent(limit || 25)}`, { method: 'GET' }); }


  async function operatorProvision(input) {
    return api('/operator-provision', { method: 'POST', body: JSON.stringify(input || {}) });
  }
  async function operatorWorkspaces() {
    return api('/operator-workspaces', { method: 'GET' });
  }

  function permissions(sessionPayload) {
    return sessionPayload && sessionPayload.user && Array.isArray(sessionPayload.user.permissions) ? sessionPayload.user.permissions : [];
  }
  function can(sessionPayload, permission) { return permissions(sessionPayload).includes(permission); }

  window.SignInProWorkspace = { api, session, login, ownerAdminLogin, logout, pull, push, audit, settings, updateSettings, users, upsertUser, backups, operatorProvision, operatorWorkspaces, stateKey, isLocalPreview, permissions, can };
})();
