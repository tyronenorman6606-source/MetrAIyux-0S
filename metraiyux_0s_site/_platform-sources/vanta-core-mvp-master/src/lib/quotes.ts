import { db } from '@/db';
import { quotes, leads, services, contacts, appointments, jobs } from '@/db/schema/schema';
import { eq } from 'drizzle-orm';
import { BUSINESS_PACKS } from './business-packs';
import { logAudit } from './audit';
import { createBooking } from './bookings';
import { createDepositIntent } from './payments';

export async function generateQuote({
  tenantId,
  leadId,
  units = 0,
}: {
  tenantId: string;
  leadId: string;
  units?: number;
}) {
  try {
    // 1. Get Lead and Contact info
    const lead = await db.query.leads.findFirst({
      where: eq(leads.id, leadId),
      with: {
        contact: true,
        service: true,
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // 2. Determine Quoting Rules
    // We'll look at the tenant's business pack (mocked for now)
    const packId = "plumbing"; // Should be fetched from tenant settings
    const pack = BUSINESS_PACKS.find(p => p.id === packId);

    if (!pack || !pack.quotingRules) {
      // Fallback to service price if quoting rules not found
      if (lead.service?.price) {
        return createQuoteRecord({
          tenantId,
          leadId,
          contactId: lead.contactId,
          serviceId: lead.serviceId || undefined,
          amount: lead.service.price.toString(),
          details: { reason: "Standard service price" },
        });
      }
      throw new Error('No quoting rules found for this business pack');
    }

    // 3. Calculate Quote
    const amount = pack.quotingRules.basePrice + (units * (pack.quotingRules.perUnitPrice || 0));
    
    const details = {
      basePrice: pack.quotingRules.basePrice,
      units,
      perUnitPrice: pack.quotingRules.perUnitPrice,
      perUnitLabel: pack.quotingRules.perUnitLabel,
    };

    // 4. Create Quote Record
    return createQuoteRecord({
      tenantId,
      leadId,
      contactId: lead.contactId,
      serviceId: lead.serviceId || undefined,
      amount: amount.toFixed(2),
      details,
    });

  } catch (error) {
    console.error('Quote generation error:', error);
    throw error;
  }
}

async function createQuoteRecord({
  tenantId,
  leadId,
  contactId,
  serviceId,
  amount,
  details,
}: {
  tenantId: string;
  leadId: string;
  contactId: string;
  serviceId?: string;
  amount: string;
  details: any;
}) {
  const [quote] = await db.insert(quotes).values({
    tenantId,
    leadId,
    contactId,
    serviceId,
    amount,
    details,
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
  }).returning();

  await logAudit({
    tenantId,
    actor: 'system',
    action: 'generate_quote',
    entityType: 'quote',
    entityId: quote.id,
    input: { leadId, amount, details },
    result: 'success',
  });

  return quote;
}

export async function acceptQuote({
  tenantId,
  quoteId,
  startTime,
  requireDeposit = false,
  depositAmount = 0,
}: {
  tenantId: string;
  quoteId: string;
  startTime: Date;
  requireDeposit?: boolean;
  depositAmount?: number;
}) {
  const quote = await db.query.quotes.findFirst({
    where: eq(quotes.id, quoteId),
  });

  if (!quote || quote.tenantId !== tenantId) {
    throw new Error('Quote not found');
  }

  if (quote.status !== 'pending') {
    throw new Error('Quote is not pending');
  }

  // 1. Update quote status
  await db.update(quotes)
    .set({ status: 'accepted', updatedAt: new Date() })
    .where(eq(quotes.id, quoteId));

  // 2. Create booking from quote
  const { appointment: newAppointment, depositIntent: bookingDepositIntent } = await createBooking({
    tenantId,
    contactId: quote.contactId,
    serviceId: quote.serviceId || undefined,
    startTime,
    metadata: { source: 'quote_acceptance', quoteId },
    requireDeposit,
    depositAmount,
    leadId: quote.leadId || undefined,
  });

  // 3. Use booking's deposit intent if created, otherwise create one separately
  let depositIntent = bookingDepositIntent;
  if (requireDeposit && depositAmount > 0 && !depositIntent) {
    depositIntent = await createDepositIntent({
      tenantId,
      appointmentId: newAppointment.id,
      amount: depositAmount,
    });
  }

  await logAudit({
    tenantId,
    actor: 'system',
    action: 'accept_quote',
    entityType: 'quote',
    entityId: quoteId,
    input: { appointmentId: newAppointment.id, requireDeposit, depositAmount },
    result: 'success',
  });

  return { quote, appointment: newAppointment, depositIntent };
}
