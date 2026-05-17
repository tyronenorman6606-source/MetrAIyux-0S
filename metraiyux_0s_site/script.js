
const search = document.querySelector('#search');
const cards = [...document.querySelectorAll('.leader-card')];
if (search) {
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    cards.forEach(card => {
      const text = card.innerText.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });
}
const observer = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.animate([{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:550,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});observer.unobserve(entry.target)}
  })
},{threshold:.1});
document.querySelectorAll('.leader-card,.panel,.cabinet-map div,.quote-panel').forEach(el=>{el.style.opacity=0;observer.observe(el)});

(function(){
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function parseMorphingTexts(el){
    try{
      const parsed = JSON.parse(el.dataset.morphingText || '[]');
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    }catch(_err){
      return String(el.dataset.morphingText || '').split('|').map(item => item.trim()).filter(Boolean);
    }
  }

  function sizeMorphingText(el, texts){
    const longest = texts.reduce((max, item) => Math.max(max, item.length), el.textContent.trim().length || 1);
    el.style.setProperty('--morph-chars', String(Math.min(Math.max(longest, 10), 24)));
  }

  function initCssMorphingText(el){
    if(el.dataset.morphingActive === 'true') return;
    const texts = parseMorphingTexts(el);
    if(!texts.length) return;
    let index = Math.max(0, texts.indexOf(el.textContent.trim()));
    el.dataset.morphingActive = 'true';
    el.dataset.motionProvider = 'css-fallback';
    el.setAttribute('aria-live', 'polite');
    sizeMorphingText(el, texts);
    if(reducedMotion || texts.length < 2) return;

    window.setInterval(() => {
      index = (index + 1) % texts.length;
      el.classList.remove('is-morphing-in');
      el.classList.add('is-morphing-out');
      window.setTimeout(() => {
        el.textContent = texts[index];
        el.classList.remove('is-morphing-out');
        el.classList.add('is-morphing-in');
      }, 260);
      window.setTimeout(() => el.classList.remove('is-morphing-in'), 720);
    }, 2200);
  }

  function initMotionChromeFallback(){
    const progress = document.querySelector('.motion-progress i');
    if(progress){
      const updateProgress = () => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / max))})`;
      };
      updateProgress();
      window.addEventListener('scroll', updateProgress, { passive: true });
      window.addEventListener('resize', updateProgress);
    }

    const glow = document.querySelector('.motion-cursor-glow');
    const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if(glow && finePointer && !reducedMotion){
      let raf = 0;
      let x = -400;
      let y = -400;
      window.addEventListener('pointermove', event => {
        x = event.clientX - 140;
        y = event.clientY - 140;
        if(raf) return;
        raf = window.requestAnimationFrame(() => {
          glow.style.opacity = '.86';
          glow.style.transform = `translate3d(${x}px,${y}px,0)`;
          raf = 0;
        });
      }, { passive: true });
    }
  }

  function bootFallbackEffects(){
    if(window.__metraiyuxMotionLoaded) return;
    document.querySelectorAll('.morphing-text[data-morphing-text]').forEach(initCssMorphingText);
    initMotionChromeFallback();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(bootFallbackEffects, 1200), { once: true });
  }else{
    window.setTimeout(bootFallbackEffects, 1200);
  }
})();

(function(){
  const canvas = document.querySelector('.living-background');
  if(!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if(!ctx) return;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = window.matchMedia && window.matchMedia('(max-width: 680px)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.2 : 1.5);
  let width = 0;
  let height = 0;
  let particles = [];

  function resizeLivingBackground(){
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = compact ? 22 : 42;
    particles = Array.from({ length: count }, (_, i) => ({
      x: (i * 97) % Math.max(width, 1),
      y: (i * 53) % Math.max(height, 1),
      r: 1.2 + (i % 4) * .55,
      s: .12 + (i % 6) * .035
    }));
  }

  function drawWave(time, yBase, color, amplitude, offset){
    ctx.beginPath();
    for(let x = 0; x <= width; x += 18){
      const y = yBase + Math.sin((x * .008) + time + offset) * amplitude + Math.cos((x * .003) - time * .7) * amplitude * .54;
      if(x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawLivingBackground(frameTime){
    const time = frameTime * .00035;
    ctx.clearRect(0, 0, width, height);
    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, 'rgba(53,183,255,.08)');
    wash.addColorStop(.45, 'rgba(243,212,131,.06)');
    wash.addColorStop(1, 'rgba(111,242,199,.055)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    drawWave(time, height * .62, 'rgba(53,183,255,.09)', 32, 0);
    drawWave(time * 1.25, height * .72, 'rgba(243,212,131,.08)', 24, 2.4);
    drawWave(time * .92, height * .78, 'rgba(111,242,199,.07)', 28, 5.1);

    particles.forEach((p, i) => {
      const drift = reducedMotion ? 0 : frameTime * p.s * .01;
      const x = (p.x + drift + Math.sin(time + i) * 18) % Math.max(width, 1);
      const y = (p.y + Math.cos(time * 1.4 + i) * 14) % Math.max(height, 1);
      ctx.beginPath();
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(243,212,131,.32)' : i % 3 === 1 ? 'rgba(53,183,255,.30)' : 'rgba(111,242,199,.28)';
      ctx.fill();
    });

    if(!reducedMotion) window.requestAnimationFrame(drawLivingBackground);
  }

  resizeLivingBackground();
  window.addEventListener('resize', resizeLivingBackground);
  window.requestAnimationFrame(drawLivingBackground);
})();

(function(){
  if(window.__metraiyuxSkyeUIPolish) return;
  window.__metraiyuxSkyeUIPolish = true;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compactScreen = window.matchMedia && window.matchMedia('(max-width: 680px)').matches;
  const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  const beamColors = ['#f3d483', '#35b7ff', '#6ff2c7', '#a88cff'];

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }else{
      fn();
    }
  }

  function createFlickeringGrid(){
    if(document.querySelector('.skye-flickering-grid')) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'skye-flickering-grid';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });
    if(!ctx) return;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let cells = new Float32Array(0);
    const dpr = Math.min(window.devicePixelRatio || 1, compactScreen ? 1.1 : 1.4);
    const square = compactScreen ? 3 : 4;
    const gap = compactScreen ? 13 : 16;
    const maxOpacity = compactScreen ? .13 : .18;

    function resize(){
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(1, Math.ceil(width / (square + gap)));
      rows = Math.max(1, Math.ceil(height / (square + gap)));
      cells = new Float32Array(cols * rows);
      for(let i = 0; i < cells.length; i += 1){
        cells[i] = Math.random() * maxOpacity;
      }
      draw(0);
    }

    function draw(time){
      ctx.clearRect(0, 0, width, height);
      for(let x = 0; x < cols; x += 1){
        for(let y = 0; y < rows; y += 1){
          const index = x * rows + y;
          if(!reducedMotion && Math.random() < .018){
            cells[index] = Math.random() * maxOpacity;
          }
          const alpha = cells[index] + (Math.sin(time * .001 + index * .17) + 1) * .012;
          const colorIndex = (x + y) % 4;
          ctx.fillStyle = colorIndex === 0
            ? `rgba(243, 212, 131, ${alpha})`
            : colorIndex === 1
              ? `rgba(53, 183, 255, ${alpha})`
              : colorIndex === 2
                ? `rgba(111, 242, 199, ${alpha})`
                : `rgba(168, 140, 255, ${alpha})`;
          ctx.fillRect(x * (square + gap), y * (square + gap), square, square);
        }
      }
      if(!reducedMotion) window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    if(!reducedMotion) window.requestAnimationFrame(draw);
  }

  function ensureMotionChrome(){
    if(!document.querySelector('.motion-progress')){
      const progress = document.createElement('div');
      progress.className = 'motion-progress scroll-progress motion-chrome';
      progress.setAttribute('aria-hidden', 'true');
      progress.innerHTML = '<i></i>';
      document.body.prepend(progress);
    }
    if(!document.querySelector('.motion-cursor-glow')){
      const glow = document.createElement('div');
      glow.className = 'motion-cursor-glow pointer-reactive motion-chrome';
      glow.setAttribute('aria-hidden', 'true');
      document.body.prepend(glow);
    }
  }

  function Meteors(container, opts){
    if(!container || reducedMotion || container.dataset.skyeMeteors === 'true') return;
    const settings = Object.assign({ count: compactScreen ? 6 : 12, color: 'rgba(53, 183, 255, .62)' }, opts || {});
    container.dataset.skyeMeteors = 'true';
    container.style.overflow = container.style.overflow || 'hidden';
    for(let i = 0; i < settings.count; i += 1){
      const meteor = document.createElement('span');
      meteor.className = 'skye-meteor';
      meteor.style.setProperty('--skye-meteor-color', settings.color);
      meteor.style.setProperty('--skye-meteor-delay', `${(i * .38 + Math.random() * 1.4).toFixed(2)}s`);
      meteor.style.setProperty('--skye-meteor-duration', `${(2.1 + Math.random() * 1.4).toFixed(2)}s`);
      meteor.style.top = `${8 + Math.random() * 70}%`;
      meteor.style.left = `${32 + Math.random() * 58}%`;
      container.appendChild(meteor);
    }
  }

  function ShineBorder(el, opts){
    if(!el || el.dataset.skyeShine === 'true') return;
    const settings = Object.assign({ c1: '#a88cff', c2: '#f3d483', c3: '#35b7ff', duration: '6s' }, opts || {});
    el.dataset.skyeShine = 'true';
    el.classList.add('skye-shine-wrap');
    el.style.setProperty('--skye-shine-c1', settings.c1);
    el.style.setProperty('--skye-shine-c2', settings.c2);
    el.style.setProperty('--skye-shine-c3', settings.c3);
    el.style.setProperty('--skye-shine-dur', settings.duration);
  }

  function BorderBeam(el, opts){
    if(!el || reducedMotion || el.dataset.skyeBeam === 'true') return;
    const settings = Object.assign({ color: '#f3d483', size: 88, duration: 4600, delay: 0 }, opts || {});
    el.dataset.skyeBeam = 'true';
    el.classList.add('skye-beam-host');
    const beam = document.createElement('i');
    beam.className = 'skye-border-beam';
    beam.setAttribute('aria-hidden', 'true');
    beam.style.setProperty('--skye-beam-color', settings.color);
    beam.style.setProperty('--skye-beam-size', `${settings.size}px`);
    el.appendChild(beam);

    let start = null;
    function tick(timestamp){
      if(!start) start = timestamp + settings.delay;
      const elapsed = timestamp - start;
      if(elapsed < 0){
        window.requestAnimationFrame(tick);
        return;
      }
      const w = Math.max(1, el.offsetWidth);
      const h = Math.max(1, el.offsetHeight);
      const perimeter = 2 * (w + h);
      const position = ((elapsed % settings.duration) / settings.duration) * perimeter;
      let x = 0;
      let y = 0;
      let angle = 0;
      if(position <= w){
        x = position;
        y = 0;
      }else if(position <= w + h){
        x = w;
        y = position - w;
        angle = 90;
      }else if(position <= (2 * w) + h){
        x = w - (position - w - h);
        y = h;
        angle = 180;
      }else{
        x = 0;
        y = h - (position - (2 * w) - h);
        angle = 270;
      }
      beam.style.transform = `translate3d(${x - settings.size / 2}px, ${y - 1}px, 0) rotate(${angle}deg)`;
      window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  function TextBlurIn(el, opts){
    if(!el || reducedMotion || el.dataset.skyeTextBlur === 'true' || el.children.length) return;
    const settings = Object.assign({ stagger: 70, delay: 0 }, opts || {});
    const text = el.textContent.trim();
    if(!text) return;
    el.dataset.skyeTextBlur = 'true';
    el.textContent = '';
    text.split(/(\s+)/).forEach((piece, index) => {
      if(/^\s+$/.test(piece)){
        el.appendChild(document.createTextNode(piece));
        return;
      }
      const span = document.createElement('span');
      span.className = 'skye-blur-word';
      span.style.animationDelay = `${settings.delay + index * settings.stagger}px`;
      span.textContent = piece;
      el.appendChild(span);
    });
  }

  function addRevealChoreography(){
    const revealTargets = [
      ...document.querySelectorAll('h1, h2, .hero-lede, .wide, .route-card, .ultra-card, .commercial-card, .saas-card, .visual-kpi, .visual-panel, .sentinel-card, .nexus-card, .tool-panel, .panel, .quote-panel')
    ].filter((el, index) => index < 140 && !el.closest('nav') && !el.classList.contains('skye-text-reveal'));

    revealTargets.forEach((el, index) => {
      el.classList.add('skye-text-reveal');
      el.style.setProperty('--skye-reveal-delay', `${Math.min((index % 8) * 55, 385)}ms`);
    });

    if(!('IntersectionObserver' in window)){
      revealTargets.forEach(el => el.classList.add('skye-text-visible'));
      return;
    }

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(!entry.isIntersecting) return;
        entry.target.classList.add('skye-text-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });

    revealTargets.forEach(el => revealObserver.observe(el));
  }

  function addOrbitingLogoField(){
    const logo = document.querySelector('.hero-platform-logo');
    const host = document.querySelector('.logo-showcase, .hero-media') || (logo && logo.parentElement);
    if(!host || host.dataset.skyeOrbit === 'true' || reducedMotion) return;
    host.dataset.skyeOrbit = 'true';
    host.classList.add('skye-orbit-host');
    const overlay = document.createElement('span');
    overlay.className = 'skye-orbit-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    const ringSizes = compactScreen ? [220, 290] : [340, 460];
    ringSizes.forEach((size, ringIndex) => {
      const ring = document.createElement('span');
      ring.className = `skye-orbit-ring${ringIndex % 2 ? ' reverse' : ''}`;
      ring.style.width = `${size}px`;
      ring.style.height = `${size}px`;
      ring.style.setProperty('--skye-orbit-speed', `${ringIndex ? 24 : 18}s`);
      overlay.appendChild(ring);
      for(let i = 0; i < 4; i += 1){
        const node = document.createElement('span');
        node.className = 'skye-orbit-node';
        node.style.setProperty('--skye-node-angle', `${(i * 90) + (ringIndex * 35)}deg`);
        node.style.setProperty('--skye-node-radius', `${size / 2}px`);
        node.style.setProperty('--skye-orbit-color', beamColors[(i + ringIndex) % beamColors.length]);
        ring.appendChild(node);
      }
    });
    host.prepend(overlay);
  }

  function addMagneticControls(){
    if(!finePointer || reducedMotion) return;
    document.querySelectorAll('a.button, .button-row a, .button-row button, .sentinel-btn, .saas-btn, .nexus-btn, .crown-btn, .action-btn, button[type="button"], button[type="submit"]').forEach(el => {
      el.classList.add('skye-magnetic');
    });
  }

  function applySkyeComponents(){
    document.body.classList.add('skye-ui-polished');
    ensureMotionChrome();
    createFlickeringGrid();

    const hero = document.querySelector('.hero, .upgrade-hero, .admin-hero, .commercial-hero, header.hero');
    Meteors(hero, { count: compactScreen ? 6 : 14, color: 'rgba(243, 212, 131, .56)' });

    document.querySelectorAll('.hero-title, .hero h1, header.hero h1').forEach((el, index) => {
      if(index < 2 && !el.children.length) el.classList.add('skye-gradient-text', 'neon-gradient-text');
    });
    document.querySelectorAll('.morphing-text').forEach(el => el.classList.add('premium-text-effects-lab', 'neon-gradient-text'));

    document.querySelectorAll('.route-card, .ultra-card, .commercial-card, .saas-card, .visual-kpi, .visual-panel, .sentinel-card, .nexus-card, .logo-asset-card, .upgrade-card, .panel, .tool-panel').forEach((el, index) => {
      if(index < 36){
        ShineBorder(el, {
          c1: beamColors[index % beamColors.length],
          c2: beamColors[(index + 1) % beamColors.length],
          c3: beamColors[(index + 2) % beamColors.length],
          duration: `${5 + (index % 4)}s`
        });
      }
      if(index < 10){
        BorderBeam(el, {
          color: beamColors[index % beamColors.length],
          size: compactScreen ? 58 : 88,
          duration: 4200 + index * 170,
          delay: index * 160
        });
      }
    });

    const firstPlainHeadline = [...document.querySelectorAll('h1, h2')].find(el => !el.children.length && el.textContent.trim().length < 72);
    TextBlurIn(firstPlainHeadline, { stagger: 38, delay: 80 });

    const statStrip = document.querySelector('.stat-strip');
    if(statStrip) statStrip.classList.add('skye-animated-beam');

    addOrbitingLogoField();
    addMagneticControls();
    addRevealChoreography();
  }

  window.SkyeUI = Object.assign({}, window.SkyeUI || {}, {
    Meteors,
    ShineBorder,
    BorderBeam,
    TextBlurIn,
    OrbitRings: addOrbitingLogoField
  });

  onReady(applySkyeComponents);
})();

(function(){
  if(window.__zeroSurfaceMiniApps) return;
  window.__zeroSurfaceMiniApps = true;

  const VERSION = '0s-surface-mini-apps-2026-05-17';
  const LEDGER_KEY = 'zero-surface-mini-app-ledger';
  const PLATFORM_FOLDERS = new Set([
    'admin','ae-command','ai-readiness','apex','automation','autonomous-business',
    'brain-governance','branch-expansion','buyer-intelligence','calculators',
    'certification-readiness','client-os','client-preview','clients','cloudflare',
    'conversion','crown-os','dominion-upgrade','download-center','downloads',
    'governance','government','investor','launch','legal-readiness','member',
    'nexus','operator','portal-layer','portals','pricing','proof','proof-export',
    'proof-vault','proposal-center','quantum-ops','revenue-ops','saas','sales',
    'sales-enablement','sentinel-os','training-academy'
  ]);

  const FIELD_LABELS = {
    owner: 'Owner',
    target: 'Target / buyer / workflow',
    signal: 'Surface claim or incoming signal',
    status: 'Workflow status',
    priority: 'Priority',
    proofStatus: 'Proof status',
    proofLink: 'Proof link',
    risk: 'Risk level',
    impactValue: 'Impact value',
    nextAction: 'Next action',
    reviewDate: 'Review date',
    notes: 'Operator notes'
  };

  const STATUS_POINTS = {
    Intake: 12,
    Draft: 24,
    Active: 42,
    'Needs proof': 32,
    'Operator review': 58,
    'QA review': 68,
    'Client ready': 82,
    'Ready for handoff': 92
  };
  const PROOF_POINTS = { Missing: 0, Partial: 14, Linked: 24, Verified: 34 };
  const PRIORITY_POINTS = { Low: 4, Standard: 8, High: 12, Critical: 15, 'Founder review': 10 };
  const RISK_PENALTY = { Low: 0, Medium: 8, High: 18, 'Do not publish yet': 34 };

  const LANE_MAP = [
    ['proof', /proof|receipt|claim|qa|audit|verify|evidence|vault/i, 'Proof control', 'Victor Saint QA Brain', 'Attach evidence and mark public claims as unproven until verified.'],
    ['revenue', /revenue|deal|proposal|pricing|pipeline|ae|sales|commission|conversion|buyer/i, 'Revenue route', 'Celeste Monroe Revenue Brain', 'Protect the next buyer action and keep proof near the CTA.'],
    ['client', /client|customer|onboard|renewal|success|workspace|portal|intake/i, 'Client route', 'Adrian Cross Client Success Brain', 'Route to client success with status, owner, and next touch date.'],
    ['staffing', /candidate|staff|recruit|resume|placement|workforce/i, 'Staffing route', 'Sienna Brooks Staffing Brain', 'Capture candidate/client evidence before external action.'],
    ['compliance', /legal|compliance|contract|policy|insurance|security|privacy|government|certification|risk/i, 'Compliance route', 'Julian Mercer Compliance Brain', 'Keep professional review and proof gates visible before publishing.'],
    ['technology', /brain|automation|worker|cloudflare|api|deploy|sdk|database|ai|readiness/i, 'Technology route', 'Orion Hayes Technology Brain', 'Turn the system note into a testable operator task with proof.'],
    ['training', /training|academy|tutorial|playbook|certification|lesson/i, 'Training route', 'Marcus Vale Operations Brain', 'Turn the material into a tracked completion and operator handoff.'],
    ['finance', /billing|finance|invoice|margin|valuation|investor|budget/i, 'Finance route', 'Naomi Sterling Finance Brain', 'Treat numbers as directional until owner-approved and evidence-backed.'],
    ['marketing', /brand|content|blog|seo|market|campaign|public|download/i, 'Public route', 'Valentina Reyes Brand Brain', 'Keep public copy proof-backed and buyer-safe.'],
    ['founder', /founder|command|approval|override|member|governance/i, 'Founder route', 'Gray London Skyes Founder Brain', 'Escalate authority, money, legal, and public representation changes.']
  ];

  function onReady(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function pathParts(){
    return location.pathname.split('/').filter(Boolean).filter(part => !part.endsWith('.html'));
  }

  function platformFolder(){
    const parts = pathParts();
    return parts[0] || 'root';
  }

  function pageTitle(){
    return (document.querySelector('main h1, h1')?.textContent || document.title || '0S Surface').trim().replace(/\s+/g, ' ');
  }

  function pageText(){
    return [
      location.pathname,
      document.title,
      pageTitle(),
      document.querySelector('.hero-lede,.hero-copy,.wide,meta[name="description"]')?.textContent || '',
      document.body?.innerText?.slice(0, 1600) || ''
    ].join(' ');
  }

  function classifySurface(text){
    const value = text || pageText();
    const hit = LANE_MAP.find(item => item[1].test(value));
    if(hit) return { lane: hit[0], routeLabel: hit[2], owner: hit[3], guidance: hit[4] };
    return { lane: 'operations', routeLabel: 'Operations route', owner: 'Site Operator Brain', guidance: 'Capture owner, proof, risk, and next action before handoff.' };
  }

  function safe(value, fallback){
    const text = String(value || '').trim();
    return text || fallback;
  }

  function escapeHtml(value){
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function slug(value){
    return String(value || '0s-surface-record').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '0s-surface-record';
  }

  function numberValue(value){
    return Number(String(value || '').replace(/[^0-9.-]/g, '')) || 0;
  }

  function readJson(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(_err){
      return fallback;
    }
  }

  function readLedger(){
    const items = readJson(LEDGER_KEY, []);
    return Array.isArray(items) ? items : [];
  }

  function writeLedger(record){
    const next = [
      record,
      ...readLedger().filter(item => item.storageKey !== record.storageKey)
    ].slice(0, 300);
    localStorage.setItem(LEDGER_KEY, JSON.stringify(next, null, 2));
    return next;
  }

  function storageKey(id){
    return `zero-surface-mini:${id || location.pathname}`;
  }

  function download(filename, content, type){
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function scoreStatus(score, risk){
    if(risk === 'Do not publish yet') return 'Do not publish yet';
    if(score >= 82) return 'Ready for handoff';
    if(score >= 64) return 'Operator review';
    if(score >= 42) return 'Needs proof work';
    return 'Incomplete record';
  }

  function evaluate(data, context){
    const proof = PROOF_POINTS[data.proofStatus] ?? 0;
    const status = STATUS_POINTS[data.status] ?? 0;
    const priority = PRIORITY_POINTS[data.priority] ?? 0;
    const riskPenalty = RISK_PENALTY[data.risk] ?? 0;
    const hasOwner = safe(data.owner, '') ? 8 : 0;
    const hasSignal = safe(data.signal, '') ? 9 : 0;
    const hasNext = safe(data.nextAction, '') ? 8 : 0;
    const hasReview = safe(data.reviewDate, '') ? 5 : 0;
    const hasProofLink = safe(data.proofLink, '') ? 8 : 0;
    const score = Math.max(0, Math.min(100, Math.round(status + proof + priority + hasOwner + hasSignal + hasNext + hasReview + hasProofLink - riskPenalty)));
    const value = numberValue(data.impactValue);
    const actions = [
      !safe(data.owner, '') && 'Assign an accountable owner.',
      !safe(data.signal, '') && 'Capture the claim, request, or workflow this surface is supposed to handle.',
      data.proofStatus !== 'Verified' && 'Attach or verify proof before external use.',
      data.risk === 'High' && 'Escalate high-risk items for operator review.',
      data.risk === 'Do not publish yet' && 'Keep this out of public/buyer use until corrected.',
      !safe(data.nextAction, '') && 'Write the next action.',
      !safe(data.reviewDate, '') && 'Set a review date.'
    ].filter(Boolean);
    const statusLabel = scoreStatus(score, data.risk);
    const route = data.risk === 'Do not publish yet'
      ? 'Hold internally until proof, owner, and review are corrected.'
      : `${context.guidance} ${data.proofStatus === 'Verified' ? 'Proof is verified.' : 'Proof still needs work.'}`;
    return {
      score,
      status: statusLabel,
      route,
      actions,
      primaryMetric: value ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value) : safe(data.status, 'Intake'),
      secondaryMetric: safe(data.proofStatus, 'Missing'),
      summary: `${safe(data.recordName, pageTitle())} is a ${context.lane} surface at ${safe(data.status, 'Intake')} with ${safe(data.proofStatus, 'Missing')} proof and ${safe(data.risk, 'Medium')} risk.`
    };
  }

  function markdown(record){
    const data = record.data;
    const fieldLines = Object.keys(FIELD_LABELS)
      .map(key => `- ${FIELD_LABELS[key]}: ${safe(data[key], 'Not set')}`)
      .join('\n');
    const actionLines = record.result.actions.length ? record.result.actions.map(item => `- ${item}`).join('\n') : '- No immediate blockers.';
    return [
      `# ${record.title} 0S Surface Receipt`,
      '',
      `- Generated: ${record.savedAt}`,
      `- Version: ${VERSION}`,
      `- URL: ${record.path}`,
      `- Platform: ${record.platform}`,
      `- Lane: ${record.context.lane}`,
      `- Score: ${record.result.score}/100`,
      `- Status: ${record.result.status}`,
      `- ${record.context.routeLabel}: ${record.result.route}`,
      '',
      '## Summary',
      record.result.summary,
      '',
      '## Fields',
      fieldLines,
      '',
      '## Next Actions',
      actionLines,
      '',
      '## Source Note',
      'Browser-local 0S mini-app record. Export before handing off to another machine.'
    ].join('\n');
  }

  function buildRecord(id, data, context, title){
    const result = evaluate(data, context);
    const record = {
      id: `0S-${Date.now()}`,
      version: VERSION,
      storageKey: storageKey(id),
      path: location.pathname,
      platform: platformFolder(),
      title,
      context,
      savedAt: new Date().toISOString(),
      data,
      result
    };
    record.markdown = markdown(record);
    return record;
  }

  function renderResult(host, record){
    const output = host.querySelector('[data-zero-output]');
    host.querySelectorAll('[data-zero-score]').forEach(el => { el.textContent = record.result.score; });
    host.querySelectorAll('[data-zero-status]').forEach(el => { el.textContent = record.result.status; });
    host.querySelectorAll('[data-zero-primary]').forEach(el => { el.textContent = record.result.primaryMetric; });
    host.querySelectorAll('[data-zero-secondary]').forEach(el => { el.textContent = record.result.secondaryMetric; });
    host.querySelectorAll('[data-zero-route]').forEach(el => { el.textContent = record.result.route; });
    if(output){
      output.innerHTML = [
        `<h3>${escapeHtml(record.context.routeLabel)}</h3>`,
        `<p>${escapeHtml(record.result.summary)}</p>`,
        '<ul>',
        (record.result.actions.length ? record.result.actions : ['No immediate blockers.']).map(item => `<li>${escapeHtml(item)}</li>`).join(''),
        '</ul>'
      ].join('');
    }
    const receipt = host.querySelector('[data-zero-receipt]');
    if(receipt) receipt.textContent = record.markdown;
  }

  function formData(form){
    const data = {};
    new FormData(form).forEach((value, key) => { data[key] = value; });
    return data;
  }

  function workbenchHtml(context, title){
    return [
      '<section class="section zero-mini-app" data-zero-universal>',
      '  <div class="zero-mini-head">',
      '    <p class="eyebrow">0S local mini app</p>',
      `    <h2>${escapeHtml(title)} workbench</h2>`,
      '    <div class="zero-mini-strip">',
      '      <span><b data-zero-score>0</b>Surface score</span>',
      '      <span><b data-zero-primary>Intake</b>Primary metric</span>',
      '      <span><b data-zero-secondary>Missing</b>Proof</span>',
      '    </div>',
      '  </div>',
      '  <div class="zero-mini-grid">',
      '    <form class="zero-mini-form">',
      `      <label>Record name<input name="recordName" value="${escapeHtml(title)}"></label>`,
      `      <label>Owner<input name="owner" placeholder="${escapeHtml(context.owner)}"></label>`,
      '      <label>Target / buyer / workflow<input name="target" placeholder="Client, buyer, claim, task, room, or workflow"></label>',
      '      <label>Status<select name="status"><option>Intake</option><option>Draft</option><option>Active</option><option>Needs proof</option><option>Operator review</option><option>QA review</option><option>Client ready</option><option>Ready for handoff</option></select></label>',
      '      <label>Priority<select name="priority"><option>Standard</option><option>Low</option><option>High</option><option>Critical</option><option>Founder review</option></select></label>',
      '      <label>Proof status<select name="proofStatus"><option>Missing</option><option>Partial</option><option>Linked</option><option>Verified</option></select></label>',
      '      <label>Risk level<select name="risk"><option>Medium</option><option>Low</option><option>High</option><option>Do not publish yet</option></select></label>',
      '      <label>Impact value<input name="impactValue" type="number" inputmode="decimal" placeholder="0"></label>',
      '      <label>Review date<input name="reviewDate" type="date"></label>',
      '      <label>Next action<input name="nextAction" placeholder="The next real action this surface should drive"></label>',
      '      <label class="zero-wide">Proof link<input name="proofLink" type="url" placeholder="../proof/proof-center.html"></label>',
      '      <label class="zero-wide">Surface claim or incoming signal<textarea name="signal" placeholder="Write what this surface claims to do, or paste the real buyer/client/operator signal."></textarea></label>',
      '      <label class="zero-wide">Operator notes<textarea name="notes" placeholder="Known blockers, evidence, limits, owner notes, or handoff details."></textarea></label>',
      '      <div class="button-row zero-actions">',
      '        <button type="button" data-zero-save>Save</button>',
      '        <button type="button" data-zero-export-json>Export JSON</button>',
      '        <button type="button" data-zero-export-md>Export MD</button>',
      '        <button type="button" data-zero-copy>Copy receipt</button>',
      '        <button type="button" data-zero-clear>Clear</button>',
      '      </div>',
      '    </form>',
      '    <aside class="zero-mini-preview">',
      '      <div class="zero-score-card"><span>Surface score</span><strong data-zero-score>0</strong><small data-zero-status>Incomplete record</small></div>',
      '      <div class="zero-route-card"><span>Route</span><p data-zero-route>Start the record.</p></div>',
      '      <div class="zero-result" data-zero-output></div>',
      '    </aside>',
      '  </div>',
      '  <pre class="tool-output zero-receipt" data-zero-receipt></pre>',
      '</section>'
    ].join('');
  }

  function revealFunctionalHost(host){
    if(!host) return;
    host.classList.add('skye-text-visible');
    host.querySelectorAll('.skye-text-reveal').forEach(el => {
      el.classList.add('skye-text-visible');
    });
  }

  function mountUniversalWorkbench(){
    const folder = platformFolder();
    if(!PLATFORM_FOLDERS.has(folder)) return;
    if(location.pathname.includes('/ascension/')) return;
    if(document.querySelector('[data-zero-universal], [data-ascension-mini-app]')) return;
    if(document.querySelector('.zero-mini-enhanced')) return;

    const context = classifySurface();
    const title = pageTitle();
    const main = document.querySelector('main') || document.body;
    if(!main) return;
    main.insertAdjacentHTML('beforeend', workbenchHtml(context, title));
    const host = document.querySelector('[data-zero-universal]');
    revealFunctionalHost(host);
    wireZeroHost(host, storageKey(location.pathname), context, title);
  }

  function collectPanelData(panel){
    const data = {
      recordName: panel.querySelector('h1,h2,h3')?.textContent?.trim() || pageTitle(),
      owner: '',
      target: pageTitle(),
      status: 'Operator review',
      priority: 'Standard',
      proofStatus: 'Partial',
      proofLink: '',
      risk: 'Medium',
      impactValue: '',
      nextAction: '',
      reviewDate: '',
      signal: '',
      notes: ''
    };
    const fields = [...panel.querySelectorAll('input, textarea, select')];
    fields.forEach((field, index) => {
      const name = field.name || field.dataset.field || field.id || `field_${index}`;
      const value = field.type === 'checkbox' ? (field.checked ? field.value || 'checked' : '') : field.value;
      if(/owner/i.test(name)) data.owner = value;
      else if(/status|stage/i.test(name)) data.status = statusFrom(value);
      else if(/priority/i.test(name)) data.priority = priorityFrom(value);
      else if(/risk|approval|legal|compliance/i.test(name)) data.risk = riskFrom(value);
      else if(/proof|evidence/i.test(name)) data.proofStatus = proofFrom(value);
      else if(/date|review/i.test(name)) data.reviewDate = value;
      else if(/next|action/i.test(name)) data.nextAction = value;
      else if(/value|price|amount|budget|pipeline|revenue/i.test(name)) data.impactValue = value;
      else if(/link|url/i.test(name)) data.proofLink = value;
      else if(!data.signal && value) data.signal = value;
      else if(value) data.notes += `${name}: ${value}\n`;
    });
    return data;
  }

  function statusFrom(value){
    const text = String(value || '').toLowerCase();
    if(/ready|handoff|complete|client/.test(text)) return 'Ready for handoff';
    if(/qa|review|approval|founder|compliance/.test(text)) return 'Operator review';
    if(/active|delivery|progress/.test(text)) return 'Active';
    if(/proof|evidence/.test(text)) return 'Needs proof';
    if(/draft|normal|standard/.test(text)) return 'Draft';
    return 'Intake';
  }

  function priorityFrom(value){
    const text = String(value || '').toLowerCase();
    if(/critical|revenue/.test(text)) return 'Critical';
    if(/high|founder|compliance|sensitive/.test(text)) return 'High';
    if(/low/.test(text)) return 'Low';
    return 'Standard';
  }

  function riskFrom(value){
    const text = String(value || '').toLowerCase();
    if(/do not|legal|compliance|founder|professional|required|sensitive/.test(text)) return 'High';
    if(/high/.test(text)) return 'High';
    if(/low|no/.test(text)) return 'Low';
    return 'Medium';
  }

  function proofFrom(value){
    const text = String(value || '').toLowerCase();
    if(/verified|ready|client|qa|complete/.test(text)) return 'Verified';
    if(/link|receipt|evidence|collected/.test(text)) return 'Linked';
    if(/partial|draft|pending|operator/.test(text)) return 'Partial';
    return 'Missing';
  }

  function enhanceExistingTools(){
    const selectors = [
      '.tool-panel[data-tool]',
      '.tool-panel',
      '.form-shell[data-crown-tool]',
      '.crown-tool[data-crown-tool]',
      '.saas-tool',
      '.local-tool',
      'form.asc-tool'
    ];
    document.querySelectorAll(selectors.join(',')).forEach((panel, index) => {
      if(panel.closest('[data-zero-universal], [data-ascension-mini-app]')) return;
      if(location.pathname.includes('/ascension/') && panel.matches('form.asc-tool')) return;
      if(panel.dataset.zeroEnhanced === 'true') return;
      if(!panel.querySelector('input,textarea,select')) return;

      panel.dataset.zeroEnhanced = 'true';
      panel.classList.add('zero-mini-enhanced');
      const context = classifySurface(panel.innerText);
      const title = panel.querySelector('h1,h2,h3')?.textContent?.trim() || pageTitle();
      const id = panel.dataset.tool || panel.dataset.crownTool || panel.id || `${location.pathname}#tool-${index}`;
      panel.insertAdjacentHTML('beforeend', [
        '<div class="zero-tool-bridge">',
        '  <div class="zero-mini-strip">',
        '    <span><b data-zero-score>0</b>0S score</span>',
        '    <span><b data-zero-status>Not saved</b>Status</span>',
        '    <span><b data-zero-secondary>Partial</b>Proof</span>',
        '  </div>',
        '  <div class="button-row zero-actions">',
        '    <button type="button" data-zero-save>Generate 0S Receipt</button>',
        '    <button type="button" data-zero-export-json>Export 0S JSON</button>',
        '    <button type="button" data-zero-export-md>Export 0S MD</button>',
        '  </div>',
        '  <div class="zero-result" data-zero-output></div>',
        '  <pre class="tool-output zero-receipt" data-zero-receipt></pre>',
        '</div>'
      ].join(''));
      revealFunctionalHost(panel);
      wireZeroHost(panel, storageKey(id), context, title, () => collectPanelData(panel));
    });
  }

  function wireZeroHost(host, key, context, title, collector){
    if(!host) return;
    revealFunctionalHost(host);
    const form = host.querySelector('.zero-mini-form');
    const collect = collector || (() => formData(form));
    const saved = readJson(key, null);
    if(saved && saved.data && form){
      Object.entries(saved.data).forEach(([name, value]) => {
        const field = form.elements[name];
        if(field) field.value = value;
      });
    }
    const update = () => {
      const record = buildRecord(key, collect(), context, title);
      renderResult(host, record);
      return record;
    };
    if(form){
      form.addEventListener('input', update);
      form.addEventListener('change', update);
    }
    host.querySelectorAll('[data-zero-save]').forEach(button => {
      button.addEventListener('click', () => {
        const record = update();
        localStorage.setItem(key, JSON.stringify(record, null, 2));
        writeLedger(record);
        const receipt = host.querySelector('[data-zero-receipt]');
        if(receipt) receipt.textContent = `${record.markdown}\n\nSaved locally: ${record.savedAt}`;
        mountPlatformCockpit();
      });
    });
    host.querySelectorAll('[data-zero-export-json]').forEach(button => {
      button.addEventListener('click', () => {
        const record = update();
        download(`${slug(record.title)}-0s-receipt.json`, JSON.stringify(record, null, 2), 'application/json');
      });
    });
    host.querySelectorAll('[data-zero-export-md]').forEach(button => {
      button.addEventListener('click', () => {
        const record = update();
        download(`${slug(record.title)}-0s-receipt.md`, record.markdown, 'text/markdown');
      });
    });
    host.querySelectorAll('[data-zero-copy]').forEach(button => {
      button.addEventListener('click', async () => {
        const record = update();
        try{ await navigator.clipboard.writeText(record.markdown); }catch(_err){}
        const receipt = host.querySelector('[data-zero-receipt]');
        if(receipt) receipt.textContent = `${record.markdown}\n\nCopied to clipboard.`;
      });
    });
    host.querySelectorAll('[data-zero-clear]').forEach(button => {
      button.addEventListener('click', () => {
        localStorage.removeItem(key);
        if(form) form.reset();
        const record = update();
        const receipt = host.querySelector('[data-zero-receipt]');
        if(receipt) receipt.textContent = `${record.title} local 0S record cleared.`;
      });
    });
    update();
  }

  function mountPlatformCockpit(){
    const folder = platformFolder();
    if(!PLATFORM_FOLDERS.has(folder)) return;
    if(!/\/index\.html$|\/$/.test(location.pathname)) return;
    if(location.pathname.includes('/ascension/')) return;
    const main = document.querySelector('main') || document.body;
    if(!main) return;
    const records = readLedger().filter(item => item.platform === folder);
    const avg = records.length ? Math.round(records.reduce((sum, item) => sum + (item.result?.score || 0), 0) / records.length) : 0;
    const ready = records.filter(item => (item.result?.score || 0) >= 82).length;
    const needsProof = records.filter(item => /proof|Incomplete|Do not publish/i.test(item.result?.status || '') || (item.result?.score || 0) < 64).length;
    const html = [
      '<section class="section zero-platform-cockpit" data-zero-platform-cockpit>',
      '  <div class="zero-mini-head">',
      '    <p class="eyebrow">0S platform cockpit</p>',
      `    <h2>${escapeHtml(folder.replace(/-/g, ' '))} local records</h2>`,
      '    <div class="zero-mini-strip">',
      `      <span><b>${avg}</b>Average score</span>`,
      `      <span><b>${ready}</b>Ready surfaces</span>`,
      `      <span><b>${needsProof}</b>Needs work</span>`,
      '    </div>',
      '  </div>',
      '  <div class="zero-ledger-grid">',
      (records.length ? records.slice(0, 12).map(record => [
        '<article class="zero-ledger-card">',
        `  <span>${escapeHtml(record.context?.lane || 'surface')}</span>`,
        `  <h3>${escapeHtml(record.title)}</h3>`,
        `  <strong>${record.result?.score || 0}/100</strong>`,
        `  <p>${escapeHtml(record.result?.status || 'Not saved')}</p>`,
        `  <small>${escapeHtml(record.path)}</small>`,
        '</article>'
      ].join('')).join('') : '<p class="wide">No local 0S records yet. Open a surface, generate a receipt, and this cockpit will fill itself.</p>'),
      '  </div>',
      '</section>'
    ].join('');
    const existing = document.querySelector('[data-zero-platform-cockpit]');
    if(existing) existing.outerHTML = html;
    else {
      const firstGrid = main.querySelector('.route-grid,.grid.cards,.upgrade-grid');
      (firstGrid?.closest('section') || main).insertAdjacentHTML(firstGrid ? 'beforebegin' : 'beforeend', html);
    }
    revealFunctionalHost(document.querySelector('[data-zero-platform-cockpit]'));
  }

  function boot(){
    enhanceExistingTools();
    mountUniversalWorkbench();
    mountPlatformCockpit();
  }

  window.ZeroSurfaceApps = {
    version: VERSION,
    evaluate,
    classifySurface,
    exportLedger(){
      download('metraiyux-0s-surface-ledger.json', JSON.stringify(readLedger(), null, 2), 'application/json');
    },
    clearLedger(){
      localStorage.removeItem(LEDGER_KEY);
      mountPlatformCockpit();
    }
  };

  onReady(boot);
})();
