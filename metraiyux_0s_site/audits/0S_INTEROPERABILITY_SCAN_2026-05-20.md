# 0S Interoperability Scan - 2026-05-20

Generated: 2026-05-20T11:15:29.647Z

## Counts

- Live registry surfaces: 62
- Free99 / paid app manifest entries: 11
- Client App Factory records: 12
- Content engine articles: 28
- Worker API mounts detected: 12
- Core files scanned: 10

## Wired Now

- **SovereignDocs -> SkyeDocxMax** via `/api/sovereigndocs/editor/skye-docx-max/session and /return`: Drafts open in the editor, editor returns persist back as documents and vault records.
- **Client App Factory -> Valley Verified** via `VALLEY_SYNC_PAYLOAD.json and /valley-verified mounted profiles`: Client apps can become Valley Verified profiles with media, QR, proof receipts, and business IDs.
- **Client App Factory -> Relay13 AI Lanes** via `client-app-factory-adapter imports relay13-ai-lanes.mjs`: Client app lead/chat response tiers can use local-brain first and AI add-on routing without auto-spending.
- **Marketing Made Easy -> SovereignDocs** via `MME_AE_VENDOR_DOCS links into SovereignDocs document builders`: Marketing/vendor onboarding can route contractor, W-9, ACH, and commission docs into SovereignDocs.
- **0S Content Engine -> Local Brain / Website / Email / Social / Repo** via `/api/admin/content-engine/activate, /dispatch, /local-brain-feed`: One article can create approval-gated content packages and local-brain chunks without external auto-posting.
- **Valley Verified -> 0S Worker** via `/api/valley-verified/relay-leads and /api/valley/content-schedule`: Public Valley leads and content calendar ticks can land in 0S storage/task queues.
- **Relay13 -> ConnectLog** via `Relay13 admin inbox and bridge proof pages`: Messages can route into the operator inbox and proof surfaces; client app widgets need consistent tenant mapping.
- **SkyeMediaCenter -> 0S Worker** via `/api/media/* boards and publish routes`: Media assets can move through intake, review, execution, dispatch, publish, stats, and file-delivery states.

## Partial Or Local Bridges

- **SkyeDocxMax -> SkyeBlog / SkyeDrive / SkyeMail** (shared Worker bridge added) via `/api/0s/skye-docx-max/share`: Document packages can now persist through the 0S tenant backbone while the localStorage/device-share fallback stays available.
- **NorthStar / SignIn Pro -> 0S** (mounted app under Gate) via `/api/northstar/workspace-sync`: Workspace state sync exists inside the 0S mount; the 0S Gate owns identity/session authority and SignIn Pro does not replace that auth.

## Main Gaps

- **HIGH - Shared workspace identity:** Several apps use their own local workspace/session shape. Standardize orgId, workspaceId, clientId, actor, sourceApp, and proofReceipt fields across all app posts.
- **HIGH - Remote persistence for local-first Free99 apps:** Many Free99 apps rely on localStorage/IndexedDB. They need a shared /api/0s/workspace-events or app-specific adapter before they can guarantee cross-device continuity.
- **MEDIUM - SkyeDocxMax suite bridges:** SkyeDocxMax now has the shared `/api/0s/skye-docx-max/share` Worker package; next pass should wire each Blog/Drive/Mail UI to read that package directly.
- **MEDIUM - Connector dispatch:** The content engine now produces approval packages and connector events. Real external posting remains gated until provider tokens, pricing, and owner approval are present.
- **MEDIUM - Client app tenant mapping:** `/api/0s/tenant-map` now exposes the canonical client/workspace/Valley/Relay/install QR map; next pass should expand it from the remaining non-client Valley inventory only after those businesses are verified.

## Recommended Backbone

- Use the 0S Worker as the cross-app event router, not each static app.
- Use SkyGate FS27 for identity and event evidence, with no secrets mirrored into public repo files.
- Use app-specific KV namespaces when cost/volume justifies it; SITE_EVENTS_KV is acceptable for low-volume proof and bridge receipts.
- Make every generated client/business artifact carry clientId, valleyBusinessId, workspaceId, sourceApp, and receiptId.
- Keep local-first apps functional offline, then sync to 0S when a gate session or admin token is present.
- Keep AI lanes package-gated and local-brain-first so external provider costs only happen when the paid add-on is active.

## Content Engine Status

- Public/admin UI: `metraiyux_0s_site/admin/content-engine-lane.html`
- Canonical article map: `metraiyux_0s_site/blog/content-engine.json`
- Worker package endpoints: `/api/admin/content-engine/activate`, `/api/admin/content-engine/runs`, `/api/admin/content-engine/dispatch`, `/api/admin/content-engine/local-brain-feed`
- Dispatch rule: provider calls are blocked until operator approval plus configured provider connectors.

## SkyeDocxMax Persistence Status

- SovereignDocs session create/fetch/open/return endpoints are mounted under `/api/sovereigndocs/editor/skye-docx-max/*`.
- Returned editor packages now become `returns`, `documents`, and `vault_records` in SovereignDocs storage.
- The public vault UI can sync local bridge returns and API returns back into the local vault view.

## Core File Signals

- `metraiyux_0s_site/cloudflare/worker.js`: 220 API route signals; storage kv, d1, queue; bridges skygate, skyeDocxMax, relay13, valleyVerified, contentEngine.
- `metraiyux_0s_site/cloudflare/client-app-factory-adapter.mjs`: 1 API route signals; storage kv; bridges relay13, valleyVerified.
- `metraiyux_0s_site/cloudflare/marketing-made-easy-adapter.mjs`: 3 API route signals; storage kv; bridges skygate, skyeDocxMax.
- `metraiyux_0s_site/cloudflare/relay13-ai-lanes.mjs`: 0 API route signals; storage queue; bridges relay13, contentEngine.
- `metraiyux_0s_site/northstar/assets/workspace-client.js`: 1 API route signals; storage localStorage; bridges none detected.
- `metraiyux_0s_site/Free99/apps/sovereigndocs/assets/app.js`: 6 API route signals; storage localStorage, queue; bridges skyeDocxMax.
- `metraiyux_0s_site/Free99/apps/sovereigndocs/skye-docx-max/app/sd-bridge.js`: 5 API route signals; storage localStorage; bridges skyeDocxMax, postMessage.
- `metraiyux_0s_site/Free99/apps/sovereigndocs/skye-docx-max/app/index.html`: 6 API route signals; storage localStorage, indexedDB; bridges skygate, skyeDocxMax, postMessage.
- `metraiyux_0s_site/admin/content-engine-lane.js`: 6 API route signals; storage localStorage; bridges skygate, contentEngine.
- `tools/build-0s-content-engine.mjs`: 0 API route signals; storage kv, d1, queue; bridges contentEngine.
