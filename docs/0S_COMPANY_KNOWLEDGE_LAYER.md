# 0S Company Knowledge Layer

Date: 2026-05-21

## Decision

The 0S company knowledge layer lives in the main `metraiyux_0s_site` Worker, behind the shared FS27/SkyGate/Free99 gate.

Primary storage is Cloudflare:

- R2 binding: `COMPANY_KNOWLEDGE_BUCKET`
- KV metadata/index fallback: `COMPANY_KNOWLEDGE_KV`, then `TENANT_BACKBONE_KV`, then `CONTENT_ENGINE_KV`, then `SITE_EVENTS_KV`
- SkyeVault/Drive are stored as source or backup references, not as the critical primary path

This avoids a new app-specific password lane and keeps owner/admin and tenant access inside the shared 0S gate.

## Routes

- `GET /api/0s/company-knowledge/status`
- `GET /api/0s/company-knowledge/bases`
- `POST /api/0s/company-knowledge/bases`
- `GET /api/0s/company-knowledge/items?knowledgeBaseId=<id>`
- `POST /api/0s/company-knowledge/items`
- `POST /api/0s/company-knowledge/vault-ingest`
- `GET /api/0s/company-knowledge/items/<itemId>`
- `DELETE /api/0s/company-knowledge/items/<itemId>`
- `POST /api/0s/company-knowledge/search`
- `POST /api/0s/company-knowledge/context`

All routes require the existing gate credentials accepted by the Worker: `Authorization`, `x-admin-token`, `x-free99-admin-code`, `x-free99-gate-session`, `x-skye-gate-session`, gate cookies, or an owner session issued by `/api/owner/admin-login`.

## Surfaces

- Owner/admin cockpit: `metraiyux_0s_site/admin/company-knowledge.html`
- Tenant SaaS cockpit: `metraiyux_0s_site/saas/company-knowledge.html`

## Isolation Rule

The actual 0S platform base is `metraiyux-0s` and is admin-only.

Tenant bases use the canonical tenant map from `tenant-backbone.mjs`. Admins can administer all tenant bases. Non-admin gate users can only access bases matching their gate workspace/client/customer claims.

## Cloudflare Setup

The main Worker `wrangler.toml` now declares:

```toml
[[r2_buckets]]
binding = "COMPANY_KNOWLEDGE_BUCKET"
bucket_name = "metraiyux-0s-company-knowledge"
preview_bucket_name = "metraiyux-0s-company-knowledge-preview"
```

Create the R2 buckets before production deploy if they do not exist:

```bash
cd metraiyux_0s_site
npx wrangler r2 bucket create metraiyux-0s-company-knowledge
npx wrangler r2 bucket create metraiyux-0s-company-knowledge-preview
```

If the bucket is not bound yet, the API can still store smaller objects inline in KV, but production should use R2.

