# Skyes Over London Reviews — Proof Ecosystem

This package turns the review section into a full proof ecosystem.

## What changed

Each category is now its own page. Each page has:

1. A category-specific capability statement.
2. A list of what Skyes Over London excels at in that category.
3. Supporting reviews filtered to that category.
4. public-facing review presentation across the full ecosystem.
5. Contact CTAs using the business emails selected for this package.

The proof wall also has a live submission and service-request loop:

1. Clients use `submit-review.html`.
2. Service prospects use `request-service.html`.
3. The primary live lane is SkyeGateFS27 contact intake at `/api/contact/intake`, which stores private submissions, prepares Relay13/ConnectLog context, and sends Resend/Gmail backup notification.
4. The 0S operator uses `operator-review-queue.html` with the FS27 admin password or bearer session to approve or reject reviews.
5. When five approved unpublished reviews exist, the operator marks a production batch ready and exports it.
6. `tools/publish-live-review-batch.mjs --source=<exported-batch.json>` merges exactly five approved reviews into `data/reviews.public.json` and regenerates the wall/detail pages.

## Pages created

- `index.html` — proof ecosystem hub.
- `submit-review.html` — client-facing live review intake.
- `request-service.html` — public service request form routed into private FS27 contact intake.
- `operator-review-queue.html` — 0S QA queue for approving reviews before production.
- `categories/website-development.html` — Website Development (39 reviews)
- `categories/staffing-ae-network.html` — Staffing Solutions / AE Network (14 reviews)
- `categories/automation.html` — Automation (12 reviews)
- `categories/ai-systems-local-brain.html` — AI Systems / Local Brain (9 reviews)
- `categories/deployment-support.html` — Deployment Support (17 reviews)
- `categories/client-portals-upload-flow.html` — Client Portals / Upload Flow (8 reviews)
- `categories/government-contracting-readiness.html` — Government Contracting Readiness (9 reviews)
- `categories/business-operations.html` — Business Operations (45 reviews)
- `categories/local-seo.html` — Local SEO (8 reviews)
- `categories/sales-funnels-pitch-engines.html` — Sales Funnels / Pitch Engines (26 reviews)
- `categories/brand-strategy.html` — Brand Strategy (17 reviews)

## Data files

- `data/reviews.public.json` — source reviews.
- `data/review-submissions.queue.json` — local/export placeholder for pending and approved live reviews.
- `data/proof-ecosystem-map.json` — maps categories to capability pages and review IDs.

## Live queue setup

The current primary lane is FS27:

- `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/api/contact/intake`
- Admin review queue uses the FS27 admin password/session, not a separate review password.
- Resend/Gmail is backup notification, not the source of truth.
- Relay13/ConnectLog handoff is attempted when the Relay13 API key is configured; otherwise the FS27 intake record remains the private admin queue.

The older Cloudflare Pages KV function under `functions/api/review-submissions.js` remains as a legacy fallback for local/package continuity.

## Publish command

```bash
cd marketing/skyes-over-london-reviews/skyes-over-london-proof-ecosystem
node tools/publish-live-review-batch.mjs --source=path/to/sol-ready-review-batch.json
```

The command fails until it sees at least five approved unpublished reviews.

## Status

The package now presents the review ecosystem as public-facing proof.

## Public contact emails used

- skyesoverlondonlc@solenterprises.org
- skyesoverlondon@gmail.com
