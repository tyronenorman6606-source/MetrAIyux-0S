(() => {
  const CATALOG_URL = './data/playlists.json';
  const PLAYER_LIBRARY_KEY = 'skymusicnexus.playerLibrary.v1';
  const EXPORT_SCHEMA = 'skyemusicnexus.libraryExport.v1';
  const FALLBACK_IMAGE = '../assets/og-card.svg';

  const state = {
    catalog: { tracks: [], systemPlaylists: [], totals: {} },
    tracks: [],
    trackById: new Map(),
    query: '',
    activeView: { type: 'liked', id: '' },
    playerLibrary: { likedTrackIds: [], playlists: [] },
    localPlaylists: [],
    statusTimer: 0,
  };

  const el = {
    savedCount: document.getElementById('stat-saved'),
    playlistCount: document.getElementById('stat-playlists'),
    trackCount: document.getElementById('stat-tracks'),
    systemCount: document.getElementById('stat-system'),
    savedTracks: document.getElementById('saved-track-list'),
    localPlaylists: document.getElementById('local-playlists'),
    systemPlaylists: document.getElementById('system-playlists'),
    catalogList: document.getElementById('catalog-list'),
    activeKicker: document.getElementById('active-kicker'),
    activeTitle: document.getElementById('active-title'),
    activeMeta: document.getElementById('active-meta'),
    activeTracks: document.getElementById('active-track-list'),
    activePlay: document.getElementById('active-play'),
    activeDelete: document.getElementById('active-delete'),
    createForm: document.getElementById('create-form'),
    titleInput: document.getElementById('playlist-title'),
    playlistSelect: document.getElementById('playlist-select'),
    search: document.getElementById('track-search'),
    importJson: document.getElementById('import-json'),
    importFile: document.getElementById('import-file'),
    status: document.getElementById('library-status'),
    fallbackAudio: document.getElementById('fallback-audio'),
    nowArt: document.getElementById('now-art'),
    nowTitle: document.getElementById('now-title'),
    nowArtist: document.getElementById('now-artist'),
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function loadJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value, null, 2));
  }

  function uniqueTrackIds(ids, requireKnown = false) {
    const seen = new Set();
    return (ids || [])
      .map((id) => String(id || '').trim())
      .filter((id) => id && !seen.has(id) && (!requireKnown || state.trackById.has(id)) && seen.add(id));
  }

  function extractTrackIds(value, requireKnown = false) {
    if (!Array.isArray(value)) return [];
    const ids = value.map((item) => {
      if (typeof item === 'string') return item;
      return item?.trackId || item?.id || item?.productId || '';
    });
    return uniqueTrackIds(ids, requireKnown);
  }

  function randomId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function cleanPlaylist(playlist, requireKnownTracks = false) {
    const trackIds = extractTrackIds(playlist?.trackIds || playlist?.tracks || [], requireKnownTracks);
    return {
      playlistId: String(playlist?.playlistId || playlist?.id || randomId('library')).slice(0, 120),
      title: String(playlist?.title || playlist?.name || 'Untitled Playlist').trim().slice(0, 80) || 'Untitled Playlist',
      kind: 'user',
      description: String(playlist?.description || '').trim().slice(0, 180),
      trackIds,
      createdAt: playlist?.createdAt || new Date().toISOString(),
      updatedAt: playlist?.updatedAt || new Date().toISOString(),
    };
  }

  function mergePlaylists(primary, secondary) {
    const order = [];
    const byId = new Map();
    [...(primary || []), ...(secondary || [])].forEach((item) => {
      const playlist = cleanPlaylist(item);
      if (!byId.has(playlist.playlistId)) {
        order.push(playlist.playlistId);
        byId.set(playlist.playlistId, playlist);
        return;
      }
      const existing = byId.get(playlist.playlistId);
      byId.set(playlist.playlistId, {
        ...existing,
        ...playlist,
        trackIds: uniqueTrackIds([...(existing.trackIds || []), ...(playlist.trackIds || [])]),
      });
    });
    return order.map((id) => byId.get(id)).filter(Boolean);
  }

  function loadLocalLibrary() {
    const playerLibrary = loadJson(PLAYER_LIBRARY_KEY, { likedTrackIds: [], playlists: [] });
    state.playerLibrary = {
      ...playerLibrary,
      likedTrackIds: uniqueTrackIds(playerLibrary.likedTrackIds || playerLibrary.savedTrackIds || []),
      playlists: Array.isArray(playerLibrary.playlists) ? playerLibrary.playlists : [],
    };
    state.localPlaylists = mergePlaylists(state.playerLibrary.playlists, []);
  }

  function savePlayerLibrary() {
    state.playerLibrary = {
      ...loadJson(PLAYER_LIBRARY_KEY, { likedTrackIds: [], playlists: [] }),
      likedTrackIds: uniqueTrackIds(state.playerLibrary.likedTrackIds || []),
      playlists: state.localPlaylists,
      updatedAt: new Date().toISOString(),
    };
    saveJson(PLAYER_LIBRARY_KEY, state.playerLibrary);
  }

  function saveLocalPlaylists() {
    state.localPlaylists = state.localPlaylists.map((playlist) => cleanPlaylist(playlist));
    savePlayerLibrary();
  }

  function showStatus(message) {
    window.clearTimeout(state.statusTimer);
    el.status.textContent = message;
    el.status.hidden = false;
    state.statusTimer = window.setTimeout(() => {
      el.status.hidden = true;
    }, 3600);
  }

  function trackImage(track) {
    return track?.coverImage || track?.artistImage || FALLBACK_IMAGE;
  }

  function trackGenre(track) {
    return track?.genre || (track?.genres || []).slice(0, 2).join(' / ') || 'Music Nexus';
  }

  function tracksFromIds(ids) {
    return uniqueTrackIds(ids, true).map((id) => state.trackById.get(id)).filter(Boolean);
  }

  function likedSet() {
    return new Set(state.playerLibrary.likedTrackIds || []);
  }

  function selectedUserPlaylist() {
    const selectedId = el.playlistSelect.value;
    if (selectedId) return state.localPlaylists.find((playlist) => playlist.playlistId === selectedId);
    if (state.activeView.type === 'user') {
      return state.localPlaylists.find((playlist) => playlist.playlistId === state.activeView.id);
    }
    return null;
  }

  function currentActive() {
    if (state.activeView.type === 'liked') {
      return {
        type: 'liked',
        kicker: 'Saved Tracks',
        title: 'Saved Tracks',
        trackIds: state.playerLibrary.likedTrackIds || [],
        editable: true,
        deletable: false,
      };
    }

    if (state.activeView.type === 'system') {
      const playlist = (state.catalog.systemPlaylists || []).find((item) => item.playlistId === state.activeView.id);
      return {
        type: 'system',
        kicker: 'Nexus Set',
        title: playlist?.title || 'Nexus Set',
        trackIds: playlist?.trackIds || [],
        editable: false,
        deletable: false,
      };
    }

    const playlist = state.localPlaylists.find((item) => item.playlistId === state.activeView.id);
    if (playlist) {
      return {
        type: 'user',
        kicker: 'Local Playlist',
        title: playlist.title,
        trackIds: playlist.trackIds || [],
        editable: true,
        deletable: true,
      };
    }

    state.activeView = { type: 'liked', id: '' };
    return currentActive();
  }

  function selectView(type, id = '') {
    state.activeView = { type, id };
    if (type === 'user') el.playlistSelect.value = id;
    render();
  }

  function setNow(track) {
    if (!track) return;
    el.nowArt.src = trackImage(track);
    el.nowTitle.textContent = track.title || track.trackId;
    el.nowArtist.textContent = `${track.artistName || 'Unknown Artist'} - ${trackGenre(track)}`;
  }

  function playbackUrl(track) {
    const raw = track?.localAudioHref || track?.audioUrl || '';
    try {
      return new URL(raw, window.location.href).href;
    } catch {
      return raw;
    }
  }

  function playTrack(trackId, queueIds = []) {
    const track = state.trackById.get(trackId);
    if (!track) return;
    const queue = uniqueTrackIds(queueIds.length ? queueIds : [trackId], true);
    setNow(track);
    if (window.SkyeNexusPlayer?.playTrack) {
      window.SkyeNexusPlayer.playTrack(trackId, queue);
      return;
    }
    el.fallbackAudio.src = playbackUrl(track);
    el.fallbackAudio.play().catch(() => {
      showStatus('Playback is waiting for browser permission.');
    });
  }

  function playQueue(trackIds) {
    const queue = uniqueTrackIds(trackIds, true);
    if (!queue.length) {
      showStatus('No playable tracks in this selection.');
      return;
    }
    setNow(state.trackById.get(queue[0]));
    if (window.SkyeNexusPlayer?.playQueue) {
      window.SkyeNexusPlayer.playQueue(queue);
      return;
    }
    playTrack(queue[0], queue);
  }

  function toggleSaved(trackId) {
    if (!state.trackById.has(trackId)) return;
    const saved = likedSet();
    if (saved.has(trackId)) saved.delete(trackId);
    else saved.add(trackId);
    state.playerLibrary.likedTrackIds = [...saved];
    savePlayerLibrary();
    render();
    showStatus(saved.has(trackId) ? 'Track saved in this browser.' : 'Track removed from saved tracks.');
  }

  function createPlaylist(title) {
    const now = new Date().toISOString();
    const playlist = {
      playlistId: randomId('library'),
      title: title.trim().slice(0, 80) || `Nexus Playlist ${state.localPlaylists.length + 1}`,
      kind: 'user',
      description: '',
      trackIds: [],
      createdAt: now,
      updatedAt: now,
    };
    state.localPlaylists.unshift(playlist);
    saveLocalPlaylists();
    selectView('user', playlist.playlistId);
    showStatus('Playlist created in this browser.');
  }

  function addToPlaylist(trackId) {
    const playlist = selectedUserPlaylist();
    if (!playlist) {
      showStatus('Create a playlist before adding tracks.');
      return;
    }
    if (!state.trackById.has(trackId)) return;
    if (!playlist.trackIds.includes(trackId)) playlist.trackIds.push(trackId);
    playlist.updatedAt = new Date().toISOString();
    saveLocalPlaylists();
    selectView('user', playlist.playlistId);
    showStatus('Track added to playlist.');
  }

  function removeFromActive(trackId) {
    const active = currentActive();
    if (active.type === 'liked') {
      toggleSaved(trackId);
      return;
    }
    if (active.type !== 'user') return;
    const playlist = state.localPlaylists.find((item) => item.playlistId === state.activeView.id);
    if (!playlist) return;
    playlist.trackIds = (playlist.trackIds || []).filter((id) => id !== trackId);
    playlist.updatedAt = new Date().toISOString();
    saveLocalPlaylists();
    render();
    showStatus('Track removed from playlist.');
  }

  function deletePlaylist(playlistId) {
    const playlist = state.localPlaylists.find((item) => item.playlistId === playlistId);
    if (!playlist) return;
    state.localPlaylists = state.localPlaylists.filter((item) => item.playlistId !== playlistId);
    if (state.activeView.type === 'user' && state.activeView.id === playlistId) state.activeView = { type: 'liked', id: '' };
    saveLocalPlaylists();
    render();
    showStatus('Playlist deleted from this browser.');
  }

  function exportLibrary() {
    const payload = {
      schema: EXPORT_SCHEMA,
      exportedAt: new Date().toISOString(),
      likedTrackIds: uniqueTrackIds(state.playerLibrary.likedTrackIds || []),
      playlists: state.localPlaylists,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'skyemusicnexus-library.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importLibraryJson(text) {
    const parsed = JSON.parse(text);
    const likedIds = extractTrackIds(parsed.likedTrackIds || parsed.savedTrackIds || parsed.savedTracks || [], true);
    const rawPlaylists = Array.isArray(parsed) ? parsed : parsed.playlists || parsed.userPlaylists || [];
    const playlists = (Array.isArray(rawPlaylists) ? rawPlaylists : [])
      .map((playlist) => cleanPlaylist(playlist, true))
      .filter((playlist) => playlist.title && playlist.trackIds.length);

    state.playerLibrary.likedTrackIds = uniqueTrackIds([...(state.playerLibrary.likedTrackIds || []), ...likedIds], true);
    state.localPlaylists = mergePlaylists(playlists, state.localPlaylists);
    saveLocalPlaylists();
    render();
    showStatus(`${likedIds.length} saved tracks and ${playlists.length} playlists imported.`);
  }

  function renderStats() {
    el.savedCount.textContent = uniqueTrackIds(state.playerLibrary.likedTrackIds || [], true).length;
    el.playlistCount.textContent = state.localPlaylists.length;
    el.trackCount.textContent = state.tracks.length;
    el.systemCount.textContent = (state.catalog.systemPlaylists || []).length;
  }

  function renderPlaylistSelect() {
    el.playlistSelect.innerHTML = state.localPlaylists.length
      ? state.localPlaylists
          .map((playlist) => `<option value="${escapeHtml(playlist.playlistId)}">${escapeHtml(playlist.title)}</option>`)
          .join('')
      : '<option value="">Create a playlist</option>';

    if (state.activeView.type === 'user' && state.localPlaylists.some((playlist) => playlist.playlistId === state.activeView.id)) {
      el.playlistSelect.value = state.activeView.id;
    }
  }

  function renderTrackRows(tracks, options = {}) {
    const saved = likedSet();
    const active = currentActive();
    if (!tracks.length) return '<p class="library-empty">No tracks found.</p>';
    return tracks
      .map((track) => {
        const inSaved = saved.has(track.trackId);
        const saveLabel = inSaved ? 'Saved' : 'Save';
        const removeButton = options.removeSaved
          ? `<button class="library-button library-button--danger" type="button" data-action="toggle-save" data-track-id="${escapeHtml(track.trackId)}">Remove</button>`
          : options.removable
          ? `<button class="library-button library-button--danger" type="button" data-action="remove-from-active" data-track-id="${escapeHtml(track.trackId)}">Remove</button>`
          : '';
        const addButton = options.allowAdd
          ? `<button class="library-button" type="button" data-action="add-to-playlist" data-track-id="${escapeHtml(track.trackId)}">Add</button>`
          : '';
        const saveButton = options.removeSaved || (active.type === 'liked' && options.removable)
          ? ''
          : `<button class="library-button ${inSaved ? 'is-active' : ''}" type="button" data-action="toggle-save" data-track-id="${escapeHtml(track.trackId)}">${saveLabel}</button>`;
        return `<article class="library-track-row">
          <img src="${escapeHtml(trackImage(track))}" alt="" loading="lazy" />
          <div class="library-track-copy">
            <strong>${escapeHtml(track.title || track.trackId)}</strong>
            <span>${escapeHtml(track.artistName || 'Unknown Artist')} - ${escapeHtml(trackGenre(track))}</span>
          </div>
          <div class="library-track-actions">
            <button class="library-button library-button--primary" type="button" data-action="play-track" data-track-id="${escapeHtml(track.trackId)}">Play</button>
            ${saveButton}
            ${addButton}
            ${removeButton}
          </div>
        </article>`;
      })
      .join('');
  }

  function renderSavedTracks() {
    const tracks = tracksFromIds(state.playerLibrary.likedTrackIds || []);
    el.savedTracks.innerHTML = tracks.length
      ? renderTrackRows(tracks.slice(0, 8), { removeSaved: true })
      : '<p class="library-empty">Saved tracks appear here.</p>';
  }

  function renderLocalPlaylists() {
    el.localPlaylists.innerHTML = state.localPlaylists.length
      ? state.localPlaylists
          .map((playlist) => {
            const active = state.activeView.type === 'user' && state.activeView.id === playlist.playlistId ? ' is-active' : '';
            const count = tracksFromIds(playlist.trackIds || []).length;
            return `<button class="library-playlist-card${active}" type="button" data-action="select-view" data-view-type="user" data-playlist-id="${escapeHtml(playlist.playlistId)}">
              <strong>${escapeHtml(playlist.title)}</strong>
              <span>${count} tracks</span>
              ${playlist.description ? `<span>${escapeHtml(playlist.description)}</span>` : ''}
            </button>`;
          })
          .join('')
      : '<p class="library-empty">Local playlists appear here.</p>';
  }

  function renderSystemPlaylists() {
    el.systemPlaylists.innerHTML = (state.catalog.systemPlaylists || []).length
      ? state.catalog.systemPlaylists
          .map((playlist) => {
            const active = state.activeView.type === 'system' && state.activeView.id === playlist.playlistId ? ' is-active' : '';
            const count = tracksFromIds(playlist.trackIds || []).length;
            return `<button class="library-system-card${active}" type="button" data-action="select-view" data-view-type="system" data-playlist-id="${escapeHtml(playlist.playlistId)}">
              <strong>${escapeHtml(playlist.title)}</strong>
              <span>${count} tracks</span>
            </button>`;
          })
          .join('')
      : '<p class="library-empty">Nexus playlist data is not loaded.</p>';
  }

  function renderCatalog() {
    const query = state.query.trim().toLowerCase();
    const tracks = query
      ? state.tracks.filter((track) => {
          const haystack = [track.title, track.artistName, track.genre, ...(track.genres || [])].join(' ').toLowerCase();
          return haystack.includes(query);
        })
      : state.tracks;
    el.catalogList.innerHTML = renderTrackRows(tracks, { allowAdd: true });
  }

  function renderActive() {
    const active = currentActive();
    const tracks = tracksFromIds(active.trackIds || []);
    el.activeKicker.textContent = active.kicker;
    el.activeTitle.textContent = active.title;
    el.activeMeta.textContent = `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`;
    el.activePlay.disabled = !tracks.length;
    el.activeDelete.hidden = !active.deletable;
    el.activeTracks.innerHTML = tracks.length
      ? renderTrackRows(tracks, { removable: active.editable })
      : '<p class="library-empty">No tracks in this selection.</p>';
  }

  function render() {
    renderStats();
    renderPlaylistSelect();
    renderSavedTracks();
    renderLocalPlaylists();
    renderSystemPlaylists();
    renderCatalog();
    renderActive();
  }

  function handleAction(target) {
    const action = target.dataset.action;
    const trackId = target.dataset.trackId;
    if (action === 'select-view') selectView(target.dataset.viewType, target.dataset.playlistId || '');
    if (action === 'play-track') playTrack(trackId, currentActive().trackIds || [trackId]);
    if (action === 'toggle-save') toggleSaved(trackId);
    if (action === 'add-to-playlist') addToPlaylist(trackId);
    if (action === 'remove-from-active') removeFromActive(trackId);
    if (action === 'play-active') playQueue(currentActive().trackIds || []);
    if (action === 'delete-active' && state.activeView.type === 'user') deletePlaylist(state.activeView.id);
    if (action === 'export-library') exportLibrary();
    if (action === 'import-library') {
      try {
        importLibraryJson(el.importJson.value);
        el.importJson.value = '';
      } catch {
        showStatus('Import needs valid Music Nexus library JSON.');
      }
    }
  }

  function wire() {
    document.addEventListener('click', (event) => {
      const target = event.target.closest('[data-action]');
      if (target) handleAction(target);
    });

    el.createForm.addEventListener('submit', (event) => {
      event.preventDefault();
      createPlaylist(el.titleInput.value);
      el.titleInput.value = '';
    });

    el.search.addEventListener('input', () => {
      state.query = el.search.value;
      renderCatalog();
    });

    el.importFile.addEventListener('change', async () => {
      const file = el.importFile.files?.[0];
      if (!file) return;
      try {
        importLibraryJson(await file.text());
      } catch {
        showStatus('Import file needs valid Music Nexus library JSON.');
      } finally {
        el.importFile.value = '';
      }
    });

    window.addEventListener('storage', (event) => {
      if (event.key !== PLAYER_LIBRARY_KEY) return;
      loadLocalLibrary();
      render();
    });
  }

  async function loadCatalog() {
    const response = await fetch(CATALOG_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
    const catalog = await response.json();
    state.catalog = {
      ...catalog,
      tracks: Array.isArray(catalog.tracks) ? catalog.tracks : [],
      systemPlaylists: Array.isArray(catalog.systemPlaylists) ? catalog.systemPlaylists : [],
    };
    state.tracks = state.catalog.tracks;
    state.trackById = new Map(state.tracks.map((track) => [track.trackId, track]));
  }

  async function init() {
    loadLocalLibrary();
    wire();
    try {
      await loadCatalog();
    } catch {
      showStatus('Catalog data could not be loaded.');
    }
    state.playerLibrary.likedTrackIds = uniqueTrackIds(state.playerLibrary.likedTrackIds || [], true);
    state.localPlaylists = state.localPlaylists.map((playlist) => cleanPlaylist(playlist));
    render();
  }

  init();
})();
