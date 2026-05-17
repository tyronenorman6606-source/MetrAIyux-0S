# Publishing Architecture

Skye Content Forge V4 uses a Git-first and scheduler-backed architecture.

## Control plane

The Node app is the dashboard and API control plane. It stores drafts, settings, queue, and publish logs under `/data` by default. A live deployment should run behind a process manager: Docker Compose, systemd, PM2, or a managed Node web service.

## Automation spine

There are two scheduler layers:

1. Internal autorun: `PUBLISHER_AUTORUN=1` checks due queue items every `PUBLISHER_POLL_SECONDS`.
2. External scheduler: GitHub Actions, Netlify Scheduled Functions, Cloudflare Worker cron, server cron, or another scheduler calls `/api/automation/tick`.

The external scheduler is the important live piece because it does not depend on a laptop terminal staying open.

## Persistence spine

Primary state files:

- `data/drafts.json`
- `data/settings.json`
- `data/publish-queue.json`
- `data/publish-log.json`

Recovery backup:

- `/api/backup/github` commits snapshots to `GITHUB_BACKUP_DIR`.
- `/api/backup/github/restore` previews or applies the latest snapshot.

## Publishing paths

Recommended path:

1. Generate content.
2. Schedule item.
3. Publish target `github` commits Markdown to `GITHUB_CONTENT_DIR`.
4. Netlify/Cloudflare rebuild from Git.

Direct paths:

- `netlify-hook` triggers a Netlify build hook.
- `cloudflare-hook` triggers a Cloudflare Pages deploy hook.
- `netlify-cli` deploys `site-build` with Netlify CLI.
- `cloudflare-wrangler` deploys `site-build` with Wrangler.
- `google-drive` uploads Markdown to Drive.
- `facebook`, `instagram`, and `linkedin` post through official API tokens.

## Security

Set these for live use:

- `APP_ACCESS_TOKEN`
- `SCHEDULER_API_KEY`

The browser dashboard stores the token in localStorage only for that browser. Protected write endpoints reject requests without the token.

## Recovery procedure

1. Clone/redeploy the repo.
2. Add `.env` secrets.
3. Start the app.
4. Open dashboard.
5. Paste `APP_ACCESS_TOKEN`.
6. Click **Restore from GitHub**.

That restores drafts, settings, queue, and logs.
