# SovereignDocs Architecture

SovereignDocs is intentionally file-driven.

The app shell lives in `index.html`, `assets/app.js`, and `assets/styles.css`.

The document product lives in `template-library/`.

This separation keeps public UX, app logic, and document content cleanly separated. Templates can be edited, replaced, expanded, and versioned without changing the app code.

## Current storage

The current build stores drafts and audit events in browser `localStorage`.

## Production storage path

When upstream auth is connected, replace local storage with:

- Postgres / Neon / D1 for document metadata, answers, audit events, and template versions
- R2 / S3-compatible storage for generated files
- Stripe or upstream checkout for payments
- Email provider for delivery
- Optional third-party e-sign provider for full signature workflows

## Do not add fake auth

This platform should inherit identity from upstream. Do not add local login unless explicitly requested.
