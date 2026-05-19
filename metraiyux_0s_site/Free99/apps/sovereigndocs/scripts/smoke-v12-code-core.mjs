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
  'server/entitlements.mjs',
  'server/document-lifecycle.mjs',
  'server/packet-engine.mjs',
  'server/reminder-engine.mjs',
  'server/template-operations.mjs',
  'server/request-validation.mjs',
  'data/document-records.json',
  'data/packet-records.json',
  'data/reminders.json',
  'data/template-patch-requests.json'
]) must(rel);
const pkg = readJSON('package.json');
if(!['12.0.0','13.0.0','14.0.0','15.0.0','16.0.0','17.0.0','18.0.0','19.0.0','20.0.0'].includes(pkg.version)) fail('package version is not v12-v20 compatible'); else ok('package version is v12-v20 compatible');
const manifest = readJSON('template-library/manifest.json');
if((manifest.records || []).length !== 10200) fail('template count changed unexpectedly'); else ok('10,200 source-truth records still wired');
const lowId = (manifest.records || []).find(r=>r.risk_level === 'low')?.id;
const mediumId = (manifest.records || []).find(r=>r.risk_level === 'medium')?.id;
const highId = (manifest.records || []).find(r=>r.risk_level === 'high')?.id;
if(!lowId || !mediumId || !highId) fail('needed risk-level template IDs missing'); else ok('low/medium/high template IDs available');
function request(method, pathname, body){ return new Promise((resolve,reject)=>{ const payload = body ? JSON.stringify(body) : ''; const req=http.request({hostname:'127.0.0.1',port:8812,path:pathname,method,headers:{'content-type':'application/json','content-length':Buffer.byteLength(payload)},timeout:10000},res=>{const chunks=[];res.on('data',d=>chunks.push(d));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString('utf8'),body:Buffer.concat(chunks),headers:res.headers}));}); req.on('error',reject); req.on('timeout',()=>{req.destroy();reject(new Error('timeout'));}); if(payload) req.write(payload); req.end(); }); }
const get = p => request('GET', p);
const post = (p,b) => request('POST', p, b);
const server = spawn(process.execPath, ['server/sovereigndocs-server.mjs'], { cwd:ROOT, env:{...process.env, PORT:'8812', SOVEREIGNDOCS_DEFAULT_PLAN:'operator'}, stdio:['ignore','pipe','pipe'] });
try{
  await new Promise(resolve=>setTimeout(resolve,900));
  const health = JSON.parse((await get('/api/health')).text);
  if(!['12.0.0','13.0.0','14.0.0','15.0.0','16.0.0','17.0.0','18.0.0','19.0.0','20.0.0'].includes(health.version) || !health.codeCore?.documentLifecycle) fail('API health did not expose v12+ code core'); else ok('API health exposes v12+ code core');
  const entitlements = JSON.parse((await get('/api/entitlements')).text);
  if(!entitlements.ok || !entitlements.limits?.packetAssembly) fail('entitlement snapshot failed'); else ok('entitlement engine works');
  const created = await post('/api/documents/create-record', { templateId:lowId, acceptBoundary:true, answers:{ receipt_number:'R-001' } });
  const createdJSON = JSON.parse(created.text);
  if(created.status !== 201 || !createdJSON.document?.id) fail('document record creation failed'); else ok('document lifecycle creates records');
  const transitioned = await post(`/api/documents/${createdJSON.document.id}/transition`, { status:'ready_for_export', note:'smoke ready' });
  const transitionedJSON = JSON.parse(transitioned.text);
  if(transitioned.status !== 200 || transitionedJSON.document.status !== 'ready_for_export') fail('document transition failed'); else ok('document lifecycle transitions records');
  const invalidTransition = await post(`/api/documents/${createdJSON.document.id}/transition`, { status:'partner_review_in_progress' });
  if(invalidTransition.status !== 409) fail('invalid document transition was not blocked'); else ok('document lifecycle blocks invalid transitions');
  const packet = await post('/api/packets/assemble', { title:'Smoke Packet', templateIds:[lowId, highId], acceptBoundary:true, answersByTemplate:{ [lowId]:{}, [highId]:{} } });
  const packetJSON = JSON.parse(packet.text);
  if(packet.status !== 201 || !packetJSON.markdown?.includes('SovereignDocs packet export')) fail('packet assembly failed'); else ok('packet engine assembles multi-document packets');
  if(!packetJSON.renderedDocuments.find(d => d.exportClass === 'prep_worksheet')) fail('high-risk packet member did not downgrade to prep worksheet'); else ok('packet engine downgrades high-risk records to prep worksheet');
  const reminder = await post('/api/reminders', { title:'Smoke annual report reminder', dueDate:'2026-12-31', jurisdiction:'US-AZ', sourceType:'compliance' });
  const reminderJSON = JSON.parse(reminder.text);
  if(reminder.status !== 201 || !reminderJSON.reminder?.id) fail('reminder creation failed'); else ok('reminder engine creates reminders');
  const reminderDone = await post(`/api/reminders/${reminderJSON.reminder.id}/transition`, { status:'completed', note:'smoke complete' });
  if(reminderDone.status !== 200 || JSON.parse(reminderDone.text).reminder.status !== 'completed') fail('reminder transition failed'); else ok('reminder engine transitions reminders');
  const patchReq = await post('/api/templates/patch-requests', { templateId:mediumId, patch:{ review_note:'Smoke patch request', risk_level:'medium' }, reason:'behavioral smoke' });
  const patchJSON = JSON.parse(patchReq.text);
  if(patchReq.status !== 201 || !patchJSON.request?.id) fail('template patch request failed'); else ok('template operations queue accepts patch requests');
  const patchApproved = await post(`/api/templates/patch-requests/${patchJSON.request.id}/transition`, { status:'approved', note:'smoke approved' });
  if(patchApproved.status !== 200 || JSON.parse(patchApproved.text).request.status !== 'approved') fail('template patch transition failed'); else ok('template operations queue transitions patch requests');
  const docxFreeBlocked = await post('/api/documents/export-docx', { templateId:lowId, acceptBoundary:true, plan:'free' });
  if(docxFreeBlocked.status !== 402) fail('free plan DOCX quota was not enforced'); else ok('DOCX export entitlement/quota blocks free plan');
  const docs = JSON.parse((await get('/api/documents')).text);
  if(!docs.ok || docs.count < 1) fail('document list failed'); else ok('document list API returns lifecycle records');
  const ledger = JSON.parse((await get('/api/audit/ledger')).text);
  if(!ledger.ok || ledger.count < 6) fail('audit ledger did not verify after v12 flows'); else ok('append-only audit ledger verifies v12 code-core workflows');
} catch(error){ fail(error.stack || error.message); }
finally{ server.kill('SIGTERM'); }
if(!process.exitCode) ok('SovereignDocs v12 code-core smoke passed');
