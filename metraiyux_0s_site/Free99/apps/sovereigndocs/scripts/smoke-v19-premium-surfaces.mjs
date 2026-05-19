import fs from 'fs';
import path from 'path';

const root = process.cwd();
function ok(cond,msg){ if(!cond){ console.error(`❌ ${msg}`); process.exit(1); } console.log(`✅ ${msg}`); }
function read(rel){ return fs.readFileSync(path.join(root,rel),'utf8'); }

const css = read('assets/styles.css');
const js = read('assets/workflow-ui.js');
const pkg = JSON.parse(read('package.json'));

ok(['19.0.0','20.0.0'].includes(pkg.version), 'package version is compatible with v19 surface checks');
ok(css.includes('SovereignDocs v19 premium surface alignment'), 'v19 premium CSS marker exists');
ok(css.includes('.sd-command-deck'), 'premium command deck styles exist');
ok(css.includes('.sd-premium-dock'), 'premium dock styles exist');
ok(css.includes('.workflow-table'), 'premium workflow table styles exist');
ok(css.includes('.empty-state'), 'premium empty state styles exist');
ok(js.includes('pointermove'), 'pointer halo support exists');
ok(js.includes('v19 premium surface alignment'), 'v19 premium JS marker exists');
ok(js.includes('initPremiumVisualSystem'), 'premium visual system initializer exists');
ok(js.includes('sd-command-deck'), 'premium command deck injection exists');
ok(js.includes('sd-premium-dock'), 'premium dock injection exists');
ok(js.includes('SkyeDocxMax handles serious document editing'), 'SkyeDocxMax editor boundary copy exists');

const pages = [
  'customer-dashboard/index.html',
  'case-command-center/index.html',
  'closure-dashboard/index.html',
  'partner-workbench/index.html',
  'intake-wizard/index.html',
  'packet-builder/index.html',
  'work-queues/index.html',
  'skye-docx-max/index.html'
];
for(const page of pages){
  const html = read(page);
  ok(html.includes('/assets/styles.css'), `${page} uses shared styles`);
  ok(html.includes('/assets/workflow-ui.js') || page === 'skye-docx-max/index.html', `${page} has workflow UI or editor launch wiring`);
  ok(!html.includes('v13 workflow surface'), `${page} stale v13 label removed`);
}

ok(fs.existsSync(path.join(root,'docs/V19_PREMIUM_SURFACES.md')), 'v19 premium surfaces doc exists');
ok(fs.existsSync(path.join(root,'BUILD_MANIFEST_V19.json')), 'v19 build manifest exists');
console.log('✅ SovereignDocs v19 premium surface smoke passed');
