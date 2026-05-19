import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
const ROOT = process.cwd();
const ok = msg => console.log(`✅ ${msg}`);
const fail = msg => { console.error(`❌ ${msg}`); process.exitCode = 1; };
const must = rel => fs.existsSync(path.join(ROOT, rel)) ? ok(`${rel} exists`) : fail(`${rel} missing`);
for(const rel of [
  'server/case-workflows.mjs',
  'case-command-center/index.html',
  'assets/workflow-ui.js',
  'data/case-records.json',
  'skye-docx-max/app/sd-bridge.js'
]) must(rel);
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
if(!['15.0.0','16.0.0','17.0.0','18.0.0','19.0.0','20.0.0'].includes(pkg.version)) fail('package version is not v15-v20'); else ok('package version is v15-v20 compatible');
const page = fs.readFileSync(path.join(ROOT,'case-command-center/index.html'),'utf8');
if(!page.includes('SDWorkflow.initCaseCommandCenter') || !page.includes('/api/cases/start')) fail('case command center is not wired to case workflow API'); else ok('case command center is wired');
const ui = fs.readFileSync(path.join(ROOT,'assets/workflow-ui.js'),'utf8');
if(!ui.includes('initCaseCommandCenter') || !ui.includes('/api/cases/start')) fail('workflow UI lacks case command behavior'); else ok('workflow UI exposes case command behavior');

function request(method, pathname, body){ return new Promise((resolve,reject)=>{ const payload = body ? JSON.stringify(body) : ''; const req=http.request({hostname:'127.0.0.1',port:8815,path:pathname,method,headers:{'content-type':'application/json','content-length':Buffer.byteLength(payload)},timeout:15000},res=>{const chunks=[];res.on('data',d=>chunks.push(d));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString('utf8'),body:Buffer.concat(chunks),headers:res.headers}));}); req.on('error',reject); req.on('timeout',()=>{req.destroy();reject(new Error('timeout'));}); if(payload) req.write(payload); req.end(); }); }
const get = p => request('GET', p);
const post = (p,b) => request('POST', p, b);
const server = spawn(process.execPath, ['server/sovereigndocs-server.mjs'], { cwd:ROOT, env:{...process.env, PORT:'8815', SOVEREIGNDOCS_DEFAULT_PLAN:'operator'}, stdio:['ignore','pipe','pipe'] });
try{
  await new Promise(resolve=>setTimeout(resolve,900));
  const health = JSON.parse((await get('/api/health')).text);
  if(!['15.0.0','16.0.0','17.0.0','18.0.0','19.0.0','20.0.0'].includes(health.version) || !health.codeCore?.caseWorkflowOrchestration) fail('API health did not expose v15 case workflow orchestration'); else ok('API health exposes v15 case workflow orchestration');
  const status = JSON.parse((await get('/api/case-statuses')).text);
  if(!status.statuses?.includes('editor_handoff_created')) fail('case status API did not expose case statuses'); else ok('case status API works');
  const casePage = await get('/case-command-center/');
  if(casePage.status !== 200 || !casePage.text.includes('Case Command Center')) fail('case command center static page did not serve'); else ok('case command center static page serves');
  const start = await post('/api/cases/start', {
    title:'v15 End-to-End Smoke Case',
    caseType:'smoke_intake_packet_editor_review',
    templateIds:['US-AZ-finance-lending-receipt-template','US-AZ-business-formation-governance-single-member-llc-operating-agreement'],
    answers:{ payor_name:'Smoke Payor', payee_name:'Smoke Payee', payment_amount:'13.00', company_name:'Smoke LLC' },
    acceptBoundary:true,
    acceptHighRiskGate:true,
    createPacket:true,
    submitForPartnerReview:true,
    acceptPartnerReviewTerms:true,
    acceptNoGuarantee:true,
    acceptNoSovereignDocsLiabilityForOutcome:true,
    acceptUserFactsResponsibility:true
  });
  const started = JSON.parse(start.text);
  if(start.status !== 201 || !started.case?.id || !started.handoff?.id || !started.launchUrl?.startsWith('/skye-docx-max/app/?sd_handoff=')) fail(`case start failed: ${start.text}`); else ok('case start creates case, packet/document records, and SkyeDocxMax launch');
  if(!started.packet?.id || started.documents?.length !== 2 || !started.reviewSubmissionIds?.length) fail('case start did not create packet/documents/review submission'); else ok('case start creates packet documents and legal-review submission');
  const highRiskDoc = started.documents.find(d => d.templateId.includes('single-member-llc-operating-agreement'));
  if(!highRiskDoc || highRiskDoc.gate.exportClass !== 'prep_worksheet') fail('high-risk member was not downgraded to prep worksheet in case packet'); else ok('high-risk case member downgrades to prep worksheet');
  const opened = JSON.parse((await post(`/api/editor/skye-docx-max/session/${encodeURIComponent(started.handoff.id)}/opened`, { activeDocId:'case_smoke' })).text);
  if(!opened.case || opened.case.status !== 'opened_in_skye_docx_max') fail('opening SkyeDocxMax handoff did not advance case'); else ok('SkyeDocxMax open advances case');
  const ret = await post('/api/editor/skye-docx-max/return', { handoffId:started.handoff.id, title:'v15 Case Return', html:'<h1>v15 Case Return</h1>', text:'v15 case return text', metadata:{ smoke:true } });
  const returned = JSON.parse(ret.text);
  if(ret.status !== 201 || returned.case?.status !== 'returned_from_skye_docx_max' || !returned.returned?.documentId) fail('SkyeDocxMax return did not update case and document lifecycle'); else ok('SkyeDocxMax return updates case and creates document record');
  const completed = JSON.parse((await post(`/api/cases/${encodeURIComponent(started.case.id)}/advance`, { status:'completed', note:'Completed by v15 smoke' })).text);
  if(!completed.case || completed.case.status !== 'completed') fail('case advance to completed failed'); else ok('case advance endpoint works');
  const cases = JSON.parse((await get('/api/cases')).text);
  if(!cases.items?.some(c => c.id === started.case.id)) fail('case list did not include created case'); else ok('case list surfaces created case');
  const summary = JSON.parse((await get('/api/workspace/summary')).text);
  if(!summary.counts?.cases || !summary.cases?.some(c => c.id === started.case.id)) fail('workspace summary did not include cases'); else ok('workspace summary includes case records');
  const ledger = JSON.parse((await get('/api/audit/ledger')).text);
  if(!ledger.ok || ledger.count < 5) fail('audit ledger did not verify after v15 end-to-end case workflow'); else ok('audit ledger verifies v15 case workflow events');
} catch(error){ fail(error.stack || error.message); }
finally{ server.kill('SIGTERM'); }
if(!process.exitCode) ok('SovereignDocs v15 end-to-end case workflow smoke passed');
