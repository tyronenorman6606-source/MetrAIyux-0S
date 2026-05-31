const SkygateAuthBridge = (() => {
  const endpointKey = 'adminBrainEndpoint';
  const claimsKey = 'metraiyux.skygate.claims.v1';
  const defaultWorkerOrigin = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';

  const $ = (id) => document.getElementById(id);
  const cleanOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');

  function endpoint() {
    return cleanOrigin(sessionStorage.getItem(endpointKey) || localStorage.getItem(endpointKey) || defaultWorkerOrigin);
  }

  function token() {
    return window.MetrAIyuxGateBridge?.current()?.token || '';
  }

  function authHeaders(extra = {}) {
    const bridgeHeaders = window.MetrAIyuxGateBridge?.headers?.({
      'x-skye-platform': 'metraiyux-0s-admin',
      'x-skye-usage-lane': '0meg4kai-admin-security'
    }) || {};
    return {
      ...extra,
      ...bridgeHeaders,
      ...(token() ? { authorization: `Bearer ${token()}` } : {})
    };
  }

  function claims() {
    try {
      return JSON.parse(sessionStorage.getItem(claimsKey) || '{}');
    } catch {
      return {};
    }
  }

  function actor() {
    const c = claims();
    return c.email || c.username || c.sub || 'admin';
  }

  function adminScoped(claimsLike = {}) {
    const c = claimsLike.skygate || claimsLike;
    const role = String(c.role || '').toLowerCase();
    const scopes = Array.isArray(c.scope) ? c.scope : String(c.scope || '').split(/\s+/);
    const normalized = new Set(scopes.map((scope) => String(scope).toLowerCase()).filter(Boolean));
    return ['founder', 'owner', 'admin'].includes(role)
      || normalized.has('admin.write')
      || normalized.has('admin.read')
      || normalized.has('keys.write');
  }

  function showStatus(targetId, message, ok = true) {
    const target = $(targetId || 'skygateAuthStatus');
    if (!target) return;
    target.innerHTML = `<p class="${ok ? 'mini-note' : 'warning'}">${escapeHtml(message)}</p>`;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  async function introspect(value = token(), origin = endpoint()) {
    const bearer = String(value || '').trim();
    if (!bearer) return { ok: false, error: 'Sign into the 0S/SkyGate session first.' };

    const paths = ['/api/skygate/auth-introspect'];
    let last = null;
    for (const path of paths) {
      try {
        const res = await fetch(`${cleanOrigin(origin)}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${bearer}` },
          body: '{}'
        });
        const data = await res.json().catch(() => ({ ok: false, error: `Invalid response from ${path}` }));
        const adminPath = path.includes('/api/admin/');
        const accepted = res.ok && (data.ok || (data.active && adminScoped(data)));
        last = { ok: accepted, status: res.status, path, ...data };
        if (res.ok && data.active && !adminPath && !adminScoped(data)) {
          last = { ...last, ok: false, error: 'Skyegate token is active, but it is not admin-scoped for this command deck.' };
        }
        if (res.status !== 404) return last;
      } catch (error) {
        last = { ok: false, error: error.message, path };
      }
    }
    return last || { ok: false, error: 'No auth bridge responded.' };
  }

  async function saveTokenFromInput(inputId = 'tokenInput', statusId = 'skygateAuthStatus') {
    const input = $(inputId);
    const value = token();
    if (input) input.value = '';
    if (!value) {
      sessionStorage.removeItem(claimsKey);
      showStatus(statusId, 'Open the shared FS27 gate first. This admin deck no longer stores pasted admin tokens.', false);
      return { ok: false, error: 'shared_fs27_gate_session_required' };
    }

    showStatus(statusId, 'Checking shared FS27/SkyGate session...');
    const result = await introspect(value);
    if (!result.ok) {
      sessionStorage.removeItem(claimsKey);
      showStatus(statusId, result.error || 'Shared FS27 session was not accepted by the admin auth bridge.', false);
      return result;
    }

    sessionStorage.setItem(claimsKey, JSON.stringify(result.skygate || result));
    window.MetrAIyuxGateBridge?.persist?.({
      token: value,
      source: 'skygate-admin-introspect',
      platform_id: 'metraiyux-0s-admin',
      usage_lane: '0meg4kai-admin-security',
      role: 'admin',
      actor: actor(),
      claims: result.skygate || result,
      gate_cards: [
        { id: '0s-core', name: '0S Core', scope: 'desktop-control' },
        { id: 'fs27', name: 'FS27 SkyGate', scope: 'identity-auth' },
        { id: '0meg4kai', name: '0meg4kAI Security', scope: 'admin-security' },
        { id: 'skyerunners', name: 'SkyeRunners', scope: 'runner-orchestration' }
      ]
    });
    const source = 'Skyegate FS27';
    const who = actor();
    showStatus(statusId, `Shared gate session accepted by ${source}. Active operator: ${who}.`);
    return result;
  }

  async function mirrorEvent(type, meta = {}) {
    if (!token()) return { ok: false, skipped: true, reason: 'No bearer token in this session.' };
    const res = await fetch(`${endpoint()}/api/skygate/platform-event`, {
      method: 'POST',
      headers: authHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ type, meta })
    });
    return res.json().catch(() => ({ ok: res.ok, status: res.status }));
  }

  function saveAdminSession(sessionToken) {
    return sessionToken ? { ok: false, error: 'admin_security_session_disabled_use_fs27_gate' } : { ok: true, cleared: true };
  }

  function adminSession() {
    return '';
  }

  return { endpoint, token, authHeaders, claims, actor, introspect, saveTokenFromInput, mirrorEvent, saveAdminSession, adminSession };
})();

window.SkygateAuthBridge = SkygateAuthBridge;
