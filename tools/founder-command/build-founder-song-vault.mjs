#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const vaultDir = path.join(root, 'metraiyux_0s_site/founder-command/song-vault');
const audioExts = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.opus']);
const DEPLOY_PART_THRESHOLD_BYTES = 24 * 1024 * 1024;
const DEPLOY_PART_BYTES = 12 * 1024 * 1024;

const sourceGroups = [
  {
    collection: 'gray-skyes-catalog',
    collectionLabel: 'Gray Skyes Catalog',
    root: 'metraiyux_0s_site/SkyeMusicNexus/artist-storefronts/gray-skyes/media/audio',
    dest: 'audio/gray-skyes-catalog',
    preserveRel: false
  },
  {
    collection: 'original-masters',
    collectionLabel: 'Original Masters',
    root: '.1/gray-skyes-agent-universe/media/audio',
    dest: 'audio/original-masters',
    preserveRel: false
  },
  {
    collection: 'original-masters',
    collectionLabel: 'Original Masters',
    root: '.1/next-artist-universe-intake/assets-drop/audio',
    dest: 'audio/original-masters',
    preserveRel: false
  },
  {
    collection: 'song-creation-bin',
    collectionLabel: 'Song Creation Bin',
    root: 'metraiyux_0s_site/SkyeMusicNexus/song-creation-bin',
    dest: 'audio/song-creation-bin',
    preserveRel: true
  }
];

const normalize = (value) => value.split(path.sep).join('/');

function slugify(value = '') {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'song';
}

function titleize(value = '') {
  const title = value
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((part) => {
      const lower = part.toLowerCase();
      if (['r', 'b', 'ai', 'cvs'].includes(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
  return title
    .replace(/\bIm\b/g, "I'm")
    .replace(/\bIts\b/g, "It's")
    .replace(/\bYoure\b/g, "You're")
    .replace(/\bIi\b/g, 'II')
    .replace(/\bIii\b/g, 'III')
    .replace(/\bIv\b/g, 'IV');
}

function safeFileName(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return `${slugify(path.basename(fileName, ext))}${ext}`;
}

function mimeFor(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.aac') return 'audio/aac';
  if (ext === '.flac') return 'audio/flac';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.opus') return 'audio/opus';
  return 'application/octet-stream';
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile() && audioExts.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

async function sha256(filePath) {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

async function writeDeployParts(sourcePath, rel) {
  const buffer = await readFile(sourcePath);
  if (buffer.length <= DEPLOY_PART_THRESHOLD_BYTES) return [];
  const parts = [];
  const partDir = normalize(path.join('parts', rel));
  for (let offset = 0, index = 1; offset < buffer.length; offset += DEPLOY_PART_BYTES, index += 1) {
    const chunk = buffer.subarray(offset, Math.min(offset + DEPLOY_PART_BYTES, buffer.length));
    const partRel = normalize(path.join(partDir, `part-${String(index).padStart(2, '0')}.bin`));
    const partPath = path.join(vaultDir, partRel);
    await mkdir(path.dirname(partPath), { recursive: true });
    await writeFile(partPath, chunk);
    parts.push({
      index,
      bytes: chunk.length,
      sha256: createHash('sha256').update(chunk).digest('hex'),
      href: `/founder-command/song-vault/${partRel}`,
      vaultPath: normalize(path.relative(root, partPath))
    });
  }
  return parts;
}

function vaultRelFor(group, sourceRoot, filePath) {
  if (!group.preserveRel) {
    return normalize(path.join(group.dest, safeFileName(path.basename(filePath))));
  }

  const rel = path.relative(sourceRoot, filePath);
  const parts = rel.split(path.sep);
  const fileName = parts.pop();
  return normalize(path.join(group.dest, ...parts.map(slugify), safeFileName(fileName)));
}

await rm(vaultDir, { recursive: true, force: true });
await mkdir(vaultDir, { recursive: true });

const songs = [];
const byHash = new Map();

for (const group of sourceGroups) {
  const sourceRoot = path.join(root, group.root);
  const sourceRootStat = await stat(sourceRoot).catch(() => null);
  if (!sourceRootStat?.isDirectory()) continue;

  for (const filePath of await walk(sourceRoot)) {
    const hash = await sha256(filePath);
    const sourcePath = normalize(path.relative(root, filePath));
    const existing = byHash.get(hash);

    if (existing) {
      existing.duplicateSourcePaths.push(sourcePath);
      continue;
    }

    const rel = vaultRelFor(group, sourceRoot, filePath);
    const destPath = path.join(vaultDir, rel);
    const fileStat = await stat(filePath);
    await mkdir(path.dirname(destPath), { recursive: true });
    await copyFile(filePath, destPath);
    const deployParts = await writeDeployParts(filePath, rel);

    const ext = path.extname(destPath).toLowerCase().slice(1);
    const song = {
      id: `${group.collection}-${slugify(rel.replace(/\.[^.]+$/, ''))}`,
      slug: slugify(rel.replace(/\.[^.]+$/, '')),
      title: titleize(path.basename(destPath)),
      collection: group.collection,
      collectionLabel: group.collectionLabel,
      fileName: path.basename(destPath),
      extension: ext,
      mime: mimeFor(destPath),
      bytes: fileStat.size,
      sha256: hash,
      href: `/founder-command/song-vault/${rel}`,
      vaultPath: normalize(path.relative(root, destPath)),
      sourcePath,
      duplicateSourcePaths: [],
      deployParts,
      deployHref: deployParts.length ? '' : `/founder-command/song-vault/${rel}`
    };
    songs.push(song);
    byHash.set(hash, song);
  }
}

songs.sort((a, b) => `${a.collectionLabel} ${a.title}`.localeCompare(`${b.collectionLabel} ${b.title}`));

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  generatedBy: 'tools/founder-command/build-founder-song-vault.mjs',
  vaultRoot: 'metraiyux_0s_site/founder-command/song-vault',
  browserRoot: '/founder-command/song-vault/',
  sourceRoots: sourceGroups.map((group) => group.root),
  count: songs.length,
  totalBytes: songs.reduce((sum, song) => sum + song.bytes, 0),
  songs
};

await writeFile(path.join(vaultDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(vaultDir, 'manifest.js'), `window.FOUNDER_SONG_VAULT = ${JSON.stringify(manifest, null, 2)};\n`);

console.log(JSON.stringify({
  ok: true,
  vaultRoot: manifest.vaultRoot,
  count: manifest.count,
  totalBytes: manifest.totalBytes
}, null, 2));
