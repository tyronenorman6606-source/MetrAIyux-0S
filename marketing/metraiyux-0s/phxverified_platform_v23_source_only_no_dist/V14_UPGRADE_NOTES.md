# PHX Verified Platform v14 Upgrade Notes

This pass focused on code and marketplace operations, not deployment theater.

## Added

- Account opportunity scoring for every published business in `dist/data/account-opportunity-score.json`.
- AE pipeline board in `dist/data/ae-pipeline-board.json` and `/pipeline/`.
- Account workbench in `/accounts/` with ranked sales targets and next action per business.
- Marketplace KPI export in `dist/data/marketplace-kpi.json` and `/kpi/`.
- Claim lifecycle/status index in `dist/data/claim-status-index.json`.
- Admin batch actions in `dist/data/admin-batch-actions.json` and `/admin-batch/`.
- Owner follow-up calendar CSV in `dist/data/owner-followup-calendar.csv`.
- Public service lane catalog in `dist/data/service-lane-catalog.json` and `/service-lanes/`.
- Static API mirrors for account scores, KPIs, and service lanes.
- Smoke proof expanded to cover the new code paths and generated artifacts.

## Still intentionally not added

- Local auth. This remains upstream-auth ready.
- Fake payments, fake CRM sync, or fake live lead delivery claims.
- Auto-delete buttons that pretend to mutate the static seed. Admin removal still happens through reviewed suppression files and rebuilds.

## Proof

- Raw records loaded: 27,482.
- Published deduped businesses: 26,413.
- Duplicate/import collisions merged: 1,069.
- Import rejection candidates: 0.
- Poster-risk records: 0.
- Generated routes/pages counted: 26,738.
- Smoke checks passed: 873.
