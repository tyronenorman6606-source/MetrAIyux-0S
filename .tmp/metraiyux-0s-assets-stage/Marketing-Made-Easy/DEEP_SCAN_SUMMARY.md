# Marketing Made Easy Deep Scan

Generated: `2026-05-20T06:48:31.508Z`

## Inventory

- Target: `metraiyux_0s_site/Marketing-Made-Easy`
- Platform folders: `8`
- Files scanned: `464`
- MCP receipt: `metraiyux_0s_site/Marketing-Made-Easy/MCP_TOOLING_RECEIPT.json`

## Platform Folders

| Folder | HTML | JS/MJS | CSS | JSON | MD | Runtime | Smoke scripts |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| `AE-FlowPro` | 8 | 7 | 1 | 2 | 2 | yes | 2 |
| `BrandID-Offline-PWA` | 8 | 6 | 1 | 6 | 2 | yes | 3 |
| `BusinessLaunchGo` | 8 | 11 | 2 | 3 | 3 | yes | 2 |
| `SkyeDocxMax` | 11 | 17 | 1 | 10 | 22 | no | 10 |
| `SkyeWebCreatorMax` | 15 | 17 | 2 | 7 | 11 | yes | 8 |
| `WebGrowthOperator` | 87 | 4 | 1 | 3 | 9 | no | 0 |
| `arizona-growth-index` | 43 | 6 | 1 | 1 | 1 | no | 0 |
| `kAIxUBrandKit` | 8 | 7 | 1 | 3 | 3 | yes | 3 |

## Gate Boundary

- Marketing-Made-Easy is a 0S growth-suite import, not a public promise of automatic provider execution.
- Free/no-charge or local PWA surfaces still require a 0S, FS27, SkyGate, or owner-admin gate session before production handoff.
- WebGrowthOperator and Arizona Growth Index contain public marketing/intelligence content; pricing and intake language must stay aligned to approved 0S/SkyePay catalog rules.
- Provider publishing, external ad spend, Stripe checkout, Drive/Netlify/GitHub writes, and live customer tenancy require separate credential and owner approval proof.

## Smoke Plan

- `node smoke/ae-flowpro-p1-smoke.mjs` in `metraiyux_0s_site/Marketing-Made-Easy/AE-FlowPro`
- `node smoke/smoke-proof.mjs` in `metraiyux_0s_site/Marketing-Made-Easy/AE-FlowPro`
- `node smoke/smoke-static-proof.mjs` in `metraiyux_0s_site/Marketing-Made-Easy/BrandID-Offline-PWA`
- `node smoke/smoke-proof.mjs` in `metraiyux_0s_site/Marketing-Made-Easy/BrandID-Offline-PWA`
- `node smoke/businesslaunchgo-p1-smoke.mjs` in `metraiyux_0s_site/Marketing-Made-Easy/BusinessLaunchGo`
- `node smoke/smoke-proof.mjs` in `metraiyux_0s_site/Marketing-Made-Easy/BusinessLaunchGo`
- `npm run smoke` in `metraiyux_0s_site/Marketing-Made-Easy/SkyeDocxMax`
- `npm run smoke` in `metraiyux_0s_site/Marketing-Made-Easy/SkyeWebCreatorMax`
- `npm run smoke:contract-proof` in `metraiyux_0s_site/Marketing-Made-Easy/kAIxUBrandKit`
- `npm run smoke:proof` in `metraiyux_0s_site/Marketing-Made-Easy/kAIxUBrandKit`
- `npm run build` in `metraiyux_0s_site/Marketing-Made-Easy/WebGrowthOperator`

## Smoke Results

- `ae-flowpro:p1`: PASS (0)
- `ae-flowpro:proof`: PASS (0)
- `brandid:static`: PASS (0)
- `brandid:proof`: PASS (0)
- `businesslaunchgo:p1`: PASS (0)
- `businesslaunchgo:proof`: PASS (0)
- `skydocxmax:proof`: PASS (0)
- `skyewebcreatormax:proof`: PASS (0)
- `kaixu-brandkit:contract`: PASS (0)
- `kaixu-brandkit:proof`: PASS (0)
- `webgrowthoperator:static`: PASS (0)

