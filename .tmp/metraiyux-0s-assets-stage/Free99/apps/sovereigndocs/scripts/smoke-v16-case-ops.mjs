import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
const ROOT = process.cwd();
const ok = msg => console.log(`✅ ${msg}`);
const fail = msg => { console.error(`❌ ${msg}`); process.exitCode = 1; };
const must = rel => fs.existsSync(path.join(ROOT, rel)) ? ok(`${rel} exists`) : fail(`${rel} missing`);
for(const rel of [
  'server/case-experience.mjs',
  'data/case-intakes.json',
  'data/case-notes.json',
  'data/case-artifacts.json',
  'data/intake-blueprints.json',
  'intake-wizard/index.html',
  'case-timeline/index.html',
  'client-status/index.html',
  'reviewer-notes/index.html',
  'case-export/index.html',
  'work-queues/index.html'
]) must(rel);
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
if(!['16.0.0','17.0.0','18.0.0','19.0.0','20.0.0'].includes(pkg.version)) fail('package version is not v16'); else ok('package version is v16-v20');
const ui = fs.readFileSync(path.join(ROOT,'assets/workflow-ui.js'),'utf8');
for(const symbol of ['initIntakeWizard','initCaseTimeline','initClientStatus','initReviewerNotes','initCaseExport','initWorkQueues']){
  if(!ui.includes(symbol)) fail(`workflow UI missing ${symbol}`); else ok(`workflow UI exposes ${symbol}`);
}
function request(method, pathname, body){ return new Promise((resolve,reject)=>{ const payload = body ? JSON.stringify(body) : ''; const req=http.request({hostname:'127.0.0.1',port:8816,path:pathname,method,headers:{'content-type':'application/json','content-length':Buffer.byteLength(payload)},timeout:15000},res=>{const chunks=[];res.on('data',d=>chunks.push(d));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString('utf8'),body:Buffer.concat(chunks),headers:res.headers}));}); req.on('error',reject); req.on('timeout',()=>{req.destroy();reject(new Error('timeout'));}); if(payload) req.write(payload); req.end(); }); }
const get = p => request('GET', p);
const post = (p,b) => request('POST', p, b);
const server = spawn(process.execPath, ['server/sovereigndocs-server.mjs'], { cwd:ROOT, env:{...process.env, PORT:'8816', SOVEREIGNDOCS_DEFAULT_PLAN:'operator'}, stdio:['ignore','pipe','pipe'] });
try{
  await new Promise(resolve=>setTimeout(resolve,900));
  const health = JSON.parse((await get('/api/health')).text);
  if(!['16.0.0','17.0.0','18.0.0','19.0.0','20.0.0'].includes(health.version) || !health.codeCore?.caseTimeline || !health.codeCore?.workQueues) fail(`API health did not expose v16-v20 case ops: ${JSON.stringify(health.codeCore)}`); else ok('API health exposes v16-v20 case operations');
  for(const page of ['/intake-wizard/','/case-timeline/','/client-status/','/reviewer-notes/','/case-export/','/work-queues/']){
    const res = await get(page);
    if(res.status !== 200 || !res.text.includes('SovereignDocs')) fail(`${page} did not serve`); else ok(`${page} static page serves`);
  }
  const blueprints = JSON.parse((await get('/api/intake/blueprints')).text);
  if(!blueprints.blueprints?.length) fail('intake blueprints missing'); else ok('intake blueprints API works');
  const intakeResp = await post('/api/intake/start', {
    title:'v16 Smoke Intake',
    intakeType:'business-startup-intake',
    jurisdiction:'US-AZ',
    category:'business-formation',
    facts:{ businessName:'Smoke Case LLC', state:'AZ', entityType:'LLC' },
    acceptBoundary:true,
    readyForCase:true
  });
  const intake = JSON.parse(intakeResp.text);
  if(intakeResp.status !== 201 || !intake.intake?.id || !intake.recommendedTemplates?.length) fail(`intake start failed: ${intakeResp.text}`); else ok('intake creation recommends templates');
  const convertResp = await post(`/api/case-intakes/${encodeURIComponent(intake.intake.id)}/convert-to-case`, {
    templateIds:['US-AZ-finance-lending-receipt-template','US-AZ-business-formation-governance-single-member-llc-operating-agreement'],
    acceptBoundary:true,
    createPacket:true,
    answers:{ payor_name:'Smoke Payor', payee_name:'Smoke Payee', payment_amount:'16.00', company_name:'Smoke Case LLC' }
  });
  const converted = JSON.parse(convertResp.text);
  if(convertResp.status !== 201 || !converted.case?.id || !converted.launchUrl) fail(`intake conversion failed: ${convertResp.text}`); else ok('intake converts into end-to-end case');
  const caseId = converted.case.id;
  const noteResp = await post(`/api/cases/${encodeURIComponent(caseId)}/notes`, { visibility:'partner', noteType:'review_context', body:'Partner-visible smoke review note.' });
  const note = JSON.parse(noteResp.text);
  if(noteResp.status !== 201 || !note.note?.id) fail(`case note failed: ${noteResp.text}`); else ok('case note API creates partner-visible note');
  const artifactResp = await post(`/api/cases/${encodeURIComponent(caseId)}/artifacts`, { artifactType:'uploaded_document_metadata', title:'Smoke supporting file', filename:'smoke.pdf', mimeType:'application/pdf', sizeBytes:1600 });
  const artifact = JSON.parse(artifactResp.text);
  if(artifactResp.status !== 201 || !artifact.artifact?.id) fail(`case artifact failed: ${artifactResp.text}`); else ok('case artifact metadata API works');
  const timeline = JSON.parse((await get(`/api/cases/${encodeURIComponent(caseId)}/timeline`)).text);
  if(!timeline.items?.some(ev => ev.type === 'note') || !timeline.items?.some(ev => ev.type === 'artifact')) fail('timeline did not include note and artifact events'); else ok('case timeline includes notes and artifacts');
  const clientStatus = JSON.parse((await get(`/api/cases/${encodeURIComponent(caseId)}/client-status`)).text);
  if(!clientStatus.progress || clientStatus.boundaries?.notLegalAdvice !== true) fail('client status did not preserve safe boundaries/progress'); else ok('client-safe status API works');
  const partnerPacket = JSON.parse((await get(`/api/cases/${encodeURIComponent(caseId)}/partner-packet`)).text);
  if(!partnerPacket.markdown?.includes('Partner Review Packet') || !partnerPacket.markdown.includes('Partner-visible smoke review note')) fail('partner packet did not include review packet and partner note'); else ok('partner packet export includes partner-visible note');
  const bundle = JSON.parse((await get(`/api/cases/${encodeURIComponent(caseId)}/export-bundle`)).text);
  if(!bundle.timeline?.items?.length || !bundle.notes?.length || !bundle.artifacts?.length) fail('case export bundle missing timeline/notes/artifacts'); else ok('case export bundle includes full case context');
  const queues = JSON.parse((await get('/api/work-queues')).text);
  if(!queues.queues?.activeCases || !queues.queues?.intakesReady) fail('work queues missing expected queues'); else ok('operator work queues API works');
  const summary = JSON.parse((await get('/api/workspace/summary')).text);
  if(!('intakes' in summary.counts) || !('caseNotes' in summary.counts) || !('caseArtifacts' in summary.counts)) fail('workspace summary did not expose v16 counts'); else ok('workspace summary includes v16 operational counts');
  const ledger = JSON.parse((await get('/api/audit/ledger')).text);
  if(!ledger.ok || ledger.count < 6) fail('audit ledger did not verify after v16-v20 case operations'); else ok('audit ledger verifies v16 case operation events');
} catch(error){ fail(error.stack || error.message); }
finally{ server.kill('SIGTERM'); }
if(!process.exitCode) ok('SovereignDocs v16-v20 case operations smoke passed');
