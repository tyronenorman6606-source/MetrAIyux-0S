const $ = (id) => document.getElementById(id);

let hubState = null;

function safeJson(value, fallback = null) {
  try { return JSON.parse(value || 'null') || fallback; } catch { return fallback; }
}

function gateSession() {
  const bridge = window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
  const bridgeSession = bridge?.requireSession?.({ platformId: 'routex-ae-command', usageLane: 'routex-ae-command' }) || bridge?.current?.();
  if (bridgeSession?.token) return bridgeSession;
  return safeJson(sessionStorage.getItem('METRAIYUX_GATE_SESSION'))
    || safeJson(sessionStorage.getItem('SKYGATEFS27_GATE_SESSION'))
    || safeJson(sessionStorage.getItem('SKYE_GATE_SESSION'))
    || safeJson(localStorage.getItem('METRAIYUX_GATE_SESSION'))
    || safeJson(localStorage.getItem('SKYGATEFS27_GATE_SESSION'))
    || safeJson(localStorage.getItem('SKYE_GATE_SESSION'));
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

async function api(method, path, body) {
  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...gateHeaders() },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
  if (!response.ok) throw new Error(payload.error || `${method} ${path} failed`);
  return payload;
}

function toast(message, bad = false) {
  const el = $('toast');
  el.hidden = false;
  el.textContent = message;
  el.className = bad ? 'toast bad' : 'toast';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 3600);
}

function esc(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function readForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  form.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    data[input.name] = input.checked;
  });
  return data;
}

function ensureHidden(form, name, value) {
  if (!form || !name || value == null || value === '') return;
  let input = Array.from(form.querySelectorAll('input[type="hidden"]')).find((item) => item.name === name);
  if (!input) {
    input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    form.appendChild(input);
  }
  input.value = String(value);
}

function setFormValue(form, name, value, overwrite = true) {
  const field = form?.elements?.[name];
  if (!field || value == null || value === '') return;
  if (overwrite || !field.value) field.value = String(value);
}

function applyLaunchPreset() {
  const form = $('intakeForm');
  if (!form) return;
  const params = new URLSearchParams(location.search || '');
  const artistSlug = params.get('artist') || params.get('artist_slug') || '';
  const artistId = params.get('artistId') || params.get('artist_id') || '';
  const stageName = params.get('stageName') || params.get('stage_name') || (artistSlug.toLowerCase() === 'supaboy' ? 'SupaBoy' : '');
  if (!artistSlug && !artistId && !stageName) return;
  const contractorPacketUrl = `/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html?source=SkyeMusicNexus&artist=${encodeURIComponent(artistSlug || 'artist')}${artistId ? `&artistId=${encodeURIComponent(artistId)}` : ''}${stageName ? `&stageName=${encodeURIComponent(stageName)}` : ''}&roleLane=${encodeURIComponent('Artist / Music Nexus Contractor')}`;
  setFormValue(form, 'name', stageName || artistSlug, false);
  setFormValue(form, 'lane', params.get('lane') || 'artist', true);
  setFormValue(form, 'headline', `${stageName || artistSlug} artist contractor profile connected to SkyeMusicNexus, RouteX workforce, and owner-reviewed payout paperwork.`, true);
  setFormValue(form, 'skills', 'music release operations, fan engagement, content launch, proof-backed artist campaigns', true);
  setFormValue(form, 'services', 'artist drops, music launch packages, content campaigns, fan store operations', true);
  setFormValue(form, 'bio', `${stageName || artistSlug} is being onboarded through the shared 0S company contractor lane. Payouts and commerce stay held until paperwork, rights/audio ownership, payout destination verification, and owner approval clear.`, true);
  setFormValue(form, 'businessName', stageName || artistSlug, false);
  ensureHidden(form, 'source_app', 'SkyeMusicNexus');
  ensureHidden(form, 'artist_slug', artistSlug);
  ensureHidden(form, 'artist_id', artistId);
  ensureHidden(form, 'stage_name', stageName);
  ensureHidden(form, 'company_onboarding_lane', 'Skyes Over London LC artist/vendor contractor onboarding');
  ensureHidden(form, 'contractor_packet_url', contractorPacketUrl);
  ensureHidden(form, 'founder_command_route', '/api/founder-command/contractor-packets');
  ensureHidden(form, 'workforce_command_url', '/SkyeRouteX/workforce-command-v0.4.0/index.html#contractor-panel');
  ensureHidden(form, 'payout_hold_required', 'true');
  ensureHidden(form, 'paperwork_required_before_payout', 'true');
  const latest = $('latestProfile');
  if (latest && latest.textContent.includes('No profile generated')) {
    latest.innerHTML = `Preset loaded for <strong>${esc(stageName || artistSlug)}</strong>.<br><a href="${esc(contractorPacketUrl)}">Open contractor packet</a><br><a href="/api/founder-command/contractor-packets?artist=${esc(encodeURIComponent(artistSlug || ''))}">Founder Command packet lane</a>`;
  }
}

function row(title, meta, actions = '') {
  return `<article class="ae-row"><div><strong>${esc(title)}</strong><div class="meta">${meta}</div></div><div>${actions}</div></article>`;
}

function cents(value) {
  const amount = Number(value || 0) / 100;
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function renderHub(hub) {
  hubState = hub;
  $('sessionLabel').textContent = hub.actor ? `${hub.actor.name || hub.actor.email || hub.actor.id} | ${hub.actor.role}` : '0S gate attached';
  $('profileCount').textContent = hub.counts?.profiles || 0;
  $('modelCount').textContent = hub.counts?.models || 0;
  $('jobCount').textContent = hub.counts?.open_jobs || 0;
  $('founderAccessCount').textContent = `${hub.counts?.founder_access_requests || 0} req`;

  $('pricingList').innerHTML = (hub.pricing?.pricing || []).map((item) => row(
    item.label,
    `${esc(item.price)} | ${esc(item.cadence)}<br>${(item.includes || []).map(esc).join(', ')}`
  )).join('');

  $('moneyPaths').innerHTML = (hub.money_paths || []).map((item) => row(
    item.label,
    `${esc(item.path)}<br>${(item.apps || []).map((href) => `<a href="${esc(href)}">${esc(href)}</a>`).join('<br>')}`
  )).join('');

  $('modelPool').innerHTML = (hub.model_profiles || hub.model_brains || []).map((item) => row(
    item.name,
    `${esc(item.headline || item.lane || '')}<br>${esc(item.model_job_policy || 'system test + explicit AI-eligible jobs')}<br>${esc(item.model_disclosure || item.disclosure || '')}`,
    item.profile_url ? `<a class="buttonlike" href="${esc(item.profile_url)}">Profile</a>` : ''
  )).join('') || '<div class="profile-output">No model profiles seeded yet.</div>';

  renderPool(hub.profiles || []);
  renderJobs(hub.open_jobs || []);
}

function renderPool(profiles) {
  $('aePool').innerHTML = profiles.map((profile) => row(
    profile.name || profile.slug,
    `${esc(profile.slug)} | ${esc(profile.lane)} | ${esc(profile.city || '')}, ${esc(profile.state || '')}<br>${esc((profile.skills || []).join(', '))}<br>${esc(profile.model_disclosure || '')}`,
    `<a class="buttonlike" href="${esc(profile.profile_url)}">Open</a>`
  )).join('') || '<div class="profile-output">No AE profiles loaded.</div>';
}

function renderJobs(jobs) {
  $('jobBoard').innerHTML = jobs.map((job) => row(
    job.title,
    `${esc(job.id)} | ${esc(job.status)} | ${esc(job.visibility_label || 'REAL JOB')}<br>${esc(job.city)}, ${esc(job.state)} | ${cents(job.pay_amount_cents)} | slots ${esc(job.slots)} | AI ${job.ai_model_eligible ? 'eligible' : 'not eligible'}`,
    `<button type="button" data-claim="${esc(job.id)}">Claim</button>`
  )).join('') || '<div class="profile-output">No open jobs are visible for this session.</div>';
}

function localDateTimeToIso(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function renderFounderAccess(items = []) {
  $('founderAccessList').innerHTML = items.map((item) => row(
    item.topic || item.id,
    `${esc(item.status)} | ${esc(item.week_key)} | ${esc(item.hours_requested)}h<br>${esc(item.requested_start || 'needs schedule')} - ${esc(item.requested_end || '')}<br>${esc(item.attendee_email || '')}`
  )).join('') || '<div class="profile-output">No founder access requests yet.</div>';
}

async function loadHub() {
  try {
    const hub = await api('GET', '/ae/hub');
    renderHub(hub);
  } catch (error) {
    $('sessionLabel').textContent = 'gate required';
    toast(error.message, true);
  }
}

async function loadJobs() {
  try {
    const data = await api('GET', '/jobs?status=open');
    renderJobs(data.jobs || []);
    $('jobCount').textContent = data.jobs?.length || 0;
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadPool() {
  try {
    const data = await api('GET', '/ae/pool');
    renderPool(data.profiles || []);
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadFounderAccess() {
  try {
    const data = await api('GET', '/ae/founder-access');
    renderFounderAccess(data.requests || []);
    $('founderAccessCount').textContent = `${data.requests?.length || 0} req`;
  } catch (error) {
    toast(error.message, true);
  }
}

$('refreshHub').addEventListener('click', loadHub);
$('refreshJobs').addEventListener('click', loadJobs);
$('refreshPool').addEventListener('click', loadPool);
$('refreshFounderAccess').addEventListener('click', loadFounderAccess);

$('seedBrains').addEventListener('click', async () => {
  try {
    const data = await api('POST', '/ae/seed-brains', { source: 'ae-command-browser' });
    renderHub(data.hub);
    toast(`Seeded ${data.seeded.length} internal AE models.`);
  } catch (error) {
    toast(error.message, true);
  }
});

$('intakeForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = readForm(event.currentTarget);
  data.skills = String(data.skills || '').split(',').map((item) => item.trim()).filter(Boolean);
  data.services = String(data.services || '').split(',').map((item) => item.trim()).filter(Boolean);
  data.llcOptIn = Boolean(data.llcOptIn);
  data.businessName = data.businessName || data.name;
  try {
    const result = await api('POST', '/ae/intake', data);
    $('latestProfile').innerHTML = [
      `<strong>${esc(result.profile.name)}</strong>`,
      `${esc(result.profile.headline)}`,
      `<a href="${esc(result.profile.profile_url)}">${esc(result.profile.profile_url)}</a>`,
      result.incorporation_request ? `LLC request: ${esc(result.incorporation_request.status)} | ${esc(result.incorporation_request.price_label)}` : 'LLC request: not requested'
    ].join('<br>');
    toast('AE profile populated into RouteX.');
    await loadHub();
  } catch (error) {
    toast(error.message, true);
  }
});

$('jobForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = readForm(event.currentTarget);
  try {
    const market = await api('POST', '/markets', { city: data.city, state: data.state });
    const job = await api('POST', '/jobs', {
      market_id: market.market.id,
      title: data.title,
      category: data.category,
      description: data.description,
      location: `${data.city}, ${data.state}`,
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      pay_type: 'fixed',
      pay_amount_cents: Number(data.pay_amount_cents || 0),
      slots: Number(data.slots || 1),
      acceptance_mode: data.acceptance_mode,
      job_kind: data.job_kind,
      ai_model_eligible: Boolean(data.ai_model_eligible),
      proof_required: true,
      route_required: false
    });
    toast(`Posted ${job.job.title}.`);
    await loadHub();
  } catch (error) {
    toast(error.message, true);
  }
});

$('founderAccessForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = readForm(event.currentTarget);
  data.start_at = localDateTimeToIso(data.start_at);
  data.end_at = localDateTimeToIso(data.end_at);
  try {
    const result = await api('POST', '/ae/founder-access', data);
    toast(result.live_event_created || result.provider?.ok ? 'Founder time saved to calendar.' : 'Founder request saved to the calendar ledger.');
    renderFounderAccess([result.request, ...(hubState?.founder_access_requests || [])].filter(Boolean));
    await loadHub();
  } catch (error) {
    toast(error.message, true);
  }
});

$('selectForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = readForm(event.currentTarget);
  try {
    const result = await api('POST', `/ae/jobs/${encodeURIComponent(data.jobId)}/select`, { ae_id: data.aeId, note: 'Selected from AE Command browser lane.' });
    toast(`Selected ${result.profile?.name || result.assignment.contractor_id}.`);
    await loadHub();
  } catch (error) {
    toast(error.message, true);
  }
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-claim]');
  if (!button) return;
  try {
    const result = await api('POST', `/ae/jobs/${encodeURIComponent(button.dataset.claim)}/claim`, { note: 'First come AE claim from AE Command.' });
    toast(`Claimed ${result.job.title}.`);
    await loadHub();
  } catch (error) {
    toast(error.message, true);
  }
});

applyLaunchPreset();
loadHub().then(loadFounderAccess).catch(() => {});

// BEGIN quantumskyes:adaptive-neon-scrollbar-js
(function(){
  if(window.__mcpVisibleNeonScrollbars) return;
  window.__mcpVisibleNeonScrollbars = true;

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }else{
      fn();
    }
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function verticalSource(){
    return document.scrollingElement || document.documentElement;
  }

  function horizontalSource(){
    const doc = document.scrollingElement || document.documentElement;
    if(doc.scrollWidth > doc.clientWidth + 4) return { node: doc, mode: 'horizontal' };
    const selectors = [
      '.site-header nav',
      '.table-wrap',
      '.topnav',
      '.route-grid',
      '.command-table',
      '.saas-table'
    ];
    const node = selectors
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .find((element) => element.scrollWidth > element.clientWidth + 4);
    return node ? { node, mode: 'horizontal' } : { node: doc, mode: 'page' };
  }

  onReady(() => {
    document.documentElement.setAttribute('data-mcp-neon-scrollbar', '');
    document.querySelectorAll('.mcp-neon-scroll-rail,.mcp-neon-scroll-corner').forEach((node) => node.remove());

    const yRail = document.createElement('div');
    yRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-y';
    yRail.setAttribute('aria-hidden', 'true');
    yRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const xRail = document.createElement('div');
    xRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-x';
    xRail.setAttribute('aria-hidden', 'true');
    xRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const corner = document.createElement('div');
    corner.className = 'mcp-neon-scroll-corner';
    corner.setAttribute('aria-hidden', 'true');

    document.body.append(yRail, xRail, corner);

    const yThumb = yRail.querySelector('.mcp-neon-scroll-thumb');
    const xThumb = xRail.querySelector('.mcp-neon-scroll-thumb');
    let activeHorizontal = horizontalSource();
    let raf = 0;
    let dragRaf = 0;
    let pendingDrag = null;
    let metrics = null;

    function measure(){
      const ySource = verticalSource();
      const yTrack = Math.max(1, yRail.clientHeight);
      const yMax = Math.max(1, ySource.scrollHeight - window.innerHeight);
      const yRatio = clamp(window.scrollY / yMax, 0, 1);
      const ySize = clamp((window.innerHeight / Math.max(ySource.scrollHeight, window.innerHeight)) * yTrack, 78, yTrack);

      if(!activeHorizontal?.node || !document.documentElement.contains(activeHorizontal.node)){
        activeHorizontal = horizontalSource();
      }
      const xTrack = Math.max(1, xRail.clientWidth);
      const xSource = activeHorizontal.node;
      const xMax = Math.max(0, xSource.scrollWidth - xSource.clientWidth);
      const pageMode = activeHorizontal.mode === 'page' || xMax <= 1;
      const xRatio = pageMode ? yRatio : clamp(xSource.scrollLeft / xMax, 0, 1);
      const xSize = pageMode
        ? clamp(xTrack * .24, 84, Math.max(84, xTrack * .38))
        : clamp((xSource.clientWidth / Math.max(xSource.scrollWidth, xSource.clientWidth)) * xTrack, 84, xTrack);

      return { ySource, yTrack, yMax, yRatio, ySize, xSource, xTrack, xMax, xRatio, xSize, pageMode };
    }

    function paintRails(view){
      yThumb.style.height = `${Math.floor(view.ySize)}px`;
      yRail.style.setProperty('--mcp-scroll-y', `${Math.round(view.yRatio * Math.max(0, view.yTrack - view.ySize))}px`);
      xThumb.style.width = `${Math.floor(view.xSize)}px`;
      xRail.style.setProperty('--mcp-scroll-x', `${Math.round(view.xRatio * Math.max(0, view.xTrack - view.xSize))}px`);
      xRail.dataset.scrollMode = view.pageMode ? 'page' : 'horizontal';
    }

    function scheduleUpdate(){
      if(raf) return;
      raf = window.requestAnimationFrame(updateRails);
    }

    function updateRails(){
      raf = 0;
      metrics = measure();
      paintRails(metrics);
    }

    function flushDrag(){
      dragRaf = 0;
      if(!pendingDrag) return;
      const { axis, ratio, snapshot } = pendingDrag;
      pendingDrag = null;
      const next = snapshot || measure();
      const bounded = clamp(ratio, 0, 1);

      if(axis === 'y'){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: next.pageMode ? yRatio : next.xRatio
        });
      }else if(next.pageMode){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: yRatio
        });
      }else{
        next.xSource.scrollLeft = bounded * next.xMax;
        paintRails({
          ...next,
          xRatio: clamp(next.xSource.scrollLeft / Math.max(1, next.xMax), 0, 1)
        });
      }
      scheduleUpdate();
    }

    function queueDrag(axis, ratio, snapshot){
      pendingDrag = { axis, ratio, snapshot };
      if(!dragRaf) dragRaf = window.requestAnimationFrame(flushDrag);
    }

    function bindRail(rail, thumb, axis, setter){
      let dragging = false;
      let pointerOffset = 0;
      let dragSnapshot = null;
      let railStart = 0;
      let track = 1;
      let size = 1;

      function ratioFromEvent(event, keepOffset){
        const coordinate = axis === 'y' ? event.clientY : event.clientX;
        const localOffset = keepOffset ? pointerOffset : size / 2;
        return clamp((coordinate - railStart - localOffset) / Math.max(1, track - size), 0, 1);
      }

      rail.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dragging = true;
        dragSnapshot = measure();
        const railRect = rail.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();
        railStart = axis === 'y' ? railRect.top : railRect.left;
        track = axis === 'y' ? dragSnapshot.yTrack : dragSnapshot.xTrack;
        size = axis === 'y' ? dragSnapshot.ySize : dragSnapshot.xSize;
        document.documentElement.classList.add('mcp-neon-scroll-dragging');
        rail.classList.add('is-dragging');
        rail.setPointerCapture?.(event.pointerId);
        pointerOffset = event.target === thumb || thumb.contains(event.target)
          ? (axis === 'y' ? event.clientY - thumbRect.top : event.clientX - thumbRect.left)
          : (axis === 'y' ? thumbRect.height / 2 : thumbRect.width / 2);
        setter(ratioFromEvent(event, event.target === thumb || thumb.contains(event.target)), dragSnapshot);
      });

      rail.addEventListener('pointermove', (event) => {
        if(!dragging) return;
        event.preventDefault();
        setter(ratioFromEvent(event, true), dragSnapshot);
      });

      function endDrag(event){
        if(!dragging) return;
        dragging = false;
        dragSnapshot = null;
        document.documentElement.classList.remove('mcp-neon-scroll-dragging');
        rail.classList.remove('is-dragging');
        rail.releasePointerCapture?.(event.pointerId);
        scheduleUpdate();
      }

      rail.addEventListener('pointerup', endDrag);
      rail.addEventListener('pointercancel', endDrag);
    }

    bindRail(yRail, yThumb, 'y', (ratio, snapshot) => queueDrag('y', ratio, snapshot));
    bindRail(xRail, xThumb, 'x', (ratio, snapshot) => queueDrag('x', ratio, snapshot));

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', () => {
      activeHorizontal = horizontalSource();
      scheduleUpdate();
    }, { passive: true });
    document.addEventListener('scroll', (event) => {
      if(event.target && event.target === activeHorizontal.node) scheduleUpdate();
    }, true);
    document.addEventListener('pointerover', (event) => {
      const candidate = event.target && event.target.closest && event.target.closest('.site-header nav,.table-wrap,.topnav,.route-grid');
      if(candidate && candidate.scrollWidth > candidate.clientWidth + 4){
        activeHorizontal = { node: candidate, mode: 'horizontal' };
        scheduleUpdate();
      }
    }, { passive: true });

    scheduleUpdate();
    window.setTimeout(scheduleUpdate, 350);
    window.setTimeout(scheduleUpdate, 1200);
  });
})();
// END quantumskyes:adaptive-neon-scrollbar-js

// BEGIN quantumskyes:skyesol-living-background-js
function mountSkyeSolLivingBackground({
  canvasSelector = '.skyesol-living-field',
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext('2d');
  const palette = [
    'rgba(201,168,76,',
    'rgba(138,99,255,',
    'rgba(39,242,255,'
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + .4,
      a: Math.random() * .34 + .12,
      s: Math.random() * .34 + .08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * .006) + time * speed) * amp;
      const n2 = Math.cos((x * .011) - time * speed * .7) * amp * .46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * .28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, .24);
    drawWave(t, height * .82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, .28);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onPointerMove);
  };
}


(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
// END quantumskyes:skyesol-living-background-js

// BEGIN quantumskyes:neon-motion-chrome-vanilla-js
(function(){
  if(window.__mcpNeonMotionChrome) return;
  window.__mcpNeonMotionChrome = true;
  function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn(); }
  ready(function(){
    if(!document.querySelector('.neon-scroll-progress')){
      const progress = document.createElement('i');
      progress.className = 'neon-scroll-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.append(progress);
      const update = function(){
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, window.scrollY / max)) + ')';
      };
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    }
    if(!document.querySelector('.neon-cursor-trail') && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
      const glow = document.createElement('div');
      glow.className = 'neon-cursor-trail';
      glow.setAttribute('aria-hidden', 'true');
      document.body.append(glow);
      window.addEventListener('pointermove', function(event){
        glow.style.transform = 'translate3d(' + (event.clientX - 150) + 'px,' + (event.clientY - 150) + 'px,0)';
      }, { passive: true });
    }
  });
})();
// END quantumskyes:neon-motion-chrome-vanilla-js
