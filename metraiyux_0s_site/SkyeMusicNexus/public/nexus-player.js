(() => {
  const PUBLIC_ORIGIN = 'https://skye-music-nexus.pages.dev';
  const WORKER_ORIGIN = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
  const TELEMETRY_ENDPOINT = `${WORKER_ORIGIN}/api/skymusicnexus/music-drops`;
  const TELEMETRY_CONTENT_TYPE = 'text/plain;charset=UTF-8';
  const CATALOG_URLS = [
    '/SkyeMusicNexus/public/data/playlists.json',
    './data/playlists.json',
    '../public/data/playlists.json',
    `${PUBLIC_ORIGIN}/public/data/playlists.json`,
  ];
  const STREAM_KEY = 'skymusicnexus.streamLedger.v1';
  const LIBRARY_KEY = 'skymusicnexus.playerLibrary.v1';
  const LISTENER_KEY = 'skymusicnexus.listenerId.v1';
  const SESSION_KEY = 'skymusicnexus.sessionId.v1';
  const QUEUE_KEY = 'skymusicnexus.radioQueue.v1';
  const PLAYER_STATE_KEY = 'skymusicnexus.playerState.v1';
  const OUTBOX_KEY = 'skymusicnexus.telemetryOutbox.v1';
  const SEEN_AWARD_KEY = 'skymusicnexus.seenAwards.v1';
  const PLAYER_SKIP_RE = /\/(daw|studio|upload|admin|command-dashboard)\.html\b|\/pics2vid\//i;

  if (window.SkyeNexusPlayer || PLAYER_SKIP_RE.test(location.pathname)) return;

  const state = {
    catalog: null,
    tracks: [],
    trackById: new Map(),
    queue: [],
    index: -1,
    current: null,
    listenerId: persistentId(LISTENER_KEY, 'listener'),
    sessionId: sessionId(),
    radioMode: true,
    activeAudio: null,
    nativeBindings: new WeakMap(),
    qualifiedSent: false,
    playStartSent: false,
    raf: 0,
    lastDraw: 0,
    lastStateSave: 0,
    ctx: null,
    analyser: null,
    data: null,
    library: loadLibrary(),
    ledger: loadJson(STREAM_KEY, { events: [], totals: {}, updatedAt: '' }),
    outbox: loadJson(OUTBOX_KEY, { events: [], updatedAt: '' }),
    seenAwards: loadJson(SEEN_AWARD_KEY, { ids: [] }),
  };

  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('skymusicnexus.player.v1') : null;

  function loadJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '');
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value, null, 2));
  }

  function uniqueIds(values) {
    const seen = new Set();
    return (values || [])
      .map((id) => String(id || '').trim())
      .filter((id) => id && !seen.has(id) && seen.add(id));
  }

  function playlistTrackIds(playlist = {}) {
    const rows = playlist.trackIds || playlist.tracks || [];
    return uniqueIds((Array.isArray(rows) ? rows : []).map((item) => {
      if (typeof item === 'string') return item;
      return item?.trackId || item?.id || item?.productId || '';
    }));
  }

  function cleanPlaylist(playlist = {}) {
    return {
      playlistId: String(playlist.playlistId || playlist.id || `library-${Date.now()}-${Math.random().toString(16).slice(2)}`).slice(0, 140),
      title: String(playlist.title || playlist.name || 'Nexus Playlist').trim().slice(0, 90) || 'Nexus Playlist',
      kind: 'user',
      description: String(playlist.description || '').trim().slice(0, 240),
      trackIds: playlistTrackIds(playlist),
      createdAt: playlist.createdAt || new Date().toISOString(),
      updatedAt: playlist.updatedAt || new Date().toISOString(),
    };
  }

  function mergePlaylists(primary = [], secondary = []) {
    const order = [];
    const byId = new Map();
    [...primary, ...secondary].forEach((playlist) => {
      const clean = cleanPlaylist(playlist);
      if (!byId.has(clean.playlistId)) order.push(clean.playlistId);
      const existing = byId.get(clean.playlistId) || {};
      byId.set(clean.playlistId, {
        ...existing,
        ...clean,
        trackIds: uniqueIds([...(existing.trackIds || []), ...(clean.trackIds || [])]),
      });
    });
    return order.map((id) => byId.get(id)).filter(Boolean);
  }

  function normalizeLibrary(value = {}) {
    const source = value && typeof value === 'object' ? value : {};
    const playlists = Array.isArray(source) ? source : (Array.isArray(source.playlists) ? source.playlists : []);
    return {
      likedTrackIds: uniqueIds(source.likedTrackIds || source.savedTrackIds || []),
      playlists: playlists.map(cleanPlaylist),
      updatedAt: source.updatedAt || '',
    };
  }

  function loadLibrary() {
    return normalizeLibrary(loadJson(LIBRARY_KEY, { likedTrackIds: [], playlists: [] }));
  }

  function saveLibrary() {
    state.library = normalizeLibrary({
      ...state.library,
      updatedAt: new Date().toISOString(),
    });
    saveJson(LIBRARY_KEY, state.library);
    window.dispatchEvent(new CustomEvent('skymusicnexus:library-change', { detail: state.library }));
  }

  function persistentId(key, prefix) {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, next);
    return next;
  }

  function sessionId() {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  }

  function shuffleIds(ids) {
    return [...(ids || [])]
      .map((id) => ({ id, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((row) => row.id);
  }

  function normalizeUrl(value) {
    try {
      const url = new URL(value || '', location.href);
      return url.href.replace(/^https?:\/\/skye-music-nexus\.pages\.dev\/SkyeMusicNexus\//i, 'https://skye-music-nexus.pages.dev/');
    } catch {
      return String(value || '');
    }
  }

  function publicArtistStorefrontUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw, `${PUBLIC_ORIGIN}/public/`);
      const publicPath = url.pathname
        .replace(/^\/SkyeMusicNexus\/artist-storefronts(?=\/|$)/i, '/artist-storefronts')
        .replace(/^\/SkyeMusicNexus\/public\/artist-storefronts(?=\/|$)/i, '/artist-storefronts')
        .replace(/^\/public\/artist-storefronts(?=\/|$)/i, '/artist-storefronts');
      if (publicPath.startsWith('/artist-storefronts/')) return `${PUBLIC_ORIGIN}${publicPath}${url.search}${url.hash}`;
      if (publicPath === '/artist-storefronts') return `${PUBLIC_ORIGIN}/artist-storefronts/${url.search}${url.hash}`;
    } catch {}
    return '';
  }

  function catalogImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return `${PUBLIC_ORIGIN}/assets/og-card.svg`;
    const artistAsset = publicArtistStorefrontUrl(raw);
    if (artistAsset && /\.(?:png|jpe?g|webp|gif|avif|svg)(?:$|\?)/i.test(new URL(artistAsset).pathname)) return `${PUBLIC_ORIGIN}/assets/og-card.svg`;
    return normalizeUrl(raw);
  }

  function normalizeMusicPath(value) {
    let path = String(value || '');
    try {
      path = new URL(path, `${PUBLIC_ORIGIN}/public/`).pathname;
    } catch {}
    path = path
      .replace(/^\/SkyeMusicNexus(?=\/)/i, '')
      .replace(/\/index\.html$/i, '/')
      .replace(/\/+$/, '/');
    return path.startsWith('/') ? path : `/${path}`;
  }

  function textKey(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .replace(/&amp;/g, '&')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function trackPathCandidates(track = {}) {
    return uniqueIds([track.dropUrl, track.localAudioHref, track.audioUrl, track.storeUrl]
      .map((value) => normalizeMusicPath(value))
      .filter((value) => value && value !== '/'));
  }

  function trackForMusicPath(path) {
    const current = normalizeMusicPath(path);
    return [...state.tracks]
      .map((track) => ({
        track,
        paths: trackPathCandidates(track).filter((candidate) => {
          const base = candidate.replace(/\/audio\/[^/]+$/i, '/');
          return current === candidate || current.startsWith(candidate) || current === base || current.startsWith(base);
        }),
      }))
      .filter((row) => row.paths.length)
      .sort((a, b) => Math.max(...b.paths.map((item) => item.length)) - Math.max(...a.paths.map((item) => item.length)))[0]?.track || null;
  }

  function trackForContainer(container) {
    if (!container) return null;
    const explicit = container.querySelector('[data-nexus-track-id], [data-track-id]')?.dataset?.nexusTrackId || container.dataset?.nexusTrackId || container.dataset?.trackId || '';
    if (explicit && state.trackById.has(explicit)) return state.trackById.get(explicit);
    const dropLink = [...container.querySelectorAll('a[href]')]
      .map((link) => link.getAttribute('href') || '')
      .find((href) => /\/drops\//i.test(href));
    const linked = dropLink ? trackForMusicPath(new URL(dropLink, location.href).pathname) : null;
    if (linked) return linked;
    const heading = textKey(container.querySelector('h1,h2,h3,strong')?.textContent || '');
    if (!heading) return null;
    return state.tracks.find((track) => {
      const title = textKey(track.title || track.trackId);
      return title === heading || title.startsWith(heading) || heading.startsWith(title);
    }) || null;
  }

  function hydrateNativeAudioElements() {
    const pageTrack = trackForMusicPath(location.pathname);
    document.querySelectorAll('audio').forEach((audio) => {
      if (!audio || audio === ui.audio) return;
      const container = audio.closest('.release-track,.track,.panel,.music-player-panel,article,section,main') || audio.parentElement;
      const track = (audio.dataset?.nexusTrackId && state.trackById.get(audio.dataset.nexusTrackId))
        || trackForContainer(container)
        || pageTrack;
      if (!track) return;
      audio.dataset.nexusTrackId = track.trackId;
      audio.dataset.trackId = track.trackId;
      if (!audio.getAttribute('aria-label')) audio.setAttribute('aria-label', `${track.title || 'Nexus track'} by ${track.artistName || 'SkyeMusicNexus'}`);
      const hasSource = Boolean(audio.getAttribute('src') || audio.querySelector('source[src]'));
      const source = track.audioUrl || track.localAudioHref || '';
      if (!hasSource && source) {
        audio.src = source;
        audio.preload = audio.preload || 'metadata';
      }
    });
  }

  function playbackUrl(track) {
    const raw = track?.audioUrl || track?.localAudioHref || track?.previewUrl || '';
    if (!raw) return '';
    try {
      return new URL(raw, location.href).href;
    } catch {
      return String(raw || '');
    }
  }

  function qualifiedThreshold(track, audio) {
    const duration = Number(audio?.duration || track?.duration || track?.durationSeconds || 0);
    if (duration > 0) return Math.max(5, Math.min(30, duration * 0.5));
    return 30;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function firstExistingImage(track) {
    return catalogImageUrl(track?.coverImage || track?.artistImage || '');
  }

  function formatTime(value) {
    const seconds = Number.isFinite(value) ? Math.max(0, value) : 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function createShell() {
    const player = document.createElement('section');
    player.className = 'skye-nexus-player';
    player.setAttribute('aria-label', 'SkyeMusicNexus player');
    player.innerHTML = `
      <img class="skye-nexus-player__art" data-player-art src="${PUBLIC_ORIGIN}/assets/og-card.svg" alt="">
      <div class="skye-nexus-player__meta">
        <strong data-player-title>SkyeMusicNexus Player</strong>
        <span data-player-artist>Pick any track in the network.</span>
        <div class="skye-nexus-player__bar">
          <span class="skye-nexus-player__stat" data-player-current>0:00</span>
          <input class="skye-nexus-player__progress" data-player-progress type="range" min="0" max="1000" value="0" aria-label="Playback progress">
          <span class="skye-nexus-player__stat" data-player-duration>0:00</span>
        </div>
      </div>
      <div class="skye-nexus-player__controls">
        <button class="skye-nexus-player__button" type="button" data-player-action="previous" title="Previous">Prev</button>
        <button class="skye-nexus-player__button skye-nexus-player__button--wide" type="button" data-player-action="toggle" title="Play or pause">Play</button>
        <button class="skye-nexus-player__button" type="button" data-player-action="resume" title="Resume saved session">Resume</button>
        <button class="skye-nexus-player__button" type="button" data-player-action="next" title="Next">Next</button>
        <button class="skye-nexus-player__button" type="button" data-player-action="radio" title="Shuffle every Music Nexus track">Radio</button>
        <button class="skye-nexus-player__button" type="button" data-player-action="like" title="Save track">Save</button>
        <button class="skye-nexus-player__button" type="button" data-player-action="queue" title="Open queue">Queue</button>
      </div>
      <canvas class="skye-nexus-player__visual" data-player-visual width="480" height="96" aria-label="Live neural playback map"></canvas>
      <audio data-player-audio crossorigin="anonymous" preload="metadata"></audio>
    `;
    const drawer = document.createElement('aside');
    drawer.className = 'skye-nexus-player__drawer';
    drawer.hidden = true;
    drawer.innerHTML = '<h2>Queue</h2><div data-player-queue></div>';
    document.body.append(player, drawer);
    document.body.classList.add('skye-nexus-player-mounted');
    return {
      root: player,
      drawer,
      art: player.querySelector('[data-player-art]'),
      title: player.querySelector('[data-player-title]'),
      artist: player.querySelector('[data-player-artist]'),
      progress: player.querySelector('[data-player-progress]'),
      current: player.querySelector('[data-player-current]'),
      duration: player.querySelector('[data-player-duration]'),
      toggle: player.querySelector('[data-player-action="toggle"]'),
      like: player.querySelector('[data-player-action="like"]'),
      queue: drawer.querySelector('[data-player-queue]'),
      canvas: player.querySelector('[data-player-visual]'),
      audio: player.querySelector('[data-player-audio]'),
    };
  }

  const ui = createShell();

  async function fetchCatalog() {
    for (const url of CATALOG_URLS) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) continue;
        const catalog = await response.json();
        if (Array.isArray(catalog.tracks) && catalog.tracks.length) return catalog;
      } catch {}
    }
    return { tracks: [], charts: { overall: [] }, systemPlaylists: [] };
  }

  function normalizeQueue(trackIds) {
    const ids = (trackIds || []).filter((id) => state.trackById.has(id));
    return ids.length ? ids : state.tracks.map((track) => track.trackId);
  }

  function renderQueue() {
    const tracks = normalizeQueue(state.queue).map((id) => state.trackById.get(id)).filter(Boolean).slice(0, 80);
    ui.queue.innerHTML = tracks.length
      ? tracks.map((track, index) => `
        <article class="skye-nexus-player__queue-item">
          <img src="${escapeHtml(firstExistingImage(track))}" alt="">
          <span><strong>${escapeHtml(track.title)}</strong><span>${escapeHtml(track.artistName)} - ${escapeHtml(track.genre || '')}</span></span>
          <button class="skye-nexus-player__button" type="button" data-player-queue-track="${escapeHtml(track.trackId)}">${index + 1}</button>
        </article>
      `).join('')
      : '<p>No playable tracks loaded.</p>';
  }

  function saveQueue() {
    saveJson(QUEUE_KEY, {
      queue: state.queue,
      index: state.index,
      radioMode: state.radioMode,
      updatedAt: new Date().toISOString(),
    });
  }

  function playerSnapshot() {
    const audio = activeAudio();
    return {
      currentTrackId: state.current?.trackId || '',
      queue: [...state.queue],
      index: state.index,
      radioMode: state.radioMode,
      currentTime: Math.max(0, Math.round(Number(audio?.currentTime || 0))),
      durationSeconds: Math.max(0, Math.round(Number(audio?.duration || state.current?.duration || state.current?.durationSeconds || 0))),
      paused: audio ? audio.paused !== false : true,
      updatedAt: new Date().toISOString(),
    };
  }

  function savePlayerState(force = false) {
    const now = Date.now();
    if (!force && now - state.lastStateSave < 1500) return;
    state.lastStateSave = now;
    saveJson(PLAYER_STATE_KEY, playerSnapshot());
  }

  function loadTrackForResume(trackId, currentTime = 0) {
    const track = state.trackById.get(trackId);
    const src = playbackUrl(track);
    if (!track || !src) return false;
    state.qualifiedSent = false;
    state.playStartSent = false;
    state.activeAudio = ui.audio;
    applyCurrent(track);
    if (ui.audio.src !== src) ui.audio.src = src;
    const seekTo = Math.max(0, Number(currentTime || 0) || 0);
    if (seekTo) {
      const setTime = () => {
        const duration = Number(ui.audio.duration || track.duration || track.durationSeconds || 0);
        ui.audio.currentTime = duration ? Math.min(seekTo, Math.max(0, duration - 1)) : seekTo;
        updateProgress();
      };
      if (ui.audio.readyState >= 1) setTime();
      else ui.audio.addEventListener('loadedmetadata', setTime, { once: true });
    }
    ui.toggle.textContent = 'Resume';
    renderQueue();
    saveQueue();
    savePlayerState(true);
    return true;
  }

  function restorePlayerState() {
    const saved = loadJson(PLAYER_STATE_KEY, null);
    if (!saved || typeof saved !== 'object') return false;
    const savedQueue = normalizeQueue(saved.queue || state.queue || []);
    if (savedQueue.length) state.queue = savedQueue;
    state.index = Math.max(0, Math.min(Number(saved.index || 0) || 0, Math.max(0, state.queue.length - 1)));
    state.radioMode = saved.radioMode !== false;
    const trackId = saved.currentTrackId || state.queue[state.index] || state.queue[0];
    return loadTrackForResume(trackId, saved.currentTime || 0);
  }

  function applyCurrent(track) {
    if (!track) return;
    state.current = track;
    state.library = loadLibrary();
    ui.art.src = firstExistingImage(track);
    ui.title.textContent = track.title || 'Untitled Track';
    ui.artist.textContent = `${track.artistName || 'Unknown Artist'} - ${track.genre || 'SkyeMusicNexus'}`;
    ui.like.classList.toggle('is-active', state.library.likedTrackIds.includes(track.trackId));
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'SkyeMusicNexus',
        artist: track.artistName || '',
        album: track.lane || 'SkyeMusicNexus',
        artwork: [{ src: firstExistingImage(track), sizes: '512x512', type: 'image/png' }],
      });
    }
  }

  function safePlay(audio = ui.audio, label = 'track') {
    try {
      const attempt = audio.play();
      if (attempt?.catch) {
        attempt
          .then(() => savePlayerState(true))
          .catch(() => {
            ui.toggle.textContent = 'Play';
            showToast(`Tap Play to start ${label}.`);
            savePlayerState(true);
          });
      } else {
        savePlayerState(true);
      }
      return true;
    } catch {
      showToast(`Tap Play to start ${label}.`);
      savePlayerState(true);
      return false;
    }
  }

  function playTrack(trackId, queueIds = null, options = {}) {
    const track = state.trackById.get(trackId);
    const src = playbackUrl(track);
    if (!track || !src) {
      showToast('This track needs an audio file before it can play.');
      return false;
    }
    state.queue = normalizeQueue(queueIds || state.queue || []);
    if (!state.queue.includes(trackId)) state.queue.unshift(trackId);
    state.index = Math.max(0, state.queue.indexOf(trackId));
    state.qualifiedSent = false;
    state.playStartSent = false;
    state.activeAudio = ui.audio;
    applyCurrent(track);
    ui.audio.src = src;
    const startAt = Math.max(0, Number(options.startAt || 0) || 0);
    if (startAt) {
      const setTime = () => {
        const duration = Number(ui.audio.duration || track.duration || track.durationSeconds || 0);
        ui.audio.currentTime = duration ? Math.min(startAt, Math.max(0, duration - 1)) : startAt;
      };
      if (ui.audio.readyState >= 1) setTime();
      else ui.audio.addEventListener('loadedmetadata', setTime, { once: true });
    }
    if (options.autoPlay === false) ui.toggle.textContent = 'Resume';
    else safePlay(ui.audio, track.title || 'track');
    renderQueue();
    saveQueue();
    savePlayerState(true);
    channel?.postMessage({ type: 'playing', trackId });
    return true;
  }

  function playQueue(trackIds) {
    const ids = normalizeQueue(trackIds);
    state.queue = ids;
    state.radioMode = false;
    renderQueue();
    saveQueue();
    return ids.length ? playTrack(ids[0], ids) : false;
  }

  function playRadio(seedTrackId = '') {
    const allIds = state.tracks.map((track) => track.trackId).filter(Boolean);
    const shuffled = shuffleIds(allIds);
    if (seedTrackId && shuffled.includes(seedTrackId)) {
      shuffled.splice(shuffled.indexOf(seedTrackId), 1);
      shuffled.unshift(seedTrackId);
    }
    state.radioMode = true;
    state.queue = normalizeQueue(shuffled);
    state.index = 0;
    renderQueue();
    saveQueue();
    return state.queue.length ? playTrack(state.queue[0], state.queue) : false;
  }

  function previous() {
    if (!state.queue.length) return;
    const index = state.index <= 0 ? state.queue.length - 1 : state.index - 1;
    playTrack(state.queue[index], state.queue);
  }

  function next() {
    if (!state.queue.length) return;
    const index = state.index >= state.queue.length - 1 ? 0 : state.index + 1;
    playTrack(state.queue[index], state.queue);
  }

  function activeAudio() {
    return state.activeAudio || ui.audio;
  }

  function recordLocal(eventType, extra = {}) {
    const track = extra.track || state.current;
    if (!track) return null;
    const audio = extra.audio || activeAudio();
    const listenSeconds = Math.round(Number(extra.listenSeconds ?? audio?.currentTime ?? 0) || 0);
    const durationSeconds = Math.round(Number(extra.durationSeconds ?? audio?.duration ?? track.duration ?? 0) || 0);
    const listenerKind = extra.listenerKind || 'human_listener';
    const sourceType = extra.sourceType || (state.radioMode ? 'nexus_radio' : 'canonical_player');
    const metricEvent = ['play_start', 'qualified_stream', 'complete_play'].includes(eventType);
    const event = {
      eventId: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      eventType,
      listenerId: state.listenerId,
      sessionId: state.sessionId,
      listenerKind,
      sourceType,
      trackId: track.trackId,
      productId: track.productId || '',
      dropId: track.productId || track.trackId,
      releaseId: track.releaseId || '',
      queueId: state.radioMode ? 'all-nexus-radio' : 'page-queue',
      title: track.title,
      artistName: track.artistName,
      artistId: track.artistId || '',
      artistSlug: track.artistSlug,
      genre: track.genre,
      listenSeconds,
      durationSeconds,
      progressPct: durationSeconds ? Math.min(100, Math.round((listenSeconds / durationSeconds) * 100)) : 0,
      nexusMetricEligible: metricEvent,
      publicMetricEligible: metricEvent,
      serverConfirmed: false,
      receiptLane: 'browser_pending_upload',
      source: sourceType === 'nexus_radio' ? 'canonical-nexus-radio' : sourceType,
      at: new Date().toISOString(),
    };
    state.ledger.events.unshift(event);
    state.ledger.events = state.ledger.events.slice(0, 2000);
    state.ledger.totals[track.trackId] = state.ledger.totals[track.trackId] || { plays: 0, nexusStreams: 0, completePlays: 0, listenSeconds: 0 };
    const totals = state.ledger.totals[track.trackId];
    if (eventType === 'play_start') totals.plays += 1;
    if (eventType === 'qualified_stream') {
      totals.nexusStreams = Number(totals.nexusStreams || 0) + 1;
    }
    if (eventType === 'complete_play') totals.completePlays += 1;
    totals.listenSeconds += Number(event.listenSeconds || 0);
    state.ledger.updatedAt = event.at;
    saveJson(STREAM_KEY, state.ledger);
    window.dispatchEvent(new CustomEvent('skymusicnexus:stream-event', { detail: event }));
    return event;
  }

  function markEventPosted(eventId, payload = {}) {
    if (!eventId) return;
    state.ledger.events = (state.ledger.events || []).map((event) => event.eventId === eventId
      ? {
          ...event,
          serverConfirmed: true,
          receiptLane: 'worker-confirmed',
          serverReceiptId: payload.receiptId || payload.eventId || payload.id || event.serverReceiptId || '',
          confirmedAt: new Date().toISOString(),
        }
      : event);
    saveJson(STREAM_KEY, state.ledger);
  }

  function queueTelemetry(event) {
    state.outbox.events.push(event);
    state.outbox.events = state.outbox.events.slice(-1000);
    state.outbox.updatedAt = new Date().toISOString();
    saveJson(OUTBOX_KEY, state.outbox);
  }

  function rememberAward(award) {
    const id = award?.achievementId || award?.id;
    if (!id) return false;
    const ids = new Set(state.seenAwards.ids || []);
    if (ids.has(id)) return false;
    state.seenAwards.ids = [id, ...(state.seenAwards.ids || [])].slice(0, 250);
    saveJson(SEEN_AWARD_KEY, state.seenAwards);
    return true;
  }

  function emitAchievementAwards(payload) {
    const awards = Array.isArray(payload?.awards) ? payload.awards : [];
    awards.forEach((award) => {
      if (!rememberAward(award)) return;
      window.dispatchEvent(new CustomEvent('skymusicnexus:achievement-award', { detail: award }));
    });
  }

  function postTelemetry(event) {
    if (!event) return;
    const body = JSON.stringify({
      action: 'track-public-event',
      ...event,
    });
    fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      keepalive: body.length < 60000,
      headers: { 'content-type': TELEMETRY_CONTENT_TYPE },
      body,
    }).then(async (response) => {
      if (!response.ok) {
        queueTelemetry(event);
        return;
      }
      const payload = await response.json().catch(() => ({}));
      markEventPosted(event.eventId, payload);
      emitAchievementAwards(payload);
    }).catch(() => {
      if (!navigator.sendBeacon) {
        queueTelemetry(event);
        return;
      }
      try {
        const ok = navigator.sendBeacon(`${TELEMETRY_ENDPOINT}?action=track-public-event`, new Blob([body], { type: TELEMETRY_CONTENT_TYPE }));
        if (ok) return;
      } catch {}
      queueTelemetry(event);
    });
  }

  async function flushOutbox() {
    const pending = [...(state.outbox.events || [])];
    if (!pending.length) return;
    const remaining = [];
    for (const event of pending) {
      try {
        const response = await fetch(TELEMETRY_ENDPOINT, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: { 'content-type': TELEMETRY_CONTENT_TYPE },
          body: JSON.stringify({ action: 'track-public-event', ...event, replayedFromOutbox: true }),
        });
        if (!response.ok) remaining.push(event);
        else {
          const payload = await response.json().catch(() => ({}));
          markEventPosted(event.eventId, payload);
          emitAchievementAwards(payload);
        }
      } catch {
        remaining.push(event);
      }
    }
    state.outbox.events = remaining.slice(-1000);
    state.outbox.updatedAt = new Date().toISOString();
    saveJson(OUTBOX_KEY, state.outbox);
  }

  function record(eventType, extra) {
    const event = recordLocal(eventType, extra);
    postTelemetry(event);
  }

  function toggleLike() {
    const track = state.current;
    if (!track) return;
    const liked = new Set(state.library.likedTrackIds || []);
    if (liked.has(track.trackId)) liked.delete(track.trackId);
    else liked.add(track.trackId);
    state.library.likedTrackIds = [...liked];
    state.library.updatedAt = new Date().toISOString();
    saveLibrary();
    ui.like.classList.toggle('is-active', liked.has(track.trackId));
    showToast(liked.has(track.trackId) ? 'Saved to liked tracks.' : 'Removed from liked tracks.');
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'skye-nexus-player__toast';
    toast.textContent = message;
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 2200);
  }

  function showAchievement(award = {}) {
    const tier = String(award.badgeTier || 'spark').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'spark';
    const toast = document.createElement('aside');
    toast.className = `skye-nexus-achievement-toast skye-nexus-achievement-toast--${tier}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <div class="skye-nexus-achievement-toast__burst" aria-hidden="true"></div>
      <strong>${escapeHtml(award.badgeLabel || 'Nexus Stream Award')}</strong>
      <span>${escapeHtml(award.headline || award.message || 'An artist just unlocked a stream milestone.')}</span>
      <a href="${PUBLIC_ORIGIN}/public/achievements.html">Achievement Wall</a>
    `;
    document.body.append(toast);
    window.setTimeout(() => toast.classList.add('is-live'), 30);
    window.setTimeout(() => toast.remove(), 5200);
  }

  function setupAnalyser() {
    if (state.ctx || !window.AudioContext && !window.webkitAudioContext) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      state.ctx = new AudioCtx();
      const source = state.ctx.createMediaElementSource(ui.audio);
      state.analyser = state.ctx.createAnalyser();
      state.analyser.fftSize = 128;
      state.data = new Uint8Array(state.analyser.frequencyBinCount);
      source.connect(state.analyser);
      state.analyser.connect(state.ctx.destination);
    } catch {
      state.ctx = null;
      state.analyser = null;
    }
  }

  function draw(now = 0) {
    if (now - state.lastDraw < 33) {
      state.raf = requestAnimationFrame(draw);
      return;
    }
    state.lastDraw = now;
    const canvas = ui.canvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    const t = performance.now() / 1000;
    const points = 18;
    if (state.analyser && state.data) state.analyser.getByteFrequencyData(state.data);
    for (let i = 0; i < points; i += 1) {
      const value = state.data ? state.data[i % state.data.length] / 255 : (Math.sin(t * 2 + i) + 1) / 2;
      const x = (i / (points - 1)) * width;
      const y = height * .5 + Math.sin(t * 1.7 + i * .7) * height * .22 * (ui.audio.paused ? .35 : 1) - value * height * .25;
      ctx.beginPath();
      ctx.arc(x, y, 3 + value * 8, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(110,231,248,.9)' : i % 3 === 1 ? 'rgba(255,117,183,.78)' : 'rgba(255,209,102,.82)';
      ctx.fill();
      if (i) {
        const prevX = ((i - 1) / (points - 1)) * width;
        const prevValue = state.data ? state.data[(i - 1) % state.data.length] / 255 : (Math.sin(t * 2 + i - 1) + 1) / 2;
        const prevY = height * .5 + Math.sin(t * 1.7 + (i - 1) * .7) * height * .22 * (ui.audio.paused ? .35 : 1) - prevValue * height * .25;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = 'rgba(247,245,234,.22)';
        ctx.lineWidth = 1 + value * 2;
        ctx.stroke();
      }
    }
    state.raf = requestAnimationFrame(draw);
  }

  function updateProgress() {
    const duration = Number(ui.audio.duration || 0);
    const current = Number(ui.audio.currentTime || 0);
    ui.current.textContent = formatTime(current);
    ui.duration.textContent = formatTime(duration);
    ui.progress.value = duration ? String(Math.round((current / duration) * 1000)) : '0';
    if (!state.playStartSent && current > .5) {
      state.playStartSent = true;
      record('play_start', { listenSeconds: Math.round(current), sourceType: state.radioMode ? 'nexus_radio' : 'canonical_player' });
    }
    if (!state.qualifiedSent && current >= qualifiedThreshold(state.current, ui.audio)) {
      state.qualifiedSent = true;
      record('qualified_stream', { listenSeconds: Math.round(current), sourceType: state.radioMode ? 'nexus_radio' : 'canonical_player' });
    }
    savePlayerState(false);
  }

  function trackForAudio(audio) {
    const explicit = audio.dataset?.nexusTrackId || audio.dataset?.trackId;
    if (explicit && state.trackById.has(explicit)) return state.trackById.get(explicit);
    const src = normalizeUrl(audio.currentSrc || audio.src || audio.querySelector('source')?.src || '');
    if (!src) return null;
    return state.tracks.find((track) => {
      const audioUrl = normalizeUrl(track.audioUrl || '');
      const localUrl = normalizeUrl(track.localAudioHref || '');
      return audioUrl === src || localUrl === src || src.endsWith((track.localAudioHref || '').replace(/^\.\.\//, '')) || src.endsWith((track.audioUrl || '').split('/').slice(-4).join('/'));
    }) || null;
  }

  function bindNativeAudio(audio) {
    if (!audio || audio === ui.audio || state.nativeBindings.has(audio)) return;
    const binding = { playStartSent: false, qualifiedSent: false, track: null };
    state.nativeBindings.set(audio, binding);
    audio.addEventListener('play', () => {
      const track = trackForAudio(audio);
      if (!track) return;
      binding.track = track;
      binding.playStartSent = false;
      binding.qualifiedSent = false;
      state.current = track;
      state.activeAudio = audio;
      state.radioMode = false;
      applyCurrent(track);
      recordLocal('player_visible', { track, audio, sourceType: 'native_audio' });
    });
    audio.addEventListener('timeupdate', () => {
      const track = binding.track || trackForAudio(audio);
      if (!track) return;
      const current = Number(audio.currentTime || 0);
      if (!binding.playStartSent && current > .5) {
        binding.playStartSent = true;
        record('play_start', { track, audio, listenSeconds: Math.round(current), sourceType: 'native_audio' });
      }
      if (!binding.qualifiedSent && current >= qualifiedThreshold(track, audio)) {
        binding.qualifiedSent = true;
        record('qualified_stream', { track, audio, listenSeconds: Math.round(current), sourceType: 'native_audio' });
      }
    });
    audio.addEventListener('ended', () => {
      const track = binding.track || trackForAudio(audio);
      if (track) record('complete_play', { track, audio, listenSeconds: Math.round(audio.currentTime || 0), sourceType: 'native_audio' });
      if (!state.queue.length && state.tracks.length) state.queue = shuffleIds(state.tracks.map((item) => item.trackId));
      state.radioMode = true;
      const currentId = track?.trackId || '';
      if (currentId && state.queue.includes(currentId)) state.index = state.queue.indexOf(currentId);
      next();
    });
  }

  function bindNativeAudios() {
    document.querySelectorAll('audio').forEach(bindNativeAudio);
  }

  function wire() {
    ui.root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-player-action]');
      if (!button) return;
      const action = button.dataset.playerAction;
      if (action === 'toggle') {
        setupAnalyser();
        const audio = activeAudio();
        if (!state.current) playRadio();
        else if (audio.paused) safePlay(audio, state.current?.title || 'track');
        else audio.pause();
      }
      if (action === 'resume') {
        setupAnalyser();
        if (!state.current && !restorePlayerState()) playRadio();
        else safePlay(activeAudio(), state.current?.title || 'track');
      }
      if (action === 'previous') previous();
      if (action === 'next') next();
      if (action === 'radio') playRadio(state.current?.trackId || '');
      if (action === 'like') toggleLike();
      if (action === 'queue') ui.drawer.hidden = !ui.drawer.hidden;
    });
    ui.drawer.addEventListener('click', (event) => {
      const button = event.target.closest('[data-player-queue-track]');
      if (button) playTrack(button.dataset.playerQueueTrack, state.queue);
    });
    document.addEventListener('click', (event) => {
      const target = event.target.closest('[data-nexus-track-id], [data-action="play-track"]');
      const id = target?.dataset?.nexusTrackId || target?.dataset?.trackId;
      if (id && state.trackById.has(id)) {
        event.preventDefault();
        playTrack(id);
      }
    });
    ui.audio.addEventListener('play', () => {
      setupAnalyser();
      if (state.ctx?.state === 'suspended') state.ctx.resume().catch(() => {});
      ui.toggle.textContent = 'Pause';
      state.activeAudio = ui.audio;
      recordLocal('player_visible', { listenSeconds: Math.round(ui.audio.currentTime || 0) });
      savePlayerState(true);
    });
    ui.audio.addEventListener('pause', () => {
      ui.toggle.textContent = 'Play';
      savePlayerState(true);
    });
    ui.audio.addEventListener('timeupdate', updateProgress);
    ui.audio.addEventListener('ended', () => {
      record('complete_play', { listenSeconds: Math.round(ui.audio.currentTime || 0) });
      savePlayerState(true);
      next();
    });
    ui.progress.addEventListener('input', () => {
      const duration = Number(ui.audio.duration || 0);
      if (duration) ui.audio.currentTime = (Number(ui.progress.value || 0) / 1000) * duration;
      savePlayerState(true);
    });
    channel?.addEventListener('message', (event) => {
      if (event.data?.type === 'play-track' && event.data.trackId) playTrack(event.data.trackId, event.data.queue || null);
    });
    window.addEventListener('skymusicnexus:achievement-award', (event) => showAchievement(event.detail || {}));
    window.addEventListener('online', flushOutbox);
    bindNativeAudios();
    new MutationObserver(bindNativeAudios).observe(document.documentElement, { childList: true, subtree: true });
  }

  async function init() {
    state.catalog = await fetchCatalog();
    state.tracks = state.catalog.tracks || [];
    state.trackById = new Map(state.tracks.map((track) => [track.trackId, track]));
    const savedQueue = loadJson(QUEUE_KEY, { queue: [], radioMode: true });
    const baseQueue = savedQueue.queue?.length ? savedQueue.queue : shuffleIds(state.catalog.charts?.overall || state.catalog.systemPlaylists?.[0]?.trackIds || state.tracks.map((track) => track.trackId));
    state.queue = normalizeQueue(baseQueue);
    state.radioMode = savedQueue.radioMode !== false;
    renderQueue();
    const match = trackForMusicPath(location.pathname) || state.tracks.find((track) => location.href.includes(track.artistSlug || ''));
    const restored = restorePlayerState();
    if (!restored) applyCurrent(match || state.trackById.get(state.queue[0]));
    hydrateNativeAudioElements();
    wire();
    flushOutbox();
    draw();
  }

  window.SkyeNexusPlayer = {
    playTrack,
    playQueue,
    playRadio,
    next,
    previous,
    getState: () => ({
      current: state.current,
      queue: [...state.queue],
      ledger: loadJson(STREAM_KEY, { events: [], totals: {} }),
      library: loadLibrary(),
      player: playerSnapshot(),
    }),
    record,
  };

  init().catch(() => {});
})();
