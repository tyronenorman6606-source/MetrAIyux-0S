# QUANTUM Site Operator Worker

This Worker gives the site a lightweight autonomous-business API layer.

Endpoints:

- `GET /api/site-operator/status`
- `POST /api/site-operator/route`
- `POST /api/site-operator/task`
- `POST /api/site-operator/event`
- `GET /api/site-operator/ledger`

Default mode works without KV, Queue, or D1. KV stores receipts when bound. Queue receives tasks when bound. D1 is reserved for a later structured ledger.

Smoke commands:

```bash
npm i -g wrangler
cd cloudflare-worker-site-operator
wrangler dev --config wrangler.quantum.toml
curl http://127.0.0.1:8787/api/site-operator/status
curl -X POST http://127.0.0.1:8787/api/site-operator/route -H 'content-type: application/json' -d '{"text":"New staffing lead needs pricing and proposal"}'
```
