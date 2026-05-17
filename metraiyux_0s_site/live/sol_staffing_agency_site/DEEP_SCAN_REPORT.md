# Deep Scan Report

Scanned package: `sol_staffing_agency_site`

## Architecture Found

- Static Netlify website with public staffing, candidate, employer, government, SEO, and campaign pages.
- Internal operating pages for AE sales, recruiter desk, CRM pipeline, placement tracking, risk, billing, training, forms, vendor ops, and brain command.
- Local browser brain powered by `brain/brain.js`, `brain/brain-corpus.json`, and fallback data.
- Static CSV/JSON seed data under `data/`.
- Original form handling depended on Netlify Forms/static submission only.
- Original `netlify/functions/brain.js` was a non-provider stub.

## Serious Gaps Found Before Upgrade

- Internal pages were visible as static HTML.
- No Skyegate FS27 auth receiver.
- No persistent server-side record store.
- Forms did not become operational CRM/ATS records.
- No authenticated document upload/download flow.
- No admin dashboard for reviewing leads, jobs, candidates, risks, documents, or brain feedback.
- No real GPU/Ollama/vLLM endpoint wiring.

## Upgrades Added

- Edge auth gate for internal pages via `netlify/edge-functions/auth-gate.js`.
- Skyegate FS27 session bridge via `staffing-auth-session`, `staffing-auth-me`, `staffing-auth-logout`, and `staffing-auth-config`.
- Admin dashboard at `admin-dashboard.html`.
- Login page at `staffing-login.html`.
- Server-side record API at `staffing-records`.
- Form-to-record API at `staffing-submit`.
- Secure upload/download API at `staffing-files`.
- Real live brain endpoint in `netlify/functions/brain.js`.
- Front-end form submission wiring in `script.js`.
- Netlify Blobs dependency and package checks in `package.json`.

## Protected Internal Routes

The auth gate covers the internal `.html` pages and their short aliases, including admin, AE command, CRM, placements, risk register, forms directory, operations hub, vendor packet, training, timesheets, proposal builder, agreement packet, employer portal, government opportunities, sales scripts, deployment command, recruiter desk, and brain command.

## Activation Requirements

- Configure Skyegate FS27 introspection: `SKYGATE_FS27_INTROSPECT_URL` or `SKYEGATE_FS27_INTROSPECT_URL`.
- Configure admin roles if needed: `SOL_STAFFING_ADMIN_ROLES`.
- Configure live brain: `OLLAMA_BASE_URL` + `OLLAMA_MODEL`, or `GPU_BRAIN_ENDPOINT` + `GPU_BRAIN_MODEL`.
- Review retention and legal/compliance policy before collecting sensitive staffing documents.

## Verification Run

- `npm install --package-lock-only`: passed with 0 vulnerabilities.
- `npm run check`: passed for Netlify Functions and edge function syntax.
- Local function smoke with `SOL_STAFFING_DEV_TOKEN`: form submit returned `200`, admin summary returned `200`, unauthenticated admin returned `401`, unconfigured live brain returned expected `503`.
