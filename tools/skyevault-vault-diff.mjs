import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const rawArgs = process.argv.slice(2);

function argValue(name) {
  const prefix = `${name}=`;
  return rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

function resolveFile(value) {
  const clean = String(value || '').trim();
  if (!clean) throw new Error('Missing archive path.');
  return path.isAbsolute(clean) ? clean : path.resolve(root, clean);
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function unzipListing(file) {
  const output = execFileSync('unzip', ['-lv', file], { encoding: 'utf8' });
  const entries = [];
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d+)\s+\S+\s+(\d+)\s+\S+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+([0-9a-fA-F]{8})\s+(.+)$/);
    if (!match) continue;
    const [, size, compressedSize, crc, name] = match;
    if (!name || name.endsWith('/')) continue;
    entries.push({
      path: name.trim(),
      size: Number(size),
      compressedSize: Number(compressedSize),
      crc: crc.toLowerCase(),
      fingerprint: sha256Text(`${name}:${size}:${crc.toLowerCase()}`)
    });
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

function byPath(entries) {
  return new Map(entries.map((entry) => [entry.path, entry]));
}

const leftFile = resolveFile(argValue('--left') || rawArgs[0]);
const rightFile = resolveFile(argValue('--right') || rawArgs[1]);
if (!fs.existsSync(leftFile)) throw new Error(`Left archive not found: ${leftFile}`);
if (!fs.existsSync(rightFile)) throw new Error(`Right archive not found: ${rightFile}`);

const left = unzipListing(leftFile);
const right = unzipListing(rightFile);
const leftMap = byPath(left);
const rightMap = byPath(right);
const paths = [...new Set([...leftMap.keys(), ...rightMap.keys()])].sort();

const added = [];
const removed = [];
const changed = [];
const unchanged = [];

for (const filePath of paths) {
  const before = leftMap.get(filePath);
  const after = rightMap.get(filePath);
  if (!before) added.push(after);
  else if (!after) removed.push(before);
  else if (before.fingerprint !== after.fingerprint) changed.push({ path: filePath, before, after, sizeDelta: after.size - before.size });
  else unchanged.push(after);
}

const report = {
  schema: 'skyevault.vault-archive-diff.v1',
  generatedAt: new Date().toISOString(),
  left: {
    file: path.relative(root, leftFile).split(path.sep).join('/'),
    entries: left.length,
    bytes: fs.statSync(leftFile).size
  },
  right: {
    file: path.relative(root, rightFile).split(path.sep).join('/'),
    entries: right.length,
    bytes: fs.statSync(rightFile).size
  },
  summary: {
    added: added.length,
    removed: removed.length,
    changed: changed.length,
    unchanged: unchanged.length,
    fileDelta: right.length - left.length,
    archiveByteDelta: fs.statSync(rightFile).size - fs.statSync(leftFile).size
  },
  added,
  removed,
  changed
};

console.log(JSON.stringify(report, null, 2));
