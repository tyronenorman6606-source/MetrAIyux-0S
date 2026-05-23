# VantaCore Owned Lane Live Proof And 0S Overlap Audit

Date: 2026-05-20
Live FS27 Worker: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev`
Functional FS27 version proven: `57d80970-d429-4036-a60d-50c8ec66d479`
Usable workspace: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/vantacore-crm`

## Decision

VantaCore is now an FS27-owned service CRM lane. It should not own auth, broad messaging, broad payments, mailbox infrastructure, or the general 0S record system.

Keep VantaCore only where it is sharper than the existing 0S: service-business intake, lead firewalling, missed-call recovery, booking/follow-up, review routing, and revenue-leakage reporting.

## Live Proof

- No-auth request to `/api/vantacore/crm/summary`: `401`.
- Direct Vanta password-header request: `401`.
- Central FS27 admin login using the root env admin password: `200`, token received and redacted.
- Inherited FS27 token against `/api/vantacore/crm/summary`: `200`.
- Live API write proof: 8 lead cycles created lead, patched status, created booking, scheduled follow-up, and logged review.
- Live stress proof: 96 concurrent reads across summary, leads, bookings, follow-ups, reviews, and activity returned `200`.
- Live browser proof: locked page showed no Vanta login controls; inherited FS27 session opened the workspace; Playwright captured a lead, moved the pipeline, booked the job, scheduled follow-up, logged review, and passed desktop/mobile overflow checks.
- Actual FS27 admin UI proof: live admin password login published the inherited session bridge, loaded the admin customer table through the newly mounted `admin-customers` route, and opened VantaCore from that same session.

Evidence:

- `test-artifacts/vantacore-owned-lane-live-2026-05-20/live-api-stress-report.json`
- `test-artifacts/vantacore-owned-lane-live-2026-05-20/live-browser-e2e-report.json`
- `test-artifacts/vantacore-owned-lane-live-2026-05-20/fs27-admin-login-bridge-report.json`
- `test-artifacts/vantacore-owned-lane-live-2026-05-20/workspace-after-intake-desktop.png`
- `test-artifacts/vantacore-owned-lane-live-2026-05-20/workspace-calendar-desktop.png`
- `test-artifacts/vantacore-owned-lane-live-2026-05-20/workspace-mobile.png`

## What Changed

- VantaCore no longer owns login.
- The FS27 admin login now publishes the FS27-issued token into session-scoped inherited gate keys for same-origin lanes.
- The FS27 Worker now mounts `admin-customers` so the admin UI does not treat a successful login as broken during its first customer-table load.
- VantaCore reads only inherited 0S, Free99, FS27, bridge, runtime, bearer, or FS27 session-cookie authority.
- `/api/vantacore/crm` no longer accepts a Vanta password-header shortcut.
- The dashboard is an actual CRM workspace: intake, pipeline, booking, follow-up, review, metrics, and activity.

## Existing 0S Coverage

| Existing 0S lane | Already covers | VantaCore boundary |
|---|---|---|
| FS27 / SkyGate | Auth, admin authority, customer keys, owner approval, provider policy. | VantaCore inherits auth only. It must not add another login lane. |
| Free99 gate | No-charge access posture and shared gate session semantics. | VantaCore can be Free99-accessible only through inherited gate authority. |
| NEXUS / Cabinet records | General CRM-style records, operator ledgers, and business memory. | VantaCore should emit service-lead/job events into the parent record system instead of replacing it. |
| ConnectLog + Relay13 | Relationship memory, conversations, inbox, widgets, scoped messaging infrastructure. | VantaCore should create missed-call and follow-up intents; Relay13 owns the messaging transport. |
| SkyeMail | Mailbox and email delivery proof. | VantaCore should request email follow-ups; SkyeMail owns the mailbox/send lane. |
| SkyePay / FS27 | Checkout, billing, paid activation, owner approval. | VantaCore can show value/quote context but payments stay SkyePay-owned. |
| SkyeRouteX / HouseOperations | Dispatch, route, assignment, task/vendor/schedule workflows. | VantaCore can convert a lead into a booked job; dispatch remains in route/operations lanes. |
| SkyeProfitConsole | Margin, revenue, close brief, split/profit proof. | VantaCore contributes lead value and leakage signals, not full profit accounting. |
| SkyeMediaCenter | Asset upload, review, publishing, media workflow. | VantaCore can attach job proof/media references, but media custody stays there. |
| SovereignDocs | Case/document/packet/reminder/legal-review style workflows. | VantaCore does not own contracts/docs. It can hand off a document need. |
| NorthStar / client provisioning | Workspace/user provisioning and operator workspaces. | VantaCore client portals must be provisioned by FS27, not self-created by Vanta. |

## VantaCharge Candidates

These are worth charging or packaging as VantaCore-specific upgrades because the broader 0S has the primitives but not the packaged service-business workflow:

- Missed-call recovery templates by vertical.
- Lead firewall classifier rules for spam, vendors, emergencies, and qualified jobs.
- Booking handoff from lead to calendar/dispatch lane.
- Follow-up SLA queue for quotes, no-shows, and stale leads.
- Review request and private-feedback routing after completed jobs.
- Revenue-leakage dashboard: lost leads, unbooked emergencies, stale quotes, and value at risk.
- White-label service CRM portal under FS27 provisioning.

## Provider Control Pass

Provider control is now an FS27-owned VantaCore lane on Worker version `ad14aab5-e12e-4e17-a8eb-8b2424b823e6`.

Chosen stack:

- Phone/SMS: Twilio Programmable Messaging, configured.
- Email: Resend through SkyeMail/FS27, configured.
- Calendar booking sync: Google Calendar service account, configured.
- Payments/estimates: SkyePay/Stripe handoff, configured.
- Storage and receipts: FS27 Postgres/audit tables now, with Cloudflare D1/KV/R2 available as expansion lanes.
- Customer workspace provisioning: NorthStar/FS27 operator handoff.
- Rollback receipts: `fs27_vantacore_provider_receipts`.

Live proof:

- FS27 admin login accepted the root env admin password.
- `/api/vantacore/crm/providers` returned the FS27-owned provider policy.
- Dry-run actions passed for SMS, email, calendar event creation, SkyePay handoff, review request, NorthStar provisioning handoff, and rollback receipt.
- Provider receipts are persisted and visible through `/api/vantacore/crm/provider-receipts`.

Evidence:

- `test-artifacts/vantacore-provider-control-2026-05-20/live-provider-control-report.json`
- `test-artifacts/vantacore-provider-control-2026-05-20/live-provider-readiness-current.json`

## Public Review Routing Resolution

The real Skyes Over London review destination is now available at `https://skyes-over-london-reviews.pages.dev/submit-review.html`, and the proof wall is available at `https://skyes-over-london-reviews.pages.dev/skyes-over-london-reviews-expanded.html`.

VantaCore can route happy customers into the FS27-owned review/request ecology, but it should still avoid direct public publishing. Reviews must enter the contact-intake QA lane, receive 0S approval, and batch before proof-wall publication.

Contact ecology proof is recorded in `metraiyux_0s_site/audits/FS27_CONTACT_ECOLOGY_LIVE_PROOF_2026-05-20.md` and `test-artifacts/contact-ecology-2026-05-20/browser-proof.json`.

## Final Call

VantaCore works now as an inherited-auth CRM workspace. It is safe to keep as an owned FS27 lane for service-business intake and customer-facing CRM packaging. It is not a reason to duplicate the 0S auth, messaging, payment, mail, records, dispatch, or provisioning systems.
