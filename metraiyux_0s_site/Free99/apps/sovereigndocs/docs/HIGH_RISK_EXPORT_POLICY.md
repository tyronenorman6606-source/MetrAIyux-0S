# High-Risk Export Policy

High-risk templates are not casual public documents.

## API behavior

A high-risk template without a review decision is blocked from completed public DOCX export, even if the user accepts the boundary and high-risk acknowledgement.

Allowed high-risk outputs:

1. Prep worksheet / intake packet with `exportMode: "prep_worksheet"`.
2. Gated draft export only after a review decision with status `public_draft_approved`.
3. Prep-only export after a review decision with status `prep_only_approved`.

Blocked statuses:

- rejected
- deprecated
- replaced
- official_source_route for generated document export
- needs_attorney_review for public document export

## Static browser behavior

Static mode has no trusted review-decision backend. Therefore high-risk exports are prep worksheet only.
