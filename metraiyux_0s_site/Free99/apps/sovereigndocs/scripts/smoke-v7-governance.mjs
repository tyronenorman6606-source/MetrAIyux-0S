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
  'data/publishability-report.json','data/review-lanes.json','data/review-priority-board.json',
  'publisher-console/index.html','review-studio/index.html','official-workflow-studio/index.html','migration-center/index.html','source-truth/index.html',
  'database/neon/v7-template-records.ndjson','docs/V7_GOVERNANCE_PUSH.md'
]) must(rel);
const report = readJSON('data/publishability-report.json');
if(report.version !== '7.0.0') fail('publishability report not v7'); else ok('publishability report is v7');
if(report.totals.templates !== 10200) fail('publishability report template count mismatch'); else ok('10,200 templates in publishability report');
if(report.byRisk.high !== 6069) fail('high-risk count mismatch'); else ok('6,069 high-risk records recognized');
if((report.byLane.admin_review_only || 0) !== 6069) fail('admin-review-only lane mismatch'); else ok('high-risk records mapped to admin-review-only lane');
if(report.totals.officialWorkflows !== 37) fail('official workflow count mismatch'); else ok('37 official-source workflows in governance report');
const lanes = readJSON('data/review-lanes.json');
if(!Array.isArray(lanes.lanes) || lanes.lanes.length < 3) fail('review lanes missing'); else ok(`${lanes.lanes.length} review lanes exposed`);
const ndjson = fs.readFileSync(path.join(ROOT,'database/neon/v7-template-records.ndjson'),'utf8').trim().split('\n');
if(ndjson.length !== 10200) fail('Neon seed NDJSON count mismatch'); else ok('Neon seed NDJSON contains 10,200 rows');
const pkg = readJSON('package.json');
if(pkg.version !== '7.0.0') fail('package version is not 7.0.0'); else ok('package version 7.0.0');
async function get(pathname){
  return await new Promise((resolve, reject)=>{
    const req = http.get({ hostname:'127.0.0.1', port:8797, path:pathname, timeout:5000 }, res=>{
      let raw=''; res.on('data', d=>raw+=d); res.on('end',()=>resolve({ status:res.statusCode, raw }));
    });
    req.on('error', reject); req.on('timeout',()=>{ req.destroy(); reject(new Error('timeout')); });
  });
}
const server = spawn(process.execPath, ['server/sovereigndocs-server.mjs'], { cwd:ROOT, env:{ ...process.env, PORT:'8797' }, stdio:['ignore','pipe','pipe'] });
try{
  await new Promise(resolve=>setTimeout(resolve,650));
  const health = await get('/api/health');
  const healthJSON = JSON.parse(health.raw);
  if(health.status !== 200 || healthJSON.version !== '7.0.0') fail('API health did not return version 7.0.0'); else ok('API health returned version 7.0.0');
  const gov = await get('/api/governance/publishability');
  const govJSON = JSON.parse(gov.raw);
  if(gov.status !== 200 || govJSON.totals.templates !== 10200) fail('governance API publishability failed'); else ok('governance API returned 10,200 template report');
  const lanesApi = await get('/api/governance/review-lanes');
  if(lanesApi.status !== 200 || !JSON.parse(lanesApi.raw).lanes) fail('review-lanes API failed'); else ok('review-lanes API returned lanes');
  const official = await get('/api/official-workflows/irs-w-9');
  if(official.status !== 200 || JSON.parse(official.raw).id !== 'irs-w-9') fail('official workflow lookup failed'); else ok('official workflow lookup works');
  const page = await get('/publisher-console/');
  if(page.status !== 200 || !page.raw.includes('Publisher Console')) fail('publisher console static route failed'); else ok('publisher console static route works');
} catch(error){ fail(error.message); }
finally{ server.kill('SIGTERM'); }
if(!process.exitCode) ok('SovereignDocs v7 governance smoke passed');
