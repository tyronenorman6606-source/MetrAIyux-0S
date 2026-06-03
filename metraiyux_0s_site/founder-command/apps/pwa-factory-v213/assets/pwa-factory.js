(() => {
  const ARTIST_REGISTRY_URL = '/api/founder-command/pwa-factory/artists?view=registry';
  const COLLECTIVE_URL = '/api/founder-command/pwa-factory/artists?view=collective';
  const STORE_API = '/api/skymusicnexus/music-store';
  const ASSETS_API = '/api/skymusicnexus/music-assets';
  const GATE_AI_API = '/api/founder-command/pwa-factory/analyze';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const state = {
    sourceMode: 'nexus',
    artists: [],
    collective: null,
    tracks: [],
    uploadedProjectFiles: [],
    htmlSource: '',
    sourceKind: 'nexus',
    sourceArtist: null,
    iconFile: null,
    manifest: {
      name: 'Skye Artist Drop',
      short_name: 'SkyeDrop',
      description: 'Installable Skye Radio music drop minted from Founder Command.',
      theme_color: '#d4af37',
      background_color: '#07090d',
      display: 'standalone',
      start_url: './index.html',
      scope: './'
    }
  };

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const slugify = (value = '') => String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'skye-drop';

  const money = (cents = 0) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

  function cleanGateToken(value) {
    return String(value || '').replace(/^Bearer(?:\s+|$)/i, '').trim();
  }

  function storedGateToken() {
    const bridge = window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
    const session = bridge?.requireSession?.({ platformId: 'pwa-factory', usageLane: 'pwa-drop-factory' }) || bridge?.current?.();
    return cleanGateToken(session?.token || '');
  }

  function gateHeaders(extra = {}) {
    const bridgeHeaders = window.MetrAIyuxGateBridge?.headers?.({
      'x-skye-platform': 'pwa-factory',
      'x-skye-usage-lane': 'pwa-drop-factory'
    }) || {};
    const token = storedGateToken();
    const headers = { ...bridgeHeaders, ...extra };
    if (token) {
      headers.authorization = headers.authorization || `Bearer ${token}`;
      headers['x-free99-gate-session'] = headers['x-free99-gate-session'] || token;
      headers['x-skye-gate-session'] = headers['x-skye-gate-session'] || token;
    }
    return headers;
  }

  function normalizePath(value = '') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^(blob:|data:|https?:\/\/)/i.test(raw)) return raw;
    return raw.startsWith('/') ? raw : `/SkyeMusicNexus/artist-storefronts/${raw.replace(/^\.\.?\//, '')}`;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { credentials: 'include', cache: 'no-store', headers: gateHeaders() });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  function audioStreamUrl(assetId) {
    return `${ASSETS_API}?action=stream&id=${encodeURIComponent(assetId)}`;
  }

  function artistStoreApiUrl(artistId) {
    return `${STORE_API}?artistId=${encodeURIComponent(artistId)}`;
  }

  function setReceipt(value) {
    const box = $('#receiptBox');
    if (!box) return;
    box.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }

  function syncManifestInputs() {
    $('#manifestName').value = state.manifest.name || '';
    $('#manifestShort').value = state.manifest.short_name || '';
    $('#manifestDescription').value = state.manifest.description || '';
    $('#themeColor').value = /^#[0-9a-f]{6}$/i.test(state.manifest.theme_color) ? state.manifest.theme_color : '#d4af37';
  }

  function readManifestInputs() {
    state.manifest.name = $('#manifestName').value.trim() || 'Skye Artist Drop';
    state.manifest.short_name = ($('#manifestShort').value.trim() || 'SkyeDrop').replace(/[^a-z0-9 _-]/gi, '').slice(0, 18);
    state.manifest.description = $('#manifestDescription').value.trim() || 'Installable Skye Radio music drop.';
    state.manifest.theme_color = $('#themeColor').value || '#d4af37';
    state.manifest.background_color = '#07090d';
    state.manifest.display = 'standalone';
    state.manifest.start_url = './index.html';
    state.manifest.scope = './';
  }

  function setSourceMode(mode) {
    state.sourceMode = mode;
    $$('[data-source-mode]').forEach((button) => button.classList.toggle('active', button.dataset.sourceMode === mode));
    $('#sourceNexus').classList.toggle('active', mode === 'nexus');
    $('#sourceAudio').classList.toggle('active', mode === 'audio');
    $('#sourceHtml').classList.toggle('active', mode === 'html');
  }

  function buildTrackRows(products = [], assets = [], artist = {}) {
    const assetsById = new Map(assets.map((asset) => [asset.id || asset.assetId, asset]));
    return products
      .filter((product) => product.assetId || product.status === 'active')
      .map((product, index) => {
        const asset = assetsById.get(product.assetId) || assets[index] || {};
        const assetId = product.assetId || asset.id || asset.assetId || '';
        const title = product.title || asset.title || `${artist.stageName || artist.name || 'Artist'} Track ${index + 1}`;
        return {
          title,
          artistName: artist.stageName || artist.name || product.artistName || 'Skye Artist',
          artistId: product.artistId || artist.artistId || '',
          artistSlug: artist.slug || '',
          productId: product.productId || product.id || '',
          priceCents: Number(product.priceCents || 444),
          assetId,
          finalUrl: assetId ? audioStreamUrl(assetId) : '',
          previewUrl: assetId ? audioStreamUrl(assetId) : '',
          buyUrl: product.artistId ? artistStoreApiUrl(product.artistId) : normalizePath(artist.storefront || `${artist.slug}/`),
          contentType: asset.contentType || 'audio/mpeg',
          bytes: Number(asset.bytes || 0),
          source: 'nexus'
        };
      });
  }

  async function loadArtistTracks(artist, mode) {
    const [store, assets] = await Promise.all([
      fetchJson(`${STORE_API}?artistId=${encodeURIComponent(artist.artistId)}`),
      fetchJson(`${ASSETS_API}?action=list&artistId=${encodeURIComponent(artist.artistId)}`)
    ]);
    let tracks = buildTrackRows(store.products || [], assets.assets || [], artist);
    if (mode === 'single') tracks = tracks.slice(-1);
    if (!tracks.length) {
      throw new Error(`${artist.stageName || artist.name || 'Selected artist'} has no live SkyeMusicNexus product asset attached. Add a real Nexus product/asset or use the audio upload lane before minting a PWA.`);
    }
    return tracks;
  }

  async function buildNexusDrop(mode) {
    const selected = state.artists.find((artist) => artist.slug === $('#artistSelect').value) || state.artists[0];
    if (!selected) throw new Error('Artist registry is empty.');
    setReceipt(`Loading ${mode} drop for ${selected.stageName || selected.slug}...`);
    let artist = selected;
    let tracks = [];
    if (mode === 'collective') {
      artist = {
        stageName: 'Gray Gang',
        name: 'Gray Gang',
        slug: 'gray-skyes-collective',
        artistId: selected.artistId || '',
        portrait: 'assets/skyes-over-london-deity-logo.png',
        genres: ['collective drop', 'Skye Radio'],
        storefront: '/SkyeMusicNexus/artist-storefronts/',
        app: '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/'
      };
      const batches = await Promise.all(state.artists.map((member) => loadArtistTracks(member, 'album').catch(() => [])));
      tracks = batches.flat().filter((track) => track.finalUrl);
    } else {
      tracks = await loadArtistTracks(selected, mode);
    }
    if (!tracks.length) throw new Error('No live SkyeMusicNexus tracks were available for this drop. Add real Nexus assets or use the audio upload lane before minting a PWA.');
    const title = mode === 'collective'
      ? 'Gray Gang Skye Radio'
      : `${artist.stageName || artist.name || 'Skye Artist'} ${mode === 'album' ? 'Album Drop' : 'Single Drop'}`;
    setDrop({ artist, tracks, title, sourceKind: 'nexus' });
  }

  function setDrop({ artist, tracks, title, sourceKind }) {
    state.sourceArtist = artist;
    state.tracks = tracks;
    state.sourceKind = sourceKind;
    state.manifest.name = title || 'Skye Artist Drop';
    state.manifest.short_name = slugify(title || 'SkyeDrop').replace(/-/g, '').slice(0, 12) || 'SkyeDrop';
    state.manifest.description = `${artist.stageName || artist.name || 'Skye Artist'} installable Skye Radio music drop.`;
    syncManifestInputs();
    state.htmlSource = renderDropHtml({ preview: false });
    updatePreview();
    renderTracks();
    setReceipt({
      ok: true,
      sourceKind,
      title,
      tracks: tracks.length,
      note: sourceKind === 'audio-upload'
        ? 'Local audio file will be bundled into the PWA zip.'
        : 'Nexus streams will be bundled into the zip when same-origin gate fetch succeeds.'
    });
  }

  function trackForRender(track, preview) {
    return {
      ...track,
      streamUrl: preview ? (track.previewUrl || track.finalUrl || track.localFileName || '') : (track.localFileName || track.finalUrl || '')
    };
  }

  function renderDropHtml({ preview = false, tracksOverride = null } = {}) {
    readManifestInputs();
    const artist = state.sourceArtist || {};
    const tracks = (tracksOverride || state.tracks).map((track) => trackForRender(track, preview));
    const stageName = artist.stageName || artist.name || $('#audioArtistInput')?.value || 'Skye Artist';
    const title = state.manifest.name || `${stageName} Drop`;
    const portrait = normalizePath(artist.portrait || artist.image || 'assets/skyes-over-london-deity-logo.png');
    const storeUrl = normalizePath(artist.storefront || artist.href || '/SkyeMusicNexus/artist-storefronts/');
    const appUrl = normalizePath(artist.app || artist.href || storeUrl);
    const trackData = JSON.stringify(tracks).replace(/</g, '\\u003c');
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(state.manifest.description)}">
  <meta name="theme-color" content="${escapeHtml(state.manifest.theme_color)}">
  <link rel="manifest" href="manifest.json">
  <style>
    :root{color-scheme:dark;--bg:#050506;--ink:#fff8e7;--muted:#b7b1a5;--gold:${escapeHtml(state.manifest.theme_color)};--cyan:#52d9ff;--line:rgba(255,255,255,.16)}
    *{box-sizing:border-box} body{margin:0;min-height:100vh;background:linear-gradient(135deg,#050506,#121018 54%,#050506);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif;letter-spacing:0}
    body:before{content:"";position:fixed;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px);background-size:42px 42px;opacity:.42;pointer-events:none}
    main{position:relative;width:min(1100px,calc(100% - 28px));margin:0 auto;padding:22px 0 54px}
    header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}
    a{color:inherit}.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:950}.brand img{width:44px;height:44px;border-radius:8px;object-fit:cover;border:1px solid var(--line);background:#111}
    .btn{display:inline-flex;align-items:center;justify-content:center;min-height:38px;border:1px solid var(--line);border-radius:8px;padding:9px 12px;text-decoration:none;background:rgba(255,255,255,.06);font-weight:900}
    .btn.primary{color:#050506;background:linear-gradient(90deg,#fff,var(--gold),var(--cyan))}
    .hero{padding:clamp(34px,8vw,86px) 0 20px}.micro{margin:0 0 12px;color:var(--gold);font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.2em}
    h1{margin:0;font-size:clamp(48px,11vw,126px);line-height:.82;letter-spacing:0;overflow-wrap:anywhere}.lede{max-width:760px;color:var(--muted);font-size:clamp(17px,2vw,22px);line-height:1.45}
    .player{border:1px solid var(--line);border-radius:8px;padding:16px;background:rgba(0,0,0,.42);display:grid;gap:12px}.now h2{margin:0;font-size:clamp(28px,5vw,58px);line-height:.92}
    audio{width:100%;min-height:44px}.tracks{display:grid;gap:10px}.track{display:grid;grid-template-columns:76px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:12px;background:rgba(255,255,255,.045)}
    .track strong{display:block;overflow-wrap:anywhere}.track span{display:block;color:var(--muted);font-size:12px;margin-top:3px}footer{margin-top:24px;color:var(--muted);font-size:13px}
    @media(max-width:720px){header,.track{grid-template-columns:1fr;display:grid}.btn{width:100%}}
  </style>
</head>
<body>
  <main>
    <header>
      <a class="brand" href="${escapeHtml(appUrl)}"><img src="${escapeHtml(portrait)}" alt=""><span>${escapeHtml(stageName)}</span></a>
      <a class="btn" href="${escapeHtml(storeUrl)}">Storefront</a>
    </header>
    <section class="hero">
      <p class="micro">Skye Radio / Installable Drop</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="lede">${escapeHtml(state.manifest.description)}</p>
    </section>
    <section class="player">
      <p class="micro">Now playing</p>
      <div class="now">
        <h2 id="nowTitle">${escapeHtml(tracks[0]?.title || 'No track attached yet')}</h2>
        <audio id="skyeRadio" controls preload="metadata" src="${escapeHtml(tracks[0]?.streamUrl || '')}"></audio>
      </div>
      <div class="tracks" id="trackList"></div>
    </section>
    <footer>Skye Radio PWA package. Product purchases stay connected to SkyPay and SkyeMusicNexus.</footer>
  </main>
  <script>
    const tracks = ${trackData};
    const player = document.getElementById('skyeRadio');
    const nowTitle = document.getElementById('nowTitle');
    const list = document.getElementById('trackList');
    function money(cents){ return '$' + (Number(cents || 0) / 100).toFixed(2); }
    function playTrack(index){
      const track = tracks[index];
      if(!track || !track.streamUrl) return;
      player.src = track.streamUrl;
      nowTitle.textContent = track.title;
      player.play().catch(()=>{});
    }
    list.innerHTML = tracks.map((track,index)=>\`
      <article class="track">
        <button class="btn primary" type="button" data-play="\${index}">Play</button>
        <div><strong>\${track.title}</strong><span>\${track.artistName || 'Skye Artist'} / \${money(track.priceCents || 0)}</span></div>
        <a class="btn" href="\${track.buyUrl || track.streamUrl || '#'}" target="_blank" rel="noopener">\${track.buyUrl ? 'Buy' : 'Open'}</a>
      </article>
    \`).join('');
    list.addEventListener('click',(event)=>{ const button = event.target.closest('[data-play]'); if(button) playTrack(Number(button.dataset.play)); });
    if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  <\/script>
</body>
</html>`;
  }

  function updatePreview() {
    const frame = $('#previewFrame');
    if (!frame) return;
    frame.srcdoc = state.sourceKind === 'html-import' ? state.htmlSource : renderDropHtml({ preview: true });
    $('#dropTitle').textContent = state.manifest.name || 'Skye Artist Drop';
    $('#trackCount').textContent = `${state.tracks.length} track${state.tracks.length === 1 ? '' : 's'}`;
  }

  function renderTracks() {
    const list = $('#trackList');
    if (!state.tracks.length) {
      list.innerHTML = '<div class="track-item"><strong>No tracks loaded yet.</strong><span>Choose a Nexus artist, Gray Gang, or upload an audio file.</span></div>';
      return;
    }
    list.innerHTML = state.tracks.map((track, index) => `
      <article class="track-item">
        <strong>${index + 1}. ${escapeHtml(track.title)}</strong>
        <span>${escapeHtml(track.artistName || 'Skye Artist')} / ${escapeHtml(track.contentType || 'audio/mpeg')} / ${track.bytes ? `${track.bytes} bytes` : 'stream or local file'}</span>
        <span>${escapeHtml(track.localFileName || track.finalUrl || track.previewUrl || 'No stream attached')}</span>
      </article>
    `).join('');
  }

  function buildAudioDrop() {
    const file = $('#audioInput').files?.[0];
    if (!file) throw new Error('Choose an audio file first.');
    const title = $('#audioTitleInput').value.trim() || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') || 'Skye Audio Drop';
    const artistName = $('#audioArtistInput').value.trim() || 'Skye Artist';
    const ext = (file.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
    const localFileName = `audio/${slugify(title)}.${ext}`;
    const previewUrl = URL.createObjectURL(file);
    setDrop({
      sourceKind: 'audio-upload',
      title: `${title} Drop`,
      artist: {
        stageName: artistName,
        name: artistName,
        portrait: 'assets/skyes-over-london-deity-logo.png',
        storefront: $('#audioBuyUrlInput').value.trim() || '/SkyeMusicNexus/artist-storefronts/'
      },
      tracks: [{
        title,
        artistName,
        priceCents: 444,
        localFileName,
        finalUrl: localFileName,
        previewUrl,
        buyUrl: $('#audioBuyUrlInput').value.trim() || '',
        contentType: file.type || 'audio/mpeg',
        bytes: file.size || 0,
        packageFile: file,
        source: 'audio-upload'
      }]
    });
  }

  async function loadHtmlFiles() {
    const files = Array.from($('#htmlInput').files || []);
    const htmlFile = files.find((file) => file.name.toLowerCase() === 'index.html') || files.find((file) => file.name.toLowerCase().endsWith('.html'));
    if (htmlFile) $('#htmlEditor').value = await htmlFile.text();
    if (!$('#htmlEditor').value.trim()) throw new Error('Paste HTML or choose an HTML file.');
    state.sourceKind = 'html-import';
    state.uploadedProjectFiles = files;
    state.htmlSource = $('#htmlEditor').value;
    state.tracks = [];
    state.sourceArtist = { stageName: state.manifest.name || 'Imported Drop' };
    updatePreview();
    renderTracks();
    setReceipt({ ok: true, sourceKind: 'html-import', files: files.length, note: 'HTML import will be packaged with manifest, icons, service worker, and selected project files.' });
  }

  async function gateAiSync() {
    readManifestInputs();
    setReceipt('Calling gate-owned AI manifest analyzer...');
    const response = await fetch(GATE_AI_API, {
      method: 'POST',
      credentials: 'include',
      headers: gateHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ htmlSource: state.sourceKind === 'html-import' ? state.htmlSource : renderDropHtml({ preview: false }), manifest: state.manifest })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'Gate AI route failed.');
    state.manifest = { ...state.manifest, ...(data.manifest || {}) };
    syncManifestInputs();
    updatePreview();
    setReceipt({ ok: true, gateOwnedAi: true, providerPath: data.provider_path, auditId: data.audit_id, manifest: state.manifest });
  }

  async function fetchMaybeBundleAudio(track, index) {
    if (track.packageFile && track.localFileName) return { ...track, bundleBlob: track.packageFile };
    if (!track.finalUrl || !track.finalUrl.startsWith('/api/')) return track;
    try {
      const response = await fetch(track.finalUrl, { credentials: 'include', headers: gateHeaders() });
      if (!response.ok) throw new Error(`audio fetch ${response.status}`);
      const blob = await response.blob();
      const ext = (track.contentType || '').includes('wav') ? 'wav' : 'mp3';
      const localFileName = `audio/${String(index + 1).padStart(2, '0')}-${slugify(track.title)}.${ext}`;
      return { ...track, localFileName, bundleBlob: blob, finalUrl: localFileName };
    } catch (error) {
      return { ...track, bundleWarning: error.message || 'audio fetch failed' };
    }
  }

  function serviceWorkerSource(coreFiles) {
    const files = JSON.stringify(coreFiles, null, 2);
    return `const CACHE = 'skye-radio-drop-v1';
const CORE = ${files};
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (event.request.method === 'GET') {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      }
      return response;
    } catch (error) {
      return (await caches.match('./index.html')) || new Response('Offline', {status: 503});
    }
  })());
});`;
  }

  async function blobToBytes(blob) {
    return new Uint8Array(await blob.arrayBuffer());
  }

  async function stringToBytes(value) {
    return new TextEncoder().encode(String(value));
  }

  function crc32(bytes) {
    let crc = -1;
    for (let index = 0; index < bytes.length; index += 1) {
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[index]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function writeU16(out, value) {
    out.push(value & 0xff, (value >>> 8) & 0xff);
  }

  function writeU32(out, value) {
    out.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  }

  async function createZip(files) {
    const chunks = [];
    const central = [];
    let offset = 0;
    for (const file of files) {
      const nameBytes = await stringToBytes(file.name.replace(/^\/+/, ''));
      const data = file.bytes;
      const crc = crc32(data);
      const local = [];
      writeU32(local, 0x04034b50);
      writeU16(local, 20);
      writeU16(local, 0x0800);
      writeU16(local, 0);
      writeU16(local, 0);
      writeU16(local, 0);
      writeU32(local, crc);
      writeU32(local, data.length);
      writeU32(local, data.length);
      writeU16(local, nameBytes.length);
      writeU16(local, 0);
      const localBytes = new Uint8Array(local);
      chunks.push(localBytes, nameBytes, data);

      const cd = [];
      writeU32(cd, 0x02014b50);
      writeU16(cd, 20);
      writeU16(cd, 20);
      writeU16(cd, 0x0800);
      writeU16(cd, 0);
      writeU16(cd, 0);
      writeU16(cd, 0);
      writeU32(cd, crc);
      writeU32(cd, data.length);
      writeU32(cd, data.length);
      writeU16(cd, nameBytes.length);
      writeU16(cd, 0);
      writeU16(cd, 0);
      writeU16(cd, 0);
      writeU16(cd, 0);
      writeU32(cd, 0);
      writeU32(cd, offset);
      central.push(new Uint8Array(cd), nameBytes);
      offset += localBytes.length + nameBytes.length + data.length;
    }
    const centralSize = central.reduce((sum, part) => sum + part.length, 0);
    const eocd = [];
    writeU32(eocd, 0x06054b50);
    writeU16(eocd, 0);
    writeU16(eocd, 0);
    writeU16(eocd, files.length);
    writeU16(eocd, files.length);
    writeU32(eocd, centralSize);
    writeU32(eocd, offset);
    writeU16(eocd, 0);
    return new Blob([...chunks, ...central, new Uint8Array(eocd)], { type: 'application/zip' });
  }

  async function loadImageBlob() {
    if (state.iconFile) return state.iconFile;
    const response = await fetch('icon-512.png');
    return response.ok ? response.blob() : new Blob();
  }

  function imageFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      image.src = url;
    });
  }

  function canvasIcon(image, size, padding = 0.08, background = null) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, size, size);
      } else {
        ctx.clearRect(0, 0, size, size);
      }
      const max = size * (1 - padding * 2);
      const scale = Math.min(max / (image.naturalWidth || size), max / (image.naturalHeight || size));
      const width = (image.naturalWidth || size) * scale;
      const height = (image.naturalHeight || size) * scale;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  async function iconFiles() {
    const source = await loadImageBlob();
    let image;
    try {
      image = await imageFromBlob(source);
    } catch {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = state.manifest.theme_color || '#d4af37';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#07090d';
      ctx.font = '900 250px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((state.manifest.short_name || 'S')[0].toUpperCase(), 256, 270);
      image = await imageFromBlob(await new Promise((resolve) => canvas.toBlob(resolve, 'image/png')));
    }
    const sizes = [
      ['icon-16.png', 16, 0.08, state.manifest.theme_color],
      ['icon-32.png', 32, 0.08, state.manifest.theme_color],
      ['icon-180.png', 180, 0.1, state.manifest.theme_color],
      ['icon-192.png', 192, 0.04, null],
      ['icon-512.png', 512, 0.02, null],
      ['icon-maskable-192.png', 192, 0.18, state.manifest.theme_color],
      ['icon-maskable-512.png', 512, 0.18, state.manifest.theme_color]
    ];
    const output = [];
    for (const [name, size, padding, background] of sizes) {
      output.push({ name, bytes: await blobToBytes(await canvasIcon(image, size, padding, background)) });
    }
    return output;
  }

  async function mintBundle() {
    readManifestInputs();
    setReceipt('Minting bundle...');
    const files = [];
    let tracksForBundle = state.tracks;
    if (state.sourceKind !== 'html-import') {
      tracksForBundle = [];
      for (let index = 0; index < state.tracks.length; index += 1) {
        const bundled = await fetchMaybeBundleAudio(state.tracks[index], index);
        tracksForBundle.push(bundled);
        if (bundled.bundleBlob && bundled.localFileName) {
          files.push({ name: bundled.localFileName, bytes: await blobToBytes(bundled.bundleBlob) });
        }
      }
      files.push({ name: 'index.html', bytes: await stringToBytes(renderDropHtml({ preview: false, tracksOverride: tracksForBundle })) });
    } else {
      const html = state.htmlSource.includes('</head>')
        ? state.htmlSource.replace('</head>', '<link rel="manifest" href="manifest.json"><meta name="theme-color" content="' + escapeHtml(state.manifest.theme_color) + '"><script>if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));<\/script></head>')
        : state.htmlSource;
      files.push({ name: 'index.html', bytes: await stringToBytes(html) });
      for (const file of state.uploadedProjectFiles) {
        const path = file.webkitRelativePath || file.name;
        if (path.toLowerCase().endsWith('.html')) continue;
        files.push({ name: path, bytes: await blobToBytes(file) });
      }
    }
    const audioCore = tracksForBundle.map((track) => track.localFileName).filter(Boolean).map((name) => `./${name}`);
    const manifest = {
      ...state.manifest,
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    };
    files.push({ name: 'manifest.json', bytes: await stringToBytes(JSON.stringify(manifest, null, 2)) });
    files.push({ name: 'sw.js', bytes: await stringToBytes(serviceWorkerSource(['./index.html', './manifest.json', './sw.js', './icon-192.png', './icon-512.png', ...audioCore])) });
    files.push(...await iconFiles());
    files.push({ name: 'drop-receipt.json', bytes: await stringToBytes(JSON.stringify({
      schema: 'founder-command.pwa-drop-factory.bundle.v1',
      createdAt: new Date().toISOString(),
      sourceKind: state.sourceKind,
      title: state.manifest.name,
      tracks: tracksForBundle.map(({ bundleBlob, packageFile, previewUrl, ...track }) => track),
      gateOwned: true,
      browserProviderKeys: false
    }, null, 2)) });

    const zip = await createZip(files);
    const name = `${slugify(state.manifest.short_name || state.manifest.name || 'skye-drop')}.zip`;
    const url = URL.createObjectURL(zip);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setReceipt({
      ok: true,
      fileName: name,
      files: files.map((file) => file.name),
      bytes: zip.size,
      tracks: tracksForBundle.length,
      bundledAudio: tracksForBundle.filter((track) => track.localFileName).length,
      warnings: tracksForBundle.filter((track) => track.bundleWarning).map((track) => ({ title: track.title, warning: track.bundleWarning }))
    });
  }

  async function loadRegistry() {
    const [registry, collective] = await Promise.all([
      fetchJson(ARTIST_REGISTRY_URL),
      fetchJson(COLLECTIVE_URL).catch(() => ({}))
    ]);
    state.artists = Array.isArray(registry.apps) ? registry.apps : [];
    state.collective = collective;
    $('#registryCount').textContent = `${state.artists.length} artist${state.artists.length === 1 ? '' : 's'}`;
    $('#artistSelect').innerHTML = state.artists.map((artist) => `<option value="${escapeHtml(artist.slug)}">${escapeHtml(artist.stageName || artist.name || artist.slug)}</option>`).join('');
  }

  async function checkGate() {
    const chip = $('#gateStatusChip');
    try {
      const data = await fetchJson('/api/founder-command/status');
      chip.textContent = data.ok ? '0S gate session active' : 'Gate status unknown';
      chip.className = `status-chip ${data.ok ? 'ok' : 'pending'}`;
    } catch (error) {
      chip.textContent = 'Gate session required';
      chip.className = 'status-chip bad';
    }
  }

  function initCanvas() {
    const canvas = $('#motionField');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    const particles = Array.from({ length: 90 }, (_, index) => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.0004 + (index % 7) * 0.00008,
      hue: index % 3
    }));
    function resize() {
      width = canvas.width = Math.max(1, window.innerWidth * devicePixelRatio);
      height = canvas.height = Math.max(1, window.innerHeight * devicePixelRatio);
    }
    function tick() {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.speed;
        if (p.x > 1.06) p.x = -0.04;
        const x = p.x * width;
        const y = (p.y + Math.sin(Date.now() * 0.0004 + p.x * 8) * 0.02) * height;
        ctx.fillStyle = p.hue === 0 ? 'rgba(212,175,55,.42)' : p.hue === 1 ? 'rgba(82,217,255,.34)' : 'rgba(255,111,145,.28)';
        ctx.fillRect(x, y, 46 * devicePixelRatio, 1.2 * devicePixelRatio);
      }
      requestAnimationFrame(tick);
    }
    resize();
    window.addEventListener('resize', resize);
    tick();
  }

  function bindEvents() {
    $$('[data-source-mode]').forEach((button) => button.addEventListener('click', () => setSourceMode(button.dataset.sourceMode)));
    $$('[data-build-mode]').forEach((button) => button.addEventListener('click', () => buildNexusDrop(button.dataset.buildMode).catch((error) => setReceipt({ ok: false, error: error.message }))));
    $('#buildAudioDropBtn').addEventListener('click', () => {
      try { buildAudioDrop(); } catch (error) { setReceipt({ ok: false, error: error.message }); }
    });
    $('#loadHtmlBtn').addEventListener('click', () => loadHtmlFiles().catch((error) => setReceipt({ ok: false, error: error.message })));
    $('#gateAiBtn').addEventListener('click', () => gateAiSync().catch((error) => setReceipt({ ok: false, error: error.message, gateOwnedAi: true })));
    $('#mintBundleBtn').addEventListener('click', () => mintBundle().catch((error) => setReceipt({ ok: false, error: error.message })));
    $('#refreshFactoryBtn').addEventListener('click', () => bootData().catch((error) => setReceipt({ ok: false, error: error.message })));
    $('#copyManifestBtn').addEventListener('click', async () => {
      readManifestInputs();
      await navigator.clipboard?.writeText(JSON.stringify(state.manifest, null, 2)).catch(() => {});
      setReceipt({ ok: true, copied: 'manifest', manifest: state.manifest });
    });
    $('#iconInput').addEventListener('change', (event) => {
      state.iconFile = event.target.files?.[0] || null;
    });
    ['manifestName', 'manifestShort', 'manifestDescription', 'themeColor'].forEach((id) => {
      $(`#${id}`).addEventListener('input', () => {
        readManifestInputs();
        updatePreview();
      });
    });
    $('#htmlEditor').value = '<!doctype html>\\n<html lang="en">\\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Skye Drop</title></head>\\n<body><h1>Skye Drop</h1></body>\\n</html>';
  }

  async function bootData() {
    await Promise.all([loadRegistry(), checkGate()]);
    renderTracks();
    if (!state.tracks.length && state.artists.length) await buildNexusDrop('single').catch(() => {});
  }

  async function boot() {
    initCanvas();
    bindEvents();
    syncManifestInputs();
    setSourceMode('nexus');
    await bootData().catch((error) => setReceipt({ ok: false, error: error.message }));
  }

  window.SkyePwaFactoryInternals = {
    createZip,
    crc32,
    slugify,
    renderDropHtml: () => renderDropHtml({ preview: false })
  };
  window.addEventListener('DOMContentLoaded', boot);
})();
