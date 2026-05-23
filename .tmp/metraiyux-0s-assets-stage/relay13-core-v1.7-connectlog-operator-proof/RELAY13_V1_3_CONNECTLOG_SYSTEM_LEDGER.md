# Relay13 v1.3 ConnectLog System Upgrade Ledger

## Boundary

Relay13 stays its own Cloudflare-native messaging product. ConnectLog stays its own offline-first card/contact product. This upgrade makes Relay13 first-class aware of ConnectLog cards and contact requests without merging the apps.

## Implemented

✅ Added migration `0002_connectlog_bridge.sql`.

✅ Added `connectlog_cards` registry table for card/campaign/owner/welcome-message metadata.

✅ Added `connectlog_contact_requests` table for scan/request/conversation linkage.

✅ `POST /api/v1/conversations` now upserts ConnectLog card records when ConnectLog bridge fields are supplied.

✅ ConnectLog welcome messages still persist as real `system` messages.

✅ ConnectLog contact requests are recorded against the created conversation.

✅ Conversation response now includes `connectlog_card_record_id` when applicable.

✅ Added `GET /api/v1/connectlog/health` for adapter diagnostics.

✅ Added `GET /api/v1/connectlog/cards` and `POST /api/v1/connectlog/cards` for card registry sync.

✅ Added `GET /api/v1/connectlog/requests` and `GET /api/admin/connectlog/requests` for request visibility.

✅ Smoke checks now verify the v1.3 bridge migration, routes, functions, and indexes.

## Honest limits

☐ This package has not been live-deployed to Cloudflare inside this workspace.

☐ D1 migrations must be applied remotely before these bridge tables exist in production.

☐ WebSocket behavior still requires deployed Durable Object proof.

☐ Attachments/photos are not included in Relay13 V1.3; keep files/photos in ConnectLog local storage or add R2 later.
