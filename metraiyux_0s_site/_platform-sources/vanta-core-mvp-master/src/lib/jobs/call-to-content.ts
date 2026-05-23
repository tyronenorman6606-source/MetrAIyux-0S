/**
 * Call-to-Content Pipeline Job
 * Processes call transcripts and high-value messages into
 * content_ideas for SEO / blog / FAQ / sales scripts / newsletter generation.
 * 
 * Uses the Content Autopilot 2.0 engine (src/lib/autopilot.ts).
 */

import { db } from "@/db";
import { contentIdeas, messages, callTranscripts } from "@/db/schema/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { JobContext, JobResult } from "./index";
import { runContentPipeline } from "@/lib/autopilot";

const MAX_BATCH_SIZE = 50;

export async function runCallToContent(ctx: JobContext): Promise<JobResult> {
  let processed = 0;
  let errors = 0;
  const details: string[] = [];

  try {
    // In a tenant-scoped run, process that tenant only.
    // Otherwise process all tenants with recent activity.
    const tenantIds = ctx.tenantId
      ? [ctx.tenantId]
      : await fetchActiveTenantIds();

    details.push(`Processing ${tenantIds.length} tenant(s)`);

    for (const tenantId of tenantIds) {
      try {
        const result = await runContentPipeline(tenantId);
        processed += result.queued;
        details.push(
          `Tenant ${tenantId}: generated ${result.generated}, queued ${result.queued}, errors ${result.errors}`
        );
        if (result.errors > 0) {
          errors += result.errors;
          details.push(...result.details.slice(0, 5));
        }
      } catch (err: any) {
        errors++;
        details.push(`Tenant ${tenantId} failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    errors++;
    details.push(`Call-to-Content top-level failure: ${err.message}`);
  }

  return {
    success: errors === 0,
    processed,
    errors,
    details: details.slice(0, 50),
  };
}

async function fetchActiveTenantIds(): Promise<string[]> {
  const recentTranscripts = await db
    .selectDistinct({ tenantId: callTranscripts.tenantId })
    .from(callTranscripts)
    .where(
      sql`${callTranscripts.createdAt} > NOW() - INTERVAL '24 hours'`
    )
    .limit(MAX_BATCH_SIZE);

  const recentMessages = await db
    .selectDistinct({ tenantId: messages.tenantId })
    .from(messages)
    .where(
      sql`${messages.createdAt} > NOW() - INTERVAL '24 hours'`
    )
    .limit(MAX_BATCH_SIZE);

  const ids = new Set<string>();
  recentTranscripts.forEach((t) => ids.add(t.tenantId));
  recentMessages.forEach((m) => ids.add(m.tenantId));
  return Array.from(ids);
}
