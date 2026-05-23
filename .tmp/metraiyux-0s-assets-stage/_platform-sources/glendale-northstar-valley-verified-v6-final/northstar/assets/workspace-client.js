(function () {
  'use strict';

  const API_BASE = '/api/northstar';
  const SESSION_STORAGE_KEY = 'signinpro_last_workspace_session_v2';
  const BUILTIN_WORKSPACE_PROFILES = {
    'bobs-smoke-shop': { name: "Bob's Smoke Shop" },
    'bobs-smoke-shop-litchfield-park': { name: "Bob's Smoke Shop" },
    'bob-smoke-shop-preview-001': { name: "Bob's Smoke Shop" }
  };
  let csrfToken = '';

  function safeText(value, maxLength) {
    return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength || 240);
  }

  function isLocalPreview() {
    const params = new URLSearchParams(location.search);
    return params.get('local') === '1' || location.protocol === 'file:' || /^localhost$|^127\.0\.0\.1$/.test(location.hostname);
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
    const payload = await api('/auth-login', { method: 'POST', body: JSON.stringify(input || {}) });
    remember(payload);
    return Object.assign({ authenticated: true }, payload);
  }

  async function ownerAdminLogin(input) {
    const response = await fetch('/api/owner/admin-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input || {})
    });
    const text = await response.text();
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; } catch (error) { payload = { ok: false, error: text || 'Invalid JSON response.' }; }
    if (!response.ok) throw new Error(payload.error || `Owner unlock failed with HTTP ${response.status}`);
    remember(payload);
    try {
      if (payload.token) localStorage.setItem('quantumskyes_mcp_owner_token', payload.token);
    } catch (error) {}
    return Object.assign({ authenticated: true, owner: true }, payload);
  }

  async function logout() {
    try { await api('/auth-logout', { method: 'POST', body: JSON.stringify({}) }); } catch (error) {}
    try { await fetch('/api/owner/admin-logout', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) }); } catch (error) {}
    csrfToken = '';
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem('quantumskyes_mcp_owner_token');
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


  async function operatorProvision(input, operatorToken) {
    return api('/operator-provision', { method: 'POST', headers: { authorization: `Bearer ${operatorToken || ''}` }, body: JSON.stringify(input || {}) });
  }
  async function operatorWorkspaces(operatorToken) {
    return api('/operator-workspaces', { method: 'GET', headers: { authorization: `Bearer ${operatorToken || ''}` } });
  }

  function permissions(sessionPayload) {
    return sessionPayload && sessionPayload.user && Array.isArray(sessionPayload.user.permissions) ? sessionPayload.user.permissions : [];
  }
  function can(sessionPayload, permission) { return permissions(sessionPayload).includes(permission); }

  window.SignInProWorkspace = { api, session, login, ownerAdminLogin, logout, pull, push, audit, settings, updateSettings, users, upsertUser, backups, operatorProvision, operatorWorkspaces, stateKey, isLocalPreview, permissions, can };
})();
