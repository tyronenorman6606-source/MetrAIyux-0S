# ConnectLog v7.2 Relay13 Bridge Ledger

## Status

ConnectLog remains an offline-first static PWA. Relay13 is optional. The app now has a real integration lane that can use Relay13 when deployed, while local fallback stays available when Relay13 is missing, offline, misconfigured, or not yet proven live.

## Added

✅ Relay13 bridge settings panel under `#relay13`.
✅ Local fallback / Relay13 remote mode selector.
✅ Relay13 Worker health check against `/api/health`.
✅ Public workspace slug, workspace ID, and operator API-key fields.
✅ Operator API key is stored only in the current browser IndexedDB metadata, not embedded into QR payloads.
✅ Active-card thread creation through Relay13 `POST /api/v1/conversations` when configured.
✅ Local fallback thread creation when Relay13 is not configured or unavailable.
✅ Message composer with remote send attempt and local queue fallback.
✅ Queued outbox sync button.
✅ Remote conversation list refresh using Relay13 API key.
✅ Optional public Relay13 bridge payload inside ConnectLog QR cards.
✅ Imported contacts can preserve Relay13 bridge metadata.
✅ Contact cards now expose a Message action that opens Relay13 or local fallback thread.
✅ JSON export now includes sanitized Relay13 bridge state without leaking API keys or visitor tokens.

## Not claimed

☐ No live Cloudflare deployment was performed in this workspace.
☐ No two-browser realtime WebSocket proof was performed here.
☐ No production auth layer was added to ConnectLog; it remains local-first/no-auth by design.
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
