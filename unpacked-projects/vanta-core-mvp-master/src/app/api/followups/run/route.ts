import { NextRequest, NextResponse } from 'next/server';
import { processFollowups } from '@/lib/followups';
import { assertGateAdmin, tenantGuardResponse } from '@/lib/tenant-guard';

export async function POST(req: NextRequest) {
  try {
    assertGateAdmin(req);
    // In a real system, this might be triggered by a CRON job (QStash, etc.)
    await processFollowups();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    return NextResponse.json({ error: error.message || 'Failed to process followups' }, { status: 500 });
  }
}
