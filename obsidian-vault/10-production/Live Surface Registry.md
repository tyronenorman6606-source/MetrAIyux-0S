---
title: Live Surface Registry
brain: true
tags:
  - live-surfaces
  - proof-router
  - production
---

# Live Surface Registry

The live surface registry is the map of buyer-facing proof, operator proof, and platform status routes. It should stay aligned with `metraiyux_0s_site/brain/live-surface-registry.json`.

## Sales Rule

Public sales claims should route buyers to proof surfaces that are live, safe to disclose, and appropriate to the audience. Admin-only setup, credentials, private customer data, and unfinished external-account gates should not be exposed in public sales material.

## Core Routes

- MetrAIyux 0S full system Worker.
- Live proof router.
- ConnectLog + Relay13 operator proof, app, proof receipt, and Relay13 Core Worker.
- Public spectacle site.
- Logo rollout mirror.
- SkyeGateFS27 proof Worker.
- SkyeGateFS27 gate-map alias.
- SkyeGateFS27 ConnectLog + Relay13 gate lane and SkyePay live Stripe store.
- Actual SkyeGate control plane linked from proof.

## Full Live Deployment Ledger

The CEO-facing deployment ledger now lives at `LIVE_DEPLOYMENT_LEDGER.md`, with a vault pointer at `obsidian-vault/10-production/CEO Live Deployment Ledger.md`.

Latest Cloudflare capture on 2026-05-17 found:

- 17 Cloudflare Pages production projects.
- 17 Cloudflare Workers production services across the Cloudflare API inventory and follow-up sweeps.
- 36 earlier live HTTP checks passing, plus MetrAIyux 0S marketing pricing browser proof, ConnectLog + Relay13 production proof, Stripe live lookup-key sync proof, public atlas Stripe-sync browser proof, and the final ConnectLog/0S/FS27 production-infrastructure copy proof.
- Follow-up Worker sweeps added `kaixu-6-7-brain`, `skyegatefs13-super-gate`, `vantacore`, `skydexia-cloudflare-adapter`, and `skydexia-ops-control`; SkyGateFS13 root 404 was patched and redeployed on 2026-05-17.
- Expanded operator-provided Netlify/endpoint map captured 84 deployment rows, 17 endpoint checks, 63 verified-live deployments, 7 protected gates, and 19 attention items. API-level Netlify account inventory still requires Netlify auth. This expanded map is internal.
- New MetrAIyux 0S marketing production deployment: `https://metraiyux-0s-marketing.pages.dev/#pricing`, deployment `3ffe0808-0457-4d77-b3c2-9851030744f7`.
- Legacy MetrAIyux marketing compatibility mirror: `https://metraiyux-marketing.pages.dev/`, deployment `daccdf4e-4dd3-41d1-8f69-f10b33f842a7`; `/index.html` now redirects to `/` and returns HTTP `200`.
- PHX Verified Network production deployment: `https://phx-verified-network.pages.dev/`, deployment `1daa4796-a81a-4c75-967d-df7f019f0918`; Valley Verified now has `/insights/` with seven longform business operating articles, official source notes, diagnostics, metrics, owner worksheets, mistakes to avoid, and only seven major live 0S/company backlinks. The Cloudflare deploy stays under the Pages 20,000-file cap with renderer-backed business URLs plus profile-shard stubs, and production browser QA verified `/insights/`, all seven article routes, and `/business/bobs-smoke-shop-litchfield-park/` with no browser 404s.
- Live deployment ledger HTML: `https://metraiyux-ecosystem-portal.pages.dev/operator/deployment-ledger`, latest portal deployment `cb3f578c-6d95-4cbe-a831-ea39e57cf357`, rebuilt into a live-only Skye UI Deployment Atlas with measured orbit lane controls, search/filter controls, Three.js canvas runtime, GSAP/Lenis motion, 78 public surfaces, 8 live signal checks, Valley Verified longform insights proof, ConnectLog + Relay13 rows, SkyePay live Stripe price evidence, SaaS billing status, corrected desktop hero framing, zero browser-detected orbit overlaps on desktop and mobile, an operator top Vault link that opens `/vault` with HTTP `200`, and visible portal copy cleaned to `SOLEnterprises`.
- Latest synced production Workers: 0S full system deployment `795461c3-5f45-4160-8323-07d7a5e380ae`, FS27 deployment `cbcf8b54-f5ca-42e7-b003-fe6ca984c60a`, and SaaS provisioning deployment `4b2c958d-9039-4f2d-8839-fc1519af483c`.
- Stripe sync evidence: `test-artifacts/stripe-sync/metraiyux-stripe-sync-receipt.json` and `test-artifacts/stripe-sync/metraiyux-stripe-live-checkout-proof.json`; account `acct_1Seml2HEgCmnlKPJ`, 7 products, 13 live prices, 10 0S prices created or replaced, 8 stale prices archived, 3 SkyeGate prices reused, and SkyePay plus direct SaaS Checkout proof passed.
- Stress evidence: `test-artifacts/stress/connectlog-relay13-skyepay-live/stress-report.json` passed with 220 live public/app reads, 51 Relay13 write/read calls, 20 WebSocket upgrades, and no failures; `metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/proof/STRESS_CONCURRENCY_2026-05-17T19-06-19-103Z.json` passed with 608 SkyeRouteX runtime requests and expected lock-contention `409` responses.
- Public production-infrastructure copy evidence: `test-artifacts/connectlog-production-infra-copy/2026-05-17T20-00-53-608Z/browser-qa.json` confirms the live 0S home, ConnectLog app, landing, hub, receipt, proof center, Cabinet Brain, and FS27 gate lane all pass desktop/mobile browser checks with no weak local/offline/internal wording, no console errors, no horizontal overflow, and 120 live stress reads across 0S, Relay13, and FS27 with no failures.
- Skyes Over London Reviews production Pages project: `https://skyes-over-london-reviews.pages.dev/skyes-over-london-reviews-expanded`.

This expanded ledger captures live surfaces that were not fully listed in the older core-route summary, including SkyeMail, SkyeVault, Bob's Smoke Shop preview, SOL Staffing, Neon Rift, Skyes Over London Legal, Skyes Over London Reviews, Skye Design MCP, Empire Pallets, the SkyeSol current public site, and the internal MetrAIyux service Workers.

## Current Route-Fix Queue

This queue is internal only. Do not expose these rows on the public deployment atlas until the URL opens or answers by design.

- Netlify auth is missing in this workspace, so account-side Netlify fixes remain blocked until `NETLIFY_AUTH_TOKEN` is restored.
- Confirmed 404 roots or aliases: `skyeletix.netlify.app`, `local-seo-booster.netlify.app`, `brand-assessmentx.netlify.app`, `industry-playbook-generator.netlify.app`, `skye-landing-page-generator.netlify.app`, `executive-summary-generator.netlify.app`, `skye-socialproof-kit.netlify.app`, `review-request-script-pack-generator.netlify.app`, `skye-valuations-mini-website-report.netlify.app`, `soleledgerconsole.netlify.app`, `skyegate-fs13.netlify.app`, and `getkaixu-api.netlify.app`.
- Pretty-route fixes needed: `skygatefs13-quantumskyes.netlify.app/health` and `/auth-introspect` should route to their live Netlify functions. The repo config now includes `/health` and `/gateway-chat` redirects; it still needs an authenticated Netlify redeploy.
- SkyeSol path fix needed: `skyesol.netlify.app/ae-contractor-network` currently redirects into a loop.

## Review Wall And Intake Routes

- Public review wall: `https://skyes-over-london-reviews.pages.dev/skyes-over-london-reviews-expanded`.
- Client review intake: `https://skyes-over-london-reviews.pages.dev/submit-review.html`.
- 0S review QA queue: `https://skyes-over-london-reviews.pages.dev/operator-review-queue.html`.

Route prospects asking for reviews, testimonials, client proof, social proof, or customer experience to the public review wall. Route clients who want to leave feedback or talk about their experience to the review intake. Route approval, moderation, and production batching to the 0S QA queue.

Review publication rule: submissions are not public proof until they pass 0S QA and five approved unpublished reviews are ready for a production batch.

## Update Ritual

When a route changes, update the source registry JSON, this vault note, the production report, and any proof receipt that cites the old route.
