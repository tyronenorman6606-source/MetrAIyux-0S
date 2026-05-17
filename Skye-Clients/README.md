# Skye Clients

Client builds live here, but each project still deploys to its own production target.

## Current Client Apps

- Bob's Smoke Shop: `Skye-Clients/bobs-smoke-shop-mcp-redo`
  - Live app: `https://bobs-smoke-shop.pages.dev/`
  - Valley Verified post: `https://valley-verified.pages.dev/business/bobs-smoke-shop-litchfield-park/`
  - Deploy: `npx wrangler pages deploy Skye-Clients/bobs-smoke-shop-mcp-redo --project-name bobs-smoke-shop --branch main --commit-dirty=true`
- Empire Pallets: `Skye-Clients/empire-pallets-v3-app`
  - Live app: `https://empire-pallets.pages.dev/`
  - Valley Verified post: `https://valley-verified.pages.dev/business/empire-pallets-phoenix/`
  - Deploy: `npx wrangler pages deploy Skye-Clients/empire-pallets-v3-app --project-name empire-pallets --branch main --commit-dirty=true`

The funnel rule is simple: the client app links out to its Valley Verified public post, and the Valley Verified post links back to the client app. The network gives them discovery and proof; their own app converts the visitor.
