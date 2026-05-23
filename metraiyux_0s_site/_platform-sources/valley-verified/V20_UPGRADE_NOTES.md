# PHX Verified Platform v20 Upgrade Notes

v20 is a code-first operational upgrade. It does not add local auth and does not fake lead delivery, message delivery, revenue collection, or payout proof.

## Added code

- `src/server/lead-routing-service.mjs`
- `src/server/owner-messaging-service.mjs`
- `src/server/revenue-attribution-service.mjs`
- `netlify/functions/phx-lead.mjs`
- `scripts/v20-enhance.mjs`
- `scripts/v20-smoke.mjs`

## Added action contracts

- `quote_request`
- `lead_route_decision`
- `ae_assignment`
- `owner_message`
- `notification_delivery_event`
- `revenue_attribution_event`

## Added generated surfaces

- `/quote-router/`
- `/lead-routing-service/`
- `/ae-assignments/`
- `/owner-messaging/`
- `/revenue-attribution/`

## Production boundary

These workflows are now code-backed and smoke-tested locally, but production use still requires upstream-auth headers and real provider workers for email/SMS delivery. Quote routing is not the same thing as delivered leads. Message drafts are not the same thing as provider delivery. Revenue attribution is not payout proof.
