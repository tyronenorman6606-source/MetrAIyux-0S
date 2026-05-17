const SecurityAutomation = (() => {
  const defaultWorkerOrigin = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const endpoint = () => (localStorage.getItem('adminBrainEndpoint') || defaultWorkerOrigin).replace(/\/+$/, '');
  const headers = (extra = {}) => window.SkygateAuthBridge?.authHeaders ? window.SkygateAuthBridge.authHeaders(extra) : extra;
  const hasAuth = () => Boolean(window.SkygateAuthBridge?.token?.() || window.SkygateAuthBridge?.adminSession?.());
  let pendingMfaDeviceId = '';

  function show(id, value) {
    const target = $(id);
    if (!target) return;
    target.innerHTML = `<pre>${esc(typeof value === 'string' ? value : JSON.stringify(value, null, 2))}</pre>`;
  }

  async function api(path, options = {}) {
    const res = await fetch(`${endpoint()}${path}`, {
      ...options,
      headers: headers({ ...(options.headers || {}), ...(options.body ? {'content-type':'application/json'} : {}) })
    });
    const data = await res.json().catch(() => ({ok:res.ok, status:res.status}));
    if (!res.ok) throw new Error(data.error || `Worker returned ${res.status}`);
    return data;
  }

  async function loadStatus() {
    $('endpointInput').value = endpoint();
    if (!hasAuth()) {
      $('securityStatus').innerHTML = [
        'Paste and validate an admin token to load live security state',
        'No protected Worker request has been sent from this preview'
      ].map(text => `<span class="status-pill">${esc(text)}</span>`).join('');
      $('connectorStatus').innerHTML = '<article><b>Connector status locked</b><span>Validate admin access to query protected connector state.</span></article>';
      return;
    }
    const status = await api('/api/admin/security/status');
    const connectors = await api('/api/admin/connectors/status');
    $('securityStatus').innerHTML = [
      `${status.mfa.required ? 'MFA required' : 'MFA optional'}`,
      `${status.mfa.active_devices} active authenticator${status.mfa.active_devices === 1 ? '' : 's'}`,
      status.mfa.session ? 'Admin security session active' : 'No MFA session',
      status.secret_rotation.cloudflare_api ? 'Cloudflare rotation API configured' : 'Cloudflare rotation API missing'
    ].map(text => `<span class="status-pill">${esc(text)}</span>`).join('');
    $('connectorStatus').innerHTML = connectors.connectors.map(connector => `<article><b>${esc(connector.label)}</b><span>${connector.configured ? 'configured' : 'missing URL'} · ${connector.token_configured ? 'token set' : 'no token'}</span><p>${esc((connector.default_actions || []).join(', '))}</p></article>`).join('');
  }

  async function setupMfa() {
    const data = await api('/api/admin/security/mfa/setup', {
      method:'POST',
      body:JSON.stringify({account_name:$('mfaAccount').value || 'admin'})
    });
    pendingMfaDeviceId = data.device.id;
    $('mfaSetupResult').innerHTML = `<div>${data.qr_svg}</div><p><b>Device:</b> ${esc(data.device.id)}</p><p><a class="button" href="skyebox-authenticator/index.html">Open SkyeBox Authenticator</a></p><textarea readonly>${esc(data.otpauth_uri)}</textarea>`;
  }

  async function verifyMfa() {
    const code = $('mfaCode').value.trim();
    const data = await api('/api/admin/security/mfa/verify', {
      method:'POST',
      body:JSON.stringify({code, device_id:pendingMfaDeviceId || undefined})
    });
    window.SkygateAuthBridge?.saveAdminSession(data.admin_session.token);
    show('mfaVerifyResult', {ok:true, session:data.admin_session.session});
    await loadStatus();
  }

  async function issueBackupCodes() {
    const data = await api('/api/admin/security/backup-codes/issue', {
      method:'POST',
      body:JSON.stringify({count:Number($('backupCount').value || 10), return_codes:$('returnCodes').checked})
    });
    show('backupIssueResult', data);
  }

  async function useBackupCode() {
    const data = await api('/api/admin/security/override-session', {
      method:'POST',
      body:JSON.stringify({backup_code:$('backupCode').value})
    });
    window.SkygateAuthBridge?.saveAdminSession(data.admin_session.token);
    show('backupUseResult', {ok:true, session:data.admin_session.session, consumed:data.consumed});
    await loadStatus();
  }

  async function queueConnector() {
    const payload = JSON.parse($('connectorPayload').value || '{}');
    const data = await api('/api/admin/connectors/event', {
      method:'POST',
      body:JSON.stringify({connector_type:$('connectorType').value, action:$('connectorAction').value, payload, approved:$('connectorApproved').checked, approval_required:!$('connectorApproved').checked, dispatch_now:$('connectorApproved').checked})
    });
    show('connectorResult', data);
  }

  async function loadConnectorEvents() {
    show('connectorResult', await api('/api/admin/connectors/events'));
  }

  async function rotateSecret() {
    const data = await api('/api/admin/secrets/rotate', {
      method:'POST',
      body:JSON.stringify({secret_name:$('secretName').value, new_value:$('newSecretValue').value.trim(), approved:$('rotationApproved').checked, deliver_once:$('deliverOnce').checked})
    });
    show('rotationResult', data);
  }

  async function loadRotations() {
    show('rotationResult', await api('/api/admin/secrets/rotations'));
  }

  function bind() {
    $('saveEndpoint')?.addEventListener('click', () => { localStorage.setItem('adminBrainEndpoint', $('endpointInput').value.trim()); loadStatus().catch(err => show('securityStatus', err.message)); });
    $('saveToken')?.addEventListener('click', async () => { await window.SkygateAuthBridge.saveTokenFromInput('tokenInput', 'skygateAuthStatus'); await loadStatus(); });
    $('setupMfa')?.addEventListener('click', () => setupMfa().catch(err => show('mfaSetupResult', err.message)));
    $('verifyMfa')?.addEventListener('click', () => verifyMfa().catch(err => show('mfaVerifyResult', err.message)));
    $('issueBackupCodes')?.addEventListener('click', () => issueBackupCodes().catch(err => show('backupIssueResult', err.message)));
    $('useBackupCode')?.addEventListener('click', () => useBackupCode().catch(err => show('backupUseResult', err.message)));
    $('queueConnector')?.addEventListener('click', () => queueConnector().catch(err => show('connectorResult', err.message)));
    $('loadConnectorEvents')?.addEventListener('click', () => loadConnectorEvents().catch(err => show('connectorResult', err.message)));
    $('rotateSecret')?.addEventListener('click', () => rotateSecret().catch(err => show('rotationResult', err.message)));
    $('loadRotations')?.addEventListener('click', () => loadRotations().catch(err => show('rotationResult', err.message)));
  }

  function boot() { bind(); loadStatus().catch(err => show('securityStatus', err.message)); }
  return {boot};
})();

document.addEventListener('DOMContentLoaded', () => SecurityAutomation.boot());
