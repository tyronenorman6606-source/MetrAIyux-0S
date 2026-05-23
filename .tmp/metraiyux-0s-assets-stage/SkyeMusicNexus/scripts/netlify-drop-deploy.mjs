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
const outDir = arg('dir');
if (!batchId || !outDir) {
  console.error('Usage: node scripts/netlify-drop-deploy.mjs --batch-id=batch_... --dir=/tmp/skye-musicnexus-drop-build/batch_...');
  process.exit(1);
}

const batch = _internal.loadBatches().find((item) => item.batchId === batchId) || { batchId };
const result = await _internal.publishNetlifyBundle(batch, outDir);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
