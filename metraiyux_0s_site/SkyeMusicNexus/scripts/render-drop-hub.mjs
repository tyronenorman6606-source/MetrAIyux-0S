#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { _internal } = require('../netlify/functions/music-drops.js');

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const input = arg('input');
const out = arg('out', 'hub.html');
if (!input) {
  console.error('Usage: node scripts/render-drop-hub.mjs --input=drops.json --out=hub.html');
  process.exit(1);
}

const drops = JSON.parse(await fs.readFile(input, 'utf8'));
const list = Array.isArray(drops) ? drops : drops.drops || [];
const batch = { batchId: drops.batchId || 'manual-hub-render' };
await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true });
await fs.writeFile(out, _internal.renderHubPage(batch, list), 'utf8');
console.log(JSON.stringify({ ok: true, output: out, drops: list.length }, null, 2));
