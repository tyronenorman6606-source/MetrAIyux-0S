(() => {
  const WORKER_ORIGIN = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
  const DEFAULT_ART = './assets/skye-music-nexus-logo.png';
  const ROOT = new URL('./', location.href);
  const CATALOG_FILE = new URL('./public/data/playlists.json', ROOT);
  const APPS_FILE = new URL('./artist-storefronts/artist-apps/artist-apps.json', ROOT);
  const COLLECTIVE_FILE = new URL('./artist-storefronts/gray-skyes-collective/collective.json', ROOT);
  const PLAYER_LIBRARY_KEY = 'skymusicnexus.playerLibrary.v1';

  const state = {
    catalog: { tracks: [], artists: [], systemPlaylists: [] },
    apps: { apps: [] },
    collective: { members: [] },
    traffic: null,
    artists: [],
    tracks: [],
    trackById: new Map(),
    selectedArtistSlug: '',
    filtered: '',
    featuredTrackId: '',
  };

  const el = {
    search: document.getElementById('nexusSearch'),
    nowArt: document.getElementById('nowArt'),
    nowStatus: document.getElementById('nowStatus'),
    nowTitle: document.getElementById('nowTitle'),
    nowArtist: document.getElementById('nowArtist'),
    nowGenre: document.getElementById('nowGenre'),
    nowStreams: document.getElementById('nowStreams'),
    nowQueue: document.getElementById('nowQueue'),
    currentTrackTitle: document.getElementById('currentTrackTitle'),
    currentTrackArtist: document.getElementById('currentTrackArtist'),
    playFeatured: document.getElementById('playFeatured'),
    featuredArtist: document.getElementById('featuredArtist'),
    featuredDrop: document.getElementById('featuredDrop'),
    totalStreams: document.getElementById('totalStreams'),
    totalArtists: document.getElementById('totalArtists'),
    totalTracks: document.getElementById('totalTracks'),
    totalSeconds: document.getElementById('totalSeconds'),
    likedCount: document.getElementById('likedCount'),
    libraryStatus: document.getElementById('libraryStatus'),
    quickStartTitle: document.getElementById('quickStartTitle'),
    playlistGrid: document.getElementById('playlistGrid'),
    trendingRail: document.getElementById('trendingRail'),
    newDropsRail: document.getElementById('newDropsRail'),
    genreShelfGrid: document.getElementById('genreShelfGrid'),
    artistGrid: document.getElementById('artistGrid'),
    feedPreview: document.getElementById('feedPreview'),
    queuePreview: document.getElementById('queuePreview'),
    artistSelect: document.getElementById('artistSelect'),
    selectedArtistName: document.getElementById('selectedArtistName'),
    selectedArtistImage: document.getElementById('selectedArtistImage'),
    artistStreams: document.getElementById('artistStreams'),
    artistTracks: document.getElementById('artistTracks'),
    artistSeconds: document.getElementById('artistSeconds'),
    selectedArtistStore: document.getElementById('selectedArtistStore'),
    selectedArtistStats: document.getElementById('selectedArtistStats'),
    ownerPulse: document.getElementById('ownerPulse'),
    pulse: document.getElementById('nexusPulse'),
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function fmt(value) {
    return new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(Number(value || 0))));
  }

  function compact(value) {
    const number = Math.max(0, Math.round(Number(value || 0)));
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(number);
  }

  function readJsonStorage(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '');
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function resolveFrom(value, baseFile = ROOT) {
    const raw = String(value || '').trim();
    if (!raw) return DEFAULT_ART;
    if (/^(?:https?:|data:|blob:|mailto:|tel:)/i.test(raw)) return raw;
    if (raw.startsWith('/')) return raw;
    if (raw.startsWith('../artist-storefronts/')) return new URL(raw.replace(/^\.\.\//, './'), ROOT).href;
    if (/^\.\/(?:public|artist-storefronts|assets)\//.test(raw)) return new URL(raw, ROOT).href;
    try {
      return new URL(raw, baseFile).href;
    } catch {
      return raw || DEFAULT_ART;
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} ${response.status}`);
    return response.json();
  }

  function playerState() {
    try {
      return window.SkyeNexusPlayer?.getState?.() || {};
    } catch {
      return {};
    }
  }

  function libraryState() {
    return playerState().library || readJsonStorage(PLAYER_LIBRARY_KEY, { likedTrackIds: [], playlists: [] });
  }

  function trafficTrack(track) {
    const summary = state.traffic?.trafficSummary;
    return summary?.tracks?.[track.trackId] || track.streamStats || {};
  }

  function artistTraffic(artist) {
    const summary = state.traffic?.trafficSummary;
    const keys = [artist.artistSlug, artist.slug, artist.artistId, artist.name, artist.artistName]
      .filter(Boolean)
      .map((item) => String(item).toLowerCase());
    const remote = Object.entries(summary?.artists || {}).find(([key, value]) => {
      const values = [key, value.artistSlug, value.artistId, value.artistName].filter(Boolean).map((item) => String(item).toLowerCase());
      return values.some((item) => keys.includes(item));
    })?.[1] || {};
    const trackIds = new Set(artist.trackIds || []);
    const trackStats = state.tracks
      .filter((track) => track.artistSlug === artist.slug || track.artistSlug === artist.artistSlug || track.artistId === artist.artistId || trackIds.has(track.trackId))
      .reduce((acc, track) => {
        const stats = trafficTrack(track);
        acc.nexusStreams += Number(stats.nexusStreams || 0);
        acc.playStarts += Number(stats.playStarts || 0);
        acc.completePlays += Number(stats.completePlays || 0);
        acc.listenSeconds += Number(stats.listenSeconds || 0);
        return acc;
      }, { nexusStreams: 0, playStarts: 0, completePlays: 0, listenSeconds: 0 });
    return {
      nexusStreams: Math.max(Number(remote.nexusStreams || 0), trackStats.nexusStreams),
      playStarts: Math.max(Number(remote.playStarts || 0), trackStats.playStarts),
      completePlays: Math.max(Number(remote.completePlays || 0), trackStats.completePlays),
      listenSeconds: Math.max(Number(remote.listenSeconds || 0), trackStats.listenSeconds),
    };
  }

  function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function buildArtists() {
    const artists = new Map();
    for (const member of state.collective.members || []) {
      const slug = member.slug || member.artistSlug || member.artistId;
      if (!slug) continue;
      artists.set(slug, {
        slug,
        artistSlug: slug,
        artistId: member.artistId || '',
        name: member.stageName || member.name || slug,
        image: resolveFrom(member.portrait, COLLECTIVE_FILE),
        storefront: resolveFrom(member.storefront || `../${slug}/index.html`, COLLECTIVE_FILE),
        app: resolveFrom(member.app || `../${slug}/app.html`, COLLECTIVE_FILE),
        genres: member.genres || [],
        role: member.role || '',
        trackIds: [],
      });
    }
    for (const app of state.apps.apps || []) {
      const slug = app.slug || app.artistSlug || app.artistId;
      if (!slug) continue;
      const current = artists.get(slug) || {};
      artists.set(slug, {
        ...current,
        slug,
        artistSlug: slug,
        artistId: app.artistId || current.artistId || '',
        name: app.stageName || app.name || current.name || slug,
        image: app.portrait ? resolveFrom(app.portrait, APPS_FILE) : current.image || DEFAULT_ART,
        storefront: app.storefront ? resolveFrom(app.storefront, APPS_FILE) : current.storefront || `./artist-storefronts/${slug}/`,
        app: app.href ? resolveFrom(app.href, APPS_FILE) : current.app || `./artist-storefronts/${slug}/app.html`,
        genres: app.genres || current.genres || [],
        role: current.role || '',
        trackIds: current.trackIds || [],
      });
    }
    for (const artist of state.catalog.artists || []) {
      const slug = artist.artistSlug || artist.slug || artist.artistId;
      if (!slug) continue;
      const current = artists.get(slug) || {};
      artists.set(slug, {
        ...current,
        slug,
        artistSlug: slug,
        artistId: artist.artistId || current.artistId || '',
        name: artist.artistName || artist.name || current.name || slug,
        image: artist.artistImage ? resolveFrom(artist.artistImage, CATALOG_FILE) : current.image || DEFAULT_ART,
        storefront: artist.storefrontUrl ? resolveFrom(artist.storefrontUrl, CATALOG_FILE) : current.storefront || `./artist-storefronts/${slug}/`,
        productRoom: artist.productRoomUrl ? resolveFrom(artist.productRoomUrl, CATALOG_FILE) : `./artist-storefronts/${slug}/products/`,
        app: current.app || `./artist-storefronts/${slug}/app.html`,
        genres: artist.genres || current.genres || [],
        trackIds: unique([...(current.trackIds || []), ...(artist.trackIds || [])]),
        score: artist.score || 0,
      });
    }
    for (const track of state.tracks) {
      const slug = track.artistSlug || track.artistId || track.artistName;
      if (!slug) continue;
      const current = artists.get(slug) || {};
      artists.set(slug, {
        slug,
        artistSlug: slug,
        artistId: track.artistId || current.artistId || '',
        name: current.name || track.artistName || slug,
        image: current.image || resolveFrom(track.artistImage || track.coverImage, CATALOG_FILE),
        storefront: current.storefront || resolveFrom(track.storeUrl || `./artist-storefronts/${slug}/`, CATALOG_FILE),
        app: current.app || `./artist-storefronts/${slug}/app.html`,
        genres: unique([...(current.genres || []), track.genre, ...(track.genres || []).slice(0, 2)]),
        role: current.role || '',
        trackIds: unique([...(current.trackIds || []), track.trackId]),
        score: current.score || track.score || 0,
      });
    }
    state.artists = [...artists.values()].map((artist) => ({ ...artist, stats: artistTraffic(artist) }))
      .sort((a, b) => Number(b.stats.nexusStreams || 0) - Number(a.stats.nexusStreams || 0) || Number((b.trackIds || []).length) - Number((a.trackIds || []).length) || String(a.name).localeCompare(String(b.name)));
  }

  function matchesQuery(track) {
    const query = state.filtered.trim().toLowerCase();
    if (!query) return true;
    return [track.title, track.artistName, track.genre, track.lane, ...(track.genres || [])].join(' ').toLowerCase().includes(query);
  }

  function sortTracks(tracks) {
    return [...tracks].sort((a, b) => {
      const aStats = trafficTrack(a);
      const bStats = trafficTrack(b);
      return Number(bStats.nexusStreams || 0) - Number(aStats.nexusStreams || 0)
        || Number(b.score || 0) - Number(a.score || 0)
        || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  function rankedTracks() {
    return sortTracks(state.tracks.filter(matchesQuery));
  }

  function newDropTracks() {
    return state.tracks
      .filter(matchesQuery)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || Number(b.score || 0) - Number(a.score || 0));
  }

  function playlistTracks(playlist) {
    return (playlist?.trackIds || []).map((id) => state.trackById.get(id)).filter(Boolean);
  }

  function artistTracks(artistOrSlug) {
    const artist = typeof artistOrSlug === 'string'
      ? state.artists.find((item) => item.slug === artistOrSlug || item.artistId === artistOrSlug)
      : artistOrSlug;
    if (!artist) return [];
    const ids = new Set(artist.trackIds || []);
    const keys = [artist.slug, artist.artistSlug, artist.artistId, artist.name]
      .filter(Boolean)
      .map((item) => String(item).toLowerCase());
    return sortTracks(state.tracks.filter((track) => {
      const values = [track.artistSlug, track.artistId, track.artistName].filter(Boolean).map((item) => String(item).toLowerCase());
      return ids.has(track.trackId) || values.some((value) => keys.includes(value));
    }));
  }

  function genreLanes() {
    const lanes = new Map();
    for (const track of rankedTracks()) {
      const genre = track.genre || track.genres?.[0] || 'Nexus Mix';
      if (!lanes.has(genre)) lanes.set(genre, []);
      lanes.get(genre).push(track);
    }
    return [...lanes.entries()]
      .map(([genre, tracks]) => ({ genre, tracks: sortTracks(tracks) }))
      .sort((a, b) => b.tracks.length - a.tracks.length || String(a.genre).localeCompare(String(b.genre)))
      .slice(0, 6);
  }

  function trackImage(track) {
    return resolveFrom(track.coverImage || track.artistImage, CATALOG_FILE);
  }

  function renderTotals() {
    const summary = state.traffic?.trafficSummary || {};
    el.totalStreams.textContent = fmt(summary.nexusStreams || 0);
    el.totalArtists.textContent = fmt(state.artists.length);
    el.totalTracks.textContent = fmt(state.tracks.length);
    el.totalSeconds.textContent = fmt(summary.listenSeconds || 0);
  }

  function renderFeatured() {
    const current = playerState().current;
    const currentTrack = current?.trackId ? state.trackById.get(current.trackId) || current : null;
    const track = currentTrack || rankedTracks()[0] || state.tracks[0];
    if (!track) return;
    const stats = trafficTrack(track);
    const queue = playerState().queue || [];
    state.featuredTrackId = track.trackId;
    el.nowArt.src = trackImage(track);
    el.nowStatus.textContent = currentTrack ? 'Currently Playing' : 'Featured Track';
    el.nowTitle.textContent = track.title || 'SkyeMusicNexus';
    el.nowArtist.textContent = `${track.artistName || 'Music Nexus'} - ${track.lane || track.genre || 'Nexus'}`;
    el.nowGenre.textContent = track.genre || 'Nexus Mix';
    el.nowStreams.textContent = `${compact(stats.nexusStreams || 0)} streams`;
    el.nowQueue.textContent = queue.length ? `${fmt(queue.length)} in queue` : `${fmt(state.tracks.length)} songs ready`;
    el.featuredArtist.href = resolveFrom(track.storeUrl || `./artist-storefronts/${track.artistSlug}/`, CATALOG_FILE);
    el.featuredDrop.href = resolveFrom(track.dropUrl || './public/discover.html', CATALOG_FILE);
    el.playFeatured.onclick = () => playTrackWithQueue(track.trackId, rankedTracks());
  }

  function playlistCard(playlist) {
    const tracks = playlistTracks(playlist);
    const covers = tracks.slice(0, 4);
    return `<article class="nexus-playlist-card">
      <div class="nexus-playlist-card__covers" aria-hidden="true">
        ${covers.map((track) => `<img src="${escapeHtml(trackImage(track))}" alt="">`).join('')}
      </div>
      <strong>${escapeHtml(playlist.title || 'Nexus Playlist')}</strong>
      <p>${escapeHtml(playlist.description || 'A Music Nexus listening lane.')}</p>
      <span>${fmt(tracks.length)} songs</span>
      <button class="nexus-button nexus-button--primary" type="button" data-play-playlist="${escapeHtml(playlist.playlistId)}"${tracks.length ? '' : ' disabled'}>Play</button>
    </article>`;
  }

  function trackCard(track) {
    const stats = trafficTrack(track);
    return `<article class="nexus-track-card">
      <img src="${escapeHtml(trackImage(track))}" alt="">
      <strong>${escapeHtml(track.title || track.trackId)}</strong>
      <span>${escapeHtml(track.artistName || '')}</span>
      <span>${escapeHtml(track.genre || track.lane || 'Nexus Mix')} - ${compact(stats.nexusStreams || 0)} streams</span>
      <div class="nexus-card-actions">
        <button class="nexus-button" type="button" data-play-track="${escapeHtml(track.trackId)}">Play</button>
        <a class="nexus-button" href="${escapeHtml(resolveFrom(track.dropUrl || './public/discover.html', CATALOG_FILE))}">Open</a>
      </div>
    </article>`;
  }

  function genreCard(lane) {
    const lead = lane.tracks[0];
    return `<article class="nexus-genre-card">
      <span>${fmt(lane.tracks.length)} songs</span>
      <strong>${escapeHtml(lane.genre)}</strong>
      <p>${escapeHtml(lead ? `${lead.artistName || 'Artist'} - ${lead.title || 'Track'}` : 'Start a station from this lane.')}</p>
      <button class="nexus-button" type="button" data-play-genre="${escapeHtml(lane.genre)}"${lane.tracks.length ? '' : ' disabled'}>Play Station</button>
    </article>`;
  }

  function artistTile(artist) {
    const stats = artist.stats || artistTraffic(artist);
    const tracks = artistTracks(artist);
    return `<article class="nexus-artist-tile">
      <img src="${escapeHtml(artist.image || DEFAULT_ART)}" alt="">
      <strong>${escapeHtml(artist.name || artist.slug)}</strong>
      <span>${compact(stats.nexusStreams || 0)} streams - ${fmt(tracks.length)} songs</span>
      <div class="nexus-card-actions">
        <button class="nexus-button" type="button" data-play-artist="${escapeHtml(artist.slug)}"${tracks.length ? '' : ' disabled'}>Play</button>
        <a class="nexus-button" href="${escapeHtml(artist.storefront || './artist-storefronts/')}">Store</a>
        <a class="nexus-button" href="./public/artist-dashboard.html?artist=${encodeURIComponent(artist.slug || artist.artistId || '')}">Stats</a>
      </div>
    </article>`;
  }

  function renderLibrary() {
    const library = libraryState();
    const likedIds = (library.likedTrackIds || []).filter((id) => state.trackById.has(id));
    const playlistCount = Array.isArray(library.playlists) ? library.playlists.length : 0;
    el.likedCount.textContent = `${fmt(likedIds.length)} liked ${likedIds.length === 1 ? 'song' : 'songs'}`;
    el.libraryStatus.textContent = playlistCount
      ? `${fmt(playlistCount)} saved playlist${playlistCount === 1 ? '' : 's'} in this browser.`
      : likedIds.length ? 'Your saved tracks are ready in the player.' : 'Save tracks from the player and they appear here.';
    document.querySelectorAll('[data-action="play-liked"]').forEach((button) => {
      button.disabled = likedIds.length === 0;
      button.title = likedIds.length ? 'Play liked songs' : 'Save a song from the player first';
    });
  }

  function renderQueuePreview() {
    const snapshot = playerState();
    const queueIds = snapshot.queue || [];
    const queueTracks = queueIds.map((id) => state.trackById.get(id)).filter(Boolean);
    const fallback = rankedTracks().slice(0, 4);
    const rows = (queueTracks.length ? queueTracks : fallback).slice(0, 5);
    el.queuePreview.innerHTML = rows.length ? rows.map((track, index) => `<article class="nexus-queue-row">
      <img src="${escapeHtml(trackImage(track))}" alt="">
      <span><strong>${escapeHtml(track.title || 'Track')}</strong><span>${escapeHtml(track.artistName || 'Artist')}</span></span>
      <button class="nexus-link-button nexus-queue-index" type="button" data-play-track="${escapeHtml(track.trackId)}">${queueTracks.length ? index + 1 : 'Play'}</button>
    </article>`).join('') : '<p>No queue loaded.</p>';
    el.quickStartTitle.textContent = queueTracks[0]?.title || 'All Nexus Radio';
  }

  function renderPlayerState() {
    const snapshot = playerState();
    const current = snapshot.current?.trackId ? state.trackById.get(snapshot.current.trackId) || snapshot.current : null;
    el.currentTrackTitle.textContent = current?.title || 'Pick a track to start listening';
    el.currentTrackArtist.textContent = current ? `${current.artistName || 'Artist'} - ${current.genre || current.lane || 'Nexus Mix'}` : 'The mini player stays ready across the app.';
    if (current) {
      el.nowQueue.textContent = snapshot.queue?.length ? `${fmt(snapshot.queue.length)} in queue` : 'Playing now';
    }
    renderQueuePreview();
  }

  function renderRails() {
    const tracks = rankedTracks();
    const playlists = Array.isArray(state.catalog.systemPlaylists) ? state.catalog.systemPlaylists : [];
    el.playlistGrid.innerHTML = playlists.slice(0, 5).map(playlistCard).join('') || '<p>No playlists loaded.</p>';
    el.trendingRail.innerHTML = tracks.slice(0, 16).map(trackCard).join('') || '<p>No songs loaded.</p>';
    el.newDropsRail.innerHTML = newDropTracks().slice(0, 12).map(trackCard).join('') || '<p>No recent drops loaded.</p>';
    el.genreShelfGrid.innerHTML = genreLanes().map(genreCard).join('') || '<p>No stations loaded.</p>';
    el.artistGrid.innerHTML = state.artists.slice(0, 12).map(artistTile).join('') || '<p>No artists loaded.</p>';
    el.feedPreview.innerHTML = tracks.slice(0, 5).map((track) => `<article class="nexus-feed-item">
      <strong>${escapeHtml(track.artistName || 'Artist')}</strong>
      <span>${escapeHtml(track.title || 'New release')}</span>
      <span>${compact(trafficTrack(track).nexusStreams || 0)} streams - ${escapeHtml(track.genre || 'Nexus')}</span>
    </article>`).join('');
    el.ownerPulse.innerHTML = state.artists.slice(0, 10).map((artist) => `<article class="nexus-owner-row">
      <strong>${escapeHtml(artist.name || artist.slug)}</strong>
      <span>${compact(artist.stats?.nexusStreams || 0)} streams - ${fmt((artist.trackIds || []).length)} songs</span>
    </article>`).join('');
    renderLibrary();
    renderPlayerState();
  }

  function renderArtistSelector() {
    if (!state.selectedArtistSlug) state.selectedArtistSlug = state.artists[0]?.slug || '';
    el.artistSelect.innerHTML = state.artists.map((artist) => `<option value="${escapeHtml(artist.slug)}"${artist.slug === state.selectedArtistSlug ? ' selected' : ''}>${escapeHtml(artist.name || artist.slug)}</option>`).join('');
    const artist = state.artists.find((item) => item.slug === state.selectedArtistSlug) || state.artists[0];
    if (!artist) return;
    const stats = artist.stats || artistTraffic(artist);
    const tracks = artistTracks(artist);
    el.selectedArtistName.textContent = artist.name || artist.slug;
    el.selectedArtistImage.src = artist.image || DEFAULT_ART;
    el.artistStreams.textContent = fmt(stats.nexusStreams || 0);
    el.artistTracks.textContent = fmt(tracks.length);
    el.artistSeconds.textContent = fmt(stats.listenSeconds || 0);
    el.selectedArtistStore.href = artist.storefront || './artist-storefronts/';
    el.selectedArtistStats.href = `./public/artist-dashboard.html?artist=${encodeURIComponent(artist.slug || artist.artistId || '')}`;
  }

  function playQueueIds(ids) {
    const queue = unique(ids).filter((id) => state.trackById.has(id));
    if (!queue.length) return false;
    const ok = window.SkyeNexusPlayer?.playQueue?.(queue);
    if (!ok) window.SkyeNexusPlayer?.playTrack?.(queue[0], queue);
    window.setTimeout(() => {
      renderFeatured();
      renderPlayerState();
    }, 250);
    return true;
  }

  function playTrackWithQueue(trackId, queueTracks) {
    const queue = (queueTracks || rankedTracks()).map((track) => track.trackId);
    if (!trackId) return false;
    const ok = window.SkyeNexusPlayer?.playTrack?.(trackId, queue);
    window.setTimeout(() => {
      renderFeatured();
      renderPlayerState();
    }, 250);
    return ok !== false;
  }

  function drawPulse() {
    const canvas = el.pulse;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const tracks = rankedTracks().slice(0, 28);
    tracks.forEach((track, index) => {
      const stats = trafficTrack(track);
      const angle = (index / Math.max(1, tracks.length)) * Math.PI * 2 + performance.now() / 10000;
      const ring = Math.floor(index / 7) + 1;
      const radius = 44 + ring * 48 + Math.min(72, Number(stats.nexusStreams || 0) * 8);
      const x = w / 2 + Math.cos(angle) * radius;
      const y = h / 2 + Math.sin(angle) * radius * .62;
      const size = 6 + Math.min(26, Number(stats.nexusStreams || 0) * 5);
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(247,245,234,.12)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = index % 3 === 0 ? 'rgba(110,231,248,.82)' : index % 3 === 1 ? 'rgba(255,117,183,.74)' : 'rgba(255,209,102,.78)';
      ctx.fill();
    });
    requestAnimationFrame(drawPulse);
  }

  function render() {
    buildArtists();
    renderTotals();
    renderFeatured();
    renderRails();
    renderArtistSelector();
  }

  async function load() {
    const [catalog, apps, collective, traffic] = await Promise.all([
      fetchJson(CATALOG_FILE).catch(() => ({ tracks: [], artists: [], systemPlaylists: [] })),
      fetchJson(APPS_FILE).catch(() => ({ apps: [] })),
      fetchJson(COLLECTIVE_FILE).catch(() => ({ members: [] })),
      fetchJson(`${WORKER_ORIGIN}/api/skymusicnexus/music-drops?action=traffic-summary`).catch(() => null),
    ]);
    state.catalog = catalog;
    state.apps = apps;
    state.collective = collective;
    state.traffic = traffic;
    state.tracks = Array.isArray(catalog.tracks) ? catalog.tracks : [];
    state.trackById = new Map(state.tracks.map((track) => [track.trackId, track]));
    render();
  }

  document.addEventListener('click', (event) => {
    const play = event.target.closest('[data-play-track]');
    if (play) {
      event.preventDefault();
      playTrackWithQueue(play.dataset.playTrack, rankedTracks());
    }
    const playlistButton = event.target.closest('[data-play-playlist]');
    if (playlistButton) {
      const playlist = (state.catalog.systemPlaylists || []).find((item) => item.playlistId === playlistButton.dataset.playPlaylist);
      playQueueIds(playlistTracks(playlist).map((track) => track.trackId));
    }
    const genreButton = event.target.closest('[data-play-genre]');
    if (genreButton) {
      const lane = genreLanes().find((item) => item.genre === genreButton.dataset.playGenre);
      playQueueIds((lane?.tracks || []).map((track) => track.trackId));
    }
    const artistButton = event.target.closest('[data-play-artist]');
    if (artistButton) {
      playQueueIds(artistTracks(artistButton.dataset.playArtist).map((track) => track.trackId));
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'start-radio') {
      window.SkyeNexusPlayer?.playRadio?.();
      window.setTimeout(() => {
        renderFeatured();
        renderPlayerState();
      }, 250);
    }
    if (action === 'play-liked') {
      const likedIds = (libraryState().likedTrackIds || []).filter((id) => state.trackById.has(id));
      playQueueIds(likedIds);
    }
    if (action === 'play-selected-artist') {
      playQueueIds(artistTracks(state.selectedArtistSlug).map((track) => track.trackId));
    }
  });

  el.artistSelect?.addEventListener('change', () => {
    state.selectedArtistSlug = el.artistSelect.value;
    renderArtistSelector();
  });
  el.search?.addEventListener('input', () => {
    state.filtered = el.search.value || '';
    renderFeatured();
    renderRails();
  });
  window.addEventListener('skymusicnexus:stream-event', () => window.setTimeout(load, 500));
  window.addEventListener('storage', (event) => {
    if (event.key === PLAYER_LIBRARY_KEY) renderLibrary();
  });

  load();
  setInterval(load, 5000);
  setInterval(renderPlayerState, 1500);
  drawPulse();
})();
