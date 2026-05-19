import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
const root=process.cwd();
function ok(m){ console.log(`✅ ${m}`); }
function fail(m){ console.error(`❌ ${m}`); process.exit(1); }
function assert(c,m){ if(!c) fail(m); ok(m); }
const required=['server/runtime/closure-guards.mjs','server/routes/cases-v18.routes.mjs','server/routes/editor-v18.routes.mjs','server/routes/workspace-v18.routes.mjs','scripts/e2e-v18-closure-flow.mjs','docs/V18_CLOSURE_WORK.md','BUILD_MANIFEST_V18.json','closure-dashboard/index.html'];
for(const file of required) assert(existsSync(path.join(root,file)), `${file} exists`);
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
assert(['18.0.0','19.0.0','20.0.0'].includes(pkg.version),'package version is v18-v20 compatible');
const routeIndex=await readFile(path.join(root,'server/routes/index.mjs'),'utf8');
assert(routeIndex.includes('cases-v18.routes') && routeIndex.includes('editor-v18.routes') && routeIndex.includes('workspace-v18.routes'),'v18 route modules are registered');
const guards=await readFile(path.join(root,'server/runtime/closure-guards.mjs'),'utf8');
assert(guards.includes('requireTenantWrite') && guards.includes('assertOwnedOrPrivileged'),'tenant closure guards exist');
const editor=await readFile(path.join(root,'server/editor-adapter.mjs'),'utf8');
assert(editor.includes('returnContract') && editor.includes('workflowAnchors') && editor.includes("integrationVersion:'v18'"),'SkyeDocxMax handoff has v18 return contract and workflow anchors');
const ui=await readFile(path.join(root,'assets/workflow-ui.js'),'utf8');
assert(ui.includes('initClosureDashboard') && ui.includes('premium-open-skye-v18'),'v18 closure UI helpers exist');
const server=await readFile(path.join(root,'server/sovereigndocs-server.mjs'),'utf8');
assert(server.includes('CASE_RECORDS_FILE') && server.includes('EDITOR_RETURN_LOG_FILE'),'premium route context exposes v18 write targets');
const proc=spawn(process.execPath,['scripts/e2e-v18-closure-flow.mjs'],{cwd:root,stdio:'inherit',env:{...process.env,PORT:'8898'}});
await new Promise((resolve,reject)=>{proc.on('exit',code=>code===0?resolve():reject(new Error(`v18 e2e failed ${code}`))); proc.on('error',reject);}).catch(e=>fail(e.message));
ok('SovereignDocs v18 closure smoke passed');
