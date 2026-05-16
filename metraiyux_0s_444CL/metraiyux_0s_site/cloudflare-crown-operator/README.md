# CROWN Cloudflare Operator Kit

This Worker adds optional shared persistence for the Site Operator Brain. The static website works without it using browser-local ledgers. Deploy this only when you want team/shared records.

Endpoints:
- `GET /api/crown/status`
- `POST /api/crown/route`
- `POST /api/crown/task`
- `POST /api/crown/approval`
- `GET /api/crown/ledger`

Setup outline:
1. Create a D1 database named `crown-site-operator`.
2. Run `wrangler d1 migrations apply crown-site-operator` from this folder.
3. Create a KV namespace and Queue if you want them.
4. Replace placeholder IDs in `wrangler.toml`.
5. Deploy with `wrangler deploy`.

Human approval boundary: the Worker records and routes. It does not authorize money movement, contracts, hiring/firing, legal/tax advice, or public claim publication.
