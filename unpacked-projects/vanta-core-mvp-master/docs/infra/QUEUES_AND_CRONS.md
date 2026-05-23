# VantaCore Infrastructure: Queues, Crons, and Background Jobs

**Version:** 1.0  
**Target Platforms:** Cloudflare Workers + Pages, Netlify Functions + Scheduled Functions  

---

## Job Registry

All background jobs are defined in `src/lib/jobs/index.ts`.

| Job Name | Cron | Purpose |
|----------|------|---------|
| `revenue-rescue` | `*/15 * * * *` | Stale leads + missed-call recovery |
| `call-to-content` | `0 */6 * * *` | Transcript → knowledge nuggets / FAQ |
| `reactivation-campaign` | `0 9 * * *` | Win-back sequence enrollment |
| `analytics-materialize` | `0 * * * *` | Dashboard KPI pre-aggregation |
| `owner-digest` | `0 8 * * *` | Daily owner summary email queue |
| `competitor-radar` | `0 */12 * * *` | Competitor monitoring refresh |
| `trust-ledger-compact` | `0 2 * * 0` | Weekly audit compaction |

---

## Cloudflare Workers (Recommended for Edge)

### Cron Triggers

Add to `wrangler.toml`:

```toml
[triggers]
crons = [
  "*/15 * * * *",   # revenue-rescue
  "0 */6 * * *",    # call-to-content
  "0 9 * * *",      # reactivation-campaign
  "0 * * * *",      # analytics-materialize
  "0 8 * * *",      # owner-digest
  "0 */12 * * *",   # competitor-radar
  "0 2 * * 0",      # trust-ledger-compact
]
```

In your Worker entrypoint, route the `scheduled` event:

```typescript
export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const ctx = { triggeredAt: new Date(), isDryRun: false };
    switch (controller.cron) {
      case '*/15 * * * *':  await runJob('revenue-rescue', ctx); break;
      case '0 */6 * * *':   await runJob('call-to-content', ctx); break;
      // ... etc
    }
  }
};
```

### Queues (Optional)

For high-volume workloads (lead exchange, bulk email), use **Cloudflare Queues**:

```toml
[[queues.producers]]
binding = "VANTA_JOB_QUEUE"
queue = "vanta-jobs"

[[queues.consumers]]
binding = "VANTA_JOB_QUEUE"
queue = "vanta-jobs"
max_batch_size = 10
max_batch_timeout = 30
```

Enqueue from API routes:

```typescript
await env.VANTA_JOB_QUEUE.send({ job: 'revenue-rescue', tenantId, payload });
```

---

## Netlify Scheduled Functions

Create `netlify/functions/scheduled/revenue-rescue.ts`:

```typescript
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { runJob } from '@/lib/jobs';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const result = await runJob('revenue-rescue', { triggeredAt: new Date(), isDryRun: false });
  return { statusCode: 200, body: JSON.stringify(result) };
};
```

Register in `netlify.toml`:

```toml
[functions]
  directory = "netlify/functions"

[functions.scheduled]
  # Netlify scheduled functions use the same handler but are triggered by the platform cron UI
```

**Note:** Netlify scheduled functions require the **Pro** plan or higher. For lower plans, use an external cron service (GitHub Actions, QStash, or a simple uptime-monitor ping).

---

## GitHub Actions Cron (Fallback)

If your platform does not support native cron triggers, use GitHub Actions:

```yaml
# .github/workflows/jobs.yml
name: VantaCore-Background-Jobs
on:
  schedule:
    - cron: '*/15 * * * *'   # revenue-rescue
    - cron: '0 * * * *'      # analytics
jobs:
  run-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx tsx scripts/run-job.ts revenue-rescue
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Create `scripts/run-job.ts`:

```typescript
import { runJob } from '../src/lib/jobs';
const name = process.argv[2];
runJob(name as any, { triggeredAt: new Date(), isDryRun: false })
  .then(r => { console.log(r); process.exit(r.success ? 0 : 1); })
  .catch(e => { console.error(e); process.exit(1); });
```

---

## Media Ingestion / Storage

### Upload Flow

1. Client requests a **presigned upload URL** from `POST /api/media/presigned` (stub).
2. Server validates tenant, category, and file type.
3. Server calls `createPresignedUploadUrl()` from `src/lib/storage.ts`.
4. Client uploads directly to S3/R2.
5. Client calls `POST /api/media/confirm` with the returned key.
6. Server calls `confirmUpload()` and persists the asset record.

### CORS Requirements

**R2:** Set CORS rules in the R2 bucket dashboard to allow `PUT` from your `NEXT_PUBLIC_APP_URL`.

**S3:** Add bucket CORS policy:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedOrigins": ["https://your-domain.com"],
    "MaxAgeSeconds": 300
  }
]
```

---

## Observability

### Health Probes

- **Liveness:** `GET /api/health` — returns 200 if the server is up.
- **Readiness:** `GET /api/health?ready=1` — returns 200 only if DB is reachable.
- **Deep:** `GET /api/health?deep=1` — checks all configured providers. **Requires** `Authorization: Bearer <HEALTH_CHECK_SECRET>`.

### Job Observability

- Every job run is persisted to `automation_runs`.
- `GET /api/health?deep=1` includes the last-run timestamp per job.
- Dashboard: query `automation_runs` for success/failure rates.

### Alerting Rules (Sentry / PagerDuty)

1. If `/api/health?ready=1` returns 503 for >2 minutes → page on-call.
2. If `automation_runs` failure rate >10% in 1h → Slack alert.
3. If `proof_ledger` compaction fails 2 weeks in a row → email compliance officer.

---

*VantaCore Infrastructure by Skyes Over London*
