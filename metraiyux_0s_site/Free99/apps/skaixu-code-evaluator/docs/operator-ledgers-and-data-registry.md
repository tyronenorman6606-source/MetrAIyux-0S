# Operator Ledgers and Data Registry

This app now includes two operator-grade surfaces beyond the evaluator:

1. **Ops ledger** — converts deterministic scan results into a real code backlog. It flags secrets, risky APIs, missing tests, missing env examples, public-surface gaps, seed-pipeline gaps, and readiness blockers. Operators can export the backlog as JSON or write `platform-ledgers/` files directly into the loaded project.
2. **Data registry** — validates seed records, infers schemas, detects duplicate-like records, projects business-directory records, and writes generated platform data into `generated/platform-data/`.

## Seed-to-platform workflow

Drop scraped or curated files into `platform-seed/`, list them in `platform-seed/manifest.json`, redeploy, then use **Seed center → Autoload static manifest**.

Runtime imports are also supported through seed folder or seed ZIP upload.

After seeds are loaded, open **Data registry** and run:

- **Validate seeds** — builds schema inference and a validation report.
- **Materialize seed data into project** — writes:
  - `generated/platform-data/seed-registry.json`
  - `generated/platform-data/business-directory.json`
  - `generated/platform-data/data-schemas.json`
  - `generated/platform-data/seed-validation-report.md`

This is designed for the pattern where external scraping/curation creates files, then the platform catches them through a manifest-backed seed folder.

## Backlog-to-code workflow

Open **Ops ledger** and use:

- **Export backlog** for external review.
- **Write ledger files into project** to add:
  - `platform-ledgers/PLATFORM_BACKLOG.md`
  - `platform-ledgers/PLATFORM_ISSUES.json`
  - `platform-ledgers/PLATFORM_EVENTS.json`
  - `platform-ledgers/SEED_VALIDATION.json`

These files are generated from current loaded code and can be committed with the platform as proof artifacts.

## Patch safety

`SKAI_PATCH_BUNDLE` application now has a preflight gate. It blocks path traversal, duplicate paths, missing full file contents, invalid actions, unsafe updates to missing files, high-risk deletes, and oversized file changes.
