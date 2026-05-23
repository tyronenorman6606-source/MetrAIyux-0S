# FS27 Contact Ecology Live Proof

Date: 2026-05-20

## What Changed

The public contact/review/service flow is now one FS27-owned ecology instead of disconnected email links.

- Public service requests enter `POST https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/api/contact/intake`.
- Reviews enter the same intake lane as `kind=review` and stay `pending_0s_qa` until admin approval.
- Service/contact/support/partnership requests stay private as `pending_admin_triage`.
- The FS27 admin queue lives at `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/contact-intake-admin`.
- Skyes Over London public service request page lives at `https://skyes-over-london-reviews.pages.dev/request-service.html`.
- The fallback `mailto:skyesoverlondon@gmail.com` remains available only when the owned intake lane fails.

## Ownership Boundary

FS27 owns the intake record, gate auth, admin actions, and delivery receipts. 0S owns the security/orchestration lane and is wired into the Gate. Relay13 is first-party infrastructure, so contact intake now hands off through the 0S Worker service binding into the Relay13/ConnectLog workspace instead of waiting on an external provider key. The public review wall is only a publication surface after approval. Email is backup notification, not the source of truth.

Current live proof reports `relay_status: sent` with `relay_receipt.mode: relay13_0s_service_binding`, `route: 0s_service_binding`, `bridge: connectlog`, `workspace: connectlog-main`, and Relay13 status `201`. Production inter-worker delivery no longer attempts the public 0S HTTP URL when the 0S service binding is present. Resend backup is live and returned `sent`.

## Live Proof

Artifacts:

- `test-artifacts/contact-ecology-2026-05-20/live-api-proof.json`
- `test-artifacts/contact-ecology-2026-05-20/live-write-proof.json`
- `test-artifacts/contact-ecology-2026-05-20/live-triage-proof.json`
- `test-artifacts/contact-ecology-2026-05-20/browser-proof.json`
- `test-artifacts/contact-ecology-2026-05-20/postdeploy-read-stress.json`
- `test-artifacts/contact-ecology-2026-05-20/owned-0s-service-binding-final-proof.json`
- `test-artifacts/contact-ecology-2026-05-20/internal-route-only-proof.json`
- `test-artifacts/contact-ecology-2026-05-20/live-doc-copy-proof.json`
- `test-artifacts/contact-ecology-2026-05-20/owned-0s-service-binding-proof.json`
- `test-artifacts/contact-ecology-2026-05-20/owned-relay-live-proof-final.json`
- `test-artifacts/contact-ecology-2026-05-20/request-service-live-before.png`
- `test-artifacts/contact-ecology-2026-05-20/request-service-live-after-submit.png`
- `test-artifacts/contact-ecology-2026-05-20/submit-review-live.png`
- `test-artifacts/contact-ecology-2026-05-20/operator-review-queue-live.png`

Passed checks:

- CORS preflight from `https://skyes-over-london-reviews.pages.dev` returned `204` with the correct allow-origin.
- Live API write created a private `sales_intake` record.
- Resend backup status returned `sent`.
- Existing FS27/free99-style admin authority loaded the record.
- Admin triage action moved the proof record to `triaged`.
- Final owned-lane proof created contact intake `e295b275-fe34-4689-bea5-13747b02d330`, returned `relay_status: sent`, and stored Relay13 conversation `conv_66f8de04-592a-411f-9fca-1ca058a3c735`.
- The Relay13 receipt proves `mode: relay13_0s_service_binding`, `route: 0s_service_binding`, `bridge: connectlog`, `status: 201`, and guardrail decision `allow`.
- The same final proof admin-read the FS27 record with existing admin authority and verified backup email `sent`.
- Internal-route-only proof created contact intake `82a06c50-c0ce-4a00-8ad3-4585cf1b9d3d`, returned `relay_status: sent`, stored Relay13 conversation `conv_3738f7e0-ed28-483b-b659-4a0eaac4e78e`, and confirmed `no_public_http_fallback_404: true`.
- The public 0S Relay13 mount remains externally reachable for public callers: `/api/relay13/v1/widget-config?workspace=connectlog-main` returned HTTP `200` with workspace `connectlog-main`.
- Playwright submitted the public request-service form and received a visible FS27 receipt.
- Playwright verified review intake and operator queue pages.
- Playwright reported no page errors, no console errors, and no horizontal overflow.
- Final postdeploy read stress returned HTTP `200` for 13 live URLs and 60/60 concurrent reads with zero failures.
- Proofed deployment versions: FS27 Worker `8a91ac76-6ca8-47c5-99cf-026f91dc26c9`; MetrAIyux 0S Worker `ffbbf94e-99e9-4555-803d-2385ab846887`.

## Honest Boundary

Do not describe Relay13 as an external provider dependency for this lane. The canonical production route is FS27/Gate intake -> 0S service binding -> Relay13/ConnectLog. FS27 does not depend on the public 0S HTTP URL for internal delivery when the binding exists. A direct first-party Relay13 Worker binding remains as resilience if the 0S binding ever returns non-OK, and the fallback `mailto:skyesoverlondon@gmail.com` remains backup-only.
