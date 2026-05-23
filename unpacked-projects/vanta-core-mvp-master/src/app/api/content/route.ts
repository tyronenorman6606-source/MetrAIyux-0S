import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contentIdeas } from '@/db/schema/schema';
import { eq, desc } from 'drizzle-orm';
import { generateContentIdeas, getContentStats } from '@/lib/content';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let tenantId: string;
  const status = searchParams.get('status') as any;

  try {
    tenantId = ownedTenantId(req, searchParams.get('tenantId'));
  } catch (error) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    throw error;
  }

  try {
    const ideas = await db.query.contentIdeas.findMany({
      where: eq(contentIdeas.tenantId, tenantId),
      orderBy: [desc(contentIdeas.createdAt)],
    });

    const stats = await getContentStats(tenantId);

    return NextResponse.json({ ideas, stats });
  } catch (error: any) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    return NextResponse.json({ error: error.message || 'Failed to fetch content ideas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId: requestedTenantId } = body;
    const tenantId = ownedTenantId(req, requestedTenantId);

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const ideas = await generateContentIdeas(tenantId);

    return NextResponse.json({ 
      success: true, 
      generated: ideas.length,
      ideas 
    });
  } catch (error: any) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    return NextResponse.json({ error: error.message || 'Failed to generate content ideas' }, { status: 500 });
  }
}
