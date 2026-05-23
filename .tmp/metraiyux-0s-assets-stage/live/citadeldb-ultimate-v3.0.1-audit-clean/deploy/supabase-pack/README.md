# Supabase Pack

Optional service pack for CitadelDB.

This is not the CitadelDB core. It is an optional developer-product layer.

Use this when a platform needs:

- Studio-like UI
- REST API over Postgres
- Realtime
- Storage service
- local developer convenience

## Boundary

CitadelDB remains the source of truth for:

- database ownership
- backup receipts
- restore proof
- app provisioning
- audit events
- migration receipts

Supabase Pack is a convenience layer, not the sovereign control plane.

## v0.2 status

✅ service-pack boundary defined  
✅ env template defined  
☐ full Supabase Compose not vendored  
☐ live Supabase Pack not proven  

## Why not vendor the full Supabase repo?

Because the official Supabase Docker setup changes over time. CitadelDB should track upstream through a manifest and deployment adapter, not freeze a giant copy inside this repo.
