# Setup — Skye Content Forge V4

## 1. Local app

```bash
cp .env.example .env
node server.js
```

Open `http://localhost:4313`.

## 2. OpenAI

Set:

```env
OPENAI_API_KEY=<openai-api-key>
OPENAI_MODEL=gpt-5.4-mini
```

## 3. Google Drive upload

Create a Google Cloud service account, enable Google Drive API, share your target Drive folder with the service-account email, and set:

```env
GOOGLE_DRIVE_FOLDER_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY="<escaped-google-service-account-private-key>"
```

## 4. GitHub publishing

Create a fine-grained GitHub token with contents read/write access for the target repo.

```env
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_BRANCH=main
GITHUB_CONTENT_DIR=content/blog
```

## 5. Netlify

Preferred: connect Netlify to the same GitHub repo.

Optional deploy hook:

```env
NETLIFY_DEPLOY_HOOK_URL=
```

Optional CLI direct deploy:

```env
NETLIFY_AUTH_TOKEN=
NETLIFY_SITE_ID=
```

## 6. Cloudflare Pages

Preferred: connect Cloudflare Pages to the same GitHub repo.

Optional deploy hook:

```env
CLOUDFLARE_PAGES_DEPLOY_HOOK_URL=
```

Optional Wrangler direct deploy:

```env
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_PAGES_PROJECT_NAME=
CLOUDFLARE_PAGES_BRANCH=main
```

## 7. Social APIs

Facebook Pages:

```env
META_GRAPH_API_VERSION=v25.0
META_PAGE_ACCESS_TOKEN=
FACEBOOK_PAGE_ID=
```

Instagram:

```env
INSTAGRAM_BUSINESS_ACCOUNT_ID=
INSTAGRAM_DEFAULT_IMAGE_URL=https://your-domain.com/social/default-image.jpg
```

LinkedIn:

```env
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_AUTHOR_URN=urn:li:organization:123456789
LINKEDIN_VISIBILITY=PUBLIC
```

## 8. Live dashboard security

For live deployment, protect write/generation endpoints:

```env
APP_ACCESS_TOKEN=<dashboard-access-token>
SCHEDULER_API_KEY=<scheduler-api-key>
APP_BASE_URL=https://your-live-app.example.com
```

Paste `APP_ACCESS_TOKEN` into the dashboard token field. External schedulers use `SCHEDULER_API_KEY`.

## 9. Scheduler

Automated internal scheduler:

```env
PUBLISHER_AUTORUN=1
PUBLISHER_POLL_SECONDS=300
```

External scheduler endpoint:

```text
POST /api/automation/tick
X-App-Token: SCHEDULER_API_KEY
```

Use one or more of the included scheduler templates:

- `.github/workflows/skye-content-automation.yml`
- `netlify/functions/skye-content-scheduler.mjs`
- `cloudflare/scheduler-worker.mjs`
- server cron calling `node scripts/run-scheduler-once.mjs`

## 10. GitHub backup and recovery

```env
BACKUP_TO_GITHUB_ON_TICK=1
GITHUB_BACKUP_DIR=skye-content-forge-backups
GITHUB_BACKUP_BRANCH=main
```

Dashboard buttons:

- **Backup to GitHub** writes a fresh snapshot.
- **Restore from GitHub** previews then applies a snapshot.

For the full always-on plan, read `docs/LIVE_ALWAYS_ON_DEPLOYMENT.md`.
