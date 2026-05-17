#!/usr/bin/env node
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const seedDir = new URL('../seed-data/', import.meta.url);
const entries = await readdir(seedDir, { withFileTypes: true });
const files = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => name.endsWith('.json') && name !== 'manifest.json')
  .sort();

const manifest = {
  app: 'ConnectLog',
  generatedAt: new Date().toISOString(),
  purpose: 'Auto-generated manifest for redeploy-driven ConnectLog seed packs.',
  files
};

await writeFile(join(seedDir.pathname, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`ConnectLog seed manifest written with ${files.length} file(s).`);
