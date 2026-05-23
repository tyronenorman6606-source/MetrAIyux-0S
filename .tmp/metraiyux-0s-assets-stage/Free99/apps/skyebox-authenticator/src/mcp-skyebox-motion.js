import { animate, inView, scroll } from 'framer-motion/dom';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

ready(() => {
  document.documentElement.dataset.skyeboxMcpRuntime = 'framer-motion-dom';
  mountMotionChrome();
  mountLivingBackground();
});

function ready(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
}

function mountMotionChrome() {
  const progress = ensureElement('div', 'skyebox-motion-progress', 'skyebox-motion-progress');
  document.body.prepend(progress);
  scroll((_progress, { y }) => {
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, y?.progress || 0))})`;
  });

  if (finePointer && !reduceMotion) {
    const glow = ensureElement('div', 'skyebox-cursor-glow', 'skyebox-cursor-glow');
    document.body.append(glow);
    window.addEventListener('pointermove', (event) => {
      animate(glow, {
        transform: `translate3d(${event.clientX - 150}px, ${event.clientY - 150}px, 0)`
      }, { duration: 0.42, ease: [0.16, 1, 0.3, 1] });
    }, { passive: true });
  }

  document.querySelectorAll('.panel, .btn, .account-card, .info-card').forEach((node, index) => {
    node.classList.add('skyebox-motion-node');
    if (reduceMotion) return;
    inView(node, () => {
      animate(node, { opacity: [0.76, 1], transform: ['translateY(12px)', 'translateY(0)'] }, {
        duration: 0.54,
        delay: Math.min(index, 6) * 0.035,
        ease: [0.16, 1, 0.3, 1]
      });
    }, { margin: '0px 0px -12% 0px' });
  });
}

function mountLivingBackground() {
  const canvas = document.querySelector('.skyesol-living-field');
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    pointerX: 0.5,
    pointerY: 0.5,
    particles: []
  };

  const resize = () => {
    state.dpr = Math.min(window.devicePixelRatio || 1, 1.7);
    state.width = Math.max(1, window.innerWidth);
    state.height = Math.max(1, window.innerHeight);
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    const count = state.width < 720 ? 22 : 42;
    state.particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      r: 1 + Math.random() * 2.2,
      speed: 0.12 + Math.random() * 0.32,
      phase: Math.random() * Math.PI * 2,
      hue: index % 3
    }));
  };

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', (event) => {
    state.pointerX = event.clientX / Math.max(1, state.width);
    state.pointerY = event.clientY / Math.max(1, state.height);
  }, { passive: true });

  const draw = (time = 0) => {
    const t = time * 0.001;
    ctx.clearRect(0, 0, state.width, state.height);
    const shiftX = (state.pointerX - 0.5) * 42;
    const shiftY = (state.pointerY - 0.5) * 28;
    const band = ctx.createLinearGradient(0, 0, state.width, state.height);
    band.addColorStop(0, 'rgba(69, 221, 255, 0.06)');
    band.addColorStop(0.48, 'rgba(238, 193, 97, 0.055)');
    band.addColorStop(1, 'rgba(149, 116, 255, 0.07)');
    ctx.fillStyle = band;
    ctx.beginPath();
    const y = state.height * 0.28 + Math.sin(t * 0.34) * 34 + shiftY;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(state.width * 0.22, y - 78, state.width * 0.54, y + 96, state.width, y - 38);
    ctx.lineTo(state.width, y + 180);
    ctx.bezierCurveTo(state.width * 0.58, y + 220, state.width * 0.24, y + 40, 0, y + 130);
    ctx.closePath();
    ctx.fill();

    for (const p of state.particles) {
      p.y -= p.speed;
      p.x += Math.sin(t + p.phase) * 0.16;
      if (p.y < -12) {
        p.y = state.height + 12;
        p.x = Math.random() * state.width;
      }
      const alpha = 0.12 + Math.sin(t * 1.5 + p.phase) * 0.06;
      ctx.fillStyle = p.hue === 0 ? `rgba(238,193,97,${alpha})` : p.hue === 1 ? `rgba(69,221,255,${alpha})` : `rgba(149,116,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x + shiftX * 0.18, p.y + shiftY * 0.08, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reduceMotion) requestAnimationFrame(draw);
  };

  resize();
  draw();
}

function ensureElement(tag, id, className) {
  const existing = document.getElementById(id);
  if (existing) return existing;
  const node = document.createElement(tag);
  node.id = id;
  node.className = className;
  return node;
}
