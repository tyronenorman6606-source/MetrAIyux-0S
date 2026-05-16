# NEXUS Cloudflare Worker Kit

This Worker is the optional edge backend for the Site Operator Brain.

It provides:

- `GET /api/nexus/status`
- `POST /api/nexus/route`
- `POST /api/nexus/task`
- `GET /api/nexus/ledger`

## Deploy sequence

1. Install Wrangler.
2. Create a D1 database.
3. Run `wrangler d1 migrations apply sovereign_13_nexus --local` for local testing.
4. Replace the placeholder IDs in `wrangler.nexus.toml`.
5. Deploy with `wrangler deploy -c wrangler.nexus.toml`.
6. Smoke test `/api/nexus/status` and `/api/nexus/route`.

This does not autonomously sign contracts, spend money, hire/fire, or publish legal claims. It routes, records, and escalates.
