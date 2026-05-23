(() => {
  const apiBase = window.MetrAIyuxApi?.bases?.agenticGrowth || '/api/agentic-growth';
  const keyGateBase = window.MetrAIyuxApi?.bases?.keyGate13th || '/api/key-gate-13th';
  const state = {
    lastCycle: null,
    lastJson: null,
    lastPatch: null,
    keyGateSecrets: []
  };

  const $ = (selector) => document.querySelector(selector);

  function listValue(id) {
    return String($(id)?.value || '')
      .split(/\n|,/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function pageInventory() {
    return listValue('#pages').map(route => ({
      url: route.startsWith('/') || /^https?:\/\//i.test(route) ? route : `/${route}`,
      title: route === '/' ? 'Home' : route.split('/').filter(Boolean).map(titleCase).join(' ')
    }));
  }

  function titleCase(value) {
    return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  function payload() {
    const workspaceId = $('#workspaceId').value || '0s-primary-workspace';
    const sourceConfig = sourceConfigPayload(workspaceId);
    return {
      label: `${$('#businessName').value} 0S agentic cycle`,
      workspace_id: workspaceId,
      business: {
        name: $('#businessName').value,
        industry: $('#industry').value,
        services: listValue('#services'),
        locations: listValue('#locations')
      },
      site: {
        previewUrl: $('#previewUrl').value,
        pages: pageInventory()
      },
      market: {
        seedKeywords: listValue('#keywords'),
        competitors: listValue('#competitors')
      },
      adapter: {
        type: 'static-site',
        applyMode: 'review-manifest'
      },
      ...(Object.keys(sourceConfig).length ? { sourceConfig } : {})
    };
  }

  function refObject(id, vendorKey, workspaceId) {
    const value = $(id)?.value || '';
    return value ? { id: value, workspace_id: workspaceId, vendor_key: vendorKey } : null;
  }

  function sourceConfigPayload(workspaceId) {
    const gscRef = refObject('#gscRef', 'google-search-console', workspaceId);
    const semrushRef = refObject('#semrushRef', 'semrush', workspaceId);
    const dataForSeoRef = refObject('#dataForSeoRef', 'dataforseo', workspaceId);
    const config = {};
    if (gscRef) config.gsc = { credentialRef: gscRef, siteUrl: $('#gscSiteUrl').value || $('#previewUrl').value };
    if (semrushRef) config.semrush = { credentialRef: semrushRef, domain: domainFrom($('#previewUrl').value) || $('#businessName').value };
    if (dataForSeoRef) config.dataForSeo = { credentialRef: dataForSeoRef, keywords: listValue('#keywords') };
    return config;
  }

  function domainFrom(value) {
    try {
      return new URL(value).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  async function api(path, options = {}) {
    const response = await fetch(`${apiBase}${path}`, {
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    const data = await response.json().catch(() => ({ok: false, error: `HTTP ${response.status}`}));
    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.data = data;
      throw error;
    }
    return data;
  }

  async function keyGate(path, options = {}) {
    const response = await fetch(`${keyGateBase}${path}`, {
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    const data = await response.json().catch(() => ({ok: false, error: `HTTP ${response.status}`}));
    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.data = data;
      throw error;
    }
    return data;
  }

  function setJson(node, value) {
    node.textContent = JSON.stringify(value, null, 2);
  }

  function setSummary(data) {
    const actionCount = data.plan?.prioritizedActions?.length || 0;
    const business = data.snapshot?.business?.name || 'Business';
    const mode = data.snapshot?.mode || data.mode || 'cycle';
    $('#receiptTitle').textContent = data.receipt?.id || 'Agentic Growth receipt';
    $('#summary').textContent = `${business}: ${actionCount} prioritized changes generated in ${mode}. Auth: ${data.auth?.mode || 'fs27-shared-gate'}.`;
  }

  function renderQueue(id, items, formatter) {
    const node = $(id);
    node.innerHTML = '';
    const list = items && items.length ? items : [{title: 'Waiting for a cycle', route: 'Run the engine to populate this queue.'}];
    for (const item of list.slice(0, 8)) {
      const li = document.createElement('li');
      li.innerHTML = formatter(item);
      node.append(li);
    }
  }

  function renderPlan(data) {
    const queues = data.plan?.queues || {};
    renderQueue('#serviceQueue', queues.servicePages, item => `<strong>${escapeHtml(item.title || 'Service page')}</strong><span>${escapeHtml(item.route || '')}</span>`);
    renderQueue('#locationQueue', queues.locationPages, item => `<strong>${escapeHtml(item.title || 'Location page')}</strong><span>${escapeHtml(item.route || '')}</span>`);
    renderQueue('#faqQueue', queues.faqs, item => `<strong>${escapeHtml(item.question || 'FAQ')}</strong><span>Score ${escapeHtml(item.score || '')}</span>`);
    renderQueue('#linkQueue', queues.internalLinks, item => `<strong>${escapeHtml(item.reason || 'Internal link')}</strong><span>${escapeHtml(item.from || '')} -> ${escapeHtml(item.to || '')}</span>`);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[char]));
  }

  async function runCycle(endpoint = '/v1/cycles') {
    $('#summary').textContent = 'Running FS27-gated Agentic Growth cycle...';
    const data = await api(endpoint, {method: 'POST', body: JSON.stringify(payload())});
    state.lastCycle = data;
    state.lastJson = data;
    setSummary(data);
    setJson($('#jsonOut'), data);
    renderPlan(data);
    await loadLedger();
    return data;
  }

  async function buildPatch() {
    const body = state.lastCycle?.plan ? {plan: state.lastCycle.plan, adapter: {applyMode: 'review-manifest'}} : payload();
    const data = await api('/v1/adapters/static-site/patch', {method: 'POST', body: JSON.stringify(body)});
    state.lastPatch = data;
    state.lastJson = data;
    setJson($('#patchOut'), data);
    return data;
  }

  async function loadLedger() {
    const list = $('#ledgerList');
    list.textContent = 'Loading receipts...';
    const data = await api('/v1/ledger');
    list.innerHTML = '';
    const items = data.items && data.items.length ? data.items : [{id: 'No receipts yet', summary: {actions: 0}, created_at: 'Run a cycle to create one.'}];
    for (const item of items.slice(0, 10)) {
      const div = document.createElement('div');
      div.className = 'ledger-item';
      div.innerHTML = `<strong>${escapeHtml(item.id)}</strong><span>${escapeHtml(item.created_at || '')} · ${escapeHtml(item.summary?.business || '')} · ${escapeHtml(item.summary?.actions ?? 0)} actions</span>`;
      list.append(div);
    }
  }

  function renderCredentialRefs() {
    const optionList = vendorKey => {
      const items = state.keyGateSecrets.filter(secret => secret.vendor_key === vendorKey && secret.status === 'active');
      return `<option value="">None</option>${items.map(secret => `<option value="${escapeHtml(secret.id)}">${escapeHtml(secret.label || secret.id)} · ${escapeHtml(secret.last4 || '----')}</option>`).join('')}`;
    };
    $('#gscRef').innerHTML = optionList('google-search-console');
    $('#semrushRef').innerHTML = optionList('semrush');
    $('#dataForSeoRef').innerHTML = optionList('dataforseo');
  }

  async function loadKeyGateRefs() {
    const workspace = encodeURIComponent($('#workspaceId')?.value || '0s-primary-workspace');
    const data = await keyGate(`/v1/secrets?workspace_id=${workspace}`);
    state.keyGateSecrets = data.items || [];
    renderCredentialRefs();
  }

  async function boot() {
    try {
      const health = await api('/health');
      $('#engineState').textContent = health.engine || '0S adapter';
      $('#authState').textContent = health.auth_mode || 'FS27 gate';
      await loadKeyGateRefs().catch(() => {
        state.keyGateSecrets = [];
        renderCredentialRefs();
      });
      await loadLedger();
    } catch (error) {
      $('#engineState').textContent = 'Gate required';
      $('#engineState').classList.add('is-bad');
      $('#summary').textContent = error.message || 'The shared FS27/0S gate session is required.';
    }
  }

  $('#cycleForm').addEventListener('submit', event => {
    event.preventDefault();
    runCycle().catch(showError);
  });
  $('#runCycle').addEventListener('click', () => runCycle().catch(showError));
  $('#runFallback').addEventListener('click', () => runCycle('/v1/fallback/brief').then(data => {
    state.lastJson = data;
    setJson($('#jsonOut'), data);
    $('#summary').textContent = data.brief?.suggestedOffer || 'No-domain brief generated.';
  }).catch(showError));
  $('#pullSources').addEventListener('click', () => runCycle('/v1/cycles/pull').catch(showError));
  $('#schemaBtn').addEventListener('click', () => api('/v1/schema').then(data => {
    state.lastJson = data;
    setJson($('#jsonOut'), data);
    $('#summary').textContent = 'Schema loaded from the gated 0S API.';
  }).catch(showError));
  $('#buildPatch').addEventListener('click', () => buildPatch().catch(showError));
  $('#refreshLedger').addEventListener('click', () => loadLedger().catch(showError));
  $('#workspaceId').addEventListener('change', () => loadKeyGateRefs().catch(showError));
  $('#copyJson').addEventListener('click', async () => {
    const text = JSON.stringify(state.lastJson || state.lastPatch || state.lastCycle || {}, null, 2);
    await navigator.clipboard.writeText(text);
    $('#summary').textContent = 'Current JSON copied.';
  });

  function showError(error) {
    const data = error.data || {};
    $('#summary').textContent = data.error || error.message || 'Agentic Growth request failed.';
    $('#summary').classList.add('is-bad');
    setJson($('#jsonOut'), data.ok === false ? data : {ok: false, error: error.message});
  }

  boot();
})();

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
