import { NextResponse } from 'next/server';
import { createVanta13Adapter } from '@/lib/vanta13/adapter';
import { processIntake } from '@/lib/leads';
import { db } from '@/db';
import { calls, callTranscripts } from '@/db/schema/schema';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function POST(req: Request) {
  try {
    const { tenantId: requestedTenantId, from, sid, direction, status, transcript } = await req.json();
    const tenantId = ownedTenantId(req, requestedTenantId);

    if (!tenantId || !from || !sid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Log or Update Call Record
    // Find contact for the call
    const contact = await db.query.contacts.findFirst({
        where: (contacts, { and, eq }) => and(eq(contacts.tenantId, tenantId), eq(contacts.phone, from))
    });
    
    const contactId = contact?.id;

    const [callRecord] = await db.insert(calls).values({
      tenantId,
      contactId: contactId || '', // Handle cases where contact doesn't exist yet
      sid,
      direction: direction || 'inbound',
      status: status || 'completed',
    }).onConflictDoUpdate({
        target: calls.sid,
        set: { status: status || 'completed' }
    }).returning();

    // 2. Log Transcript if provided
    if (transcript) {
      await db.insert(callTranscripts).values({
        tenantId,
        callId: callRecord.id,
        transcript,
      });

      // 3. Classify and process as Lead intake
      const adapter = createVanta13Adapter();
      const decision = await adapter.classify({ text: transcript });

      await processIntake({
        tenantId,
        channel: 'call',
        from,
        content: transcript,
        metadata: { callSid: sid },
        decision,
      });

      return NextResponse.json({ success: true, decision });
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    console.error('Intake call error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Intake call failed' }, { status: 500 });
  }
}
