import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const internalPrefixes = ['admin/','ops/','operator-manual/','publisher-console/','review-studio/','official-workflow-studio/','migration-center/','source-truth/','template-governance/','review-queue/','audit/','audit-ledger/','data-room/','developer-api/','api/','docs/'];
const generatedPrefixes = ['templates/US-','build/US-'];
const bannedVisible = [/\bv10\b/i,/\bv9\b/i,/source-truth/i,/operator routes/i,/smoke/i,/proof ledger/i,/runtime source/i,/upstream-auth/i,/fake success/i];
function walk(dir, out=[]){
  for(const ent of readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name); const rel=path.relative(ROOT,p).replaceAll('\\','/');
    if(ent.isDirectory()){
      if(['node_modules','.git'].includes(ent.name)) continue;
      if(internalPrefixes.some(prefix=>rel === prefix.slice(0,-1) || rel.startsWith(prefix))) continue;
      if(generatedPrefixes.some(prefix=>rel.startsWith(prefix))) continue;
      walk(p,out);
    } else if(ent.isFile() && ent.name.endsWith('.html')) out.push(p);
  }
  return out;
}
function stripTags(s){ return s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '); }
const offenders=[]; let scanned=0;
for(const file of walk(ROOT)){
  const rel=path.relative(ROOT,file).replaceAll('\\','/');
  const html=await readFile(file,'utf8');
  const visible=stripTags(html); scanned++;
  for(const rx of bannedVisible){ if(rx.test(visible)) offenders.push({ file:rel, pattern:String(rx) }); }
}
if(offenders.length){ console.error(JSON.stringify({ ok:false, scanned, offenders:offenders.slice(0,80), total:offenders.length }, null, 2)); process.exit(1); }
console.log(`✅ Public copy scan passed (${scanned} public/static pages scanned; generated state/template pages excluded from slow full scan)`);
