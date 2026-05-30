#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const storefrontRoot = path.join(repoRoot, 'metraiyux_0s_site/SkyeMusicNexus/artist-storefronts');
const receiptPath = path.join(repoRoot, 'test-artifacts/reflection-and-collective-drops/artist-storefront-product-redo-latest.json');
const redoneAt = new Date().toISOString();
const skipDirs = new Set(['artist-apps', 'assets', 'gray-skyes-collective', 'local-artists', 'reflection']);
const absoluteSkyePay = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html';
const collectiveProducerName = 'Gray London Skyes';
const collectiveProducerCredit = 'Produced by Gray London Skyes';

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeFile(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, value);
}

function writeJson(file, value) {
  writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function titleFromSlug(slug = '') {
  return String(slug)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Artist';
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'artist';
}

function productsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
}

function relativeFromProductRoom(ref = '') {
  if (!ref) return '';
  if (/^(?:https?:)?\/\//i.test(ref) || ref.startsWith('/')) return ref;
  if (ref.startsWith('./')) return `../${ref.slice(2)}`;
  if (ref.startsWith('../')) return ref;
  return `../${ref}`;
}

function priceLabel(product) {
  const cents = Number(product.priceCents || product.amountCents || 444) || 444;
  return `$${(cents / 100).toFixed(2)}`;
}

function normalizeProduct(product, artist) {
  const title = product.title || product.name || product.fullTitle || 'Storefront Drop';
  const id = product.productId || product.id || `prod_${slugify(artist.slug)}_${slugify(title)}`.replace(/-/g, '_');
  const audioFile = product.audioFile || product.audioUrl || product.streamUrl || '';
  const pwaUrl = product.pwaUrl || product.dropUrl || product.appUrl || '';
  return {
    ...product,
    productId: id,
    id,
    title,
    description: product.description || `${title} digital drop for ${artist.name}.`,
    priceCents: Number(product.priceCents || product.amountCents || 444) || 444,
    currency: product.currency || 'USD',
    status: product.status || (audioFile ? 'active' : 'queued'),
    artistId: product.artistId || artist.artistId,
    artistName: product.artistName || artist.name,
    audioFile,
    pwaUrl,
    productType: product.productType || 'digital',
    fulfillmentType: product.fulfillmentType || 'digital-link',
    producerName: product.producerName || product.producedBy || (product.collectiveId === 'gray-skyes-collective' ? collectiveProducerName : ''),
    producerCredit: product.producerCredit || product.productionCredit || (product.collectiveId === 'gray-skyes-collective' ? collectiveProducerCredit : ''),
  };
}

function findFirstExisting(dir, candidates) {
  return candidates.find((candidate) => fs.existsSync(path.join(dir, candidate))) || '';
}

function stableHash(value) {
  let hash = 0;
  for (const char of String(value || '')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function rotateCandidates(candidates, seed) {
  const clean = candidates.filter(Boolean);
  if (!clean.length) return [];
  const start = stableHash(seed) % clean.length;
  return [...clean.slice(start), ...clean.slice(0, start)];
}

function productCoverImage(product, artist) {
  const sources = Array.isArray(product.visualPackage?.sourceImages) ? product.visualPackage.sourceImages : [];
  const sourceImages = rotateCandidates(
    sources.map((image) => image.packageFile || image.href || image.url || image.src).map(relativeFromProductRoom),
    `${artist.slug}:${product.productId || product.id || product.title}`,
  );
  const grayFallbacks = artist.slug === 'gray-skyes'
    ? rotateCandidates([
        '../media/images/gray-red-portrait.jpg',
        '../media/images/gray-shadow-portrait.jpg',
        '../media/images/gray-ritual-portrait.jpg',
        '../media/images/gray-wide-stage.jpg',
        '../media/images/gray-founder-portrait.jpg',
        '../assets/gray-london-skyes.jpg',
        '../assets/founder-command-portrait.png',
      ], product.productId || product.id || product.title)
    : [];
  const candidates = [
    relativeFromProductRoom(product.coverImage || ''),
    relativeFromProductRoom(product.coverArt || ''),
    relativeFromProductRoom(product.imageUrl || ''),
    relativeFromProductRoom(product.image || ''),
    relativeFromProductRoom(product.visualPackage?.coverImage || ''),
    relativeFromProductRoom(product.visualPackage?.coverArtUrl || ''),
    ...sourceImages,
    ...grayFallbacks,
    artist.portrait ? `../${artist.portrait}` : '',
  ].filter(Boolean);
  return candidates.find((candidate) => {
    if (/^(?:https?:)?\/\//i.test(candidate) || candidate.startsWith('/')) return true;
    return fs.existsSync(path.join(artist.dir, 'products', candidate));
  }) || '';
}

function loadArtist(slug) {
  const dir = path.join(storefrontRoot, slug);
  const productFile = path.join(dir, 'products/products.json');
  const profile = readJson(path.join(dir, 'profile.json'), {}) || {};
  const dataProfile = readJson(path.join(dir, 'data/artist-profile.json'), {}) || {};
  const personality = readJson(path.join(dir, 'personality-profile.json'), {}) || {};
  const productPayload = readJson(productFile, {}) || {};
  const products = productsFromPayload(productPayload);
  const name = profile.stageName || profile.name || profile.artistName || dataProfile.stageName || dataProfile.name || productPayload.stageName || productPayload.artistName || products[0]?.artistName || titleFromSlug(slug);
  const artistId = profile.artistId || profile.id || productPayload.artistId || products[0]?.artistId || slug;
  const homeBase = personality.origin?.homeBase || profile.homeBase || dataProfile.homeBase || profile.market || 'Gray Gang';
  const genres = personality.music?.primaryGenres || profile.genres || dataProfile.genres || [];
  const genre = Array.isArray(genres) && genres.length ? genres.slice(0, 3).join(' / ') : (profile.genre || dataProfile.genre || products[0]?.lane || 'independent music');
  const accent = profile.accentColor || personality.visualIdentity?.accentColor || dataProfile.accentColor || (slug === 'gray-skyes' ? '#ffd86b' : '#43e7ff');
  const portrait = findFirstExisting(dir, [
    'assets/artist-portrait.png',
    'assets/gray-brain-avatar-openai.png',
    'media/images/gray-red-portrait.jpg',
    'assets/gray-london-skyes.jpg',
    'assets/founder-command-portrait.png',
  ]);
  const firstStory = personality.origin?.upbringing || profile.story || dataProfile.story || products[0]?.description || `${name} runs a storefront lane inside SkyeMusicNexus.`;
  const normalizedProducts = products.map((product) => normalizeProduct(product, {slug, name, artistId}));
  return {
    slug,
    dir,
    productFile,
    name,
    artistId,
    homeBase,
    genre,
    accent,
    portrait,
    story: String(firstStory).replace(/\bfamily pressure\b/gi, 'life pressure'),
    products: normalizedProducts,
    appExists: fs.existsSync(path.join(dir, 'app.html')),
    storefrontExists: fs.existsSync(path.join(dir, 'index.html')),
  };
}

function productStoreHtml(artist) {
  const active = artist.products.filter((product) => product.status === 'active' || product.audioFile);
  const first = active[0] || artist.products[0] || {};
  const productData = artist.products.map((product) => ({
    productId: product.productId,
    id: product.id,
    title: product.title,
    description: product.description,
    priceCents: product.priceCents,
    currency: product.currency,
    status: product.status,
    audioFile: relativeFromProductRoom(product.audioFile),
    coverImage: productCoverImage(product, artist),
    trackId: slugify(`${artist.slug}-${product.productId || product.id || product.title}`),
    pwaUrl: relativeFromProductRoom(product.pwaUrl),
    sourceZip: relativeFromProductRoom(product.sourceZip),
    downloadUrl: relativeFromProductRoom(product.downloadUrl),
    visualPackage: product.visualPackage ? {
      ...product.visualPackage,
      packageUrl: relativeFromProductRoom(product.visualPackage.packageUrl || ''),
      manifestFile: relativeFromProductRoom(product.visualPackage.manifestFile || ''),
    } : null,
    producerName: product.producerName || '',
    producerCredit: product.producerCredit || '',
    artistId: product.artistId,
    artistName: product.artistName,
  }));
  const hasProducts = productData.length > 0;
  const detailActions = hasProducts ? `<button class="btn" type="button" data-detail-play>Preview</button>
          <a class="btn" href="${escapeHtml(relativeFromProductRoom(first.pwaUrl || '')) || '../#store'}" data-detail-drop>Open Drop</a>
          ${first.visualPackage?.packageUrl ? `<a class="btn" href="${escapeHtml(relativeFromProductRoom(first.visualPackage.packageUrl))}" data-detail-visual>Visual Pack</a>` : '<a class="btn" href="../#store" data-detail-visual hidden>Visual Pack</a>'}
          <button class="btn primary" type="button" data-detail-checkout>SkyePay Checkout</button>
          <button class="btn" type="button" data-detail-share>Share</button>` : `<span class="btn disabled">Product queued</span>
          <a class="btn" href="../">Storefront</a>
          <button class="btn disabled" type="button" disabled>Checkout pending</button>`;
  const cards = productData.map((product, index) => `
        <article class="product-command-card" data-product-card="${index}">
          ${product.coverImage ? `<img class="product-card-cover" src="${escapeHtml(product.coverImage)}" alt="">` : ''}
          <div>
            <p class="micro">${escapeHtml(product.status || 'queued')}</p>
            <h3>${escapeHtml(product.title)}</h3>
            <p>${escapeHtml(product.description || 'Digital product lane connected to SkyePay checkout and the artist drop room.')}</p>
            ${product.producerCredit ? `<p class="micro">${escapeHtml(product.producerCredit)}</p>` : ''}
          </div>
          <div class="product-meta-row">
            <strong>${escapeHtml(priceLabel(product))}</strong>
            <span>${escapeHtml(product.productId)}</span>
          </div>
          <div class="product-action-row">
            ${product.audioFile ? `<button class="btn" type="button" data-play-product="${index}">Preview</button>` : '<span class="btn disabled">Audio queued</span>'}
            ${product.pwaUrl ? `<a class="btn" href="${escapeHtml(product.pwaUrl)}">Open Drop</a>` : '<a class="btn" href="../#music">Storefront Player</a>'}
            ${product.visualPackage?.packageUrl ? `<a class="btn" href="${escapeHtml(product.visualPackage.packageUrl)}">Visual Pack</a>` : ''}
            <button class="btn primary" type="button" data-checkout-product="${index}">Checkout</button>
            <button class="btn" type="button" data-share-product="${index}">Share</button>
          </div>
        </article>`).join('');
  const roster = productData.map((product, index) => `
            <button class="product-roster-button${index === 0 ? ' is-active' : ''}" type="button" data-select-product="${index}">
              <span>${escapeHtml(product.status || 'queued')}</span>
              <strong>${escapeHtml(product.title)}</strong>
              <small>${escapeHtml(priceLabel(product))}</small>
            </button>`).join('');
  const portrait = artist.portrait ? `../${artist.portrait}` : '';
  return `<!doctype html>
<html data-mcp-neon-scrollbar lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(artist.name)} Product Room - SkyeMusicNexus</title>
  <meta name="description" content="${escapeHtml(artist.name)} product room with previews, drops, SkyePay checkout, and share-ready storefront packaging.">
  <meta name="theme-color" content="#050506">
  <link rel="stylesheet" href="../../artist-storefronts.css">
  <link rel="stylesheet" href="../../../public/nexus-player.css" data-skymusicnexus-player="css">
</head>
<body class="skyesol-living-page storefront-shell product-store-page" style="--artist-accent:${escapeHtml(artist.accent)};" data-artist-id="${escapeHtml(artist.artistId)}" data-product-room="${escapeHtml(artist.slug)}">
  <div class="neon-motion-chrome" data-motion-chrome aria-hidden="true"></div>
  <canvas class="living-background skyesol-living-field" aria-hidden="true"></canvas>
  <header class="topbar">
    <a class="brandmark" href="../"><span>SN</span>${escapeHtml(artist.name)}</a>
    <nav class="nav-actions" aria-label="Product room navigation">
      <a class="btn primary" href="#checkout">Products</a>
      <a class="btn" href="../">Storefront</a>
      ${artist.appExists ? '<a class="btn" href="../app.html">Artist App</a>' : ''}
      <a class="btn" href="../../">All Artists</a>
    </nav>
  </header>
  <main class="storefront-wrap product-room">
    <section class="product-room-hero">
      <div class="product-room-copy">
        <p class="micro">artist product room / SkyePay checkout / no raw JSON CTA</p>
        <h1>${escapeHtml(artist.name)} Store</h1>
        <p class="lede">${escapeHtml(artist.genre)} from ${escapeHtml(artist.homeBase)}. This room turns the artist lane into playable products: preview the audio, open the drop package, checkout through SkyePay, and share a clean storefront link.</p>
        <div class="hero-actions">
          <a class="btn primary" href="#checkout">Shop Products</a>
          <a class="btn" href="../#music">Play Storefront</a>
          <a class="btn" href="../../gray-skyes-collective/">Gray Gang</a>
        </div>
      </div>
      <aside class="product-room-cover">
        ${portrait ? `<img src="${escapeHtml(portrait)}" alt="${escapeHtml(artist.name)} portrait">` : `<div class="product-room-initials">${escapeHtml(artist.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase())}</div>`}
        <div>
          <p class="micro">featured product</p>
          <strong>${escapeHtml(first.title || 'First drop')}</strong>
          <span>${active.length} active / ${artist.products.length} total products</span>
        </div>
      </aside>
    </section>

    <section class="product-room-stats">
      <article class="stat"><strong>${artist.products.length}</strong><span>product records packaged as cards</span></article>
      <article class="stat"><strong>${active.length}</strong><span>playable / active drops</span></article>
      <article class="stat"><strong>${escapeHtml(priceLabel(first))}</strong><span>default digital price</span></article>
      <article class="stat"><strong>FS27</strong><span>SkyePay checkout lane</span></article>
    </section>

    <section id="checkout" class="product-room-layout">
      <aside class="product-roster" aria-label="Product selector">
        <p class="micro">catalog</p>
        ${roster || '<p>No products are registered for this artist yet.</p>'}
      </aside>
      <article class="product-detail-panel">
        <p class="micro" data-detail-status>${escapeHtml(first.status || 'queued')}</p>
        <h2 data-detail-title>${escapeHtml(first.title || 'Product room')}</h2>
        <p class="micro" data-detail-producer>${escapeHtml(productData[0]?.producerCredit || '')}</p>
        <p data-detail-description>${escapeHtml(first.description || 'Pick a product to preview, open, or checkout.')}</p>
        <img class="product-detail-cover" data-detail-cover src="${escapeHtml(productData[0]?.coverImage || '')}" alt="">
        <audio controls preload="metadata" data-product-audio data-nexus-track-id="${escapeHtml(productData[0]?.trackId || '')}" src="${escapeHtml(relativeFromProductRoom(first.audioFile || ''))}"></audio>
        <div class="product-action-row">
          ${detailActions}
        </div>
        <output class="product-status-line" data-product-status>Product room ready.</output>
      </article>
    </section>

    <section class="product-command-grid" aria-label="All products">
${cards || '      <article class="product-command-card"><p class="micro">queued</p><h3>First product pending</h3><p>The artist lane is waiting for its first sellable product.</p></article>'}
    </section>

    <section class="artist-soundboard">
      <article class="card"><p class="micro">packaging</p><h2>Fan buttons never open raw records</h2><p>Product JSON stays behind the storefront as the data source. Public actions are preview, drop, checkout, and share.</p></article>
      <article class="card"><p class="micro">business loop</p><h2>Built for releases</h2><p>Each product keeps artist attribution, Gray Gang collective context, SkyePay intent, and drop packaging in one lane.</p></article>
    </section>
  </main>
  <script src="../../assets/mcp-implementation/mcp-effects.js" data-mcp-generated-js></script>
  <script>
    const PRODUCTS=${JSON.stringify(productData)};
    const productStatus=document.querySelector('[data-product-status]');
    const detail={
      status:document.querySelector('[data-detail-status]'),
      title:document.querySelector('[data-detail-title]'),
      description:document.querySelector('[data-detail-description]'),
      cover:document.querySelector('[data-detail-cover]'),
      audio:document.querySelector('[data-product-audio]'),
      drop:document.querySelector('[data-detail-drop]'),
      visual:document.querySelector('[data-detail-visual]'),
      checkout:document.querySelector('[data-detail-checkout]'),
      share:document.querySelector('[data-detail-share]'),
      play:document.querySelector('[data-detail-play]')
    };
    let selectedProduct=0;
    function checkoutFallback(product){
      const params=new URLSearchParams({
        client:'metraiyux-0s',
        offer:'skyemusicnexus-artist-store',
        artistId:document.body.dataset.artistId||'',
        productId:product.productId||product.id||'',
        amountCents:String(product.priceCents||444)
      });
      return '${absoluteSkyePay}?'+params.toString();
    }
    function setStatus(message){if(productStatus)productStatus.textContent=message;}
    function selectProduct(index){
      selectedProduct=Number(index)||0;
      const product=PRODUCTS[selectedProduct]||PRODUCTS[0]||{};
      document.querySelectorAll('[data-select-product]').forEach((button)=>button.classList.toggle('is-active',Number(button.dataset.selectProduct)===selectedProduct));
      if(detail.status)detail.status.textContent=product.status||'queued';
      if(detail.title)detail.title.textContent=product.title||'Product';
      if(detail.description)detail.description.textContent=product.description||'Digital product lane.';
      const producer=document.querySelector('[data-detail-producer]');
      if(producer)producer.textContent=product.producerCredit||'';
      if(detail.cover){detail.cover.src=product.coverImage||'';detail.cover.hidden=!product.coverImage;}
      if(detail.audio){detail.audio.src=product.audioFile||'';detail.audio.dataset.nexusTrackId=product.trackId||'';detail.audio.load();}
      if(detail.drop)detail.drop.href=product.pwaUrl||'../#store';
      if(detail.visual){
        const visualUrl=product.visualPackage?.packageUrl||'';
        detail.visual.href=visualUrl||'../#store';
        detail.visual.hidden=!visualUrl;
      }
      setStatus((product.productId||'Product')+' selected.');
    }
    async function checkoutProduct(index){
      const product=PRODUCTS[Number(index)]||PRODUCTS[selectedProduct]||{};
      setStatus('Creating SkyePay checkout intent...');
      try{
        const response=await fetch('/api/skymusicnexus/music-store',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({action:'record-order',productId:product.productId||product.id,quantity:1})});
        const data=await response.json().catch(()=>({}));
        window.location.href=data?.checkoutIntent?.url||checkoutFallback(product);
      }catch{
        window.location.href=checkoutFallback(product);
      }
    }
    function playProduct(index){
      selectProduct(index);
      const product=PRODUCTS[selectedProduct]||{};
      if(!product.audioFile){setStatus('Audio is queued for this product.');return;}
      detail.audio?.play().catch(()=>setStatus('Press play in the audio control to preview.'));
    }
    async function shareProduct(index){
      selectProduct(index);
      const product=PRODUCTS[selectedProduct]||{};
      const url=new URL(window.location.href);
      url.searchParams.set('product',product.productId||String(selectedProduct));
      const text=product.title?product.title+' by ${escapeHtml(artist.name)}':document.title;
      try{
        if(navigator.share)await navigator.share({title:text,url:String(url)});
        else await navigator.clipboard.writeText(String(url));
        setStatus('Share link ready.');
      }catch{setStatus('Share link is in the address bar.');}
    }
    document.querySelectorAll('[data-select-product]').forEach((button)=>button.addEventListener('click',()=>selectProduct(button.dataset.selectProduct)));
    document.querySelectorAll('[data-play-product]').forEach((button)=>button.addEventListener('click',()=>playProduct(button.dataset.playProduct)));
    document.querySelectorAll('[data-checkout-product]').forEach((button)=>button.addEventListener('click',()=>checkoutProduct(button.dataset.checkoutProduct)));
    document.querySelectorAll('[data-share-product]').forEach((button)=>button.addEventListener('click',()=>shareProduct(button.dataset.shareProduct)));
    detail.play?.addEventListener('click',()=>playProduct(selectedProduct));
    detail.checkout?.addEventListener('click',()=>checkoutProduct(selectedProduct));
    detail.share?.addEventListener('click',()=>shareProduct(selectedProduct));
    const productParam=new URLSearchParams(window.location.search).get('product');
    const productIndex=PRODUCTS.findIndex((product)=>product.productId===productParam||product.id===productParam);
    selectProduct(productIndex>=0?productIndex:0);
  </script>
  <script src="../../../public/nexus-player.js" data-skymusicnexus-player="js"></script>
  <script src="/assets/js/0s-command-bridge.js" data-command-bridge-app="artist-storefronts" data-command-bridge-surface="artist-product-room"></script>
</body>
</html>
`;
}

function patchArtistPage(file, fromProductsDir = false) {
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, 'utf8');
  const original = html;
  html = html
    .replace(/Live Product Record/g, 'Open Product Room')
    .replace(/Product Blueprint/g, 'Open Product Room')
    .replace(/href="\.\/products\/products\.json"/g, 'href="./products/"')
    .replace(/href="products\/products\.json"/g, 'href="products/"')
    .replace(/href='\.\/products\/products\.json'/g, "href='./products/'")
    .replace(/href='products\/products\.json'/g, "href='products/'");
  if (!fromProductsDir && !/href=["']\.\/products\/["']/.test(html)) {
    html = html.replace(/(<nav class="nav-actions"[^>]*>[\s\S]*?)(<\/nav>)/, '$1<a class="btn" href="./products/">Products</a>$2');
    html = html.replace(/(<div class="hero-actions"[^>]*>[\s\S]*?)(<\/div>)/, '$1<a class="btn" href="./products/">Products</a>$2');
  }
  if (html !== original) fs.writeFileSync(file, html);
  return html !== original;
}

function patchServiceWorker(file) {
  if (!fs.existsSync(file)) return false;
  let js = fs.readFileSync(file, 'utf8');
  const original = js;
  if (!js.includes('./products/index.html')) {
    js = js.replace(/("\.\/products\/products\.json"|'..\/artist-storefronts\.css'|"\.\.\/artist-storefronts\.css")/, (match) => {
      if (match.includes('products/products.json')) return `${match},"./products/","./products/index.html"`;
      return `"./products/","./products/index.html",${match}`;
    });
  }
  if (js !== original) fs.writeFileSync(file, js);
  return js !== original;
}

function registryCard(artist, prefix = './') {
  const portrait = artist.portrait ? `${prefix}${artist.slug}/${artist.portrait}` : '';
  const appLink = artist.appExists ? `<a class="btn" href="${prefix}${artist.slug}/app.html">Artist App</a>` : '';
  const first = artist.products.find((product) => product.status === 'active' || product.audioFile) || artist.products[0] || {};
  const productCount = artist.products.length;
  const activeCount = artist.products.filter((product) => product.status === 'active' || product.audioFile).length;
  const productLabel = `${productCount} product${productCount === 1 ? '' : 's'}`;
  const activeLabel = `${activeCount} live`;
  return `      <article class="card artist-card-with-portrait" style="--artist-accent:${escapeHtml(artist.accent)}">
        <p class="micro">${escapeHtml(artist.homeBase)} / ${escapeHtml(artist.genre)}</p>
        ${portrait ? `<figure class="artist-card-media"><img class="artist-card-portrait" src="${escapeHtml(portrait)}" alt="${escapeHtml(artist.name)} portrait"><figcaption><strong>${escapeHtml(productLabel)}</strong><span>${escapeHtml(activeLabel)}</span></figcaption></figure>` : `<div class="artist-card-product-badge"><strong>${escapeHtml(productLabel)}</strong><span>${escapeHtml(activeLabel)}</span></div>`}
        <h2>${escapeHtml(artist.name)}</h2>
        <p>${escapeHtml(first.title ? `${first.title} is packaged with preview, drop room, SkyePay checkout, and share-ready product routing.` : `${artist.name} has a storefront, product room, app lane, and SkyeMusicNexus command bridge.`)}</p>
        <a class="btn primary" href="${prefix}${artist.slug}/products/">Shop Products</a>
        <a class="btn" href="${prefix}${artist.slug}/index.html">Storefront</a>
        ${appLink}
      </article>`;
}

function rootRegistryHtml(artists) {
  const activeCount = artists.reduce((sum, artist) => sum + artist.products.filter((product) => product.status === 'active' || product.audioFile).length, 0);
  const productCount = artists.reduce((sum, artist) => sum + artist.products.length, 0);
  return `<!doctype html>
<html data-mcp-neon-scrollbar lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SkyeMusicNexus Artist Storefronts</title>
  <meta name="description" content="SkyeMusicNexus artist storefront registry with product rooms, audio previews, PWA drops, and SkyePay checkout routing.">
  <link rel="stylesheet" href="./artist-storefronts.css">
</head>
<body class="skyesol-living-page">
  <div class="neon-motion-chrome" data-motion-chrome aria-hidden="true"></div>
  <canvas class="living-background skyesol-living-field" aria-hidden="true"></canvas>
  <header class="topbar">
    <a class="brandmark" href="/SkyeMusicNexus/"><span>SN</span>Artist Stores</a>
    <nav class="nav-actions">
      <a class="btn" href="./artist-apps/">Artist Apps</a>
      <a class="btn primary" href="./gray-skyes-collective/">Gray Gang</a>
    </nav>
  </header>
  <main class="storefront-wrap">
    <section class="hero storefront-registry-hero">
      <div>
        <p class="micro">artist commerce registry / product rooms live</p>
        <h1 class="neon-gradient-text">Playable stores, not raw records.</h1>
        <p class="lede">Every artist card routes fans into a storefront, product room, app lane, preview player, drop package, and SkyePay checkout path. JSON is only the backing record now, not the thing people accidentally open.</p>
      </div>
      <aside class="id-panel">
        <div><p class="micro">artists</p><strong>${artists.length}</strong></div>
        <p>${productCount} products packaged, ${activeCount} active previews ready.</p>
      </aside>
    </section>
    <section class="artist-app-list">
${artists.map((artist) => registryCard(artist, './')).join('\n')}
    </section>
  </main>
  <script src="./assets/mcp-implementation/mcp-effects.js" data-mcp-generated-js></script>
  <script src="/assets/js/0s-command-bridge.js" data-command-bridge-app="artist-storefronts" data-command-bridge-surface="artist-storefront"></script>
</body>
</html>
`;
}

function appRegistryHtml(artists) {
  return `<!doctype html>
<html data-mcp-neon-scrollbar lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Gray Gang Artist Apps</title>
  <meta name="description" content="Installable artist app registry with storefront and product room links for SkyeMusicNexus artists.">
  <link rel="stylesheet" href="../artist-storefronts.css">
</head>
<body class="skyesol-living-page gray-universe">
  <div class="neon-motion-chrome" data-motion-chrome aria-hidden="true"></div>
  <canvas class="living-background skyesol-living-field" aria-hidden="true"></canvas>
  <header class="topbar">
    <a class="brandmark" href="../gray-skyes-collective/"><span>GG</span>Artist Apps</a>
    <nav class="nav-actions">
      <a class="btn primary" href="../gray-skyes-collective/">Collective</a>
      <a class="btn" href="../gray-skyes/">Gray</a>
      <a class="btn" href="../">Stores</a>
    </nav>
  </header>
  <main class="storefront-wrap">
    <section class="hero storefront-registry-hero">
      <div>
        <p class="micro">artist apps registry</p>
        <h1 class="neon-gradient-text">Apps, stores, and product rooms in one lane.</h1>
        <p class="lede">Every installable artist app now has a clean storefront and product room handoff, so the PWA lane does not strand fans in raw product records.</p>
      </div>
      <aside class="id-panel"><div><p class="micro">app lanes</p><strong>${artists.filter((artist) => artist.appExists).length}</strong></div><p>All listed app cards include storefront and product room links.</p></aside>
    </section>
    <section class="artist-app-list">
${artists.filter((artist) => artist.appExists).map((artist) => registryCard(artist, '../')).join('\n')}
    </section>
  </main>
  <script src="../assets/mcp-implementation/mcp-effects.js" data-mcp-generated-js></script>
  <script src="/assets/js/0s-command-bridge.js" data-command-bridge-app="artist-storefronts" data-command-bridge-surface="artist-apps-registry"></script>
</body>
</html>
`;
}

function localArtistsHtml(artists) {
  return `<!doctype html>
<html data-mcp-neon-scrollbar lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Local Gray Gang Artists</title>
  <meta name="description" content="Local Gray Gang artists with storefronts, product rooms, apps, and SkyeMusicNexus checkout-ready lanes.">
  <link rel="stylesheet" href="../artist-storefronts.css">
</head>
<body class="skyesol-living-page">
  <div class="neon-motion-chrome" data-motion-chrome aria-hidden="true"></div>
  <canvas class="living-background skyesol-living-field" aria-hidden="true"></canvas>
  <header class="topbar">
    <a class="brandmark" href="../"><span>GG</span>Local Artists</a>
    <nav class="nav-actions">
      <a class="btn" href="../artist-apps/">Artist Apps</a>
      <a class="btn primary" href="../gray-skyes-collective/">Gray Gang</a>
    </nav>
  </header>
  <main class="storefront-wrap">
    <section class="hero storefront-registry-hero">
      <div>
        <p class="micro">local artist registry</p>
        <h1 class="neon-gradient-text">Release lanes with products attached.</h1>
        <p class="lede">Each local artist now points to a storefront, product room, app surface, preview/drop lane, and SkyePay checkout route. The rollup is fan-safe and does not send people into raw manifest or product JSON.</p>
      </div>
      <aside class="id-panel"><div><p class="micro">local artists</p><strong>${artists.length}</strong></div><p>Cards route to product rooms first, then storefronts and apps.</p></aside>
    </section>
    <section class="artist-app-list">
${artists.map((artist) => registryCard(artist, '../')).join('\n')}
    </section>
  </main>
  <script src="../assets/mcp-implementation/mcp-effects.js" data-mcp-generated-js></script>
  <script src="/assets/js/0s-command-bridge.js" data-command-bridge-app="artist-storefronts" data-command-bridge-surface="local-artist-registry"></script>
</body>
</html>
`;
}

function profileRollupHtml(artists) {
  return `<!doctype html>
<html data-mcp-neon-scrollbar lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Gray Gang Artist Canon</title>
  <meta name="description" content="Fan-safe Gray Gang artist canon rollup with product room and storefront links.">
  <link rel="stylesheet" href="../artist-storefronts.css">
</head>
<body class="skyesol-living-page">
  <div class="neon-motion-chrome" data-motion-chrome aria-hidden="true"></div>
  <canvas class="living-background skyesol-living-field" aria-hidden="true"></canvas>
  <header class="topbar">
    <a class="brandmark" href="./"><span>GG</span>Artist Canon</a>
    <nav class="nav-actions">
      <a class="btn" href="./">Local Artists</a>
      <a class="btn primary" href="../gray-skyes-collective/">Collective</a>
    </nav>
  </header>
  <main class="storefront-wrap">
    <section class="hero storefront-registry-hero">
      <div>
        <p class="micro">artist canon / fan-safe rollup</p>
        <h1 class="neon-gradient-text">Profiles point to things fans can use.</h1>
        <p class="lede">The public canon rollup now shows useful artist identity, products, storefronts, and apps instead of prompt snippets or raw profile files.</p>
      </div>
      <aside class="id-panel"><div><p class="micro">profiles</p><strong>${artists.length}</strong></div><p>Every profile card has a product room handoff.</p></aside>
    </section>
    <section class="artist-app-list">
${artists.map((artist) => registryCard(artist, '../')).join('\n')}
    </section>
  </main>
  <script src="../assets/mcp-implementation/mcp-effects.js" data-mcp-generated-js></script>
  <script src="/assets/js/0s-command-bridge.js" data-command-bridge-app="artist-storefronts" data-command-bridge-surface="artist-canon-rollup"></script>
</body>
</html>
`;
}

const artists = [];
for (const entry of fs.readdirSync(storefrontRoot, {withFileTypes: true})) {
  if (!entry.isDirectory() || skipDirs.has(entry.name)) continue;
  const dir = path.join(storefrontRoot, entry.name);
  const hasProductFile = fs.existsSync(path.join(dir, 'products/products.json'));
  const hasProfile = fs.existsSync(path.join(dir, 'profile.json')) || fs.existsSync(path.join(dir, 'data/artist-profile.json'));
  if (!hasProductFile && !hasProfile) continue;
  const artist = loadArtist(entry.name);
  if (!artist.products.length && !artist.storefrontExists) continue;
  artists.push(artist);
}

artists.sort((a, b) => {
  const rank = (artist) => artist.slug === 'gray-skyes' ? 0 : artist.slug === 'gray-skyes-brain' ? 1 : 2;
  return rank(a) - rank(b) || a.name.localeCompare(b.name);
});

const changed = [];
for (const artist of artists) {
  writeFile(path.join(artist.dir, 'products/index.html'), productStoreHtml(artist));
  changed.push(`${artist.slug}/products/index.html`);
  for (const file of ['index.html', 'app.html']) {
    if (patchArtistPage(path.join(artist.dir, file))) changed.push(`${artist.slug}/${file}`);
  }
  if (patchServiceWorker(path.join(artist.dir, 'service-worker.js'))) changed.push(`${artist.slug}/service-worker.js`);
}

writeFile(path.join(storefrontRoot, 'index.html'), rootRegistryHtml(artists));
writeFile(path.join(storefrontRoot, 'artist-apps/index.html'), appRegistryHtml(artists));
const localArtists = artists.filter((artist) => !new Set(['gray-skyes', 'gray-skyes-brain', 'supaboy']).has(artist.slug));
writeFile(path.join(storefrontRoot, 'local-artists/index.html'), localArtistsHtml(localArtists));
writeFile(path.join(storefrontRoot, 'local-artists/collective-personality-profiles.html'), profileRollupHtml(localArtists));
changed.push('index.html', 'artist-apps/index.html', 'local-artists/index.html', 'local-artists/collective-personality-profiles.html');

const receipt = {
  schema: 'skyemusicnexus.artist-storefront-product-redo.v1',
  redoneAt,
  artists: artists.map((artist) => ({
    slug: artist.slug,
    name: artist.name,
    products: artist.products.length,
    activeProducts: artist.products.filter((product) => product.status === 'active' || product.audioFile).length,
    productRoom: `/SkyeMusicNexus/artist-storefronts/${artist.slug}/products/`,
  })),
  changed,
  guarantees: [
    'public product CTAs route to product rooms instead of products/products.json',
    'product rooms expose preview, drop, SkyePay checkout, and share actions',
    'root and artist app registries include product room links',
    'raw product JSON remains a backing file, not a fan-facing button',
  ],
};
writeJson(receiptPath, receipt);
console.log(JSON.stringify({ok: true, artists: artists.length, changed: changed.length, receipt: receiptPath}, null, 2));
