(function () {
  var INDEX = [
    { title: 'Overview — MetrAIyux 0S', url: 'index.html', keywords: 'home overview platform sovereign OS edge workers pricing plans' },
    { title: 'Full Capabilities', url: 'capabilities.html', keywords: 'capabilities brains workers features lanes 17 brains auth email vault database kaixu 0meg4kai relay connectlog skyepay routex staffing music legal free99' },
    { title: 'Sell Sheet', url: 'sell-sheet.html', keywords: 'sell sheet b2b business case procurement operators licensing workers pages stripe' },
    { title: 'White Label', url: 'white-label.html', keywords: 'white label resale agency brand deploy client autonomous office' },
    { title: 'Marketplace', url: 'marketplace.html', keywords: 'marketplace products client builds bobs smoke shop empire pallets valley verified' },
    { title: 'Client App Workflow', url: 'index.html#client-operating-loop', keywords: 'client app workflow lead capture fs27 relay13 connectlog workspace ai addon response drafts how to use' },
    { title: 'Relay13 AI Response Starter', url: 'marketplace.html#products', keywords: 'relay13 ai response starter 35 month add-on paid activation local brain 125 messages 31 backup owner review' },
    { title: 'Relay13 AI Response Plus', url: 'marketplace.html#products', keywords: 'relay13 ai response plus 79 month 425 messages 76 backup priority routing owner review' },
    { title: 'Relay13 Managed AI Inbox', url: 'marketplace.html#products', keywords: 'relay13 managed ai inbox 149 month 1000 messages 222 backup auto triage allowlisted replies human escalation' },
    { title: 'Ecosystem Map', url: 'ecosystem.html', keywords: 'ecosystem map routes platform lanes diagram interactive' },
    { title: 'Live Proof', url: 'proof.html', keywords: 'proof live cf-ray receipts smoke tests deployment confirmed workers' },
    { title: 'Platform Valuation', url: 'valuation.html', keywords: 'valuation 1.5m 2m million deployed asset band replacement cost section accumulation' },
    { title: 'No Direct Competitor', url: 'the-gap.html', keywords: 'competitor gap gohighlevel supabase firebase appwrite retool sovereignty edge ai os market category' },
    { title: 'One-Page Flyer', url: 'flyer.html', keywords: 'flyer pdf one page overview print marketing' },
    { title: 'Social Media Content', url: 'social.html', keywords: 'social media content library linkedin facebook instagram reddit posts copy paste marketing captions hashtags platform announcement auren kaixu sovereign proof valuation no competitor white label music staffing valley verified crown os nexus ascension free99' },
    { title: 'LinkedIn Posts', url: 'social.html', keywords: 'linkedin posts professional b2b founder tech infrastructure sovereign announcement' },
    { title: 'Facebook Posts', url: 'social.html', keywords: 'facebook posts community business local phoenix valley verified announcement' },
    { title: 'Instagram Captions', url: 'social.html', keywords: 'instagram captions hashtags visual content creator reels music tech founder' },
    { title: 'Reddit Posts', url: 'social.html', keywords: 'reddit posts r/cloudflare r/selfhosted r/webdev r/entrepreneur r/saas r/startups r/artificial technical deep dive' },
    { title: 'Gray Skyes — Founder &amp; Builder', url: 'gray-skyes.html', keywords: 'gray skyes founder builder architect skyes over london phoenix az who built metraiyux 0s one person one year zero funding hire work with services skyeknowlogy bobs smoke shop empire pallets signin pro northstar shared auth client builds sovereignty architecture' },
    { title: 'SkyeKnowlogy — Live Build Standard', url: 'gray-skyes.html#skyeknowlogy', keywords: 'skyeknowlogy client builds bobs smoke shop empire pallets signin pro northstar fs27 skyegate free99 shared auth gateway13 delta alpha skydexia adapter kaixu gate delta kaixu67 quantumskyes super ide estifarr solenterprises international nexus holdings citadeldb skyevault skymail sovereignty infrastructure disposable tokens server side keys' },
    { title: 'SkyeRouteX — Dispatch OS', url: 'skyeroutex.html', keywords: 'skyeroutex routex dispatch workforce routes contractor payment ledger' },
    { title: 'Valley Verified — Phoenix Business Directory', url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified/', keywords: 'valley verified phoenix phx arizona local business directory listings verified edge' },
    { title: 'SkyeGate FS27 — Auth Platform', url: 'capabilities.html#workers', keywords: 'skyegate fs27 auth blake3 oauth twilio bearer token api keys allowlist' },
    { title: 'SkyeMail — Email Platform', url: 'capabilities.html#workers', keywords: 'skyemail email platform stalwart mailbox gmail oauth spam filtering 43395 lines' },
    { title: 'CitadelDB — Sovereign Database', url: 'capabilities.html#stack', keywords: 'citadeldb postgres k8s ha pitr wal streaming database sovereign' },
    { title: 'SkyeVault — Git Protocol', url: 'capabilities.html#workers', keywords: 'skyevault git smart-http clone push fetch vault cf worker' },
    { title: 'kAIxu 6.7 — Sovereign AI', url: 'capabilities.html#stack', keywords: 'kaixu ai model sovereign 5 variants nano mini pro max plan gated' },
    { title: '0meg4kAI — Security Scanner', url: 'capabilities.html#security', keywords: '0meg4kai security scanner two layer edge browser tenant isolation quarantine' },
    { title: 'Relay13 + ConnectLog — Realtime', url: 'capabilities.html#workers', keywords: 'relay13 connectlog durable objects websocket realtime rooms guardrails' },
    { title: 'SkyePay — Payment OS', url: 'capabilities.html#stack', keywords: 'skyepay payment os stripe 58 products checkout billing' },
    { title: 'Pricing Plans', url: 'index.html#pricing', keywords: 'pricing plans free starter growth autonomous office enterprise tiers' },
  ];

  function match(item, q) {
    var s = (item.title + ' ' + item.keywords).toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (w) { return w.length < 2 || s.includes(w); });
  }

  function init() {
    var wrap = document.querySelector('.nav-search');
    if (!wrap) return;
    var input = wrap.querySelector('.nav-search-input');
    var list  = wrap.querySelector('.nav-search-results');
    if (!input || !list) return;

    function render(q) {
      list.innerHTML = '';
      if (!q || q.length < 2) { list.hidden = true; return; }
      var hits = INDEX.filter(function (item) { return match(item, q); }).slice(0, 7);
      if (!hits.length) {
        list.innerHTML = '<li class="nav-sr-empty">No results</li>';
        list.hidden = false;
        return;
      }
      hits.forEach(function (item, i) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.innerHTML = '<a href="' + item.url + '">' + item.title + '</a>';
        list.appendChild(li);
      });
      list.hidden = false;
    }

    input.addEventListener('input', function () { render(input.value.trim()); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { list.hidden = true; input.blur(); }
      if (e.key === 'Enter') {
        var first = list.querySelector('a');
        if (first) { first.click(); }
      }
      if (e.key === 'ArrowDown') {
        var links = list.querySelectorAll('a');
        if (links.length) { e.preventDefault(); links[0].focus(); }
      }
    });

    list.addEventListener('keydown', function (e) {
      var links = Array.from(list.querySelectorAll('a'));
      var cur = document.activeElement;
      var idx = links.indexOf(cur);
      if (e.key === 'ArrowDown' && idx < links.length - 1) { e.preventDefault(); links[idx + 1].focus(); }
      if (e.key === 'ArrowUp')  { e.preventDefault(); if (idx > 0) links[idx - 1].focus(); else input.focus(); }
      if (e.key === 'Escape')   { list.hidden = true; input.focus(); }
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) list.hidden = true;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// BEGIN quantumskyes:skyesol-living-background-js
function mountSkyeSolLivingBackground({
  canvasSelector = '.skyesol-living-field',
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext('2d');
  const palette = [
    'rgba(201,168,76,',
    'rgba(138,99,255,',
    'rgba(39,242,255,'
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + .4,
      a: Math.random() * .34 + .12,
      s: Math.random() * .34 + .08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * .006) + time * speed) * amp;
      const n2 = Math.cos((x * .011) - time * speed * .7) * amp * .46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * .28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, .24);
    drawWave(t, height * .82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, .28);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onPointerMove);
  };
}


(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
// END quantumskyes:skyesol-living-background-js
