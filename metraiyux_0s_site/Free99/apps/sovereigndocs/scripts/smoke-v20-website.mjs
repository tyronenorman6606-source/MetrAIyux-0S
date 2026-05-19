import fs from 'fs';
import path from 'path';
const root=process.cwd();
function ok(cond,msg){ if(!cond){ console.error(`❌ ${msg}`); process.exit(1); } console.log(`✅ ${msg}`); }
function read(rel){ return fs.readFileSync(path.join(root,rel),'utf8'); }
const pkg=JSON.parse(read('package.json'));
ok(pkg.version === '20.0.0','package version is 20.0.0');
const css=read('assets/styles.css');
ok(css.includes('SovereignDocs v20 website refresh'),'v20 website CSS marker exists');
for(const rel of ['index.html','start/index.html','solutions/index.html','trust/index.html','documents/index.html','how-it-works/index.html','pricing/index.html','business-formation/index.html','business-compliance/index.html','legal-review/index.html','partner-network/index.html']){
  const html=read(rel);
  ok(html.includes('sd-public-site'), `${rel} uses public website shell`);
  ok(html.includes('/assets/styles.css'), `${rel} keeps shared styles`);
  ok(!/template-library|questions\.json|document\.md|account-gateway ready|upstream-auth|fake firms|Stripe required/i.test(html), `${rel} has no public developer residue`);
}
ok(read('index.html').includes('SkyeDocxMax'), 'homepage routes users toward SkyeDocxMax editing');
ok(read('trust/index.html').includes('does not provide legal advice'), 'trust page preserves legal boundary');
ok(read('documents/index.html').includes('10,200'), 'documents page keeps library scale claim');
console.log('✅ SovereignDocs v20 website refresh smoke passed');
