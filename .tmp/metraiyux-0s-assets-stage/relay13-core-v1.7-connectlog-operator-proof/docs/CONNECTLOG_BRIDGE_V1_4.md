# Relay13 v1.4 ConnectLog Bridge

## Added in v1.4

✅ Bridge health advertises specific ConnectLog routes.
✅ Bridge stats endpoint summarizes active cards and request statuses.
✅ Request status patch endpoint allows `open`, `accepted`, and `archived` state.
✅ Existing v1.3 card registry and contact-request persistence remain intact.

## Operator proof path after deploy

```bash
curl https://YOUR-WORKER.workers.dev/api/v1/connectlog/health
curl -H "x-relay13-api-key: $R13_KEY" https://YOUR-WORKER.workers.dev/api/v1/connectlog/stats
curl -H "x-relay13-api-key: $R13_KEY" https://YOUR-WORKER.workers.dev/api/v1/connectlog/cards
curl -H "x-relay13-api-key: $R13_KEY" https://YOUR-WORKER.workers.dev/api/v1/connectlog/requests
```

Do not claim live messaging until D1 migrations, conversation create, message send, message readback, and WebSocket room behavior are verified against the deployed Worker.
