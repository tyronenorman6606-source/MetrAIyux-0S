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
  'server/legal-partner-review.mjs',
  'data/legal-partner-network.json',
  'data/legal-review-service-plans.json',
  'data/legal-review-submissions.json',
  'data/legal-review-statuses.json',
  'legal-review/index.html',
  'partner-network/index.html',
  'review-submission/index.html',
  'review-disclaimer/index.html',
  'docs/V9_LEGAL_PARTNER_REVIEW.md',
  'docs/PARTNER_REVIEW_BOUNDARIES.md',
  'docs/UPSTREAM_AUTH_LEGAL_REVIEW.md'
]) must(rel);
const pkg = readJSON('package.json');
if(!/^\d+\.0\.0$/.test(pkg.version) || Number(pkg.version.split('.')[0]) < 9) fail('package version is below v9-compatible'); else ok(`package version ${pkg.version} is v9-compatible`);
const manifest = readJSON('template-library/manifest.json');
if((manifest.records || []).length !== 10200) fail('template count changed unexpectedly'); else ok('10,200 source-truth records still wired');
const network = readJSON('data/legal-partner-network.json');
if(!network.boundaries?.some(x => x.includes('does not provide legal advice'))) fail('partner network boundary missing not-legal-advice language'); else ok('partner network boundary language exists');
const plans = readJSON('data/legal-review-service-plans.json');
if((plans.plans || []).length < 3) fail('legal review service plans missing'); else ok(`${plans.plans.length} legal-review service plans indexed`);
const statuses = readJSON('data/legal-review-statuses.json');
if(!statuses.statuses.includes('routed_to_partner') || !statuses.statuses.includes('partner_review_returned')) fail('legal review statuses incomplete'); else ok('legal review statuses include routing and return states');
const neon = fs.readFileSync(path.join(ROOT,'database/neon/schema.sql'),'utf8');
for(const table of ['sd_legal_partners','sd_legal_review_submissions','sd_legal_review_events']) if(!neon.includes(table)) fail(`Neon schema missing ${table}`); else ok(`Neon schema includes ${table}`);
const d1 = fs.readFileSync(path.join(ROOT,'database/cloudflare-d1/schema.sql'),'utf8');
for(const table of ['sd_legal_partners','sd_legal_review_submissions','sd_legal_review_events']) if(!d1.includes(table)) fail(`D1 schema missing ${table}`); else ok(`D1 schema includes ${table}`);
async function post(pathname, body, headers={}){
  return await new Promise((resolve, reject)=>{
    const payload = JSON.stringify(body || {});
    const req = http.request({ hostname:'127.0.0.1', port:8799, path:pathname, method:'POST', headers:{ 'content-type':'application/json', 'content-length':Buffer.byteLength(payload), ...headers }, timeout:8000 }, res=>{
      const chunks=[]; res.on('data', d=>chunks.push(d)); res.on('end',()=>resolve({ status:res.statusCode, body:Buffer.concat(chunks), text:Buffer.concat(chunks).toString('utf8'), headers:res.headers }));
    });
    req.on('error', reject); req.on('timeout',()=>{ req.destroy(); reject(new Error('timeout')); }); req.write(payload); req.end();
  });
}
async function get(pathname, headers={}){
  return await new Promise((resolve, reject)=>{
    const req = http.get({ hostname:'127.0.0.1', port:8799, path:pathname, headers, timeout:8000 }, res=>{
      const chunks=[]; res.on('data', d=>chunks.push(d)); res.on('end',()=>resolve({ status:res.statusCode, body:Buffer.concat(chunks), text:Buffer.concat(chunks).toString('utf8'), headers:res.headers }));
    });
    req.on('error', reject); req.on('timeout',()=>{ req.destroy(); reject(new Error('timeout')); });
  });
}
const highId = 'US-AZ-business-formation-governance-single-member-llc-operating-agreement';
const server = spawn(process.execPath, ['server/sovereigndocs-server.mjs'], { cwd:ROOT, env:{ ...process.env, PORT:'8799' }, stdio:['ignore','pipe','pipe'] });
try{
  await new Promise(resolve=>setTimeout(resolve,750));
  const health = JSON.parse((await get('/api/health')).text);
  if(Number(String(health.version || '0').split('.')[0]) < 9 || !health.legalPartnerReview) fail('API health did not expose v9 legal partner lane'); else ok(`API health returned v${health.version} with legal partner lane`);
  const partnerNetwork = JSON.parse((await get('/api/legal-partners/network')).text);
  if(!partnerNetwork.ok || !partnerNetwork.partners?.length) fail('partner network API failed'); else ok('partner network API works');
  const servicePlans = JSON.parse((await get('/api/legal-review/service-plans')).text);
  if(!servicePlans.ok || servicePlans.plans.length < 3) fail('legal review service plans API failed'); else ok('legal review service plans API works');
  const rejected = await post('/api/legal-review/submit', { templateId:highId, acceptBoundary:true });
  if(rejected.status !== 403 || !rejected.text.includes('missing')) fail('partner review submission did not require acknowledgments'); else ok('partner review submission requires all acknowledgments');
  const submitted = await post('/api/legal-review/submit', { templateId:highId, acceptBoundary:true, acceptPartnerReviewTerms:true, acceptNoGuarantee:true, acceptNoSovereignDocsLiabilityForOutcome:true, acceptUserFactsResponsibility:true, reviewScope:'business formation partner review', contact:{ email:'client@example.com', name:'Smoke Client' }, answers:{ company_name:'Smoke LLC' } });
  const receipt = JSON.parse(submitted.text);
  if(submitted.status !== 201 || !receipt.receiptId || receipt.submission.status !== 'submitted_pending_triage') fail('partner review submission did not create receipt'); else ok('partner review submission creates receipt');
  if(receipt.submission.riskLevel !== 'high') fail('partner review receipt did not preserve high risk metadata'); else ok('partner review receipt preserves risk metadata');
  const routed = await post(`/api/legal-review/submissions/${receipt.receiptId}/route`, { partnerId:'operator-configured-legal-network', routingNote:'smoke route' });
  const routedJSON = JSON.parse(routed.text);
  if(routed.status !== 200 || routedJSON.submission.status !== 'routed_to_partner') fail('partner review route endpoint failed'); else ok('partner review route endpoint works');
  const updated = await post(`/api/legal-review/submissions/${receipt.receiptId}/partner-update`, { status:'partner_review_returned', partnerStatus:'external_terms_required', note:'smoke returned' });
  const updatedJSON = JSON.parse(updated.text);
  if(updated.status !== 200 || updatedJSON.submission.status !== 'partner_review_returned') fail('partner review update endpoint failed'); else ok('partner review update endpoint works');
  const list = JSON.parse((await get('/api/legal-review/submissions')).text);
  if(!list.ok || list.count < 1) fail('legal review submissions list failed'); else ok('legal review submission admin list works');
  const ledger = JSON.parse((await get('/api/audit/ledger')).text);
  if(!ledger.ok || ledger.count < 3) fail('audit ledger did not verify after legal review workflow'); else ok('append-only audit ledger verifies legal review workflow');
} catch(error){ fail(error.stack || error.message); }
finally{ server.kill('SIGTERM'); }
if(!process.exitCode) ok('SovereignDocs v9 legal partner review smoke passed');
