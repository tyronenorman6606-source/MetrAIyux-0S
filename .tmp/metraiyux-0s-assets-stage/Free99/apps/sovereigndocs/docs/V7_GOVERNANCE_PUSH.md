# SovereignDocs v7 Governance Push

This build keeps the v2.1 confidence-review template library as the source of truth and adds operational governance around it.

## Added

- `data/publishability-report.json` generated from the 10,200-record manifest.
- `data/review-lanes.json` separating low-risk public draft, medium-risk public gated draft, and high-risk admin-review-only records.
- `data/review-priority-board.json` for review prioritization without exposing the entire high-risk queue in the browser.
- `database/neon/v7-template-records.ndjson` for source-truth seeding into Neon/Postgres.
- `/publisher-console/` public/operator page for lane counts and category risk visibility.
- `/review-studio/` operator page for saving local review decisions in API mode.
- `/official-workflow-studio/` prep-packet page for official-source workflows.
- `/migration-center/` seed/cutover page.
- `/source-truth/` page showing the governing files.
- API routes for governance reports, review decisions, official workflow lookup, official prep packet generation, and template publish checks.

## Still not claimed

SovereignDocs v7 still does not claim attorney review, state compliance, court readiness, guaranteed enforceability, official filing submission, live agency filing, production payments, live email, or upstream-auth activation. Those remain blocked until proven.
