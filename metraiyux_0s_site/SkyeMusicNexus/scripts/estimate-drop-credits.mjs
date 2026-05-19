#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { _internal } = require('../netlify/functions/music-drops.js');

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const input = arg('input');
const dropIds = arg('drop-ids').split(',').map((item) => item.trim()).filter(Boolean);
const drops = input
  ? JSON.parse(await fs.readFile(input, 'utf8'))
  : _internal.loadDrops();

const selected = dropIds.length ? drops.filter((drop) => dropIds.includes(drop.dropId)) : drops;
console.log(JSON.stringify({ ok: true, estimate: _internal.estimateCreditsForDrops(selected) }, null, 2));
