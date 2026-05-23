import { NextRequest, NextResponse } from 'next/server';
import { rejectContentIdea } from '@/lib/autopilot';
import { db } from '@/db';
import { contentIdeas } from '@/db/schema/schema';
import { eq } from 'drizzle-orm';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function POST(req: NextRequest, context: any) {
  try {
    const body = await req.json();
    const { reason } = body;
    const { id } = await context.params;
    const idea = await db.query.contentIdeas.findFirst({ where: eq(contentIdeas.id, id) });
    if (!idea) return NextResponse.json({ error: 'Content idea not found' }, { status: 404 });
    ownedTenantId(req, idea.tenantId);

    const updated = await rejectContentIdea(id, reason);
    return NextResponse.json({ success: true, idea: updated });
  } catch (error: any) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    return NextResponse.json({ error: error.message || 'Failed to reject content' }, { status: 500 });
  }
}
