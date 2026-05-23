import { env } from './env';
import { isLocalRuntime, messagingMode } from './runtime-env';

export interface SmsPayload {
  to: string;
  body: string;
}

export async function sendSms(payload: SmsPayload): Promise<boolean> {
  const mode = messagingMode();
  if (mode === 'disabled') {
    throw new Error('SMS disabled: set VANTACORE_MESSAGING_MODE=live with Twilio credentials or mock for local tests.');
  }
  if (mode === 'mock') {
    if (env.isProduction && !isLocalRuntime()) throw new Error('Mock SMS is blocked in non-local production.');
    return true;
  }

  const sid = env.twilioAccountSid;
  const token = env.twilioAuthToken;
  const from = env.twilioPhoneNumber;
  if (!sid || !token || !from) {
    throw new Error('SMS not configured: missing Twilio SID, auth token, or phone number');
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: payload.to,
      From: from,
      Body: payload.body,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Twilio SMS failed: ${response.status} ${body.slice(0, 180)}`);
  }
  return true;
}

export async function sendBulkSms(toList: string[], body: string): Promise<boolean> {
  for (const to of toList) {
    await sendSms({ to, body });
  }
  return true;
}
