# Auth Gate Notes

This app intentionally has no built-in auth.

Do not add NextAuth, Clerk, Supabase Auth, custom login pages, or any other auth layer unless you choose to do that later.

## Intended architecture

```text
Your external auth gate
        ↓
Zoho Command Center app
        ↓
Neon/Postgres + Zoho APIs
```

## Optional identity header

If your gate can send a user identifier, send:

```text
x-gate-user-id: your-user-id
```

The onboarding route stores this value in `email_service_orders.created_by_gate_user_id`.

## Protect these routes with your gate

Pages:

```text
/
/inbox
/compose
/onboard
/clients
```

API routes:

```text
/api/mail/send
/api/mail/search
/api/onboarding
/api/clients
/api/provisioning/run
```

## Provisioning route secret

Even behind your auth gate, keep `PROVISIONING_RUN_SECRET` enabled for the provisioning runner.

Call it with:

```bash
curl -X POST http://localhost:3000/api/provisioning/run \
  -H "x-provisioning-secret: $PROVISIONING_RUN_SECRET"
```
