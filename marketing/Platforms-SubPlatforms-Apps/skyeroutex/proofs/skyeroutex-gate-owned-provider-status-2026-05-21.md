# SkyeRouteX Gate-Owned Provider Status

Checked: 2026-05-21
Production Worker version: `e424351a-ce8e-4769-a477-3c58f1314e15`
Production app: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeRouteX/workforce-command-v0.4.0/public/`

## Architecture Fix

- RouteX notification rows now use `0s-gate-notification-ledger`, not an app-owned in-app ledger.
- Twilio readiness now means the sender/provider account is configured. Recipients are resolved from gate-owned user profiles and only send when a profile has `phone` plus `sms_opt_in`.
- Gate-staged users can now carry `phone`, `sms_opt_in`, and shared SkyGate identity fields without creating app-local passwords.
- RouteX audit/runtime events now mirror through the shared SkyGate platform event lane using `0s-skygate-platform-events`.
- Compliance fallback labels now point at the gate-owned compliance ledger instead of implying a separate RouteX auth/compliance lane.

## Twilio Number Rule

- `TWILIO_FROM_NUMBER` should be the platform sender number: the business sender, Twilio Messaging Service sender, or a tenant-verified sender.
- `TWILIO_DEFAULT_TO` is not for real users. It is only a dev/proof fallback and should not be treated as the production recipient.
- Production recipients must come from the gate user profile: contractor/provider/customer phone plus SMS consent.

## Proofs

- Local mounted stress proof: `/workspaces/MetrAIyux-0S/test-artifacts/skyeroutex-mounted-worker-stress-2026-05-21T13-44-34-967Z/report.json`
- Live headed browser proof: `/workspaces/MetrAIyux-0S/test-artifacts/skyeroutex-live-production-stress-2026-05-21T13-52-00-104Z/live-headed-browser-report.json`
- Desktop app screenshot: `/workspaces/MetrAIyux-0S/test-artifacts/skyeroutex-live-production-stress-2026-05-21T13-52-00-104Z/desktop-routex-app-after-owner-login.png`
- Desktop integrations screenshot: `/workspaces/MetrAIyux-0S/test-artifacts/skyeroutex-live-production-stress-2026-05-21T13-52-00-104Z/desktop-routex-live-integrations-json.png`
- Mobile screenshot: `/workspaces/MetrAIyux-0S/test-artifacts/skyeroutex-live-production-stress-2026-05-21T13-52-00-104Z/mobile-routex-app-after-owner-login.png`

## Verified Live Path

- Unauthenticated app request redirected to shared owner login.
- Owner login issued a shared Free99/SkyGate session.
- App-local signup stayed disabled under shared gate.
- Owner staged provider and contractor profiles through `/api/routex/admin/gate-users`.
- Job creation called live Mapbox route intelligence and live Stripe payment provider.
- House Command assigned a staged gate-owned contractor.
- Route, stops, proof upload, approval, dispute resolution, freeze, manual compliance proof, job export, market report, storage status, integrations status, and outbox status all executed in production.
- Desktop and mobile headed browser checks passed with no material console errors, failed network requests, or HTTP errors.

## Still Not Done

- No real live SMS was sent because no opted-in real contractor phone was provided through `SKYEROUTEX_LIVE_SMS_TO`, `LIVE_SMS_TO`, or `TWILIO_LIVE_TEST_TO`.
- Background checks are still on the gate-owned compliance ledger in production because `CHECKR_API_KEY`, `CERTN_API_KEY`, or a background webhook endpoint is not configured for this Worker.
- Real money movement remains provider-dispatched/ledgered through Stripe test/proof flow unless the production Stripe account and business settlement rules are explicitly confirmed.
