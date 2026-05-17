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

- `npm run build` completed.
- `npm run smoke` completed with `748 checks passed`.
- `npm run dry-run` completed and reported 27,491 raw records, 26,422 published records, and 1,069 duplicate collisions merged.

No auth was added. Upstream auth should gate admin/operator/AE/revenue surfaces.
