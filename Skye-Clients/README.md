# Skye Clients

Client builds live here, but each project still deploys to its own production target.

## Current Client Apps

- SKyeAppTemplate: `Skye-Clients/SKyeAppTemplate`
  - Purpose: white-label client app base with video hero, workspace preview, QR handoff, local proof pages, gallery, offer lane, PWA wiring, smoke test, and browser proof.
  - Configure: edit `Skye-Clients/SKyeAppTemplate/template.config.json`, replace `assets/template-media/`, then run `npm run template:apply`.
  - Preview: `http://127.0.0.1:4210/`
- Bob's Smoke Shop: `Skye-Clients/bobs-smoke-shop-mcp-redo`
  - Live app: `https://bobs-smoke-shop.pages.dev/`
  - Valley Verified post: `https://valley-verified.pages.dev/business/bobs-smoke-shop-litchfield-park/`
  - Deploy: `npx wrangler pages deploy Skye-Clients/bobs-smoke-shop-mcp-redo --project-name bobs-smoke-shop --branch main --commit-dirty=true`
- Empire Pallets: `Skye-Clients/empire-pallets-v3-app`
  - Live app: `https://empire-pallets.pages.dev/`
  - Valley Verified post: `https://valley-verified.pages.dev/business/empire-pallets-phoenix/`
  - Deploy: `npx wrangler pages deploy Skye-Clients/empire-pallets-v3-app --project-name empire-pallets --branch main --commit-dirty=true`
- Next Level Gaming AZ draft v0: `Skye-Clients/next-level-gaming-az-app-draft-v0`
  - Source site: `https://www.nextlevelgamingaz.com/`
  - Status: archived draft kept for reference; rebuild future Next Level work from `Skye-Clients/SKyeAppTemplate`.

The funnel rule is simple: the client app links out to its Valley Verified public post, and the Valley Verified post links back to the client app. The network gives them discovery and proof; their own app converts the visitor.
