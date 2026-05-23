import { cp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INBOX = path.join(ROOT, 'seed-inbox');
const LIB = path.join(ROOT, 'template-library');
const manifestPath = path.join(LIB, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

async function walk(dir){
  const entries = await readdir(dir, { withFileTypes: true });
  const found = [];
  for(const entry of entries){
    if(entry.name.startsWith('_')) continue;
    const full = path.join(dir, entry.name);
    if(entry.isDirectory()){
      if(existsSync(path.join(full, 'template.json')) && existsSync(path.join(full, 'questions.json')) && existsSync(path.join(full, 'document.md'))){
        found.push(full);
      }else{
        found.push(...await walk(full));
      }
    }
  }
  return found;
}

const folders = existsSync(INBOX) ? await walk(INBOX) : [];
let imported = 0;
for(const source of folders){
  const meta = JSON.parse(await readFile(path.join(source, 'template.json'), 'utf8'));
  const category = meta.category || path.basename(path.dirname(source));
  const id = meta.id || path.basename(source);
  const dest = path.join(LIB, category, id);
  await cp(source, dest, { recursive: true, force: true });
  if(!existsSync(path.join(dest, 'preview.md'))) await writeFile(path.join(dest, 'preview.md'), await readFile(path.join(dest, 'document.md'), 'utf8'));
  if(!existsSync(path.join(dest, 'disclaimer.md'))) await writeFile(path.join(dest, 'disclaimer.md'), `# Required Boundary\n\nSovereignDocs provides self-help document automation only and does not provide legal advice.\n`);
  if(!manifest.categories.some(c => c.id === category)){
    manifest.categories.push({ id: category, name: category.replaceAll('-', ' ').replace(/\b\w/g, m => m.toUpperCase()), description: 'Imported template category.' });
  }
  const record = {
    id,
    category,
    title: meta.title || id,
    folder: `${category}/${id}`,
    riskLevel: meta.riskLevel || 'medium',
    jurisdictionSensitive: !!meta.jurisdictionSensitive,
    formats: meta.outputFormats || ['markdown', 'word-compatible-doc', 'print-to-pdf'],
    tags: meta.tags || [category, 'imported'],
    estimatedCompletionMinutes: meta.estimatedCompletionMinutes || 8
  };
  const index = manifest.templates.findIndex(t => t.id === id);
  if(index >= 0) manifest.templates[index] = record;
  else manifest.templates.push(record);
  imported += 1;
}

manifest.version = manifest.version || '1.0.0';
manifest.lastUpdated = new Date().toISOString().slice(0, 10);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`✅ Imported/updated ${imported} templates from seed-inbox/`);
if(imported === 0){
  console.log('Drop complete template folders into seed-inbox/<category>/<template-id>/, then rerun this script.');
}
