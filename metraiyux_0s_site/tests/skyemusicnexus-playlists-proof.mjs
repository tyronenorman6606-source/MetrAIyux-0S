#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const nexusRoot = path.join(repoRoot, 'metraiyux_0s_site', 'SkyeMusicNexus');
const htmlPath = path.join(nexusRoot, 'public', 'discover.html');
const dataPath = path.join(nexusRoot, 'public', 'data', 'playlists.json');
const receiptPath = path.join(
  repoRoot,
  'test-artifacts',
  'reflection-and-collective-drops',
  'skyemusicnexus-playlists-proof-latest.json',
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fileFromPublicHref(href) {
  if (!href || /^https?:\/\//i.test(href) || href.startsWith('/')) return null;
  return path.resolve(path.dirname(htmlPath), href);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const catalog = readJson(dataPath);

for (const snippet of ['Playlists + Charts', 'data-action="save-playlist"', 'localStorage', './data/playlists.json', 'Genre Charts', './radio.html', 'Start All-Nexus Radio', 'Live Nexus Trending', 'rebuildLiveCharts', 'trackRankScore', 'skymusicnexus:stream-event', 'music-drops?action=traffic-summary', 'skymusicnexus.playerLibrary.v1']) {
  assert(html.includes(snippet), `discover.html missing ${snippet}`);
}

for (const removedPlaceholder of ['Midnight Pressure', 'Chrome Choir', 'Signal Run']) {
  assert(!html.includes(removedPlaceholder), `placeholder track still present: ${removedPlaceholder}`);
}

const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
for (const [index, script] of inlineScripts.entries()) {
  new Function(script);
  assert(script.includes('skymusicnexus.playerLibrary.v1') || index === 0, `inline script ${index + 1} missing shared player library lane`);
}

assert(catalog.schema === 'skyemusicnexus.playlists.v1', 'playlist catalog schema mismatch');
assert(catalog.totals.tracks >= 7, 'playlist catalog needs at least seven playable tracks');
assert(catalog.totals.artists >= 1, 'playlist catalog needs artists');
assert(catalog.totals.genres >= 1, 'playlist catalog needs genre charts');
assert(Array.isArray(catalog.systemPlaylists) && catalog.systemPlaylists.length >= 3, 'system playlists missing');
assert(Array.isArray(catalog.charts.genreCharts) && catalog.charts.genreCharts.length >= 1, 'genre charts missing');
assert(Array.isArray(catalog.charts.artistCharts) && catalog.charts.artistCharts.length >= 1, 'artist charts missing');

const titles = catalog.tracks.map((track) => track.title);
assert(titles.some((title) => /^Twin Signal/i.test(title)), 'Twin Signal missing from playlist catalog');
assert(titles.some((title) => /^Proof Engine/i.test(title)), 'Proof Engine missing from playlist catalog');
assert(titles.some((title) => /^Skyline Pact/i.test(title)), 'Skyline Pact missing from playlist catalog');
assert(titles.some((title) => /^Neon Drift Relay/i.test(title)), 'Neon Drift Relay missing from playlist catalog');
assert(titles.some((title) => /^Close The Mirror/i.test(title)), 'Close The Mirror missing from playlist catalog');

for (const track of catalog.tracks) {
  assert(track.trackId, 'track missing trackId');
  assert(track.title, `track missing title: ${track.trackId}`);
  assert(track.artistName, `track missing artistName: ${track.trackId}`);
  assert(track.artistId, `track missing artistId: ${track.trackId}`);
  assert(track.genre, `track missing genre: ${track.trackId}`);
  assert(track.audioUrl, `track missing audioUrl: ${track.trackId}`);
  const audioPath = fileFromPublicHref(track.audioUrl);
  if (audioPath) {
    assert(fs.existsSync(audioPath), `track audio file missing: ${track.trackId} -> ${track.audioUrl}`);
  }
}

for (const playlist of catalog.systemPlaylists) {
  assert(playlist.playlistId, 'system playlist missing playlistId');
  assert(playlist.title, `system playlist missing title: ${playlist.playlistId}`);
  assert(playlist.trackIds.length, `system playlist has no tracks: ${playlist.playlistId}`);
}

const receipt = {
  ok: true,
  checkedAt: new Date().toISOString(),
  htmlPath: path.relative(repoRoot, htmlPath),
  dataPath: path.relative(repoRoot, dataPath),
  totals: catalog.totals,
  topGenres: catalog.charts.genreCharts.slice(0, 5).map((chart) => ({
    genre: chart.genre,
    tracks: chart.trackIds.length,
  })),
  topTracks: catalog.tracks.slice(0, 8).map((track) => ({
    title: track.title,
    artistName: track.artistName,
    genre: track.genre,
    score: track.score,
  })),
};

fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
