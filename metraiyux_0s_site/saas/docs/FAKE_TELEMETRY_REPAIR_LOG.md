# SkyeMail / SaaS Fake Telemetry Repair Log

Date: 2026-05-30
Scope: SkyeMail-connected SaaS surfaces inside `metraiyux_0s_site`.

## Rule

Customer-visible telemetry, logs, visuals, workspace state, command routing, SkyeMerit receipts, billing intents, and SkyeMail status must come from live Worker APIs or fail closed. Browser cache may stage multi-page form inputs, but it must not claim provisioning, delivery, analytics, or customer telemetry is complete.

## Fake Or Static Instances Found And Repaired

1. `assets/js/saas-tools.js`
   - Problem: hardcoded Bob preview client, email, access code, static session, static workspace claim, and `skymail.local` alias.
   - Repair: removed hardcoded preview login and access-code fallback. Client login now opens `/api/saas/client-preview` through the shared FS27/SkyGate/Free99 gate. Workspace claim posts to `/api/saas/client-workspace/claim` and fails closed if the Worker cannot confirm the workspace.

2. `assets/js/saas-tools.js`
   - Problem: signup, workspace creation, billing intent, and customer commands were stored as final-looking `localStorage` records.
   - Repair: signup posts to `/api/saas/signup`; workspace creation posts to `/api/saas/workspaces`; billing posts to `/api/saas/billing/checkout-session`; commands post to `/api/saas/customer-command`. Local browser storage is now labeled as cache/staging only.

3. `assets/js/saas-tools.js`
   - Problem: SkyeMerit packs were issued as `issued_static_mode`.
   - Repair: SkyeMerit issue now posts to `/api/saas/skyemerit/issue`. Signup also issues a live Worker-backed SkyeMerit receipt.

4. `assets/js/visual-data-kit.js`
   - Problem: customer visuals tried the live API and then rendered static JSON as if it were acceptable production data.
   - Repair: production visual dashboards now default to live-only mode. Static `data-source` and `data-fallback` are ignored unless a page explicitly sets `data-require-live="false"`.

5. `saas/customer-dashboard.html`
   - Problem: defaulted the command workspace to `bob-smoke-shop-preview-001` and used `customer-visuals-demo.json`.
   - Repair: workspace id is blank unless supplied by URL/session, command receipts route through the Worker, and visuals require `/api/saas/customer-visuals`.

6. `saas/customer-data.html`
   - Problem: used `customer-visuals-demo.json` as source and fallback.
   - Repair: removed static visual sources and marked the dashboard as live-only.

7. `saas/client-login.html`
   - Problem: shipped visible hardcoded preview email and access code.
   - Repair: login is now shared-gate workspace open by workspace/client slug. No app-specific client password or static access code remains.

8. `saas/skyemerit.html`
   - Problem: calculator used inline hardcoded rules only.
   - Repair: calculator now calls `/api/saas/skyemerit/preview` and reports an API error if the live route is unavailable.

9. `cloudflare/worker.js`
   - Problem: `/api/saas` returned `backend_not_mounted` when the side SaaS Worker binding/origin was missing, leaving pages with no real backend path.
   - Repair: added the built-in SaaS adapter for the main 0S Worker when no external SaaS mount is configured. Existing `SAAS_WORKER` / `SAAS_WORKER_ORIGIN` behavior remains intact.

10. `cloudflare/saas-selfserve-adapter.mjs`
    - New production path: stores workspace, signup, command, action, billing, SkyeMerit, key-card, ledger, and customer visual receipts in `SAAS_KV`, `SITE_EVENTS_KV`, or the configured external SaaS Worker. Customer command events also mirror into the 0S Command Bridge when `SITE_EVENTS_KV` is configured.

## Known Boundaries After Repair

- SkyeMail mailbox state is counted as live only when the SkyeMail service summary route responds through the configured SkyeMail Worker/service token. Otherwise the SaaS visual layer reports the mailbox as pending/unverified instead of pretending it is provisioned.
- Payment provider sessions are not faked. The billing route records a live SkyePay intent and points at the SkyePay handoff; provider checkout creation still depends on configured payment provider keys.
- Browser proof is intentionally not run in this repo per owner policy. Verification is non-browser API/build/deploy proof.
