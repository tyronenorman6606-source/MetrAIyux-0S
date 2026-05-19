import fs from 'fs';
import path from 'path';

const root = process.cwd();
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const exists = (p) => fs.existsSync(path.join(root, p));
const recordsPath = 'template-library/template-records.ndjson';
const records = fs.readFileSync(path.join(root, recordsPath), 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map(line => JSON.parse(line));

const counters = {
  total_records: records.length,
  duplicate_ids: 0,
  duplicate_paths: 0,
  missing_files: 0,
  bad_json: 0,
  missing_required_fields: {},
  statuses: {},
  risk_levels: {},
  categories: {},
  jurisdictions: {},
  unresolved_hard_placeholders: 0,
  records_with_not_legal_advice: 0,
  records_with_lawdepot_text_claim_false: 0,
  records_with_sections: 0,
  records_with_questionnaires: 0,
  min_sections: null,
  max_sections: 0,
  min_questions: null,
  max_questions: 0,
};

const required = ['id','base_id','slug','title','category','jurisdiction','version','status','risk_level','not_legal_advice','questionnaire','sections','render_markdown','rights','review'];
const seenIds = new Set();
const seenPaths = new Set();
const hardPlaceholderPatterns = [/\bTODO\b/i, /\bTBD\b/i, /lorem\s+ipsum/i, /\[insert/i, /INSERT HERE/i];
const findings = [];

for (const r of records) {
  if (seenIds.has(r.id)) counters.duplicate_ids++; else seenIds.add(r.id);
  if (seenPaths.has(r.path)) counters.duplicate_paths++; else seenPaths.add(r.path);
  counters.statuses[r.status] = (counters.statuses[r.status] || 0) + 1;
  counters.risk_levels[r.risk_level] = (counters.risk_levels[r.risk_level] || 0) + 1;
  counters.categories[r.category_slug] = (counters.categories[r.category_slug] || 0) + 1;
  counters.jurisdictions[r.jurisdiction_id] = (counters.jurisdictions[r.jurisdiction_id] || 0) + 1;

  const fp = path.join(root, r.path);
  if (!fs.existsSync(fp)) { counters.missing_files++; continue; }
  let d;
  try { d = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (e) { counters.bad_json++; continue; }
  for (const key of required) {
    if (!(key in d)) counters.missing_required_fields[key] = (counters.missing_required_fields[key] || 0) + 1;
  }
  const text = JSON.stringify(d);
  if (hardPlaceholderPatterns.some(rx => rx.test(text))) counters.unresolved_hard_placeholders++;
  if (d.not_legal_advice === true) counters.records_with_not_legal_advice++;
  if (d.rights && d.rights.lawdepot_text_used === false) counters.records_with_lawdepot_text_claim_false++;
  if (Array.isArray(d.sections) && d.sections.length > 0) counters.records_with_sections++;
  if (Array.isArray(d.questionnaire) && d.questionnaire.length > 0) counters.records_with_questionnaires++;
  counters.min_sections = counters.min_sections === null ? d.sections.length : Math.min(counters.min_sections, d.sections.length);
  counters.max_sections = Math.max(counters.max_sections, d.sections.length);
  counters.min_questions = counters.min_questions === null ? d.questionnaire.length : Math.min(counters.min_questions, d.questionnaire.length);
  counters.max_questions = Math.max(counters.max_questions, d.questionnaire.length);
}

const overlayDir = path.join(root, 'template-library/state-overlays-v2');
const overlays = fs.readdirSync(overlayDir).filter(f => f.endsWith('.json')).map(f => readJson(`template-library/state-overlays-v2/${f}`));
const overlayAudit = {
  overlay_count: overlays.length,
  overlays_with_verified_source_targets: overlays.filter(o => (o.official_source_targets || []).some(t => t.verified_url)).length,
  overlays_with_state_specific_law_included: overlays.filter(o => o.review?.state_specific_law_included === true).length,
  overlays_requiring_human_review: overlays.filter(o => o.review?.human_review_required === true).length,
};

const official = readJson('official-source-library/official-workflows.json');
const officialAudit = {
  official_workflow_count: official.count ?? official.workflows?.length ?? 0,
  official_workflows_with_url: (official.workflows || []).filter(w => !!w.official_url).length,
  official_workflows_copy_official_text: (official.workflows || []).filter(w => w.rights?.official_text_copied === true).length,
  official_workflows_require_source_verification_before_publish: (official.workflows || []).filter(w => w.review?.source_verification_required_before_publish === true).length,
};

const bundles = readJson('template-bundles/bundles.json');
const bundleAudit = { bundle_count: bundles.count ?? bundles.bundles?.length ?? 0 };

const gates = {
  safe_to_seed_database: counters.missing_files === 0 && counters.bad_json === 0 && counters.duplicate_ids === 0 && counters.duplicate_paths === 0,
  safe_to_market_as_attorney_reviewed: false,
  safe_to_market_as_state_specific_legally_validated: false,
  safe_to_market_as_official_form_filing_engine: false,
  safe_to_publish_as_draft_document_automation_with_review_badges: counters.missing_files === 0 && counters.bad_json === 0 && counters.records_with_not_legal_advice === counters.total_records,
  must_hide_high_risk_until_reviewed: true,
  must_label_all_generated_templates: 'Draft automation template — not attorney reviewed',
};

if (Object.keys(counters.statuses).length === 1 && counters.statuses.original_seed_not_attorney_reviewed === counters.total_records) {
  findings.push({ severity: 'critical', area: 'legal_readiness', finding: 'All generated templates are still unreviewed seed templates.', required_action: 'Do not publish as reviewed/legal/state-compliant. Use draft-only badges and review gates.' });
}
if (overlayAudit.overlays_with_state_specific_law_included === 0) {
  findings.push({ severity: 'critical', area: 'jurisdiction_overlays', finding: 'No state overlay claims verified state-specific law.', required_action: 'Populate official state/county/court/agency sources and reviewer signoff before enabling state-specific claims.' });
}
if (officialAudit.official_workflows_require_source_verification_before_publish > 0) {
  findings.push({ severity: 'high', area: 'official_sources', finding: 'Official workflows correctly route to official sources, but still require source verification before publish.', required_action: 'Verify each official URL/source at release time and store timestamp + reviewer.' });
}
if (counters.risk_levels.high > 0) {
  findings.push({ severity: 'high', area: 'risk_queue', finding: `${counters.risk_levels.high} high-risk generated records require attorney/current-law review before normal user release.`, required_action: 'Keep high-risk templates behind admin/review mode or show strong warnings.' });
}

const result = {
  generated_at: new Date().toISOString(),
  package: 'sovereigndocs_template_library_v2_1_confidence_review',
  audit_scope: ['file integrity','manifest consistency','template metadata','questionnaire/section presence','rights flags','risk/status flags','official workflow posture','state overlay posture','publish gate decision'],
  counters,
  overlayAudit,
  officialAudit,
  bundleAudit,
  gates,
  findings,
};

fs.mkdirSync(path.join(root, 'audit/results'), { recursive: true });
fs.writeFileSync(path.join(root, 'audit/results/confidence-audit-results.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
