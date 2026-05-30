#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const storefrontRoot = path.join(repoRoot, 'metraiyux_0s_site/SkyeMusicNexus/artist-storefronts');
const execute = process.argv.includes('--execute');
const durationSeconds = Number(process.argv.find(arg => arg.startsWith('--duration='))?.split('=')[1] || 150);
const priceCents = 444;
const outDir = path.join(repoRoot, 'test-artifacts/gray-gang-requested-songs');

const secretKeys = [
  'FREE99_ADMIN_CODE',
  'FREE99_GATE_CODE',
  'OWNER_ADMIN_CODE',
  'ADMIN_CODE',
  'ZERO_OS_ADMIN_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'FS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_CODE'
];

const ARTISTS = {
  dre: { slug: 'artist-live-browser-20260523060751' },
  sol: { slug: 'artist-full-matrix-20260524113514' },
  vox: { slug: 'artist-live-browser-20260523062845' },
  veda: { slug: 'artist-full-matrix-20260524085129' },
  orion: { slug: 'smoke-artist-mpku77m6' },
  ajay: { slug: 'dj-ajay' },
  radio: { slug: 'radio-vibez' },
  jessa: { slug: 'jessica-walsh' },
  stoves: { slug: 'tha-stoves' }
};

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

function unquote(value) {
  let clean = String(value || '').trim().replace(/^export\s+/, '').trim();
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) clean = clean.slice(1, -1).trim();
  return clean;
}

function envFromText(text, key) {
  let found = '';
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    if (normalized.startsWith(`${key}=`)) found = unquote(normalized.slice(key.length + 1));
    if (normalized.startsWith(`${key}:`)) found = unquote(normalized.slice(key.length + 1));
  }
  return found;
}

function localSecretCandidates() {
  const texts = [readText(path.join(repoRoot, '.env')), readText(path.join(repoRoot, 'ADMIN_REFERENCE.md'))];
  const values = [];
  for (const key of secretKeys) {
    if (process.env[key]) values.push({ key, value: unquote(process.env[key]) });
    for (const text of texts) {
      const value = envFromText(text, key);
      if (value) values.push({ key, value });
    }
  }
  const seen = new Set();
  return values.filter(item => item.value && !seen.has(item.value) && seen.add(item.value));
}

function gateHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'x-skygate-session': token
  };
}

async function resolveOwnerGate() {
  for (const candidate of localSecretCandidates()) {
    const response = await fetch(`${baseUrl}/api/owner/admin-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: candidate.value })
    }).catch(() => null);
    if (!response) continue;
    const data = await response.json().catch(() => ({}));
    const token = String(data.gateToken || data.gateBearerToken || data.token || '').replace(/^Bearer\s+/i, '').trim();
    if (response.ok && token) return { token, sourceKey: candidate.key };
  }
  throw new Error('No local owner/admin candidate unlocked the shared 0S gate.');
}

function loadArtist(key) {
  const artist = ARTISTS[key];
  const profile = readJson(path.join(storefrontRoot, artist.slug, 'profile.json'));
  const personality = readJson(path.join(storefrontRoot, artist.slug, 'personality-profile.json'));
  return {
    key,
    slug: artist.slug,
    artistId: profile.artistId || personality.artistId || '',
    stageName: profile.stageName || profile.name || personality.stageName || personality.name || key,
    genres: personality.genres || profile.genres || [],
    archetype: personality.archetype || '',
    homeBase: personality.homeBase || '',
    voice: personality.voice || personality.vocalIdentity || '',
    coreWound: personality.coreWound || personality.core_wound || '',
    promptSeed: personality.musicPrompt || personality.prompt || ''
  };
}

function slugify(value = '') {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'skye-drop';
}

function splitEven(artists) {
  const base = Math.floor(10000 / artists.length);
  let remainder = 10000 - (base * artists.length);
  return artists.map(artist => ({
    artistId: artist.artistId,
    name: artist.stageName,
    shareBps: base + (remainder-- > 0 ? 1 : 0),
    role: 'collaborator'
  }));
}

function collaboratorRows(artists) {
  return artists.map(artist => ({
    artistId: artist.artistId,
    name: artist.stageName,
    slug: artist.slug,
    role: 'featured artist'
  }));
}

function songPrompt(title, artists, brief) {
  const roster = artists.map(artist => `${artist.stageName} (${(artist.genres || []).join(' / ') || 'genre-fluid'}, ${artist.archetype || 'artist'}, ${artist.homeBase || '0S'})`).join('; ');
  return [
    `Create a complete original 2 to 3 minute vocal song called "${title}".`,
    `Artists: ${roster}.`,
    brief,
    'Make it sound like a finished commercial song with intro, verse, pre-hook, hook, second verse or bridge, final hook, and outro.',
    'Use original lyrics and melody. Do not imitate or reference any real artist. Keep the vocal performance emotionally believable and release-ready for a $4.44 digital storefront drop.',
    'The mix should feel like Skye Radio: polished, alive, and ready to be packaged as an installable PWA drop.'
  ].join('\n');
}

const SONGS = [
  {
    id: 'dre-closed-door-voltage',
    title: 'Closed Door Voltage',
    artistKeys: ['dre'],
    brief: 'Dre Meridian turns rejection, closed doors, and Mesa night pressure into industrial hip-hop with a dark-pop hook and a resilient vocal lead.'
  },
  {
    id: 'sol-screenlight-survival',
    title: 'Screenlight Survival',
    artistKeys: ['sol'],
    brief: 'Sol Amari turns isolation and screen-lit nights into an emo rap, bedroom punk, and hyperpop ballad that feels young, wounded, and determined.'
  },
  {
    id: 'vox-pixel-heartline',
    title: 'Pixel Heartline',
    artistKeys: ['vox'],
    brief: 'Vox Selene sings from the edge of a digital room, turning nervous honesty into a glossy emo rap and hyperpop storefront single.'
  },
  {
    id: 'veda-orion-ajay-three-suns-after-midnight',
    title: 'Three Suns After Midnight',
    artistKeys: ['veda', 'orion', 'ajay'],
    brief: 'Veda Wraith carries the solar hook, Orion Vale answers with desert-noir tension, and DJ Ajay drives the industrial night pulse.'
  },
  {
    id: 'vox-radio-signal-hearts',
    title: 'Signal Hearts',
    artistKeys: ['vox', 'radio'],
    brief: 'Vox Selene and Radio Vibez make a two-voice digital-heart duet about trying to be heard without disappearing into the feed.'
  },
  {
    id: 'jessa-stoves-soft-ghosts',
    title: 'Soft Ghosts',
    artistKeys: ['jessa', 'stoves'],
    brief: 'Jessa Walsh brings dream-pop lift while Tha Stoves grounds the record with folk-rap truth, turning invisibility and family translation into a warm final hook.'
  }
];

function stringBytes(value) {
  return new TextEncoder().encode(String(value));
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

function crc32(bytes) {
  let crc = -1;
  for (let index = 0; index < bytes.length; index += 1) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[index]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function writeU16(out, value) {
  out.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeU32(out, value) {
  out.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function createZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const nameBytes = stringBytes(file.name.replace(/^\/+/, ''));
    const data = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
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
  return Buffer.concat([...chunks, ...central, new Uint8Array(eocd)].map(part => Buffer.from(part)));
}

function dropHtml({ title, artists, audioName, receiptName }) {
  const names = artists.map(artist => artist.stageName).join(' x ');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - Gray Gang Drop</title>
  <meta name="theme-color" content="#ffd86b">
  <link rel="manifest" href="manifest.json">
  <style>
    :root{color-scheme:dark;--gold:#ffd86b;--cyan:#43e7ff;--ink:#fff8e7;--muted:#b8b2a7;--line:rgba(255,255,255,.16)}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:linear-gradient(135deg,#050506,#131018 55%,#050506);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    body:before{content:"";position:fixed;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px);background-size:44px 44px;pointer-events:none}
    main{position:relative;width:min(980px,calc(100% - 28px));margin:0 auto;padding:22px 0 58px}header{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--line);padding:12px 0}
    a{color:inherit}.brand{font-weight:950;text-decoration:none}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:38px;border:1px solid var(--line);border-radius:8px;padding:9px 12px;background:rgba(255,255,255,.06);text-decoration:none;font-weight:900}.btn.primary{color:#050506;background:linear-gradient(90deg,#fff,var(--gold),var(--cyan))}
    .hero{padding:clamp(42px,8vw,92px) 0 24px}.micro{margin:0 0 10px;color:var(--gold);font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.18em}h1{margin:0;font-size:clamp(52px,11vw,122px);line-height:.82}.lede{color:var(--muted);font-size:clamp(17px,2vw,22px);line-height:1.45}
    .player,.receipt{border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.42);padding:16px;margin-top:14px}audio{width:100%;min-height:46px}code{color:var(--cyan);overflow-wrap:anywhere}
  </style>
</head>
<body>
  <main>
    <header><a class="brand" href="./">Gray Gang Drop</a><a class="btn primary" href="./${audioName}" download>Download MP3</a></header>
    <section class="hero"><p class="micro">Skye Radio / packaged PWA</p><h1>${title}</h1><p class="lede">${names}. A gated SkyeMusicNexus storefront drop packaged by Founder Command PWA Factory.</p></section>
    <section class="player"><p class="micro">now playing</p><audio controls preload="metadata" src="./${audioName}"></audio></section>
    <section class="receipt"><p class="micro">drop receipt</p><p><code>${receiptName}</code></p></section>
  </main>
  <script>if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}</script>
</body>
</html>`;
}

function serviceWorkerSource(files) {
  return `const CACHE='gray-gang-pwa-drop-v1';\nconst ASSETS=${JSON.stringify(files)};\nself.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));\nself.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));\nself.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request))));\n`;
}

async function streamAsset(token, assetId) {
  const response = await fetch(`${baseUrl}/api/skymusicnexus/music-assets?action=stream&id=${encodeURIComponent(assetId)}`, {
    headers: gateHeaders(token)
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { ok: response.ok, status: response.status, contentType: response.headers.get('content-type') || '', bytes };
}

async function createProductForArtist(token, artist, result) {
  const response = await fetch(`${baseUrl}/api/skymusicnexus/music-store`, {
    method: 'POST',
    headers: { ...gateHeaders(token), 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'create-product',
      artistId: artist.artistId,
      artistName: artist.stageName,
      collectiveId: 'gray-skyes-collective',
      title: result.title,
      description: `${result.title} collaborative Gray Gang digital download, packaged as a PWA drop and tracked through SkyeMusicNexus.`,
      productType: 'digital',
      fulfillmentType: 'digital-link',
      status: 'active',
      priceCents,
      assetId: result.assetId,
      providerJobId: result.jobId,
      collaborators: result.collaborators,
      splitSheet: result.splitSheet
    })
  });
  const payload = await response.json().catch(() => ({}));
  return { artistId: artist.artistId, slug: artist.slug, status: response.status, ok: response.ok && payload.ok !== false, productId: payload.product?.productId || payload.product?.id || '' };
}

function writeDropPackage(song, artists, audioBytes, job) {
  const audioName = `audio/${slugify(song.title)}.mp3`;
  const receiptName = 'drop-receipt.json';
  const receipt = {
    schema: 'founder-command.pwa-drop-factory.bundle.v1',
    createdAt: new Date().toISOString(),
    title: song.title,
    artists: artists.map(artist => ({ artistId: artist.artistId, slug: artist.slug, stageName: artist.stageName })),
    providerJobId: job.id || job.providerJobId || '',
    assetId: job.assetId || '',
    productId: job.productId || '',
    gateOwned: true,
    browserProviderKeys: false,
    source: 'tools/founder-command/run-gray-gang-requested-songs.mjs'
  };
  const manifest = {
    name: `${song.title} - Gray Gang Drop`,
    short_name: slugify(song.title).replace(/-/g, '').slice(0, 12) || 'GrayDrop',
    description: `${song.title} installable Skye Radio music drop.`,
    theme_color: '#ffd86b',
    background_color: '#050506',
    display: 'standalone',
    start_url: './index.html',
    scope: './'
  };
  const zip = createZip([
    { name: 'index.html', bytes: stringBytes(dropHtml({ title: song.title, artists, audioName, receiptName })) },
    { name: 'manifest.json', bytes: stringBytes(JSON.stringify(manifest, null, 2)) },
    { name: 'sw.js', bytes: stringBytes(serviceWorkerSource(['./index.html', './manifest.json', './sw.js', `./${audioName}`, `./${receiptName}`])) },
    { name: receiptName, bytes: stringBytes(JSON.stringify(receipt, null, 2)) },
    { name: audioName, bytes: audioBytes }
  ]);
  const zipName = `${slugify(song.title)}-pwa-drop.zip`;
  const written = [];
  for (const artist of artists) {
    const dropsDir = path.join(storefrontRoot, artist.slug, 'drops');
    fs.mkdirSync(dropsDir, { recursive: true });
    const dest = path.join(dropsDir, zipName);
    fs.writeFileSync(dest, zip);
    written.push(path.relative(repoRoot, dest));
  }
  return { zipName, bytes: zip.length, written };
}

async function generateSong(token, song) {
  const artists = song.artistKeys.map(loadArtist);
  const primary = artists[0];
  const collaborators = collaboratorRows(artists);
  const splitSheet = artists.length > 1 ? splitEven(artists) : [{ artistId: primary.artistId, name: primary.stageName, shareBps: 10000, role: 'primary artist' }];
  const body = {
    action: 'generate-ai-song',
    provider: 'elevenlabs',
    artistId: primary.artistId,
    artistName: primary.stageName,
    collectiveId: 'gray-skyes-collective',
    title: song.title,
    prompt: songPrompt(song.title, artists, song.brief),
    lyrics: `Full vocal arrangement for ${artists.map(artist => artist.stageName).join(' x ')}. Use clear hooks, original words, and distinct emotional lanes for each named artist.`,
    durationSeconds,
    makeStoreProduct: true,
    makeFeedPost: true,
    priceCents,
    productDescription: `${song.title} digital song drop, sold through SkyeMusicNexus and packaged as an installable PWA.`,
    caption: `${song.title} is live in Gray Gang with SkyePay-tracked store and PWA drop packaging.`,
    collaborators,
    splitSheet
  };
  const startedAt = new Date().toISOString();
  const response = await fetch(`${baseUrl}/api/skymusicnexus/music-provider-hooks`, {
    method: 'POST',
    headers: { ...gateHeaders(token), 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  const job = payload.job || {};
  const result = {
    id: song.id,
    title: song.title,
    primaryArtistId: primary.artistId,
    primarySlug: primary.slug,
    artists: artists.map(artist => ({ artistId: artist.artistId, slug: artist.slug, stageName: artist.stageName })),
    collaborators,
    splitSheet,
    startedAt,
    finishedAt: new Date().toISOString(),
    status: response.status,
    ok: response.ok && payload.ok === true && job.status === 'generated' && Boolean(job.assetId),
    providerStatusCode: job.providerStatusCode || 0,
    jobId: job.id || '',
    assetId: job.assetId || '',
    productId: job.productId || '',
    bytes: job.bytes || 0,
    error: payload.error || job.error || '',
    collaboratorProducts: [],
    package: null
  };
  if (result.ok) {
    const stream = await streamAsset(token, result.assetId);
    result.stream = { ok: stream.ok, status: stream.status, contentType: stream.contentType, bytes: stream.bytes.length };
    if (stream.ok && /^audio\//i.test(stream.contentType) && stream.bytes.length > 100000) {
      result.package = writeDropPackage(song, artists, stream.bytes, job);
    } else {
      result.ok = false;
      result.error = `asset_stream_not_audio_or_too_small:${stream.status}:${stream.contentType}:${stream.bytes.length}`;
    }
    if (artists.length > 1) {
      for (const artist of artists.slice(1)) result.collaboratorProducts.push(await createProductForArtist(token, artist, result));
    }
  }
  return result;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const receipt = {
    schema: 'skyemusicnexus.gray-gang-requested-songs.v1',
    mode: execute ? 'execute' : 'dry-run',
    baseUrl,
    durationSeconds,
    requestedAt: new Date().toISOString(),
    songs: SONGS.map(song => ({ id: song.id, title: song.title, artists: song.artistKeys.map(key => loadArtist(key).stageName), artistKeys: song.artistKeys })),
    results: []
  };
  if (!execute) {
    receipt.ok = true;
  } else {
    const owner = await resolveOwnerGate();
    receipt.auth = { ok: true, sourceKey: owner.sourceKey };
    for (const song of SONGS) {
      const result = await generateSong(owner.token, song);
      receipt.results.push(result);
      fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(receipt, null, 2) + '\n');
      console.log(JSON.stringify({ title: result.title, ok: result.ok, assetId: result.assetId, package: result.package?.zipName || '', error: result.error || '' }));
      if (!result.ok) break;
    }
    receipt.ok = receipt.results.length === SONGS.length && receipt.results.every(result => result.ok);
  }
  receipt.finishedAt = new Date().toISOString();
  const out = path.join(outDir, `${receipt.mode}-${Date.now()}.json`);
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ ok: receipt.ok, mode: receipt.mode, receipt: out, songs: receipt.results.length || SONGS.length }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
