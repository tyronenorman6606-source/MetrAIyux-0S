(() => {
  const root = document.documentElement;
  const saved = localStorage.getItem('kx-theme');
  if (saved) root.setAttribute('data-kx-theme', saved);

  document.querySelectorAll('[data-kx-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = root.getAttribute('data-kx-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-kx-theme', current);
      localStorage.setItem('kx-theme', current);
    });
  });

  document.querySelectorAll('[data-kx-copy]').forEach(el => {
    el.addEventListener('click', async () => {
      const value = el.getAttribute('data-kx-copy') || el.textContent.trim();
      try {
        await navigator.clipboard.writeText(value);
        el.classList.add('copied');
        setTimeout(() => el.classList.remove('copied'), 1100);
      } catch (err) {
        console.warn('Copy failed', err);
      }
    });
  });

  document.querySelectorAll('[data-kx-tabs]').forEach(group => {
    const tabs = group.querySelectorAll('.kx-tab');
    const panels = group.querySelectorAll('.kx-tab-panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-kx-target');
        tabs.forEach(t => t.setAttribute('aria-selected', String(t === tab)));
        panels.forEach(p => p.classList.toggle('active', p.id === target));
      });
    });
  });

  const light = document.createElement('div');
  light.className = 'kx-cursor-light';
  document.body.appendChild(light);
  window.addEventListener('pointermove', event => {
    light.style.left = event.clientX + 'px';
    light.style.top = event.clientY + 'px';
    document.querySelectorAll('.kx-card').forEach(card => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--y', `${event.clientY - rect.top}px`);
    });
  }, { passive: true });
})();
