import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createDocxBuffer } from '../server/docx-exporter.mjs';
import { verifyAuditLedger } from '../server/audit-ledger.mjs';
const ROOT = process.cwd();
const ok = msg => console.log(`✅ ${msg}`);
const fail = msg => { console.error(`❌ ${msg}`); process.exitCode = 1; };
const readJSON = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const must = rel => fs.existsSync(path.join(ROOT, rel)) ? ok(`${rel} exists`) : fail(`${rel} missing`);
for(const rel of [
  'server/policy-engine.mjs','server/upstream-auth.mjs','server/audit-ledger.mjs',
  'data/official-workflow-freshness.json','docs/V8_ACTIVATION_ENFORCEMENT.md','docs/HIGH_RISK_EXPORT_POLICY.md','docs/UPSTREAM_AUTH_SIGNED_SESSION.md','docs/AUDIT_LEDGER.md',
  'database/neon/schema.sql','database/neon/v8-template-records.ndjson','database/cloudflare-d1/schema.sql','scripts/scan-public-claims.mjs','scripts/build-official-freshness.mjs'
]) must(rel);
const pkg = readJSON('package.json');
if(!['8.0.0','9.0.0'].includes(pkg.version)) fail('package version is not 8.0.0 or 9.0.0'); else ok(`package version ${pkg.version}`);
const manifest = readJSON('template-library/manifest.json');
if((manifest.records || []).length !== 10200) fail('template count changed unexpectedly'); else ok('10,200 source-truth records still wired');
const report = readJSON('data/publishability-report.json');
if((report.byLane?.admin_review_only || 0) !== 6069) fail('high-risk lane count changed unexpectedly'); else ok('6,069 high-risk records remain admin-review-only');
const freshness = readJSON('data/official-workflow-freshness.json');
if(freshness.count !== 37) fail('official workflow freshness count mismatch'); else ok('37 official workflows have freshness metadata');
const seedRows = fs.readFileSync(path.join(ROOT,'database/neon/v8-template-records.ndjson'),'utf8').trim().split('\n');
if(seedRows.length !== 10200) fail('v8 Neon seed row count mismatch'); else ok('v8 Neon seed contains 10,200 rows');
const neon = fs.readFileSync(path.join(ROOT,'database/neon/schema.sql'),'utf8');
for(const table of ['sd_template_versions','sd_review_decisions','sd_official_workflows','sd_vault_records','sd_export_events','sd_upstream_subjects','sd_publish_lanes']) if(!neon.includes(table)) fail(`Neon schema missing ${table}`); else ok(`Neon schema includes ${table}`);
const docx = createDocxBuffer({ title:'V8 Smoke', markdown:'# Hello', metadata:{ templateId:'smoke', riskLevel:'high', exportClass:'prep_worksheet', auditId:'audit-smoke' } });
if(docx.slice(0,2).toString() !== 'PK') fail('DOCX buffer is not a zip'); else ok('DOCX exporter emits valid OOXML zip buffer');
async function post(pathname, body){
  return await new Promise((resolve, reject)=>{
    const payload = JSON.stringify(body || {});
    const req = http.request({ hostname:'127.0.0.1', port:8798, path:pathname, method:'POST', headers:{ 'content-type':'application/json', 'content-length':Buffer.byteLength(payload) }, timeout:8000 }, res=>{
      const chunks=[]; res.on('data', d=>chunks.push(d)); res.on('end',()=>resolve({ status:res.statusCode, body:Buffer.concat(chunks), text:Buffer.concat(chunks).toString('utf8'), headers:res.headers }));
    });
    req.on('error', reject); req.on('timeout',()=>{ req.destroy(); reject(new Error('timeout')); }); req.write(payload); req.end();
  });
}
async function get(pathname){
  return await new Promise((resolve, reject)=>{
    const req = http.get({ hostname:'127.0.0.1', port:8798, path:pathname, timeout:8000 }, res=>{
      const chunks=[]; res.on('data', d=>chunks.push(d)); res.on('end',()=>resolve({ status:res.statusCode, body:Buffer.concat(chunks), text:Buffer.concat(chunks).toString('utf8'), headers:res.headers }));
    });
    req.on('error', reject); req.on('timeout',()=>{ req.destroy(); reject(new Error('timeout')); });
  });
}
const highId = 'US-AZ-business-formation-governance-single-member-llc-operating-agreement';
const low = (manifest.records || []).find(r => r.risk_level === 'low')?.id;
const server = spawn(process.execPath, ['server/sovereigndocs-server.mjs'], { cwd:ROOT, env:{ ...process.env, PORT:'8798' }, stdio:['ignore','pipe','pipe'] });
try{
  await new Promise(resolve=>setTimeout(resolve,750));
  const health = await get('/api/health');
  const healthJSON = JSON.parse(health.text);
  if(health.status !== 200 || !['8.0.0','9.0.0'].includes(healthJSON.version)) fail('API health did not return v8'); else ok('API health returned compatible version');
  const search = JSON.parse((await get('/api/templates/search?state=AZ&risk=high&pageSize=5')).text);
  if(search.items.length < 1 || search.total < 1) fail('paginated search failed'); else ok('paginated API search works');
  const blocked = await post('/api/documents/export-docx', { templateId:highId, acceptBoundary:true, acceptHighRiskGate:true });
  if(blocked.status !== 403 || !blocked.text.includes('blocked from public export')) fail('high-risk DOCX export was not blocked before review decision'); else ok('high-risk DOCX export blocked before review decision');
  const prep = await post('/api/documents/export-docx', { templateId:highId, acceptBoundary:true, acceptHighRiskGate:true, exportMode:'prep_worksheet', answers:{ company_name:'Smoke LLC' } });
  if(prep.status !== 200 || prep.body.slice(0,2).toString() !== 'PK' || !['docx-api-mode-v8','docx-api-mode-v9'].includes(prep.headers['x-sovereigndocs-export'])) fail('prep worksheet DOCX export failed'); else ok('high-risk prep worksheet DOCX export works');
  if(low){
    const lowOut = await post('/api/documents/export-docx', { templateId:low, acceptBoundary:true, answers:{ sample:'x' } });
    if(lowOut.status !== 200 || lowOut.body.slice(0,2).toString() !== 'PK') fail('low-risk DOCX export failed'); else ok('low-risk gated DOCX export works');
  }
  const ledger = JSON.parse((await get('/api/audit/ledger')).text);
  if(!ledger.ok || ledger.count < 2) fail('audit ledger did not verify after exports'); else ok('append-only audit ledger verifies');
  const fresh = JSON.parse((await get('/api/governance/official-freshness')).text);
  if(fresh.count !== 37) fail('official freshness API failed'); else ok('official freshness API works');
} catch(error){ fail(error.message); }
finally{ server.kill('SIGTERM'); }
const ledgerStatus = await verifyAuditLedger(path.join(ROOT,'data/audit-ledger.ndjson'));
if(!ledgerStatus.ok) fail(`audit ledger local verify failed: ${ledgerStatus.error}`); else ok('audit ledger local verification passed');
if(!process.exitCode) ok('SovereignDocs v8 activation/enforcement smoke passed');
