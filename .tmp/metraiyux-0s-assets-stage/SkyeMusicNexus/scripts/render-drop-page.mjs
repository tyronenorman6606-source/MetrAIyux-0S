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
const out = arg('out', 'index.html');
if (!input) {
  console.error('Usage: node scripts/render-drop-page.mjs --input=drop.json --out=index.html');
  process.exit(1);
}

const drop = JSON.parse(await fs.readFile(input, 'utf8'));
const batch = { batchId: drop.batchId || 'manual-render' };
const growth = _internal.buildGrowthPackage(drop, batch);
const webCreator = _internal.buildWebCreatorPackage(drop, batch, growth);
await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true });
await fs.writeFile(out, _internal.renderDropPage(drop, batch, growth, webCreator), 'utf8');
console.log(JSON.stringify({ ok: true, output: out }, null, 2));
