(function(){
  const gate = document.querySelector('.age-gate');
  const yes = document.querySelector('[data-age-yes]');
  const no = document.querySelector('[data-age-no]');
  const intro = document.querySelector('[data-site-intro]');
  const heroVideo = document.querySelector('[data-hero-video]');
  const heroYoutube = document.querySelector('[data-hero-youtube]');
  const previewWindow = document.querySelector('[data-preview-window]');
  const openPreviewButtons = document.querySelectorAll('[data-preview-open]');
  const minimizePreview = document.querySelector('[data-preview-minimize]');
  let introTimer;
  let youtubePlayer;

  function setPreviewOpen(isOpen){
    if(!previewWindow) return;
    previewWindow.classList.remove('is-hidden');
    previewWindow.classList.toggle('is-minimized', !isOpen);
    previewWindow.classList.toggle('is-open', isOpen);
    openPreviewButtons.forEach((button) => button.setAttribute('aria-expanded', String(isOpen)));
  }
  function hidePreview(){
    if(!previewWindow) return;
    previewWindow.classList.add('is-hidden');
    previewWindow.classList.remove('is-open','is-minimized');
  }
  function setPreviewMinimized(){
    if(intro) {
      intro.classList.add('is-hidden');
      intro.classList.remove('is-running');
    }
    document.body.classList.remove('app-intro-running','app-locked');
    document.body.classList.add('app-ready','app-video-reveal');
    if(heroVideo) {
      heroVideo.muted = true;
      heroVideo.play().catch(() => {});
    }
    ensureHeroYoutube();
    window.setTimeout(() => document.body.classList.remove('app-video-reveal'), 1500);
    setPreviewOpen(false);
  }
  function startHomepageSequence(){
    if(!previewWindow || introTimer) return;
    document.body.classList.remove('app-ready','app-locked');
    document.body.classList.add('app-intro-running');
    hidePreview();
    if(intro) {
      intro.classList.remove('is-running');
      void intro.offsetWidth;
      intro.classList.remove('is-hidden');
      intro.classList.add('is-running');
    }
    introTimer = window.setTimeout(setPreviewMinimized, 5650);
  }

  if(previewWindow) hidePreview();
  if(heroVideo) {
    heroVideo.muted = true;
    heroVideo.addEventListener('canplay', () => {
      if(document.body.classList.contains('app-ready')) heroVideo.play().catch(() => {});
    }, { once:true });
  }
  function createHeroYoutubePlayer(){
    if(!heroYoutube || youtubePlayer || !window.YT || !window.YT.Player) return;
    youtubePlayer = new window.YT.Player(heroYoutube, {
      events: {
        onReady: (event) => {
          event.target.mute();
          event.target.playVideo();
        },
        onStateChange: (event) => {
          if(event.data === window.YT.PlayerState.PLAYING) {
            document.body.classList.add('youtube-live-ready');
          }
        },
        onError: () => {
          document.body.classList.remove('youtube-live-ready');
        }
      }
    });
  }
  function loadYoutubeApi(){
    if(!heroYoutube) return;
    if(window.YT && window.YT.Player) {
      createHeroYoutubePlayer();
      return;
    }
    if(document.querySelector('[data-youtube-api]')) return;
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if(typeof previousReady === 'function') previousReady();
      createHeroYoutubePlayer();
    };
    const api = document.createElement('script');
    api.src = 'https://www.youtube.com/iframe_api';
    api.async = true;
    api.dataset.youtubeApi = 'true';
    document.head.appendChild(api);
  }
  function ensureHeroYoutube(){
    if(!heroYoutube || heroYoutube.dataset.loaded === 'true') return;
    const src = new URL(heroYoutube.dataset.youtubeSrc, window.location.href);
    src.searchParams.set('origin', window.location.origin);
    heroYoutube.src = src.toString();
    heroYoutube.dataset.loaded = 'true';
    heroYoutube.addEventListener('load', loadYoutubeApi, { once:true });
    loadYoutubeApi();
  }

  if(yes) yes.addEventListener('click', () => {
    document.body.classList.remove('app-ready','app-locked');
    document.body.classList.add('app-intro-running');
    if(gate) gate.style.display='none';
    startHomepageSequence();
  });
  if(no) no.addEventListener('click', () => { document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;background:#02050a;color:white;font-family:system-ui;text-align:center;padding:24px"><div><h1>Access Restricted</h1><p>This app is intended for adults 21+ only.</p></div></main>'; });
  openPreviewButtons.forEach((button) => button.addEventListener('click', () => setPreviewOpen(true)));
  if(minimizePreview) minimizePreview.addEventListener('click', () => setPreviewOpen(false));
  const progress = document.querySelector('.scroll-progress');
  const heroMinimal = document.querySelector('.hero-minimal');
  const livingCanvas = document.querySelector('[data-living-background]');
  const revealTargets = document.querySelectorAll('.section .wrap, .card, .banner-card, .blog-card, .panel, .live-media, .reel-stage, .reel-stack figure, .workspace-strip, .map-card');
  revealTargets.forEach((el, index) => {
    el.classList.add('reveal-on-scroll');
    el.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 45}ms`);
  });
  const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if(entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }) : null;
  revealTargets.forEach((el) => revealObserver ? revealObserver.observe(el) : el.classList.add('is-visible'));
  function updateScrollEffects(){
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.min(1, Math.max(0, window.scrollY / max));
    if(progress) progress.style.width = `${pct * 100}%`;
    if(heroMinimal) heroMinimal.style.transform = 'none';
  }
  window.addEventListener('scroll', updateScrollEffects, { passive:true });
  window.addEventListener('resize', updateScrollEffects);
  updateScrollEffects();

  function mountSkyeUIComponents(){
    if(window.__bobsSkyeUIComponents) return;
    window.__bobsSkyeUIComponents = true;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    document.body.classList.add('skye-ui-polished');

    function addMeteors(host, count){
      if(!host || reducedMotion || host.dataset.skyeMeteors === 'true') return;
      host.dataset.skyeMeteors = 'true';
      host.classList.add('skye-meteor-host');
      for(let index = 0; index < count; index += 1){
        const meteor = document.createElement('span');
        meteor.className = 'skye-meteor';
        meteor.style.setProperty('--skye-meteor-delay', `${(index * 0.32 + Math.random()).toFixed(2)}s`);
        meteor.style.setProperty('--skye-meteor-duration', `${(2.1 + Math.random() * 1.2).toFixed(2)}s`);
        meteor.style.top = `${6 + Math.random() * 72}%`;
        meteor.style.left = `${34 + Math.random() * 58}%`;
        host.appendChild(meteor);
      }
    }

    function addBorderBeam(element, index){
      if(!element || reducedMotion || element.dataset.skyeBeam === 'true') return;
      element.dataset.skyeBeam = 'true';
      element.classList.add('skye-beam-host');
      const beam = document.createElement('i');
      beam.className = 'skye-border-beam';
      beam.setAttribute('aria-hidden', 'true');
      beam.style.setProperty('--skye-beam-delay', `${index * 160}ms`);
      element.appendChild(beam);
    }

    function addOrbitingCircles(host){
      if(!host || reducedMotion || host.dataset.skyeOrbit === 'true') return;
      host.dataset.skyeOrbit = 'true';
      host.classList.add('skye-orbit-host');
      const overlay = document.createElement('span');
      overlay.className = 'skye-orbit-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      [190, 270].forEach((size, ringIndex) => {
        const ring = document.createElement('span');
        ring.className = `skye-orbit-ring${ringIndex ? ' reverse' : ''}`;
        ring.style.width = `${size}px`;
        ring.style.height = `${size}px`;
        ring.style.setProperty('--skye-orbit-speed', `${ringIndex ? 22 : 16}s`);
        overlay.appendChild(ring);
        for(let nodeIndex = 0; nodeIndex < 4; nodeIndex += 1){
          const node = document.createElement('span');
          node.className = 'skye-orbit-node';
          node.style.setProperty('--skye-node-angle', `${nodeIndex * 90 + ringIndex * 38}deg`);
          node.style.setProperty('--skye-node-radius', `${size / 2}px`);
          ring.appendChild(node);
        }
      });
      host.prepend(overlay);
    }

    function addTextAnimation(){
      const targets = Array.from(document.querySelectorAll('.hero h1, .section h2, .panel h2, .card h3, .banner-card h3')).slice(0, 42);
      targets.forEach((element, index) => {
        element.classList.add('skye-text-animate');
        element.style.setProperty('--skye-text-delay', `${Math.min((index % 8) * 55, 385)}ms`);
      });
      if(!('IntersectionObserver' in window)){
        targets.forEach((element) => element.classList.add('skye-visible'));
        return;
      }
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if(!entry.isIntersecting) return;
          entry.target.classList.add('skye-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
      targets.forEach((element) => observer.observe(element));
    }

    document.querySelectorAll('.panel, .card, .banner-card, .reel-stage, .reel-stack figure, .workspace-strip, .home-qr-card, .stat, .live-facts div, .glow-img').forEach((element, index) => {
      element.classList.add('skye-shine-wrap');
      if(index < 14) addBorderBeam(element, index);
    });
    document.querySelectorAll('.btn, button, .service-pill').forEach((element) => element.classList.add('skye-magnetic'));
    document.querySelectorAll('.stats, .live-facts, .workspace-actions, .reel-grid').forEach((element) => element.classList.add('skye-animated-beam'));
    addMeteors(document.querySelector('.hero'), 12);
    addMeteors(document.querySelector('.live-upgrade-section'), 8);
    addOrbitingCircles(document.querySelector('.intro-logo-wrap'));
    addOrbitingCircles(document.querySelector('.home-qr-card'));
    addTextAnimation();

    if(finePointer && !reducedMotion && !document.querySelector('.skye-pointer')){
      const pointer = document.createElement('div');
      pointer.className = 'skye-pointer';
      pointer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(pointer);
      window.addEventListener('pointermove', (event) => {
        pointer.classList.add('active');
        pointer.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      }, { passive:true });
      window.addEventListener('pointerleave', () => pointer.classList.remove('active'), { passive:true });
    }
  }

  mountSkyeUIComponents();
  function initMcpScrollStage(){
    if(window.__bobsMcpScrollReady) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasStack = window.gsap && window.ScrollTrigger && window.Lenis;
    if(prefersReducedMotion || !hasStack) {
      document.documentElement.classList.add('mcp-scroll-basic');
      return;
    }
    window.__bobsMcpScrollReady = true;
    document.documentElement.classList.add('mcp-scroll-stage');

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    const createLenis = window.__bobsCreateLenis || ((options) => new window.Lenis(options));
    const lenis = createLenis({
      lerp: 0.16,
      smoothWheel: true,
      wheelMultiplier: 0.86,
      touchMultiplier: 1.08
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    gsap.set('.hero-minimal, .stats .stat, .live-copy, .live-media img, .card, .banner-card, .reel-stage, .reel-stack figure, .workspace-strip', {
      willChange: 'transform, opacity'
    });

    gsap.timeline({
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.7
      }
    })
      .to('.hero-video-bg', { scale: 1.08, filter: 'saturate(1.18) contrast(1.08)', ease: 'none' }, 0)
      .to('.hero-minimal', { y: -52, opacity: 0.72, ease: 'none' }, 0)
      .to('.stats .stat', { y: -26, opacity: 0.92, stagger: 0.03, ease: 'none' }, 0);

    gsap.matchMedia().add('(min-width: 901px)', () => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: '.live-upgrade-section',
          start: 'top 12%',
          end: '+=105%',
          pin: '.live-upgrade',
          scrub: 0.9,
          anticipatePin: 1
        }
      });
      timeline
        .fromTo('.live-copy', { x: -48, opacity: 0.62 }, { x: 0, opacity: 1, ease: 'power1.out' }, 0)
        .fromTo('.live-media img', { y: 74, scale: 0.92, opacity: 0.54 }, { y: 0, scale: 1, opacity: 1, stagger: 0.08, ease: 'power1.out' }, 0)
        .fromTo('.live-facts div', { y: 28, opacity: 0.35 }, { y: 0, opacity: 1, stagger: 0.05, ease: 'power1.out' }, 0.12);

      return () => timeline.kill();
    });

    gsap.utils.toArray('.card').forEach((card, index) => {
      gsap.fromTo(card,
        { y: 72, opacity: 0, rotateX: 8 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            end: 'top 58%',
            scrub: 0.45
          },
          delay: (index % 3) * 0.03
        }
      );
    });

    gsap.utils.toArray('.banner-card').forEach((card, index) => {
      gsap.fromTo(card.querySelector('img'),
        { scale: 1.18, yPercent: -6 },
        {
          scale: 1,
          yPercent: 6,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      );
      gsap.fromTo(card,
        { y: 46, opacity: 0.45 },
        {
          y: 0,
          opacity: 1,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 86%',
            end: 'top 62%',
            scrub: 0.5
          },
          delay: index * 0.04
        }
      );
    });

    gsap.timeline({
      scrollTrigger: {
        trigger: '#media-reels',
        start: 'top 82%',
        end: 'bottom 42%',
        scrub: 0.8
      }
    })
      .fromTo('.reel-stage', { x: -54, opacity: 0.55 }, { x: 0, opacity: 1, ease: 'none' }, 0)
      .fromTo('.reel-stack figure', { x: 54, opacity: 0.45 }, { x: 0, opacity: 1, stagger: 0.08, ease: 'none' }, 0);

    gsap.fromTo('.workspace-strip',
      { y: 56, opacity: 0.48, scale: 0.98 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        ease: 'power1.out',
        scrollTrigger: {
          trigger: '.workspace-strip',
          start: 'top 86%',
          end: 'top 56%',
          scrub: 0.5
        }
      }
    );

    ScrollTrigger.refresh();
  }
  window.addEventListener('load', initMcpScrollStage, { once:true });
  if(livingCanvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ctx = livingCanvas.getContext('2d');
    const pointer = { x: 0.5, y: 0.5 };
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    function resizeLivingBackground(){
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      livingCanvas.width = Math.floor(width * dpr);
      livingCanvas.height = Math.floor(height * dpr);
      livingCanvas.style.width = `${width}px`;
      livingCanvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const particleCount = width < 760 ? 20 : 44;
      particles = Array.from({ length: particleCount }, (_, index) => ({
        x: (index * 97) % Math.max(width, 1),
        y: (index * 53) % Math.max(height, 1),
        r: 0.8 + (index % 5) * 0.35,
        speed: 0.12 + (index % 7) * 0.03,
        hue: index % 3
      }));
    }
    function drawLivingBackground(now){
      ctx.clearRect(0, 0, width, height);
      const driftX = (pointer.x - 0.5) * 36;
      const driftY = (pointer.y - 0.5) * 24;
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, 'rgba(0,167,255,0.08)');
      gradient.addColorStop(0.45, 'rgba(255,209,102,0.06)');
      gradient.addColorStop(1, 'rgba(96,214,255,0.09)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      particles.forEach((p, index) => {
        p.y -= p.speed;
        p.x += Math.sin(now * 0.0004 + index) * 0.18;
        if(p.y < -20) p.y = height + 20;
        const colors = ['96,214,255', '255,209,102', '0,167,255'];
        ctx.beginPath();
        ctx.fillStyle = `rgba(${colors[p.hue]},${index % 4 === 0 ? 0.38 : 0.18})`;
        ctx.arc(p.x + driftX, p.y + driftY, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = 'rgba(96,214,255,0.08)';
      ctx.lineWidth = 1;
      for(let y = (now * 0.018) % 58; y < height; y += 58) {
        ctx.beginPath();
        ctx.moveTo(0, y + driftY * 0.2);
        ctx.bezierCurveTo(width * 0.32, y - 18, width * 0.68, y + 18, width, y + driftY * 0.2);
        ctx.stroke();
      }
      window.requestAnimationFrame(drawLivingBackground);
    }
    window.addEventListener('pointermove', (event) => {
      pointer.x = event.clientX / Math.max(width, 1);
      pointer.y = event.clientY / Math.max(height, 1);
    }, { passive:true });
    window.addEventListener('resize', resizeLivingBackground);
    resizeLivingBackground();
    window.requestAnimationFrame(drawLivingBackground);
  }
  if('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    });
  }
})();
