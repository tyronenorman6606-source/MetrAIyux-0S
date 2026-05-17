import { createActionEnvelope } from './contracts.mjs';

export const CLAIM_SUBMISSION_SERVICE_VERSION = '21.0.0';
function clean(v){ return String(v ?? '').trim(); }
export function buildOwnerClaimSubmission({ business_id, owner_name, owner_contact, claim_type = 'owner_claim', proof_summary, website = '', phone = '', email = '', documents = [], notes = '', actor = {} } = {}){
  return createActionEnvelope({ type:'owner_claim', actor:{ roles:'owner', ...actor }, payload:{ business_id:clean(business_id), owner_name:clean(owner_name), owner_contact:clean(owner_contact), claim_type:clean(claim_type), proof_summary:clean(proof_summary), website:clean(website), phone:clean(phone), email:clean(email), documents:Array.isArray(documents)?documents:[], notes:clean(notes) } });
}
export function claimSubmissionServiceForApi(){ return { version:CLAIM_SUBMISSION_SERVICE_VERSION, endpoint:'/.netlify/functions/phx-claim', queue:'owner-claims', status:'queued_for_review', auto_verify:false, requires_upstream_auth:true }; }
