# Over3arth Deployment Hardening Ledger

Version: 1.1.0
Date: 2026-05-17

## Completed before public staging

✅ Exact dependency versions pinned in package.json for reproducible builds.
✅ Vite chunk splitting added for React, Framer Motion, and Three.js visual payloads.
✅ OrbScene and Globe panel lazy-loaded behind Suspense fallbacks.
✅ Low-power mode added for mobile/performance-sensitive users.
✅ prefers-reduced-motion support added.
✅ Service worker upgraded from static-only cache to navigation fallback plus runtime asset caching.
✅ PWA manifest upgraded with standalone orientation, categories, maskable icon, and PNG icons.
✅ Apple/mobile install metadata added to index.html.
✅ Runtime error boundary added.
✅ Import validation added for JSON ledger restores.
✅ Backup localStorage slot added before overwriting primary state.
✅ Export/import/reset controls kept in the System Ledger.
✅ Analytics hook added through CustomEvent, dataLayer, and gtag when present.
✅ Mobile navigation now exposes all major app sections, not only the first five.
✅ Mobile touch targets and input font sizes hardened.
✅ Claim/safety language added to UI and docs.

## Still intentionally not included

☐ Auth/account system.
☐ Backend cloud sync.
☐ Paid subscriptions.
☐ Push notification delivery.
☐ AI provider integration.

These are not required for a serious staging deployment. They are required for a paid multi-user SaaS launch.
