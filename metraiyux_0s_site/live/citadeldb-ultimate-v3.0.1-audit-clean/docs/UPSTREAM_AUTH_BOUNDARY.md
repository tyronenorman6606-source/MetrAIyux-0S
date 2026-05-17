# Upstream Auth Boundary

CitadelDB does not implement full identity/auth as a product surface in this package.

It is designed to sit behind:

- Omega Skygate
- SoveReign13 upstream operator auth
- private VPN / tunnel access
- reverse proxy auth
- token-based admin access for local/private deployments

## Gateway contract

Gateway supports:

```text
Authorization: Bearer GATEWAY_ADMIN_TOKEN
```

Optional future boundary:

```text
x-skyes-operator: OPERATOR_ID
x-skyes-tenant: TENANT_SLUG
x-skyes-role: ROLE
```

## Public exposure rule

Do not expose:

```text
Postgres :5432
PgBouncer :6432
Gateway :7313
Dashboard :7413
```

directly to the public internet.

Use private networking, VPN, Cloudflare Access, Omega Skygate, or SoveReign13 routing.

## Dashboard rule

Dashboard is an operator surface, not a public SaaS login page.

If shown to clients, it must be behind upstream auth and claims must match receipts.
