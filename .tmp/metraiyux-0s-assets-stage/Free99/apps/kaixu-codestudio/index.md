# kAIxu CodeStudio Pro — Executable Platform Command Center

kAIxu CodeStudio Pro is a SOLEnterprises / Skyes Over London platform bundle with a public product website, offline-first PWA workspace, and executable Node backend engine.

## What the website now presents

The root website is now a premium landing surface that explains the actual platform implementation without opening on a dense internal control dump. It routes users into `/app/`, links to client-appropriate proof artifacts, exposes health and manifest files, and includes SEO/AI discovery files.

## Implemented platform lanes

- Action-registry workflow execution.
- Executable provider-pack actions.
- Signed upstream-claim verification.
- Webhook signature helpers, idempotency, dispatch rules, and replay receipts.
- Storage adapters for JSON, SQLite, Postgres/Neon, and Cloudflare D1.
- Durable queue controls with locks, retries, cancellation, stale-lock recovery, and dead letters.
- Operator Platform Console.
- Fixture-mode smoke proof and package receipts.

## Main paths

- `/` — public landing website.
- `/app/` — platform application.
- `/reports/` — report index.
- `/platform/platform-manifest.json` — platform manifest.
- `/platform/proof/backend-smoke-report.json` — backend proof report.
- `/llms.txt` — AI-readable summary.
- `/sitemap.xml` and `/robots.txt` — discovery files.

## Run locally

```bash
npm run platform:server
```

Then open the local server and launch `/app/`.

## Verify

```bash
npm run check
npm run smoke:fixture
```

Live-provider proof requires real provider environment variables. Unconfigured live providers block instead of returning fake success.
