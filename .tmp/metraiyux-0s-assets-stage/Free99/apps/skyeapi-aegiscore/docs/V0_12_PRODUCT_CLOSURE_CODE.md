# SkyeAPI + AegisCore v0.12.0 product-code upgrade

This pass adds code depth without making deployment claims.

Implemented code additions:

- Hosted provider-pack install-from-source receipts for inline, directory, zip, and git sourced packs.
- Provider-pack certification receipts with checksum and optional signed manifest.
- Billing invoice draft objects generated from metered usage records.
- Billing invoice export as JSON or CSV.
- CLI coverage for job leases, provider-pack signing/verification/dependencies, source installs, billing exports, and invoice drafts.
- SDK coverage for source installs, certification receipts, invoice drafts, and invoice exports.
- Console controls for source install, certification receipts, and invoice draft/export.
- Playwright-ready console E2E spec. The local proof only verifies that the spec and console contract exist; it does not claim a Chromium browser run.

Not claimed:

- Live provider certification.
- Live Stripe subscription collection.
- Deployed distributed locking under simultaneous workers.
- Real browser E2E execution unless Playwright browsers are installed and `pnpm --filter @skyeapi/console test:e2e` is run.
