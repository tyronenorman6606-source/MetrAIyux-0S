import { db } from '@/db';
import { contacts, conversations, messages, leads, leadScores, auditLogs } from '@/db/schema/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logAudit } from './audit';
import { Vanta13Decision } from './vanta13/adapter';
import { generateQuote } from './quotes';
import { enrollInSequence, DEFAULT_SEQUENCES } from './followups';

export async function processIntake({
  tenantId,
  channel,
  from, // phone, email, etc.
  name,
  content,
  metadata,
  decision,
}: {
  tenantId: string;
  channel: 'sms' | 'call' | 'chat' | 'email';
  from: string;
  name?: string;
  content: string;
  metadata?: any;
  decision: Vanta13Decision;
}) {
  try {
    // 1. Find or create Contact
    let contactId: string;
    const existingContact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.tenantId, tenantId),
        channel === 'email' ? eq(contacts.email, from) : eq(contacts.phone, from)
      ),
    });

    if (existingContact) {
      contactId = existingContact.id;
      // Update name if provided and not already set
      if (name && !existingContact.name) {
        await db.update(contacts).set({ name }).where(eq(contacts.id, contactId));
      }
    } else {
      const [newContact] = await db.insert(contacts).values({
        tenantId,
        name,
        email: channel === 'email' ? from : undefined,
        phone: channel !== 'email' ? from : undefined,
        source: channel,
      }).returning();
      contactId = newContact.id;
    }

    // 2. Find or create Conversation
    let conversationId: string;
    const activeConversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.contactId, contactId),
        eq(conversations.status, 'active')
      ),
    });

    if (activeConversation) {
      conversationId = activeConversation.id;
      await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));
    } else {
      const [newConversation] = await db.insert(conversations).values({
        tenantId,
        contactId,
        channel,
        status: 'active',
      }).returning();
      conversationId = newConversation.id;
    }

    // 3. Log Message
    await db.insert(messages).values({
      tenantId,
      conversationId,
      senderType: 'contact',
      content,
      metadata,
    });

    // 4. Create or Update Lead if quality is sufficient or intent matches
    let leadId: string | undefined;
    if (decision.callerType === 'lead' || decision.callerType === 'customer') {
      const existingLead = await db.query.leads.findFirst({
        where: and(
          eq(leads.tenantId, tenantId),
          eq(leads.contactId, contactId),
          eq(leads.status, 'new')
        ),
      });

      if (existingLead) {
        leadId = existingLead.id;
        await db.update(leads).set({
          urgency: decision.urgency || existingLead.urgency,
          qualityScore: decision.leadQuality || existingLead.qualityScore,
          updatedAt: new Date(),
        }).where(eq(leads.id, leadId));
      } else {
        const [newLead] = await db.insert(leads).values({
          tenantId,
          contactId,
          urgency: decision.urgency || 'normal',
          qualityScore: decision.leadQuality || 50,
          status: 'new',
        }).returning();
        leadId = newLead.id;
      }

      // Log Lead Score
      if (decision.leadQuality) {
        await db.insert(leadScores).values({
          tenantId,
          leadId,
          score: decision.leadQuality,
          reason: decision.summary,
        });
      }
    }

    // 5. Instant Quote Engine: Auto-generate quote on request_quote intent
    let quote = null;
    if (leadId && decision.intent === 'request_quote') {
      try {
        // Extract units from metadata if available
        const units = metadata?.units || 0;
        quote = await generateQuote({ tenantId, leadId, units });
        
        // Enroll in quote follow-up sequence
        await enrollInSequence(tenantId, leadId, DEFAULT_SEQUENCES.QUOTE_FOLLOWUP);
      } catch (quoteError: any) {
        console.error('Auto-quote generation failed:', quoteError.message);
        // Don't fail the intake if quote generation fails
      }
    }

    // 6. Missed call recovery
    if (channel === 'call' && leadId && metadata?.isMissedCall) {
      await enrollInSequence(tenantId, leadId, DEFAULT_SEQUENCES.MISSED_CALL);
    }

    // 7. Log Audit
    await logAudit({
      tenantId,
      actor: 'system',
      action: 'process_intake',
      entityType: 'conversation',
      entityId: conversationId,
      input: { channel, from, content, intent: decision.intent, autoQuoted: !!quote },
      result: decision.intent,
    });

    return { contactId, conversationId, leadId, quote };
  } catch (error) {
    console.error('Lead engine processing error:', error);
    throw error;
  }
}
