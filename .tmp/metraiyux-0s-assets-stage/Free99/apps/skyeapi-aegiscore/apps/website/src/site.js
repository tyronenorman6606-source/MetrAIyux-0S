const reveals = [...document.querySelectorAll('[data-reveal]')];
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  }
}, { threshold: 0.12 });
for (const node of reveals) observer.observe(node);

const hero = document.querySelector('.hero');
window.addEventListener('pointermove', (event) => {
  if (!hero) return;
  const x = Math.round((event.clientX / window.innerWidth - 0.5) * 18);
  const y = Math.round((event.clientY / window.innerHeight - 0.5) * 18);
  hero.style.setProperty('--tilt-x', `${x}px`);
  hero.style.setProperty('--tilt-y', `${y}px`);
}, { passive: true });
