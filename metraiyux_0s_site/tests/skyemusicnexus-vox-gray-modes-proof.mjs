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
  'vox-gray-modes',
);
const storefrontRoot = path.join(nexusRoot, 'artist-storefronts');
const binRoot = path.join(nexusRoot, 'song-creation-bin', 'vox-gray-modes');
const playlistsPath = path.join(nexusRoot, 'public', 'data', 'playlists.json');
const receiptPath = path.join(
  repoRoot,
  'test-artifacts',
  'reflection-and-collective-drops',
  'skyemusicnexus-vox-gray-modes-proof-latest.json',
);

const expectedTracks = [
  {
    slug: 'soft-ghost-protocol',
    title: 'Soft Ghost Protocol',
    primarySlug: 'artist-live-browser-20260523062845',
    artists: ['Vox Selene'],
    promptMustInclude: ['Vox solo lane', 'English only'],
  },
  {
    slug: 'mirror-chat',
    title: 'Mirror Chat',
    primarySlug: 'artist-live-browser-20260523062845',
    artists: ['Vox Selene', 'Gray Skyes', 'Gray Skyes Brain'],
    promptMustInclude: ['Gray Brain command-room synth rap', 'English only'],
  },
  {
    slug: 'redline-heart',
    title: 'Redline Heart',
    primarySlug: 'gray-skyes',
    artists: ['Gray Skyes', 'Vox Selene'],
    promptMustInclude: ['Gray established mode', 'trap metal', 'English only'],
  },
  {
    slug: 'midnight-r-and-b-mode',
    title: 'Midnight R&B Mode',
    primarySlug: 'gray-skyes',
    artists: ['Gray Skyes', 'Vox Selene'],
    promptMustInclude: ['Gray Hip-Hop R&B Mode duet', 'Vox must be a co-lead', 'Meet me in the middle', 'English vocal song'],
  },
  {
    slug: 'slow-rain-reply',
    title: 'Slow Rain Reply',
    primarySlug: 'gray-skyes',
    artists: ['Gray Skyes', 'Vox Selene'],
    promptMustInclude: ['Gray versatile singing duet', 'Gray sings the first hook', 'Slow rain reply', 'English vocal song'],
  },
  {
    slug: 'stay-through-static',
    title: 'Stay Through Static',
    primarySlug: 'gray-skyes',
    artists: ['Gray Skyes', 'Vox Selene'],
    promptMustInclude: ['male sung pre-hook', 'Gray sings the pre-hooks', 'Stay through static', 'English vocal song'],
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
  let withoutNexus = String(href);
  if (/^https?:\/\//i.test(withoutNexus)) {
    const url = new URL(withoutNexus);
    if (url.origin !== 'https://skye-music-nexus.pages.dev') return null;
    withoutNexus = url.pathname;
  }
  withoutNexus = withoutNexus.replace(/^\/SkyeMusicNexus\//, '');
  if (withoutNexus.startsWith('/')) withoutNexus = withoutNexus.slice(1);
  if (withoutNexus.startsWith('../') || withoutNexus.startsWith('./')) {
    return path.resolve(baseDir, withoutNexus);
  }
  return path.join(nexusRoot, withoutNexus);
}

function visibleText(html) {
  return String(html).replace(/&amp;/g, '&');
}

function productsFor(slug) {
  const payload = readJson(path.join(storefrontRoot, slug, 'products', 'products.json'));
  return Array.isArray(payload) ? payload : payload.products || [];
}

const release = readJson(path.join(releaseDir, 'release.json'));
const releaseHtml = readText(path.join(releaseDir, 'index.html'));
const playlists = readJson(playlistsPath);
const grayProfile = readJson(path.join(storefrontRoot, 'gray-skyes', 'profile.json'));
const grayPersonality = readJson(path.join(storefrontRoot, 'gray-skyes', 'personality-profile.json'));

assert(release.title === 'Vox Gray Modes', 'release title mismatch');
assert(release.languagePolicy === 'English only', 'release must be English only');
assert(release.trackCount === expectedTracks.length, 'release must have four Vox/Gray tracks');
assert(release.artistCount === 3, 'release must credit Vox, Gray, and Gray Brain');
assert(release.modeCount >= 3, 'release must expose at least three mode lanes');
assert(releaseHtml.includes('https://skye-music-nexus.pages.dev/artist-storefronts/gray-skyes-collective/releases/vox-gray-modes/audio/'), 'release player must use public Pages audio URLs');
assert(!releaseHtml.includes('src="./audio/'), 'release player must not point at blocked Worker raw audio');

for (const snippet of [
  'Vox Gray Modes',
  'Vox Selene',
  'Gray Skyes',
  'Gray Skyes Brain',
  'release-audio',
  "addEventListener('ended'",
  'scrollIntoView',
  '.play()',
  'Gray Hip-Hop R&amp;B Mode',
]) {
  assert(releaseHtml.includes(snippet), `release page missing ${snippet}`);
}

assert(
  (grayProfile.musicModes || []).some((mode) => mode.id === 'hip-hop-rnb' && /R&B/i.test(mode.name)),
  'Gray profile missing hip-hop/R&B music mode',
);
assert(
  (grayPersonality.music?.modes || []).some((mode) => mode.id === 'hip-hop-rnb'),
  'Gray personality profile missing hip-hop/R&B mode',
);

const verifiedTracks = [];
for (const expected of expectedTracks) {
  const track = release.tracks.find((item) => item.title === expected.title);
  assert(track, `release missing ${expected.title}`);
  for (const artist of expected.artists) {
    assert(track.artistNames.includes(artist), `${expected.title} missing artist ${artist}`);
  }

  const audioPath = localPathFromHref(releaseDir, track.audio);
  assert(audioPath && fs.existsSync(audioPath), `release audio missing for ${expected.title}`);
  assert(fileSize(audioPath) > 1_000_000, `release audio too small for ${expected.title}`);

  const dropDir = path.join(storefrontRoot, expected.primarySlug, 'drops', expected.slug);
  const dropHtml = readText(path.join(dropDir, 'index.html'));
  const dropVisibleText = visibleText(dropHtml);
  const dropManifest = readJson(path.join(dropDir, 'manifest.webmanifest'));
  const dropSw = readText(path.join(dropDir, 'sw.js'));
  assert(dropVisibleText.includes(expected.title), `drop missing title for ${expected.title}`);
  if (expected.slug === 'midnight-r-and-b-mode') {
    assert(dropVisibleText.includes('real duet'), 'R&B drop must be labeled as a real duet');
    assert(dropVisibleText.includes('Vox must be a co-lead'), 'R&B drop must make Vox a co-lead');
  }
  if (['slow-rain-reply', 'stay-through-static'].includes(expected.slug)) {
    assert(dropVisibleText.includes('duet'), `${expected.title} drop must be labeled as a duet`);
    assert(dropVisibleText.includes('Gray'), `${expected.title} drop must keep Gray visible`);
    assert(dropVisibleText.includes('Vox'), `${expected.title} drop must keep Vox visible`);
  }
  assert(dropHtml.includes('https://skye-music-nexus.pages.dev/artist-storefronts/'), `drop player must use public Pages audio URL for ${expected.title}`);
  assert(!dropHtml.includes('src="./audio/'), `drop player must not point at blocked Worker raw audio for ${expected.title}`);
  assert(dropHtml.includes('/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/vox-gray-modes/'), `drop missing full-release link for ${expected.title}`);
  assert(dropHtml.includes('Open Project'), `drop missing project action for ${expected.title}`);
  assert(dropManifest.name.includes(expected.title), `manifest mismatch for ${expected.title}`);
  assert(fs.existsSync(path.join(dropDir, 'cover.svg')), `cover.svg missing for ${expected.title}`);
  assert(dropSw.includes('./cover.svg'), `service worker missing cover for ${expected.title}`);

  const picsPackage = readJson(path.join(dropDir, 'pics2vid', 'package.json'));
  const picsHtml = readText(path.join(dropDir, 'pics2vid', 'index.html'));
  const sourceArtistNames = (picsPackage.sourceImages || []).map((image) => image.artistName);
  assert(picsPackage.status === 'ready_for_still2vid_export', `Pics2Vid not ready for ${expected.title}`);
  assert(picsHtml.includes('Still2Vid') || picsHtml.includes('Pics2Vid'), `Pics2Vid page missing app handoff for ${expected.title}`);
  for (const artist of expected.artists) {
    assert(sourceArtistNames.includes(artist), `Pics2Vid missing ${artist} source image for ${expected.title}`);
  }

  const binDir = path.join(binRoot, expected.slug);
  const creationReceipt = readJson(path.join(binDir, 'creation-receipt.json'));
  const prompt = readText(path.join(binDir, 'prompt.txt'));
  assert(creationReceipt.title === expected.title, `creation receipt title mismatch for ${expected.title}`);
  assert(creationReceipt.project === 'Vox Gray Modes', `creation receipt project mismatch for ${expected.title}`);
  assert(creationReceipt.languagePolicy?.required === 'English only', `language policy mismatch for ${expected.title}`);
  for (const phrase of expected.promptMustInclude) {
    assert(prompt.includes(phrase), `prompt for ${expected.title} missing ${phrase}`);
  }
  assert(fs.existsSync(path.join(binDir, 'superide-asset-job.json')), `SuperIDE asset job missing for ${expected.title}`);
  assert(fs.existsSync(path.join(binDir, 'superide-submission-receipt.json')), `SuperIDE receipt missing for ${expected.title}`);

  for (const slug of track.artistSlugs) {
    const product = productsFor(slug).find((item) => item.title === `${expected.title} (Vox Gray Modes)`);
    assert(product, `${slug} products missing ${expected.title}`);
    assert(product.status === 'active', `${slug} product not active for ${expected.title}`);
    assert(product.pwaUrl?.includes(`/drops/${expected.slug}/`), `${slug} product URL mismatch for ${expected.title}`);
    assert(product.visualPackage?.status === 'ready_for_still2vid_export', `${slug} visual package not ready for ${expected.title}`);
  }

  const playlistTrack = playlists.tracks.find((item) => item.title === `${expected.title} (Vox Gray Modes)`);
  assert(playlistTrack, `playlist catalog missing ${expected.title}`);
  const playlistAudio = localPathFromHref(path.join(nexusRoot, 'public'), playlistTrack.audioUrl);
  const playlistDrop = localPathFromHref(path.join(nexusRoot, 'public'), playlistTrack.dropUrl);
  assert(playlistAudio && fs.existsSync(playlistAudio), `playlist audio target missing for ${expected.title}`);
  assert(playlistDrop && fs.existsSync(path.join(playlistDrop, 'index.html')), `playlist drop target missing for ${expected.title}`);

  verifiedTracks.push({
    title: expected.title,
    artists: expected.artists.length,
    audioBytes: fileSize(audioPath),
    primarySlug: expected.primarySlug,
    productId: track.productId,
  });
}

const collectiveHtml = readText(path.join(storefrontRoot, 'gray-skyes-collective', 'index.html'));
assert(collectiveHtml.includes('./releases/vox-gray-modes/'), 'collective page missing Vox Gray Modes link');
assert(
  playlists.tracks.filter((track) => /Vox Gray Modes/i.test(track.title)).length === expectedTracks.length,
  'playlist catalog should include four Vox Gray Modes tracks',
);

const proof = {
  ok: true,
  checkedAt: new Date().toISOString(),
  releasePath: path.relative(repoRoot, path.join(releaseDir, 'index.html')),
  releaseUrl: '/SkyeMusicNexus/artist-storefronts/gray-skyes-collective/releases/vox-gray-modes/',
  totals: {
    tracks: verifiedTracks.length,
    artistCount: release.artistCount,
    modeCount: release.modeCount,
    playlistTracks: playlists.tracks.filter((track) => /Vox Gray Modes/i.test(track.title)).length,
  },
  verifiedTracks,
};

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
