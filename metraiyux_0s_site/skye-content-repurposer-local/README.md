# Skye Content Forge Publisher V4

A live/local Skyes Over London AI content command center for scanning approved industry blogs, extracting ideas, generating original Skye-branded assets, saving drafts, scheduling publishing, deploying static blog output, and backing up state so the tool survives file loss.

## What this does

- Scans approved sources: Animalz, OpenAI, Google Research, Google DeepMind, NVIDIA, MIT Technology Review AI, Scale AI, and UiPath AI.
- Extracts article titles, headings, descriptions, and usable source notes.
- Generates original Skyes Over London content through OpenAI.
- Saves drafts in `data/drafts.json`.
- Exports Markdown to `/exports` or browser download.
- Uploads Markdown to Google Drive when Drive vars are present.
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

The app is serious as a deployable personal operator. It does not bypass provider requirements. GitHub, Netlify, Cloudflare, Google Drive, Meta, Instagram, LinkedIn, and OpenAI all require real credentials, permissions, and platform rules. Social posting is wired through official API flows only.
