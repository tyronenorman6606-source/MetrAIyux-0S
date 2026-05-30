# SkyeMusicNexus Drop Deploy Orchestrator Directive

Generated: 2026-05-18

This is the build directive for upgrading SkyeMusicNexus with a drop queue, approval brain, batched Netlify deploy pipeline, SkyGate private delivery, tier limits, and traffic accounting.

This document is planning only. Do not treat it as proof that the system is implemented until the listed files, functions, UI, smoke tests, browser E2E, and deploy proof exist.

## Mission

SkyeMusicNexus must let authenticated artists upload music, create publishable drop packages, queue them for review, batch compatible drops into one Netlify production deploy, and then save the live drop URLs back to the MusicNexus release/catalog records.

The purpose is to maximize a Netlify Pro account by separating two concepts:

- Drop: a music package owned by an artist or client.
- Deploy: one production publishing event that can contain many drops.

One deploy may ship one song, one album, ten singles from different artists, private delivery pages, campaign pages, artist hub pages, and collective hub pages at the same time.

## Current Repo Findings

The existing app is ready for this as an upgrade layer, not a rebuild.

- `public/upload.html` already has a gated upload lane with artist ID, release ID, track title, drag/drop audio, generated track line, and storage readiness.
- `netlify/functions/music-assets.js` already gates upload, list, stream, delete, storage-status, direct-upload session creation, and direct-upload completion behind SkyGate. It already supports local proof storage and parked Cloudflare R2/SkyeVault mode.
- `public/player.html` and `public/neo-nexus.js` already play linked audio and generated proof previews.
- `netlify/functions/music-releases.js` already supports submit, review, publish, rights updates, takedown holds, operations queueing, stream reporting, and playback stream accounting.
- `public/rights.html` and release rights logic already enforce ownership, preview authorization, distribution authorization, takedown holds, and playback blocks.
- `netlify/functions/music-social.js` already provides Pixelfed, Mastodon-compatible, Funkwhale, ActivityPub-style queues, provider-token-safe social posts, and feed sync contracts.
- `netlify/functions/music-exchange.js` already provides content requests, inbox threads, community posts, campaign packs, and achievement progression.
- `data/skyemusicnexus-pricing.json` already contains Free99 Lite, the May 2026 founding-core grant, Artist Host, Artist Collective, Managed Music Ops, Single Song Drop, Release Drop Plus, EP Drop, Album Drop, campaign add-ons, fan preview/private package policy, and a gated audio vault pack.
- `PLATFORM_TRUTH.json` correctly says paid checkout does not create live distributor, DSP, legal, label, payment, or production provider claims.

Missing layer:

- Drop draft data model.
- Drop queue UI.
- Tier and monthly limit enforcement.
- Drop approval email/notification.
- 72-hour approval brain.
- Batch deploy pool.
- Static drop site generator.
- Netlify production deploy trigger.
- Deploy receipt records.
- Live URL writeback to release, artist, feed, and discover records.
- Public drop page telemetry endpoint.
- Private delivery gate for stems, masters, and high-value files.
- Netlify credit and bandwidth estimator.

## Existing Systems To Wire In

This upgrade must use the existing repo systems as connected capabilities, not as copied donor folders.

SkyeWebCreatorMax:

```txt
metraiyux_0s_site/Marketing-Made-Easy/SkyeWebCreatorMax
```

Role:

- Generate static drop-page packages from MusicNexus drop briefs.
- Produce editable website artifacts for single, release, campaign, private delivery, artist, and hub pages.
- Persist generated project metadata through its project/artifact/delivery model when a bridge is available.
- Emit or mirror the existing lanes:
  - `webcreator.project.requested`
  - `webcreator.project.generated`
  - `webcreator.asset.persisted`
  - `webcreator.delivery.queued`
  - `app.generated`
  - `ae.requested`

Known integration surface:

- `docs/API_BRIDGE.md` describes `requestWebCreatorProject(...)` and `persistGeneratedWebCreatorArtifact(...)`.
- `SkyeWebCreatorMax_DIRECTIVE.md` defines the generation flow from user brief to generated website/UI artifact.
- `js/webcreator.js` already has local project, delivery, source, preview, and package behavior.
- `runtime/local-runtime.mjs` exposes a local runtime/status and board-style execution store.

WebGrowthOperator:

```txt
metraiyux_0s_site/Marketing-Made-Easy/WebGrowthOperator
```

Role:

- Generate campaign, growth, SEO/GEO, metadata, schema, social-card, sitemap, and launch-plan payloads for drop pages.
- Supply campaign language and operational guardrails without copying local-business content blindly into artist pages.
- Keep claims honest: no guaranteed rankings, leads, revenue, ad returns, playlisting, legal outcomes, royalties, or DSP distribution unless those services are separately connected and proven.

MusicNexus remains the source of truth. SkyeWebCreatorMax and WebGrowthOperator are build/growth operators called by MusicNexus. They do not own auth, rights, payment state, tier limits, drop approvals, private delivery, or final deploy receipts.

## Root Env And Credential Discovery Contract

The implementation must discover configured credentials from root environment files and process environment without printing secret values.

Primary local env source:

```txt
/workspaces/MetrAIyux-0S/.env
```

Additional known env source:

```txt
/workspaces/MetrAIyux-0S/SkyeVault-Drop/.env
```

Rules:

- Load through server-side Node/function/runtime code only.
- Never expose values in browser HTML, JS, JSON receipts, logs, screenshots, tests, or proof artifacts.
- Logs may show only key names, presence, source file, and redacted status.
- Env resolution must support explicit MusicNexus keys first, then repo-level aliases.
- Missing credentials must produce a clear setup report, not a crash with leaked config.

Required resolver:

```txt
scripts/drop-env-resolve.mjs
```

Resolver output shape:

```json
{
  "netlify": {
    "authToken": { "present": true, "key": "NETLIFY_AUTH_TOKEN" },
    "siteId": { "present": true, "key": "NETLIFY_SITE_ID" }
  },
  "email": {
    "provider": "resend",
    "apiKey": { "present": true, "key": "RESEND_API_KEY" },
    "from": { "present": true, "key": "RESEND_FROM_EMAIL" },
    "adminRecipients": { "present": true, "key": "ADMIN_EMAILS" }
  },
  "skygate": {
    "configured": true,
    "keys": ["SKYGATE_PUBLIC_KEY_PEM", "SKYGATE_ISSUER", "SKYGATE_INTROSPECT_URL"]
  },
  "privateStorage": {
    "mode": "r2-or-skyevault",
    "configured": true
  }
}
```

Alias groups to support:

```txt
Netlify token:
  MUSIC_NEXUS_DROPS_NETLIFY_AUTH_TOKEN
  NETLIFY_AUTH_TOKEN
  SKYGATEFS13_NETLIFY_AUTH_TOKEN
  SKYGATEFS13_TARGET_NETLIFY_AUTH_TOKEN
  QUANTUMSKYES_NETLIFY_AUTH_TOKEN

Netlify site:
  MUSIC_NEXUS_DROPS_NETLIFY_SITE_ID
  NETLIFY_SITE_ID
  SKYGATEFS13_TARGET_NETLIFY_SITE_ID
  SKYEVAULT_DROP_NETLIFY_SITE_ID
  QUANTUMSKYES_NETLIFY_SITE_ID

Approval email recipients:
  MUSIC_NEXUS_DROPS_APPROVAL_EMAIL
  ADMIN_EMAILS
  PLATFORM_SCREENSHOT_EMAIL
  NOTIFY_EMAIL_TO
  CLIENT_RECEIPT_EMAILS

Email provider:
  RESEND_API_KEY
  RESEND_FROM_EMAIL
  RESEND_WEBHOOK_SECRET
  SMTP_HOST
  SMTP_PORT
  SMTP_USER
  SMTP_PASS

SkyGate:
  SKYGATE_PUBLIC_KEY_PEM
  SKYGATE_ISSUER
  SKYGATE_INTROSPECT_URL
  METRAIYUX_0S_SKYGATE_*
  SKYGATEFS13_*
  SKYGATEFS27_*

Private storage:
  MUSIC_NEXUS_R2_*
  CLOUDFLARE_R2_*
  R2_*
  SKYEVAULT_*
  CLOUDFLARE_API_TOKEN
  CLOUDFLARE_ACCOUNT_ID

Builder/growth operator URLs:
  SKYEWEB_CREATOR_DASHBOARD_URL
  SKYEWEB_CREATOR_PLATFORM_URL
  VANTACORE_SKYEWEB_CREATOR_DASHBOARD_URL
```

Live Netlify deploy must be disabled by default in local/dev proof mode. The deploy script may publish only when:

```txt
MUSIC_NEXUS_DROPS_ENABLE_LIVE_DEPLOY=1
```

and the batch has a manual approval receipt or a valid 72-hour approval-brain receipt.

## Netlify Pro Facts To Build Around

Current official Netlify credit model, checked on 2026-05-18:

- Pro includes 3,000 credits per month.
- Production deploys cost 15 credits each.
- Deploy Previews and branch deploys are not metered as production deploys.
- Web bandwidth costs 20 credits per GB.
- Web requests cost 2 credits per 10,000 requests.
- Pro add-on credits are available in packs.

Sources:

- https://www.netlify.com/pricing/
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/

Credit formula:

```txt
monthly_credits =
  production_deploys * 15
  + web_bandwidth_gb * 20
  + web_requests / 10000 * 2
  + compute_gb_hours * 10
  + ai_inference_credits
```

The orchestrator must show estimated credit cost before every production deploy.

## Core Definitions

### Drop

A drop is a publishable music package.

Required fields:

```json
{
  "dropId": "drop_...",
  "dropType": "single_drop",
  "artistId": "artist_...",
  "ownerUserId": "skye_...",
  "releaseId": "release_...",
  "title": "Song Title",
  "status": "draft",
  "visibility": "public",
  "rightsStatus": "needs-clearance",
  "tierPolicy": "free99-lite",
  "assets": [],
  "tracks": [],
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Drop Types

```txt
single_drop
  One track, cover art, player, download button, drop JSON.

release_drop
  EP or album page with multiple tracks, release player, track list, cover art, download rules.

campaign_drop
  Song or release story, player, presave/download/social links, launch CTA.

private_delivery
  Client/private page for stems, masters, alternate mixes, invoices, approvals, and downloads.

hub_drop
  Collective hub that groups multiple drops from one deploy batch, such as weekly singles, genre rooms, label batches, or artist roster pages.
```

### Deploy

A deploy is one production publishing event to the Netlify drop site. It can contain many drops.

Required fields:

```json
{
  "batchId": "batch_...",
  "status": "queued",
  "dropIds": [],
  "deployMode": "batched",
  "requiresOwnerApproval": true,
  "autoApprovalEligibleAt": "...",
  "estimatedCredits": 0,
  "estimatedBandwidthGb": 0,
  "netlifyDeployId": "",
  "liveBaseUrl": "",
  "createdAt": "...",
  "publishedAt": ""
}
```

## Canonical Drop Site Shape

Use one Netlify site for published drops. Do not create one Netlify project per song.

```txt
song-drops-site/
  index.html
  catalog.json
  artists/
    artist-id/
      index.html
      artist.json
  drops/
    singles/
      drop-id/
        index.html
        audio.mp3
        cover.jpg
        drop.json
    releases/
      release-id/
        index.html
        release.json
        tracks/
          track-id/
            index.html
        audio/
          track-id.mp3
    campaigns/
      campaign-id/
        index.html
        campaign.json
    private/
      delivery-id/
        index.html
        delivery.json
  hubs/
    latest/
      index.html
    batches/
      batch-id/
        index.html
        batch.json
```

Every static page must embed only enough metadata to render and verify ownership. MusicNexus remains the source of truth for auth, tier, rights, approval, deploy receipts, and analytics.

## Ownership And Routing Rules

Every drop must preserve owner and artist routing:

- `ownerUserId` identifies the authenticated SkyGate user who created it.
- `artistId` identifies the artist profile.
- `releaseId` connects it to release workflow and rights.
- `dropId` identifies the public package.
- `batchId` identifies the deploy batch that published it.
- `visibility` controls public/private/gated behavior.

Artist single pages can be batched with other artists without mixing ownership because each drop carries its own IDs and path.

Example:

```txt
/drops/singles/drop_velvet_night_signal/
/drops/singles/drop_ion_blue_pressure/
/hubs/batches/batch_2026_05_18_evening/
```

The batch hub links both singles, but each single still belongs to its artist.

## Required Lifecycle

```txt
draft
  Artist creates the drop and uploads/selects assets.

intake_ready
  Required metadata exists. Rights are not necessarily cleared.

rights_ready
  Ownership and preview/download rights are attested.

deploy_pool
  Drop is eligible to be batched.

approval_pending
  Batch was formed and owner/admin email was sent.

approved
  Owner/admin approved manually or approval brain approved after policy window.

publishing
  Static bundle is being generated and deployed.

live
  Netlify production deploy is live and URLs are saved back.

blocked
  Rights, tier, file type, admin, payment, or abuse policy blocked the drop.

takedown_hold
  Playback/download must be disabled until operator clears it.
```

## Drop Queue Policy

All drops enter a deploy pool first. The deploy pool groups compatible drops.

Compatibility keys:

- `visibility`: public, unlisted, private.
- `dropType`: single, release, campaign, private_delivery, hub.
- `urgency`: normal, priority, emergency.
- `assetMode`: mp3-preview, wav, stems, master, mixed.
- `tierPolicy`: free99-lite, creator, pro-artist, label-command, managed.
- `rightsStatus`: preview-ready, distribution-ready, needs-clearance, blocked.
- `scheduledWindow`: optional release window.

Normal singles should batch aggressively. Emergency releases can deploy immediately if the tier allows it.

## Approval Flow

When a batch is formed:

1. Generate a batch preview.
2. Calculate deploy credits, bandwidth risk, request risk, and tier usage.
3. Send owner/admin email with approve, hold, reject, and inspect links.
4. Store `approvalSentAt`.
5. Set `autoApprovalEligibleAt = approvalSentAt + 72 hours` unless any blocker exists.

Email must include:

- Batch ID.
- Drop count.
- Artists included.
- Drop types included.
- Estimated deploy credits.
- Estimated monthly bandwidth impact.
- File types and total file size.
- Rights state for each drop.
- Tier usage and overage warnings.
- Preview links.
- Approval links.

The first implementation may log email payloads locally if no provider is configured, but the API contract must be ready for a real email provider.

## 72-Hour Approval Brain

The approval brain may auto-approve only safe batches after 72 hours.

Auto-approve allowed when all are true:

- `approvalSentAt` is at least 72 hours old.
- No owner/admin hold exists.
- No rights/takedown/legal blocker exists.
- No WAV, FLAC, stems, masters, or private delivery assets are included.
- Every public audio file is a compressed preview format, preferably MP3/AAC.
- Every drop is inside monthly tier limits.
- Estimated production deploy credits fit the monthly budget reserve.
- Estimated bandwidth impact fits the plan reserve.
- No explicit content, dispute, duplicate title collision, or suspicious upload flag requires manual review.

Manual approval required when any are true:

- WAV upload.
- FLAC upload.
- Stem package.
- Master delivery.
- Private delivery.
- Artist is over monthly limits.
- Rights are incomplete.
- Takedown or dispute exists.
- File size is above tier threshold.
- High-priority paid campaign.
- Admin marks `manualReviewRequired`.

The brain must write a receipt:

```json
{
  "decision": "auto-approved",
  "reason": "72-hour safe batch policy",
  "checks": [],
  "decidedAt": "..."
}
```

## Tier And Upload Policy

The system must protect overhead by making expensive behavior paid or admin-approved.

Baseline tier policy:

```txt
Free99 Lite
  1 artist profile
  1 draft release preview
  1 small proof upload
  1 single drop per month
  MP3/AAC preview only
  no WAV public hosting
  no private delivery
  batched deploy only

Creator
  3 to 5 single drops per month
  1 release drop per month
  MP3/AAC public previews
  WAV only by admin approval
  normal batch priority

Pro Artist
  10 or more drops per month
  release and campaign pages
  WAV uploads allowed within quota
  private delivery allowed
  priority deploy windows

Artist Collective
  multi-artist batching
  album and roster hubs
  custom monthly drop limit
  custom WAV/stem quota
  admin approval workflow

Managed Music Ops
  custom limits
  custom storage/deploy budget
  operator-managed release and private delivery
```

These tier names must reconcile with `data/skyemusicnexus-pricing.json` before implementation. If we add new tier names, update pricing, public copy, smoke tests, and truth files in the same pass.

## File Type Policy

Public streaming:

- Prefer MP3/AAC previews.
- Do not publish WAV/FLAC public streams by default.
- Use loudness-normalized preview exports if transcoding is available.

Private delivery:

- WAV, FLAC, stems, masters, and alternate mixes require SkyGate.
- Static hidden URLs are not private.
- If a file must stay private, it must use one of:
  - existing `music-assets` gated stream route,
  - R2/SkyeVault signed URL,
  - Netlify function/edge gate with token verification,
  - explicit admin-approved public asset exception.

Do not call a static Netlify path private just because the URL is unlisted.

## Stream And Traffic Model

Netlify bills by bytes delivered and requests. MusicNexus analytics counts plays. These are related but not the same.

Traffic formula:

```txt
bandwidth_gb = bytes_delivered / 1024 / 1024 / 1024
bandwidth_credits = bandwidth_gb * 20
request_credits = request_count / 10000 * 2
```

Approximate full-transfer cost per 1,000 plays:

```txt
3 MB preview  = 2.93 GB  = 58.6 credits
5 MB preview  = 4.88 GB  = 97.6 credits
10 MB preview = 9.77 GB  = 195.4 credits
35 MB WAV     = 34.2 GB  = 683.6 credits
50 MB WAV     = 48.8 GB  = 976.6 credits
100 MB WAV    = 97.7 GB  = 1953.1 credits
```

Requests are usually smaller than bandwidth. A play may create HTML, CSS, JS, image, JSON, and audio range requests. Estimate 8 to 15 requests per play unless browser proof says otherwise.

Analytics play definition:

- `page_view`: drop page opened.
- `play_start`: user pressed play or autoplay began after gesture.
- `qualified_stream`: at least 30 seconds or 50 percent of track duration, whichever is smaller.
- `complete_play`: 90 percent or more.
- `download`: download button hit and response began.

Only `qualified_stream` should count toward artist-facing stream metrics. Traffic cost still follows actual bytes delivered.

## Netlify Pro Budget Defaults

For a 3,000 credit Pro budget:

```txt
Reserve for admin/tools/functions: 300 credits
Reserve for emergency deploys: 300 credits
Normal deploy budget: 450 credits for 30 daily deploys
Normal bandwidth budget after reserves: about 97.5 GB
Stretch bandwidth if deploys are light: up to about 140 GB
```

Recommended default:

- Daily normal batch deploy.
- Immediate deploy only for paid priority or admin override.
- Weekly hub regeneration if traffic is low.
- Emergency deploy reserve stays unused unless needed.

Example:

```txt
30 production deploys/month = 450 credits
2,550 credits remain = 127.5 GB bandwidth before requests/compute
```

## Drop Builder Output Rules

The static generator must produce:

- Valid HTML for each drop page.
- `drop.json` with public metadata.
- `catalog.json` for all live drops.
- Artist pages.
- Batch hub page.
- A deploy receipt.
- Asset manifest with byte sizes.
- Estimated credit report.

Public drop pages must include:

- Platform mark.
- Artist.
- Title.
- Cover art.
- Player.
- Download button when allowed.
- Rights-safe public copy.
- Share/social links.
- Link back to MusicNexus.
- `drop.json` link or embedded metadata.
- Telemetry script that reports public play events to a safe endpoint.

Private delivery pages must include:

- SkyGate auth check.
- No public static links to private WAV/stems/masters.
- File list with gated download actions.
- Delivery receipt.
- Expiry or revoke state.
- Client and artist ownership metadata.

## New Backend Surface

Add a new function:

```txt
netlify/functions/music-drops.js
```

Responsibilities:

- Require SkyGate for all write/admin/private actions.
- Allow public telemetry only through a bounded signed drop token.
- CRUD drop drafts.
- Validate tier limits.
- Validate file type limits.
- Validate rights state.
- Queue drops into deploy pool.
- Build batch candidates.
- Send approval notification payloads.
- Record owner/admin approval.
- Run 72-hour approval brain.
- Record deploy receipts.
- Save live URLs back to release and artist records.
- Return traffic and credit estimates.
- Resolve credential availability through `scripts/drop-env-resolve.mjs` without exposing values.
- Call the SkyeWebCreatorMax bridge when a drop-site package must be generated.
- Call the WebGrowthOperator bridge when campaign, SEO, schema, sitemap, or launch metadata is needed.
- Refuse live deploy when `MUSIC_NEXUS_DROPS_ENABLE_LIVE_DEPLOY` is not enabled.

Suggested actions:

```txt
GET  action=list
GET  action=get
GET  action=deploy-pool
GET  action=batch-preview
GET  action=traffic-estimate

POST action=create-drop
POST action=update-drop
POST action=submit-drop
POST action=hold-drop
POST action=reject-drop
POST action=form-batch
POST action=send-approval
POST action=approve-batch
POST action=run-approval-brain
POST action=build-static-bundle
POST action=publish-batch
POST action=track-public-event
POST action=revoke-private-delivery
```

Storage files in proof mode:

```txt
MUSIC_NEXUS_DATA_DIR/drops.json
MUSIC_NEXUS_DATA_DIR/drop-batches.json
MUSIC_NEXUS_DATA_DIR/drop-approvals.json
MUSIC_NEXUS_DATA_DIR/drop-deploys.json
MUSIC_NEXUS_DATA_DIR/drop-traffic.json
```

Production storage can later move to D1/Postgres/Citadel without changing the client contract.

## New Build Scripts

Add scripts for deterministic bundle generation:

```txt
scripts/drop-env-resolve.mjs
scripts/build-drop-site.mjs
scripts/build-drop-webcreator-package.mjs
scripts/build-drop-growth-package.mjs
scripts/render-drop-page.mjs
scripts/render-drop-hub.mjs
scripts/netlify-drop-deploy.mjs
scripts/estimate-drop-credits.mjs
```

Build folder must be outside the app source:

```txt
/tmp/skye-musicnexus-drop-build/<batchId>/
```

Do not commit generated audio bundles to the main repo. The drop deploy pipeline should build an output folder and deploy that folder.

### SkyeWebCreatorMax Bridge

The MusicNexus build script must create a normalized generation request:

```json
{
  "tenantId": "metraiyux-0s",
  "workspaceId": "skyemusicnexus",
  "actorId": "skye_...",
  "name": "Artist - Release Drop",
  "brief": {
    "dropId": "drop_...",
    "dropType": "single_drop",
    "artistName": "Artist",
    "title": "Song Title",
    "story": "Rights-safe public copy",
    "assets": [],
    "tierPolicy": "creator",
    "visibility": "public"
  },
  "pages": ["drop", "artist", "batch-hub"],
  "features": ["audio-player", "download-button", "telemetry", "share-links"]
}
```

Expected output:

```txt
index.html
styles.css
app.js
README.md
drop.json
release.json
campaign.json
artist.json
asset-manifest.json
quality-report.json
```

If the bridge cannot run, the MusicNexus local generator must produce a fallback static package with the same output contract and write a receipt that says `webcreatorBridge: unavailable`.

### WebGrowthOperator Bridge

The MusicNexus build script must create a normalized growth request:

```json
{
  "dropId": "drop_...",
  "dropType": "campaign_drop",
  "artistName": "Artist",
  "releaseTitle": "Release",
  "story": "Approved campaign story",
  "links": {
    "download": "",
    "presave": "",
    "social": []
  },
  "targets": ["public-drop-page", "campaign-page", "batch-hub"],
  "guardrails": ["no-guaranteed-results", "no-dsp-claim", "no-legal-claim"]
}
```

Expected output:

```txt
seo.json
open-graph.json
twitter-card.json
schema.json
sitemap-entry.json
campaign-copy.json
launch-checklist.json
growth-guardrail-report.json
```

Campaign and hub pages must consume this output. Single-drop pages should consume at least title, description, OpenGraph, Twitter card, schema, and sitemap metadata.

## Netlify Deploy Strategy

Use one Netlify site for the drops catalog.

Environment:

```txt
MUSIC_NEXUS_DROPS_NETLIFY_SITE_ID=...
MUSIC_NEXUS_DROPS_NETLIFY_AUTH_TOKEN=...
MUSIC_NEXUS_DROPS_BASE_URL=https://drops.example.com
MUSIC_NEXUS_DROPS_APPROVAL_EMAIL=...
MUSIC_NEXUS_DROPS_MONTHLY_CREDIT_BUDGET=3000
MUSIC_NEXUS_DROPS_MIN_CREDIT_RESERVE=600
```

The resolver may also use the alias groups in `Root Env And Credential Discovery Contract`. The canonical MusicNexus keys should be preferred whenever they are present.

Production deploys:

- Cost 15 credits each.
- Only run after manual approval or approval brain decision.
- Must write deploy receipt.
- Must update live URL records after success.
- Must require `MUSIC_NEXUS_DROPS_ENABLE_LIVE_DEPLOY=1`.
- Must use server-side Netlify credentials only.

Deploy Previews:

- Use for owner/admin review when possible.
- Do not count as production deploys per current Netlify credit docs.
- Must be marked preview only.

Local proof mode:

- Must build the exact static folder that would be deployed.
- Must write `deploy-intent.json` instead of publishing.
- Must prove that Netlify token and site ID are detected only as redacted presence.
- Must never publish from smoke tests.

## Required UI Upgrade

Add a new MusicNexus room:

```txt
public/drops.html
```

Room sections:

- Drop Creator.
- Draft Queue.
- Deploy Pool.
- Batch Builder.
- Approval Inbox.
- 72-Hour Brain.
- Traffic and Credit Meter.
- Live Drops Catalog.
- Private Delivery Vault.

Add links from:

- `public/index.html`
- `public/create.html`
- `public/upload.html`
- `public/releases.html`
- `public/admin.html`

Update `public/neo-nexus.js` with drop client functions, but keep the existing upload/player/release flows intact.

## Pricing Integration

Update `data/skyemusicnexus-pricing.json` to include explicit operational limits:

```json
{
  "drop_limits": {
    "skyemusicnexus-lite-free99": {
      "singleDropsPerMonth": 1,
      "releaseDropsPerMonth": 0,
      "publicPreviewFormats": ["mp3", "aac"],
      "wavUploads": "admin_only",
      "privateDelivery": false,
      "priorityDeploy": false
    }
  }
}
```

Limits must include:

- single drops per month,
- release drops per month,
- campaign drops per month,
- private deliveries per month,
- max public preview size,
- max private file size,
- WAV/FLAC permission,
- stems/masters permission,
- priority deploy permission,
- monthly bandwidth warning threshold,
- monthly deploy warning threshold.

## Security Rules

- All upload, draft, private, approval, deploy, and admin actions require SkyGate.
- Public telemetry can be unauthenticated only if it uses a drop-scoped signed token and rate limits.
- Private delivery static URLs are forbidden unless intentionally public.
- Downloads for private files must be gated or signed.
- Approval links must use expiring tokens.
- Do not store provider tokens in browser code.
- Do not expose Netlify auth tokens to the browser.
- Do not claim DSP distribution, legal review, royalties, or provider publishing unless separately connected and proven.

## Rights Rules

A public drop can only go live when:

- ownership is attested,
- preview use is authorized,
- takedown hold is false,
- no manual rights hold exists.

A release/campaign drop that implies distribution can only go live when:

- ownership is attested,
- preview use is authorized,
- distribution authorization is true,
- samples/interpolations are cleared or marked not present,
- cover/mechanical and publisher clearance are handled or marked not needed.

Private delivery may be created before public distribution rights if it is explicitly a private handoff, but access must be gated.

## Traffic Controls

The player should support:

- preview quality selection,
- download allowed flag,
- private gated download flag,
- max public preview size by tier,
- max private delivery size by tier,
- stream telemetry,
- download telemetry,
- monthly bandwidth estimate.

The admin room should show:

- estimated Netlify credits used this month,
- deploy count,
- GB delivered estimate,
- plays by drop,
- downloads by drop,
- top bandwidth risk drops,
- drops near tier overage,
- emergency deploy reserve.

## Build Phases

### Phase 0 - Build Wiring And Credential Safety

- Add `scripts/drop-env-resolve.mjs`.
- Add redacted env inventory proof.
- Add SkyeWebCreatorMax bridge adapter.
- Add WebGrowthOperator bridge adapter.
- Add local fallback static package contract when either bridge is unavailable.
- Add live deploy kill switch with `MUSIC_NEXUS_DROPS_ENABLE_LIVE_DEPLOY=1`.
- Add proof that no secret values are written to logs, browser output, receipts, or test artifacts.

### Phase 1 - Data Model And Directive Compliance

- Add `music-drops.js`.
- Add proof-mode JSON stores.
- Add drop schema validation.
- Add tier policy loader from pricing JSON.
- Add drop CRUD and lifecycle actions.
- Add smoke tests for gated access and policy enforcement.

### Phase 2 - Drop UI

- Add `public/drops.html`.
- Add client wiring in `neo-nexus.js`.
- Add drop queue, deploy pool, batch builder, approval inbox, and credit meter.
- Add smoke tests for static markers.

### Phase 3 - Static Generator

- Add drop site templates.
- Generate single, release, campaign, private, artist, and hub pages.
- Generate SkyeWebCreatorMax package requests.
- Generate WebGrowthOperator campaign/SEO metadata requests.
- Generate catalog and receipts.
- Add local build proof.

### Phase 4 - Approval Brain

- Add approval email payload generation.
- Add manual approve/hold/reject actions.
- Add 72-hour auto-approval decision logic.
- Add proof tests for safe and blocked batches.

### Phase 5 - Netlify Deploy Integration

- Add Netlify API deploy script/function.
- Add redacted root env alias resolution for Netlify token and site ID.
- Use preview deploys for review when configured.
- Use production deploy only after approval.
- Keep production deploy disabled unless `MUSIC_NEXUS_DROPS_ENABLE_LIVE_DEPLOY=1`.
- Save live URLs and deploy receipts.
- Add browser E2E proof against local/stubbed deploy mode.

### Phase 6 - Private Delivery Gate

- Add private delivery flow.
- Gate private files through SkyGate or signed URLs.
- Add expiration/revoke.
- Prove that static private URLs are not exposed.

### Phase 7 - Traffic Accounting

- Add public drop telemetry endpoint.
- Add qualified stream rules.
- Add download accounting.
- Add Netlify credit estimator.
- Add admin traffic service-health view.

## Proof Requirements

Before this upgrade is called done:

- `npm run 0s:skyemusicnexus:smoke` passes.
- `npm run 0s:skyemusicnexus:e2e` passes or is extended with the new drop path.
- New smoke proves:
  - root env aliases are detected with values redacted,
  - no secret values appear in logs or proof artifacts,
  - gated drop writes,
  - tier limits,
  - WAV blocked for Free99,
  - SkyeWebCreatorMax bridge or fallback package produces the required artifact contract,
  - WebGrowthOperator bridge or fallback package produces SEO/campaign metadata,
  - safe batch eligible after 72 hours,
  - unsafe batch blocked from auto-approval,
  - live deploy is blocked without `MUSIC_NEXUS_DROPS_ENABLE_LIVE_DEPLOY=1`,
  - deploy receipt writeback,
  - private delivery gate.
- New browser E2E proves:
  - artist uploads or selects audio,
  - creates single drop,
  - queues drop,
  - batch forms,
  - admin approves,
  - static pages are generated,
  - live URL is written back,
  - public player starts,
  - telemetry records qualified stream,
  - private delivery requires SkyGate.
- Re-run:
  - `npm run mcp:mine -- metraiyux_0s_site/SkyeMusicNexus`

## Do Not Do

- Do not create one Netlify site per song.
- Do not deploy every normal single immediately if it can safely batch.
- Do not call unlisted static files private.
- Do not allow Free99 WAV public hosting by default.
- Do not allow private delivery without SkyGate or signed access.
- Do not store Netlify tokens in browser code.
- Do not remove existing Upload Studio, Player, Rights, Release Forge, Feed, Exchange, or DAW flows.
- Do not claim live distributor, DSP, royalty, payment movement, formal legal review, or DMCA-agent services from this drop system alone.
- Do not copy the full SkyeWebCreatorMax or WebGrowthOperator apps into MusicNexus.
- Do not keep unpacked donor files unless a specific file is imported, adapted, and referenced.
- Do not print or persist auth token, email token, SkyGate key, R2 secret, SMTP password, or Netlify token values.
- Do not allow smoke tests to publish a production Netlify deploy.

## Implementation North Star

The first production-worthy version should feel simple:

1. Artist signs in.
2. Artist uploads or selects a track.
3. Artist creates a drop.
4. MusicNexus checks tier, rights, file size, and format.
5. Drop enters deploy pool.
6. Batch forms with other compatible drops.
7. Owner gets email.
8. Owner approves, or the approval brain approves safe stale batches after 72 hours.
9. SkyeWebCreatorMax generates the drop-site package or MusicNexus uses the fallback generator.
10. WebGrowthOperator generates campaign, SEO, schema, and launch metadata where needed.
11. Netlify publishes one production deploy with many drops.
12. MusicNexus saves each live URL to the correct artist, release, campaign, and hub.
13. Public streams and downloads are tracked against traffic and tier budgets.
