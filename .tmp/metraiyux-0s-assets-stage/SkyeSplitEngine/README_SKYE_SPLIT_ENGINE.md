# Skye Split Engine

Drop-ready static PWA imported into MetrAIyux 0S as a Free99 gated app. Free99 means no charge; it still requires a 0S, FS27, SkyGate, or local admin gate session before the app boots. The app remains local-first and stores data in browser storage with JSON/CSV export controls after the gate is satisfied.

## What is inside

- `index.html` — complete offline app shell, UI, split math, CRUD, reports, backup/restore, CSV import/export, data doctor, snapshots, and PWA install hook.
- `gate-session.js` — 0S gate-session lock. It accepts URL, FS27/SkyGate legacy, 0S client-session, runtime, or localhost admin proof sessions.
- `manifest.json` — install metadata and icons.
- `sw.js` — hardened same-origin service worker with app-shell caching and navigation fallback.
- `icon-192.png`, `icon-512.png` — PWA icons.

## Deployment

Upload this folder or zip contents to Netlify, Cloudflare Pages, GitHub Pages, or any static host. No server runtime is required.

The app must remain under an authenticated 0S surface. Do not publish a route that removes `gate-session.js` or bypasses `SkyeSplitGate.requireSession()`.

## Local data model

The app stores data under `SKYE_SPLIT_ENGINE_STATE_V3` in localStorage and keeps up to 12 restore snapshots under `SKYE_SPLIT_ENGINE_SNAPSHOTS_V3`.

## Operator workflow

1. Define people.
2. Define split rules.
3. Define products with default rules.
4. Log transactions.
5. Run reports and export payout sheets.
6. Download JSON backups regularly.
