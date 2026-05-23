# Seeding Guide

Place incoming scrape exports in:

```text
seed/businesses/inbox/
```

Supported formats: `.csv` and `.json`.

## Important accepted CSV aliases

The importer accepts live city-license style columns such as:

- `company_name` → business name
- `business_type` → category/license/classification signal
- `address` or `service_address` → address
- `city`, `state`, `zip`
- `website`, `url`, `site`, `business_website`, `web_site`
- `phone`, `telephone`, `phone_number`
- `email`, `contact_email`
- `poster_email`, `submitter_email`, `owner_email`

See `dist/data/seed-field-map.json` after build for the full alias map.

## Duplicate prevention

The platform builds canonical identity keys from domain, email, phone, source hash, and name/address/city/zip. Exact collisions merge automatically. Possible near-duplicates go into:

- `dist/data/duplicate-report.json`
- `dist/data/admin-action-packets.json`
- `dist/data/admin-bulk-actions.csv`

## Suppressions/removal

To remove or block a listing, edit:

```text
seed/businesses/suppressions.json
```

You can suppress by:

- id
- identity key
- domain
- phone
- email
- source hash

Then rebuild.

## Dry run

Run:

```bash
npm run dry-run
```

This generates data-only import reports before you publish the full platform.


## v11 Upgrade Pass

Added owner-verification packets, fraud-defense/contact-fingerprint controls, duplicate clusters, lifecycle queues, lead-routing rules, opportunity scoring, monetization readiness, and static API endpoints. The app still does not include local auth; upstream auth can gate operator/admin routes later. Seed workflow remains `seed/businesses/inbox/` followed by `npm run build` or Netlify deploy. Proof is stored in `proofs/smoke-output.txt` and currently reports 691 checks passed.
