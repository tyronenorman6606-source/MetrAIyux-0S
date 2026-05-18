---
title: SkyeRunners
brain: true
tags:
  - metraiyux
  - skyerunners
  - operator
  - brain
  - qa
---

# SkyeRunners

SkyeRunners are repo-aware worker agents for MetrAIyux 0S. They do not replace the human operator. They run local, allowlisted proof and knowledge-map lanes so the operator can catch broken routes, stale brain data, missing proof, and repo drift before customers or buyers find it.

## Control Surface

- Admin page: `metraiyux_0s_site/admin/skyerunners.html`
- Browser brain feed: `metraiyux_0s_site/brain/skyerunners.json`
- Local bridge: `tools/skyerunners.mjs`
- Queue and ledger: `ops/skyerunners/`
- Artifact map: `test-artifacts/skyerunners/knowledge-map.json`
- Operator guide: `docs/SKYERUNNERS_OPERATOR_GUIDE.md`

## Runner Lanes

- Repo Cartographer keeps the repo inventory, command map, proof map, and brain chunks current.
- Human Flow Runner uses SkyeCrawler and browser QA to act like a user across public, admin, operator, and app surfaces.
- Brain Sync Runner refreshes Obsidian sync, private neural map, public-safe neural map, SkyeVault repo memory, and SkyeRunners chunks.
- Bug Hunter runs repo health and proof checks, then records defect candidates and missing-evidence notes.
- Vault Watch keeps SkyeVault repo/change memory attached to 0S without exposing workspace secrets.

## Approval Boundary

SkyeRunners can run complete local proof passes without tiny arbitrary QA caps. Spend-bearing provider calls, production deploys, billing changes, credential changes, payment activity, legal or hiring decisions, and customer-impacting changes still require explicit operator approval and a receipt.

## Latest Stress Proof

The 2026-05-18 local stress pass recorded:

- 286 SkyeRunners bridge, browser, and queue operations with 0 failures.
- 40 queue writes verified and cleaned back to 0.
- Admin desktop/mobile, local brain desktop/mobile, operator page, and crawler console loaded with no console errors and no horizontal overflow.
- Static SkyeCrawler covered 647 HTML pages and 874 local references with 14 checks, 0 failures, and 0 warnings.

Proof files:

- `docs/SKYERUNNERS_STRESS_RECEIPT_2026-05-18.md`
- `test-artifacts/skyerunners/stress-final-report.json`
- `test-artifacts/skye-crawler-report.json`
- `metraiyux_0s_site/brain/skyerunners.json`

## Operator Commands

Use the repo-local command runner or package scripts:

```bash
npm run skyerunners:map
npm run skyerunners:control
npm run skyerunners:run -- knowledge-refresh
npm run skyerunners:run -- repo-health
npm run skyerunners:run -- crawler-static
```

## Routing Rule

Questions about SkyeRunners route to Orion Hayes for technology/system ownership and Victor Saint for QA/proof review. 0meg4kAI reviews any customer, tenant, credential, spend, or production boundary before a runner is allowed to touch it.
