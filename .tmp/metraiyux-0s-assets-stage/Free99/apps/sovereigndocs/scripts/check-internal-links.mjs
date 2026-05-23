import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const skipPrefixes=['templates/US-','build/US-'];
function walk(dir, out=[]){
  for(const ent of readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name); const rel=path.relative(ROOT,p).replaceAll('\\','/');
    if(ent.isDirectory()){
      if(['node_modules','.git'].includes(ent.name)) continue;
      if(skipPrefixes.some(prefix=>rel.startsWith(prefix))) continue;
      walk(p,out);
    } else if(ent.isFile() && ent.name.endsWith('.html')) out.push(p);
  }
  return out;
}
function hrefs(html){ return [...html.matchAll(/href=["']([^"']+)["']/g)].map(m=>m[1].split('#')[0].split('?')[0]).filter(Boolean); }
function targetFor(href){
  if(!href.startsWith('/') || href.startsWith('//')) return null;
  if(href === '/') return path.join(ROOT,'index.html');
  let t = path.join(ROOT, decodeURIComponent(href).replace(/^\//,''));
  if(href.endsWith('/')) return path.join(t,'index.html');
  if(existsSync(t) && statSync(t).isDirectory()) return path.join(t,'index.html');
  return t;
}
const unique=new Set(); let files=0;
for(const file of walk(ROOT)){
  files++;
  const html = await readFile(file,'utf8');
  for(const href of hrefs(html)) if(href.startsWith('/') && !href.startsWith('//')) unique.add(href);
}
const missing=[];
for(const href of unique){ const target=targetFor(href); if(target && !existsSync(target)) missing.push(href); }
if(missing.length){ console.error(JSON.stringify({ ok:false, files, uniqueLinks:unique.size, missingCount:missing.length, sample:missing.slice(0,100) }, null, 2)); process.exit(1); }
console.log(`✅ Internal link check passed (${unique.size} unique internal links checked across ${files} public/source pages; generated template pages covered by multipage smoke)`);
