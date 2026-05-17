# Valley Verified Network Platform v13

Valley Verified is a multi-page, seed-driven Phoenix metro business and service marketplace. It starts with a large seeded supply of real businesses, then gives AEs and operators a path to activate owners into claims, corrected profiles, verification packets, exposure upgrades, lead routing, sponsor inventory, and managed growth products.

No local username/password system is included. Admin/operator/revenue surfaces are wired to inherit identity from the MetrAIyux 0S / SkyeGateFS27 gate. The function layer can introspect an FS27 bearer token, strip public `x-upstream-*` spoofing headers, and inject trusted upstream identity before PHX policy code runs. Internal routes still ship as `noindex,nofollow,noarchive` with robots disallow rules so public crawl energy stays on marketplace pages.

## v14 money-path code upgrade

This build adds the code-side operations layer needed to make the marketplace sellable: account opportunity scoring, AE pipeline stages, marketplace KPIs, admin batch actions, owner follow-up calendar CSV, claim lifecycle indexing, service-lane cataloging, and static API exports for the new datasets. Auth is still intentionally excluded because upstream auth owns access control.

Key new surfaces: `/accounts/`, `/pipeline/`, `/kpi/`, `/admin-batch/`, and `/service-lanes/`.

Key new exports: `data/account-opportunity-score.json`, `data/ae-pipeline-board.json`, `data/marketplace-kpi.json`, `data/admin-batch-actions.json`, `data/owner-followup-calendar.csv`, `data/claim-status-index.json`, and `data/service-lane-catalog.json`.

## Current production status

This package is a **production candidate package**, not a live-production-certified deployment. The code, generated data, route map, crawl controls, dry-run, and smoke suite pass locally. Final production certification still requires deploying the package and running browser smoke against the real live URL.

Production gate files:

- `dist/data/production-readiness.json`
- `dist/data/public-claims-ledger.json`
- `dist/data/launch-packet.json`
- `dist/production-readiness/index.html`
- `dist/claims-ledger/index.html`
- `dist/launch-packet/index.html`

## What v13 includes

- Public marketplace: landing page, directory, business profiles, city hubs, category hubs, niche hubs, city/category market pages, collections, offer marketplace, map discovery, match engine, shortlist, and comparison board.
- Business-owner growth path: `/join/`, `/claim/`, `/pricing/`, `/submit/`, `/request/`, and `/trust-network/`.
- AE and revenue layer: `/ae-command/`, `/activation/`, `/territories/`, `/sales-playbook/`, `/revenue/`, `/monetization/`, `/sponsor/`, `/outreach/`, `/lead-routing/`, and `/opportunities/`.
- Admin/operator controls: `/operator/`, `/import-health/`, `/dry-run/`, `/duplicates/`, `/fraud-defense/`, `/admin-actions/`, `/admin-review/`, `/owner-verification/`, `/lifecycle/`, `/coverage/`, `/routing/`, `/crawl/`, `/exports/`, `/api/`, `/data/`, `/platform/`, `/production-readiness/`, `/claims-ledger/`, and `/launch-packet/`.
- Large dataset support for the Arizona business seed: 27,482 raw records loaded and 26,413 deduped businesses published after removing 9 invalid blank-name rows from the seed CSV.
- One-business-one-posting controls through canonical identity keys, exact duplicate merges, contact fingerprints, duplicate clusters, poster-risk reports, suppression templates, and canonical route maps.
- Production crawl hardening: public sitemap excludes admin/operator routes; robots.txt disallows internal surfaces; internal pages include noindex meta.
- Easy seed workflow: drop CSV/JSON scrape exports into `seed/businesses/inbox/`, then run `npm run dry-run` or `npm run production-check`.
- Static data/API exports under `dist/data/` and `dist/api/`, including business JSON/CSV, search shards, profile shards, activation pipeline, AE call queue, territory plan, sales playbooks, exposure products, revenue readiness, fraud defense, verification packets, lead routing, claims ledger, launch packet, and command-center snapshots.

## Commands

```bash
npm run dry-run            # pre-publish import safety report
npm run build              # generate the full platform into dist/
npm run smoke              # verify generated routes/data/surfaces
npm run verify             # build then smoke
npm run production-check   # dry-run, build, smoke
npm run seed               # data-only generation
```

## Seed workflow

1. Add CSV or JSON files to `seed/businesses/inbox/`.
2. Run `npm run dry-run` to inspect import safety.
3. Review `dist/data/import-dry-run.json`, `dist/data/import-rejections.json`, `dist/data/duplicate-report.json`, `dist/data/poster-risk-index.json`, and `dist/data/duplicate-clusters.json`.
4. Add confirmed removals or blocked identities to `seed/businesses/suppressions.json`.
5. Run `npm run production-check`.
6. Deploy `dist/`.
7. Run the live URL checks listed in `dist/data/production-readiness.json` before calling the deployment production-certified.

## Money path

The platform is structured to monetize only after the seeded network has supply:

1. Seed the market with public/licensed businesses.
2. Deduplicate and keep one canonical profile per real business.
3. Use AE call queues and territory plans to contact owners.
4. Move owners through claim, correction, and verification packets.
5. Sell verified profile upgrades, featured market placement, lead-routing membership, category sponsorship, and managed growth packs.
6. Use the public claims ledger so AEs do not overpromise owner verification, lead volume, rankings, or guaranteed outcomes.

## Important auth note

Production auth now expects the 0S/SkyeGateFS27 gate:

- Set `SKYGATEFS27_ORIGIN` to the live FS27 gate origin.
- Set `PHX_GATE_AUTH_REQUIRED=true`.
- Send customer/operator requests with `Authorization: Bearer <FS27 session JWT or kx_live API key>`.
- The PHX adapter strips public `x-upstream-*` headers, introspects the gate token, then injects trusted `x-upstream-user-id`, `x-upstream-user-email`, `x-upstream-roles`, `x-upstream-customer-id`, `x-upstream-workspace-id`, and `x-upstream-plan`.

Only use `PHX_TRUST_UPSTREAM_HEADERS=true` when a trusted reverse proxy is already stripping and injecting those headers. Robots/noindex rules are crawl protection, not access control.

## Proof

Latest local proof is stored in `proofs/smoke-output.txt` and reports `822 checks passed`. Import dry-run proof is stored in `proofs/dry-run-output.txt` and reports `Safe to publish: yes`.

## v15 Backend-ready action layer

This package now includes upstream-auth-ready runtime action contracts in `src/server/`, a thin action endpoint entrypoint at `netlify/functions/phx-action.mjs`, generated backend/operator pages, and an action smoke test. It still does not fake live mutation: claims, leads, suppressions, AE notes, profile patches, and verification decisions are queued for authenticated backend review/persistence.

Proof: `npm run smoke` passes 928 checks and `npm run action-smoke` passes 9 action checks.


## v16 runtime state projection

This package adds real code for approved workflow state without adding local auth. New runtime modules include `src/server/state-store.mjs`, `src/server/db-adapters.mjs`, and `src/server/business-index.mjs`. New generated surfaces include `/runtime-state/`, `/db-contracts/`, and `/approval-flow/`. New proof commands include `npm run state-smoke`, and `npm run verify` now runs build, smoke, action-smoke, and state-smoke.

## v17 Code Infrastructure Pass

v17 adds the backend-ready mutation service layer the platform needed after v16 state projection:

- policy-enforced action intake
- immutable event ledger
- signed webhook outbox jobs
- action replay into runtime state
- admin change-set exports
- suppression patch generation
- mutation smoke proof

No local auth was added. The runtime still expects upstream auth headers from the gateway layer.

## v18 Code Layer

v18 adds the runtime bridge that was missing after the mutation-service pass: concrete adapter code, an upstream-auth admin API, signed webhook outbox processing, and exposure-order intent generation. Local auth is still intentionally omitted because this platform is designed to inherit upstream identity.

New code commands:

```bash
npm run v18-smoke
npm run codecheck
npm run production-check
```

New operational endpoint wrapper:

`netlify/functions/phx-admin.mjs`

New server modules:

`src/server/adapter-runtime.mjs`, `src/server/admin-api.mjs`, `src/server/notification-service.mjs`, and `src/server/exposure-service.mjs`.

## v19 payment/runtime upgrade


v19 adds the paid-exposure code layer: checkout/session creation, payment webhook signature verification, payment-event action recording, admin exposure activation state projection, and an upstream-auth admin console surface.

Key files:

- `src/server/payment-service.mjs`
- `netlify/functions/phx-payment.mjs`
- `src/admin-console.js`
- `scripts/v19-enhance.mjs`
- `scripts/v19-smoke.mjs`

Key generated surfaces:

- `/payment-service/`
- `/checkout-service/`
- `/payment-webhooks/`
- `/paid-exposure-ledger/`
- `/admin-console/`

Proof:

- `npm run smoke` passed 1002 checks.
- `npm run action-smoke` passed 11 checks.
- `npm run state-smoke` passed 13 checks.
- `npm run mutation-smoke` passed 21 checks.
- `npm run v18-smoke` passed 17 checks.
- `npm run v19-smoke` passed 21 checks.

Boundary: v19 does not fake completed billing. Payment checkout produces unpaid session records; verified payment webhooks produce `payment_event` records; paid placement activates only after admin `exposure_activation` approval.


## v20 Operational Code Upgrade

v20 adds quote routing, lead route decisions, AE assignment actions, owner message drafts, notification delivery receipt events, and revenue attribution events. It remains upstream-auth-ready and does not fake delivery, payment, or payout proof. Run `npm run production-check` for the full proof suite.

## v21 Code Upgrade Layer

The v21 package fixes the main code gaps from the v20 audit:

- Every business profile route now has generated static HTML with unique canonical metadata and LocalBusiness JSON-LD.
- Heavy duplicated public/API data was compacted and old profile shards were removed.
- Runtime persistence now includes JSON, D1, and Neon-style adapter paths.
- `/protected-admin/` is an upstream-auth admin app that calls runtime endpoints without local proof-control fields.
- Enrichment, lead records, payment activation, notification workers, and claim submissions now have dedicated code modules.
- `scripts/build.mjs` is now an orchestrator; the original core generator is preserved in `scripts/build-core.mjs` and enhancement layers live in separate scripts.

Useful commands:

```bash
npm run build
npm run codecheck
npm run v21-smoke
npm run build:enhance
```

## v22 closure pass

v22 adds a shared runtime context, real adapter round-trip proof, claim/auth bug fixes, admin operation repair, and static artifact compaction. It keeps upstream auth as the authority and does not add local login.

Run:

```bash
npm run build
npm run codecheck
npm run v22-smoke
```

Key proof files:

- `data/v22-code-readiness.json`
- `data/runtime-wiring.json`
- `data/persistence-health-model.json`
- `data/artifact-manifest.json`

## v23 public website layer

v23 upgrades the public website surface around the marketplace. The home page now sells Valley Verified as an Arizona verified business network instead of acting like an internal proof page. Public pages include `/about/`, `/how-it-works/`, `/for-businesses/`, `/advertise/`, `/network/`, and `/contact/`.

The public header is intentionally simplified. Internal operator and AE surfaces still exist, but they are no longer pushed into the main buyer/business-owner navigation. No local auth was added; protected operations remain upstream-auth driven.

Run `npm run v23-smoke` for the website-specific proof and `npm run codecheck` for the full proof chain.

## 0S gate + first-month customer landing add-on

This 0S-wired package adds:

- `src/server/gate-auth.mjs` for FS27 bearer-token introspection and trusted upstream identity injection.
- `netlify/functions/phx-customer-posting.mjs` for the customer benefit endpoint.
- `src/server/customer-posting-entitlement.mjs` for the first-month eligibility rule.
- `customer_business_posting` action contract, queued to `customer-business-postings`.

Every MetrAIyux 0S customer can receive one free Valley Verified public business landing/posting after the first paid month clears. The landing is queued behind gate auth and review; it does not auto-publish or bypass duplicate/quality controls.
