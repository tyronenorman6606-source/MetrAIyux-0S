# NorthStar + Valley Verified + 0S Integration Report

Date: 2026-05-19  
Project root: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/_platform-sources/glendale-northstar-valley-verified-v6-final`

> Status update, later on 2026-05-19: this original scan report is now historically outdated in one important way.  
> NorthStar **has since been integrated live** into the shared 0S/FS27 lane:
> - mounted app route: `/northstar/`
> - mounted API base: `/api/northstar`
> - 11 Valley business overrides now live and routing into workspace-specific NorthStar handoffs
> - 11 gate-owned workspaces provisioned in the primary shared DB lane
> - live proof receipts:
>   - `integration/NORTHSTAR_0S_LIVE_READINESS_2026-05-19.json`
>   - `integration/NORTHSTAR_0S_WORKSPACE_PROVISIONING_2026-05-19.secret.json`
>   - `integration/NORTHSTAR_0S_LIVE_PROOF_2026-05-19.json`

## Executive summary

This zip is a real project, not just a pile of static pages.

It contains:
- one **public Valley-style front door**
- eleven **company landing pages**
- eleven **guest guide / blog pages**
- one shared **NorthStar SignInPro** multi-tenant app under `northstar/`
- Netlify functions for auth, provisioning, session handling, workspace sync, audit, and backups

The architecture is already pointed in the direction you want:
- each company gets a **full landing**
- that landing routes into a **shared SignInPro app**
- the app uses a **workspace slug** to open the correct company workspace

The project is **not yet integrated into the current live 0S/gate database lane**, and the eleven NorthStar companies are **not yet mounted into Valley Verified**.

That means the right move is:
1. keep the **shared NorthStar app** model
2. mount it into the 0S as a real platform
3. create/override the Valley Verified business pages for the eleven companies using these landing pages
4. wire ownership, auth, rate limiting, and event mirroring through FS27

## What this project actually is

### Public side

At the project root:
- `index.html` is the directory/front door
- `clients/<slug>/index.html` is the client landing page
- `clients/<slug>/blog.html` is the client guest-guide / content page
- `arrival/index.html` is a handoff entry point

These public pages route into:
- `/northstar/index.html?workspace=<slug>`

### App side

Under `northstar/`:
- shared multi-tenant app shell
- Neon-backed Netlify functions
- login/session/csrf handling
- seeded workspace provisioning
- per-workspace state
- per-workspace settings
- per-workspace attendees
- audit logs
- backups

This is **one central SignInPro/NorthStar platform**, not eleven separate apps.

That is the correct shape for bringing it into the 0S.

## What it is not

It is **not**:
- already mounted into the current 0S live DB
- already registered into Valley Verified
- already running through FS27 customer ownership and usage/rate-limit accounting
- already replacing generated Valley business pages for those eleven companies

## Deep-scan findings

### 1. Shared app model is already correct

Internal handoff docs explicitly say:
- clients do **not** receive separate apps
- they receive **branded workspaces inside one central app**

That matches your goal for a full platform inside the 0S.

### 2. Workspace provisioning exists already

NorthStar already has:
- `operator-provision`
- `operator-workspaces`
- `workspace-users`
- `workspace-settings`
- `workspace-sync`
- `workspace-backups`
- `workspace-audit`

That means the application logic is already shaped like a real platform.

### 3. Auth/session model exists already

NorthStar already handles:
- workspace-scoped login
- signed session cookies
- password hashing
- login attempt throttling
- session validation
- CSRF

### 4. The live 0S DB lane does not have NorthStar tables yet

Using the root env lane, I verified that the current live DB does **not** contain the NorthStar workspace tables:
- `workspaces`
- `workspace_users`
- `workspace_settings`
- `workspace_states`
- `attendees`
- `workspace_audit_events`
- `workspace_login_attempts`
- `workspace_invites`
- `workspace_backups`

So NorthStar is **not yet mounted into the primary shared DB**.

### 5. FS27 already has the ownership/gate pieces we need

The current live FS27 lane already has:
- `customers`
- `users`
- `user_passwords`
- `user_sessions`
- `api_keys`
- `usage_events`
- `rate_limit_windows`
- `rate_limit_scoped_windows`
- `audit_events`

It also already supports:
- `communication_email`
- `skyemail`
- password reset requirements
- platform event mirroring via `/platform/events`
- gated Free99 behavior patterns

So we do **not** need to invent a whole second ownership system.  
We should plug NorthStar into the one that already exists.

### 6. Valley Verified override pattern already exists

Valley already has a real-app override lane:
- custom business pages
- app-build lane
- mounted-in-0S routing
- existing examples like Bob's and Empire

There is also evidence that the Valley pipeline already knows how to **skip generated fallback pages when a real custom page exists**.

That is exactly the behavior needed here.

### 7. The eleven NorthStar clients are not currently in Valley

I checked the Valley source for the actual business names and slugs in this project.

Result: **no hits** for these companies in the current Valley source:
- Chicken N Pickle
- As You Wish Pottery
- Stir Crazy
- Escape Westgate
- Dave & Buster’s
- PopStroke
- Westgate
- The Wigwam
- State Farm Stadium
- TheaterWorks
- Goodyear Ballpark

So this is not a “swap the link on an existing Valley record” task.  
This is a **create and mount** task.

## The eleven companies in this project

| Workspace slug | Company | Official site | Phone | Address | Proposed Valley route |
|---|---|---|---|---|---|
| `chicken-n-pickle-westgate` | Chicken N Pickle | `https://chickennpickle.com` | `(623) 352-8950` | `9330 W Hanna Ln, Glendale, AZ 85305` | `/valley-verified/business/chicken-n-pickle-westgate/` |
| `as-you-wish-pottery-westgate` | As You Wish Pottery | `https://www.asyouwishpottery.com` | `(623) 772-5403` | `9410 W Hanna Ln, Suite A109, Glendale, AZ 85305` | `/valley-verified/business/as-you-wish-pottery-westgate/` |
| `stir-crazy-comedy-club` | Stir Crazy | `https://www.stircrazycomedyclub.com` | `(623) 565-8667` | `6751 N Sunset Blvd, Suite E206, Glendale, AZ 85305` | `/valley-verified/business/stir-crazy-comedy-club/` |
| `escape-westgate` | Escape Westgate | `https://www.escapewestgate.com` | `(623) 282-1979` | `6751 N Sunset Blvd, Suite E108, Glendale, AZ 85305` | `/valley-verified/business/escape-westgate/` |
| `dave-and-busters-westgate` | Dave & Buster’s | `https://www.daveandbusters.com` | `(623) 759-7800` | `9460 W Hanna Ln, Glendale, AZ 85305` | `/valley-verified/business/dave-and-busters-westgate/` |
| `popstroke-westgate` | PopStroke | `https://popstroke.com` | `(623) 323-0002` | `9480 W Hanna Ln, Glendale, AZ 85305` | `/valley-verified/business/popstroke-westgate/` |
| `westgate-entertainment-district` | Westgate | `https://westgateaz.com/` | _blank in source_ | `6770 N. Sunrise Blvd. Glendale, AZ 85305` | `/valley-verified/business/westgate-entertainment-district/` |
| `the-wigwam-resort` | The Wigwam | `https://www.wigwamarizona.com/` | _blank in source_ | `Litchfield Park, Arizona` | `/valley-verified/business/the-wigwam-resort/` |
| `state-farm-stadium` | State Farm Stadium | `https://www.statefarmstadium.com/` | `(623) 433-7101` | `1 Cardinals Drive, Glendale, Arizona 85305` | `/valley-verified/business/state-farm-stadium/` |
| `theaterworks-peoria` | TheaterWorks | `https://theaterworks.org/` | _blank in source_ | `10580 N 83rd Dr, Peoria, AZ 85345` | `/valley-verified/business/theaterworks-peoria/` |
| `goodyear-ballpark` | Goodyear Ballpark | `https://goodyearbp.com/` | _blank in source_ | `1933 S. Ballpark Way, Goodyear, AZ 85338` | `/valley-verified/business/goodyear-ballpark/` |

## Recommended target architecture

## A. Keep one shared platform inside the 0S

NorthStar should become a **single mounted platform lane inside the 0S**, not eleven independent apps.

Target idea:
- public landings stay under Valley / Valley-connected pages
- workspace handoff enters a shared SignInPro/NorthStar lane
- workspace slug determines which tenant the user lands in

This preserves:
- the platform model
- shared auth
- shared backup/audit/state logic
- easier gate ownership
- easier rate limiting
- easier support

## B. Replace generated Valley pages with the real landings

For these eleven companies, Valley should **not generate fallback directory pages**.

Instead:
- each Valley business card should route to a real custom business page
- that page should be built from the NorthStar landing content
- that page should then route up into the shared workspace app

In other words:

Valley card -> custom Valley business page -> NorthStar workspace

Not:

Valley card -> thin generated page

## C. Make NorthStar a gate-owned Free99 platform

NorthStar is free to the user, but it still needs to be:
- gate-owned
- session protected
- usage metered
- rate limited
- auditable

That means:
- no public anonymous “real workspace” access without a gate/session path
- Free99 means **price = 0**, not **unowned**

This should follow the same pattern FS27 already uses for gated free platforms.

## Database and ownership work required

## 1. Add NorthStar workspace schema to the primary live DB lane

NorthStar’s schema needs to be added into the current primary DB lane used by the 0S/FS27 stack.

Required tables from `northstar/database/schema.sql`:
- `workspaces`
- `workspace_users`
- `workspace_settings`
- `workspace_states`
- `attendees`
- `workspace_audit_events`
- `workspace_login_attempts`
- `workspace_invites`
- `workspace_backups`

### Important hardening note

The schema enables RLS, but the app code currently appears to rely mostly on **app-layer workspace scoping** and does not obviously set `app.current_workspace_id` into the DB session.

So before calling this production-hardened, we should either:
- explicitly set `app.current_workspace_id` on every scoped DB transaction, or
- treat RLS as incomplete and keep app-layer scoping only until we finish the DB-session binding

That is a real security implementation task, not a cosmetic one.

## 2. Register customer ownership in FS27

Each real venue/workspace should have:
- a `customers` row in FS27
- one or more `users` rows in FS27
- password/session state managed through the existing user tables

Recommended ownership mapping:
- one `customers` row per company/workspace
- one primary owner user
- optional additional workspace operators/users
- `communication_email` and `skyemail` supported through the existing columns

## 3. Keep SignInPro free, but meter it

Recommended gate shape:
- `platform_id = 'signinpro-northstar'`
- `usage_lane = 'workspace'` or split lanes like:
  - `workspace-auth`
  - `workspace-sync`
  - `workspace-admin`
  - `workspace-backup`

Recommended behavior:
- billable = `false` by default
- still write `usage_events`
- still apply `rate_limit_scoped_windows`
- still mirror operational events into `audit_events`

That gives us:
- abuse control
- operator visibility
- tenant supportability
- future path to paid lanes if needed

## 4. Mirror important NorthStar events into FS27

NorthStar should use the existing `/platform/events` mirror path.

Mirror at least:
- workspace provisioned
- owner invited / owner activated
- user created
- login success / login blocked
- password reset requested / completed
- workspace settings updated
- attendee sync saved
- backup created
- privileged admin actions

Suggested `source_app`:
- `signinpro-northstar`

Suggested identifiers in payload:
- `workspace_id`
- `workspace_slug`
- `customer_id`
- `user_id`
- `actor_email`
- `billable`
- `privileged`

## Valley Verified integration work required

## 1. Create real business pages for the eleven companies

Each of the eleven companies needs:
- a real custom business page under `metraiyux_0s_site/valley-verified/business/<slug>/index.html`
- route text and metadata tied to the real company
- Valley card routing into that custom page

## 2. Use the NorthStar landing as the Valley business page base

Do not regenerate a thin page.

Use:
- `clients/<slug>/index.html`
- `clients/<slug>/blog.html`

as the seed for:
- Valley business landing
- Valley guest-guide / supporting content

## 3. Mark them as custom-page overrides so fallback generation is skipped

This should follow the pattern Valley already uses when a custom page exists.

The generator should treat these companies as:
- custom landing exists
- generated fallback should be skipped

## 4. Link the real landing into the shared app

Each Valley page should hand off to:
- `/northstar/index.html?workspace=<slug>`

That preserves:
- full landing first
- actual workspace second

## 5. Surface NorthStar in the app-build / proof lane

These should also be candidates for:
- Valley app-build lane
- proof lane / “real business app” references

But because they are all one shared platform, they should be grouped as:
- one platform
- many branded workspaces

Not treated like eleven separate product stacks.

## End-to-end implementation sequence

## Phase 1 — platform preparation

1. add NorthStar workspace schema to the main live DB
2. harden workspace scoping / RLS session binding
3. adapt NorthStar auth to use the live 0S environment conventions
4. wire NorthStar event mirror into FS27 `/platform/events`
5. define `platform_id = signinpro-northstar`

## Phase 2 — ownership and gating

1. create `customers` rows for the eleven venues
2. create owner `users`
3. set password reset / onboarding flow through existing FS27 user auth
4. create rate-limit policy for NorthStar Free99 lane
5. verify login/reset/session notifications against owner emails

## Phase 3 — Valley business replacement

1. create the eleven custom Valley business routes
2. import/adapt each landing into Valley business pages
3. add guest-guide pages where useful
4. mark them as “custom page exists / skip generated fallback”
5. rebuild Valley indexes / manifests / search layers

## Phase 4 — workspace handoff

1. wire each Valley business page CTA into `/northstar/index.html?workspace=<slug>`
2. verify branded workspace loads correctly
3. verify owner login and password reset
4. verify public-to-workspace flow
5. verify audit and usage events appear in FS27

## Phase 5 — live readiness

1. validate rate limiting
2. validate abuse behavior
3. validate event mirroring
4. validate reset emails / notifications
5. update live URL registry and deployment ledger once deployed

## What I would not do

I would **not**:
- split NorthStar into eleven separate apps
- leave the eleven venues on generated Valley pages
- run NorthStar against a separate hidden DB forever if the goal is platform ownership inside 0S
- call the RLS story “done” until session-bound workspace scoping is explicit
- treat Free99 as “ungated”

## Immediate next build tasks

If we continue from here, the next concrete implementation tasks are:

1. create a DB migration plan for importing `northstar/database/schema.sql` into the live FS27 lane
2. create a `signinpro-northstar` gate/usage policy
3. create the eleven Valley business page directories and mount them as custom overrides
4. map each landing CTA into the shared NorthStar workspace route
5. provision owner/customer rows for the eleven venues through the existing FS27 customer/user system

## Bottom line

This project is worth bringing in.

The right shape is:
- **one SignInPro/NorthStar platform inside the 0S**
- **eleven real Valley landing pages instead of generated placeholders**
- **shared gate ownership, resets, rate limits, and event mirroring through FS27**

That gets you:
- a stronger public Valley experience
- a real shared workspace product
- controlled Free99 access
- owned customer records
- a path to scale this without splitting your stack apart

## Artifacts created during this scan

I created these working artifacts inside the unpacked project so the next integration work stays attached to the source package:

- `NORTHSTAR_VALLEY_CLIENT_MANIFEST_2026-05-19.json`
  - machine-readable list of the 11 clients, their official sites, contact/location details, and proposed Valley routes

- `integration/NORTHSTAR_0S_LIVE_READINESS_2026-05-19.json`
  - live-readiness proof against the current root env DB and the current Valley mount
  - current result:
    - FS27 ownership/rate-limit tables are present
    - NorthStar workspace tables are **not** live yet
    - custom Valley pages for these 11 clients are **not** live yet

- `scripts/check-0s-live-readiness.mjs`
  - rerunnable readiness checker using the root `DATABASE_URL`

- `valley-verified-override-staging/`
  - a self-contained staging bundle of the 11 replacement Valley business pages
  - each staged page now:
    - uses shared local assets from `_shared/`
    - points back to `/valley-verified/`
    - routes into `/northstar/index.html?workspace=<slug>`
    - carries indexable metadata instead of `noindex`

- `scripts/generate-valley-override-staging.mjs`
  - rerunnable generator for the staged Valley override bundle
