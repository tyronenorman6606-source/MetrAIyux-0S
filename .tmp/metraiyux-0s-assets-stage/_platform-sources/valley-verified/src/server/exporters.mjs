export const ADMIN_EXPORT_VERSION = '18.0.0';

function csvEscape(value){
  const text = String(value ?? '');
  if(/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function runtimeStateToAdminChangeSet(state = {}){
  const suppression_ids = Object.keys(state.suppression_drafts || {});
  const listing_patches = Object.entries(state.listing_patches || {}).flatMap(([business_id, patches]) => (patches || []).map(patch => ({ business_id, ...patch })));
  const claim_updates = Object.values(state.claims || {}).map(claim => ({ business_id:claim.business_id, claim_status:claim.claim_status, verification_status:claim.verification_status || '', reviewer:claim.reviewer || '', latest_action_id:claim.latest_action_id || '' }));
  const lead_updates = Object.values(state.leads || {}).map(lead => ({ lead_id:lead.lead_id, lead_status:lead.lead_status, assigned_to:lead.assigned_to || '', business_ids:(lead.business_ids || []).join('|') }));
  const ae_followups = Object.values(state.ae_accounts || {}).map(account => ({ business_id:account.business_id, stage:account.stage || '', next_action:account.next_action || '', due_date:account.due_date || '', product:account.product || '' }));
  return {
    version:ADMIN_EXPORT_VERSION,
    generated_at:new Date().toISOString(),
    suppression_patch:{ ids:suppression_ids, identity_keys:[], domains:[], phones:[], emails:[], source_hashes:[] },
    listing_patches,
    claim_updates,
    lead_updates,
    ae_followups,
    event_count:(state.events || []).length
  };
}

export function changeSetCsv(changeSet){
  const rows = [['lane','id','status','action','notes']];
  for(const id of changeSet.suppression_patch.ids || []) rows.push(['suppression', id, 'draft_for_seed_suppression', 'add_to_seed/businesses/suppressions.json', '']);
  for(const patch of changeSet.listing_patches || []) rows.push(['listing_patch', patch.business_id, 'patch_ready', JSON.stringify(patch.patch || {}), patch.reason || '']);
  for(const claim of changeSet.claim_updates || []) rows.push(['claim', claim.business_id, claim.verification_status || claim.claim_status || '', 'sync_claim_status', claim.latest_action_id || '']);
  for(const lead of changeSet.lead_updates || []) rows.push(['lead', lead.lead_id, lead.lead_status || '', 'route_or_close', lead.business_ids || '']);
  for(const ae of changeSet.ae_followups || []) rows.push(['ae_followup', ae.business_id, ae.stage || '', ae.next_action || '', ae.due_date || '']);
  return rows.map(row => row.map(csvEscape).join(',')).join('\n') + '\n';
}

export function suppressionFileFromChangeSet(changeSet, existing = {}){
  const unique = value => Array.from(new Set((value || []).map(String).filter(Boolean))).sort();
  return {
    notes:[
      'Generated from runtime-state admin change-set. Review before replacing seed/businesses/suppressions.json.',
      'Suppression remains seed-controlled so static public pages do not pretend to mutate instantly.'
    ],
    ids:unique([...(existing.ids || []), ...(changeSet.suppression_patch?.ids || [])]),
    identity_keys:unique([...(existing.identity_keys || []), ...(changeSet.suppression_patch?.identity_keys || [])]),
    domains:unique([...(existing.domains || []), ...(changeSet.suppression_patch?.domains || [])]),
    phones:unique([...(existing.phones || []), ...(changeSet.suppression_patch?.phones || [])]),
    emails:unique([...(existing.emails || []), ...(changeSet.suppression_patch?.emails || [])]),
    source_hashes:unique([...(existing.source_hashes || []), ...(changeSet.suppression_patch?.source_hashes || [])])
  };
}
