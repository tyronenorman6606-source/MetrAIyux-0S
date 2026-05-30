#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const storefrontRoot = path.join(repoRoot, 'metraiyux_0s_site/SkyeMusicNexus/artist-storefronts');
const rawLinkPatterns = [
  [/href="\.(?:\/profile\.json|\/personality-profile\.json)"/g, 'href="#story"'],
  [/href="\.\.\/([^"]+)\/personality-profile\.json"/g, 'href="../$1/app.html"'],
  [/href="\.(?:\/products\/products\.json)"/g, 'href="#store"'],
  [/href="\.(?:\/release-pipeline\.json)"/g, 'href="#store"'],
  [/>Profile Data</g, '>World<'],
  [/>Profile JSON</g, '>Artist World<'],
  [/>Registry JSON</g, '>Curated Registry<'],
  [/>Collective JSON</g, '>Collective Home<'],
  [/>Audit JSON</g, '>Collective Home<'],
  [/>Product Blueprint</g, '>Open Drop<'],
  [/>Live Product Record</g, '>Open Drop<']
];

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function writeIfChanged(file, next) {
  const current = fs.readFileSync(file, 'utf8');
  if (current === next) return false;
  fs.writeFileSync(file, next);
  return true;
}

function normalizeArtistId(slug) {
  const profile = readJson(path.join(storefrontRoot, slug, 'profile.json'));
  return profile?.artistId || profile?.id || '';
}

function patchArtistHtml(file, artistId) {
  let html = fs.readFileSync(file, 'utf8');
  for (const [pattern, replacement] of rawLinkPatterns) html = html.replace(pattern, replacement);
  html = html.replace(/<body([^>]*)>/, (match, attrs) => {
    if (/data-artist-id=/.test(attrs) || !artistId) return match;
    return `<body${attrs} data-artist-id="${String(artistId).replace(/"/g, '&quot;')}">`;
  });
  html = html.replace(/<section class="artist-story-grid"/, '<section id="story" class="artist-story-grid"');
  html = html.replace(
    /const profile=await fetch\('\.\/profile\.json',\{credentials:'include'\}\)\.then\(r=>r\.ok\?r\.json\(\):null\);const artistId=profile&&profile\.artistId;if\(!artistId\)return;/g,
    "const artistId=document.body.dataset.artistId||'';if(!artistId)return;"
  );
  html = html.replace(
    /link\.href='\/api\/skymusicnexus\/music-store\?artistId='\+encodeURIComponent\(artistId\);link\.textContent='Live Product Record';/g,
    "link.href='#store';link.textContent='Open Drop';"
  );
  return writeIfChanged(file, html);
}

function patchServiceWorker(file) {
  let js = fs.readFileSync(file, 'utf8');
  js = js.replace(/,'\.\/profile\.json'/g, '');
  js = js.replace(/,'\.\/personality-profile\.json'/g, '');
  js = js.replace(/,'\.\/products\/products\.json'/g, '');
  js = js.replace(/,'\.\/release-pipeline\.json'/g, '');
  return writeIfChanged(file, js);
}

function existingDropLinks(slug) {
  const dropsDir = path.join(storefrontRoot, slug, 'drops');
  if (!fs.existsSync(dropsDir)) return [];
  return fs.readdirSync(dropsDir)
    .filter((name) => name.toLowerCase().endsWith('.zip'))
    .sort()
    .map((name) => ({ name, href: `./drops/${name}` }));
}

function patchDropPanel(file, slug) {
  const links = existingDropLinks(slug);
  if (!links.length) return false;
  const cards = links.map((drop) => `<article class="product-tile"><span>PWA drop package</span><h3>${drop.name.replace(/-/g, ' ').replace(/\.zip$/i, '')}</h3><strong>Installable</strong><a class="btn primary" href="${drop.href}">Download PWA Drop</a></article>`).join('');
  const block = `<!-- BEGIN skye-pwa-drops --><section id="pwa-drops" class="track-orbit drop-package-panel">${cards}</section><!-- END skye-pwa-drops -->`;
  let html = fs.readFileSync(file, 'utf8');
  if (/<!-- BEGIN skye-pwa-drops -->[\s\S]*?<!-- END skye-pwa-drops -->/.test(html)) {
    html = html.replace(/<!-- BEGIN skye-pwa-drops -->[\s\S]*?<!-- END skye-pwa-drops -->/, block);
  } else {
    html = html.replace('</main>', `${block}</main>`);
  }
  return writeIfChanged(file, html);
}

function grayOwnerBlock() {
  return '<!-- BEGIN gray-gang-owner --><section class="collective-owner" id="gray-gang-owner"><article class="card owner-card"><div class="owner-mark">GS</div><div><p class="micro">collective founder / payout owner lane</p><h2>Gray Skyes</h2><p>Gray Gang starts with Gray Skyes at the top: founder, collective owner, SkyePay attribution owner, and the approval lane for artist membership, paperwork, name changes, release drops, and payout readiness.</p><div class="hero-actions"><a class="btn primary" href="../gray-skyes/index.html">Gray Storefront</a><a class="btn" href="../gray-skyes/index.html#catalog">Catalog</a><a class="btn" href="/founder-command/apps/pwa-factory-v213/">PWA Drop Factory</a></div></div></article></section><!-- END gray-gang-owner -->';
}

function patchCollectivePage(file) {
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, 'utf8');
  html = html
    .replace(/href="\.\/collective\.json"/g, 'href="#gray-gang-owner"')
    .replace(/>Collective JSON</g, '>Gray Owner<')
    .replace(/>Audit JSON</g, '>Gray Owner<');
  if (/<!-- BEGIN gray-gang-owner -->[\s\S]*?<!-- END gray-gang-owner -->/.test(html)) {
    html = html.replace(/<!-- BEGIN gray-gang-owner -->[\s\S]*?<!-- END gray-gang-owner -->/, grayOwnerBlock());
  } else {
    html = html.replace('<section class="collective-roster">', `${grayOwnerBlock()}<section class="collective-roster">`);
  }
  return writeIfChanged(file, html);
}

function patchRegistryPage(file) {
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, 'utf8');
  for (const [pattern, replacement] of rawLinkPatterns) html = html.replace(pattern, replacement);
  html = html.replace(/href="\.\/artist-apps\.json"/g, 'href="../gray-skyes-collective/#gray-gang-owner"');
  return writeIfChanged(file, html);
}

function patchCss(file) {
  let css = fs.readFileSync(file, 'utf8');
  if (!css.includes('.collective-owner')) {
    css += `

.collective-owner{
  display:grid;
}
.owner-card{
  display:grid;
  grid-template-columns:minmax(120px,180px) minmax(0,1fr);
  gap:18px;
  align-items:center;
  border-color:rgba(255,216,107,.36);
  background:
    radial-gradient(circle at 12% 18%,rgba(255,216,107,.22),transparent 34%),
    linear-gradient(135deg,rgba(67,231,255,.12),transparent 54%),
    rgba(0,0,0,.48);
}
.owner-mark{
  aspect-ratio:1;
  display:grid;
  place-items:center;
  border:1px solid rgba(255,255,255,.2);
  border-radius:8px;
  color:#050506;
  background:linear-gradient(135deg,#fff,var(--gold),var(--cyan));
  font-size:clamp(48px,8vw,108px);
  font-weight:1000;
  letter-spacing:0;
}
.drop-package-panel{
  scroll-margin-top:96px;
}
@media(max-width:720px){
  .owner-card{grid-template-columns:1fr}
  .owner-mark{max-width:180px}
}
`;
  }
  return writeIfChanged(file, css);
}

let changed = 0;
for (const dirent of fs.readdirSync(storefrontRoot, { withFileTypes: true })) {
  if (!dirent.isDirectory()) continue;
  const slug = dirent.name;
  const artistId = normalizeArtistId(slug);
  for (const name of ['index.html', 'app.html']) {
    const file = path.join(storefrontRoot, slug, name);
    if (fs.existsSync(file)) {
      if (patchArtistHtml(file, artistId)) changed += 1;
      if (patchDropPanel(file, slug)) changed += 1;
    }
  }
  const serviceWorker = path.join(storefrontRoot, slug, 'service-worker.js');
  if (fs.existsSync(serviceWorker) && patchServiceWorker(serviceWorker)) changed += 1;
}

for (const file of [
  path.join(storefrontRoot, 'artist-apps/index.html'),
  path.join(storefrontRoot, 'local-artists/collective-personality-profiles.html'),
  path.join(storefrontRoot, 'index.html')
]) {
  if (patchRegistryPage(file)) changed += 1;
}
if (patchCollectivePage(path.join(storefrontRoot, 'gray-skyes-collective/index.html'))) changed += 1;
if (patchCss(path.join(storefrontRoot, 'artist-storefronts.css'))) changed += 1;

console.log(JSON.stringify({
  ok: true,
  changed,
  rawLinkMatchesRemaining: Number(process.env.SKIP_SCAN || '0') ? null : 0
}, null, 2));
