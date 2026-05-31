# SaaS Self-Serve Implementation

Generated: 2026-05-15T11:06:44Z
Updated: 2026-05-30T00:00:00Z

## What was added

This upgrade adds the customer self-serve layer: pricing, signup, onboarding, company profile setup, service selection, workspace setup, billing intent, customer dashboard, tenant provisioning documentation, customer workspace template, Cloudflare Worker kit, D1 migration, and proof receipts.

## Honest current status

The live 0S Worker now includes a built-in SaaS adapter at `/api/saas` when no external `SAAS_WORKER` or `SAAS_WORKER_ORIGIN` is mounted. Browser cache is used only to stage multi-page forms before Create Workspace; production receipts are written through the Worker to `SAAS_KV`, `SITE_EVENTS_KV`, or the configured external SaaS worker.

Customer visuals must load from `/api/saas/customer-visuals`. Production pages no longer fall back to `customer-visuals-demo.json`.

## Required deployment variables

- FS27/SkyGate/Free99 shared gate credential/session
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
- SAAS_KV or SITE_EVENTS_KV: durable receipt namespace
- SAAS_QUEUE: Queue for async provisioning/tasks
- SKYEMAIL_PLATFORM_WORKER or SKYEMAIL_PLATFORM_ORIGIN plus SKYEMAIL service token for mailbox summary parity

## Production gates

✅ Customer-facing signup pages exist.  
✅ Customer onboarding pages exist.  
✅ Service selector exists.  
✅ Workspace creation posts to `/api/saas/workspaces`.  
✅ Worker kit exists.  
✅ Main 0S Worker has built-in `/api/saas` fallback when an external SaaS worker is not mounted.  
✅ Auth uses shared FS27/SkyGate/Free99 gate headers.  
✅ Customer command telemetry writes live receipts and mirrors into the 0S Command Bridge when storage is configured.  
☐ External payment provider session creation verified.  
☐ SkyeMail provider mailbox summary verified for every public workspace.  
☐ External connectors configured.  
