# ConnectLog v7.2 Relay13 Bridge Ledger

## Status

ConnectLog is a production relationship command app. Relay13 is the live production messaging core. The app has a real integration lane that uses Relay13 for owned messaging while preserving a delivery queue when an operator browser lacks credentials or cannot reach the Worker.

## Added

✅ Relay13 bridge settings panel under `#relay13`.
✅ Production vault / Relay13 production bridge mode selector.
✅ Relay13 Worker health check against `/api/health`.
✅ Public workspace slug, workspace ID, and operator API-key fields.
✅ Operator API key is stored only in the current browser IndexedDB metadata, not embedded into QR payloads.
✅ Active-card thread creation through Relay13 `POST /api/v1/conversations` when configured.
✅ Delivery queue thread creation when Relay13 credentials are not configured or the Worker cannot be reached from this browser.
✅ Message composer with Relay13 send attempt and protected delivery queue.
✅ Queued outbox sync button.
✅ Remote conversation list refresh using Relay13 API key.
✅ Public Relay13 bridge payload inside ConnectLog QR cards.
✅ Imported contacts can preserve Relay13 bridge metadata.
✅ Contact cards now expose a Message action that opens Relay13 or a protected delivery-queue thread.
✅ JSON export now includes sanitized Relay13 bridge state without leaking API keys or visitor tokens.

## Not claimed

☐ No live Cloudflare deployment was performed in this workspace.
☐ No two-browser realtime WebSocket proof was performed here.
☐ Operator auth remains handled by FS27/Relay13/gate policy; API keys are never embedded in public QR payloads.
☐ Attachments are not wired through Relay13 yet.
☐ Push/email/SMS notifications are not wired yet.

## Proof run

```bash
npm run check
```

Expected output:

```text
ConnectLog v7.2 Relay13 bridge + fallback smoke checks passed.
```
