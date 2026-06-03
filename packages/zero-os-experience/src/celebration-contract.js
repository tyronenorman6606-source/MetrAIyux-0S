export const ZERO_OS_CELEBRATION_EVENT = '0s:celebration';
export const ZERO_OS_TOUR_RECEIPT_EVENT = '0s:tour-receipt';

export const CELEBRATION_TRIGGER_TYPES = Object.freeze([
  'receipt-saved',
  'proof-green',
  'deploy-green',
  'workflow-complete',
  'owner-thank-you'
]);

export function normalizeCelebrationPayload(payload = {}) {
  const surfaceId = String(payload.surfaceId || payload.surface_id || '').trim();
  const receiptId = String(payload.receiptId || payload.receipt_id || '').trim();
  const triggerType = String(payload.triggerType || payload.trigger_type || 'receipt-saved').trim();
  const intensity = String(payload.intensity || 'standard').trim();
  const videoModalKey = String(payload.videoModalKey || payload.video_modal_key || '').trim();
  return {
    surfaceId,
    receiptId,
    triggerType: CELEBRATION_TRIGGER_TYPES.includes(triggerType) ? triggerType : 'receipt-saved',
    intensity: ['quiet', 'standard', 'high'].includes(intensity) ? intensity : 'standard',
    videoModalKey,
    receiptBacked: payload.receiptBacked !== false && payload.receipt_backed !== false,
    preview: payload.preview === true || payload.draft === true || payload.fake === true,
    message: String(payload.message || '').trim()
  };
}

export function celebrationIsReceiptBacked(payload = {}) {
  const normalized = normalizeCelebrationPayload(payload);
  return Boolean(normalized.surfaceId && normalized.receiptId && normalized.receiptBacked && !normalized.preview);
}

export function celebrationDedupeKey(payload = {}) {
  const normalized = normalizeCelebrationPayload(payload);
  return [
    'zero-os-celebration',
    normalized.surfaceId || 'surface',
    normalized.receiptId || 'receipt',
    normalized.triggerType || 'trigger'
  ].join(':');
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function dispatchCelebration(payload = {}) {
  if (typeof window === 'undefined') return false;
  window.dispatchEvent(new CustomEvent(ZERO_OS_CELEBRATION_EVENT, {
    detail: normalizeCelebrationPayload(payload)
  }));
  return true;
}
