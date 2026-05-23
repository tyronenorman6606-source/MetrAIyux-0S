import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
function ok(message){ console.log(`✅ ${message}`); }
function fail(message){ console.error(`❌ ${message}`); process.exit(1); }
async function json(file){ return JSON.parse(await readFile(path.join(root,file),'utf8')); }
function assert(condition, message){ if(!condition) fail(message); ok(message); }

const required = [
  'server/runtime/tenant-scope.mjs',
  'server/runtime/route-registry.mjs',
  'server/routes/index.mjs',
  'server/routes/templates.routes.mjs',
  'server/routes/cases.routes.mjs',
  'server/routes/review.routes.mjs',
  'server/routes/partner.routes.mjs',
  'server/routes/commercial.routes.mjs',
  'server/routes/documents.routes.mjs',
  'server/routes/packets.routes.mjs',
  'server/routes/reminders.routes.mjs',
  'server/routes/editor.routes.mjs',
  'server/routes/billing.routes.mjs',
  'server/routes/storage.routes.mjs',
  'server/routes/audit.routes.mjs',
  'scripts/e2e-full-case-flow.mjs',
  'docs/V17_PREMIUM_CODE_COMPLETION.md',
  'BUILD_MANIFEST_V17.json'
];
for(const file of required) assert(existsSync(path.join(root,file)), `${file} exists`);
const routeFiles = (await readdir(path.join(root,'server/routes'))).filter(file => file.endsWith('.routes.mjs'));
assert(routeFiles.length >= 12, '12 modular route files exist');
const server = await readFile(path.join(root,'server/sovereigndocs-server.mjs'),'utf8');
assert(server.includes('handlePremiumRoute'), 'server dispatches through premium route registry');
assert(server.includes('tenantScopeFromSession'), 'server exposes tenant scope in workspace summary');
const tenant = await readFile(path.join(root,'server/runtime/tenant-scope.mjs'),'utf8');
assert(tenant.includes('canAccessTenantRecord'), 'tenant access helper exists');
const editor = await readFile(path.join(root,'server/editor-adapter.mjs'),'utf8');
assert(editor.includes('fieldMap'), 'SkyeDocxMax handoff includes fieldMap');
assert(editor.includes('sectionMap'), 'SkyeDocxMax handoff includes sectionMap');
assert(editor.includes('caseContext'), 'SkyeDocxMax handoff includes caseContext');
const workflowUi = await readFile(path.join(root,'assets/workflow-ui.js'),'utf8');
assert(workflowUi.includes('sdTable'), 'workflow UI has table renderer');
assert(workflowUi.includes('premium-open-skye'), 'workflow UI exposes Open in SkyeDocx Max action');
const manifest = await json('template-library/manifest.json');
assert((manifest.records||[]).length === 10200, '10,200 source-truth records still wired');

const proc = spawn(process.execPath, ['scripts/e2e-full-case-flow.mjs'], { cwd:root, stdio:'inherit', env:{...process.env, PORT:'8899'} });
await new Promise((resolve, reject) => { proc.on('exit', code => code === 0 ? resolve() : reject(new Error(`e2e smoke failed with ${code}`))); proc.on('error', reject); }).catch(error => fail(error.message));
ok('SovereignDocs v17 premium code smoke passed');
