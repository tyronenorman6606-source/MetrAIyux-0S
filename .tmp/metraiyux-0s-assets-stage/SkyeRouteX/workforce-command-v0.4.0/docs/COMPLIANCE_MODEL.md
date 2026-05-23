# RouteX Compliance Model

RouteX supports a production-safe manual compliance lane for an Arizona LLC that wants to run its own workforce checks and paid client workflows without forcing Checkr.

## Supported modes

`manual-government-check`

- Default production compliance lane when Checkr or a signed compliance webhook is not configured.
- Records consented manual public-record, state/county, subject-provided, E-Verify/I-9, MVR/DPPA, and proof-vault workflow evidence.
- Stores the check source, status, checklist, notes, proof reference, uploaded proof media, audit event, and integration outbox row.
- Keeps adjudication ownership on the internal employer or the client workspace business.
- Does not claim MetrAIyux is directly pulling FBI rap sheets, NCIC records, or acting as a background-report furnisher.

`checkr`

- Optional native automated background-check invitation provider.
- Requires `CHECKR_API_KEY` and `CHECKR_PACKAGE`.

`compliance-webhook`

- Optional signed integration lane for Certn, Checkr alternatives, a legal vendor, or a custom screening partner.
- Requires `COMPLIANCE_WEBHOOK_ENDPOINT` and `COMPLIANCE_WEBHOOK_SIGNING_SECRET`.

## Arizona operating notes

An Arizona LLC/EIN helps with business identity, vendor onboarding, client contracts, E-Verify enrollment, and permitted-purpose paperwork. It does not automatically grant direct access to all government criminal-history systems for third-party client screening.

Arizona employers have a separate work-authorization lane: the Legal Arizona Workers Act requires Arizona employers to use E-Verify for new employees. RouteX treats this as a compliance checklist/proof item, not as a criminal background check.

## Safe revenue boundary

RouteX can bill for:

- Compliance workflow administration.
- Consent/disclosure packet handling.
- Manual public-record checklist execution.
- Government portal submission tracking where the business has authority.
- Proof-vault storage and audit receipts.
- Client workspace reporting.

RouteX should avoid selling "MetrAIyux background reports" to third-party clients unless the business intentionally operates as a consumer reporting agency and implements the full FCRA obligations for screening companies. Safer wording is "manual compliance admin-assist and proof-vault workflow."

## App proof

House Command can create manual compliance proof rows through:

```txt
POST /api/compliance/manual-checks
GET /api/compliance/checks
```

The browser app exposes this as `Manual Compliance Vault` in the House Command panel. The smoke proof is:

```txt
npm run smoke:manual-compliance
```

Official references:

- FTC employer background-check guidance: https://www.ftc.gov/business-guidance/resources/background-checks-what-employers-need-know
- FTC background-screening company FCRA guidance: https://www.ftc.gov/business-guidance/resources/what-employment-background-screening-companies-need-know-about-fair-credit-reporting-act
- FBI Identity History Summary employment/licensing note: https://forms.fbi.gov/identity-history-summary-checks-review/
- Arizona Legal Workers Act employer page: https://www.azag.gov/civil-rights/legal-az-workers-act/employers
