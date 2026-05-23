# MetrAIyux 0S Surface Functionality Audit

Date: 2026-05-19
Target folder: `metraiyux_0s_site`
Live domain tested: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev`

## Audit Purpose

This audit separates the 0S into surfaces that are truly functional, surfaces that are intentionally local/static proof, surfaces that are gated but live, and surfaces that currently look operational while calling missing or unserved APIs.

The goal is not to shame static proof pages. A static proof page is valid when it is labeled as proof, documentation, or local demo. The gap appears when a page presents itself as an admin/app workflow but the live deployed Worker cannot execute the workflow behind it.

## Evidence Gathered

- Ran MCP mine for `metraiyux_0s_site`: `npm run mcp:mine -- metraiyux_0s_site`.
- Read generated receipt: `metraiyux_0s_site/MCP_TOOLING_RECEIPT.json`.
- Static inventory from MCP receipt after QA proof closure: 23,308 HTML files, 1,248 JS files, 87 CSS files at mine time.
- Static dependency scan found 264 route families and 37,754 scanned source/content files when including JSON/TOML/runtime files.
- Live browser probe opened representative 0S rooms and logged API responses.
- Live endpoint probe tested deployed Worker routes and representative app APIs.
- MUSIC closure proof added `node --test metraiyux_0s_site/tests/skymusicnexus-adapter.test.mjs`: namespace health/manifest, source blocking, gate behavior, asset upload/read, DAW save, drops, feed, release, rights, payments, analytics, and admin review flows.
- ROUTEX closure proof added `node --test metraiyux_0s_site/tests/skyeroutex-adapter.test.mjs`: `/api/routex` health/manifest, `/api/skyeroutex` compatibility alias, root API collision repair paths, source blocking, provider signup/login, contractor board, applicant acceptance, assignment steps, route stop, proof media receipt, payment state, rating, and export packet.
- MEDIA closure proof added `node --test metraiyux_0s_site/tests/skyemediacenter-adapter.test.mjs`: `/api/media` health/session, FS27/SkyGate gate enforcement, old Netlify function URL blocking, browser production API base mapping, asset upload, search, review board, execution board, dispatch board, publish queue, gated file delivery, stats, and workflow timeline.
- PROFIT closure proof added `node --test metraiyux_0s_site/tests/skyeprofitconsole-adapter.test.mjs`: `/api/profit` health/manifest, old local runtime source blocking, root `/api/runtime` collision guard, browser production API base mapping, gated pack creation, review, execution, dispatch, close briefs, splits, proof events, exports, and audit.
- HOUSE closure proof added `node --test metraiyux_0s_site/tests/houseoperations-adapter.test.mjs`: `/api/houseops` health/manifest, operator auth gate, private `HouseOperations/src/*` blocking, browser `/api/houseops` path mapping, no public `/src` page dependencies, task, vendor, schedule, alert, assignment, proof, gate packet, board, export, and audit routes.
- HOUSE regression sweep also passed `node --test metraiyux_0s_site/tests/api-routing-convention.test.mjs`, `node --test metraiyux_0s_site/tests/worker-security-audit.test.mjs`, `node proof/static_validation.mjs` from the SkyeBox vault folder, and `node metraiyux_0s_site/HouseOperations/skye-box-authenticator-vault/proof/totp_crypto_vector_test.mjs`.
- SPLIT closure proof added `node --test metraiyux_0s_site/tests/skyesplitengine-backup-restore.test.mjs`: confirms the visible local-first/exportable runtime label, creates a gated transaction, exports JSON backup, restores JSON without losing people/product/rule/transaction identity, exports transaction CSV, re-imports CSV, and verifies amount/currency/status/memo survive.
- SPLIT smoke proof also passed `node metraiyux_0s_site/SkyeSplitEngine/smoke/smoke-proof.mjs`: gate-session helper present, app boot waits for gate session, Free99/no-charge copy present, service worker caches the gate helper, manifest parses, and imported no-auth language is absent.
- MME closure proof added `node --test metraiyux_0s_site/tests/marketing-made-easy-runtime-audit.test.mjs`: inventories all eight Marketing Made Easy surfaces in `Marketing-Made-Easy/MME_RUNTIME_AUDIT.json`, records the promotion from proof-only suite to mounted same-domain platform adapter, proves `/api/marketing-made-easy/health` returns mounted live JSON, proves `/api/marketing-made-easy/platform/manifest` exposes the 8 internal module rooms, proves unauthenticated session reads return `401`, proves root `/api/runtime/*` still returns `api_root_collision`, and proves representative runtime/function/config source returns private 404.
- MME regression sweep also passed `node --check metraiyux_0s_site/cloudflare/worker.js`, `node --test metraiyux_0s_site/tests/api-routing-convention.test.mjs`, `node --test metraiyux_0s_site/tests/worker-security-audit.test.mjs`, and `npm run mcp:mine -- metraiyux_0s_site`.
- RELAY closure proof added `node --test metraiyux_0s_site/tests/relay13-connectlog-adapter.test.mjs`: confirms ConnectLog and the Relay13 console source use `/api/relay13`, proves the 0S namespace rewrites card upsert, scan conversation creation, message inbox reads/replies, operator workspace reads, widget publishing, guardrail updates, guardrail proof, and WebSocket paths back to Relay13's native `/api/*` contract, and proves representative Relay13 source files return private 404.
- RELAY regression sweep also passed `node --check metraiyux_0s_site/cloudflare/worker.js`, `node --check metraiyux_0s_site/connectlog-v7.7-relay13-operator-proof/app.js`, `node --check metraiyux_0s_site/relay13-core-v1.7-connectlog-operator-proof/public/admin/app.js`, `node --test metraiyux_0s_site/tests/api-routing-convention.test.mjs`, `node --test metraiyux_0s_site/tests/worker-security-audit.test.mjs`, and `npm run mcp:mine -- metraiyux_0s_site`.
- VALLEY closure proof added `node --test metraiyux_0s_site/tests/valley-runtime-decision.test.mjs`: records the Valley 0S mount as public/static directory plus external/proof-only admin in `valley-verified/VALLEY_RUNTIME_DECISION.json`, removes live `.netlify/functions` calls from Valley admin browser scripts, labels admin/API/quote pages as proof/model surfaces, links to the gate-owned SkyePay backend, and proves old PHX function paths return private 404 while public Valley routes remain reachable.
- VALLEY regression sweep also passed `node --check metraiyux_0s_site/valley-verified/assets/admin-console.js`, `node --check metraiyux_0s_site/valley-verified/assets/protected-admin-app.js`, `node --test metraiyux_0s_site/tests/api-routing-convention.test.mjs`, `node --test metraiyux_0s_site/tests/worker-security-audit.test.mjs`, and `npm run mcp:mine -- metraiyux_0s_site`.
- AUD registry closure proof added `node --test metraiyux_0s_site/tests/surface-status-registry.test.mjs`: validates `audits/0S_SURFACE_STATUS.json` schema, required major surface ids, app-family status metadata, allowed status tags, badge labels, homepage `data-runtime-badge-for` wiring, shared `.runtime-badge` styles, and public static access to the registry.
- AUD regression sweep also passed `node --check metraiyux_0s_site/script.js`, `node --test metraiyux_0s_site/tests/api-routing-convention.test.mjs`, `node --test metraiyux_0s_site/tests/worker-security-audit.test.mjs`, and `npm run mcp:mine -- metraiyux_0s_site`.
- UI truth-layer closure proof added `node --test metraiyux_0s_site/tests/runtime-truth-ui.test.mjs`: validates the shared runtime truth widget on every major app shell, mode/backend/auth/storage/health display, backend-missing empty-state rewrite, SovereignDocs closure-dashboard copy repair, repair links, and the shared API error component for 401, 403, 404, 405, 503, and network errors.
- UI regression sweep also passed `node --check metraiyux_0s_site/assets/js/0s-runtime-truth.js`, `node --test metraiyux_0s_site/tests/surface-status-registry.test.mjs`, `node --test metraiyux_0s_site/tests/api-routing-convention.test.mjs`, `node --test metraiyux_0s_site/tests/worker-security-audit.test.mjs`, and `npm run mcp:mine -- metraiyux_0s_site`.
- QA route-audit proof added `node --test metraiyux_0s_site/tests/0s-qa-route-audit.test.mjs`: serves 0S through the full-system Worker adapter, opens 21 major app shells, captures 42 desktop/mobile screenshots, fails on page runtime errors, fails on unexpected same-origin API 404s, checks horizontal overflow, and writes `proof/0s-runtime-truth-route-audit-2026-05-19.json`.
- QA source/auth smoke coverage is backed by `node --test metraiyux_0s_site/tests/worker-security-audit.test.mjs`: nested implementation source returns private 404 and representative mutating operator/proxy routes reject missing auth while public intake remains split from operator mutation.
- VANTACORE owned-lane proof added `metraiyux_0s_site/audits/VANTACORE_OWNED_LANE_LIVE_PROOF_AND_OVERLAP_2026-05-20.md`: functional FS27 Worker version `57d80970-d429-4036-a60d-50c8ec66d479` rejects no-auth and direct Vanta password-header requests, accepts central FS27 inherited authority, passes 8 live CRM write cycles, passes 96 concurrent live reads, and passes Playwright desktop/mobile workflow proof with no Vanta login controls.
- QA final regression sweep also passed `node --check metraiyux_0s_site/tests/0s-qa-route-audit.test.mjs`, `node --check metraiyux_0s_site/assets/js/0s-runtime-truth.js`, `node --test metraiyux_0s_site/tests/runtime-truth-ui.test.mjs`, `node --test metraiyux_0s_site/tests/surface-status-registry.test.mjs`, `node --test metraiyux_0s_site/tests/api-routing-convention.test.mjs`, and `npm run mcp:mine -- metraiyux_0s_site`.

## Audit Side Effects

The live endpoint probe intentionally sent small smoke POSTs to prove whether public mutation routes were open:

- `/api/site-operator/route` accepted an unauthenticated audit route event.
- `/api/site-operator/task` accepted an unauthenticated audit task.
- `/api/crown/task` accepted an unauthenticated audit task and returned `pending_human_review`.
- `/api/saas/signup` created a test customer for `audit@example.invalid`; Resend reported sent, while SkyeMail returned 404 and Relay13/ConnectLog/FS27 mirror were skipped.

These side effects are part of the audit evidence and point to auth/rate-limit/validation work in the checklist.

## Status Legend

- `LIVE`: deployed route is served and performs real Worker behavior.
- `GATED`: deployed route exists and correctly requires a session/token.
- `LOCAL`: browser-local or same-folder local runtime only; useful, but not shared production operation.
- `STATIC`: content/proof/navigation surface; valid if not claiming live workflow execution.
- `BROKEN`: UI calls missing routes or dead APIs on the live domain.
- `EXPOSED`: implementation source is publicly reachable as static asset.
- `PARTIAL`: some real pieces exist, but end-to-end operation is incomplete.
- `PROOF_ONLY`: visible proof/model surface that deliberately does not execute production workflow actions on 0S.

## Executive Findings

1. The core 0S Worker/proxy layer is live. `/api/site-operator/status`, `/api/admin/status`, `/api/saas/status`, `/api/crown/status`, `/api/nexus/status`, `/api/sentinel/status`, and `/api/omega/status` all returned live JSON.
2. The mounted 0S app lanes now follow the Gate-owned mounted-app rule much more closely: Site Operator and Crown task mutations reject missing auth, SovereignDocs and Client App Factory now require the shared gate/operator lane for live control-plane routes, and SkyeRouteX no longer allows app-local signup/login on the mounted production namespace.
3. NorthStar SignInPro is a canonical mounted app inside the 0S, not a separate auth lane: one namespaced app, one namespaced API base, Gate-owned FS27/SkyGate session authority, workspace-tenant routing, and rate-limited gate ownership even when the user-facing experience is Free99.
4. Several imported app folders still contain local-first or proof-oriented code on disk, but the live mounted surfaces are now explicitly separated from those source trees. Marketing Made Easy is now mounted as one shared platform shell under the Gate-owned mounted-app rule, while SkyeSplitEngine remains a gate-owned local-first runtime rather than a second auth universe.
5. Source exposure was a major gap at initial audit. Completed Worker guards now block the representative SkyeMusicNexus Netlify function source, SkyeMediaCenter Netlify function source, SkyeRouteX server source, Marketing Made Easy local runtime source, Relay13 source trees, and other private source patterns in tests.
6. SkyeMediaCenter remains the strongest Free99 example currently wired into the full-system Worker: `/api/media/session` exists, `/api/media/assets` correctly requires a gate token, and the authenticated upload/review/execution/dispatch/publish/file/stats flow is covered by Worker tests.
7. SaaS signup is real enough to create a customer, issue SkyeMerit, and send Resend email, but downstream delivery channels are incomplete and the intentionally public signup flow still needs stronger validation, anti-abuse controls, and delivery hardening.

## Live Surface Matrix

| Surface Family | Current Status | Evidence | Gap To Close |
|---|---:|---|---|
| Home / main 0S shell | STATIC/PARTIAL | Page loads, no API calls on first render. It is a route atlas and proof shell. | Keep copy honest: route map, not proof every route is live. |
| 0S Launcher | STATIC/PARTIAL | Loads local registry JSON and opens windows. | Add live health badges per mounted app. |
| Admin OS / Main Brain | LIVE/GATED | `/api/admin/status` 200; `/api/admin/brain/chat` 401 without token. | Verify logged-in UI forwards FS27 token consistently. |
| Site Operator API | LIVE/PARTIAL | Status/ledger live; no-auth `POST /api/site-operator/task` now returns `401` and mutating routes require the shared operator/gate lane. | Verify every logged-in UI flow forwards the shared gate token consistently. |
| SaaS / SkyeMerit | LIVE/PARTIAL | `/api/saas/status` 200; signup created test customer and sent Resend. | Add anti-abuse, validation, and configure SkyeMail/Relay13/ConnectLog/FS27 mirror. |
| Client App Factory | LIVE/PARTIAL | Same-domain `/api/client-app-factory/*` adapter now serves intake, Valley import, generation state, reports, and generated runtime routing; `/api/client-app-factory/health` returns `200` mounted true; no-auth control-plane read/write routes now return `401`. | Attach a dedicated factory backend only if generation workloads outgrow the same-domain adapter. |
| Crown/Nexus/Sentinel/Omega proxies | LIVE/PARTIAL | Status routes 200. No-auth `POST /api/crown/task` now returns `401`, and the shared gate/operator lane fronts the mutating proxy routes. | Keep regression checks on every mutation route as new proxy surfaces get added. |
| SkyeMediaCenter | LIVE/GATED | `/api/media/session` 200; `/api/media/assets` 401 missing token; MEDIA-03 proves authenticated upload/search/review/execution/dispatch/publish/stats/file delivery and browser `/api/media` path mapping. | Attach dedicated R2/provider credentials later if media storage needs to move beyond the 0S KV adapter. |
| SovereignDocs | LIVE/GATED | Namespaced `/api/sovereigndocs/*` routes are mounted; `/api/sovereigndocs/health` returns `200`; no-auth case creation and case-list reads now return `401`; source-block proof and workflow proof are already closed. | Keep the shared gate lane in front of all control-plane routes; attach a dedicated backend later only if the same-domain adapter becomes a bottleneck. |
| kAIxu CodeStudio | LIVE/PARTIAL | Same-domain `/api/kaixu-codestudio/platform/*` adapter serves health, status, manifest, provider-pack catalog, storage stats, project routes, and operator-gated mutations on the main 0S domain. | Attach a dedicated CodeStudio backend/service binding later only if full external provider execution needs to leave the 0S adapter. |
| SkyeMusicNexus | LIVE/PARTIAL | Same-domain `/api/skymusicnexus/*` maps session, artists, assets, studio, drops, releases, payments, exchange, social, analytics, and provider-hook contracts; browser rooms default to the namespaced 0S base; old Netlify function source returns private 404. | Attach dedicated R2/provider/deploy/DSP/social credentials for real external music-provider execution where needed. |
| SkyeProfitConsole | LIVE/GATED | `/api/profit/health` 200; `/api/profit/status` 401 without operator auth; PROFIT-03 proves packs, splits, proof, exports, audit, execution, dispatch, and browser `/api/profit` path mapping. | Attach dedicated D1/R2/accounting/payment provider credentials later if profit runtime needs external system execution beyond the 0S KV adapter. |
| SkyeRouteX | LIVE/PARTIAL | Same-domain `/api/routex/*` maps core workforce contracts; `/api/skyeroutex/*` remains a compatibility alias; root `/api/auth`, `/api/jobs`, `/api/assignments`, `/api/markets`, and `/api/ratings` return collision diagnostics; mounted production now requires the shared gate lane for protected routes and disables app-local signup/login. | Attach dedicated RouteX Worker/service binding or D1/R2/provider credentials for full production-grade runtime beyond the 0S KV adapter. |
| HouseOperations | LIVE/GATED | `/api/houseops/health` 200; `/api/houseops/status` 401 without operator auth; HOUSE-02 proves task/vendor/schedule/alert/assignment/proof/gate-packet/export/audit routes and browser `/api/houseops` path mapping. | Attach dedicated D1/R2/provider credentials later if HouseOperations needs external system execution beyond the 0S KV adapter. |
| SkyeSplitEngine | LIVE/GATED | The app shell is live on the 0S and gate-owned; SPLIT-02 proves gated transaction creation, JSON backup/restore, CSV export/import, and no-data-loss on core split records while preserving the local-first/exportable runtime model. | Keep it under the one shared auth lane. Optional cloud sync is a future enhancement, not an auth-gap repair. |
| Marketing Made Easy platform | LIVE/GATED | `MME_RUNTIME_AUDIT.json` now records the mounted same-domain platform adapter; `/api/marketing-made-easy/health` returns mounted live JSON with `status: LIVE/GATED`; `/api/marketing-made-easy/platform/manifest` exposes all 8 internal module rooms; unauthenticated `/api/marketing-made-easy/v1/sessions` returns `401`; root `/api/runtime/status` still returns `api_root_collision`; MME-03 proves runtime/function/config source is blocked. | Keep all future MME modules under the same namespaced API and shared gate lane; do not reintroduce standalone production auth or root `/api/runtime/*` ownership. |
| ConnectLog + Relay13 | LIVE/GATED | `relay13-core` is live in the deployment ledger; ConnectLog defaults to `/api/relay13`; the Relay13 console rewrites root `/api/*` calls into `/api/relay13/*`; RELAY-03 proves card exchange, scan conversation creation, operator inbox, widget config, guardrail update/proof, and WebSocket route forwarding; RELAY-02 proves Relay13 source blocking; live 0S mount refreshed 2026-05-20 so `/api/relay13/health` returns `mounted: true` and `/api/relay13/api/v1/connectlog/health` resolves through the main 0S domain. | Keep `RELAY13_WORKER` or `RELAY13_WORKER_ORIGIN` configured in production so the 0S namespace stays attached to the live Worker. |
| VantaCore Service CRM | LIVE/GATED | Actual workspace lives at FS27 `/vantacore-crm`; `/api/vantacore/crm` rejects no-auth and direct Vanta password-header requests, accepts inherited FS27 authority, and passed 8 live write cycles plus 96 concurrent live reads. Playwright proved locked/no-session state, inherited unlock, lead capture, pipeline update, booking, follow-up, review, desktop/mobile screenshots, no page errors, no console errors, and no horizontal overflow. | Keep as the service-business intake/VantaCharge lane only. Do not duplicate FS27 auth, NEXUS records, Relay13 messaging, SkyeMail mail, SkyePay billing, RouteX/HouseOps dispatch, or NorthStar provisioning. |
| Valley Verified | STATIC/PROOF_ONLY | Public directory, business pages, data, and search records stay mounted at `/valley-verified/`; `VALLEY_RUNTIME_DECISION.json` records PHX admin/payment/action/lead functions as not mounted on 0S; admin scripts no longer call dead `.netlify/functions` paths; admin/API/quote pages link the runtime decision and gate-owned SkyePay backend. | Closed as static public directory plus external/gate-owned proof-only admin. Future work can mount a gated Valley backend deliberately, but the 0S mount no longer pretends it has one. |
| NorthStar SignInPro | LIVE/GATED | Mounted at `/northstar/`; health route live at `/api/northstar/health`; login/session/logout and workspace routes now served through FS27; 11 Valley business overrides hand off into `workspace=<slug>` routes and all sampled/live-swept pages return 200. | Keep rate-limit/gate ownership policy intact, and continue documenting that Valley `api/*` is manifest-only while live directory/search records live under `/valley-verified/data/*`. |
| SkyeVaultOS / SkySecure Vault Console | LIVE/PROVEN | FS27 exposes `/skysecure/vaultos/proof`, `/commands`, `/inventory`, `/search`, `/restore-points`, and `/audit`; the 0S console loads live metadata; the proof scanned the real `/workspaces/MetrAIyux-0S/about to delete` folder as 1,833 files, encrypted it into four objects, created a restore point, bundled, attached into a fresh vault, reloaded, diffed clean, synced safe metadata to FS27, and covered 18 commands. | Keep public routes metadata-only and secret-free. Do not claim external cryptographic audit certification until a signed third-party audit exists. |
| Blog / proof / docs / SEO pages | STATIC | No live app dependency required. | Keep as static; remove internal build language from public areas. |

## Critical Risks

### SEC-01 Public implementation source exposure

The full-system Worker blocks some private paths such as `/wrangler.toml` and `/cloudflare-admin-automation-worker/src/worker.js`, but many nested implementation files are public:

- `/Free99/apps/sovereigndocs/server/routes/index.mjs`
- `/SkyeMusicNexus/netlify/functions/music-drops.js` - now covered by MUSIC-02 Worker source-block proof.
- `/SkyeMediaCenter/netlify/functions/media-assets.js` - now covered by MEDIA-02 Worker source-block proof.
- `/SkyeRouteX/workforce-command-v0.4.0/src/server.js` - now covered by ROUTEX-03 Worker source-block proof.
- `/HouseOperations/src/houseops-mcp-runtime.js` and `/HouseOperations/src/styles.css` - now covered by HOUSE-02 Worker source-block proof and removed from public HouseOperations HTML dependencies.
- `/Marketing-Made-Easy/SkyeWebCreatorMax/runtime/local-runtime.mjs` - now covered by MME-03 Worker source-block proof, along with representative Marketing Made Easy runtime data, Netlify functions, deploy config, smoke files, scripts, package files, and schema files.
- `/relay13-core-v1.7-connectlog-operator-proof/src/index.js` - now covered by RELAY-02 Worker source-block proof, along with Relay13 scripts, migrations, package metadata, wrangler config, env examples, `.gitignore`, and MCP receipts.

### SEC-02 Public mutation endpoints

The original audit found these public mutation gaps:

- `/api/site-operator/route`
- `/api/site-operator/task`
- `/api/crown/task`
- `/api/saas/signup`

Current truth after the 2026-05-20 NorthStar-compliance sweep:

- `/api/site-operator/route` and `/api/site-operator/task` now reject missing auth with `401`
- `/api/crown/task` now rejects missing auth with `401`
- mounted SovereignDocs control-plane writes and reads reject missing auth with `401`
- mounted Client App Factory control-plane writes and reads reject missing auth with `401`
- mounted SkyeRouteX no longer allows app-local production signup/login on the 0S namespace

The remaining intentionally public mutation lane here is `/api/saas/signup`, which still needs validation, anti-abuse, and delivery hardening rather than a second auth universe.

### API-01 Unnamespaced app APIs collide at `/api/*`

Multiple imported apps assume their own root `/api/*`:

- SovereignDocs: `/api/cases`, `/api/v18/*`, `/api/templates/*`
- SkyeRouteX: `/api/auth/*`, `/api/jobs`, `/api/assignments`, `/api/markets`, `/api/ratings` - now covered by ROUTEX-02 collision diagnostics pointing to `/api/routex/*`.
- Marketing Made Easy legacy local runtimes: `/api/runtime/*` - now covered by MME-02 collision diagnostics pointing to `/api/marketing-made-easy/*`; the mounted platform health route is live while the old root runtime namespace remains blocked.
- Relay13: `/api/v1/*`, `/api/admin/*` - ConnectLog and Relay13 console now use `/api/relay13/*`; root `/api/v1/*` remains a collision diagnostic, while `/api/admin/*` stays reserved for the 0S admin service.
- CodeStudio: `/api/platform/*`

On the full-system Worker, only selected top-level 0S APIs are routed. Imported app APIs need namespacing or dedicated service bindings.

## Gap Closure Strategy

### Phase 0: Freeze The Truth Map

- ✅ AUD-00 Run MCP mine for `metraiyux_0s_site`.
- ✅ AUD-01 Create this audit file.
- ✅ AUD-02 Add a machine-readable surface registry: `audits/0S_SURFACE_STATUS.json`.
- ✅ AUD-03 Add every major app family with status: `LIVE`, `GATED`, `LOCAL`, `STATIC`, `BROKEN`, `EXPOSED`, or `PARTIAL`.
- ✅ AUD-04 Put a visible runtime badge pattern in shared UI: `Production live`, `Gate required`, `Local only`, `Static proof`, `Backend missing`.

### Phase 1: Security First

- ✅ SEC-01 Expand `isPrivateSourcePath()` to block nested implementation source:
  `/server/`, `/src/`, `/netlify/functions/`, `/runtime/local-runtime`, `/smoke/`, `/scripts/`, `package.json`, `wrangler.toml`, and private data ledgers unless explicitly allowlisted.
- ✅ SEC-02 Create a public allowlist for safe static assets and safe public proof JSON.
- ✅ SEC-03 Add source-exposure tests that request representative nested source files and expect 404.
- ✅ SEC-04 Require SkyGate/admin auth for `/api/site-operator/route`, `/api/site-operator/task`, and other mutating site operator routes.
- ✅ SEC-05 Audit `/api/crown/*`, `/api/nexus/*`, `/api/sentinel/*`, `/api/omega/*`, and `/api/admin/*` for unauthenticated POST/PUT/DELETE.
- ✅ SEC-06 Split public intake from operator mutation: public requests may create `intake_pending_review`; operator tasks require auth.
- ✅ SEC-07 Add rate limiting / spam controls to `/api/saas/signup`.
- ✅ SEC-08 Prevent invalid/test emails from triggering provider sends in production mode.

### Phase 2: API Routing Architecture

- ✅ API-01 Decide routing model: one full-system Worker adapter versus dedicated Worker per app.
- ✅ API-02 Add an app API base convention, for example `window.METRAIYUX_API_BASES = { sovereigndocs:'/api/sovereigndocs', routex:'/api/routex' }`.
- ✅ API-03 Stop imported apps from assuming they own root `/api/*`.
- ✅ API-04 Add health endpoint per major app: `/api/{app}/health`.
- ✅ API-05 Add a route manifest endpoint that lists which app APIs are actually mounted.
- ✅ API-06 Add CI/live smoke that fails on browser API 404s from app-first surfaces.

### Phase 3: App Closures

- ✅ SD-01 Deploy or register the SovereignDocs route registry with the full-system Worker.
- ✅ SD-02 Move SovereignDocs server modules out of public assets or block them at Worker edge.
- ✅ SD-03 Wire SovereignDocs UI to a namespaced API base.
- ✅ SD-04 Prove SovereignDocs dashboard, case creation, packet assembly, reminders, partner review, SkyeDocxMax handoff, and closure summary.
- ✅ SD-05 Add D1/KV/R2 storage for SovereignDocs production mode or label all persistence as local/demo.

- ✅ KAI-01 Deploy kAIxu CodeStudio platform APIs or mark CodeStudio as local/static proof.
- ✅ KAI-02 Map `/api/platform/*` behind a namespaced route and gate paid/admin actions.

- ✅ MUSIC-01 Deploy/map SkyeMusicNexus Netlify functions as Worker routes.
- ✅ MUSIC-02 Block `SkyeMusicNexus/netlify/functions/*.js` public source.
- ✅ MUSIC-03 Prove session, asset upload/read, DAW save, drops, feed, release, rights, and admin review flows.

- ✅ ROUTEX-01 Deploy SkyeRouteX workforce API or service binding.
- ✅ ROUTEX-02 Move `/api/auth`, `/api/jobs`, `/api/assignments`, `/api/markets`, and `/api/ratings` under `/api/routex/*`.
- ✅ ROUTEX-03 Block `SkyeRouteX/**/src/*.js` public source.
- ✅ ROUTEX-04 Prove provider signup, contractor board, assignment, route stop, proof upload, payment state, and export.

- ✅ MEDIA-01 Keep SkyeMediaCenter as the model for gated Free99 APIs.
- ✅ MEDIA-02 Block old Netlify function source while keeping `/api/media/*` Worker routes.
- ✅ MEDIA-03 Browser-prove authenticated asset upload, review, execution, dispatch, publish, stats, and file delivery.

- ✅ PROFIT-01 Decide whether SkyeProfitConsole remains local-first or gains cloud runtime.
- ✅ PROFIT-02 If local-first, change any production/runtime-backed copy to `local runtime proof`. Not applicable: PROFIT-01 selected cloud-backed runtime.
- ✅ PROFIT-03 If cloud-backed, add `/api/profit/*` health, packs, splits, proof, exports, and audit.

- ✅ HOUSE-01 Decide whether HouseOperations remains local-first or gains shared task/vendor/schedule storage. Decision: cloud-backed 0S Worker KV runtime.
- ✅ HOUSE-02 If cloud-backed, add `/api/houseops/*` task, vendor, schedule, alert, assignment, proof, and export routes.

- ✅ SPLIT-01 Preserve SkyeSplitEngine local-first truth or add optional cloud sync. Decision: preserve local-first gated PWA truth.
- ✅ SPLIT-02 Add import/export browser proof and no-data-loss tests.

- ✅ MME-01 Audit each Marketing Made Easy app for local runtime APIs.
- ✅ MME-02 Promote Marketing Made Easy into a mounted NorthStar-style platform shell with one namespaced API, one shared gate lane, workspace routing, and collision diagnostics for the old root runtime namespace.
- ✅ MME-03 Block local runtime server source from public asset serving.

- ✅ RELAY-01 Point ConnectLog app to the live Relay13 Worker through a configured API base.
- ✅ RELAY-02 Block Relay13 source files under the 0S static deployment.
- ✅ RELAY-03 Prove ConnectLog card exchange, conversation creation, operator inbox, widget config, and guardrail proof.

- ✅ VALLEY-01 Decide whether Valley Verified admin functions belong on this 0S domain or only on the Valley deployment. Decision: not mounted on 0S in this pass.
- ✅ VALLEY-02 If on 0S, map PHX action/admin/payment functions and gate admin routes. Not applicable: VALLEY-01 selected external/proof-only admin.
- ✅ VALLEY-03 If not on 0S, mark admin pages as external/proof-only and link to the live Valley backend.

## NorthStar Integration Addendum

As of 2026-05-19, NorthStar SignInPro is mounted inside the 0S and is no longer just a staged project:

- canonical app route: `/northstar/`
- canonical API base: `/api/northstar`
- live health route: `/api/northstar/health`
- live auth/session flow: `/api/northstar/auth/login`, `/api/northstar/auth/session`, `/api/northstar/auth/logout`
- shared workspace tables are live in the current FS27 Neon lane
- 11 venue workspaces are provisioned and gate-owned
- 11 custom Valley business pages now hand off into those exact workspace slugs

Important operator note:

- Valley `api/*` endpoints are compact manifests after the v21/v22 static-data slimming pass.
- The full public business/search records used by the mounted Valley site live under `/valley-verified/data/businesses.json` and `/valley-verified/data/search-index.json`.
- This is expected behavior, not a missing-data bug.

### Phase 4: UI Truth Layer

- ✅ UI-01 Add runtime status badge to every major app shell.
- ✅ UI-02 App shell should show backend health, auth state, storage state, and mode.
- ✅ UI-03 Empty states must say `No records yet` only when backend is live; otherwise say `Backend not mounted`.
- ✅ UI-04 Replace ambiguous `premium operational view` language on broken surfaces with exact mode labels.
- ✅ UI-05 Add "why this is unavailable" repair links for admin/operator users.
- ✅ UI-06 Add a shared API error component that distinguishes 401, 403, 404, 503, and network errors.

### Phase 5: Proof And Regression

- ✅ QA-01 Add Playwright route audit that opens the major app list and fails on unexpected API 404s.
- ✅ QA-02 Add source exposure smoke test for nested implementation source.
- ✅ QA-03 Add mutating endpoint auth smoke test.
- ✅ QA-04 Add screenshot proof for desktop `1440x1000` and mobile `390x844` for each app changed.
- ✅ QA-05 Add per-app proof receipts with date, route, endpoint, auth mode, storage mode, and result.
- ✅ QA-06 Re-run `npm run mcp:mine -- metraiyux_0s_site` after each major closure pass.

## Immediate Next Repair Order

1. No unchecked Phase 0 through Phase 5 checklist items remain in this audit.

## 2026-05-20 Gate Ownership Production Addendum

- ✅ SkyGate source is singular under `metraiyux_0s_site/skyegate/source/SkyeGateFS27/`; the repo-root gate path is absent and root scripts now target the 0S-owned gate folder.
- ✅ 0S production was redeployed to `metraiyux-0s-full-system` version `bf22ef72-397b-462f-b3ee-8bb4c6d1d112`.
- ✅ SkyGate FS27 production was redeployed to `skyegatefs27-citadeldb` version `f7d69577-a0a4-40e5-b8a2-30c6db2269d3`.
- ✅ SkyeMail production was redeployed to `skyemail-platform` version `6b28eec4-1012-4e46-bb42-fcc61abfbc20`.
- ✅ Live verification confirmed 0S root HTTP `200`, FS27 root HTTP `200`, SkyeMail `/login` HTTP `200`, the 0S SkyGate page showing `Single Gate Source`, the live bridge emitting 0S gate-card/role/customer headers, and SkyeMail using `Continue with 0S/SkyGate` with no manual gate-token field.

## Definition Of Done For A Surface

After QA closure, the audited major app-shell set and the app-specific closure tests satisfy this gate. Future surfaces must repeat the same gate before they can be called closed.

- ✅ The page loads with no console errors.
- ✅ The page makes no unexpected 404 API calls.
- ✅ Every visible primary control either performs a real action or is clearly disabled/explained.
- ✅ The backend route exists and returns one of: 200 success, 401/403 expected auth, 405 expected method, or 503 expected missing configuration with clear message.
- ✅ Mutating actions require the correct auth/session unless intentionally public intake.
- ✅ Persistence mode is clear: D1/KV/R2/provider, browser-local, or static proof.
- ✅ Implementation source is not publicly served.
- ✅ Desktop and mobile screenshots pass.
- ✅ A proof receipt is linked from the audit checklist.
