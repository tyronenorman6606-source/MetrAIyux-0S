import { NextResponse } from 'next/server';
import { db } from '@/db';
import { leads, calls, appointments, quotes, followupEvents, ownerAlerts, auditLogs } from '@/db/schema/schema';
import { eq, sql, and } from 'drizzle-orm';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let tenantId: string;

  try {
    tenantId = ownedTenantId(req, searchParams.get('tenantId'));
  } catch (error) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    throw error;
  }

  try {
    const [leadsCount] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.tenantId, tenantId));
    const [callsCount] = await db.select({ count: sql<number>`count(*)` }).from(calls).where(eq(calls.tenantId, tenantId));
    const [appointmentsCount] = await db.select({ count: sql<number>`count(*)` }).from(appointments).where(eq(appointments.tenantId, tenantId));
    const [quotesCount] = await db.select({ count: sql<number>`count(*)` }).from(quotes).where(eq(quotes.tenantId, tenantId));
    const [noShowCount] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(
      and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.action, 'mark_no_show'))
    );
    const [pendingFollowups] = await db.select({ count: sql<number>`count(*)` }).from(followupEvents).where(
      and(eq(followupEvents.tenantId, tenantId), eq(followupEvents.status, 'pending'))
    );
    const [unreadAlerts] = await db.select({ count: sql<number>`count(*)` }).from(ownerAlerts).where(
      and(eq(ownerAlerts.tenantId, tenantId), eq(ownerAlerts.isRead, false))
    );

    return NextResponse.json({
      leadsCaptured: leadsCount.count,
      revenueProtected: (leadsCount.count * 150), // Mock calculation: $150 per lead
      callsAnswered: callsCount.count,
      appointmentsBooked: appointmentsCount.count,
      quotesGenerated: quotesCount.count,
      noShows: noShowCount.count,
      pendingFollowups: pendingFollowups.count,
      unreadAlerts: unreadAlerts.count,
    });
  } catch (error) {
    console.error('Summary Fetch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
