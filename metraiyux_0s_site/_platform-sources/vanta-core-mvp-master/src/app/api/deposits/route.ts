import { NextRequest, NextResponse } from 'next/server';
import { requireDeposit, confirmDeposit, rebookWithDeposit, refundDeposit } from '@/lib/deposits';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, tenantId: requestedTenantId, appointmentId, amount, paymentIntentId, originalAppointmentId, newStartTime } = body;
    const tenantId = ownedTenantId(req, requestedTenantId);

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    if (action === 'require') {
      if (!appointmentId) return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });
      if (!amount) return NextResponse.json({ error: 'Missing amount' }, { status: 400 });
      const result = await requireDeposit({ tenantId, appointmentId, amount });
      return NextResponse.json(result);
    }

    if (action === 'confirm') {
      if (!appointmentId) return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });
      if (!paymentIntentId) return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 });
      const result = await confirmDeposit({ tenantId, appointmentId, paymentIntentId });
      return NextResponse.json(result);
    }

    if (action === 'refund') {
      if (!appointmentId) return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });
      const result = await refundDeposit({ tenantId, appointmentId });
      return NextResponse.json(result);
    }

    if (action === 'rebook') {
      if (!originalAppointmentId || !newStartTime) {
        return NextResponse.json({ error: 'Missing originalAppointmentId or newStartTime' }, { status: 400 });
      }
      const result = await rebookWithDeposit({
        tenantId,
        originalAppointmentId,
        newStartTime: new Date(newStartTime),
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Deposit action failed' }, { status: 500 });
  }
}
