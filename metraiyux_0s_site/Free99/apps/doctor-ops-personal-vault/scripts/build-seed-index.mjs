import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const seedDir = new URL('../seed-packs/', import.meta.url);
const files = (await readdir(seedDir)).filter((file) => file.endsWith('.json') && file !== 'manifest.json');
const manifest = [];

for (const file of files) {
  const fullPath = join(seedDir.pathname, file);
  const json = JSON.parse(await readFile(fullPath, 'utf8'));
  const apps = Object.entries(json.apps || {}).map(([slug, appState]) => ({
    slug,
    records: Array.isArray(appState.records) ? appState.records.length : 0
  }));
  manifest.push({
    file,
    workspace: json.workspace?.id || 'unknown-workspace',
    name: json.workspace?.name || file,
    apps,
    totalRecords: apps.reduce((sum, app) => sum + app.records, 0)
  });
}

await writeFile(join(seedDir.pathname, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), seeds: manifest }, null, 2));
console.log(`Wrote seed-packs/manifest.json with ${manifest.length} seed pack(s).`);
