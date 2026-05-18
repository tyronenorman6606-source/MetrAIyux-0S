# SkyeGateFS27 Integration Dossier: Marketing Made Easy

- Generated: `2026-05-18T00:00:00Z`
- App path: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/Marketing-Made-Easy`
- Gate env var: `SKYGATEFS27_ORIGIN`
- 0S live hub: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/live/marketing-made-easy-growth-suite.html`
- 0S deep scan receipt: `/workspaces/MetrAIyux-0S/metraiyux_0s_site/proof/marketing-made-easy-deep-scan-receipt.html`

## Summary

Marketing Made Easy is an imported 0S growth-suite group, not a single app. The initial MCP mine reported 188 HTML files, 74 JS files, 10 CSS files, and eight product/market folders:

- `AE-FlowPro`
- `BrandID-Offline-PWA`
- `BusinessLaunchGo`
- `SkyeDocxMax`
- `SkyeWebCreatorMax`
- `WebGrowthOperator`
- `arizona-growth-index`
- `kAIxUBrandKit`

The suite is now represented in the FS27 gate as a client-admin/platform lane. It can mirror brand, launch, web-creation, document, growth-ops, market-intelligence, AE activation, and handoff events into FS27 when mirror credentials are configured.

## Gateway Routes

- `platform-event-ingest` for mirrored suite events.
- `gateway-chat` only when a configured provider lane is intentionally attached.
- `auth-app-login` for future app-client auth tokens.
- `skyepay/offers` only for approved catalog products; the suite itself is not an automatic checkout product.

## Event Types

- `marketing_made_easy.deep_scan.completed`
- `marketing_made_easy.ae_flow.handoff`
- `marketing_made_easy.brand_identity.archived`
- `marketing_made_easy.launch_pack.created`
- `marketing_made_easy.document_package.exported`
- `marketing_made_easy.webcreator.delivery_queued`
- `marketing_made_easy.growth_ops.intake`
- `marketing_made_easy.market_intelligence.requested`
- `marketing_made_easy.kaixu_brandkit.generated`

## Production Blockers

The local folder scan and same-folder runtime smokes do not prove production tenancy or external provider authority. Before production claims:

- Configure a 0S, FS27, SkyGate, or owner-admin gate session path.
- Configure external providers only in protected environment bindings.
- Prove any Stripe checkout route through approved SkyePay catalog entries.
- Prove Drive, GitHub, Netlify, Cloudflare, ad-platform, or social publishing writes separately.
- Mirror owner-approved actions into FS27 `/platform/events`.

## Verification

```bash
npm run 0s:marketing-made-easy:proof
npm run mcp:mine -- metraiyux_0s_site/Marketing-Made-Easy
```

