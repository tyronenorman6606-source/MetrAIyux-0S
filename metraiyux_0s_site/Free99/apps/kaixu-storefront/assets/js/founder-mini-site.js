
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 32) nav && nav.classList.add('scrolled');
    else nav && nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.16 });

  document.querySelectorAll('.fade-up, .stat-item, .animated-list li').forEach(el => observer.observe(el));

  document.querySelectorAll('[data-count]').forEach(el => {
    const target = Number(el.getAttribute('data-count'));
    const formatter = el.getAttribute('data-format') || 'int';
    let current = 0;
    const step = Math.max(1, Math.round(target / 60));
    const run = () => {
      current += step;
      if (current >= target) current = target;
      if (formatter === 'plus') el.textContent = current + '+';
      else el.textContent = current;
      if (current < target) requestAnimationFrame(run);
    };
    observer.observe(el.closest('.stat-item'));
    setTimeout(run, 650);
  });

  setTimeout(() => document.body.classList.remove('locked'), 4700);

  const canvas = document.getElementById('stars');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let stars = [];
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({length: Math.max(80, Math.floor(window.innerWidth / 14))}, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.5 + 0.2,
        a: Math.random() * 0.8 + 0.1,
        v: Math.random() * 0.12 + 0.02
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      stars.forEach(s => {
        s.y += s.v;
        if (s.y > window.innerHeight) { s.y = -2; s.x = Math.random() * window.innerWidth; }
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(draw);
    };
    resize();
    draw();
    window.addEventListener('resize', resize);
  }
});
