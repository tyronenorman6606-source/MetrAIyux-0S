import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const domain = process.env.SITE_URL || 'https://arizonagrowthindex.com';
function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p = path.join(dir,e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
const urls = walk(root).filter(p=>p.endsWith('.html')).map(p=>path.relative(root,p).replaceAll('\\','/')).sort();
const base = domain.replace(/\/$/,'');
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(u=>`<url><loc>${base}/${u === 'index.html' ? '' : u}</loc></url>`).join('\n') + '\n</urlset>';
fs.writeFileSync(path.join(root,'sitemap.xml'), xml);
console.log(`Generated sitemap with ${urls.length} URLs`);
