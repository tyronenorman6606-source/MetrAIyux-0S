#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  'public/index.html',
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
];
const failures = [];

async function text(file) {
  try { return await fs.readFile(path.join(root, file), 'utf8'); }
  catch { failures.push(`${file} missing`); return ''; }
}

for (const file of requiredFiles) await text(file);

const index = await text('public/index.html');
const upload = await text('public/upload.html');
const player = await text('public/player.html');
const releases = await text('public/releases.html');
const rights = await text('public/rights.html');
const exchange = await text('public/exchange.html');
const admin = await text('public/admin.html');
const gate = await text('gate-session.js');
const css = await text('public/neo-nexus.css');
const js = await text('public/neo-nexus.js');

const allArtistPages = [index, upload, player, releases, rights, exchange].join('\n');
const indexMust = ['Platform Dashboard','Upload Studio','Music Player','Releases','Rights','Exchange','Truth Boundary','pulse-field'];
for (const marker of indexMust) if (!index.includes(marker)) failures.push(`public/index.html missing ${marker}`);
const platformMust = ['Gated Audio Upload','Uploaded Audio Vault','Release Forge','Artist Nebula','Creator Exchange','Content Request Exchange','Inbox Relay','Community Relay','Achievement Orbit','Release Campaign Forge','Stream Deck','Rights Vault','Takedown Hold','Royalty River','Ops Sequencer'];
for (const marker of platformMust) if (!allArtistPages.includes(marker)) failures.push(`public platform pages missing ${marker}`);

const adminMust = ['Operator Stage','Review Chamber','Exchange Console','Payout Gate','Analytics Prism','Capsule Wall','pulse-field'];
for (const marker of adminMust) if (!admin.includes(marker)) failures.push(`public/admin.html missing ${marker}`);

const cssMust = ['vinyl-core','signal-map','wave-reader','constellation-list','exchange-grid','achievement-grid','player-queue','rights-status','operator-dialog','aurora'];
for (const marker of cssMust) if (!css.includes(marker)) failures.push(`neo-nexus.css missing ${marker}`);

const jsMust = ['music-artists','music-releases','music-assets','music-payments','music-analytics','music-exchange','queue-operations','request-content','publish-community','build-release-campaign','report-streams','playback-stream','update-rights','takedown-request','AudioContext','bootstrapLocalProof','loginLocalOperator'];
for (const marker of jsMust) if (!js.includes(marker)) failures.push(`neo-nexus.js missing ${marker}`);

for (const marker of ['Free99 Lite means no charge','SKYE_MUSIC_NEXUS_GATE_SESSION','SkyeMusicGate']) {
  if (!gate.includes(marker)) failures.push(`gate-session.js missing ${marker}`);
}
if (js.includes('auth: false')) failures.push('neo-nexus.js still contains ungated function reads');

const genericAdminDensity = (index.match(/generic dashboard/gi) || []).length + (admin.match(/generic dashboard/gi) || []).length;
if (genericAdminDensity > 0) failures.push('NeoFront app still describes itself as a generic dashboard');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, app: 'SkyeMusicNexus NeoFront', verified: ['platform dashboard', 'upload studio', 'gated audio upload', 'artist stage', 'operator stage', 'artist exchange', 'content request exchange', 'community relay', 'achievement orbit', 'release campaign forge', 'stream deck playback', 'rights vault', 'takedown hold', 'vinyl signal system', 'release forge', 'royalty river', 'operations sequencer', 'SkyGate client wiring'] }, null, 2));
