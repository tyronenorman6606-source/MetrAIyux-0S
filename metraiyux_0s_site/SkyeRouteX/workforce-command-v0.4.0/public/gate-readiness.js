const $ = (id) => document.getElementById(id);
const dashboardRoute = '/api/gate-dashboard';

function safeJson(value, fallback = null) {
  try { return JSON.parse(value || 'null') || fallback; } catch { return fallback; }
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

function toast(message, bad = false) {
  const el = $('toast');
  el.hidden = false;
  el.textContent = message;
  el.className = bad ? 'toast bad' : 'toast';
  setTimeout(() => { el.className = 'toast hide'; }, 3200);
}

function gateSession() {
  return safeJson(sessionStorage.getItem('FREE99_PLATFORM_GATE_SESSION_SKYEROUTEX'))
    || safeJson(sessionStorage.getItem('FREE99_PLATFORM_GATE_SESSION'))
    || safeJson(localStorage.getItem('FREE99_PLATFORM_GATE_SESSION_SKYEROUTEX'))
    || safeJson(localStorage.getItem('FREE99_PLATFORM_GATE_SESSION'));
}

function gateHeaders() {
  const gate = gateSession();
  return gate?.token ? { authorization: `Bearer ${gate.token}`, 'x-skye-gate-session': gate.token, 'x-skye-platform': 'skyeroutex' } : { 'x-skye-platform': 'skyeroutex' };
}

function apiUrl(path) {
  if (window.MetrAIyuxApi?.path) return new URL(window.MetrAIyuxApi.path('routex', path), location.origin).href;
  const base = String(window.SKYEROUTEX_API_BASE || '/api/routex').replace(/\/+$/, '');
  const normalized = String(path || '').startsWith('/api/') ? String(path).slice('/api'.length) : String(path || '');
  return new URL(`${base}${normalized.startsWith('/') ? normalized : '/' + normalized}`, location.origin).href;
}

async function api(path) {
  const res = await fetch(apiUrl(path), { credentials: 'same-origin', headers: { 'content-type': 'application/json', ...gateHeaders() } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function badge(status) {
  const text = escapeHtml(status || 'unknown');
  const ok = /ready|connected|provider|worker-kv|ledger|local/.test(String(status || ''));
  return `<span class="pill ${ok ? 'ok' : 'bad'}">${text}</span>`;
}

function list(items = []) {
  return items.map(item => `<span class="pill">${escapeHtml(item)}</span>`).join('');
}

function renderMetrics(data) {
  const counts = data.counts || {};
  $('summary-metrics').innerHTML = [
    ['Profiles', counts.users || 0],
    ['Phone', counts.users_with_phone || 0],
    ['SMS Opt-In', counts.sms_opted_in || 0],
    ['Notifications', counts.notifications || 0],
    ['Compliance', counts.compliance_checks || 0],
    ['Gate Mirrors', counts.gate_mirror_events || 0],
    ['Outbox', counts.integration_outbox || 0],
    ['Runtime', counts.runtime_events || 0]
  ].map(([label, value]) => `<div><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join('');
}

function renderLinks(data) {
  const contract = data.auth_contract || {};
  $('auth-contract').innerHTML = [
    ['Owner', contract.owner],
    ['Local passwords', contract.routex_local_passwords_allowed ? 'allowed' : 'disabled'],
    ['Profile endpoint', contract.staged_profile_endpoint],
    ['Helpers', (contract.worker_helpers || []).join(', ')],
    ['Headers', (contract.accepted_headers || []).join(', ')]
  ].map(([name, value]) => `<div class="item"><strong>${escapeHtml(name)}</strong><div class="meta">${escapeHtml(value)}</div></div>`).join('');

  $('link-list').innerHTML = (data.links || []).map(link => {
    const href = escapeHtml(link.href);
    return `<div class="item"><strong>${escapeHtml(link.label)}</strong><div class="actions"><a class="buttonlike" href="${href}" target="_blank" rel="noopener">Open</a></div><div class="meta">${href}</div></div>`;
  }).join('');
}

function renderFeatures(data) {
  $('feature-matrix').innerHTML = (data.feature_readiness || []).map(feature => `
    <article class="card list-card">
      <h3>${escapeHtml(feature.label)}</h3>
      <div>${badge(feature.status)} ${feature.works_without_full_onboarding ? '<span class="pill">partial without onboarding</span>' : '<span class="pill">requires onboarding</span>'}</div>
      <p class="hint">${escapeHtml(feature.if_missing)}</p>
      <div class="meta">${list(feature.requires || [])}</div>
    </article>
  `).join('');
}

function renderOnboarding(data) {
  $('onboarding-matrix').innerHTML = (data.onboarding_matrix || []).map(row => `
    <article class="card list-card">
      <h3>${escapeHtml(row.lane)}</h3>
      <div class="meta"><strong>Must have</strong><br>${list(row.must_have || [])}</div>
      <div class="meta"><strong>Unlocks</strong><br>${list(row.unlocks || [])}</div>
      ${row.without_it ? `<p class="hint">${escapeHtml(row.without_it)}</p>` : ''}
    </article>
  `).join('');
}

function renderRecords(data) {
  const recent = data.recent || {};
  $('notifications').innerHTML = (recent.notifications || []).slice(0, 30).map(row => `
    <div class="item"><strong>${escapeHtml(row.title)}</strong><div class="meta">${escapeHtml(row.delivery_provider)} · ${escapeHtml(row.delivery_status)} · user ${escapeHtml(row.user_id)} · phone ${row.recipient_phone ? 'present' : 'missing'} · opt-in ${row.sms_opt_in === true ? 'yes' : 'no'}</div></div>
  `).join('') || '<div class="meta">No notifications yet.</div>';
  $('compliance').innerHTML = (recent.compliance_checks || []).slice(0, 30).map(row => `
    <div class="item"><strong>${escapeHtml(row.status)} · ${escapeHtml(row.provider)}</strong><div class="meta">${escapeHtml(row.id)} · user ${escapeHtml(row.user_id || 'none')} · assignment ${escapeHtml(row.assignment_id || 'none')}</div></div>
  `).join('') || '<div class="meta">No compliance records yet.</div>';
  $('runtime-events').innerHTML = (recent.runtime_events || []).slice(0, 40).map(row => `
    <div class="item"><strong>${escapeHtml(row.event_type)}</strong><div class="meta">${escapeHtml(row.entity_type)} ${escapeHtml(row.entity_id)} · ${escapeHtml(row.provider)} · ${escapeHtml(row.created_at)}</div></div>
  `).join('') || '<div class="meta">No runtime events yet.</div>';
  $('outbox').innerHTML = (recent.outbox || []).slice(0, 40).map(row => `
    <div class="item"><strong>${escapeHtml(row.provider_kind)} · ${escapeHtml(row.status)}</strong><div class="meta">${escapeHtml(row.driver)} · ${escapeHtml(row.event_type)} · ${escapeHtml(row.entity_id)}</div></div>
  `).join('') || '<div class="meta">No integration outbox rows yet.</div>';
  $('gate-mirrors').innerHTML = (data.gate_mirror?.events || []).slice(0, 30).map(row => `
    <div class="item"><strong>${escapeHtml(row.type || row.action)}</strong><div class="meta">${escapeHtml(row.created_at)} · ${escapeHtml(row.actor || '')} · ${escapeHtml(row.targetLabel || row.target || '')}</div></div>
  `).join('') || `<div class="meta">${escapeHtml(data.gate_mirror?.reason || data.gate_mirror?.error || 'No mirrored gate events returned yet.')}</div>`;
}

async function refresh() {
  const data = await api(dashboardRoute);
  renderMetrics(data);
  renderLinks(data);
  renderFeatures(data);
  renderOnboarding(data);
  renderRecords(data);
  toast('Gate readiness refreshed.');
}

$('btn-refresh')?.addEventListener('click', () => refresh().catch(error => toast(error.message, true)));

refresh().catch(error => {
  toast(error.message, true);
  $('summary-metrics').innerHTML = `<div><strong>Gate</strong><span>${escapeHtml(error.message)}</span></div>`;
});
