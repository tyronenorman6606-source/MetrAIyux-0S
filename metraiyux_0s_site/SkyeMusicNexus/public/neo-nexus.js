(function bootSkyeMusicNexusNeoFront() {
  const state = {
    mode: document.body.dataset.mode || 'artist',
    artists: [],
    releases: [],
    payouts: [],
    workflows: [],
    exchange: {
      contentRequests: [],
      threads: [],
      communityPosts: [],
      campaigns: [],
      progress: null,
    },
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
    content: {
      micro: 'Content Request Exchange',
      title: 'Artists should be able to ask for content at the exact moment the release needs it.',
      text: 'The exchange captures cover, canvas, short-form, caption, EPK, and rollout requests, then creates a Relay13-ready inbox thread for handoff.',
    },
    community: {
      micro: 'Community Relay',
      title: 'The platform should create motion between artists, not isolate them in forms.',
      text: 'Artists can post collab calls, feedback asks, producer needs, show-slot signals, and milestones into a gated community lane.',
    },
    progression: {
      micro: 'Achievement Orbit',
      title: 'Progress needs to be visible enough to pull artists forward.',
      text: 'Artist actions unlock signal points, mission completion, release runway milestones, and campaign readiness without removing the gate boundary.',
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
    if (name === 'music-exchange') {
      return {
        ok: true,
        gateSessionRequired: true,
        contentRequests: [],
        threads: [],
        communityPosts: [],
        campaigns: [],
        progress: {
          points: 50,
          level: 1,
          nextLevelAt: 300,
          percentToNext: 17,
          counts: { contentRequests: 0, communityPosts: 0, inboxThreads: 0, campaigns: 0 },
          achievements: [
            {
              id: 'gate-session-lit',
              name: 'Gate Session Lit',
              points: 50,
              unlocked: true,
              detail: 'The artist lane is operating behind SkyGate.',
            },
            {
              id: 'content-request-opened',
              name: 'Content Request Opened',
              points: 120,
              unlocked: false,
              detail: 'Open the Netlify runtime to request release content.',
            },
          ],
          missions: [],
        },
      };
    }
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

  function renderExchange() {
    const exchange = state.exchange || {};
    const progress = exchange.progress || {};
    const requests = Array.isArray(exchange.contentRequests) ? exchange.contentRequests : [];
    const threads = Array.isArray(exchange.threads) ? exchange.threads : [];
    const posts = Array.isArray(exchange.communityPosts) ? exchange.communityPosts : [];
    const campaigns = Array.isArray(exchange.campaigns) ? exchange.campaigns : [];

    const progressRail = $('#progressRail');
    if (progressRail) {
      const counts = progress.counts || {};
      progressRail.innerHTML = `
        <div class="progress-score">
          <strong>Level ${escapeHtml(progress.level || 1)}</strong>
          <span>${escapeHtml(progress.points || 0)} signal points</span>
        </div>
        <div class="progress-bar" aria-label="progress to next level"><i style="width:${Math.max(0, Math.min(100, Number(progress.percentToNext || 0)))}%"></i></div>
        <div class="record-meta">
          <span class="pill">${escapeHtml(counts.contentRequests || 0)} requests</span>
          <span class="pill">${escapeHtml(counts.communityPosts || 0)} posts</span>
          <span class="pill">${escapeHtml(counts.inboxThreads || 0)} inbox threads</span>
          <span class="pill">${escapeHtml(counts.campaigns || 0)} campaigns</span>
        </div>`;
    }

    const achievements = $('#achievementOrbit');
    if (achievements) {
      const list = Array.isArray(progress.achievements) ? progress.achievements : [];
      achievements.innerHTML = list.length ? list.map((item) => `
        <article class="achievement ${item.unlocked ? 'unlocked' : ''}">
          <span>${item.unlocked ? 'Unlocked' : 'Locked'}</span>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.points)} pts · ${escapeHtml(item.detail)}</small>
        </article>`).join('') : '<article class="achievement"><strong>No achievements yet</strong><small>Start with an artist node, release capsule, or content request.</small></article>';
    }

    const requestList = $('#contentRequestList');
    if (requestList) {
      requestList.innerHTML = requests.length ? requests.slice(0, 8).map((item) => recordCard('content', item.title || 'Content request', `${item.requestType || 'request'} · ${item.budgetLane || 'lane pending'}`, [item.status || 'open', item.id, item.threadId || 'no thread'])).join('') : '<article class="record-card"><h4>No content requests yet</h4><p>Ask for cover art, captions, short clips, EPK copy, or a rollout pack from the exchange.</p></article>';
    }

    const inbox = $('#inboxList');
    if (inbox) {
      inbox.innerHTML = threads.length ? threads.slice(0, 8).map((thread) => {
        const messages = Array.isArray(thread.messages) ? thread.messages : [];
        const last = messages[messages.length - 1] || {};
        return recordCard('inbox', thread.topic || 'Artist inbox', last.body || 'Thread created for ConnectLog + Relay13 bridge handoff.', [thread.kind || 'thread', `${messages.length} messages`, thread.relay && thread.relay.status ? thread.relay.status : 'relay-ready']);
      }).join('') : '<article class="record-card"><h4>Inbox is ready</h4><p>Send a message or open a content request to create the first ConnectLog + Relay13-ready thread.</p></article>';
    }

    const community = $('#communityWall');
    if (community) {
      community.innerHTML = posts.length ? posts.slice(0, 8).map((post) => recordCard('community', post.category || 'community signal', post.body || 'Community post', [post.status || 'open', post.artistId || 'artist', post.linkedReleaseId || 'no release'])).join('') : '<article class="record-card"><h4>No community posts yet</h4><p>Post a collab call, feedback ask, producer request, show-slot request, or release milestone.</p></article>';
    }

    const campaign = $('#campaignPack');
    if (campaign) {
      const latest = campaigns[0];
      if (!latest) {
        campaign.innerHTML = '<article class="record-card"><h4>No campaign pack yet</h4><p>Generate a release pack to get captions, short-form hooks, rollout tasks, and asset requests.</p></article>';
      } else {
        const pack = latest.contentPack || {};
        campaign.innerHTML = `
          <article class="record-card campaign-card">
            <header><h4>${escapeHtml(latest.releaseTitle || 'Release campaign')}</h4><span class="pill gold">${escapeHtml(latest.offerLane || 'Lite brief')}</span></header>
            <p>${escapeHtml(latest.mood || 'Release momentum')}</p>
            <div class="campaign-columns">
              <div><strong>Captions</strong>${(pack.captions || []).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
              <div><strong>Hooks</strong>${(pack.shortFormHooks || []).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
              <div><strong>Runway</strong>${(pack.rolloutTasks || []).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>
            </div>
          </article>`;
      }
    }
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
      try {
        const exchange = await callFunction('music-exchange', { query: { action: 'hub', artistId: state.lastArtistId } });
        state.exchange = {
          contentRequests: Array.isArray(exchange.contentRequests) ? exchange.contentRequests : [],
          threads: Array.isArray(exchange.threads) ? exchange.threads : [],
          communityPosts: Array.isArray(exchange.communityPosts) ? exchange.communityPosts : [],
          campaigns: Array.isArray(exchange.campaigns) ? exchange.campaigns : [],
          progress: exchange.progress || null,
        };
      } catch {
        state.exchange = { contentRequests: [], threads: [], communityPosts: [], campaigns: [], progress: null };
      }
    }

    setMeters();
    renderRecords();
    renderAnalytics();
    renderExchange();
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

  function wireContentRequestForm() {
    const form = $('#contentRequestForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const created = await callFunction('music-exchange', {
          method: 'POST',
          body: {
            action: 'request-content',
            artistId: data.artistId,
            releaseId: data.releaseId,
            requestType: data.requestType,
            title: data.title,
            brief: data.brief,
            budgetLane: data.budgetLane,
            dueAt: data.dueAt,
          },
        });
        state.lastArtistId = data.artistId;
        if (data.releaseId) state.lastReleaseId = data.releaseId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        if (state.lastReleaseId) sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#contentRequestResult', 'Content request opened', { id: created.request && created.request.id, thread: created.request && created.request.threadId, lane: created.request && created.request.budgetLane });
        toast('Content request opened in the artist exchange.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#contentRequestResult', 'Content request failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireMessageForm() {
    const form = $('#messageForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const sent = await callFunction('music-exchange', {
          method: 'POST',
          body: {
            action: 'send-message',
            artistId: data.artistId,
            recipientId: data.recipientId,
            topic: data.topic,
            body: data.body,
            kind: 'artist-inbox',
          },
        });
        state.lastArtistId = data.artistId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        renderResult('#messageResult', 'Inbox message sent', { thread: sent.thread && sent.thread.id, relay: sent.thread && sent.thread.relay && sent.thread.relay.status });
        toast('Inbox message persisted for the Relay13-ready thread.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#messageResult', 'Inbox message failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireCommunityPostForm() {
    const form = $('#communityPostForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const posted = await callFunction('music-exchange', {
          method: 'POST',
          body: {
            action: 'publish-community',
            artistId: data.artistId,
            linkedReleaseId: data.linkedReleaseId,
            category: data.category,
            body: data.body,
          },
        });
        state.lastArtistId = data.artistId;
        if (data.linkedReleaseId) state.lastReleaseId = data.linkedReleaseId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        if (state.lastReleaseId) sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#communityPostResult', 'Community signal posted', { id: posted.post && posted.post.id, category: posted.post && posted.post.category, status: posted.post && posted.post.status });
        toast('Community signal posted.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#communityPostResult', 'Community signal failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireReleaseCampaignForm() {
    const form = $('#releaseCampaignForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const built = await callFunction('music-exchange', {
          method: 'POST',
          body: {
            action: 'build-release-campaign',
            artistId: data.artistId,
            releaseId: data.releaseId,
            releaseTitle: data.releaseTitle,
            mood: data.mood,
            platforms: data.platforms,
            offerLane: data.offerLane,
          },
        });
        state.lastArtistId = data.artistId;
        if (data.releaseId) state.lastReleaseId = data.releaseId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        if (state.lastReleaseId) sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#campaignResult', 'Release campaign built', { id: built.campaign && built.campaign.id, release: built.campaign && built.campaign.releaseTitle, lane: built.campaign && built.campaign.offerLane });
        toast('Release campaign pack generated.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#campaignResult', 'Release campaign failed', { error: err.message });
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
    wireContentRequestForm();
    wireMessageForm();
    wireCommunityPostForm();
    wireReleaseCampaignForm();
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
    renderExchange();
    await refreshSession();
    await refreshRecords({ quiet: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
