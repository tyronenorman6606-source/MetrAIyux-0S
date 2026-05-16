# SoveReign13 Upstream Gate Integration Contract

This platform is designed to inherit auth from an upstream gate. The control plane must never trust raw browser-supplied identity headers without a shared gate secret.

## Supported production auth lanes

### Lane A: JWT/OIDC

Set these values:

```env
AUTH_JWKS_URL=https://gate.example.com/.well-known/jwks.json
AUTH_ISSUER=https://gate.example.com
AUTH_AUDIENCE=soveReign13-citadel-forge
TRUSTED_HEADER_AUTH=false
AUTH_MODE=
```

The bearer token must include an email claim through `email` or `preferred_username`. Admin rights are granted only when the email appears in `ADMIN_EMAILS` or the token roles contain `admin` or `owner`.

### Lane B: trusted headers from your gate

Set these values:

```env
TRUSTED_HEADER_AUTH=true
AUTH_GATE_SECRET_HEADER=x-s13-gate-secret
TRUSTED_HEADER_AUTH_SECRET=<generated-by-init-env-and-copied-into-gate>
AUTH_EMAIL_HEADER=x-s13-user-email
AUTH_SUBJECT_HEADER=x-s13-user-id
AUTH_USERNAME_HEADER=x-s13-user-name
AUTH_DISPLAY_NAME_HEADER=x-s13-user-display-name
AUTH_ROLES_HEADER=x-s13-user-roles
AUTH_MODE=
```

The upstream gate must inject these headers only after it authenticates the user. The gate must also strip any incoming client-supplied `x-s13-*` identity headers before adding its own values.

## Required gate behavior

✅ Strip inbound identity headers from the browser.  
✅ Authenticate the user.  
✅ Inject user email, subject, username, display name, and roles.  
✅ Inject `x-s13-gate-secret` matching `TRUSTED_HEADER_AUTH_SECRET`.  
✅ Proxy to the SoveReign13 control plane.  
✅ Keep `AUTH_MODE=dev` disabled in production.  

## Why the shared secret exists

Without the shared secret, any client could attempt to spoof `x-s13-user-email` and become an admin if the control plane is directly exposed. v1.3.0 closes that by rejecting trusted-header auth unless the gate secret is configured and present.
