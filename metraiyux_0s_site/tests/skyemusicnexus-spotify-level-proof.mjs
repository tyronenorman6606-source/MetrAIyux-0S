#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site', 'SkyeMusicNexus');
const receiptPath = path.join(repoRoot, 'test-artifacts', 'reflection-and-collective-drops', 'skyemusicnexus-spotify-level-proof-latest.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(nexusRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(nexusRoot, relativePath));
}

const home = read('index.html');
const homeJs = read('public/nexus-home.js');
const playerJs = read('public/nexus-player.js');
const playerCss = read('public/nexus-player.css');
const discover = read('public/discover.html');
const libraryHtml = read('public/library.html');
const libraryJs = read('public/library.js');
const dashboard = read('public/artist-dashboard.html');
const dashboardJs = read('public/artist-dashboard.js');
const publicPlayer = read('public/player.html');
const pagesWorker = read('_worker.js');
const workerJs = fs.readFileSync(path.join(repoRoot, 'metraiyux_0s_site', 'cloudflare', 'worker.js'), 'utf8');
const catalog = JSON.parse(read('public/data/playlists.json'));

for (const file of ['public/library.html', 'public/library.css', 'public/library.js']) {
  assert(exists(file), `${file} missing`);
}

for (const snippet of [
  './public/library.html',
  'playlistGrid',
  'newDropsRail',
  'genreShelfGrid',
  'queuePreview',
  'data-action="play-liked"',
  'currentTrackTitle',
]) {
  assert(home.includes(snippet), `home missing ${snippet}`);
}

for (const snippet of [
  'PLAYER_LIBRARY_KEY',
  'libraryState',
  'playQueueIds',
  'data-play-playlist',
  'data-play-artist',
  'setInterval(renderPlayerState, 1500)',
]) {
  assert(homeJs.includes(snippet), `home JS missing ${snippet}`);
}

for (const snippet of [
  'skymusicnexus.playerLibrary.v1',
  'skymusicnexus.playerState.v1',
  'savePlayerState',
  'restorePlayerState',
  'safePlay',
  'playbackUrl',
  'credentials: \'omit\'',
  'text/plain;charset=UTF-8',
  'skymusicnexus:library-change',
]) {
  assert(playerJs.includes(snippet), `canonical player missing ${snippet}`);
}

for (const snippet of [
  'skymusicnexus.playerLibrary.v1',
  'createPlaylist',
  'importLibraryJson',
  'exportLibrary',
  'SkyeNexusPlayer.playQueue',
]) {
  assert(libraryJs.includes(snippet), `library JS missing ${snippet}`);
}

for (const forbidden of ['skymusicnexus.userPlaylists.v1', 'USER_PLAYLISTS_KEY', 'STORAGE_KEY']) {
  assert(!libraryJs.includes(forbidden), `library still uses split playlist storage: ${forbidden}`);
  assert(!discover.includes(forbidden), `discover still uses split playlist storage: ${forbidden}`);
}

for (const snippet of [
  'skymusicnexus.playerLibrary.v1',
  'saveUserPlaylists',
  'libraryExport.v1',
]) {
  assert(discover.includes(snippet), `discover shared library path missing ${snippet}`);
}

for (const snippet of [
  '.skye-nexus-player-mounted',
  '--nexus-player-height',
  'env(safe-area-inset-bottom)',
  '@media (max-width: 560px)',
  '.skye-nexus-player__drawer',
]) {
  assert(playerCss.includes(snippet), `player CSS missing ${snippet}`);
}

for (const snippet of [
  'artistDashboardSearch',
  'ownerSummary',
  'ownerReadyDrops',
  'dashboardTrackList',
]) {
  assert(dashboard.includes(snippet), `artist dashboard HTML missing ${snippet}`);
}

for (const snippet of [
  'filteredArtists',
  'renderOwner',
  'renderTrackList',
  'traffic-summary',
  'milestoneBadge',
]) {
  assert(dashboardJs.includes(snippet), `artist dashboard JS missing ${snippet}`);
}

assert(publicPlayer.includes('./nexus-player.js'), 'public player must use the local canonical player script');
assert(publicPlayer.includes('./nexus-player.css'), 'public player must use the local canonical player stylesheet');
assert(!publicPlayer.includes('https://skye-music-nexus.pages.dev/public/nexus-player'), 'public player still loads production player assets directly');

for (const snippet of [
  'qualifiedEnough',
  'publicMetricEligible = nexusMetricEligible',
  'event.nexusMetricEligible !== false',
  'unifiedNexusStreamMetrics:true',
  'metricBoundary:\'Nexus streams are one unified platform count.',
]) {
  assert(workerJs.includes(snippet), `Worker unified stream handling missing ${snippet}`);
}

for (const forbidden of ['humanStreams', 'radioStreams', 'localBrainStreams', 'sourceBreakdown']) {
  assert(!workerJs.includes(forbidden), `Worker still exposes split stream field ${forbidden}`);
  assert(!discover.includes(forbidden), `discover still exposes split stream field ${forbidden}`);
}

assert(!/\b(window|document|matchMedia)\b/.test(pagesWorker), 'Pages _worker.js contains browser-only client globals');
assert(catalog.tracks.length >= 40, 'catalog must still expose the public music library');
assert((catalog.systemPlaylists || []).length >= 3, 'system playlists should remain available');

const receipt = {
  ok: true,
  checkedAt: new Date().toISOString(),
  surfaces: [
    'index.html',
    'public/library.html',
    'public/discover.html',
    'public/nexus-player.js',
    'public/artist-dashboard.html',
    'cloudflare/worker.js',
  ],
  assertions: {
    streamingHomeShell: true,
    canonicalPersistentPlayer: true,
    sharedLibrarySchema: true,
    artistStatsDashboard: true,
    unifiedNexusStreamCount: true,
    pagesWorkerServerOnly: true,
  },
  totals: {
    tracks: catalog.tracks.length,
    systemPlaylists: (catalog.systemPlaylists || []).length,
  },
};

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
