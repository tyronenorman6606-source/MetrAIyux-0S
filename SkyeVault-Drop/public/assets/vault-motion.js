(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = window.matchMedia('(max-width: 760px)').matches;
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);

  const canvas = document.createElement('canvas');
  canvas.className = 'vault-living-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    progress.style.setProperty('--scroll-progress', String(Math.min(1, Math.max(0, ratio))));
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  if (!reduceMotion) {
    const ctx = canvas.getContext('2d', { alpha: true });
    const pointer = { x: 0.5, y: 0.5 };
    const particles = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let running = true;

    const colors = ['rgba(229,193,106,', 'rgba(100,217,255,', 'rgba(88,230,161,', 'rgba(154,109,255,'];
    const resizeCanvas = () => {
      dpr = Math.min(1.6, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = compact ? 36 : 76;
      particles.length = 0;
      for (let index = 0; index < count; index += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (compact ? 0.16 : 0.28),
          vy: (Math.random() - 0.5) * (compact ? 0.12 : 0.22),
          size: Math.random() * 2.4 + 0.6,
          color: colors[index % colors.length],
          phase: Math.random() * Math.PI * 2
        });
      }
    };

    const drawVaultGate = (time) => {
      const cx = width * (0.66 + (pointer.x - 0.5) * 0.035);
      const cy = height * (0.38 + (pointer.y - 0.5) * 0.035);
      const radius = Math.min(width, height) * (compact ? 0.24 : 0.34);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(time * 0.00018) * 0.08);
      for (let ring = 0; ring < 5; ring += 1) {
        const r = radius * (0.38 + ring * 0.15);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.34, r * 0.55, ring * 0.18, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ring % 2 ? '100,217,255' : '229,193,106'},${0.13 - ring * 0.012})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      for (let spoke = 0; spoke < 18; spoke += 1) {
        const angle = (spoke / 18) * Math.PI * 2 + time * 0.00012;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius * 0.2, Math.sin(angle) * radius * 0.08);
        ctx.lineTo(Math.cos(angle) * radius * 1.05, Math.sin(angle) * radius * 0.42);
        ctx.strokeStyle = `rgba(255,240,186,${spoke % 3 === 0 ? 0.18 : 0.07})`;
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawAurora = (time) => {
      for (let band = 0; band < 4; band += 1) {
        ctx.beginPath();
        const yBase = height * (0.18 + band * 0.16);
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= width; x += 42) {
          const y = yBase
            + Math.sin(x * 0.006 + time * 0.00042 + band) * (34 + band * 8)
            + (pointer.y - 0.5) * 36;
          ctx.lineTo(x, y);
        }
        const gradient = ctx.createLinearGradient(0, yBase - 90, width, yBase + 90);
        gradient.addColorStop(0, `rgba(229,193,106,${0.09 - band * 0.012})`);
        gradient.addColorStop(0.45, `rgba(100,217,255,${0.08 - band * 0.01})`);
        gradient.addColorStop(1, `rgba(154,109,255,${0.07 - band * 0.01})`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = compact ? 26 : 44;
        ctx.stroke();
      }
    };

    const drawParticles = (time) => {
      for (const particle of particles) {
        particle.x += particle.vx + (pointer.x - 0.5) * 0.035;
        particle.y += particle.vy + Math.sin(time * 0.001 + particle.phase) * 0.035;
        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;
        const alpha = 0.18 + Math.sin(time * 0.002 + particle.phase) * 0.08;
        ctx.beginPath();
        ctx.fillStyle = `${particle.color}${alpha})`;
        ctx.shadowColor = `${particle.color}0.42)`;
        ctx.shadowBlur = 14;
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    const draw = (time) => {
      if (!running) return;
      frame = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, width, height);
      drawAurora(time);
      drawVaultGate(time);
      drawParticles(time);
    };

    resizeCanvas();
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointermove', (event) => {
      pointer.x = event.clientX / Math.max(1, width);
      pointer.y = event.clientY / Math.max(1, height);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      running = document.visibilityState === 'visible';
      if (running) frame = requestAnimationFrame(draw);
      else cancelAnimationFrame(frame);
    });
  }

  if (!reduceMotion && window.Lenis) {
    const lenis = new Lenis({ lerp: 0.16, smoothWheel: true });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  if (!reduceMotion && window.gsap) {
    gsap.registerPlugin();
    gsap.fromTo(
      '.panel, .client-vault-row, .ledger-row, .vault-summary-grid article',
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.44, ease: 'power2.out', stagger: 0.025 }
    );
  }

  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor-trail';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.append(cursor);
    let visible = false;
    window.addEventListener('pointermove', (event) => {
      if (!visible) {
        cursor.classList.add('is-visible');
        visible = true;
      }
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    }, { passive: true });
    window.addEventListener('pointerleave', () => {
      cursor.classList.remove('is-visible');
      visible = false;
    });
  }
})();
