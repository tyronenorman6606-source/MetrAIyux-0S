import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
const ROOT = process.cwd();
const ok = msg => console.log(`✅ ${msg}`);
const fail = msg => { console.error(`❌ ${msg}`); process.exitCode = 1; };
const must = rel => fs.existsSync(path.join(ROOT, rel)) ? ok(`${rel} exists`) : fail(`${rel} missing`);
for(const rel of [
  'server/editor-adapter.mjs',
  'data/editor-handoff-log.json',
  'data/editor-return-log.json'
]) must(rel);
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
if(!['14.0.0','15.0.0','16.0.0','17.0.0','18.0.0','19.0.0','20.0.0'].includes(pkg.version)) fail('package version is not v14-v20 compatible'); else ok('package version is v14-v20 compatible');
const adapter = fs.readFileSync(path.join(ROOT,'server/editor-adapter.mjs'),'utf8');
const removedEditorPath = ['skye-docx-max','app'].join('/');
if(!adapter.includes('/Marketing-Made-Easy/SkyeDocxMax/editor.html') || adapter.includes(removedEditorPath)) fail('SovereignDocs editor adapter is not canonical SkyeDocxMax only'); else ok('SovereignDocs adapter points to canonical SkyeDocxMax only');
function request(method, pathname, body){ return new Promise((resolve,reject)=>{ const payload = body ? JSON.stringify(body) : ''; const req=http.request({hostname:'127.0.0.1',port:8814,path:pathname,method,headers:{'content-type':'application/json','content-length':Buffer.byteLength(payload)},timeout:10000},res=>{const chunks=[];res.on('data',d=>chunks.push(d));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString('utf8'),body:Buffer.concat(chunks),headers:res.headers}));}); req.on('error',reject); req.on('timeout',()=>{req.destroy();reject(new Error('timeout'));}); if(payload) req.write(payload); req.end(); }); }
const get = p => request('GET', p);
const post = (p,b) => request('POST', p, b);
const server = spawn(process.execPath, ['server/sovereigndocs-server.mjs'], { cwd:ROOT, env:{...process.env, PORT:'8814', SOVEREIGNDOCS_DEFAULT_PLAN:'operator'}, stdio:['ignore','pipe','pipe'] });
try{
  await new Promise(resolve=>setTimeout(resolve,900));
  const health = JSON.parse((await get('/api/health')).text);
  if(!['14.0.0','15.0.0','16.0.0','17.0.0','18.0.0','19.0.0','20.0.0'].includes(health.version)) fail('API health did not expose v14-v20'); else ok('API health exposes v14-v20');
  const config = JSON.parse((await get('/api/editor/skye-docx-max/config')).text);
  if(config.bundledSkyeDocxMax || config.appPath !== '/Marketing-Made-Easy/SkyeDocxMax/editor.html') fail('SkyeDocxMax config does not expose canonical 0S editor'); else ok('SkyeDocxMax config exposes canonical 0S editor');
  const handoffResp = await post('/api/editor/skye-docx-max/session', { title:'v14 Smoke Integrated Handoff', markdown:'# v14 Smoke\n\nSkyeDocxMax integrated runtime proof.', metadata:{ smoke:true, source:'v14-smoke' } });
  const handoff = JSON.parse(handoffResp.text);
  if(handoffResp.status !== 201 || !handoff.handoff?.id || !handoff.launchUrl?.includes('/Marketing-Made-Easy/SkyeDocxMax/editor.html') || !handoff.launchUrl?.includes('sd_handoff=')) fail('integrated handoff did not produce canonical launch URL'); else ok('integrated handoff creates canonical launch URL');
  const fetched = JSON.parse((await get(`/api/editor/skye-docx-max/session/${encodeURIComponent(handoff.handoff.id)}`)).text);
  if(!fetched.ok || fetched.handoff.markdown.indexOf('SkyeDocxMax integrated runtime proof') === -1) fail('full handoff payload was not persisted/retrievable'); else ok('full handoff payload persists and retrieves');
  const opened = JSON.parse((await post(`/api/editor/skye-docx-max/session/${encodeURIComponent(handoff.handoff.id)}/opened`, { activeDocId:'doc_smoke' })).text);
  if(!opened.ok || !opened.auditId) fail('handoff opened audit failed'); else ok('handoff opened audit works');
  const returned = await post('/api/editor/skye-docx-max/return', { handoffId:handoff.handoff.id, activeDocId:'doc_smoke', title:'v14 Edited Return', html:'<h1>Edited Return</h1><p>Returned from SkyeDocxMax.</p>', text:'Edited Return Returned from SkyeDocxMax.', metadata:{ smokeReturn:true } });
  const returnedJSON = JSON.parse(returned.text);
  if(returned.status !== 201 || !returnedJSON.returned?.id || !returnedJSON.returned?.documentId) fail('SkyeDocxMax return package failed'); else ok('SkyeDocxMax return package creates SovereignDocs record');
  const docs = JSON.parse((await get('/api/documents')).text);
  if(!docs.items?.some(d => d.id === returnedJSON.returned.documentId || d.title === 'v14 Edited Return')) fail('returned editor package did not surface in document lifecycle records'); else ok('returned editor package surfaces in document lifecycle records');
  const ledger = JSON.parse((await get('/api/audit/ledger')).text);
  if(!ledger.ok || ledger.count < 3) fail('audit ledger did not verify after v14 editor integration'); else ok('audit ledger verifies v14 editor events');
} catch(error){ fail(error.stack || error.message); }
finally{ server.kill('SIGTERM'); }
if(!process.exitCode) ok('SovereignDocs v14 SkyeDocxMax integration smoke passed');
