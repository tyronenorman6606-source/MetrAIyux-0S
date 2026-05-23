import { NextRequest, NextResponse } from 'next/server';
import { publishContentIdea } from '@/lib/autopilot';
import { db } from '@/db';
import { contentIdeas } from '@/db/schema/schema';
import { eq } from 'drizzle-orm';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function POST(req: NextRequest, context: any) {
  try {
    const { id } = await context.params;
    const idea = await db.query.contentIdeas.findFirst({ where: eq(contentIdeas.id, id) });
    if (!idea) return NextResponse.json({ error: 'Content idea not found' }, { status: 404 });
    ownedTenantId(req, idea.tenantId);

    const updated = await publishContentIdea(id);
    return NextResponse.json({ success: true, idea: updated });
  } catch (error: any) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    return NextResponse.json({ error: error.message || 'Failed to publish content' }, { status: 500 });
  }
}
