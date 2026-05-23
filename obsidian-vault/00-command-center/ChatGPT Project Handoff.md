---
title: ChatGPT Project Handoff
brain: true
updated: 2026-05-17T14:44:28Z
tags:
  - metraiyux
  - handoff
  - architecture
  - live-proof
  - chatgpt
---

# ChatGPT Project Handoff

Use this note as the compact project brain for ChatGPT. It is proof-first, public-safe, and current as of 2026-05-17T14:44:28Z UTC.

## Operator Instruction For ChatGPT

You are helping with the MetrAIyux 0S repo at `/workspaces/MetrAIyux-0S`. Treat this handoff as the current map of the project. Keep all claims tied to source files, live URLs, proof receipts, or explicit blockers. Do not invent client outcomes, credentials, legal status, payment status, or autonomous authority. When building or auditing frontend surfaces in this repo, use the repo-local QuantumSkyes MCP flow from `.mcp.json` with `npm run mcp:mine -- <target-folder>` and read the generated `MCP_TOOLING_RECEIPT.json`.

## What The Project Is

MetrAIyux 0S is a protected autonomous company operating system and client-deployable command deck. It combines a public website, buyer proof router, owner/admin command surfaces, customer SaaS workspaces, local browser brain, named operating-brain routing, Cloudflare Worker kits, SkyeGateFS27 identity/event gating, SkyePay storefront proof, proof ledgers, and Obsidian vault memory.

SkyeGateFS27 is the gate layer: identity, user/dashboard actions, event proof, key control, Skyes/SkyePay storefront routing, and bridge proof for MetrAIyux. MetrAIyux 0S is the operating deck that consumes those proof/gate surfaces and routes business work into cabinet brains, approval gates, client surfaces, and receipts.

## Source Architecture

- `metraiyux_0s_site/` is the main deployable 0S site and command deck. It contains static public pages, admin pages, SaaS/customer portal pages, local brain assets, Cloudflare Worker kits, CROWN/NEXUS/Sentinel/autonomous business layers, proof pages, calculators, sales enablement, governance, pricing, client OS, and brain JSON registries.
- `metraiyux_0s_site/brain/` is the browser-local knowledge layer. It includes `knowledge-base.json`, `obsidian-sync.json`, `live-surface-registry.json`, `persona-brains.json`, `site-operator-brain.json`, `automation-brain.json`, `sales-offer-registry.json`, legal sync, marketplace sync, and local-brain UI/runtime files.
- `SkyeGateFS27/` is the gate and SkyePay system. It contains the live gate pages, proof pages, Cloudflare Worker, SkyePay store/admin/client assets, pricing registry, runtime store, openapi spec, SQL migrations, smoke tests, and deployment scripts.
- `MCP/` is the local QuantumSkyes/Skye design MCP server and design tooling. It exposes pattern packs, recipes, audits, quality gates, stack gates, logo/design manifests, browser proof expectations, and production-ledger access.
- `obsidian-vault/` is the private operator memory layer. Notes with `brain: true` export into `metraiyux_0s_site/brain/obsidian-sync.json` and into the public-safe neural map. The private graph lives in `obsidian-vault/_neural-map/`.
- `client-app-factory/` is the client deployment engine for generated apps. It includes the factory server, scan engine, app generation, proof ledger, browser proof, service worker, manifest, storage records, and API/browser smoke tests.
- `marketing/` holds public spectacle/marketing surfaces, MetrAIyux marketing, review wall assets, and related deployable buyer-facing pages.
- `metraiyux-portal/`, `SkyeVault-Drop/`, `metraiyux_0s_site/_platform-sources/`, and `metraiyux_0s_site/live/` hold ecosystem portals, vault/drop systems, imported product packages, live surface source packages, and proof-heavy product work.

## Brain Architecture

The hard source of truth currently enumerates 16 named persona profiles in `metraiyux_0s_site/brain/persona-brains.json` plus the Local Brain Mesh (725-chunk on-device knowledge base), totaling 17. Public claims may use "17 brain personas."

Current enumerated profiles:

- Site Operator Brain
- 0meg4kAI Security / QA Assistant Brain
- Central Company Command Brain
- Gray London Skyes Brain
- Marcus Vale Brain
- Celeste Monroe Brain
- Adrian Cross Brain
- Naomi Sterling Brain
- Julian Mercer Brain
- Sienna Brooks Brain
- Orion Hayes Brain
- Valentina Reyes Brain
- Donovan Pierce Brain
- Helena Ward Brain
- Victor Saint Brain
- Amara Voss Brain

Routing standard: Site Operator classifies incoming work, selects primary and secondary brains, applies human approval gates, creates local task/event/proof receipts, and routes risky work through 0meg4kAI/security or the relevant cabinet brain. Money movement, contracts, hiring, regulated advice, public claims, external sends, and production publishing require human approval.

## Live Production Proof

Canonical live deployment ledger: `LIVE_DEPLOYMENT_LEDGER.md`.

As of the 2026-05-16 ledger, Cloudflare production had 24 live deployment surfaces: 13 Pages projects and 11 Workers. The ledger recorded 36 live HTTP checks with 0 failures. In this session on 2026-05-17T14:44:28Z UTC, 24 core URLs were rechecked with `curl -L` and all returned HTTP 200.

Key live Pages surfaces:

- Skyes Over London Reviews: `https://skyes-over-london-reviews.pages.dev/`
- Bob's Smoke Shop preview: `https://bobs-smoke-shop-metraiyux-preview.pages.dev/`
- MetrAIyux Ecosystem Portal: `https://metraiyux-ecosystem-portal.pages.dev/`
- SOL Staffing agency site: `https://sol-staffing-agency-site.pages.dev/`
- SOL Staffing marketing: `https://sol-staffing-marketing.pages.dev/`
- MetrAIyux 0S client preview: `https://metraiyux-0s-client-preview.pages.dev/`
- MetrAIyux 0S public spectacle: `https://metraiyux-0s-public-spectacle.pages.dev/`
- Skyes Over London Legal: `https://skyes-over-london-legal.pages.dev/`
- CitadelDB Ultimate: `https://citadeldb-ultimate.pages.dev/`
- Skye Design MCP: `https://skye-design-mcp.pages.dev/`
- MetrAIyux 0S marketing: `https://metraiyux-0s-marketing.pages.dev/`
- MetrAIyux 0S logo rollout: `https://metraiyux-0s-logo-rollout.pages.dev/`

Key live Workers:

- MetrAIyux 0S full system: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/`
- Sovereign SaaS provisioning worker: `https://sovereign-saas-provisioning-worker.graylondonskyes.workers.dev/`
- SkyeVault drop: `https://skyevault-drop.graylondonskyes.workers.dev/`
- SkyeMail platform: `https://skyemail-platform.graylondonskyes.workers.dev/`
- SkyeGateFS27 / CitadelDB: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/`
- Sovereign 13 Site Operator Quantum: `https://sovereign-13-site-operator-quantum.graylondonskyes.workers.dev/`
- Admin Automation Brain: `https://admin-automation-brain.graylondonskyes.workers.dev/`
- CROWN Site Operator: `https://crown-site-operator.graylondonskyes.workers.dev/`
- Sovereign 13 Cabinet NEXUS Operator: `https://sovereign-13-cabinet-nexus-operator.graylondonskyes.workers.dev/`
- Sovereign 13 Cabinet Sentinel Operator: `https://sovereign-13-cabinet-sentinel-operator.graylondonskyes.workers.dev/`
- 0meg4kAI Security Gateway: `https://omeg4kai-security-gateway.graylondonskyes.workers.dev/`

## Consistent Proof Signals

- MetrAIyux production E2E was previously recorded at 71 checks, 0 failures, and 0 warnings, with screenshots under `test-artifacts/live-e2e-metraiyux/` when present in the working copy.
- The live proof router is at `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/live-proof-router.html`.
- The live surface registry is `metraiyux_0s_site/brain/live-surface-registry.json`; current version is `2026-05-17-live-review-intake-routing`.
- SkyeGateFS27 proof routes are `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gate-proofx.html`, `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gate-map.html`, and `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/store`.
- SkyePay production proof in the ledger says the store returned 61 offers, 50 repo-registry checkout imports, no horizontal overflow, and a live Stripe Checkout `cs_live` handoff. Bob's client lane was intentionally simplified to one free tester-week handoff without public store/ledger/catalog language.
- Skyes Over London Reviews proof says the production page returned HTTP 200, had no console errors, no horizontal overflow, no fake `Approved` text, no `Name Withheld` text, no synthetic/placeholder/client-approval status text, 115 review cards, 115 full detail pages, a live desktop/mobile Three.js atlas, 6 infrastructure links on the first detail page, and `window.__skyeReviewAtlas.active === true`.
- Review routing rule: prospects asking for reviews/social proof go to the public review wall; clients who want to leave feedback go to `submit-review.html`; publication is not proof until 0S QA confirms consent, public-name preference, category fit, and proof safety, then five approved unpublished reviews are batched for production.
- MCP design/proof receipts are present for recent work including `marketing/metraiyux-0s/`, `retired over3arth import `, `metraiyux_0s_site/`, `MCP/`, `empire-pallets-v3-app/`, `bobs-smoke-shop-mcp-redo/`, `MCP/skye-design-lab/`, `metraiyux_0s_site/_platform-sources/skyes-over-london-lc/`, `SkyeGateFS27/`, and `client-app-factory/`.
- Skyes Over London LC proof atlas receipt on 2026-05-17 records MCP audit success, desktop/mobile browser QA, a SkyeVault package receipt, and a scanner exclusion for `login.html` because it matched a Google API key pattern.

## Known Boundaries And Blockers

- The system routes, drafts, stores receipts, and proves surfaces; it does not autonomously sign contracts, move money, hire/fire, file legal documents, provide regulated advice, publish public claims, or bypass human approval.
- Do not expose admin tokens, database URLs, mirror secrets, API keys, private setup instructions, reviewer emails, or owner-only admin playbooks in public outputs.
- Node OS local prep is done, but full ISO build and boot proof need a larger build host and hardware profile.
- Citadel Forge local stack is healthy, but production domains, DNS, auth policy, real Stripe price IDs, runner registration, and backup/restore proof are external-account gates.
- Client Drop Vault local app checks pass, but live Drive destination proof needs a Shared Drive/user-owned folders or domain-wide delegation because service-account quota blocked destination writes.
- Some ledger artifact paths may not exist in a partial checkout; treat `LIVE_DEPLOYMENT_LEDGER.md`, `metraiyux_0s_site/brain/live-surface-registry.json`, current MCP receipts, and fresh HTTP checks as the current proof anchors available in this workspace.

## Commands ChatGPT Should Know

- Sync Obsidian brain export: `npm run brain:sync:obsidian`
- Generate private Obsidian neural map: `npm run obsidian:graph`
- Generate public-safe neural map: `npm run obsidian:web-graph`
- Serve MetrAIyux site locally: `npm run skye:serve:site`
- Static crawl QA: `npm run skye:crawl:static`
- Live crawl QA: `npm run skye:crawl:live`
- Repo health: `npm run repo:health`
- MCP mining for a target folder: `npm run mcp:mine -- <target-folder>`
- SkyeSol current public site MCP default: `npm run mcp:skyesol`

## How To Answer Future Questions

Use proof-first language. Start with what is live, what is local-only, what is blocked, and what evidence exists. When describing architecture, separate MetrAIyux 0S, SkyeGateFS27, MCP, Obsidian/local brain, client-app-factory, and Cloudflare Workers/Pages. When the user asks for public copy, keep it buyer-safe and do not overclaim autonomy, legal authority, payments, client results, or review approval.
