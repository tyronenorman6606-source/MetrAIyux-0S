/**
 * Revenue Rescue Autopilot Job
 * Detects stale leads (>2 hours old, status=new) and missed calls
 * that have not been followed up, then auto-enrolls them in the
 * appropriate recovery sequence.
 */

import { db } from "@/db";
import { leads, calls, followupEvents, followupSequences, contacts } from "@/db/schema/schema";
import { eq, and, lt, isNull, sql } from "drizzle-orm";
import type { JobContext, JobResult } from "./index";

const STALE_LEAD_THRESHOLD_HOURS = 2;
const MISSED_CALL_THRESHOLD_MINUTES = 15;

export async function runRevenueRescue(ctx: JobContext): Promise<JobResult> {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - STALE_LEAD_THRESHOLD_HOURS * 60 * 60 * 1000);
  const missedCallThreshold = new Date(now.getTime() - MISSED_CALL_THRESHOLD_MINUTES * 60 * 1000);

  let processed = 0;
  let errors = 0;
  const details: string[] = [];

  try {
    // 1. Find stale leads (new, created > 2h ago, no followup events)
    const staleLeads = await db
      .select({
        leadId: leads.id,
        tenantId: leads.tenantId,
        contactId: leads.contactId,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .leftJoin(followupEvents, eq(followupEvents.leadId, leads.id))
      .where(
        and(
          eq(leads.status, "new"),
          lt(leads.createdAt, staleThreshold),
          isNull(followupEvents.id)
        )
      )
      .groupBy(leads.id)
      .limit(100);

    details.push(`Found ${staleLeads.length} stale leads (>${STALE_LEAD_THRESHOLD_HOURS}h)`);

    for (const lead of staleLeads) {
      try {
        const [sequence] = await db
          .select({ id: followupSequences.id })
          .from(followupSequences)
          .where(
            and(
              eq(followupSequences.tenantId, lead.tenantId),
              sql`${followupSequences.name} = 'Revenue Rescue'`
            )
          )
          .limit(1);

        if (!sequence) {
          details.push(`No 'Revenue Rescue' sequence for tenant ${lead.tenantId}; skipping lead ${lead.leadId}`);
          continue;
        }

        if (!ctx.isDryRun) {
          await db.insert(followupEvents).values({
            tenantId: lead.tenantId,
            sequenceId: sequence.id,
            leadId: lead.leadId,
            contactId: lead.contactId,
            status: "pending",
            scheduledAt: new Date(),
          });
        }

        processed++;
      } catch (err: any) {
        errors++;
        details.push(`Lead ${lead.leadId} rescue failed: ${err.message}`);
      }
    }

    // 2. Find missed calls
    const missedCalls = await db
      .select({
        callId: calls.id,
        tenantId: calls.tenantId,
        contactId: calls.contactId,
        createdAt: calls.createdAt,
      })
      .from(calls)
      .leftJoin(followupEvents, eq(followupEvents.contactId, calls.contactId))
      .where(
        and(
          eq(calls.direction, "inbound"),
          sql`${calls.status} IN ('ringing', 'busy', 'no-answer', 'failed')`,
          lt(calls.createdAt, missedCallThreshold),
          isNull(followupEvents.id)
        )
      )
      .groupBy(calls.id)
      .limit(100);

    details.push(`Found ${missedCalls.length} missed calls needing recovery`);

    for (const call of missedCalls) {
      try {
        const [sequence] = await db
          .select({ id: followupSequences.id })
          .from(followupSequences)
          .where(
            and(
              eq(followupSequences.tenantId, call.tenantId),
              sql`${followupSequences.name} = 'Missed Call Recovery'`
            )
          )
          .limit(1);

        if (!sequence) {
          details.push(`No 'Missed Call Recovery' sequence for tenant ${call.tenantId}; skipping call ${call.callId}`);
          continue;
        }

        if (!ctx.isDryRun) {
          await db.insert(followupEvents).values({
            tenantId: call.tenantId,
            sequenceId: sequence.id,
            contactId: call.contactId,
            status: "pending",
            scheduledAt: new Date(),
          });
        }

        processed++;
      } catch (err: any) {
        errors++;
        details.push(`Call ${call.callId} recovery failed: ${err.message}`);
      }
    }
  } catch (err: any) {
    errors++;
    details.push(`Revenue Rescue top-level failure: ${err.message}`);
  }

  return {
    success: errors === 0,
    processed,
    errors,
    details: details.slice(0, 50),
  };
}
