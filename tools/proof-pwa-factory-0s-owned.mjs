#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const repoRoot = process.cwd();
const appDir = path.join(repoRoot, 'metraiyux_0s_site/founder-command/apps/pwa-factory-v213');
const outDir = path.join(repoRoot, 'test-artifacts/founder-command-pwa-drop-factory');
fs.mkdirSync(outDir, { recursive: true });

const requiredFiles = [
  'index.html',
  'assets/pwa-factory.css',
  'assets/pwa-factory.js',
  'assets/skyes-over-london-deity-logo.png',
  'assets/metraiyux-0s-logo-transparent.png',
  'assets/skye-music-nexus-logo.png',
  'manifest.json',
  'sw.js',
  'drop-factory-manifest.json'
];

const forbiddenPatterns = [
  /https?:\/\//i,
  /cdn\.tailwindcss/i,
  /cdnjs/i,
  /unpkg/i,
  /fonts\.google/i,
  /sharemyimage/i,
  /api-key-input/i,
  /generativelanguage/i,
  /gemini/i,
  /NEURAL KEY/i,
  /JSZip/i,
  /FileSaver/i,
  /xi-api-key/i,
  /OPENAI_API_KEY/i,
  /ELEVENLABS_API_KEY/i,
  /STABILITY_API_KEY/i
];

function walk(dir) {
  const rows = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) rows.push(...walk(full));
    else rows.push(full);
  }
  return rows;
}

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(appDir, file)));
const scanned = walk(appDir).filter((file) => !/\.(png|jpg|jpeg|webp|ico)$/i.test(file));
const forbiddenMatches = [];
for (const file of scanned) {
  const rel = path.relative(appDir, file);
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) forbiddenMatches.push({ file: rel, pattern: String(pattern) });
  }
}

const jsSource = fs.readFileSync(path.join(appDir, 'assets/pwa-factory.js'), 'utf8');
const context = {
  console,
  Blob,
  TextEncoder,
  Uint8Array,
  URL,
  Date,
  Math,
  JSON,
  setTimeout,
  clearTimeout,
  requestAnimationFrame() {},
  devicePixelRatio: 1,
  Image: function Image() {},
  document: {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  },
  window: {
    addEventListener() {},
    SkyePwaFactoryInternals: null
  }
};
vm.createContext(context);
vm.runInContext(jsSource, context, { filename: 'pwa-factory.js' });

if (!context.window.SkyePwaFactoryInternals?.createZip) {
  throw new Error('PWA Factory createZip internal was not exposed for proof.');
}

const sampleMp3Bytes = new Uint8Array([
  0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x15, 0x54, 0x49, 0x54, 0x32, 0x00, 0x00,
  0x00, 0x0b, 0x00, 0x00, 0x03, 0x53, 0x6b, 0x79,
  0x65, 0x20, 0x44, 0x72, 0x6f, 0x70, 0xff, 0xfb,
  0x90, 0x64, 0x00, 0x00
]);
const zipBlob = await context.window.SkyePwaFactoryInternals.createZip([
  { name: 'index.html', bytes: new TextEncoder().encode('<!doctype html><title>Proof Drop</title><audio controls src="audio/proof.mp3"></audio>') },
  { name: 'manifest.json', bytes: new TextEncoder().encode(JSON.stringify({ name: 'Proof Drop', start_url: './index.html', display: 'standalone' })) },
  { name: 'sw.js', bytes: new TextEncoder().encode("self.addEventListener('fetch',()=>{});") },
  { name: 'audio/proof.mp3', bytes: sampleMp3Bytes },
  { name: 'drop-receipt.json', bytes: new TextEncoder().encode(JSON.stringify({ ok: true, bundledAudio: true })) }
]);
const zipPath = path.join(outDir, 'sample-audio-upload-drop.zip');
fs.writeFileSync(zipPath, Buffer.from(await zipBlob.arrayBuffer()));
const unzipTest = execFileSync('unzip', ['-t', zipPath], { encoding: 'utf8' });
const unzipList = execFileSync('unzip', ['-l', zipPath], { encoding: 'utf8' });

const manifest = JSON.parse(fs.readFileSync(path.join(appDir, 'drop-factory-manifest.json'), 'utf8'));
const receipt = {
  schema: 'founder-command.pwa-drop-factory.0s-owned-proof.v1',
  checkedAt: new Date().toISOString(),
  appDir: path.relative(repoRoot, appDir),
  requiredFiles,
  missing,
  forbiddenMatches,
  runtimeIndependentOfDonorZip: manifest.runtimeIndependentOfDonorZip === true,
  browserProviderKeys: manifest.authPolicy?.browserProviderKeys === false,
  appLocalPasswords: manifest.authPolicy?.appLocalPasswords === false,
  directBrowserProviderCalls: manifest.authPolicy?.directBrowserProviderCalls === false,
  zipProof: {
    path: path.relative(repoRoot, zipPath),
    bytes: fs.statSync(zipPath).size,
    containsAudio: unzipList.includes('audio/proof.mp3'),
    unzipTest
  }
};
receipt.ok = missing.length === 0
  && forbiddenMatches.length === 0
  && receipt.runtimeIndependentOfDonorZip
  && receipt.browserProviderKeys
  && receipt.appLocalPasswords
  && receipt.directBrowserProviderCalls
  && receipt.zipProof.containsAudio
  && /No errors detected/.test(unzipTest);

const receiptPath = path.join(outDir, '0s-owned-runtime-proof.json');
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ ok: receipt.ok, receipt: path.relative(repoRoot, receiptPath), zip: receipt.zipProof.path, forbiddenMatches: forbiddenMatches.length }, null, 2));
if (!receipt.ok) process.exit(1);
