import { db } from '@/db';
import { appointments } from '@/db/schema/schema';
import { eq, and } from 'drizzle-orm';
import { logAudit } from './audit';
import { env } from './env';
import { firstEnv, isLocalRuntime, paymentMode } from './runtime-env';

export async function createDepositIntent({
  tenantId,
  appointmentId,
  amount,
}: {
  tenantId: string;
  appointmentId: string;
  amount: number;
}) {
  try {
    // 1. Get Appointment
    const appointment = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, appointmentId),
        eq(appointments.tenantId, tenantId)
      ),
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const mode = paymentMode();
    if (mode === 'disabled') {
      throw new Error('Deposits are disabled until VANTACORE_PAYMENT_MODE=skypay is configured.');
    }
    if (mode === 'mock' && env.isProduction && !isLocalRuntime()) {
      throw new Error('Mock deposits are blocked in non-local production.');
    }

    const intent = mode === 'skypay'
      ? await createSkyePayDepositIntent({ tenantId, appointmentId, amount })
      : createMockDepositIntent(amount);

    // 3. Update Appointment
    await db.update(appointments)
      .set({
        depositAmount: amount.toFixed(2),
        depositStatus: 'pending',
        stripePaymentIntentId: intent.paymentIntentId,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    await logAudit({
      tenantId,
      actor: 'system',
      action: 'create_deposit_intent',
      entityType: 'appointment',
      entityId: appointmentId,
      input: { amount, paymentIntentId: intent.paymentIntentId, mode },
      result: 'success',
    });

    return {
      clientSecret: intent.clientSecret,
      checkoutUrl: intent.checkoutUrl,
      amount,
    };
  } catch (error) {
    console.error('Deposit intent creation error:', error);
    throw error;
  }
}

export async function confirmDepositPayment(tenantId: string, paymentIntentId: string) {
  if (paymentMode() === 'skypay' && env.isProduction && !isLocalRuntime() && firstEnv('VANTACORE_ALLOW_MANUAL_DEPOSIT_CONFIRM') !== 'true') {
    throw new Error('SkyePay deposits must be confirmed by the signed SkyePay/FS27 payment event, not by manual API call.');
  }

  const [appointment] = await db.update(appointments)
    .set({
      depositStatus: 'paid',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(appointments.stripePaymentIntentId, paymentIntentId),
        eq(appointments.tenantId, tenantId)
      )
    )
    .returning();

  if (appointment) {
    await logAudit({
      tenantId,
      actor: 'system',
      action: 'confirm_deposit',
      entityType: 'appointment',
      entityId: appointment.id,
      input: { paymentIntentId },
      result: 'paid',
    });
  }

  return appointment;
}

function createMockDepositIntent(amount: number) {
  const paymentIntentId = `pi_mock_${Math.random().toString(36).substring(7)}`;
  return {
    paymentIntentId,
    clientSecret: `${paymentIntentId}_secret_mock`,
    checkoutUrl: null,
    amount,
  };
}

async function createSkyePayDepositIntent({
  tenantId,
  appointmentId,
  amount,
}: {
  tenantId: string;
  appointmentId: string;
  amount: number;
}) {
  const baseUrl = env.skyPayBaseUrl;
  const offerId = firstEnv('VANTACORE_SKYPAY_DEPOSIT_OFFER_ID');
  if (!baseUrl || !offerId) {
    throw new Error('SkyePay deposit mode requires SKYPAY_BASE_URL/SKYGATEFS27_WORKER_URL and VANTACORE_SKYPAY_DEPOSIT_OFFER_ID.');
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/skyepay/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_slug: firstEnv('VANTACORE_SKYPAY_CLIENT_SLUG') || 'metraiyux-0s',
      offer_id: offerId,
      customer_name: `VantaCore tenant ${tenantId}`,
      customer_email: firstEnv('VANTACORE_SKYPAY_FALLBACK_EMAIL', 'MAIL_TO') || 'owner@example.com',
      company_name: 'VantaCore Service CRM',
      idempotency_key: `${tenantId}-${appointmentId}-${amount}`,
      metadata: {
        tenantId,
        appointmentId,
        amount,
        source: 'vantacore-service-crm',
      },
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`SkyePay checkout failed: ${response.status} ${JSON.stringify(body).slice(0, 240)}`);
  }

  const paymentIntentId = String(body.id || body.session_id || body.order_id || `skyepay_${appointmentId}`);
  return {
    paymentIntentId,
    clientSecret: `${paymentIntentId}_skyepay_checkout`,
    checkoutUrl: body.url || body.checkout_url || null,
  };
}
