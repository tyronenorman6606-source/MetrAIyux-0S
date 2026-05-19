import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const gates = JSON.parse(fs.readFileSync(path.join(ROOT,'audit/publish-gates.json'),'utf8'));
const baseForbidden = gates.forbidden_claims || [];
const forbidden = [...new Set([
  ...baseForbidden,
  'attorney-reviewed', 'attorney reviewed', 'lawyer-approved', 'lawyer approved', 'legally compliant', 'state-compliant', 'state compliant', 'court-ready', 'court ready', 'file directly', 'official filing', 'official submission', 'guaranteed enforceable', 'valid in all states'
])];
const scanExt = new Set(['.html','.js','.md','.xml','.txt']);
const skipDirs = new Set(['node_modules','.git','template-library','database']);
const allowedContext = /(?:not|no|never|without|blocked|blocks|cannot|do not|do not allow|do not summarize|do not claim|not safe to claim|forbidden|avoid|should not|does not|no attorney-client|not a law firm|still not claimed|not claimed|overclaims|claim gate|claims are governed|negative\/warning context)/i;
function walk(dir, out=[]){
  for(const entry of fs.readdirSync(dir, { withFileTypes:true })){
    if(skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if(entry.isDirectory()) walk(full, out);
    else if(scanExt.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}
let violations = [];
for(const file of walk(ROOT)){
  const rel = path.relative(ROOT,file);
  if(rel.startsWith('docs/')) continue;
  if(rel.startsWith('audit/') && !rel.endsWith('index.html')) continue;
  const text = fs.readFileSync(file,'utf8');
  const lower = text.toLowerCase();
  for(const phrase of forbidden){
    const p = phrase.toLowerCase();
    let idx = lower.indexOf(p);
    while(idx !== -1){
      const before = text.slice(Math.max(0, idx-120), idx);
      const after = text.slice(idx, Math.min(text.length, idx + p.length + 80));
      const context = (before + after).replace(/\s+/g,' ').slice(0,260);
      if(!allowedContext.test(context)) violations.push({ file:rel, phrase, context });
      idx = lower.indexOf(p, idx + p.length);
    }
  }
}
if(violations.length){
  console.error('❌ Public overclaim scan failed');
  console.error(JSON.stringify(violations.slice(0,25), null, 2));
  process.exit(1);
}
console.log(`✅ Public overclaim scan passed across public text/code surfaces with ${forbidden.length} forbidden claim patterns`);
