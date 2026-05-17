(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function mountProgress() {
    if (document.querySelector('.neon-scroll-progress')) return;
    const progress = document.createElement('i');
    progress.className = 'neon-scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.append(progress);
    const update = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / max))})`;
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  function mountCursorGlow() {
    if (reduceMotion || !window.matchMedia('(pointer:fine)').matches || document.querySelector('.neon-cursor-trail')) return;
    const glow = document.createElement('div');
    glow.className = 'neon-cursor-trail';
    glow.setAttribute('aria-hidden', 'true');
    document.body.append(glow);
    window.addEventListener('pointermove', (event) => {
      glow.style.transform = `translate3d(${event.clientX - 150}px, ${event.clientY - 150}px, 0)`;
    }, { passive: true });
  }

  function mountLivingBackground() {
    const canvas = document.querySelector('.skyesol-living-field');
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = 0;
    let height = 0;
    let particles = [];
    let raf = 0;
    const pointer = { x: 0, y: 0 };

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(96, Math.max(36, Math.floor((width * height) / 18000)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.8 + 0.5,
        a: Math.random() * 0.26 + 0.08,
        s: Math.random() * 0.35 + 0.08,
        phase: Math.random() * Math.PI * 2,
        hue: index % 3
      }));
    }

    function wave(time, y, color, amp, speed) {
      const gradient = ctx.createLinearGradient(0, y - amp * 2, width, y + amp * 2);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 20) {
        ctx.lineTo(x, y + Math.sin(x * 0.007 + time * speed) * amp + Math.cos(x * 0.011 - time * speed) * amp * 0.42);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    function draw(now) {
      const time = now * 0.001;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'screen';
      wave(time, height * 0.30 + pointer.y * 12, 'rgba(138,99,255,.10)', 34, 0.32);
      wave(time, height * 0.58 - pointer.y * 8, 'rgba(39,242,255,.08)', 42, 0.22);
      wave(time, height * 0.84, 'rgba(201,168,76,.07)', 28, 0.28);
      const colors = ['rgba(201,168,76,', 'rgba(138,99,255,', 'rgba(39,242,255,'];
      for (const particle of particles) {
        const x = particle.x + Math.sin(time * particle.s + particle.phase) * 24 + pointer.x * 10;
        const y = particle.y + Math.cos(time * particle.s * 0.8 + particle.phase) * 18 + pointer.y * 8;
        ctx.beginPath();
        ctx.arc(x, y, particle.r, 0, Math.PI * 2);
        ctx.fillStyle = `${colors[particle.hue]}${particle.a})`;
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', (event) => {
      pointer.x = (event.clientX / Math.max(width, 1) - 0.5) * 2;
      pointer.y = (event.clientY / Math.max(height, 1) - 0.5) * 2;
    }, { passive: true });
    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener('pagehide', () => cancelAnimationFrame(raf), { once: true });
  }

  ready(() => {
    mountProgress();
    mountCursorGlow();
    mountLivingBackground();
  });
})();
