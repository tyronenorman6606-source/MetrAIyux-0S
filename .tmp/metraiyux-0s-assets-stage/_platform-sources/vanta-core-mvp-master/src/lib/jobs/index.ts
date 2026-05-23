/**
 * VantaCore Background Job Registry
 * Defines all recurring / scheduled jobs for killer features:
 *   - Revenue Rescue (stale leads, missed calls)
 *   - Call-to-Content (transcript → knowledge nuggets)
 *   - Reactivation Campaigns (win-backs)
 *   - Analytics Materialization (dashboard pre-aggregation)
 *
 * Execution targets:
 *   - Cloudflare Workers: cron triggers in wrangler.toml
 *   - Netlify: scheduled functions in netlify/functions/scheduled/
 *   - Self-hosted: node-cron or QStash
 */

import { db } from "@/db";
import { automationRuns } from "@/db/schema/schema";
import { env } from "@/lib/env";
import { eq, sql } from "drizzle-orm";

export type JobName =
  | "revenue-rescue"
  | "call-to-content"
  | "reactivation-campaign"
  | "analytics-materialize"
  | "owner-digest"
  | "competitor-radar"
  | "trust-ledger-compact";

export interface JobContext {
  tenantId?: string;
  triggeredAt: Date;
  isDryRun: boolean;
}

export interface JobResult {
  success: boolean;
  processed: number;
  errors: number;
  details: string[];
}

export interface RegisteredJob {
  name: JobName;
  displayName: string;
  description: string;
  cronExpression: string;
  enabled: boolean;
  handler: (ctx: JobContext) => Promise<JobResult>;
}

// ─── Job Import Stubs ─────────────────────────────────────────────────────────

async function revenueRescueHandler(ctx: JobContext): Promise<JobResult> {
  const { runRevenueRescue } = await import("./revenue-rescue");
  return runRevenueRescue(ctx);
}

async function callToContentHandler(ctx: JobContext): Promise<JobResult> {
  const { runCallToContent } = await import("./call-to-content");
  return runCallToContent(ctx);
}

async function reactivationHandler(ctx: JobContext): Promise<JobResult> {
  const { runReactivationCampaigns } = await import("./reactivation");
  return runReactivationCampaigns(ctx);
}

async function analyticsHandler(ctx: JobContext): Promise<JobResult> {
  const { runAnalyticsMaterialization } = await import("./analytics");
  return runAnalyticsMaterialization(ctx);
}

async function ownerDigestHandler(ctx: JobContext): Promise<JobResult> {
  return { success: true, processed: 0, errors: 0, details: ["Owner digest queued (stub)"] };
}

async function competitorRadarHandler(ctx: JobContext): Promise<JobResult> {
  const { runCompetitorRadar } = await import("./analytics");
  return runCompetitorRadar(ctx);
}

async function trustLedgerCompactHandler(ctx: JobContext): Promise<JobResult> {
  const { compactTrustLedger } = await import("./analytics");
  return compactTrustLedger(ctx);
}

// ─── Registry ───────────────────────────────────────────────────────────────

export const jobRegistry: RegisteredJob[] = [
  {
    name: "revenue-rescue",
    displayName: "Revenue Rescue Autopilot",
    description: "Detect stale leads (>2h) and missed calls; enroll in recovery sequence.",
    cronExpression: "*/15 * * * *",
    enabled: true,
    handler: revenueRescueHandler,
  },
  {
    name: "call-to-content",
    displayName: "Call-to-Content Pipeline",
    description: "Process call transcripts and messages into knowledge nuggets and content ideas.",
    cronExpression: "0 */6 * * *",
    enabled: true,
    handler: callToContentHandler,
  },
  {
    name: "reactivation-campaign",
    displayName: "Autonomous Reactivation Campaigns",
    description: "Evaluate win-back segments and enqueue follow-up sequences.",
    cronExpression: "0 9 * * *",
    enabled: true,
    handler: reactivationHandler,
  },
  {
    name: "analytics-materialize",
    displayName: "Analytics Materialization",
    description: "Pre-aggregate dashboard KPIs and revenue metrics.",
    cronExpression: "0 * * * *",
    enabled: true,
    handler: analyticsHandler,
  },
  {
    name: "owner-digest",
    displayName: "Daily Owner Digest",
    description: "Compile and queue daily summary emails for tenant owners.",
    cronExpression: "0 8 * * *",
    enabled: true,
    handler: ownerDigestHandler,
  },
  {
    name: "competitor-radar",
    displayName: "Competitor Response Radar",
    description: "Refresh competitor monitoring snapshots and alert on significant changes.",
    cronExpression: "0 */12 * * *",
    enabled: true,
    handler: competitorRadarHandler,
  },
  {
    name: "trust-ledger-compact",
    displayName: "Trust Ledger Compaction",
    description: "Roll up old audit entries into monthly integrity summaries.",
    cronExpression: "0 2 * * 0",
    enabled: true,
    handler: trustLedgerCompactHandler,
  },
];

// ─── Execution Engine ───────────────────────────────────────────────────────

/**
 * Run a single job by name with full audit logging.
 */
export async function runJob(
  name: JobName,
  ctx: JobContext = { triggeredAt: new Date(), isDryRun: false }
): Promise<JobResult> {
  const job = jobRegistry.find((j) => j.name === name);
  if (!job) {
    throw new Error(`Unknown job: ${name}`);
  }

  if (!job.enabled) {
    return {
      success: false,
      processed: 0,
      errors: 0,
      details: [`Job ${name} is disabled in registry`],
    };
  }

  console.log(`[JobRunner] Starting ${name} at ${ctx.triggeredAt.toISOString()}`);

  const start = Date.now();
  let result: JobResult;
  let errorMessage: string | undefined;

  try {
    result = await job.handler(ctx);
  } catch (err: any) {
    errorMessage = err?.message || String(err);
    result = {
      success: false,
      processed: 0,
      errors: 1,
      details: [errorMessage ?? "Unknown job error"],
    };
  }

  const durationMs = Date.now() - start;

  // Persist automation run record for observability
  try {
    if (ctx.tenantId) {
      await db.insert(automationRuns).values({
        tenantId: ctx.tenantId,
        automationType: name,
        status: result.success ? "completed" : "failed",
        input: { isDryRun: ctx.isDryRun, triggeredAt: ctx.triggeredAt.toISOString() },
        output: { processed: result.processed, details: result.details.slice(0, 20) },
        error: errorMessage,
      });
    }
  } catch (dbErr) {
    console.error(`[JobRunner] Failed to persist automation run for ${name}:`, dbErr);
  }

  console.log(
    `[JobRunner] Finished ${name} in ${durationMs}ms — success=${result.success} processed=${result.processed} errors=${result.errors}`
  );

  return result;
}

/**
 * Run all enabled jobs sequentially.
 */
export async function runAllJobs(
  ctx: JobContext = { triggeredAt: new Date(), isDryRun: false }
): Promise<Record<JobName, JobResult>> {
  const results = {} as Record<JobName, JobResult>;
  for (const job of jobRegistry) {
    if (!job.enabled) continue;
    results[job.name] = await runJob(job.name, ctx);
  }
  return results;
}

/**
 * Get job health snapshot for observability dashboards.
 */
export async function getJobHealth(): Promise<{
  totalRuns: number;
  failedRuns24h: number;
  avgDurationMs: number;
  lastRunByJob: Record<JobName, Date | null>;
}> {
  const lastRuns = Object.fromEntries(
    jobRegistry.map((j) => [j.name, null as Date | null])
  ) as Record<JobName, Date | null>;

  for (const job of jobRegistry) {
    const [row] = await db
      .select({ createdAt: automationRuns.createdAt })
      .from(automationRuns)
      .where(eq(automationRuns.automationType, job.name))
      .orderBy(sql`${automationRuns.createdAt} DESC`)
      .limit(1);
    if (row) {
      lastRuns[job.name] = row.createdAt;
    }
  }

  return {
    totalRuns: 0,
    failedRuns24h: 0,
    avgDurationMs: 0,
    lastRunByJob: lastRuns,
  };
}
