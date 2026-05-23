import { env } from './env';
import { isLocalRuntime, messagingMode } from './runtime-env';

export interface EmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const mode = messagingMode();
  if (mode === 'disabled') {
    throw new Error('Email disabled: set VANTACORE_MESSAGING_MODE=live with Resend credentials or mock for local tests.');
  }
  if (mode === 'mock') {
    if (env.isProduction && !isLocalRuntime()) throw new Error('Mock email is blocked in non-local production.');
    return true;
  }

  const apiKey = env.resendApiKey;
  const from = env.resendFromEmail;
  if (!apiKey || !from) throw new Error('Email not configured: missing RESEND_API_KEY or RESEND_FROM_EMAIL/MAIL_FROM');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${body.slice(0, 180)}`);
  }
  return true;
}

export async function sendTemplateEmail(template: string, to: string, data: Record<string, unknown>): Promise<boolean> {
  return sendEmail({ to, subject: template, text: JSON.stringify(data) });
}
