# Skyegate FS27 Auth Bridge

Updated: 2026-05-30

## What Changed

MetrAIyux 0S treats Skyegate FS27 as the upstream auth and tracking gate for the admin command layer.

Legacy Worker `ADMIN_TOKEN`, Free99 admin codes, and app-specific admin codes are not standalone authority. If a legacy code is accepted at all, the 0S Worker must exchange it through the shared FS27/SkyGate lane and then authorize the returned active gate session. If FS27 is not configured, protected owner/admin routes fail closed.

A Skyegate bearer token unlocks admin APIs only when FS27 `/auth-introspect` returns an active admin, owner, founder, `admin.read`, `admin.write`, `keys.write`, `gateway.invoke`, or allowed-email identity.

## MetrAIyux Endpoints

- `POST /api/admin/auth/introspect`
  - Validates the current browser token against the admin Worker.
  - Accepts active Skyegate admin-scoped bearer tokens. Legacy local admin tokens must not be treated as the final authority.

- `POST /api/skygate/auth-introspect`
  - Full-system Worker bridge to FS27 `/auth-introspect`.
  - Useful for browser-side status checks.

- `POST /api/skygate/platform-event`
  - Validates the bearer token, then mirrors a platform event into FS27 `/platform/events`.
  - The browser never receives the mirror secret.

## Worker Vars And Secrets

Set these on the full-system Worker and admin automation Worker:

- `SKYGATEFS27_ORIGIN`
  - Current target: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev`

- `SKYGATE_SOURCE_APP`
  - Current value: `metraiyux-0s`

- `SKYGATE_EVENT_MIRROR_SECRET`
  - Secret only. Do not place it in public JS or static HTML.

Optional:

- `SKYGATE_ADMIN_EMAILS`
  - Comma-separated fallback allowlist if a valid FS27 token does not carry an admin role or admin scope.

- `ZERO_OS_DEV_LOCAL_GATE_FALLBACK`
  - Local development only. Allows the old shared-code fallback for isolated syntax/dev smoke work when FS27 is unavailable. Do not enable in production.

## Admin Browser Flow

The admin pages now load `admin/skygate-auth-bridge.js`.

When the operator pastes a token:

1. The browser calls `/api/admin/auth/introspect`.
2. The Worker calls FS27 `/auth-introspect`.
3. If FS27 returns an admin-scoped active token, the token is stored in `sessionStorage` for that browser session.
4. Admin commands, approval decisions, and selected events are mirrored to FS27 when the mirror secret is configured.

## Live Routes

- Admin auth bridge: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/admin/auth/introspect`
- Browser-safe event mirror: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skygate/platform-event`
- FS27 authority: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/auth-introspect`
- Live Netlify function fallback: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/.netlify/functions/auth-introspect`
- FS27 event ingest: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/platform/events`

## FS27 Dossier

FS27 now has a consumer dossier for this site:

- `/workspaces/MetrAIyux-0S/SkyeGateFS27/docs/integration-dossiers/metraiyux-0s.md`
- `/workspaces/MetrAIyux-0S/SkyeGateFS27/docs/integration-dossiers/metraiyux-0s.json`
