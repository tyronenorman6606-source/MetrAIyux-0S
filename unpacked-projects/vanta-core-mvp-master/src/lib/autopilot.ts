/**
 * Content Autopilot 2.0
 * Call-to-Content Transformation Pipeline
 * 
 * Scans call transcripts, messages, and customer interactions to generate:
 *   - blog topics
 *   - sales scripts
 *   - newsletter blocks
 *   - faq entries
 *   - local service pages
 * 
 * Content Queue Lifecycle:
 *   pending_review → approved → published
 */

import { db } from "@/db";
import { contentIdeas, messages, callTranscripts, reviewRequests, users } from "@/db/schema/schema";
import { logAudit } from "./audit";
import { eq, and, desc, sql, isNull, inArray } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContentType =
  | "blog_topic"
  | "faq"
  | "local_service_page"
  | "social_post"
  | "sales_script"
  | "newsletter_block";

export type ContentStatus =
  | "pending_review"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

export type SourceType = "call_transcript" | "message" | "review";

export interface ContentPiece {
  topic: string;
  type: ContentType;
  draft: string;
  sourceId: string;
  sourceType: SourceType;
  qualityScore: number;
  tags: string[];
}

export interface AutopilotResult {
  generated: number;
  queued: number;
  errors: number;
  details: string[];
}

// ─── Configuration ────────────────────────────────────────────────────────────

const MIN_CONTENT_LENGTH = 80;
const MAX_BATCH_SIZE = 50;
const QUALITY_THRESHOLD = 4; // Minimum score to queue

const CONTENT_TRIGGERS: Record<ContentType, { keywords: string[]; patterns: RegExp[] }> = {
  blog_topic: {
    keywords: ["how to", "guide", "tips", "best", "vs", "comparison", "cost", "price", "why does"],
    patterns: [/(?:how|why|what|when)\s+.+\?/i, /(?:cost|price|pricing)\s+(?:for|of|to)/i],
  },
  faq: {
    keywords: ["?", "do you", "can you", "will you", "is it", "how much"],
    patterns: [/^.+\?$/i, /(?:do|can|will|is|are|should|could)\s+.+\?/i],
  },
  local_service_page: {
    keywords: ["near me", "in my area", "local", "service area", "zip code", "city", "town"],
    patterns: [/(?:in|near|around)\s+([a-z\s]+)/i, /(?:service\s+area|coverage\s+area)/i],
  },
  social_post: {
    keywords: ["review", "happy", "great service", "recommend", "amazing", "thank you"],
    patterns: [/(?:highly\s+recommend|5\s*stars|great\s+job)/i],
  },
  sales_script: {
    keywords: ["quote", "estimate", "proposal", "pricing", "packages", "plans", "options"],
    patterns: [/(?:looking\s+for|need\s+a|want\s+a)\s+(?:quote|estimate|price)/i, /(?:what\s+do\s+you\s+charge|how\s+much\s+is)/i],
  },
  newsletter_block: {
    keywords: ["new service", "update", "announcement", "special", "offer", "seasonal", "tips"],
    patterns: [/(?:new|latest|upcoming)\s+(?:service|feature|location)/i, /(?:special\s+offer|limited\s+time)/i],
  },
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run the full call-to-content pipeline for a tenant.
 * Scans transcripts and messages, generates content pieces,
 * and queues them for review.
 */
export async function runContentPipeline(tenantId: string): Promise<AutopilotResult> {
  const result: AutopilotResult = { generated: 0, queued: 0, errors: 0, details: [] };

  try {
    // 1. Scan call transcripts
    const transcriptPieces = await scanTranscripts(tenantId);
    result.details.push(`Scanned transcripts: ${transcriptPieces.length} raw pieces`);

    // 2. Scan messages
    const messagePieces = await scanMessages(tenantId);
    result.details.push(`Scanned messages: ${messagePieces.length} raw pieces`);

    // 3. Deduplicate by topic similarity (simple substring check)
    const allPieces = deduplicatePieces([...transcriptPieces, ...messagePieces]);
    result.generated = allPieces.length;

    // 4. Queue pieces that meet quality threshold
    for (const piece of allPieces.slice(0, MAX_BATCH_SIZE)) {
      try {
        if (piece.qualityScore >= QUALITY_THRESHOLD) {
          await queueContentPiece(tenantId, piece);
          result.queued++;
        }
      } catch (err: any) {
        result.errors++;
        result.details.push(`Queue failed for "${piece.topic.slice(0, 40)}": ${err.message}`);
      }
    }

    // 5. Audit log
    await logAudit({
      tenantId,
      actor: "ai",
      action: "run_content_pipeline",
      entityType: "content_ideas",
      result: `Generated ${result.generated}, queued ${result.queued} for review.`,
    });
  } catch (err: any) {
    result.errors++;
    result.details.push(`Pipeline failure: ${err.message}`);
  }

  return result;
}

/**
 * Approve a content idea for publishing.
 */
export async function approveContentIdea(
  ideaId: string,
  approvedByUserId: string
) {
  const [updated] = await db
    .update(contentIdeas)
    .set({
      status: "approved",
      approvedAt: new Date(),
      approvedBy: approvedByUserId,
    })
    .where(eq(contentIdeas.id, ideaId))
    .returning();

  if (!updated) throw new Error(`Content idea ${ideaId} not found`);

  await logAudit({
    tenantId: updated.tenantId,
    actor: "user",
    action: "approve_content",
    entityType: "content_ideas",
    entityId: ideaId,
    result: `Content approved by ${approvedByUserId}`,
  });

  return updated;
}

/**
 * Publish an approved content idea.
 */
export async function publishContentIdea(ideaId: string) {
  const [updated] = await db
    .update(contentIdeas)
    .set({
      status: "published",
      publishedAt: new Date(),
    })
    .where(and(eq(contentIdeas.id, ideaId), eq(contentIdeas.status, "approved")))
    .returning();

  if (!updated) throw new Error(`Content idea ${ideaId} not found or not approved`);

  await logAudit({
    tenantId: updated.tenantId,
    actor: "ai",
    action: "publish_content",
    entityType: "content_ideas",
    entityId: ideaId,
    result: `Content published`,
  });

  return updated;
}

/**
 * Reject a content idea.
 */
export async function rejectContentIdea(ideaId: string, reason?: string) {
  const [updated] = await db
    .update(contentIdeas)
    .set({ status: "rejected" })
    .where(eq(contentIdeas.id, ideaId))
    .returning();

  if (!updated) throw new Error(`Content idea ${ideaId} not found`);

  await logAudit({
    tenantId: updated.tenantId,
    actor: "user",
    action: "reject_content",
    entityType: "content_ideas",
    entityId: ideaId,
    result: reason || "Content rejected",
  });

  return updated;
}

/**
 * Bulk transition: approve multiple ideas at once.
 */
export async function bulkApprove(ideaIds: string[], approvedByUserId: string) {
  const updated = await db
    .update(contentIdeas)
    .set({
      status: "approved",
      approvedAt: new Date(),
      approvedBy: approvedByUserId,
    })
    .where(inArray(contentIdeas.id, ideaIds))
    .returning();

  for (const idea of updated) {
    await logAudit({
      tenantId: idea.tenantId,
      actor: "user",
      action: "bulk_approve_content",
      entityType: "content_ideas",
      entityId: idea.id,
      result: `Bulk approved by ${approvedByUserId}`,
    });
  }

  return updated;
}

/**
 * Bulk publish all approved ideas for a tenant.
 */
export async function bulkPublishApproved(tenantId: string) {
  const updated = await db
    .update(contentIdeas)
    .set({
      status: "published",
      publishedAt: new Date(),
    })
    .where(
      and(
        eq(contentIdeas.tenantId, tenantId),
        eq(contentIdeas.status, "approved")
      )
    )
    .returning();

  for (const idea of updated) {
    await logAudit({
      tenantId,
      actor: "ai",
      action: "bulk_publish_content",
      entityType: "content_ideas",
      entityId: idea.id,
      result: `Auto-published approved content`,
    });
  }

  return updated;
}

/**
 * Get content ideas filtered by status.
 */
export async function getContentIdeasByStatus(
  tenantId: string,
  status?: ContentStatus
) {
  if (status) {
    return await db.query.contentIdeas.findMany({
      where: and(eq(contentIdeas.tenantId, tenantId), eq(contentIdeas.status, status)),
      orderBy: [desc(contentIdeas.qualityScore), desc(contentIdeas.createdAt)],
    });
  }
  return await db.query.contentIdeas.findMany({
    where: eq(contentIdeas.tenantId, tenantId),
    orderBy: [desc(contentIdeas.createdAt)],
  });
}

// ─── Internal Pipeline ────────────────────────────────────────────────────────

async function scanTranscripts(tenantId: string): Promise<ContentPiece[]> {
  const transcripts = await db.query.callTranscripts.findMany({
    where: eq(callTranscripts.tenantId, tenantId),
    limit: MAX_BATCH_SIZE,
    orderBy: [desc(callTranscripts.createdAt)],
  });

  const pieces: ContentPiece[] = [];
  for (const t of transcripts) {
    const text = t.transcript || "";
    if (text.length < MIN_CONTENT_LENGTH) continue;

    const extracted = extractContentPieces(text, t.id, "call_transcript");
    pieces.push(...extracted);
  }
  return pieces;
}

async function scanMessages(tenantId: string): Promise<ContentPiece[]> {
  const msgs = await db.query.messages.findMany({
    where: and(
      eq(messages.tenantId, tenantId),
      eq(messages.senderType, "contact")
    ),
    limit: MAX_BATCH_SIZE,
    orderBy: [desc(messages.createdAt)],
  });

  const pieces: ContentPiece[] = [];
  for (const m of msgs) {
    const text = m.content || "";
    if (text.length < MIN_CONTENT_LENGTH) continue;

    const extracted = extractContentPieces(text, m.id, "message");
    pieces.push(...extracted);
  }
  return pieces;
}

function extractContentPieces(
  text: string,
  sourceId: string,
  sourceType: SourceType
): ContentPiece[] {
  const pieces: ContentPiece[] = [];
  const lower = text.toLowerCase();

  for (const [type, config] of Object.entries(CONTENT_TRIGGERS) as [
    ContentType,
    { keywords: string[]; patterns: RegExp[] }
  ][]) {
    let matched = false;

    // Keyword matching
    for (const kw of config.keywords) {
      if (lower.includes(kw)) {
        matched = true;
        break;
      }
    }

    // Pattern matching
    if (!matched) {
      for (const pat of config.patterns) {
        if (pat.test(text)) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      const draft = generateDraft(type, text);
      const topic = generateTopic(type, text);
      const qualityScore = estimateQuality(text, type);
      const tags = extractTags(text);

      pieces.push({
        topic,
        type,
        draft,
        sourceId,
        sourceType,
        qualityScore,
        tags,
      });
    }
  }

  return pieces;
}

function generateTopic(type: ContentType, text: string): string {
  const clean = text.replace(/\?/g, "").slice(0, 80).trim();
  switch (type) {
    case "blog_topic":
      return `How to Handle: ${clean}`;
    case "faq":
      return clean.endsWith("?") ? clean : `${clean}?`;
    case "local_service_page":
      return `Local Expert Services — ${clean}`;
    case "social_post":
      return `Customer Story: ${clean.slice(0, 50)}`;
    case "sales_script":
      return `Sales Response: ${clean.slice(0, 50)}`;
    case "newsletter_block":
      return `Newsletter Feature: ${clean.slice(0, 50)}`;
    default:
      return clean;
  }
}

function generateDraft(type: ContentType, text: string): string {
  const snippet = text.slice(0, 300);
  switch (type) {
    case "blog_topic":
      return `Blog post idea derived from customer inquiry:\n"${snippet}"\n\nOutline:\n1. Problem statement\n2. Solution overview\n3. Step-by-step guide\n4. Call to action`;
    case "faq":
      return `FAQ generated from customer question:\nQ: ${snippet}\nA: [Draft answer based on business knowledge base]`;
    case "local_service_page":
      return `Local service page draft:\n"${snippet}"\n\nEmphasize local expertise, service area coverage, and fast response times.`;
    case "social_post":
      return `Social media post draft:\n"${snippet}"\n\nHighlight customer success and invite engagement.`;
    case "sales_script":
      return `Sales script draft:\nCustomer context: "${snippet}"\n\n1. Acknowledge need\n2. Present solution options\n3. Handle common objections\n4. Close with next step`;
    case "newsletter_block":
      return `Newsletter block draft:\n"${snippet}"\n\nUse as a featured section in the next newsletter campaign.`;
    default:
      return snippet;
  }
}

function estimateQuality(text: string, type: ContentType): number {
  let score = 5;

  // Length bonus
  if (text.length > 200) score += 2;
  if (text.length > 500) score += 1;

  // Structure bonus
  if (text.includes("?")) score += 1;
  if (/\d+/.test(text)) score += 1; // Contains numbers (specifics)
  if (/\b(because|since|therefore|however)\b/i.test(text)) score += 1; // Reasoning

  // Type-specific bonus
  if (type === "sales_script" && /\b(quote|estimate|price|cost)\b/i.test(text)) score += 1;
  if (type === "faq" && text.includes("?")) score += 1;
  if (type === "newsletter_block" && /\b(new|special|offer|update)\b/i.test(text)) score += 1;

  return Math.min(score, 10);
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();

  if (lower.includes("price") || lower.includes("cost") || lower.includes("how much")) tags.push("pricing");
  if (lower.includes("?")) tags.push("question");
  if (lower.includes("emergency") || lower.includes("urgent") || lower.includes("asap")) tags.push("urgency");
  if (lower.includes("book") || lower.includes("schedule") || lower.includes("appointment")) tags.push("booking");
  if (lower.includes("quote") || lower.includes("estimate")) tags.push("quote");
  if (lower.includes("review") || lower.includes("recommend")) tags.push("testimonial");
  if (lower.includes("new") || lower.includes("special")) tags.push("promotion");
  if (lower.includes("service area") || lower.includes("location")) tags.push("local");

  return tags;
}

function deduplicatePieces(pieces: ContentPiece[]): ContentPiece[] {
  const seen = new Set<string>();
  return pieces.filter((p) => {
    const key = `${p.type}:${p.topic.toLowerCase().slice(0, 60)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function queueContentPiece(tenantId: string, piece: ContentPiece) {
  await db.insert(contentIdeas).values({
    tenantId,
    topic: piece.topic,
    type: piece.type,
    draft: piece.draft,
    status: "pending_review",
    sourceId: piece.sourceId,
    sourceType: piece.sourceType,
    qualityScore: piece.qualityScore,
  });
}
