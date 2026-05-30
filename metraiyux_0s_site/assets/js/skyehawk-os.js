(() => {
  if (window.__skyeHawkOsRuntime) return;
  window.__skyeHawkOsRuntime = true;

  const ORIGINAL_SOURCE_SHA256 = 'c2eae20018c71fa4ec0a5e99c08f03bd3438cf72a5d4c59adec66d366772fc38';
  const ORIGINAL_SOURCE_PATH = 'marketing/assets/skyehawk-os.js';
  const ZERO_OS_SOURCE_COPY = '/skyehawk/source/skyehawk-os.original.js';
  const root = document.documentElement;
  const script = document.currentScript || {};
  const dataset = script.dataset || {};
  const surface = dataset.skyehawkSurface || document.body?.dataset?.skyehawkSurface || document.title || location.pathname;

  root.classList.add('skyehawk-ready');

  function capture(type, metadata = {}) {
    try {
      if (window.SkyeCommandBridge?.capture) {
        window.SkyeCommandBridge.capture(type, {
          source_app: 'skyehawk',
          source_surface: surface,
          summary: `Skye Hawk runtime signal: ${type}`,
          crm: { lane: '0s-command', record_type: 'runtime-signal' },
          metadata: {
            original_source_path: ORIGINAL_SOURCE_PATH,
            original_source_sha256: ORIGINAL_SOURCE_SHA256,
            zero_os_source_copy: ZERO_OS_SOURCE_COPY,
            ...metadata
          }
        });
      }
    } catch {}
  }

  function setPointer(event) {
    root.style.setProperty('--skyehawk-x', `${event.clientX}px`);
    root.style.setProperty('--skyehawk-y', `${event.clientY}px`);
  }

  function wireLinkHeat() {
    document.querySelectorAll('a[href], button').forEach((item) => {
      item.addEventListener('pointerenter', () => root.classList.add('skyehawk-link-hot'));
      item.addEventListener('pointerleave', () => root.classList.remove('skyehawk-link-hot'));
    });
  }

  function mountSkyeSolLivingBackground({
    canvasSelector = '.skyehawk-living-field, .skyesol-living-field, .living-background',
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
      width = Math.max(window.innerWidth, 1);
      height = Math.max(window.innerHeight, 1);
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.8 + 0.4,
        a: Math.random() * 0.34 + 0.12,
        s: Math.random() * 0.34 + 0.08,
        phase: Math.random() * Math.PI * 2,
        color: palette[index % palette.length]
      }));
    }

    function drawWave(time, yOffset, colorA, colorB, amp, speed) {
      const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
      gradient.addColorStop(0, colorA);
      gradient.addColorStop(0.5, colorB);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 18) {
        const n = Math.sin((x * 0.006) + time * speed) * amp;
        const n2 = Math.cos((x * 0.011) - time * speed * 0.7) * amp * 0.46;
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
      const t = now * 0.001;
      pointer.x += (pointer.tx - pointer.x) * 0.035;
      pointer.y += (pointer.ty - pointer.y) * 0.035;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'screen';
      drawWave(t, height * 0.28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, 0.34);
      drawWave(t, height * 0.54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, 0.24);
      drawWave(t, height * 0.82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, 0.28);
      particles.forEach((particle) => {
        const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
        const py = particle.y + Math.cos(t * particle.s * 0.8 + particle.phase) * 18 + pointer.y * 8;
        ctx.beginPath();
        ctx.arc(px, py, particle.r, 0, Math.PI * 2);
        ctx.fillStyle = `${particle.color}${particle.a})`;
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(animate);
    }

    function onPointerMove(event) {
      pointer.tx = (event.clientX / Math.max(width, 1) - 0.5) * 2;
      pointer.ty = (event.clientY / Math.max(height, 1) - 0.5) * 2;
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    raf = requestAnimationFrame(animate);
    capture('skyehawk.living_field.ready', { canvas_selector: canvasSelector });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onPointerMove);
    };
  }

  function boot() {
    window.addEventListener('pointermove', setPointer, { passive: true });
    wireLinkHeat();
    if (!window.__mcpSkyeSolLivingBackgroundMounted) {
      window.__mcpSkyeSolLivingBackgroundMounted = true;
      mountSkyeSolLivingBackground();
    }
    capture('skyehawk.surface_ready', { pathname: location.pathname });
    window.dispatchEvent(new CustomEvent('skyehawk:ready', {
      detail: window.SkyeHawkOS.status()
    }));
  }

  window.mountSkyeSolLivingBackground = mountSkyeSolLivingBackground;
  window.SkyeHawkOS = {
    mountLivingBackground: mountSkyeSolLivingBackground,
    mountSkyeSolLivingBackground,
    capture,
    source: {
      original_path: ORIGINAL_SOURCE_PATH,
      source_copy: ZERO_OS_SOURCE_COPY,
      sha256: ORIGINAL_SOURCE_SHA256,
      contract: ['skyehawk-ready', 'skyehawk-link-hot', '--skyehawk-x', '--skyehawk-y', 'mountSkyeSolLivingBackground']
    },
    status() {
      return {
        ok: true,
        surface,
        original_source_path: ORIGINAL_SOURCE_PATH,
        original_source_sha256: ORIGINAL_SOURCE_SHA256,
        zero_os_source_copy: ZERO_OS_SOURCE_COPY,
        command_bridge_ready: Boolean(window.SkyeCommandBridge?.capture),
        global_mount_function: typeof window.mountSkyeSolLivingBackground === 'function',
        path: location.pathname
      };
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
