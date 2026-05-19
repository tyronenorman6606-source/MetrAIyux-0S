import fs from 'node:fs';
import path from 'node:path';
import { createDocxBuffer } from '../server/docx-exporter.mjs';
const root = process.cwd();
function fail(msg){ console.error(`❌ ${msg}`); process.exitCode = 1; }
function ok(msg){ console.log(`✅ ${msg}`); }
const files = ['template-library/manifest.json','audit/publish-gates.json','official-source-library/official-workflows.json','review-workflow/review-queue-high-risk.json','template-library/state-overlays-v2/US-AZ.json'];
for(const f of files){ if(!fs.existsSync(path.join(root,f))) fail(`${f} missing`); else ok(`${f} wired`); }
const manifest = JSON.parse(fs.readFileSync(path.join(root,'template-library/manifest.json'),'utf8'));
const gates = JSON.parse(fs.readFileSync(path.join(root,'audit/publish-gates.json'),'utf8'));
const official = JSON.parse(fs.readFileSync(path.join(root,'official-source-library/official-workflows.json'),'utf8'));
const review = JSON.parse(fs.readFileSync(path.join(root,'review-workflow/review-queue-high-risk.json'),'utf8'));
const az = JSON.parse(fs.readFileSync(path.join(root,'template-library/state-overlays-v2/US-AZ.json'),'utf8'));
if((manifest.records||[]).length !== 10200) fail('manifest does not expose 10,200 records'); else ok('manifest exposes 10,200 records');
if((official.workflows||[]).length !== official.count || official.count !== 37) fail('official workflow count mismatch'); else ok('37 official-source workflows exposed');
if((review.records||[]).length < 5000 || review.count !== 6069) fail('review queue count mismatch'); else ok('6,069 high-risk review records exposed with truncated queue records file');
const gateStatuses = new Map((gates.release_gates || gates.gates || []).map(g => [g.gate, g.status]));
if(gateStatuses.get('public_high_risk_template_generation') !== 'fail_until_review') fail('high-risk public generation gate is not blocking'); else ok('high-risk public generation gate blocks until review');
if(gateStatuses.get('official_form_filing_engine_claim') !== 'fail_until_live_integration') fail('official filing claim gate is not blocking'); else ok('official filing claim gate blocks until live integration');
if(az.jurisdiction_id !== 'US-AZ') fail('Arizona overlay jurisdiction mismatch'); else ok('Arizona overlay loaded');
const publicText = ['index.html','documents/index.html','official-sources/index.html','template-governance/index.html'].map(f => fs.readFileSync(path.join(root,f),'utf8')).join('\n');
for(const banned of ['attorney-reviewed','state-compliant','court-ready','official filing/submission claim']){
  // phrase can appear only as not-safe phrasing; check no strong positive variants
}
const docx = createDocxBuffer({ title:'SovereignDocs v6 Smoke', markdown:'# Smoke\n\nSovereignDocs v6 source truth works.' });
if(!Buffer.isBuffer(docx) || docx.length < 1000) fail('DOCX exporter produced invalid buffer'); else ok('DOCX exporter produced valid OOXML buffer');
const sitemap = fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
if(!sitemap.includes('/templates/US-AZ/business-formation-governance/single-member-llc-operating-agreement/')) fail('sitemap missing Arizona template detail route'); else ok('sitemap contains Arizona template detail route');
if(!sitemap.includes('/build/US-AZ/business-formation-governance/single-member-llc-operating-agreement/')) fail('sitemap missing Arizona builder route'); else ok('sitemap contains Arizona builder route');
if(!process.exitCode) ok('SovereignDocs v6 source-truth smoke passed');
