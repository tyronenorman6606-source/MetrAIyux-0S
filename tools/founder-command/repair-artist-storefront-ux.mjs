#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const repoRoot = process.cwd();
const storefrontRoot = path.join(repoRoot, 'metraiyux_0s_site/SkyeMusicNexus/artist-storefronts');
const repairedAt = new Date().toISOString();

const skip = new Set([
  'artist-apps',
  'assets',
  'gray-skyes',
  'gray-skyes-brain',
  'gray-skyes-collective',
  'local-artists',
  'reflection',
  'supaboy',
]);

function readJson(file, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'drop';
}

function titleFromSlug(slug) {
  return String(slug || '')
    .replace(/-pwa-drop$/i, '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
}

function publicCopy(value) {
  return String(value || '')
    .replace(/\bfamily pressure\b/gi, 'life pressure')
    .replace(/\bmother\b/gi, 'mentor')
    .replace(/\bfather\b/gi, 'mentor');
}

function productArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.products)) return value.products;
  return [];
}

function upsertProducts(file, products) {
  const current = readJson(file, {products: []});
  const prior = productArray(current);
  const map = new Map();
  for (const item of prior) map.set(item.productId || item.id || slugify(item.title || item.name), item);
  for (const item of products) map.set(item.productId || item.id || slugify(item.title || item.name), item);
  const next = [...products, ...prior.filter((item) => !products.some((fresh) => (fresh.productId || fresh.id) === (item.productId || item.id)))];
  if (Array.isArray(current)) writeJson(file, next);
  else writeJson(file, {...current, products: next, repairedAt});
  return [...map.values()];
}

function unpackDropZips(dir, artist) {
  const dropsDir = path.join(dir, 'drops');
  if (!fs.existsSync(dropsDir)) return [];
  const zips = fs.readdirSync(dropsDir).filter((name) => name.endsWith('.zip'));
  const products = [];
  for (const zipName of zips) {
    const base = zipName.replace(/\.zip$/i, '').replace(/-pwa-drop$/i, '');
    const dropDir = path.join(dropsDir, base);
    fs.mkdirSync(dropDir, {recursive: true});
    execFileSync('unzip', ['-o', '-q', path.join(dropsDir, zipName), '-d', dropDir]);
    const receipt = readJson(path.join(dropDir, 'drop-receipt.json'), {});
    const audioName = fs.existsSync(path.join(dropDir, 'audio')) ? fs.readdirSync(path.join(dropDir, 'audio')).find((name) => /\.(mp3|m4a|wav)$/i.test(name)) : '';
    const title = receipt.title || titleFromSlug(base);
    const productId = `prod_${slugify(artist.slug)}_${slugify(title)}`.replace(/-/g, '_');
    products.push({
      productId,
      id: productId,
      title,
      description: `${title} digital MP3 drop for ${artist.name}.`,
      productType: 'digital',
      fulfillmentType: 'digital-link',
      priceCents: 444,
      currency: 'USD',
      status: audioName ? 'active' : 'waiting_finished_audio',
      artistId: artist.artistId,
      artistName: artist.name,
      collectiveId: 'gray-skyes-collective',
      provider: receipt.provider || 'elevenlabs',
      providerJobId: receipt.providerJobId || '',
      assetId: receipt.assetId || '',
      audioFile: audioName ? `drops/${base}/audio/${audioName}` : '',
      pwaUrl: `./drops/${base}/`,
      downloadUrl: `./drops/${base}/audio/${audioName || ''}`,
      sourceZip: `./drops/${zipName}`,
      createdAt: receipt.createdAt || repairedAt,
      storefrontRepaired: true,
    });
  }
  return products;
}

function normalizeProducts(dir, artist) {
  const productFile = path.join(dir, 'products/products.json');
  const zipProducts = unpackDropZips(dir, artist);
  const current = productArray(readJson(productFile, {products: []}));
  const improved = current.map((item) => {
    const title = item.title || item.name || 'Storefront Drop';
    const status = item.audioFile || item.audioUrl || item.streamUrl || item.assetId ? 'active' : (item.status || 'waiting_finished_audio');
    return {
      ...item,
      productId: item.productId || item.id || `prod_${slugify(artist.slug)}_${slugify(title)}`.replace(/-/g, '_'),
      id: item.id || item.productId || `prod_${slugify(artist.slug)}_${slugify(title)}`.replace(/-/g, '_'),
      title,
      priceCents: Number(item.priceCents || item.price || 444) || 444,
      currency: item.currency || 'USD',
      status,
      artistId: item.artistId || artist.artistId,
      artistName: item.artistName || artist.name,
      collectiveId: item.collectiveId || 'gray-skyes-collective',
    };
  });
  const products = [...zipProducts, ...improved.filter((item) => !zipProducts.some((fresh) => fresh.productId === (item.productId || item.id)))];
  upsertProducts(productFile, products);
  return products;
}

function primaryGenre(personality) {
  return personality.music?.primaryGenres?.[0] || personality.music?.sonicDNA?.[0] || 'independent music';
}

function genreLine(personality) {
  const genres = personality.music?.primaryGenres || personality.music?.sonicDNA || [];
  return genres.slice(0, 3).join(' / ') || 'independent music';
}

function storefrontHtml({artist, personality, products}) {
  const activeProducts = products.filter((item) => item.status === 'active');
  const first = activeProducts[0] || products[0] || {};
  const productCards = products.map((product, index) => {
    const price = `$${(Number(product.priceCents || 444) / 100).toFixed(2)}`;
    const audio = product.audioFile || product.audioUrl || product.streamUrl || '';
    const pwa = product.pwaUrl || '#player';
    return `<article class="product-tile real-product-card" data-product-card="${index}">
      <span>${escapeHtml(product.status === 'active' ? 'live drop' : 'queued drop')}</span>
      <h3>${escapeHtml(product.title || 'Storefront Drop')}</h3>
      <strong>${escapeHtml(price)}</strong>
      ${audio ? `<button class="btn" type="button" data-play-track="${index}">Play</button>` : '<a class="btn" href="#player">Audio pending</a>'}
      <a class="btn" href="${escapeHtml(pwa)}">Open Drop PWA</a>
      <button class="btn primary" type="button" data-buy-product="${index}">SkyePay checkout</button>
    </article>`;
  }).join('');
  const playerSources = activeProducts.map((product, index) => `<button class="btn" type="button" data-play-track="${index}">${escapeHtml(product.title)}</button>`).join('');
  const homeBase = personality.origin?.homeBase || artist.homeBase || 'Gray Gang';
  const archetype = personality.personality?.archetype || artist.archetype || 'artist';
  const origin = publicCopy(personality.origin?.upbringing || `${artist.name} is building a sellable artist world inside Gray Gang.`);
  const turningPoint = publicCopy(personality.origin?.turningPoint || 'The storefront, product lane, player, paperwork, and payout tracking now live together instead of being scattered.');
  const vocal = personality.music?.vocalDirection || 'release-ready vocal direction';
  const themes = publicCopy((personality.music?.lyricalThemes || []).slice(0, 5).join(', ') || 'growth, ownership, survival, and storefront-ready fan connection');
  const portrait = './assets/artist-portrait.png';
  return `<!doctype html>
<html data-mcp-neon-scrollbar lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(artist.name)} Storefront - Gray Gang</title>
  <meta name="description" content="${escapeHtml(artist.name)} fan storefront, player, PWA drops, and SkyePay-tracked catalog inside Gray Gang.">
  <meta name="theme-color" content="#050506">
  <link rel="manifest" href="./manifest.webmanifest">
  <link rel="stylesheet" href="../artist-storefronts.css">
</head>
<body class="skyesol-living-page storefront-shell" style="--artist-accent:${escapeHtml(artist.accent)};" data-artist-id="${escapeHtml(artist.artistId)}">
  <div class="neon-motion-chrome" data-motion-chrome aria-hidden="true"></div>
  <canvas class="living-background skyesol-living-field" aria-hidden="true"></canvas>
  <header class="topbar">
    <a class="brandmark" href="../"><span>GG</span>${escapeHtml(artist.name)}</a>
    <nav class="nav-actions"><a class="btn" href="../gray-skyes-collective/">Gray Gang</a><a class="btn" href="../artist-apps/">Artist Apps</a><a class="btn" href="#music">Music</a><a class="btn primary" href="#store">Store</a></nav>
  </header>
  <main class="storefront-wrap artist-world">
    <section class="hero artist-hero">
      <div>
        <div class="artist-kicker"><span class="artist-chip">${escapeHtml(homeBase)}</span><span class="artist-chip">${escapeHtml(primaryGenre(personality))}</span><span class="artist-chip">SkyePay tracked</span></div>
        <h1 class="neon-gradient-text">${escapeHtml(artist.name)}</h1>
        <p class="lede">${escapeHtml(archetype)} in Gray Gang. ${escapeHtml(genreLine(personality))} records packaged as playable storefront drops, installable PWAs, and checkout-ready digital products.</p>
        <div class="hero-actions"><a class="btn primary" href="#music">Listen</a><a class="btn" href="#store">Shop Drops</a><a class="btn" href="./app.html">Artist App</a></div>
      </div>
      <aside class="id-panel portrait-panel artist-portrait-mark"><img class="artist-portrait" src="${portrait}" alt="${escapeHtml(artist.name)} portrait"><strong>${escapeHtml(first.title || 'First drop')}</strong><span>${escapeHtml(first.status === 'active' ? 'live now' : 'audio pending')}</span></aside>
    </section>
    <section class="stat-grid"><article class="stat"><strong>${escapeHtml(primaryGenre(personality))}</strong><span>primary lane</span></article><article class="stat"><strong>${escapeHtml(personality.music?.tempoRangeBpm || 'release')}</strong><span>bpm pocket</span></article><article class="stat"><strong>${activeProducts.length}</strong><span>live products</span></article><article class="stat"><strong>Gray Gang</strong><span>collective</span></article></section>
    <section id="music" class="music-player-panel">
      <p class="micro">Skye Radio</p>
      <h2 data-now-title>${escapeHtml(first.title || 'Drop player')}</h2>
      <audio controls preload="metadata" data-artist-audio src="${escapeHtml(first.audioFile || '')}"></audio>
      <div class="hero-actions">${playerSources || '<a class="btn" href="#store">Audio is queued</a>'}</div>
      <p data-player-note>${activeProducts.length ? 'Choose a track or open the PWA drop for the installable package.' : 'Finished audio is still queued for this artist.'}</p>
    </section>
    <section id="store" class="track-orbit">${productCards || '<article class="product-tile"><span>queued</span><h3>First drop pending</h3><strong>$4.44</strong><a class="btn" href="#music">Watch this lane</a></article>'}</section>
    <section id="world" class="artist-story-grid">
      <article class="card"><p class="micro">world</p><h2>${escapeHtml(homeBase)}</h2><p>${escapeHtml(origin)}</p><p>${escapeHtml(turningPoint)}</p></article>
      <article class="card"><p class="micro">sound</p><h2>${escapeHtml(vocal)}</h2><p>${escapeHtml(themes)}</p></article>
    </section>
    <section class="artist-soundboard">
      <article class="card"><p class="micro">storefront</p><h2>Playable products, not raw records</h2><p>Fans see the player, PWA drop, and checkout path. Private profile files, paperwork, and operator receipts stay behind the 0S lanes.</p></article>
      <article class="card"><p class="micro">business lane</p><h2>Gray Gang attribution</h2><p>Sales track to the artist catalog and collective owner account while payout paperwork and owner approval run through Workforce, SovereignDocs, and SkyPay.</p></article>
    </section>
  </main>
  <script src="../assets/mcp-implementation/mcp-effects.js" data-mcp-generated-js></script>
  <script>if('serviceWorker'in navigator){navigator.serviceWorker.register('./service-worker.js').catch(()=>{});}</script>
  <script>
    const PRODUCTS=${JSON.stringify(products.map((item) => ({
      title: item.title,
      productId: item.productId || item.id,
      priceCents: item.priceCents || 444,
      audioFile: item.audioFile || '',
      pwaUrl: item.pwaUrl || '',
    })))};
    const audio=document.querySelector('[data-artist-audio]');
    const nowTitle=document.querySelector('[data-now-title]');
    document.querySelectorAll('[data-play-track]').forEach((button)=>button.addEventListener('click',()=>{
      const product=PRODUCTS[Number(button.dataset.playTrack)]||{};
      if(product.audioFile&&audio){audio.src=product.audioFile;audio.load();audio.play().catch(()=>{});}
      if(nowTitle&&product.title)nowTitle.textContent=product.title;
      document.querySelector('#music')?.scrollIntoView({behavior:'smooth',block:'start'});
    }));
    function checkoutFallback(product){
      const params=new URLSearchParams({client:'metraiyux-0s',offer:'skyemusicnexus-artist-store',artistId:document.body.dataset.artistId||'',productId:product.productId||'',amountCents:String(product.priceCents||444)});
      return '/skyepay-store.html?'+params.toString();
    }
    document.querySelectorAll('[data-buy-product]').forEach((button)=>button.addEventListener('click',async()=>{
      const product=PRODUCTS[Number(button.dataset.buyProduct)]||{};
      button.disabled=true;button.textContent='Opening checkout';
      try{
        const res=await fetch('/api/skymusicnexus/music-store',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({action:'record-order',productId:product.productId,quantity:1})});
        const data=await res.json().catch(()=>({}));
        window.location.href=data?.checkoutIntent?.url||checkoutFallback(product);
      }catch{window.location.href=checkoutFallback(product);}
    }));
  </script>
  <script src="/assets/js/0s-command-bridge.js" data-command-bridge-app="artist-storefronts" data-command-bridge-surface="artist-storefront"></script>
</body>
</html>`;
}

function appHtml({artist, personality, products}) {
  const first = products.find((item) => item.status === 'active') || products[0] || {};
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(artist.name)} App</title><meta name="theme-color" content="#050506"><link rel="manifest" href="./manifest.webmanifest"><link rel="stylesheet" href="../artist-storefronts.css"></head>
<body class="skyesol-living-page storefront-shell" style="--artist-accent:${escapeHtml(artist.accent)};"><main class="storefront-wrap artist-world"><section class="hero artist-hero"><div><p class="micro">artist app</p><h1>${escapeHtml(artist.name)}</h1><p class="lede">${escapeHtml(genreLine(personality))}. Use this app as the compact player, store link, and Gray Gang handoff.</p><div class="hero-actions"><a class="btn primary" href="./">Storefront</a><a class="btn" href="${escapeHtml(first.pwaUrl || './')}">Latest Drop</a><a class="btn" href="../gray-skyes-collective/">Gray Gang</a></div></div><aside class="id-panel portrait-panel"><img class="artist-portrait" src="./assets/artist-portrait.png" alt="${escapeHtml(artist.name)} portrait"><strong>${escapeHtml(first.title || 'Drop queued')}</strong><span>${products.filter((item) => item.status === 'active').length} live product(s)</span></aside></section><section class="music-player-panel"><p class="micro">Skye Radio</p><h2>${escapeHtml(first.title || 'Drop player')}</h2><audio controls preload="metadata" src="${escapeHtml(first.audioFile || '')}"></audio></section></main><script>if('serviceWorker'in navigator){navigator.serviceWorker.register('./service-worker.js').catch(()=>{});}</script></body></html>`;
}

function repairArtist(slug) {
  const dir = path.join(storefrontRoot, slug);
  const profileFile = path.join(dir, 'profile.json');
  const personalityFile = path.join(dir, 'personality-profile.json');
  if (!fs.existsSync(profileFile) || !fs.existsSync(personalityFile)) return null;
  const profile = readJson(profileFile);
  const personality = readJson(personalityFile);
  const artist = {
    slug,
    name: profile.stageName || profile.name || profile.artistName || personality.stageName || personality.name || slug,
    artistId: profile.artistId || profile.id || personality.artistId || slug,
    accent: profile.accentColor || personality.visualIdentity?.accentColor || '#43e7ff',
    homeBase: personality.origin?.homeBase || '',
    archetype: personality.personality?.archetype || '',
  };
  const products = normalizeProducts(dir, artist);
  fs.writeFileSync(path.join(dir, 'index.html'), storefrontHtml({artist, personality, products}));
  fs.writeFileSync(path.join(dir, 'app.html'), appHtml({artist, personality, products}));
  const manifest = readJson(path.join(dir, 'manifest.webmanifest'), {});
  writeJson(path.join(dir, 'manifest.webmanifest'), {
    ...manifest,
    name: `${artist.name} Storefront`,
    short_name: artist.name.slice(0, 12),
    description: `${artist.name} Gray Gang storefront and player.`,
    start_url: './',
    scope: './',
    display: 'standalone',
    theme_color: '#050506',
    background_color: '#050506',
  });
  const cacheFiles = ['./', './index.html', './app.html', './manifest.webmanifest', './products/products.json', './assets/artist-portrait.png', '../artist-storefronts.css'];
  for (const product of products) if (product.audioFile) cacheFiles.push(`./${product.audioFile}`);
  fs.writeFileSync(path.join(dir, 'service-worker.js'), `const CACHE='${slug}-storefront-${Date.now()}';\nconst ASSETS=${JSON.stringify(cacheFiles)};\nself.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));\nself.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));\nself.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request))));\n`);
  return {slug, name: artist.name, products: products.length, activeProducts: products.filter((item) => item.status === 'active').length};
}

const repaired = [];
for (const entry of fs.readdirSync(storefrontRoot, {withFileTypes: true})) {
  if (!entry.isDirectory() || skip.has(entry.name)) continue;
  const result = repairArtist(entry.name);
  if (result) repaired.push(result);
}

const receipt = {
  schema: 'skyemusicnexus.artist-storefront-ux-repair.v1',
  repairedAt,
  repaired,
  guarantees: [
    'fan-facing pages no longer link primary product actions to raw products.json records',
    'raw family/profile prompt dossier sections are removed from storefront pages',
    'existing PWA zip drops are unpacked into browsable drop URLs',
    'store buttons route through SkyePay order intent fallback',
  ],
};
const out = path.join(repoRoot, 'test-artifacts/reflection-and-collective-drops/storefront-ux-repair-latest.json');
writeJson(out, receipt);
console.log(JSON.stringify({ok: true, repaired: repaired.length, receipt: out}, null, 2));
