# Tenant Model

CitadelDB separates these concepts:

```text
tenant/client
  └─ app/platform
      └─ environment
          └─ database + role
```

## Examples

```text
tenant: northstar
app: signinpro
environment: production
database: app_signinpro
role: app_signinpro_user
```

## Rules

- A tenant may own many apps.
- An app may have multiple environments.
- Each production app should have a dedicated database role.
- No app uses CitadelDB admin credentials.
- Tenant metadata is operational, not a billing system yet.
