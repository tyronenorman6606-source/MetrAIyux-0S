# SkyeRouteX Customer Readiness Proof - 2026-05-17

## Verdict

SkyeRouteX Workforce Command is a real multi-surface app. The 0S now exposes it through the homepage, RouteX hub, v0.4.0 platform hub, API command UI, V83 shell, pricing, SkyePay, proof router, and static contract endpoints.

Paid 0S workspaces now unlock automatically after confirmed Stripe/SkyePay payment for Starter Command, Growth Cabinet, RouteX Workforce Command, Autonomous Office, and Enterprise / Managed Gate. Custom provider scope can still be quoted separately without blocking the paid workspace unlock.

The paid workspace unlock path is customer-ready. The compliance lane no longer depends on Checkr: RouteX now defaults to `manual-government-check` for the Arizona LLC admin-assist/proof-vault workflow, with Checkr/Certn-style providers optional through native or webhook adapters. Full live RouteX operations still need the remaining provider values listed below before claiming live ETA/geocoding or production proof-media uploads.

## Proven Surfaces

- 0S home links to SkyeRouteX.
- Live RouteX hub renders with runtime boundary copy.
- SkyeRoutexFlow v0.4.0 static hub renders inside 0S.
- SkyeRoutexFlow v0.4.0 API UI renders inside 0S.
- SkyeRouteX V83 app shell opens and controls respond.
- RouteX static contract endpoints return content.
- Sales proof router recommends SkyeRouteX for field-route pain.
- Pricing exposes RouteX Workforce Command as an auto-unlock paid lane.
- House Command exposes a Manual Compliance Vault for consented public-record/government-portal workflow proof.
- Desktop and mobile screenshots were captured without horizontal overflow.

## Proof Receipts

- Live env readiness: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/proof/SMOKE_LIVE_ENV_READINESS_2026-05-17T21-35-35-682Z.json`
- Manual compliance vault: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/proof/SMOKE_MANUAL_COMPLIANCE_2026-05-17T21-30-54-967Z.json`
- RouteX integration E2E: `/workspaces/MetrAIyux-0S/test-artifacts/skyeroutex-integration/report.json`
- 0S static crawler: `/workspaces/MetrAIyux-0S/test-artifacts/skye-crawler-report.json`
- MCP receipt: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/MCP_TOOLING_RECEIPT.json`
- Deploy readiness: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/proof/SMOKE_DEPLOY_READINESS_2026-05-17T21-30-55-686Z.json`
- Security readiness: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/proof/SMOKE_SECURITY_READINESS_2026-05-17T19-43-35-704Z.json`
- Provider webhooks: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/proof/SMOKE_PROVIDER_WEBHOOKS_2026-05-17T19-43-32-854Z.json`
- Native provider contracts: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/proof/SMOKE_NATIVE_PROVIDERS_2026-05-17T19-43-31-680Z.json`
- RouteX operator flow: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/proof/SMOKE_ROUTEX_OPERATOR_2026-05-17T19-43-27-863Z.json`

## FS27 / SkyePay Proof

- FS27 catalog includes `metraiyux-routex-workforce-command`.
- Setup fee: `$6,500`.
- Monthly fee: `$1,497`.
- Checkout route: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=metraiyux-routex-workforce-command`
- Owner approval required: `false`.
- Activation path: `auto_unlock_after_confirmed_payment`.
- Auto-unlock regression passed through `npm run gateway:skyepay:auto-unlock`.

## Live Env Boundary

The root `.env` is now loaded by RouteX before server adapters initialize. The proof confirms database, Stripe secret, Stripe webhook secret, and Twilio aliases are present without printing secret values.

Identity/compliance status:

- `IDENTITY_COMPLIANCE_PROVIDER=manual-government-check`
- `COMPLIANCE_OPERATING_STATE=AZ`
- `COMPLIANCE_BUSINESS_MODE=az_llc_admin_assist`
- Checkr is optional, not a launch blocker.

Remaining live-provider warnings:

- `S3_BUCKET` / `STORAGE_BUCKET` is not populated, so R2 credentials are present but production proof-media storage is not fully selected.
- `MAPBOX_ACCESS_TOKEN` is not present, so live ETA/geocoding is not connected.

Customer paid unlock is ready. Full live RouteX field operations should not be represented as fully production-provider live until those warnings are cleared.
