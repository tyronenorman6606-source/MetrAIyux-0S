(() => {
  const menuButton = document.querySelector('[data-menu-button]');
  const nav = document.querySelector('[data-nav]');
  const progress = document.querySelector('[data-progress]');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('is-open'); menuButton.setAttribute('aria-expanded', 'false'); }));
  }
  const update = () => {
    if (!progress) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0) + ')';
  };
  update();
  addEventListener('scroll', update, { passive: true });
  const filters = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('[data-platform]')];
  filters.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filters.forEach(item => item.classList.toggle('active', item === button));
    cards.forEach(card => { card.hidden = filter !== 'all' && card.dataset.platform !== filter; });
  }));
  let proofActions = 0;
  const proofState = {
    badge: document.querySelector('#aiPlanBadge'),
    status: document.querySelector('#aiStatus'),
    meter: document.querySelector('#aiMeterCount'),
    batch: document.querySelector('#batchCount'),
    selected: document.querySelector('#selectedMeta')
  };
  const bumpProof = (label) => {
    proofActions += 1;
    if (proofState.meter) proofState.meter.textContent = `Meter: ${proofActions} proof actions`;
    if (proofState.status) proofState.status.textContent = `Status: ${label}`;
    if (proofState.batch) proofState.batch.textContent = `Batch: 6 packages / 30 drops / ${proofActions} interactions`;
  };
  document.querySelectorAll('[data-proof-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-proof-filter]').forEach((item) => item.classList.toggle('active', item === button));
      if (proofState.selected) proofState.selected.textContent = `Selected: ${button.dataset.proofFilter} proof lane`;
      bumpProof(`Filter changed to ${button.dataset.proofFilter}`);
    });
  });
  const proofButtons = [
    ['#generateBtn', 'Generated source package batch'],
    ['#auditBtn', 'Audited source mix'],
    ['#shuffleBtn', 'Remixed candidate copy'],
    ['#duplicateBtn', 'Duplicated candidate variant'],
    ['#regenSelectedBtn', 'Re-rendered selected proof lane'],
    ['#aiRefreshBtn', 'Refreshed proof meter'],
    ['#aiClaimBtn', 'Claim check remains preview-only']
  ];
  proofButtons.forEach(([selector, label]) => {
    const button = document.querySelector(selector);
    if (!button) return;
    button.addEventListener('click', () => {
      if (proofState.badge) proofState.badge.textContent = `Plan: Preview candidate - ${label}`;
      bumpProof(label);
    });
  });
  ['#brandName', '#campaignName', '#idea', '#logoScale', '#imageFocus', '#aiEmail', '#aiSessionId'].forEach((selector) => {
    const field = document.querySelector(selector);
    if (!field) return;
    field.addEventListener('input', () => bumpProof(`Edited ${selector.replace('#', '')}`));
    field.addEventListener('change', () => bumpProof(`Changed ${selector.replace('#', '')}`));
  });
  const sections = [...document.querySelectorAll('main section[id]')];
  const links = [...document.querySelectorAll('[data-nav] a[href^="#"]')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const target = '#' + entry.target.id;
      links.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === target));
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0.01 });
  sections.forEach(section => observer.observe(section));
})();
