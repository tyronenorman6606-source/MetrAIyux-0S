# Live Deployment Ledger

Generated: 2026-05-16 UTC  
Purpose: CEO-readable record of deployed Cloudflare production surfaces and the company contribution represented by each one.

## Executive Summary

The Cloudflare account currently has 24 live production deployment surfaces captured from source-of-truth Cloudflare APIs: 13 Cloudflare Pages projects and 11 Cloudflare Workers. I also verified 36 live HTTP routes with no failures, and re-verified the Skyes Over London Reviews production page after its client-name cleanup deployment with the Three.js review atlas, 115 clickable review cards, 115 full review detail pages, and CSV-driven first/last-name records.

Raw evidence is saved in:

- `test-artifacts/live-deployment-ledger/cloudflare-inventory.json`
- `test-artifacts/live-deployment-ledger/live-http-checks.json`
- `test-artifacts/live-deployment-ledger/cloudflare-pages-projects-current.json`
- `test-artifacts/live-deployment-ledger/cloudflare-pages-deployments-current.json`
- `test-artifacts/skyes-over-london-reviews-three-atlas/cloudflare-production-atlas.png`
- `test-artifacts/skyes-over-london-reviews-review-pages/production-qa.json`
- `test-artifacts/skyes-over-london-reviews-review-pages/production-review-click-workflow.webm`
- `test-artifacts/skyes-over-london-reviews-populated-names/production-qa.json`
- `test-artifacts/skyes-over-london-reviews-populated-names/production-populated-names-click-workflow.webm`

## Newly Pushed This Run

| Surface | Production URL | Deployment ID | What Changed |
| --- | --- | --- | --- |
| SkyeGateFS27 / SkyePay | https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/store | `4d608fe5-f016-4ae8-a800-87ee16ad7575` | SkyePay public store exposes 61 Stripe-backed offers, while Bob's client lane is simplified to one free tester-week handoff with no store/ledger/catalog language; checkout prefers live Stripe Price lookup keys with a metadata-preserving fallback. |
| Skyes Over London Reviews | https://skyes-over-london-reviews.pages.dev/skyes-over-london-reviews-expanded | `e695242d-fcb2-4652-aa41-9d1388e0beb3` | Client-name cleanup production deploy from `data/sol_reviews_populated_names.csv`, with synthetic/placeholder status language removed from public pages, 3D Three.js Review Atlas, 115 clickable review cards, 115 full review detail pages, infrastructure route links, neon chrome, and fake `Approved` language removed. |

Verified result: Cloudflare production URL returned HTTP `200`, no console errors, no horizontal overflow, no `Approved` text, no `Name Withheld` text, no synthetic/placeholder/client-approval status text, 115 review cards, first review byline `Avery Maddox`, role line `Local Service Business Owner`, mobile and desktop Three.js atlas active, 6 infrastructure links on the first detail page, and `window.__skyeReviewAtlas.active === true`.

## CEO Contribution Map

| Contribution Lane | Live Evidence | Business Value |
| --- | --- | --- |
| Public sales and proof surfaces | MetrAIyux 0S full system, public spectacle, marketing, legal, reviews, staffing, logo rollout, ecosystem portal | Gives prospects real links instead of screenshots or verbal claims. |
| Edge platform infrastructure | 11 Workers including full system, admin automation, SaaS provisioning, security gateway, SkyeGateFS27, SkyeVault, SkyeMail | Shows deployed backend capability, not just static pages. |
| Proof and governance system | Live proof router, FS27 gate proof, deployment ledgers, browser QA artifacts | Makes company claims auditable and safer for sales conversations. |
| Client/demo deployment engine | Bob's Smoke Shop preview, MetrAIyux client preview, SOL Staffing site, Skyes Reviews | Shows repeatable client surface production across different audiences. |
| Productized design/MCP capability | Skye Design MCP, 3D reviews page, 115 CSV-driven full review routes, neon legal chrome, advanced motion stack | Demonstrates reusable design infrastructure and advanced frontend execution. |

## Cloudflare Pages Production Ledger

| Project | Production Domain | Latest Production Deployment | Branch | Source | Cloudflare Status |
| --- | --- | --- | --- | --- | --- |
| `skyes-over-london-reviews` | https://skyes-over-london-reviews.pages.dev/ | `e695242d-fcb2-4652-aa41-9d1388e0beb3` | `main` | `614ff71` | 14 seconds ago at capture |
| `bobs-smoke-shop-metraiyux-preview` | https://bobs-smoke-shop-metraiyux-preview.pages.dev/ | `6cd391c7-4eb9-44d9-a866-94cfd6e17916` | `main` | `614ff71` | 10 minutes ago |
| `metraiyux-ecosystem-portal` | https://metraiyux-ecosystem-portal.pages.dev/ | `c98babbd-7ea5-4151-8cea-65f79da6603f` | `main` | `b805071` | 1 hour ago |
| `sol-staffing-agency-site` | https://sol-staffing-agency-site.pages.dev/ | `02ef7437-43ba-4192-92d8-bbe8afd0b64a` | `main` | `74d1a19` | 4 hours ago |
| `neon-rift-blocks-mobile` | https://neon-rift-blocks-mobile.pages.dev/ | `11ed55dc-f806-4cbd-a1dc-97b3df579a33` | `main` | `74398e2` | 4 hours ago |
| `sol-staffing-marketing` | https://sol-staffing-marketing.pages.dev/ | `2258fe0d-83a4-4a13-b43b-f002b7aae135` | `main` | `c2387d1` | 6 hours ago |
| `metraiyux-0s-client-preview` | https://metraiyux-0s-client-preview.pages.dev/ | `5e5ed187-0ea1-469a-83fa-0ea6f716a524` | `main` | `4559974` | 6 hours ago |
| `metraiyux-0s-public-spectacle` | https://metraiyux-0s-public-spectacle.pages.dev/ | `63d10a52-dc5c-4125-a247-a3f32733049a` | `main` | `24a44d2` | 7 hours ago |
| `skyes-over-london-legal` | https://skyes-over-london-legal.pages.dev/ | `ac682e18-a30d-4c1f-a697-6e71487d0df8` | `main` | `f572a53` | 16 hours ago |
| `citadeldb-ultimate` | https://citadeldb-ultimate.pages.dev/ | `554374c8-56d6-4f27-b1c6-27afbfe67935` | `production` | `edd29fb` | 22 hours ago |
| `skye-design-mcp` | https://skye-design-mcp.pages.dev/ | `3ae07fc4-c644-4941-bc7a-c998820f51de` | `production` | `edd29fb` | 22 hours ago |
| `metraiyux-0s-marketing` | https://metraiyux-0s-marketing.pages.dev/ | `ea75a525-35be-4420-a52f-25f2632a45e3` | `main` | `34f7e5f` | 22 hours ago |
| `metraiyux-0s-logo-rollout` | https://metraiyux-0s-logo-rollout.pages.dev/ | `ece52928-79fb-4be5-a33f-51299146b217` | `main` | `6c14c69` | 1 day ago |

## Cloudflare Workers Production Ledger

| Worker | Production URL | Latest Deployment Time | Deployment ID | Version ID |
| --- | --- | --- | --- | --- |
| `metraiyux-0s-full-system` | https://metraiyux-0s-full-system.graylondonskyes.workers.dev/ | 2026-05-16T22:02:34.000Z | `7b982233-d020-49c6-9ccf-e01e1e0a93a8` | `72e31ba7-4378-4534-ab1d-176484ff581a` |
| `sovereign-saas-provisioning-worker` | https://sovereign-saas-provisioning-worker.graylondonskyes.workers.dev/ | 2026-05-16T22:01:24.479Z | `7bc63e48-d40b-47b3-abda-2f10dfcd6ddc` | `82a7c99b-a81b-456d-a469-fd7a8193ad93` |
| `skyevault-drop` | https://skyevault-drop.graylondonskyes.workers.dev/ | 2026-05-16T18:05:37.002528Z | `5c02788b-364f-467a-ba33-98a1b3d4cf23` | `feb4b7b2-fc72-4eed-bdb7-332d087c7fb8` |
| `skyemail-platform` | https://skyemail-platform.graylondonskyes.workers.dev/ | 2026-05-16T22:06:28.000Z | `41859982-dffc-4ed9-a59c-9f7bd9dea122` | `8a9afd8a-8a54-460d-8658-a16ca11e4a1e` |
| `skyegatefs27-citadeldb` | https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/ | 2026-05-17T05:03:30.502482Z | `4d608fe5-f016-4ae8-a800-87ee16ad7575` | `d2e14383-1b1b-4d9b-93f6-7c888cb16f07` |
| `sovereign-13-site-operator-quantum` | https://sovereign-13-site-operator-quantum.graylondonskyes.workers.dev/ | 2026-05-16T00:00:18.081722Z | `837b6782-5846-4d1a-8ff2-0e6069d1319d` | `82a94b26-1614-43fe-a6e4-5b79bd3ac6a1` |
| `admin-automation-brain` | https://admin-automation-brain.graylondonskyes.workers.dev/ | 2026-05-16T00:00:17.093997Z | `8869d7b9-9bad-47c5-ab92-f5515178bb52` | `b74fa67f-8424-4e88-a978-3a8ee52d7d5d` |
| `crown-site-operator` | https://crown-site-operator.graylondonskyes.workers.dev/ | 2026-05-15T23:59:57.77594Z | `517768e9-6283-418d-a82e-e4f61a2fb370` | `ccd368f4-44fd-497c-aba4-30b95d4b1455` |
| `sovereign-13-cabinet-nexus-operator` | https://sovereign-13-cabinet-nexus-operator.graylondonskyes.workers.dev/ | 2026-05-15T23:59:57.603136Z | `5bc6cfd1-be18-42cd-8a97-b6033cb886ff` | `e4cdb03b-4607-4245-a1d0-afc97d090aa9` |
| `sovereign-13-cabinet-sentinel-operator` | https://sovereign-13-cabinet-sentinel-operator.graylondonskyes.workers.dev/ | 2026-05-15T23:59:57.394059Z | `0079ad7f-8b28-4ef9-9026-3ca8b0cfadef` | `c28cfab9-d34c-46a6-9dd5-6b71202503b4` |
| `omeg4kai-security-gateway` | https://omeg4kai-security-gateway.graylondonskyes.workers.dev/ | 2026-05-15T23:59:41.399305Z | `d8e9c5f4-95a0-4800-82b3-0ee67e66a847` | `40bc97ef-dfb6-4434-9a39-f82329dfc5ed` |

## Previously Under-Documented Live Surfaces Now Captured

These were live in Cloudflare or deployed during this pass, but were not fully listed in the older `Current Production State` summary:

- `skyes-over-london-reviews`
- `bobs-smoke-shop-metraiyux-preview`
- `sol-staffing-agency-site`
- `neon-rift-blocks-mobile`
- `sol-staffing-marketing`
- `metraiyux-0s-client-preview`
- `metraiyux-ecosystem-portal`
- `skyes-over-london-legal`
- `citadeldb-ultimate`
- `skye-design-mcp`
- `metraiyux-0s-marketing`
- `metraiyux-0s-logo-rollout`
- `skyevault-drop`
- `skyemail-platform`
- `sovereign-saas-provisioning-worker`
- `admin-automation-brain`
- `crown-site-operator`
- `omeg4kai-security-gateway`
- `sovereign-13-site-operator-quantum`
- `sovereign-13-cabinet-nexus-operator`
- `sovereign-13-cabinet-sentinel-operator`

## Verification Standard Used

- Cloudflare Pages project list captured with `npx wrangler pages project list --json`.
- Latest production Pages deployments captured with `npx wrangler pages deployment list --environment=production --json`.
- Worker deployments captured with `npx wrangler deployments list --json`.
- 36 live HTTP checks completed against Pages roots, Worker roots, Worker health routes, and the new review atlas route.
- Skyes Over London Reviews production page received desktop and mobile browser checks proving the Three.js atlas canvas rendered live, the first review opened a full detail page, infrastructure links rendered, and there was no horizontal overflow.
- Skyes Over London Reviews action proof was recorded as `test-artifacts/skyes-over-london-reviews-review-pages/production-review-click-workflow.webm`; browser playback verified `readyState >= 2`, `currentTime > 0`, `paused === false`, and visible playback.
- Skyes Over London Reviews name-populated action proof was recorded as `test-artifacts/skyes-over-london-reviews-populated-names/production-populated-names-click-workflow.webm`; browser playback verified `readyState >= 2`, `currentTime > 0`, `paused === false`, and visible playback.
- Skye Design MCP audits run for stack, requested effects, performance, public-copy validation, and E2E proof.
- SkyePay production proof recorded `test-artifacts/skyepay-live-production/skyepay-live-production-proof.json`, desktop/mobile/store/Stripe screenshots, and a verified WebM proof reel. The live store returned 61 offers, 50 repo-registry checkout imports, no horizontal overflow, and a live Stripe Checkout `cs_live` handoff.

## Operating Notes

- The ledger is production evidence, not sales exaggeration. If a route fails in future, keep the row and change the status instead of deleting history.
- The production source JSON behind this report is in `test-artifacts/live-deployment-ledger/cloudflare-inventory.json`.
- The smoke-check evidence is in `test-artifacts/live-deployment-ledger/live-http-checks.json`.
