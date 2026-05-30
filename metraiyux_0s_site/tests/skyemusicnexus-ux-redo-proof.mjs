#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site', 'SkyeMusicNexus');
const receiptPath = path.join(repoRoot, 'test-artifacts', 'reflection-and-collective-drops', 'skyemusicnexus-ux-redo-proof-latest.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(nexusRoot, relativePath), 'utf8');
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(nexusRoot, relativePath));
}

function extractRefs(html) {
  return [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)].map((match) => match[1]);
}

const indexHtml = read('index.html');
const dashboardHtml = read('public/artist-dashboard.html');
const homeJs = read('public/nexus-home.js');
const dashboardJs = read('public/artist-dashboard.js');
const homeCss = read('public/nexus-home.css');
const streamAnalytics = read('public/stream-analytics.html');
const achievements = read('public/achievements.html');
const commandBridgeShim = read('assets/js/0s-command-bridge.js');
const skyeIdBridgeShim = read('assets/js/skye-id-bridge.js');
const pagesWorker = read('_worker.js');
const catalog = JSON.parse(read('public/data/playlists.json'));
const apps = JSON.parse(read('artist-storefronts/artist-apps/artist-apps.json'));
const collective = JSON.parse(read('artist-storefronts/gray-skyes-collective/collective.json'));

for (const snippet of [
  'public/nexus-home.css',
  'public/nexus-home.js',
  'public/nexus-player.js',
  'public/artist-dashboard.html',
  'Artist Stats',
  'Start Radio',
  'Owner View',
  'Social',
  'DAW',
  'Store',
]) {
  assert(indexHtml.includes(snippet), `new Music Nexus home missing ${snippet}`);
}

for (const snippet of [
  'artist-dashboard.js',
  'Live artist room',
  'Gray Gang pulse',
  'dashboardArtistList',
  'dashboardTrackList',
]) {
  assert(dashboardHtml.includes(snippet), `artist dashboard missing ${snippet}`);
}

for (const snippet of [
  'traffic-summary',
  'setInterval(load, 5000)',
  'artistTraffic',
  'ownerPulse',
  'SkyeNexusPlayer',
]) {
  assert(homeJs.includes(snippet), `nexus-home.js missing ${snippet}`);
}

for (const snippet of [
  'traffic-summary',
  'setInterval(() => load({ silent: true }), REFRESH_MS)',
  'artistStats',
  'collective',
  'SkyeNexusPlayer',
]) {
  assert(dashboardJs.includes(snippet), `artist-dashboard.js missing ${snippet}`);
}

assert(catalog.tracks.length >= 40, 'catalog should expose the active playable music library');
assert(apps.apps.length >= 30, 'artist dashboard should include all local app artists');
assert(collective.members.length >= 30, 'owner collective view should include Gray Gang roster');
assert((catalog.artists.find((artist) => artist.artistSlug === 'gray-skyes')?.trackIds || []).length >= 10, 'Gray should have a real catalog in artist stats');

assert(!/products\.json|profile\.json|artist-apps\.json/.test(indexHtml), 'home exposes raw JSON links');
assert(!/products\.json|profile\.json|artist-apps\.json/.test(dashboardHtml), 'dashboard exposes raw JSON links');
assert(!/\/assets\/js\//.test(indexHtml), 'home references root assets that are not in the standalone Pages project');
assert(!/letter-spacing\s*:\s*-/.test(homeCss), 'new CSS uses negative letter spacing');
assert(!/credentials:\s*['"]include['"]/.test(streamAnalytics), 'stream analytics still uses credentialed public traffic fetch');
assert(!/credentials:\s*['"]include['"]/.test(achievements), 'achievements still uses credentialed public traffic fetch');
assert(!/gate-hydrate/.test(read('public/radio.html') + read('public/ads.html') + read('public/discover.html') + streamAnalytics + achievements), 'public pages still reference missing gate-hydrate.js');
assert(commandBridgeShim.includes('skymusicnexus.commandBridge.localQueue.v1'), 'standalone command bridge shim is missing local queue behavior');
assert(skyeIdBridgeShim.includes('window.SkyeIDBridge') || skyeIdBridgeShim.includes('global.SkyeIDBridge'), 'standalone Skye ID bridge shim is missing');
assert(!/\b(window|document|matchMedia)\b/.test(pagesWorker), 'Pages _worker.js contains browser-only client globals');

const missing = [];
for (const relative of [
  'index.html',
  'public/artist-dashboard.html',
  'public/achievements.html',
  'public/radio.html',
  'public/stream-analytics.html',
  'public/ads.html',
  'public/discover.html',
  'public/signup.html',
  'public/upload.html',
  'public/releases.html',
  'public/feed.html',
]) {
  const html = read(relative);
  for (const ref of extractRefs(html)) {
    if (ref.includes('${') || ref.includes('}')) continue;
    if (!ref || ref.startsWith('#') || ref.startsWith('http') || ref.startsWith('mailto:') || ref.startsWith('tel:') || ref.startsWith('data:')) continue;
    const url = new URL(ref, `https://skye-music-nexus.local/${relative}`);
    if (url.origin !== 'https://skye-music-nexus.local') continue;
    const clean = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (!clean) continue;
    const target = clean.endsWith('/') ? path.join(clean, 'index.html') : clean;
    if (!fileExists(target)) missing.push({ relative, ref, target });
  }
}
assert(missing.length === 0, `Music Nexus key local refs missing: ${JSON.stringify(missing.slice(0, 8))}`);

const receipt = {
  ok: true,
  checkedAt: new Date().toISOString(),
  surfaces: ['index.html', 'public/artist-dashboard.html', 'public/stream-analytics.html', 'public/achievements.html', '_worker.js', 'assets/js/0s-command-bridge.js', 'assets/js/skye-id-bridge.js'],
  totals: {
    tracks: catalog.tracks.length,
    catalogArtists: catalog.artists.length,
    artistApps: apps.apps.length,
    collectiveMembers: collective.members.length,
    grayTrackCount: (catalog.artists.find((artist) => artist.artistSlug === 'gray-skyes')?.trackIds || []).length,
  },
  assertions: {
    appShell: true,
    artistLiveStats: true,
    ownerCollectiveView: true,
    noRawJsonLinksOnNewSurfaces: true,
    noMissingLocalRefs: true,
    standaloneBridgeShims: true,
    edgeWorkerNoClientGlobals: true,
    publicStatsFetchNoCredentials: true,
  },
};

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
