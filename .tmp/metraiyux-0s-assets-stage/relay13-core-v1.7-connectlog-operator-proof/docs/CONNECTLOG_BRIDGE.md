# Relay13 ⇄ ConnectLog Bridge

Relay13 remains the messaging product. ConnectLog remains the card/contact product. This bridge lets a ConnectLog card create a Relay13 conversation without merging the two codebases.

## What changed

- `POST /api/v1/conversations` accepts optional ConnectLog bridge fields.
- Relay13 stores the bridge context in message metadata, not a new hard dependency table.
- A ConnectLog welcome message can be written as the first `system` message.
- The normal visitor token flow remains intact for public QR/card scans.
- Operator API-key flows remain separate and require existing Relay13 scopes.

## Supported fields

```json
{
  "workspace": "connectlog-main",
  "channel": "connectlog-card",
  "customer_name": "Scanner Name",
  "customer_email": "scanner@example.test",
  "message": "I scanned your card and want to connect.",
  "connectlog_bridge": true,
  "connectlog_card_id": "card_123",
  "connectlog_card_label": "Dev Convention",
  "connectlog_campaign": "Phoenix Dev Event",
  "connectlog_owner_name": "Card Owner",
  "connectlog_welcome_message": "Great meeting you. This is the best place to continue the conversation."
}
```

## Honest boundary

This does not prove a live Cloudflare deployment. It proves the Worker source supports ConnectLog-originated conversation creation while Relay13 keeps its own schema, API key model, domain allowlisting, D1 persistence, and Durable Object realtime path.
