SOVEREIGN VARIABLES · STATIC PACKAGE
==================================

Package contents:
- Offline local workspace
- Visible export controls: .skye, JSON, .env
- Import lane: .skye, JSON, .env, .txt
- Collapsible side panels
- Detachable floating side panels
- Scrollable side panels

Deliberate exclusions from this static bundle:
- No chat route button
- No mail route button
- No backend API handlers

Host notes:
1. Deploy as a static site.
2. Hard refresh after deploy because the service worker caches assets.
3. Export/import works inside the app without any server lane.
