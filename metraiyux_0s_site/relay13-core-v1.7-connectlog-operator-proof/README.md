# Relay13 Core V1.1 Hardened

Owned universal messaging platform for Cloudflare.

This reset build is one Cloudflare Worker with many workspaces. It avoids Workers for Platforms, avoids client-deployed code, avoids attachments in V1, and keeps the messaging platform configuration-based for white-label use.

## Included

- Multi-workspace database model.
- Workspace-domain allowlisting for public widgets.
- Scoped API key generation with hash-only storage.
- API key expiration support and throttled `last_used_at` writes.
- Embeddable widget script.
- Admin dashboard.
- Real-time conversation rooms through Durable Objects using `acceptWebSocket`.
- D1 persistence with workspace-scoped indexes.
- Stored conversation counters to avoid dashboard count subqueries.
- Widget config publish releases.
- Job ledger for controlled admin-directed release commands.
- Text-only V1 to avoid uncontrolled R2/storage costs.

## Not included in V1

- Workers for Platforms.
- Client-uploaded code execution.
- Attachments.
- SMS/email notifications.
- AI replies.
- CRM sync.
- Autonomous Cloudflare deploy API calls.

## Start

```bash
npm install
npx wrangler d1 create relay13_core
# paste database ID into wrangler.toml
npx wrangler secret put PLATFORM_ADMIN_TOKEN
npm run d1:migrate:remote
npm run deploy
```

Then open `/admin/`, bootstrap the default workspace, add the production widget domain, and copy the embed snippet.

## Domain allowlisting behavior

A workspace with no allowed domains is permissive for first setup. Once you add at least one allowed domain, widget config and widget conversation creation are restricted to that workspace's active domains.

## Cost-control rules in code

- Conversation lists require `workspace_id` and order by `last_message_sort`.
- Message counts are stored counters, not per-row count subqueries.
- API key `last_used_at` is updated only after a time window instead of on every request.
- V1 has no attachments or export storage path.
- Workspace message/conversation monthly limits are enforced before writes.


## ConnectLog bridge

Relay13 v1.2 supports an optional ConnectLog bridge on `POST /api/v1/conversations`. ConnectLog can remain a separate offline-first card/contact app while using Relay13 for real inbox persistence when a Worker is deployed. If Relay13 is unavailable, ConnectLog keeps its local fallback queue and does not claim remote delivery. See `docs/CONNECTLOG_BRIDGE.md`.

## v1.4 ConnectLog system upgrade

Relay13 now has first-class ConnectLog bridge records through `migrations/0002_connectlog_bridge.sql`. ConnectLog-originated conversations can upsert card/campaign records, persist welcome messages as real system messages, and record contact requests linked to conversations. New adapter endpoints are documented in `docs/CONNECTLOG_BRIDGE_V1_3.md`.


## v1.4 ConnectLog Live-Readiness Additions

Added source-level routes that make the ConnectLog bridge easier to prove after deployment:

- `GET /api/v1/connectlog/health` now advertises bridge routes and request-status support.
- `GET /api/v1/connectlog/stats` returns active card count, request status counts, and latest requests.
- `PATCH /api/v1/connectlog/requests/:id` lets an operator API key mark a request as `open`, `accepted`, or `archived`.

Honest boundary: these routes are source/package-proven by `npm run smoke`; live Cloudflare behavior still requires real Worker deploy, D1 migrations, bootstrap, API key creation, and HTTP/WebSocket smoke.

## v1.5 ConnectLog Message-Proof Upgrade

Relay13 remains independent from ConnectLog. v1.5 adds a bridge-specific request event ledger, bridge proof endpoint, dedicated card-scan endpoint, bridge-specific API key scopes, and request-event retrieval so ConnectLog can verify lifecycle state instead of trusting loose metadata.
