# CitadelDB Developer Access

CitadelDB now has a 0S-account developer lane. It is an HTTPS database URL, not a raw Postgres TCP URL.

## What Devs Use

```bash
export CITADELDB_DATABASE_URL="https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/citadel/dev"
export CITADELDB_AUTH="Bearer <0S_GATE_SESSION>"
```

Get the live connection contract:

```bash
curl -s "$CITADELDB_DATABASE_URL/connection" \
  -H "Authorization: $CITADELDB_AUTH"
```

Insert a row:

```bash
curl -s -X POST "$CITADELDB_DATABASE_URL/rows" \
  -H "Authorization: $CITADELDB_AUTH" \
  -H "content-type: application/json" \
  --data '{
    "appId": "my-app",
    "table": "profiles",
    "recordId": "user_1",
    "payload": { "id": "user_1", "name": "Skye User" }
  }'
```

Query rows:

```bash
curl -s -X POST "$CITADELDB_DATABASE_URL/query" \
  -H "Authorization: $CITADELDB_AUTH" \
  -H "content-type: application/json" \
  --data '{ "appId": "my-app", "table": "profiles", "limit": 25 }'
```

Safe SELECT compatibility:

```bash
curl -s -X POST "$CITADELDB_DATABASE_URL/sql" \
  -H "Authorization: $CITADELDB_AUTH" \
  -H "content-type: application/json" \
  --data '{ "sql": "select * from citadel_rows", "appId": "my-app", "table": "profiles" }'
```

## Gate And Scope

All routes use the shared 0S FS27/SkyGate/Free99 auth lane. There is no CitadelDB-specific password.

Normal 0S accounts are bound to their own workspace. Owner/operator sessions can filter or override workspace when needed for support, proof, catch-up, and admin repair.

## Boundaries

CitadelDB Developer Access accepts structured row writes, structured row queries, and safe SELECT adapters. It does not expose arbitrary SQL mutation to customer sessions.

Raw Postgres wire compatibility is a separate CitadelDB Sovereign Postgres lane. The current release lane is CitadelDB Edge over HTTPS with D1-backed storage and KV receipt mirroring.

## Helper K4i Proof

Helper K4i watches this lane through:

```bash
npm run 0s:helper-k4i:proof
node metraiyux_0s_site/tests/citadeldb-adapter.test.mjs
npm run citadeldb:live-d1-sync-proof
```

Worker routes:

- `GET /api/helper-k4i/status`
- `POST /api/helper-k4i/scan`
- `GET /api/helper-k4i/skyerrors`
- `POST /api/helper-k4i/notify`
- `POST /api/helper-k4i/patch-plan`

Helper K4i records proof scans and SkyErrors into CitadelDB and `SITE_EVENTS_KV`, then uses Resend for owner alerts when the Resend env vars are configured.
