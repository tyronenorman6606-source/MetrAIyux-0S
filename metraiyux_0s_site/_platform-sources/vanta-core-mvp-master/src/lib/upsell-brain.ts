import { db } from "@/db";
import { jobs, services, contentIdeas, contacts } from "@/db/schema/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

/**
 * Upsell Brain
 * Analyzes completed jobs, identifies complementary services,
 * and generates upsell ideas as content_ideas entries.
 */

export interface UpsellPolicy {
  performedService: string;
  suggestedService: string;
  offerTemplate: string;
}

const DEFAULT_UPSELL_MAP: Record<string, UpsellPolicy[]> = {
  "Plumbing Repair": [
    { performedService: "Plumbing Repair", suggestedService: "Drain Cleaning", offerTemplate: "Get 20% off drain cleaning when booked within 7 days." },
    { performedService: "Plumbing Repair", suggestedService: "Water Heater Inspection", offerTemplate: "Free water heater inspection with any repair." },
  ],
  "HVAC Repair": [
    { performedService: "HVAC Repair", suggestedService: "Seasonal Maintenance Plan", offerTemplate: "Join our maintenance plan and save 15% on future repairs." },
    { performedService: "HVAC Repair", suggestedService: "Air Quality Assessment", offerTemplate: "Complimentary indoor air quality assessment with repair." },
  ],
  "Electrical": [
    { performedService: "Electrical", suggestedService: "Panel Upgrade Consultation", offerTemplate: "Schedule a panel safety evaluation for $49." },
  ],
  "General Business": [
    { performedService: "General Business", suggestedService: "Premium Support Plan", offerTemplate: "Upgrade to premium support for priority response." },
  ],
};

export interface UpsellResult {
  analyzed: number;
  ideasGenerated: number;
  details: string[];
}

export async function runUpsellBrain(ctx?: { tenantId?: string; isDryRun?: boolean }): Promise<UpsellResult> {
  const result: UpsellResult = { analyzed: 0, ideasGenerated: 0, details: [] };
  const dryRun = ctx?.isDryRun ?? false;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h

  const completedJobs = await db.query.jobs.findMany({
    where: and(
      ctx?.tenantId ? eq(jobs.tenantId, ctx.tenantId) : sql`TRUE`,
      eq(jobs.status, "completed"),
      gte(jobs.updatedAt, since)
    ),
    with: { lead: { with: { service: true } }, contact: true },
  });

  result.analyzed = completedJobs.length;
  result.details.push(`Analyzed ${completedJobs.length} completed jobs in last 24h.`);

  if (dryRun) {
    result.details.push("Dry run: no content ideas created.");
    return result;
  }

  for (const job of completedJobs) {
    const leadAny = job.lead as any;
    const performedService = leadAny?.service?.name || "General Business";
    const contactAny = job.contact as any;
    const policies = DEFAULT_UPSELL_MAP[performedService] || DEFAULT_UPSELL_MAP["General Business"];

    for (const policy of policies) {
      try {
        await db.insert(contentIdeas).values({
          tenantId: job.tenantId,
          topic: `Upsell: ${policy.suggestedService} for ${contactAny?.name || "Customer"}`,
          type: "upsell",
          draft: `Hi ${contactAny?.name?.split(" ")?.[0] || "there"}, thanks again for choosing us for your ${policy.performedService}! Most of our clients who get this also find great value in our ${policy.suggestedService}. ${policy.offerTemplate}`,
          status: "idea",
        });
        result.ideasGenerated++;
      } catch (e: any) {
        result.details.push(`Failed to create upsell idea for job ${job.id}: ${e.message}`);
      }
    }
  }

  await logAudit({
    tenantId: ctx?.tenantId,
    actor: "system",
    action: "upsell_brain_run",
    entityType: "automation",
    input: { dryRun, analyzed: result.analyzed },
    result: `Generated ${result.ideasGenerated} upsell ideas`,
  });

  return result;
}
