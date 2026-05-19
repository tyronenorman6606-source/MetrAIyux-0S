# Upstream Auth Contract

This app intentionally does not implement a login system. It is built to sit behind an upstream SaaS shell such as Omega Skygate or another parent app that already owns identity, tenant routing, session validity, and billing permissions.

Runtime identity can be injected into the browser shell before the app boots:

```html
<script>
  window.SKAI_UPSTREAM_IDENTITY = {
    tenantId: "tenant_123",
    userId: "user_123",
    roles: ["owner", "operator"],
    plan: "internal"
  };
</script>
```

The local bridge in the Platform tab is only for development/operator testing. It is not a security boundary. Server-side privileged operations must validate upstream claims before taking irreversible actions.

Minimum upstream claims:

- `tenantId`: tenant/workspace scope.
- `userId`: operator/user identifier.
- `roles`: role list from the parent app.
- `plan` or `entitlements`: optional limits/features.

The app currently stores workspace snapshots in browser IndexedDB. That is operator-local persistence, not shared team storage.
