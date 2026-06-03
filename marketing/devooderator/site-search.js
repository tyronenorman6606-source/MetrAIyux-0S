(function () {
  var INDEX = [
    { title: 'Overview — MetrAIyux 0S', url: 'index.html', keywords: 'home overview platform sovereign OS edge workers pricing plans' },
    { title: 'Full Capabilities', url: 'capabilities.html', keywords: 'capabilities brains workers features lanes 17 brains auth email vault database kaixu 0meg4kai relay connectlog skyepay routex staffing music legal free99' },
    { title: 'Sell Sheet', url: 'sell-sheet.html', keywords: 'sell sheet b2b business case procurement operators licensing workers pages skyepay checkout settlement' },
    { title: 'White Label', url: 'white-label.html', keywords: 'white label resale agency brand deploy client autonomous office' },
    { title: 'Marketplace', url: 'marketplace.html', keywords: 'marketplace products client builds bobs smoke shop empire pallets valley verified' },
    { title: 'Client App Workflow', url: 'index.html#client-operating-loop', keywords: 'client app workflow lead capture fs27 relay13 connectlog workspace ai addon response drafts how to use' },
    { title: 'Relay13 AI Response Starter', url: 'marketplace.html#products', keywords: 'relay13 ai response starter 35 month add-on paid activation local brain 125 messages 31 backup owner review' },
    { title: 'Relay13 AI Response Plus', url: 'marketplace.html#products', keywords: 'relay13 ai response plus 79 month 425 messages 76 backup priority routing owner review' },
    { title: 'Relay13 Managed AI Inbox', url: 'marketplace.html#products', keywords: 'relay13 managed ai inbox 149 month 1000 messages 222 backup auto triage allowlisted replies human escalation' },
    { title: 'Ecosystem Map', url: 'ecosystem.html', keywords: 'ecosystem map routes platform lanes diagram interactive' },
    { title: 'Live Proof', url: 'proof.html', keywords: 'proof live cf-ray receipts smoke tests deployment confirmed workers' },
    { title: 'Proof Ecology', url: 'proof-ecology.html', keywords: 'proof ecology ledger artifacts receipts headed browser mcp smoke stress deployment json public evidence' },
    { title: 'Platform Valuation', url: 'valuation.html', keywords: 'valuation 13.5m 24m 39m 68m million engineering replacement founder operator strategic range skyemail skyepay capacity gating' },
    { title: 'No Direct Competitor', url: 'the-gap.html', keywords: 'competitor gap gohighlevel supabase firebase appwrite retool sovereignty edge ai os market category' },
    { title: 'One-Page Flyer', url: 'flyer.html', keywords: 'flyer pdf one page overview print marketing' },
    { title: 'Social Media Content', url: 'social.html', keywords: 'social media content library linkedin facebook instagram reddit posts copy paste marketing captions hashtags platform announcement auren kaixu sovereign proof valuation no competitor white label music staffing valley verified crown os nexus ascension free99' },
    { title: 'Founder Drops', url: 'founder-drops.html', keywords: 'founder drops gray skyes content proof posts instagram linkedin facebook reddit skyevault repo rescue daemon autosync' },
    { title: 'SkyeVault Autosync Daemon Founder Note', url: 'founder-notes/skyevault-autosync-daemon.html', keywords: 'skyevault autosync daemon repo rescue skache shyt happens encrypted literal full repo all bytes source custody vscode workspace ide ten minute scan proof receipts resend vault drive unlock' },
    { title: 'DevodeRator — Gray Skyes Dev Blog', url: 'https://devooderator.pages.dev/', keywords: 'devooderator gray skyes dev blog daily build log mcp agents skyevault bins behind the scenes business cards social vault' },
    { title: 'The 0S Closeout Is Green Because The Receipts Finally Agree', url: 'https://devooderator.pages.dev/blog/2026-06-03-0s-end-to-end-closeout', keywords: 'metraiyux 0s closeout production closure green worker 70b546c5 truth ledger 24 24 live capability watch 9 auth spine 75 free99 root env skygatefs13 admin password shared gate mounted apps buttons links valuation diligence browser e2e receipts' },
    { title: 'The 0S Extensive Work Proof Ledger', url: 'https://devooderator.pages.dev/blog/2026-06-01-0s-extensive-work-proof-ledger', keywords: 'metraiyux 0s extensive work proof ledger skyemail skyepay relay13 sales registry settlement skyevault skynet citadel database sovereign docs skyecommerce skyemusicnexus routex valuation proof receipts customer thanks ai governance mailbox capacity real user readiness' },
    { title: 'SkyeMail, SkyePay, and 0S Money-Lane Proof', url: 'https://devooderator.pages.dev/blog/2026-06-01-skyemail-skyepay-0s-money-lane', keywords: 'skyemail skyepay citadel database skyenet settlement parity buyer fulfillment truth 153 offers mailbox capacity 9 self serve proof customer thank you telemetry 0s integrations crm docs calendar commerce pwa proof receipts' },
    { title: 'Reape0r CLI Install Guide', url: 'https://devooderator.pages.dev/blog/2026-06-02-reape0r-cli-install-guide', keywords: 'reape0r autonomous cloud repo mirror cli install guide auto install skyevault skypay skyepay mutable current mirror sync watch verify restore receipts quotas agent download terminal commands' },
    { title: 'Reape0r Is the Demon in My Machine', url: 'https://devooderator.pages.dev/blog/2026-06-02-reape0r-demon-in-my-machine', keywords: 'reape0r demon in my machine daemon best friend autonomous cloud repo mirror founder note mutable current mirror receipts repo custody codespaces recovery' },
    { title: 'The 0S Week of Repairs and Reape0r Proof', url: 'https://devooderator.pages.dev/blog/2026-06-02-0s-week-of-repairs-reape0r-proof', keywords: 'metraiyux 0s week repairs reape0r proof shared auth skygate fs27 free99 skyepay skyevault drive devoderator mutable current mirror installer customer readiness quotas' },
    { title: 'SkyeVault Owner Source Origin', url: 'https://devooderator.pages.dev/blog/2026-05-30-skyevault-sovereign-source-origin', keywords: 'skyevault owner source origin encrypted full repo baseline additive delta journal smart http git origin clone proof sovereign custody codespaces disposable compute' },
    { title: '0S Production Closure + SkyeVault Daemon Correction', url: 'https://devooderator.pages.dev/blog/2026-05-29-0s-production-closure-gate-repair', keywords: '0s production closure gate repair truth ledger operating matrix live operator surfaces shared gate codex agents skyerrors proof receipts skyevault streams daemon literal full repo encrypted all bytes source custody r2 control pack finalizer' },
    { title: 'Media Over London', url: 'media-over-london.html', keywords: 'media over london marketing spectacle client picture background removal base64 html orbit gallery artist universe content engine valley verified mcp merser skrucible quantumskyes campaign proof qr' },
    { title: 'SkyeNet Deploy Lane', url: 'skyenet.html', keywords: 'skyenet deploy lane drop hosting fs27 r2 kv route registry observability free99 cost caps static surfaces worker functions shared gate' },
    { title: 'SkyeMusicNexus Marketing Hub', url: 'skye-music-nexus/nexus-marketing-hub.html', keywords: 'skye music nexus artist landing page shop store drops payout skyepay artist id hash vendor contractor fan donations tips merch private download 13 percent fee pricing calculator blog engine payroll settlement' },
    { title: 'SkyeMusicNexus Founder Field Guide', url: 'skye-music-nexus/founders-nexus-field-guide.html', keywords: 'founder guide nexus walkthrough artist business daw beta sovereign docs skye music nexus media over london skyepay relay13 skymail contact solenterprises grayskyes metraiyux 0s support' },
    { title: 'Dev Free Sauce - Merser', url: 'dev-free-sauce.html', keywords: 'dev free sauce merser skyes over london npm npx mcp stdio package dependencies versions readme cli source world gate remote health' },
    { title: 'Merser npm Package', url: 'https://www.npmjs.com/package/@skyes0verl0nd0n/merser', keywords: 'merser npm package skyes0verl0nd0n version readme dependencies npx cli stdio mcp' },
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
    { title: 'SkyePay — Payment OS', url: 'capabilities.html#stack', keywords: 'skyepay payment os 153 offers checkout billing fulfillment settlement' },
    { title: 'Pricing Plans', url: 'index.html#pricing', keywords: 'pricing plans free starter growth autonomous office enterprise tiers' },
  ];

  function match(item, q) {
    var s = (item.title + ' ' + item.keywords).toLowerCase();
    return q.toLowerCase().split(/\s+/).every(function (w) { return w.length < 2 || s.includes(w); });
  }

  function resolveUrl(url) {
    if (/^(https?:|mailto:|tel:|#|\/)/.test(url)) return url;
    return 'https://metraiyux-0s-marketing.pages.dev/' + url;
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
        li.innerHTML = '<a href="' + resolveUrl(item.url) + '">' + item.title + '</a>';
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
