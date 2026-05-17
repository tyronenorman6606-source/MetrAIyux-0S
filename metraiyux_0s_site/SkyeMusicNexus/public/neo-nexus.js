(function bootSkyeMusicNexusNeoFront() {
  const state = {
    mode: document.body.dataset.mode || 'artist',
    artists: [],
    releases: [],
    payouts: [],
    workflows: [],
    analytics: null,
    lastArtistId: sessionStorage.getItem('skye-music-nexus:lastArtistId') || '',
    lastReleaseId: sessionStorage.getItem('skye-music-nexus:lastReleaseId') || '',
  };

  const lensCopy = {
    distribution: {
      micro: 'Distribution Spine',
      title: 'Release objects need a launch route, not a table row.',
      text: 'This lane frames each release as a live capsule with targets, review state, stream telemetry, and operations checkpoints.',
    },
    royalty: {
      micro: 'Royalty River',
      title: 'Money movement should feel visible before it becomes finance work.',
      text: 'Credits, payout requests, and pending movement are rendered as a river of proof so the operator can see value forming in real time.',
    },
    proof: {
      micro: 'Proof Chain',
      title: 'No fake completion language. The boundary is part of the product.',
      text: 'The app shows what the local smoke proves and what still requires a live provider: identity handoff, DSP ingestion, and settlement integrations.',
    },
    ops: {
      micro: 'Ops Sequencer',
      title: 'Operations is a rhythm grid, not a buried admin panel.',
      text: 'Queue release handoffs, assign owners, update checkpoints, and expose the runway state as a kinetic command surface.',
    },
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const fmtNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));
  const fmtMoney = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
  const apiBase = '/.netlify/functions/';
  const staticPreview = window.SKYE_MUSIC_NEXUS_STATIC_PREVIEW === true || window.location.pathname.includes('/SkyeMusicNexus/public/');
  const auth = !staticPreview && window.createSkyGateAuth ? window.createSkyGateAuth({ storageKey: 'skye_music_nexus_session' }) : null;

  function toast(message, tone) {
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.dataset.tone = tone || 'info';
    node.style.display = 'block';
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.style.display = 'none'; }, 4200);
  }

  function setLoading(form, loading) {
    if (!form) return;
    form.classList.toggle('is-loading', Boolean(loading));
  }

  function updateSessionChip(info) {
    const chip = $('#sessionChip');
    if (!chip) return;
    if (staticPreview) {
      chip.textContent = '0S static preview';
      chip.className = 'chip chip-ready';
      return;
    }
    if (auth && auth.hasToken()) {
      const session = info && info.activeSession;
      chip.textContent = session && session.email ? `SkyGate: ${session.role || 'session'} · ${session.email}` : 'SkyGate session active';
      chip.className = 'chip chip-ready';
    } else {
      chip.textContent = 'SkyGate required';
      chip.className = 'chip chip-hot';
    }
  }

  async function readJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Request failed with ${response.status}`);
    }
    return data;
  }

  async function callFunction(name, options = {}) {
    if (staticPreview) return staticFunctionResponse(name, options);
    const url = new URL(apiBase + name, window.location.origin);
    Object.entries(options.query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') url.searchParams.set(key, value);
    });
    const init = {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
    };
    if (options.body) init.body = JSON.stringify(options.body);
    const needsAuth = options.auth !== false;
    const response = needsAuth && auth ? await auth.fetch(url.toString(), init) : await fetch(url.toString(), init);
    return readJson(response);
  }

  async function staticFunctionResponse(name, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const action = (options.query && options.query.action) || (options.body && options.body.action) || '';
    if (method !== 'GET') {
      throw new Error('Open the Netlify app runtime to write SkyeMusicNexus records.');
    }
    if (name === 'music-artists') return { ok: true, artists: [] };
    if (name === 'music-releases' && action === 'operations-board') return { ok: true, workflows: [] };
    if (name === 'music-releases') return { ok: true, releases: [] };
    if (name === 'music-payments') return { ok: true, payouts: [] };
    if (name === 'music-analytics') {
      return { ok: true, totalArtists: 0, activeArtists: 0, totalReleases: 0, liveReleases: 0, totalStreams: 0, pendingPayouts: 0 };
    }
    return { ok: true };
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function parseCsv(value) {
    return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  }

  function parseTracks(value) {
    const rows = String(value || '').split('\n').map((line) => line.trim()).filter(Boolean);
    if (!rows.length) return [{ title: 'Untitled Signal', duration: 180 }];
    return rows.map((row) => {
      const [title, duration] = row.split('|').map((part) => part.trim());
      return { title: title || 'Untitled Signal', duration: Number(duration || 180) || 180 };
    });
  }

  function renderResult(target, title, fields) {
    const node = $(target);
    if (!node) return;
    const rows = Object.entries(fields || {}).map(([key, value]) => `<span class="pill">${escapeHtml(key)}: ${escapeHtml(value)}</span>`).join('');
    node.innerHTML = `<strong>${escapeHtml(title)}</strong><div class="record-meta" style="margin-top:10px">${rows}</div>`;
  }

  function fillLastIds() {
    $$('input[name="artistId"]').forEach((input) => {
      if (!input.value && state.lastArtistId) input.value = state.lastArtistId;
    });
    $$('input[name="id"], input[name="releaseId"]').forEach((input) => {
      if (!input.value && state.lastReleaseId) input.value = state.lastReleaseId;
    });
  }

  function setMeters() {
    const totalStreams = state.analytics ? Number(state.analytics.totalStreams || 0) : state.releases.reduce((sum, item) => sum + Number(item.analytics && item.analytics.streams || 0), 0);
    const live = state.analytics ? Number(state.analytics.liveReleases || 0) : state.releases.filter((item) => item.status === 'live').length;
    const pendingPayouts = state.analytics ? Number(state.analytics.pendingPayouts || 0) : state.payouts.filter((item) => item.status === 'pending').length;
    const values = {
      meterArtists: state.analytics ? state.analytics.totalArtists : state.artists.length,
      meterReleases: state.analytics ? state.analytics.totalReleases : state.releases.length,
      meterStreams: fmtNumber(totalStreams),
      meterPayouts: pendingPayouts,
      meterLive: live,
    };
    Object.entries(values).forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value == null ? '—' : value;
    });
  }

  function recordCard(type, title, text, pills) {
    return `<article class="record-card">
      <header><h4>${escapeHtml(title)}</h4><span class="pill ${type === 'release' ? 'pink' : type === 'payout' ? 'gold' : type === 'workflow' ? 'lime' : ''}">${escapeHtml(type)}</span></header>
      <p>${escapeHtml(text)}</p>
      <div class="record-meta">${(pills || []).map((pill) => `<span class="pill">${escapeHtml(pill)}</span>`).join('')}</div>
    </article>`;
  }

  function renderRecords() {
    const list = $('#constellationList');
    if (!list) return;
    const cards = [];
    state.artists.slice(0, 6).forEach((artist) => {
      cards.push(recordCard('artist', artist.name || 'Unnamed Artist', artist.email || artist.id, [artist.status || 'unknown', artist.id, fmtMoney(artist.balance || 0)]));
    });
    state.releases.slice(0, 8).forEach((release) => {
      const streams = release.analytics && release.analytics.streams ? fmtNumber(release.analytics.streams) : '0';
      cards.push(recordCard('release', release.title || 'Untitled Release', `Artist ${release.artistId || 'unknown'} · ${release.type || 'release'}`, [release.status || 'draft', release.id, `${streams} streams`]));
    });
    state.workflows.slice(0, 6).forEach((workflow) => {
      cards.push(recordCard('workflow', workflow.checkpoint || 'Workflow', workflow.notes || `Release ${workflow.releaseId}`, [workflow.status || 'queued', workflow.owner || 'unassigned', workflow.releaseId || 'no release']));
    });
    state.payouts.slice(0, 6).forEach((payout) => {
      cards.push(recordCard('payout', `${fmtMoney(payout.amount)} payout`, `Artist ${payout.artistId || 'unknown'}`, [payout.status || 'pending', payout.payoutMethod || 'method', payout.id || 'no id']));
    });
    list.innerHTML = cards.length ? cards.join('') : '<article class="record-card"><h4>No records yet</h4><p>Connect a proof session, register an artist, and forge a release to populate the constellation.</p></article>';
  }

  function renderAnalytics() {
    const prism = $('#analyticsPrism');
    if (!prism) return;
    const a = state.analytics || {};
    const rows = [
      ['Artists', a.totalArtists ?? state.artists.length],
      ['Active Artists', a.activeArtists ?? state.artists.filter((x) => x.status === 'active').length],
      ['Releases', a.totalReleases ?? state.releases.length],
      ['Live Releases', a.liveReleases ?? state.releases.filter((x) => x.status === 'live').length],
      ['Streams', fmtNumber(a.totalStreams || 0)],
      ['Pending Payouts', a.pendingPayouts ?? state.payouts.filter((x) => x.status === 'pending').length],
    ];
    prism.innerHTML = rows.map(([label, value]) => `<div class="prism-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  }

  async function refreshSession() {
    if (staticPreview) return updateSessionChip(null);
    if (!auth) return updateSessionChip(null);
    try {
      const info = await auth.getSessionInfo();
      updateSessionChip(info);
    } catch {
      updateSessionChip(null);
    }
  }

  async function refreshRecords({ quiet = false } = {}) {
    try {
      const artists = await callFunction('music-artists', { query: { action: 'list' } });
      state.artists = Array.isArray(artists.artists) ? artists.artists : [];
    } catch (err) {
      if (!quiet) toast(`Artists read failed: ${err.message}`, 'error');
    }

    try {
      const releases = await callFunction('music-releases', { query: { action: 'list' } });
      state.releases = Array.isArray(releases.releases) ? releases.releases : [];
    } catch (err) {
      if (!quiet) toast(`Releases read failed: ${err.message}`, 'error');
    }

    if (auth && auth.hasToken()) {
      try {
        const analytics = await callFunction('music-analytics');
        state.analytics = analytics;
      } catch {
        state.analytics = null;
      }
      try {
        const payouts = await callFunction('music-payments', { query: { action: 'payouts' } });
        state.payouts = Array.isArray(payouts.payouts) ? payouts.payouts : [];
      } catch {
        state.payouts = [];
      }
      try {
        const board = await callFunction('music-releases', { query: { action: 'operations-board' } });
        state.workflows = Array.isArray(board.workflows) ? board.workflows : [];
      } catch {
        state.workflows = [];
      }
    }

    setMeters();
    renderRecords();
    renderAnalytics();
    fillLastIds();
    if (!quiet) toast('Nexus records refreshed.');
  }

  async function createProofSession() {
    if (staticPreview) return toast('Open the Netlify app runtime to start a SkyGate proof session.', 'info');
    if (!auth) return toast('SkyGate browser auth helper is unavailable.', 'error');
    try {
      const data = await auth.bootstrapLocalProof({ subject: `neo-front-${state.mode}` });
      updateSessionChip({ activeSession: { role: data.role, email: data.operatorEmail || data.subject } });
      toast('Local proof session connected.');
      await refreshRecords({ quiet: true });
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function openOperatorLogin() {
    const dialog = $('#operatorDialog');
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    else toast('Dialog unsupported in this browser.', 'error');
  }

  async function logout() {
    if (!auth) return;
    try {
      await auth.logoutSession();
      updateSessionChip(null);
      state.analytics = null;
      state.payouts = [];
      state.workflows = [];
      setMeters();
      renderRecords();
      renderAnalytics();
      toast('SkyGate session disconnected.');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function wireChrome() {
    $$('[data-action="proof-session"]').forEach((button) => button.addEventListener('click', createProofSession));
    $$('[data-action="operator-login"]').forEach((button) => button.addEventListener('click', openOperatorLogin));
    $$('[data-action="logout"]').forEach((button) => button.addEventListener('click', logout));
    $$('[data-action="refresh-records"]').forEach((button) => button.addEventListener('click', () => refreshRecords()));
    $$('[data-jump]').forEach((button) => button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.jump);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    $$('.node').forEach((button) => button.addEventListener('click', () => {
      $$('.node').forEach((item) => item.classList.toggle('active', item === button));
      const copy = lensCopy[button.dataset.lens] || lensCopy.distribution;
      $('#lensMicro').textContent = copy.micro;
      $('#lensTitle').textContent = copy.title;
      $('#lensText').textContent = copy.text;
    }));
  }

  function wireOperatorDialog() {
    const form = $('#operatorForm');
    if (!form || !auth) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const clicked = event.submitter && event.submitter.value;
      if (clicked === 'cancel') {
        $('#operatorDialog').close();
        return;
      }
      const data = formData(form);
      try {
        setLoading(form, true);
        const session = await auth.loginLocalOperator({ email: data.email, password: data.password, subject: `neo-front-${state.mode}` });
        $('#operatorDialog').close();
        form.reset();
        updateSessionChip({ activeSession: { role: session.role, email: session.operatorEmail } });
        toast('Local operator session connected.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireArtistForm() {
    const form = $('#artistForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const created = await callFunction('music-artists', {
          method: 'POST',
          body: {
            action: 'register',
            name: data.name,
            email: data.email,
            phone: data.phone,
            genre: parseCsv(data.genre),
            bio: data.bio,
            socialLinks: {},
          },
        });
        state.lastArtistId = created.artistId || (created.artist && created.artist.id) || '';
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        renderResult('#artistResult', 'Artist node created', { id: state.lastArtistId, status: created.artist && created.artist.status, name: created.artist && created.artist.name });
        toast('Artist node registered.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#artistResult', 'Artist creation failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireReleaseForm() {
    const form = $('#releaseForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const release = await callFunction('music-releases', {
          method: 'POST',
          body: {
            action: 'submit',
            artistId: data.artistId,
            title: data.title,
            type: data.type,
            releaseDate: data.releaseDate,
            tracks: parseTracks(data.tracks),
            distributionTargets: parseCsv(data.distributionTargets),
          },
        });
        const id = release.release && release.release.id;
        state.lastArtistId = data.artistId;
        state.lastReleaseId = id || '';
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#releaseResult', 'Release capsule forged', { id, status: release.release && release.release.status, title: release.release && release.release.title });
        toast('Release capsule forged.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#releaseResult', 'Release forge failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wirePaymentForm() {
    const form = $('#paymentForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const credit = await callFunction('music-payments', {
          method: 'POST',
          body: { action: 'credit', artistId: data.artistId, amount: Number(data.amount), reason: data.reason || 'NeoFront credit pulse', referenceId: state.lastReleaseId },
        });
        state.lastArtistId = data.artistId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        renderResult('#paymentResult', 'Ledger credited', { balance: fmtMoney(credit.balance), entry: credit.entry && credit.entry.id });
        toast('Royalty ledger credited.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#paymentResult', 'Credit failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireOpsForm() {
    const form = $('#opsForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const queued = await callFunction('music-releases', {
          method: 'POST',
          body: { action: 'queue-operations', id: data.id, owner: data.owner, checkpoint: data.checkpoint, notes: data.notes, status: data.status },
        });
        state.lastReleaseId = data.id;
        sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#opsResult', 'Operations queued', { release: data.id, status: queued.workflow && queued.workflow.status, owner: queued.workflow && queued.workflow.owner });
        toast('Operations runway queued.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#opsResult', 'Operations queue failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireReviewForm() {
    const form = $('#reviewForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      const messages = [];
      try {
        setLoading(form, true);
        if (data.artistId) {
          const approved = await callFunction('music-artists', { method: 'POST', body: { action: 'approve', id: data.artistId } });
          messages.push(`artist ${approved.artist && approved.artist.status}`);
        }
        if (data.releaseId) {
          const reviewed = await callFunction('music-releases', { method: 'POST', body: { action: 'review', id: data.releaseId, decision: 'approve', notes: 'NeoFront operator review pulse' } });
          messages.push(`review ${reviewed.release && reviewed.release.status}`);
          const published = await callFunction('music-releases', { method: 'POST', body: { action: 'publish', id: data.releaseId } });
          messages.push(`publish ${published.release && published.release.status}`);
          const streams = await callFunction('music-releases', { method: 'POST', body: { action: 'report-streams', id: data.releaseId, streams: Number(data.streams || 0), downloads: Number(data.downloads || 0), saves: Math.ceil(Number(data.streams || 0) * 0.03) } });
          messages.push(`streams ${streams.release && streams.release.analytics && streams.release.analytics.streams}`);
        }
        renderResult('#reviewResult', 'Review pulse completed', { result: messages.join(' · ') || 'nothing selected' });
        toast('Review pulse completed.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#reviewResult', 'Review pulse failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wirePayoutForm() {
    const form = $('#payoutForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const completed = await callFunction('music-payments', { method: 'POST', body: { action: 'complete-payout', payoutId: data.payoutId } });
        renderResult('#payoutResult', 'Payout completed', { id: completed.payout && completed.payout.id, status: completed.payout && completed.payout.status });
        toast('Payout completed.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#payoutResult', 'Payout completion failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireForms() {
    wireArtistForm();
    wireReleaseForm();
    wirePaymentForm();
    wireOpsForm();
    wireReviewForm();
    wirePayoutForm();
  }

  function initCanvas() {
    const canvas = $('#pulse-field');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    function resize() {
      width = canvas.width = Math.floor(window.innerWidth * window.devicePixelRatio);
      height = canvas.height = Math.floor(window.innerHeight * window.devicePixelRatio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      particles.length = 0;
      const count = Math.min(96, Math.max(34, Math.floor(window.innerWidth / 16)));
      for (let i = 0; i < count; i += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: (Math.random() * 1.8 + .8) * window.devicePixelRatio,
          vx: (Math.random() - .5) * .35 * window.devicePixelRatio,
          vy: (Math.random() - .5) * .35 * window.devicePixelRatio,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    function frame(t) {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      particles.forEach((p, index) => {
        if (!reduceMotion) {
          p.x += p.vx + Math.sin(t * .0004 + p.phase) * .15;
          p.y += p.vy + Math.cos(t * .0005 + p.phase) * .15;
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) p.y = -20;
        }
        const pulse = 1 + Math.sin(t * .002 + p.phase) * .45;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 9 * pulse);
        gradient.addColorStop(0, index % 3 === 0 ? 'rgba(88,245,255,.5)' : index % 3 === 1 ? 'rgba(255,92,215,.42)' : 'rgba(255,209,102,.36)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 10 * pulse, 0, Math.PI * 2);
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const max = 150 * window.devicePixelRatio;
          if (distance < max) {
            ctx.strokeStyle = `rgba(88,245,255,${(1 - distance / max) * .16})`;
            ctx.lineWidth = window.devicePixelRatio;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }

  async function init() {
    initCanvas();
    wireChrome();
    wireOperatorDialog();
    wireForms();
    updateSessionChip(null);
    setMeters();
    renderRecords();
    renderAnalytics();
    await refreshSession();
    await refreshRecords({ quiet: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
