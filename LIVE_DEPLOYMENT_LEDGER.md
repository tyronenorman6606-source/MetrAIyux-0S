# Live Deployment Ledger

Generated: 2026-05-17 UTC  
Purpose: CEO-readable record of deployed Cloudflare production surfaces and the company contribution represented by each one.

## Executive Summary

The Cloudflare account currently has 34 deployed production surfaces captured from source-of-truth Cloudflare APIs and follow-up Worker sweeps: 17 Cloudflare Pages projects and 17 Cloudflare Workers. The Worker follow-up captured `kaixu-6-7-brain`, `skyegatefs13-super-gate`, `vantacore`, `skydexia-cloudflare-adapter`, and `skydexia-ops-control`. ConnectLog + Relay13 is now live in production: `relay13-core` is deployed as a Cloudflare Worker, wired to the shared MetrAIyux 0S D1 operator database through root environment credentials, and the 0S full-system Worker exposes the public operator proof page, ConnectLog app, proof receipt, and live surface registry entries. Stripe live product sync is now complete for the expanded 0S catalog and SkyePay/SaaS checkout lanes: the approved 0S setup/monthly lookup keys point to live replacement prices, stale prices are archived, SkyeGate managed prices remain reused, and both SkyePay plus direct SaaS Checkout created live `cs_live` sessions in proof mode. I also verified the MetrAIyux 0S marketing pricing section after the 2026-05-17 production deploy: the pricing grid has exactly four cards, zero pricing meteors, zero pricing beams, zero shine-border wrappers, and the Growth Cabinet `MOST POPULAR` ribbon renders cleanly on desktop and mobile. The legacy marketing hostname `https://metraiyux-marketing.pages.dev/` is now live as a compatibility mirror for older public links and `/index.html` redirects to `/` with HTTP `200`. PHX Verified is now live as a Cloudflare Pages public visibility network at `https://phx-verified-network.pages.dev/` after deployment `1daa4796-a81a-4c75-967d-df7f019f0918`: the rebuilt `/insights/` operating journal publishes seven longform operator articles with manual methods, diagnostics, metrics, owner worksheets, mistakes to avoid, official source notes, and only seven major live 0S/company platform backlinks; the Cloudflare-safe deploy uses the profile renderer plus shard stubs so canonical business URLs return `200` without browser 404s while staying under the Pages 20,000-file cap. The public deployment ledger HTML is live at `https://metraiyux-ecosystem-portal.pages.dev/operator/deployment-ledger` after deployment `cb3f578c-6d95-4cbe-a831-ea39e57cf357` and is now a live-only Deployment Atlas with 78 public surfaces, 77 verified open surfaces, 1 access-gated surface, 8 live signal checks, Skye UI orbit controls with measured non-overlapping lane placement, Three.js canvas runtime, GSAP/ScrollTrigger, Lenis, ConnectLog + Relay13 rows, SkyePay Stripe sync evidence, SaaS billing status, Valley Verified longform insights proof, and no public route-fix queue.

Raw evidence is saved in:

- `test-artifacts/live-deployment-ledger/cloudflare-inventory.json`
- `test-artifacts/live-deployment-ledger/live-http-checks.json`
- `test-artifacts/live-deployment-ledger/cloudflare-pages-projects-current.json`
- `test-artifacts/live-deployment-ledger/cloudflare-pages-deployments-current.json`
- `test-artifacts/live-deployment-ledger/netlify-public-root-checks.json`
- `test-artifacts/live-deployment-ledger/operator-provided-deployments-checks.json`
- `test-artifacts/live-deployment-ledger/operator-provided-deployments-unified.json`
- `test-artifacts/live-deployment-ledger/operator-public-live-only.json`
- `test-artifacts/ledger-live-only-prod/browser-qa.json`
- `test-artifacts/ledger-live-only-prod/desktop-1440x1000.png`
- `test-artifacts/ledger-live-only-prod/mobile-390x844.png`
- `test-artifacts/ledger-live-only-prod-recheck/all-visible-links-browser.json`
- `test-artifacts/ledger-hero-fix-prod/browser-qa.json`
- `test-artifacts/ledger-hero-fix-prod/desktop-1440x1000.png`
- `test-artifacts/ledger-orbit-fix-prod/browser-qa.json`
- `test-artifacts/ledger-orbit-fix-prod/desktop-1440x1000.png`
- `test-artifacts/ledger-orbit-fix-prod/mobile-390x844-orbit.png`
- `test-artifacts/operator-vault-link-fix/browser-qa.json`
- `test-artifacts/operator-vault-link-fix/operator-top-vault-click.png`
- `test-artifacts/portal-brand-copy-fix/browser-qa.json`
- `test-artifacts/portal-brand-copy-fix/portal.png`
- `test-artifacts/skyes-over-london-reviews-three-atlas/cloudflare-production-atlas.png`
- `test-artifacts/skyes-over-london-reviews-review-pages/production-qa.json`
- `test-artifacts/skyes-over-london-reviews-review-pages/production-review-click-workflow.webm`
- `test-artifacts/skyes-over-london-reviews-populated-names/production-qa.json`
- `test-artifacts/skyes-over-london-reviews-populated-names/production-populated-names-click-workflow.webm`
- `test-artifacts/ledger-live/portal-deployment-ledger.png`
- `test-artifacts/ledger-live/portal-deployment-ledger-worker-refresh.png`
- `test-artifacts/pricing-fix/production-postdeploy-pricing.png`
- `test-artifacts/pricing-fix/production-mobile-growth-card.png`
- `test-artifacts/phx-verified-network-live-deploy/proof.json`
- `test-artifacts/valley-verified-business-insights/browser-qa-report.json`
- `test-artifacts/valley-verified-business-insights/deploy-folder-browser-qa-report.json`
- `test-artifacts/valley-verified-business-insights-prod/production-browser-qa-report.json`
- `test-artifacts/valley-verified-business-insights-prod/deployment-atlas-phx-insights-check.json`
- `test-artifacts/valley-verified-longform-local/browser-qa-report.json`
- `test-artifacts/valley-verified-longform-deploy-folder/browser-qa-report.json`
- `test-artifacts/valley-verified-longform-prod/production-browser-qa-report.json`
- `test-artifacts/valley-verified-longform-prod/deployment-atlas-longform-proof.json`
- `test-artifacts/connectlog-relay13-production-proof.json`
- `test-artifacts/connectlog-relay13-e2e-report.json`
- `test-artifacts/connectlog-relay13-video-report.json`
- `test-artifacts/direct-mcp/metraiyux_0s_site-mcp-tooling-receipt.json`
- `test-artifacts/direct-mcp/SkyeGateFS27-mcp-tooling-receipt.json`
- `test-artifacts/direct-mcp/metraiyux-portal-mcp-tooling-receipt.json`
- `test-artifacts/stripe-sync/metraiyux-stripe-sync-receipt.json`
- `test-artifacts/stripe-sync/metraiyux-stripe-live-checkout-proof.json`
- `test-artifacts/ledger-stripe-sync-prod/browser-qa.json`
- `test-artifacts/ledger-stripe-sync-prod/desktop-1440x1000.png`
- `test-artifacts/ledger-stripe-sync-prod/mobile-390x844.png`
- `test-artifacts/ledger-stripe-sync-prod/0s-live-postdeploy-check.json`
- `test-artifacts/stress/connectlog-relay13-skyepay-live/stress-report.json`
- `test-artifacts/connectlog-public-copy-fix/browser-qa.json`
- `test-artifacts/connectlog-public-copy-fix/connectlog-app-deployment-section.png`
- `metraiyux_0s_site/skyeroutex-workforce-command-v0.4.0/proof/STRESS_CONCURRENCY_2026-05-17T19-06-19-103Z.json`

## Newly Pushed This Run

| Surface | Production URL | Deployment ID | What Changed |
| --- | --- | --- | --- |
| Relay13 Core Live Worker | https://relay13-core.graylondonskyes.workers.dev/ | `4f4810d8-b3d6-46b9-b249-5d6a4693f31e` | Deployed Relay13 v1.7 with ConnectLog bridge, Durable Object realtime rooms, static admin/landing assets, shared 0S D1 binding `metraiyux-site-operator-db`, root-env Cloudflare credentials, root-env admin token secret, workspace bootstrap, domain allowlisting, scoped API key creation, activation proof, live-proof endpoint, and customer/operator WebSocket proof. |
| MetrAIyux 0S Full System / ConnectLog + Relay13 Proof | https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/connectlog-relay13-operator-proof.html | `795461c3-5f45-4160-8323-07d7a5e380ae` | Redeployed the full 0S Worker to expose the new ConnectLog + Relay13 operator proof surface, ConnectLog app, proof receipt, production-recorded proof video, live Relay13 links, updated live-surface router entries, revised commercial pricing lanes, direct FS27 gate-lane links, live Stripe lookup-key/price IDs in the 0S plan and SkyePay data files, the updated brain registry boundary confirming Relay13 production proof has passed, and the public production-infrastructure copy pass across 0S home, ConnectLog, proof center, and Cabinet Brain surfaces. Browser proof in `test-artifacts/connectlog-production-infra-copy/2026-05-17T20-00-53-608Z/browser-qa.json` shows desktop/mobile pages clean, no weak local/offline/public-secret wording, no console errors, no horizontal overflow, and 120 live stress reads across 0S, Relay13, and FS27 with no failures. |
| SkyeGateFS27 / ConnectLog + Relay13 Gate Lane | https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/connectlog-relay13 | `cbcf8b54-f5ca-42e7-b003-fe6ca984c60a` | Registered ConnectLog + Relay13 inside the gate with a public FS27 gate lane page, gate proof page card, control-plane nav link, sitemap entries, integration dossier, root-env mirror secret alignment, a mirrored `connectlog-relay13` production-proof event classified under the gate `messaging` lane, and SkyePay documentation aligned to the live Stripe price sync. The gate lane copy now frames ConnectLog as the production relationship OS and Relay13 as the deployed messaging worker. |
| Sovereign SaaS Provisioning / Stripe Checkout | https://sovereign-saas-provisioning-worker.graylondonskyes.workers.dev/ | `4b2c958d-9039-4f2d-8839-fc1519af483c` | Redeployed the SaaS provisioning Worker with the synced live Stripe Price IDs for Starter, Growth, RouteX, Autonomous, and Enterprise setup/monthly checkout flows; `/api/saas/status` answers live directly and through the 0S proxy. |
| Stripe Live Product Sync / SkyePay + SaaS | https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/store | `test-artifacts/stripe-sync/metraiyux-stripe-sync-receipt.json` | Synced Stripe account `acct_1Seml2HEgCmnlKPJ` from the root env keys without exposing secrets: 7 products, 13 live prices, 10 0S prices created/replaced for the expanded catalog, 8 stale prices archived, and 3 existing SkyeGate prices reused. Live checkout proof confirmed current lookup keys, archived stale prices, SkyePay Starter monthly handoff, SaaS Growth setup handoff, and SaaS Growth monthly metadata. |
| PHX Verified Network | https://phx-verified-network.pages.dev/ | `1daa4796-a81a-4c75-967d-df7f019f0918` | Redeployed the v23 public visibility layer with a rebuilt `/insights/` operating journal: seven longform operator articles, all over the 1,500-word floor, with manual-method sections, 0S system bridges, operator diagnostics, metrics, owner worksheets, mistakes to avoid, official source notes, and only seven major live platform backlinks. The Cloudflare deploy folder stays under the 20,000-file cap by routing canonical business URLs through the profile renderer with profile-shard stubs; production browser QA passed on desktop/mobile for `/insights/`, all seven articles, and `/business/bobs-smoke-shop-litchfield-park/` with zero browser 404s. |
| SkyGateFS13 Super Gate | https://skyegatefs13-super-gate.graylondonskyes.workers.dev/ | `50c16cdb-fbab-4233-b7bb-06873cc350f2` | Fixed the deployed Worker root route that returned JSON `404`; `/` and `/v1/health` now return the health payload with HTTP `200`. |
| MetrAIyux Ecosystem Portal | https://metraiyux-ecosystem-portal.pages.dev/operator/deployment-ledger | `cb3f578c-6d95-4cbe-a831-ea39e57cf357` | Rebuilt the public deployment ledger into a live-only Skye UI Deployment Atlas with measured orbit lane controls, 78 public surfaces, 8 live signal checks, ConnectLog + Relay13 rows, Relay13 health, SaaS billing status, SkyePay live Stripe price evidence, Valley Verified longform insights proof, Three.js canvas runtime, GSAP/ScrollTrigger, Lenis, all route-fix rows removed from the website, desktop hero framing corrected, the right atlas lane buttons spaced with zero browser-detected overlaps on desktop and mobile, the operator top Vault link fixed, and visible portal copy cleaned to the canonical `SOLEnterprises` brand. |
| MetrAIyux Marketing Compatibility Mirror | https://metraiyux-marketing.pages.dev/ | `daccdf4e-4dd3-41d1-8f69-f10b33f842a7` | Created the missing Cloudflare Pages project and deployed `marketing/metraiyux-0s` so older `metraiyux-marketing.pages.dev/index.html` links resolve instead of 404/DNS failure. |
| MetrAIyux 0S Marketing | https://metraiyux-0s-marketing.pages.dev/#pricing | `3ffe0808-0457-4d77-b3c2-9851030744f7` | Removed the animated pricing-card meteor, shine-border, and border-beam effects that were drawing a neon box through the four plan cards. Browser proof confirms 4 cards, 0 pricing effects, and the Growth Cabinet ribbon restored on desktop and mobile. |
| SkyeGateFS27 / SkyePay | https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/store | `f2d73d31-b86d-4f56-bcd7-5c846cddf830` | SkyePay public store exposes live Stripe-backed offers and now points the 0S expansion catalog at the synced live lookup keys and Price IDs; checkout prefers live Stripe Price lookup keys with a metadata-preserving fallback. |
| Skyes Over London Reviews | https://skyes-over-london-reviews.pages.dev/skyes-over-london-reviews-expanded | `e695242d-fcb2-4652-aa41-9d1388e0beb3` | Client-name cleanup production deploy from `data/sol_reviews_populated_names.csv`, with synthetic/placeholder status language removed from public pages, 3D Three.js Review Atlas, 115 clickable review cards, 115 full review detail pages, infrastructure route links, neon chrome, and fake `Approved` language removed. |

Verified result: the MetrAIyux 0S marketing production URL returned HTTP `200`, the pricing DOM has no `.skye-meteor`, `.skye-beam`, or `.skye-shine-wrap` elements inside `#pricing-grid`, and the mobile Growth Cabinet card screenshot is clean. The Skyes Over London Reviews proof still records HTTP `200`, no console errors, no horizontal overflow, no `Approved` text, no `Name Withheld` text, no synthetic/placeholder/client-approval status text, 115 review cards, first review byline `Avery Maddox`, role line `Local Service Business Owner`, mobile and desktop Three.js atlas active, 6 infrastructure links on the first detail page, and `window.__skyeReviewAtlas.active === true`.

## CEO Contribution Map

| Contribution Lane | Live Evidence | Business Value |
| --- | --- | --- |
| Public sales and proof surfaces | MetrAIyux 0S full system, public spectacle, marketing, legal, reviews, staffing, logo rollout, ecosystem portal, SkyeSol current site, Empire Pallets app | Gives prospects real links instead of screenshots or verbal claims. |
| Edge platform infrastructure | 17 Workers including full system, Relay13 Core, kAIxu 6.7 brain, SkyGateFS13, VantaCore, SkyeDexia adapter/ops, admin automation, SaaS provisioning, security gateway, SkyeGateFS27, SkyeVault, SkyeMail | Shows deployed backend capability, not just static pages. |
| Proof and governance system | Live proof router, FS27 gate proof, deployment ledgers, browser QA artifacts | Makes company claims auditable and safer for sales conversations. |
| Client/demo deployment engine | Bob's Smoke Shop preview, MetrAIyux client preview, staffing site, Skyes Reviews | Shows repeatable client surface production across different audiences. |
| Productized design/MCP capability | Skye Design MCP, 3D reviews page, 115 CSV-driven full review routes, neon legal chrome, advanced motion stack | Demonstrates reusable design infrastructure and advanced frontend execution. |

## Cloudflare Pages Production Ledger

| Project | Production Domain | Latest Production Deployment | Branch | Source | Cloudflare Status |
| --- | --- | --- | --- | --- | --- |
| `metraiyux-marketing` | https://metraiyux-marketing.pages.dev/ | `daccdf4e-4dd3-41d1-8f69-f10b33f842a7` | `main` | `4007594` | deployed 2026-05-17 as compatibility mirror for legacy marketing links |
| `phx-verified-network` | https://phx-verified-network.pages.dev/ | `1daa4796-a81a-4c75-967d-df7f019f0918` | `main` | `ad_hoc` | redeployed 2026-05-17 with longform Valley Verified `/insights/`, seven major-platform backlinks only, and Cloudflare-safe renderer-backed business URLs |
| `metraiyux-0s-marketing` | https://metraiyux-0s-marketing.pages.dev/ | `3ffe0808-0457-4d77-b3c2-9851030744f7` | `main` | `74d0e88` | 8 minutes ago at capture |
| `empire-pallets-v3-app` | https://empire-pallets-v3-app.pages.dev/ | `18981b76-d444-49ce-96fc-6c83d8f8e490` | `main` | `33625d8` | 4 hours ago |
| `sol-staffing-marketing` | https://sol-staffing-marketing.pages.dev/ | `c3b634a8-fd2e-4d10-bc35-965657fe86e5` | `main` | `276bbf1` | 14 hours ago |
| `metraiyux-0s-public-spectacle` | https://metraiyux-0s-public-spectacle.pages.dev/ | `20be12f6-7ad5-45e9-a319-67f6db3480a7` | `main` | `276bbf1` | 14 hours ago |
| `metraiyux-ecosystem-portal` | https://metraiyux-ecosystem-portal.pages.dev/ | `cb3f578c-6d95-4cbe-a831-ea39e57cf357` | `main` | `ad_hoc` | deployed 2026-05-17 with 78-surface / 8-check Deployment Atlas, Stripe sync evidence, and Valley Verified longform insights proof |
| `skyes-over-london-reviews` | https://skyes-over-london-reviews.pages.dev/ | `046ca924-52fe-415f-b3f1-6c3e27bb0a9b` | `main` | `276bbf1` | 14 hours ago |
| `skyesol-current-public-site` | https://skyesol-current-public-site.pages.dev/ | `14f43893-78e3-40b3-b2e9-b9d0690e54f9` | `main` | `276bbf1` | 14 hours ago |
| `bobs-smoke-shop-metraiyux-preview` | https://bobs-smoke-shop-metraiyux-preview.pages.dev/ | `945a64f5-5294-4051-b155-a0bb9c4fa382` | `main` | `614ff71` | 16 hours ago |
| `sol-staffing-agency-site` | https://sol-staffing-agency-site.pages.dev/ | `02ef7437-43ba-4192-92d8-bbe8afd0b64a` | `main` | `74d1a19` | 21 hours ago |
| `neon-rift-blocks-mobile` | https://neon-rift-blocks-mobile.pages.dev/ | `11ed55dc-f806-4cbd-a1dc-97b3df579a33` | `main` | `74398e2` | 22 hours ago |
| `metraiyux-0s-client-preview` | https://metraiyux-0s-client-preview.pages.dev/ | `5e5ed187-0ea1-469a-83fa-0ea6f716a524` | `main` | `4559974` | 1 day ago |
| `skyes-over-london-legal` | https://skyes-over-london-legal.pages.dev/ | `ac682e18-a30d-4c1f-a697-6e71487d0df8` | `main` | `f572a53` | 1 day ago |
| `citadeldb-ultimate` | https://citadeldb-ultimate.pages.dev/ | `554374c8-56d6-4f27-b1c6-27afbfe67935` | `production` | `edd29fb` | 1 day ago |
| `skye-design-mcp` | https://skye-design-mcp.pages.dev/ | `3ae07fc4-c644-4941-bc7a-c998820f51de` | `production` | `edd29fb` | 1 day ago |
| `metraiyux-0s-logo-rollout` | https://metraiyux-0s-logo-rollout.pages.dev/ | `ece52928-79fb-4be5-a33f-51299146b217` | `main` | `6c14c69` | 2 days ago |

## Cloudflare Workers Production Ledger

| Worker | Production URL | Latest Deployment Time | Deployment ID | Version ID |
| --- | --- | --- | --- | --- |
| `kaixu-6-7-brain` | https://kaixu-6-7-brain.graylondonskyes.workers.dev/ | 2026-05-17T13:26:24.721273Z | `d1f0806b-b188-40cf-878f-05157a1f2a64` | `70ec45e0-862a-4ceb-a5e8-a2cf12d7f334` |
| `skyegatefs13-super-gate` | https://skyegatefs13-super-gate.graylondonskyes.workers.dev/ | 2026-05-17T15:17:07.24897Z | `50c16cdb-fbab-4233-b7bb-06873cc350f2` | `8fea59b1-4e34-47e7-854a-44864b3d36af` |
| `skydexia-ops-control` | https://skydexia-ops-control.graylondonskyes.workers.dev/ | 2026-05-12T15:57:22.284499Z | `1f771090-59af-4710-97e4-6d779ea3ed8c` | `aaaac15b-a7b9-42d0-b569-89809fc7bcd1` |
| `skydexia-cloudflare-adapter` | https://skydexia-cloudflare-adapter.graylondonskyes.workers.dev/ | 2026-05-08T20:46:33.44987Z | `e488ed79-900b-4b00-ac86-4d600635f96d` | `356c56f8-5e9a-46ae-a758-e95be3316213` |
| `vantacore` | https://vantacore.graylondonskyes.workers.dev/ | 2026-05-03T12:28:08.327841Z | `7f88ee7c-4620-4072-bd33-05d0126a31da` | `66469183-a17e-443d-a21b-31251ca5041c` |
| `relay13-core` | https://relay13-core.graylondonskyes.workers.dev/ | 2026-05-17T17:44:36.262709Z | `4f4810d8-b3d6-46b9-b249-5d6a4693f31e` | `53344958-774e-4645-ae12-7e79101f09a0` |
| `metraiyux-0s-full-system` | https://metraiyux-0s-full-system.graylondonskyes.workers.dev/ | 2026-05-17T19:59:55.703215Z | `795461c3-5f45-4160-8323-07d7a5e380ae` | `96769fe3-5f2d-4062-8268-a0f08a5b96d9` |
| `sovereign-saas-provisioning-worker` | https://sovereign-saas-provisioning-worker.graylondonskyes.workers.dev/ | 2026-05-17T18:39:38.197718Z | `4b2c958d-9039-4f2d-8839-fc1519af483c` | `67506ab4-8940-4554-a631-1742c3392be4` |
| `skyevault-drop` | https://skyevault-drop.graylondonskyes.workers.dev/ | 2026-05-16T17:58:12.995282Z | `2bcf4efc-2047-4d3b-9e3c-4bb630d29d88` | `14b80246-2046-4c7a-996f-ca7d682d0f75` |
| `skyemail-platform` | https://skyemail-platform.graylondonskyes.workers.dev/ | 2026-05-16T22:00:07.466881Z | `0ede2efa-6d6f-4aef-b6b2-3d39457d6032` | `47b213ed-59bb-4d6d-a521-885d5e2157e3` |
| `skyegatefs27-citadeldb` | https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/ | 2026-05-17T19:45:27.156477Z | `cbcf8b54-f5ca-42e7-b003-fe6ca984c60a` | `958afbba-cb5d-45ea-8631-167efaaa8a2d` |
| `sovereign-13-site-operator-quantum` | https://sovereign-13-site-operator-quantum.graylondonskyes.workers.dev/ | 2026-05-15T13:04:54.587592Z | `4386b1d0-d3e0-49f9-9baa-6f4542803e9b` | `8ec2bb72-53af-48d2-86ea-8266a42448cb` |
| `admin-automation-brain` | https://admin-automation-brain.graylondonskyes.workers.dev/ | 2026-05-15T13:07:24.962862Z | `a9b44bf0-d948-4cf0-a9cb-18bfb9f11085` | `a55b9e85-6d1b-4a13-94d1-c25555a33e5e` |
| `crown-site-operator` | https://crown-site-operator.graylondonskyes.workers.dev/ | 2026-05-15T13:04:32.902691Z | `08505974-2e66-41db-a5e2-a6e7ce3fa49c` | `0d9b424e-0256-4163-8b56-3af20230a7d9` |
| `sovereign-13-cabinet-nexus-operator` | https://sovereign-13-cabinet-nexus-operator.graylondonskyes.workers.dev/ | 2026-05-15T13:04:53.76374Z | `4a0d6f90-de90-40e3-82ea-5608b7222baf` | `3dacd5d0-3a1b-42bc-a108-2130b160fc84` |
| `sovereign-13-cabinet-sentinel-operator` | https://sovereign-13-cabinet-sentinel-operator.graylondonskyes.workers.dev/ | 2026-05-15T13:04:54.379267Z | `81bf8be8-f712-4cf9-8126-7d5605ba7868` | `3cc507a8-57c3-4c93-9cfc-ab2f19bbd643` |
| `omeg4kai-security-gateway` | https://omeg4kai-security-gateway.graylondonskyes.workers.dev/ | 2026-05-15T13:04:00.595226Z | `fdfc6f09-47d1-491e-ac4e-af4f6a6fb416` | `4a971885-52c3-4430-b02a-6a32fd07e640` |

## Previously Under-Documented Live Surfaces Now Captured

These were live in Cloudflare or deployed during this pass, but were not fully listed in the older `Current Production State` summary:

- `skyes-over-london-reviews`
- `empire-pallets-v3-app`
- `skyesol-current-public-site`
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
- `phx-verified-network`
- `kaixu-6-7-brain`
- `skyegatefs13-super-gate`
- `vantacore`
- `skydexia-cloudflare-adapter`
- `skydexia-ops-control`
- `relay13-core`
- `skyevault-drop`
- `skyemail-platform`
- `sovereign-saas-provisioning-worker`
- `admin-automation-brain`
- `crown-site-operator`
- `omeg4kai-security-gateway`
- `sovereign-13-site-operator-quantum`
- `sovereign-13-cabinet-nexus-operator`
- `sovereign-13-cabinet-sentinel-operator`

## Operator-Provided Netlify And Endpoint Sweep

Netlify CLI is not authenticated in this workspace, so this is a public URL sweep plus operator-provided inventory rather than source-of-truth Netlify account API inventory.

Expanded sweep evidence is saved to:

- `test-artifacts/live-deployment-ledger/operator-provided-deployments-checks.json`
- `test-artifacts/live-deployment-ledger/operator-provided-deployments-unified.json`

Internal sweep archive:

- 84 deployment rows.
- 17 endpoint rows.
- 63 verified-live deployment rows.
- 7 protected gates/endpoints.
- 19 attention items across confirmed 404s, missing pretty-route redirects, one SkyeSol redirect loop, and unmapped SkyeSol hosted app paths.

Current public live atlas:

- 78 public surface rows.
- 77 verified open surfaces.
- 1 access-gated surface.
- 8 live signal checks.
- Route-fix rows are retained only in internal artifacts and notes; the public website shows only live or deliberately access-gated entries.

Confirmed 404 or route-fix queue:

- `skyeletix.netlify.app`
- `local-seo-booster.netlify.app`
- `brand-assessmentx.netlify.app`
- `industry-playbook-generator.netlify.app`
- `skye-landing-page-generator.netlify.app`
- `executive-summary-generator.netlify.app`
- `skye-socialproof-kit.netlify.app`
- `review-request-script-pack-generator.netlify.app`
- `skye-valuations-mini-website-report.netlify.app`
- `soleledgerconsole.netlify.app`
- `skyegate-fs13.netlify.app` root and listed function routes
- `getkaixu-api.netlify.app` alias; live page is `https://skyesoverlondon.netlify.app/pages/services/real-intelligence/getkaixu-api.html`
- `skygatefs13-quantumskyes.netlify.app/health` and `/auth-introspect` pretty routes; the `/.netlify/functions/health` function is live, and the repo Netlify config now includes `/health` plus `/gateway-chat` redirects for the next authenticated Netlify deploy
- `skyesol.netlify.app/ae-contractor-network` redirect loop

## Verification Standard Used

- Cloudflare Pages project list captured with `npx wrangler pages project list --json`.
- Latest production Pages deployments captured with `npx wrangler pages deployment list --environment=production --json`.
- Worker deployments captured with `npx wrangler deployments list --json`.
- Worker follow-up sweeps captured `kaixu-6-7-brain`, `skyegatefs13-super-gate`, `vantacore`, `skydexia-cloudflare-adapter`, and `skydexia-ops-control`; SkyGateFS13 root 404 was patched and redeployed on 2026-05-17.
- MetrAIyux marketing compatibility mirror checked on 2026-05-17: `https://metraiyux-marketing.pages.dev/index.html` returned `308` to `/`, then HTTP `200`.
- Netlify CLI was not authenticated in this workspace, so Netlify account inventory could not be fetched from source-of-truth API. Public and operator-provided checks were captured in `test-artifacts/live-deployment-ledger/operator-provided-deployments-checks.json` and normalized into `test-artifacts/live-deployment-ledger/operator-provided-deployments-unified.json`: 84 deployment rows, 17 endpoint rows, 63 verified-live deployments, 7 protected gates, and 19 attention items.
- 36 live HTTP checks completed against Pages roots, Worker roots, Worker health routes, and the new review atlas route.
- MetrAIyux 0S marketing pricing section browser proof completed against production on 2026-05-17 after deployment `3ffe0808-0457-4d77-b3c2-9851030744f7`.
- Public deployment ledger HTML checked live at `https://metraiyux-ecosystem-portal.pages.dev/operator/deployment-ledger` after deployment `cb3f578c-6d95-4cbe-a831-ea39e57cf357`; browser proof showed HTTP `200`, no console errors, no horizontal overflow, 78 live surface rows, 8 live check cards, the Valley Verified longform insights check, ConnectLog + Relay13 entries, SkyePay live Stripe price evidence, SaaS billing status, and screenshot/report evidence in `test-artifacts/valley-verified-longform-prod/deployment-atlas-longform-proof.json`. Earlier public-atlas proof also showed forbidden public route-fix language absent, 6 orbit lane controls, nonblank Three.js canvas pixels, GSAP/ScrollTrigger/Lenis runtime active on desktop and mobile, no desktop hero overlap, zero lane-button overlaps, zero core overlaps, zero shell escapes, and 79 unique exposed links returning HTTP `200`.
- Operator portal top Vault link checked live at `https://metraiyux-ecosystem-portal.pages.dev/operator/` after deployment `b6ebad4c-bab0-4cd1-a3b8-946b45afc523`; browser clicked the sidebar Vault link, confirmed raw href `/vault`, final URL `https://metraiyux-ecosystem-portal.pages.dev/vault`, HTTP `200`, page title `Skye Vault - Empire-Wide File Storage | SOLEnterprises`, and no 404 body text. Direct `/vault` returned HTTP `200`; legacy `/vault.html` redirects once to `/vault` and returns HTTP `200`. Evidence is in `test-artifacts/operator-vault-link-fix/browser-qa.json`.
- Portal brand-copy cleanup checked live after deployment `c151c1e3-27d9-4beb-8746-b17ffdfcee97` on `/`, `/vault`, `/beta`, and `/operator/`; browser proof showed HTTP `200`, no horizontal overflow, and zero text or HTML hits for the old separated company-name spellings, old gateway shorthand, old meta-description shorthand, old OpenGraph shorthand, or stale logo alt text. Evidence is in `test-artifacts/portal-brand-copy-fix/browser-qa.json`.
- Skyes Over London Reviews production page received desktop and mobile browser checks proving the Three.js atlas canvas rendered live, the first review opened a full detail page, infrastructure links rendered, and there was no horizontal overflow.
- Skyes Over London Reviews action proof was recorded as `test-artifacts/skyes-over-london-reviews-review-pages/production-review-click-workflow.webm`; browser playback verified `readyState >= 2`, `currentTime > 0`, `paused === false`, and visible playback.
- Skyes Over London Reviews name-populated action proof was recorded as `test-artifacts/skyes-over-london-reviews-populated-names/production-populated-names-click-workflow.webm`; browser playback verified `readyState >= 2`, `currentTime > 0`, `paused === false`, and visible playback.
- Skye Design MCP audits run for stack, requested effects, performance, public-copy validation, and E2E proof.
- SkyePay production proof recorded `test-artifacts/skyepay-live-production/skyepay-live-production-proof.json`, desktop/mobile/store/Stripe screenshots, and a verified WebM proof reel. The live store returned 61 offers, 50 repo-registry checkout imports, no horizontal overflow, and a live Stripe Checkout `cs_live` handoff. The 2026-05-17 Stripe sync receipt at `test-artifacts/stripe-sync/metraiyux-stripe-sync-receipt.json` shows live mode on Stripe account `acct_1Seml2HEgCmnlKPJ`, 7 synced products, 13 live prices, 10 0S setup/monthly prices created or replaced, 8 stale prices archived, and 3 existing SkyeGate prices reused.
- Stripe live checkout proof recorded `test-artifacts/stripe-sync/metraiyux-stripe-live-checkout-proof.json`; assertions passed for current lookup keys, stale prices archived, SkyePay Starter monthly checkout using the synced price, SaaS Growth setup checkout using the synced price, and SaaS Growth monthly metadata present for follow-on billing.
- PHX Verified Network production proof recorded `test-artifacts/phx-verified-network-live-deploy/proof.json`, `test-artifacts/valley-verified-business-insights-prod/production-browser-qa-report.json`, and `test-artifacts/valley-verified-longform-prod/production-browser-qa-report.json`; live browser checks returned `200` for `/insights/`, all seven longform article routes, and `/business/bobs-smoke-shop-litchfield-park/`, with zero browser 404s, zero console errors, no horizontal overflow, seven major platform tiles on the insight hub, article source notes present, operator diagnostics/owner worksheet/mistake sections present, all article pages above 1,500 words, and the business renderer fallback verified on desktop/mobile.
- ConnectLog + Relay13 production proof recorded `test-artifacts/connectlog-relay13-production-proof.json`; the live run returned `ok: true` on 2026-05-17T18:44:32.688Z for Worker health, ConnectLog bridge health, workspace bootstrap, four allowed production domains, scoped API key creation, ConnectLog card upsert, scan conversation creation, message-history pull, activation run recording, activation endpoint, live-proof endpoint, customer WebSocket upgrade, operator WebSocket upgrade, and live-proof run recording. The live proof reported 3 active cards, 3 requests, 3 ConnectLog conversations, 6 messages, 3 request events, and 3 activation runs.
- ConnectLog + Relay13 browser E2E recorded `test-artifacts/connectlog-relay13-e2e-report.json`; production desktop and mobile checks passed on 2026-05-17T18:45:38.214Z for the 0S homepage expansion card, public operator proof page, proof receipt with visible video playback, ConnectLog app Relay13 panel, Relay13 public preview, and Relay13 admin preview. The 0S live-surface registry returned both `connectlog-relay13-operator-proof` and `relay13-core-live-worker`.
- ConnectLog + Relay13 video proof recorded `test-artifacts/connectlog-relay13-video-report.json` against the production 0S Worker on 2026-05-17T17:57:52.280Z. The browser action reel opens the homepage expansion hub, moves into the ConnectLog Relay13 panel, opens the Relay13 preview, then opens the Relay13 console; the deployed WebM is live at `/assets/proof/connectlog-relay13-e2e.webm` with 1,484,780 bytes.
- SkyeGateFS27 ConnectLog + Relay13 gate wiring checked live after deployment `f2d73d31-b86d-4f56-bcd7-5c846cddf830`: `/connectlog-relay13`, `/connectlog-relay13-gate.html`, `/gate-proofx.html`, `/`, `/health`, and `/sitemap.xml` returned HTTP `200`; the admin platform-events query for `app_id=connectlog-relay13` returned a latest `messaging` lane event with `type=connectlog.relay13.production_proof` and `ws_id=ws_2533ccd0-08e2-48ec-b74c-f1389c7062a7`.
- MetrAIyux 0S MCP mining was rerun after the ConnectLog + Relay13 production wiring; `test-artifacts/direct-mcp/metraiyux_0s_site-mcp-tooling-receipt.json` reported `ok: true`, 18 resources read, 31 tool calls, and zero failed calls.
- MetrAIyux 0S final live postdeploy check recorded `test-artifacts/ledger-stripe-sync-prod/0s-live-postdeploy-check.json` after deployment `14b486ca-3dd0-4ac7-9174-e2a809fd62e5`; live fetch checks returned HTTP `200` for the updated brain registry, synced plan Stripe IDs, SkyePay sync data, ConnectLog proof page, and proxied SaaS status.
- ConnectLog public production-infrastructure copy proof recorded `test-artifacts/connectlog-production-infra-copy/2026-05-17T20-00-53-608Z/browser-qa.json` after 0S deployment `795461c3-5f45-4160-8323-07d7a5e380ae` and FS27 deployment `cbcf8b54-f5ca-42e7-b003-fe6ca984c60a`; desktop/mobile browser checks passed for the 0S home, ConnectLog app, landing, hub, receipt, proof center, Cabinet Brain, and FS27 gate lane. The proof found zero hits for stale local/offline/internal/backend-health phrasing, no console/page errors, no horizontal overflow, and 120 live stress reads across 0S, Relay13 health, ConnectLog bridge health, and FS27 with no failures.
- Controlled live stress proof recorded `test-artifacts/stress/connectlog-relay13-skyepay-live/stress-report.json` on 2026-05-17T19:04:41.117Z: 220 concurrent public/app HTTP reads returned HTTP `200`; 51 Relay13 D1-backed write/read calls returned `200/201`; 20 customer/operator WebSocket upgrade attempts returned `101`; no failures. Stripe Checkout was deliberately not load-hammered to avoid creating unnecessary live checkout sessions; Stripe correctness is covered by the live lookup-key and checkout proof receipt.
- SkyeRouteX local runtime stress proof recorded `metraiyux_0s_site/skyeroutex-workforce-command-v0.4.0/proof/STRESS_CONCURRENCY_2026-05-17T19-06-19-103Z.json`: 608 requests across 8 providers, 48 contractors, 24 jobs, 4 applicants per job, and 32 expected assignments; expected lock-contention conflicts returned HTTP `409` instead of over-assigning jobs.
- Valley Verified / live client build refresh proof recorded `test-artifacts/valley-verified-live-proof/report.json` after clean Pages deploys for `https://valley-verified.pages.dev/`, `https://bobs-smoke-shop.pages.dev/`, `https://empire-pallets.pages.dev/`, and `https://metraiyux-0s-marketing.pages.dev/`. Browser proof returned HTTP `200` for the Valley home, Bob featured Valley page, Empire featured Valley page, a long-tail Valley business fallback route, Bob's live app after the age gate, Empire's live app, the 0S marketing home, and the 0S marketplace. Checks confirmed featured badges, two-way Valley backlinks, explicit Email/Text/LinkedIn/Facebook/X share paths, request-build CTAs, live client build video sections, and the 0S fit-check/brain section. Latest deployment receipts in this pass: Bob preview `https://ef03902c.bobs-smoke-shop.pages.dev`, Empire preview `https://d29e4aa3.empire-pallets.pages.dev`, and 0S marketing preview `https://0827fc5d.metraiyux-0s-marketing.pages.dev`; clean project URLs remain the public URLs to use.

## Operating Notes

- The public deployment atlas is production evidence, not a repair board. Keep failed or uncertain routes in internal artifacts and notes until they are fixed, then add the working URL back to the public atlas.
- The production source JSON behind this report is in `test-artifacts/live-deployment-ledger/cloudflare-inventory.json`.
- The smoke-check evidence is in `test-artifacts/live-deployment-ledger/live-http-checks.json`.
