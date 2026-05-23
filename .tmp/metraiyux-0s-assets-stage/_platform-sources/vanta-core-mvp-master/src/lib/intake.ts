import { db } from '@/db';
import { contacts, conversations, messages, leads, leadScores } from '@/db/schema/schema';
import { createVanta13Adapter } from '@/lib/vanta13/adapter';
import { logAudit } from '@/lib/audit';
import { enrollInSequence, DEFAULT_SEQUENCES } from '@/lib/followups';
import { eq, and } from 'drizzle-orm';

export interface IntakePayload {
  tenantId: string;
  channel: 'sms' | 'call' | 'chat' | 'email';
  from: string; // phone number or email
  content: string;
  metadata?: any;
}

export async function processIntake(payload: IntakePayload) {
  const { tenantId, channel, from, content, metadata } = payload;

  try {
    // 1. Find or Create Contact
    let contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.tenantId, tenantId),
        channel === 'email' ? eq(contacts.email, from) : eq(contacts.phone, from)
      ),
    });

    if (!contact) {
      const [newContact] = await db.insert(contacts).values({
        tenantId,
        [channel === 'email' ? 'email' : 'phone']: from,
        source: channel,
      }).returning();
      contact = newContact;
    }

    // 2. Find or Create Conversation
    let conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.contactId, contact.id),
        eq(conversations.status, 'active')
      ),
    });

    if (!conversation) {
      const [newConversation] = await db.insert(conversations).values({
        tenantId,
        contactId: contact.id,
        channel,
      }).returning();
      conversation = newConversation;
    }

    // 3. Log Message
    await db.insert(messages).values({
      tenantId,
      conversationId: conversation.id,
      senderType: 'contact',
      content,
      metadata,
    });

    // 4. Update Conversation timestamp
    await db.update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, conversation.id));

    // 5. Classify with VANTA13
    const adapter = createVanta13Adapter();
    const decision = await adapter.classify({ text: content });

    // 6. Create Lead if applicable
    let activeLeadId: string | undefined;
    if (decision.callerType === 'lead' || decision.shouldBook || channel === 'call') {
      let lead = await db.query.leads.findFirst({
        where: and(
          eq(leads.tenantId, tenantId),
          eq(leads.contactId, contact.id),
          eq(leads.status, 'new')
        ),
      });

      if (!lead) {
        const [newLead] = await db.insert(leads).values({
          tenantId,
          contactId: contact.id,
          urgency: decision.urgency || 'normal',
          status: 'new',
        }).returning();
        lead = newLead;

        // Create Lead Score
        await db.insert(leadScores).values({
          tenantId,
          leadId: lead.id,
          score: Math.round(decision.confidence * 100),
          reason: decision.summary,
        });
      }
      activeLeadId = lead.id;
    }

    // 7. Automation: Missed Call Recovery
    if (channel === 'call' && activeLeadId && metadata?.isMissedCall) {
      await enrollInSequence(tenantId, activeLeadId, DEFAULT_SEQUENCES.MISSED_CALL);
    }

    // 8. Automation: New Lead Follow-up
    if (activeLeadId && decision.shouldFollowUp) {
      const sequence = decision.intent === 'request_quote' 
        ? DEFAULT_SEQUENCES.QUOTE_FOLLOWUP 
        : DEFAULT_SEQUENCES.NEW_LEAD;
      await enrollInSequence(tenantId, activeLeadId, sequence);
    }

    // 9. Audit Log
    await logAudit({
      tenantId,
      actor: 'ai',
      action: 'process_intake',
      entityType: 'conversation',
      entityId: conversation.id,
      input: payload,
      result: JSON.stringify(decision),
    });

    return { 
      success: true, 
      conversationId: conversation.id, 
      decision 
    };

  } catch (error: any) {
    console.error('Intake processing failed:', error);
    await logAudit({
      tenantId,
      actor: 'system',
      action: 'intake_error',
      entityType: 'message',
      input: payload,
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}
