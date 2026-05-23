import { NextResponse } from 'next/server';
import { processIntake } from '@/lib/intake';
import { firstEnv, isLocalRuntime } from '@/lib/runtime-env';
import { verifyResendSignature } from '@/lib/webhook-signatures';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    if (!verifyResendSignature({
      rawBody,
      signature: req.headers.get('svix-signature') || req.headers.get('resend-signature'),
      id: req.headers.get('svix-id'),
      timestamp: req.headers.get('svix-timestamp'),
    })) {
      return NextResponse.json({ error: 'Invalid email webhook signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const from = payload.from || payload.sender;
    const body = payload.text || payload.body || payload.subject;
    const tenantId = payload.tenantId || (isLocalRuntime() ? firstEnv('VANTACORE_LOCAL_TENANT_ID') : undefined);

    if (!tenantId || !from || !body) {
      return NextResponse.json({ error: 'Invalid email payload' }, { status: 400 });
    }

    const result = await processIntake({
      tenantId,
      channel: 'email',
      from,
      content: body,
      metadata: payload,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Email Webhook Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
