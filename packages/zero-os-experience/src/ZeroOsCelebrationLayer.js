import React, { useEffect, useMemo, useState } from 'react';
import Confetti from 'react-confetti';
import {
  ZERO_OS_CELEBRATION_EVENT,
  celebrationDedupeKey,
  celebrationIsReceiptBacked,
  normalizeCelebrationPayload,
  prefersReducedMotion
} from './celebration-contract.js';
import { useZeroOsExperienceStore } from './experience-store.js';

function storageHas(key) {
  try {
    return window.sessionStorage?.getItem(key) === '1';
  } catch (_err) {
    return false;
  }
}

function storageMark(key) {
  try {
    window.sessionStorage?.setItem(key, '1');
  } catch (_err) {
    // Session storage can fail in private modes. In-memory React queue still dedupes per render cycle.
  }
}

function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    function resize() {
      setSize({ width: window.innerWidth || 0, height: window.innerHeight || 0 });
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });
    return () => window.removeEventListener('resize', resize);
  }, []);
  return size;
}

export function ZeroOsCelebrationLayer({ videoRegistry = {}, ttlMs = 5200 }) {
  const size = useWindowSize();
  const [active, setActive] = useState(null);
  const [seenKeys, setSeenKeys] = useState(() => new Set());
  const enqueueCelebration = useZeroOsExperienceStore((state) => state.enqueueCelebration);
  const openVideoModal = useZeroOsExperienceStore((state) => state.openVideoModal);
  const videoModalKey = useZeroOsExperienceStore((state) => state.videoModalKey);
  const closeVideoModal = useZeroOsExperienceStore((state) => state.closeVideoModal);
  const video = videoModalKey ? videoRegistry[videoModalKey] : null;

  useEffect(() => {
    function onCelebration(event) {
      const payload = normalizeCelebrationPayload(event.detail || {});
      if (!celebrationIsReceiptBacked(payload)) return;
      const key = celebrationDedupeKey(payload);
      if (seenKeys.has(key) || storageHas(key)) return;
      storageMark(key);
      setSeenKeys((current) => new Set([...current, key]));
      enqueueCelebration(payload);
      if (payload.videoModalKey) openVideoModal(payload.videoModalKey);
      if (!prefersReducedMotion()) setActive(payload);
    }
    window.addEventListener(ZERO_OS_CELEBRATION_EVENT, onCelebration);
    return () => window.removeEventListener(ZERO_OS_CELEBRATION_EVENT, onCelebration);
  }, [enqueueCelebration, openVideoModal, seenKeys]);

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setTimeout(() => setActive(null), ttlMs);
    return () => window.clearTimeout(timer);
  }, [active, ttlMs]);

  const confettiProps = useMemo(() => {
    const count = active?.intensity === 'high' ? 240 : active?.intensity === 'quiet' ? 70 : 140;
    return {
      numberOfPieces: count,
      recycle: false,
      gravity: active?.intensity === 'quiet' ? 0.14 : 0.22,
      tweenDuration: ttlMs,
      width: size.width,
      height: size.height
    };
  }, [active, size, ttlMs]);

  return React.createElement(
    React.Fragment,
    null,
    active ? React.createElement(Confetti, confettiProps) : null,
    video ? React.createElement(
      'div',
      { className: 'zero-os-thank-you-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': video.label || 'Thank you video' },
      React.createElement('div', { className: 'zero-os-thank-you-modal__panel' },
        React.createElement('button', { type: 'button', onClick: closeVideoModal, 'aria-label': 'Close thank you video' }, 'Close'),
        React.createElement('video', { src: video.src, poster: video.poster || '', controls: true, playsInline: true })
      )
    ) : null
  );
}
