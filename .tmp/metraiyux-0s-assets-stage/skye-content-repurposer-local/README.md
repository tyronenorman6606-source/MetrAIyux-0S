# Skye Content Forge Publisher V4

A live/local Skyes Over London AI content command center for scanning approved industry blogs, extracting ideas, generating original Skye-branded assets, saving drafts, scheduling publishing, deploying static blog output, and backing up state so the tool survives file loss.

This app is imported into MetrAIyux 0S as a Free99 feature. Free99 means no charge. It does not mean anonymous access: the browser shell waits for a gate session, and every `/api/*` route requires a 0S, FS27, SkyGate, or local admin gate token before it will run.

See `CHANGELOG.md` for the 2026-05-17 SkyeVault/R2 storage cutover that replaced Google Drive as the primary cloud export lane.

## What this does

- Scans approved sources: Animalz, OpenAI, Google Research, Google DeepMind, NVIDIA, MIT Technology Review AI, Scale AI, and UiPath AI.
- Extracts article titles, headings, descriptions, and usable source notes.
- Generates original Skyes Over London content through OpenAI.
- Saves drafts in `data/drafts.json`.
- Exports Markdown to `/exports` or browser download.
- Uploads Markdown to SkyeVault/R2 when Cloudflare R2 vars are present.
- Keeps Google Drive as an optional legacy target for user OAuth or Shared Drive setups.
- Queues scheduled publish items.
- Publishes to local static blog output, GitHub content commits, Netlify deploy hooks/CLI, Cloudflare Pages deploy hooks/Wrangler, Facebook, Instagram, and LinkedIn when the relevant tokens are present.
- Runs an internal scheduler while the process is alive.
- Exposes `/api/automation/tick` for GitHub Actions, Netlify Scheduled Functions, Cloudflare Cron Triggers, or server cron.
- Backs up drafts, settings, queue, and logs to GitHub.
- Restores state from GitHub if the local files are lost.
- Includes Docker, systemd, PM2, GitHub Actions, Netlify, and Cloudflare scheduler templates.

## Run locally

```bash
cp .env.example .env
# edit .env
node server.js
```

Open:

```text
http://localhost:4313
```

For local review, the gate overlay accepts the localhost-only admin token:

```text
FREE99-CONTENT-LOCAL
```

For production, set long random values for `APP_ACCESS_TOKEN` and `SCHEDULER_API_KEY`. Leave `GATE_SESSION_REQUIRED=1` unless the owner explicitly says this app should run without the gate.

## Smoke test

```bash
npm run smoke
```

## Live / always-on deployment

Read:

```text
docs/LIVE_ALWAYS_ON_DEPLOYMENT.md
```

Best personal setup:

```bash
docker compose up -d --build
```

This runs the server with `restart: unless-stopped` and persists state through mounted `data`, `exports`, and `site-build` folders.

## Required live secrets

Minimum live control plane:

```env
APP_ACCESS_TOKEN=<dashboard-access-token>
SCHEDULER_API_KEY=<scheduler-api-key>
APP_BASE_URL=https://your-live-app.example.com
OPENAI_API_KEY=<openai-api-key>
PUBLISHER_AUTORUN=1
PUBLISHER_POLL_SECONDS=300
BACKUP_TO_GITHUB_ON_TICK=1
```

SkyeVault/R2 export:

```env
CLOUDFLARE_R2_ACCOUNT_ID=<cloudflare-account-id>
CLOUDFLARE_R2_ACCESS_KEY=<r2-access-key>
CLOUDFLARE_R2_SECRET_KEY=<r2-secret-key>
S3_BUCKET=client-drop-vault
SKYE_CONTENT_FORGE_R2_PREFIX=content-forge-exports
```

GitHub backup/recovery:

```env
GITHUB_TOKEN=<github-token>
GITHUB_OWNER=your-owner
GITHUB_REPO=your-repo
GITHUB_BRANCH=main
GITHUB_BACKUP_BRANCH=main
GITHUB_BACKUP_DIR=skye-content-forge-backups
```

## Automation endpoint

External schedulers call:

```text
POST /api/automation/tick
X-App-Token: SCHEDULER_API_KEY
```

Body:

```json
{
  "source": "github-actions",
  "backup": true
}
```

## Recovery endpoint

Preview restore:

```text
POST /api/backup/github/restore
X-App-Token: SCHEDULER_API_KEY
{"apply": false}
```

Apply restore:

```text
POST /api/backup/github/restore
X-App-Token: SCHEDULER_API_KEY
{"apply": true}
```

## Honest boundary

The app is serious as a deployable personal operator. It does not bypass provider requirements. OpenAI generation and SkyeVault/R2 export can run from the root 0S env when those keys are present. GitHub, Netlify, Cloudflare deploys, optional Google Drive, Meta, Instagram, and LinkedIn still require real credentials, permissions, and platform rules. Social posting is wired through official API flows only.
