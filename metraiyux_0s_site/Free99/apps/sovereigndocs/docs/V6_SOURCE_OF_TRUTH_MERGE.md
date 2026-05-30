# SovereignDocs v6 Source-of-Truth Merge

Built: 2026-05-10T19:23:37.102530+00:00

The older 148-template seed has been replaced by the uploaded v2.1 confidence-review library. Runtime source files now wired directly:

- `template-library/manifest.json` — 10,200 generated records
- `template-library/categories.json` — 15 categories
- `template-library/jurisdictions.json` — 51 U.S. jurisdictions including D.C.
- `audit/publish-gates.json` — public claim and release gates
- `official-source-library/official-workflows.json` — 37 official-source prep workflows
- `review-workflow/review-queue-high-risk.json` - elevated-review records stay guarded before completed export
- `template-library/state-overlays-v2/US-AZ.json` — Arizona official-source overlay scaffold

Safe: seed into Neon/Postgres, browse internally/admin-side, publish low/medium draft automation with warnings, and use official-source workflows as prep packets and routing.

Not safe: attorney-reviewed claims, state-compliant claims, court-ready claims, official filing/submission claims, or public high-risk generation without explicit review gates.

Generated sitemap entries: 20,481.
