export const SKYPAY_LEGAL_ACCEPTANCE_VERSION = "legal-skyes-transaction-pack-2026-05-28";

export const SKYPAY_LEGAL_ACCEPTANCE_URLS = Object.freeze({
  terms: "https://skyes-over-london-legal.pages.dev/legal/terms/",
  arbitration: "https://skyes-over-london-legal.pages.dev/legal/in-house-arbitration/",
  external_arbitration_rules: "https://skyes-over-london-legal.pages.dev/legal/external-arbitration-rules/",
  dispute_resolution: "https://skyes-over-london-legal.pages.dev/legal/dispute-resolution/",
  payments_refunds: "https://skyes-over-london-legal.pages.dev/legal/payments-refunds/",
  privacy: "https://skyes-over-london-legal.pages.dev/legal/privacy/",
  zero_os: "https://skyes-over-london-legal.pages.dev/legal/metraiyux-0s/",
  proof_valuation: "https://skyes-over-london-legal.pages.dev/legal/proof-and-valuation/",
  transaction_acceptance_receipt: "https://skyes-over-london-legal.pages.dev/legal/transaction-acceptance-receipt/"
});

const REQUIRED_ACCEPTANCE_FLAGS = Object.freeze([
  "legal_terms_accepted",
  "arbitration_accepted",
  "payments_policy_accepted",
  "no_outcome_guarantee_accepted",
  "truthful_review_boundary_acknowledged",
  "privacy_policy_accepted"
]);

function bool(value) {
  if (value === true) return true;
  return ["1", "true", "yes", "y", "on", "accepted", "agree", "agreed"].includes(String(value || "").trim().toLowerCase());
}

function clean(value, limit = 500) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, limit);
}

function sourceAcceptance(body = {}) {
  const nested = body.legal_acceptance && typeof body.legal_acceptance === "object" ? body.legal_acceptance : {};
  const camel = body.legalAcceptance && typeof body.legalAcceptance === "object" ? body.legalAcceptance : {};
  return { ...nested, ...camel, ...body };
}

export function normalizeLegalAcceptance(body = {}, source = "skypay") {
  const input = sourceAcceptance(body);
  const allAccepted = bool(input.legal_acceptance)
    || bool(input.accept_legal_pack)
    || bool(input.acceptLegalPack)
    || bool(input.accepted);
  const flag = (...names) => allAccepted || names.some((name) => bool(input[name]));
  const acceptedAt = clean(input.accepted_at || input.acceptedAt || "", 80) || (allAccepted ? new Date().toISOString() : "");
  return {
    legal_terms_accepted: flag("legal_terms_accepted", "legalTermsAccepted", "terms_accepted", "termsAccepted", "accept_terms", "acceptTerms"),
    arbitration_accepted: flag("arbitration_accepted", "arbitrationAccepted", "in_house_arbitration_accepted", "inHouseArbitrationAccepted", "accept_arbitration", "acceptArbitration"),
    payments_policy_accepted: flag("payments_policy_accepted", "paymentsPolicyAccepted", "refund_policy_accepted", "refundPolicyAccepted", "accept_payments_policy", "acceptPaymentsPolicy"),
    no_outcome_guarantee_accepted: flag("no_outcome_guarantee_accepted", "noOutcomeGuaranteeAccepted", "no_guarantee_accepted", "noGuaranteeAccepted", "accept_no_guarantee", "acceptNoGuarantee"),
    truthful_review_boundary_acknowledged: flag("truthful_review_boundary_acknowledged", "truthfulReviewBoundaryAcknowledged", "accept_truthful_review_boundary", "acceptTruthfulReviewBoundary"),
    privacy_policy_accepted: flag("privacy_policy_accepted", "privacyPolicyAccepted", "accept_privacy", "acceptPrivacy"),
    legal_version: clean(input.legal_version || input.legalVersion || SKYPAY_LEGAL_ACCEPTANCE_VERSION, 120),
    accepted_at: acceptedAt,
    acceptance_surface: clean(input.acceptance_surface || input.acceptanceSurface || source, 160),
    source_url: clean(input.source_url || input.sourceUrl || input.href || "", 500)
  };
}

export function missingLegalAcceptance(body = {}) {
  const acceptance = normalizeLegalAcceptance(body);
  return REQUIRED_ACCEPTANCE_FLAGS.filter((name) => acceptance[name] !== true);
}

export function legalAcceptanceMetadata(body = {}, source = "skypay") {
  const acceptance = normalizeLegalAcceptance(body, source);
  return {
    legal_acceptance_version: acceptance.legal_version || SKYPAY_LEGAL_ACCEPTANCE_VERSION,
    legal_terms_accepted: String(acceptance.legal_terms_accepted),
    arbitration_accepted: String(acceptance.arbitration_accepted),
    payments_policy_accepted: String(acceptance.payments_policy_accepted),
    no_outcome_guarantee_accepted: String(acceptance.no_outcome_guarantee_accepted),
    truthful_review_boundary: String(acceptance.truthful_review_boundary_acknowledged),
    privacy_policy_accepted: String(acceptance.privacy_policy_accepted),
    legal_acceptance_at: clean(acceptance.accepted_at, 80),
    legal_acceptance_surface: clean(acceptance.acceptance_surface || source, 160),
    legal_terms_url: SKYPAY_LEGAL_ACCEPTANCE_URLS.terms,
    legal_arbitration_url: SKYPAY_LEGAL_ACCEPTANCE_URLS.arbitration,
    legal_external_arbitration_rules_url: SKYPAY_LEGAL_ACCEPTANCE_URLS.external_arbitration_rules,
    legal_proof_valuation_url: SKYPAY_LEGAL_ACCEPTANCE_URLS.proof_valuation,
    legal_receipt_spec_url: SKYPAY_LEGAL_ACCEPTANCE_URLS.transaction_acceptance_receipt
  };
}
