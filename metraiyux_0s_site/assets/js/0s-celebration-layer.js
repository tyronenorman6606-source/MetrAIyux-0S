(function () {
  'use strict';

  const EVENT_NAME = '0s:celebration';
  const CDN_MODULE = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.module.mjs';
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const memorySeen = new Set();
  let confettiPromise = null;

  function ensureStyle() {
    if (document.querySelector('[data-zero-os-experience-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/css/0s-experience-layer.css';
    link.dataset.zeroOsExperienceStyle = 'true';
    document.head.appendChild(link);
  }

  function normalize(payload) {
    const source = payload || {};
    const surfaceId = String(source.surfaceId || source.surface_id || '').trim();
    const receiptId = String(source.receiptId || source.receipt_id || '').trim();
    const triggerType = String(source.triggerType || source.trigger_type || 'receipt-saved').trim();
    return {
      surfaceId,
      receiptId,
      triggerType,
      intensity: ['quiet', 'standard', 'high'].includes(source.intensity) ? source.intensity : 'standard',
      videoModalKey: String(source.videoModalKey || source.video_modal_key || '').trim(),
      message: String(source.message || '').trim(),
      receiptBacked: source.receiptBacked !== false && source.receipt_backed !== false,
      preview: source.preview === true || source.draft === true || source.fake === true
    };
  }

  function isReceiptBacked(payload) {
    return Boolean(payload.surfaceId && payload.receiptId && payload.receiptBacked && !payload.preview);
  }

  function dedupeKey(payload) {
    return ['zero-os-celebration', payload.surfaceId, payload.receiptId, payload.triggerType].join(':');
  }

  function seen(key) {
    if (memorySeen.has(key)) return true;
    try {
      return window.sessionStorage?.getItem(key) === '1';
    } catch (_err) {
      return false;
    }
  }

  function markSeen(key) {
    memorySeen.add(key);
    try {
      window.sessionStorage?.setItem(key, '1');
    } catch (_err) {
      // Private browsing can reject storage. The memory set still prevents duplicate bursts in this page load.
    }
  }

  async function loadConfetti() {
    if (typeof window.confetti === 'function') return window.confetti;
    if (!confettiPromise) {
      confettiPromise = import(CDN_MODULE).then((mod) => mod.default || mod.confetti);
    }
    return confettiPromise;
  }

  function showMessage(payload, motionSkipped) {
    ensureStyle();
    const host = document.querySelector('[data-zero-os-celebration-log]') || document.createElement('div');
    host.dataset.zeroOsCelebrationLog = 'true';
    host.className = 'zero-os-celebration-log';
    host.setAttribute('role', 'status');
    host.textContent = payload.message || (motionSkipped ? 'Receipt saved. Motion reduced.' : 'Receipt-backed milestone saved.');
    if (!host.parentNode) document.body.appendChild(host);
    window.setTimeout(() => {
      if (host.parentNode) host.remove();
    }, 4200);
  }

  function openVideoModal(payload) {
    if (!payload.videoModalKey) return;
    ensureStyle();
    const registry = window.ZERO_OS_THANK_YOU_VIDEOS || {};
    const video = registry[payload.videoModalKey];
    if (!video?.src) return;
    const modal = document.createElement('div');
    modal.className = 'zero-os-thank-you-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', video.label || 'Thank you video');
    modal.innerHTML = `
      <div class="zero-os-thank-you-modal__panel">
        <button type="button" data-zero-os-close-video aria-label="Close thank you video">Close</button>
        <video src="${String(video.src).replace(/"/g, '&quot;')}" poster="${String(video.poster || '').replace(/"/g, '&quot;')}" controls playsinline></video>
      </div>
    `;
    modal.querySelector('[data-zero-os-close-video]')?.addEventListener('click', () => modal.remove());
    document.body.appendChild(modal);
  }

  async function celebrate(rawPayload) {
    const payload = normalize(rawPayload);
    if (!isReceiptBacked(payload)) return { ok: false, reason: 'not_receipt_backed' };
    const key = dedupeKey(payload);
    if (seen(key)) return { ok: true, skipped: true, reason: 'deduped' };
    markSeen(key);
    const motionSkipped = reduceMotion();
    showMessage(payload, motionSkipped);
    openVideoModal(payload);
    if (motionSkipped) return { ok: true, skipped: true, reason: 'reduced_motion' };
    const confetti = await loadConfetti();
    const particleCount = payload.intensity === 'high' ? 220 : payload.intensity === 'quiet' ? 60 : 130;
    await confetti({
      particleCount,
      spread: payload.intensity === 'quiet' ? 42 : 72,
      startVelocity: payload.intensity === 'high' ? 42 : 28,
      scalar: payload.intensity === 'quiet' ? 0.74 : 1,
      disableForReducedMotion: true
    });
    return { ok: true, skipped: false, reason: 'played' };
  }

  window.ZeroOsCelebrationLayer = Object.freeze({
    eventName: EVENT_NAME,
    celebrate,
    normalize,
    isReceiptBacked,
    dedupeKey
  });

  window.addEventListener(EVENT_NAME, (event) => {
    celebrate(event.detail).catch((error) => {
      console.warn('[0S celebration]', error);
    });
  });
}());
