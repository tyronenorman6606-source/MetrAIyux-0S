# ConnectLog v7 Landing/App Flow Ledger

## Implemented

✅ `index.html` is now the public-facing landing page.

✅ `app.html` is now the actual ConnectLog workspace.

✅ PWA manifest `id` points to `./app.html`.

✅ PWA manifest `start_url` points to `./app.html`, so installed app launches skip the landing page.

✅ Manifest shortcuts open `./app.html#dashboard`, `./app.html#exchange`, and `./app.html#intelligence`.

✅ Landing page has app launch controls for opening the app and going directly to the exchange surface.

✅ Landing page explains QR exchange, phone-contact QR, scan/paste intake, relationship intelligence, follow-up discipline, vault exports, seed ingestion, CSV intake, and duplicate resolution.

✅ Landing page registers the service worker so the PWA shell can be cached from first visit.

✅ Landing page routes incoming `#connect=` exchange links to `app.html#connect=...`.

✅ Landing page remembers when a user opens the app and can route future root visits back to `app.html`.

✅ Service worker cache upgraded to `connectlog-shell-v7.0.0`.

✅ Service worker app shell includes `index.html`, `app.html`, `landing.js`, app assets, approved logo assets, and seed manifest files.

✅ ConnectLog QR exchange links now pin to `app.html` instead of whichever page is currently open.

## Validation run

✅ `node --check app.js`

✅ `node --check sw.js`

✅ `node --check qr-lite.js`

✅ `node tools/smoke-check.mjs`

✅ `npm run check`

## Not claimed as proven

☐ Live deployed PWA install behavior on iOS/Android.

☐ Live mobile QR camera scan across real devices.

☐ Full browser click-path E2E in Chromium.
