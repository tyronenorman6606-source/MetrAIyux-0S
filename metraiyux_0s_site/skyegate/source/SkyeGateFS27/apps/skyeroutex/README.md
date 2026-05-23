# SkyeRouteX Gate Folder

This folder is the FS27/SkyGate record for SkyeRouteX Workforce Command.

SkyeRouteX does not own a separate customer, founder, admin, or client password lane when mounted inside the 0S. The 0S gate owns the session. RouteX is a Free99 platform surface in the Skye CIP / Skyeknowlogy lane: FS27/SkyGate access is the access product, and RouteX only stores app-specific profile metadata after the gate has authorized the actor.

## Live Surfaces

- Gate dashboard: `/apps/skyeroutex/`
- Auth map: `/apps/skyeroutex/auth-map.json`
- RouteX mirror receipts: `/admin/platform-routex-events`
- 0S mounted app: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeRouteX/workforce-command-v0.4.0/public/`
- 0S readiness dashboard: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeRouteX/workforce-command-v0.4.0/public/gate-readiness.html`
- 0S readiness API: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/routex/gate-dashboard`

## Gate-Owned Auth

Accepted session inputs:

- `Authorization: Bearer <gate session>`
- `x-admin-token`
- `x-free99-admin-code`
- `x-free99-gate-session`
- `x-skye-gate-session`
- `x-skygate-session`
- supported gate cookies
- `/api/owner/admin-login`

RouteX owner/admin routes must keep using `requireGateAuth`, `requireOperatorAuth`, and shared owner-admin session helpers. Do not add a RouteX-local password.

## What Needs Onboarding

- External SMS requires Twilio sender credentials plus a gate user phone and `sms_opt_in`.
- External background checks require Checkr, Certn, or a signed background-check webhook.
- Durable media/export storage requires R2 or S3 credentials.
- Live maps/ETA require Mapbox credentials.
- Real payment movement requires confirmed Stripe/SkyPay settlement rules.

Without those pieces, the app must show the feature as ledger-only or partial instead of pretending it is fully active.
