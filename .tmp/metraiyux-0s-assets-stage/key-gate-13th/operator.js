(() => {
  function installMobileOverflowGuard() {
    if (document.getElementById('kg13-mobile-overflow-guard')) return;
    const style = document.createElement('style');
    style.id = 'kg13-mobile-overflow-guard';
    style.textContent = `
      html, body { max-width: 100%; overflow-x: hidden; }
      .status-grid strong { overflow-wrap: anywhere; word-break: break-word; }
      label, input, select, textarea { min-width: 0; }
      @media (max-width: 660px) {
        main { width: min(calc(100% - 24px), 1480px); max-width: calc(100% - 24px); }
        .topbar, .topnav, .command, .workspace, .panel, .status-grid, .form-grid, .split-secret, .actions, .table-wrap, .list, .list-item { max-width: 100%; min-width: 0; }
        .brand, .topnav a, .pill, button { max-width: 100%; }
        .pill { white-space: normal; }
        .pill, .list-item, td, th { overflow-wrap: anywhere; word-break: break-word; }
        .table-wrap { overflow-x: hidden; }
        table, thead, tbody, tr, th, td { min-width: 0; max-width: 100%; }
        table, tbody, tr, td { display: block; width: 100%; }
        thead { display: none; }
        tr { padding: 10px; }
        td { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 0; }
        td::before { content: attr(data-label); color: var(--muted); flex: 0 0 96px; font-size: 11px; text-transform: uppercase; }
        .actions button { flex: 1 1 136px; }
        .mcp-neon-scroll-rail-x, .mcp-neon-scroll-corner { display: none !important; }
      }
    `;
    document.head.append(style);
  }

  installMobileOverflowGuard();

  const apiBase = window.MetrAIyuxApi?.bases?.keyGate13th || '/api/key-gate-13th';
  const agenticBase = window.MetrAIyuxApi?.bases?.agenticGrowth || '/api/agentic-growth';
  const state = {
    vendors: [],
    secrets: [],
    projects: [],
    auditEvents: [],
    selected: null
  };

  const $ = (selector) => document.querySelector(selector);

  function splitList(value) {
    return String(value || '')
      .split(/\n|,/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  async function api(base, path, options = {}) {
    const response = await fetch(`${base}${path}`, {
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    const data = await response.json().catch(() => ({ ok: false, error: `HTTP ${response.status}` }));
    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.data = data;
      throw error;
    }
    return data;
  }

  const keyGate = (path, options) => api(apiBase, path, options);
  const agentic = (path, options) => api(agenticBase, path, options);

  function toast(message, bad = false) {
    const node = $('#toast');
    node.textContent = message;
    node.classList.toggle('is-bad', bad);
    node.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('is-visible'), 3200);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function workspaceQuery() {
    const workspace = encodeURIComponent($('#workspaceId').value || '0s-primary-workspace');
    return `?workspace_id=${workspace}`;
  }

  function selectedVendor() {
    return state.vendors.find(vendor => vendor.key === $('#vendorKey').value) || state.vendors[0] || null;
  }

  function syncCredentialMode() {
    const vendor = selectedVendor();
    const split = vendor?.key === 'dataforseo';
    document.querySelector('.split-secret').hidden = !split;
    document.querySelector('.text-secret').hidden = split;
  }

  function secretPayload() {
    const vendor = selectedVendor();
    const split = vendor?.key === 'dataforseo';
    const body = {
      workspace_id: $('#workspaceId').value,
      vendorKey: $('#vendorKey').value,
      label: $('#label').value,
      allowedApps: splitList($('#allowedApps').value),
      scopes: splitList($('#scopes').value),
      metadata: {
        surface: 'key-gate-13th-dashboard'
      }
    };
    if (split) {
      body.credentials = {
        login: $('#credentialLogin').value,
        password: $('#credentialPassword').value
      };
    } else {
      body.secret = $('#secretValue').value;
    }
    return body;
  }

  function clearSecretInputs() {
    $('#secretValue').value = '';
    $('#credentialLogin').value = '';
    $('#credentialPassword').value = '';
  }

  function mergeSecret(secret) {
    if (!secret?.id) return;
    state.secrets = [
      secret,
      ...state.secrets.filter(item => item.id !== secret.id)
    ].sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    renderSecrets();
  }

  function mergeAudit(event) {
    if (!event?.id) return;
    state.auditEvents = [
      event,
      ...state.auditEvents.filter(item => item.id !== event.id)
    ].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    renderAudit(state.auditEvents);
  }

  function selectSecret(secret) {
    state.selected = secret || null;
    $('#selectedSecret').textContent = secret ? `${secret.vendor_key} · ${secret.id}` : 'No key selected';
    if (secret) {
      $('#vendorKey').value = secret.vendor_key;
      $('#label').value = secret.label || '';
      $('#allowedApps').value = (secret.grants?.apps || []).join(', ');
      $('#scopes').value = (secret.scopes || []).join(', ');
      syncCredentialMode();
    }
    renderSecrets();
  }

  function renderVendorOptions() {
    const options = state.vendors.map(vendor => `<option value="${escapeHtml(vendor.key)}">${escapeHtml(vendor.title)}</option>`).join('');
    $('#vendorKey').innerHTML = options;
  }

  function optionList(vendorKey) {
    const items = state.secrets.filter(secret => !vendorKey || secret.vendor_key === vendorKey);
    return `<option value="">None</option>${items.map(secret => `<option value="${escapeHtml(secret.id)}">${escapeHtml(secret.label)} · ${escapeHtml(secret.last4 || '----')}</option>`).join('')}`;
  }

  function renderRefSelectors() {
    $('#gscRef').innerHTML = optionList('google-search-console');
    $('#semrushRef').innerHTML = optionList('semrush');
    $('#dataForSeoRef').innerHTML = optionList('dataforseo');
  }

  function renderSecrets() {
    const rows = state.secrets.length ? state.secrets.map(secret => `
      <tr data-id="${escapeHtml(secret.id)}" class="${state.selected?.id === secret.id ? 'is-selected' : ''}">
        <td data-label="Provider"><strong>${escapeHtml(secret.vendor_title || secret.vendor_key)}</strong><span>${escapeHtml(secret.fingerprint_prefix || '')}</span></td>
        <td data-label="Label">${escapeHtml(secret.label || '')}</td>
        <td data-label="Status">${escapeHtml(secret.status || '')}</td>
        <td data-label="Last4">${escapeHtml(secret.last4 || '----')}</td>
        <td data-label="Test">${escapeHtml(secret.test_status || 'untested')}</td>
        <td data-label="Updated"><span>${escapeHtml(secret.updated_at || '')}</span></td>
      </tr>
    `).join('') : '<tr><td data-label="Status" colspan="6"><span>No connected keys yet.</span></td></tr>';
    $('#secretRows').innerHTML = rows;
    $('#secretRows').querySelectorAll('tr[data-id]').forEach(row => {
      row.addEventListener('click', () => selectSecret(state.secrets.find(secret => secret.id === row.dataset.id)));
    });
    renderRefSelectors();
  }

  function renderProjects() {
    const node = $('#projectList');
    const items = state.projects.length ? state.projects : [];
    node.innerHTML = items.length ? items.map(project => `
      <div class="list-item">
        <strong>${escapeHtml(project.name || project.id)}</strong>
        <span>${escapeHtml(project.domain || project.preview_url || '')} · ${escapeHtml(project.schedule?.cadence || 'manual')} · next ${escapeHtml(project.schedule?.nextRunAt || 'unset')}</span>
      </div>
    `).join('') : '<div class="list-item"><span>No monitors saved.</span></div>';
  }

  function renderAudit(items) {
    const rows = items && items.length ? items : [];
    $('#auditList').innerHTML = rows.length ? rows.map(item => `
      <div class="list-item">
        <strong>${escapeHtml(item.type || item.id)}</strong>
        <span>${escapeHtml(item.created_at || '')} · ${escapeHtml(item.vendor_key || '')} · ${escapeHtml(item.status || '')}</span>
      </div>
    `).join('') : '<div class="list-item"><span>No custody events yet.</span></div>';
  }

  async function loadHealth() {
    const health = await keyGate('/health');
    $('#authState').textContent = health.auth_mode || 'FS27 gate';
    $('#cryptoState').textContent = health.encryption_configured ? 'AES-GCM ready' : 'Key missing';
    $('#storageState').textContent = health.storage_configured ? 'KV ready' : 'KV missing';
    $('#agenticState').textContent = health.raw_secret_policy ? 'Refs only' : 'Checking';
    $('#cryptoState').classList.toggle('is-bad', !health.encryption_configured);
    $('#storageState').classList.toggle('is-bad', !health.storage_configured);
  }

  async function loadVendors() {
    const data = await keyGate('/v1/vendors');
    state.vendors = data.vendors || [];
    renderVendorOptions();
    syncCredentialMode();
  }

  async function loadSecrets() {
    const data = await keyGate(`/v1/secrets${workspaceQuery()}`);
    const workspaceId = data.workspace_id || $('#workspaceId').value || '0s-primary-workspace';
    const merged = new Map();
    for (const secret of state.secrets.filter(item => item.workspace_id === workspaceId)) {
      merged.set(secret.id, secret);
    }
    for (const secret of data.items || []) {
      merged.set(secret.id, secret);
    }
    state.secrets = [...merged.values()];
    if (state.selected) {
      state.selected = state.secrets.find(secret => secret.id === state.selected.id) || null;
    }
    renderSecrets();
  }

  async function loadAudit() {
    const data = await keyGate(`/v1/audit${workspaceQuery()}`);
    const workspaceId = data.workspace_id || $('#workspaceId').value || '0s-primary-workspace';
    const merged = new Map();
    for (const event of state.auditEvents.filter(item => item.workspace_id === workspaceId)) {
      merged.set(event.id, event);
    }
    for (const event of data.items || []) {
      merged.set(event.id, event);
    }
    state.auditEvents = [...merged.values()].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    renderAudit(state.auditEvents);
  }

  async function loadProjects() {
    const data = await agentic(`/v1/projects${workspaceQuery()}`);
    state.projects = data.items || [];
    renderProjects();
  }

  async function createSecret(event) {
    event.preventDefault();
    const data = await keyGate('/v1/secrets', {
      method: 'POST',
      body: JSON.stringify(secretPayload())
    });
    clearSecretInputs();
    toast(`Encrypted ${data.secret.vendor_key} key`);
    mergeSecret(data.secret);
    mergeAudit(data.audit);
    selectSecret(data.secret);
    await loadSecrets();
    if (!state.secrets.some(secret => secret.id === data.secret.id)) mergeSecret(data.secret);
    await loadAudit();
    selectSecret(state.secrets.find(secret => secret.id === data.secret.id));
  }

  async function rotateSelected() {
    if (!state.selected) return toast('Select a key first', true);
    const data = await keyGate(`/v1/secrets/${encodeURIComponent(state.selected.id)}/rotate`, {
      method: 'POST',
      body: JSON.stringify(secretPayload())
    });
    clearSecretInputs();
    toast(`Rotated ${data.secret.vendor_key} key`);
    mergeSecret(data.secret);
    mergeAudit(data.audit);
    selectSecret(data.secret);
    await loadSecrets();
    if (!state.secrets.some(secret => secret.id === data.secret.id)) mergeSecret(data.secret);
    await loadAudit();
  }

  async function testSelected() {
    if (!state.selected) return toast('Select a key first', true);
    const data = await keyGate(`/v1/secrets/${encodeURIComponent(state.selected.id)}/test`, {
      method: 'POST',
      body: JSON.stringify({ live: false })
    });
    toast(`${data.secret.vendor_key} ${data.test.status}`);
    mergeSecret(data.secret);
    mergeAudit(data.audit);
    selectSecret(data.secret);
    await loadSecrets();
    if (!state.secrets.some(secret => secret.id === data.secret.id)) mergeSecret(data.secret);
    await loadAudit();
  }

  async function revokeSelected() {
    if (!state.selected) return toast('Select a key first', true);
    const data = await keyGate(`/v1/secrets/${encodeURIComponent(state.selected.id)}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'dashboard_revoked' })
    });
    toast('Key revoked');
    mergeSecret(data.secret);
    mergeAudit(data.audit);
    await loadSecrets();
    if (!state.secrets.some(secret => secret.id === data.secret.id)) mergeSecret(data.secret);
    selectSecret(state.secrets.find(secret => secret.id === data.secret.id) || data.secret);
    await loadAudit();
  }

  function refValue(selector, vendorKey) {
    const id = $(selector).value;
    return id ? { id, workspace_id: $('#workspaceId').value, vendor_key: vendorKey } : null;
  }

  async function saveProject(event) {
    event.preventDefault();
    const body = {
      workspace_id: $('#workspaceId').value,
      name: $('#projectName').value,
      domain: $('#projectDomain').value,
      credentials: {
        gsc: { credentialRef: refValue('#gscRef', 'google-search-console') },
        semrush: { credentialRef: refValue('#semrushRef', 'semrush') },
        dataForSeo: { credentialRef: refValue('#dataForSeoRef', 'dataforseo') }
      },
      schedule: {
        enabled: true,
        cadence: $('#cadence').value
      }
    };
    const data = await agentic('/v1/projects', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    toast(`Saved ${data.project.name}`);
    await loadProjects();
  }

  function showError(error) {
    const data = error.data || {};
    toast(data.error || error.message || 'Request failed', true);
  }

  async function boot() {
    try {
      await loadHealth();
      await loadVendors();
      await loadSecrets();
      await loadProjects();
      await loadAudit();
    } catch (error) {
      showError(error);
      $('#authState').textContent = 'Gate required';
      $('#authState').classList.add('is-bad');
    }
  }

  $('#vendorKey').addEventListener('change', syncCredentialMode);
  $('#workspaceId').addEventListener('change', () => {
    Promise.all([loadSecrets(), loadProjects(), loadAudit()]).catch(showError);
  });
  $('#secretForm').addEventListener('submit', event => createSecret(event).catch(showError));
  $('#rotateSecret').addEventListener('click', () => rotateSelected().catch(showError));
  $('#testSecret').addEventListener('click', () => testSelected().catch(showError));
  $('#revokeSecret').addEventListener('click', () => revokeSelected().catch(showError));
  $('#refreshSecrets').addEventListener('click', () => loadSecrets().catch(showError));
  $('#refreshAudit').addEventListener('click', () => loadAudit().catch(showError));
  $('#projectForm').addEventListener('submit', event => saveProject(event).catch(showError));
  $('#refreshProjects').addEventListener('click', () => loadProjects().catch(showError));

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
