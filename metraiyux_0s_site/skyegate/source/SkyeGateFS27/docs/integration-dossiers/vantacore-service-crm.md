# SkyeGateFS27 Integration Dossier: vantacore-service-crm

- Generated: `2026-05-19T22:45:00Z`
- App path: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/_platform-sources/vanta-core-mvp-master`
- Gate env var: `SKYGATEFS27_ORIGIN`

## Summary

- VantaCore is mounted as a service-business CRM lane owned by MetrAIyux 0S and SkyeGateFS27.
- FS27 now exposes the actual workspace at `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/vantacore-crm` with persisted `/api/vantacore/crm` routes.
- The package passed local build, preflight, smoke, browser, and stress proof after the ownership hardening pass.
- The existing `https://vantacore.graylondonskyes.workers.dev/` surface is Cloudflare Access protected.

## Gate Requirements

- Route primary identity through SkyeGateFS27 `/auth/*`, `/oauth/*`, and `/.well-known/*` where the deployed runtime supports it.
- Use the FS27-owned CRM workspace for current lead capture, pipeline, bookings, follow-ups, reviews, summary, and activity operations.
- Mirror VantaCore proof, provider activation, customer workspace activation, and admin decisions into FS27 through `/platform/events` with `source_app: vantacore-service-crm`.
- Keep provider credentials, tenant authority, payment posture, telephony, email, calendar, storage, and VANTA13 model credentials server-side or operator-only.

## Public Boundary

- Say VantaCore is a controlled service CRM lane with a real FS27 workspace for lead firewall, booking, follow-up, review, revenue intelligence, and customer workspace packaging.
- Do not claim live customer tenancy, live Twilio/Resend/Stripe/calendar/storage operation, or deployed Next runtime proof until provider choices are configured and proven.
