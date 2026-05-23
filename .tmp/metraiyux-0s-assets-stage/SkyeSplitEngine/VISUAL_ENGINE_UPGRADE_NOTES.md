# Skye Split Engine — Visual Engine Upgrade

Implemented against the approved Skye Split Engine logo asset.

## What changed

- Added the approved logo to the sidebar, topbar, dashboard hero, favicon, Apple touch icon, manifest icons, OG image, and service worker cache.
- Cut transparent logo variants for live display and regenerated the PWA icon set from the transparent badge so the logo floats without a baked-in dark plate.
- Added animated visual engine layers: starfield canvas, pointer-reactive aurora, hologrid, payout-stream light trails, click bursts, card sheen, hover illumination, floating logo, and dashboard logo orbit.
- Imported the app as a Free99 gated 0S feature. Free99 means no charge, but a 0S, FS27, SkyGate, or local admin gate session is required before app boot. No separate signup island was added.
- Preserved the commission calculator, transaction ledger, split rules, people/products CRUD, reports, CSV import/export, JSON backup/restore, snapshots, settings, and data doctor flows.
- Added reduced-motion handling so the app still behaves cleanly for users who disable animations.

## Drop notes

Deploy the full folder or zip contents as a static site. The service worker cache version was bumped so browsers pull the visual build instead of holding the older shell.
