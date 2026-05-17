# PHX Verified Platform v11 Upgrade Notes

## Scope

This release keeps the platform upstream-auth ready. No local login, session, or account system was added.

## New platform surfaces

- `/owner-verification/` — owner claim and verification packet queue.
- `/fraud-defense/` — one-business-one-posting control surface using duplicate clusters and contact fingerprints.
- `/lead-routing/` — generated city/category routing rules for buyer requests.
- `/lifecycle/` — listing enrichment and cleanup queue.
- `/opportunities/` — category opportunity scoring for scrape/enrichment priorities.
- `/monetization/` — sellable sponsor/profile/lead-routing inventory model.
- `/api/` — static JSON endpoint index for external apps and widgets.

## New generated data exports

- `/data/contact-fingerprint-index.json`
- `/data/duplicate-clusters.json`
- `/data/owner-verification-packets.json`
- `/data/business-lifecycle-queue.json`
- `/data/lead-routing-rules.json`
- `/data/category-opportunity-index.json`
- `/data/monetization-readiness.json`
- `/data/platform-api-index.json`
- `/data/fraud-defense.json`

## Static API endpoints

- `/api/businesses.json`
- `/api/search-index.json`
- `/api/categories.json`
- `/api/cities.json`
- `/api/lead-routing-rules.json`
- `/api/owner-verification-packets.json`
- `/api/fraud-defense.json`

## Fixed

The browser-side operator importer now supports `company_name`, `business_type`, `license_type`, and `service_address` aliases and correctly assigns `identity_key` during duplicate preview.

## Proof

`npm run verify` completed with 691 checks passing.
