export const REVIEW_STATUSES = [
  'draft',
  'needs_review',
  'prep_only_approved',
  'public_draft_approved',
  'rejected',
  'official_source_route',
  'needs_attorney_review',
  'legal_partner_review_required',
  'legal_partner_review_completed',
  'deprecated',
  'replaced'
];

export function latestReviewDecision(decisions = [], templateId){
  return decisions
    .filter(row => row.templateId === templateId)
    .sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
}

export function publishLaneForRisk(risk){
  if(risk === 'high') return 'admin_review_only';
  if(risk === 'medium') return 'public_gated_draft';
  if(risk === 'low') return 'public_draft';
  return 'manual_triage';
}

export function decideTemplateGate({ bundle, body = {}, decisions = [] }){
  const templateId = bundle.meta.id;
  const risk = bundle.meta.riskLevel || 'unknown';
  const decision = latestReviewDecision(decisions, templateId);
  const acceptedBoundary = !!body.acceptBoundary;
  const acceptedHighRisk = !!body.acceptHighRiskGate;
  const requestedPrep = body.exportMode === 'prep_worksheet' || body.prepWorksheetOnly === true;

  if(risk === 'high'){
    if(decision?.status === 'rejected' || decision?.status === 'deprecated' || decision?.status === 'replaced'){
      return { templateId, riskLevel:risk, lane:'admin_review_only', decision, exportAllowed:false, assemblyAllowed:false, exportClass:'blocked', required:['operator_review_decision'], message:`High-risk template is ${decision.status}; public generation is blocked.` };
    }
    if(decision?.status === 'official_source_route'){
      return { templateId, riskLevel:risk, lane:'official_source_route', decision, exportAllowed:false, assemblyAllowed:false, exportClass:'official_source_only', required:['official_source_route'], message:'This record must route to the official source. SovereignDocs may prepare a checklist, not an official/generated filing.' };
    }
    if(requestedPrep || decision?.status === 'prep_only_approved'){
      return { templateId, riskLevel:risk, lane:'prep_worksheet_only', decision, exportAllowed:acceptedBoundary && acceptedHighRisk, assemblyAllowed:true, exportClass:'prep_worksheet', required:['not_legal_advice_boundary','high_risk_gate','prep_worksheet_only_badge'], message:'High-risk output is limited to a prep worksheet. This is not a completed legal document.' };
    }
    if(decision?.status === 'public_draft_approved'){
      return { templateId, riskLevel:risk, lane:'public_gated_draft_after_review', decision, exportAllowed:acceptedBoundary && acceptedHighRisk, assemblyAllowed:true, exportClass:'reviewed_public_draft', required:['not_legal_advice_boundary','high_risk_gate','review_decision_reference','draft_not_attorney_reviewed_badge'], message:'High-risk draft export allowed only because an operator review decision exists. This is still not attorney-reviewed.' };
    }
    return { templateId, riskLevel:risk, lane:'admin_review_only', decision, exportAllowed:false, assemblyAllowed:true, exportClass:'blocked_high_risk', required:['operator_review_decision_before_public_export'], message:'High-risk templates are blocked from public export until a review decision allows prep-only or gated draft export.' };
  }

  if(risk === 'medium'){
    return { templateId, riskLevel:risk, lane:'public_gated_draft', decision, exportAllowed:acceptedBoundary, assemblyAllowed:true, exportClass:'public_gated_draft', required:['not_legal_advice_boundary','draft_not_attorney_reviewed_badge'], message:'Medium-risk draft automation requires warning copy and boundary acceptance.' };
  }

  if(risk === 'low'){
    return { templateId, riskLevel:risk, lane:'public_draft', decision, exportAllowed:acceptedBoundary, assemblyAllowed:true, exportClass:'public_draft', required:['not_legal_advice_boundary'], message:'Low-risk draft automation still requires the self-help boundary.' };
  }

  return { templateId, riskLevel:risk, lane:'manual_triage', decision, exportAllowed:false, assemblyAllowed:false, exportClass:'blocked_unknown_risk', required:['risk_classification'], message:'Unknown-risk records require manual triage before generation/export.' };
}

export function buildPrepWorksheet({ bundle, answers = {}, gate }){
  const rows = Object.entries(answers || {})
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) => `- ${key}: ${String(value || '').trim() || '[not provided]'}`)
    .join('\n');
  return `# Prep Worksheet: ${bundle.meta.title}\n\nSovereignDocs high-risk prep worksheet.\n\nThis is not a completed legal document, not court-ready, not state-compliant, not attorney-reviewed, and not an official filing. It is an intake/preparation worksheet created from user-provided information so a reviewer, attorney, qualified professional, or official agency workflow can evaluate the next step.\n\n## Template Reference\n\n- Template ID: ${bundle.meta.id}\n- Source version: ${bundle.meta.version}\n- Risk level: ${bundle.meta.riskLevel}\n- Gate lane: ${gate.lane}\n- Export class: ${gate.exportClass}\n- Review decision: ${gate.decision?.status || 'none'}\n\n## User-provided intake values\n\n${rows || '- No user answers supplied.'}\n\n## Next-step checklist\n\n- Confirm the current official source or local requirement.\n- Confirm whether licensed attorney or qualified professional review is needed.\n- Do not submit this worksheet as an official filing.\n- Do not treat this worksheet as legal advice.\n`;
}
