# Capability Model

Provider-specific APIs are normalized into SkyeAPI capabilities.

## Initial capabilities

```txt
email.send
sms.send
db.query
db.inspect_schema
ai.generate_text
billing.create_checkout
storage.upload
providers.health
manifest.read
```

## Scope model

A SkyeAPI key should have one or more scopes:

```txt
email:send
sms:send
db:read
db:write
ai:generate
billing:create_checkout
storage:upload
providers:test
manifest:read
```

## Mapping examples

```txt
RESEND_API_KEY -> email.send
TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER -> sms.send
NEON_DATABASE_URL -> db.query + db.inspect_schema
OPENAI_API_KEY -> ai.generate_text
STRIPE_SECRET_KEY -> billing.create_checkout
CLOUDFLARE_R2_* -> storage.upload
```

## Agent-safe manifest

A manifest may say:

```json
{
  "providers": [
    { "name": "resend", "connected": true }
  ],
  "capabilities": [
    { "name": "email.send", "enabled": true, "provider": "resend" }
  ],
  "secrets_exposed": false
}
```

It must not say:

```json
{
  "RESEND_API_KEY": "re_actual_secret"
}
```
