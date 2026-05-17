# ConnectLog v4 Hardening and Upgrade Proof

## Completed

✅ Public source does not embed operator API keys.

✅ Runtime CDN dependency remains removed. The app shell is local static HTML, CSS, JS, icons, manifest, service worker, and local QR engine.

✅ IndexedDB remains the primary storage layer with legacy localStorage migration support.

✅ DOM rendering still avoids user-controlled `innerHTML` for contact records, notes, details, timelines, and imports.

✅ ConnectLog QR exchange remains fragment-based. The imported contact payload is in the URL hash, not query params.

✅ Phone-contact handoff uses standard vCard output.

✅ QR intake was added with two lanes: camera scanning through browser `BarcodeDetector` where available, and manual paste/import everywhere.

✅ Seed-folder ingestion was added through `seed-data/manifest.json`, `seed-data/*.json`, and `tools/build-seed-manifest.mjs`.

✅ Lane segmentation was added: lead, client, partner, vendor, investor, community, personal, and other.

✅ Contact health scoring was added as a derived local signal based on details, notes, timeline depth, follow-up presence, due state, dormancy, priority, and archive state.

✅ Card-level command actions were added: mark contacted, snooze seven days, export ICS reminder, archive/restore, edit, and delete with undo.

✅ Export scope was expanded: JSON backup, CSV export, and all-contact vCard export.

✅ Import scope was expanded: JSON backup/seed packs, ConnectLog QR links, compact ConnectLog payloads, and vCard payloads.

✅ Service worker cache version was bumped to `connectlog-v4-shell`.

## Checks run in this package

✅ `node --check app.js`

✅ `node --check sw.js`

✅ `node --check qr-lite.js`

✅ HTML duplicate ID check passed.

✅ JavaScript selector-to-HTML ID check passed.

✅ Seed manifest generator ran successfully and wrote `seed-data/manifest.json`.

✅ Local QR SVG generation smoke passed in Node for a vCard payload.

☐ Live mobile QR camera scan is not proven inside this sandbox. It must be tested on a deployed HTTPS origin because browsers require secure context and camera permission.

☐ Full browser click-path smoke was attempted with local Chromium, but the sandbox Chromium process timed out before producing a reliable DOM run. I am not marking browser E2E as proven.

## Important operational notes

The app is production-published and keeps seed ingestion controlled. If you want seed files to be auto-discovered after dropping them into `seed-data/`, run `npm run seed:manifest` before deploy. Static hosting generally cannot expose directory listing safely or consistently, so `manifest.json` is the controlled ingestion ledger.

Camera QR scanning depends on browser support for the `BarcodeDetector` API. Paste/manual intake remains available even when camera QR detection is unsupported.

## v5 additional proof notes

Added `tools/smoke-check.mjs` to verify the v5 command surface. The check confirms no duplicate HTML IDs, required v5 interface IDs, JS selector integrity, manifest shortcuts, app version `5.0.0`, service-worker cache `connectlog-shell-v5.0.0`, and presence of the CSV import, duplicate resolver, agenda export, relationship intelligence, smart-message, storage persistence, and single-vCard export functions.

The v5 upgrade preserves the no-auth design. It does not add account creation, login, backend sync, or cloud storage.


## v6 brand integration proof notes

✅ Accepted logo was added to `assets/connectlog-logo-master.png`.

✅ PWA icon files `icon-192.png` and `icon-512.png` were regenerated from the accepted logo.

✅ Manifest icons now include `assets/connectlog-logo-192.png` and `assets/connectlog-logo-512.png`.

✅ Service worker cache was bumped to `connectlog-shell-v6.0.0` and now precaches the approved logo assets.

✅ `tools/smoke-check.mjs` now checks the v6 app version, v6 service-worker cache, and brand asset wiring.

## v7 landing/app split proof

- Public first-visit surface now lives at `index.html`.
- Operational app surface now lives at `app.html`.
- `manifest.json` uses `id: ./app.html` and `start_url: ./app.html` so installed PWA launches open the app workspace directly.
- Manifest shortcuts route into `app.html` anchors rather than the landing page.
- `landing.js` routes incoming `#connect=` exchange links into `app.html#connect=...`.
- `landing.js` stores the return-to-app preference after a launch action.
- `sw.js` v7 caches `index.html`, `app.html`, `landing.js`, the app shell, logo assets, and seed-data manifest files.
- `app.js` v7 pins generated ConnectLog exchange links to `app.html`.

Proof command:

```bash
npm run check
```

Result: passed in this build workspace.
