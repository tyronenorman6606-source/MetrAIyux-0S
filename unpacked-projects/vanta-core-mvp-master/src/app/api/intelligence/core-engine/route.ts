import { NextRequest, NextResponse } from 'next/server';
import { runCoreEngine } from '@/lib/core-engine';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId: requestedTenantId, modules, dryRun } = body;
    const tenantId = ownedTenantId(req, requestedTenantId);

    const result = await runCoreEngine({ tenantId, modules, dryRun });
    return NextResponse.json(result);
  } catch (error: any) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    console.error('Core Engine Error:', error);
    return NextResponse.json(
      { error: error.message || 'Core engine run failed' },
      { status: 500 }
    );
  }
}
