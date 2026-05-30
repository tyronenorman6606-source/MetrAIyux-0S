# SkyeRouteX Logistics Operating Map

Updated: 2026-05-28

## Owner Lane

- Company lane: SkyeRouteX Logistics
- Operator ecosystem: Skyes Over London LC / SOLEnterprises / MetrAIyux 0S
- Founder/operator: Gray London Skyes / Gray Skyes
- Main owner email: grayskyes@solenterprises.org
- Company mailbox: skyeroutex-logistics@solenterprises.org
- Backup owner emails kept documented: SkyesOverLondonLC@solenterprises.org, skyesoverlondon222@gmail.com
- Company line: 1-(800)-484-4783
- Auth: shared FS27/SkyGate/Free99 gate only. No SkyeRouteX-local owner/admin password.

## Primary Links

- Public company site: https://skyenet.skyeroutex-logistics/
- Public tour page: https://skyenet.skyeroutex-logistics/tour.html
- Private operator doorway: /SkyeRouteX/
- Open App shared-gate doorway: /api/skyeroutex/operator-entry?return=%2FSkyeRouteX%2Fworkforce-command-v0.4.0%2Findex.html
- Workforce Command: /SkyeRouteX/workforce-command-v0.4.0/index.html
- V83 Dispatch Dashboard: /SkyeRouteX/dashboard.html
- V83 Routes: /SkyeRouteX/routes.html
- V83 Stops: /SkyeRouteX/stops.html
- V83 Workforce: /SkyeRouteX/workforce.html
- V83 Proof Vault: /SkyeRouteX/proof.html
- V83 Analytics: /SkyeRouteX/analytics.html
- V83 Runtime: /SkyeRouteX/runtime.html
- V83 Settings: /SkyeRouteX/settings.html
- Provider panel: /SkyeRouteX/workforce-command-v0.4.0/index.html#provider-panel
- Contractor panel: /SkyeRouteX/workforce-command-v0.4.0/index.html#contractor-panel
- House Command: /SkyeRouteX/workforce-command-v0.4.0/index.html#house-panel
- Proof panel: /SkyeRouteX/workforce-command-v0.4.0/index.html#proof
- Gate readiness: /SkyeRouteX/workforce-command-v0.4.0/public/gate-readiness.html
- Audit-ready console: /SkyeRouteX/apps/audit-ready-console/index.html
- Founder Command client map: /founder-command/?view=clients
- Founder JSON: /founder-command/client-credentials/skyeroutex-logistics.json
- Founder JSON SkyeNet record: /skyenet/founder-command/client-credentials/skyeroutex-logistics.json
- SkyeSol public company site: https://skyenet.skyesol/
- SOLEnterprises public company site: https://skyenet.solenterprises/
- SkyeMail inbox: /live/SkyeMail/session-handoff.html?next=dashboard.html&from=skyeroutex-logistics
- SkyeMail compose: /live/SkyeMail/session-handoff.html?next=compose.html&from=skyeroutex-logistics
- Read-only tour token endpoint: POST /api/skyeroutex/tour-token
- Read-only tour status endpoint: GET /api/skyeroutex/tour-token/status
- Operator entry endpoint: GET /api/skyeroutex/operator-entry

## Final Live Deploy And Hero Proof

- Public SkyeNet deployment: `dep_20260528223019`
- Public SkyeNet receipt: `receipt_e972de4149684940ad5b049c`
- Platform-native public hostname: `https://skyenet.skyeroutex-logistics/`
- Route key: `route:v1:host:skyenet.skyeroutex-logistics`
- Main 0S Worker version carrying the operator-entry route and tour-token root-path fix: `c648a570-db0e-47cd-968c-fb9c524b3389`
- Hero proof video: `metraiyux_0s_site/skyenet-drops/skyeroutex-logistics-public/assets/skyeroutex-live-ops-reel.webm`
- Hero proof poster: `metraiyux_0s_site/skyenet-drops/skyeroutex-logistics-public/assets/skyeroutex-live-ops-poster.png`
- Capture receipt: `test-artifacts/skyeroutex-live-surface-capture-2026-05-27T23-04-52-748Z/capture-receipt.json`
- Final live proof receipt: `test-artifacts/company-skynet-host-routes/company-skynet-host-routes-latest.json`
- Hero video proof receipt: `test-artifacts/skyeroutex-live-proof-hero-2026-05-27T23-08-45Z.json`
- Proof method: live browser recording called `POST /api/skyeroutex/tour-token`, used the 30-minute `skyeroutex.tour.read` demo token, opened the public tour page, entered SkyeRouteX Workforce Command, and moved through the dispatch cockpit without owner/admin write access.

## Open App Guardrail

- Public homepage and tour page link: `/api/skyeroutex/operator-entry?return=%2FSkyeRouteX%2Fworkforce-command-v0.4.0%2Findex.html`
- Anonymous behavior: 302 redirect to `/admin/login.html` with the app return attached.
- Authenticated behavior: 302 redirect to `/SkyeRouteX/workforce-command-v0.4.0/index.html` using the shared FS27/SkyGate/Free99 gate.
- Tour token boundary: `skyeroutex.tour.read` tokens do not become operator access.
- Live stress receipt: `test-artifacts/skyeroutex-operator-entry-live-http-2026-05-28T14-39-24-995Z.json`

## Founder Command Record Deploy

- Gated Founder Command SkyeNet deployment: `dep_20260528061451`
- Gated Founder Command receipt: `receipt_293636cbdc064db0b8f57f4c`
- Founder Command live-record proof: `test-artifacts/founder-command-skyeroutex-platform-host-record-latest.json`
- Public access: false. Anonymous access returns `401`; owner access uses the shared FS27/SkyGate/Free99 gate.

## SkyeSol SkyeNet Deploy

- Public SkyeNet deployment: `dep_20260528223108`
- Public SkyeNet receipt: `receipt_918eb4671a3c4958a79b19e3`
- Live public URL: `https://skyenet.skyesol/`
- Route key: `route:v1:host:skyenet.skyesol`
- Source import: `Zenith/skyesol-main-extracted/skyesol-main`
- Staged source: `metraiyux_0s_site/skyenet-drops/skyesol-company-public`
- Migration receipt: `metraiyux_0s_site/skyenet-drops/skyesol-company-public/skyenet-migration.json`
- Final live HTTP proof: `test-artifacts/company-skynet-host-routes/company-skynet-host-routes-latest.json`
- Browser proof: owner-handled per repo policy.

## API And Dispatch Stack

- Main API namespace: /api/routex
- Compatibility API namespace: /api/skyeroutex
- Public tour endpoint: /api/skyeroutex/tour-token
- Operator entry endpoint: /api/skyeroutex/operator-entry
- Tour token TTL: 30 minutes
- Tour token scope: skyeroutex.tour.read
- Tour token role/workspace: demo / skyeroutex-demo
- Live tour-token smoke: `test-artifacts/skyeroutex-tour-token-live-smoke-2026-05-28T06-03-07-323Z.json`
- Mounted app id: skyeroutex
- Local runtime app: metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0
- Provider adapters: src/adapters/platform-services.js
- Runtime server: src/server.js
- API reference: /SkyeRouteX/workforce-command-v0.4.0/docs/API_REFERENCE.md
- Platform truth record: /SkyeRouteX/workforce-command-v0.4.0/PLATFORM_TRUTH.json
- Provider env audit: /SkyeRouteX/workforce-command-v0.4.0/proof/provider-env-audit-2026-05-21.md
- Route AE workforce lane receipt: /SkyeRouteX/workforce-command-v0.4.0/proof/routex-ae-workforce-lane-latest.json
- Latest mounted worker stress: /SkyeRouteX/workforce-command-v0.4.0/proof/skyeroutex-mounted-worker-stress-latest.json
- Latest live production stress: /SkyeRouteX/workforce-command-v0.4.0/proof/skyeroutex-live-production-stress-latest.json
- 0S route manifest: /api/0s/route-manifest
- Valley map surface: /valley-verified/map/

## Owner Inventory

| Surface | Link | Owner use |
| --- | --- | --- |
| Public company site | https://skyenet.skyeroutex-logistics/ | Public SkyeNet website for shippers, drivers, and platform buyers. |
| Open App doorway | /api/skyeroutex/operator-entry?return=%2FSkyeRouteX%2Fworkforce-command-v0.4.0%2Findex.html | Homepage entry for returning owners/operators; routes through the shared 0S gate. |
| Private operator doorway | /SkyeRouteX/ | Gated owner/operator inventory and app cockpit under the shared 0S gate. |
| Workforce Command cockpit | /SkyeRouteX/workforce-command-v0.4.0/index.html | Provider jobs, contractor applications, assignments, proof, route jobs, exports, and House Command. |
| V83 Dispatch Dashboard | /SkyeRouteX/dashboard.html | Dispatch board, proof-of-delivery, workforce lane, analytics, audit console, and static runtime cards. |
| V83 Routes | /SkyeRouteX/routes.html | Route creation, driver, vehicle, territory, stop order, and day ledger. |
| V83 Stops | /SkyeRouteX/stops.html | Stop proof, exceptions, POD notes, and route sequence review. |
| V83 Workforce | /SkyeRouteX/workforce.html | Field crew, driver, contractor, vehicle, and readiness surfaces. |
| V83 Proof Vault | /SkyeRouteX/proof.html | Proof vault and audit handoff surface. |
| V83 Analytics | /SkyeRouteX/analytics.html | Route score, revenue signal, mileage, follow-up pressure, and territory load. |
| V83 Runtime | /SkyeRouteX/runtime.html | Health, summary, queue, boards, sessions, and handoff endpoints. |
| V83 Settings | /SkyeRouteX/settings.html | Local runtime and provider-boundary settings. |
| Audit-ready console | /SkyeRouteX/apps/audit-ready-console/index.html | Preserved deep console and PHC app-fabric proof lane. |
| Gate readiness | /SkyeRouteX/workforce-command-v0.4.0/public/gate-readiness.html | Shared FS27/SkyGate/Free99 gate proof. |
| API reference | /SkyeRouteX/workforce-command-v0.4.0/docs/API_REFERENCE.md | v0.4.0 API surface map. |
| Provider env audit | /SkyeRouteX/workforce-command-v0.4.0/proof/provider-env-audit-2026-05-21.md | Provider credential readiness and unsupported-claim boundary. |

## Current Boundary

Route jobs, provider jobs, contractor applications, assignments, proof, storage export, integrations, compliance, and House Command are present in the mounted Workforce Command cockpit.

External live GPS, ETA, Mapbox optimization, SMS, and AI call handling should not be described as fully active until provider credentials and proof receipts are present. The Mapbox-ready configuration is `ROUTE_INTELLIGENCE_PROVIDER=mapbox` plus `MAPBOX_ACCESS_TOKEN`.

## SaaS Boundary

The owner email is the founder/company account email. It is not the global customer account. Customer signup must still provision customer-owned records and customer-owned mailboxes from the customer email submitted during signup.

## SkyeNet Migration Lane

- SkyeRouteX Logistics public site: `metraiyux_0s_site/skyenet-drops/skyeroutex-logistics-public`, project `skyeroutex-logistics-public`, platform-native host `https://skyenet.skyeroutex-logistics/`.
- SkyeSol is now staged and routed on SkyeNet from `metraiyux_0s_site/skyenet-drops/skyesol-company-public`, project `skyesol-company-public`, platform-native host `https://skyenet.skyesol/`.
- SkyeSol source import remains documented at `Zenith/skyesol-main-extracted/skyesol-main`.
- SkyeSol dossier is present at `Zenith/SKYESOL_COMPANY_DOSSIER.md`.
- A standalone `solenterprises.org` website source root was not found in this repo during the planning scan, so the SOLEnterprises umbrella site was intentionally rebuilt from repo knowledge.
- SOLEnterprises is now staged and routed on SkyeNet from `metraiyux_0s_site/skyenet-drops/solenterprises-public`, project `solenterprises-public`, platform-native host `https://skyenet.solenterprises/`, deployment `dep_20260528225625`, receipt `receipt_7e5c57da380f4a9fba3e365f`, route key `route:v1:host:skyenet.solenterprises`.
- SkyeNet platform-native hostnames should now be treated as canonical for the SkyeRouteX, SkyeSol, and SOLEnterprises public company surfaces. Previous Netlify links and 0S `/skyenet/...` path mounts are legacy mirrors/staging until archived and redirected.
