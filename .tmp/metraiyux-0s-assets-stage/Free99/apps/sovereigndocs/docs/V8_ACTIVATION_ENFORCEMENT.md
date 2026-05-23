# SovereignDocs v8 Activation + Enforcement Build

This build fixes the upgrade gaps identified after v7. The goal is not more page count; it is stricter behavior.

## Implemented

- High-risk template DOCX export is blocked by default.
- High-risk static exports are prep worksheet only.
- High-risk API export requires either `exportMode: "prep_worksheet"` or a review decision allowing gated draft export.
- Signed upstream session adapter added. No built-in login UI was added.
- Role checks added for review-decision writes.
- Append-only hash-chain audit ledger added at `data/audit-ledger.ndjson`.
- Review statuses expanded to a real lifecycle: draft, needs_review, prep_only_approved, public_draft_approved, rejected, official_source_route, needs_attorney_review, deprecated, replaced.
- Official-source freshness report added at `data/official-workflow-freshness.json`.
- Paginated template search added at `/api/templates/search`.
- DOCX exporter now embeds visible disclaimer/metadata, header/footer text, custom properties, and audit identifiers.
- Neon and D1 schemas were upgraded to include upstream subjects, template versions, review decisions, official workflows, vault records, export events, publish lanes, and hash-chain audit events.
- Public overclaim scanner added.

## Still not claimed

SovereignDocs still does not claim attorney-reviewed, state-compliant, court-ready, guaranteed enforceability, official filing/submission, or direct agency/court/tax filing.
