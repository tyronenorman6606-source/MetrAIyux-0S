(function bootSkyeMusicNexusNeoFront() {
  function starterSocialPayload() {
    const createdAt = new Date().toISOString();
    const feedItems = [{
      id: 'static_feed_signal',
      type: 'release-post',
      source: 'musicnexus',
      status: 'local-preview',
      artistId: 'static_preview_artist',
      releaseId: 'static_preview_release',
      author: 'Gate Signal',
      handle: 'skye:preview',
      avatar: 'GS',
      title: 'Gate Signal Preview',
      caption: 'First post in the MusicNexus feed: release signal, artist profile, story rail, comments, saves, and provider publishing all stay attached.',
      hashtags: ['newmusic', 'musicnexus'],
      media: { kind: 'generated-cover', gradient: 'linear-gradient(135deg,#6be8d6,#f2c766)', label: 'GS' },
      stats: { likes: 13, saves: 5, boosts: 2, comments: [{ id: 'static_comment', artistId: 'operator', body: 'Feed mechanics are live in static preview.', createdAt }] },
      createdAt,
    }];
    return {
      feedItems,
      stories: [{ id: 'static_story', artistId: 'static_preview_artist', label: 'Gate Signal', sublabel: 'release-post', avatar: 'GS', releaseId: 'static_preview_release' }],
      summary: { connectors: 0, readyConnectors: 0, feedItems: feedItems.length, queuedPosts: 0, publishedPosts: 0, providerTokenRequired: 0 },
    };
  }

  const starterSocial = starterSocialPayload();
  const state = {
    mode: document.body.dataset.mode || 'artist',
    artists: [],
    releases: [],
    payouts: [],
    workflows: [],
    assets: [],
    assetStorage: null,
    drops: {
      items: [],
      batches: [],
      deploys: [],
      trafficSummary: null,
      env: null,
      estimate: null,
    },
    exchange: {
      contentRequests: [],
      threads: [],
      communityPosts: [],
      campaigns: [],
      progress: null,
    },
    social: {
      catalog: [],
      connectors: [],
      postQueue: [],
      feedItems: starterSocial.feedItems,
      stories: starterSocial.stories,
      feedPulls: [],
      moderation: [],
      summary: starterSocial.summary,
    },
    player: {
      queue: [],
      activeIndex: 0,
      isPlaying: false,
      mode: 'idle',
      startedAt: 0,
      elapsed: 0,
      audioContext: null,
      audioElement: null,
      objectUrl: '',
      nodes: [],
      timer: null,
      currentTrack: null,
    },
    analytics: null,
    lastArtistId: sessionStorage.getItem('skye-music-nexus:lastArtistId') || '',
    lastReleaseId: sessionStorage.getItem('skye-music-nexus:lastReleaseId') || '',
    identity: null,
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
  const plainText = (value) => String(value == null ? '' : value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const fmtNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));
  const fmtMoney = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
  const apiBase = '/.netlify/functions/';
  const staticPreviewOverride = window.SKYE_MUSIC_NEXUS_STATIC_PREVIEW;
  const staticPreview = staticPreviewOverride === true
    || (staticPreviewOverride !== false && window.location.protocol === 'http:' && /^(127\.0\.0\.1|localhost)$/.test(window.location.hostname));
  const auth = window.createSkyGateAuth ? window.createSkyGateAuth({ storageKey: 'skye_music_nexus_session' }) : null;
  const previewSeconds = 24;
  window.__SKYE_MUSIC_PLAYBACK = { isPlaying: false, queueLength: 0, mode: 'idle', currentTime: 0 };

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
    const musicGateSession = window.SkyeMusicGate && typeof window.SkyeMusicGate.session === 'function'
      ? window.SkyeMusicGate.session()
      : null;
    if ((auth && auth.hasToken()) || musicGateSession) {
      const session = info && info.activeSession;
      chip.textContent = session && session.email ? `SkyGate: ${session.role || 'session'} / ${session.email}` : 'SkyGate session active';
      chip.className = 'chip chip-ready';
    } else if (staticPreview) {
      chip.textContent = '0S static preview';
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
    let response;
    try {
      response = needsAuth && auth ? await auth.fetch(url.toString(), init) : await fetch(url.toString(), init);
    } catch (err) {
      if (window.location.pathname.includes('/SkyeMusicNexus/public/')) return staticFunctionResponse(name, options);
      throw err;
    }
    if (response.status === 404 && window.location.pathname.includes('/SkyeMusicNexus/public/')) {
      return staticFunctionResponse(name, options);
    }
    return readJson(response);
  }

  async function staticFunctionResponse(name, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const action = (options.query && options.query.action) || (options.body && options.body.action) || '';
    if (method !== 'GET' && !(name === 'music-releases' && action === 'playback-stream')) {
      throw new Error('Open the Netlify app runtime to write SkyeMusicNexus records.');
    }
    if (name === 'music-artists') return { ok: true, artists: [] };
    if (name === 'music-assets') return { ok: true, assets: [], total: 0, maxUploadBytes: 52428800 };
    if (name === 'music-drops') return {
      ok: true,
      drops: [],
      batches: [],
      deploys: [],
      trafficSummary: { total: 0, pageViews: 0, playStarts: 0, qualifiedStreams: 0, completePlays: 0, downloads: 0 },
      env: { netlify: { configured: false, liveDeployEnabled: false }, email: { provider: 'local-receipt', configured: false } },
      estimate: { estimatedCredits: 15, estimatedBandwidthGb: 0, fitsReserve: true },
    };
    if (name === 'music-releases' && action === 'operations-board') return { ok: true, workflows: [] };
    if (name === 'music-releases' && action === 'playback-stream') return {
      ok: true,
      playback: { playbackKind: 'generated-proof-preview', plays: 1, proofPlays: 1 },
    };
    if (name === 'music-releases' && action === 'rights-audit') return {
      ok: true,
      rights: [{
        releaseId: 'static_preview_release',
        title: 'Gate Signal Preview',
        status: 'preview-ready',
        ownershipAttested: true,
        previewUseAuthorized: true,
        distributionAuthorized: false,
        playbackBlocked: false,
        linkedPreviewCount: 0,
      }],
      summary: { total: 1, ready: 1, blocked: 0, needsClearance: 0 },
    };
    if (name === 'music-releases') return {
      ok: true,
      releases: [{
        id: 'static_preview_release',
        artistId: 'static_preview_artist',
        title: 'Gate Signal Preview',
        type: 'single',
        status: 'live',
        tracks: [
          { title: 'Gate Signal', duration: 24, previewUrl: '', plays: 0, listenSeconds: 0 },
          { title: 'Relay Bounce', duration: 26, previewUrl: '', plays: 0, listenSeconds: 0 },
        ],
        analytics: { streams: 1280, downloads: 22, saves: 87, plays: 0, listenSeconds: 0 },
        distributionTargets: ['SkyeMusicNexus Player', 'Spotify handoff boundary'],
      }],
    };
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
    if (name === 'music-social') {
      const starter = starterSocialPayload();
      return {
        ok: true,
        gateSessionRequired: true,
        catalog: [
          {
            id: 'pixelfed',
            name: 'Pixelfed',
            lane: 'instagram-like-photo-feed',
            protocol: 'ActivityPub plus Mastodon-compatible REST posting',
            productionBoundary: 'Connect a self-hosted or trusted Pixelfed token through a server environment variable.',
          },
          {
            id: 'mastodon',
            name: 'Mastodon-compatible Fediverse',
            lane: 'status-feed-and-hashtag-discovery',
            protocol: 'OAuth2 + REST API + ActivityPub federation',
            productionBoundary: 'Use OAuth app tokens stored in the server runtime.',
          },
          {
            id: 'funkwhale',
            name: 'Funkwhale',
            lane: 'federated-audio-publication',
            protocol: 'ActivityPub audio federation + Funkwhale API',
            productionBoundary: 'Use after rights, storage, and native API mapping are live.',
          },
        ],
        connectors: [],
        postQueue: [],
        feedItems: starter.feedItems,
        stories: starter.stories,
        feedPulls: [],
        moderation: [],
        summary: starter.summary,
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
    if (!rows.length) return [{ title: 'Untitled Signal', duration: 180, previewUrl: '' }];
    return rows.map((row) => {
      const [title, duration, previewUrl] = row.split('|').map((part) => part.trim());
      return { title: title || 'Untitled Signal', duration: Number(duration || 180) || 180, previewUrl: previewUrl || '' };
    });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }

  function readSkyeIdentity() {
    if (!window.SkyeIDBridge || !window.SkyeIDBridge.readCurrentIdentity) return null;
    state.identity = window.SkyeIDBridge.readCurrentIdentity();
    return state.identity;
  }

  function currentSkyeArtistId() {
    const identity = state.identity || readSkyeIdentity();
    return (identity && (identity.skyeId || identity.idNumber || identity.identityId)) || '';
  }

  function refreshIdentityPanel(identity = state.identity || readSkyeIdentity()) {
    const status = $('#artistIdentityStatus');
    const meta = $('#artistPhotoMeta');
    const preview = $('#artistPhotoPreview');
    if (status) {
      const id = identity && (identity.skyeId || identity.idNumber || identity.identityId);
      status.textContent = id ? `${identity.name || 'Artist'} · ${id}` : 'No shared identity loaded';
    }
    if (meta) meta.textContent = identity && identity.photoDataUrl ? 'Skye ID photo linked.' : 'No artist photo linked yet.';
    if (preview) {
      if (identity && identity.photoDataUrl) {
        preview.src = identity.photoDataUrl;
        preview.hidden = false;
      } else {
        preview.removeAttribute('src');
        preview.hidden = true;
      }
    }
  }

  function syncIdentityToArtistForm({ force = false } = {}) {
    const form = $('#artistForm');
    const identity = readSkyeIdentity();
    if (!form || !identity) {
      refreshIdentityPanel(identity);
      return identity;
    }
    if (window.SkyeIDBridge && window.SkyeIDBridge.applyToArtistForm) window.SkyeIDBridge.applyToArtistForm(form);
    if (force || !form.elements.skyeId.value) form.elements.skyeId.value = identity.skyeId || identity.idNumber || '';
    if (form.elements.identityId) form.elements.identityId.value = identity.identityId || identity.skyeId || identity.idNumber || '';
    if (force || !form.elements.name.value) form.elements.name.value = identity.name || form.elements.name.value;
    refreshIdentityPanel(identity);
    return identity;
  }

  async function readArtistPhoto(form, identity) {
    const file = form && form.elements.profilePhotoFile && form.elements.profilePhotoFile.files && form.elements.profilePhotoFile.files[0];
    if (!file) {
      if (identity && identity.photoDataUrl) {
        return {
          dataUrl: identity.photoDataUrl,
          name: identity.photoName || 'skye-id-photo.jpg',
          type: identity.photoType || 'image/jpeg',
          updatedAt: identity.photoUpdatedAt || identity.updatedAt,
        };
      }
      return null;
    }
    if (window.SkyeIDBridge && window.SkyeIDBridge.fileToIdentityPhoto) return window.SkyeIDBridge.fileToIdentityPhoto(file);
    const dataUrl = await fileToDataUrl(file);
    return { dataUrl, name: file.name, type: file.type, originalBytes: file.size, updatedAt: new Date().toISOString() };
  }

  function publishArtistIdentity(payload) {
    if (!window.SkyeIDBridge || !window.SkyeIDBridge.publishIdentity) return null;
    return window.SkyeIDBridge.publishIdentity(payload, 'music-nexus-artist-register');
  }

  function renderResult(target, title, fields) {
    const node = $(target);
    if (!node) return;
    const rows = Object.entries(fields || {}).map(([key, value]) => `<span class="pill">${escapeHtml(key)}: ${escapeHtml(value)}</span>`).join('');
    node.innerHTML = `<strong>${escapeHtml(title)}</strong><div class="record-meta" style="margin-top:10px">${rows}</div>`;
  }

  function fillLastIds() {
    const identityArtistId = currentSkyeArtistId();
    if (!state.lastArtistId && identityArtistId) state.lastArtistId = identityArtistId;
    $$('input[name="artistId"]').forEach((input) => {
      if (!input.value && (state.lastArtistId || identityArtistId)) input.value = state.lastArtistId || identityArtistId;
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

  function recordCard(type, title, text, pills, options = {}) {
    const photoDataUrl = String(options.photoDataUrl || '');
    const safePhoto = photoDataUrl.startsWith('data:image/') ? photoDataUrl : '';
    return `<article class="record-card${safePhoto ? ' has-photo' : ''}">
      ${safePhoto ? `<img class="record-photo" src="${escapeHtml(safePhoto)}" alt="" />` : ''}
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
      const photoDataUrl = artist.profilePhoto?.dataUrl || artist.photoDataUrl || artist.crossAppIdentity?.photoDataUrl || '';
      const id = artist.skyeId || artist.id;
      const pills = [artist.status || 'unknown', id, fmtMoney(artist.balance || 0)];
      if (artist.skyeId && artist.skyeId !== artist.id) pills.push(`Skye ID ${artist.skyeId}`);
      cards.push(recordCard('artist', artist.name || 'Unnamed Artist', artist.email || artist.id, pills, { photoDataUrl }));
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

  function rightsStatusFor(release) {
    const rights = release.rights || {};
    const ownership = rights.ownershipAttested === true;
    const preview = rights.previewUseAuthorized === true;
    const blocked = rights.playbackBlocked === true || rights.takedownHold === true;
    return {
      status: blocked ? 'blocked' : rights.status || (ownership && preview ? 'preview-ready' : 'needs-clearance'),
      ownership,
      preview,
      distribution: rights.distributionAuthorized === true,
      blocked,
      email: rights.takedownContactEmail || '',
    };
  }

  function buildPlaybackQueue() {
    const releases = state.releases
      .filter((release) => Array.isArray(release.tracks) && release.tracks.length)
      .sort((left, right) => {
        const liveScore = (right.status === 'live' ? 1 : 0) - (left.status === 'live' ? 1 : 0);
        if (liveScore) return liveScore;
        return String(right.publishedAt || right.submittedAt || right.id).localeCompare(String(left.publishedAt || left.submittedAt || left.id));
      });
    return releases.flatMap((release) => {
      const rights = rightsStatusFor(release);
      return release.tracks.map((track, trackIndex) => {
        const previewUrl = track.previewUrl || track.audioUrl || track.streamUrl || '';
        return {
          releaseId: release.id,
          releaseTitle: release.title || 'Untitled Release',
          artistId: release.artistId || '',
          status: release.status || 'draft',
          trackIndex,
          title: track.title || `Track ${trackIndex + 1}`,
          duration: Number(track.duration || 0) || previewSeconds,
          previewUrl,
          previewAuthorized: !previewUrl || (rights.ownership && rights.preview && !rights.blocked),
          playbackBlocked: rights.blocked,
          rightsStatus: rights.status,
          plays: Number(track.plays || 0) || Number(release.analytics?.trackStats?.[trackIndex]?.plays || 0) || 0,
          listenSeconds: Number(track.listenSeconds || 0) || Number(release.analytics?.trackStats?.[trackIndex]?.listenSeconds || 0) || 0,
        };
      });
    });
  }

  function syncPlaybackDebug() {
    const player = state.player;
    const elapsed = player.isPlaying && player.startedAt ? (Date.now() - player.startedAt) / 1000 : player.elapsed || 0;
    window.__SKYE_MUSIC_PLAYBACK = {
      isPlaying: player.isPlaying,
      queueLength: player.queue.length,
      activeIndex: player.activeIndex,
      mode: player.mode,
      currentTime: elapsed,
      trackTitle: player.currentTrack?.title || '',
      releaseId: player.currentTrack?.releaseId || '',
      audioContextState: player.audioContext?.state || '',
    };
  }

  function setPlayerStatus(message) {
    const node = $('#playerStatus');
    if (node) node.textContent = message;
    syncPlaybackDebug();
  }

  function setPlayerProgress(percent) {
    const bar = $('#playerProgress');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, Number(percent || 0)))}%`;
    syncPlaybackDebug();
  }

  function renderPlayback() {
    const queue = buildPlaybackQueue();
    state.player.queue = queue;
    if (state.player.activeIndex >= queue.length) state.player.activeIndex = 0;
    const active = state.player.currentTrack || queue[state.player.activeIndex] || null;
    const nowTrack = $('#nowTrack');
    const nowRelease = $('#nowRelease');
    const queueNode = $('#playerQueue');
    const mode = $('#playbackMode');
    if (mode) mode.textContent = active?.previewUrl && active.previewAuthorized ? 'rights-cleared audio' : 'generated preview';
    if (nowTrack) nowTrack.textContent = active ? active.title : 'No track loaded';
    if (nowRelease) {
      nowRelease.textContent = active
        ? `${active.releaseTitle} · ${active.status} · ${fmtNumber(active.plays)} plays`
        : 'Forge or publish a release to fill the queue.';
    }
    if (queueNode) {
      queueNode.innerHTML = queue.length ? queue.map((track, index) => `
        <button type="button" class="queue-track ${index === state.player.activeIndex ? 'active' : ''}" data-track-index="${index}">
          <span>${escapeHtml(String(index + 1).padStart(2, '0'))}</span>
          <strong>${escapeHtml(track.title)}</strong>
          <small>${escapeHtml(track.releaseTitle)} · ${escapeHtml(track.playbackBlocked ? 'playback blocked' : track.previewUrl ? track.previewAuthorized ? 'rights-cleared audio' : 'rights gate locked' : 'synth proof')} · ${escapeHtml(fmtNumber(track.plays))} plays</small>
        </button>`).join('') : '<article class="record-card"><h4>No playable tracks yet</h4><p>Forge a release with tracks to light the playback deck.</p></article>';
    }
    syncPlaybackDebug();
  }

  function seededFrequency(track, offset = 0) {
    const source = `${track.releaseId}:${track.title}:${offset}`;
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
    const scale = [0, 2, 3, 5, 7, 8, 10, 12];
    const note = scale[hash % scale.length] + (offset * 7);
    return 174.61 * (2 ** (note / 12));
  }

  function clearPlayerTimer() {
    if (state.player.timer) clearInterval(state.player.timer);
    state.player.timer = null;
  }

  function stopAudioNodes() {
    state.player.nodes.forEach((node) => {
      try {
        if (typeof node.stop === 'function') node.stop();
      } catch {}
      try {
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch {}
    });
    state.player.nodes = [];
    if (state.player.audioElement) {
      state.player.audioElement.pause();
      state.player.audioElement.removeAttribute('src');
      state.player.audioElement.load();
    }
    if (state.player.objectUrl) {
      URL.revokeObjectURL(state.player.objectUrl);
      state.player.objectUrl = '';
    }
  }

  async function recordPlayback(track, seconds, completed) {
    if (staticPreview || !track?.releaseId) return;
    try {
      const played = await callFunction('music-releases', {
        method: 'POST',
        body: {
          action: 'playback-stream',
          id: track.releaseId,
          trackIndex: track.trackIndex,
          listenSeconds: Math.max(1, Math.round(seconds || 1)),
          completed: completed === true,
          source: state.player.mode || 'nexus-player',
          generatedProof: state.player.mode === 'generated-preview',
        },
      });
      if (played.release?.id) {
        state.releases = state.releases.map((release) => release.id === played.release.id ? played.release : release);
        setMeters();
        renderRecords();
        renderAnalytics();
        renderRights();
      }
      setPlayerStatus(`Stream proof saved for ${track.title}.`);
    } catch (err) {
      setPlayerStatus(`Played locally. Stream proof save failed: ${err.message}`);
    }
  }

  async function stopPlayback({ report = true, completed = false } = {}) {
    const player = state.player;
    const track = player.currentTrack;
    const seconds = player.startedAt ? (Date.now() - player.startedAt) / 1000 : player.elapsed || 0;
    clearPlayerTimer();
    stopAudioNodes();
    player.isPlaying = false;
    player.elapsed = seconds;
    player.startedAt = 0;
    player.mode = 'idle';
    setPlayerProgress(completed ? 100 : 0);
    if (report && track && seconds > 0.25) await recordPlayback(track, seconds, completed);
    renderPlayback();
  }

  async function startSyntheticTrack(track) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) throw new Error('This browser cannot start the Web Audio player.');
    const ctx = state.player.audioContext || new AudioCtor();
    state.player.audioContext = ctx;
    await ctx.resume();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + Math.min(previewSeconds, Math.max(6, Number(track.duration || previewSeconds))) - 0.08);
    gain.connect(ctx.destination);

    const oscillators = [0, 1, 2].map((offset) => {
      const osc = ctx.createOscillator();
      osc.type = offset === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(seededFrequency(track, offset), ctx.currentTime);
      osc.detune.setValueAtTime(offset === 1 ? 7 : offset === 2 ? -12 : 0, ctx.currentTime);
      osc.connect(gain);
      osc.start();
      return osc;
    });
    state.player.nodes = [gain, ...oscillators];
    setPlayerStatus(track.previewUrl && !track.previewAuthorized
      ? `Rights gate locked linked audio. Playing generated proof preview: ${track.title}`
      : `Playing generated preview: ${track.title}`);
  }

  async function startLinkedAudioTrack(track) {
    const audio = state.player.audioElement || new Audio();
    state.player.audioElement = audio;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    const url = new URL(track.previewUrl, window.location.href).toString();
    if (track.previewUrl.includes('/.netlify/functions/music-assets') && auth) {
      const response = await auth.fetch(url);
      if (!response.ok) throw new Error(`Gated audio fetch failed with ${response.status}`);
      const blob = await response.blob();
      state.player.objectUrl = URL.createObjectURL(blob);
      audio.src = state.player.objectUrl;
    } else {
      audio.src = url;
    }
    audio.onended = () => stopPlayback({ completed: true });
    await audio.play();
    setPlayerStatus(`Playing linked audio: ${track.title}`);
  }

  async function playTrack(index = state.player.activeIndex) {
    const queue = state.player.queue.length ? state.player.queue : buildPlaybackQueue();
    if (!queue.length) {
      setPlayerStatus('No playable tracks in the queue yet.');
      return;
    }
    await stopPlayback({ report: false });
    const nextIndex = Math.max(0, Math.min(queue.length - 1, Number(index) || 0));
    const track = queue[nextIndex];
    if (track.playbackBlocked) {
      state.player.activeIndex = nextIndex;
      state.player.currentTrack = track;
      renderPlayback();
      setPlayerStatus(`Playback blocked pending rights review: ${track.title}`);
      return;
    }
    state.player.activeIndex = nextIndex;
    state.player.currentTrack = track;
    state.player.isPlaying = true;
    state.player.mode = track.previewUrl && track.previewAuthorized ? 'linked-audio' : 'generated-preview';
    state.player.startedAt = Date.now();
    state.player.elapsed = 0;
    renderPlayback();

    try {
      if (track.previewUrl && track.previewAuthorized) await startLinkedAudioTrack(track);
      else await startSyntheticTrack(track);
    } catch (err) {
      if (track.previewUrl) {
        state.player.mode = 'generated-preview';
        await startSyntheticTrack(track);
        setPlayerStatus(`Linked audio failed, playing generated preview: ${track.title}`);
      } else {
        state.player.isPlaying = false;
        setPlayerStatus(err.message);
        return;
      }
    }

    clearPlayerTimer();
    state.player.timer = setInterval(() => {
      const elapsed = (Date.now() - state.player.startedAt) / 1000;
      const mediaDuration = state.player.audioElement?.duration && Number.isFinite(state.player.audioElement.duration)
        ? state.player.audioElement.duration
        : Math.min(previewSeconds, Math.max(6, Number(track.duration || previewSeconds)));
      state.player.elapsed = elapsed;
      setPlayerProgress((elapsed / mediaDuration) * 100);
      if (state.player.mode === 'generated-preview' && elapsed >= mediaDuration) {
        stopPlayback({ completed: true });
      }
    }, 180);
  }

  async function playNextTrack() {
    const queue = state.player.queue.length ? state.player.queue : buildPlaybackQueue();
    if (!queue.length) return setPlayerStatus('No playable tracks in the queue yet.');
    const next = (state.player.activeIndex + 1) % queue.length;
    await playTrack(next);
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

  function feedMedia(item) {
    const media = item && item.media ? item.media : {};
    if (media.kind === 'image' && media.url) {
      return `<figure class="feed-media"><img src="${escapeHtml(media.url)}" alt="${escapeHtml(media.alt || item.title || 'Feed media')}" loading="lazy" decoding="async" /></figure>`;
    }
    const label = media.label || item.avatar || 'SM';
    const gradient = media.gradient || 'linear-gradient(135deg,#6be8d6,#f2c766)';
    return `<figure class="feed-media generated-feed-cover" style="--feed-cover:${escapeHtml(gradient)}"><span>${escapeHtml(label)}</span><small>${escapeHtml(item.type || 'music')}</small></figure>`;
  }

  function feedCard(item) {
    const stats = item.stats || {};
    const comments = Array.isArray(stats.comments) ? stats.comments : [];
    const hashtags = Array.isArray(item.hashtags) ? item.hashtags : [];
    return `<article class="real-feed-card" data-feed-post="${escapeHtml(item.id)}">
      <header class="feed-author-row">
        <span class="feed-avatar">${escapeHtml(item.avatar || 'SM')}</span>
        <div>
          <strong>${escapeHtml(item.author || 'MusicNexus Artist')}</strong>
          <small>${escapeHtml(item.handle || item.source || 'musicnexus')} · ${escapeHtml(item.status || 'live')}</small>
        </div>
        <button class="ghost mini" type="button" data-feed-action="follow" data-feed-target="${escapeHtml(item.id)}" data-feed-artist="${escapeHtml(item.artistId || '')}">Follow</button>
      </header>
      ${feedMedia(item)}
      <div class="feed-actions" aria-label="Feed actions">
        <button type="button" class="feed-icon" data-feed-action="like" data-feed-target="${escapeHtml(item.id)}" data-feed-artist="${escapeHtml(item.artistId || '')}">Like</button>
        <button type="button" class="feed-icon" data-feed-action="comment" data-feed-target="${escapeHtml(item.id)}" data-feed-artist="${escapeHtml(item.artistId || '')}">Comment</button>
        <button type="button" class="feed-icon" data-feed-action="boost" data-feed-target="${escapeHtml(item.id)}" data-feed-artist="${escapeHtml(item.artistId || '')}">Boost</button>
        <button type="button" class="feed-icon" data-feed-action="save" data-feed-target="${escapeHtml(item.id)}" data-feed-artist="${escapeHtml(item.artistId || '')}">Save</button>
      </div>
      <div class="feed-body">
        <strong>${escapeHtml(item.title || 'Release signal')}</strong>
        <p>${escapeHtml(plainText(item.caption || ''))}</p>
        ${hashtags.length ? `<div class="feed-tags">${hashtags.map((tag) => `<span>#${escapeHtml(String(tag).replace(/^#/, ''))}</span>`).join('')}</div>` : ''}
      </div>
      <div class="feed-stats">
        <span>${escapeHtml(stats.likes || 0)} likes</span>
        <span>${escapeHtml(stats.saves || 0)} saves</span>
        <span>${escapeHtml(stats.boosts || 0)} boosts</span>
        ${stats.plays ? `<span>${escapeHtml(fmtNumber(stats.plays))} plays</span>` : ''}
      </div>
      <div class="feed-comments">
        ${comments.length ? comments.slice(0, 3).map((comment) => `<p><strong>${escapeHtml(comment.artistId || 'artist')}</strong> ${escapeHtml(comment.body || '')}</p>`).join('') : '<p class="muted-feed-line">No comments yet.</p>'}
      </div>
      <form class="feed-comment-form" data-feed-comment-form="${escapeHtml(item.id)}">
        <input name="body" placeholder="Add a comment" />
        <button class="secondary mini" type="submit">Post</button>
      </form>
    </article>`;
  }

  function renderSocial() {
    const social = state.social || {};
    const catalog = Array.isArray(social.catalog) ? social.catalog : [];
    const connectors = Array.isArray(social.connectors) ? social.connectors : [];
    const posts = Array.isArray(social.postQueue) ? social.postQueue : [];
    const feedItems = Array.isArray(social.feedItems) ? social.feedItems : [];
    const stories = Array.isArray(social.stories) ? social.stories : [];
    const pulls = Array.isArray(social.feedPulls) ? social.feedPulls : [];
    const summary = social.summary || {};

    const deck = $('#socialFeedDeck');
    if (deck) {
      deck.innerHTML = feedItems.length ? feedItems.map(feedCard).join('') : `
        <article class="real-feed-card empty-feed">
          <div class="feed-body">
            <strong>No feed posts yet</strong>
            <p>Create the first artist post above, or publish a community signal from the Exchange.</p>
          </div>
        </article>`;
    }

    const storyRail = $('#socialStoryRail');
    if (storyRail) {
      storyRail.innerHTML = stories.length ? stories.map((story) => `
        <button type="button" class="story-bubble" data-route="./player.html">
          <span>${escapeHtml(story.avatar || 'SM')}</span>
          <strong>${escapeHtml(story.label || 'Artist')}</strong>
          <small>${escapeHtml(story.sublabel || 'signal')}</small>
        </button>`).join('') : '<article class="story-bubble story-empty"><span>+</span><strong>Start</strong><small>new post</small></article>';
    }

    const trending = $('#trendingReleaseRail');
    if (trending) {
      const releases = feedItems.filter((item) => item.releaseId || item.type === 'release').slice(0, 5);
      trending.innerHTML = releases.length ? releases.map((item) => `
        <button class="trend-row" type="button" data-route="./player.html">
          <span>${escapeHtml(item.avatar || 'SM')}</span>
          <strong>${escapeHtml(item.title || 'Release')}</strong>
          <small>${escapeHtml(item.status || item.source || 'music')}</small>
        </button>`).join('') : '<div class="trend-row"><span>SM</span><strong>No releases yet</strong><small>Forge a release</small></div>';
    }

    const catalogNode = $('#socialPlatformCatalog');
    if (catalogNode) {
      catalogNode.innerHTML = catalog.length ? catalog.map((item) => `
        <article class="social-platform-card">
          <span>${escapeHtml(item.id)}</span>
          <strong>${escapeHtml(item.name)}</strong>
          <p>${escapeHtml(item.lane || item.protocol || '')}</p>
          <small>${escapeHtml(item.productionBoundary || item.source || '')}</small>
        </article>`).join('') : '<article class="record-card"><h4>No platform catalog loaded</h4><p>Open the Netlify runtime to read the open social spine manifest.</p></article>';
    }

    const summaryNode = $('#socialSummary');
    if (summaryNode) {
      summaryNode.innerHTML = `
        <div class="social-score"><strong>${escapeHtml(summary.feedItems || feedItems.length || 0)}</strong><span>feed posts</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.readyConnectors || 0)}</strong><span>token-ready</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.queuedPosts || 0)}</strong><span>queued</span></div>
        <div class="social-score"><strong>${escapeHtml(summary.publishedPosts || 0)}</strong><span>published</span></div>`;
    }

    const connectorSelects = $$('select[name="connectorId"]');
    connectorSelects.forEach((select) => {
      const current = select.value;
      const options = connectors.map((connector) => `<option value="${escapeHtml(connector.id)}">${escapeHtml(connector.name || connector.platformName || connector.id)} / ${escapeHtml(connector.tokenStatus || connector.status || 'status')}</option>`).join('');
      select.innerHTML = `<option value="">Select connector</option>${options}`;
      if (current && connectors.some((connector) => connector.id === current)) select.value = current;
    });

    const connectorList = $('#socialConnectorList');
    if (connectorList) {
      connectorList.innerHTML = connectors.length ? connectors.map((connector) => recordCard(
        connector.platform || 'social',
        connector.name || connector.platformName || 'Social connector',
        `${connector.instanceUrl || 'no instance'} ${connector.handle ? `/${connector.handle}` : ''}`,
        [connector.status || 'needs-token-env', connector.tokenEnvKey || 'no token env', connector.defaultVisibility || 'visibility']
      )).join('') : '<article class="record-card"><h4>No social connectors yet</h4><p>Add Pixelfed, Mastodon-compatible, or Funkwhale server details. Tokens stay in server env vars.</p></article>';
    }

    const queueList = $('#socialPostQueue');
    if (queueList) {
      queueList.innerHTML = posts.length ? posts.slice(0, 10).map((post) => recordCard(
        post.platform || 'post',
        post.release && post.release.title ? post.release.title : post.id,
        post.statusText || post.caption || 'Queued social post',
        [post.status || 'queued', post.visibility || 'visibility', post.connectorId || 'connector']
      )).join('') : '<article class="record-card"><h4>No queued posts yet</h4><p>Queue an artist/release post, then publish when the provider token is attached.</p></article>';
    }

    const publishSelect = $('#publishPostId');
    if (publishSelect) {
      const current = publishSelect.value;
      publishSelect.innerHTML = `<option value="">Select queued post</option>${posts.map((post) => `<option value="${escapeHtml(post.id)}">${escapeHtml(post.status || 'queued')} / ${escapeHtml((post.release && post.release.title) || post.id)}</option>`).join('')}`;
      if (current && posts.some((post) => post.id === current)) publishSelect.value = current;
    }

    const feedList = $('#federatedFeedList');
    if (feedList) {
      const latestPull = pulls[0];
      const statuses = latestPull && Array.isArray(latestPull.statuses) ? latestPull.statuses : [];
      feedList.innerHTML = statuses.length ? statuses.map((status) => recordCard(
        'fediverse',
        status.account && (status.account.displayName || status.account.acct) ? (status.account.displayName || status.account.acct) : status.id,
        plainText(status.contentHtml || status.url || 'Federated status'),
        [status.visibility || 'public', `${status.boosts || 0} boosts`, `${status.favourites || 0} likes`]
      )).join('') : '<article class="record-card"><h4>No federated feed pull yet</h4><p>Sync a hashtag or local public feed from a connected instance.</p></article>';
    }
  }

  function renderRights() {
    const list = $('#rightsAuditList');
    if (!list) return;
    const releases = state.releases || [];
    if (!releases.length) {
      list.innerHTML = '<article class="record-card"><h4>No release rights yet</h4><p>Forge a release, then save its rights gate before linked audio playback.</p></article>';
      return;
    }
    list.innerHTML = releases.slice(0, 10).map((release) => {
      const rights = rightsStatusFor(release);
      const linked = Array.isArray(release.tracks) ? release.tracks.filter((track) => track.previewUrl).length : 0;
      const cls = rights.blocked ? 'blocked' : rights.status === 'preview-ready' || rights.status === 'distribution-ready' ? 'ready' : '';
      return `<article class="rights-status ${cls}">
        <strong>${escapeHtml(release.title || 'Untitled Release')}</strong>
        <p>${escapeHtml(rights.status)} · ${escapeHtml(linked)} linked preview${linked === 1 ? '' : 's'} · ${escapeHtml(rights.email || 'no rights contact')}</p>
        <div class="record-meta">
          <span class="pill ${rights.ownership ? 'lime' : ''}">ownership ${rights.ownership ? 'yes' : 'needed'}</span>
          <span class="pill ${rights.preview ? 'lime' : ''}">preview ${rights.preview ? 'yes' : 'needed'}</span>
          <span class="pill ${rights.distribution ? 'gold' : ''}">distribution ${rights.distribution ? 'yes' : 'pending'}</span>
          <span class="pill ${rights.blocked ? 'pink' : ''}">${rights.blocked ? 'playback blocked' : release.id}</span>
        </div>
      </article>`;
    }).join('');
  }

  function trackLineForAsset(asset) {
    const title = asset.title || asset.originalName || 'Uploaded Track';
    return `${title} | 180 | ${asset.streamUrl}`;
  }

  function renderAssets() {
    const list = $('#assetList');
    const count = $('#assetCount');
    const assets = Array.isArray(state.assets) ? state.assets : [];
    if (count) count.textContent = fmtNumber(assets.length);
    renderStorageReadiness();
    if (!list) return;
    list.innerHTML = assets.length ? assets.slice(0, 12).map((asset) => `
      <article class="asset-card">
        <header>
          <strong>${escapeHtml(asset.title || asset.originalName || asset.id)}</strong>
          <span class="pill">${escapeHtml(asset.contentType || 'audio')}</span>
        </header>
        <p>${escapeHtml(asset.originalName || asset.id)} · ${escapeHtml(fmtNumber(asset.bytes || 0))} bytes</p>
        <div class="record-meta">
          <span class="pill">${escapeHtml(asset.artistId || 'no artist')}</span>
          <span class="pill">${escapeHtml(asset.releaseId || 'no release')}</span>
          <span class="pill ${asset.storage === 'skyevault-r2-gated-audio' ? 'lime' : ''}">${escapeHtml(asset.storage || 'local proof')}</span>
          <span class="pill ${asset.status === 'ready' || !asset.status ? 'lime' : 'gold'}">${escapeHtml(asset.status || 'ready')}</span>
          <span class="pill">sha ${escapeHtml(String(asset.sha256 || '').slice(0, 10))}</span>
        </div>
        <button class="secondary mini" type="button" data-use-asset="${escapeHtml(asset.id)}">Use in Release Forge</button>
      </article>`).join('') : '<article class="asset-card"><h4>No audio uploaded yet</h4><p>Upload an owned or licensed preview to create a gated stream URL for the release forge.</p></article>';
  }

  function renderStorageReadiness() {
    const target = $('#storageReadiness');
    if (!target) return;
    const storage = state.assetStorage || {};
    const direct = storage.directUploadAvailable ? 'ready' : 'parked';
    target.innerHTML = `<strong>${escapeHtml(storage.mode || 'local')} storage</strong><br>
      durable: ${storage.durable ? 'yes' : 'no'} · direct R2 upload: ${direct}<br>
      base64 cap: ${escapeHtml(fmtNumber(storage.maxBase64UploadBytes || 0))} bytes · direct cap: ${escapeHtml(fmtNumber(storage.maxDirectUploadBytes || 0))} bytes`;
  }

  function renderDrops() {
    const dropsState = state.drops || {};
    const drops = Array.isArray(dropsState.items) ? dropsState.items : [];
    const batches = Array.isArray(dropsState.batches) ? dropsState.batches : [];
    const deploys = Array.isArray(dropsState.deploys) ? dropsState.deploys : [];
    const estimate = dropsState.estimate || {};
    const env = dropsState.env || {};
    const traffic = dropsState.trafficSummary || {};

    const meter = $('#dropCreditMeter');
    if (meter) {
      meter.innerHTML = `
        <div class="prism-row"><span>Estimated credits</span><strong>${escapeHtml(Number(estimate.estimatedCredits || 0).toFixed(2))}</strong></div>
        <div class="prism-row"><span>Bandwidth GB</span><strong>${escapeHtml(Number(estimate.estimatedBandwidthGb || 0).toFixed(3))}</strong></div>
        <div class="prism-row"><span>Reserve fit</span><strong>${estimate.fitsReserve ? 'Yes' : 'No'}</strong></div>
        <div class="prism-row"><span>Live deploy</span><strong>${env.netlify?.liveDeployEnabled ? 'On' : 'Off'}</strong></div>`;
    }

    const envNode = $('#dropEnvStatus');
    if (envNode) {
      envNode.innerHTML = `
        <strong>Credential inventory is redacted</strong>
        <div class="record-meta" style="margin-top:10px">
          <span class="pill ${env.netlify?.configured ? 'lime' : 'gold'}">Netlify ${env.netlify?.configured ? 'ready' : 'missing'}</span>
          <span class="pill ${env.email?.configured ? 'lime' : 'gold'}">Email ${escapeHtml(env.email?.provider || 'local')}</span>
          <span class="pill ${env.privateStorage?.configured ? 'lime' : ''}">${escapeHtml(env.privateStorage?.mode || 'local proof')}</span>
          <span class="pill">${env.netlify?.liveDeployEnabled ? 'production enabled' : 'deploy intent only'}</span>
        </div>`;
    }

    const dropList = $('#dropList');
    if (dropList) {
      dropList.innerHTML = drops.length ? drops.slice(0, 18).map((drop) => recordCard(
        'drop',
        drop.title || drop.dropId,
        `${drop.artistName || drop.artistId || 'artist'} · ${drop.dropType || 'drop'} · ${drop.visibility || 'public'}`,
        [drop.status || 'draft', drop.dropId, drop.rightsStatus || 'rights', drop.tierPolicy || 'tier']
      )).join('') : '<article class="record-card"><h4>No drops yet</h4><p>Create a drop from an uploaded track or release, then submit it to the deploy pool.</p></article>';
    }

    const batchList = $('#dropBatchList');
    if (batchList) {
      batchList.innerHTML = batches.length ? batches.slice(0, 14).map((batch) => recordCard(
        'batch',
        batch.batchId,
        `${(batch.dropIds || []).length} drops · ${Number(batch.estimatedCredits || 0).toFixed(2)} est credits`,
        [batch.status || 'queued', batch.autoApprovalEligibleAt || 'approval not sent', batch.liveBaseUrl || 'no live url']
      )).join('') : '<article class="record-card"><h4>No batches yet</h4><p>Batch compatible drops to maximize one Netlify production deploy.</p></article>';
    }

    const deployList = $('#dropDeployList');
    if (deployList) {
      deployList.innerHTML = deploys.length ? deploys.slice(0, 10).map((deploy) => recordCard(
        'deploy',
        deploy.deployReceiptId || deploy.batchId,
        deploy.liveBaseUrl || deploy.outputDir || 'Deploy intent written locally',
        [deploy.status || 'receipt', deploy.mode || 'mode', deploy.redacted ? 'redacted' : 'receipt']
      )).join('') : '<article class="record-card"><h4>No deploy receipts yet</h4><p>Publishing in local mode writes a deploy intent. Production deploy needs the explicit live flag.</p></article>';
    }

    const trafficNode = $('#dropTrafficSummary');
    if (trafficNode) {
      trafficNode.innerHTML = `
        <div class="social-score"><strong>${escapeHtml(traffic.pageViews || 0)}</strong><span>views</span></div>
        <div class="social-score"><strong>${escapeHtml(traffic.playStarts || 0)}</strong><span>starts</span></div>
        <div class="social-score"><strong>${escapeHtml(traffic.qualifiedStreams || 0)}</strong><span>qualified</span></div>
        <div class="social-score"><strong>${escapeHtml(traffic.downloads || 0)}</strong><span>downloads</span></div>`;
    }

    const dropSelects = $$('select[name="dropId"]');
    dropSelects.forEach((select) => {
      const current = select.value;
      select.innerHTML = `<option value="">Select drop</option>${drops.map((drop) => `<option value="${escapeHtml(drop.dropId)}">${escapeHtml(drop.status || 'draft')} / ${escapeHtml(drop.title || drop.dropId)}</option>`).join('')}`;
      if (current && drops.some((drop) => drop.dropId === current)) select.value = current;
    });

    const batchSelects = $$('select[name="batchId"]');
    batchSelects.forEach((select) => {
      const current = select.value;
      select.innerHTML = `<option value="">Select batch</option>${batches.map((batch) => `<option value="${escapeHtml(batch.batchId)}">${escapeHtml(batch.status || 'queued')} / ${escapeHtml(batch.batchId)}</option>`).join('')}`;
      if (current && batches.some((batch) => batch.batchId === current)) select.value = current;
    });
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
        const assets = await callFunction('music-assets', { query: { action: 'list', artistId: state.lastArtistId } });
        state.assets = Array.isArray(assets.assets) ? assets.assets : [];
        state.assetStorage = assets.storage || null;
      } catch {
        state.assets = [];
        state.assetStorage = null;
      }
      try {
        const drops = await callFunction('music-drops', { query: { action: 'hub' } });
        state.drops = {
          items: Array.isArray(drops.drops) ? drops.drops : [],
          batches: Array.isArray(drops.batches) ? drops.batches : [],
          deploys: Array.isArray(drops.deploys) ? drops.deploys : [],
          trafficSummary: drops.trafficSummary || null,
          env: drops.env || null,
          estimate: drops.estimate || null,
        };
      } catch {
        state.drops = { items: [], batches: [], deploys: [], trafficSummary: null, env: null, estimate: null };
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
      try {
        const social = await callFunction('music-social', { query: { action: 'hub', artistId: state.lastArtistId } });
        state.social = {
          catalog: Array.isArray(social.catalog) ? social.catalog : [],
          connectors: Array.isArray(social.connectors) ? social.connectors : [],
          postQueue: Array.isArray(social.postQueue) ? social.postQueue : [],
          feedItems: Array.isArray(social.feedItems) ? social.feedItems : [],
          stories: Array.isArray(social.stories) ? social.stories : [],
          feedPulls: Array.isArray(social.feedPulls) ? social.feedPulls : [],
          moderation: Array.isArray(social.moderation) ? social.moderation : [],
          summary: social.summary || null,
        };
      } catch {
        state.social = { catalog: [], connectors: [], postQueue: [], feedItems: [], stories: [], feedPulls: [], moderation: [], summary: null };
      }
    }

    setMeters();
    renderRecords();
    renderAnalytics();
    renderExchange();
    renderSocial();
    renderPlayback();
    renderRights();
    renderAssets();
    renderDrops();
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
    $$('[data-route]').forEach((button) => button.addEventListener('click', () => {
      const route = button.dataset.route;
      if (route) window.location.href = route;
    }));
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

  function wirePlayback() {
    const deck = $('#playbackDeck');
    if (!deck) return;
    deck.addEventListener('click', async (event) => {
      const queueButton = event.target.closest('[data-track-index]');
      if (queueButton) {
        await playTrack(Number(queueButton.dataset.trackIndex || 0));
        return;
      }
      const action = event.target.closest('[data-player-action]')?.dataset.playerAction;
      if (action === 'play') await playTrack(state.player.activeIndex);
      if (action === 'stop') await stopPlayback({ completed: false });
      if (action === 'next') await playNextTrack();
    });
  }

  function wireAssetActions() {
    const list = $('#assetList');
    if (!list) return;
    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-use-asset]');
      if (!button) return;
      const asset = state.assets.find((item) => item.id === button.dataset.useAsset);
      if (!asset) return;
      const line = trackLineForAsset(asset);
      const target = $('#releaseForm textarea[name="tracks"]') || $('#uploadedTrackLine');
      if (target && target.tagName === 'TEXTAREA') {
        target.value = target.value ? `${target.value.trim()}\n${line}` : line;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (target) {
        target.value = line;
      }
      navigator.clipboard?.writeText(line).catch(() => {});
      toast('Uploaded track line copied into the release forge.');
    });
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
    let selectedPhoto = null;
    syncIdentityToArtistForm();
    $('[data-action="pull-skye-id"]', form)?.addEventListener('click', () => {
      const identity = syncIdentityToArtistForm({ force: true });
      toast(identity ? 'Skye ID synced into the artist node.' : 'No Skye ID draft found yet.', identity ? 'info' : 'error');
    });
    form.elements.profilePhotoFile?.addEventListener('change', async () => {
      const meta = $('#artistPhotoMeta');
      try {
        if (meta) meta.textContent = 'Preparing artist photo...';
        selectedPhoto = await readArtistPhoto(form, null);
        if (selectedPhoto?.dataUrl) {
          const preview = $('#artistPhotoPreview');
          if (preview) {
            preview.src = selectedPhoto.dataUrl;
            preview.hidden = false;
          }
          if (meta) meta.textContent = `${selectedPhoto.name || 'Artist photo'} linked.`;
        }
      } catch (err) {
        selectedPhoto = null;
        if (meta) meta.textContent = err.message;
        toast(err.message, 'error');
      }
    });
    window.addEventListener('skye0s:identity-updated', (event) => {
      state.identity = event.detail || null;
      syncIdentityToArtistForm();
      fillLastIds();
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        setLoading(form, true);
        const identity = syncIdentityToArtistForm() || {};
        const data = formData(form);
        const photo = selectedPhoto || await readArtistPhoto(form, identity);
        const skyeId = data.skyeId || identity.skyeId || identity.idNumber || '';
        const identityPayload = publishArtistIdentity({
          ...identity,
          name: data.name,
          email: data.email,
          skyeId,
          idNumber: skyeId || identity.idNumber,
          identityId: data.identityId || identity.identityId || skyeId,
          profileType: 'artist',
          photoDataUrl: photo && photo.dataUrl,
          photoName: photo && photo.name,
          photoType: photo && photo.type,
          source: 'SkyeMusicNexus',
        }) || identity;
        const created = await callFunction('music-artists', {
          method: 'POST',
          body: {
            action: 'register',
            name: data.name,
            email: data.email,
            skyeId,
            identityId: data.identityId || identityPayload.identityId || skyeId,
            profilePhoto: photo,
            crossAppIdentity: identityPayload,
            phone: data.phone,
            genre: parseCsv(data.genre),
            bio: data.bio,
            socialLinks: {},
          },
        });
        state.lastArtistId = created.artistId || (created.artist && created.artist.id) || '';
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        renderResult('#artistResult', 'Artist node created', {
          id: state.lastArtistId,
          skyeId: created.artist && (created.artist.skyeId || created.artist.identityId),
          status: created.artist && created.artist.status,
          photo: created.artist && created.artist.profilePhoto ? 'linked' : 'none',
          name: created.artist && created.artist.name,
        });
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

  function wireUploadForm() {
    const form = $('#assetUploadForm');
    if (!form) return;
    const fileInput = form.elements.audioFile;
    const dropZone = $('[data-song-drop-zone]', form);
    const fileName = $('#songDropFileName');
    const titleInput = form.elements.title;
    function setSelectedSong(file) {
      if (!file || typeof file === 'string') {
        if (fileName) fileName.textContent = 'No song selected yet';
        dropZone?.classList.remove('has-file');
        return;
      }
      if (fileName) fileName.textContent = `${file.name} · ${fmtNumber(file.size || 0)} bytes`;
      dropZone?.classList.add('has-file');
      if (titleInput && !titleInput.value) titleInput.value = String(file.name || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    }
    fileInput?.addEventListener('change', () => setSelectedSong(fileInput.files && fileInput.files[0]));
    if (dropZone && fileInput) {
      ['dragenter', 'dragover'].forEach((type) => dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        dropZone.classList.add('is-dragging');
      }));
      ['dragleave', 'drop'].forEach((type) => dropZone.addEventListener(type, () => {
        dropZone.classList.remove('is-dragging');
      }));
      dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (!file) return;
        if (!String(file.type || '').startsWith('audio/')) {
          toast('Drop an audio file for this lane.', 'error');
          return;
        }
        const transfer = new DataTransfer();
        transfer.items.add(file);
        fileInput.files = transfer.files;
        setSelectedSong(file);
      });
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      const file = data.audioFile;
      try {
        if (!file || typeof file === 'string' || !file.size) throw new Error('Choose an audio file first.');
        setLoading(form, true);
        const uploaded = await uploadAudioFile(data, file);
        if (uploaded.asset?.id) {
          state.assets = [uploaded.asset, ...state.assets.filter((asset) => asset.id !== uploaded.asset.id)];
          state.lastArtistId = data.artistId || state.lastArtistId;
          state.lastReleaseId = data.releaseId || state.lastReleaseId;
          if (state.lastArtistId) sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
          if (state.lastReleaseId) sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        }
        const line = uploaded.asset ? trackLineForAsset(uploaded.asset) : '';
        const lineNode = $('#uploadedTrackLine');
        if (lineNode) lineNode.value = line;
        renderResult('#assetUploadResult', 'Audio uploaded into gated storage', {
          id: uploaded.asset && uploaded.asset.id,
          bytes: uploaded.asset && fmtNumber(uploaded.asset.bytes),
          track: line,
        });
        renderAssets();
        toast('Audio uploaded. Add the generated track line to a release, then save rights.');
      } catch (err) {
        renderResult('#assetUploadResult', 'Audio upload failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  async function uploadAudioFile(data, file) {
    const title = data.title || file.name;
    const payload = {
      title,
      artistId: data.artistId,
      releaseId: data.releaseId,
      fileName: file.name,
      contentType: file.type || 'audio/mpeg',
      bytes: file.size,
    };
    const status = await callFunction('music-assets', { query: { action: 'storage-status' } }).catch(() => null);
    const storage = status && status.storage ? status.storage : state.assetStorage;
    state.assetStorage = storage || state.assetStorage;
    if (storage && storage.directUploadAvailable) {
      const session = await callFunction('music-assets', {
        method: 'POST',
        body: { action: 'create-upload-session', ...payload },
      });
      const upload = await fetch(session.upload.url, {
        method: session.upload.method || 'PUT',
        headers: session.upload.headers || { 'content-type': payload.contentType },
        body: file,
      });
      if (!upload.ok) throw new Error(`Direct R2 upload failed with ${upload.status}. Check MusicNexus R2 CORS and credentials.`);
      return callFunction('music-assets', {
        method: 'POST',
        body: { action: 'complete-upload', id: session.asset.id, bytes: file.size },
      });
    }
    if (storage && storage.maxBase64UploadBytes && file.size > Number(storage.maxBase64UploadBytes)) {
      throw new Error('This file needs the direct R2 upload lane. Enable MUSIC_NEXUS_STORAGE_BACKEND=r2 and MUSIC_NEXUS_ENABLE_DIRECT_UPLOAD=1.');
    }
    const dataUrl = await fileToDataUrl(file);
    return callFunction('music-assets', {
      method: 'POST',
      body: { action: 'upload', ...payload, dataBase64: dataUrl },
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

  function wireSocialConnectorForm() {
    const form = $('#socialConnectorForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const saved = await callFunction('music-social', {
          method: 'POST',
          body: {
            action: 'save-connector',
            platform: data.platform,
            name: data.name,
            instanceUrl: data.instanceUrl,
            handle: data.handle,
            tokenEnvKey: data.tokenEnvKey,
            readTokenEnvKey: data.readTokenEnvKey,
            defaultVisibility: data.defaultVisibility,
          },
        });
        renderResult('#socialConnectorResult', 'Social connector saved', {
          connector: saved.connector && saved.connector.id,
          platform: saved.connector && saved.connector.platformName,
          token: saved.connector && saved.connector.tokenStatus,
        });
        toast('Open social connector saved.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#socialConnectorResult', 'Connector save failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireFeedComposeForm() {
    const form = $('#feedComposeForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const created = await callFunction('music-social', {
          method: 'POST',
          body: {
            action: 'create-feed-post',
            artistId: data.artistId,
            releaseId: data.releaseId,
            caption: data.caption,
            hashtags: data.hashtags,
            mediaUrl: data.mediaUrl,
            altText: data.altText,
            visibility: 'local-feed',
          },
        });
        state.lastArtistId = data.artistId;
        if (data.releaseId) state.lastReleaseId = data.releaseId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        if (state.lastReleaseId) sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#feedComposeResult', 'Feed post live', {
          post: created.post && created.post.id,
          artist: created.post && created.post.artistId,
          state: created.post && created.post.status,
        });
        form.reset();
        toast('Feed post published inside MusicNexus.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#feedComposeResult', 'Feed post failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireFeedActions() {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-feed-action]');
      if (!button) return;
      const feedAction = button.dataset.feedAction;
      if (feedAction === 'comment') {
        const card = button.closest('[data-feed-post]');
        const input = card && card.querySelector('.feed-comment-form input[name="body"]');
        if (input) input.focus();
        return;
      }
      try {
        const targetId = button.dataset.feedTarget;
        const artistId = button.dataset.feedArtist || state.lastArtistId || currentSkyeArtistId();
        await callFunction('music-social', {
          method: 'POST',
          body: { action: 'feed-action', feedAction, targetId, artistId },
        });
        toast(`${feedAction} saved.`);
        await refreshRecords({ quiet: true });
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    document.addEventListener('submit', async (event) => {
      const form = event.target.closest('.feed-comment-form');
      if (!form) return;
      event.preventDefault();
      const targetId = form.dataset.feedCommentForm;
      const body = form.elements.body && form.elements.body.value;
      if (!body || !body.trim()) return;
      try {
        await callFunction('music-social', {
          method: 'POST',
          body: {
            action: 'feed-action',
            feedAction: 'comment',
            targetId,
            artistId: state.lastArtistId || currentSkyeArtistId(),
            body,
          },
        });
        form.reset();
        toast('Comment posted.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  function wireSocialPostForm() {
    const form = $('#socialPostForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const queued = await callFunction('music-social', {
          method: 'POST',
          body: {
            action: 'queue-post',
            connectorId: data.connectorId,
            artistId: data.artistId,
            releaseId: data.releaseId,
            caption: data.caption,
            hashtags: data.hashtags,
            mediaUrl: data.mediaUrl,
            altText: data.altText,
            visibility: data.visibility,
            language: data.language,
          },
        });
        state.lastArtistId = data.artistId;
        if (data.releaseId) state.lastReleaseId = data.releaseId;
        sessionStorage.setItem('skye-music-nexus:lastArtistId', state.lastArtistId);
        if (state.lastReleaseId) sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#socialPostResult', 'Social post queued', {
          post: queued.post && queued.post.id,
          platform: queued.post && queued.post.platform,
          state: queued.post && queued.post.status,
        });
        toast('Social release post queued.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#socialPostResult', 'Social queue failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireSocialPublishForm() {
    const form = $('#socialPublishForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const published = await callFunction('music-social', {
          method: 'POST',
          body: {
            action: 'publish-post',
            postId: data.postId,
          },
        });
        const publication = published.publication || {};
        renderResult('#socialPublishResult', publication.ok ? 'Provider publish complete' : 'Provider token required', {
          post: published.post && published.post.id,
          status: published.post && published.post.status,
          url: publication.statusUrl || publication.note || publication.tokenEnvKey || 'pending',
        });
        toast(publication.ok ? 'Social post published through provider.' : 'Post is queued; attach provider token env to publish.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#socialPublishResult', 'Provider publish failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireSocialFeedForm() {
    const form = $('#socialFeedForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const synced = await callFunction('music-social', {
          method: 'POST',
          body: {
            action: 'sync-feed',
            connectorId: data.connectorId,
            artistId: data.artistId,
            hashtag: data.hashtag,
            limit: data.limit,
          },
        });
        renderResult('#socialFeedResult', 'Federated feed synced', {
          pull: synced.pull && synced.pull.id,
          statuses: synced.pull && synced.pull.statusCount,
          source: synced.pull && synced.pull.sourceUrl,
        });
        toast('Federated feed read into MusicNexus.');
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult('#socialFeedResult', 'Feed sync failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireRightsForm() {
    const form = $('#rightsForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const updated = await callFunction('music-releases', {
          method: 'POST',
          body: {
            action: 'update-rights',
            id: data.id,
            rights: {
              ownershipAttested: data.ownershipAttested === 'true',
              previewUseAuthorized: data.previewUseAuthorized === 'true',
              distributionAuthorized: data.distributionAuthorized === 'true',
              samplesCleared: data.samplesCleared === 'true',
              coverMechanicalLicense: data.coverMechanicalLicense === 'true',
              publisherClearance: data.publisherClearance === 'true',
              takedownContactEmail: data.takedownContactEmail,
              notes: data.notes,
            },
          },
        });
        if (updated.release?.id) {
          state.releases = state.releases.map((release) => release.id === updated.release.id ? updated.release : release);
          if (!state.releases.some((release) => release.id === updated.release.id)) state.releases.unshift(updated.release);
        }
        state.lastReleaseId = data.id;
        sessionStorage.setItem('skye-music-nexus:lastReleaseId', state.lastReleaseId);
        renderResult('#rightsResult', 'Rights gate saved', { release: data.id, status: updated.rights && updated.rights.status, contact: updated.rights && updated.rights.takedownContactEmail });
        renderRights();
        renderPlayback();
        toast('Rights gate saved for this release.');
      } catch (err) {
        renderResult('#rightsResult', 'Rights gate failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireTakedownForm() {
    const form = $('#takedownForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = formData(form);
      try {
        setLoading(form, true);
        const held = await callFunction('music-releases', {
          method: 'POST',
          body: {
            action: 'takedown-request',
            id: data.id,
            requesterEmail: data.requesterEmail,
            reason: data.reason,
          },
        });
        if (held.release?.id) {
          state.releases = state.releases.map((release) => release.id === held.release.id ? held.release : release);
          if (!state.releases.some((release) => release.id === held.release.id)) state.releases.unshift(held.release);
        }
        renderResult('#takedownResult', 'Playback hold placed', { release: data.id, request: held.request && held.request.id, status: held.rights && held.rights.status });
        renderRights();
        renderPlayback();
        toast('Playback hold placed pending rights review.');
      } catch (err) {
        renderResult('#takedownResult', 'Takedown hold failed', { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function wireDropForms() {
    const createForm = $('#dropCreateForm');
    if (createForm) {
      createForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = formData(createForm);
        try {
          setLoading(createForm, true);
          const created = await callFunction('music-drops', {
            method: 'POST',
            body: {
              action: 'create-drop',
              artistId: data.artistId,
              artistName: data.artistName,
              releaseId: data.releaseId,
              title: data.title,
              dropType: data.dropType,
              visibility: data.visibility,
              rightsStatus: data.rightsStatus,
              tierPolicy: data.tierPolicy,
              story: data.story,
              coverArtUrl: data.coverArtUrl,
              downloadAllowed: data.downloadAllowed === 'true',
              tracks: parseTracks(data.tracks),
            },
          });
          renderResult('#dropCreateResult', 'Drop created', { id: created.drop && created.drop.dropId, status: created.drop && created.drop.status, tier: created.drop && created.drop.tierPolicy });
          toast('Drop draft created.');
          await refreshRecords({ quiet: true });
        } catch (err) {
          renderResult('#dropCreateResult', 'Drop create failed', { error: err.message });
          toast(err.message, 'error');
        } finally {
          setLoading(createForm, false);
        }
      });
    }

    const submitForm = $('#dropSubmitForm');
    if (submitForm) {
      submitForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = formData(submitForm);
        try {
          setLoading(submitForm, true);
          const submitted = await callFunction('music-drops', {
            method: 'POST',
            body: { action: 'submit-drop', dropId: data.dropId },
          });
          renderResult('#dropSubmitResult', 'Drop moved to deploy pool', { id: submitted.drop && submitted.drop.dropId, status: submitted.drop && submitted.drop.status });
          toast('Drop is in the deploy pool.');
          await refreshRecords({ quiet: true });
        } catch (err) {
          renderResult('#dropSubmitResult', 'Drop submit failed', { error: err.message });
          toast(err.message, 'error');
        } finally {
          setLoading(submitForm, false);
        }
      });
    }

    const batchForm = $('#dropBatchForm');
    if (batchForm) {
      batchForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = formData(batchForm);
        try {
          setLoading(batchForm, true);
          const batched = await callFunction('music-drops', {
            method: 'POST',
            body: { action: 'form-batch', dropIds: parseCsv(data.dropIds) },
          });
          renderResult('#dropBatchResult', 'Batch formed', { id: batched.batch && batched.batch.batchId, drops: batched.batch && batched.batch.dropIds && batched.batch.dropIds.length, credits: batched.batch && Number(batched.batch.estimatedCredits || 0).toFixed(2) });
          toast('Deploy batch formed.');
          await refreshRecords({ quiet: true });
        } catch (err) {
          renderResult('#dropBatchResult', 'Batch failed', { error: err.message });
          toast(err.message, 'error');
        } finally {
          setLoading(batchForm, false);
        }
      });
    }

    async function runBatchAction(form, action, resultTarget, successTitle, toastText) {
      const data = formData(form);
      try {
        setLoading(form, true);
        const result = await callFunction('music-drops', {
          method: 'POST',
          body: { action, batchId: data.batchId },
        });
        renderResult(resultTarget, successTitle, {
          batch: result.batch && result.batch.batchId,
          status: result.batch && result.batch.status,
          receipt: result.approval?.approvalId || result.receipt?.approvalId || result.deploy?.deployReceiptId || result.outputDir || '',
        });
        toast(toastText);
        await refreshRecords({ quiet: true });
      } catch (err) {
        renderResult(resultTarget, `${successTitle} failed`, { error: err.message });
        toast(err.message, 'error');
      } finally {
        setLoading(form, false);
      }
    }

    const approvalForm = $('#dropApprovalForm');
    if (approvalForm) approvalForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runBatchAction(approvalForm, 'send-approval', '#dropApprovalResult', 'Approval sent', 'Approval payload sent or receipted.');
    });

    const approveForm = $('#dropManualApproveForm');
    if (approveForm) approveForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runBatchAction(approveForm, 'approve-batch', '#dropManualApproveResult', 'Batch approved', 'Batch manually approved.');
    });

    const brainForm = $('#dropBrainForm');
    if (brainForm) brainForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runBatchAction(brainForm, 'run-approval-brain', '#dropBrainResult', 'Approval brain ran', '72-hour approval brain evaluated the batch.');
    });

    const buildForm = $('#dropBuildForm');
    if (buildForm) buildForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runBatchAction(buildForm, 'build-static-bundle', '#dropBuildResult', 'Bundle built', 'Static drop bundle generated.');
    });

    const publishForm = $('#dropPublishForm');
    if (publishForm) publishForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runBatchAction(publishForm, 'publish-batch', '#dropPublishResult', 'Publish ran', 'Publish wrote a deploy receipt or live deploy.');
    });
  }

  function wireForms() {
    wireArtistForm();
    wireReleaseForm();
    wireUploadForm();
    wirePaymentForm();
    wireOpsForm();
    wireReviewForm();
    wirePayoutForm();
    wireContentRequestForm();
    wireMessageForm();
    wireCommunityPostForm();
    wireReleaseCampaignForm();
    wireFeedComposeForm();
    wireFeedActions();
    wireSocialConnectorForm();
    wireSocialPostForm();
    wireSocialPublishForm();
    wireSocialFeedForm();
    wireRightsForm();
    wireTakedownForm();
    wireDropForms();
  }

  function ensureMcpChrome() {
    const pageName = (window.location.pathname.split('/').pop() || 'index.html').replace(/\.html$/i, '') || 'index';
    const roomName = pageName === 'index' ? 'dashboard' : pageName;
    document.documentElement.setAttribute('data-mcp-neon-scrollbar', '');
    document.body.classList.add('one-music-site', 'skyesol-living-page', `room-${roomName}`);

    const addChromeNode = (selector, createNode) => {
      if (document.querySelector(selector)) return null;
      const node = createNode();
      document.body.insertBefore(node, document.body.firstChild);
      return node;
    };

    addChromeNode('.neon-motion-chrome', () => {
      const node = document.createElement('div');
      node.className = 'neon-motion-chrome';
      node.dataset.motionChrome = '';
      node.setAttribute('aria-hidden', 'true');
      return node;
    });

    addChromeNode('.skyesol-living-field', () => {
      const node = document.createElement('canvas');
      node.className = 'living-background skyesol-living-field';
      node.setAttribute('aria-hidden', 'true');
      return node;
    });

    addChromeNode('.skyesol-grain', () => {
      const node = document.createElement('div');
      node.className = 'skyesol-grain';
      node.setAttribute('aria-hidden', 'true');
      return node;
    });

    addChromeNode('.skyesol-scanline', () => {
      const node = document.createElement('div');
      node.className = 'skyesol-scanline';
      node.setAttribute('aria-hidden', 'true');
      return node;
    });

    if (!window.__skyeMusicNexusPublicLivingMounted && typeof window.mountSkyeSolLivingBackground === 'function') {
      window.__skyeMusicNexusPublicLivingMounted = true;
      window.mountSkyeSolLivingBackground({
        canvasSelector: '.skyesol-living-field',
        particleDensity: 18000,
        maxParticles: 96,
        minParticles: 34,
      });
    }
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
    ensureMcpChrome();
    initCanvas();
    wireChrome();
    wirePlayback();
    wireAssetActions();
    wireOperatorDialog();
    wireForms();
    updateSessionChip(null);
    setMeters();
    renderRecords();
    renderAnalytics();
    renderExchange();
    renderSocial();
    renderPlayback();
    renderRights();
    renderAssets();
    renderDrops();
    await refreshSession();
    await refreshRecords({ quiet: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
