# Hosted Deployment on Cloudflare

The gateway worker is designed for Cloudflare Workers with KV.

## Required bindings

```toml
[[kv_namespaces]]
binding = "AEGIS_KV"
id = "replace_me"
```

## Required secrets

```bash
wrangler secret put AEGIS_MASTER_KEY
wrangler secret put SKYE_ADMIN_KEY
```

## Deploy

```bash
cd apps/gateway-worker
pnpm install
pnpm deploy
```

## Admin import flow

```bash
curl -X POST https://api.example.com/v1/admin/import-env \
  -H "x-skye-admin-key: $SKYE_ADMIN_KEY" \
  -H "content-type: application/json" \
  -d '{
    "projectId":"proj_demo",
    "apiKey":"skye_test_proj_demo_xxx",
    "scopes":["email:send","manifest:read"],
    "envText":"RESEND_API_KEY=re_xxx"
  }'
```

## App call flow

```bash
curl -X POST https://api.example.com/v1/call \
  -H "authorization: Bearer skye_test_proj_demo_xxx" \
  -H "content-type: application/json" \
  -d '{
    "capability":"email.send",
    "input":{"to":"client@example.com","subject":"Test","body":"Hello"}
  }'
```

## Current truth

The worker scaffold implements the broker pattern and selected provider calls. It still needs live Cloudflare deployment proof, real KV namespace proof, domain routing, rate limiting, upstream auth, and production encryption review.
