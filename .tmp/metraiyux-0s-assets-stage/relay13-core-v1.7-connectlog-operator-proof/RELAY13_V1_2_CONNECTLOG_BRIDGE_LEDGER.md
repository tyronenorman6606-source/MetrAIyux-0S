# Relay13 v1.2 ConnectLog Bridge Ledger

## Status

Relay13 remains the standalone messaging backend. ConnectLog is not merged into Relay13. This package adds optional ConnectLog bridge metadata to the existing conversation creation path.

## Added

✅ `extractConnectLogBridge(input)` helper.
✅ `POST /api/v1/conversations` accepts optional `connectlog_*` fields.
✅ `connectlog_welcome_message` is written as a `system` message before the customer message.
✅ Bridge metadata is attached to message metadata as `bridge: "connectlog"` plus card/campaign fields.
✅ ConnectLog-originated conversations use channel `connectlog-card` by default.
✅ Audit events use `conversation.create.connectlog` when bridge metadata is present.
✅ Response includes `bridge: "connectlog"` for bridge-created conversations.
✅ New `docs/CONNECTLOG_BRIDGE.md` documents the integration contract.

## Not claimed

☐ This is not live Cloudflare proof.
☐ This does not require ConnectLog to run Relay13.
☐ This does not expose or store ConnectLog operator API keys in public QR payloads.
☐ This does not add attachments, SMS/email notifications, or billing.

## Proof run

```bash
npm run smoke
```

Expected output:

```text
Smoke passed: Relay13 V1.2 ConnectLog bridge package includes public landing, console launch, domain allowlisting, stored counters, scoped indexes, API key hardening, hibernation-ready Durable Objects, and no preloaded message content.
```
