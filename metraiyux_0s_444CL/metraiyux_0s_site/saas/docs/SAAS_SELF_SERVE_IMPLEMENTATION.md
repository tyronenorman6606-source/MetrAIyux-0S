# SaaS Self-Serve Implementation

Generated: 2026-05-15T11:06:44Z

## What was added

This upgrade adds the missing customer self-serve layer: pricing, signup, onboarding, company profile setup, service selection, workspace setup, billing intent, customer dashboard, tenant provisioning documentation, customer workspace template, Cloudflare Worker kit, D1 migration, and proof receipts.

## Honest current status

Static site mode supports local/demo customer flows and exportable JSON. Production self-serve requires Cloudflare Worker deployment, D1 database, auth gate, payment provider secret, Resend config, and any live connectors.

## Required deployment variables

- ADMIN_TOKEN
- RESEND_API_KEY
- RESEND_FROM_EMAIL
- ADMIN_APPROVAL_EMAIL
- PUBLIC_APP_URL
- STRIPE_SECRET_KEY or selected payment provider secret
- STRIPE_PRICE_STARTER_COMMAND
- STRIPE_PRICE_GROWTH_CABINET
- STRIPE_PRICE_AUTONOMOUS_OFFICE

## Required Cloudflare bindings

- SAAS_DB: D1 database
- SAAS_KV: KV namespace
- SAAS_QUEUE: Queue for async provisioning/tasks

## Production gates

✅ Customer-facing signup pages exist.  
✅ Customer onboarding pages exist.  
✅ Service selector exists.  
✅ Workspace creation exists in browser-local mode.  
✅ Worker kit exists.  
☐ Worker deployed.  
☐ D1 migrations applied.  
☐ Auth connected.  
☐ Payment checkout connected.  
☐ Real customer workspace provisioning verified.  
☐ External connectors configured.  
