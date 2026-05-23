import { db } from "@/db";
import {
  leads,
  contacts,
  leadExchange,
  leadTradeTransactions,
  escrowLedger,
  services,
  serviceAreas,
  tenants,
  conversations,
  appointments,
} from "@/db/schema/schema";
import { eq, and, ne, sql, gte, desc } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export interface TradeLeadMetadata {
  serviceType: string;
  zipCode?: string;
  urgency: string;
  summary: string;
}

export function stripPII(contact: any) {
  return {
    ...contact,
    name: "[ANONYMIZED]",
    email: "[ANONYMIZED]@example.com",
    phone: "[ANONYMIZED]",
  };
}

export async function listLeadForTrade({
  leadId,
  tenantId,
  price,
  metadata,
}: {
  leadId: string;
  tenantId: string;
  price: string;
  metadata: TradeLeadMetadata;
}) {
  const lead = await db.query.leads.findFirst({
    where: and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)),
    with: { contact: true },
  });

  if (!lead) throw new Error("Lead not found or does not belong to tenant");

  const anonymizedData = stripPII(lead.contact);
  const [listedLead] = await db.insert(leadExchange).values({
    tenantId,
    leadId,
    price,
    status: "available",
    anonymizedData,
    metadata,
  }).returning();

  await logAudit({
    tenantId,
    actor: "system",
    action: "list_lead_for_trade",
    entityType: "lead_exchange",
    entityId: listedLead.id,
    input: { leadId, price, metadata },
    result: "success",
  });

  return listedLead;
}

export async function matchBuyers(exchangeId: string) {
  const listedLead = await db.query.leadExchange.findFirst({
    where: eq(leadExchange.id, exchangeId),
  });

  if (!listedLead) throw new Error("Listed lead not found");
  const { serviceType, zipCode } = listedLead.metadata as TradeLeadMetadata;

  const potentialBuyers = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .innerJoin(services, eq(services.tenantId, tenants.id))
    .leftJoin(serviceAreas, eq(serviceAreas.tenantId, tenants.id))
    .where(
      and(
        ne(tenants.id, listedLead.tenantId),
        eq(tenants.status, "active"),
        sql`${services.name} ILIKE ${"%" + serviceType + "%"}`,
        zipCode ? sql`${serviceAreas.zipCodes} @> ARRAY[${zipCode}]::text[]` : sql`TRUE`
      )
    )
    .groupBy(tenants.id);

  return potentialBuyers;
}

export async function purchaseLead({
  exchangeId,
  buyerTenantId,
}: {
  exchangeId: string;
  buyerTenantId: string;
}) {
  return await db.transaction(async (tx) => {
    const listedLead = await tx.query.leadExchange.findFirst({
      where: and(eq(leadExchange.id, exchangeId), eq(leadExchange.status, "available")),
    });

    if (!listedLead) throw new Error("Lead not available for purchase");

    const price = parseFloat(listedLead.price);
    const successFeeRate = 0.15;
    const successFee = (price * successFeeRate).toFixed(2);
    const sellerNet = (price - parseFloat(successFee)).toFixed(2);

    const [transaction] = await tx.insert(leadTradeTransactions).values({
      exchangeId,
      buyerTenantId,
      amount: listedLead.price,
      successFee,
      status: "escrow",
    }).returning();

    await tx.insert(escrowLedger).values({
      tenantId: buyerTenantId,
      transactionId: transaction.id,
      type: "debit",
      amount: listedLead.price,
      description: `Purchase of lead ${exchangeId}`,
    });

    await tx.insert(escrowLedger).values({
      tenantId: listedLead.tenantId,
      transactionId: transaction.id,
      type: "credit",
      amount: sellerNet,
      description: `Sale of lead ${exchangeId} (Net of success fee)`,
    });

    await tx.update(leadExchange)
      .set({ status: "sold", updatedAt: new Date() })
      .where(eq(leadExchange.id, exchangeId));

    const originalLead = await tx.query.leads.findFirst({
      where: eq(leads.id, listedLead.leadId),
      with: { contact: true },
    });

    if (originalLead) {
      const contactAny = originalLead.contact as any;
      const [newContact] = await tx.insert(contacts).values({
        tenantId: buyerTenantId,
        name: contactAny.name,
        email: contactAny.email,
        phone: contactAny.phone,
        source: "trade",
      }).returning();

      await tx.insert(leads).values({
        tenantId: buyerTenantId,
        contactId: newContact.id,
        status: "new",
        urgency: originalLead.urgency,
      });
    }

    await logAudit({
      tenantId: buyerTenantId,
      actor: "system",
      action: "purchase_lead",
      entityType: "lead_trade_transactions",
      entityId: transaction.id,
      input: { exchangeId },
      result: "success",
    });

    return transaction;
  });
}

/* ------------------------------------------------------------------ */
/*  Marketplace 2.0: Dynamic Pricing + Reserve + Close Probability     */
/* ------------------------------------------------------------------ */

export async function listLeadOnExchange(
  tenantId: string,
  leadId: string,
  basePrice: number,
  reservePrice?: number
) {
  const lead = await db.query.leads.findFirst({
    where: and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)),
    with: { contact: true, service: true },
  });

  if (!lead) throw new Error("Lead not found or does not belong to tenant");

  const signals = await computeLeadSignals(leadId, lead.contactId);
  const dynamicScore = calculateDynamicScore(lead, signals);
  const closeProbability = calculateCloseProbability(lead, dynamicScore, signals);
  const buyerConfidence = calculateBuyerConfidence(lead, signals);

  const serviceAny = lead.service as any;
  const contactAny = lead.contact as any;

  const anonymizedData = {
    service: serviceAny?.name,
    urgency: lead.urgency,
    area: contactAny?.phone ? contactAny.phone.substring(0, 5) : "*****",
    score: dynamicScore,
    closeProbability,
    buyerConfidence,
  };

  const [exchangeRecord] = await db
    .insert(leadExchange)
    .values({
      tenantId,
      leadId,
      price: basePrice.toString(),
      reservePrice: reservePrice?.toString(),
      dynamicScore,
      closeProbability: closeProbability.toString(),
      buyerConfidence: buyerConfidence.toString(),
      anonymizedData,
      metadata: {
        serviceType: serviceAny?.name || "General Business",
        urgency: lead.urgency,
        zipCode: signals.zipCode,
      } as TradeLeadMetadata,
    })
    .returning();

  await logAudit({
    tenantId,
    actor: "system",
    action: "list_lead",
    entityType: "lead_exchange",
    entityId: exchangeRecord.id,
    result: "success",
  });

  return exchangeRecord;
}

interface LeadSignals {
  conversationCount: number;
  appointmentCount: number;
  zipCode?: string;
}

async function computeLeadSignals(leadId: string, contactId: string): Promise<LeadSignals> {
  const [convCount] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(conversations)
    .where(eq(conversations.contactId, contactId));

  const [apptCount] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(appointments)
    .where(eq(appointments.contactId, contactId));

  return {
    conversationCount: convCount?.count ?? 0,
    appointmentCount: apptCount?.count ?? 0,
    zipCode: undefined,
  };
}

function calculateDynamicScore(lead: any, signals: LeadSignals) {
  let score = 50;
  if (lead.urgency === "high") score += 20;
  if (lead.urgency === "medium") score += 10;
  if (lead.qualityScore && lead.qualityScore > 7) score += 15;
  if (lead.qualityScore && lead.qualityScore > 5) score += 8;
  if ((lead.service as any)?.isEmergency) score += 15;
  if (signals.appointmentCount > 0) score += 10;
  if (signals.conversationCount > 0) score += 5;
  return Math.min(100, Math.max(0, score));
}

function calculateCloseProbability(lead: any, score: number, signals: LeadSignals) {
  let base = score / 100;
  if (lead.urgency === "high") base *= 1.15;
  if (lead.urgency === "medium") base *= 1.05;
  if (signals.appointmentCount > 0) base *= 1.1;
  if (signals.conversationCount > 0) base *= 1.05;
  return Math.min(0.95, parseFloat(base.toFixed(3)));
}

function calculateBuyerConfidence(lead: any, signals: LeadSignals) {
  let confidence = lead.qualityScore ? lead.qualityScore / 10 : 0.75;
  if ((lead.service as any)?.isEmergency) confidence += 0.1;
  if (signals.appointmentCount > 0) confidence += 0.05;
  return Math.min(1.0, parseFloat(confidence.toFixed(3)));
}

/* ------------------------------------------------------------------ */
/*  Data fetchers                                                       */
/* ------------------------------------------------------------------ */

export async function getExchangeListings(opts?: {
  tenantId?: string;
  status?: string;
  limit?: number;
  excludeTenantId?: string;
}) {
  const { tenantId, status = "available", limit = 50, excludeTenantId } = opts ?? {};
  const conditions = [eq(leadExchange.status, status)];
  if (tenantId) conditions.push(eq(leadExchange.tenantId, tenantId));
  if (excludeTenantId) conditions.push(ne(leadExchange.tenantId, excludeTenantId));

  const listings = await db.query.leadExchange.findMany({
    where: and(...conditions),
    with: {
      lead: { with: { contact: true, service: true } },
      tenant: true,
    },
    limit,
    orderBy: [desc(leadExchange.createdAt)],
  });

  return listings;
}

export async function getTenantTradeTransactions(tenantId: string, opts?: { limit?: number }) {
  const limit = opts?.limit ?? 50;
  const asBuyer = await db.query.leadTradeTransactions.findMany({
    where: eq(leadTradeTransactions.buyerTenantId, tenantId),
    with: { exchange: true },
    limit,
    orderBy: [desc(leadTradeTransactions.createdAt)],
  });

  const asSeller = await db
    .select()
    .from(leadTradeTransactions)
    .innerJoin(leadExchange, eq(leadTradeTransactions.exchangeId, leadExchange.id))
    .where(and(eq(leadExchange.tenantId, tenantId), ne(leadTradeTransactions.buyerTenantId, tenantId)))
    .orderBy(desc(leadTradeTransactions.createdAt))
    .limit(limit);

  return { asBuyer, asSeller };
}

export async function getMarketStats() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const numeric = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const [active] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(leadExchange)
    .where(eq(leadExchange.status, "available"));

  const [avgPriceRow] = await db
    .select({ avg: sql<number>`avg(${leadExchange.price})`.as("avg") })
    .from(leadExchange)
    .where(eq(leadExchange.status, "available"));

  const [transactions24h] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(leadTradeTransactions)
    .where(gte(leadTradeTransactions.createdAt, dayAgo));

  const [volume24hRow] = await db
    .select({ sum: sql<number>`coalesce(sum(${leadTradeTransactions.amount}), 0)`.as("sum") })
    .from(leadTradeTransactions)
    .where(gte(leadTradeTransactions.createdAt, dayAgo));

  const [completedTx] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(leadTradeTransactions)
    .where(eq(leadTradeTransactions.status, "completed"));

  const [disputedTx] = await db
    .select({ count: sql<number>`count(*)`.as("count") })
    .from(leadTradeTransactions)
    .where(eq(leadTradeTransactions.status, "disputed"));

  const completedCount = numeric(completedTx?.count);
  const disputedCount = numeric(disputedTx?.count);
  const totalSettled = completedCount + disputedCount;
  const trustScore = totalSettled === 0 ? 100 : Math.round((completedCount / totalSettled) * 100);

  return {
    activeListings: numeric(active?.count),
    avgLeadPrice: Number(numeric(avgPriceRow?.avg).toFixed(2)),
    transactions24h: numeric(transactions24h?.count),
    volume24h: Number(numeric(volume24hRow?.sum).toFixed(2)),
    trustScore,
  };
}
