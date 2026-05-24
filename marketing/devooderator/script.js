(function () {
  'use strict';

  if (window.SkyeUI || document.querySelector('script[src$="skye-effects.js"]')) return;

  var script = document.createElement('script');
  script.src = '/skye-effects.js';
  script.defer = true;
  document.head.appendChild(script);
})();

// BEGIN quantumskyes:skyesol-living-background-js
function mountSkyeSolLivingBackground({
  canvasSelector = '.skyesol-living-field',
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext('2d');
  const palette = [
    'rgba(201,168,76,',
    'rgba(138,99,255,',
    'rgba(39,242,255,'
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + .4,
      a: Math.random() * .34 + .12,
      s: Math.random() * .34 + .08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * .006) + time * speed) * amp;
      const n2 = Math.cos((x * .011) - time * speed * .7) * amp * .46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * .28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, .24);
    drawWave(t, height * .82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, .28);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onPointerMove);
  };
}


(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
// END quantumskyes:skyesol-living-background-js

(function () {
  'use strict';

  if (window.__skyesolSharedMarketingBoot) return;
  window.__skyesolSharedMarketingBoot = true;

  const FALLBACK_BRAND_LOGOS = [
    { name: 'MetrAIyux 0S', kind: 'platform', src: '/assets/metraiyux-0s-logo-transparent.png', x: '5%', y: '16%', size: '118px', dx: '42px', dy: '-26px', duration: '22s' },
    { name: 'Skyes Over London', kind: 'company', src: '/assets/skyes-over-london-deity-logo.png', x: '80%', y: '10%', size: '126px', dx: '-36px', dy: '32px', duration: '24s' },
    { name: 'SkyeMusicNexus', kind: 'platform', src: '/assets/skye-music-nexus/skye-music-nexus-logo.png', x: '60%', y: '35%', size: '112px', dx: '34px', dy: '42px', duration: '26s' },
    { name: 'Valley Verified', kind: 'client', src: '/assets/skye-music-nexus/orbit-logos/valley-verified-logo.png', x: '3%', y: '82%', size: '112px', dx: '56px', dy: '-38px', duration: '30s' }
  ];

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function mountRevealSystem() {
    const items = Array.from(document.querySelectorAll('.reveal'));
    if (!items.length) return;

    items.forEach((item, index) => {
      if (!item.style.getPropertyValue('--reveal-delay')) {
        item.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 70}ms`);
      }
    });

    if (!('IntersectionObserver' in window)) {
      items.forEach(item => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach(item => observer.observe(item));
  }

  async function loadBrandBackdropLogos() {
    try {
      const response = await fetch('/data/brand-backdrop-logos.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`brand backdrop status ${response.status}`);
      const data = await response.json();
      return Array.isArray(data.logos) && data.logos.length ? data.logos : FALLBACK_BRAND_LOGOS;
    } catch (_error) {
      return FALLBACK_BRAND_LOGOS;
    }
  }

  function makeBackdropImage(logo, index) {
    const image = document.createElement('img');
    image.src = logo.src;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.dataset.logoName = logo.name || `brand-${index + 1}`;
    image.dataset.logoKind = logo.kind || 'platform';
    image.style.setProperty('--x', logo.x || `${(index * 17) % 92}%`);
    image.style.setProperty('--y', logo.y || `${(index * 23) % 88}%`);
    image.style.setProperty('--s', logo.size || logo.s || '108px');
    image.style.setProperty('--dx', logo.dx || '38px');
    image.style.setProperty('--dy', logo.dy || '-28px');
    image.style.setProperty('--d', logo.duration || logo.d || `${22 + index}s`);
    return image;
  }

  async function mountBrandBackdrop() {
    const shouldMount = document.body.matches('.skyesol-living-page') && document.body.dataset.brandBackdrop !== 'off';
    const explicitTargets = Array.from(document.querySelectorAll('[data-brand-backdrop]'));
    if (!shouldMount && !explicitTargets.length) return;
    if (document.querySelector('.brand-backdrop')) return;

    const target = explicitTargets[0] || document.body;
    const backdrop = document.createElement('div');
    backdrop.className = 'brand-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    const logos = await loadBrandBackdropLogos();
    logos.forEach((logo, index) => backdrop.appendChild(makeBackdropImage(logo, index)));

    if (target === document.body) {
      const firstContent = document.body.firstElementChild;
      document.body.insertBefore(backdrop, firstContent);
    } else {
      target.replaceWith(backdrop);
    }
    document.body.classList.add('brand-backdrop-mounted');
  }

  ready(() => {
    mountRevealSystem();
    mountBrandBackdrop();
  });
})();
