# PHX Verified Platform v23 — Public Website Upgrade

This pass upgrades the public website layer around the seeded marketplace. It does not add local auth.

## Completed

✅ Rewrote the homepage as a buyer/business-owner marketplace website instead of an internal proof page.
✅ Added public website pages: `/about/`, `/how-it-works/`, `/for-businesses/`, `/advertise/`, `/network/`, and `/contact/`.
✅ Simplified the public header so normal visitors see marketplace navigation instead of dense AE/admin/operator controls.
✅ Added a public footer with marketplace guardrails and claim honesty.
✅ Added `/data/website-content.json` and `/api/website-content.json`.
✅ Added `/data/v23-website-readiness.json` and `/api/v23-website-readiness.json`.
✅ Updated sitemap pages and `llms.txt` with website context.
✅ Added `scripts/v23-enhance.mjs` and `scripts/v23-smoke.mjs`.
✅ Updated build/codecheck scripts so v23 reproduces after rebuild.

## Proof

`npm run codecheck` passes through v23.

Key v23 smoke result:

`v23 website smoke passed: 36 checks passed`

Current package still preserves v22 runtime closure, v21 full-static business profiles, and upstream-auth assumptions.
