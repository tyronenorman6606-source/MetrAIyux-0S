import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const ROOT = process.cwd();
const requiredFiles = ['index.html','documents/index.html','builder/index.html','workspace/index.html','vault/index.html','audit/index.html','api/index.html','assets/app.js','assets/multipage.js','assets/styles.css','template-library/manifest.json','template-library/categories.json','template-library/jurisdictions.json','audit/publish-gates.json','official-source-library/official-workflows.json','review-workflow/review-queue-high-risk.json','template-library/state-overlays-v2/US-AZ.json','server/sovereigndocs-server.mjs','scripts/build-search-index.mjs','scripts/smoke-v6-source-truth.mjs','docs/V6_SOURCE_OF_TRUTH_MERGE.md','manifest.webmanifest','service-worker.js'];
const fail = message => { console.error(`❌ ${message}`); process.exitCode = 1; };
const ok = message => console.log(`✅ ${message}`);
for(const file of requiredFiles){ try{ await stat(path.join(ROOT, file)); ok(`${file} exists`); } catch{ fail(`${file} missing`); } }
const manifest = JSON.parse(await readFile(path.join(ROOT, 'template-library/manifest.json'), 'utf8'));
const categories = JSON.parse(await readFile(path.join(ROOT, 'template-library/categories.json'), 'utf8'));
const jurisdictions = JSON.parse(await readFile(path.join(ROOT, 'template-library/jurisdictions.json'), 'utf8'));
const records = manifest.records || [];
if(records.length !== 10200) fail(`Expected 10,200 records, got ${records.length}`); else ok('10,200 records validated');
if(categories.length !== 15) fail(`Expected 15 categories, got ${categories.length}`); else ok('15 categories validated');
if(jurisdictions.length !== 51) fail(`Expected 51 jurisdictions, got ${jurisdictions.length}`); else ok('51 jurisdictions validated');
const ids = new Set(); let missingFiles = 0;
for(const r of records){
  if(ids.has(r.id)) fail(`duplicate template record id: ${r.id}`); ids.add(r.id);
  try{ await stat(path.join(ROOT, r.path)); } catch{ missingFiles += 1; }
}
if(missingFiles) fail(`${missingFiles} record source files missing`); else ok('All v2.1 record source files exist');
const html = await readFile(path.join(ROOT, 'index.html'), 'utf8');
for(const hook of ['/documents/','/builder/','/vault/','/official-sources/','/review-queue/','/not-legal-advice/']) if(!html.includes(hook)) fail(`homepage missing link: ${hook}`);
if(!html.includes('manifest.webmanifest')) fail('index.html is not wired to web manifest');
if(!html.includes('Document library and workflow hub')) fail('homepage missing client-facing document library hub section');
if(!process.exitCode) ok('SovereignDocs platform smoke passed');
