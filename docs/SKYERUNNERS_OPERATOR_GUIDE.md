# SkyeRunners Operator Guide

SkyeRunners are repo-aware worker agents for the MetrAIyux 0S workspace. They keep the repo knowledge map current, run human-flow QA, refresh brain maps, write local queue/ledger receipts, and help the operator find breakage before customers or buyers do.

This is a repo-local operator system. It does not replace human approval, does not spend on providers by default, and does not deploy production changes by itself.

## Source Of Truth

- Control bridge: `tools/skyerunners.mjs`
- Admin control page: `metraiyux_0s_site/admin/skyerunners.html`
- Generated brain feed: `metraiyux_0s_site/brain/skyerunners.json`
- Generated artifact map: `test-artifacts/skyerunners/knowledge-map.json`
- Runtime queue and ledger: `ops/skyerunners/`
- Command allowlist: `ops/0s-command-registry.json`
- Obsidian brain note: `obsidian-vault/00-command-center/SkyeRunners.md`

## Runner Lanes

- Repo Cartographer: maps repo files, package scripts, operator commands, brain JSON, proof reports, and surface counts.
- Human Flow Runner: uses SkyeCrawler and browser checks to exercise the system like a user.
- Brain Sync Runner: refreshes Obsidian export, private neural map, public-safe map, SkyeVault map, and SkyeRunners map.
- Bug Hunter: runs repo health and proof checks, then ledgers likely defects or missing evidence.
- Vault Watch: keeps SkyeVault repo/change memory attached to 0S without exposing workspace secrets.

## Commands

Build or refresh the SkyeRunners map:

```bash
npm run skyerunners:map
```

Start the local bridge for the admin page:

```bash
npm run skyerunners:control
```

Open the admin page while the 0S site is served:

```text
metraiyux_0s_site/admin/skyerunners.html
```

Run the full knowledge refresh:

```bash
npm run skyerunners:run -- knowledge-refresh
```

Run repo health through the SkyeRunners ledger:

```bash
npm run skyerunners:run -- repo-health
```

Run static human-flow QA:

```bash
npm run skyerunners:run -- crawler-static
```

Check bridge status:

```bash
npm run skyerunners:status
```

## Approval Boundary

Allowed without extra approval:

- Local map generation.
- Local repo health checks.
- Local Obsidian/brain map refresh.
- Local SkyeVault map bridge.
- Static browser QA and crawler proof.
- Queue creation and local ledger writing.

Requires explicit operator approval:

- Paid provider calls or spend-bearing automation.
- Production deploys or DNS changes.
- Credential, token, secret, auth policy, billing, payment, legal, hiring, or customer-impacting changes.
- Any public claim that is not backed by a receipt, source file, live route, or proof report.

## Stress Proof

Latest local stress proof, generated on 2026-05-18:

- `docs/SKYERUNNERS_STRESS_RECEIPT_2026-05-18.md`
- `test-artifacts/skyerunners/stress-final-report.json`
- `test-artifacts/skye-crawler-report.json`
- `metraiyux_0s_site/brain/skyerunners.json`

Recorded result:

- SkyeRunners bridge stress: 286 local operations, 0 failures.
- Queue burst: 40 task writes, verified and cleaned back to 0.
- Browser sanity: admin desktop/mobile, local brain desktop/mobile, operator page, and crawler console all loaded with no console errors and no horizontal overflow.
- Static SkyeCrawler: 647 HTML pages, 874 local refs, 14 checks, 0 failures, 0 warnings.
- Final map: 7,500 repo files, 5 runners, 7 commands.

## Keeping Docs And Maps Current

After changing SkyeRunners code, commands, docs, or Obsidian notes:

```bash
npm run skyerunners:run -- knowledge-refresh
npm run skyerunners:map
```

If the admin page or bridge behavior changes, rerun:

```bash
npm run skyerunners:run -- crawler-static
```

Then record the new result in this guide, `obsidian-vault/00-command-center/SkyeRunners.md`, and the relevant proof artifact.
