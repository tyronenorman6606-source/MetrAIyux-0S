# 0S Delete Safety Audit

Date: 2026-05-20

## Protected 0S Roots

These were treated as wired into 0S and were not quarantined:

- `metraiyux_0s_site/` because `metraiyux_0s_site/wrangler.toml` serves it as the Cloudflare asset root and uses `cloudflare/worker.js`.
- Root `package.json`, `tools/`, `scripts/`, `tests/`, `proof-recipes/`, and `packages/` because 0S proof, crawl, vault, SkyeSecure, Marketing Made Easy, RouteX, Music Nexus, Split Engine, Media Center, platform accounting, and worker audits call them.
- `MCP/` because repo instructions and `npm run mcp:mine` use the local `quantumskyes` MCP server.
- `client-app-factory/`, `marketing/`, `obsidian-vault/`, `SkyeVault-Drop/`, `skyehands_runtime_control/`, `Dynasty-Versions/`, and `test-artifacts/` because current 0S docs, proof ledgers, scripts, or mounted proof receipts still reference them.

## Quarantined

Moved into:

`about to delete/2026-05-20-repo-unwired-quarantine/`

High-certainty unwired items moved:

- `.wrangler/` - local Wrangler cache only.
- `test-results/` - Playwright runner cache/output only.
- `tmp/` - local captures, server logs, and dry-run worker output.
- `deployments/` - standalone SkyeMusicNexus deployment copy outside the 0S asset root.
- `unpacked-zips/` - extracted archive staging.
- `SkyeHands-SOL-s332-Final (1).html` - loose standalone HTML export.
- `sovereign-business-command.html` - loose standalone HTML export.
- `vanta-core-mvp-master (1).zip` - loose archive copy.
- `metraiyux_0s_live_e2e_report.json` - loose prior test report.
- `bobs-smoke-shop` - broken root symlink.
- `SkyeUI-Components` - loose component snippet file.

## Verification

The whole `about to delete` folder was temporarily moved out of the repo and these checks still passed:

- `GET /`
- `GET /index.html`
- `GET /Marketing-Made-Easy/index.html`
- `GET /live/marketing-made-easy-growth-suite.html`
- `GET /client-app-factory/index.html`
- `GET /SkyeRouteX/index.html`
- `GET /SkyeMusicNexus/index.html`
- `GET /SkyeMediaCenter/index.html`
- `GET /valley-verified/index.html`
- `npm run 0s:marketing-made-easy:scan`
- `node --check test-artifacts/0s-delete-safety-wrangler-dryrun/worker.js`

Wrangler dry-run generated:

- `test-artifacts/0s-delete-safety-wrangler-dryrun/worker.js`
- `test-artifacts/0s-delete-safety-wrangler-dryrun/worker.js.map`
- `test-artifacts/0s-delete-safety-wrangler-dryrun/README.md`

## Result

Deleting `about to delete/` should not break the served 0S public site, Marketing Made Easy scan, or the bundled 0S Worker syntax path checked in this pass.

Do not treat this as permission to delete protected source/proof roots listed above unless they get a separate trace and replacement plan.
