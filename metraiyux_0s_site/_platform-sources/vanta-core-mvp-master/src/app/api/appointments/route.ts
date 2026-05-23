import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments } from '@/db/schema/schema';
import { eq } from 'drizzle-orm';
import { createBooking } from '@/lib/bookings';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  try {
    const tenantId = ownedTenantId(req, searchParams.get('tenantId'));
    const list = await db.query.appointments.findMany({
      where: eq(appointments.tenantId, tenantId),
      with: {
        contact: true,
        service: true,
      },
      orderBy: (appointments, { desc }) => [desc(appointments.startTime)],
    });

    return NextResponse.json(list);
  } catch (error) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId: requestedTenantId, contactId, serviceId, startTime, metadata, requireDeposit, depositAmount } = body;
    const tenantId = ownedTenantId(req, requestedTenantId);

    if (!tenantId || !contactId || !startTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await createBooking({
      tenantId,
      contactId,
      serviceId,
      startTime: new Date(startTime),
      metadata,
      requireDeposit: requireDeposit || false,
      depositAmount: depositAmount || 0,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create booking' }, { status: 500 });
  }
}
