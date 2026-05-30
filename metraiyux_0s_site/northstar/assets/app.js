(function () {
  'use strict';

  const Core = window.SignInProCore;
  const Workspace = window.SignInProWorkspace;
  const root = document.getElementById('app');
  const stateLabel = document.getElementById('app-status');
  let STORE = Core.STATE_KEY + ':boot';
  let workspaceSession = { authenticated: false, workspace: null, user: null, localPreview: false };
  let syncState = { online: false, lastSyncedAt: '', syncing: false, error: '', booted: false };
  const BRAND_LOCKUP = {
    manager: 'Managed by NorthStar Office & Accounting',
    family: 'A SOLEnterprises family app',
    backing: 'Backed by Skyes Over London',
    fieldRecord: '1,644 Skyes Over London accounts owned through the field stack'
  };
  const BUILTIN_WORKSPACE_PROFILES = {
    'bobs-smoke-shop': {
      name: "Bob's Smoke Shop",
      image: '/valley-verified/assets/client-builds/bobs-live-build-poster.jpg',
      video: '/valley-verified/assets/client-builds/bobs-live-build.mp4',
      mainUrl: '/valley-verified/business/bobs-smoke-shop-litchfield-park/',
      accent: '#4bdcff',
      accent2: '#f5d36a',
      cta: "Open Bob's preview workspace with the real app-build video, retail handoff, and scoped SignIn Pro check-in lane."
    },
    'bobs-smoke-shop-litchfield-park': {
      name: "Bob's Smoke Shop",
      image: '/valley-verified/assets/client-builds/bobs-live-build-poster.jpg',
      video: '/valley-verified/assets/client-builds/bobs-live-build.mp4',
      mainUrl: '/valley-verified/business/bobs-smoke-shop-litchfield-park/',
      accent: '#4bdcff',
      accent2: '#f5d36a',
      cta: "Open Bob's preview workspace with the real app-build video, retail handoff, and scoped SignIn Pro check-in lane."
    },
    'bob-smoke-shop-preview-001': {
      name: "Bob's Smoke Shop",
      image: '/valley-verified/assets/client-builds/bobs-live-build-poster.jpg',
      video: '/valley-verified/assets/client-builds/bobs-live-build.mp4',
      mainUrl: '/client-preview/bobs-smoke-shop.html',
      accent: '#4bdcff',
      accent2: '#f5d36a',
      cta: "Open Bob's private preview room with the live app-build media and trial workspace routes."
    }
  };
  function workspaceHintSlug() { const params = new URLSearchParams(location.search); return params.get('workspace') || params.get('client') || ''; }
  function workspaceHintProfile() {
    const slug = workspaceHintSlug();
    if (!slug) return null;
    const directoryProfile = window.NORTHSTAR_WORKSPACE_DIRECTORY ? window.NORTHSTAR_WORKSPACE_DIRECTORY[slug] : null;
    return directoryProfile || BUILTIN_WORKSPACE_PROFILES[slug] || null;
  }
  let state = Core.sanitizeState(Core.DEFAULT_STATE);
  let ui = {
    view: location.hash === '#admin' ? 'admin' : 'checkin',
    adminTab: 'dashboard',
    selectedId: '',
    search: '',
    notice: '',
    errors: {},
    successId: '',
    storageWarning: '',
    provisionNotice: '',
    provisionResults: [],
    loginTab: 'login'
  };
  let resetTimer = null;
  const intro = document.querySelector('[data-northstar-intro]');
  const introEnter = document.querySelector('[data-northstar-intro-enter]');
  const introWorkspaceLabel = document.querySelector('[data-northstar-intro-workspace]');
  let introClosed = false;

  function setupIntro() {
    if (!intro) {
      document.body.classList.remove('northstar-intro-active');
      return;
    }
    const profile = workspaceHintProfile();
    if (introWorkspaceLabel) introWorkspaceLabel.textContent = profile ? `${profile.name} workspace` : 'your workspace';
    if (introEnter) introEnter.addEventListener('click', closeIntro, { once: true });
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(closeIntro, reduced ? 650 : 1450);
  }

  function closeIntro() {
    if (introClosed) return;
    introClosed = true;
    document.body.classList.remove('northstar-intro-active');
    if (!intro) return;
    intro.classList.add('is-exiting');
    intro.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => { intro.hidden = true; }, 420);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) return Core.sanitizeState(JSON.parse(raw));
      const migrated = Core.legacyStateFromStorage(localStorage);
      if (migrated) {
        const next = Core.addAudit(migrated, 'upgrade_migration', 'Imported compatible legacy kiosk data into hardened storage.');
        localStorage.setItem(STORE, JSON.stringify(next));
        return next;
      }
    } catch (error) {
      console.warn('State load failed', error);
    }
    return Core.sanitizeState(Object.assign({}, Core.DEFAULT_STATE, { workspace: currentWorkspaceForState() }));
  }


  function currentWorkspaceForState() {
    const workspace = workspaceSession && workspaceSession.workspace ? workspaceSession.workspace : {};
    const user = workspaceSession && workspaceSession.user ? workspaceSession.user : {};
    return {
      id: workspace.id || 'local-preview',
      slug: workspace.slug || 'northstar-local',
      name: workspace.name || 'SignIn Pro Local Workspace',
      role: user.role || 'operator'
    };
  }

  function applyWorkspaceToState() {
    state.workspace = Core.sanitizeWorkspace(currentWorkspaceForState());
    state.workspace.role = roleLabel();
    const ws = workspaceSession.workspace || {};
    if (ws.name && state.settings.eventName === Core.DEFAULT_STATE.settings.eventName) {
      state.settings.eventName = `${ws.name} Guest Access`;
    }
  }

  function workspaceDisplayName() {
    return (workspaceSession.workspace && workspaceSession.workspace.name) || 'SignIn Pro Workspace';
  }

  function can(permission) {
    return Workspace && Workspace.can ? Workspace.can(workspaceSession, permission) : true;
  }

  function roleLabel() {
    return workspaceSession.user && workspaceSession.user.role ? workspaceSession.user.role : 'operator';
  }

  async function pullRemoteState() {
    if (!Workspace || !workspaceSession.authenticated || workspaceSession.localPreview) return;
    try {
      const payload = await Workspace.pull();
      if (payload && payload.ok && payload.state) {
        const remote = Core.sanitizeState(payload.state);
        const localCount = Array.isArray(state.attendees) ? state.attendees.length : 0;
        const remoteCount = Array.isArray(remote.attendees) ? remote.attendees.length : 0;
        if (remoteCount >= localCount || payload.forceRemote === true) {
          state = remote;
          applyWorkspaceToState();
          localStorage.setItem(STORE, JSON.stringify(state));
        }
        syncState.online = true;
        syncState.lastSyncedAt = payload.updatedAt || new Date().toISOString();
        syncState.error = '';
      }
    } catch (error) {
      syncState.online = false;
      syncState.error = error.message || 'Remote sync unavailable.';
    }
  }

  async function pushRemoteState(reason, makeBackup) {
    if (!Workspace || !workspaceSession.authenticated || workspaceSession.localPreview || !state.settings.syncEnabled) return;
    syncState.syncing = true;
    renderStatusOnly();
    try {
      applyWorkspaceToState();
      const payload = await Workspace.push(Core.sanitizeState(state), reason || 'local_update', makeBackup === true);
      syncState.online = true;
      syncState.lastSyncedAt = payload.updatedAt || new Date().toISOString();
      syncState.error = '';
    } catch (error) {
      syncState.online = false;
      syncState.error = error.message || 'Remote backup failed.';
    } finally {
      syncState.syncing = false;
      renderStatusOnly();
    }
  }

  function renderStatusOnly() {
    if (!stateLabel) return;
    const mode = workspaceSession.localPreview ? 'workspace preview' : syncState.online ? 'cloud backed' : 'waiting for cloud backup';
    const ws = workspaceDisplayName();
    stateLabel.textContent = `${Core.APP_VERSION} · ${ws} · ${state.attendees.length} guest${state.attendees.length === 1 ? '' : 's'} · ${mode}`;
  }

  async function bootWorkspace() {
    root.innerHTML = '<section class="shell-card kiosk-card"><p class="eyebrow">SignIn Pro by NorthStar</p><h1>Opening workspace…</h1><p>Checking the company workspace.</p></section>';
    workspaceSession = await Workspace.session();
    if (!workspaceSession.authenticated) {
      syncState.booted = true;
      renderLogin(workspaceSession.error || 'Sign in to open your provisioned workspace.');
      return;
    }
    STORE = Workspace.stateKey(workspaceSession.workspace);
    state = loadState();
    applyWorkspaceToState();
    await pullRemoteState();
    syncState.booted = true;
    render();
  }

  function renderLogin(message) {
    const params = new URLSearchParams(location.search);
    const workspaceHint = params.get('workspace') || params.get('client') || '';
    const profile = workspaceHintProfile();
    const workspaceName = profile ? profile.name : 'SignIn Pro Workspace';
    const workspaceImage = profile?.image || './assets/brand/signinpro-northstar-skye-tiger-logo.png';
    const workspaceCta = profile?.cta || 'Open the workspace gate, check in guests, and keep the operator handoff scoped to this company.';
    const activeTab = ui.loginTab === 'about' ? 'about' : 'login';
    root.innerHTML = `
      <section class="workspace-gateway" aria-label="NorthStar SignIn Pro workspace access">
        <div class="gateway-identity-panel">
          <div class="gateway-logo-stage" aria-hidden="true">
            <img class="gateway-primary-logo" src="./assets/brand/signinpro-northstar-skye-tiger-logo.png" alt="">
          </div>
          <div class="gateway-copy">
            <p class="eyebrow">NorthStar SignIn Pro</p>
            <h1>${profile ? `Open ${esc(workspaceName)}.` : 'Open the workspace gate.'}</h1>
            <p>${esc(workspaceCta)}</p>
          </div>
          <div class="gateway-proof-rail" aria-label="NorthStar workspace proof">
            <div><strong>Gate-owned</strong><span>The 0S Gate owns auth and session authority for this mounted app.</span></div>
            <div><strong>Workspace scoped</strong><span>Company data opens in its own lane.</span></div>
            <div><strong>Field proven</strong><span>1,644 Skyes Over London accounts owned through the field stack.</span></div>
          </div>
          <div class="skyes-seal-card">
            <img src="./assets/brand/skyes-over-london-deity-logo.png" alt="Skyes Over London deity logo">
            <div><strong>Backed by Skyes Over London</strong><span>NorthStar is the back-office layer behind this SignIn Pro workspace.</span></div>
          </div>
        </div>

        <div class="workspace-access-panel">
          <div class="access-panel-head">
            <div>
              <p class="eyebrow">Workspace Access</p>
              <h2>${esc(workspaceName)}</h2>
            </div>
            ${profile ? `<a class="workspace-site-link" href="${esc(profile.mainUrl || '#')}" target="${String(profile.mainUrl || '').startsWith('http') ? '_blank' : '_self'}" rel="noreferrer">Client app</a>` : ''}
          </div>
          ${profile ? `<div class="client-lockup gateway-client-lockup">${gatewayClientMedia(profile, workspaceImage)}<div><strong>${esc(profile.name)}</strong><span>Dedicated SignIn Pro workspace</span></div></div>` : ''}
          ${message ? `<div class="notice ${message.toLowerCase().includes('failed') || message.toLowerCase().includes('invalid') ? 'danger' : ''}">${esc(message)}</div>` : ''}
          <div class="login-tabbar" role="tablist" aria-label="SignIn Pro workspace login tabs">
            <button type="button" class="${activeTab === 'login' ? 'active' : ''}" data-login-tab="login" role="tab" aria-selected="${activeTab === 'login'}">Shared 0S Gate</button>
            <button type="button" class="${activeTab === 'about' ? 'active' : ''}" data-login-tab="about" role="tab" aria-selected="${activeTab === 'about'}">About SignIn Pro</button>
          </div>
          <div class="login-panel gateway-login-panel" ${activeTab === 'login' ? '' : 'hidden'}>
            <form id="workspace-login-form" class="form-grid gateway-form" novalidate>
              <label>Workspace Slug <input name="workspaceSlug" maxlength="120" value="${esc(workspaceHint)}" placeholder="company-workspace-slug" readonly></label>
              <button class="primary-btn" type="submit">Open With Shared Gate</button>
            </form>
            <p class="security-note">Workspace access is governed by the shared gate and Legal Skyes <a href="https://skyes-over-london-legal.pages.dev/legal/twilio-sms/" target="_blank" rel="noopener">Twilio SMS Consent and 0S Data Notice</a>, <a href="https://skyes-over-london-legal.pages.dev/legal/terms/" target="_blank" rel="noopener">Terms</a>, and <a href="https://skyes-over-london-legal.pages.dev/legal/privacy/" target="_blank" rel="noopener">Privacy Policy</a>.</p>
            <details class="owner-unlock">
              <summary>0S owner unlock</summary>
              <form id="owner-admin-login-form" class="form-grid owner-unlock-form" novalidate>
                <label>0S / Free99 Admin Code <input name="code" type="password" autocomplete="current-password" maxlength="180" required placeholder="Shared gate admin code"></label>
                <label>Owner Email <input name="email" type="email" autocomplete="email" maxlength="254" placeholder="owner@metraiyux.com"></label>
                <button class="secondary-btn" type="submit">Unlock 0S Owner Session</button>
              </form>
            </details>
          </div>
          <div id="signinpro-company-proof" class="login-panel signinpro-proof-panel gateway-about-panel" ${activeTab === 'about' ? '' : 'hidden'}>
            <div class="proof-metric-grid">
              <div><strong>1,644</strong><span>Skyes Over London accounts owned through the field stack.</span></div>
              <div><strong>Field used</strong><span>Used by Skyes Over London and Account Executives during real outreach.</span></div>
              <div><strong>Workspace scoped</strong><span>Client workspaces stay separated under one SignIn Pro app.</span></div>
              <div><strong>0S mounted</strong><span>Runs as a mounted 0S app under Gate auth, proof lanes, and operator handoff.</span></div>
            </div>
            <div class="skyes-seal-card compact-seal">
              <img src="./assets/brand/skyes-over-london-deity-logo.png" alt="Skyes Over London deity logo">
              <div><strong>Skyes Over London backing</strong><span>The seal is the backing mark. NorthStar stays the workspace login brand.</span></div>
            </div>
          </div>
        </div>
      </section>
    `;
    document.querySelectorAll('[data-login-tab]').forEach((node) => {
      node.addEventListener('click', () => {
        ui.loginTab = node.getAttribute('data-login-tab') || 'login';
        renderLogin(message || '');
      });
    });
    const form = document.getElementById('workspace-login-form');
    if (form) form.addEventListener('submit', handleWorkspaceLogin);
    const ownerForm = document.getElementById('owner-admin-login-form');
    if (ownerForm) ownerForm.addEventListener('submit', handleOwnerAdminLogin);
    renderStatusOnly();
  }

  async function handleWorkspaceLogin(event) {
    event.preventDefault();
    try {
      workspaceSession = await Workspace.session();
      if (!workspaceSession?.authenticated) throw new Error('Shared 0S/SkyGate session required.');
      STORE = Workspace.stateKey(workspaceSession.workspace);
      state = loadState();
      applyWorkspaceToState();
      await pullRemoteState();
      ui.notice = 'Workspace opened.';
      render();
    } catch (error) {
      renderLogin(error.message || 'Login failed.');
    }
  }

  async function handleOwnerAdminLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = Object.fromEntries(new FormData(form).entries());
    input.password = input.code;
    input.free99Code = input.code;
    try {
      workspaceSession = await Workspace.ownerAdminLogin(input);
      STORE = Workspace.stateKey(workspaceSession.workspace);
      state = loadState();
      applyWorkspaceToState();
      syncState.online = true;
      syncState.error = '';
      ui.view = 'admin';
      ui.adminTab = 'security';
      ui.notice = 'Owner session unlocked across 0S. The remote MCP bearer is stored locally for this browser.';
      render();
    } catch (error) {
      renderLogin(error.message || 'Owner unlock failed.');
    }
  }

  function saveState(action, detail) {
    try {
      if (action) state = Core.addAudit(state, action, detail || '');
      applyWorkspaceToState();
      state = Core.sanitizeState(state);
      localStorage.setItem(STORE, JSON.stringify(state));
      ui.storageWarning = '';
      pushRemoteState(action || 'state_save');
      return true;
    } catch (error) {
      ui.storageWarning = 'Browser storage is full or unavailable. Export a backup before adding more guests.';
      console.error('State save failed', error);
      return false;
    }
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString(); } catch (error) { return '—'; }
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function gatewayClientMedia(profile, fallbackImage) {
    const video = profile && profile.video ? String(profile.video) : '';
    if (video) {
      return `<video class="gateway-client-preview-video" autoplay muted loop playsinline controls preload="metadata" poster="${esc(fallbackImage)}"><source src="${esc(video)}" type="video/mp4"></video>`;
    }
    return `<img src="${esc(fallbackImage)}" alt="">`;
  }

  function downloadText(filename, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function setView(view) {
    ui.view = view;
    ui.errors = {};
    ui.notice = '';
    if (view === 'admin') {
      if (location.hash !== '#admin') history.pushState(null, '', '#admin');
    } else if (location.hash) {
      history.pushState(null, '', location.pathname + location.search);
    }
    render();
  }

  function playSuccessSound() {
    if (!state.settings.enableSound) return;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      const ctx = new AudioCtor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(987.77, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
      osc.onended = () => ctx.close().catch(() => {});
    } catch (error) {
      console.warn('Sound unavailable', error);
    }
  }

  function submitCheckIn(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = Object.fromEntries(new FormData(form).entries());
    const result = Core.createAttendee(input, state.attendees, state.settings);
    if (!result.ok) {
      ui.errors = result.errors;
      ui.notice = '';
      render();
      return;
    }
    state.attendees.unshift(result.attendee);
    saveState('check_in', `${result.attendee.name} checked in with ${result.attendee.eventId}.`);
    ui.successId = result.attendee.id;
    ui.view = 'success';
    ui.errors = {};
    ui.notice = 'Check-in saved on this device.';
    playSuccessSound();
    render();
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      ui.view = 'checkin';
      ui.successId = '';
      ui.notice = '';
      render();
    }, 6500);
  }

  function filteredAttendees() {
    const q = Core.safeText(ui.search, 120).toLowerCase();
    if (!q) return state.attendees;
    return state.attendees.filter((a) => [a.name, a.nickname, a.email, a.company, a.role, a.eventId].some((field) => String(field || '').toLowerCase().includes(q)));
  }

  function todayCount() {
    const today = new Date().toDateString();
    return state.attendees.filter((a) => new Date(a.timestamp).toDateString() === today).length;
  }

  function storageUsageText() {
    try {
      const bytes = new Blob([JSON.stringify(state)]).size;
      return `${(bytes / 1024).toFixed(1)} KB local data`;
    } catch (error) {
      return 'Storage size unavailable';
    }
  }

  function updateSetting(key, value) {
    state.settings = Core.sanitizeSettings(Object.assign({}, state.settings, { [key]: value }));
    saveState('settings_update', `${key} updated.`);
    render();
  }

  function handleLogoUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type)) {
      ui.notice = 'Logo upload rejected: image files only.';
      render();
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      ui.notice = 'Logo upload rejected: max size is 2 MB.';
      render();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const max = 512;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: true });
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        updateSetting('logo', canvas.toDataURL('image/png'));
      };
      image.onerror = () => {
        ui.notice = 'Logo upload failed: browser could not read the image.';
        render();
      };
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  function exportCsv() {
    const date = new Date().toISOString().slice(0, 10);
    downloadText(`signinpro-guests-${date}.csv`, 'text/csv;charset=utf-8', Core.attendeesToCsv(state.attendees, state.settings));
  }

  function exportJson() {
    const date = new Date().toISOString().slice(0, 10);
    downloadText(`signinpro-backup-${date}.json`, 'application/json;charset=utf-8', JSON.stringify(Core.buildBackup(state), null, 2));
  }

  function importJson(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = Core.parseBackup(reader.result);
      if (!parsed.ok) {
        ui.notice = parsed.error;
        render();
        return;
      }
      state = Core.addAudit(parsed.state, 'backup_import', `Imported ${parsed.state.attendees.length} guests from JSON backup.`);
      saveState();
      ui.notice = `Imported ${state.attendees.length} guests.`;
      ui.adminTab = 'dashboard';
      render();
    };
    reader.readAsText(file);
  }

  function deleteAttendee(id) {
    const guest = state.attendees.find((a) => a.id === id);
    if (!guest) return;
    if (!confirm(`Delete ${guest.name} from this device?`)) return;
    state.attendees = state.attendees.filter((a) => a.id !== id);
    ui.selectedId = '';
    saveState('guest_delete', `${guest.name} removed.`);
    render();
  }

  function clearGuests() {
    if (state.attendees.length === 0) return;
    const phrase = prompt('Type CLEAR to delete all local guests on this device. Export a backup first if needed.');
    if (phrase !== 'CLEAR') return;
    const count = state.attendees.length;
    state.attendees = [];
    ui.selectedId = '';
    saveState('guest_clear', `${count} guests cleared from local device.`);
    render();
  }

  function emailBadge(attendee) {
    const subject = encodeURIComponent(`Badge: ${state.settings.eventName}`);
    const body = encodeURIComponent(`Here is your badge for ${state.settings.eventName}.\n\nName: ${attendee.badgeName}\n${state.settings.idLabel}: ${attendee.eventId}\nChecked in: ${formatDate(attendee.timestamp)}\n\nPlease keep this code available at entry.`);
    location.href = `mailto:${encodeURIComponent(attendee.email)}?subject=${subject}&body=${body}`;
  }


  function brandHero(compact) {
    return `
      <section class="${compact ? 'brand-hero compact' : 'brand-hero'}" aria-label="SignIn Pro by NorthStar brand">
        <div class="brand-logo-row">
          <img class="brand-logo-pulse" src="./assets/brand/signinpro-northstar-skye-tiger-logo.png" alt="SignIn Pro by NorthStar tiger portal logo">
          <img class="skyes-deity-mark" src="./assets/brand/skyes-over-london-deity-logo.png" alt="Backed by Skyes Over London">
        </div>
        <div class="brand-backing">
          <span>${esc(BRAND_LOCKUP.manager)}</span>
          <span>${esc(BRAND_LOCKUP.family)} • ${esc(BRAND_LOCKUP.backing)}</span>
          <span>${esc(BRAND_LOCKUP.fieldRecord)}</span>
        </div>
      </section>
    `;
  }

  function renderBadge(attendee, compact) {
    if (!attendee) return '';
    return `
      <article class="badge ${compact ? 'badge-compact' : ''}" aria-label="Badge for ${esc(attendee.badgeName)}">
        <div class="badge-top">
          <img src="${esc(state.settings.logo)}" alt="" class="badge-logo" loading="lazy">
          <span>${esc(state.settings.eventName)}</span>
        </div>
        <div class="badge-body">
          <div class="badge-punch" aria-hidden="true"></div>
          <p class="eyebrow">Authorized Guest</p>
          <h2>${esc(attendee.badgeName)}</h2>
          ${attendee.company ? `<p class="badge-company">${esc(attendee.company)}</p>` : ''}
          ${attendee.role ? `<p class="badge-role">${esc(attendee.role)}</p>` : ''}
          <div class="code-panel">
            <span>${esc(state.settings.idLabel)}</span>
            <strong>${esc(attendee.eventId)}</strong>
          </div>
          <p class="badge-time">${esc(formatDate(attendee.timestamp))}</p>
        </div>
      </article>
    `;
  }

  function renderCheckIn() {
    return `
      <section class="shell-card kiosk-card">
        <div class="brand-header">
          <img src="${esc(state.settings.logo)}" alt="${esc(state.settings.eventName)} logo" class="event-logo" loading="lazy">
          <div>
            <p class="eyebrow">Guest Check-In</p>
            <h1>${esc(state.settings.eventName)}</h1>
          </div>
        </div>
        <div class="skyes-backed-strip">
          <img src="./assets/brand/skyes-over-london-deity-logo.png" alt="Skyes Over London deity logo">
          <span>NorthStar SignIn Pro is backed by Skyes Over London.</span>
        </div>
        ${ui.notice ? `<div class="notice">${esc(ui.notice)}</div>` : ''}
        ${ui.storageWarning ? `<div class="notice danger">${esc(ui.storageWarning)}</div>` : ''}
        <form id="checkin-form" class="form-grid" novalidate>
          <label>Full Name <input name="name" autocomplete="name" maxlength="120" required autofocus placeholder="Jordan Carter"></label>
          ${ui.errors.name ? `<p class="field-error">${esc(ui.errors.name)}</p>` : ''}
          <label>Preferred Badge Name <input name="nickname" maxlength="80" placeholder="Jordan"></label>
          <label>Email <input name="email" autocomplete="email" inputmode="email" maxlength="254" required placeholder="name@company.com"></label>
          ${ui.errors.email ? `<p class="field-error">${esc(ui.errors.email)}</p>` : ''}
          <label>Company <input name="company" maxlength="120" placeholder="Company or organization"></label>
          <label>Role / Pass Type <input name="role" maxlength="120" placeholder="Guest, VIP, Staff, Vendor"></label>
          <label>Notes <textarea name="notes" maxlength="500" rows="3" placeholder="Optional access or registration note"></textarea></label>
          <button class="primary-btn" type="submit">Complete Check-In</button>
          <p class="security-note">By checking in, guests can review Legal Skyes <a href="https://skyes-over-london-legal.pages.dev/legal/twilio-sms/" target="_blank" rel="noopener">Twilio SMS Consent and 0S Data Notice</a>, <a href="https://skyes-over-london-legal.pages.dev/legal/terms/" target="_blank" rel="noopener">Terms</a>, and <a href="https://skyes-over-london-legal.pages.dev/legal/privacy/" target="_blank" rel="noopener">Privacy Policy</a>.</p>
        </form>
        <button class="quiet-btn" data-action="admin">Operator Panel · ${esc(workspaceDisplayName())}</button>
      </section>
    `;
  }

  function renderSuccess() {
    const attendee = state.attendees.find((a) => a.id === ui.successId) || state.attendees[0];
    return `
      <section class="success-layout">
        <div class="shell-card success-copy">
          <div class="skyes-backed-strip">
            <img src="./assets/brand/skyes-over-london-deity-logo.png" alt="Skyes Over London deity logo">
            <span>NorthStar SignIn Pro is backed by Skyes Over London.</span>
          </div>
          <p class="eyebrow">Saved</p>
          <h1>Check-in complete.</h1>
          <p>The badge code below is stored locally on this device and included in exports.</p>
          <div class="success-actions">
            <button class="primary-btn" data-action="reset-form">Next Guest</button>
            <button class="secondary-btn" data-action="print-badge" data-id="${esc(attendee && attendee.id)}">Print Badge</button>
          </div>
        </div>
        ${renderBadge(attendee, false)}
      </section>
    `;
  }

  function renderDashboard() {
    const latest = state.attendees.slice(0, 5);
    return `
      <div class="stats-grid">
        <div class="stat"><span>Total Guests</span><strong>${state.attendees.length}</strong></div>
        <div class="stat"><span>Today</span><strong>${todayCount()}</strong></div>
        <div class="stat"><span>Storage</span><strong>${esc(storageUsageText())}</strong></div>
      </div>
      <div class="panel-card">
        <div class="panel-head"><h3>Recent Check-Ins</h3><button class="secondary-btn small" data-tab="guests">View All</button></div>
        ${latest.length ? `<div class="mini-list">${latest.map((a) => `<button data-select="${esc(a.id)}"><strong>${esc(a.name)}</strong><span>${esc(a.eventId)} · ${esc(formatDate(a.timestamp))}</span></button>`).join('')}</div>` : '<p class="empty">No guests checked in yet.</p>'}
      </div>
      <div class="panel-card proof-card">
        <h3>Workspace Privacy Mode</h3>
        <p>Your login opens one provisioned company workspace. Guest records stay tied to that workspace and can be backed up through NorthStar Office & Accounting when connected.</p>
      </div>
    `;
  }

  function renderGuests() {
    const list = filteredAttendees();
    const selected = state.attendees.find((a) => a.id === ui.selectedId);
    if (selected) {
      return `
        <div class="detail-grid">
          <div>
            <button class="quiet-btn left" data-action="back-guests">← Back to guests</button>
            ${renderBadge(selected, true)}
          </div>
          <div class="panel-card detail-card">
            <p class="eyebrow">Guest Record</p>
            <h3>${esc(selected.name)}</h3>
            <dl>
              <dt>Email</dt><dd>${esc(selected.email)}</dd>
              <dt>Company</dt><dd>${esc(selected.company || '—')}</dd>
              <dt>Role</dt><dd>${esc(selected.role || '—')}</dd>
              <dt>${esc(state.settings.idLabel)}</dt><dd>${esc(selected.eventId)}</dd>
              <dt>Checked In</dt><dd>${esc(formatDate(selected.timestamp))}</dd>
              <dt>Notes</dt><dd>${esc(selected.notes || '—')}</dd>
            </dl>
            <div class="button-row">
              <button class="primary-btn" data-action="email-badge" data-id="${esc(selected.id)}">Email Badge</button>
              <button class="secondary-btn" data-action="print-badge" data-id="${esc(selected.id)}">Print</button>
              <button class="danger-btn" data-action="delete-guest" data-id="${esc(selected.id)}">Delete</button>
            </div>
          </div>
        </div>
      `;
    }
    return `
      <div class="toolbar">
        <input id="guest-search" value="${esc(ui.search)}" placeholder="Search name, email, company, role, or ID">
        <button class="secondary-btn" data-action="export-csv">Export CSV</button>
        <button class="secondary-btn" data-action="export-json">Export JSON</button>
      </div>
      ${list.length ? `<div class="guest-table" role="table" aria-label="Guest list">
        ${list.map((a) => `<button class="guest-row" data-select="${esc(a.id)}" role="row"><span><strong>${esc(a.name)}</strong><em>${esc(a.email)}</em></span><span>${esc(a.eventId)}</span><span>${esc(formatDate(a.timestamp))}</span></button>`).join('')}
      </div>` : '<p class="empty">No matching guests.</p>'}
    `;
  }

  function renderSettings() {
    return `
      <div class="settings-grid">
        <section class="panel-card">
          <h3>Branding</h3>
          <label>Event Name <input id="setting-event" maxlength="90" value="${esc(state.settings.eventName)}"></label>
          <label>ID Label <input id="setting-label" maxlength="40" value="${esc(state.settings.idLabel)}"></label>
          <label>Logo <input id="logo-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>
        </section>
        <section class="panel-card">
          <h3>Kiosk Rules</h3>
          <label class="toggle-row"><span>Success Sound</span><input id="setting-sound" type="checkbox" ${state.settings.enableSound ? 'checked' : ''}></label>
          <label class="toggle-row"><span>Allow Duplicate Emails</span><input id="setting-dupes" type="checkbox" ${state.settings.allowDuplicateEmails ? 'checked' : ''}></label>
          <label class="toggle-row"><span>NorthStar Office Backup</span><input id="setting-sync" type="checkbox" ${state.settings.syncEnabled !== false ? 'checked' : ''}></label>
          <label>Retention Note <textarea id="setting-retention" rows="4" maxlength="220">${esc(state.settings.retentionNote)}</textarea></label>
        </section>
      </div>
    `;
  }

  function renderBackup() {
    return `
      <div class="settings-grid">
        <section class="panel-card">
          <h3>Exports</h3>
          <p>CSV is for spreadsheets. JSON is the complete restorable backup.</p>
          <div class="button-row">
            <button class="primary-btn" data-action="export-csv">Export CSV</button>
            <button class="secondary-btn" data-action="export-json">Export JSON Backup</button>
          </div>
        </section>
        <section class="panel-card">
          <h3>Import / Recovery</h3>
          <p>Imports replace the current local state after validating the backup schema.</p>
          <label class="file-box">Import JSON Backup <input id="backup-import" type="file" accept="application/json,.json"></label>
        </section>
        <section class="panel-card danger-zone">
          <h3>Danger Zone</h3>
          <p>Clears local guest data from this browser only. This does not affect upstream systems.</p>
          <button class="danger-btn" data-action="clear-guests">Clear All Guests</button>
        </section>
      </div>
    `;
  }

  function renderAudit() {
    return `
      <div class="panel-card">
        <h3>Audit Log</h3>
        ${state.audit.length ? `<div class="audit-list">${state.audit.map((a) => `<p><strong>${esc(a.action)}</strong><span>${esc(formatDate(a.at))}</span><em>${esc(a.detail)}</em></p>`).join('')}</div>` : '<p class="empty">No audit entries yet.</p>'}
      </div>
    `;
  }


  function renderSecurity() {
    const perms = workspaceSession.user && Array.isArray(workspaceSession.user.permissions) ? workspaceSession.user.permissions : [];
    const ownerToken = storedOwnerToken();
    const tokenPreview = ownerToken ? `${ownerToken.slice(0, 14)}...${ownerToken.slice(-10)}` : '';
    return `
      <section class="panel-grid">
        <article class="panel-card wide">
          <h2>Workspace Guard</h2>
          <p>This workspace is limited to the signed-in company account and its assigned role. Guest records stay separated by workspace.</p>
          <div class="detail-grid">
            <div><span>Workspace</span><strong>${esc(workspaceDisplayName())}</strong></div>
            <div><span>Role</span><strong>${esc(roleLabel())}</strong></div>
            <div><span>Permissions</span><strong>${esc(perms.join(', ') || 'read-only')}</strong></div>
            <div><span>Workspace Status</span><strong>${esc(syncState.online ? 'Cloud backup active' : 'Local device ready')}</strong></div>
          </div>
        </article>
        <article class="panel-card">
          <h2>Role rules</h2>
          <p><strong>Owner/Admin:</strong> settings, users, sync, audit, backups.</p>
          <p><strong>Operator:</strong> check-in, sync, audit, backups.</p>
          <p><strong>Viewer:</strong> read-only audit/report access.</p>
        </article>
        ${ownerToken ? `<article class="panel-card wide">
          <h2>Owner MCP Bearer</h2>
          <p>This browser has a signed owner bearer for the gate-owned QuantumSkyes MCP. Use it as <code>QUANTUMSKYES_MCP_TOKEN</code> in AI clients and repo smoke tests.</p>
          <p><code>${esc(tokenPreview)}</code></p>
          <div class="button-row">
            <button class="secondary-btn" data-action="copy-owner-token">Copy Bearer</button>
            <button class="secondary-btn" data-action="open-owner-login">Owner Login Page</button>
            <button class="secondary-btn" data-action="open-mcp-guide">MCP Guide</button>
          </div>
        </article>` : ''}
      </section>`;
  }

  function storedOwnerToken() {
    try { return localStorage.getItem('quantumskyes_mcp_owner_token') || ''; } catch (error) { return ''; }
  }


  function provisionTemplateJson() {
    return JSON.stringify([{
      name: 'Future Company Name',
      slug: 'future-company-name',
      ownerEmail: 'owner@future-company.com',
      plan: 'provided-infrastructure',
      role: 'owner',
      metadata: {
        source: 'northstar-admin-provisioner',
        appSettings: { syncEnabled: true },
        securitySettings: { providedInfrastructure: true, tenantScoped: true }
      }
    }], null, 2);
  }

  function renderProvision() {
    const canProvision = can('provision') || workspaceSession.localPreview;
    const rows = ui.provisionResults && ui.provisionResults.length ? ui.provisionResults.map((item) => `
      <tr><td>${esc(item.slug || '')}</td><td>${esc(item.name || '')}</td><td>${esc(item.email || '')}</td><td>${esc(item.invite || '')}</td><td>${esc(item.ok === false ? item.error || 'failed' : 'shared-gate invite')}</td></tr>
    `).join('') : '<tr><td colspan="5">No provisioning run in this browser session.</td></tr>';
    return `
      <section class="panel-grid">
        <article class="panel-card wide">
          <h2>SignIn Pro Workspace Provisioner</h2>
          <p>Use this Gate-owned mounted app path to add or refresh company workspaces for NorthStar Office & Accounting. It creates the workspace, the first owner login, starting settings, and the audit record without replacing the 0S Gate.</p>
          ${!canProvision ? '<div class="notice danger">Your current role cannot provision workspaces.</div>' : ''}
          ${ui.provisionNotice ? `<div class="notice">${esc(ui.provisionNotice)}</div>` : ''}
        </article>
        <article class="panel-card">
          <h3>Single Workspace</h3>
          <form id="operator-provision-form" class="form-grid" novalidate>
            <label>Company / Workspace Name <input name="name" required maxlength="180" placeholder="Company Name"></label>
            <label>Workspace Slug <input name="slug" maxlength="120" placeholder="company-name"></label>
            <label>Owner Email <input name="ownerEmail" type="email" required maxlength="254" placeholder="owner@company.com"></label>
            <label>Role <select name="role"><option value="owner">owner</option><option value="admin">admin</option><option value="operator">operator</option><option value="viewer">viewer</option></select></label>
            <button class="primary-btn" type="submit" ${!canProvision ? 'disabled' : ''}>Provision Workspace</button>
          </form>
        </article>
        <article class="panel-card">
          <h3>Bulk Provision</h3>
          <form id="operator-bulk-provision-form" class="form-grid" novalidate>
            <label>Workspace JSON Array <textarea name="workspaces" rows="11" spellcheck="false">${esc(provisionTemplateJson())}</textarea></label>
            <button class="primary-btn" type="submit" ${!canProvision ? 'disabled' : ''}>Provision JSON Batch</button>
          </form>
        </article>
        <article class="panel-card wide">
          <h3>Provisioning Receipts</h3>
          <p>Provisioning now creates a shared-gate invite handoff. No SignIn Pro workspace password is issued from the mounted 0S app.</p>
          <div class="table-scroll"><table class="provision-table"><thead><tr><th>Slug</th><th>Name</th><th>Owner/User Email</th><th>Invite</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
        </article>
      </section>`;
  }

  async function handleProvisionSubmit(event) {
    event.preventDefault();
    if (!can('provision') && !workspaceSession.localPreview) { ui.provisionNotice = 'Current role cannot provision workspaces.'; render(); return; }
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = { name: data.name, slug: data.slug, ownerEmail: data.ownerEmail, role: data.role || 'owner', plan: 'provided-infrastructure', metadata: { source: 'northstar-admin-menu', appSettings: { syncEnabled: true }, securitySettings: { providedInfrastructure: true, tenantScoped: true } } };
    try {
      const result = await Workspace.operatorProvision(payload);
      ui.provisionResults = [{ ok: true, slug: result.workspace.slug, name: result.workspace.name, email: result.user.email, invite: result.inviteHandoff?.gate || '/admin/login.html' }].concat(ui.provisionResults || []);
      ui.provisionNotice = `Provisioned ${result.workspace.slug}. Shared-gate invite handoff recorded.`;
    } catch (error) {
      ui.provisionNotice = error.message || 'Provisioning failed.';
    }
    render();
  }

  async function handleBulkProvisionSubmit(event) {
    event.preventDefault();
    if (!can('provision') && !workspaceSession.localPreview) { ui.provisionNotice = 'Current role cannot provision workspaces.'; render(); return; }
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    let workspaces = [];
    try { workspaces = JSON.parse(data.workspaces || '[]'); } catch (error) { ui.provisionNotice = 'Bulk JSON is invalid.'; render(); return; }
    if (!Array.isArray(workspaces) || !workspaces.length) { ui.provisionNotice = 'Bulk JSON must be a non-empty array.'; render(); return; }
    const results = [];
    for (const workspace of workspaces) {
      try {
        const result = await Workspace.operatorProvision(workspace);
        results.push({ ok: true, slug: result.workspace.slug, name: result.workspace.name, email: result.user.email, invite: result.inviteHandoff?.gate || '/admin/login.html' });
      } catch (error) {
        results.push({ ok: false, slug: workspace.slug || workspace.name || 'unknown', name: workspace.name || '', email: workspace.ownerEmail || workspace.email || '', error: error.message || 'failed' });
      }
    }
    ui.provisionResults = results.concat(ui.provisionResults || []);
    ui.provisionNotice = `Provisioning batch finished: ${results.filter((r) => r.ok !== false).length}/${results.length} succeeded.`;
    render();
  }

  function renderAdmin() {
    const tabs = [
      ['dashboard', 'Overview'],
      ['guests', 'Guests'],
      ['settings', 'Settings'],
      ['backup', 'Backup'],
      ['audit', 'Audit'],
      ['security', 'Security']
    ];
    if (can('provision') || workspaceSession.localPreview) tabs.push(['provision', 'Provision']);
    const body = ui.adminTab === 'dashboard' ? renderDashboard()
      : ui.adminTab === 'guests' ? renderGuests()
      : ui.adminTab === 'settings' ? renderSettings()
      : ui.adminTab === 'backup' ? renderBackup()
      : ui.adminTab === 'audit' ? renderAudit()
      : ui.adminTab === 'provision' ? renderProvision() : renderSecurity();
    return `
      <section class="admin-shell">
        <header class="admin-head">
          <div>
            <p class="eyebrow">Operator Panel</p>
            <h1>${esc(workspaceDisplayName())}</h1>
            <p class="workspace-line">${esc(workspaceSession.user && workspaceSession.user.email || 'workspace user')} · ${esc(roleLabel())} · ${esc(syncState.online ? 'cloud backed' : workspaceSession.localPreview ? 'workspace preview' : 'waiting for cloud backup')}</p>
            <div class="skyes-backed-strip inline">
              <img src="./assets/brand/skyes-over-london-deity-logo.png" alt="Skyes Over London deity logo">
              <span>Backed by Skyes Over London</span>
            </div>
          </div>
          <div class="button-row"><button class="secondary-btn" data-action="sync-now">Sync Now</button><button class="secondary-btn" data-action="kiosk">Return to Kiosk</button><button class="danger-btn" data-action="logout">Logout</button></div>
        </header>
        ${ui.notice ? `<div class="notice">${esc(ui.notice)}</div>` : ''}
        ${ui.storageWarning ? `<div class="notice danger">${esc(ui.storageWarning)}</div>` : ''}
        <nav class="tabs">${tabs.map(([id, label]) => `<button class="${ui.adminTab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}</nav>
        <main class="admin-body">${body}</main>
      </section>
    `;
  }

  function render() {
    const viewHtml = ui.view === 'success' ? renderSuccess() : ui.view === 'admin' ? renderAdmin() : renderCheckIn();
    root.innerHTML = viewHtml;
    renderStatusOnly();
    bindEvents();
  }

  function bindEvents() {
    const form = document.getElementById('checkin-form');
    if (form) form.addEventListener('submit', submitCheckIn);

    document.querySelectorAll('[data-action]').forEach((node) => {
      node.addEventListener('click', () => {
        const action = node.getAttribute('data-action');
        const id = node.getAttribute('data-id');
        const attendee = state.attendees.find((a) => a.id === id);
        if (action === 'admin') setView('admin');
        if (action === 'kiosk') setView('checkin');
        if (action === 'reset-form') setView('checkin');
        if (action === 'export-csv') exportCsv();
        if (action === 'export-json') exportJson();
        if (action === 'clear-guests') { if (!can('write')) { ui.notice = 'Your role is read-only for clearing guests.'; render(); } else clearGuests(); }
        if (action === 'back-guests') { ui.selectedId = ''; render(); }
        if (action === 'email-badge' && attendee) emailBadge(attendee);
        if (action === 'delete-guest' && attendee) { if (!can('write')) { ui.notice = 'Your role is read-only for guest changes.'; render(); } else deleteAttendee(attendee.id); }
        if (action === 'print-badge' && attendee) window.print();
        if (action === 'sync-now') { if (!can('write')) { ui.notice = 'Your role cannot write remote sync changes.'; render(); } else pushRemoteState('manual_sync', true).then(() => render()); }
        if (action === 'logout') { Workspace.logout().then(() => { workspaceSession = { authenticated: false }; renderLogin('Logged out.'); }); }
        if (action === 'copy-owner-token') {
          const token = storedOwnerToken();
          if (token && navigator.clipboard) {
            navigator.clipboard.writeText(token)
              .then(() => { ui.notice = 'Owner MCP bearer copied.'; render(); })
              .catch(() => { ui.notice = 'Clipboard blocked. Open the owner login page to copy the bearer.'; render(); });
          }
        }
        if (action === 'open-owner-login') location.href = '/admin/login.html';
        if (action === 'open-mcp-guide') location.href = 'https://skye-design-mcp.pages.dev/use-mcp.html';
      });
    });

    document.querySelectorAll('[data-tab]').forEach((node) => {
      node.addEventListener('click', () => { ui.adminTab = node.getAttribute('data-tab'); ui.selectedId = ''; render(); });
    });

    document.querySelectorAll('[data-select]').forEach((node) => {
      node.addEventListener('click', () => { ui.selectedId = node.getAttribute('data-select'); ui.adminTab = 'guests'; render(); });
    });

    const search = document.getElementById('guest-search');
    if (search) search.addEventListener('input', (event) => { ui.search = event.target.value; render(); });

    const eventName = document.getElementById('setting-event');
    if (eventName) eventName.addEventListener('change', (event) => updateSetting('eventName', event.target.value));
    const label = document.getElementById('setting-label');
    if (label) label.addEventListener('change', (event) => updateSetting('idLabel', event.target.value));
    const retention = document.getElementById('setting-retention');
    if (retention) retention.addEventListener('change', (event) => updateSetting('retentionNote', event.target.value));
    const sound = document.getElementById('setting-sound');
    if (sound) sound.addEventListener('change', (event) => updateSetting('enableSound', event.target.checked));
    const dupes = document.getElementById('setting-dupes');
    if (dupes) dupes.addEventListener('change', (event) => updateSetting('allowDuplicateEmails', event.target.checked));
    const syncEnabled = document.getElementById('setting-sync');
    if (syncEnabled) syncEnabled.addEventListener('change', (event) => updateSetting('syncEnabled', event.target.checked));
    const logo = document.getElementById('logo-upload');
    if (logo) logo.addEventListener('change', handleLogoUpload);
    const backup = document.getElementById('backup-import');
    if (backup) backup.addEventListener('change', importJson);
    const provisionForm = document.getElementById('operator-provision-form');
    if (provisionForm) provisionForm.addEventListener('submit', handleProvisionSubmit);
    const bulkProvisionForm = document.getElementById('operator-bulk-provision-form');
    if (bulkProvisionForm) bulkProvisionForm.addEventListener('submit', handleBulkProvisionSubmit);
  }

  window.addEventListener('hashchange', () => {
    ui.view = location.hash === '#admin' ? 'admin' : 'checkin';
    render();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && workspaceSession.authenticated) { state = loadState(); pullRemoteState().then(() => render()); }
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  setupIntro();
  bootWorkspace();
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
