# Live URL Registry

Generated/updated: 2026-05-21 UTC

This file is the quick human-readable map for what is actually live, what is canonical, and what should only behave as a mirror.

## 0S Pricing And Intake Router

- Canonical 0S pricing offer router:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/pricing-offer-router.html`
- Customer SaaS signup:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/saas/signup.html`
- SaaS pricing:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/saas/pricing.html`
- Free99 platform intake:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/index.html`
- Static client intake:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/clients/intake.html`

Current behavior:

- all 0S pricing, SaaS, Free99, and client intake surfaces stay behind the shared FS27/SkyGate/Free99 gate
- the pricing router is the live sales map for Free99 access, paid usage, AI/kAIxU packs, SkyePay handoffs, quote-only lanes, and white-label enterprise boundaries
- SkyePay is linked from the router, but SkyePay pricing itself remains untouched until its separate pricing pass

## Canonical Valley Verified

- Canonical Valley Verified inside 0S:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/`
- Canonical app-build lane:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/app-builds/`

### Canonical Valley Verified data endpoints

These are the actual source-of-truth JSON endpoints the mounted Valley site uses for directory/search data:

- Full compact business dataset:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/data/businesses.json`
- Full compact search dataset:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/data/search-index.json`
- Compact business-lite dataset:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/data/businesses-lite.json`

Important:

- `/valley-verified/api/businesses.json` and `/valley-verified/api/search-index.json` are intentionally manifest-style pointers after the v21/v22 compaction pass.
- the real public records live under `/valley-verified/data/*`
- if someone is checking whether a company exists in Valley, they should inspect the `data/*` files, not the compacted `api/*` manifests

## Valley Verified Mirrors

These should not be treated as separate primary products. They exist only to preserve old public links and should mirror/redirect to the canonical 0S-mounted Valley route.

- `https://valley-verified.pages.dev/`
- `https://valley-verified-network.pages.dev/`
- `https://phx-verified-network.pages.dev/`

Current behavior:

- each mirror returns HTTP `302`
- root, `/app-builds/`, and business routes forward into the canonical 0S-mounted Valley path
- public promotion should use the canonical 0S-mounted Valley URL, not the mirror domains

## Live Valley Verified Business Routes

- 480 Realty:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/480-realty-property-management-mesa-85209/`
- Dink & Dine:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/dink-and-dine-pickle-park-mesa-85201-5432605/`
- Techbros:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/techbros-electronic-recycling-and-itad-scottsdale-85260-8909b0c/`
- ArcLight:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/arclight-pictures-tucson/`
- Bob's:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/bobs-smoke-shop-litchfield-park/`
- Empire:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/empire-pallets-phoenix/`

## NorthStar SignInPro Inside 0S

- Canonical app:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/index.html`
- Canonical app base:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/`
- Canonical API base:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/northstar`
- Health:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/northstar/health`

Current live behavior:

- mounted inside the 0S as one shared SignInPro platform
- gate-owned
- free99 to the user, but still rate-limited
- provisioned workspaces live in the shared FS27 DB lane
- Valley business overrides hand off into `workspace=<slug>` routes instead of generated filler pages

## 0S Mounted App Ownership Rule

NorthStar is the canonical architecture rule for mounted 0S apps:

- one mounted app surface
- one namespaced API base
- one shared FS27 / SkyGate auth lane
- one ownership model
- no app-local production signup/login islands
- no public control-plane mutation lanes on mounted app APIs

Current mounted app lanes aligned to that rule:

- `NorthStar` -> `/northstar/` + `/api/northstar`
- `Marketing Made Easy` -> `/Marketing-Made-Easy/` + `/api/marketing-made-easy`
- `ConnectLog + Relay13` -> `/connectlog-v7.7-relay13-operator-proof/` + `/api/relay13`
- `SovereignDocs` -> `/Free99/apps/sovereigndocs/` + `/api/sovereigndocs`
- `SkyeRouteX` -> `/SkyeRouteX/` + `/api/routex`
- `Client App Factory` -> `/client-app-factory/` + `/api/client-app-factory`
- `kAIxu CodeStudio` -> `/Free99/apps/kaixu-codestudio/` + `/api/kaixu-codestudio`

2026-05-20 compliance sweep result:

- SovereignDocs control-plane writes/reads now require shared gate auth
- Client App Factory control-plane writes/reads now require shared operator auth
- SkyeRouteX mounted production no longer allows app-local signup/login and now relies on the shared gate lane for protected routes

## NorthStar-Backed Valley Business Overrides

- Chicken N Pickle:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/chicken-n-pickle-westgate/`
  - workspace handoff: `/northstar/index.html?workspace=chicken-n-pickle-westgate`
- As You Wish Pottery:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/as-you-wish-pottery-westgate/`
  - workspace handoff: `/northstar/index.html?workspace=as-you-wish-pottery-westgate`
- Stir Crazy:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/stir-crazy-comedy-club/`
  - workspace handoff: `/northstar/index.html?workspace=stir-crazy-comedy-club`
- Escape Westgate:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/escape-westgate/`
  - workspace handoff: `/northstar/index.html?workspace=escape-westgate`
- Dave & Buster’s:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/dave-and-busters-westgate/`
  - workspace handoff: `/northstar/index.html?workspace=dave-and-busters-westgate`
- PopStroke:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/popstroke-westgate/`
  - workspace handoff: `/northstar/index.html?workspace=popstroke-westgate`
- Westgate Entertainment District:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/westgate-entertainment-district/`
  - workspace handoff: `/northstar/index.html?workspace=westgate-entertainment-district`
- The Wigwam:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/the-wigwam-resort/`
  - workspace handoff: `/northstar/index.html?workspace=the-wigwam-resort`
- State Farm Stadium:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/state-farm-stadium/`
  - workspace handoff: `/northstar/index.html?workspace=state-farm-stadium`
- TheaterWorks:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/theaterworks-peoria/`
  - workspace handoff: `/northstar/index.html?workspace=theaterworks-peoria`
- Goodyear Ballpark:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/business/goodyear-ballpark/`
  - workspace handoff: `/northstar/index.html?workspace=goodyear-ballpark`

## ConnectLog + Relay13 Inside 0S

- Canonical ConnectLog app shell:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/connectlog-v7.7-relay13-operator-proof/app.html`
- Canonical Relay13 inbox surface:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/connectlog-v7.7-relay13-operator-proof/relay13-inbox.html`
- Canonical 0S Relay13 API base:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/relay13`
- Mounted health:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/relay13/health`
- Mounted ConnectLog bridge health:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/relay13/api/v1/connectlog/health`
- Direct Relay13 core worker:
  - `https://relay13-core.graylondonskyes.workers.dev/`

Current live behavior:

- the 0S namespace is now actually mounted in production, not just proved in tests
- `/api/relay13/health` returns `mounted: true`
- `/api/relay13/api/v1/connectlog/health` resolves through the 0S to the live Relay13 Worker
- protected admin Relay13 routes return auth responses from Relay13 instead of falling through to worker 404s

## kAIxu CodeStudio Inside 0S

- Canonical app shell:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/apps/kaixu-codestudio/index.html`
- Canonical API base:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/kaixu-codestudio`
- Health:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/kaixu-codestudio/health`
- Platform status:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/kaixu-codestudio/platform/status`
- Platform manifest:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/kaixu-codestudio/platform/manifest`

Current live behavior:

- mounted on the main 0S domain as a same-domain control-plane adapter
- manifest, storage, project, and provider-pack catalog routes are live
- operator-gated mutation routes are exposed through the same namespace
- a dedicated backend or service binding is only needed later for full external provider execution

## Client App Factory Inside 0S

- Canonical app shell:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-app-factory/index.html`
- Canonical API base:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/client-app-factory`
- Health:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/client-app-factory/health`

Current live behavior:

- mounted on the main 0S domain as a same-domain factory adapter
- intake, Valley import, generation state, reports, and generated runtime routing are live under the namespaced API base
- `/api/0s/route-manifest` now reports `clientAppFactory` as mounted on the main 0S worker
- control-plane reads/writes on the mounted API now reject missing auth instead of acting like a public intake lane
- a dedicated backend is optional later, not required for the mounted 0S workflow

## Marketing Made Easy Inside 0S

- Canonical app shell:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/`
- Canonical API base:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/marketing-made-easy`
- Health:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/marketing-made-easy/health`
- Platform manifest:
  - `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/marketing-made-easy/platform/manifest`

Current live behavior:

- mounted on the main 0S domain as one shared platform shell built from the 8 internal MME rooms
- follows the NorthStar ownership model: one shell, one namespaced API, one shared FS27/SkyGate auth lane, workspace routing, Free99 but still gate-owned and rate-limited
- `/api/marketing-made-easy/health` returns `mounted: true` and `status: LIVE/GATED`
- control-plane session/workspace/brief lanes now live under `/api/marketing-made-easy/*` and reject missing auth instead of pretending to be a second public runtime
- root `/api/runtime/*` remains blocked as a collision diagnostic so MME does not go rogue outside its namespace

## Standalone Client Apps

- Bob's live app:
  - `https://bobs-smoke-shop.pages.dev/`
- Empire live app:
  - `https://empire-pallets.pages.dev/`
- 480 Realty live app:
  - `https://480-realty-property-management.pages.dev/`
- Dink & Dine live app:
  - `https://dink-and-dine-pickle-park.pages.dev/`
- Techbros live app:
  - `https://techbros-electronic-recycling-itad.pages.dev/`
- ArcLight live app:
  - `https://arclight-pictures.pages.dev/`

## Rule Going Forward

- Public advertising should point to the canonical 0S-mounted Valley Verified route.
- Mirror Pages domains should not drift into separate product lines.
- New live URLs should be appended here at the same time they are deployed.
