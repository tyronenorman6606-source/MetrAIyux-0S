# v12 Upgrade Notes — Money-Path Platform Pass

This pass turns PHX Verified from a seeded directory into a more complete verified business network and AE-driven exposure platform.

## Added public/commercial surfaces

- `/join/` — business owner claim, correction, verification, and upgrade path.
- `/pricing/` — exposure products: free seeded listing, verified profile upgrade, featured placement, lead-routing membership, category sponsor, managed growth pack.
- `/trust-network/` — public doctrine explaining one real business, one canonical profile, and no fake verification claims.

## Added AE/operator money surfaces

- `/ae-command/` — AE command center with priority call queue.
- `/activation/` — commercial activation pipeline for every seeded business.
- `/territories/` — AE territory plan by city/category strength.
- `/sales-playbook/` — AE openers, objections, follow-up sequence, and category angles.
- `/revenue/` — conservative/aggressive MRR readiness model.

## Added generated data/API exports

- `/data/exposure-products.json`
- `/data/activation-pipeline.json`
- `/data/ae-territory-plan.json`
- `/data/ae-call-queue.csv`
- `/data/sales-playbooks.json`
- `/data/revenue-readiness.json`
- `/data/marketplace-command-center.json`
- `/api/exposure-products.json`
- `/api/activation-pipeline.json`
- `/api/ae-territory-plan.json`
- `/api/revenue-readiness.json`

## Proof

- Historical v12 proof was superseded by the May 19, 2026 seed cleanup.
- Current active package: 19 published records, 0 blank phone/email/website records, and 0 active demo seed rows.
- Current proof: `npm run smoke`, `npm run v22-smoke`, and `npm run v23-smoke` pass against the cleaned dataset.

No auth was added. Upstream auth should gate admin/operator/AE/revenue surfaces.
