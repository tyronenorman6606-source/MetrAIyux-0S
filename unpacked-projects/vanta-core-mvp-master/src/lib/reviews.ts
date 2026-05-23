import { db } from "@/db";
import { reviewRequests, jobs, contacts, contentIdeas } from "@/db/schema/schema";
import { logAudit } from "./audit";
import { eq } from "drizzle-orm";

export async function sendReviewRequest({
  tenantId,
  jobId,
  contactId,
}: {
  tenantId: string;
  jobId: string;
  contactId: string;
}) {
  try {
    // 1. Create the review request record
    const [request] = await db.insert(reviewRequests).values({
      tenantId,
      jobId,
      contactId,
      status: "sent",
    }).returning();

    // 2. Log the action
    await logAudit({
      tenantId,
      actor: "system",
      action: "send_review_request",
      entityType: "review_request",
      entityId: request.id,
      input: { jobId, contactId },
      result: "Review request created and marked as sent",
    });

    // 3. In a real scenario, this would trigger an SMS/Email via Twilio/Resend
    // For MVP, we just log it and return the record.
    console.log(`[Review Engine] Review request sent to contact ${contactId} for job ${jobId}`);

    return request;
  } catch (error: any) {
    await logAudit({
      tenantId,
      actor: "system",
      action: "send_review_request_failed",
      entityType: "review_request",
      input: { jobId, contactId },
      error: error.message,
    });
    throw error;
  }
}

export async function captureReviewFeedback({
  requestId,
  rating,
  feedback,
}: {
  requestId: string;
  rating: number;
  feedback?: string;
}) {
  try {
    const [request] = await db.select().from(reviewRequests).where(eq(reviewRequests.id, requestId)).limit(1);
    
    if (!request) throw new Error("Review request not found");

    // Update the request with the rating
    await db.update(reviewRequests)
      .set({ rating, status: "completed" })
      .where(eq(reviewRequests.id, requestId));

    // Log the feedback
    await logAudit({
      tenantId: request.tenantId,
      actor: "system",
      action: "capture_review_feedback",
      entityType: "review_request",
      entityId: requestId,
      input: { rating, feedback },
      result: `Feedback captured: ${rating} stars`,
    });

    // If rating is high, we might want to prompt for a public review
    // If rating is low, alert the owner (Logic in Section 6: Review + Reputation Engine)
    if (rating >= 4) {
      // Generate social post idea from positive feedback
      await db.insert(contentIdeas).values({
        tenantId: request.tenantId,
        topic: `Customer Spotlight: ${rating}-Star Review`,
        type: "social_post",
        draft: `Five-star experience captured! Feedback: "${feedback || 'Excellent service!'}". This would make a great social proof post.`,
        status: "idea",
      }).catch(err => console.error("Failed to auto-generate content idea from review:", err));
    }

    if (rating <= 2) {
      // Create owner alert
      // TODO: Implement alertOwner in owner-alerts.ts
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to capture review feedback:", error);
    throw error;
  }
}
