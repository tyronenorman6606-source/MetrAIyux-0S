const DEFAULT_GRAY_SKYES_RECAP = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gray-skyes/media/video/gray-skyes-concert-recap.mp4';
const DEFAULT_PLAYBACK_RATE = 1.31;
const DEFAULT_TRIM_START_SECONDS = 23;
const DEFAULT_TRIM_END_SECONDS = 31;

function mountGraySkyesPlatformVideo() {
  const host = document.querySelector('[data-gray-skyes-platform-video]');
  if (!host || host.dataset.mounted === 'true') return;

  host.dataset.mounted = 'true';
  host.classList.add('gray-skyes-platform-video');
  host.setAttribute('aria-hidden', 'true');
  document.body.classList.add('gray-skyes-video-platform');

  const source = host.dataset.videoSrc || DEFAULT_GRAY_SKYES_RECAP;
  const rate = Number(host.dataset.playbackRate || DEFAULT_PLAYBACK_RATE) || DEFAULT_PLAYBACK_RATE;
  const trimStart = Math.max(0, Number(host.dataset.trimStart || DEFAULT_TRIM_START_SECONDS) || DEFAULT_TRIM_START_SECONDS);
  const trimEnd = Math.max(0, Number(host.dataset.trimEnd || DEFAULT_TRIM_END_SECONDS) || DEFAULT_TRIM_END_SECONDS);
  let loopStart = trimStart;
  let loopEnd = Number.POSITIVE_INFINITY;

  const video = document.createElement('video');
  video.src = source;
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('muted', '');
  video.setAttribute('loop', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.playbackRate = rate;

  const status = document.createElement('span');
  status.className = 'gray-skyes-platform-video__status';
  status.textContent = `Gray Skyes concert recap loop ${rate.toFixed(2)}x / trimmed`;

  host.replaceChildren(video, status);

  const start = () => {
    video.playbackRate = rate;
    if (Number.isFinite(loopStart) && video.currentTime < loopStart) {
      video.currentTime = loopStart;
    }
    video.play().catch(() => {
      status.textContent = 'Gray Skyes concert recap ready on interaction';
    });
  };

  video.addEventListener('loadedmetadata', () => {
    const duration = Number(video.duration || 0);
    if (duration > trimStart + trimEnd + 8) {
      loopStart = trimStart;
      loopEnd = duration - trimEnd;
      video.currentTime = loopStart;
    } else {
      loopStart = 0;
      loopEnd = duration || Number.POSITIVE_INFINITY;
    }
    start();
  }, { once: true });
  video.addEventListener('timeupdate', () => {
    if (!Number.isFinite(loopEnd)) return;
    if (video.currentTime >= loopEnd) {
      video.currentTime = loopStart;
      start();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') start();
  });
  window.addEventListener('pointerdown', start, { once: true, passive: true });
  start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountGraySkyesPlatformVideo, { once: true });
} else {
  mountGraySkyesPlatformVideo();
}
