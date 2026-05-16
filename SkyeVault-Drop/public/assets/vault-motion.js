(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    progress.style.setProperty('--scroll-progress', String(Math.min(1, Math.max(0, ratio))));
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

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
