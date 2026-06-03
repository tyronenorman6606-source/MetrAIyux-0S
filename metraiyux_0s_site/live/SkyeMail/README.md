# SkyeMail Standalone Platform

This directory is now the canonical standalone source for `SkyeMail` under `AbovetheSkye-Platforms`.

What lives here:
- `suite/`: the self-contained multi-surface SkyeMail platform shell
- `dist/SkyeMail/`: generated route-safe sync output for hosts that expect a flat `/SkyeMail/...` tree
- `netlify/functions/`: the deeper standalone mail service implementation, including auth, mailbox state, drafts, contacts, Gmail OAuth, Gmail sync, inbound handlers, outbound send, and watch/webhook lanes
- `cloudflare/` and `wrangler.toml`: the sovereign Worker runtime for FS27 auth, Citadel Database and SkyeNet primary storage, mailbox provisioning, send, inbound receive webhooks, and Citadel backup events
- `sql/schema.sql`: the standalone database contract for the service implementation
- `.env.template`: the provider/runtime contract, intended to be the only missing layer before live deployment

Operational reality:
- The root pages (`dashboard.html`, `compose.html`, `settings.html`, `contacts.html`, and related pages) are the real standalone mail surfaces.
- The suite now wraps those real surfaces instead of depending on external shared auth or dead `/api/skymail-*` routes.
- The deployed sovereign runtime now has a Citadel Database and SkyeNet lane for live mailbox send/read proof. Gmail OAuth, inbound webhook, Stalwart, and external provisioner lanes remain in source for compatibility and later scale-up.
- `_redirects` maps `/SkyeMail/...` requests into `suite/` so subpath deployment works without touching other platforms.
- `npm run build:suite` copies `suite/` into `dist/SkyeMail/` for flat route-safe syncs into another host tree.
- The service implementation is the fuller standalone mail backend.
- SkyeGate FS27 can now be used as the primary auth gate through `auth-fs27-session`; SkyeMail mints an app session only after FS27 introspection succeeds.
- The missing hosted mailbox provisioning endpoints now exist: `mailbox-domains`, `mail-status`, and `mailbox-provision`.
- The current live mailbox proof runs through the Citadel Database and SkyeNet lane for `solenterprises.org`: sovereign route discovery, send, and inbox readback are green. DNS/MX/SPF/DKIM/DMARC still must remain correct per domain before selling broad customer-domain mail.

Sovereign mail note:
- The service layer in this folder is treated as Citadel Database and SkyeNet-backed. Gmail remains available as a compatibility lane, and Stalwart/external provisioner support remains for later direct-control mailbox-server paths.
- FS27 event mirroring sends auth and mailbox provisioning events into the parent gate through `/platform/events` when `SKYGATEFS27_ORIGIN` and `SKYGATE_EVENT_MIRROR_SECRET` are configured.

Suite/runtime note:
- The suite keeps local drafts, campaign notes, ops notes, and delivery summaries in browser storage.
- The embedded suite surfaces load the actual standalone pages from this same folder, so once provider vars exist the suite rides the real app instead of a mock layer.
- The standalone pages do not self-host fake mailbox data. Signup, login, inbox, drafts, compose, contacts, settings, thread view, and key rotation/export surfaces require the deployed backend.

Resend webhook endpoint:
- Standalone SkyeMail deploy: `https://YOUR-SKYEMAIL-DOMAIN/.netlify/functions/inbound-resend`
- Cloudflare SkyeMail deploy: `https://YOUR-WORKER-DOMAIN/.netlify/functions/inbound-resend`
- Vanta integration deploy: `https://YOUR-VANTA-DOMAIN/api/email/webhook`

Enable these Resend events for production monitoring: `email.received`, `email.scheduled`, `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, `email.opened`, `email.clicked`, and `email.suppressed`.

Proof coverage:
- Run `npm run smoke:standalone-proof` for the bounded local proof.
- That proof covers the standalone page tree, suite mounts, key backend source lanes, FS27 login markers, hosted mailbox endpoint files, required provider markers, and `dist/SkyeMail` regeneration.
- Run `npm run smoke:zoho-provider` to confirm the deployed provider API posture.
- Run `npm run proof:live-email -- --provider=zoho` to send live proof mail and verify inbox readback.
- It does not certify live Gmail OAuth, Stalwart, or inbound third-party webhooks until those provider lanes are separately configured and exercised.
