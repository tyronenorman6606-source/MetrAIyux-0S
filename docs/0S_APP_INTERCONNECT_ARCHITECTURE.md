# 0S App Interconnect Architecture

Updated: 2026-05-21

## Gate correction

The 0S gate is owned by the main Cloudflare Worker, not by each mounted app.
Every mounted app path must pass through `enforceZeroOsGate` before `env.ASSETS` or a proxied backend can serve it. A successful shared 0S/FS27/SkyGate/Free99 session should let the app render normally.

Do not add app-level client auth overlays to mounted apps. Do not inject `free99-gate.js` into newly mounted apps. Do not add per-app fallback token prompts, Local Proof Unlock buttons, or app-specific admin passwords.

Mounted app APIs should use same-origin requests and rely on Worker helpers such as `requireGateAuth`, `requireOperatorAuth`, and owner-admin session helpers. AI/provider-cost actions may add metering headers and SkyPay lane metadata, but auth still belongs to the Worker.

2026-05-21 correction: the legacy `Free99/free99-gate.js` helper is no longer an app gate. It must stay a session/header/route bridge only:

- No manual session-token input.
- No Local Proof Unlock.
- No app-specific `FREE99_PLATFORM_GATE_SESSION_<APP>` storage.
- No client overlay that blocks the app.
- No separate founder/admin/client password.
- No URL `gate_session` token acceptance.
- Shared session source is the 0S owner/admin login, FS27/SkyGate, or the main Worker gate bridge.

Any page that still includes the legacy helper is still protected by `enforceZeroOsGate`; the helper can only tag same-origin fetches with platform/usage metadata after the shared session already exists.

SkyeOpsConsole's old local PIN lock is retired in the mounted 0S copy. It shows shared-gate ownership and deletes stale `pin_hash` browser storage instead of asking the operator for an app-specific PIN.

## Paid AI and entitlement lanes

BrandForge and JobPing now use the same shared gate plus a SkyPay entitlement claim:

- BrandForge Free99 core: `/Free99/apps/brandforge/index.html`
- BrandForge paid AI API: `/api/brandforge/ai/generate`
- BrandForge checkout create: `/api/brandforge/checkout/create`
- BrandForge checkout claim: `/api/brandforge/checkout/claim`
- JobPing runtime: `/Free99/apps/jobping/index.html`
- JobPing paid match API: `/api/jobping/ai/match`
- JobPing checkout create: `/api/jobping/checkout/create`
- JobPing checkout claim: `/api/jobping/checkout/claim`
- Owner ledger UI: `/Free99/apps/brandforge/usage-ledger.html`

The checkout routes call FS27 SkyPay offers `brandforge-ai-generation` and `jobping-runtime`. The app stores only entitlement state and receipts under the 0S Worker after SkyPay status confirms payment. Provider AI calls are blocked with `402 checkout_required` until the shared gate identity has a claimed entitlement.

Provider usage path:

1. Prefer FS27 `/gateway-chat` when a `kx_live_` gateway key is configured on the 0S Worker.
2. Save 0S usage receipts for every attempt.
3. Mirror metered events into FS27 platform audit when the mirror secret is configured.
4. Fall back to the 0S `OPENAI_API_KEY` only when an FS27 gateway key is not configured.

No app-level password, client-side gate overlay, or per-app admin login is allowed in this flow.

## Mounted app roster in the interconnect plan

All mounted apps below are 0S surfaces first. They do not own auth. They emit and consume shared events through the planned Worker APIs.

| App | Route | Auth owner | Talks to |
|---|---|---|---|
| SkyeOpsConsole | `/Free99/apps/skyeopsconsole/` | `enforceZeroOsGate` | Operator tasks, proof receipts, app status events |
| Still2Vid Forge | `/Free99/apps/still2vid-forge/` | `enforceZeroOsGate` | Client App Factory, SkyeWebCreatorMax, SkyePics, BrandForge, SkyeMediaCenter |
| MyDrive Offline Vault | `/Free99/apps/mydrive-offline-vault/` | `enforceZeroOsGate` | SkyePics, Still2Vid, SkyeVault, Client App Factory |
| SkyeVault Pro | `/Free99/apps/skyevaultpro/` | `enforceZeroOsGate` | Current SkyeDocxMax, SkyeVault-Drop local import stage, optional paid recovery add-on |
| SkyePics Vault | `/Free99/apps/skyepics/` | `enforceZeroOsGate` | Still2Vid, MyDrive, BrandForge, WebCreator |
| BrandForge Campaign Studio | `/Free99/apps/brandforge/` | `enforceZeroOsGate` + SkyPay entitlement for paid AI | Still2Vid, SkyePics, Client App Factory, WebCreator |
| JobPing | `/Free99/apps/jobping/` | `enforceZeroOsGate` + SkyPay entitlement | SkyeOpsConsole, Client App Factory, proof/ledger |
| Key Gate 13th | `/key-gate-13th/` | `enforceZeroOsGate` + `requireGateAuth` APIs | Agentic Growth, SkyPay/Stripe, Cloudflare, provider-key custody audit |
| Agentic Growth Layer | `/agentic-growth-layer/` | `enforceZeroOsGate` + `requireGateAuth` APIs | Key Gate 13th, SITE_TASK_QUEUE, proof ledger, static patch adapters |
| Client App Factory | `/client-app-factory/` | `enforceZeroOsGate` / `requireOperatorAuth` for mutations | Still2Vid, WebCreator, BrandForge, SkyePics, MyDrive |
| SkyeWebCreatorMax | `/Marketing-Made-Easy/SkyeWebCreatorMax/` | `enforceZeroOsGate` / Marketing Made Easy adapter auth | Still2Vid, BrandForge, Client App Factory, SkyePics |
| SovereignDocs | `/Free99/apps/sovereigndocs/` | `enforceZeroOsGate` + `requireGateAuth` APIs | SkyeDocxMax, Client App Factory, proof/ledger |
| CodeStudio / Evaluator / Vault / Arcade / Storefront lanes | `/Free99/apps/*/` | `enforceZeroOsGate` + scoped Worker APIs | SkyeOpsConsole, proof/ledger, future app event bus |

The app list should be generated from `metraiyux_0s_site/Free99/app-manifest.json` when the event bus is implemented so this document cannot drift away from the mounted app manifest.

## SkyeVault Pro, SkyeDocxMax, and the dev drive

There are two vault lanes and they stay separate by design:

- SkyeVault-Drop / repo push lane: developer/operator handoff for sanitized repo archives and receipts. Existing commands stay: `npm run vault:push`, `npm run vault:dry-run`, and the `vault:git:*` commands.
- SkyeVault Pro: customer/operator local vault at `/Free99/apps/skyevaultpro/`. Its primary data layer is local IndexedDB plus explicit browser folder sync. It must not silently back up customer vault data to company servers.

Bridge commands now connect the lanes without merging their trust boundaries:

```bash
npm run vault:pro:stage -- --source <folder> --out <local-import-folder>
npm run vault:pro:from-dev -- --out <local-import-folder>
npm run vault:pro:stage:latest -- --out <local-import-folder>
```

These commands copy a sanitized local folder into a SkyeVault Pro import folder and write `.skye-vault-manifest.json`. The user then opens the gated SkyeVault Pro drive, opens Settings, and uses Disk sync -> Import folder. This is a local copy/import handoff, not a server backup.

SkyeVault Pro no longer carries its older bundled `apps/docx` editor. The useful local-vault communication bridge from that older copy now lives at:

```text
/Free99/apps/skyevaultpro/assets/js/skye-docxmax-vault-bridge.js
```

Current SkyeDocxMax surfaces load that bridge and accept `vaultDocId`. SkyeVault Pro defaults to the same-domain Marketing Made Easy editor so the main 0S Worker can deploy and prove the bridge without waiting on the separate oversized SovereignDocs Pages lane:

```text
/Marketing-Made-Easy/SkyeDocxMax/editor.html?vaultDocId=<id>&source=skyevaultpro&returnTo=/Free99/apps/skyevaultpro/drive/index.html
/Free99/apps/sovereigndocs/skye-docx-max/app/index.html?vaultDocId=<id>&source=skyevaultpro&returnTo=/Free99/apps/skyevaultpro/drive/index.html
```

The old SkyeVault Pro `apps/docx` runtime has been deleted from the live app tree. Legacy SkyeVault Pro docx URLs stay behind the shared 0S gate and redirect to the current SkyeDocxMax surface, so old bookmarks do not resurrect a second editor runtime.

The SovereignDocs Pages lane is not the runtime SkyeVault Pro depends on. SkyeVault Pro still defaults to the same-domain Marketing Made Easy SkyeDocxMax route above for its vault bridge.

The separate docs answer is now implemented instead of left as a caveat:

```text
Direct origin: https://sovereigndocs-docxmax-lane.pages.dev
0S route: /Free99/apps/sovereigndocs/skye-docx-max/
Canonical editor: /Free99/apps/sovereigndocs/skye-docx-max/app/index.html
```

That docs origin is a lean Cloudflare Pages deployment containing only the SkyeDocxMax docs/editor slice and shared SovereignDocs assets: 84 files, about 6.7 MB, under the 20,000-file Pages cap. The origin has its own Pages `_worker.js`, but it is not a second user auth system. Direct browser HTML access redirects to the main 0S owner login with a `return=` back to the mounted 0S route, direct non-HTML access returns `401`, and the main 0S Worker is the only path that can fetch origin assets through the private `SOVEREIGNDOCS_ORIGIN_PROXY_SECRET` header after `enforceZeroOsGate` has already passed.

This gives us the split we wanted: deployment logistics are separate, user runtime stays connected. Users touch the 0S route, the 0S owns FS27/Free99 auth, and the docs origin stays a private static supplier.

Hosted backup is a paid recovery add-on:

- Default: local IndexedDB, browser folder sync, and customer-controlled disk/thumb-drive copies.
- Paid add-on: Sovereign Backup at `$4.99/mo`.
- Server-side backup function default-denies unless `SKYEVAULTPRO_HOSTED_BACKUP_ENABLED=1` and the customer has an active paid entitlement.
- Future paid sync may target Neon or Citadel, but the default customer vault remains local/private.

Proof receipts:

- Live browser and API proof: `test-artifacts/skyevaultpro-docxmax-live/latest-live-browser-report.json`
- CLI stress/static proof: `test-artifacts/skyevaultpro-backed-claims/latest-proof.json`
- SovereignDocs lean docs origin proof: `test-artifacts/sovereigndocs-docxmax-lean-live/latest-live-browser-report.json`
- SovereignDocs lean docs build manifest: `test-artifacts/sovereigndocs-docxmax-lane/build-manifest.json`

## JobPing source status

The workspace was searched for a complete JobPing runtime/source tree. No hidden complete JobPing app was found; only the mounted `Free99/apps/jobping/index.html`, proof screenshots, manifest references, and FS27 schema/search-path references exist.

Because the original zip did not contain a clean runnable app runtime, JobPing is now mounted as a 0S-owned paid runtime surface: local triage, SkyPay checkout/claim, entitlement state, and paid AI match generation. Full outbound job automation would still need provider/API credentials and workflow definitions for job boards, notifications, and background scheduling.

## What changed

Still2Vid Forge v4 is now a real Free99 app inside the 0S:

- App route: `/Free99/apps/still2vid-forge/index.html`
- Gate: main Worker `enforceZeroOsGate`
- Platform id: `still2vid-forge`
- Billing: `Free99 / $0`
- Rule: no charge does not mean anonymous. FS27/0S gate session is still required.

The app is browser-local. Images, overlays, audio, and exported videos are processed in the browser canvas/MediaRecorder flow.

## Handoff contract

Browser apps pass media to Still2Vid through localStorage:

```json
{
  "sourceApp": "client-app-factory",
  "clientId": "client-slug",
  "client": "Client Name",
  "sourceName": "client-logo.png",
  "sourceType": "operator-upload",
  "sourceUrl": "/client-app-factory/storage/uploads/client/client-logo.png",
  "imageDataUrl": "data:image/png;base64,...",
  "receipt": "operator-uploaded:client-logo.png",
  "returnTo": "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-app-factory/media/"
}
```

Storage key:

```text
METRAIYUX_MEDIA_HANDOFF
```

Allowed `sourceType` values:

- `operator-upload`
- `live-surface`
- `open-source`
- `ai-generated`

Still2Vid blocks export until a real image is loaded and a receipt exists for live-surface, open-source, or AI-generated media.

This browser-local handoff is not an auth mechanism. It carries media context only. Gate identity must come from the main Worker/FS27 session.

## Current app links

Client App Factory:

- Media Pack page opens Still2Vid with the current client image/logo.
- Asset cards can send an image directly into the forge.
- AI identity image request calls the factory backend route `/factory/identity-image`.
- Emits: `factory.client.imported`, `identity.logo.ready`, `media.video.requested`.
- Consumes: `media.video.exported`, `website.asset.attached`, `brand.campaign.ready`.

SkyeWebCreatorMax:

- Builder and index surfaces now expose a Media Forge button.
- WebCreator writes a handoff shell so Still2Vid knows the caller and return path.
- Emits: `webcreator.project.ready`, `website.asset.attached`, `media.video.requested`.
- Consumes: `identity.logo.ready`, `media.video.exported`, `brand.campaign.ready`.

SkyePics:

- Emits: `media.image.ready`, `media.gallery.selected`, `media.source.resolved`.
- Consumes: `vault.asset.stored`, `identity.logo.ready`, `brand.campaign.ready`.

MyDrive Offline Vault:

- Emits: `vault.asset.stored`, `vault.asset.unlocked`, `media.source.resolved`.
- Consumes: `media.video.exported`, `media.image.ready`, `document.packet.ready`.

BrandForge:

- Emits: `brand.campaign.ready`, `identity.logo.ready`, `media.asset.requested`.
- Consumes: `media.image.ready`, `media.video.exported`, `factory.client.imported`.

JobPing:

- Emits: `job.match.requested`, `job.match.ready`, `job.application.packet.ready`.
- Consumes: `factory.client.imported`, `document.packet.ready`, `ops.task.created`.

SkyeOpsConsole:

- Emits: `ops.task.created`, `ops.proof.requested`, `ops.app.status.updated`.
- Consumes: all app events for operator timeline, QA, and proof-routing.

## Logo/source rule

Client App Factory must not treat fake initials or plain text marks as production logo assets.

Source priority:

1. Uploaded real client logo/image.
2. Harvested live-surface logo/image.
3. Open-source/licensed asset with receipt.
4. AI-generated identity image with receipt.

If none exist, the build must stop for identity intake instead of inventing a fake text logo.

## Next architecture layer

The browser-local handoff is the immediate layer. The next real 0S layer should be a shared app event bus:

- `POST /api/app-events` for app-to-app events.
- `POST /api/media/jobs` for image/video generation jobs.
- `POST /api/media/resolve-source` for source/license/provenance validation.
- `GET /api/app-events?clientId=...` for timeline replay.
- `GET /api/app-events/stream?clientId=...` for live operator/app updates.
- `POST /api/app-assets` for gate-owned media/asset receipts before R2 promotion.

Canonical event names:

- `identity.logo.ready`
- `media.video.requested`
- `media.video.exported`
- `media.image.ready`
- `media.gallery.selected`
- `media.source.resolved`
- `vault.asset.stored`
- `vault.asset.unlocked`
- `vault.pro.import.staged`
- `vault.pro.folder.imported`
- `docx.vault.opened`
- `docx.vault.committed`
- `devdrive.snapshot.pushed`
- `backup.addon.requested`
- `backup.snapshot.created`
- `website.asset.attached`
- `factory.client.imported`
- `webcreator.project.ready`
- `brand.campaign.ready`
- `media.asset.requested`
- `job.match.requested`
- `job.match.ready`
- `job.application.packet.ready`
- `document.packet.ready`
- `ops.task.created`
- `ops.proof.requested`
- `ops.app.status.updated`

Event envelope:

```json
{
  "event": "media.video.exported",
  "appId": "still2vid-forge",
  "clientId": "client-slug",
  "assetId": "asset-or-r2-key",
  "sourceApp": "client-app-factory",
  "targetApps": ["client-app-factory", "skyewebcreatormax", "skyeopsconsole"],
  "provenance": {
    "sourceType": "operator-upload",
    "receipt": "operator-uploaded:client-logo.png"
  },
  "payload": {},
  "correlationId": "evt_chain_id"
}
```

Auth rule for these APIs:

- The Worker derives identity from `requireGateAuth` / `requireOperatorAuth`.
- Clients do not send their own admin password.
- Payload identity fields are metadata only and cannot override the gate identity.
- Provider-cost routes add entitlement checks after shared gate auth, not instead of it.

Longer term, browser-local data URLs should graduate into SkyeMediaCenter KV/R2-backed assets, while app events stay gate-owned through FS27/0S identity.
