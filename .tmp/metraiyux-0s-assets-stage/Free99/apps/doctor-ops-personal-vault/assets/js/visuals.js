
(function(){
  function ready(fn){ if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(() => {
    document.body.classList.add('visual-overhaul-ready');
    const cursor = document.createElement('div');
    cursor.className = 'ambient-cursor';
    cursor.setAttribute('aria-hidden','true');
    document.body.appendChild(cursor);
    let ticking = false;
    window.addEventListener('pointermove', (event) => {
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--mx', `${event.clientX}px`);
        document.documentElement.style.setProperty('--my', `${event.clientY}px`);
        ticking = false;
      });
    }, {passive:true});
    document.querySelectorAll('.panel,.hero-card,.app-card,.queue-item,.trust-card,.value-chip').forEach((el, index) => {
      el.style.animationDelay = `${Math.min(index * 18, 260)}ms`;
    });
    const nav = document.querySelector('.menu');
    if(nav && nav.scrollWidth > nav.clientWidth){
      nav.setAttribute('aria-label','Scrollable workflow navigation');
    }
  });
})();
