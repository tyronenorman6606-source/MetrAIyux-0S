# ConnectLog Bridge v1.3

Relay13 v1.3 treats ConnectLog as an independent adapter client. It does not absorb ConnectLog, and ConnectLog does not require Relay13.

## New database records

`connectlog_cards` stores card/campaign metadata supplied by ConnectLog.

`connectlog_contact_requests` links a ConnectLog-originated request to a Relay13 conversation.

## Health endpoint

```bash
curl https://YOUR-WORKER.workers.dev/api/v1/connectlog/health
```

## Upsert a ConnectLog card

```bash
curl -X POST https://YOUR-WORKER.workers.dev/api/v1/connectlog/cards \
  -H 'content-type: application/json' \
  -H 'x-relay13-api-key: r13_YOUR_KEY' \
  -d '{
    "connectlog_bridge": true,
    "connectlog_card_id": "dev-convention-2026",
    "connectlog_card_label": "Dev Convention",
    "connectlog_campaign": "events",
    "connectlog_owner_name": "Operator",
    "connectlog_owner_company": "ConnectLog",
    "connectlog_owner_role": "Founder",
    "connectlog_welcome_message": "Great meeting you. Reply here and I will follow up.",
    "connectlog_tags": ["event", "developer"]
  }'
```

## Create a conversation from a ConnectLog scan

```bash
curl -X POST https://YOUR-WORKER.workers.dev/api/v1/conversations \
  -H 'content-type: application/json' \
  -d '{
    "workspace": "connectlog-main",
    "connectlog_bridge": true,
    "connectlog_card_id": "dev-convention-2026",
    "connectlog_card_label": "Dev Convention",
    "connectlog_campaign": "events",
    "connectlog_owner_name": "Operator",
    "connectlog_welcome_message": "Great meeting you. Reply here and I will follow up.",
    "customer_name": "New Contact",
    "message": "I scanned your card."
  }'
```

## Operator request list

```bash
curl 'https://YOUR-WORKER.workers.dev/api/v1/connectlog/requests' \
  -H 'x-relay13-api-key: r13_YOUR_KEY'
```

## Proof boundary

Local source smoke proves routes, schema, indexes, and handler code exist. It does not prove live Cloudflare behavior. Live proof requires remote migrations, bootstrap, API key creation, conversation creation, message persistence, reload, and WebSocket room testing.
