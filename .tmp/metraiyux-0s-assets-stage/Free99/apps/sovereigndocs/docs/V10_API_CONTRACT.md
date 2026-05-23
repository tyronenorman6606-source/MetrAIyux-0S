# v10 API Contract

All v10 commercial endpoints are upstream-auth ready. In local mode the server falls back to operator-local API. In production set `SOVEREIGNDOCS_REQUIRE_UPSTREAM_AUTH=1` and sign sessions with `SOVEREIGNDOCS_UPSTREAM_SECRET` or `OMEGA_SKYGATE_SHARED_SECRET`.

Every commercial order writes to `data/customer-orders.json` in dev fallback and records an append-only audit event. Production cutover should map the same payloads to `sd_commercial_orders` and `sd_commercial_order_events`.
