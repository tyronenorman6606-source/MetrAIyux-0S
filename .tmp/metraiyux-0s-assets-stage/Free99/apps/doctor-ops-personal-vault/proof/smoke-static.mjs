import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const requiredFiles = [
  'index.html',
  'app.html',
  'manifest.webmanifest',
  '_redirects',
  'netlify.toml',
  'assets/css/styles.css',
  'assets/js/catalog.js',
  'assets/js/platform.js',
  'assets/js/api-client.js',
  'assets/js/core.js',
  'server/doctor-ops-server.mjs',
  'server/storage-adapters.mjs',
  'contracts/api/local-runtime-api.md',
  'docs/LOCAL_PRIVACY_AND_BACKUP_GUIDE.md',
  'docs/SALEABLE_PRODUCT_POSITIONING.md',
  'docs/V4_LOCAL_VAULT_CLOSURE_REPORT.md',
  'docs/V5_VISUAL_OVERHAUL_REPORT.md',
  'docs/V6_WEBSITE_LOGO_LAUNCHER_REPORT.md',
  'assets/js/visuals.js',
  'assets/brand/doctor-ops-logo.png',
  'assets/brand/doctor-ops-logo.webp',
  'assets/brand/doctor-ops-advertising.png',
  'assets/brand/doctor-ops-advertising.webp',
  'assets/brand/doctor-ops-icon-192.png',
  'assets/brand/doctor-ops-icon-512.png',
  'contracts/workspace-seed.schema.json',
  'contracts/upstream-claim.example.json',
  'seed-packs/example-workspace-seed.json'
];
const failures = [];
const pass = [];

async function fileText(path){ return readFile(join(root, path), 'utf8'); }
function ok(condition, label, detail = ''){ (condition ? pass : failures).push({label, detail}); }

for (const file of requiredFiles) {
  try { const s = await stat(join(root, file)); ok(s.isFile(), `required file exists: ${file}`); }
  catch { ok(false, `required file exists: ${file}`); }
}

const catalogText = await fileText('assets/js/catalog.js');
const slugs = [...catalogText.matchAll(/"slug":\s*"([^"]+)"/g)].map(m => m[1]);
ok(slugs.length === 13, 'catalog registers 13 workflow apps', `found ${slugs.length}`);

const appFiles = await readdir(join(root, 'apps'));
ok(appFiles.filter(f => f.endsWith('.html')).length === 13, 'apps folder contains 13 html surfaces');

for (const slug of slugs) {
  const htmlPath = `apps/${slug}.html`;
  const jsPath = `assets/js/apps/${slug}.js`;
  const html = await fileText(htmlPath);
  const js = await fileText(jsPath);
  ok(html.includes('../assets/js/api-client.js'), `${htmlPath} loads optional API client`);
  ok(html.includes('../assets/js/visuals.js'), `${htmlPath} loads visual enhancement layer`);
  ok(html.includes('../assets/js/platform.js'), `${htmlPath} loads platform context`);
  ok(html.includes('../assets/js/core.js'), `${htmlPath} loads shared core`);
  ok(html.includes(`../assets/js/apps/${slug}.js`), `${htmlPath} loads matching app config`);
  ok(js.includes('window.DOCTOR_OPS.createApp'), `${jsPath} registers with platform core`);
  ok(/fields:\[/.test(js), `${jsPath} declares form fields`);
  ok(/sampleRecords:\[/.test(js), `${jsPath} includes synthetic seed record`);
  ok(/metrics:\(records/.test(js) || /metrics:\(records,/.test(js), `${jsPath} includes metrics function`);
  ok(/preview:\(rec/.test(js), `${jsPath} includes generated packet preview`);
}

const core = await fileText('assets/js/core.js');
[
  'Version history',
  'batch-status-update',
  'import-json',
  'readUpstreamClaim',
  'runtime-sync',
  'local file vault',
  'api-push-app',
  'workspace-strip',
  'qualityFor',
  'fingerprint',
  'createReceipt'
].forEach(term => ok(core.includes(term), `core contains ${term}`));

const platform = await fileText('assets/js/platform.js');
[
  'buildIndex',
  'exportWorkspace',
  'mergeWorkspace',
  'runtime-bridge',
  'collectWorkspacePayload',
  'upstreamClaim',
  'risk-list',
  'patient-index',
  'renderVault',
  'createBackup',
  'privacyStatus'
].forEach(term => ok(platform.includes(term), `dashboard contains ${term}`));


const apiClient = await fileText('assets/js/api-client.js');
['DOCTOR_OPS_API','health','privacyStatus','createBackup','restoreBackup','pushApp','pullApp','enqueue','executeAction'].forEach(term => ok(apiClient.includes(term), `api client contains ${term}`));

const server = await fileText('server/doctor-ops-server.mjs');
['/api/health','/api/privacy/status','/api/backups','api\\/apps','/api/import-workspace','/api/queue','/api/actions/execute','readUpstreamClaim'].forEach(term => ok(server.includes(term), `local API server contains ${term}`));

const storage = await fileText('server/storage-adapters.mjs');
['JsonFileStore','createBackup','restoreBackup','privacyStatus','upsertRecord','importRecords','enqueueTask','executeAction','pass-through-no-local-auth'].forEach(term => ok(storage.includes(term), `storage adapter contains ${term}`));

const index = await fileText('index.html');
[
  'Launch the app',
  'Doctor Ops Personal Vault',
  'assets/brand/doctor-ops-logo.webp',
  'assets/brand/doctor-ops-advertising.png',
  'workflow-showcase',
  'manifest.webmanifest',
  'app.html',
  'No external sync by default',
  'SoftwareApplication'
].forEach(term => ok(index.includes(term), `public website contains ${term}`));

const app = await fileText('app.html');
[
  'platform-dashboard',
  'export-workspace',
  'import-workspace',
  'runtime-bridge',
  'Local API bridge',
  'Local confidence vault',
  'create-backup',
  'Hot work queue',
  'Patient/workflow index',
  'Seed + backup contract',
  'product-topbar',
  'value-ribbon',
  'assets/brand/doctor-ops-logo.webp',
  'assets/js/visuals.js'
].forEach(term => ok(app.includes(term), `app command deck contains ${term}`));

const manifest = JSON.parse(await fileText('manifest.webmanifest'));
ok(manifest.start_url === 'app.html', 'web manifest launches directly into app.html');

const redirects = await fileText('_redirects');
['/app /app.html 200','/dashboard /app.html 200','/command-deck /app.html 200'].forEach(term => ok(redirects.includes(term), `_redirects contains ${term}`));

const css = await fileText('assets/css/styles.css');
['brand-mark','ambient-cursor','value-ribbon','workflow-ribbon','auroraDrift','product-topbar','landing-hero','workflow-showcase','doctor-ops-icon.webp'].forEach(term => ok(css.includes(term), `visual system contains ${term}`));
const visuals = await fileText('assets/js/visuals.js');
['visual-overhaul-ready','pointermove','ambient-cursor','requestAnimationFrame'].forEach(term => ok(visuals.includes(term), `visual enhancement script contains ${term}`));

const schema = JSON.parse(await fileText('contracts/workspace-seed.schema.json'));
ok(schema.required?.includes('workspace') && schema.required?.includes('apps'), 'workspace seed schema requires workspace and apps');

const seed = JSON.parse(await fileText('seed-packs/example-workspace-seed.json'));
ok(Boolean(seed.apps?.['intake-triage-ops']?.records?.length), 'example seed includes intake data');
ok(Boolean(seed.apps?.['referral-router']?.records?.length), 'example seed includes referral data');

if (failures.length) {
  console.error('❌ Doctor Ops Platform smoke failed');
  failures.forEach(f => console.error(`- ${f.label}${f.detail ? ` (${f.detail})` : ''}`));
  process.exit(1);
}

console.log('✅ Doctor Ops Platform smoke passed');
pass.forEach(p => console.log(`- ${p.label}${p.detail ? ` (${p.detail})` : ''}`));
