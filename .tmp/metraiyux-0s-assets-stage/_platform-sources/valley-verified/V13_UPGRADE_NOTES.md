# PHX Verified v13 Upgrade Notes

v13 focuses on production readiness instead of adding more decorative pages.

## Added

- `/production-readiness/` production gate page.
- `/claims-ledger/` public supported/blocked claims ledger.
- `/launch-packet/` deployment and proof packet page.
- `dist/data/production-readiness.json`.
- `dist/data/public-claims-ledger.json`.
- `dist/data/launch-packet.json`.
- `npm run production-check`.
- Internal route noindex metadata.
- Robots disallow rules for admin/operator/data/API surfaces.
- Public sitemap filtering so admin/operator pages are not promoted to crawlers.
- Cleaned the Arizona CSV seed by removing 9 invalid blank-name rows before publishing.

## Current local proof

- Superseded by the May 19, 2026 seed cleanup.
- Current active raw seed records: 19.
- Current published businesses: 19.
- Current blank phone/email/website records: 0.
- Current active demo seed rows: 0.
- Current smoke suites pass against the cleaned dataset.

## Production note

This is a production candidate package. It should not be called live-production-certified until the deployed URL passes browser smoke against the actual Netlify/production domain.
