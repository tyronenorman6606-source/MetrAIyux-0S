import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const MUSIC_ROOT = path.resolve(path.dirname(__filename), '..');
const STOREFRONT_ROOT = path.join(MUSIC_ROOT, 'artist-storefronts');
const MOUNT_ROOT = '/SkyeMusicNexus/artist-storefronts/';
const LOCKED_IMAGE = '/SkyeMusicNexus/assets/skye-music-nexus-logo.png';
const LOCKED_STORE = '/SkyeMusicNexus/public/store.html';
const PROTECTED_EXTENSIONS = new Set([
  '.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg',
  '.zip', '.rar', '.7z', '.stem', '.stems', '.als', '.aup3', '.logicx', '.band', '.ptx',
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg',
  '.mp4', '.mov', '.webm', '.m4v', '.psd', '.ai', '.pdf'
]);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg']);
const AUDIO_VIDEO_EXTENSIONS = new Set(['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.mp4', '.mov', '.webm', '.m4v']);

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function stripQuery(value) {
  return String(value || '').split(/[?#]/)[0];
}

function mountedPathFor(value, file) {
  const raw = String(value || '').trim();
  if (!raw || raw.startsWith('#') || /^(?:data|mailto|tel|javascript):/i.test(raw)) return '';
  let clean = raw;
  try {
    const parsed = new URL(raw);
    clean = parsed.pathname;
  } catch {
    clean = raw;
  }
  clean = stripQuery(clean);
  if (clean.startsWith('/artist-storefronts/')) return `/SkyeMusicNexus${clean}`;
  if (clean.startsWith(MOUNT_ROOT)) return clean;
  if (clean.startsWith('/')) return clean;
  const fileDir = path.dirname(file);
  const resolved = path.resolve(fileDir, clean);
  const rel = path.relative(STOREFRONT_ROOT, resolved).replace(/\\/g, '/');
  if (rel.startsWith('..') || path.isAbsolute(rel)) return '';
  return `${MOUNT_ROOT}${rel}`.replace(/\/+/g, '/');
}

function protectedInfo(value, file) {
  const mounted = mountedPathFor(value, file);
  if (!mounted.startsWith(MOUNT_ROOT)) return null;
  const lower = mounted.toLowerCase();
  if (lower.endsWith('/pics2vid/package.json')) return { mounted, ext: '.json', kind: 'package' };
  const ext = path.extname(lower);
  if (!PROTECTED_EXTENSIONS.has(ext)) return null;
  const kind = IMAGE_EXTENSIONS.has(ext) ? 'image' : AUDIO_VIDEO_EXTENSIONS.has(ext) ? 'media' : 'asset';
  return { mounted, ext, kind };
}

function replacementFor(info, attrName = '', tagName = '') {
  if (!info) return null;
  if (attrName === 'href') return LOCKED_STORE;
  if (attrName === 'poster') return LOCKED_IMAGE;
  if (tagName === 'audio' || tagName === 'video' || tagName === 'source') return '';
  if (info.kind === 'image') return LOCKED_IMAGE;
  return '';
}

function tagNameBefore(source, index) {
  const start = source.lastIndexOf('<', index);
  if (start < 0) return '';
  const chunk = source.slice(start + 1, index).trim();
  const match = chunk.match(/^\/?\s*([a-z0-9-]+)/i);
  return match ? match[1].toLowerCase() : '';
}

function lockHtml(source, file) {
  let replacements = 0;
  let body = source.replace(/\b(src|href|poster)=(["'])(.*?)\2/gi, (match, attrName, quote, value, offset) => {
    const info = protectedInfo(value, file);
    if (!info) return match;
    const tagName = tagNameBefore(source, offset);
    const replacement = replacementFor(info, attrName.toLowerCase(), tagName);
    replacements += 1;
    return `${attrName}=${quote}${replacement}${quote}`;
  });

  body = body.replace(/(["'])(.*?)\1/g, (match, quote, value) => {
    const info = protectedInfo(value, file);
    if (!info) return match;
    const replacement = info.kind === 'image' ? LOCKED_IMAGE : '';
    replacements += 1;
    return `${quote}${replacement}${quote}`;
  });

  body = body.replace(/url\((["']?)(.*?)\1\)/gi, (match, quote, value) => {
    const info = protectedInfo(value, file);
    if (!info) return match;
    replacements += 1;
    return `url(${LOCKED_IMAGE})`;
  });

  body = body.replace(/\sdownload(?:=(["'])(.*?)\1|=[^\s>]+)?/gi, () => {
    replacements += 1;
    return '';
  });

  body = body.replace(/>\s*Download\s*</gi, () => {
    replacements += 1;
    return '>Unlock in store<';
  });

  body = body.replace(/\scontrolsList="nodownload"\scontrolsList="nodownload"/g, ' controlsList="nodownload"');
  return { body, replacements };
}

const files = (await walk(STOREFRONT_ROOT)).filter(file => file.endsWith('.html'));
let changedFiles = 0;
let totalReplacements = 0;

for (const file of files) {
  const before = await fs.readFile(file, 'utf8');
  const { body, replacements } = lockHtml(before, file);
  if (body === before) continue;
  await fs.writeFile(file, body);
  changedFiles += 1;
  totalReplacements += replacements;
}

console.log(JSON.stringify({
  ok: true,
  scannedFiles: files.length,
  changedFiles,
  replacements: totalReplacements,
  policy: 'artist-storefront static HTML no longer publishes raw creative audio, image, video, archive, or pics2vid package URLs'
}, null, 2));
