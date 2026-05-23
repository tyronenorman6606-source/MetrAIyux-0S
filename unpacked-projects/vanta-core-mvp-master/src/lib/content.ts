import { db } from "@/db";
import { contentIdeas, messages, callTranscripts, reviewRequests } from "@/db/schema/schema";
import { logAudit } from "./audit";
import { eq, desc, and } from "drizzle-orm";
import {
  runContentPipeline,
  approveContentIdea,
  publishContentIdea,
  rejectContentIdea,
  bulkApprove,
  bulkPublishApproved,
  getContentIdeasByStatus,
  type ContentType,
  type ContentStatus,
} from "./autopilot";

// Re-export types for consumers
export type { ContentType, ContentStatus };

/**
 * Legacy wrapper: generate content ideas using the Autopilot 2.0 pipeline.
 * This now delegates to the call-to-content transformation pipeline.
 */
export async function generateContentIdeas(tenantId: string) {
  const result = await runContentPipeline(tenantId);

  await logAudit({
    tenantId,
    actor: "system",
    action: "generate_content_ideas",
    entityType: "content_ideas",
    result: `Autopilot generated ${result.generated} ideas, queued ${result.queued} for review.`,
  });

  // Return recently queued ideas for the caller
  const ideas = await db.query.contentIdeas.findMany({
    where: eq(contentIdeas.tenantId, tenantId),
    orderBy: [desc(contentIdeas.createdAt)],
    limit: result.queued,
  });

  return ideas;
}

/**
 * Get all content ideas for a tenant.
 */
export async function getContentIdeas(tenantId: string) {
  return await db.query.contentIdeas.findMany({
    where: eq(contentIdeas.tenantId, tenantId),
    orderBy: [desc(contentIdeas.createdAt)],
  });
}

/**
 * Update content idea status.
 * Supports the full lifecycle: pending_review | approved | published | rejected | archived
 */
export async function updateContentIdeaStatus(
  ideaId: string,
  status: ContentStatus,
  options?: { approvedByUserId?: string; reason?: string }
) {
  if (status === "approved") {
    if (!options?.approvedByUserId) {
      throw new Error("approvedByUserId is required to approve content");
    }
    return approveContentIdea(ideaId, options.approvedByUserId);
  }

  if (status === "published") {
    return publishContentIdea(ideaId);
  }

  if (status === "rejected") {
    return rejectContentIdea(ideaId, options?.reason);
  }

  // For other statuses (pending_review, archived), do a direct update
  const [updated] = await db.update(contentIdeas)
    .set({ status })
    .where(eq(contentIdeas.id, ideaId))
    .returning();

  if (!updated) throw new Error(`Content idea ${ideaId} not found`);

  await logAudit({
    tenantId: updated.tenantId,
    actor: "system",
    action: "update_content_status",
    entityType: "content_ideas",
    entityId: ideaId,
    result: `Content status updated to ${status}`,
  });

  return updated;
}

/**
 * Bulk operations for the Content Engine dashboard.
 */
export { bulkApprove, bulkPublishApproved, getContentIdeasByStatus };

/**
 * High-level dashboard stats for the Content Engine.
 */
export async function getContentStats(tenantId: string) {
  const all = await getContentIdeas(tenantId);

  const byStatus = {
    pending_review: all.filter((i) => i.status === "pending_review").length,
    approved: all.filter((i) => i.status === "approved").length,
    published: all.filter((i) => i.status === "published").length,
    rejected: all.filter((i) => i.status === "rejected").length,
    archived: all.filter((i) => i.status === "archived").length,
  };

  const byType = {
    blog_topic: all.filter((i) => i.type === "blog_topic").length,
    faq: all.filter((i) => i.type === "faq").length,
    local_service_page: all.filter((i) => i.type === "local_service_page").length,
    social_post: all.filter((i) => i.type === "social_post").length,
    sales_script: all.filter((i) => i.type === "sales_script").length,
    newsletter_block: all.filter((i) => i.type === "newsletter_block").length,
  };

  const avgQuality =
    all.length > 0
      ? Math.round(all.reduce((sum, i) => sum + (i.qualityScore || 0), 0) / all.length)
      : 0;

  return {
    total: all.length,
    byStatus,
    byType,
    avgQuality,
  };
}
