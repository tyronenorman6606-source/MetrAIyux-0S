import crypto from "node:crypto";
import { env } from "@/lib/env";
import { firstEnv, isLocalRuntime, webhookMode } from "@/lib/runtime-env";

export function allowUnsignedWebhook(): boolean {
  return webhookMode() === "local-bypass" && isLocalRuntime();
}

export function verifyTwilioSignature({
  requestUrl,
  rawBody,
  signature,
}: {
  requestUrl: string;
  rawBody: string;
  signature: string | null;
}): boolean {
  if (allowUnsignedWebhook()) return true;
  if (!signature || !env.twilioAuthToken) return false;

  const publicUrl = `${env.appUrl.replace(/\/$/, "")}/api/sms/webhook`;
  const params = new URLSearchParams(rawBody);
  const data = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [key, value]) => acc + key + value, publicUrl || requestUrl);

  const digest = crypto.createHmac("sha1", env.twilioAuthToken).update(data).digest("base64");
  return timingSafeEqual(signature, digest);
}

export function verifyResendSignature({
  rawBody,
  signature,
  id,
  timestamp,
}: {
  rawBody: string;
  signature: string | null;
  id: string | null;
  timestamp: string | null;
}): boolean {
  if (allowUnsignedWebhook()) return true;
  const secret = env.resendWebhookSecret || firstEnv("SKYGATE_EVENT_MIRROR_SECRET");
  if (!secret || !signature || !id || !timestamp) return false;

  const signedPayload = `${id}.${timestamp}.${rawBody}`;
  const digest = crypto.createHmac("sha256", secret.replace(/^whsec_/, "")).update(signedPayload).digest("base64");
  const candidates = signature
    .split(/\s+/)
    .flatMap((part) => part.split(","))
    .map((part) => part.replace(/^v1,/, "").replace(/^v1=/, "").trim())
    .filter(Boolean);

  return candidates.some((candidate) => timingSafeEqual(candidate, digest));
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}
