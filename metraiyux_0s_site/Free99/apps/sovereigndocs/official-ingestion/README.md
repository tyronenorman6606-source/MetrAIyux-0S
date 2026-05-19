# Official Source Ingestion

This module is for official government/court/tax/agency sources only. It does not scrape competitors.

Use cases:

1. Add verified official source URLs into `official-source-library/official-source-catalog.json`.
2. Place downloaded official PDFs or HTML snapshots into `official-ingestion/drop/` if the source permits downloading.
3. Run `npm run official:index` to create a staging ledger.
4. A reviewer approves whether the item becomes an official-source workflow, a prep worksheet, or a simple external route.

Policy: official forms are routed or prepared, not rewritten as private templates unless a lawful reusable form workflow is verified.
