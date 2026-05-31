const $ = (id) => document.getElementById(id);

function gateSession() {
  const bridge = window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
  return bridge?.requireSession?.({ platformId: 'routex-ae-command', usageLane: 'ae-profile' })
    || bridge?.current?.()
    || null;
}

function gateHeaders() {
  const gate = gateSession();
  return gate?.token
    ? { authorization: `Bearer ${gate.token}`, 'x-skye-gate-session': gate.token, 'x-skye-platform': 'routex-ae-command' }
    : { 'x-skye-platform': 'routex-ae-command' };
}

function apiUrl(path) {
  const clean = String(path || '').replace(/^\/api\/routex/, '');
  if (window.MetrAIyuxApi?.path) return new URL(window.MetrAIyuxApi.path('routex', clean || '/'), location.origin).href;
  return new URL(`/api/routex${clean.startsWith('/') ? clean : `/${clean}`}`, location.origin).href;
}

async function api(path) {
  const response = await fetch(apiUrl(path), { credentials: 'same-origin', headers: { 'content-type': 'application/json', ...gateHeaders() } });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
  if (!response.ok) throw new Error(payload.error || `GET ${path} failed`);
  return payload;
}

function esc(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toast(message, bad = false) {
  const el = $('toast');
  el.hidden = false;
  el.textContent = message;
  el.className = bad ? 'toast bad' : 'toast';
}

function pillList(items) {
  return (items || []).map((item) => `<article class="ae-row"><div><strong>${esc(item)}</strong></div></article>`).join('') || '<div class="profile-output">Not populated yet.</div>';
}

function render(data) {
  const profile = data.profile;
  $('profileName').textContent = profile.name || profile.slug;
  $('profileBio').textContent = profile.bio || profile.headline || 'AE profile generated through RouteX.';
  $('profileStatus').textContent = `${profile.status} | ${profile.approval_status}`;
  $('skills').innerHTML = pillList(profile.skills);
  $('services').innerHTML = pillList(profile.services);
  $('workspaceState').innerHTML = [
    `Lane: ${esc(profile.lane)}`,
    `Type: ${esc(profile.worker_type)}`,
    `Founder access: ${esc(profile.founder_access_hours_weekly)} hours weekly`,
    `Incorporation: ${esc(profile.incorporation_status)}`,
    `Payout: ${esc(profile.payout_status)}`,
    profile.model_disclosure ? `Disclosure: ${esc(profile.model_disclosure)}` : ''
  ].filter(Boolean).join('<br>');
  $('workspaceLinks').innerHTML = (data.workspace_links || []).map((link) => `
    <article class="ae-row">
      <div><strong>${esc(link.label)}</strong><div class="meta">${esc(link.status || '')}</div></div>
      <div><a class="buttonlike" href="${esc(link.href)}">Open</a></div>
    </article>
  `).join('') || '<div class="profile-output">No workspace links attached yet.</div>';
}

async function start() {
  const slug = new URLSearchParams(location.search).get('ae') || '';
  if (!slug) {
    toast('Missing ?ae= profile slug.', true);
    return;
  }
  try {
    render(await api(`/ae/profiles/${encodeURIComponent(slug)}`));
  } catch (error) {
    toast(error.message, true);
    $('profileStatus').textContent = 'not loaded';
  }
}

start();
