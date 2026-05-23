import { NextResponse } from 'next/server';
import { createVanta13Adapter } from '@/lib/vanta13/adapter';
import { processIntake } from '@/lib/leads';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function POST(req: Request) {
  try {
    const { tenantId: requestedTenantId, channel, from, name, content, metadata } = await req.json();
    const tenantId = ownedTenantId(req, requestedTenantId);

    if (!tenantId || !from || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Classify with VANTA13
    const adapter = createVanta13Adapter();
    const decision = await adapter.classify({ text: content });

    // 2. Process Intake
    const result = await processIntake({
      tenantId,
      channel: channel || 'chat',
      from,
      name,
      content,
      metadata,
      decision,
    });

    return NextResponse.json({
      success: true,
      decision,
      ...result,
    });

  } catch (error: unknown) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    console.error('Intake message error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Intake message failed' }, { status: 500 });
  }
}
