# SovereignDocs Operating Model

The template library uses a competitive-scale architecture:

1. One original base template per document type.
2. One jurisdiction overlay per state plus D.C.
3. Generated records = base template × jurisdiction overlay.
4. All records preserve legal-review flags.
5. App imports from `manifest.json` or recursively scans `generated/`.

This creates 10200 template records from 200 maintainable originals.

## Why this beats one-off files

A one-off library becomes unmaintainable. This structure lets you update a base template once, then regenerate every state version. State-specific rules can be added later inside `_overlays/US-XX.json` or override files without rewriting every document.

## Status fields

- `original_seed_not_attorney_reviewed`: created and ready for platform seeding, not legal-release-ready.
- `review.requires_attorney_review`: keep this true for high-risk templates until reviewed.
- `review.state_specific_law_included`: false in this seed library by design.
