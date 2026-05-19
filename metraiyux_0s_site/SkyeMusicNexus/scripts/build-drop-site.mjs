#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { _internal } = require('../netlify/functions/music-drops.js');

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const batchId = arg('batch-id') || arg('batch');
if (!batchId) {
  console.error('Usage: node scripts/build-drop-site.mjs --batch-id=batch_...');
  process.exit(1);
}

const result = _internal.buildStaticBundle(batchId);
console.log(JSON.stringify({
  ok: true,
  batchId,
  outputDir: result.outDir,
  drops: result.drops.map((drop) => drop.dropId),
  catalog: result.catalog,
  packageReports: result.packageReports,
}, null, 2));
