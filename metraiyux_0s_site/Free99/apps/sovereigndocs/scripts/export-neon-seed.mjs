import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT,'template-library/manifest.json'),'utf8'));
const outDir = path.join(ROOT,'database/neon/chunks');
fs.mkdirSync(outDir, { recursive:true });
const chunkSize = Number(process.env.CHUNK_SIZE || 500);
let chunk = [];
let chunkNo = 0;
const allRows = [];
function lane(r){ return r.risk_level === 'high' ? 'admin_review_only' : r.risk_level === 'medium' ? 'public_gated_draft' : r.risk_level === 'low' ? 'public_draft' : 'manual_triage'; }
function normalized(rec){
  return {
    id:rec.id,
    base_id:rec.base_id,
    slug:(rec.base_id || '').split('/').pop(),
    title:rec.title,
    category_slug:rec.category_slug,
    category_name:rec.category_name,
    jurisdiction_id:rec.jurisdiction_id,
    state_code:rec.state_code,
    state_name:rec.state_name,
    risk_level:rec.risk_level,
    status:rec.status,
    checksum:rec.checksum,
    path:rec.path,
    publish_lane:lane(rec),
    public_export_allowed: rec.risk_level === 'low' || rec.risk_level === 'medium',
    prep_export_allowed: rec.risk_level === 'high',
    source_truth:'v2.1-confidence-review-library',
    activation_policy:'v8-enforced-by-policy-engine'
  };
}
function flush(){
  if(!chunk.length) return;
  const file = path.join(outDir, `templates-${String(chunkNo).padStart(3,'0')}.ndjson`);
  fs.writeFileSync(file, chunk.map(JSON.stringify).join('\n')+'\n');
  console.log(`✅ wrote ${path.relative(ROOT,file)} (${chunk.length} rows)`);
  chunk = [];
  chunkNo++;
}
for(const rec of manifest.records || []){
  const row = normalized(rec);
  allRows.push(row);
  chunk.push(row);
  if(chunk.length >= chunkSize) flush();
}
flush();
fs.writeFileSync(path.join(ROOT,'database/neon/v8-template-records.ndjson'), allRows.map(JSON.stringify).join('\n')+'\n');
fs.writeFileSync(path.join(outDir,'README.md'), `# SovereignDocs v8 Neon Seed Chunks\n\nGenerated from template-library/manifest.json. Each NDJSON row is a normalized template index record and does not claim legal review. High-risk records are seeded as admin-review-only with prep worksheet only until review decisions allow otherwise.\n\nChunk size: ${chunkSize}\nChunks: ${chunkNo}\nRecords: ${(manifest.records||[]).length}\n`);
console.log(`✅ exported ${(manifest.records||[]).length} records into ${chunkNo} chunks and database/neon/v8-template-records.ndjson`);
