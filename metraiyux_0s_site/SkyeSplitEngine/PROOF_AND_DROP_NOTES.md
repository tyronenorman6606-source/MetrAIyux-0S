# Proof and Drop Notes

## Completed upgrade scope

- Rebuilt the app as a stronger static offline-first PWA.
- Added the MetrAIyux 0S gate-session lock. Free99 means no charge, not anonymous access.
- Added dashboard metrics, quick actions, rule health, event log, data doctor, and restore snapshots.
- Added transaction CRUD, duplicate, single-transaction CSV export, full transaction CSV export, and transaction CSV import.
- Added people, product, and split-rule CRUD with defensive deletion guards.
- Added date-range reports, payout totals, detailed payout line exports, summary copy, print mode, and mark-range-settled action.
- Hardened local data with schema normalization, migration from the prior storage key, state repair, local backup, restore validation, and emergency backup on storage failure.
- Hardened the PWA service worker with versioned gated cache, same-origin GET handling, stale cache cleanup, gate helper caching, and navigation fallback.
- Fixed icon sizing so the 192 icon is truly 192x192 and the 512 icon is 512x512.

## Checks run

- `node --check index extracted script` passed.
- `node --check sw.js` passed.
- `python3 -m json.tool manifest.json` passed.
- Static grep found no TODO, placeholder, mock-success, or lorem filler strings before import. Post-import proof now requires gate-session strings and overlay proof.
- Chromium live smoke was attempted, but this sandbox's browser policy blocks file, localhost, and container-IP pages with an organization-policy error. The app files are static-host compatible; deploy to Netlify/Cloudflare Pages or open through a normal browser/static server for live click-through.

## Drop instructions

Deploy the folder contents as a static site under the 0S. No server build step and no environment variables are required, but the 0S gate-session helper must stay enabled.
