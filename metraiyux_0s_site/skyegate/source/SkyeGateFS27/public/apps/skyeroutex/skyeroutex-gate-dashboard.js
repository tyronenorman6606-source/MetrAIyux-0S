(function () {
  const BASE = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
  const $ = (id) => document.getElementById(id);

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[char]));
  }

  function bridge() {
    return window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
  }

  function currentSession() {
    return bridge()?.requireSession?.({ platformId: 'skyeroutex', usageLane: 'gate-dashboard' }) || bridge()?.current?.() || {};
  }

  function setStatus(message, bad) {
    const el = $('status-text');
    if (!el) return;
    el.textContent = message;
    el.className = bad ? 'meta bad' : 'meta';
  }

  async function login() {
    if (!currentSession().token) {
      setStatus('Open the shared 0S/FS27 gate first.', true);
      return;
    }
    setStatus('Owner session attached through the shared gate.');
    await refresh();
  }

  async function fetchDashboard() {
    const session = currentSession();
    if (!session.token) throw new Error('Owner session required. Unlock the dashboard with the shared 0S code.');
    const res = await fetch(`${BASE}/api/routex/gate-dashboard`, {
      headers: {
        ...(bridge()?.headers?.({
          'x-skye-platform': 'skyeroutex',
          'x-skye-usage-lane': 'gate-dashboard'
        }) || {}),
        authorization: `Bearer ${session.token}`,
        'x-skye-gate-session': session.token,
        'x-skye-platform': 'skyeroutex'
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Readiness API failed (${res.status})`);
    return data;
  }

  function pill(value, extra) {
    return `<span class="pill ${extra || ''}">${escapeHtml(value)}</span>`;
  }

  function renderMetrics(data) {
    const counts = data.counts || {};
    $('metrics').innerHTML = [
      ['Profiles', counts.users],
      ['Phone', counts.users_with_phone],
      ['SMS Opt-In', counts.sms_opted_in],
      ['Notifications', counts.notifications],
      ['Compliance', counts.compliance_checks],
      ['Gate Mirrors', counts.gate_mirror_events],
      ['Outbox', counts.integration_outbox],
      ['Runtime', counts.runtime_events]
    ].map(([label, value]) => `<div><strong>${escapeHtml(value || 0)}</strong><span>${escapeHtml(label)}</span></div>`).join('');
  }

  function renderFeatures(data) {
    $('features').innerHTML = (data.feature_readiness || []).map((feature) => `
      <article class="card">
        <h3>${escapeHtml(feature.label)}</h3>
        <div>${pill(feature.status, /blocked/.test(feature.status) ? 'bad' : 'ok')} ${feature.works_without_full_onboarding ? pill('partial allowed') : pill('full onboarding required')}</div>
        <p>${escapeHtml(feature.if_missing)}</p>
        <div class="meta">${(feature.requires || []).map(item => pill(item)).join('')}</div>
      </article>
    `).join('');
  }

  function item(title, meta) {
    return `<div class="item"><strong>${escapeHtml(title)}</strong><div class="meta">${escapeHtml(meta)}</div></div>`;
  }

  function renderRecords(data) {
    const recent = data.recent || {};
    $('notifications').innerHTML = (recent.notifications || []).slice(0, 25).map(row => item(row.title, `${row.delivery_provider} · ${row.delivery_status} · user ${row.user_id} · phone ${row.recipient_phone ? 'present' : 'missing'} · opt-in ${row.sms_opt_in ? 'yes' : 'no'}`)).join('') || '<div class="meta">No notifications yet.</div>';
    $('compliance').innerHTML = (recent.compliance_checks || []).slice(0, 25).map(row => item(`${row.status} · ${row.provider}`, `${row.id} · user ${row.user_id || 'none'} · assignment ${row.assignment_id || 'none'}`)).join('') || '<div class="meta">No compliance records yet.</div>';
    $('mirrors').innerHTML = (data.gate_mirror?.events || []).slice(0, 25).map(row => item(row.type || row.action, `${row.created_at || ''} · ${row.actor || ''} · ${row.targetLabel || row.target || ''}`)).join('') || `<div class="meta">${escapeHtml(data.gate_mirror?.reason || data.gate_mirror?.error || 'No mirrored events returned yet.')}</div>`;
  }

  async function refresh() {
    const data = await fetchDashboard();
    renderMetrics(data);
    renderFeatures(data);
    renderRecords(data);
    setStatus(`Dashboard current at ${data.generated_at}.`);
  }

  $('login-btn')?.addEventListener('click', () => login().catch(error => setStatus(error.message, true)));
  $('refresh-btn')?.addEventListener('click', () => refresh().catch(error => setStatus(error.message, true)));
  if (currentSession().token) refresh().catch(error => setStatus(error.message, true));
})();
