#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const siteRoot = path.join(repoRoot, 'legalskyes-website');
const artifactDir = path.join(repoRoot, 'test-artifacts/legal-skyes-static-transaction-pack');
const reportPath = path.join(artifactDir, 'report.json');

function read(rel) {
  return fs.readFileSync(path.join(siteRoot, rel), 'utf8');
}

function readRepo(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function existsRepo(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}

function walk(dir, rows = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, rows);
    else rows.push(full);
  }
  return rows;
}

const checks = [];
function check(id, ok, details = {}) {
  checks.push({id, ok:Boolean(ok), details});
}

const proof = read('legal/proof-and-valuation/index.html');
const arbitration = read('legal/in-house-arbitration/index.html');
const paperwork = read('legal/arbitration-paperwork/index.html');
const notice = read('legal/notice-of-dispute/index.html');
const aeRole = read('legal/ae-committee-role-terms/index.html');
const receipt = read('legal/transaction-acceptance-receipt/index.html');
const externalRules = read('legal/external-arbitration-rules/index.html');
const terms = read('legal/terms/index.html');
const disputes = read('legal/dispute-resolution/index.html');
const payments = read('legal/payments-refunds/index.html');
const sitemap = read('sitemap.xml');
const redirects = read('_redirects');

check('proof-page-published', /Current proofs, valuation, and readiness boundaries/i.test(proof));
check('proof-page-no-guarantee', /No 100% success guarantee|No 100 percent success guarantee|no 100% technology/i.test(proof));
check('proof-page-contacts', ['legal-skyes@solenterprises.org','metraiyux-0s@solenterprises.org','MediaOverLondon@solenterprises.org'].every((text) => proof.includes(text)));
check('arbitration-page-published', /In-house arbitration and customer dispute lane/i.test(arbitration));
check('arbitration-ae-pay', /\$31\/hour/.test(arbitration) && /\$50 every two months/.test(arbitration));
check('arbitration-refund-cap', /67%/.test(arbitration));
check('arbitration-internal-boundary', /internal company review process/i.test(arbitration) && /not a court, not a law firm/i.test(arbitration));
check('paperwork-page-published', /In-house arbitration paperwork packet/i.test(paperwork) && /Refund calculation worksheet/i.test(paperwork));
check('notice-page-published', /Notice of dispute/i.test(notice) && /truthful lawful reviews/i.test(notice));
check('ae-role-page-published', /Legal Skyes AE committee role terms/i.test(aeRole) && /independent contractor Account Executive/i.test(aeRole));
check('ae-role-legal-certification-required', /verified legal certification or licensure/i.test(arbitration) && /verified legal certification or licensure/i.test(aeRole) && /Owner approval cannot substitute/i.test(aeRole) && /verified legal certification or licensure/i.test(paperwork) && /Owner approval cannot substitute/i.test(paperwork));
check('receipt-page-published', /legal-skyes-transaction-pack-2026-05-28/i.test(receipt) && /truthful-review\/non-waiver/i.test(receipt));
check('external-arbitration-page-published', /neutral external arbitrator/i.test(externalRules) && /not a substitute/i.test(externalRules));
check('terms-transaction-acceptance', /Transaction and dispute acceptance/i.test(terms) && /in-house dispute committee/i.test(terms));
check('terms-non-waiver-boundary', /truthful lawful reviews/i.test(terms) && /neutral external arbitration boundary/i.test(terms));
check('terms-no-guarantee-boundary', /not guarantees|No 100% success guarantee|No 100 percent success guarantee|No guaranteed outcome/i.test(terms));
check('dispute-committee-section', /In-house committee/i.test(disputes) && /internal dispute committee/i.test(disputes));
check('payments-refund-cap-section', /67%/.test(payments) && /documented overhead/i.test(payments));
check('sitemap-new-pages', ['/legal/proof-and-valuation/','/legal/in-house-arbitration/','/legal/arbitration-paperwork/','/legal/notice-of-dispute/','/legal/ae-committee-role-terms/','/legal/transaction-acceptance-receipt/','/legal/external-arbitration-rules/'].every((item) => sitemap.includes(item)));
check('redirects-new-pages', ['/proof-and-valuation /legal/proof-and-valuation/ 301','/in-house-arbitration /legal/in-house-arbitration/ 301','/arbitration-paperwork /legal/arbitration-paperwork/ 301','/notice-of-dispute /legal/notice-of-dispute/ 301','/transaction-acceptance-receipt /legal/transaction-acceptance-receipt/ 301','/external-arbitration-rules /legal/external-arbitration-rules/ 301'].every((item) => redirects.includes(item)));

const templatePaths = [
  'metraiyux_0s_site/Free99/apps/sovereigndocs/template-library/_base/dispute-committee/legal-skyes-notice-of-dispute.json',
  'metraiyux_0s_site/Free99/apps/sovereigndocs/template-library/_base/dispute-committee/evidence-packet.json',
  'metraiyux_0s_site/Free99/apps/sovereigndocs/template-library/_base/dispute-committee/panel-conflict-disclosure.json',
  'metraiyux_0s_site/Free99/apps/sovereigndocs/template-library/_base/dispute-committee/committee-recommendation.json',
  'metraiyux_0s_site/Free99/apps/sovereigndocs/template-library/_base/dispute-committee/refund-calculation.json',
  'metraiyux_0s_site/Free99/apps/sovereigndocs/template-library/_base/dispute-committee/final-internal-decision.json'
];
const templateParseFailures = templatePaths.filter((rel) => {
  try { JSON.parse(readRepo(rel)); return false; } catch { return true; }
});
check('sovereigndocs-paperwork-templates-present', templatePaths.every(existsRepo) && templateParseFailures.length === 0, {templateParseFailures});

const fs27Legal = readRepo('metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/legalAcceptance.js');
check('fs27-acceptance-requires-privacy-truthful', fs27Legal.includes('"privacy_policy_accepted"') && fs27Legal.includes('"truthful_review_boundary_acknowledged"'));
check('fs27-admin-stripe-acceptance', /missingLegalAcceptance/.test(readRepo('metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/stripe-create-checkout.js')));

const skyeCommerceStore = readRepo('metraiyux_0s_site/SkyeCommerce/public/store/index.html');
const skyeCommerceJs = readRepo('metraiyux_0s_site/SkyeCommerce/public/assets/js/store.js');
const skyeCommerceIndex = readRepo('metraiyux_0s_site/SkyeCommerce/src/index.js');
const skyeCommerceSkyPay = readRepo('metraiyux_0s_site/SkyeCommerce/src/lib/skyepay.js');
check('skyecommerce-public-checkout-acceptance', /name="legal_acceptance"/.test(skyeCommerceStore) && /legalAcceptancePayload/.test(skyeCommerceJs));
check('skyecommerce-api-checkout-acceptance', /requirePaidCheckoutLegalAcceptance/.test(skyeCommerceIndex) && /skyecommerce-public-order/.test(skyeCommerceIndex) && /skyecommerce-public-retry/.test(skyeCommerceIndex));
check('skyecommerce-skyepay-forwards-acceptance', /legal_acceptance: payload\.legal_acceptance/.test(skyeCommerceSkyPay));

const sovereignServer = readRepo('metraiyux_0s_site/Free99/apps/sovereigndocs/server/payment-adapter.mjs');
const worker = readRepo('metraiyux_0s_site/cloudflare/worker.js');
const routexPayments = readRepo('metraiyux_0s_site/SkyeRouteX/netlify/functions/_lib/housecircle-payment-providers.js');
check('sovereigndocs-billing-acceptance', /missingLegalAcceptance/.test(sovereignServer) && /legal_terms_url/.test(sovereignServer) && /legal_acceptance_version/.test(sovereignServer));
check('sovereigndocs-dispute-paperwork-api', /paperwork-packet/.test(worker) && /sdDisputePaperworkMarkdown/.test(worker));
check('sovereigndocs-dispute-certification-required', /legalCertificationRequired:true/.test(worker) && /legal_certification_verification_required/.test(worker) && /verified legal certification or licensure required/i.test(worker));
check('routex-ae-certification-required', /legal_certification_required:true/.test(worker) && /legal_certification_verified_before_case_assignment/.test(worker));
check('skyeroutex-payment-acceptance-metadata', /LEGAL_ACCEPTANCE_REQUIRED/.test(routexPayments) && /operator_authorized_internal_payment/.test(routexPayments));

const ownerEquivalentPhrase = 'owner-' + 'approved equivalent';
const certificationDriftPattern = new RegExp([
  `credential or ${ownerEquivalentPhrase}`,
  `Legal\\/compliance credentials or ${ownerEquivalentPhrase}`,
  'credentialed legal\\/compliance background preferred'
].join('|'), 'i');
const certificationDrift = [
  arbitration,
  paperwork,
  aeRole,
  worker
].filter((text) => certificationDriftPattern.test(text));
check('no-certification-softening-drift', certificationDrift.length === 0, {matches:certificationDrift.length});

const staleEmailHits = walk(siteRoot)
  .filter((file) => !/MCP_TOOLING_RECEIPT\.json$|google-indexing-submit\.json$/.test(file))
  .flatMap((file) => {
    const text = fs.readFileSync(file, 'utf8');
    const hits = [];
    if (/grayskyes@/i.test(text)) hits.push('grayskyes@');
    if (/legal@skyesoverlondon/i.test(text)) hits.push('legal@skyesoverlondon');
    return hits.length ? [{file:path.relative(repoRoot, file), hits}] : [];
  });
check('public-contact-emails-clean', staleEmailHits.length === 0, {staleEmailHits});

const report = {
  ok:checks.every((item) => item.ok),
  generated_at:new Date().toISOString(),
  checks
};
fs.mkdirSync(artifactDir, {recursive:true});
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ok:report.ok, reportPath, failed:checks.filter((item) => !item.ok).map((item) => item.id)}, null, 2));
if (!report.ok) process.exit(1);
