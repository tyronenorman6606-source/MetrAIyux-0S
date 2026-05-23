# Skye Content Forge V4 — Always-On Deployment and Recovery

## What changed in V4

This package is now built for live use, not just a terminal session. The app still runs locally, but it now includes production-style runtime controls:

- Dockerfile
- docker-compose.yml with `restart: unless-stopped`
- systemd service template
- PM2 ecosystem template
- Render-style web service template
- GitHub Actions scheduler
- Netlify Scheduled Function
- Cloudflare Worker cron trigger
- `/api/automation/tick` endpoint
- `/api/backup/github` endpoint
- `/api/backup/github/restore` endpoint
- Dashboard access token support
- GitHub backup snapshots for drafts, settings, queue, and logs

## The serious setup

For a personal always-available deployment, use one of these:

1. Small VPS + Docker Compose. This is the most direct and least magical setup.
2. Small VPS + systemd. Good if you do not want Docker.
3. Render/Fly/Railway style Node web service with persistent storage or GitHub backups.
4. Cloud scheduler calling the live app every 15 minutes.

Do not rely on an open Chromebook terminal for automation. That was the weak part.

## Required live env vars

Minimum:

```env
APP_ACCESS_TOKEN=<dashboard-access-token>
SCHEDULER_API_KEY=<scheduler-api-key>
OPENAI_API_KEY=<openai-api-key>
OPENAI_MODEL=gpt-5.4-mini
PUBLISHER_AUTORUN=1
PUBLISHER_POLL_SECONDS=300
BACKUP_TO_GITHUB_ON_TICK=1
APP_BASE_URL=https://your-live-app-url.example.com
```

For GitHub backup and GitHub content commits:

```env
GITHUB_TOKEN=<github-token>
GITHUB_OWNER=your-github-user-or-org
GITHUB_REPO=your-repo
GITHUB_BRANCH=main
GITHUB_CONTENT_DIR=content/blog
GITHUB_BACKUP_DIR=skye-content-forge-backups
GITHUB_BACKUP_BRANCH=main
```

For Netlify/Cloudflare deploy hooks:

```env
NETLIFY_DEPLOY_HOOK_URL=https://api.netlify.com/build_hooks/...
CLOUDFLARE_PAGES_DEPLOY_HOOK_URL=https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...
```

## VPS Docker deployment

```bash
cp .env.example .env
# edit .env
docker compose up -d --build
docker compose logs -f
```

Open:

```text
http://YOUR_SERVER_IP:4313
```

Then add a domain and reverse proxy through Cloudflare Tunnel, Caddy, Nginx, or your VPS panel.

## systemd deployment

Copy the project to `/opt/skye-content-forge`, create a `skye` Linux user, put `.env` in the project folder, then:

```bash
sudo cp ops/skye-content-forge.service /etc/systemd/system/skye-content-forge.service
sudo systemctl daemon-reload
sudo systemctl enable --now skye-content-forge
sudo systemctl status skye-content-forge
```

## GitHub Actions scheduler

Put this project in a GitHub repo. Add repo secrets:

- `APP_BASE_URL`
- `SCHEDULER_API_KEY`

The included `.github/workflows/skye-content-automation.yml` calls your live app every 15 minutes.

## Netlify scheduler

The included `netlify/functions/skye-content-scheduler.mjs` calls your live app every 15 minutes. This is for scheduled automation, not for hosting the long-running Node control plane.

## Cloudflare scheduler

Deploy the worker in `cloudflare/` and set secrets/vars:

```bash
cd cloudflare
npx wrangler secret put SCHEDULER_API_KEY
npx wrangler secret put APP_BASE_URL
npx wrangler deploy
```

The `wrangler.toml` has a 15-minute cron.

## Recovery if you lose the files

If GitHub backup is configured:

1. Redeploy the app from the repo.
2. Add the same GitHub env vars.
3. Open the dashboard.
4. Paste the `APP_ACCESS_TOKEN`.
5. Click **Restore from GitHub**.

The app restores:

- `data/drafts.json`
- `data/publish-queue.json`
- `data/publish-log.json`
- `data/settings.json`

That is the recovery spine.

## Honest boundary

Cloud schedulers do not make a dead app magically alive unless the app is hosted somewhere reachable. The correct model is: hosted app stays reachable, process manager restarts it if it crashes, external scheduler calls `/api/automation/tick`, and GitHub backup preserves the working state.
