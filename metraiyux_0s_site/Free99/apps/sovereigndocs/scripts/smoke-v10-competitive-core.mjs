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
  'server/commercial-workflows.mjs',
  'data/core-product-catalog.json',
  'data/business-formation-workflows.json',
  'data/compliance-obligations.json',
  'data/legal-plan-catalog.json',
  'data/customer-orders.json',
  'data/order-workflow-statuses.json',
  'business-formation/index.html',
  'llc-formation/index.html',
  'registered-agent/index.html',
  'business-compliance/index.html',
  'trademarks/index.html',
  'estate-planning/index.html',
  'legal-plans/index.html',
  'customer-dashboard/index.html',
  'docs/V10_LEGALZOOM_COMPETITIVE_CORE.md',
  'docs/COMMERCIAL_BOUNDARIES.md',
  'BUILD_MANIFEST_V10.json'
]) must(rel);
const pkg = readJSON('package.json');
if(!/^(1[0-9]|20)\.0\.0$/.test(pkg.version)) fail('package version is not v10-v20 compatible'); else ok(`package version ${pkg.version} is v10-compatible`);
const manifest = readJSON('template-library/manifest.json');
if((manifest.records || []).length !== 10200) fail('template count changed unexpectedly'); else ok('10,200 source-truth records still wired');
const core = readJSON('data/core-product-catalog.json');
if((core.competitive_lanes || []).length < 6) fail('commercial lanes incomplete'); else ok(`${core.competitive_lanes.length} commercial lanes indexed`);
const formation = readJSON('data/business-formation-workflows.json');
if((formation.products || []).length < 7) fail('formation workflow catalog too small'); else ok(`${formation.products.length} formation workflows indexed`);
const compliance = readJSON('data/compliance-obligations.json');
if((compliance.obligations || []).length < 150) fail('compliance obligation framework too small'); else ok(`${compliance.obligations.length} compliance obligation records indexed`);
const plans = readJSON('data/legal-plan-catalog.json');
if((plans.plans || []).length < 4) fail('legal plan catalog incomplete'); else ok(`${plans.plans.length} monetization/legal-access plans indexed`);
const neon = fs.readFileSync(path.join(ROOT,'database/neon/schema.sql'),'utf8');
for(const table of ['sd_commercial_orders','sd_commercial_order_events','sd_compliance_monitors','sd_esign_envelopes']) if(!neon.includes(table)) fail(`Neon schema missing ${table}`); else ok(`Neon schema includes ${table}`);
function get(pathname){ return new Promise((resolve,reject)=>{ const req=http.get({hostname:'127.0.0.1',port:8800,path:pathname,timeout:9000},res=>{const chunks=[];res.on('data',d=>chunks.push(d));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString('utf8'),body:Buffer.concat(chunks),headers:res.headers}));}); req.on('error',reject); req.on('timeout',()=>{req.destroy();reject(new Error('timeout'));}); }); }
function post(pathname, body){ return new Promise((resolve,reject)=>{ const payload=JSON.stringify(body||{}); const req=http.request({hostname:'127.0.0.1',port:8800,path:pathname,method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(payload)},timeout:9000},res=>{const chunks=[];res.on('data',d=>chunks.push(d));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString('utf8'),body:Buffer.concat(chunks),headers:res.headers}));}); req.on('error',reject); req.on('timeout',()=>{req.destroy();reject(new Error('timeout'));}); req.write(payload); req.end(); }); }
const server = spawn(process.execPath, ['server/sovereigndocs-server.mjs'], { cwd:ROOT, env:{...process.env, PORT:'8800'}, stdio:['ignore','pipe','pipe'] });
try{
  await new Promise(resolve=>setTimeout(resolve,900));
  const health = JSON.parse((await get('/api/health')).text);
  if(!health.version || !health.commercialCore) fail('API health did not expose commercial core'); else ok(`API health returned ${health.version} commercial core`);
  const catalog = JSON.parse((await get('/api/core-products/catalog')).text);
  if(!catalog.ok || catalog.competitive_lanes.length < 6) fail('core catalog API failed'); else ok('core catalog API works');
  const formProducts = JSON.parse((await get('/api/business-formation/products')).text);
  if(!formProducts.products.find(p=>p.id==='llc-formation-prep')) fail('business formation products API missing LLC lane'); else ok('business formation products API works');
  const rejected = await post('/api/business-formation/intake', { serviceId:'llc-formation-prep', acceptBoundary:true });
  if(rejected.status !== 403 || !rejected.text.includes('missing')) fail('formation intake did not enforce boundary acknowledgments'); else ok('formation intake enforces boundary acknowledgments');
  const acceptedBody = { serviceId:'llc-formation-prep', state:'AZ', acceptBoundary:true, acceptNoGuarantee:true, acceptExternalOfficialSource:true, acceptUserFactsResponsibility:true, contact:{ email:'founder@example.com' }, answers:{ businessName:'Smoke Sovereign LLC', state:'AZ', entityType:'LLC', owners:'One member', businessPurpose:'Document automation testing', registeredAgent:'To be selected' } };
  const intake = await post('/api/business-formation/intake', acceptedBody);
  const intakeJSON = JSON.parse(intake.text);
  if(intake.status !== 201 || !intakeJSON.order?.id || !intakeJSON.packetMarkdown?.includes('Smoke Sovereign LLC')) fail('formation intake did not create packet/order'); else ok('formation intake creates packet and order');
  const complianceCreated = await post('/api/compliance/monitor/create', { state:'AZ', entityType:'LLC', acceptBoundary:true, acceptNoGuarantee:true, acceptExternalOfficialSource:true, acceptUserFactsResponsibility:true });
  const complianceJSON = JSON.parse(complianceCreated.text);
  if(complianceCreated.status !== 201 || !complianceJSON.monitor?.items?.length) fail('compliance monitor did not create reminder framework'); else ok('compliance monitor creates reminder framework');
  const raRejected = await post('/api/registered-agent/referral', { state:'AZ', acceptBoundary:true, acceptNoGuarantee:true, acceptExternalOfficialSource:true, acceptUserFactsResponsibility:true });
  if(raRejected.status !== 403 || !raRejected.text.includes('provider_terms_required')) fail('registered-agent referral did not require provider boundary'); else ok('registered-agent referral requires provider boundary');
  const trademark = await post('/api/trademark/intake', { serviceId:'trademark-search-worksheet', acceptBoundary:true, acceptNoGuarantee:true, acceptExternalOfficialSource:true, acceptUserFactsResponsibility:true, answers:{ mark:'SovereignDocs', goodsServices:'software platform' } });
  if(trademark.status !== 201 || !JSON.parse(trademark.text).packetMarkdown.includes('SovereignDocs')) fail('trademark intake failed'); else ok('trademark/IP intake works');
  const estate = await post('/api/estate-planning/intake', { serviceId:'will-worksheet', state:'AZ', acceptBoundary:true, acceptNoGuarantee:true, acceptExternalOfficialSource:true, acceptUserFactsResponsibility:true, answers:{ name:'Smoke User' } });
  if(estate.status !== 201 || !JSON.parse(estate.text).reviewRecommended) fail('estate intake did not enforce review lane'); else ok('estate planning intake works with review recommendation');
  const plan = await post('/api/legal-plans/enroll-intent', { planId:'business-command', acceptBoundary:true, acceptNoGuarantee:true, acceptExternalOfficialSource:true, acceptUserFactsResponsibility:true, acceptPartnerPlanBoundary:true });
  if(plan.status !== 201 || !JSON.parse(plan.text).plan?.id) fail('legal plan intent failed'); else ok('legal plan intent works');
  const esign = await post('/api/esign/envelopes/create', { title:'Smoke Envelope', signers:[{email:'signer@example.com'}], acceptBoundary:true, acceptNoGuarantee:true, acceptExternalOfficialSource:true, acceptUserFactsResponsibility:true, acceptEsignBoundary:true });
  if(esign.status !== 201 || !JSON.parse(esign.text).envelope?.id) fail('e-sign envelope creation failed'); else ok('signature packet envelope creation works');
  const orders = JSON.parse((await get('/api/orders')).text);
  if(!orders.ok || orders.count < 5) fail('orders API did not return commercial workflows'); else ok('orders API returns commercial workflows');
  const status = await post(`/api/orders/${intakeJSON.order.id}/status`, { status:'official_source_ready', note:'smoke transition' });
  if(status.status !== 200 || JSON.parse(status.text).order.status !== 'official_source_ready') fail('order status transition failed'); else ok('order status transition works');
  for(const route of ['/business-formation/','/legal-plans/','/customer-dashboard/','/legalzoom-alternative/']){
    const page = await get(route);
    if(page.status !== 200 || !page.text.includes('SovereignDocs')) fail(`${route} did not serve`); else ok(`${route} static route serves`);
  }
  const ledger = JSON.parse((await get('/api/audit/ledger')).text);
  if(!ledger.ok || ledger.count < 5) fail('audit ledger did not verify after v10 workflows'); else ok('append-only audit ledger verifies v10 workflows');
} catch(error){ fail(error.stack || error.message); }
finally{ server.kill('SIGTERM'); }
if(!process.exitCode) ok('SovereignDocs v10 competitive core smoke passed');
