// Skye Ecosystem Portal — script.js

// ---- Year ----
document.querySelectorAll('.year').forEach(el => el.textContent = new Date().getFullYear());

// ---- Ambient particle field (canvas) ----
(function () {
  const canvas = document.getElementById('field');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [], mouse = { x: 0.5, y: 0.5 };
  const COLORS = ['#f4c75b', '#7ee7ff', '#8b5cf6', '#3dd6b5', '#e84c30'];
  const COUNT = window.innerWidth < 700 ? 60 : 120;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function createParticle() {
    return {
      x: rand(0, 1), y: rand(0, 1),
      vx: rand(-0.0004, 0.0004),
      vy: rand(-0.0004, 0.0004),
      r: rand(0.5, 2.2),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: rand(0.15, 0.55),
      speed: rand(0.8, 1.4)
    };
  }

  for (let i = 0; i < COUNT; i++) particles.push(createParticle());

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX / W;
    mouse.y = e.clientY / H;
  });
  window.addEventListener('resize', resize);
  resize();

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Ambient gradient glow at mouse
    const gx = mouse.x * W, gy = mouse.y * H;
    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.35);
    grad.addColorStop(0, 'rgba(244,199,91,0.04)');
    grad.addColorStop(0.5, 'rgba(139,92,246,0.025)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    particles.forEach(p => {
      // subtle mouse attraction
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.3) {
        p.vx += dx * 0.000006;
        p.vy += dy * 0.000006;
      }

      p.x += p.vx * p.speed;
      p.y += p.vy * p.speed;
      if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
      if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw subtle connection lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = (a.x - b.x) * W, dy = (a.y - b.y) * H;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 90) {
          ctx.beginPath();
          ctx.moveTo(a.x * W, a.y * H);
          ctx.lineTo(b.x * W, b.y * H);
          ctx.strokeStyle = a.color;
          ctx.globalAlpha = (1 - d / 90) * 0.08;
          ctx.lineWidth = 0.6;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    requestAnimationFrame(draw);
  }
  draw();
})();

// ---- Mobile nav toggle ----
(function () {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.topbar nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open', !expanded);
  });
})();

// ---- Scroll reveal ----
(function () {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.property-card, .section-head, .vault-left, .vault-right, .legal-strip-head, .legal-policies').forEach(el => {
    el.classList.add('reveal');
    obs.observe(el);
  });
})();
