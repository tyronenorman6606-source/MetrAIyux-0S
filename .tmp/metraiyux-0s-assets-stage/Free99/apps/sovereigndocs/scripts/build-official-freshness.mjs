import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const source = JSON.parse(fs.readFileSync(path.join(ROOT,'official-source-library/official-workflows.json'),'utf8'));
const today = new Date('2026-05-10T00:00:00Z');
const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0,10);
};
const rows = (source.workflows || []).map(w => {
  const lastVerified = w.review?.last_verified || source.last_verified_online || null;
  const cadenceDays = w.category === 'tax-records-compliance' ? 30 : w.type === 'official_source_workflow' ? 45 : 60;
  const nextReview = lastVerified ? addDays(lastVerified, cadenceDays) : today.toISOString().slice(0,10);
  return {
    id: w.id,
    title: w.title,
    category: w.category,
    sourceId: w.source_id,
    officialUrl: w.official_url,
    riskLevel: w.risk_level,
    completionModel: w.completion_model,
    officialSubmission: false,
    documentGenerationPolicy: w.document_generation_policy,
    lastVerified,
    reviewCadenceDays: cadenceDays,
    nextReview,
    freshnessStatus: nextReview < today.toISOString().slice(0,10) ? 'review_due' : 'current_by_seed_metadata',
    allowedOutput: 'prep_packet_only_external_official_source_route'
  };
});
const out = {
  version: '8.0.0',
  generatedAt: new Date().toISOString(),
  sourceFile: 'official-source-library/official-workflows.json',
  count: rows.length,
  posture: 'official forms are routed to official sources; SovereignDocs generates prep packets/checklists only unless a future live integration is proven',
  rows
};
fs.writeFileSync(path.join(ROOT,'data/official-workflow-freshness.json'), `${JSON.stringify(out,null,2)}\n`);
console.log(`✅ Official workflow freshness report built for ${rows.length} workflows`);
