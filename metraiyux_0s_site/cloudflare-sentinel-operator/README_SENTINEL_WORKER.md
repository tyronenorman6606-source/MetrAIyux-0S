# Sentinel Site Operator Brain — Cloudflare Worker Kit

This Worker adds a lightweight API for the 15th brain: the Site Operator Brain. It can route business signals, create tasks, store receipts in KV, write structured records to D1, and enqueue async work.

## Endpoints

- `GET /api/sentinel/status`
- `POST /api/sentinel/route` with `{ "text": "..." }`
- `POST /api/sentinel/task` with task JSON
- `GET /api/sentinel/ledger`

## Deployment outline

1. Install Wrangler.
2. Create a KV namespace for `SENTINEL_LEDGER`.
3. Create a D1 database named `sentinel_business_os`.
4. Run `wrangler d1 execute sentinel_business_os --file schema.sql`.
5. Create a Queue named `sentinel-business-events` if using queue mode.
6. Replace IDs in `wrangler.sentinel.toml`.
7. Deploy with `wrangler deploy --config wrangler.sentinel.toml`.

High-risk actions must still go through human approval gates.
