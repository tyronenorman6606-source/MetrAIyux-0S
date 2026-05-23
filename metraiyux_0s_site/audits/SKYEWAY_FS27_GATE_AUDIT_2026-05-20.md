# SkyeWay FS27 Gate Audit - 2026-05-20

## Scope

Audited the 0S SkyeWay route atlas and the full-system Worker gate perimeter before the next app-import phase.

## Changes Made

- Rebuilt `assets/skyeway-routes.js` from mounted 0S HTML surfaces.
- Removed `_platform-sources` mirrors from SkyeWay so imported source copies do not appear as operator launch doors.
- Removed SovereignDocs generated template bulk from SkyeWay; SovereignDocs remains mounted through its app routes while its own app handles document/template navigation.
- Added route-level gate policy labels to SkyeWay data.
- Added UI labeling so SkyeWay search results show whether a route is FS27 gated, FS27/Free99 gated, FS27 client-app gated, owner gated, or intentionally public.
- Removed the `client-app-factory/client-apps/*` public bypass from the Worker allowlist. Client apps now fall under the default FS27/0S gate perimeter.

## SkyeWay Route Counts

- Total mounted/operator routes: 2,548
- Client app routes: 167
- Client app gate policy: `fs27-owner-gated-client-app`
- Source mirror routes in SkyeWay: 0
- SovereignDocs generated template/build bulk routes in SkyeWay: 0

## Category Counts

- 0S Core: 171
- Platform Apps: 284
- Client Apps: 167
- Free99 Apps: 62
- SovereignDocs: 217
- SkyeMail: 118
- Live Surfaces: 18
- Valley Verified: 165
- Valley Verified Businesses: 351
- Valley Verified Markets: 65
- Valley Verified Niches: 379
- Client and SaaS: 38
- Sales and Revenue: 57
- Brains, Proof, and Infra: 133
- Operating Rooms: 90
- Public Content: 103
- Governance and Legal: 30
- Root: 10
- Live SOL Staffing: 89
- SkyeWay: 1

## Gate Policy

The full-system Worker now gates by default. A route is public only if it is explicitly a gate entry path, base web manifest path, public proof/document receipt, public live proof allowlist, Cloudflare documentation route, or Valley Verified public business profile.

App routes are not public bypasses. Client apps, Free99 apps, platform apps, admin rooms, SkyeMail, SkyeMusicNexus, SkyeRouteX, SkyeProfitConsole, SkyeMediaCenter, CitadelDB, NorthStar, SignInPro, SovereignDocs, Marketing Made Easy, and other mounted 0S operating surfaces require a valid FS27/0S gate session.

## Verification

- `node tools/build-skyeway-routes.mjs` passed.
- `node -c tools/build-skyeway-routes.mjs` passed.
- `node -c metraiyux_0s_site/cloudflare/worker.js` passed.
- Worker dry-run reached module attachment and asset discovery with `npx wrangler deploy --dry-run --outdir /tmp/metraiyux-0s-skyeway-gate-dryrun`.

## Production Deployment

- Production Worker: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev`
- Current Version ID: `3aea6b03-a234-4aef-ae70-eaf7c2befabd`
- Changelog entry: `/changelog/` release `skyeway-fs27-gate-atlas`
- SkyeWay route: `/skyeway.html`

## Live Headed Browser Proof

Receipt: `test-artifacts/live-browser-verifier/2026-05-20-skyeway-fs27-gate-production/live-browser-verification-report.json`

Headed Chromium under `xvfb-run` checked the deployed production Worker, not a local server:

- Desktop unauthenticated request to `/client-app-factory/client-apps/arizona-biltmore-dentistry/` redirected to `/admin/login.html?return=...`.
- Desktop owner unlock succeeded through `/admin/login.html`.
- Desktop `/skyeway.html` loaded after the owner session, searched `arizona biltmore dentistry`, showed the Client Apps result with `FS27 client app`, and clicked into the authenticated client-app route.
- Mobile `/skyeway.html` loaded after owner unlock, searched Client Apps, and rendered with no horizontal overflow.
- Console errors: 0.
- Failed network requests: 0.
