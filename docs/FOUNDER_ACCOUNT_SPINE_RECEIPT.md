# Founder Account Spine Receipt

Generated: 2026-05-30

## Plain Answer

Yes, the founder account work has already been started in this repo.

The normal owner/founder account is not supposed to be a different password in every app. The repo policy is one shared 0S/FS27/SkyGate/Free99 owner gate session. Apps mounted into the 0S should trust that session through the Worker and shared auth helpers, then derive owner/founder authority from the gate identity.

## Current Owner Identity

The main Worker defines the owner/admin identity as:

- issuer: `metraiyux-0s-owner-admin`
- token prefix: `0s-owner`
- subject: `metraiyux-owner-admin`
- role: `owner`
- workspace: `metraiyux-0s`
- workspace role: `owner`
- scopes include: `admin.read`, `admin.write`, `keys.write`, `gateway.invoke`, `mcp.invoke`, `0s.owner`

Owner login is handled by `/api/owner/admin-login` and the shared login UI at `/admin/login.html`. The UI stores the returned shared gate session under the existing 0S session keys so downstream owner/admin surfaces can forward the same bearer.

## Founder Command Account Layer

Founder Command has a separate account/crosswalk layer that maps client/founder/business records across apps and work systems. The active routes include:

- `/api/founder-command/accounts`
- `/api/founder-command/accounts/upsert`
- `/api/founder-command/accounts/backfill`
- `/api/founder-command/crosswalk/sources`
- `/api/founder-command/identity/resolve`
- `/api/founder-command/identity/link`

That means there are two layers:

- Gate identity: who the owner/founder is.
- Crosswalk identity: how app/business/client records map back to that owner/founder lane.

## Fresh Proof

Local crosswalk proof passed:

- receipt: `test-artifacts/founder-command-accounts-crosswalk/founder-command-accounts-crosswalk-smoke-stress-latest.json`
- unauthenticated account read: `401`
- gated account read: `200`
- accounts: `339`
- AE work orders: `339`
- SkyEmail ready records: `339`
- source businesses: `339`
- stress: `80` requests, all green

Live identity-spine proof passed:

- receipt: `test-artifacts/founder-command-identity-spine/founder-command-identity-spine-live-http-latest.json`
- stamped receipt: `test-artifacts/founder-command-identity-spine/2026-05-30T05-03-26-774Z/receipt.json`
- durable accounts: `370`
- durable identity links: `705`
- work-system identity links: `708`
- stress: `18` requests, all green
- systems linked and resolved: `saas`, `skymail`, `routex`, `skyepay`, `skynet`, `musicnexus`, `sovereigndocs`, `skyecommerce`, `relay13`, `client_app_factory`, `jobping`

## What This Means

The vault daemon can keep pushing repo custody because an owner gate lane exists. The missing product clarity was not that the repo had no founder identity at all; the missing clarity was that this identity spine needed to be treated as the visible prerequisite for vault, drive, app, and founder-command operations.

No new app-specific founder passwords should be added. New apps must mount into the shared gate lane and prove they accept the shared owner session.

