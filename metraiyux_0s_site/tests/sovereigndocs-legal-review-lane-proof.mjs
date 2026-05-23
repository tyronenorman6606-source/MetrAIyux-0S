import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8791';
const PARTNER_ID = 'legal_partner_candidate_platz_juris_pllc';
const TEMPLATE_ID = 'US-AZ-business-formation-governance-single-member-llc-operating-agreement';
const ARTIFACT = process.env.ARTIFACT || 'test-artifacts/sovereigndocs-legal-review-lane-proof.json';

async function request(pathname, options = {}) {
  const res = await fetch(new URL(pathname, BASE_URL), {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) {
    throw new Error(`${options.method || 'GET'} ${pathname} failed: ${body.error || res.status}`);
  }
  return body;
}

const submit = await request('/api/legal-review/submit', {
  method: 'POST',
  body: JSON.stringify({
    templateId: TEMPLATE_ID,
    servicePlanId: 'legal_review_triage_deposit',
    requestedPartnerId: PARTNER_ID,
    reviewScope: 'proof_business_document_review',
    contact: { name: 'SkyeDevAdmin Proof', email: 'proof@example.test', organization: 'MetrAIyux 0S' },
    assembledMarkdown: '# Proof Review Packet\n\nThis packet proves checkout, vault, route, partner return, and payout ledger wiring.',
    answers: { company_name: 'MetrAIyux 0S Proof', state_code: 'AZ' },
    acceptBoundary: true,
    acceptPartnerReviewTerms: true,
    acceptNoGuarantee: true,
    acceptNoSovereignDocsLiabilityForOutcome: true,
    acceptUserFactsResponsibility: true
  })
});

if (!submit.payment?.checkoutUrl?.includes('sovereigndocs-legal-review-lane')) throw new Error('SkyePay checkout URL missing legal review offer.');
if (!submit.vaultRecord?.id) throw new Error('Vault record missing from submit response.');

const id = submit.receiptId;
const payment = await request(`/api/legal-review/submissions/${encodeURIComponent(id)}/payment-confirm`, {
  method: 'POST',
  body: JSON.stringify({ status: 'paid_held_in_escrow', skyePayOrderId: `proof_${Date.now()}` })
});

const routed = await request(`/api/legal-review/submissions/${encodeURIComponent(id)}/route`, {
  method: 'POST',
  body: JSON.stringify({ partnerId: PARTNER_ID, routingNote: 'Proof route to candidate legal workspace.' })
});

const returned = await request(`/api/legal-review/submissions/${encodeURIComponent(id)}/partner-update`, {
  method: 'POST',
  body: JSON.stringify({
    partnerId: PARTNER_ID,
    status: 'partner_review_returned',
    note: 'Proof returned review packet.',
    revisedDocument: '# Returned Proof Packet\n\nPartner return proof body.'
  })
});

if (!returned.payout?.id) throw new Error('Payout ledger entry missing after returned partner update.');

const receipt = {
  ok: true,
  baseUrl: BASE_URL,
  submissionId: id,
  checkoutUrl: submit.payment.checkoutUrl,
  vaultRecordId: submit.vaultRecord.id,
  paymentStatus: payment.payment?.status || payment.submission?.status,
  routedStatus: routed.submission?.status,
  returnedStatus: returned.submission?.status,
  payoutStatus: returned.payout.status,
  boundary: 'Proof uses local/dev API data. It does not claim a live legal partner relationship or production deployment.'
};

await mkdir(path.dirname(ARTIFACT), { recursive: true });
await writeFile(ARTIFACT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
