(() => {
  const WORKER_ORIGIN = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
  const TRAFFIC_SUMMARY_URL = `${WORKER_ORIGIN}/api/skymusicnexus/music-drops?action=traffic-summary`;
  const DEFAULT_ART = '../assets/skye-music-nexus-logo.png';
  const PUBLIC_ROOT = new URL('./', location.href);
  const CATALOG_FILE = new URL('./data/playlists.json', PUBLIC_ROOT);
  const APPS_FILE = new URL('../artist-storefronts/artist-apps/artist-apps.json', PUBLIC_ROOT);
  const COLLECTIVE_FILE = new URL('../artist-storefronts/gray-skyes-collective/collective.json', PUBLIC_ROOT);
  const REFRESH_MS = 10000;
  const params = new URLSearchParams(location.search);

  const ZERO_STATS = Object.freeze({
    nexusStreams: 0,
    playStarts: 0,
    completePlays: 0,
    listenSeconds: 0,
  });

  const state = {
    catalog: { tracks: [], artists: [] },
    apps: { apps: [] },
    collective: { members: [] },
    traffic: null,
    trafficStale: false,
    artists: [],
    selected: params.get('artist') || '',
    search: '',
    loading: false,
    lastLoadedAt: null,
    loadErrors: [],
  };

  const el = {
    title: document.getElementById('dashTitle'),
    subtitle: document.getElementById('dashSubtitle'),
    search: document.getElementById('artistDashboardSearch'),
    select: document.getElementById('artistDashboardSelect'),
    badges: document.getElementById('dashBadges'),
    store: document.getElementById('dashStore'),
    app: document.getElementById('dashApp'),
    play: document.getElementById('dashPlay'),
    streams: document.getElementById('dashStreams'),
    tracks: document.getElementById('dashTracks'),
    starts: document.getElementById('dashStarts'),
    seconds: document.getElementById('dashSeconds'),
    ownerSummary: document.getElementById('ownerSummary'),
    ownerBadges: document.getElementById('ownerBadges'),
    ownerArtists: document.getElementById('ownerArtists'),
    ownerStreams: document.getElementById('ownerStreams'),
    ownerTracks: document.getElementById('ownerTracks'),
    ownerStarts: document.getElementById('ownerStarts'),
    ownerSeconds: document.getElementById('ownerSeconds'),
    ownerReadyDrops: document.getElementById('ownerReadyDrops'),
    artistList: document.getElementById('dashboardArtistList'),
    artistResultCount: document.getElementById('artistResultCount'),
    trackList: document.getElementById('dashboardTrackList'),
    trackListTitle: document.getElementById('trackListTitle'),
    map: document.getElementById('artistMap'),
    refresh: document.getElementById('refreshStats'),
    refreshStatus: document.getElementById('refreshStatus'),
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function fmt(value) {
    return new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(number(value))));
  }

  function plural(count, singular, pluralLabel = `${singular}s`) {
    return `${fmt(count)} ${Number(count) === 1 ? singular : pluralLabel}`;
  }

  function fmtDuration(seconds) {
    const total = Math.max(0, Math.round(number(seconds)));
    if (total < 60) return `${fmt(total)} sec`;
    const minutes = Math.floor(total / 60);
    const remaining = total % 60;
    if (minutes < 60) return remaining ? `${fmt(minutes)}m ${remaining}s` : `${fmt(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const leftoverMinutes = minutes % 60;
    return leftoverMinutes ? `${fmt(hours)}h ${leftoverMinutes}m` : `${fmt(hours)}h`;
  }

  function fmtClock(date) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  function resolveFrom(value, baseFile) {
    if (!value) return DEFAULT_ART;
    try {
      return new URL(value, baseFile).href;
    } catch {
      return String(value || DEFAULT_ART);
    }
  }

  function normalizeCatalog(data) {
    return {
      ...data,
      tracks: Array.isArray(data?.tracks) ? data.tracks : [],
      artists: Array.isArray(data?.artists) ? data.artists : [],
    };
  }

  function normalizeApps(data) {
    return {
      ...data,
      apps: Array.isArray(data?.apps) ? data.apps : [],
    };
  }

  function normalizeCollective(data) {
    return {
      ...data,
      members: Array.isArray(data?.members) ? data.members : [],
    };
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} ${response.status}`);
    return response.json();
  }

  async function fetchJsonResult(label, url, fallback, normalize = (value) => value) {
    try {
      return { label, ok: true, data: normalize(await fetchJson(url)) };
    } catch (error) {
      return { label, ok: false, data: fallback, error };
    }
  }

  function rawKey(value) {
    return String(value || '').trim().toLowerCase();
  }

  function slugKey(value) {
    return rawKey(value).replace(/[_\s]+/g, '-');
  }

  function compactKey(value) {
    return rawKey(value).replace(/[^a-z0-9]+/g, '');
  }

  function keySet(...values) {
    const keys = new Set();
    for (const value of values.flat().filter(Boolean)) {
      keys.add(rawKey(value));
      keys.add(slugKey(value));
      keys.add(compactKey(value));
    }
    keys.delete('');
    return keys;
  }

  function hasSharedKey(keys, ...values) {
    return values.flat().filter(Boolean).some((value) => {
      return keys.has(rawKey(value)) || keys.has(slugKey(value)) || keys.has(compactKey(value));
    });
  }

  function uniqueList(...lists) {
    const seen = new Set();
    const values = [];
    for (const item of lists.flat().filter(Boolean)) {
      const label = String(item).trim();
      const key = label.toLowerCase();
      if (!label || seen.has(key)) continue;
      seen.add(key);
      values.push(label);
    }
    return values;
  }

  function metricStats(row) {
    return {
      nexusStreams: number(row?.nexusStreams),
      playStarts: number(row?.playStarts),
      completePlays: number(row?.completePlays),
      listenSeconds: number(row?.listenSeconds),
    };
  }

  function sumStats(rows) {
    return rows.reduce((acc, row) => {
      const stats = metricStats(row);
      acc.nexusStreams += stats.nexusStreams;
      acc.playStarts += stats.playStarts;
      acc.completePlays += stats.completePlays;
      acc.listenSeconds += stats.listenSeconds;
      return acc;
    }, { ...ZERO_STATS });
  }

  function maxStats(...rows) {
    return rows.reduce((acc, row) => {
      const stats = metricStats(row);
      acc.nexusStreams = Math.max(acc.nexusStreams, stats.nexusStreams);
      acc.playStarts = Math.max(acc.playStarts, stats.playStarts);
      acc.completePlays = Math.max(acc.completePlays, stats.completePlays);
      acc.listenSeconds = Math.max(acc.listenSeconds, stats.listenSeconds);
      return acc;
    }, { ...ZERO_STATS });
  }

  function trafficSummary() {
    return state.traffic?.trafficSummary || null;
  }

  function findTrafficTrack(track) {
    const summary = trafficSummary();
    if (!summary) return null;
    const direct = summary.tracks?.[track.trackId] || summary.tracks?.[track.productId] || summary.tracks?.[track.dropId];
    if (direct) return direct;
    const keys = keySet(track.trackId, track.productId, track.dropId, track.title);
    return Object.entries(summary.tracks || {}).find(([id, row]) => {
      return hasSharedKey(keys, id, row.trackId, row.productId, row.dropId, row.title);
    })?.[1] || null;
  }

  function trackStats(track) {
    return metricStats(findTrafficTrack(track));
  }

  function artistKeySet(artist) {
    return keySet(artist.slug, artist.artistSlug, artist.artistId, artist.name, artist.artistName);
  }

  function findTrafficArtist(artist) {
    const summary = trafficSummary();
    if (!summary) return null;
    const direct = summary.artists?.[artist.slug] || summary.artists?.[artist.artistSlug] || summary.artists?.[artist.artistId] || summary.artists?.[artist.name];
    if (direct) return direct;
    const keys = artistKeySet(artist);
    return Object.entries(summary.artists || {}).find(([id, row]) => {
      return hasSharedKey(keys, id, row.artistKey, row.artistSlug, row.artistId, row.artistName);
    })?.[1] || null;
  }

  function catalogTracksFor(artist) {
    if (!artist) return [];
    const ids = new Set((artist.trackIds || []).filter(Boolean));
    const keys = artistKeySet(artist);
    return (state.catalog.tracks || []).filter((track) => {
      if (ids.has(track.trackId)) return true;
      if (hasSharedKey(keys, track.artistSlug, track.artistId, track.artistName)) return true;
      return false;
    });
  }

  function artistStats(artist, tracks = catalogTracksFor(artist)) {
    const remote = findTrafficArtist(artist);
    const fromTracks = sumStats(tracks.map(trackStats));
    return maxStats(remote, fromTracks);
  }

  function trackReadiness(track) {
    return {
      audio: Boolean(track.audioUrl || track.localAudioHref),
      drop: Boolean(track.dropUrl),
      store: Boolean(track.storeUrl || track.productId),
      active: !track.status || track.status === 'active',
      visual: Boolean(track.visualPackage?.status),
    };
  }

  function artistReadiness(artist, tracks = catalogTracksFor(artist)) {
    return {
      app: Boolean(artist.app),
      store: Boolean(artist.storefront || artist.productRoom),
      trackCount: tracks.length,
      activeTracks: tracks.filter((track) => trackReadiness(track).active).length,
      dropReady: tracks.filter((track) => trackReadiness(track).drop).length,
      audioReady: tracks.filter((track) => trackReadiness(track).audio).length,
      storeReady: tracks.filter((track) => trackReadiness(track).store).length,
      visualReady: tracks.filter((track) => trackReadiness(track).visual).length,
    };
  }

  function milestoneProgressFor(kind, target, stats) {
    const wall = state.traffic?.achievementWall || {};
    const rows = kind === 'track' ? wall.trackProgress : wall.artistProgress;
    const keys = kind === 'track'
      ? keySet(target.trackId, target.productId, target.dropId, target.title)
      : artistKeySet(target);
    const direct = (Array.isArray(rows) ? rows : []).find((row) => {
      return kind === 'track'
        ? hasSharedKey(keys, row.trackId, row.title)
        : hasSharedKey(keys, row.artistSlug, row.artistId, row.artistName);
    });
    if (direct?.nextMilestone) return direct.nextMilestone;
    const milestones = Array.isArray(wall.milestones) ? wall.milestones.map(number).filter(Boolean) : [];
    if (!milestones.length) return null;
    const current = number(stats?.nexusStreams);
    const previous = [...milestones].reverse().find((item) => current >= item) || 0;
    const next = milestones.find((item) => current < item) || Math.ceil((current + 1) / 100000) * 100000;
    return {
      current,
      previous,
      next,
      remaining: Math.max(0, next - current),
      percent: next ? Math.max(0, Math.min(100, Math.round((current / next) * 100))) : 100,
    };
  }

  function badge(label, kind = '') {
    const cls = ['nexus-badge', kind ? `nexus-badge--${kind}` : ''].filter(Boolean).join(' ');
    return `<span class="${cls}">${escapeHtml(label)}</span>`;
  }

  function renderBadges(items) {
    return items.filter(Boolean).map((item) => badge(item.label, item.kind)).join('');
  }

  function milestoneBadge(kind, target, stats) {
    if (!trafficSummary()) {
      return { label: 'Live stats waiting', kind: 'warn' };
    }
    const progress = milestoneProgressFor(kind, target, stats);
    if (!progress) return null;
    if (progress.previous > 0 && progress.remaining === 0) {
      return { label: `Milestone ${fmt(progress.previous)}+ streams`, kind: 'ready' };
    }
    if (progress.previous > 0) {
      return { label: `Milestone ${fmt(progress.previous)} reached`, kind: 'ready' };
    }
    if (!number(stats?.nexusStreams)) {
      return { label: `First milestone: ${fmt(progress.next)}`, kind: 'muted' };
    }
    return { label: `${fmt(progress.remaining)} to ${fmt(progress.next)}`, kind: 'warn' };
  }

  function mergeArtistRecord(map, slug, next) {
    if (!slug) return;
    const existing = map.get(slug) || {};
    const trackIds = uniqueList(existing.trackIds || [], next.trackIds || []);
    map.set(slug, {
      ...existing,
      ...next,
      slug,
      artistSlug: slug,
      trackIds,
      genres: uniqueList(existing.genres || [], next.genres || []),
      name: next.name || existing.name || slug,
      artistId: next.artistId || existing.artistId || '',
      image: next.image || existing.image || DEFAULT_ART,
      storefront: next.storefront || existing.storefront || `../artist-storefronts/${slug}/`,
      productRoom: next.productRoom || existing.productRoom || `../artist-storefronts/${slug}/products/`,
      app: next.app || existing.app || `../artist-storefronts/${slug}/app.html`,
    });
  }

  function buildArtists() {
    const map = new Map();
    for (const member of state.collective.members || []) {
      const slug = member.slug || member.artistSlug || member.artistId;
      if (!slug) continue;
      mergeArtistRecord(map, slug, {
        artistId: member.artistId || '',
        name: member.stageName || member.name || slug,
        image: member.portrait ? resolveFrom(member.portrait, COLLECTIVE_FILE) : DEFAULT_ART,
        storefront: member.storefront ? resolveFrom(member.storefront, COLLECTIVE_FILE) : resolveFrom(`../${slug}/index.html`, COLLECTIVE_FILE),
        productRoom: member.products ? resolveFrom(member.products, COLLECTIVE_FILE) : resolveFrom(`../${slug}/products/`, COLLECTIVE_FILE),
        app: member.app ? resolveFrom(member.app, COLLECTIVE_FILE) : resolveFrom(`../${slug}/app.html`, COLLECTIVE_FILE),
        genres: member.genres || [],
        role: member.role || '',
        homeBase: member.homeBase || '',
        archetype: member.archetype || '',
        featured: Boolean(member.featured),
      });
    }
    for (const app of state.apps.apps || []) {
      const slug = app.slug || app.artistSlug || app.artistId;
      if (!slug) continue;
      mergeArtistRecord(map, slug, {
        artistId: app.artistId || '',
        name: app.stageName || app.name || slug,
        image: app.portrait ? resolveFrom(app.portrait, APPS_FILE) : '',
        storefront: app.storefront ? resolveFrom(app.storefront, APPS_FILE) : '',
        productRoom: app.productRoom ? resolveFrom(app.productRoom, APPS_FILE) : '',
        app: app.href ? resolveFrom(app.href, APPS_FILE) : '',
        manifest: app.manifest ? resolveFrom(app.manifest, APPS_FILE) : '',
        genres: app.genres || [],
        role: app.role || '',
        featured: Boolean(app.featured),
      });
    }
    for (const artist of state.catalog.artists || []) {
      const slug = artist.artistSlug || artist.slug || artist.artistId;
      if (!slug) continue;
      mergeArtistRecord(map, slug, {
        artistId: artist.artistId || '',
        name: artist.artistName || artist.name || slug,
        image: artist.artistImage ? resolveFrom(artist.artistImage, CATALOG_FILE) : '',
        storefront: artist.storefrontUrl ? resolveFrom(artist.storefrontUrl, CATALOG_FILE) : '',
        productRoom: artist.productRoomUrl ? resolveFrom(artist.productRoomUrl, CATALOG_FILE) : '',
        genres: artist.genres || [],
        trackIds: artist.trackIds || [],
        score: number(artist.score),
      });
    }
    for (const track of state.catalog.tracks || []) {
      const slug = track.artistSlug || track.artistId;
      if (!slug || !track.trackId) continue;
      const existing = map.get(slug);
      if (existing) {
        existing.trackIds = uniqueList(existing.trackIds || [], [track.trackId]);
      } else {
        mergeArtistRecord(map, slug, {
          artistId: track.artistId || '',
          name: track.artistName || slug,
          image: track.artistImage ? resolveFrom(track.artistImage, CATALOG_FILE) : DEFAULT_ART,
          storefront: track.storeUrl ? resolveFrom(track.storeUrl, CATALOG_FILE) : '',
          genres: track.genres || [track.genre].filter(Boolean),
          trackIds: [track.trackId],
        });
      }
    }
    state.artists = [...map.values()].map((artist) => {
      const tracks = catalogTracksFor(artist);
      const stats = artistStats(artist, tracks);
      return {
        ...artist,
        trackIds: uniqueList(artist.trackIds || [], tracks.map((track) => track.trackId)),
        stats,
        readiness: artistReadiness(artist, tracks),
      };
    }).sort((a, b) => {
      return number(b.stats.nexusStreams) - number(a.stats.nexusStreams)
        || number(b.readiness.trackCount) - number(a.readiness.trackCount)
        || Number(b.featured) - Number(a.featured)
        || String(a.name).localeCompare(String(b.name));
    });

    const owner = state.artists.find((artist) => artist.role === 'collective_owner')
      || state.artists.find((artist) => artist.artistId === state.collective.ownerArtistId)
      || state.artists[0];
    const selected = state.artists.find((artist) => artist.slug === state.selected || artist.artistId === state.selected);
    if (selected) {
      state.selected = selected.slug;
    } else if (params.get('collective') && owner) {
      state.selected = owner.slug;
    } else {
      state.selected = state.artists[0]?.slug || '';
    }
  }

  function selectedArtist() {
    return state.artists.find((artist) => artist.slug === state.selected || artist.artistId === state.selected) || state.artists[0] || null;
  }

  function selectedTracks(artist) {
    return catalogTracksFor(artist).sort((a, b) => {
      const aStats = trackStats(a);
      const bStats = trackStats(b);
      return number(bStats.nexusStreams) - number(aStats.nexusStreams)
        || number(bStats.playStarts) - number(aStats.playStarts)
        || number(bStats.listenSeconds) - number(aStats.listenSeconds)
        || number(b.score) - number(a.score)
        || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  function filteredArtists() {
    const query = state.search.trim().toLowerCase();
    if (!query) return state.artists;
    return state.artists.filter((artist) => {
      const tracks = catalogTracksFor(artist);
      const haystack = [
        artist.name,
        artist.slug,
        artist.artistId,
        artist.role,
        artist.homeBase,
        artist.archetype,
        ...(artist.genres || []),
        ...tracks.map((track) => track.title || track.trackId),
        ...tracks.map((track) => track.lane || ''),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }

  function updateSelectedUrl() {
    const next = new URL(location.href);
    if (state.selected) next.searchParams.set('artist', state.selected);
    next.searchParams.delete('collective');
    history.replaceState(null, '', `${next.pathname}${next.search}${next.hash}`);
  }

  function setRefreshStatus(text) {
    if (el.refreshStatus) el.refreshStatus.textContent = text;
  }

  function renderHero() {
    const artist = selectedArtist();
    if (!artist) {
      el.title.textContent = 'Artist Stats';
      el.subtitle.textContent = 'No artist roster is loaded yet.';
      el.streams.textContent = '0';
      el.tracks.textContent = '0';
      el.starts.textContent = '0';
      el.seconds.textContent = '0';
      el.badges.innerHTML = renderBadges([{ label: 'Roster waiting', kind: 'warn' }]);
      el.play.disabled = true;
      return;
    }
    const stats = artist.stats || artistStats(artist);
    const tracks = selectedTracks(artist);
    const readiness = artist.readiness || artistReadiness(artist, tracks);
    const streamText = trafficSummary()
      ? `${fmt(stats.nexusStreams)} Nexus streams across ${plural(tracks.length, 'catalog song')}.`
      : `${plural(tracks.length, 'catalog song')} loaded. Live stream stats are unavailable right now.`;

    el.title.textContent = artist.name || artist.slug;
    el.subtitle.textContent = streamText;
    el.streams.textContent = fmt(stats.nexusStreams);
    el.tracks.textContent = fmt(tracks.length);
    el.starts.textContent = fmt(stats.playStarts);
    el.seconds.textContent = fmt(stats.listenSeconds);
    el.store.href = artist.productRoom || artist.storefront || '../artist-storefronts/';
    el.app.href = artist.app || artist.storefront || '../artist-storefronts/';
    el.trackListTitle.textContent = `${artist.name || artist.slug} top tracks`;
    el.play.disabled = tracks.length === 0;
    el.play.onclick = () => {
      const ids = tracks.map((track) => track.trackId).filter(Boolean);
      if (ids.length) window.SkyeNexusPlayer?.playTrack?.(ids[0], ids);
    };
    el.badges.innerHTML = renderBadges([
      trafficSummary()
        ? { label: state.trafficStale ? 'Last live stats kept' : 'Live stats connected', kind: state.trafficStale ? 'warn' : 'ready' }
        : { label: 'Live stats waiting', kind: 'warn' },
      milestoneBadge('artist', artist, stats),
      { label: readiness.app ? 'Artist app ready' : 'Artist app missing', kind: readiness.app ? 'ready' : 'muted' },
      { label: readiness.store ? 'Storefront ready' : 'Storefront missing', kind: readiness.store ? 'ready' : 'muted' },
      { label: `${fmt(readiness.dropReady)} drop links`, kind: readiness.dropReady ? 'ready' : 'muted' },
      { label: `${fmt(readiness.audioReady)} audio links`, kind: readiness.audioReady ? 'ready' : 'muted' },
    ]);
  }

  function renderSelect() {
    const artists = state.artists;
    if (!artists.length) {
      el.select.disabled = true;
      el.select.innerHTML = '<option>No artists loaded</option>';
      return;
    }
    el.select.disabled = false;
    el.select.innerHTML = artists.map((artist) => {
      const stats = artist.stats || artistStats(artist);
      const label = `${artist.name || artist.slug} - ${fmt(stats.nexusStreams)} streams`;
      return `<option value="${escapeHtml(artist.slug)}"${artist.slug === state.selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('');
  }

  function renderArtistList() {
    const artists = filteredArtists();
    if (el.artistResultCount) {
      el.artistResultCount.textContent = state.search
        ? `${fmt(artists.length)} of ${fmt(state.artists.length)} artists`
        : `${fmt(state.artists.length)} artists`;
    }
    if (!state.artists.length) {
      el.artistList.innerHTML = '<div class="nexus-dashboard-empty">No artists are available from the collective, app, or catalog files yet.</div>';
      return;
    }
    if (!artists.length) {
      el.artistList.innerHTML = `<div class="nexus-dashboard-empty">No artists match "${escapeHtml(state.search)}". Try another artist name, genre, or song title.</div>`;
      return;
    }
    el.artistList.innerHTML = artists.map((artist, index) => {
      const stats = artist.stats || artistStats(artist);
      const readiness = artist.readiness || artistReadiness(artist);
      const selected = artist.slug === state.selected;
      const tags = renderBadges([
        milestoneBadge('artist', artist, stats),
        { label: `${fmt(readiness.trackCount)} songs`, kind: readiness.trackCount ? 'ready' : 'muted' },
        { label: `${fmt(readiness.dropReady)} drops`, kind: readiness.dropReady ? 'ready' : 'muted' },
        artist.featured ? { label: 'Featured', kind: 'warn' } : null,
      ]);
      return `<article class="nexus-dashboard-artist-row${selected ? ' is-selected' : ''}">
        <img class="nexus-dashboard-avatar" src="${escapeHtml(artist.image || DEFAULT_ART)}" alt="">
        <div>
          <strong>${index + 1}. ${escapeHtml(artist.name || artist.slug)}</strong>
          <span>${fmt(stats.nexusStreams)} streams - ${fmt(stats.playStarts)} starts - ${fmt(stats.listenSeconds)} listen sec</span>
          <div class="nexus-badge-row">${tags}</div>
        </div>
        <button class="nexus-button" type="button" data-artist="${escapeHtml(artist.slug)}">${selected ? 'Viewing' : 'View'}</button>
      </article>`;
    }).join('');
  }

  function renderOwner() {
    const totals = sumStats(state.artists.map((artist) => artist.stats || artistStats(artist)));
    const catalogTracks = state.catalog.tracks || [];
    const readyDrops = catalogTracks.filter((track) => trackReadiness(track).drop).length;
    const appsCount = Array.isArray(state.apps.apps) ? state.apps.apps.length : 0;
    const storefronts = state.artists.filter((artist) => artist.storefront).length;
    const artistsWithSongs = state.artists.filter((artist) => number(artist.readiness?.trackCount) > 0).length;
    const topArtist = state.artists.find((artist) => number(artist.stats?.nexusStreams) > 0);

    el.ownerArtists.textContent = fmt(state.artists.length);
    el.ownerStreams.textContent = fmt(totals.nexusStreams);
    el.ownerTracks.textContent = fmt(catalogTracks.length);
    el.ownerStarts.textContent = fmt(totals.playStarts);
    el.ownerSeconds.textContent = fmt(totals.listenSeconds);
    el.ownerReadyDrops.textContent = fmt(readyDrops);

    if (!state.artists.length) {
      el.ownerSummary.textContent = 'No collective roster is loaded yet.';
    } else if (trafficSummary()) {
      el.ownerSummary.textContent = `${plural(state.artists.length, 'roster artist')} with ${plural(catalogTracks.length, 'catalog song')}. Live events show ${fmt(totals.nexusStreams)} streams, ${fmt(totals.playStarts)} starts, and ${fmtDuration(totals.listenSeconds)} of listening for the visible roster.`;
    } else {
      el.ownerSummary.textContent = `${plural(state.artists.length, 'roster artist')} and ${plural(catalogTracks.length, 'catalog song')} loaded. Live stream stats are not available right now.`;
    }

    el.ownerBadges.innerHTML = renderBadges([
      trafficSummary()
        ? { label: state.trafficStale ? 'Using last live stats' : 'Live stats connected', kind: state.trafficStale ? 'warn' : 'ready' }
        : { label: 'Live stats waiting', kind: 'warn' },
      { label: `${fmt(appsCount)} artist apps`, kind: appsCount ? 'ready' : 'muted' },
      { label: `${fmt(storefronts)} storefronts`, kind: storefronts ? 'ready' : 'muted' },
      { label: `${fmt(readyDrops)} ready drops`, kind: readyDrops ? 'ready' : 'muted' },
      { label: `${fmt(artistsWithSongs)} artists with songs`, kind: artistsWithSongs ? 'ready' : 'muted' },
      topArtist ? { label: `Top: ${topArtist.name} (${fmt(topArtist.stats.nexusStreams)})`, kind: 'warn' } : { label: 'Top stream artist pending', kind: 'muted' },
    ]);
  }

  function trackAction(label, href) {
    if (!href) return `<span class="nexus-mini-action is-disabled" aria-disabled="true">${escapeHtml(label)}</span>`;
    return `<a class="nexus-mini-action" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  }

  function renderTrackList() {
    const artist = selectedArtist();
    const tracks = selectedTracks(artist);
    if (!artist) {
      el.trackList.innerHTML = '<div class="nexus-dashboard-empty">Choose an artist to see top tracks.</div>';
      return;
    }
    if (!tracks.length) {
      el.trackList.innerHTML = `<div class="nexus-dashboard-empty">${escapeHtml(artist.name || artist.slug)} does not have songs in the active public catalog yet. App and storefront links stay available when present.</div>`;
      return;
    }
    const rows = tracks.map((track, index) => {
      const stats = trackStats(track);
      const ready = trackReadiness(track);
      const storeHref = track.storeUrl ? resolveFrom(track.storeUrl, CATALOG_FILE) : artist.productRoom || artist.storefront;
      const dropHref = track.dropUrl ? resolveFrom(track.dropUrl, CATALOG_FILE) : '';
      const image = resolveFrom(track.coverImage || track.artistImage, CATALOG_FILE);
      const readinessBadges = renderBadges([
        milestoneBadge('track', track, stats),
        { label: ready.active ? 'Active' : 'Not active', kind: ready.active ? 'ready' : 'warn' },
        { label: ready.audio ? 'Audio linked' : 'Audio missing', kind: ready.audio ? 'ready' : 'muted' },
        { label: ready.drop ? 'Drop ready' : 'Drop missing', kind: ready.drop ? 'ready' : 'muted' },
        { label: ready.store ? 'Store ready' : 'Store missing', kind: ready.store ? 'ready' : 'muted' },
      ]);
      return `<tr>
        <td>${index + 1}</td>
        <td>
          <div class="nexus-track-cell">
            <img src="${escapeHtml(image)}" alt="">
            <div>
              <strong>${escapeHtml(track.title || track.trackId)}</strong>
              <span>${escapeHtml(track.lane || track.genre || track.artistName || '')}</span>
            </div>
          </div>
        </td>
        <td>${fmt(stats.nexusStreams)}</td>
        <td>${fmt(stats.playStarts)}</td>
        <td>${fmtDuration(stats.listenSeconds)}</td>
        <td><div class="nexus-badge-row">${readinessBadges}</div></td>
        <td>
          <div class="nexus-table-actions">
            <button class="nexus-mini-action" type="button" data-play-track="${escapeHtml(track.trackId)}">Play</button>
            ${trackAction('Store', storeHref)}
            ${trackAction('Drop', dropHref)}
          </div>
        </td>
      </tr>`;
    }).join('');
    el.trackList.innerHTML = `<table>
      <thead>
        <tr>
          <th>#</th>
          <th>Track</th>
          <th>Streams</th>
          <th>Starts</th>
          <th>Listen</th>
          <th>Readiness</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function drawMap() {
    const canvas = el.map;
    const ctx = canvas?.getContext?.('2d');
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(247,245,234,.68)';
    ctx.font = '700 18px sans-serif';
    if (!state.artists.length) {
      ctx.fillText('Roster loading', 24, 40);
      requestAnimationFrame(drawMap);
      return;
    }
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(247,245,234,.78)';
    ctx.fill();
    state.artists.slice(0, 32).forEach((artist, index) => {
      const stats = artist.stats || artistStats(artist);
      const angle = (index / 32) * Math.PI * 2 + performance.now() / 12000;
      const ring = 1 + (index % 4);
      const radius = 34 + ring * 44 + Math.min(62, number(stats.nexusStreams) * 7);
      const x = w / 2 + Math.cos(angle) * radius;
      const y = h / 2 + Math.sin(angle) * radius * .58;
      const size = 6 + Math.min(24, number(stats.nexusStreams) * 4);
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
    requestAnimationFrame(drawMap);
  }

  function render() {
    buildArtists();
    renderSelect();
    renderHero();
    renderArtistList();
    renderOwner();
    renderTrackList();
  }

  async function load(options = {}) {
    if (state.loading) return;
    state.loading = true;
    state.loadErrors = [];
    if (el.refresh) el.refresh.disabled = true;
    if (!options.silent) setRefreshStatus('Refreshing live stats...');

    const [catalog, apps, collective, traffic] = await Promise.all([
      fetchJsonResult('catalog', CATALOG_FILE, state.catalog, normalizeCatalog),
      fetchJsonResult('artist apps', APPS_FILE, state.apps, normalizeApps),
      fetchJsonResult('collective', COLLECTIVE_FILE, state.collective, normalizeCollective),
      fetchJsonResult('live stats', TRAFFIC_SUMMARY_URL, null),
    ]);

    if (catalog.ok) state.catalog = catalog.data;
    else state.loadErrors.push(catalog.label);
    if (apps.ok) state.apps = apps.data;
    else state.loadErrors.push(apps.label);
    if (collective.ok) state.collective = collective.data;
    else state.loadErrors.push(collective.label);
    if (traffic.ok && traffic.data?.trafficSummary) {
      state.traffic = traffic.data;
      state.trafficStale = false;
      state.lastLoadedAt = new Date();
    } else {
      state.trafficStale = Boolean(state.traffic);
      state.loadErrors.push(traffic.label);
    }

    render();

    if (state.loadErrors.includes('live stats')) {
      setRefreshStatus(state.trafficStale && state.lastLoadedAt
        ? `Refresh failed; last live stats ${fmtClock(state.lastLoadedAt)}`
        : 'Live stats unavailable');
    } else if (state.loadErrors.length) {
      setRefreshStatus(`Updated ${fmtClock(state.lastLoadedAt || new Date())}; ${state.loadErrors.join(', ')} unavailable`);
    } else {
      setRefreshStatus(`Updated ${fmtClock(state.lastLoadedAt || new Date())}`);
    }

    state.loading = false;
    if (el.refresh) el.refresh.disabled = false;
  }

  el.search.addEventListener('input', () => {
    state.search = el.search.value || '';
    renderSelect();
    renderArtistList();
  });

  el.select.addEventListener('change', () => {
    state.selected = el.select.value;
    updateSelectedUrl();
    renderHero();
    renderArtistList();
    renderTrackList();
  });

  el.artistList.addEventListener('click', (event) => {
    const artist = event.target.closest('[data-artist]')?.dataset.artist;
    if (!artist) return;
    state.selected = artist;
    updateSelectedUrl();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.addEventListener('click', (event) => {
    const trackId = event.target.closest('[data-play-track]')?.dataset.playTrack;
    if (!trackId) return;
    const artist = selectedArtist();
    window.SkyeNexusPlayer?.playTrack?.(trackId, selectedTracks(artist).map((track) => track.trackId));
  });

  el.refresh.addEventListener('click', () => load());
  window.addEventListener('skymusicnexus:stream-event', () => window.setTimeout(() => load({ silent: true }), 500));

  load();
  setInterval(() => load({ silent: true }), REFRESH_MS);
  drawMap();
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
