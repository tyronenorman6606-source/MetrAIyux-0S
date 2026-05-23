# SovereignDocs Database Cutover

This folder contains production cutover schemas. They do not mean the current zip is already connected to a live database.

- `neon/schema.sql` is for Postgres/Neon.
- `cloudflare-d1/schema.sql` is for Cloudflare D1 / SQLite-compatible Worker deployments.

Cutover order:

1. Deploy upstream auth and pass trusted user/org headers into SovereignDocs.
2. Apply one schema.
3. Replace local JSON persistence with the selected adapter.
4. Store exported binaries in object storage.
5. Run `npm run smoke:all` plus deployed browser click proof.
