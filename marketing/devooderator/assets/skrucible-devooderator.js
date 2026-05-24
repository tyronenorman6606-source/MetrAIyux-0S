(function () {
  const root = document.documentElement;
  const modeButton = document.querySelector('[data-forge-toggle]');
  const progress = document.getElementById('forge-progress');
  const cursor = document.getElementById('forge-cursor');
  const canvas = document.getElementById('forge-plasma');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const initialMode = 'refined';
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

  function setMode(nextMode) {
    const mode = nextMode === 'raw' ? 'raw' : 'refined';
    root.setAttribute('data-forge-mode', mode);
    if (modeButton) {
      modeButton.lastChild.textContent = mode === 'raw' ? 'Raw' : 'Refined';
    }
  }

  setMode(initialMode);

  if (modeButton) {
    modeButton.addEventListener('click', () => {
      const current = root.getAttribute('data-forge-mode') === 'raw' ? 'raw' : 'refined';
      setMode(current === 'raw' ? 'refined' : 'raw');
    });
  }

  function updateProgress() {
    if (!progress) return;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / max))})`;
  }

  function moveCursor(event) {
    pointer.tx = event.clientX / Math.max(1, window.innerWidth);
    pointer.ty = event.clientY / Math.max(1, window.innerHeight);
    if (cursor) {
      cursor.style.transform = `translate3d(${event.clientX - 90}px, ${event.clientY - 90}px, 0)`;
    }
  }

  function setupKineticWordmark() {
    const wordmark = document.querySelector('[data-kinetic-text]');
    if (!wordmark) return;
    const text = wordmark.getAttribute('data-kinetic-text') || wordmark.textContent || '';
    wordmark.setAttribute('aria-label', text);
    wordmark.innerHTML = text.split('').map((char, index) => {
      const safeChar = char === ' ' ? '&nbsp;' : char;
      const float = `${Math.sin(index * 0.95) * 5}px`;
      return `<span class="wm-char glitch-char" style="--i:${index};--float:${float};--gd:${(index * 0.13).toFixed(2)};--go:${((index % 5) - 2) * 1.4}px">${safeChar}</span>`;
    }).join('');
  }

  function setupPlasma() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    let width = 1;
    let height = 1;
    let raf = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.floor(window.innerWidth * dpr);
      height = Math.floor(window.innerHeight * dpr);
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function colorFor(mode) {
      return mode === 'raw'
        ? { plasma: '255,107,53', ice: '244,199,91', forge: '180,125,255' }
        : { plasma: '180,125,255', ice: '125,211,252', forge: '255,107,53' };
    }

    function draw(time) {
      const mode = root.getAttribute('data-forge-mode') === 'raw' ? 'raw' : 'refined';
      const colors = colorFor(mode);
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      const t = time * 0.00028;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < 5; i += 1) {
        const phase = t + i * 1.7;
        const x = w * (0.5 + Math.sin(phase * 1.1 + i) * 0.32) + (pointer.x - 0.5) * 160;
        const y = h * (0.5 + Math.cos(phase * 0.9 + i * 0.6) * 0.28) + (pointer.y - 0.5) * 120;
        const radius = Math.max(w, h) * (0.24 + i * 0.035);
        const tone = i % 3 === 0 ? colors.plasma : i % 3 === 1 ? colors.ice : colors.forge;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${tone}, ${0.20 - i * 0.018})`);
        gradient.addColorStop(0.45, `rgba(${tone}, ${0.09 - i * 0.008})`);
        gradient.addColorStop(1, `rgba(${tone}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      raf = window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    if (!reduceMotion) raf = window.requestAnimationFrame(draw);
    else draw(0);
    window.addEventListener('beforeunload', () => window.cancelAnimationFrame(raf), { once: true });
  }

  setupKineticWordmark();
  setupPlasma();
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  window.addEventListener('pointermove', moveCursor, { passive: true });
})();
