# KaixuPush (Netlify Deploy Proxy) — Runbook (V6)

KaixuPush deploys a file set to a Netlify Site using digest deploys.
- Init deploy with path→sha1 map
- Upload required digests (direct or chunked)
- Background upload for large files
- Async deploy completion worker
- Scheduled cleanup + retry engine

## Endpoints (Kaixu Key required)
- POST push-init
- PUT  push-upload
- PUT  push-upload-chunk
- POST push-upload-complete
- GET  push-file-status
- POST push-complete (async default)
- GET  push-status

## Scheduled Jobs
- push-job-retry: every 5 minutes
- push-chunk-cleanup: daily

## Environment Variables (reliable production)
- JOB_WORKER_SECRET (required)
- PUSH_NETLIFY_MAX_DEPLOYS_PER_MIN / DAY (rate pacing)
- PUSH_JOB_MAX_ATTEMPTS, PUSH_JOB_RETRY_BASE_MS, PUSH_JOB_RETRY_MAX_MS
- PUSH_CHUNK_RETENTION_HOURS

## Env Website Auto-Rebuild

The admin env website is tied to `env.ultimate.template`.

- Netlify build command runs `npm run build`, which validates the ultimate env and writes `docs/proof/ENV_WEBSITE_SYNC.json`.
- GitHub Actions workflow `.github/workflows/skygate-env-website-sync.yml` runs on env/template/website changes.
- On pushes, the workflow calls `npm run deploy:hook` when the repository secret `SKYGATEFS27_NETLIFY_BUILD_HOOK_URL` exists.
- Manual deploy scripts also run `npm run build` before building Netlify Functions.

To enable hands-free deploys, create a Netlify Build Hook for the SkyeGateFS27 site, then add its URL as a GitHub Actions secret named `SKYGATEFS27_NETLIFY_BUILD_HOOK_URL`.
