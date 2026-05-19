import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const readJSON = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const writeJSON = (rel, value) => {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(value, null, 2)}\n`);
};
const inc = (obj, key, by = 1) => { obj[key || 'unknown'] = (obj[key || 'unknown'] || 0) + by; };
const now = new Date().toISOString();
const manifest = readJSON('template-library/manifest.json');
const categories = readJSON('template-library/categories.json');
const jurisdictions = readJSON('template-library/jurisdictions.json');
const gates = readJSON('audit/publish-gates.json');
const official = readJSON('official-source-library/official-workflows.json');
const reviewQueue = readJSON('review-workflow/review-queue-high-risk.json');
const records = manifest.records || [];

function laneFor(record){
  if(record.risk_level === 'high') return 'admin_review_only';
  if(record.risk_level === 'medium') return 'public_gated_draft';
  if(record.risk_level === 'low') return 'public_draft';
  return 'manual_triage';
}
function gateFor(record){
  if(record.risk_level === 'high') return {
    lane:'admin_review_only',
    publicGeneration:'blocked_until_review',
    requiredAcknowledgments:['not_legal_advice','high_risk_review_gate'],
    allowedPublicMode:'prep_worksheet_or_internal_review_only'
  };
  if(record.risk_level === 'medium') return {
    lane:'public_gated_draft',
    publicGeneration:'allowed_with_gate',
    requiredAcknowledgments:['not_legal_advice','draft_not_attorney_reviewed'],
    allowedPublicMode:'draft_automation_with_warning'
  };
  return {
    lane:'public_draft',
    publicGeneration:'allowed_with_boundary',
    requiredAcknowledgments:['not_legal_advice'],
    allowedPublicMode:'draft_automation'
  };
}

const byRisk = {}, byCategory = {}, byJurisdiction = {}, byLane = {}, byStatus = {};
const categoryBreakdown = {};
const jurisdictionBreakdown = {};
const laneRecords = { admin_review_only: [], public_gated_draft: [], public_draft: [], manual_triage: [] };
for(const record of records){
  const lane = laneFor(record);
  inc(byRisk, record.risk_level);
  inc(byCategory, record.category_slug);
  inc(byJurisdiction, record.jurisdiction_id);
  inc(byLane, lane);
  inc(byStatus, record.status);
  if(!categoryBreakdown[record.category_slug]) categoryBreakdown[record.category_slug] = { categorySlug:record.category_slug, categoryName:record.category_name, total:0, low:0, medium:0, high:0, manual_triage:0 };
  categoryBreakdown[record.category_slug].total++;
  categoryBreakdown[record.category_slug][record.risk_level] = (categoryBreakdown[record.category_slug][record.risk_level] || 0) + 1;
  if(!jurisdictionBreakdown[record.jurisdiction_id]) jurisdictionBreakdown[record.jurisdiction_id] = { jurisdictionId:record.jurisdiction_id, stateCode:record.state_code, stateName:record.state_name, total:0, low:0, medium:0, high:0, manual_triage:0 };
  jurisdictionBreakdown[record.jurisdiction_id].total++;
  jurisdictionBreakdown[record.jurisdiction_id][record.risk_level] = (jurisdictionBreakdown[record.jurisdiction_id][record.risk_level] || 0) + 1;
  if(laneRecords[lane] && laneRecords[lane].length < 250){
    laneRecords[lane].push({ id:record.id, title:record.title, category:record.category_slug, jurisdiction:record.jurisdiction_id, risk_level:record.risk_level, path:record.path, gate:gateFor(record) });
  }
}
const topHighRiskCategories = Object.values(categoryBreakdown).sort((a,b)=>(b.high||0)-(a.high||0)).slice(0,15);
const topReviewJurisdictions = Object.values(jurisdictionBreakdown).sort((a,b)=>(b.high||0)-(a.high||0)).slice(0,15);
const officialByRisk = {};
const officialBySource = {};
for(const wf of official.workflows || []){ inc(officialByRisk, wf.risk_level); inc(officialBySource, wf.source_id); }
const forbiddenClaimRegexes = (gates.forbidden_claims || []).map(claim => ({ claim, regex: claim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g,'\\s+') }));
const report = {
  version:'8.0.0',
  generatedAt:now,
  sourceTruth:'v2.1-confidence-review-library',
  totals:{
    templates:records.length,
    categories:categories.length,
    jurisdictions:jurisdictions.length,
    officialWorkflows:(official.workflows||[]).length,
    highRiskQueueCount:reviewQueue.count || (reviewQueue.records||[]).length
  },
  byRisk,
  byLane,
  byStatus,
  byCategory:Object.values(categoryBreakdown).sort((a,b)=>a.categorySlug.localeCompare(b.categorySlug)),
  byJurisdiction:Object.values(jurisdictionBreakdown).sort((a,b)=>a.jurisdictionId.localeCompare(b.jurisdictionId)),
  topHighRiskCategories,
  topReviewJurisdictions,
  officialWorkflows:{ byRisk:officialByRisk, bySource:officialBySource, count:(official.workflows||[]).length },
  gates:{
    defaultPublicVisibility:gates.default_public_visibility || {},
    forbiddenClaims:gates.forbidden_claims || [],
    forbiddenClaimRegexes,
    releaseGates:gates.release_gates || []
  },
  recommendedOperatingRules:[
    'Low-risk records may publish as draft automation after not-legal-advice boundary acceptance.',
    'Medium-risk records may publish only with draft badge, warning copy, and export acknowledgment.',
    'High-risk records stay admin/review-only or prep-worksheet-only until review is recorded.',
    'Official-source workflows route users to official agency/court/tax sources and produce prep packets, not replacement filings.',
    'No page or API response may claim attorney-reviewed, state-compliant, court-ready, guaranteed enforceable, or official filing unless a live proof exists.'
  ]
};
writeJSON('data/publishability-report.json', report);
writeJSON('data/review-lanes.json', {
  version:'8.0.0', generatedAt:now,
  lanes:[
    { id:'public_draft', label:'Public Draft', count:byLane.public_draft||0, rule:'Low risk only; not-legal-advice boundary still required.', sample:laneRecords.public_draft },
    { id:'public_gated_draft', label:'Public Gated Draft', count:byLane.public_gated_draft||0, rule:'Medium risk; draft badge and warning acceptance required.', sample:laneRecords.public_gated_draft },
    { id:'admin_review_only', label:'Admin Review Only', count:byLane.admin_review_only||0, rule:'High risk; public generation blocked unless reviewed or converted to prep worksheet.', sample:laneRecords.admin_review_only },
    { id:'manual_triage', label:'Manual Triage', count:byLane.manual_triage||0, rule:'Unknown risk or incomplete governance data.', sample:laneRecords.manual_triage }
  ]
});
// Browser-safe review queue subset with category and jurisdiction breakdown.
writeJSON('data/review-priority-board.json', {
  version:'8.0.0', generatedAt:now,
  highRiskCount:byRisk.high || 0,
  topHighRiskCategories,
  topReviewJurisdictions,
  queueSample:(reviewQueue.records || []).slice(0,500).map((row, index)=>({ priority:index+1, ...row }))
});
// Seed-export preview for DB backfills without reading every generated record body.
const ndjson = records.map(rec => JSON.stringify({
  id:rec.id, base_id:rec.base_id, slug:(rec.base_id||'').split('/').pop(), title:rec.title,
  category_slug:rec.category_slug, category_name:rec.category_name, jurisdiction_id:rec.jurisdiction_id,
  state_code:rec.state_code, state_name:rec.state_name, risk_level:rec.risk_level, status:rec.status,
  checksum:rec.checksum, path:rec.path, publish_lane:laneFor(rec)
})).join('\n') + '\n';
fs.mkdirSync(path.join(ROOT,'database/neon'), { recursive:true });
fs.writeFileSync(path.join(ROOT,'database/neon/v7-template-records.ndjson'), ndjson);
console.log(`✅ Governance report built for ${records.length} records`);
console.log(`✅ ${byLane.admin_review_only||0} admin-review-only records`);
console.log(`✅ ${(official.workflows||[]).length} official-source workflows indexed`);
console.log('✅ database/neon/v7-template-records.ndjson exported');
