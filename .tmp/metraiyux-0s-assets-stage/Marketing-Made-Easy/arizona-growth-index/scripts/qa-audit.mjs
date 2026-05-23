import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const bad = ['dev note','todo:','lorem ipsum','placeholder copy','AI notes'];
function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p = path.join(dir,e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
const files = walk(root);
const html = files.filter(f=>f.endsWith('.html'));
let errors = [];
for (const f of html) {
  const s = fs.readFileSync(f,'utf8');
  if (!/<title>[^<]{10,}/.test(s)) errors.push(`${f}: missing title`);
  if (!/<meta name="description" content="[^"]{40,}"/.test(s)) errors.push(`${f}: missing description`);
  for (const b of bad) if (s.toLowerCase().includes(b.toLowerCase())) errors.push(`${f}: forbidden phrase ${b}`);
  const refs = [...s.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(x=>!x.match(/^(https?:|mailto:|tel:|#)/));
  for (const r of refs) {
    const clean = r.split('?')[0];
    if (clean.endsWith('.html') || clean.includes('assets/')) {
      const target = path.resolve(path.dirname(f), clean);
      if (!fs.existsSync(target)) errors.push(`${f}: broken ref ${r}`);
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`QA passed for ${html.length} HTML files`);
