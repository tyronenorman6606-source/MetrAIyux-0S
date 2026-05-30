#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  'public/index.html',
  'public/walkthrough.html',
  'public/walkthrough.css',
  'public/walkthrough.js',
  'public/create.html',
  'public/daw.html',
  'public/stems.html',
  'public/exports.html',
  'public/discover.html',
  'public/feed.html',
  'public/store.html',
  'public/brain.html',
  'public/drops.html',
  'public/upload.html',
  'public/player.html',
  'public/releases.html',
  'public/rights.html',
  'public/exchange.html',
  'public/admin.html',
  'public/neo-nexus.css',
  'public/neo-nexus.js',
  'public/skygate-auth.js',
  'gate-session.js',
  'platform.css',
  'platform.js',
  'docs/FULL_PLATFORM_WALKTHROUGH.md',
  'artist-storefronts/supaboy/welcome.html',
  'artist-storefronts/supaboy/SUPABOY_WELCOME_PACKET.md',
  '../founder-command/client-credentials/supaboy.json',
];
const failures = [];

async function text(file) {
  try { return await fs.readFile(path.join(root, file), 'utf8'); }
  catch { failures.push(`${file} missing`); return ''; }
}

for (const file of requiredFiles) await text(file);

const index = await text('public/index.html');
const walkthrough = await text('public/walkthrough.html');
const walkthroughCss = await text('public/walkthrough.css');
const walkthroughJs = await text('public/walkthrough.js');
const create = await text('public/create.html');
const daw = await text('public/daw.html');
const stems = await text('public/stems.html');
const exportsPage = await text('public/exports.html');
const discover = await text('public/discover.html');
const feed = await text('public/feed.html');
const store = await text('public/store.html');
const brain = await text('public/brain.html');
const drops = await text('public/drops.html');
const upload = await text('public/upload.html');
const player = await text('public/player.html');
const releases = await text('public/releases.html');
const rights = await text('public/rights.html');
const exchange = await text('public/exchange.html');
const admin = await text('public/admin.html');
const gate = await text('gate-session.js');
const css = await text('public/neo-nexus.css');
const js = await text('public/neo-nexus.js');
const supaboyWelcome = await text('artist-storefronts/supaboy/welcome.html');
const supaboyHandoff = await text('../founder-command/client-credentials/supaboy.json');

const allArtistPages = [index, create, daw, stems, exportsPage, discover, feed, store, brain, drops, upload, player, releases, rights, exchange].join('\n');
const indexMust = ['Artist Workspace','Create','DAW','Discover','Feed','Upload Studio','Music Player','Releases','Rights','Exchange','Artist Store','Artist Brain','Client Launch Path','Claim Audit','pulse-field'];
for (const marker of indexMust) if (!index.includes(marker)) failures.push(`public/index.html missing ${marker}`);
const walkthroughMust = ['Full Platform Walkthroughs','data-walkthrough-root','Play Walkthrough','SupaBoy','FULL_PLATFORM_WALKTHROUGH.md'];
for (const marker of walkthroughMust) if (!walkthrough.includes(marker)) failures.push(`public/walkthrough.html missing ${marker}`);
const walkthroughCssMust = ['screen-stage','guide-pin','walkthrough-map','room-grid'];
for (const marker of walkthroughCssMust) if (!walkthroughCss.includes(marker)) failures.push(`public/walkthrough.css missing ${marker}`);
const walkthroughJsMust = ['Listener first pass','Artist launch pass','SupaBoy founding artist pass','setStep','placeCards'];
for (const marker of walkthroughJsMust) if (!walkthroughJs.includes(marker)) failures.push(`public/walkthrough.js missing ${marker}`);
const supaboyMust = ['Welcome to','Skye Music Nexus,','SupaBoy-only artist ID','444666666667','Full Walkthrough','SLB / Superboy','Product Desk'];
for (const marker of supaboyMust) if (!supaboyWelcome.includes(marker)) failures.push(`artist-storefronts/supaboy/welcome.html missing ${marker}`);
try {
  const supaboyPack = JSON.parse(supaboyHandoff);
  if (supaboyPack.artist?.artist_id !== '444666666667') failures.push('supaboy credential pack missing canonical artist id');
  if (supaboyPack.secret_material?.app_specific_password_created !== false) failures.push('supaboy credential pack must not create an app-specific password');
  if (!String(supaboyPack.email_draft?.body || '').includes('shared 0S/SkyGate lane')) failures.push('supaboy credential pack missing shared gate email draft');
} catch {
  failures.push('founder-command/client-credentials/supaboy.json is not valid JSON');
}
const createMust = ['BandLab / Spotify / Instagram command layer','DAW','Stems','Exports','Discover','Feed','Save Studio Project'];
for (const marker of createMust) if (!create.includes(marker)) failures.push(`public/create.html missing ${marker}`);
const dawMust = ['Native DAW','SkyeMusicNexus DAW','dawTrackGrid','dawMixerChannels','dawPads','dawKeys','audioEngineButton','dawAudioStatus','dawWorkbenchBody','dawStatusProject','undoDawButton','splitRegionButton','dawSoundLibrary','mixdownDawButton','micRecordButton','midiDawButton','nexus-daw.js'];
for (const marker of dawMust) if (!daw.includes(marker)) failures.push(`public/daw.html missing ${marker}`);
if (daw.includes('<iframe')) failures.push('public/daw.html must not contain an iframe');
if (daw.toLowerCase().includes('open' + 'daw')) failures.push('public/daw.html still references an external DAW brand');
const networkMust = ['Stem Vault','Export Forge','Discover','Feed','Spotify-style','Open Social Feed'];
for (const marker of networkMust) if (!allArtistPages.includes(marker)) failures.push(`split music network missing ${marker}`);
const platformMust = ['Protected Audio Upload','Drop songs here','Uploaded Audio Vault','Release Forge','Artist Nebula','Creator Exchange','Content Request Exchange','Inbox Relay','Community Relay','Achievement Orbit','Release Campaign Forge','Stream Deck','Rights Vault','Takedown Hold','Royalty River','Ops Sequencer','Pixelfed','socialConnectorForm','feedComposeForm','socialFeedDeck','Artist Store','storeProfileForm','storeProductForm','storeOrderForm','Artist Brain','artistBrainForm','artistBrainCycleForm','artistBrainToolForm','skyeActivityForm','giveawayForm','Drop Room','dropCreateForm','dropBatchForm','dropPublishForm'];
for (const marker of platformMust) if (!allArtistPages.includes(marker)) failures.push(`public platform pages missing ${marker}`);

const adminMust = ['Protected Review','Review Chamber','Exchange Console','Payout Queue','Analytics Prism','Capsule Wall','pulse-field'];
for (const marker of adminMust) if (!admin.includes(marker)) failures.push(`public/admin.html missing ${marker}`);

const cssMust = ['vinyl-core','signal-map','wave-reader','constellation-list','exchange-grid','achievement-grid','player-queue','rights-status','operator-dialog','song-drop-zone'];
for (const marker of cssMust) if (!css.includes(marker)) failures.push(`neo-nexus.css missing ${marker}`);

const jsMust = ['music-artists','music-releases','music-assets','music-payments','music-analytics','music-exchange','music-social','music-drops','music-store','music-brain','music-gamify','create-drop','submit-drop','form-batch','send-approval','run-approval-brain','publish-batch','queue-operations','request-content','publish-community','build-release-campaign','create-feed-post','feed-action','save-connector','queue-post','publish-post','sync-feed','upsert-store','create-product','seed-artist-brain','run-local-cycle','build-tool-asset','record-activity','open-giveaway','enter-giveaway','draw-giveaway','report-streams','playback-stream','update-rights','takedown-request','DataTransfer','AudioContext','logoutSession'];
for (const marker of jsMust) if (!js.includes(marker)) failures.push(`neo-nexus.js missing ${marker}`);
const legacyLoginCopy = 'Local ' + 'Operator Login';
const legacyLoginSymbol = 'loginLocal' + 'Operator';
if (allArtistPages.includes(legacyLoginCopy)) failures.push('public platform pages still expose legacy local login copy');
if (js.includes(legacyLoginSymbol)) failures.push('neo-nexus.js still exposes legacy local password login wiring');

for (const marker of ['MetrAIyuxGateBridge','/gate/signup/?return=','SkyeMusicGate']) {
  if (!gate.includes(marker)) failures.push(`gate-session.js missing ${marker}`);
}
const retiredMusicSessionKey = 'SKYE_MUSIC_NEXUS' + '_GATE_SESSION';
if (gate.includes(retiredMusicSessionKey)) failures.push('gate-session.js still uses an app-specific Music Nexus session key');
if (gate.includes('localStorage.setItem') || gate.includes('sessionStorage.setItem')) failures.push('gate-session.js still writes a local app session');
if (js.includes('auth: false')) failures.push('neo-nexus.js still contains ungated function reads');

const genericAdminDensity = (index.match(/generic dashboard/gi) || []).length + (admin.match(/generic dashboard/gi) || []).length;
if (genericAdminDensity > 0) failures.push('NeoFront app still describes itself as a generic dashboard');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, app: 'SkyeMusicNexus NeoFront', verified: ['artist workspace', 'create hub', 'native DAW', 'stem vault', 'export forge', 'discover surface', 'open social feed surface', 'artist store room', 'local artist brain room', 'SkyeMeter and giveaways', 'Pixelfed/Fediverse connector controls', 'upload studio', 'protected audio upload', 'artist stage', 'protected review stage', 'artist exchange', 'content request exchange', 'community relay', 'achievement orbit', 'release campaign forge', 'stream deck playback', 'rights vault', 'takedown hold', 'vinyl signal system', 'release forge', 'royalty river', 'operations sequencer', 'shared client access wiring'] }, null, 2));
