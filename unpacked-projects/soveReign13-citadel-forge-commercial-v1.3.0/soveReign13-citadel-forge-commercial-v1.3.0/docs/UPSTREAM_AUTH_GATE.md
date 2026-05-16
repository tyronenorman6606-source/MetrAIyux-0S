# Upstream Auth Gate Integration

This package is ready for the serious gate you said you can provide. There are two supported modes.

## Mode A: trusted headers

Set in `.env`:

```env
TRUSTED_HEADER_AUTH=true
AUTH_EMAIL_HEADER=x-s13-user-email
AUTH_SUBJECT_HEADER=x-s13-user-id
AUTH_USERNAME_HEADER=x-s13-user-name
AUTH_DISPLAY_NAME_HEADER=x-s13-user-display-name
AUTH_ROLES_HEADER=x-s13-user-roles
ADMIN_EMAILS=you@example.com
```

Your gate must inject these headers only after it has authenticated the user. Do not expose the control plane directly to the public Internet without the gate in front of it if you rely on trusted headers.

Expected headers:

```txt
x-s13-user-id: stable-upstream-user-id
x-s13-user-email: user@example.com
x-s13-user-name: username
x-s13-user-display-name: User Name
x-s13-user-roles: admin,owner
```

## Mode B: OIDC/JWT

Set in `.env`:

```env
AUTH_JWKS_URL=https://gate.example.com/.well-known/jwks.json
AUTH_ISSUER=https://gate.example.com
AUTH_AUDIENCE=soveReign13-citadel-forge
```

The control plane will verify bearer JWTs using `jose` and map `sub`, `email`, `preferred_username`, `name`, and `roles`/`groups`.

## Forgejo SSO

Control-plane auth and Forgejo auth are separate until you configure Forgejo external authentication. Production should connect Forgejo to the same upstream gate using OIDC so users get a unified login experience.

Keep `DISABLE_REGISTRATION=true` for the commercial platform so users do not bypass plans and signup rules by registering directly inside Forgejo.
