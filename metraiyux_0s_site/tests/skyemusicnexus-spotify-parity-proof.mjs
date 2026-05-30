#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site', 'SkyeMusicNexus');
const dataPath = path.join(nexusRoot, 'public', 'data', 'playlists.json');
const discoverPath = path.join(nexusRoot, 'public', 'discover.html');
const radioPath = path.join(nexusRoot, 'public', 'radio.html');
const playerJsPath = path.join(nexusRoot, 'public', 'nexus-player.js');
const playerCssPath = path.join(nexusRoot, 'public', 'nexus-player.css');
const playerHtmlPath = path.join(nexusRoot, 'public', 'player.html');
const neoPlayerJsPath = path.join(nexusRoot, 'public', 'neo-nexus.js');
const streamAnalyticsPath = path.join(nexusRoot, 'public', 'stream-analytics.html');
const workerPath = path.join(repoRoot, 'metraiyux_0s_site', 'cloudflare', 'worker.js');
const receiptPath = path.join(
  repoRoot,
  'test-artifacts',
  'reflection-and-collective-drops',
  'skyemusicnexus-spotify-parity-proof-latest.json',
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function localPathFromHref(href) {
  if (!href || /^https?:\/\//i.test(href)) return null;
  const clean = String(href).replace(/^\.\.\//, '').replace(/^\/SkyeMusicNexus\//, '');
  return path.join(nexusRoot, clean);
}

const catalog = readJson(dataPath);
const discoverHtml = readText(discoverPath);
const radioHtml = readText(radioPath);
const playerJs = readText(playerJsPath);
const playerCss = readText(playerCssPath);
const playerHtml = readText(playerHtmlPath);
const neoPlayerJs = readText(neoPlayerJsPath);
const streamHtml = readText(streamAnalyticsPath);
const workerJs = readText(workerPath);

assert(catalog.schema === 'skyemusicnexus.playlists.v1', 'playlist schema mismatch');
assert(catalog.totals.tracks >= 40, 'catalog should expose the current song library');
assert(catalog.totals.genres >= 3, 'catalog should expose real genre charts');
assert(catalog.streamTelemetry?.eventAction === 'track-public-event', 'catalog missing stream telemetry contract');

for (const track of catalog.tracks) {
  assert(track.trackId, 'track missing id');
  assert(track.productId, `${track.title} missing productId`);
  assert(track.artistImage && !/og-card/i.test(track.artistImage), `${track.title} missing real artist image`);
  assert(track.coverImage && !/og-card/i.test(track.coverImage), `${track.title} missing real cover image`);
  assert(/^https:\/\/skye-music-nexus\.pages\.dev\//.test(track.audioUrl), `${track.title} audioUrl must use public Pages playback origin`);
  const artistImagePath = localPathFromHref(track.artistImage);
  const coverImagePath = localPathFromHref(track.coverImage);
  if (artistImagePath) assert(fs.existsSync(artistImagePath), `${track.title} artist image file missing`);
  if (coverImagePath) assert(fs.existsSync(coverImagePath), `${track.title} cover image file missing`);
}

for (const snippet of [
  './nexus-player.css',
  './nexus-player.js',
  'data-nexus-track-id',
  'coverImage || track.artistImage',
  'Nexus streams',
  './radio.html',
  './stream-analytics.html',
  './achievements.html',
  'Live Nexus Trending',
  'rebuildLiveCharts',
  'trackRankScore',
]) {
  assert(discoverHtml.includes(snippet), `discover missing ${snippet}`);
}

for (const snippet of [
  'BroadcastChannel',
  'skymusicnexus.streamLedger.v1',
  'skymusicnexus.playerLibrary.v1',
  'skymusicnexus.listenerId.v1',
  'skymusicnexus.sessionId.v1',
  'skymusicnexus.radioQueue.v1',
  'skymusicnexus.telemetryOutbox.v1',
  'skymusicnexus.seenAwards.v1',
  'track-public-event',
  'qualified_stream',
  'complete_play',
  'playRadio',
  'bindNativeAudio',
  'hydrateNativeAudioElements',
  'trackForMusicPath',
  'trackForContainer',
  'native_audio',
  'AudioContext',
  'MediaMetadata',
  'data-player-visual',
  'ended',
  'next()',
  'skymusicnexus:achievement-award',
]) {
  assert(playerJs.includes(snippet), `canonical player missing ${snippet}`);
}

for (const snippet of [
  'neo-nexus.js',
  'nexus-player.js',
  'nexus-player.css',
]) {
  assert(playerHtml.includes(snippet), `player.html missing ${snippet}`);
}

for (const snippet of [
  'PUBLIC_TELEMETRY_ENDPOINT',
  'track-public-event',
  'PUBLIC_TELEMETRY_CONTENT_TYPE',
  'neo_nexus_player',
  'reportPublicPlayback',
  'qualified_stream',
  'complete_play',
  'publicQualifiedSent',
]) {
  assert(neoPlayerJs.includes(snippet), `neo player missing canonical telemetry bridge ${snippet}`);
}

for (const snippet of [
  '.skye-nexus-player',
  '.skye-nexus-player__drawer',
  '.skye-nexus-player__visual',
  'body.skye-nexus-player-mounted',
  '.skye-nexus-achievement-toast',
  'skye-nexus-award-burst',
]) {
  assert(playerCss.includes(snippet), `canonical player css missing ${snippet}`);
}

for (const snippet of [
  'Realtime Stream Room',
  'neural-map',
  'music-drops?action=traffic-summary',
  'trafficSummary',
  'Nexus streams',
  'skymusicnexus.streamLedger.v1',
  'data-nexus-track-id',
]) {
  assert(streamHtml.includes(snippet), `stream analytics page missing ${snippet}`);
}

for (const snippet of [
  'All-Nexus Radio',
  'Start Radio',
  'playRadio',
  'music-drops?action=traffic-summary',
  'Nexus streams',
  'data-track-id',
]) {
  assert(radioHtml.includes(snippet), `radio page missing ${snippet}`);
}

for (const snippet of [
  'musicDropTrafficSummary',
  'musicBrainListenFilters',
  'targetArtistSlug',
  'trackId:musicText',
  'productId:musicText',
  'listenSeconds',
  'publicMetricEligible',
  'nexusMetricEligible',
  'nexusStreams',
  'metricBoundary',
  'trafficSummary:musicDropTrafficSummary',
]) {
  assert(workerJs.includes(snippet), `Worker stream telemetry missing ${snippet}`);
}
for (const forbidden of ['qualifiedStreams', 'localBrainStreams', 'humanStreams', 'radioStreams', 'nativeAudioStreams', 'sourceBreakdown']) {
  assert(!discoverHtml.includes(forbidden), `discover still contains split stream field ${forbidden}`);
  assert(!radioHtml.includes(forbidden), `radio still contains split stream field ${forbidden}`);
  assert(!streamHtml.includes(forbidden), `stream analytics still contains split stream field ${forbidden}`);
  assert(!playerJs.includes(forbidden), `canonical player still contains split stream field ${forbidden}`);
  assert(!workerJs.includes(forbidden), `Worker still contains split stream field ${forbidden}`);
}

const canonicalSamples = [
  path.join(nexusRoot, 'public', 'index.html'),
  path.join(nexusRoot, 'public', 'store.html'),
  path.join(nexusRoot, 'artist-storefronts', 'gray-skyes', 'products', 'index.html'),
  path.join(nexusRoot, 'artist-storefronts', 'gray-skyes', 'drops', 'midnight-r-and-b-mode', 'index.html'),
  path.join(nexusRoot, 'artist-storefronts', 'gray-skyes-collective', 'releases', 'vox-gray-modes', 'index.html'),
];
for (const sample of canonicalSamples) {
  const html = readText(sample);
  assert(html.includes('nexus-player.js'), `${path.relative(repoRoot, sample)} missing canonical player script`);
  assert(html.includes('nexus-player.css'), `${path.relative(repoRoot, sample)} missing canonical player css`);
}

const playableSurfaceFailures = [];
function walkHtml(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full);
    else if (entry.name === 'index.html') {
      const relative = path.relative(nexusRoot, full);
      if (!/(^|\/)artist-storefronts\/.+\/(drops|releases)\//.test(relative) || /\/pics2vid\//.test(relative)) continue;
      const html = readText(full);
      if (!/<audio\b/i.test(html)) continue;
      const hasCanonical = html.includes('nexus-player.js') || html.includes('track-public-event');
      if (!hasCanonical) playableSurfaceFailures.push({ relative, reason: 'missing canonical telemetry script' });
      if (/\bsrc=(["'])\1/.test(html) && !html.includes('data-nexus-track-id') && !playerJs.includes('hydrateNativeAudioElements')) {
        playableSurfaceFailures.push({ relative, reason: 'empty native audio without hydrated canonical player fallback' });
      }
    }
  }
}
walkHtml(path.join(nexusRoot, 'artist-storefronts'));
assert(playableSurfaceFailures.length === 0, `playable drop/release surfaces missing telemetry coverage: ${JSON.stringify(playableSurfaceFailures.slice(0, 12))}`);

const proof = {
  ok: true,
  checkedAt: new Date().toISOString(),
  catalog: {
    tracks: catalog.totals.tracks,
    genres: catalog.totals.genres,
    systemPlaylists: catalog.totals.systemPlaylists,
    imageFailures: 0,
  },
  canonicalSamples: canonicalSamples.map((file) => path.relative(repoRoot, file)),
  playableSurfaceTelemetryChecked: true,
  neoPlayerTelemetryBridge: true,
  radioPath: path.relative(repoRoot, radioPath),
  streamTelemetry: catalog.streamTelemetry,
};

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
