# Signed Upstream Session Adapter

SovereignDocs v8 still has no built-in auth. It expects upstream auth from Omega Skygate or another trusted gateway.

## Header

Use one of these headers:

- `x-sovereigndocs-session`
- `x-omega-skygate-session`

The token format is:

```txt
base64url(json_payload).hmac_sha256_hex_signature
```

The HMAC secret is read from:

```txt
SOVEREIGNDOCS_UPSTREAM_SECRET
OMEGA_SKYGATE_SHARED_SECRET
```

## Production hardening

Set this in production:

```txt
SOVEREIGNDOCS_REQUIRE_UPSTREAM_AUTH=1
```

When enabled, unsigned legacy headers are rejected for protected routes.

## Roles

Review-decision writes require one of:

- owner
- admin
- operator
- reviewer

Local operator mode remains available only when upstream auth is not required.
