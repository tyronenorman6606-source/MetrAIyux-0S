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
const outDir = arg('out', process.cwd());
if (!input) {
  console.error('Usage: node scripts/build-drop-growth-package.mjs --input=drop.json --out=/tmp/drop-growth');
  process.exit(1);
}

const drop = JSON.parse(await fs.readFile(input, 'utf8'));
const batch = { batchId: drop.batchId || 'manual-growth-package' };
const pkg = _internal.buildGrowthPackage(drop, batch);
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, 'seo.json'), JSON.stringify(pkg.seo, null, 2) + '\n', 'utf8');
await fs.writeFile(path.join(outDir, 'open-graph.json'), JSON.stringify(pkg.openGraph, null, 2) + '\n', 'utf8');
await fs.writeFile(path.join(outDir, 'twitter-card.json'), JSON.stringify(pkg.twitterCard, null, 2) + '\n', 'utf8');
await fs.writeFile(path.join(outDir, 'schema.json'), JSON.stringify(pkg.schema, null, 2) + '\n', 'utf8');
await fs.writeFile(path.join(outDir, 'launch-checklist.json'), JSON.stringify(pkg.launchChecklist, null, 2) + '\n', 'utf8');
await fs.writeFile(path.join(outDir, 'growth-guardrail-report.json'), JSON.stringify({ ok: true, guardrails: pkg.guardrails }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outputDir: outDir, package: pkg }, null, 2));
