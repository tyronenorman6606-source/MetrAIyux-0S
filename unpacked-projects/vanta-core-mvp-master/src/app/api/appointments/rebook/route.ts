import { NextRequest, NextResponse } from 'next/server';
import { rebookAppointment } from '@/lib/bookings';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId: requestedTenantId, originalAppointmentId, newStartTime, applyPreviousDeposit } = body;
    const tenantId = ownedTenantId(req, requestedTenantId);

    if (!tenantId || !originalAppointmentId || !newStartTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await rebookAppointment({
      tenantId,
      originalAppointmentId,
      newStartTime: new Date(newStartTime),
      applyPreviousDeposit: applyPreviousDeposit || false,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
