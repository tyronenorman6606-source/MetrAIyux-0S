import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.cwd());
const lib = path.join(root, 'template-library');
const manifestPath = path.join(lib, 'manifest.json');
function fail(msg){ console.error(`❌ ${msg}`); process.exitCode = 1; }
function ok(msg){ console.log(`✅ ${msg}`); }
if(!fs.existsSync(manifestPath)){ fail('template-library/manifest.json missing'); process.exit(); }
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const records = manifest.records || [];
if(records.length !== 10200) fail(`Expected 10,200 v2.1 records, got ${records.length}`); else ok('10,200 v2.1 records indexed');
const categories = JSON.parse(fs.readFileSync(path.join(lib, 'categories.json'), 'utf8'));
const jurisdictions = JSON.parse(fs.readFileSync(path.join(lib, 'jurisdictions.json'), 'utf8'));
if(categories.length !== 15) fail(`Expected 15 categories, got ${categories.length}`); else ok('15 categories indexed');
if(jurisdictions.length !== 51) fail(`Expected 51 jurisdictions, got ${jurisdictions.length}`); else ok('51 jurisdictions indexed');
const ids = new Set(); const paths = new Set(); const sampleStep = Math.max(1, Math.floor(records.length / 500)); let checked = 0;
for(let i=0;i<records.length;i++){
  const r = records[i];
  if(ids.has(r.id)) fail(`Duplicate record id: ${r.id}`); ids.add(r.id);
  if(paths.has(r.path)) fail(`Duplicate record path: ${r.path}`); paths.add(r.path);
  if(!r.not_legal_advice && !String(r.status || '').includes('not_attorney')) {}
  const full = path.join(root, r.path);
  if(!fs.existsSync(full)) fail(`Record source missing: ${r.path}`);
  if(i % sampleStep === 0){
    checked++;
    const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
    if(raw.id !== r.id) fail(`ID mismatch for ${r.id}`);
    if(raw.not_legal_advice !== true) fail(`${r.id} missing not_legal_advice true`);
    if(raw.rights?.third_party_proprietary_text_used !== false) fail(`${r.id} rights ledger should reject proprietary text`);
    if(!Array.isArray(raw.questionnaire) || !raw.questionnaire.length) fail(`${r.id} missing questionnaire`);
    const q = new Set(raw.questionnaire.map(x => x.key || x.id));
    const text = raw.render_markdown || '';
    for(const m of text.matchAll(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g)){ if(!q.has(m[1])) fail(`${r.id} placeholder has no question key: ${m[1]}`); }
  }
}
ok(`${checked} sampled record files validated for source contract`);
if(!fs.existsSync(path.join(root, 'audit', 'publish-gates.json'))) fail('audit/publish-gates.json missing'); else ok('publish gates file exists');
if(!fs.existsSync(path.join(root, 'official-source-library', 'official-workflows.json'))) fail('official workflows file missing'); else ok('official workflows file exists');
if(!fs.existsSync(path.join(root, 'review-workflow', 'review-queue-high-risk.json'))) fail('high-risk review queue missing'); else ok('high-risk review queue exists');
if(!fs.existsSync(path.join(lib, 'state-overlays-v2', 'US-AZ.json'))) fail('Arizona overlay missing'); else ok('Arizona overlay exists');
if(!fs.existsSync(path.join(root, 'index.html'))) fail('index.html missing'); else ok('index.html exists');
if(!fs.existsSync(path.join(root, 'assets', 'multipage.js'))) fail('assets/multipage.js missing'); else ok('assets/multipage.js exists');
if(!process.exitCode) ok('SovereignDocs v6 template source smoke passed');
