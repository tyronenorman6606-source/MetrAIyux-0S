import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
const ROOT = process.cwd();
const ok = msg => console.log(`✅ ${msg}`);
const fail = msg => { console.error(`❌ ${msg}`); process.exitCode = 1; };
const readJSON = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const must = rel => fs.existsSync(path.join(ROOT, rel)) ? ok(`${rel} exists`) : fail(`${rel} missing`);
for(const rel of [
  'customer-dashboard/index.html',
  'packet-builder/index.html',
  'reminders/index.html',
  'partner-workbench/index.html',
  'template-ops/index.html',
  'skye-docx-max/index.html',
  'assets/workflow-ui.js',
  'server/editor-adapter.mjs',
  'data/editor-handoff-log.json'
]) must(rel);
const pkg = readJSON('package.json');
if(!['13.0.0','14.0.0','15.0.0','16.0.0','17.0.0','18.0.0','19.0.0','20.0.0'].includes(pkg.version)) fail('package version is not v13-v20 compatible'); else ok(`package version is ${pkg.version}`);
const sw = fs.readFileSync(path.join(ROOT,'service-worker.js'),'utf8');
if(!/sovereigndocs-v(1[3456789]|20)/.test(sw)) fail('service worker cache is not v13-v20 compatible'); else ok('service worker cache is v13-v20 compatible');
const manifest = readJSON('template-library/manifest.json');
if((manifest.records || []).length !== 10200) fail('template count changed unexpectedly'); else ok('10,200 source-truth records still wired');
const lowId = (manifest.records || []).find(r=>r.risk_level === 'low')?.id;
const mediumId = (manifest.records || []).find(r=>r.risk_level === 'medium')?.id;
const highId = (manifest.records || []).find(r=>r.risk_level === 'high')?.id;
if(!lowId || !mediumId || !highId) fail('needed risk-level template IDs missing'); else ok('low/medium/high records available');
function request(method, pathname, body){ return new Promise((resolve,reject)=>{ const payload = body ? JSON.stringify(body) : ''; const req=http.request({hostname:'127.0.0.1',port:8813,path:pathname,method,headers:{'content-type':'application/json','content-length':Buffer.byteLength(payload)},timeout:10000},res=>{const chunks=[];res.on('data',d=>chunks.push(d));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString('utf8'),body:Buffer.concat(chunks),headers:res.headers}));}); req.on('error',reject); req.on('timeout',()=>{req.destroy();reject(new Error('timeout'));}); if(payload) req.write(payload); req.end(); }); }
const get = p => request('GET', p);
const post = (p,b) => request('POST', p, b);
const server = spawn(process.execPath, ['server/sovereigndocs-server.mjs'], { cwd:ROOT, env:{...process.env, PORT:'8813', SOVEREIGNDOCS_DEFAULT_PLAN:'operator'}, stdio:['ignore','pipe','pipe'] });
try{
  await new Promise(resolve=>setTimeout(resolve,900));
  const health = JSON.parse((await get('/api/health')).text);
  if(!['13.0.0','14.0.0','15.0.0','16.0.0','17.0.0','18.0.0','19.0.0','20.0.0'].includes(health.version) || !health.codeCore?.packetAssembly) fail('API health did not expose v13-v20 code core'); else ok('API health exposes v13-v20 code core');
  const summary = JSON.parse((await get('/api/workspace/summary')).text);
  if(!['13.0.0','14.0.0','15.0.0','16.0.0','17.0.0','18.0.0','19.0.0','20.0.0'].includes(summary.version) || !summary.counts || !Array.isArray(summary.nextActions)) fail('workspace summary failed'); else ok('workspace summary API works');
  const config = JSON.parse((await get('/api/editor/skye-docx-max/config')).text);
  if(!config.ok || config.editor !== 'SkyeDocx Max') fail('SkyeDocx Max config failed'); else ok('SkyeDocx Max config works');
  const handoff = await post('/api/editor/skye-docx-max/session', { title:'Smoke SkyeDocx Handoff', markdown:'# Smoke\n\nEditor slot proof.', metadata:{ smoke:true } });
  const handoffJSON = JSON.parse(handoff.text);
  if(handoff.status !== 201 || !handoffJSON.handoff?.id || handoffJSON.handoff.target !== 'SkyeDocx Max') fail('SkyeDocx Max handoff failed'); else ok('SkyeDocx Max handoff creates payload');
  const packet = await post('/api/packets/assemble', { title:'v13 Smoke Packet', templateIds:[lowId, highId], acceptBoundary:true, answersByTemplate:{ [lowId]:{}, [highId]:{} } });
  const packetJSON = JSON.parse(packet.text);
  if(packet.status !== 201 || !packetJSON.renderedDocuments?.some(d => d.exportClass === 'prep_worksheet')) fail('packet builder behavior failed'); else ok('packet builder behavior works and downgrades high-risk items');
  const reminder = await post('/api/reminders', { title:'v13 smoke reminder', dueDate:'2026-12-31', jurisdiction:'US-AZ', sourceType:'manual' });
  const reminderJSON = JSON.parse(reminder.text);
  if(reminder.status !== 201 || !reminderJSON.reminder?.id) fail('reminder creation failed'); else ok('reminder center create behavior works');
  const reminderDone = await post(`/api/reminders/${reminderJSON.reminder.id}/transition`, { status:'completed', note:'v13 smoke complete' });
  if(reminderDone.status !== 200 || JSON.parse(reminderDone.text).reminder.status !== 'completed') fail('reminder transition failed'); else ok('reminder center transition behavior works');
  const review = await post('/api/legal-review/submit', { templateId:highId, acceptBoundary:true, acceptPartnerReviewTerms:true, acceptNoGuarantee:true, acceptNoSovereignDocsLiabilityForOutcome:true, acceptUserFactsResponsibility:true, reviewScope:'v13 partner workbench smoke', servicePlanId:'basic_packet_review_request', contact:{ email:'smoke@example.test' } });
  const reviewJSON = JSON.parse(review.text);
  if(review.status !== 201 || !reviewJSON.receiptId) fail('partner review submission failed'); else ok('partner review submission works');
  const routed = await post(`/api/legal-review/submissions/${reviewJSON.receiptId}/route`, { partnerId:'smoke-legal-partner', routingNote:'v13 workbench route' });
  if(routed.status !== 200 || JSON.parse(routed.text).submission.status !== 'routed_to_partner') fail('partner workbench route failed'); else ok('partner workbench route behavior works');
  const returned = await post(`/api/legal-review/submissions/${reviewJSON.receiptId}/partner-update`, { status:'partner_review_returned', note:'v13 workbench return' });
  if(returned.status !== 200 || JSON.parse(returned.text).submission.status !== 'partner_review_returned') fail('partner workbench partner-update failed'); else ok('partner workbench update behavior works');
  const patchReq = await post('/api/templates/patch-requests', { templateId:mediumId, patch:{ review_note:'v13 smoke patch' }, reason:'v13 workflow smoke' });
  const patchJSON = JSON.parse(patchReq.text);
  if(patchReq.status !== 201 || !patchJSON.request?.id) fail('template ops patch request failed'); else ok('template ops patch request works');
  const approved = await post(`/api/templates/patch-requests/${patchJSON.request.id}/transition`, { status:'approved', note:'v13 approved' });
  if(approved.status !== 200 || JSON.parse(approved.text).request.status !== 'approved') fail('template ops approve failed'); else ok('template ops approve behavior works');
  const applied = await post(`/api/templates/patch-requests/${patchJSON.request.id}/apply`, { note:'v13 apply override smoke' });
  if(applied.status !== 200 || !JSON.parse(applied.text).override?.id) fail('template ops apply override failed'); else ok('template ops apply override behavior works');
  const search = JSON.parse((await get(`/api/templates/search?q=${encodeURIComponent(mediumId)}&pageSize=1`)).text);
  if(!search.items?.length || !('review_note' in search.items[0])) fail('template override did not surface in search'); else ok('applied template override surfaces through search adapter');
  const ledger = JSON.parse((await get('/api/audit/ledger')).text);
  if(!ledger.ok || ledger.count < 8) fail('audit ledger did not verify after v13 workflows'); else ok('append-only audit ledger verifies v13 workflow events');
} catch(error){ fail(error.stack || error.message); }
finally{ server.kill('SIGTERM'); }
if(!process.exitCode) ok('SovereignDocs v13 workflow-surface smoke passed');
