(() => {
  const script = document.currentScript || [...document.scripts].find((node) => /script\.js$/.test(node.src));
  const appBase = new URL('.', script?.src || window.location.href);
  document.documentElement.style.setProperty('--scroll', '0');
  const onScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    document.documentElement.style.setProperty('--scroll', String(scrollY / max));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const intro = document.querySelector('[data-pottery-intro]');
  const enter = document.querySelector('[data-pottery-enter]');
  if (intro) {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let closed = false;
    const closeIntro = () => {
      if (closed) return;
      closed = true;
      intro.classList.add('is-exiting');
      document.body.classList.remove('intro-active');
      document.body.classList.add('intro-complete');
      window.setTimeout(() => {
        intro.hidden = true;
      }, 760);
    };
    enter?.addEventListener('click', closeIntro);
    window.setTimeout(closeIntro, reduceMotion ? 700 : 3600);
  }

  document.querySelectorAll('.pottery-wheel').forEach((wheel) => {
    wheel.addEventListener('pointermove', (event) => {
      const rect = wheel.getBoundingClientRect();
      wheel.style.setProperty('--mx', String((event.clientX - rect.left) / rect.width));
      wheel.style.setProperty('--my', String((event.clientY - rect.top) / rect.height));
    });
  });

  const existing = window.MetrAIyuxWorkspaceChatConfig || {};
  window.MetrAIyuxWorkspaceChatConfig = {
    workspaceId: 'as-you-wish-pottery-westgate-preview-001',
    workspaceSlug: 'as-you-wish-pottery-westgate',
    clientName: 'As You Wish Pottery',
    appName: 'As You Wish Pottery Westgate Visit App',
    launcherText: 'Ask about this visit',
    operatorName: 'Auren',
    accent: '#ff7edb',
    apiBase: 'https://relay13-core.graylondonskyes.workers.dev/',
    accessReply: 'Your As You Wish preview access code is AYWP-7DAY.',
    accessTriggers: ['password', 'access', 'code', 'unlock', 'AYWP-7DAY', 'workspace'],
    relayMetadata: {
      account_code: 'AYWP-WESTGATE',
      source_app: 'as-you-wish-pottery-westgate',
      source_lane: 'as-you-wish-arrival-workspace'
    },
    ...existing
  };
  if (!document.querySelector('script[data-metraiyux-workspace-chat-script]')) {
    const widget = document.createElement('script');
    widget.src = new URL('assets/workspace-chat-widget.js', appBase).href;
    widget.defer = true;
    widget.dataset.metraiyuxWorkspaceChatScript = 'true';
    widget.onerror = () => widget.remove();
    document.body.appendChild(widget);
  }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => navigator.serviceWorker.register(new URL('service-worker.js', appBase).href).catch(() => {}));
  }
})();
