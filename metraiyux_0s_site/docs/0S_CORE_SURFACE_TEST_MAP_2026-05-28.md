# 0S Core Surface Test Map

Generated: 2026-05-28T22:50:31.093Z

This is the quick learning and test map for the named 0S surfaces. Browser proof is intentionally not run by Codex in this repo; owner/manual browser verification handles live visual checks.

## Source Of Truth

- Gate and Worker enforcement: `metraiyux_0s_site/cloudflare/worker.js`
- Closure workflow manifest: `metraiyux_0s_site/data/0s-closure-workflows.json`
- Test/proof scripts: `package.json`
- MCP mining runner: `tools/use-my-mcp.mjs`
- Route atlas: `tools/build-skyeway-routes.mjs`
- Neural map generators: `tools/sync-obsidian-brain.mjs`, `tools/generate-obsidian-neural-map.mjs`, `tools/generate-public-neural-map.mjs`, `tools/skyevault-0s-neural-bridge.mjs`, `tools/skyerunners.mjs`

## Fresh Core Receipts

- AI gate audit: green at `test-artifacts/ai-gate-audit/ai-gate-audit-latest.json`
- Operating matrix: yellow at `test-artifacts/0s-operating-proof-matrix/0s-operating-proof-matrix-latest.json`
- Route matrix: 99 apps checked, 0 route failures
- Behavior matrix: 8 green, 13 yellow, 0 red
- Skyeway route atlas: 4244 routes at `metraiyux_0s_site/assets/skyeway-routes.js`
- Obsidian brain sync: 226 chunks at `metraiyux_0s_site/brain/obsidian-sync.json`
- SkyeVault neural bridge: 52 receipts, 133 nodes at `metraiyux_0s_site/brain/skyevault-vault-map.json`
- SkyeRunners map: 80 live surfaces and 24 operator commands at `metraiyux_0s_site/brain/skyerunners.json`

## Fast Commands

- `npm run mcp:smoke`
- `npm run 0s:ai-gate-audit`
- `npm run 0s:core-level-gate-map`
- `npm run 0s:operating-proof-matrix`
- `npm run 0s:connectlog-relay13:proof`
- `npm run 0s:skyemusicnexus:smoke`
- `npm run 0s:skyemail:offboarding-proof`
- `npm run 0s:skyeway:routes`
- `npm run brain:sync:obsidian`
- `npm run obsidian:graph`
- `npm run obsidian:web-graph`
- `npm run vault:0s:map`
- `node tools/skyerunners.mjs map`
- `MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/SkyeMusicNexus`
- `MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/live/SkyeMail`
- `MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/relay13-core-v1.7-connectlog-operator-proof`
- `MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/connectlog-v7.7-relay13-operator-proof`

## Surface Table

| Surface | Kind | Current Map Status | Main Commands |
| --- | --- | --- | --- |
| Shared FS27/SkyGate/Free99 owner gate | core-auth | green | `npm run 0s:ai-gate-audit`<br>`npm run 0s:core-level-gate-map`<br>`npm run 0s:operating-proof-matrix` |
| Skye Music Nexus | creator-commerce | mapped | `npm run 0s:skyemusicnexus:smoke`<br>`npm run 0s:skyemusicnexus:proof`<br>`MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/SkyeMusicNexus` |
| SkyeMail | mail-ops | partial | `npm run 0s:skyemail:offboarding-proof`<br>`MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/live/SkyeMail` |
| Relay13 + ConnectLog | communications | partial | `npm run 0s:connectlog-relay13:proof`<br>`npm run 0s:connectlog-relay13:prod-proof`<br>`npm run 0s:relay13-chat:proof`<br>`MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/relay13-core-v1.7-connectlog-operator-proof`<br>`MCP_APPLY=0 npm run mcp:mine -- metraiyux_0s_site/connectlog-v7.7-relay13-operator-proof` |
| Signin Pro / NorthStar | identity-ui | mapped | `node tools/proof-free99-signinpro-demo-live.mjs` |
| Ascension | executive-sales | mapped | `npm run 0s:core-level-gate-map`<br>`static/link check via metraiyux_0s_site/proof/ASCENSION_LINK_AUDIT.json` |
| Expansion / Branch Expansion | market-expansion | mapped | `npm run 0s:core-level-gate-map`<br>`static route audit`<br>`npm run 0s:operating-proof-matrix` |
| Government / Enterprise Readiness | public-sector | mapped | `npm run 0s:core-level-gate-map`<br>`static route audit`<br>`content engine: node tools/build-0s-content-engine.mjs` |
| SaaS self-serve / tenant workspaces | customer-platform | green | `npm run 0s:core-level-gate-map`<br>`npm run 0s:real-user-readiness`<br>`npm run 0s:founder-company-enrollment` |

## Level Folders

- Ascension: 7 files under `metraiyux_0s_site/ascension`; link audit says 0 broken internal links.
- Expansion: 7 files under `metraiyux_0s_site/branch-expansion`; use the operating matrix plus expansion receipts in `metraiyux_0s_site/proof/*-expansion-receipt.html`.
- Government: 4 files under `metraiyux_0s_site/government`; paired with `metraiyux_0s_site/services/government-enterprise-readiness.html`.
- SaaS: 18 files under `metraiyux_0s_site/saas`; link audit says 0 broken links.

## Current Gaps To Keep Visible

- admin-brain-automation: Live paid/public external provider execution such as Twilio/SMS/voice/social and executed retry/dead-letter processing remain operator-gated or require a dedicated backend/service binding; the latest retry receipt is intentionally executed:false.
- per-app-operating-proof-matrix: The first matrix runner now exists, but it is expected to stay yellow/red until every mounted app has create/read/update-or-closeout/receipt/stress behavior coverage.

## MCP Design Audit Flags

- None

## Manual Browser Check Links

- https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html
- https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeMusicNexus/index.html
- https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/SkyeMail/session-handoff.html?next=dashboard.html&from=founder-command
- https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/connectlog-relay13-operator-proof.html
- https://metraiyux-0s-full-system.graylondonskyes.workers.dev/signinpro/
- https://metraiyux-0s-full-system.graylondonskyes.workers.dev/ascension/index.html
- https://metraiyux-0s-full-system.graylondonskyes.workers.dev/branch-expansion/index.html
- https://metraiyux-0s-full-system.graylondonskyes.workers.dev/government/index.html
- https://metraiyux-0s-full-system.graylondonskyes.workers.dev/saas/index.html
