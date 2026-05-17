// Site folder menu generated from the unpacked static archive.
(function(){
  const structure = [
    { title: 'Skyes Over London LC', items: [
      { name: 'Home', href: 'index.html' },
      { name: 'Private Access', href: 'login.html' },
      { name: 'Contact Route', href: 'pages/contact.html' }
    ] },
    { title: 'Proof + Services', items: [
      { name: 'Authority-First Systems', href: 'pages/services/authority-first-systems.html' },
      { name: 'Premium Editorial Pages', href: 'pages/services/premium-editorial-pages.html' },
      { name: 'Service Snapshot', href: 'pages/services/servicesnapshot.html' },
      { name: 'Contractor Network', href: 'pages/independent%20contractor%20network/independentcontractornetwork.html' },
      { name: 'Arizona Workers Rights Hub 1', href: 'pages/services/arizonaworkersrights-hub1.html' },
      { name: 'Arizona Workers Rights Hub 2', href: 'pages/services/arizonaworkersrights-hub2.html' },
      { name: 'Arizona Workers Rights Hub 3', href: 'pages/services/arizonaworkersrights-hub3.html' }
    ] },
    { title: 'Agent Authority', items: [
      { name: 'Employee', href: 'pages/services/agentauthority/employee.html' },
      { name: 'Employer', href: 'pages/services/agentauthority/employer.html' },
      { name: 'Employer-Sponsored Immersive Web Builds', href: 'pages/services/agentauthority/employer-sponsored3dwebbuilds.html' }
    ] },
    { title: 'Apps + Intelligence', items: [
      { name: 'SkyeGlass', href: 'pages/apps/skyeglass.html' },
      { name: 'SkyeNode Pro Planner', href: 'pages/apps/skyenodeproplanner.html' },
      { name: 'Kaixu API', href: 'pages/services/real-intelligence/getkaixu-api.html' },
      { name: 'Kaixu API Cost', href: 'pages/services/real-intelligence/kaixu-api-cost.html' }
    ] },
    { title: 'Reference Pages', items: [
      { name: 'Immersive Homepage', href: 'pages/immersivehomepage.html' },
      { name: 'Homepage 2', href: 'possiblepages/homepage2.html' },
      { name: "Operator's Manual", href: "possiblepages/theautonomousbusinessbuild-anoperator'smanual.html" },
      { name: 'Logo Study', href: 'logos/purplegold.html' }
    ] }
  ];

  function assetBase(){
    const script = document.currentScript || document.querySelector('script[src$="menu.js"]');
    return script ? new URL('../', script.src) : new URL('./', window.location.href);
  }

  function createMenu(){
    const wrapper = document.createElement('div');
    wrapper.className = 'folder-menu';

    const toggle = document.createElement('button');
    toggle.className = 'menu-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open site map');
    toggle.title = 'Open site map';
    toggle.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6h18M3 18h18"></path></svg>';
    wrapper.appendChild(toggle);

    const panel = document.createElement('aside');
    panel.className = 'menu-panel';
    panel.setAttribute('aria-hidden', 'true');

    const title = document.createElement('h4');
    title.textContent = 'Skyes Over London LC';
    panel.appendChild(title);

    const search = document.createElement('input');
    search.className = 'menu-search';
    search.placeholder = 'Filter pages...';
    panel.appendChild(search);

    const base = assetBase();
    structure.forEach((sec) => {
      const section = document.createElement('div');
      section.className = 'menu-section';
      const heading = document.createElement('div');
      heading.className = 'section-title';
      heading.textContent = sec.title;
      section.appendChild(heading);

      const list = document.createElement('ul');
      sec.items.forEach((item) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = new URL(item.href, base).href;
        link.textContent = item.name;
        link.rel = 'noopener';
        li.appendChild(link);
        list.appendChild(li);
      });
      section.appendChild(list);
      panel.appendChild(section);
    });

    const footer = document.createElement('div');
    footer.className = 'menu-footer';
    footer.textContent = 'Archive pages open from this unpacked folder.';
    panel.appendChild(footer);
    wrapper.appendChild(panel);

    toggle.addEventListener('click', () => {
      const open = panel.classList.toggle('show');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    });

    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      panel.querySelectorAll('.menu-section').forEach((section) => {
        let any = false;
        section.querySelectorAll('a').forEach((link) => {
          const ok = link.textContent.toLowerCase().includes(q) || link.href.toLowerCase().includes(q);
          link.style.display = ok ? 'block' : 'none';
          if (ok) any = true;
        });
        section.style.display = any ? 'block' : 'none';
      });
    });

    document.body.appendChild(wrapper);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') createMenu();
  else document.addEventListener('DOMContentLoaded', createMenu);
})();
