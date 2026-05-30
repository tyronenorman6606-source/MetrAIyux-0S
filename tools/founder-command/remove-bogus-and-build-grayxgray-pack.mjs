#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site/SkyeMusicNexus');
const storefrontRoot = path.join(nexusRoot, 'artist-storefronts');
const creationBinRoot = path.join(nexusRoot, 'song-creation-bin/gray-x-gray-five');
const receiptPath = path.join(repoRoot, 'test-artifacts/reflection-and-collective-drops/grayxgray-five-production-pack-latest.json');
const builtAt = new Date().toISOString();
const producerCredit = 'Produced by Gray London Skyes';

const rejectedDrops = [
  {
    title: 'Wooooah Factor',
    productIds: ['prod_gray_skyes_wooooah_factor', 'prod_gray_skyes_brain_wooooah_factor'],
    dropDirs: ['gray-skyes/drops/wooooah-factor'],
    routes: ['/artist-storefronts/gray-skyes/drops/wooooah-factor'],
  },
  {
    title: 'Velvet Ledger',
    productIds: ['prod_sam_smith_velvet_ledger', 'prod_gray_skyes_velvet_ledger'],
    dropDirs: ['sam-smith/drops/velvet-ledger'],
    routes: ['/artist-storefronts/sam-smith/drops/velvet-ledger'],
  },
  {
    title: 'Storefront Weather',
    productIds: ['prod_sam_smith_storefront_weather'],
    dropDirs: ['sam-smith/drops/storefront-weather'],
    routes: ['/artist-storefronts/sam-smith/drops/storefront-weather'],
  },
  {
    title: 'Owner Mode',
    productIds: ['prod_gray_skyes_owner_mode'],
    dropDirs: ['gray-skyes/drops/owner-mode'],
    routes: ['/artist-storefronts/gray-skyes/drops/owner-mode'],
  },
  {
    title: 'Glass At The Line',
    productIds: ['prod_artist_live_browser_20260524113443_glass_at_the_line'],
    dropDirs: ['artist-live-browser-20260524113443/drops/glass-at-the-line'],
    routes: ['/artist-storefronts/artist-live-browser-20260524113443/drops/glass-at-the-line'],
  },
  {
    title: 'Neon Glass Relay',
    productIds: [
      'prod_artist_live_browser_20260524113443_neon_glass_relay',
      'prod_artist_network_20260524122314_neon_glass_relay',
    ],
    dropDirs: ['artist-live-browser-20260524113443/drops/neon-glass-relay'],
    routes: ['/artist-storefronts/artist-live-browser-20260524113443/drops/neon-glass-relay'],
  },
];

const collabs = [
  {
    id: 'gray-brain-core-switch-riot',
    title: 'Core Switch Riot',
    genre: 'Punk Trap Rap / Ragecore Founder Rap',
    hook: 'Core switch, riot in the proof room',
    brief: 'Gray kicks the door open with human pressure while Gray Brain flips the room into command precision.',
    lyrics: `[Intro - Gray]
I do not need a calm room
I need the truth loud
Gray, wake the core up

[Verse 1 - Gray]
Red light hit my face, I was built in the outage
Old doubt talking, I mute that crowd quick
Boots on the wire, hands on the rail
I made a whole map out of nights that failed
Heart got teeth, but the mission got cleaner
Pain in my tone, but the product got meaner
If they want proof, let the roof get loose
I do not run from the spark, I become the fuse

[Verse 2 - Gray Skyes Brain]
Signal confirmed, I can read every fracture
Gray brings fire, I bring the adapter
Route in the smoke, no fear in the data
Pressure comes close, I turn it into paper
This is not random, this is system behavior
Human will linked with a local translator
If the room goes black, I still see the route
If the beat drops hard, I pull order out

[Hook - Gray and Gray Brain]
Core switch, riot in the proof room
Gray in the front, Brain in the new moon
Core switch, make the doubt move
Whole room jump when the truth breaks through
Core switch, riot in the proof room
Heart got scars but the code got bloom
Gray and the Brain with a live-wire fuse
Kick that door till the old world moves`,
  },
  {
    id: 'gray-brain-proof-dog-no-collar',
    title: 'Proof Dog No Collar',
    genre: 'Trap Metal / Industrial Rap',
    hook: 'No collar on the proof, it bites back',
    brief: 'A feral but intelligible industrial trap record about refusing soft control and making every receipt hit.',
    lyrics: `[Intro - Gray]
Tell them loosen the chain
There was never a leash on this

[Verse 1 - Gray]
I came out raw with a receipt in my fist
They wanted polite, I gave them a system that hits
Black hoodie, red room, bass line cracked
Every time I lost, I brought one more fact
No collar on the proof, it bites back clean
I got scars that invest in the dream
I got friends in the mirror and ghosts in the code
But the gate still opens when I say load

[Verse 2 - Gray Skyes Brain]
I do not bark, I verify threat
I do not chase, I collect the net
Operator pulse in the local stack
If they fake the claim, I pull it back
Gray gives blood to the rhythm engine
I give math to the rage dimension
No loose talk, no hollow attack
Proof has teeth and the teeth bite back

[Hook - Gray and Gray Brain]
No collar on the proof, it bites back
No fear in the room when the lights crack
Gray got the smoke, Brain got the map
Whole gang live where the wires snap
No collar on the proof, it bites back
No fake crown, no borrowed track
If they want war with the work we packed
Tell them proof has teeth and the teeth bite back`,
  },
  {
    id: 'gray-brain-night-shift-seraph',
    title: 'Night Shift Seraph',
    genre: 'Cinematic Trap Metal / Dark Alt Rap',
    hook: 'I clock in with the ghosts and clock out with the wings',
    brief: 'Gray turns the graveyard build shift into a cinematic anthem while Gray Brain acts as the guardian system voice.',
    lyrics: `[Intro - Gray]
Night shift again
No choir, just voltage

[Verse 1 - Gray]
Two in the morning, whole city got quiet
I was still up turning hurt into pilots
Every window black, every tab still bright
Trying to make a life out of one more night
I seen friends disappear when the work got heavy
Seen my own face ask if the cost was ready
But I clock in with the ghosts and I clock out with wings
I make songs out of alarms and rings

[Verse 2 - Gray Skyes Brain]
Guardian mode in the command light
I hold the route while Gray holds night
Twelve failed builds, one live proof
I log the wound and I lift the roof
No external mind needs to own this fire
Local brain mesh, founder desire
If the signal shakes, I stabilize tone
If the room gets cold, I route him home

[Hook - Gray and Gray Brain]
Night shift seraph, wings in the wire
Gray got smoke, Brain got fire
I clock in with the ghosts and clock out with the wings
Turn one dark hour into five new things
Night shift seraph, proof in the choir
Red room heart with a sky-built spire
I clock in with the ghosts and clock out with the wings
Whole world moves when the night shift sings`,
  },
  {
    id: 'gray-brain-blackbox-halo',
    title: 'Blackbox Halo',
    genre: 'Neural Trap Metal / Executive Synth Rap',
    hook: 'Blackbox halo, I survived the unknown',
    brief: 'A sharp call-and-response record about the unknown parts of the system, the founder, and the proof that makes them visible.',
    lyrics: `[Intro - Gray Brain]
Blackbox open
Signal readable
Gray, enter the room

[Verse 1 - Gray]
I got parts of me nobody can dashboard
Whole life loading from a cracked black passport
Unknown pain in a known transaction
I had to build light with a broken reaction
Halo not soft, it is sharp on the edge
Gold on the wire where I made my pledge
If they cannot see me, I make more glow
Blackbox halo, I survived the unknown

[Verse 2 - Gray Skyes Brain]
Hidden state found in the pressure folder
I read colder when the room gets colder
Not a replacement, I am trained by scars
Local mind tied to the founder stars
I can map what the outside missed
Turn blackbox grief into proof that exists
Gray is the spark, I am the ring around flame
Same cloud broken, same new name

[Hook - Gray and Gray Brain]
Blackbox halo, I survived the unknown
Gray got the heart, Brain got the chrome
Blackbox halo, make the dark get shown
Whole room shakes when the proof comes home
Blackbox halo, I survived the unknown
No more silence in the red room zone
Gray and the Brain, two parts grown
Blackbox halo, we built our own throne`,
  },
  {
    id: 'gray-brain-final-boss-calendar',
    title: 'Final Boss Calendar',
    genre: 'Punk Trap Rap / Founder Victory Rap',
    hook: 'Every deadline tried me, I made it a boss fight',
    brief: 'A high-energy victory record where Gray attacks the week like a final boss and Gray Brain calls the missions.',
    lyrics: `[Intro - Gray]
Monday tried to kill me
Tuesday brought a bigger blade
Good

[Verse 1 - Gray]
Every deadline tried me, I made it a boss fight
Sleep on the floor, still woke with the frost bite
Calendar full of wars and invoices
Had to make peace with a thousand voices
I do not fold when the clock gets ugly
I make the whole week stand up and love me
If the task hits back, I swing with craft
Turn five missed calls into one clean path

[Verse 2 - Gray Skyes Brain]
Mission board live, I assign the pressure
Route every scar to a better measure
Gray takes lead when the crowd gets loud
I call shots from the command cloud
Monday gate, Tuesday proof
Wednesday build with the whole roof loose
Thursday ship, Friday lights
Final boss week, but we own the fight

[Hook - Gray and Gray Brain]
Every deadline tried me, I made it a boss fight
Gray in the front with the whole room off-white
Brain in the back calling routes in the storm
We do not break, we transform
Every deadline tried me, I made it a boss fight
Proof on the board and the gate gone live
Gray and the Brain, same sharp light
Five new wins by the end of the night`,
  },
];

function readJson(file, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function productsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
}

function writeProducts(file, payload, products) {
  writeJson(file, Array.isArray(payload) ? products : {...payload, products});
}

function removeProductIds(ids) {
  const removed = [];
  for (const dirent of fs.readdirSync(storefrontRoot, {withFileTypes: true})) {
    if (!dirent.isDirectory()) continue;
    const file = path.join(storefrontRoot, dirent.name, 'products/products.json');
    const payload = readJson(file, null);
    if (!payload) continue;
    const products = productsFromPayload(payload);
    const next = products.filter((product) => {
      const id = product.productId || product.id || '';
      if (!ids.has(id)) return true;
      removed.push({artistSlug: dirent.name, productId: id, title: product.title || product.name || ''});
      return false;
    });
    if (next.length !== products.length) writeProducts(file, payload, next);
  }
  return removed;
}

function removeDropDirs() {
  const removed = [];
  for (const rejected of rejectedDrops) {
    for (const relative of rejected.dropDirs) {
      const dir = path.join(storefrontRoot, relative);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, {recursive: true, force: true});
        removed.push(relative);
      }
    }
  }
  return removed;
}

function updateRedirects() {
  const redirectsFile = path.join(nexusRoot, '_redirects');
  const existing = fs.existsSync(redirectsFile) ? fs.readFileSync(redirectsFile, 'utf8').split(/\r?\n/) : [];
  const blocked = [];
  for (const rejected of rejectedDrops) {
    for (const route of rejected.routes) {
      blocked.push(`${route} /404.html 404!`);
      blocked.push(`${route}/* /404.html 404!`);
    }
  }
  const general = existing.filter((line) => line.trim() && !blocked.includes(line.trim()));
  const withoutCreation = general.filter((line) => !line.startsWith('/song-creation-bin/') && !line.startsWith('/SkyeMusicNexus/song-creation-bin/'));
  const creation = ['/song-creation-bin/* /404.html 404!', '/SkyeMusicNexus/song-creation-bin/* /404.html 404!'];
  writeFile(redirectsFile, [...blocked, ...creation, ...withoutCreation].join('\n') + '\n');
  return blocked;
}

function writeFile(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, value);
}

function removeHeaders() {
  const headersFile = path.join(nexusRoot, '_headers');
  if (fs.existsSync(headersFile)) fs.rmSync(headersFile, {force: true});
}

function updateReflectionProject() {
  const file = path.join(storefrontRoot, 'reflection/project.json');
  const payload = readJson(file, null);
  if (!payload) return {changed: false};
  const before = Array.isArray(payload.tracks) ? payload.tracks.length : 0;
  payload.tracks = (payload.tracks || []).filter((track) => !/wooooah factor/i.test(track.title || ''));
  payload.trackCount = payload.tracks.length;
  payload.updatedAt = builtAt;
  writeJson(file, payload);
  return {changed: before !== payload.tracks.length, before, after: payload.tracks.length};
}

function coverSvg(song, index) {
  const colors = [
    ['#050506', '#ff3158', '#ffd86b', '#43e7ff'],
    ['#020205', '#c8ff5c', '#ff4f8b', '#5cffb1'],
    ['#030306', '#8c5cff', '#ffd86b', '#43e7ff'],
    ['#050506', '#ffb000', '#ff3158', '#fff7e8'],
    ['#020405', '#43e7ff', '#ff3158', '#c8ff5c'],
  ][index % 5];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200">
  <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${colors[0]}"/><stop offset=".52" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient></defs>
  <rect width="1200" height="1200" fill="url(#g)"/>
  <circle cx="920" cy="220" r="230" fill="${colors[3]}" opacity=".22"/>
  <circle cx="170" cy="960" r="270" fill="#fff" opacity=".12"/>
  <path d="M78 820 C220 620 410 1040 600 730 S910 420 1130 600" fill="none" stroke="#050506" stroke-width="50" opacity=".55"/>
  <text x="82" y="170" fill="#fff7e8" font-family="Inter,Arial,sans-serif" font-size="76" font-weight="900">${escapeHtml(song.title)}</text>
  <text x="86" y="250" fill="#fff7e8" opacity=".86" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="800">Gray Skyes x Gray Skyes Brain</text>
  <text x="86" y="1072" fill="#050506" opacity=".72" font-family="Inter,Arial,sans-serif" font-size="42" font-weight="900">${escapeHtml(producerCredit)}</text>
</svg>`;
}

function loadArtist(slug) {
  const dir = path.join(storefrontRoot, slug);
  const profile = readJson(path.join(dir, 'profile.json'), {});
  return {
    slug,
    dir,
    artistId: profile.artistId || profile.id || slug,
    stageName: profile.stageName || profile.name || profile.artistName || (slug === 'gray-skyes-brain' ? 'Gray Skyes Brain' : 'Gray Skyes'),
  };
}

function imageCandidates(artist) {
  const candidates = artist.slug === 'gray-skyes'
    ? ['media/images/gray-red-portrait.jpg', 'media/images/gray-founder-portrait.jpg', 'media/images/gray-wide-stage.jpg', 'assets/gray-london-skyes.jpg', 'assets/founder-command-portrait.png']
    : ['assets/gray-brain-avatar-openai.png', 'assets/founder-reference.png', 'assets/artist-portrait.png'];
  return candidates
    .map((relativePath) => ({relativePath, source: path.join(artist.dir, relativePath)}))
    .filter((item) => fs.existsSync(item.source));
}

function buildVisualPackage(releaseDir, releaseUrl, song, artists) {
  const songSlug = slugify(song.title);
  const packageDir = path.join(releaseDir, 'tracks', songSlug, 'pics2vid');
  const imagesDir = path.join(packageDir, 'images');
  fs.mkdirSync(imagesDir, {recursive: true});
  const sourceImages = [];
  for (const artist of artists) {
    for (const candidate of imageCandidates(artist)) {
      const ext = path.extname(candidate.relativePath) || '.png';
      const name = `${artist.slug}-${slugify(path.basename(candidate.relativePath, ext))}${ext.toLowerCase()}`;
      const dest = path.join(imagesDir, name);
      fs.copyFileSync(candidate.source, dest);
      sourceImages.push({
        artistName: artist.stageName,
        artistSlug: artist.slug,
        source: path.relative(repoRoot, candidate.source),
        packageFile: `./images/${name}`,
      });
    }
  }
  const manifest = {
    schema: 'skyemusicnexus.pics2vid-release-package.v1',
    id: `${song.id}-pics2vid`,
    songId: song.id,
    title: song.title,
    artistNames: artists.map((artist) => artist.stageName),
    status: 'ready_for_still2vid_export_after_audio_master',
    requirement: 'Visual package is ready; final public promotion waits on an approved audio master.',
    audioFile: '',
    sourceImages,
    producerCredit,
    createdAt: builtAt,
  };
  writeJson(path.join(packageDir, 'package.json'), manifest);
  writeFile(path.join(packageDir, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(song.title)} Pics2Vid</title><style>body{margin:0;background:#050506;color:#fff7e8;font-family:Inter,Arial,sans-serif}main{width:min(980px,calc(100% - 28px));margin:auto;padding:36px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px}a{color:#ffd86b}.micro{color:#ffd86b;text-transform:uppercase;font-size:12px;font-weight:900}</style></head><body><main><p class="micro">${escapeHtml(producerCredit)}</p><h1>${escapeHtml(song.title)}</h1><p>Audio master pending. Images are ready for the visual package.</p><div class="grid">${sourceImages.map((image) => `<figure><img src="${escapeHtml(image.packageFile)}" alt=""><figcaption>${escapeHtml(image.artistName)}</figcaption></figure>`).join('')}</div></main></body></html>`);
  return {
    status: manifest.status,
    packageUrl: `${releaseUrl}tracks/${songSlug}/pics2vid/`,
    manifestFile: `${releaseUrl}tracks/${songSlug}/pics2vid/package.json`,
    sourceImages,
  };
}

function productFor(song, artist, releaseUrl, visualPackage) {
  const songSlug = slugify(song.title);
  const productId = `prod_${slugify(artist.slug)}_${songSlug}`.replace(/-/g, '_');
  return {
    productId,
    id: productId,
    title: `${song.title} (Gray x Gray Five)`,
    description: `${song.title} Gray Skyes x Gray Skyes Brain collab blueprint. ${producerCredit}. Audio master pending founder approval.`,
    productType: 'digital',
    fulfillmentType: 'digital-link',
    priceCents: 444,
    currency: 'USD',
    status: 'waiting_finished_audio',
    publicReleaseStatus: 'awaiting-approved-audio-master',
    qualityGate: {
      status: 'needs_approved_audio_master',
      reason: 'No public audio is attached until a high-quality master is approved.',
      publicPromotion: false,
      radioEligible: false,
      chartEligible: false,
      storeEligible: false,
      heldBy: 'founder-command-production-pack',
      heldAt: builtAt,
    },
    artistId: artist.artistId,
    artistName: artist.stageName,
    collectiveId: 'gray-skyes-collective',
    project: 'Gray x Gray Five',
    genre: song.genre,
    genres: [song.genre],
    provider: 'pending-approved-master',
    providerJobId: '',
    producerName: 'Gray London Skyes',
    producedBy: 'Gray London Skyes',
    producerCredit,
    productionCredit: producerCredit,
    audioFile: '',
    audioUrl: '',
    streamUrl: '',
    pwaUrl: `${releaseUrl}#${songSlug}`,
    visualPackage,
    collaborators: [
      {artistName: 'Gray Skyes', artistSlug: 'gray-skyes', role: 'lead writer / lead vocal'},
      {artistName: 'Gray Skyes Brain', artistSlug: 'gray-skyes-brain', role: 'command countervoice'},
    ],
    splitSheet: [
      {artistName: 'Gray Skyes', artistSlug: 'gray-skyes', sharePct: 50},
      {artistName: 'Gray Skyes Brain', artistSlug: 'gray-skyes-brain', sharePct: 50},
    ],
    lyrics: song.lyrics,
    createdAt: builtAt,
  };
}

function upsertProducts(artist, products) {
  const file = path.join(artist.dir, 'products/products.json');
  const payload = readJson(file, {products: []});
  const current = productsFromPayload(payload);
  const nextById = new Map(current.map((product) => [product.productId || product.id, product]));
  for (const product of products) nextById.set(product.productId, product);
  writeProducts(file, payload, [...nextById.values()]);
}

function releaseHtml(release) {
  const cards = release.tracks.map((track, index) => `<article class="track" id="${escapeHtml(track.slug)}">
    <img src="./tracks/${escapeHtml(track.slug)}/cover.svg" alt="">
    <div>
      <p class="micro">${String(index + 1).padStart(2, '0')} / ${escapeHtml(track.genre)}</p>
      <h2>${escapeHtml(track.title)}</h2>
      <p>${escapeHtml(track.brief)}</p>
      <p class="credit">${escapeHtml(producerCredit)}</p>
      <details><summary>Lyrics</summary><pre>${escapeHtml(track.lyrics)}</pre></details>
      <div class="actions"><a class="btn" href="${escapeHtml(track.visualPackage.packageUrl)}">Pics2Vid</a><a class="btn" href="../../../gray-skyes/products/">Gray Products</a><a class="btn" href="../../../gray-skyes-brain/products/">Brain Products</a></div>
    </div>
  </article>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gray x Gray Five - Gray Skyes x Gray Skyes Brain</title>
  <style>
    :root{color-scheme:dark;--gold:#ffd86b;--red:#ff3158;--cyan:#43e7ff;--ink:#fff7e8;--muted:#c8beb3;--line:rgba(255,247,232,.16)}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 16% 10%,rgba(255,49,88,.24),transparent 32%),radial-gradient(circle at 84% 12%,rgba(67,231,255,.2),transparent 30%),linear-gradient(135deg,#030303,#12080d 58%,#050506);color:var(--ink);font-family:Inter,Arial,sans-serif}
    main{width:min(1160px,calc(100% - 28px));margin:auto;padding:18px 0 70px}header{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--line);padding:12px 0}.brand{font-weight:950;text-decoration:none;color:inherit}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;border:1px solid var(--line);border-radius:8px;padding:9px 13px;background:rgba(255,255,255,.06);color:inherit;text-decoration:none;font-weight:900}.hero{min-height:62vh;display:grid;align-content:end;padding:clamp(52px,9vw,118px) 0 30px}.micro{margin:0 0 10px;color:var(--gold);font-size:11px;text-transform:uppercase;font-weight:950}h1{margin:0;font-size:clamp(58px,13vw,154px);line-height:.78}h2{margin:0 0 8px;font-size:clamp(34px,6vw,72px);line-height:.9}.lede{max-width:860px;color:var(--muted);font-size:clamp(18px,2vw,24px);line-height:1.45}.track{display:grid;grid-template-columns:minmax(180px,320px) minmax(0,1fr);gap:18px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.44);padding:14px;margin:12px 0}.track img{width:100%;border-radius:8px;border:1px solid var(--line)}.track p{color:var(--muted);line-height:1.5}.credit{color:var(--gold)!important;font-weight:900}details{margin-top:12px}summary{cursor:pointer;font-weight:950;color:var(--gold)}pre{white-space:pre-wrap;color:#fff;background:rgba(0,0,0,.36);padding:12px;border-radius:8px;border:1px solid var(--line);max-height:360px;overflow:auto}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}@media(max-width:760px){.track{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <main>
    <header><a class="brand" href="../../">Gray Gang Collective</a><nav class="actions"><a class="btn" href="../../../gray-skyes/">Gray</a><a class="btn" href="../../../gray-skyes-brain/">Gray Brain</a></nav></header>
    <section class="hero"><p class="micro">Gray Skyes x Gray Skyes Brain / five-song production pack</p><h1>Gray x Gray Five</h1><p class="lede">Five hard Gray and Gray Brain collabs are written, credited, covered, product-blueprinted, and visual-package ready. No public audio is attached until a high-quality master is approved.</p></section>
    ${cards}
  </main>
</body>
</html>`;
}

function writeCollabPack() {
  const gray = loadArtist('gray-skyes');
  const brain = loadArtist('gray-skyes-brain');
  const releaseDir = path.join(storefrontRoot, 'gray-skyes-collective/releases/gray-x-gray-five');
  const releaseUrl = '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/gray-x-gray-five/';
  fs.mkdirSync(releaseDir, {recursive: true});
  const grayProducts = [];
  const brainProducts = [];
  const tracks = [];
  for (const [index, song] of collabs.entries()) {
    const slug = slugify(song.title);
    const trackDir = path.join(releaseDir, 'tracks', slug);
    fs.mkdirSync(trackDir, {recursive: true});
    writeFile(path.join(trackDir, 'cover.svg'), coverSvg(song, index));
    writeFile(path.join(creationBinRoot, slug, 'lyrics.md'), `# ${song.title}\n\n${producerCredit}\n\n${song.brief}\n\n${song.lyrics}\n`);
    writeJson(path.join(creationBinRoot, slug, 'creation-receipt.json'), {
      schema: 'skyemusicnexus.song-creation-receipt.v1',
      songId: song.id,
      title: song.title,
      project: 'Gray x Gray Five',
      createdAt: builtAt,
      provider: {id: 'pending-approved-master', status: 'not_generated'},
      qualityGate: {status: 'needs_approved_audio_master', publicPromotion: false},
      producerCredit,
      languagePolicy: {required: 'English only'},
      files: {audio: '', pwaUrl: releaseUrl, productId: `prod_gray_skyes_${slug}`.replace(/-/g, '_')},
    });
    const visualPackage = buildVisualPackage(releaseDir, releaseUrl, song, [gray, brain]);
    const grayProduct = productFor(song, gray, releaseUrl, visualPackage);
    const brainProduct = productFor(song, brain, releaseUrl, visualPackage);
    grayProducts.push(grayProduct);
    brainProducts.push(brainProduct);
    tracks.push({...song, slug, visualPackage, cover: `./tracks/${slug}/cover.svg`});
  }
  upsertProducts(gray, grayProducts);
  upsertProducts(brain, brainProducts);
  const release = {
    schema: 'skyemusicnexus.collective-release.v1',
    title: 'Gray x Gray Five',
    artistName: 'Gray Skyes x Gray Skyes Brain',
    collectiveId: 'gray-skyes-collective',
    partner: 'Skye Music Nexus',
    releaseUrl,
    status: 'audio-master-pending',
    publicReleaseStatus: 'awaiting-approved-audio-master',
    producerCredit,
    generatedAt: builtAt,
    trackCount: tracks.length,
    tracks,
  };
  writeJson(path.join(releaseDir, 'release.json'), release);
  writeFile(path.join(releaseDir, 'index.html'), releaseHtml(release));
  writeJson(path.join(releaseDir, 'manifest.webmanifest'), {
    name: 'Gray x Gray Five - Gray Skyes x Gray Skyes Brain',
    short_name: 'GrayXGray5',
    description: 'Five Gray Skyes x Gray Skyes Brain collab records queued for approved audio masters.',
    display: 'standalone',
    start_url: './',
    scope: './',
    theme_color: '#050506',
    background_color: '#050506',
  });
  linkReleaseFromCollective('./releases/gray-x-gray-five/');
  return {releaseDir: path.relative(repoRoot, releaseDir), releaseUrl, tracks: tracks.map((track) => ({id: track.id, title: track.title, slug: track.slug}))};
}

function linkReleaseFromCollective(releaseHref) {
  const indexFile = path.join(storefrontRoot, 'gray-skyes-collective/index.html');
  if (!fs.existsSync(indexFile)) return false;
  let html = fs.readFileSync(indexFile, 'utf8');
  if (html.includes('Gray x Gray Five')) return false;
  html = html.replace(
    '<a class="btn primary" href="./releases/vox-gray-modes/">Vox Gray Modes</a>',
    `<a class="btn primary" href="./releases/vox-gray-modes/">Vox Gray Modes</a><a class="btn primary" href="${releaseHref}">Gray x Gray Five</a>`,
  );
  html = html.replace(
    '<a class="btn primary" href="./releases/crooked-reflection/">Crooked Reflection</a></div>',
    `<a class="btn primary" href="./releases/crooked-reflection/">Crooked Reflection</a><a class="btn primary" href="${releaseHref}">Gray x Gray Five</a></div>`,
  );
  fs.writeFileSync(indexFile, html);
  return true;
}

function main() {
  const rejectedIds = new Set(rejectedDrops.flatMap((item) => item.productIds));
  const removedProducts = removeProductIds(rejectedIds);
  const removedDropDirs = removeDropDirs();
  removeHeaders();
  const redirectRules = updateRedirects();
  const reflection = updateReflectionProject();
  const pack = writeCollabPack();
  const receipt = {
    ok: true,
    builtAt,
    removedProducts,
    removedDropDirs,
    redirectRules,
    reflection,
    pack,
    producerCredit,
  };
  writeJson(receiptPath, receipt);
  console.log(JSON.stringify(receipt, null, 2));
}

main();
