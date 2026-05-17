# MetrAIyux 0S Full Website + Autonomous Business OS


**MetrAIyux 0S** is the official product name for this package. It replaces prior working names such as Sovereign 13 Cabinet, 13-Cabinet Executive Office, CabinetOS, SovereignOffice OS, and generic Autonomous Business OS language.

This package contains the full public website, owner/admin automation OS, customer SaaS layer, tenant isolation, 0meg4kAI security/QA brain, 16-brain registry, Cloudflare Worker kits, D1 migrations, Resend approval email workflow, tutorials, valuation pages, proof receipts, and deployment documentation.

## SkyeMerit Protected Merit System

This build includes SkyeMerit as a no-charge first-time merit lane inside the 0S SaaS and SkyePay system. SkyeMerit gives first-time users a `$6` premium kAIxu credit and protected discount rules that lower only eligible SkyePay spend bands. It does not remove FS27, owner approval, checkout policy, or gate-session requirements.

Start points:

- `saas/skyemerit.html` — customer wallet and capped discount calculator.
- `operator/skyemerit-admin.html` — owner/operator issue control.
- `proof/skyemerit-expansion-receipt.html` — proof receipt and commercial boundary.

Local proof command:

```bash
npm run 0s:skyemerit:proof
```

## Platform Integration Accounting

This build accounts for the changelog additions as first-class 0S platform lanes: SkyePay Store, SkyeVault access, SkyeCard usage offers, SkyeMail, SkyeMerit, SkyeRouteX, and the Free99 gated expansions. The operator ledger maps each lane to system surfaces, buyer routes, advertising angles, integration boundaries, and proof commands.

Start points:

- `operator/platform-integration-ledger.html` — operator-readable platform accounting and campaign matrix.
- `data/platform-integration-ledger.json` — machine-readable source for the same accounting.
- `sales/live-proof-router.html` — buyer-signal router for store, vault, mailbox, merit, RouteX, Free99, and proof conversations.
- `brain/sales-offer-registry.json` — approved catalog groups and public routes for SkyePay, SkyeVault, SkyeCard, and SkyeMail.

Local proof command:

```bash
npm run 0s:platform-accounting
```

## ConnectLog + Relay13 Expansion

This build adds `connectlog-v7.7-relay13-operator-proof/` and `relay13-core-v1.7-connectlog-operator-proof/` inside the 0S site. ConnectLog is the local-first relationship command app. Relay13 is the Cloudflare Worker messaging core and operator console package.

Start points:

- `live/connectlog-relay13-operator-proof.html` — 0S expansion hub.
- `connectlog-v7.7-relay13-operator-proof/app.html` — ConnectLog app and Relay13 bridge panel.
- `relay13-core-v1.7-connectlog-operator-proof/public/index.html` — Relay13 preview.
- `proof/connectlog-relay13-expansion-receipt.html` — proof receipt and live Worker boundary.

Relay13 is now live at `https://relay13-core.graylondonskyes.workers.dev/` using the shared `metraiyux-site-operator-db` D1 binding. Production proof covers workspace bootstrap, scoped API key creation, ConnectLog card upsert, scan conversation, message history, activation run, live-proof gates, and customer/operator WebSocket opens. Keep scoped API keys out of public source; ConnectLog defaults to the live origin/workspace for public-domain conversation creation only.

## HouseOperations + SkyeBox Expansion

This build adds `HouseOperations/skye-box-authenticator-vault/` inside the 0S site. HouseOperations is the local task/vendor/schedule/owner-alert command app. SkyeBox is a local encrypted TOTP authenticator vault nested under it.

Start points:

- `live/houseoperations-skyebox-operator-proof.html` - 0S expansion hub.
- `HouseOperations/index.html` - HouseOperations app.
- `HouseOperations/skye-box-authenticator-vault/index.html` - SkyeBox Authenticator Vault.
- `proof/houseoperations-skyebox-expansion-receipt.html` - proof receipt and local-only boundary.

The base public 0S rates are held in this pass. Plan scope now includes HouseOperations and SkyeBox handoff language by tier. SkyeBox is local-first: it does not provide cloud sync, server-side recovery, or managed secret custody without a later approved managed scope.

## SkyeRouteX Workforce Command Expansion

This build also adds `SkyeRouteX/` and `SkyeRouteX/workforce-command-v0.4.0/` inside the 0S site. SkyeRouteX is the workforce command lane for dispatch, provider job posting, contractor job boards, applicant pools, assignments, route stops, workforce readiness, proof vaults, payment-state ledgers, market reports, export packets, analytics, local runtime checks, and a manifest-only 0S mount.

Start points:

- `live/skyeroutex-workforce-command.html` — 0S expansion hub.
- `SkyeRouteX/index.html` — routed workforce command shell.
- `SkyeRouteX/runtime.html` — runtime lane and static contract link path.
- `SkyeRouteX/workforce-command-v0.4.0/index.html` — static-safe v0.4.0 platform hub.
- `SkyeRouteX/workforce-command-v0.4.0/public/index.html` — API-backed browser command UI when the Node runtime is running.
- `proof/skyeroutex-expansion-receipt.html` — proof receipt and production boundary.

Local proof command:

```bash
npm run 0s:skyeroutex:proof
```

That root command runs the V83 `SkyeRouteX` runtime harness, the v0.4.0 `smoke:all` API/browser/provider/mount harness, and the 0S public browser integration E2E.

Concurrency stress command:

```bash
npm run 0s:skyeroutex:stress
```

The stress harness exercises concurrent providers, contractors, route jobs, applications, acceptance locks, assignment transitions, proof media, approvals, export packets, market reports, payment ledger state, persisted totals, and audit-chain integrity. The fresh default local JSON proof shape passed at 608 requests with no 500s, only 200/201 responses plus expected 409 assignment-lock conflicts, and p99 in the 6.2s to 12.2s local range. A doubled shape also passed at 1,192 requests after caching/atomic compact writes and a serialized mutation queue were added, but p99 stayed around 10.5s, so production RouteX needs Postgres/object storage/provider infrastructure for serious throughput. Production boot now rejects local JSON/local file storage.

Current pricing keeps RouteX Workforce Command at `$1,497/month` plus `$6,500 setup`, with a named SkyePay offer and owner-approved activation. SkyeGateFS27 now holds core MetrAIyux app lanes at `paid_pending_owner_approval` after payment; RouteX cannot auto-unlock from a Stripe success event.

## SkyeProfitConsole Free99 Expansion

This build adds `SkyeProfitConsole/` inside the 0S site. SkyeProfitConsole is the Free99 profit field for profit packs, split checks, money moves, close briefs, margin pressure, signal loom lanes, proof events, local exports, and optional same-folder runtime persistence.

Start points:

- `live/skyeprofitconsole-profit-console.html` - 0S expansion hub.
- `SkyeProfitConsole/index.html` - gated app entry.
- `SkyeProfitConsole/runtime.html` - runtime mode.
- `proof/skyeprofitconsole-expansion-receipt.html` - proof receipt and auth boundary.

Free99 means no charge. It does not mean anonymous access. The app waits for a 0S or FS27 gate session before booting, and `runtime/local-runtime.mjs` returns 401 for ungated runtime API calls.

Local proof command:

```bash
cd SkyeProfitConsole
npm run smoke
```

## SkyeMediaCenter Free99 Expansion

This build adds `SkyeMediaCenter/` inside the 0S site. SkyeMediaCenter is the Free99 media field for gated media intake, asset list/search, review boards, execution boards, dispatch boards, publishing, stats, file delivery, workflow timelines, and operator proof.

Start points:

- `live/skye-media-center-operator-proof.html` - 0S expansion hub.
- `SkyeMediaCenter/index.html` - gated app entry.
- `SkyeMediaCenter/public/index.html` - gated intake portal.
- `SkyeMediaCenter/public/admin.html` - gated operator theater.
- `proof/skyemediacenter-expansion-receipt.html` - proof receipt and auth boundary.

Free99 means no charge. It does not mean anonymous access. The app waits for a 0S or FS27 gate session before booting, and media asset, search, publish, stats, and file-delivery functions reject ungated requests with 401.

Local proof commands:

```bash
cd SkyeMediaCenter
node smoke/skye-media-center-p2-smoke.mjs
node smoke/smoke-proof.mjs
```

## Skye Content Forge Free99 Expansion

This build adds `skye-content-repurposer-local/` inside the 0S site. Skye Content Forge is the Free99 content publisher for approved source scanning, source-note extraction, original content generation, draft archives, Markdown export, Google Drive upload when configured, scheduler ticks, publish queues, GitHub backup/restore, Netlify/Cloudflare hooks, and official social API boundaries.

Start points:

- `live/skye-content-forge-publisher.html` - 0S expansion hub.
- `skye-content-repurposer-local/public/index.html` - gated app shell.
- `skye-content-repurposer-local/README.md` - live/local runbook.
- `proof/skye-content-forge-expansion-receipt.html` - proof receipt and auth boundary.

Free99 means no charge. It does not mean anonymous access. The app waits for a 0S, FS27, SkyGate, or local admin gate session before booting, and every `/api/*` route rejects ungated requests with 401.

Local proof command:

```bash
cd skye-content-repurposer-local
npm run smoke
```

## SkyeMusicNexus Lite + Paid Music Ops

This build adds `SkyeMusicNexus/` inside the 0S site. SkyeMusicNexus Lite is the Free99 music preview lane for a gated artist/release/upload proof path. Studio, Label Command, Managed Music Ops, Single Song Drop, release drops, Gated Audio Vault Pack, catalog import, royalty ledger setup, payout review, artist profile, seat, and release-pack add-ons are paid routes.

Start points:

- `live/skyemusicnexus-neofront.html` - 0S expansion hub.
- `SkyeMusicNexus/index.html` - gated app shell.
- `SkyeMusicNexus/public/index.html` - Platform Dashboard.
- `SkyeMusicNexus/public/upload.html` - Upload Studio.
- `SkyeMusicNexus/public/player.html` - Music Player.
- `SkyeMusicNexus/public/releases.html` - Releases.
- `SkyeMusicNexus/public/rights.html` - Rights Vault.
- `SkyeMusicNexus/public/exchange.html` - Creator Exchange.
- `SkyeMusicNexus/public/admin.html` - Operator Stage.
- `proof/skyemusicnexus-expansion-receipt.html` - proof receipt and auth boundary.

Free99 means no charge for Lite only. It does not mean anonymous access. The app shell, public rooms, paid tiers, and paid add-ons require a 0S, FS27, or SkyGate session before use, and the music artist/release/audio-asset/workflow read endpoints reject ungated requests with 401. Paid checkout does not claim live distributor ingestion, DSP royalty settlement, real payment movement, production identity-provider handoff, label/legal authority, public streaming licensing, or durable large-catalog storage until SkyeVault/R2 and separate provider proof exists.

Local proof command:

```bash
cd SkyeMusicNexus
npm run smoke
```


A static, deployable executive cabinet website with individual resume pages, portraits, executive roster, governance charter, AE positioning, and deployment instructions.

## Deploy

Upload this folder to Netlify, Cloudflare Pages, Vercel, or any static host. The public entry file is `index.html`.

## Included

- `index.html` full website
- `style.css` premium dark visual system
- `script.js` cabinet interactivity
- `assets/portraits/` individual portraits cropped from the generated executive poster
- `resumes/*.html` print-ready resume pages
- `resumes/*.md` markdown resume files
- `docs/ceo-chief-of-operations-charter.md` governance charter
- `data/cabinet-executives.json` structured roster data

## Important

All named cabinet members except verified real personnel are fictional sample planning roles. Do not use them in legal filings as real appointed officers unless the people exist, consent, and the information is accurate.


## Founder image correction

Gray London Skyes uses the actual founder/source image from the approved Skyes Over London founder asset. The remaining cabinet portraits are demonstrative executive personas until real people are legally appointed and photographed.


## Local Cabinet Brain

Open `local-brain.html` to use the browser-side cabinet knowledge assistant. It uses `brain/knowledge-base.json` and does not require a paid model provider. Optional Ollama/llama.cpp OpenAI-compatible endpoint wiring and a tiny proxy are included under `brain/`.

Open `deployment-command-center.html` for operator setup guidance.


## 16 Operating Local Brains

This build includes one Central Company Command Brain and 13 individual cabinet-person brains. Open `person-brains.html` to select an executive brain, ask scoped questions, and view retrieved local proof sources. The brains are lightweight JSON/persona modules over the included knowledge base. They do not require a GPU, database, paid API, or live model endpoint.

Files added:
- `person-brains.html`
- `brain/persona-brains.json`
- `brain/persona-brains.js`
- `brain/individual-brains/*.md`

Truth standard: the cabinet members remain sample planning roles until real people are legally appointed and verified.


## Longform Blog Library

This upgraded package includes `blog/index.html`, ten longform article pages, markdown sources, metadata JSON, and local-brain knowledge chunks for the blog content. The articles are designed for AE education, public positioning, onboarding, and company doctrine support.


## Resend approval email layer

The Admin Automation Brain now supports Resend-powered approval notifications through the Cloudflare Worker kit. Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_APPROVAL_EMAIL`, and `PUBLIC_ADMIN_URL`, then use `/admin/resend-notifications.html` and `/admin/approval-inbox.html`.

The site can route and draft locally. Real email notifications require deployed Worker credentials.


## Admin Tutorial + Valuation Upgrade

Added 2026-05-15T10:53:33Z: expanded admin tutorial to 22 lessons, added Resend approval workflow training, production deployment/secrets training, social autonomy training, autonomous company rhythm, final smoke checklist, and a site valuation desk at `admin/site-valuation.html`.


## SaaS Self-Serve Upgrade (2026-05-15T11:06:44Z)

Added public pricing/signup/onboarding/customer portal pages and a Cloudflare SaaS provisioning Worker kit. See `saas/index.html`, `saas/docs/SAAS_SELF_SERVE_IMPLEMENTATION.md`, and `cloudflare-saas-provisioning-worker/README.md`.


## 0meg4kAI Tenant Isolation Upgrade

This package includes a Security/QA operating brain named 0meg4kAI. It is the security/QA assistant for the Main Automation Brain and protects the owner/admin layer from customer SaaS workspaces. Customer commands must be reviewed before they can create admin-facing tasks or touch production connectors. Live enforcement requires Cloudflare Worker deployment, D1/KV/Queue bindings, upstream auth, and secrets stored server-side only.


## SkyeCrawler Operator QA

SkyeCrawler is the end-to-end user-flow crawler for this system. It lives in `tools/skye-crawler.mjs`, is documented at `operator/skye-crawler.html`, and has a proof receipt at `proof/skye-crawler-receipt.html`.

Run from the MetrAIyux 0S operator page:

```bash
npm run skye:control
```

Then open `operator/skye-crawler.html` and use the runner buttons.

Run static mode after content/navigation changes:

```bash
npm run skye:serve:site
npm run skye:crawl:static
```

Run Worker mode after API, header, Cloudflare, or routing changes:

```bash
npm run skye:crawl:worker
```

The crawler checks page inventory, local links/assets, browser runtime errors, mobile layout, Worker API status/routing, and key user flows including Local Brain, Persona Brain, Live Proof Router, calculator, admin local tool, SaaS signup receipt, and Client OS onboarding.
