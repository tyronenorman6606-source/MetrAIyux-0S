(() => {
  const doc = document.documentElement;
  const scroller = document.scrollingElement || doc;
  const progress = document.querySelector(".scroll-progress i");
  const aura = document.querySelector(".cursor-aura");
  let raf = 0;

  function maxScroll() {
    return Math.max(1, scroller.scrollHeight - window.innerHeight);
  }

  function syncChrome() {
    raf = 0;
    const ratio = Math.min(1, Math.max(0, scroller.scrollTop / maxScroll()));
    if (progress) progress.style.width = `${Math.round(ratio * 10000) / 100}%`;
  }

  function requestSync() {
    if (!raf) raf = window.requestAnimationFrame(syncChrome);
  }

  window.addEventListener("scroll", requestSync, { passive: true });
  window.addEventListener("resize", requestSync, { passive: true });
  window.addEventListener("pointermove", (event) => {
    if (aura) {
      aura.style.opacity = "1";
      aura.style.left = `${event.clientX}px`;
      aura.style.top = `${event.clientY}px`;
    }
  }, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  requestSync();
  window.setTimeout(requestSync, 300);
})();
