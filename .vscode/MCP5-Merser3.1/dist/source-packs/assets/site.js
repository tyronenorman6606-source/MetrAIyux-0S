const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const nav = $('#nav');
const navLinks = $('#navLinks');
const menuBtn = $('#menuBtn');
const year = $('#year');
if (year) year.textContent = new Date().getFullYear();

if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 18);
    const sections = ['platform','command','workspaces','proof'];
    let active = '';
    for (const id of sections) {
      const section = $('#' + id);
      if (section && window.scrollY >= (section.offsetTop - 160)) active = id;
    }
    $$('.nav-links a').forEach(a => a.classList.toggle('active', active && a.getAttribute('href') === '#' + active));
  }, { passive: true });
}

if (menuBtn && navLinks) {
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));
}

const slides = [
  {
    eyebrow: 'Sovereign command layer online',
    titleA: 'Operations',
    titleB: 'Demand Command',
    text: 'MetrAIyux 0S turns scattered sales, client work, staffing, proof, approvals, content, and AI routing into one protected operating surface built for serious owner control.'
  },
  {
    eyebrow: 'Client workspaces gated and routed',
    titleA: 'Customers',
    titleB: 'Need Workspaces',
    text: 'Move buyers and clients from a public promise into customer signup, onboarding, status boards, document requests, escalation, renewal review, and payment-aware handoff.'
  },
  {
    eyebrow: 'Proof rail and revenue rooms ready',
    titleA: 'Revenue',
    titleB: 'Needs Receipts',
    text: 'Ascension, proposals, proof exports, buyer intelligence, AE command, and operating ledgers help serious prospects understand the system before they commit.'
  }
];
const heroEyebrow = $('#heroEyebrow');
const heroTitle = $('#heroTitle');
const heroText = $('#heroText');
let slideIndex = 0;
function setSlide(i){
  if (!heroEyebrow || !heroTitle || !heroText) return;
  slideIndex = i;
  const s = slides[i];
  heroEyebrow.textContent = s.eyebrow;
  heroTitle.innerHTML = `<span class="stroke">${s.titleA}</span><span class="fill">${s.titleB}</span>`;
  heroText.textContent = s.text;
  $$('.hero-dots button').forEach((b, idx) => b.classList.toggle('active', idx === i));
}
if (heroEyebrow && heroTitle && heroText) {
  $$('.hero-dots button').forEach(btn => btn.addEventListener('click', () => setSlide(Number(btn.dataset.slide))));
  setInterval(() => setSlide((slideIndex + 1) % slides.length), 7800);
}

const routes = {
  clients: {
    kicker:'Client operating lane',
    title:'Turn client work into a controlled workspace.',
    copy:'MetrAIyux 0S routes a customer from interest into signup, onboarding, dashboard, document requests, status board, renewal review, escalation, and payment-aware handoff.',
    link:'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/saas/signup/',
    items:[['Entry','Customer signup and portal route'],['Control','Tenant isolation and owner approval'],['Movement','Status boards and document requests'],['Handoff','SkyeMerit and SkyePay routing']]
  },
  revenue: {
    kicker:'Ascension revenue lane',
    title:'Route serious buyers from interest to decision.',
    copy:'Buyer intelligence, deal rooms, proposal centers, revenue war rooms, capability packets, and proof export give the sales motion a real path instead of a loose pitch.',
    link:'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/ascension/',
    items:[['Qualify','Buyer intelligence and fit checks'],['Package','Capability packet and proposal center'],['Close','Deal rooms and revenue war room'],['Export','Proof packet for decision makers']]
  },
  proof: {
    kicker:'Governed proof lane',
    title:'Keep proof close before the platform makes claims.',
    copy:'Release receipts, public ledgers, route maps, neural maps, proof exports, and claims review turn the public site into a trust surface buyers can inspect.',
    link:'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/operator/platform-integration-ledger',
    items:[['Receipts','Release and route proof'],['Ledger','Platform accounting surface'],['Boundary','Public-safe claim posture'],['Review','Human approval before promotion']]
  },
  ai: {
    kicker:'Brain governance lane',
    title:'Run AI as an operating layer, not a gimmick.',
    copy:'The brain system routes through governance, freshness, prompt libraries, safety rules, cabinet ownership, and human approvals for sensitive decisions.',
    link:'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/ai-readiness/',
    items:[['Brains','16 operating brain model'],['Cabinets','13 ownership lanes'],['Safety','Human approval boundaries'],['Testing','Freshness and prompt governance']]
  }
};
const routeKicker = $('#routeKicker');
const routeTitle = $('#routeTitle');
const routeCopy = $('#routeCopy');
const routeList = $('#routeList');
const routeLink = $('#routeLink');
function setRoute(key){
  if (!routeKicker || !routeTitle || !routeCopy || !routeList || !routeLink) return;
  const r = routes[key];
  if (!r) return;
  routeKicker.textContent = r.kicker;
  routeTitle.textContent = r.title;
  routeCopy.textContent = r.copy;
  routeLink.href = r.link;
  routeList.innerHTML = r.items.map(([a,b]) => `<div><b>${a}</b>${b}</div>`).join('');
  $$('#routeSelector button').forEach(btn => btn.classList.toggle('active', btn.dataset.route === key));
}
if (routeKicker && routeTitle && routeCopy && routeList && routeLink) {
  $$('#routeSelector button').forEach(btn => btn.addEventListener('click', () => setRoute(btn.dataset.route)));
}

const commandForm = $('#commandForm');
const commandText = $('#commandText');
const terminal = $('#terminal');
if (commandForm && commandText && terminal) {
  commandForm.addEventListener('submit', e => {
    e.preventDefault();
    const value = commandText.value.trim() || 'Route this visitor to the correct operating lane';
    const stamp = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    terminal.innerHTML = [
      `<span class="terminal-line"><b>${stamp}</b> / command received</span>`,
      `<span class="terminal-line"><b>intent</b> / ${escapeHtml(value)}</span>`,
      `<span class="terminal-line"><b>routing</b> / workspace + proof + owner approval</span>`,
      `<span class="terminal-line"><b>next</b> / open lane, collect context, keep claims governed</span>`
    ].join('');
  });
}
function escapeHtml(str){return str.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .16 });
$$('.reveal').forEach(el => observer.observe(el));

const canvas = $('#field');
if (canvas && canvas.getContext) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, nodes = [];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth = canvas.offsetWidth;
    h = canvas.clientHeight = canvas.offsetHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const count = Math.max(36, Math.min(96, Math.round(w / 18)));
    nodes = Array.from({length:count}, () => ({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.26,vy:(Math.random()-.5)*.26,r:Math.random()*1.8+0.6}));
  }
  function frame(){
    ctx.clearRect(0,0,w,h);
    for(const n of nodes){
      n.x += n.vx; n.y += n.vy;
      if(n.x < 0 || n.x > w) n.vx *= -1;
      if(n.y < 0 || n.y > h) n.vy *= -1;
    }
    for(let i=0;i<nodes.length;i++){
      const a = nodes[i];
      ctx.beginPath();
      ctx.arc(a.x,a.y,a.r,0,Math.PI*2);
      ctx.fillStyle = i % 5 === 0 ? 'rgba(247,201,91,.72)' : 'rgba(128,220,255,.62)';
      ctx.fill();
      for(let j=i+1;j<nodes.length;j++){
        const b = nodes[j];
        const dx=a.x-b.x, dy=a.y-b.y, dist=Math.hypot(dx,dy);
        if(dist < 140){
          ctx.globalAlpha = (1 - dist/140) * .24;
          ctx.strokeStyle = i % 6 === 0 ? '#f7c95b' : '#20b7ff';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
    if(!reduced) requestAnimationFrame(frame);
  }
  resize();
  if(!reduced) frame();
  window.addEventListener('resize', resize);
}

// Dev Sauce copy helpers
function metraToast(message){
  let toast = document.querySelector('.toast');
  if(!toast){toast = document.createElement('div'); toast.className='toast'; document.body.appendChild(toast);}
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(window.__metraToastTimer);
  window.__metraToastTimer = setTimeout(()=>toast.classList.remove('visible'), 1800);
}
async function metraCopyText(text, label){
  try{
    await navigator.clipboard.writeText(text);
    metraToast(label || 'Copied');
  }catch(err){
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly','');
    area.style.position='fixed'; area.style.opacity='0';
    document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
    metraToast(label || 'Copied');
  }
}
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy-target],[data-copy-value],[data-copy-asset]');
  if(!button) return;
  if(button.dataset.copyTarget){
    const el = document.querySelector(button.dataset.copyTarget);
    if(el) return metraCopyText(el.textContent.trim(), 'Component copied');
  }
  if(button.dataset.copyValue){
    return metraCopyText(button.dataset.copyValue, 'Markup copied');
  }
  if(button.dataset.copyAsset){
    try{
      const response = await fetch(button.dataset.copyAsset);
      const text = await response.text();
      return metraCopyText(text.trim(), 'SVG copied');
    }catch(err){
      return metraCopyText(button.dataset.copyAsset, 'Asset path copied');
    }
  }
});

document.addEventListener('click', (event) => {
  const filter = event.target.closest('[data-icon-filter]');
  if(!filter) return;
  const value = filter.dataset.iconFilter;
  document.querySelectorAll('[data-icon-filter]').forEach(btn => btn.classList.toggle('active', btn === filter));
  document.querySelectorAll('[data-icon-category]').forEach(card => {
    card.style.display = value === 'All' || card.dataset.iconCategory === value ? '' : 'none';
  });
});
