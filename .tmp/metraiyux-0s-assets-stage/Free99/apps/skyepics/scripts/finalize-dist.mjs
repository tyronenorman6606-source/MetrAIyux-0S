import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const builtEntry = path.join(dist, 'app-entry.html');
const indexEntry = path.join(dist, 'index.html');

if (fs.existsSync(builtEntry)) {
  fs.renameSync(builtEntry, indexEntry);
}

const index = fs.readFileSync(indexEntry, 'utf8');
if (!index.includes('id="root"') || !index.includes('/Free99/free99-gate.js')) {
  throw new Error('SkyePics dist/index.html is not the React app entry with the shared Free99 gate helper.');
}
