#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site', 'SkyeMusicNexus');
const releaseDir = path.join(
  nexusRoot,
  'artist-storefronts',
  'gray-skyes-collective',
  'releases',
  'everything-movie',
);
const grayStoreDir = path.join(nexusRoot, 'artist-storefronts', 'gray-skyes');
const binRoot = path.join(nexusRoot, 'song-creation-bin', 'everything-movie');
const playlistsPath = path.join(nexusRoot, 'public', 'data', 'playlists.json');
const receiptPath = path.join(
  repoRoot,
  'test-artifacts',
  'reflection-and-collective-drops',
  'skyemusicnexus-everything-movie-release-proof-latest.json',
);

const expectedTracks = [
  {
    slug: 'everything-movie-act-i-birth-of-static',
    title: 'Everything Movie Act I: Birth of Static',
    artists: ['Gray Skyes', 'Jessa Walsh', 'Music 4u', 'Tha Stoves'],
  },
  {
    slug: 'everything-movie-act-ii-gate-argument',
    title: 'Everything Movie Act II: Gate Argument',
    artists: ['Gray Skyes', 'Gray Skyes Brain', 'Wyl Parker', 'Kairo Vale'],
  },
  {
    slug: 'everything-movie-act-iii-betrayal-parade',
    title: 'Everything Movie Act III: Betrayal Parade',
    artists: ['Gray Skyes', 'Vox Selene', 'Veda Wraith', 'Orion Vale', 'Kaiya Drift', 'Lena Flux'],
  },
  {
    slug: 'everything-movie-act-iv-founder-walkout',
    title: 'Everything Movie Act IV: Founder Walkout',
    artists: ['Gray Skyes', 'Gray Skyes Brain', 'Wyl Parker', 'Dre Meridian', 'Sol Amari', 'Radio Vibez', 'DJ Ajay', 'Music 4u'],
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function fileSize(filePath) {
  return fs.statSync(filePath).size;
}

function localPathFromHref(baseDir, href) {
  if (!href) return null;
  let normalized = String(href);
  if (/^https?:\/\//i.test(normalized)) {
    const url = new URL(normalized);
    if (url.origin !== 'https://skye-music-nexus.pages.dev') return null;
    normalized = url.pathname;
  }
  normalized = normalized.replace(/^\/SkyeMusicNexus\//, '');
  if (normalized.startsWith('/')) normalized = normalized.slice(1);
  if (normalized.startsWith('../') || normalized.startsWith('./')) {
    return path.resolve(baseDir, normalized);
  }
  return path.join(nexusRoot, normalized);
}

const releaseJsonPath = path.join(releaseDir, 'release.json');
const releaseHtmlPath = path.join(releaseDir, 'index.html');
const release = readJson(releaseJsonPath);
const releaseHtml = readText(releaseHtmlPath);
const productsPayload = readJson(path.join(grayStoreDir, 'products', 'products.json'));
const products = Array.isArray(productsPayload) ? productsPayload : productsPayload.products || [];
const playlists = readJson(playlistsPath);

assert(release.title === 'Everything Movie', 'release title mismatch');
assert(release.languagePolicy === 'English only', 'release must be English only');
assert(release.trackCount === 4, 'release must have four acts');
assert(release.totalMinutes >= 12, 'release should be at least twelve minutes');
assert(release.artistCount >= 16, 'release should credit the full collective support cast');
assert(release.tracks.length === expectedTracks.length, 'release track list mismatch');

for (const snippet of [
  'Everything Movie',
  'English-only',
  'release-audio',
  "addEventListener('ended'",
  'scrollIntoView',
  '.play()',
  'Gray Skyes Brain',
  'Wyl Parker',
  'Music 4u',
]) {
  assert(releaseHtml.includes(snippet), `release page missing ${snippet}`);
}

const verifiedTracks = [];
for (const expected of expectedTracks) {
  const track = release.tracks.find((item) => item.title === expected.title);
  assert(track, `release missing track ${expected.title}`);
  for (const artist of expected.artists) {
    assert(track.artistNames.includes(artist), `${expected.title} missing artist ${artist}`);
  }

  const audioPath = localPathFromHref(releaseDir, track.audio);
  assert(audioPath && fs.existsSync(audioPath), `release audio missing for ${expected.title}`);
  assert(fileSize(audioPath) > 1_000_000, `release audio too small for ${expected.title}`);

  const dropDir = path.join(grayStoreDir, 'drops', expected.slug);
  const dropHtml = readText(path.join(dropDir, 'index.html'));
  const dropSw = readText(path.join(dropDir, 'sw.js'));
  const dropManifest = readJson(path.join(dropDir, 'manifest.webmanifest'));
  assert(dropHtml.includes(expected.title), `drop page missing title for ${expected.title}`);
  assert(dropHtml.includes('./cover.svg'), `drop page missing cover art for ${expected.title}`);
  assert(fs.existsSync(path.join(dropDir, 'cover.svg')), `cover.svg missing for ${expected.title}`);
  assert(dropSw.includes('./cover.svg'), `service worker missing cover cache for ${expected.title}`);
  assert(dropManifest.name.includes(expected.title), `manifest title mismatch for ${expected.title}`);
  assert(dropHtml.includes('/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/everything-movie/'), `drop page missing full-release link for ${expected.title}`);

  const picsPackage = readJson(path.join(dropDir, 'pics2vid', 'package.json'));
  const picsHtml = readText(path.join(dropDir, 'pics2vid', 'index.html'));
  const sourceArtistNames = (picsPackage.sourceImages || []).map((image) => image.artistName);
  assert(picsPackage.status === 'ready_for_still2vid_export', `Pics2Vid package not ready for ${expected.title}`);
  assert(picsPackage.sourceImages.length >= expected.artists.length, `Pics2Vid package lacks source images for ${expected.title}`);
  assert(picsHtml.includes('Still2Vid') || picsHtml.includes('Pics2Vid'), `Pics2Vid page missing app handoff text for ${expected.title}`);
  for (const artist of expected.artists) {
    assert(sourceArtistNames.includes(artist), `Pics2Vid package missing ${artist} image for ${expected.title}`);
  }

  const binDir = path.join(binRoot, expected.slug);
  const creationReceipt = readJson(path.join(binDir, 'creation-receipt.json'));
  const prompt = readText(path.join(binDir, 'prompt.txt'));
  assert(creationReceipt.title === expected.title, `creation receipt title mismatch for ${expected.title}`);
  assert(
    creationReceipt.languagePolicy?.required === 'English only',
    `creation receipt language mismatch for ${expected.title}`,
  );
  assert(prompt.includes('English only'), `prompt missing English-only policy for ${expected.title}`);
  assert(fs.existsSync(path.join(binDir, 'superide-asset-job.json')), `SuperIDE asset job missing for ${expected.title}`);
  assert(fs.existsSync(path.join(binDir, 'superide-submission-receipt.json')), `SuperIDE receipt missing for ${expected.title}`);

  const product = products.find((item) => item.title === `${expected.title} (Everything Movie)`);
  assert(product, `Gray product room missing ${expected.title}`);
  assert(product.status === 'active', `Gray product not active for ${expected.title}`);
  assert(product.audioFile && fs.existsSync(path.join(grayStoreDir, product.audioFile)), `Gray product audio missing for ${expected.title}`);
  assert(product.pwaUrl?.includes(`/drops/${expected.slug}/`), `Gray product drop URL mismatch for ${expected.title}`);
  assert(product.visualPackage?.status === 'ready_for_still2vid_export', `Gray product visual package not ready for ${expected.title}`);

  const playlistTrack = playlists.tracks.find((item) => item.title === `${expected.title} (Everything Movie)`);
  assert(playlistTrack, `playlist catalog missing ${expected.title}`);
  const playlistAudio = localPathFromHref(path.join(nexusRoot, 'public'), playlistTrack.audioUrl);
  const playlistDrop = localPathFromHref(path.join(nexusRoot, 'public'), playlistTrack.dropUrl);
  assert(playlistAudio && fs.existsSync(playlistAudio), `playlist audio target missing for ${expected.title}`);
  assert(playlistDrop && fs.existsSync(path.join(playlistDrop, 'index.html')), `playlist drop target missing for ${expected.title}`);

  verifiedTracks.push({
    title: expected.title,
    artists: expected.artists.length,
    audioBytes: fileSize(audioPath),
    sourceImages: picsPackage.sourceImages.length,
    productId: product.productId,
  });
}

const collectiveHtml = readText(path.join(nexusRoot, 'artist-storefronts', 'gray-skyes-collective', 'index.html'));
assert(collectiveHtml.includes('./releases/everything-movie/'), 'collective page missing Everything Movie release link');
assert(playlists.tracks.filter((track) => /Everything Movie/i.test(track.title)).length === 4, 'playlist catalog should include four Everything Movie tracks');

const proof = {
  ok: true,
  checkedAt: new Date().toISOString(),
  releasePath: path.relative(repoRoot, releaseHtmlPath),
  releaseUrl: '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/everything-movie/',
  totals: {
    tracks: verifiedTracks.length,
    totalMinutes: release.totalMinutes,
    artistCount: release.artistCount,
    playlistTracks: playlists.tracks.filter((track) => /Everything Movie/i.test(track.title)).length,
  },
  verifiedTracks,
};

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
