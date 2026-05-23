import { createVanta13Adapter } from '@/lib/vanta13/adapter';
import { processIntake } from '@/lib/leads';
import { db } from '@/db';
import { integrations } from '@/db/schema/schema';
import { eq, and } from 'drizzle-orm';
import { isLocalRuntime } from '@/lib/runtime-env';
import { verifyTwilioSignature } from '@/lib/webhook-signatures';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    if (!verifyTwilioSignature({
      requestUrl: req.url,
      rawBody,
      signature: req.headers.get('x-twilio-signature'),
    })) {
      return new Response('Invalid Twilio signature', { status: 401 });
    }

    const formData = new URLSearchParams(rawBody);
    const from = formData.get('From');
    const to = formData.get('To');
    const body = formData.get('Body');

    if (!from || !to || !body) {
      return new Response('Missing Twilio fields', { status: 400 });
    }

    // 1. Identify Tenant by 'To' phone number
    const integration = await db.query.integrations.findFirst({
      where: and(
        eq(integrations.provider, 'twilio'),
        // In a real app, we'd check the config jsonb for the phone number
        // For now, let's assume we have a way to map 'To' to tenantId
      )
    });

    let tenantId: string;
    if (integration) {
      tenantId = integration.tenantId;
    } else if (isLocalRuntime()) {
      const firstTenant = await db.query.tenants.findFirst();
      if (!firstTenant) throw new Error('No tenant found');
      tenantId = firstTenant.id;
    } else {
      return new Response('No tenant mapped for this Twilio number', { status: 404 });
    }

    // 2. Classify with VANTA13
    const adapter = createVanta13Adapter();
    const decision = await adapter.classify({ text: body });

    // 3. Process Intake
    await processIntake({
      tenantId,
      channel: 'sms',
      from,
      content: body,
      metadata: Object.fromEntries(formData.entries()),
      decision,
    });

    // 4. Respond with TwiML (Mock)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Sms>${decision.nextMessage}</Sms>
    </Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error: unknown) {
    console.error('SMS webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
}
