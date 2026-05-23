/**
 * Autonomous Reactivation Campaigns Job
 * Scans past customers / old leads and enqueues win-back
 * follow-up sequences based on segment rules.
 */

import { db } from "@/db";
import { contacts, leads, followupEvents, followupSequences } from "@/db/schema/schema";
import { eq, and, lt, sql, isNull } from "drizzle-orm";
import type { JobContext, JobResult } from "./index";

const REACTIVATION_WINDOW_DAYS = 90;
const MAX_BATCH = 100;

export async function runReactivationCampaigns(ctx: JobContext): Promise<JobResult> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - REACTIVATION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  let processed = 0;
  let errors = 0;
  const details: string[] = [];

  try {
    const winBackLeads = await db
      .select({
        leadId: leads.id,
        tenantId: leads.tenantId,
        contactId: leads.contactId,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .leftJoin(followupEvents, eq(followupEvents.leadId, leads.id))
      .where(
        and(
          sql`${leads.status} IN ('dead', 'lost', 'declined')`,
          lt(leads.updatedAt, cutoff),
          isNull(followupEvents.id)
        )
      )
      .groupBy(leads.id)
      .limit(MAX_BATCH);

    details.push(`Found ${winBackLeads.length} win-back candidates`);

    for (const row of winBackLeads) {
      try {
        const [sequence] = await db
          .select({ id: followupSequences.id })
          .from(followupSequences)
          .where(
            and(
              eq(followupSequences.tenantId, row.tenantId),
              sql`${followupSequences.name} = 'Win-Back'`
            )
          )
          .limit(1);

        if (!sequence) {
          details.push(`No 'Win-Back' sequence for tenant ${row.tenantId}`);
          continue;
        }

        if (!ctx.isDryRun) {
          await db.insert(followupEvents).values({
            tenantId: row.tenantId,
            sequenceId: sequence.id,
            leadId: row.leadId,
            status: "pending",
            scheduledAt: now,
          });
        }

        processed++;
      } catch (err: any) {
        errors++;
        details.push(`Win-back lead ${row.leadId} failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    errors++;
    details.push(`Reactivation top-level failure: ${err.message}`);
  }

  return {
    success: errors === 0,
    processed,
    errors,
    details: details.slice(0, 50),
  };
}
