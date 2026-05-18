# SkyeRunners Stress Receipt - 2026-05-18

## Scope

Local-only SkyeRunners stress proof for the repo-aware worker control lane.

This receipt covers:

- SkyeRunners bridge reads and writes.
- Queue creation and cleanup.
- Admin/operator/local-brain browser surfaces.
- Static SkyeCrawler human-flow QA.
- Final SkyeRunners map refresh.

No paid provider calls, production deploys, credential changes, billing changes, payment actions, or customer-impacting operations were run.

## Commands And Routes

Core commands:

```bash
npm run skyerunners:run -- crawler-static
npm run skyerunners:map
```

Local routes checked:

- `http://127.0.0.1:4176/status`
- `http://127.0.0.1:4199/admin/skyerunners.html`
- `http://127.0.0.1:4199/operator/index.html`
- `http://127.0.0.1:4199/local-brain.html`
- `http://127.0.0.1:4199/operator/skye-crawler.html`

## Results

SkyeRunners bridge/browser/queue stress:

- Operations: 286
- Failures: 0
- Queue writes: 40
- Queue cleanup result: 0 remaining stress tasks
- Browser pages: admin desktop/mobile, brain desktop/mobile, operator desktop, crawler console
- Browser console errors: 0
- Horizontal overflow: 0 checked-page failures

Static SkyeCrawler:

- HTML inventory: 647 pages
- Local references: 874 href/src refs
- Checks: 14
- Failures: 0
- Warnings: 0
- Started: `2026-05-18T00:24:11.951Z`
- Finished: `2026-05-18T00:28:04.923Z`

Final SkyeRunners map:

- Generated: `2026-05-18T00:29:29.572Z`
- Repo files mapped: 7,500
- Runners: 5
- Allowlisted commands: 7
- Queue: 0

## Artifact Paths

Generated proof artifacts:

- `test-artifacts/skyerunners/stress-final-report.json`
- `test-artifacts/skyerunners/enqueue-stress-corrected.json`
- `test-artifacts/skyerunners/knowledge-map.json`
- `test-artifacts/skye-crawler-report.json`
- `metraiyux_0s_site/brain/skyerunners.json`

Tracked documentation:

- `docs/SKYERUNNERS_OPERATOR_GUIDE.md`
- `docs/SKYERUNNERS_STRESS_RECEIPT_2026-05-18.md`
- `obsidian-vault/00-command-center/SkyeRunners.md`

## Interpretation

The SkyeRunners lane is locally operational for admin control, map refresh, queue writes, repo health, static browser QA, and local-brain integration.

The lane is not proof of autonomous production authority. Spend-bearing providers, production mutation, billing, credentials, payment, legal, hiring, and customer-impacting work remain explicit operator-approval gates.
